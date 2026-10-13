import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  JobRun,
  ScheduleDefinition,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  JobObservabilityRuntime,
  JobWorkerRuntime,
  SchedulerRuntime,
} from "@chernobog/runtime";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const repo = process.cwd();

  const adapterSource = fs.readFileSync(
    path.join(repo, "lib", "chernobog", "jobs", "jobEventSpine.ts"),
    "utf8",
  );

  if (!adapterSource.includes("publishChernobogEventSafely")) {
    fail("OH-3 job lifecycle uses accepted Event Spine publisher");
  }
  pass("OH-3 job lifecycle uses accepted Event Spine publisher");

  for (const eventType of [
    "job.scheduled",
    "job.queued",
    "job.claimed",
    "job.started",
    "job.completed",
    "job.failed",
    "job.retry_scheduled",
    "job.cancelled",
    "job.paused",
    "job.recovered",
  ]) {
    if (!adapterSource.includes(`"${eventType}"`)) {
      fail(`Event Spine adapter declares ${eventType}`);
    }
  }
  pass("required OH-3 lifecycle event vocabulary is declared");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chernobog-oh3h-"),
  );
  const eventLog = path.join(tempRoot, "events.jsonl");
  process.env.CHERNOBOG_EVENT_LOG_PATH = eventLog;

  const {
    createJobEventSpineObserver,
    flushJobEventSpine,
  } = await import("../lib/chernobog/jobs/jobEventSpine");

  const storePath = path.join(tempRoot, "jobs.json");
  const store = new FileJobStore(
    storePath,
    createJobEventSpineObserver(),
  );

  const owner = { ownerId: "game-radar" };
  const sixHours = 6 * 60 * 60 * 1000;

  const job: JobDefinition = {
    id: "job-game-radar",
    owner,
    source: { kind: "subsystem", subsystemId: "game-radar" },
    kind: "test.observable",
    displayName: "Game Radar refresh",
    payload: {},
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: { mode: "single-active", key: "game-radar" },
    },
    enabled: true,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  };

  const schedule: ScheduleDefinition = {
    id: "schedule-game-radar-six-hour",
    jobId: job.id,
    owner,
    status: "active",
    trigger: {
      kind: "interval",
      everyMs: sixHours,
      anchorAt: "2026-10-03T12:00:00.000Z",
      timezone: "Europe/Dublin",
    },
    missedRunPolicy: { mode: "run-once" },
    lastReconciledAt: "2026-10-03T11:59:59.999Z",
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  };

  store.putJob(job);
  store.putSchedule(schedule);

  const scheduler = new SchedulerRuntime(store);
  const tick = scheduler.tick(
    new Date("2026-10-03T12:00:00.000Z"),
  );

  if (tick.materializedRuns.length !== 1) {
    fail("scheduler creates observable queued run");
  }
  pass("scheduler creates observable queued run");

  let executionCalls = 0;
  const worker = new JobWorkerRuntime(
    store,
    {
      "test.observable": async () => {
        executionCalls += 1;
        return { summary: "observed success" };
      },
    },
    "observable-worker",
    () => new Date("2026-10-03T12:00:01.000Z"),
    60_000,
  );

  const result = await worker.runNext();
  if (result.outcome !== "succeeded" || executionCalls !== 1) {
    fail("observable worker executes queued job");
  }
  pass("observable worker executes queued job");

  scheduler.setScheduleStatus(
    schedule.id,
    "paused",
    new Date("2026-10-03T12:00:02.000Z"),
  );

  // Seed a visible terminal failure for observability queries.
  const failedJob: JobDefinition = {
    ...job,
    id: "job-failure",
    kind: "test.failure",
    displayName: "Failure demonstration",
  };
  store.putJob(failedJob);

  const failedRun: JobRun = {
    id: "run-failure",
    jobId: failedJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
    queuedAt: "2026-10-03T12:01:00.000Z",
  };
  store.enqueueRun(failedRun);

  const failingWorker = new JobWorkerRuntime(
    store,
    {
      "test.failure": async () => {
        throw new Error("synthetic terminal failure");
      },
    },
    "failure-worker",
    () => new Date("2026-10-03T12:01:01.000Z"),
    60_000,
  );

  const failedResult = await failingWorker.runNext();
  if (failedResult.outcome !== "failed") {
    fail("failure lifecycle completes visibly");
  }
  pass("failure lifecycle completes visibly");

  await flushJobEventSpine();

  if (!fs.existsSync(eventLog)) {
    fail("Event Spine durable log is written");
  }

  const events = fs
    .readFileSync(eventLog, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type?: string });

  const eventTypes = new Set(events.map((event) => event.type));

  for (const required of [
    "job.scheduled",
    "job.queued",
    "job.claimed",
    "job.started",
    "job.completed",
    "job.paused",
    "job.failed",
  ]) {
    if (!eventTypes.has(required)) {
      fail(`Event Spine contains ${required}`);
    }
  }
  pass("Event Spine contains durable scheduler/worker lifecycle truth");

  const observability = new JobObservabilityRuntime(store);

  if (observability.listRunning().length !== 0) {
    fail("observability reports no jobs running after completion");
  }
  pass("observability answers what jobs are running");

  const failures = observability.listFailures();
  if (
    failures.length !== 1 ||
    failures[0]?.id !== failedRun.id ||
    failures[0]?.error?.message !== "synthetic terminal failure"
  ) {
    fail("observability exposes failure reason");
  }
  pass("observability answers why a job failed");

  const pausedNext = observability.listNextRuns("game-radar");
  if (
    pausedNext.length < 1 ||
    pausedNext[0]?.scheduleStatus !== "paused" ||
    pausedNext[0]?.nextRunAt !== undefined
  ) {
    fail("paused Game Radar schedule reports no next active run");
  }
  pass("observability exposes paused schedule truth");

  scheduler.setScheduleStatus(
    schedule.id,
    "active",
    new Date("2026-10-03T12:00:03.000Z"),
  );

  const nextRuns = observability.listNextRuns("game-radar");
  const gameRadar = nextRuns.find(
    (entry) => entry.scheduleId === schedule.id,
  );

  if (
    !gameRadar ||
    gameRadar.nextRunAt !== "2026-10-03T18:00:00.000Z"
  ) {
    fail("observability answers when Game Radar next runs");
  }
  pass("observability answers when Game Radar next runs");

  const snapshot = observability.snapshot(
    new Date("2026-10-03T12:05:00.000Z"),
  );

  if (
    snapshot.failures.length !== 1 ||
    snapshot.nextRuns.length < 1
  ) {
    fail("observability snapshot reconstructs job state without worker internals");
  }
  pass("observability snapshot reconstructs job state without worker internals");

  await flushJobEventSpine();
  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3H event/state observability verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
