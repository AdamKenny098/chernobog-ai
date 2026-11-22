import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { FileJobStore } from "@chernobog/core";

const fixture = path.join(os.tmpdir(), "chernobog-oh7b5-acceptance");
const store = new FileJobStore(path.join(fixture, "jobs.json"));

const now = new Date().toISOString();
const jobId = `oh7b5-test-${randomUUID()}`;
const runId = `oh7b5-run-${randomUUID()}`;

store.putJob({
  id: jobId,
  kind: "oh7b5.acceptance",
  source: { kind: "subsystem", subsystemId: "oh7b5-test" },
  owner: {
    ownerId: "oh7b5-test",
  },
  enabled: true,
  payload: { test: true },
  executionPolicy: {
    retry: { mode: "none" },
    concurrency: { mode: "allow" },
  },
  createdAt: now,
  updatedAt: now,
});

store.enqueueRun({
  id: runId,
  jobId,
  owner: {
    ownerId: "oh7b5-test",
  },
  source: {
    kind: "subsystem",
    subsystemId: "oh7b5-test",
  },
  status: "queued",
  payload: { test: true },
  attempt: 1,
  idempotencyKey: runId,
  queuedAt: now,
});

console.log("Queued OH-7B5 acceptance job:", runId);
