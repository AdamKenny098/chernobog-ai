import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OH7B6IsolatedJobs } from "../lib/chernobog/coreHost/oh7b6IsolatedJobs";
import { OH7B6CoreComposition } from "../lib/chernobog/coreHost/oh7b6Composition";

test("OH7B6 isolated scheduler executes a real persisted job after restart", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "chernobog-oh7b6-"));
  writeFileSync(path.join(root, ".oh7b6-fixture"), "");
  try {
    const now = new Date();
    const owner = { ownerId: "oh7b6-test" };
    let handled = 0;
    const handlers = {
      "oh7b6.acceptance": async () => {
        handled++;
        return { summary: "OH7B6 isolated execution" };
      },
    };
    const options = { fixtureRoot: root, hasOwnership: () => true, handlers };
    const first = new OH7B6IsolatedJobs(options);
    first.store.putJob({
      id: "oh7b6-job",
      kind: "oh7b6.acceptance",
      source: { kind: "subsystem", subsystemId: "oh7b6-test" },
      owner,
      enabled: true,
      payload: { acceptance: true },
      executionPolicy: {
        retry: { mode: "none" },
        concurrency: { mode: "allow" },
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    first.store.putSchedule({
      id: "oh7b6-schedule",
      jobId: "oh7b6-job",
      owner,
      status: "active",
      trigger: {
        kind: "once",
        runAt: new Date(now.getTime() + 1000).toISOString(),
        timezone: "Europe/Dublin",
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    const second = new OH7B6IsolatedJobs(options);
    assert.equal(second.store.listJobs().length, 1);
    assert.equal(second.tickOnce(new Date(now.getTime() + 2000)), 1);
    assert.equal(await second.runOnce(), "succeeded");
    assert.equal(handled, 1);
    const third = new OH7B6IsolatedJobs(options);
    assert.equal(third.store.listRuns("succeeded").length, 1);
    assert.equal(third.tickOnce(new Date(now.getTime() + 3000)), 0);
    assert.equal(await third.runOnce(), "idle");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("OH7B6 refuses unmarked storage, unsupported jobs and missing ownership", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "chernobog-oh7b6-denied-"));
  try {
    assert.throws(() => new OH7B6IsolatedJobs({
      fixtureRoot: root, hasOwnership: () => true, handlers: {},
    }), /fixture/);
    writeFileSync(path.join(root, ".oh7b6-fixture"), "");
    const jobs = new OH7B6IsolatedJobs({
      fixtureRoot: root, hasOwnership: () => false, handlers: {},
    });
    assert.throws(() => jobs.tickOnce(), /not granted/);
    await assert.rejects(() => jobs.runOnce(), /not granted/);
    const now = new Date().toISOString();
    const writable = new OH7B6IsolatedJobs({
      fixtureRoot: root, hasOwnership: () => true, handlers: {},
    });
    writable.store.putJob({
      id: "unknown-handler",
      kind: "not.registered",
      payload: { test: true },
      source: { kind: "subsystem", subsystemId: "oh7b6-test" },
      owner: { ownerId: "oh7b6-test" },
      enabled: true,
      executionPolicy: { retry: { mode: "none" }, concurrency: { mode: "allow" } },
      createdAt: now,
      updatedAt: now,
    });
    assert.throws(() => writable.tickOnce(), /unsupported job kinds/);
    assert.equal(writable.store.listRuns().length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("OH7B6 real adapters start and stop through core lifecycle", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "chernobog-oh7b6-compose-"));
  writeFileSync(path.join(root, ".oh7b6-fixture"), "");
  try {
    let owner = true;
    const jobs = new OH7B6IsolatedJobs({ fixtureRoot: root, hasOwnership: () => owner, handlers: {} });
    const core = new OH7B6CoreComposition({
      mode: "isolated-test",
      hasOwnership: () => owner,
      adapters: jobs.adapters,
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    });
    await core.start();
    assert.equal(core.health().operationalCoreReady, true);
    owner = false;
    assert.equal(core.health().operationalCoreReady, false);
    await core.stop();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
