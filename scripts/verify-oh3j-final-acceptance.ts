import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type {
  JobDefinition,
  JobRun,
} from "@chernobog/contracts";
import { FileJobStore } from "@chernobog/core";
import {
  JobControlRuntime,
  JobExecutionError,
  JobObservabilityRuntime,
  JobRecoveryRuntime,
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

  const requiredSurfaces = [
    "packages/contracts/src/jobs.ts",
    "packages/core/src/jobStore.ts",
    "packages/runtime/src/schedulerRuntime.ts",
    "packages/runtime/src/jobWorkerRuntime.ts",
    "packages/runtime/src/jobRecoveryRuntime.ts",
    "packages/runtime/src/jobObservabilityRuntime.ts",
    "packages/runtime/src/jobControlRuntime.ts",
    "lib/chernobog/jobs/commandJobHandler.ts",
    "lib/chernobog/jobs/jobEventSpine.ts",
    "app/api/jobs/route.ts",
  ];

  for (const rel of requiredSurfaces) {
    if (!fs.existsSync(path.join(repo, rel))) {
      fail(`required OH-3 surface exists: ${rel}`);
    }
  }
  pass("A-I authoritative OH-3 surfaces exist");

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chernobog-oh3j-"),
  );
  const eventLog = path.join(tempRoot, "events.jsonl");
  process.env.CHERNOBOG_EVENT_LOG_PATH = eventLog;

  const {
    createJobEventSpineObserver,
    flushJobEventSpine,
  } = await import("../lib/chernobog/jobs/jobEventSpine");

  const observer = createJobEventSpineObserver();

  function createStore(name: string): FileJobStore {
    return new FileJobStore(
      path.join(tempRoot, `${name}.json`),
      observer,
    );
  }

  const owner = { ownerId: "game-radar" };

  function job(
    id: string,
    kind: string,
    retry: JobDefinition["executionPolicy"]["retry"] = {
      mode: "none",
    },
  ): JobDefinition {
    return {
      id,
      owner,
      source: {
        kind: "subsystem",
        subsystemId: "game-radar",
      },
      kind,
      displayName: id,
      payload: {},
      executionPolicy: {
        retry,
        concurrency: {
          mode: "single-active",
          key: kind,
        },
      },
      enabled: true,
      createdAt: "2026-10-03T00:00:00.000Z",
      updatedAt: "2026-10-03T00:00:00.000Z",
    };
  }

  // ---------------------------------------------------------------------
  // Scheduling/control scenarios share one store because they are intended
  // to prove coexistence of multiple schedules.
  // ---------------------------------------------------------------------
  const scheduleStore = createStore("schedule-jobs");
  const control = new JobControlRuntime(scheduleStore);
  const scheduler = new SchedulerRuntime(scheduleStore);

  // 1. One-shot.
  const oneShotJob = job("job-one-shot", "test.one-shot");
  scheduleStore.putJob(oneShotJob);
  control.schedule(
    {
      id: "schedule-one-shot",
      jobId: oneShotJob.id,
      trigger: {
        kind: "once",
        runAt: "2026-10-03T01:00:00.000Z",
        timezone: "Europe/Dublin",
      },
    },
    new Date("2026-10-03T00:00:00.000Z"),
  );

  const oneShotTick = scheduler.tick(
    new Date("2026-10-03T01:00:00.000Z"),
  );
  if (
    !oneShotTick.materializedRuns.some(
      (run) => run.jobId === oneShotJob.id,
    )
  ) {
    fail("one-shot job");
  }
  pass("one-shot job");

  // 2. Canonical Game Radar every six hours.
  const radarJob = job(
    "job-game-radar-six-hour",
    "game-radar.refresh",
  );
  scheduleStore.putJob(radarJob);

  control.schedule(
    {
      id: "schedule-game-radar-six-hour",
      jobId: radarJob.id,
      trigger: {
        kind: "interval",
        everyMs: 6 * 60 * 60 * 1000,
        anchorAt: "2026-10-03T00:00:00.000Z",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "run-once" },
    },
    new Date("2026-10-03T00:00:00.000Z"),
  );

  const sixHourTick = scheduler.tick(
    new Date("2026-10-03T06:00:00.000Z"),
  );
  if (
    !sixHourTick.materializedRuns.some(
      (run) =>
        run.jobId === radarJob.id &&
        run.scheduledFor === "2026-10-03T06:00:00.000Z",
    )
  ) {
    fail("Game Radar every six hours");
  }
  pass("Game Radar every six hours");

  // 3. Weekly recurrence.
  const weeklyJob = job("job-weekly", "test.weekly");
  scheduleStore.putJob(weeklyJob);

  control.schedule(
    {
      id: "schedule-weekly",
      jobId: weeklyJob.id,
      trigger: {
        kind: "cron",
        expression: "0 9 * * 1",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "run-once" },
    },
    new Date("2026-10-03T12:00:00.000Z"),
  );

  const weeklyTick = scheduler.tick(
    new Date("2026-10-05T08:00:00.000Z"),
  );
  if (
    !weeklyTick.materializedRuns.some(
      (run) =>
        run.jobId === weeklyJob.id &&
        run.scheduledFor === "2026-10-05T08:00:00.000Z",
    )
  ) {
    fail("weekly recurring job");
  }
  pass("weekly recurring job");

  // 4. Pause / resume.
  const pauseJob = job("job-pause", "test.pause");
  scheduleStore.putJob(pauseJob);
  const pauseSchedule = control.schedule(
    {
      id: "schedule-pause",
      jobId: pauseJob.id,
      trigger: {
        kind: "interval",
        everyMs: 60_000,
        anchorAt: "2026-10-03T02:00:00.000Z",
        timezone: "Europe/Dublin",
      },
    },
    new Date("2026-10-03T01:59:00.000Z"),
  );

  control.pause(
    pauseSchedule.id,
    new Date("2026-10-03T01:59:30.000Z"),
  );

  const pausedTick = scheduler.tick(
    new Date("2026-10-03T02:00:00.000Z"),
  );
  if (
    pausedTick.materializedRuns.some(
      (run) => run.jobId === pauseJob.id,
    )
  ) {
    fail("paused schedule stays inactive");
  }

  control.resume(
    pauseSchedule.id,
    new Date("2026-10-03T02:00:01.000Z"),
  );

  const resumedTick = scheduler.tick(
    new Date("2026-10-03T02:00:01.000Z"),
  );
  if (
    !resumedTick.materializedRuns.some(
      (run) => run.jobId === pauseJob.id,
    )
  ) {
    fail("pause/resume");
  }
  pass("pause/resume");

  // 5. Run-now.
  const runNowJob = job("job-run-now", "test.run-now");
  scheduleStore.putJob(runNowJob);
  const runNow = control.runNow(
    { jobId: runNowJob.id },
    new Date("2026-10-03T03:00:00.000Z"),
  );

  if (runNow.status !== "queued") {
    fail("run-now");
  }
  pass("run-now");

  // ---------------------------------------------------------------------
  // Worker/retry/dedup/recovery scenarios use isolated durable stores.
  // This prevents unrelated queued schedule materializations from being
  // legitimately claimed before the run under test.
  // ---------------------------------------------------------------------

  // 6. Retry after transient failure.
  const retryStore = createStore("retry-jobs");
  const retryJob = job(
    "job-retry",
    "test.retry",
    {
      mode: "bounded",
      maxAttempts: 2,
      backoff: {
        kind: "fixed",
        delayMs: 1_000,
      },
    },
  );
  retryStore.putJob(retryJob);
  retryStore.enqueueRun({
    id: "run-retry",
    jobId: retryJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
    idempotencyKey: "retry-logical",
    queuedAt: "2026-10-03T04:00:00.000Z",
  });

  let retryCalls = 0;
  let retryTime = Date.parse("2026-10-03T04:00:00.000Z");

  const retryWorker = new JobWorkerRuntime(
    retryStore,
    {
      "test.retry": async () => {
        retryCalls += 1;
        if (retryCalls === 1) {
          throw new JobExecutionError("temporary", {
            code: "temporary",
            retryable: true,
          });
        }
      },
    },
    "worker-retry",
    () => new Date(retryTime),
    60_000,
  );

  const retryFirst = await retryWorker.runNext();
  if (retryFirst.outcome !== "retry_scheduled") {
    fail("retry after failure schedules");
  }

  retryTime = Date.parse("2026-10-03T04:00:01.000Z");
  const retrySecond = await retryWorker.runNext();
  if (
    retrySecond.outcome !== "succeeded" ||
    retryCalls !== 2
  ) {
    fail("retry after failure recovers");
  }
  pass("retry after failure");

  // 7. No duplicate execution + lease protection.
  const dedupStore = createStore("dedup-jobs");
  const duplicateJob = job(
    "job-dedup",
    "test.dedup",
  );
  dedupStore.putJob(duplicateJob);

  for (const id of ["a", "b"]) {
    dedupStore.enqueueRun({
      id: `run-dedup-${id}`,
      jobId: duplicateJob.id,
      owner,
      source: { kind: "system" },
      status: "queued",
      payload: {},
      attempt: 1,
      idempotencyKey: `dedup-${id}`,
    });
  }

  const secondDedupStore = new FileJobStore(
    dedupStore.storagePath,
    observer,
  );

  const firstClaim = dedupStore.claimNextRunnable({
    workerId: "worker-a",
    leaseDurationMs: 60_000,
    now: new Date("2026-10-03T05:00:00.000Z"),
  });

  if (!firstClaim || firstClaim.jobId !== duplicateJob.id) {
    fail("first dedup claim");
  }

  const secondClaim = secondDedupStore.claimNextRunnable({
    workerId: "worker-b",
    leaseDurationMs: 60_000,
    now: new Date("2026-10-03T05:00:01.000Z"),
  });

  if (secondClaim !== undefined) {
    fail("no duplicate execution");
  }
  pass("no duplicate execution");

  dedupStore.updateClaimedRun(
    {
      ...firstClaim,
      status: "succeeded",
      startedAt: "2026-10-03T05:00:00.100Z",
      finishedAt: "2026-10-03T05:00:00.200Z",
    },
    firstClaim.claimToken!,
  );

  // 8. Worker lease recovery.
  const leaseStore = createStore("lease-recovery-jobs");
  const leaseJob = job(
    "job-lease-recovery",
    "test.lease-recovery",
  );
  leaseStore.putJob(leaseJob);
  leaseStore.enqueueRun({
    id: "run-lease-recovery",
    jobId: leaseJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
  });

  const leaseClaim = leaseStore.claimNextRunnable({
    workerId: "dead-worker",
    leaseDurationMs: 1_000,
    now: new Date("2026-10-03T06:00:00.000Z"),
  });

  if (!leaseClaim || leaseClaim.jobId !== leaseJob.id) {
    fail("lease recovery seed claim");
  }

  const leaseRecoveryRuntime = new JobRecoveryRuntime(leaseStore);
  const leaseRecovery = leaseRecoveryRuntime.reconcile(
    new Date("2026-10-03T06:00:01.001Z"),
  );

  if (
    !leaseRecovery.recoveredClaims.some(
      (run) => run.id === leaseClaim.id,
    )
  ) {
    fail("worker lease recovery");
  }
  pass("worker lease recovery");

  // 9. Restart recovery for interrupted running job.
  const restartStore = createStore("restart-jobs");
  const interruptedJob = job(
    "job-interrupted",
    "test.interrupted",
    {
      mode: "bounded",
      maxAttempts: 2,
      backoff: {
        kind: "fixed",
        delayMs: 1_000,
      },
    },
  );
  restartStore.putJob(interruptedJob);
  restartStore.enqueueRun({
    id: "run-interrupted",
    jobId: interruptedJob.id,
    owner,
    source: { kind: "system" },
    status: "queued",
    payload: {},
    attempt: 1,
  });

  const interruptedClaim = restartStore.claimNextRunnable({
    workerId: "dead-running-worker",
    leaseDurationMs: 1_000,
    now: new Date("2026-10-03T07:00:00.000Z"),
  });

  if (!interruptedClaim || interruptedClaim.jobId !== interruptedJob.id) {
    fail("restart recovery seed claim");
  }

  restartStore.updateClaimedRun(
    {
      ...interruptedClaim,
      status: "running",
      startedAt: "2026-10-03T07:00:00.100Z",
    },
    interruptedClaim.claimToken!,
  );

  const restartedStore = new FileJobStore(
    restartStore.storagePath,
    observer,
  );
  const restartRecovery = new JobRecoveryRuntime(restartedStore);
  const restartResult = restartRecovery.reconcile(
    new Date("2026-10-03T07:00:01.001Z"),
  );

  if (
    !restartResult.retriedInterruptedRuns.some(
      (run) => run.id === interruptedClaim.id,
    )
  ) {
    fail("restart recovery");
  }
  pass("restart recovery");

  // 10. Missed-run policy.
  const missedStore = createStore("missed-run-jobs");
  const missedControl = new JobControlRuntime(missedStore);
  const missedScheduler = new SchedulerRuntime(missedStore);
  const missedJob = job("job-missed", "test.missed");
  missedStore.putJob(missedJob);

  missedControl.schedule(
    {
      id: "schedule-missed",
      jobId: missedJob.id,
      trigger: {
        kind: "interval",
        everyMs: 60 * 60 * 1000,
        anchorAt: "2026-10-03T08:00:00.000Z",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "run-once" },
    },
    new Date("2026-10-03T08:00:00.000Z"),
  );

  const missedTick = missedScheduler.tick(
    new Date("2026-10-03T11:30:00.000Z"),
  );
  const missedRuns = missedTick.materializedRuns.filter(
    (run) => run.jobId === missedJob.id,
  );

  if (
    missedRuns.length !== 1 ||
    missedRuns[0]?.scheduledFor !== "2026-10-03T11:00:00.000Z"
  ) {
    fail("missed-run policy");
  }
  pass("missed-run policy");

  // 11. State truth / observability.
  //
  // Keep this scenario isolated and chronological. Earlier acceptance cases
  // intentionally advance other schedule stores across different dates; state
  // truth should be verified against one canonical Game Radar schedule without
  // unrelated reconciliation cursors contaminating its next-run calculation.
  const stateStore = createStore("state-truth-jobs");
  const stateControl = new JobControlRuntime(stateStore);
  const stateScheduler = new SchedulerRuntime(stateStore);

  const stateRadarJob = job(
    "job-state-game-radar",
    "game-radar.state-refresh",
  );
  stateStore.putJob(stateRadarJob);

  stateControl.schedule(
    {
      id: "schedule-state-game-radar-six-hour",
      jobId: stateRadarJob.id,
      trigger: {
        kind: "interval",
        everyMs: 6 * 60 * 60 * 1000,
        anchorAt: "2026-10-03T00:00:00.000Z",
        timezone: "Europe/Dublin",
      },
      missedRunPolicy: { mode: "run-once" },
    },
    new Date("2026-10-03T00:00:00.000Z"),
  );

  const stateTick = stateScheduler.tick(
    new Date("2026-10-03T06:00:00.000Z"),
  );

  if (
    !stateTick.materializedRuns.some(
      (run) =>
        run.jobId === stateRadarJob.id &&
        run.scheduledFor === "2026-10-03T06:00:00.000Z",
    )
  ) {
    fail("State truth seed schedule");
  }

  const observable = new JobObservabilityRuntime(stateStore);
  const nextRadar = observable
    .listNextRuns("game-radar")
    .find(
      (entry) =>
        entry.scheduleId ===
        "schedule-state-game-radar-six-hour",
    );

  if (
    !nextRadar ||
    nextRadar.nextRunAt !== "2026-10-03T12:00:00.000Z"
  ) {
    fail("State truth / next-run observability");
  }
  pass("State truth / next-run observability");
  // 12. Event Spine truth from all isolated stores.
  await flushJobEventSpine();

  if (!fs.existsSync(eventLog)) {
    fail("Event Spine truth log exists");
  }

  const eventTypes = new Set(
    fs
      .readFileSync(eventLog, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { type?: string })
      .map((event) => event.type),
  );

  for (const required of [
    "job.scheduled",
    "job.queued",
    "job.claimed",
    "job.started",
    "job.completed",
    "job.retry_scheduled",
    "job.recovered",
  ]) {
    if (!eventTypes.has(required)) {
      fail(`Event Spine truth contains ${required}`);
    }
  }
  pass("Event Spine truth");

  // 13. OH-2 authoritative runtime path preserved.
  const commandBridge = fs.readFileSync(
    path.join(
      repo,
      "lib",
      "chernobog",
      "jobs",
      "commandJobHandler.ts",
    ),
    "utf8",
  );

  if (!commandBridge.includes("runCommandPipeline")) {
    fail("OH-2 runtime path preserved");
  }

  for (const forbidden of [
    "executeGovernedToolAction(",
    "runExecutionTask(",
    "executeTool(",
    "invokeTool(",
  ]) {
    if (commandBridge.includes(forbidden)) {
      fail(`OH-2 runtime path bypass detected: ${forbidden}`);
    }
  }
  pass("OH-2 runtime path preserved");

  await flushJobEventSpine();
  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log("");
  console.log("OH-3J final acceptance verifier complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
