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

/**
 * OH-3B persistence snapshot.
 *
 * This is Core-owned runtime/session/state persistence. Runtime remains the
 * composition/execution authority and intentionally owns no filesystem code.
 */
export type JobStoreSnapshot = {
  schemaVersion: 1;
  jobs: JobDefinition[];
  schedules: ScheduleDefinition[];
  runs: JobRun[];
};

const EMPTY_SNAPSHOT: JobStoreSnapshot = {
  schemaVersion: 1,
  jobs: [],
  schedules: [],
  runs: [],
};

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

function writeSnapshotAtomically(
  filePath: string,
  snapshot: JobStoreSnapshot,
): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(
    tempPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  // Windows does not reliably allow rename-over-existing. Keep the replacement
  // bounded and explicit; leasing/parallel-writer protection belongs to OH-3E.
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  fs.renameSync(tempPath, filePath);
}

export function getDefaultJobStorePath(): string {
  const dataRoot =
    process.env.CHERNOBOG_DATA_DIR?.trim() ||
    path.join(process.cwd(), "data", "chernobog");

  return path.join(dataRoot, "scheduler", "jobs.json");
}

/**
 * Durable OH-3 job/schedule/run repository.
 *
 * OH-3B deliberately provides persistence and runnable-work querying only.
 * It does NOT execute work, run timers, claim leases, retry failures, or emit
 * Event Spine events. Those responsibilities begin in OH-3C and later.
 */
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

  getSnapshot(): JobStoreSnapshot {
    return clone(this.readSnapshot());
  }

  putJob(job: JobDefinition): void {
    const snapshot = this.readSnapshot();
    assertUniqueId(snapshot.jobs, job.id, "Job");
    snapshot.jobs.push(clone(job));
    this.writeSnapshot(snapshot);
  }

  upsertJob(job: JobDefinition): void {
    const snapshot = this.readSnapshot();
    const index = snapshot.jobs.findIndex((candidate) => candidate.id === job.id);

    if (index === -1) {
      snapshot.jobs.push(clone(job));
    } else {
      snapshot.jobs[index] = clone(job);
    }

    this.writeSnapshot(snapshot);
  }

  getJob(id: JobId): JobDefinition | undefined {
    const job = this.readSnapshot().jobs.find((candidate) => candidate.id === id);
    return cloneOptional(job);
  }

  listJobs(): JobDefinition[] {
    return clone(this.readSnapshot().jobs);
  }

  putSchedule(schedule: ScheduleDefinition): void {
    const snapshot = this.readSnapshot();

    if (!snapshot.jobs.some((job) => job.id === schedule.jobId)) {
      throw new Error(
        `Schedule ${schedule.id} references unknown job: ${schedule.jobId}`,
      );
    }

    assertUniqueId(snapshot.schedules, schedule.id, "Schedule");
    snapshot.schedules.push(clone(schedule));
    this.writeSnapshot(snapshot);
  }

  upsertSchedule(schedule: ScheduleDefinition): void {
    const snapshot = this.readSnapshot();

    if (!snapshot.jobs.some((job) => job.id === schedule.jobId)) {
      throw new Error(
        `Schedule ${schedule.id} references unknown job: ${schedule.jobId}`,
      );
    }

    const index = snapshot.schedules.findIndex(
      (candidate) => candidate.id === schedule.id,
    );

    if (index === -1) {
      snapshot.schedules.push(clone(schedule));
    } else {
      snapshot.schedules[index] = clone(schedule);
    }

    this.writeSnapshot(snapshot);
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

    const snapshot = this.readSnapshot();

    if (!snapshot.jobs.some((job) => job.id === run.jobId)) {
      throw new Error(`Run ${run.id} references unknown job: ${run.jobId}`);
    }

    assertUniqueId(snapshot.runs, run.id, "Job run");
    snapshot.runs.push(clone(run));
    this.writeSnapshot(snapshot);
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
    const snapshot = this.readSnapshot();
    const index = snapshot.runs.findIndex((candidate) => candidate.id === run.id);

    if (index === -1) {
      throw new Error(`Unknown job run: ${run.id}`);
    }

    if (snapshot.runs[index].jobId !== run.jobId) {
      throw new Error(`Job run ${run.id} cannot change owning job`);
    }

    snapshot.runs[index] = clone(run);
    this.writeSnapshot(snapshot);
  }

  /**
   * Returns work that is eligible to be claimed later by OH-3D/E.
   *
   * This method does not mutate status or claim ownership.
   */
  listRunnable(now: Date = new Date()): JobRun[] {
    const threshold = now.getTime();

    return clone(
      this.readSnapshot().runs
        .filter((run) => {
          if (run.status === "queued") {
            return true;
          }

          if (run.status !== "scheduled" || !run.scheduledFor) {
            return false;
          }

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
