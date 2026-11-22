/**
 * OH-7B14: existing OH-3 scheduler/worker lifecycle under a B13 owner.
 *
 * Construction performs no I/O, creates no jobs and starts no timers.
 * Production bootstrap must supply an explicitly reviewed handler map and
 * a fatal callback that revokes readiness and begins supervised shutdown.
 */
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FileJobStore, getDefaultJobStorePath } from "@chernobog/core";
import { JobWorkerRuntime, SchedulerRuntime, type JobHandlerMap } from "@chernobog/runtime";
import type { BackgroundAdapter } from "./backgroundLifecycle";

export interface OH7B14JobsOptions {
  readonly dataRoot: string;
  readonly assertOwned: () => void;
  readonly handlers: JobHandlerMap;
  readonly onFatal: (error: Error) => void;
  readonly schedulerIntervalMs?: number;
  readonly workerIntervalMs?: number;
}

function errorOf(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export class OH7B14Jobs {
  readonly adapters: readonly BackgroundAdapter[];
  private readonly store: FileJobStore;
  private readonly scheduler: SchedulerRuntime;
  private readonly worker: JobWorkerRuntime;
  private readonly handlers: JobHandlerMap;
  private readonly options: OH7B14JobsOptions;
  private readonly schedulerInterval: number;
  private readonly workerInterval: number;
  private schedulerTimer?: ReturnType<typeof setInterval>;
  private workerTimer?: ReturnType<typeof setInterval>;
  private workerInFlight?: Promise<void>;
  private stopped = false;
  private failed = false;

  constructor(options: OH7B14JobsOptions) {
    const root = path.resolve(options.dataRoot);
    const expected = path.join(root, "scheduler", "jobs.json");
    if (!path.isAbsolute(options.dataRoot) || root === path.parse(root).root ||
        path.resolve(process.env.CHERNOBOG_DATA_DIR ?? "") !== root ||
        path.resolve(getDefaultJobStorePath()) !== expected) {
      throw new Error("OH7B14 jobs require configured production job-store path");
    }
    if (!options.handlers || typeof options.onFatal !== "function") {
      throw new Error("OH7B14 jobs require explicit handlers and fatal shutdown callback");
    }
    this.schedulerInterval = options.schedulerIntervalMs ?? 5000;
    this.workerInterval = options.workerIntervalMs ?? 1000;
    if (![this.schedulerInterval, this.workerInterval].every(
      value => Number.isSafeInteger(value) && value >= 100,
    )) throw new Error("OH7B14 polling intervals invalid");
    this.options = options;
    this.handlers = options.handlers;
    this.store = new FileJobStore(expected);
    this.scheduler = new SchedulerRuntime(this.store);
    const guardedHandlers: Record<string, JobHandlerMap[string]> = {};
    for (const [kind, handler] of Object.entries(options.handlers)) {
      if (!kind.trim() || typeof handler !== "function") {
        throw new Error("OH7B14 invalid job handler registration");
      }
      guardedHandlers[kind] = async context => {
        this.assertSafe();
        const result = await handler(context);
        this.assertSafe();
        return result;
      };
    }
    this.worker = new JobWorkerRuntime(this.store, guardedHandlers, `oh7b14-${randomUUID()}`);
    this.adapters = [
      { id: "scheduler", start: () => this.startScheduler(), stop: () => this.stopScheduler() },
      { id: "workers", start: () => this.startWorker(), stop: () => this.stopWorker() },
    ];
  }

  private assertSafe(): void {
    if (this.failed || this.stopped) throw new Error("OH7B14 jobs are stopped or failed");
    this.options.assertOwned();
  }

  /** Fail closed before materializing any job or claiming any work. */
  private verifyHandlers(): void {
    const enabled = this.store.listJobs().filter(job => job.enabled);
    const missing = [...new Set(enabled.filter(job =>
      typeof this.handlers[job.kind] !== "function").map(job => job.kind))];
    if (missing.length) {
      throw new Error(`OH7B14 unregistered enabled job kinds: ${missing.join(", ")}`);
    }
  }

  tickOnce(now = new Date()): number {
    this.assertSafe();
    this.verifyHandlers();
    this.assertSafe();
    return this.scheduler.tick(now).materializedRuns.length;
  }

  async runOnce(): Promise<string> {
    this.assertSafe();
    this.verifyHandlers();
    this.assertSafe();
    const result = await this.worker.runNext();
    this.assertSafe();
    return result.outcome;
  }

  private fatal(value: unknown): void {
    if (this.failed) return;
    this.failed = true;
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    if (this.workerTimer) clearInterval(this.workerTimer);
    this.schedulerTimer = undefined;
    this.workerTimer = undefined;
    // The supervisor must immediately revoke readiness and stop the core.
    try { this.options.onFatal(errorOf(value)); }
    catch (error) { console.error("OH7B14 supervisor fatal callback failed", error); }
  }

  private startScheduler(): void {
    this.assertSafe();
    this.verifyHandlers();
    if (this.schedulerTimer) throw new Error("OH7B14 scheduler already running");
    this.schedulerTimer = setInterval(() => {
      try { this.tickOnce(); } catch (error) { this.fatal(error); }
    }, this.schedulerInterval);
  }

  private startWorker(): void {
    this.assertSafe();
    this.verifyHandlers();
    if (this.workerTimer) throw new Error("OH7B14 worker already running");
    this.workerTimer = setInterval(() => {
      if (this.workerInFlight || this.failed || this.stopped) return;
      this.workerInFlight = this.runOnce()
        .then(() => {})
        .catch(error => this.fatal(error))
        .finally(() => { this.workerInFlight = undefined; });
    }, this.workerInterval);
  }

  private stopScheduler(): void {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = undefined;
    this.stopped = true;
  }

  private async stopWorker(): Promise<void> {
    if (this.workerTimer) clearInterval(this.workerTimer);
    this.workerTimer = undefined;
    this.stopped = true;
    await this.workerInFlight;
  }
}
