import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B15Host } from "../scripts/oh7b15-host-preflight.mjs";

const env = {
  CHERNOBOG_STORAGE_ROLE: "legacy",
  CHERNOBOG_DATA_DIR: "/var/lib/chernobog/data",
  CHERNOBOG_VAULT_PATH: "/srv/storage/chernobog/vault",
};
const masked = () => ({
  ActiveState: "inactive", LoadState: "masked", UnitFileState: "masked",
});
const running = () => ({
  ActiveState: "active", LoadState: "loaded", UnitFileState: "enabled",
});
const files = new Set([
  "/var/lib/chernobog/data",
  "/srv/storage/chernobog/vault",
  "/var/lib/chernobog/data/chernobog.db",
  "/var/lib/chernobog/data/scheduler/jobs.json",
]);
const stat = file => ({
  isDirectory: () => file === env.CHERNOBOG_DATA_DIR || file === env.CHERNOBOG_VAULT_PATH,
  isFile: () => file.endsWith(".db") || file.endsWith(".json"),
});

test("B15 read-only inspection identifies enabled production handler kinds", () => {
  const result = inspectOH7B15Host({
    env, readLegacy: running,
    inspectStat: stat,
    readText: () => JSON.stringify({
      schemaVersion: 1,
      jobs: [
        { kind: "report", enabled: true },
        { kind: "report", enabled: true },
        { kind: "cleanup", enabled: false },
      ],
    }),
  });
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.legacyWriterState, "not-quiescent");
  assert.equal(result.enabledJobs, 2);
  assert.equal(result.jobInventoryState, "read");
  assert.deepEqual(result.enabledJobKinds, ["report"]);
  assert.ok(result.blockers.some(x => x.includes("audited handler registry")));
});

test("B15 cannot authorize even fully quiescent simulated production", () => {
  const result = inspectOH7B15Host({
    env, readLegacy: masked,
    inspectStat: stat,
    readText: () => JSON.stringify({ schemaVersion: 1, jobs: [] }),
  });
  assert.equal(result.legacyWriterState, "quiescent");
  assert.equal(result.jobInventoryState, "read");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productionCoreReady, false);
});

test("B15 missing storage environment and unavailable systemd are fail closed", () => {
  const result = inspectOH7B15Host({
    env: {},
    readLegacy() { throw new Error("systemd disconnected"); },
  });
  assert.equal(result.activationAuthorized, false);
  assert.ok(result.blockers.some(x => x.includes("Absolute data")));
  assert.ok(!result.blockers.includes("Invalid production data root"));
  assert.equal(result.jobInventoryState, "not-inspected");
  assert.ok(result.blockers.some(x => x.includes("systemd")));
});

test("B15 refuses operational role during inspection", () => {
  const result = inspectOH7B15Host({
    env: { ...env, CHERNOBOG_STORAGE_ROLE: "core" },
    readLegacy: running,
  });
  assert.equal(result.activationAuthorized, false);
  assert.ok(result.blockers.some(x => x.includes("operational core")));
});

test("B15 distinguishes missing paths from permission-denied paths", () => {
  const result = inspectOH7B15Host({
    env,
    readLegacy: running,
    inspectStat(file) {
      const error = new Error("simulated read-only stat failure");
      error.code = file === env.CHERNOBOG_DATA_DIR ? "EACCES" : "ENOENT";
      throw error;
    },
  });
  assert.equal(result.storage.data.state, "inaccessible");
  assert.equal(result.storage.data.present, null);
  assert.equal(result.storage.vault.state, "missing");
  assert.equal(result.jobInventoryState, "missing");
  assert.ok(result.blockers.includes("data production path inaccessible"));
  assert.ok(result.blockers.includes("vault production path missing"));
  assert.equal(result.activationAuthorized, false);
});
