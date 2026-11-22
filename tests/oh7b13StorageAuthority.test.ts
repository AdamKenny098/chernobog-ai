import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertStorageWritable,
  installCoreWriteAuthority,
} from "../lib/chernobog/coreHost/storageAuthority";

const coreEnv = { ...process.env, CHERNOBOG_STORAGE_ROLE: "core" };
const legacyEnv = { ...process.env, CHERNOBOG_STORAGE_ROLE: "legacy" };

test("OH7B13 core state mutation is denied without installed ownership", () => {
  assert.throws(() => assertStorageWritable("SQLite", coreEnv), /CORE_WRITER_DENIED/);
  assert.throws(() => installCoreWriteAuthority(() => {}, legacyEnv), /explicit core storage role/);
  assert.throws(() => assertStorageWritable("event write", {
    ...process.env, CHERNOBOG_STORAGE_ROLE: "unknown",
  }), /UNKNOWN_STORAGE_ROLE/);
});

test("OH7B13 legacy and proxy behavior remains compatible", () => {
  assert.doesNotThrow(() => assertStorageWritable("legacy initialization", {
    ...legacyEnv, CHERNOBOG_CORE_ROUTE_MODE: "legacy",
  }));
  assert.throws(() => assertStorageWritable("legacy proxy", {
    ...legacyEnv, CHERNOBOG_CORE_ROUTE_MODE: "proxy",
  }), /LEGACY_WRITER_FENCED/);
});

test("OH7B13 checks live lease for every core write and latches loss", () => {
  let valid = true;
  let checks = 0;
  const revoke = installCoreWriteAuthority(() => {
    checks++;
    if (!valid) throw new Error("synthetic legacy writer returned");
  }, coreEnv);
  assert.equal(checks, 1);
  assert.doesNotThrow(() => assertStorageWritable("SQLite init", coreEnv));
  assert.doesNotThrow(() => assertStorageWritable("event append", coreEnv));
  assert.equal(checks, 3);
  valid = false;
  assert.throws(() => assertStorageWritable("session mutation", coreEnv), /CORE_OWNER_LOST/);
  valid = true;
  assert.throws(() => assertStorageWritable("session mutation", coreEnv), /CORE_WRITER_DENIED/);
  revoke();
  assert.throws(() => installCoreWriteAuthority(() => {}, coreEnv), /revoked/);
});
