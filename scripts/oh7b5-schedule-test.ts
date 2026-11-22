import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileJobStore } from "@chernobog/core";

const store = new FileJobStore(
  join(tmpdir(), "chernobog-oh7b5-acceptance", "jobs.json")
);

const id = randomUUID();
const now = new Date();
const owner = { ownerId: "oh7b5-test" };

store.putJob({
  id: `oh7b5-scheduled-${id}`,
  owner,
  source: { kind: "subsystem", subsystemId: "oh7b5-test" },
  kind: "oh7b5.acceptance",
  payload: { test: "scheduled-execution" },
  executionPolicy: {
    retry: { mode: "none" },
    concurrency: { mode: "allow" }
  },
  enabled: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString()
});

store.putSchedule({
  id: `oh7b5-schedule-${id}`,
  jobId: `oh7b5-scheduled-${id}`,
  owner,
  status: "active",
  trigger: {
    kind: "once",
    runAt: new Date(now.getTime() + 5000).toISOString(),
    timezone: "Europe/Dublin"
  },
  createdAt: now.toISOString(),
  updatedAt: now.toISOString()
});

console.log("PASS: Scheduled acceptance job created.");
