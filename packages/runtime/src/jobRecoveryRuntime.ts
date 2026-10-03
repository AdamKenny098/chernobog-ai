import type {
  JobRun,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

import { calculateRetryDelayMs } from "./jobWorkerRuntime";

export type JobRecoveryResult = {
  recoveredClaims: JobRun[];
  retriedInterruptedRuns: JobRun[];
  failedInterruptedRuns: JobRun[];
};

function leaseExpired(
  leaseExpiresAt: string | undefined,
  now: Date,
): boolean {
  if (!leaseExpiresAt) return true;

  const expiry = Date.parse(leaseExpiresAt);
  return !Number.isFinite(expiry) || expiry <= now.getTime();
}

export class JobRecoveryRuntime {
  constructor(private readonly store: FileJobStore) {}

  reconcile(now: Date = new Date()): JobRecoveryResult {
    if (!Number.isFinite(now.getTime())) {
      throw new Error("Recovery reconciliation requires a valid Date");
    }

    const result: JobRecoveryResult = {
      recoveredClaims: [],
      retriedInterruptedRuns: [],
      failedInterruptedRuns: [],
    };

    for (const run of this.store.listRuns()) {
      if (
        (run.status !== "claimed" && run.status !== "running") ||
        !leaseExpired(run.leaseExpiresAt, now)
      ) {
        continue;
      }

      if (run.status === "claimed") {
        const recovered = this.store.recoverExpiredClaim(
          run.id,
          now,
        );
        if (recovered) {
          result.recoveredClaims.push(recovered);
        }
        continue;
      }

      const job = this.store.getJob(run.jobId);

      if (!job) {
        const failed =
          this.store.recoverExpiredRunningAsFailed(
            run.id,
            now,
            {
              code: "recovery_missing_job",
              message:
                `Interrupted run ${run.id} references missing job ${run.jobId}`,
              retryable: false,
            },
          );

        if (failed) {
          result.failedInterruptedRuns.push(failed);
        }
        continue;
      }

      const delay = calculateRetryDelayMs(
        job.executionPolicy.retry,
        run.attempt,
      );

      if (delay !== undefined) {
        const scheduledFor = new Date(
          now.getTime() + delay,
        ).toISOString();

        const recovered =
          this.store.recoverExpiredRunningForRetry(
            run.id,
            now,
            run.attempt + 1,
            scheduledFor,
            {
              code: "worker_interrupted",
              message:
                `Worker lease expired while run ${run.id} was running`,
              retryable: true,
            },
          );

        if (recovered) {
          result.retriedInterruptedRuns.push(recovered);
        }
        continue;
      }

      const failed =
        this.store.recoverExpiredRunningAsFailed(
          run.id,
          now,
          {
            code: "worker_interrupted",
            message:
              `Worker lease expired while run ${run.id} was running`,
            retryable: false,
          },
        );

      if (failed) {
        result.failedInterruptedRuns.push(failed);
      }
    }

    return result;
  }
}
