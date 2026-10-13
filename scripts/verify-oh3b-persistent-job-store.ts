import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  JobRun,
  ScheduleDefinition,
} from "@chernobog/contracts";
import {
  FileJobStore,
  getDefaultJobStorePath,
} from "@chernobog/core";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const repo = process.cwd();
const coreStoreSourcePath = path.join(
  repo,
  "packages",
  "core",
  "src",
  "jobStore.ts",
);
const runtimeRoot = path.join(repo, "packages", "runtime", "src");

if (!fs.existsSync(coreStoreSourcePath)) {
  fail("Core-owned job persistence source exists");
}
pass("Core-owned job persistence source exists");

const source = fs.readFileSync(coreStoreSourcePath, "utf8");

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "executeGovernedToolAction(",
  "runExecutionTask(",
  "publishEvent(",
  "worker_threads",
]) {
  if (source.includes(forbidden)) {
    fail(`OH-3B remains persistence-only (${forbidden})`);
  }
}
pass("OH-3B remains persistence-only");

const runtimeJobStore = path.join(runtimeRoot, "jobStore.ts");
if (fs.existsSync(runtimeJobStore)) {
  fail("@chernobog/runtime does not own job persistence implementation");
}
pass("@chernobog/runtime does not own job persistence implementation");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh3b-"));
const storePath = path.join(tempRoot, "scheduler", "jobs.json");

const owner = { ownerId: "game-radar" };

const job: JobDefinition = {
  id: "job-game-radar-refresh",
  owner,
  source: { kind: "subsystem", subsystemId: "game-radar" },
  kind: "game-radar.refresh",
  displayName: "Game Radar refresh",
  payload: { reason: "scheduled-refresh" },
  executionPolicy: {
    retry: { mode: "none" },
    concurrency: { mode: "single-active", key: "game-radar.refresh" },
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
    everyMs: 6 * 60 * 60 * 1000,
    anchorAt: "2026-10-03T12:00:00.000Z",
    timezone: "Europe/Dublin",
  },
  createdAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
};

const futureRun: JobRun = {
  id: "run-future",
  jobId: job.id,
  owner,
  source: { kind: "subsystem", subsystemId: "game-radar" },
  status: "scheduled",
  payload: { reason: "scheduled-refresh" },
  attempt: 1,
  scheduledFor: "2026-10-03T18:00:00.000Z",
};

const queuedRun: JobRun = {
  id: "run-now",
  jobId: job.id,
  owner,
  source: { kind: "user" },
  status: "queued",
  payload: { reason: "manual-run-now" },
  attempt: 1,
  queuedAt: "2026-10-03T12:00:00.000Z",
};

const firstProcess = new FileJobStore(storePath);
firstProcess.putJob(job);
firstProcess.putSchedule(schedule);
firstProcess.enqueueRun(futureRun);
firstProcess.enqueueRun(queuedRun);

if (!fs.existsSync(storePath)) {
  fail("job store creates durable backing file");
}
pass("job store creates durable backing file");

// Reconstructing the store simulates process restart for persistence acceptance.
const afterRestart = new FileJobStore(storePath);

if (afterRestart.getJob(job.id)?.kind !== job.kind) {
  fail("job definition survives restart");
}
pass("job definition survives restart");

if (afterRestart.getSchedule(schedule.id)?.jobId !== job.id) {
  fail("schedule survives restart");
}
pass("schedule survives restart");

if (afterRestart.getRun(futureRun.id)?.status !== "scheduled") {
  fail("scheduled run survives restart");
}
pass("scheduled run survives restart");

if (afterRestart.getRun(queuedRun.id)?.status !== "queued") {
  fail("queued run survives restart");
}
pass("queued run survives restart");

const beforeDue = afterRestart.listRunnable(
  new Date("2026-10-03T17:59:59.000Z"),
);
if (beforeDue.length !== 1 || beforeDue[0]?.id !== queuedRun.id) {
  fail("future scheduled run stays non-runnable before due time");
}
pass("future scheduled run stays non-runnable before due time");

const atDue = afterRestart.listRunnable(
  new Date("2026-10-03T18:00:00.000Z"),
);
if (atDue.length !== 2) {
  fail("scheduled run becomes runnable when due");
}
pass("scheduled run becomes runnable when due");

afterRestart.updateRun({
  ...queuedRun,
  status: "succeeded",
  finishedAt: "2026-10-03T12:05:00.000Z",
});

const afterCompletion = afterRestart.listRunnable(
  new Date("2026-10-03T18:00:00.000Z"),
);
if (
  afterCompletion.some((candidate: JobRun) => candidate.id === queuedRun.id)
) {
  fail("completed run leaves runnable queue");
}
pass("completed run leaves runnable queue");

let duplicateRejected = false;
try {
  afterRestart.enqueueRun(futureRun);
} catch {
  duplicateRejected = true;
}
if (!duplicateRejected) {
  fail("duplicate run id is rejected");
}
pass("duplicate run id is rejected");

let orphanScheduleRejected = false;
try {
  afterRestart.putSchedule({
    ...schedule,
    id: "schedule-orphan",
    jobId: "missing-job",
  });
} catch {
  orphanScheduleRejected = true;
}
if (!orphanScheduleRejected) {
  fail("schedule cannot reference unknown job");
}
pass("schedule cannot reference unknown job");

const raw = JSON.parse(fs.readFileSync(storePath, "utf8")) as {
  schemaVersion?: number;
};
if (raw.schemaVersion !== 1) {
  fail("persistent schema version is explicit");
}
pass("persistent schema version is explicit");

const previousDataDir = process.env.CHERNOBOG_DATA_DIR;
process.env.CHERNOBOG_DATA_DIR = tempRoot;
const defaultPath = getDefaultJobStorePath();
if (
  defaultPath !== path.join(tempRoot, "scheduler", "jobs.json")
) {
  fail("default store honors CHERNOBOG_DATA_DIR");
}
pass("default store honors CHERNOBOG_DATA_DIR");

if (previousDataDir === undefined) {
  delete process.env.CHERNOBOG_DATA_DIR;
} else {
  process.env.CHERNOBOG_DATA_DIR = previousDataDir;
}

fs.rmSync(tempRoot, { recursive: true, force: true });

console.log("");
console.log("OH-3B persistent job store verifier complete.");
