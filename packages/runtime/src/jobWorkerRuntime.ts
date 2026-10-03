import type {
  JobDefinition,
  JobRun,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

export type JobHandlerContext = {
  job: JobDefinition;
  run: JobRun;
  workerId: string;
  renewLease: () => JobRun;
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
  | { outcome: "idle" }
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

const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000;

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

export class JobWorkerRuntime {
  constructor(
    private readonly store: FileJobStore,
    private readonly handlers: JobHandlerMap,
    private readonly workerId: string,
    private readonly clock: () => Date = () => new Date(),
    private readonly leaseDurationMs: number = DEFAULT_LEASE_DURATION_MS,
  ) {
    if (!workerId.trim()) {
      throw new Error("workerId is required");
    }

    if (!Number.isFinite(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new Error("leaseDurationMs must be a finite positive number");
    }
  }

  public async runNext(): Promise<WorkerRunResult> {
    const claimed = this.store.claimNextRunnable({
      workerId: this.workerId,
      leaseDurationMs: this.leaseDurationMs,
      now: this.clock(),
    });

    if (!claimed) return { outcome: "idle" };

    if (!claimed.claimToken) {
      throw new Error(`Claimed run is missing claim token: ${claimed.id}`);
    }

    const claimToken = claimed.claimToken;
    const job = this.store.getJob(claimed.jobId);

    if (!job) {
      const error = new Error(
        `Queued run ${claimed.id} references missing job ${claimed.jobId}`,
      );

      const failed: JobRun = {
        ...claimed,
        status: "failed",
        startedAt: nowIso(this.clock),
        finishedAt: nowIso(this.clock),
        error: {
          code: "missing_job",
          message: error.message,
          retryable: false,
        },
      };

      this.store.updateClaimedRun(failed, claimToken);
      return { outcome: "failed", run: failed, error };
    }

    const handler = this.handlers[job.kind];
    if (!handler) {
      const error = new Error(`No job handler registered for kind: ${job.kind}`);

      const failed: JobRun = {
        ...claimed,
        status: "failed",
        startedAt: nowIso(this.clock),
        finishedAt: nowIso(this.clock),
        error: {
          code: "missing_handler",
          message: error.message,
          retryable: false,
        },
      };

      this.store.updateClaimedRun(failed, claimToken);
      return { outcome: "failed", run: failed, error };
    }

    const running: JobRun = {
      ...claimed,
      status: "running",
      startedAt: nowIso(this.clock),
    };
    this.store.updateClaimedRun(running, claimToken);

    const renewLease = (): JobRun =>
      this.store.renewRunLease(
        running.id,
        claimToken,
        this.leaseDurationMs,
        this.clock(),
      );

    try {
      const handlerResult = await handler({
        job,
        run: running,
        workerId: this.workerId,
        renewLease,
      });

      const succeeded: JobRun = {
        ...running,
        status: "succeeded",
        finishedAt: nowIso(this.clock),
        error: undefined,
      };
      this.store.updateClaimedRun(succeeded, claimToken);

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
      this.store.updateClaimedRun(failed, claimToken);

      return { outcome: "failed", run: failed, error };
    }
  }
}
