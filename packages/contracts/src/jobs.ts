/**
 * Chernobog OH-3A â€” Job Contracts & Ownership
 *
 * Contract-only foundation for scheduling and background execution.
 *
 * This file intentionally does NOT implement:
 * - persistence
 * - scheduling/timers
 * - queue workers
 * - retries
 * - leases
 * - Event Spine publication
 * - runtime execution
 *
 * Those belong to later OH-3 slices.
 */

export type JobId = string;
export type JobRunId = string;
export type ScheduleId = string;

/**
 * Stable logical owner of a job.
 *
 * Examples:
 * - "game-radar"
 * - "vault"
 * - "personal-assistance"
 * - "system"
 *
 * ownerId identifies the subsystem responsible for the job definition.
 * instanceId is optional and exists for future multi-instance/worker use.
 */
export type JobOwner = {
  ownerId: string;
  instanceId?: string;
};

/**
 * Describes where a job request originated without transferring ownership.
 */
export type JobSource =
  | { kind: "system"; detail?: string }
  | { kind: "user"; userId?: string }
  | { kind: "runtime"; correlationId?: string }
  | { kind: "subsystem"; subsystemId: string }
  | { kind: "recovery"; previousRunId?: JobRunId };

/**
 * Lifecycle of one concrete execution attempt.
 *
 * "scheduled" means the run exists but is not yet eligible.
 * "queued" means eligible for a future worker.
 * "claimed" and "running" are reserved for OH-3D/E.
 */
export type JobRunStatus =
  | "scheduled"
  | "queued"
  | "claimed"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/**
 * Lifecycle of a reusable schedule definition.
 */
export type ScheduleStatus =
  | "active"
  | "paused"
  | "cancelled";

/**
 * Retry policy is a contract in OH-3A only.
 * Enforcement belongs to OH-3F.
 */
export type JobRetryPolicy =
  | {
      mode: "none";
    }
  | {
      mode: "bounded";
      maxAttempts: number;
      backoff:
        | { kind: "fixed"; delayMs: number }
        | {
            kind: "exponential";
            initialDelayMs: number;
            maxDelayMs: number;
            multiplier?: number;
          };
    };

/**
 * Concurrency is declared now so later workers do not invent local rules.
 * Enforcement belongs to OH-3E.
 */
export type JobConcurrencyPolicy =
  | {
      mode: "allow";
    }
  | {
      mode: "single-active";
      /**
       * Optional logical key. Jobs sharing the same key may not run
       * concurrently once OH-3E enforcement exists.
       */
      key?: string;
    };

/**
 * Execution policy travels with the job definition.
 * OH-3A defines it; later slices enforce it.
 */
export type JobExecutionPolicy = {
  retry: JobRetryPolicy;
  concurrency: JobConcurrencyPolicy;
  timeoutMs?: number;
};

/**
 * Scheduling shape is defined up-front, but evaluated only in OH-3C.
 */
export type ScheduleTrigger =
  | {
      kind: "once";
      runAt: string;
      timezone?: string;
    }
  | {
      kind: "interval";
      everyMs: number;
      /**
       * Optional anchor for deterministic interval calculation.
       */
      anchorAt?: string;
      timezone?: string;
    }
  | {
      kind: "cron";
      expression: string;
      timezone: string;
    };

/**
 * Reusable job definition.
 *
 * payload must remain serialisable by whichever persistence layer OH-3B
 * chooses. OH-3A deliberately does not prescribe storage technology.
 */
export type JobDefinition<TPayload = unknown> = {
  id: JobId;
  owner: JobOwner;
  source: JobSource;
  kind: string;
  displayName?: string;
  payload: TPayload;
  executionPolicy: JobExecutionPolicy;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Schedule points at a reusable job definition.
 * The scheduler must not contain job-specific business logic.
 */
export type ScheduleDefinition = {
  id: ScheduleId;
  jobId: JobId;
  scheduleId?: ScheduleId;
  owner: JobOwner;
  status: ScheduleStatus;
  trigger: ScheduleTrigger;
  createdAt: string;
  updatedAt: string;
};

/**
 * Concrete execution record.
 *
 * This is deliberately transport/persistence-neutral.
 */
export type JobRun<TPayload = unknown> = {
  id: JobRunId;
  jobId: JobId;
  scheduleId?: ScheduleId;
  owner: JobOwner;
  source: JobSource;
  status: JobRunStatus;
  payload: TPayload;
  attempt: number;
  scheduledFor?: string;
  queuedAt?: string;
  claimedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  workerId?: string;
  correlationId?: string;
  error?: {
    code?: string;
    message: string;
    retryable?: boolean;
  };
};

/**
 * Ownership comparison is intentionally tiny and deterministic.
 * No registry or runtime dependency belongs in the contracts package.
 */
export function sameJobOwner(a: JobOwner, b: JobOwner): boolean {
  return a.ownerId === b.ownerId && a.instanceId === b.instanceId;
}

/**
 * Minimal structural validation used at contract boundaries.
 *
 * Deep domain validation is deferred to the owning implementation slice.
 */
export function isJobOwner(value: unknown): value is JobOwner {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.ownerId !== "string" || candidate.ownerId.trim().length === 0) {
    return false;
  }

  return (
    candidate.instanceId === undefined ||
    (typeof candidate.instanceId === "string" &&
      candidate.instanceId.trim().length > 0)
  );
}
