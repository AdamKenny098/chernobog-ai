import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  JobControlRuntime,
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

  const routePath = path.join(
    repo,
    "app",
    "api",
    "jobs",
    "route.ts",
  );
  const controlPath = path.join(
    repo,
    "packages",
    "runtime",
    "src",
    "jobControlRuntime.ts",
  );

  if (!fs.existsSync(routePath)) {
    fail("/api/jobs control route exists");
  }
  pass("/api/jobs control route exists");

  if (!fs.existsSync(controlPath)) {
    fail("JobControlRuntime exists");
  }
  pass("JobControlRuntime exists");

  const routeSource = fs.readFileSync(routePath, "utf8");

  for (const action of [
    '"schedule"',
    '"reschedule"',
    '"pause"',
    '"resume"',
    '"cancel"',
    '"run-now"',
  ]) {
    if (!routeSource.includes(action)) {
      fail(`control route exposes ${action}`);
    }
  }
  pass("mutation control actions are exposed");

  for (const view of [
    '"schedules"',
    '"queued"',
    '"failures"',
    '"next-runs"',
    '"job"',
    '"snapshot"',
  ]) {
    if (!routeSource.includes(view)) {
      fail(`control route exposes ${view}`);
    }
  }
  pass("inspection control views are exposed");

  if (!routeSource.includes("createJobEventSpineObserver")) {
    fail("control surface composes store with Event Spine observer");
  }
  pass("control surface composes Event Spine truth");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chernobog-oh3i-"),
  );

  const store = new FileJobStore(
    path.join(tempRoot, "jobs.json"),
  );
  const control = new JobControlRuntime(store);

  const job: JobDefinition = {
    id: "job-game-radar",
    owner: { ownerId: "game-radar" },
    source: { kind: "subsystem", subsystemId: "game-radar" },
    kind: "game-radar.refresh",
    displayName: "Game Radar refresh",
    payload: { source: "scheduled" },
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: {
        mode: "single-active",
        key: "game-radar.refresh",
      },
    },
    enabled: true,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  };

  store.putJob(job);

  const schedule = control.schedule(
    {
      id: "schedule-game-radar-six-hour",
      jobId: job.id,
      trigger: {
        kind: "interval",
        everyMs: 6 * 60 * 60 * 1000,
        anchorAt: "2026-10-03T12:00:00.000Z",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "run-once" },
    },
    new Date("2026-10-03T12:00:00.000Z"),
  );

  if (
    schedule.status !== "active" ||
    control.listSchedules().length !== 1
  ) {
    fail("schedule action creates active persistent schedule");
  }
  pass("schedule action creates active persistent schedule");

  const paused = control.pause(
    schedule.id,
    new Date("2026-10-03T12:01:00.000Z"),
  );
  if (paused.status !== "paused") {
    fail("pause action persists");
  }
  pass("pause action persists");

  const resumed = control.resume(
    schedule.id,
    new Date("2026-10-03T12:02:00.000Z"),
  );
  if (resumed.status !== "active") {
    fail("resume action persists");
  }
  pass("resume action persists");

  const rescheduled = control.reschedule(
    {
      scheduleId: schedule.id,
      trigger: {
        kind: "cron",
        expression: "0 9 * * 1",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "skip" },
    },
    new Date("2026-10-03T12:03:00.000Z"),
  );

  if (
    rescheduled.trigger.kind !== "cron" ||
    rescheduled.missedRunPolicy?.mode !== "skip"
  ) {
    fail("reschedule action replaces trigger/policy");
  }
  pass("reschedule action replaces trigger/policy");

  const nextRuns = control.showNextRuns("game-radar");
  if (
    nextRuns.length !== 1 ||
    nextRuns[0]?.nextRunAt !== "2026-10-05T08:00:00.000Z"
  ) {
    fail("next-runs control returns canonical scheduler result");
  }
  pass("next-runs control returns canonical scheduler result");

  const runNow = control.runNow(
    {
      jobId: job.id,
      payload: { source: "manual" },
    },
    new Date("2026-10-03T12:04:00.000Z"),
  );

  if (
    runNow.status !== "queued" ||
    runNow.payload === undefined ||
    control.listQueued().length !== 1
  ) {
    fail("run-now creates immediately runnable queued work");
  }
  pass("run-now creates immediately runnable queued work");

  const jobState = control.showJob(job.id);
  if (
    jobState.job?.id !== job.id ||
    jobState.schedules.length !== 1 ||
    jobState.runs.length !== 1
  ) {
    fail("show-job returns authoritative job/schedule/run state");
  }
  pass("show-job returns authoritative job/schedule/run state");

  const cancelled = control.cancel(
    schedule.id,
    new Date("2026-10-03T12:05:00.000Z"),
  );
  if (cancelled.status !== "cancelled") {
    fail("cancel action persists");
  }
  pass("cancel action persists");

  const scheduler = new SchedulerRuntime(store);
  const cancelledTick = scheduler.tick(
    new Date("2026-10-05T08:00:00.000Z"),
  );
  if (
    cancelledTick.materializedRuns.some(
      (run) => run.scheduleId === schedule.id,
    )
  ) {
    fail("cancelled schedule does not create future work");
  }
  pass("cancelled schedule does not create future work");

  const snapshot = control.snapshot(
    new Date("2026-10-03T12:06:00.000Z"),
  );
  if (
    snapshot.queued.length !== 1 ||
    snapshot.nextRuns.length !== 1
  ) {
    fail("control snapshot exposes current scheduler state");
  }
  pass("control snapshot exposes current scheduler state");

  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3I scheduling control verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
