import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  JobRun,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  calculateRetryDelayMs,
  JobExecutionError,
  JobWorkerRuntime,
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
  const workerSource = fs.readFileSync(
    path.join(repo, "packages", "runtime", "src", "jobWorkerRuntime.ts"),
    "utf8",
  );

  if (!workerSource.includes("calculateRetryDelayMs")) {
    fail("worker exposes deterministic retry backoff calculation");
  }
  pass("worker exposes deterministic retry backoff calculation");

  const fixed = calculateRetryDelayMs(
    {
      mode: "bounded",
      maxAttempts: 3,
      backoff: { kind: "fixed", delayMs: 5_000 },
    },
    1,
  );
  if (fixed !== 5_000) {
    fail("fixed retry delay is deterministic");
  }
  pass("fixed retry delay is deterministic");

  const exponential1 = calculateRetryDelayMs(
    {
      mode: "bounded",
      maxAttempts: 5,
      backoff: {
        kind: "exponential",
        initialDelayMs: 1_000,
        maxDelayMs: 10_000,
        multiplier: 2,
      },
    },
    1,
  );
  const exponential3 = calculateRetryDelayMs(
    {
      mode: "bounded",
      maxAttempts: 5,
      backoff: {
        kind: "exponential",
        initialDelayMs: 1_000,
        maxDelayMs: 3_000,
        multiplier: 2,
      },
    },
    3,
  );

  if (exponential1 !== 1_000 || exponential3 !== 3_000) {
    fail("exponential retry delay grows and clamps");
  }
  pass("exponential retry delay grows and clamps");

  const exhausted = calculateRetryDelayMs(
    {
      mode: "bounded",
      maxAttempts: 3,
      backoff: { kind: "fixed", delayMs: 1_000 },
    },
    3,
  );
  if (exhausted !== undefined) {
    fail("maxAttempts is total-attempt bound");
  }
  pass("maxAttempts is total-attempt bound");

  const noRetry = calculateRetryDelayMs(
    { mode: "none" },
    1,
  );
  if (noRetry !== undefined) {
    fail("retry mode none never schedules retry");
  }
  pass("retry mode none never schedules retry");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chernobog-oh3f-"),
  );
  const storePath = path.join(tempRoot, "jobs.json");
  const store = new FileJobStore(storePath);
  const owner = { ownerId: "system" };

  const transientJob: JobDefinition = {
    id: "job-transient",
    owner,
    source: { kind: "system" },
    kind: "test.transient",
    payload: {},
    executionPolicy: {
      retry: {
        mode: "bounded",
        maxAttempts: 3,
        backoff: { kind: "fixed", delayMs: 5_000 },
      },
      concurrency: { mode: "single-active", key: "test.transient" },
    },
    enabled: true,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  };

  const transientRun: JobRun = {
    id: "run-transient",
    jobId: transientJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
    idempotencyKey: "transient-operation",
    queuedAt: "2026-10-03T12:00:00.000Z",
  };

  store.putJob(transientJob);
  store.enqueueRun(transientRun);

  let transientCalls = 0;
  let time = Date.parse("2026-10-03T12:00:00.000Z");
  const clock = () => new Date(time);

  const transientWorker = new JobWorkerRuntime(
    store,
    {
      "test.transient": async () => {
        transientCalls += 1;
        if (transientCalls === 1) {
          throw new JobExecutionError("network temporarily unavailable", {
            code: "network_unavailable",
            retryable: true,
          });
        }
        return { summary: "recovered" };
      },
    },
    "worker-transient",
    clock,
    60_000,
  );

  const firstAttempt = await transientWorker.runNext();

  if (
    firstAttempt.outcome !== "retry_scheduled" ||
    firstAttempt.run.status !== "scheduled" ||
    firstAttempt.run.attempt !== 2 ||
    firstAttempt.run.scheduledFor !== "2026-10-03T12:00:05.000Z" ||
    firstAttempt.run.error?.retryable !== true
  ) {
    fail("transient failure becomes durable scheduled retry");
  }
  pass("transient failure becomes durable scheduled retry");

  if (
    firstAttempt.run.workerId !== undefined ||
    firstAttempt.run.claimToken !== undefined ||
    firstAttempt.run.leaseExpiresAt !== undefined
  ) {
    fail("retry releases prior worker lease ownership");
  }
  pass("retry releases prior worker lease ownership");

  time = Date.parse("2026-10-03T12:00:04.999Z");
  const tooEarly = await transientWorker.runNext();
  if (tooEarly.outcome !== "idle") {
    fail("retry cannot execute before backoff expires");
  }
  pass("retry cannot execute before backoff expires");

  time = Date.parse("2026-10-03T12:00:05.000Z");
  const recovered = await transientWorker.runNext();

  if (
    recovered.outcome !== "succeeded" ||
    recovered.run.attempt !== 2 ||
    transientCalls !== 2
  ) {
    fail("transient retry automatically recovers");
  }
  pass("transient retry automatically recovers");

  const terminalJob: JobDefinition = {
    ...transientJob,
    id: "job-terminal",
    kind: "test.terminal",
  };
  const terminalRun: JobRun = {
    ...transientRun,
    id: "run-terminal",
    jobId: terminalJob.id,
    idempotencyKey: "terminal-operation",
  };

  store.putJob(terminalJob);
  store.enqueueRun(terminalRun);

  const terminalWorker = new JobWorkerRuntime(
    store,
    {
      "test.terminal": async () => {
        throw new JobExecutionError("invalid credentials", {
          code: "invalid_credentials",
          retryable: false,
        });
      },
    },
    "worker-terminal",
    () => new Date("2026-10-03T13:00:00.000Z"),
    60_000,
  );

  const terminal = await terminalWorker.runNext();

  if (
    terminal.outcome !== "failed" ||
    terminal.run.status !== "failed" ||
    terminal.run.error?.retryable !== false
  ) {
    fail("terminal failure does not retry");
  }
  pass("terminal failure does not retry");

  const genericJob: JobDefinition = {
    ...transientJob,
    id: "job-generic",
    kind: "test.generic",
  };
  const genericRun: JobRun = {
    ...transientRun,
    id: "run-generic",
    jobId: genericJob.id,
    idempotencyKey: "generic-operation",
  };

  store.putJob(genericJob);
  store.enqueueRun(genericRun);

  const genericWorker = new JobWorkerRuntime(
    store,
    {
      "test.generic": async () => {
        throw new Error("unknown failure");
      },
    },
    "worker-generic",
    () => new Date("2026-10-03T14:00:00.000Z"),
    60_000,
  );

  const generic = await genericWorker.runNext();
  if (
    generic.outcome !== "failed" ||
    generic.run.error?.retryable !== false
  ) {
    fail("unclassified generic failure defaults terminal");
  }
  pass("unclassified generic failure defaults terminal");

  const exhaustJob: JobDefinition = {
    ...transientJob,
    id: "job-exhaust",
    kind: "test.exhaust",
    executionPolicy: {
      retry: {
        mode: "bounded",
        maxAttempts: 2,
        backoff: { kind: "fixed", delayMs: 1_000 },
      },
      concurrency: { mode: "allow" },
    },
  };
  const exhaustRun: JobRun = {
    ...transientRun,
    id: "run-exhaust",
    jobId: exhaustJob.id,
    idempotencyKey: "exhaust-operation",
  };

  store.putJob(exhaustJob);
  store.enqueueRun(exhaustRun);

  let exhaustTime = Date.parse("2026-10-03T15:00:00.000Z");
  const exhaustWorker = new JobWorkerRuntime(
    store,
    {
      "test.exhaust": async () => {
        throw new JobExecutionError("still unavailable", {
          code: "still_unavailable",
          retryable: true,
        });
      },
    },
    "worker-exhaust",
    () => new Date(exhaustTime),
    60_000,
  );

  const exhaustFirst = await exhaustWorker.runNext();
  if (
    exhaustFirst.outcome !== "retry_scheduled" ||
    exhaustFirst.run.attempt !== 2
  ) {
    fail("bounded policy permits retry before exhaustion");
  }
  pass("bounded policy permits retry before exhaustion");

  exhaustTime = Date.parse("2026-10-03T15:00:01.000Z");
  const exhaustFinal = await exhaustWorker.runNext();

  if (
    exhaustFinal.outcome !== "failed" ||
    exhaustFinal.run.status !== "failed" ||
    exhaustFinal.run.attempt !== 2 ||
    exhaustFinal.run.error?.retryable !== true
  ) {
    fail("retry exhaustion becomes terminal visible failure");
  }
  pass("retry exhaustion becomes terminal visible failure");

  const restartStore = new FileJobStore(storePath);
  if (
    restartStore.getRun("run-transient")?.status !== "succeeded" ||
    restartStore.getRun("run-terminal")?.status !== "failed" ||
    restartStore.getRun("run-exhaust")?.status !== "failed"
  ) {
    fail("retry and failure outcomes survive restart");
  }
  pass("retry and failure outcomes survive restart");

  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3F retry/failure verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
