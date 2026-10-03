import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import type {
  JobDefinition,
  JobId,
  JobRun,
  JobRunId,
  JobRunStatus,
  ScheduleDefinition,
  ScheduleId,
} from "@chernobog/contracts";

export type JobStoreSnapshot = {
  schemaVersion: 1;
  jobs: JobDefinition[];
  schedules: ScheduleDefinition[];
  runs: JobRun[];
};

export type ClaimRunnableOptions = {
  workerId: string;
  leaseDurationMs: number;
  now?: Date;
};

const EMPTY_SNAPSHOT: JobStoreSnapshot = {
  schemaVersion: 1,
  jobs: [],
  schedules: [],
  runs: [],
};

const STORE_LOCK_RETRY_MS = 10;
const STORE_LOCK_MAX_ATTEMPTS = 500;
const STORE_LOCK_STALE_MS = 30_000;
const sleepArray = new Int32Array(new SharedArrayBuffer(4));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value);
}

function assertUniqueId<T extends { id: string }>(
  collection: T[],
  id: string,
  label: string,
): void {
  if (collection.some((entry) => entry.id === id)) {
    throw new Error(`${label} already exists: ${id}`);
  }
}

function assertValidDate(value: Date, label: string): void {
  if (!Number.isFinite(value.getTime())) {
    throw new Error(`${label} must be a valid Date`);
  }
}

function writeSnapshotAtomically(
  filePath: string,
  snapshot: JobStoreSnapshot,
): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(
    tempPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  fs.renameSync(tempPath, filePath);
}

function isExpired(
  leaseExpiresAt: string | undefined,
  now: Date,
): boolean {
  if (!leaseExpiresAt) return true;
  const expiry = Date.parse(leaseExpiresAt);
  return !Number.isFinite(expiry) || expiry <= now.getTime();
}

function jobConcurrencyKey(job: JobDefinition): string | undefined {
  const policy = job.executionPolicy.concurrency;
  if (policy.mode !== "single-active") return undefined;
  return policy.key?.trim() || `job:${job.id}`;
}

function runIsActive(run: JobRun, now: Date): boolean {
  if (run.status === "running") {
    return true;
  }

  if (run.status === "claimed") {
    return !isExpired(run.leaseExpiresAt, now);
  }

  return false;
}

export function getDefaultJobStorePath(): string {
  const dataRoot =
    process.env.CHERNOBOG_DATA_DIR?.trim() ||
    path.join(process.cwd(), "data", "chernobog");

  return path.join(dataRoot, "scheduler", "jobs.json");
}

export class FileJobStore {
  constructor(private readonly filePath: string = getDefaultJobStorePath()) {}

  get storagePath(): string {
    return this.filePath;
  }

  private readSnapshot(): JobStoreSnapshot {
    if (!fs.existsSync(this.filePath)) {
      return clone(EMPTY_SNAPSHOT);
    }

    const raw = fs.readFileSync(this.filePath, "utf8");
    if (raw.trim().length === 0) {
      return clone(EMPTY_SNAPSHOT);
    }

    const parsed = JSON.parse(raw) as Partial<JobStoreSnapshot>;

    if (parsed.schemaVersion !== 1) {
      throw new Error(
        `Unsupported job store schema version: ${String(parsed.schemaVersion)}`,
      );
    }

    return {
      schemaVersion: 1,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    };
  }

  private writeSnapshot(snapshot: JobStoreSnapshot): void {
    writeSnapshotAtomically(this.filePath, snapshot);
  }

