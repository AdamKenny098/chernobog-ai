/**
 * OH-7B6: real OH-3 scheduler/worker composition for disposable fixtures.
 * This is NOT the production writer or the PA/Android handover.
 */
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FileJobStore } from "@chernobog/core";
import { JobWorkerRuntime, SchedulerRuntime, type JobHandlerMap } from "@chernobog/runtime";
import type { BackgroundAdapter } from "./backgroundLifecycle";

export interface OH7B6IsolatedJobsOptions {
  fixtureRoot: string;
  hasOwnership: () => boolean;
  handlers: JobHandlerMap;
  schedulerIntervalMs?: number;
  workerIntervalMs?: number;
}

export class OH7B6IsolatedJobs {
  readonly store: FileJobStore;
  readonly scheduler: SchedulerRuntime;
  readonly worker: JobWorkerRuntime;
  readonly adapters: readonly BackgroundAdapter[];
  private readonly hasOwnership: () => boolean;
  private readonly handlers: JobHandlerMap;
  private readonly schedulerIntervalMs: number;
  private readonly workerIntervalMs: number;
  private scheduleTimer?: ReturnType<typeof setInterval>;
  private workerTimer?: ReturnType<typeof setInterval>;
  private workerInFlight?: Promise<unknown>;
  private running = false;

  constructor(options: OH7B6IsolatedJobsOptions) {
    const root = path.resolve(options.fixtureRoot);
    const realRoot = existsSync(root) ? realpathSync(root) : "";
    const realTemp = realpathSync(tmpdir());
    if (!realRoot.startsWith(realTemp + path.sep) ||
        !existsSync(path.join(realRoot, ".oh7b6-fixture"))) {
      throw new Error("OH7B6 jobs require an existing disposable temp fixture with .oh7b6-fixture marker");
    }
    this.hasOwnership = options.hasOwnership;
    this.handlers = options.handlers;
    this.schedulerIntervalMs = options.schedulerIntervalMs ?? 5_000;
    this.workerIntervalMs = options.workerIntervalMs ?? 1_000;
    if (![this.schedulerIntervalMs, this.workerIntervalMs].every(v => Number.isSafeInteger(v) && v >= 100)) {
      throw new Error("Invalid OH7B6 polling intervals");
    }
    this.store = new FileJobStore(path.join(realRoot, "jobs.json"));
    this.scheduler = new SchedulerRuntime(this.store);
    this.worker = new JobWorkerRuntime(this.store, this.handlers, `oh7b6-${randomUUID()}`);
    this.adapters = [
      { id: "scheduler", start: () => this.startScheduler(), stop: () => this.stopScheduler() },
      { id: "workers", start: () => this.startWorker(), stop: () => this.stopWorker() },
    ];
  }

  private assertOwner(): void {
    if (!this.hasOwnership()) throw new Error("OH7B6 isolated ownership not granted");
  }

  private verifyJobKinds(): void {
    const unsupported = [...new Set(this.store.listJobs()
      .filter(job => job.enabled && typeof this.handlers[job.kind] !== "function")
      .map(job => job.kind))];
    if (unsupported.length > 0) throw new Error(`OH7B6 unsupported job kinds: ${unsupported.join(", ")}`);
  }

  tickOnce(now: Date = new Date()): number {
    this.assertOwner();
    this.verifyJobKinds();
    return this.scheduler.tick(now).materializedRuns.length;
  }

  async runOnce(): Promise<string> {
    this.assertOwner();
    this.verifyJobKinds();
    return (await this.worker.runNext()).outcome;
  }

  private startScheduler(): void {
    this.assertOwner();
    this.verifyJobKinds();
    if (this.scheduleTimer) throw new Error("Scheduler already running");
    this.scheduleTimer = setInterval(() => {
      try { this.tickOnce(); }
      catch (error) { console.error("[OH7B6] Scheduler stopped after failure", error); this.stopScheduler(); }
    }, this.schedulerIntervalMs);
  }

  private async stopScheduler(): Promise<void> {
    if (this.scheduleTimer) clearInterval(this.scheduleTimer);
    this.scheduleTimer = undefined;
  }

  private startWorker(): void {
    this.assertOwner();
    this.verifyJobKinds();
    if (this.running) throw new Error("Worker already running");
    this.running = true;
    this.workerTimer = setInterval(() => {
      if (!this.running || this.workerInFlight) return;
      this.workerInFlight = this.runOnce()
        .catch(error => {
          console.error("[OH7B6] Worker stopped after failure", error);
          this.running = false;
          if (this.workerTimer) clearInterval(this.workerTimer);
        })
        .finally(() => { this.workerInFlight = undefined; });
    }, this.workerIntervalMs);
  }

  private async stopWorker(): Promise<void> {
    this.running = false;
    if (this.workerTimer) clearInterval(this.workerTimer);
    this.workerTimer = undefined;
    await this.workerInFlight;
  }
}
