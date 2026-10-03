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
  JobRecoveryRuntime,
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

  const recoverySource = fs.readFileSync(
    path.join(repo, "packages", "runtime", "src", "jobRecoveryRuntime.ts"),
    "utf8",
  );

  if (!recoverySource.includes("worker_interrupted")) {
    fail("interrupted worker recovery is explicit");
  }
  pass("interrupted worker recovery is explicit");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chernobog-oh3g-"),
  );
  const storePath = path.join(tempRoot, "jobs.json");
  const store = new FileJobStore(storePath);

  const owner = { ownerId: "game-radar" };
  const sixHours = 6 * 60 * 60 * 1000;

  const baseJob: JobDefinition = {
    id: "job-game-radar",
    owner,
    source: { kind: "subsystem", subsystemId: "game-radar" },
    kind: "game-radar.refresh",
    payload: {},
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: { mode: "single-active", key: "game-radar" },
    },
    enabled: true,
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z",
  };

  store.putJob(baseJob);

  const runOnceSchedule: ScheduleDefinition = {
    id: "schedule-run-once",
    jobId: baseJob.id,
    owner,
    status: "active",
    trigger: {
      kind: "interval",
      everyMs: sixHours,
      anchorAt: "2026-10-03T00:00:00.000Z",
      timezone: "Europe/Dublin",
    },
    missedRunPolicy: { mode: "run-once" },
    lastReconciledAt: "2026-10-03T00:00:00.000Z",
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z",
  };

  store.putSchedule(runOnceSchedule);

  const scheduler = new SchedulerRuntime(store);
  const offlineTick = scheduler.tick(
    new Date("2026-10-03T18:30:00.000Z"),
  );

  const runOnceMaterialized = offlineTick.materializedRuns.filter(
    (run) => run.scheduleId === runOnceSchedule.id,
  );

  if (
    runOnceMaterialized.length !== 1 ||
    runOnceMaterialized[0]?.scheduledFor !==
      "2026-10-03T18:00:00.000Z"
  ) {
    fail("run-once policy collapses offline backlog to latest occurrence");
  }
  pass("run-once policy collapses offline backlog to latest occurrence");

  const repeatedTick = scheduler.tick(
    new Date("2026-10-03T18:30:00.000Z"),
  );
  if (
    repeatedTick.materializedRuns.some(
      (run) => run.scheduleId === runOnceSchedule.id,
    )
  ) {
    fail("reconciliation cursor prevents replaying same missed backlog");
  }
  pass("reconciliation cursor prevents replaying same missed backlog");

  const skipJob: JobDefinition = {
    ...baseJob,
    id: "job-skip",
    kind: "test.skip",
  };
  store.putJob(skipJob);

  const skipSchedule: ScheduleDefinition = {
    ...runOnceSchedule,
    id: "schedule-skip",
    jobId: skipJob.id,
    missedRunPolicy: { mode: "skip" },
    lastReconciledAt: "2026-10-03T00:00:00.000Z",
  };
  store.putSchedule(skipSchedule);

  const skipTick = scheduler.tick(
    new Date("2026-10-03T18:30:00.000Z"),
  );
  if (
    skipTick.materializedRuns.some(
      (run) => run.scheduleId === skipSchedule.id,
    )
  ) {
    fail("skip policy drops offline missed occurrences");
  }
  pass("skip policy drops offline missed occurrences");

  const catchJob: JobDefinition = {
    ...baseJob,
    id: "job-catch-up",
    kind: "test.catch-up",
  };
  store.putJob(catchJob);

  const catchSchedule: ScheduleDefinition = {
    ...runOnceSchedule,
    id: "schedule-catch-up",
    jobId: catchJob.id,
    missedRunPolicy: { mode: "catch-up", maxRuns: 2 },
    lastReconciledAt: "2026-10-03T00:00:00.000Z",
  };
  store.putSchedule(catchSchedule);

  const catchTick = scheduler.tick(
    new Date("2026-10-03T18:30:00.000Z"),
  );
  const catchRuns = catchTick.materializedRuns.filter(
    (run) => run.scheduleId === catchSchedule.id,
  );

  if (
    catchRuns.length !== 2 ||
    catchRuns[0]?.scheduledFor !== "2026-10-03T12:00:00.000Z" ||
    catchRuns[1]?.scheduledFor !== "2026-10-03T18:00:00.000Z"
  ) {
    fail("bounded catch-up keeps only most recent missed occurrences");
  }
  pass("bounded catch-up keeps only most recent missed occurrences");

  const retryJob: JobDefinition = {
    ...baseJob,
    id: "job-recovery-retry",
    kind: "test.recovery.retry",
    executionPolicy: {
      retry: {
        mode: "bounded",
        maxAttempts: 3,
        backoff: { kind: "fixed", delayMs: 5_000 },
      },
      concurrency: { mode: "allow" },
    },
  };
  store.putJob(retryJob);

  const expiredClaim: JobRun = {
    id: "run-expired-claim",
    jobId: retryJob.id,
    owner,
    source: { kind: "system" },
    status: "claimed",
    payload: {},
    attempt: 1,
    workerId: "dead-worker",
    claimToken: "dead-claim",
    claimedAt: "2026-10-03T19:00:00.000Z",
    leaseExpiresAt: "2026-10-03T19:00:10.000Z",
  };

  const expiredRunning: JobRun = {
    id: "run-expired-running",
    jobId: retryJob.id,
    owner,
    source: { kind: "system" },
    status: "running",
    payload: {},
    attempt: 1,
    workerId: "dead-worker",
    claimToken: "dead-running",
    claimedAt: "2026-10-03T19:00:00.000Z",
    startedAt: "2026-10-03T19:00:01.000Z",
    leaseExpiresAt: "2026-10-03T19:00:10.000Z",
  };

  // Store only accepts queued/scheduled creation; seed then transition.
  store.enqueueRun({
    ...expiredClaim,
    status: "queued",
    workerId: undefined,
    claimToken: undefined,
    claimedAt: undefined,
    leaseExpiresAt: undefined,
  });
  store.updateRun(expiredClaim);

  store.enqueueRun({
    ...expiredRunning,
    status: "queued",
    workerId: undefined,
    claimToken: undefined,
    claimedAt: undefined,
    startedAt: undefined,
    leaseExpiresAt: undefined,
  });
  store.updateRun(expiredRunning);

  const terminalJob: JobDefinition = {
    ...baseJob,
    id: "job-recovery-terminal",
    kind: "test.recovery.terminal",
    executionPolicy: {
      retry: { mode: "none" },
      concurrency: { mode: "allow" },
    },
  };
  store.putJob(terminalJob);

  const terminalRunning: JobRun = {
    id: "run-terminal-running",
    jobId: terminalJob.id,
    owner,
    source: { kind: "system" },
    status: "running",
    payload: {},
    attempt: 1,
    workerId: "dead-worker",
    claimToken: "dead-terminal",
    claimedAt: "2026-10-03T19:00:00.000Z",
    startedAt: "2026-10-03T19:00:01.000Z",
    leaseExpiresAt: "2026-10-03T19:00:10.000Z",
  };

  store.enqueueRun({
    ...terminalRunning,
    status: "queued",
    workerId: undefined,
    claimToken: undefined,
    claimedAt: undefined,
    startedAt: undefined,
    leaseExpiresAt: undefined,
  });
  store.updateRun(terminalRunning);

  const futureRetry: JobRun = {
    id: "run-future-retry",
    jobId: retryJob.id,
    owner,
    source: { kind: "system" },
    status: "scheduled",
    payload: {},
    attempt: 2,
    scheduledFor: "2026-10-03T20:30:00.000Z",
    error: {
      code: "network_unavailable",
      message: "retry later",
      retryable: true,
    },
  };
  store.enqueueRun(futureRetry);

  const recovery = new JobRecoveryRuntime(store);
  const recoveryResult = recovery.reconcile(
    new Date("2026-10-03T20:00:00.000Z"),
  );

  if (
    recoveryResult.recoveredClaims.length !== 1 ||
    recoveryResult.recoveredClaims[0]?.status !== "queued"
  ) {
    fail("expired claimed work returns safely to queue");
  }
  pass("expired claimed work returns safely to queue");

  if (
    recoveryResult.retriedInterruptedRuns.length !== 1 ||
    recoveryResult.retriedInterruptedRuns[0]?.status !== "scheduled" ||
    recoveryResult.retriedInterruptedRuns[0]?.attempt !== 2 ||
    recoveryResult.retriedInterruptedRuns[0]?.scheduledFor !==
      "2026-10-03T20:00:05.000Z" ||
    recoveryResult.retriedInterruptedRuns[0]?.error?.code !==
      "worker_interrupted"
  ) {
    fail("expired running work uses bounded retry policy");
  }
  pass("expired running work uses bounded retry policy");

  if (
    recoveryResult.failedInterruptedRuns.length !== 1 ||
    recoveryResult.failedInterruptedRuns[0]?.status !== "failed" ||
    recoveryResult.failedInterruptedRuns[0]?.error?.code !==
      "worker_interrupted"
  ) {
    fail("non-retryable interrupted work becomes terminal failure");
  }
  pass("non-retryable interrupted work becomes terminal failure");

  const futureAfterRecovery = store.getRun(futureRetry.id);
  if (
    futureAfterRecovery?.status !== "scheduled" ||
    futureAfterRecovery.scheduledFor !==
      "2026-10-03T20:30:00.000Z"
  ) {
    fail("future scheduled retry remains untouched during recovery");
  }
  pass("future scheduled retry remains untouched during recovery");

  const secondRecovery = recovery.reconcile(
    new Date("2026-10-03T20:00:01.000Z"),
  );
  if (
    secondRecovery.recoveredClaims.length !== 0 ||
    secondRecovery.retriedInterruptedRuns.length !== 0 ||
    secondRecovery.failedInterruptedRuns.length !== 0
  ) {
    fail("recovery reconciliation is idempotent after state repair");
  }
  pass("recovery reconciliation is idempotent after state repair");

  const restartStore = new FileJobStore(storePath);
  if (
    restartStore.getRun(expiredClaim.id)?.status !== "queued" ||
    restartStore.getRun(expiredRunning.id)?.status !== "scheduled" ||
    restartStore.getRun(terminalRunning.id)?.status !== "failed"
  ) {
    fail("recovered job states survive process restart");
  }
  pass("recovered job states survive process restart");

  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3G restart recovery verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
