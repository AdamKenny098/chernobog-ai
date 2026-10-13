import { randomUUID } from "node:crypto";

import type {
  JobRun,
  ScheduleDefinition,
  ScheduleMissedRunPolicy,
  ScheduleTrigger,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

import {
  JobObservabilityRuntime,
  type JobObservabilitySnapshot,
  type ObservableNextRun,
} from "./jobObservabilityRuntime";
import { SchedulerRuntime } from "./schedulerRuntime";

export type CreateScheduleInput = {
  id: string;
  jobId: string;
  trigger: ScheduleTrigger;
  missedRunPolicy?: ScheduleMissedRunPolicy;
};

export type RescheduleInput = {
  scheduleId: string;
  trigger: ScheduleTrigger;
  missedRunPolicy?: ScheduleMissedRunPolicy;
};

export type RunNowInput = {
  jobId: string;
  payload?: unknown;
};

export class JobControlRuntime {
  private readonly scheduler: SchedulerRuntime;
  private readonly observability: JobObservabilityRuntime;

  constructor(private readonly store: FileJobStore) {
    this.scheduler = new SchedulerRuntime(store);
    this.observability = new JobObservabilityRuntime(store);
  }

  public schedule(
    input: CreateScheduleInput,
    now: Date = new Date(),
  ): ScheduleDefinition {
    if (!input.id.trim()) {
      throw new Error("schedule id is required");
    }

    const job = this.store.getJob(input.jobId);
    if (!job) {
      throw new Error(`Unknown job: ${input.jobId}`);
    }

    const timestamp = now.toISOString();

    const schedule: ScheduleDefinition = {
      id: input.id,
      jobId: job.id,
      owner: job.owner,
      status: "active",
      trigger: input.trigger,
      ...(input.missedRunPolicy
        ? { missedRunPolicy: input.missedRunPolicy }
        : {}),
      lastReconciledAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.store.putSchedule(schedule);
    return schedule;
  }

  public reschedule(
    input: RescheduleInput,
    now: Date = new Date(),
  ): ScheduleDefinition {
    const current = this.store.getSchedule(input.scheduleId);
    if (!current) {
      throw new Error(`Unknown schedule: ${input.scheduleId}`);
    }

    const updated: ScheduleDefinition = {
      ...current,
      trigger: input.trigger,
      ...(input.missedRunPolicy !== undefined
        ? { missedRunPolicy: input.missedRunPolicy }
        : {}),
      lastReconciledAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return this.scheduler.replaceSchedule(updated);
  }

  public pause(
    scheduleId: string,
    now: Date = new Date(),
  ): ScheduleDefinition {
    return this.scheduler.setScheduleStatus(
      scheduleId,
      "paused",
      now,
    );
  }

  public resume(
    scheduleId: string,
    now: Date = new Date(),
  ): ScheduleDefinition {
    return this.scheduler.setScheduleStatus(
      scheduleId,
      "active",
      now,
    );
  }

  public cancel(
    scheduleId: string,
    now: Date = new Date(),
  ): ScheduleDefinition {
    return this.scheduler.setScheduleStatus(
      scheduleId,
      "cancelled",
      now,
    );
  }

  public runNow(
    input: RunNowInput,
    now: Date = new Date(),
  ): JobRun {
    const job = this.store.getJob(input.jobId);
    if (!job) {
      throw new Error(`Unknown job: ${input.jobId}`);
    }

    if (!job.enabled) {
      throw new Error(`Job is disabled: ${input.jobId}`);
    }

    const runId = `run-now:${job.id}:${randomUUID()}`;

    const run: JobRun = {
      id: runId,
      jobId: job.id,
      owner: job.owner,
      source: { kind: "user" },
      status: "queued",
      payload:
        input.payload === undefined
          ? job.payload
          : input.payload,
      attempt: 1,
      idempotencyKey: runId,
      queuedAt: now.toISOString(),
    };

    this.store.enqueueRun(run);
    return run;
  }

  public listSchedules(): ScheduleDefinition[] {
    return this.store.listSchedules();
  }

  public listQueued(): JobRun[] {
    return this.observability.listQueued();
  }

  public showJob(jobId: string) {
    return this.observability.getJobState(jobId);
  }

  public showFailures(): JobRun[] {
    return this.observability.listFailures();
  }

  public showNextRuns(ownerId?: string): ObservableNextRun[] {
    return this.observability.listNextRuns(ownerId);
  }

  public snapshot(now: Date = new Date()): JobObservabilitySnapshot {
    return this.observability.snapshot(now);
  }
}
