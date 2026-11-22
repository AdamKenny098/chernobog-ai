import assert from "node:assert/strict";
import { test } from "node:test";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { OH7B14ProductionComposition } from "../lib/chernobog/coreHost/oh7b14ProductionComposition";
import { createOH7B14PersonalAssistanceAdapters } from "../lib/chernobog/coreHost/oh7b14PersonalAssistanceAdapters";

const configured = process.env.CHERNOBOG_DATA_DIR;
const fixtureData = "/tmp/chernobog-oh7b14-pa-test";

test("B14 PA adapters reject mismatched production data root", () => {
  assert.throws(() => createOH7B14PersonalAssistanceAdapters({
    dataRoot: "/tmp/unrelated-data",
    assertOwned() {},
    initializePA: async () => {},
  }), /exact configured absolute data root/);
});

test("B14 starts accepted PA then Android, stops without sending any delivery", async () => {
  process.env.CHERNOBOG_DATA_DIR = fixtureData;
  const steps: string[] = [];
  const guard = new OH7B13OwnershipGuard({ assertStillOwned() {} });
  try {
    const adapters = createOH7B14PersonalAssistanceAdapters({
      dataRoot: fixtureData,
      assertOwned: () => guard.assertOwned(),
      initializePA: async () => { steps.push("PA init"); },
      closePA: async () => { steps.push("PA close"); },
      initializeAndroid: async () => { steps.push("Android init"); },
    });
    const core = new OH7B14ProductionComposition({
      guard, adapters,
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    });
    await core.start();
    assert.equal(core.health().operationalCoreReady, true);
    await core.stop();
    assert.deepEqual(steps, ["PA init", "Android init", "PA close"]);
  } finally {
    if (configured === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = configured;
  }
});

test("B14 closes PA if ownership is lost during async initialization", async () => {
  process.env.CHERNOBOG_DATA_DIR = fixtureData;
  const steps: string[] = [];
  let owned = true;
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() { if (!owned) throw new Error("synthetic owner loss"); },
  });
  try {
    const adapters = createOH7B14PersonalAssistanceAdapters({
      dataRoot: fixtureData,
      assertOwned: () => guard.assertOwned(),
      initializePA: async () => { steps.push("PA init"); owned = false; },
      closePA: async () => { steps.push("PA close"); },
      initializeAndroid: async () => { steps.push("Android init"); },
    });
    const core = new OH7B14ProductionComposition({
      guard, adapters,
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    });
    await assert.rejects(core.start(), /synthetic owner loss/);
    assert.deepEqual(steps, ["PA init", "PA close"]);
    assert.equal(core.health().operationalCoreReady, false);
  } finally {
    if (configured === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = configured;
  }
});
