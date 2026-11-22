import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { FileJobStore } from "@chernobog/core";
import {
  SchedulerRuntime,
  JobWorkerRuntime,
  type JobHandlerMap,
} from "@chernobog/runtime";

const schedulerIntervalMs = 5_000;
const workerIntervalMs = 1_000;

const fixture = path.join(os.tmpdir(), "chernobog-oh7b5-acceptance");
mkdirSync(fixture, { recursive: true });

const lockPath = path.join(fixture, "runner.lock");
const lockDirectory = path.join(fixture, "runner.owner");

function acquireOwnership(): void {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      mkdirSync(lockDirectory);
      try {
        writeFileSync(
          path.join(lockDirectory, "owner.json"),
          JSON.stringify({
            pid: process.pid,
            startedAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        rmSync(lockDirectory, { recursive: true });
        throw error;
      }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    let owner: { pid: number; startedAt: string };
    try {
      owner = JSON.parse(
        readFileSync(path.join(lockDirectory, "owner.json"), "utf8"),
      );
    } catch {
      throw new Error("OH-7B5 ownership metadata unreadable; manual recovery required");
    }

    if (
      !Number.isSafeInteger(owner.pid) ||
      owner.pid <= 0 ||
      !Number.isFinite(Date.parse(owner.startedAt))
    ) {
      throw new Error("OH-7B5 ownership metadata invalid; manual recovery required");
    }

    try {
      process.kill(owner.pid, 0);
      throw new Error("OH-7B5 runner ownership already claimed");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw error;
      }
    }

    const quarantine = path.join(
      fixture,
      `runner.stale-${randomUUID()}`,
    );

    try {
      renameSync(lockDirectory, quarantine);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }

    rmSync(quarantine, { recursive: true });
    console.log("[OH-7B5] Recovered stale ownership");
  }

  throw new Error("OH-7B5 ownership acquisition retry limit reached");
}
function releaseOwnership(): void {
  rmSync(lockDirectory, { recursive: true });
}

acquireOwnership();
const store = new FileJobStore(path.join(fixture, "jobs.json"));
const scheduler = new SchedulerRuntime(store);

const handlers: JobHandlerMap = {
  "oh7b5.acceptance": async ({ run }) => ({
    summary: "OH-7B5 isolated acceptance completed",
    metadata: { runId: run.id },
  }),
};

const worker = new JobWorkerRuntime(
  store,
  handlers,
  `oh7b5-${randomUUID()}`,
);

let stopping = false;
let processing = false;

async function processJobs(): Promise<void> {
  if (stopping || processing) return;

  processing = true;

  try {
    const result = await worker.runNext();

    if (result.outcome !== "idle") {
      console.log("[OH-7B5] Worker:", result.outcome);
    }
  } catch (error) {
    console.error("[OH-7B5] Worker failure:", error);
  } finally {
    processing = false;
  }
}

function evaluateSchedules(): void {
  if (stopping) return;

  try {
    const result = scheduler.tick();

    if (result.materializedRuns.length > 0) {
      console.log(
        "[OH-7B5] Scheduled:",
        result.materializedRuns.length,
      );
    }
  } catch (error) {
    console.error("[OH-7B5] Scheduler failure:", error);
  }
}

const schedulerTimer = setInterval(
  evaluateSchedules,
  schedulerIntervalMs,
);

const workerTimer = setInterval(
  () => void processJobs(),
  workerIntervalMs,
);

function shutdown(): void {
  if (stopping) return;

  stopping = true;
  clearInterval(schedulerTimer);
  clearInterval(workerTimer);

  console.log("[OH-7B5] Shutdown requested");

  const drain = setInterval(() => {
    if (processing) return;

    clearInterval(drain);
    releaseOwnership();
    console.log("[OH-7B5] Stopped");
    process.exit(0);
  }, 100);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[OH-7B5] Background runner started");

evaluateSchedules();
void processJobs();
