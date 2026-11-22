import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectOH7B13Activation } from "../scripts/oh7b13-activation-preflight.mjs";

const stopped = () => ({ ActiveState: "inactive", UnitFileState: "masked", LoadState: "masked" });
const running = () => ({ ActiveState: "active", UnitFileState: "enabled", LoadState: "loaded" });

test("production preflight refuses activation even with ideal fixture paths and stopped legacy", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b13-preflight-"));
  try {
    const data = path.join(root, "data");
    const vault = path.join(root, "vault");
    const runtime = path.join(root, "runtime");
    for (const dir of [data, vault, runtime]) fs.mkdirSync(dir);
    fs.writeFileSync(path.join(data, "chernobog.db"), "preflight-only");
    const env = { CHERNOBOG_DATA_DIR: data, CHERNOBOG_VAULT_PATH: vault, CHERNOBOG_RUNTIME_DIR: runtime };
    const before = fs.readdirSync(runtime);
    const result = inspectOH7B13Activation({ root, env, getLegacyState: stopped });
    assert.equal(result.legacyWriterStoppedAndMasked, true);
    assert.equal(result.activationAuthorized, false);
    assert.equal(result.operationalCoreReady, false);
    assert.match(result.blockers.join(" "), /runtime composition/);
    assert.deepEqual(fs.readdirSync(runtime), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("production preflight refuses running legacy writer and missing production state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b13-denied-"));
  try {
    const result = inspectOH7B13Activation({ root, env: {}, getLegacyState: running });
    assert.equal(result.legacyWriterStoppedAndMasked, false);
    assert.equal(result.activationAuthorized, false);
    assert.ok(result.blockers.length >= 3);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("production preflight refuses unavailable systemd", () => {
  const result = inspectOH7B13Activation({
    root: "/",
    env: {},
    getLegacyState: () => { throw new Error("systemctl unavailable"); },
  });
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.legacyWriterStoppedAndMasked, false);
  assert.match(result.blockers.join(" "), /systemctl unavailable/);
});
