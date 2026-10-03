import type {
  JobDefinition,
  JobRun,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

export type JobHandlerContext = {
  job: JobDefinition;
  run: JobRun;
  workerId: string;
};

export type JobHandlerResult = {
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type JobHandler = (
  context: JobHandlerContext,
) => Promise<JobHandlerResult | void>;

export type JobHandlerMap = Readonly<Record<string, JobHandler>>;

export type WorkerRunResult =
  | {
      outcome: "idle";
    }
  | {
      outcome: "succeeded";
      run: JobRun;
      handlerResult?: JobHandlerResult;
    }
  | {
      outcome: "failed";
      run: JobRun;
      error: Error;
    };

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function nowIso(now: () => Date): string {
  const value = now();
  if (!Number.isFinite(value.getTime())) {
    throw new Error("Worker clock returned an invalid Date");
  }
  return value.toISOString();
}

/**
 * OH-3D worker.
 *
 * This is deliberately a thin execution coordinator:
 *   durable queue -> claim -> registered handler -> durable outcome
 *
 * Domain/business logic does not live here. Handlers are injected by the
 * composition layer. The canonical command handler routes through the existing
 * OH-2 runCommandPipeline rather than directly invoking tools.
 *
 * Atomic leases, duplicate-worker exclusion, and concurrency enforcement are
 * intentionally deferred to OH-3E.
 */
export class JobWorkerRuntime {
  constructor(
    private readonly store: FileJobStore,
    private readonly handlers: JobHandlerMap,
    private readonly workerId: string,
    private readonly clock: () => Date = () => new Date(),
  ) {
    if (!workerId.trim()) {
      throw new Error("workerId is required");
    }
  }

  private selectRunnable(): JobRun | undefined {
    return this.store.listRunnable(this.clock())[0];
  }

  public async runNext(): Promise<WorkerRunResult> {
    const candidate = this.selectRunnable();
    if (!candidate) {
      return { outcome: "idle" };
    }

    const job = this.store.getJob(candidate.jobId);
    if (!job) {
      const error = new Error(
        `Queued run ${candidate.id} references missing job ${candidate.jobId}`,
      );

      const failed: JobRun = {
        ...candidate,
        status: "failed",
        workerId: this.workerId,
        claimedAt: nowIso(this.clock),
        startedAt: nowIso(this.clock),
        finishedAt: nowIso(this.clock),
        error: {
          code: "missing_job",
          message: error.message,
          retryable: false,
        },
      };

      this.store.updateRun(failed);
      return { outcome: "failed", run: failed, error };
    }

    const handler = this.handlers[job.kind];
    if (!handler) {
      const error = new Error(`No job handler registered for kind: ${job.kind}`);

      const failed: JobRun = {
        ...candidate,
        status: "failed",
        workerId: this.workerId,
        claimedAt: nowIso(this.clock),
        startedAt: nowIso(this.clock),
        finishedAt: nowIso(this.clock),
        error: {
          code: "missing_handler",
          message: error.message,
          retryable: false,
        },
      };

      this.store.updateRun(failed);
      return { outcome: "failed", run: failed, error };
    }

    const claimed: JobRun = {
      ...candidate,
      status: "claimed",
      workerId: this.workerId,
      claimedAt: nowIso(this.clock),
      error: undefined,
    };
    this.store.updateRun(claimed);

    const running: JobRun = {
      ...claimed,
      status: "running",
      startedAt: nowIso(this.clock),
    };
    this.store.updateRun(running);

    try {
      const handlerResult = await handler({
        job,
        run: running,
        workerId: this.workerId,
      });

      const succeeded: JobRun = {
        ...running,
        status: "succeeded",
        finishedAt: nowIso(this.clock),
        error: undefined,
      };
      this.store.updateRun(succeeded);

      return {
        outcome: "succeeded",
        run: succeeded,
        ...(handlerResult === undefined ? {} : { handlerResult }),
      };
    } catch (value) {
      const error = toError(value);
      const failed: JobRun = {
        ...running,
        status: "failed",
        finishedAt: nowIso(this.clock),
        error: {
          code: "handler_failed",
          message: error.message,
          retryable: undefined,
        },
      };
      this.store.updateRun(failed);

      return {
        outcome: "failed",
        run: failed,
        error,
      };
    }
  }
}
