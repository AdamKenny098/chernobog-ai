import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OH7B14Jobs } from "../lib/chernobog/coreHost/oh7b14Jobs";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { OH7B14ProductionComposition } from "../lib/chernobog/coreHost/oh7b14ProductionComposition";

test("OH7B14 refuses mismatched production job root", () => {
  assert.throws(() => new OH7B14Jobs({
    dataRoot: "/tmp/mismatched-oh7b14-jobs",
    assertOwned() {},
    handlers: {},
    onFatal() {},
  }), /configured production job-store path/);
});

test("OH7B14 accepted OH3 scheduler and worker are inert until externally owned startup", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b14-jobs-"));
  const previous = process.env.CHERNOBOG_DATA_DIR;
  process.env.CHERNOBOG_DATA_DIR = fixture;
  const fatal: Error[] = [];
  let owner = true;
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() { if (!owner) throw new Error("synthetic ownership loss"); },
  });
  try {
    const jobs = new OH7B14Jobs({
      dataRoot: fixture,
      assertOwned: () => guard.assertOwned(),
      handlers: {},
      onFatal(error) { fatal.push(error); },
      schedulerIntervalMs: 100,
      workerIntervalMs: 100,
    });
    const jobStorePath = path.join(fixture, "scheduler", "jobs.json");
    assert.equal(fs.existsSync(jobStorePath), false);
    const core = new OH7B14ProductionComposition({
      guard, adapters: jobs.adapters,
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    });
    assert.equal(core.health().operationalCoreReady, false);
    await core.start();
    assert.equal(core.health().operationalCoreReady, true);
    assert.equal(jobs.tickOnce(), 0);
    assert.equal(await jobs.runOnce(), "idle");
    owner = false;
    assert.throws(() => jobs.tickOnce(), /synthetic ownership loss/);
    assert.equal(core.health().operationalCoreReady, false);
    await core.stop();
    assert.equal(fatal.length, 0);
  } finally {
    if (previous === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = previous;
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("OH7B14 refuses starting jobs without a live owner", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b14-denied-"));
  const previous = process.env.CHERNOBOG_DATA_DIR;
  process.env.CHERNOBOG_DATA_DIR = fixture;
  try {
    const jobs = new OH7B14Jobs({
      dataRoot: fixture,
      assertOwned() { throw new Error("OH7B14 no production owner"); },
      handlers: {},
      onFatal() {},
    });
    await assert.rejects(Promise.resolve().then(() => jobs.adapters[0].start()),
      /OH7B14 no production owner/);
    assert.equal(fs.existsSync(path.join(fixture, "scheduler")), false);
  } finally {
    if (previous === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = previous;
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
