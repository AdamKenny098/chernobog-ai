import type {
  JobDefinition,
  JobRun,
  ScheduleDefinition,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

import { SchedulerRuntime } from "./schedulerRuntime";

export type ObservableNextRun = {
  scheduleId: string;
  jobId: string;
  ownerId: string;
  jobKind: string;
  displayName?: string;
  nextRunAt?: string;
  scheduleStatus: ScheduleDefinition["status"];
};

export type JobObservabilitySnapshot = {
  generatedAt: string;
  running: JobRun[];
  queued: JobRun[];
  failures: JobRun[];
  nextRuns: ObservableNextRun[];
};

function runSortTime(run: JobRun): number {
  for (const candidate of [
    run.scheduledFor,
    run.queuedAt,
    run.claimedAt,
    run.startedAt,
  ]) {
    if (!candidate) continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export class JobObservabilityRuntime {
  constructor(private readonly store: FileJobStore) {}

  public listRunning(): JobRun[] {
    return this.store
      .listRuns()
      .filter(
        (run) =>
          run.status === "claimed" ||
          run.status === "running",
      )
      .sort((a, b) => runSortTime(a) - runSortTime(b));
  }

  public listQueued(): JobRun[] {
    return this.store
      .listRuns()
      .filter(
        (run) =>
          run.status === "queued" ||
          run.status === "scheduled",
      )
      .sort((a, b) => runSortTime(a) - runSortTime(b));
  }

  public listFailures(): JobRun[] {
    return this.store
      .listRuns("failed")
      .sort((a, b) => runSortTime(b) - runSortTime(a));
  }

  public getFailure(runId: string): JobRun | undefined {
    const run = this.store.getRun(runId);
    return run?.status === "failed" ? run : undefined;
  }

  public listNextRuns(ownerId?: string): ObservableNextRun[] {
    const scheduler = new SchedulerRuntime(this.store);
    const jobs = new Map<string, JobDefinition>(
      this.store.listJobs().map((job) => [job.id, job]),
    );

    return this.store
      .listSchedules()
      .filter(
        (schedule) =>
          ownerId === undefined ||
          schedule.owner.ownerId === ownerId,
      )
      .map((schedule) => {
        const job = jobs.get(schedule.jobId);
        const next =
          schedule.status === "active"
            ? scheduler.getNextRunAt(schedule)
            : undefined;

        return {
          scheduleId: schedule.id,
          jobId: schedule.jobId,
          ownerId: schedule.owner.ownerId,
          jobKind: job?.kind ?? "unknown",
          ...(job?.displayName
            ? { displayName: job.displayName }
            : {}),
          ...(next
            ? { nextRunAt: next.toISOString() }
            : {}),
          scheduleStatus: schedule.status,
        };
      })
      .sort((a, b) => {
        if (!a.nextRunAt && !b.nextRunAt) return 0;
        if (!a.nextRunAt) return 1;
        if (!b.nextRunAt) return -1;
        return Date.parse(a.nextRunAt) - Date.parse(b.nextRunAt);
      });
  }

  public getJobState(jobId: string): {
    job?: JobDefinition;
    schedules: ScheduleDefinition[];
    runs: JobRun[];
  } {
    return {
      job: this.store.getJob(jobId),
      schedules: this.store
        .listSchedules()
        .filter((schedule) => schedule.jobId === jobId),
      runs: this.store
        .listRuns()
        .filter((run) => run.jobId === jobId),
    };
  }

  public snapshot(now: Date = new Date()): JobObservabilitySnapshot {
    if (!Number.isFinite(now.getTime())) {
      throw new Error("Observability snapshot requires a valid Date");
    }

    return {
      generatedAt: now.toISOString(),
      running: this.listRunning(),
      queued: this.listQueued(),
      failures: this.listFailures(),
      nextRuns: this.listNextRuns(),
    };
  }
}
