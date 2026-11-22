import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectOH7B8ProductionPaths } from "../scripts/oh7b8-storage-preflight.mjs";

test("OH7B8 observes existing configured paths without modifying storage", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b8-"));
  try {
    const data = path.join(root, "data");
    const vault = path.join(root, "vault");
    mkdirSync(data);
    mkdirSync(vault);
    writeFileSync(path.join(data, "chernobog.db"), "fixture only");
    const observed = inspectOH7B8ProductionPaths(root, {
      ...process.env,
      CHERNOBOG_DATA_DIR: data,
      CHERNOBOG_VAULT_PATH: vault,
    });
    assert.equal(observed.configured, true);
    assert.equal(observed.storageVisible, true);
    assert.equal(observed.operationalOwner, false);
    assert.equal(observed.operationalCoreReady, false);
    assert.equal(observed.exists.mainDb, true);
    assert.equal(observed.exists.runtime, false);
    assert.equal(observed.warnings.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("OH7B8 fails closed when paths are missing or unresolved", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b8-unconfigured-"));
  try {
    const missing = inspectOH7B8ProductionPaths(root, {
      ...process.env,
      CHERNOBOG_DATA_DIR: "",
      CHERNOBOG_VAULT_PATH: "",
    });
    assert.equal(missing.configured, false);
    assert.equal(missing.storageVisible, false);
    assert.equal(missing.operationalOwner, false);
    assert.match(missing.warnings.join(" "), /Missing explicit production paths/);
    const configured = inspectOH7B8ProductionPaths(root, {
      ...process.env,
      CHERNOBOG_DATA_DIR: path.join(root, "nonexistent"),
      CHERNOBOG_VAULT_PATH: path.join(root, "missing-vault"),
    });
    assert.equal(configured.configured, true);
    assert.equal(configured.storageVisible, false);
    assert.match(configured.warnings.join(" "), /do not initialize a replacement/);
    const relative = inspectOH7B8ProductionPaths(root, {
      ...process.env,
      CHERNOBOG_DATA_DIR: "relative-data",
      CHERNOBOG_VAULT_PATH: "relative-vault",
    });
    assert.equal(relative.configured, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
