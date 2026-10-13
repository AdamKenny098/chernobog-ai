import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  JobRun,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  JobWorkerRuntime,
  type JobHandler,
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
const workerSourcePath = path.join(
  repo,
  "packages",
  "runtime",
  "src",
  "jobWorkerRuntime.ts",
);
const bridgeSourcePath = path.join(
  repo,
  "lib",
  "chernobog",
  "jobs",
  "commandJobHandler.ts",
);

if (!fs.existsSync(workerSourcePath)) fail("worker runtime source exists");
pass("worker runtime source exists");

if (!fs.existsSync(bridgeSourcePath)) fail("command pipeline bridge exists");
pass("command pipeline bridge exists");

const workerSource = fs.readFileSync(workerSourcePath, "utf8");
const bridgeSource = fs.readFileSync(bridgeSourcePath, "utf8");

for (const forbidden of [
  "executeGovernedToolAction(",
  "executeTool(",
  "invokeTool(",
  "runExecutionTask(",
]) {
  if (workerSource.includes(forbidden)) {
    fail(`worker owns no direct execution bypass (${forbidden})`);
  }
}
pass("worker owns no direct execution bypass");

if (!bridgeSource.includes("runCommandPipeline")) {
  fail("built-in command handler re-enters OH-2 command pipeline");
}
pass("built-in command handler re-enters OH-2 command pipeline");

for (const forbidden of [
  "executeGovernedToolAction(",
  "executeTool(",
  "invokeTool(",
  "runExecutionTask(",
  "getActionRuntime(",
  "getPlannerRuntime(",
  "getRouterRuntime(",
]) {
  if (bridgeSource.includes(forbidden)) {
    fail(`command bridge does not bypass OH-2 pipeline (${forbidden})`);
  }
}
pass("command bridge does not bypass OH-2 pipeline");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh3d-"));
const store = new FileJobStore(path.join(tempRoot, "jobs.json"));

let time = Date.parse("2026-10-03T12:00:00.000Z");
const clock = () => {
  const current = new Date(time);
  time += 1_000;
  return current;
};

const owner = { ownerId: "system" };

const successJob: JobDefinition = {
  id: "job-success",
  owner,
  source: { kind: "system" },
  kind: "test.success",
  payload: { value: 42 },
  executionPolicy: {
    retry: { mode: "none" },
    concurrency: { mode: "allow" },
  },
  enabled: true,
  createdAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
};

const successRun: JobRun = {
  id: "run-success",
  jobId: successJob.id,
  owner,
  source: { kind: "system" },
  status: "queued",
  payload: successJob.payload,
  attempt: 1,
  queuedAt: "2026-10-03T12:00:00.000Z",
};

store.putJob(successJob);
store.enqueueRun(successRun);

let called = 0;
const successHandler: JobHandler = async ({ job, run, workerId }) => {
  called += 1;

  if (job.id !== successJob.id) {
    throw new Error("worker supplied wrong job");
  }
  if (run.status !== "running") {
    throw new Error("handler must receive running run");
  }
  if (workerId !== "worker-test-1") {
    throw new Error("worker id not propagated");
  }

  return { summary: "success" };
};

const worker = new JobWorkerRuntime(
  store,
  { "test.success": successHandler },
  "worker-test-1",
  clock,
);

const success = await worker.runNext();

if (success.outcome !== "succeeded") {
  fail("queued job executes successfully");
}
pass("queued job executes successfully");

if (called !== 1) {
  fail("registered handler executes exactly once");
}
pass("registered handler executes exactly once");

const persistedSuccess = store.getRun(successRun.id);
if (
  persistedSuccess?.status !== "succeeded" ||
  persistedSuccess.workerId !== "worker-test-1" ||
  !persistedSuccess.claimedAt ||
  !persistedSuccess.startedAt ||
  !persistedSuccess.finishedAt
) {
  fail("worker persists claim/start/success lifecycle");
}
pass("worker persists claim/start/success lifecycle");

const idle = await worker.runNext();
if (idle.outcome !== "idle") {
  fail("worker reports idle when queue is empty");
}
pass("worker reports idle when queue is empty");

const failureJob: JobDefinition = {
  ...successJob,
  id: "job-failure",
  kind: "test.failure",
  updatedAt: "2026-10-03T12:10:00.000Z",
};

const failureRun: JobRun = {
  ...successRun,
  id: "run-failure",
  jobId: failureJob.id,
  status: "queued",
  queuedAt: "2026-10-03T12:10:00.000Z",
};

store.putJob(failureJob);
store.enqueueRun(failureRun);

const failingWorker = new JobWorkerRuntime(
  store,
  {
    "test.failure": async () => {
      throw new Error("synthetic failure");
    },
  },
  "worker-test-2",
  clock,
);

const failure = await failingWorker.runNext();

if (failure.outcome !== "failed") {
  fail("handler failure becomes failed job run");
}
pass("handler failure becomes failed job run");

const persistedFailure = store.getRun(failureRun.id);
if (
  persistedFailure?.status !== "failed" ||
  persistedFailure.error?.message !== "synthetic failure" ||
  !persistedFailure.finishedAt
) {
  fail("worker persists terminal failure");
}
pass("worker persists terminal failure");

const noHandlerJob: JobDefinition = {
  ...successJob,
  id: "job-no-handler",
  kind: "test.unregistered",
};

const noHandlerRun: JobRun = {
  ...successRun,
  id: "run-no-handler",
  jobId: noHandlerJob.id,
  status: "queued",
};

store.putJob(noHandlerJob);
store.enqueueRun(noHandlerRun);

const noHandlerWorker = new JobWorkerRuntime(
  store,
  {},
  "worker-test-3",
  clock,
);

const noHandler = await noHandlerWorker.runNext();
if (
  noHandler.outcome !== "failed" ||
  noHandler.run.error?.code !== "missing_handler"
) {
  fail("unregistered job kind fails visibly");
}
pass("unregistered job kind fails visibly");

const restartStore = new FileJobStore(path.join(tempRoot, "jobs.json"));
if (
  restartStore.getRun(successRun.id)?.status !== "succeeded" ||
  restartStore.getRun(failureRun.id)?.status !== "failed"
) {
  fail("worker outcomes survive restart");
}
pass("worker outcomes survive restart");

fs.rmSync(tempRoot, { recursive: true, force: true });

console.log("");
console.log("OH-3D worker execution verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
