import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  ScheduleDefinition,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  nextOccurrenceAfter,
  SchedulerRuntime,
} from "@chernobog/runtime";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const repo = process.cwd();
const schedulerSourcePath = path.join(
  repo,
  "packages",
  "runtime",
  "src",
  "schedulerRuntime.ts",
);

if (!fs.existsSync(schedulerSourcePath)) {
  fail("runtime scheduler source exists");
}
pass("runtime scheduler source exists");

const schedulerSource = fs.readFileSync(schedulerSourcePath, "utf8");

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "executeGovernedToolAction(",
  "runExecutionTask(",
  "publishEvent(",
]) {
  if (schedulerSource.includes(forbidden)) {
    fail(`OH-3C scheduler does not execute jobs or own timer loops (${forbidden})`);
  }
}
pass("OH-3C scheduler remains materialization-only");

const sixHours = 6 * 60 * 60 * 1000;
const intervalNext = nextOccurrenceAfter(
  {
    kind: "interval",
    everyMs: sixHours,
    anchorAt: "2026-10-03T00:00:00.000Z",
    timezone: "Europe/Dublin",
  },
  new Date("2026-10-03T12:00:00.000Z"),
);

if (intervalNext?.toISOString() !== "2026-10-03T18:00:00.000Z") {
  fail("six-hour interval calculates deterministic next occurrence");
}
pass("six-hour interval calculates deterministic next occurrence");

const onceFuture = nextOccurrenceAfter(
  {
    kind: "once",
    runAt: "2026-10-03T15:30:00.000Z",
    timezone: "Europe/Dublin",
  },
  new Date("2026-10-03T12:00:00.000Z"),
);
if (onceFuture?.toISOString() !== "2026-10-03T15:30:00.000Z") {
  fail("future one-shot occurrence resolves");
}
pass("future one-shot occurrence resolves");

const oncePast = nextOccurrenceAfter(
  {
    kind: "once",
    runAt: "2026-10-03T11:30:00.000Z",
    timezone: "Europe/Dublin",
  },
  new Date("2026-10-03T12:00:00.000Z"),
);
if (oncePast !== undefined) {
  fail("past one-shot has no future occurrence");
}
pass("past one-shot has no future occurrence");

// 09:00 local Europe/Dublin on 3 Oct 2026 is 08:00 UTC (IST, UTC+1).
const dailyCron = nextOccurrenceAfter(
  {
    kind: "cron",
    expression: "0 9 * * *",
    timezone: "Europe/Dublin",
  },
  new Date("2026-10-03T07:30:00.000Z"),
);
if (dailyCron?.toISOString() !== "2026-10-03T08:00:00.000Z") {
  fail("daily cron honors Europe/Dublin timezone");
}
pass("daily cron honors Europe/Dublin timezone");

// Saturday 3 Oct -> next Monday 5 Oct 2026 at 09:00 local / 08:00 UTC.
const weeklyCron = nextOccurrenceAfter(
  {
    kind: "cron",
    expression: "0 9 * * 1",
    timezone: "Europe/Dublin",
  },
  new Date("2026-10-03T12:00:00.000Z"),
);
if (weeklyCron?.toISOString() !== "2026-10-05T08:00:00.000Z") {
  fail("weekly cron resolves next weekday in timezone");
}
pass("weekly cron resolves next weekday in timezone");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh3c-"));
const store = new FileJobStore(path.join(tempRoot, "jobs.json"));

const owner = { ownerId: "game-radar" };
const job: JobDefinition = {
  id: "job-game-radar-refresh",
  owner,
  source: { kind: "subsystem", subsystemId: "game-radar" },
  kind: "game-radar.refresh",
  payload: { reason: "scheduled-refresh" },
  executionPolicy: {
    retry: { mode: "none" },
    concurrency: { mode: "single-active", key: "game-radar.refresh" },
  },
  enabled: true,
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
};

const schedule: ScheduleDefinition = {
  id: "schedule-game-radar-six-hour",
  jobId: job.id,
  owner,
  status: "active",
  trigger: {
    kind: "interval",
    everyMs: sixHours,
    anchorAt: "2026-10-03T00:00:00.000Z",
    timezone: "Europe/Dublin",
  },
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
};

store.putJob(job);
store.putSchedule(schedule);

const scheduler = new SchedulerRuntime(store);

const firstTick = scheduler.tick(new Date("2026-10-03T00:00:00.000Z"));
if (
  firstTick.materializedRuns.length !== 1 ||
  firstTick.materializedRuns[0]?.scheduledFor !== "2026-10-03T00:00:00.000Z"
) {
  fail("scheduler materializes first due Game Radar occurrence");
}
pass("scheduler materializes first due Game Radar occurrence");

const earlyTick = scheduler.tick(new Date("2026-10-03T05:59:59.000Z"));
if (earlyTick.materializedRuns.length !== 0) {
  fail("scheduler does not materialize interval early");
}
pass("scheduler does not materialize interval early");

const sixHourTick = scheduler.tick(new Date("2026-10-03T06:00:00.000Z"));
if (
  sixHourTick.materializedRuns.length !== 1 ||
  sixHourTick.materializedRuns[0]?.scheduledFor !==
    "2026-10-03T06:00:00.000Z"
) {
  fail("Game Radar six-hour schedule materializes when due");
}
pass("Game Radar six-hour schedule materializes when due");

const duplicateTick = scheduler.tick(new Date("2026-10-03T06:00:00.000Z"));
if (duplicateTick.materializedRuns.length !== 0) {
  fail("same occurrence is not materialized twice");
}
pass("same occurrence is not materialized twice");

scheduler.setScheduleStatus(
  schedule.id,
  "paused",
  new Date("2026-10-03T06:01:00.000Z"),
);

const pausedTick = scheduler.tick(new Date("2026-10-03T12:00:00.000Z"));
if (
  pausedTick.materializedRuns.length !== 0 ||
  pausedTick.skippedPaused !== 1
) {
  fail("paused schedule does not materialize work");
}
pass("paused schedule does not materialize work");

scheduler.setScheduleStatus(
  schedule.id,
  "active",
  new Date("2026-10-03T12:01:00.000Z"),
);

const resumedTick = scheduler.tick(new Date("2026-10-03T12:01:00.000Z"));
if (resumedTick.materializedRuns.length !== 1) {
  fail("resumed schedule can materialize due work");
}
pass("resumed schedule can materialize due work");

const persistedRuns = new FileJobStore(
  path.join(tempRoot, "jobs.json"),
).listRuns();
if (persistedRuns.length !== 3) {
  fail("scheduler materializations persist through OH-3B store");
}
pass("scheduler materializations persist through OH-3B store");

if (
  persistedRuns.some(
    (run) =>
      run.status !== "queued" ||
      run.scheduleId !== schedule.id,
  )
) {
  fail("scheduler creates queued schedule-linked runs only");
}
pass("scheduler creates queued schedule-linked runs only");

fs.rmSync(tempRoot, { recursive: true, force: true });

console.log("");
console.log("OH-3C scheduler engine verifier complete.");
