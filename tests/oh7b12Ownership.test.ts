import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acquireOH7B12Ownership,
  assertLegacyQuiescent,
  assertProductionPaths,
} from "../scripts/oh7b12-production-ownership.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-oh7b12-"));
  const data = path.join(root, "storage");
  const vault = path.join(root, "vault");
  const runtime = path.join(root, "runtime");
  for (const dir of [data, vault, runtime]) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(data, "chernobog.db"), "isolated placeholder");
  return {
    root, data, vault, runtime,
    env: {
      ...process.env,
      CHERNOBOG_DATA_DIR: data,
      CHERNOBOG_VAULT_PATH: vault,
      CHERNOBOG_RUNTIME_DIR: runtime,
    },
    clean: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const stopped = () => ({
  ActiveState: "inactive",
  SubState: "dead",
  UnitFileState: "masked",
  LoadState: "masked",
});

test("OH7B12 refuses production lease without explicit opt-in or existing database", () => {
  const f = fixture();
  try {
    assert.throws(() => acquireOH7B12Ownership({
      root: f.root, env: f.env, getLegacyState: stopped,
    }), /explicit operator opt-in/);
    fs.unlinkSync(path.join(f.data, "chernobog.db"));
    assert.throws(() => acquireOH7B12Ownership({
      root: f.root, env: f.env, explicitOptIn: true, getLegacyState: stopped,
    }), /existing production database required/);
    assert.equal(fs.readdirSync(f.runtime).length, 0);
  } finally { f.clean(); }
});

test("OH7B12 requires legacy service permanently masked and inactive", () => {
  const f = fixture();
  try {
    for (const state of [
      { ...stopped(), ActiveState: "active" },
      { ...stopped(), UnitFileState: "enabled" },
      { ...stopped(), UnitFileState: "masked-runtime" },
      { ...stopped(), LoadState: "loaded" },
      { ...stopped(), ActiveState: "failed" },
    ]) {
      assert.throws(() => assertLegacyQuiescent(() => state), /not safely stopped/);
      assert.throws(() => acquireOH7B12Ownership({
        root: f.root, env: f.env, explicitOptIn: true, getLegacyState: () => state,
      }), /not safely stopped/);
    }
    assert.throws(() => assertLegacyQuiescent(() => { throw Error("systemctl unavailable"); }), /systemctl unavailable/);
    assert.equal(fs.readdirSync(f.runtime).length, 0);
  } finally { f.clean(); }
});

test("OH7B12 grants one cooperating owner and refuses duplicate owners", () => {
  const f = fixture();
  try {
    const opts = { root: f.root, env: f.env, explicitOptIn: true, getLegacyState: stopped };
    const first = acquireOH7B12Ownership(opts);
    first.assertStillOwned();
    assert.throws(() => acquireOH7B12Ownership(opts), /EEXIST/);
    first.release();
    assert.throws(() => first.assertStillOwned(), /no longer valid/);
    const second = acquireOH7B12Ownership(opts);
    second.assertStillOwned();
    second.release();
    assert.equal(fs.readdirSync(f.runtime).length, 0);
  } finally { f.clean(); }
});

test("OH7B12 fails closed if legacy service changes state or owner token changes", () => {
  const f = fixture();
  try {
    let state = stopped();
    const opts = {
      root: f.root, env: f.env, explicitOptIn: true, getLegacyState: () => state,
    };
    const first = acquireOH7B12Ownership(opts);
    state = { ...stopped(), ActiveState: "active" };
    assert.throws(() => first.assertStillOwned(), /not safely stopped/);
    state = stopped();
    assert.throws(() => first.assertStillOwned(), /no longer valid/);
    first.release();

    const second = acquireOH7B12Ownership(opts);
    const lockPath = path.join(f.runtime, "oh7b2-core-owner.lock");
    const original = fs.readFileSync(lockPath, "utf8");
    const payload = JSON.parse(original);
    fs.writeFileSync(lockPath, JSON.stringify({ ...payload, token: "unexpected-token" }));
    assert.throws(() => second.assertStillOwned(), /Core lease changed/);
    assert.throws(() => second.release(), /Lease changed/);
    assert.equal(fs.existsSync(lockPath), true);
    // Only disposable test cleanup may remove this deliberately corrupted lock.
  } finally { f.clean(); }
});

test("OH7B12 rejects ambiguous storage paths without initializing state", () => {
  const f = fixture();
  try {
    assert.throws(() => assertProductionPaths(f.root, {
      ...process.env,
      CHERNOBOG_DATA_DIR: "relative",
      CHERNOBOG_VAULT_PATH: f.vault,
      CHERNOBOG_RUNTIME_DIR: f.runtime,
    }), /absolute CHERNOBOG_DATA_DIR/);
    assert.throws(() => assertProductionPaths(f.root, {
      ...f.env,
      CHERNOBOG_RUNTIME_DIR: path.join(f.root, "not-created"),
    }), /required directory runtime does not exist/);
  } finally { f.clean(); }
});