  private withExclusiveLock<T>(operation: () => T): T {
    const lockPath = `${this.filePath}.lock`;
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });

    let descriptor: number | undefined;

    for (let attempt = 0; attempt < STORE_LOCK_MAX_ATTEMPTS; attempt += 1) {
      try {
        descriptor = fs.openSync(lockPath, "wx");
        break;
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code)
            : "";

        if (code !== "EEXIST") throw error;

        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > STORE_LOCK_STALE_MS) {
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          continue;
        }

        Atomics.wait(sleepArray, 0, 0, STORE_LOCK_RETRY_MS);
      }
    }

    if (descriptor === undefined) {
      throw new Error(`Timed out acquiring job store lock: ${lockPath}`);
    }

    try {
      return operation();
    } finally {
      try {
        fs.closeSync(descriptor);
      } finally {
        try {
          fs.unlinkSync(lockPath);
        } catch {
        }
      }
    }
  }

  getSnapshot(): JobStoreSnapshot {
    return clone(this.readSnapshot());
  }

  putJob(job: JobDefinition): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      assertUniqueId(snapshot.jobs, job.id, "Job");
      snapshot.jobs.push(clone(job));
      this.writeSnapshot(snapshot);
    });
  }

  upsertJob(job: JobDefinition): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.jobs.findIndex(
        (candidate) => candidate.id === job.id,
      );

      if (index === -1) snapshot.jobs.push(clone(job));
      else snapshot.jobs[index] = clone(job);

      this.writeSnapshot(snapshot);
    });
  }

  getJob(id: JobId): JobDefinition | undefined {
    const job = this.readSnapshot().jobs.find((candidate) => candidate.id === id);
    return cloneOptional(job);
  }

  listJobs(): JobDefinition[] {
    return clone(this.readSnapshot().jobs);
  }

  putSchedule(schedule: ScheduleDefinition): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();

      if (!snapshot.jobs.some((job) => job.id === schedule.jobId)) {
        throw new Error(
          `Schedule ${schedule.id} references unknown job: ${schedule.jobId}`,
        );
      }

      assertUniqueId(snapshot.schedules, schedule.id, "Schedule");
      snapshot.schedules.push(clone(schedule));
      this.writeSnapshot(snapshot);
    });
  }

  upsertSchedule(schedule: ScheduleDefinition): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();

      if (!snapshot.jobs.some((job) => job.id === schedule.jobId)) {
        throw new Error(
          `Schedule ${schedule.id} references unknown job: ${schedule.jobId}`,
        );
      }

      const index = snapshot.schedules.findIndex(
        (candidate) => candidate.id === schedule.id,
      );

      if (index === -1) snapshot.schedules.push(clone(schedule));
      else snapshot.schedules[index] = clone(schedule);

      this.writeSnapshot(snapshot);
    });
  }

  getSchedule(id: ScheduleId): ScheduleDefinition | undefined {
    const schedule = this.readSnapshot().schedules.find(
      (candidate) => candidate.id === id,
    );
    return cloneOptional(schedule);
  }

  listSchedules(): ScheduleDefinition[] {
    return clone(this.readSnapshot().schedules);
  }

  enqueueRun(run: JobRun): void {
    if (run.status !== "queued" && run.status !== "scheduled") {
      throw new Error(
        `New job run must begin scheduled or queued; received: ${run.status}`,
      );
    }

    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();

      if (!snapshot.jobs.some((job) => job.id === run.jobId)) {
        throw new Error(`Run ${run.id} references unknown job: ${run.jobId}`);
      }

      assertUniqueId(snapshot.runs, run.id, "Job run");

      if (
        run.idempotencyKey &&
        snapshot.runs.some(
          (candidate) =>
            candidate.jobId === run.jobId &&
            candidate.idempotencyKey === run.idempotencyKey,
        )
      ) {
        throw new Error(
          `Job run idempotency key already exists for ${run.jobId}: ${run.idempotencyKey}`,
        );
      }

      snapshot.runs.push(clone(run));
      this.writeSnapshot(snapshot);
    });
  }

  getRun(id: JobRunId): JobRun | undefined {
    const run = this.readSnapshot().runs.find((candidate) => candidate.id === id);
    return cloneOptional(run);
  }

  listRuns(status?: JobRunStatus): JobRun[] {
    const runs = this.readSnapshot().runs;
    return clone(
      status === undefined
        ? runs
        : runs.filter((candidate) => candidate.status === status),
    );
  }

  updateRun(run: JobRun): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === run.id,
      );

      if (index === -1) {
        throw new Error(`Unknown job run: ${run.id}`);
      }

      if (snapshot.runs[index].jobId !== run.jobId) {
        throw new Error(`Job run ${run.id} cannot change owning job`);
      }

      snapshot.runs[index] = clone(run);
      this.writeSnapshot(snapshot);
    });
  }

  claimNextRunnable(
    options: ClaimRunnableOptions,
  ): JobRun | undefined {
    const workerId = options.workerId.trim();
    if (!workerId) throw new Error("workerId is required");

    if (
      !Number.isFinite(options.leaseDurationMs) ||
      options.leaseDurationMs <= 0
    ) {
      throw new Error("leaseDurationMs must be a finite positive number");
    }

    const now = options.now ?? new Date();
    assertValidDate(now, "claim time");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();

      for (let index = 0; index < snapshot.runs.length; index += 1) {
        const run = snapshot.runs[index];
        if (
          run.status === "claimed" &&
          isExpired(run.leaseExpiresAt, now)
        ) {
          snapshot.runs[index] = {
            ...run,
            status: "queued",
            workerId: undefined,
            claimToken: undefined,
            leaseExpiresAt: undefined,
            claimedAt: undefined,
          };
        }
      }

      const runnable = snapshot.runs
        .filter((run) => {
          if (run.status === "queued") return true;
          if (run.status !== "scheduled" || !run.scheduledFor) return false;

          const dueAt = Date.parse(run.scheduledFor);
          return Number.isFinite(dueAt) && dueAt <= now.getTime();
        })
        .sort((a, b) => {
          const aTime = a.scheduledFor ? Date.parse(a.scheduledFor) : 0;
          const bTime = b.scheduledFor ? Date.parse(b.scheduledFor) : 0;
          return aTime - bTime;
        });

      for (const candidate of runnable) {
        const job = snapshot.jobs.find(
          (entry) => entry.id === candidate.jobId,
        );
        if (!job || !job.enabled) continue;

        const concurrencyKey = jobConcurrencyKey(job);

        if (concurrencyKey) {
          const blocked = snapshot.runs.some((other) => {
            if (other.id === candidate.id || !runIsActive(other, now)) {
              return false;
            }

            const otherJob = snapshot.jobs.find(
              (entry) => entry.id === other.jobId,
            );

            return Boolean(
              otherJob &&
              jobConcurrencyKey(otherJob) === concurrencyKey,
            );
          });

          if (blocked) continue;
        }

        const index = snapshot.runs.findIndex(
          (entry) => entry.id === candidate.id,
        );

        const claimToken = randomUUID();
        const claimedAt = now.toISOString();
        const leaseExpiresAt = new Date(
          now.getTime() + options.leaseDurationMs,
        ).toISOString();

        const claimed: JobRun = {
          ...snapshot.runs[index],
          status: "claimed",
          workerId,
          claimToken,
          claimedAt,
          leaseExpiresAt,
          error: undefined,
        };

        snapshot.runs[index] = claimed;
        this.writeSnapshot(snapshot);
        return clone(claimed);
      }

      this.writeSnapshot(snapshot);
      return undefined;
    });
  }

  updateClaimedRun(
    run: JobRun,
    claimToken: string,
  ): void {
    this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === run.id,
      );

      if (index === -1) {
        throw new Error(`Unknown job run: ${run.id}`);
      }

      const current = snapshot.runs[index];

      if (!current.claimToken || current.claimToken !== claimToken) {
        throw new Error(`Job run claim token mismatch: ${run.id}`);
      }

      if (current.workerId !== run.workerId) {
        throw new Error(`Job run worker ownership mismatch: ${run.id}`);
      }

      if (current.jobId !== run.jobId) {
        throw new Error(`Job run ${run.id} cannot change owning job`);
      }

      snapshot.runs[index] = clone(run);
      this.writeSnapshot(snapshot);
    });
  }

  rescheduleClaimedRunForRetry(
    runId: JobRunId,
    claimToken: string,
    nextAttempt: number,
    scheduledFor: string,
    error: NonNullable<JobRun["error"]>,
  ): JobRun {
    if (!Number.isInteger(nextAttempt) || nextAttempt < 2) {
      throw new Error("nextAttempt must be an integer >= 2");
    }

    const dueAt = new Date(scheduledFor);
    assertValidDate(dueAt, "retry scheduledFor");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === runId,
      );

      if (index === -1) {
        throw new Error(`Unknown job run: ${runId}`);
      }

      const current = snapshot.runs[index];

      if (!current.claimToken || current.claimToken !== claimToken) {
        throw new Error(`Job run claim token mismatch: ${runId}`);
      }

      if (current.status !== "running" && current.status !== "claimed") {
        throw new Error(
          `Cannot retry ${runId} from status ${current.status}`,
        );
      }

      if (nextAttempt !== current.attempt + 1) {
        throw new Error(
          `Retry attempt must advance exactly once for ${runId}`,
        );
      }

      const retry: JobRun = {
        ...current,
        status: "scheduled",
        attempt: nextAttempt,
        scheduledFor: dueAt.toISOString(),
        queuedAt: undefined,
        claimedAt: undefined,
        startedAt: undefined,
        finishedAt: undefined,
        workerId: undefined,
        claimToken: undefined,
        leaseExpiresAt: undefined,
        error: clone(error),
      };

      snapshot.runs[index] = retry;
      this.writeSnapshot(snapshot);
      return clone(retry);
    });
  }
  recoverExpiredClaim(
    runId: JobRunId,
    now: Date = new Date(),
  ): JobRun | undefined {
    assertValidDate(now, "claim recovery time");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === runId,
      );

      if (index === -1) return undefined;

      const current = snapshot.runs[index];
      if (
        current.status !== "claimed" ||
        !isExpired(current.leaseExpiresAt, now)
      ) {
        return undefined;
      }

      const recovered: JobRun = {
        ...current,
        status: "queued",
        workerId: undefined,
        claimToken: undefined,
        leaseExpiresAt: undefined,
        claimedAt: undefined,
      };

      snapshot.runs[index] = recovered;
      this.writeSnapshot(snapshot);
      return clone(recovered);
    });
  }

  recoverExpiredRunningForRetry(
    runId: JobRunId,
    now: Date,
    nextAttempt: number,
    scheduledFor: string,
    error: NonNullable<JobRun["error"]>,
  ): JobRun | undefined {
    assertValidDate(now, "running recovery time");
    const dueAt = new Date(scheduledFor);
    assertValidDate(dueAt, "running recovery scheduledFor");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === runId,
      );

      if (index === -1) return undefined;

      const current = snapshot.runs[index];
      if (
        current.status !== "running" ||
        !isExpired(current.leaseExpiresAt, now)
      ) {
        return undefined;
      }

      if (nextAttempt !== current.attempt + 1) {
        throw new Error(
          `Recovery attempt must advance exactly once for ${runId}`,
        );
      }

      const recovered: JobRun = {
        ...current,
        status: "scheduled",
        attempt: nextAttempt,
        scheduledFor: dueAt.toISOString(),
        queuedAt: undefined,
        claimedAt: undefined,
        startedAt: undefined,
        finishedAt: undefined,
        workerId: undefined,
        claimToken: undefined,
        leaseExpiresAt: undefined,
        error: clone(error),
      };

      snapshot.runs[index] = recovered;
      this.writeSnapshot(snapshot);
      return clone(recovered);
    });
  }

  recoverExpiredRunningAsFailed(
    runId: JobRunId,
    now: Date,
    error: NonNullable<JobRun["error"]>,
  ): JobRun | undefined {
    assertValidDate(now, "running recovery time");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === runId,
      );

      if (index === -1) return undefined;

      const current = snapshot.runs[index];
      if (
        current.status !== "running" ||
        !isExpired(current.leaseExpiresAt, now)
      ) {
        return undefined;
      }

      const recovered: JobRun = {
        ...current,
        status: "failed",
        finishedAt: now.toISOString(),
        claimToken: undefined,
        leaseExpiresAt: undefined,
        error: clone(error),
      };

      snapshot.runs[index] = recovered;
      this.writeSnapshot(snapshot);
      return clone(recovered);
    });
  }
  renewRunLease(
    runId: JobRunId,
    claimToken: string,
    leaseDurationMs: number,
    now: Date = new Date(),
  ): JobRun {
    if (!Number.isFinite(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new Error("leaseDurationMs must be a finite positive number");
    }
    assertValidDate(now, "lease renewal time");

    return this.withExclusiveLock(() => {
      const snapshot = this.readSnapshot();
      const index = snapshot.runs.findIndex(
        (candidate) => candidate.id === runId,
      );

      if (index === -1) {
        throw new Error(`Unknown job run: ${runId}`);
      }

      const current = snapshot.runs[index];

      if (!current.claimToken || current.claimToken !== claimToken) {
        throw new Error(`Job run claim token mismatch: ${runId}`);
      }

      if (current.status !== "claimed" && current.status !== "running") {
        throw new Error(
          `Cannot renew lease for ${runId} in status ${current.status}`,
        );
      }

      const renewed: JobRun = {
        ...current,
        leaseExpiresAt: new Date(
          now.getTime() + leaseDurationMs,
        ).toISOString(),
      };

      snapshot.runs[index] = renewed;
      this.writeSnapshot(snapshot);
      return clone(renewed);
    });
  }

  listRunnable(now: Date = new Date()): JobRun[] {
    const threshold = now.getTime();

    return clone(
      this.readSnapshot().runs
        .filter((run) => {
          if (run.status === "queued") return true;
          if (run.status !== "scheduled" || !run.scheduledFor) return false;

          const scheduledAt = Date.parse(run.scheduledFor);
          return Number.isFinite(scheduledAt) && scheduledAt <= threshold;
        })
        .sort((a, b) => {
          const aTime = a.scheduledFor ? Date.parse(a.scheduledFor) : 0;
          const bTime = b.scheduledFor ? Date.parse(b.scheduledFor) : 0;
          return aTime - bTime;
        }),
    );
  }
}

export function createDefaultJobStore(): FileJobStore {
  return new FileJobStore(getDefaultJobStorePath());
}
