import type {
  JobDefinition,
  JobRetryPolicy,
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
      outcome: "retry_scheduled";
      run: JobRun;
      error: Error;
      nextRetryAt: string;
    }
  | {
      outcome: "failed";
      run: JobRun;
      error: Error;
    };

export type JobExecutionErrorOptions = {
  code?: string;
  retryable: boolean;
  cause?: unknown;
};

export class JobExecutionError extends Error {
  readonly code?: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: JobExecutionErrorOptions,
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "JobExecutionError";
    this.code = options.code;
    this.retryable = options.retryable;
  }
}

const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000;

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function nowDate(now: () => Date): Date {
  const value = now();
  if (!Number.isFinite(value.getTime())) {
    throw new Error("Worker clock returned an invalid Date");
  }
  return value;
}

function nowIso(now: () => Date): string {
  return nowDate(now).toISOString();
}

function retryErrorDetails(error: Error): {
  code?: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof JobExecutionError) {
    return {
      ...(error.code ? { code: error.code } : {}),
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    code: "handler_failed",
    message: error.message,
    retryable: false,
  };
}

export function calculateRetryDelayMs(
  policy: JobRetryPolicy,
  failedAttempt: number,
): number | undefined {
  if (policy.mode === "none") {
    return undefined;
  }

  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new Error("retry maxAttempts must be an integer >= 1");
  }

  if (!Number.isInteger(failedAttempt) || failedAttempt < 1) {
    throw new Error("failedAttempt must be an integer >= 1");
  }

  if (failedAttempt >= policy.maxAttempts) {
    return undefined;
  }

  if (policy.backoff.kind === "fixed") {
    if (
      !Number.isFinite(policy.backoff.delayMs) ||
      policy.backoff.delayMs < 0
    ) {
      throw new Error("fixed retry delayMs must be finite and >= 0");
    }

    return policy.backoff.delayMs;
  }

  const {
    initialDelayMs,
    maxDelayMs,
  } = policy.backoff;
  const multiplier = policy.backoff.multiplier ?? 2;

  if (
    !Number.isFinite(initialDelayMs) ||
    initialDelayMs < 0 ||
    !Number.isFinite(maxDelayMs) ||
    maxDelayMs < 0 ||
    maxDelayMs < initialDelayMs ||
    !Number.isFinite(multiplier) ||
    multiplier < 1
  ) {
    throw new Error("invalid exponential retry backoff policy");
  }

  const exponent = failedAttempt - 1;
  const rawDelay = initialDelayMs * Math.pow(multiplier, exponent);
  return Math.min(rawDelay, maxDelayMs);
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
      now: nowDate(this.clock),
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
        nowDate(this.clock),
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
      const details = retryErrorDetails(error);
      const retryDelayMs = details.retryable
        ? calculateRetryDelayMs(job.executionPolicy.retry, running.attempt)
        : undefined;

      if (retryDelayMs !== undefined) {
        const failureTime = nowDate(this.clock);
        const nextRetryAt = new Date(
          failureTime.getTime() + retryDelayMs,
        ).toISOString();

        const retry = this.store.rescheduleClaimedRunForRetry(
          running.id,
          claimToken,
          running.attempt + 1,
          nextRetryAt,
          details,
        );

        return {
          outcome: "retry_scheduled",
          run: retry,
          error,
          nextRetryAt,
        };
      }

      const failed: JobRun = {
        ...running,
        status: "failed",
        finishedAt: nowIso(this.clock),
        error: details,
      };
      this.store.updateClaimedRun(failed, claimToken);

      return {
        outcome: "failed",
        run: failed,
        error,
      };
    }
  }
}
