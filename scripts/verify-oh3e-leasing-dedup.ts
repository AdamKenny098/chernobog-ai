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

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function main(): Promise<void> {
  const repo = process.cwd();

  const storeSource = fs.readFileSync(
    path.join(repo, "packages", "core", "src", "jobStore.ts"),
    "utf8",
  );
  const workerSource = fs.readFileSync(
    path.join(repo, "packages", "runtime", "src", "jobWorkerRuntime.ts"),
    "utf8",
  );

  if (!storeSource.includes("claimNextRunnable")) {
    fail("Core store exposes atomic claim operation");
  }
  pass("Core store exposes atomic claim operation");

  if (!storeSource.includes('fs.openSync(lockPath, "wx")')) {
    fail("store mutation uses exclusive cross-process lock");
  }
  pass("store mutation uses exclusive cross-process lock");

  if (!workerSource.includes("claimNextRunnable")) {
    fail("worker consumes authoritative claim operation");
  }
  pass("worker consumes authoritative claim operation");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh3e-"));
  const storePath = path.join(tempRoot, "jobs.json");

  const storeA = new FileJobStore(storePath);
  const storeB = new FileJobStore(storePath);
  const owner = { ownerId: "system" };

  const singleJob: JobDefinition = {
    id: "job-single",
    owner,
    source: { kind: "system" },
    kind: "test.single",
    payload: {},
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: { mode: "single-active", key: "test.single" },
    },
    enabled: true,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
  };

  storeA.putJob(singleJob);

  const run1: JobRun = {
    id: "run-single-1",
    jobId: singleJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
    idempotencyKey: "single-logical-1",
    queuedAt: "2026-10-03T12:00:00.000Z",
  };

  const run2: JobRun = {
    ...run1,
    id: "run-single-2",
    idempotencyKey: "single-logical-2",
  };

  storeA.enqueueRun(run1);
  storeA.enqueueRun(run2);

  const firstClaim = storeA.claimNextRunnable({
    workerId: "worker-a",
    leaseDurationMs: 30_000,
    now: new Date("2026-10-03T12:00:00.000Z"),
  });

  if (
    firstClaim?.id !== run1.id ||
    firstClaim.status !== "claimed" ||
    !firstClaim.claimToken ||
    firstClaim.workerId !== "worker-a" ||
    firstClaim.leaseExpiresAt !== "2026-10-03T12:00:30.000Z"
  ) {
    fail("first runnable job receives owned lease");
  }
  pass("first runnable job receives owned lease");

  const blocked = storeB.claimNextRunnable({
    workerId: "worker-b",
    leaseDurationMs: 30_000,
    now: new Date("2026-10-03T12:00:01.000Z"),
  });

  if (blocked !== undefined) {
    fail("single-active policy blocks concurrent logical execution");
  }
  pass("single-active policy blocks concurrent logical execution");

  let wrongTokenRejected = false;
  try {
    storeB.updateClaimedRun(
      { ...firstClaim, status: "running" },
      "wrong-token",
    );
  } catch {
    wrongTokenRejected = true;
  }

  if (!wrongTokenRejected) {
    fail("claim token protects worker ownership");
  }
  pass("claim token protects worker ownership");

  const renewed = storeA.renewRunLease(
    firstClaim.id,
    firstClaim.claimToken,
    60_000,
    new Date("2026-10-03T12:00:10.000Z"),
  );

  if (renewed.leaseExpiresAt !== "2026-10-03T12:01:10.000Z") {
    fail("active claimant can renew lease");
  }
  pass("active claimant can renew lease");

  storeA.updateClaimedRun(
    {
      ...renewed,
      status: "succeeded",
      startedAt: "2026-10-03T12:00:02.000Z",
      finishedAt: "2026-10-03T12:00:11.000Z",
    },
    firstClaim.claimToken,
  );

  const secondClaim = storeB.claimNextRunnable({
    workerId: "worker-b",
    leaseDurationMs: 1_000,
    now: new Date("2026-10-03T12:00:12.000Z"),
  });

  if (secondClaim?.id !== run2.id || !secondClaim.claimToken) {
    fail("next single-active run claims after predecessor completes");
  }
  pass("next single-active run claims after predecessor completes");

  const beforeExpiry = storeA.claimNextRunnable({
    workerId: "worker-c",
    leaseDurationMs: 1_000,
    now: new Date("2026-10-03T12:00:12.500Z"),
  });

  if (beforeExpiry !== undefined) {
    fail("unexpired claimed run cannot be stolen");
  }
  pass("unexpired claimed run cannot be stolen");

  const reclaimed = storeA.claimNextRunnable({
    workerId: "worker-c",
    leaseDurationMs: 5_000,
    now: new Date("2026-10-03T12:00:13.001Z"),
  });

  if (
    reclaimed?.id !== run2.id ||
    reclaimed.workerId !== "worker-c" ||
    reclaimed.claimToken === secondClaim.claimToken
  ) {
    fail("expired claimed lease is safely reclaimable");
  }
  pass("expired claimed lease is safely reclaimable");

  storeA.updateClaimedRun(
    {
      ...reclaimed,
      status: "succeeded",
      startedAt: "2026-10-03T12:00:13.100Z",
      finishedAt: "2026-10-03T12:00:13.200Z",
    },
    reclaimed.claimToken!,
  );

  const idempotentJob: JobDefinition = {
    ...singleJob,
    id: "job-idempotent",
    kind: "test.idempotent",
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: { mode: "allow" },
    },
  };
  storeA.putJob(idempotentJob);

  const logicalRun: JobRun = {
    id: "run-idem-1",
    jobId: idempotentJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
    idempotencyKey: "same-logical-operation",
  };
  storeA.enqueueRun(logicalRun);

  let idempotencyRejected = false;
  try {
    storeB.enqueueRun({ ...logicalRun, id: "run-idem-2" });
  } catch {
    idempotencyRejected = true;
  }

  if (!idempotencyRejected) {
    fail("idempotency key rejects duplicate logical run");
  }
  pass("idempotency key rejects duplicate logical run");

  const workerJob: JobDefinition = {
    ...singleJob,
    id: "job-worker-concurrency",
    kind: "test.worker-concurrency",
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: {
        mode: "single-active",
        key: "worker-concurrency",
      },
    },
  };

  storeA.putJob(workerJob);

  for (const id of ["a", "b"]) {
    storeA.enqueueRun({
      id: `run-worker-${id}`,
      jobId: workerJob.id,
      owner,
      source: { kind: "system" },
      status: "queued",
      payload: {},
      attempt: 1,
      idempotencyKey: `worker-${id}`,
    });
  }

  const entered = deferred();
  const release = deferred();

  const holdingHandler: JobHandler = async () => {
    entered.resolve();
    await release.promise;
    return { summary: "released" };
  };

  const worker1 = new JobWorkerRuntime(
    storeA,
    { "test.worker-concurrency": holdingHandler },
    "worker-1",
    () => new Date("2026-10-03T13:00:00.000Z"),
    60_000,
  );

  const worker2 = new JobWorkerRuntime(
    storeB,
    { "test.worker-concurrency": async () => ({ summary: "unexpected" }) },
    "worker-2",
    () => new Date("2026-10-03T13:00:01.000Z"),
    60_000,
  );

  const firstExecution = worker1.runNext();
  await entered.promise;

  const concurrentAttempt = await worker2.runNext();
  if (concurrentAttempt.outcome !== "idle") {
    fail("second worker cannot execute same single-active concurrency key");
  }
  pass("second worker cannot execute same single-active concurrency key");

  release.resolve();

  const firstExecutionResult = await firstExecution;
  if (firstExecutionResult.outcome !== "succeeded") {
    fail("lease-owning worker completes normally");
  }
  pass("lease-owning worker completes normally");

  const nextExecution = await worker2.runNext();
  if (nextExecution.outcome !== "succeeded") {
    fail("blocked work becomes executable after active run completes");
  }
  pass("blocked work becomes executable after active run completes");

  const restartStore = new FileJobStore(storePath);
  if (
    restartStore.getRun("run-worker-a")?.status !== "succeeded" ||
    restartStore.getRun("run-worker-b")?.status !== "succeeded"
  ) {
    fail("lease/concurrency outcomes survive store recreation");
  }
  pass("lease/concurrency outcomes survive store recreation");

  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3E leasing/dedup verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
