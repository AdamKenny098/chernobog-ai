import assert from "node:assert/strict";
import { test } from "node:test";
import { validateOH7B15LaunchEnvironment } from "../lib/chernobog/coreHost/oh7b15ProductionHost";

const valid = {
  CHERNOBOG_OH7B15_CUTOVER_APPROVAL: "I_APPROVE_OH7B15_PRODUCTION_CUTOVER",
  CHERNOBOG_STORAGE_ROLE: "core",
  CHERNOBOG_DATA_DIR: "/var/lib/chernobog/data",
  CHERNOBOG_VAULT_PATH: "/srv/storage/chernobog/vault",
  CHERNOBOG_CORE_GATEWAY_SECRET: "long-synthetic-secret-for-unit-tests-only-12345",
  CHERNOBOG_CORE_PORT: "3191",
};

test("B15 launcher refuses every missing cutover approval by default", () => {
  assert.throws(() => validateOH7B15LaunchEnvironment({
    ...valid, CHERNOBOG_OH7B15_CUTOVER_APPROVAL: undefined,
  }), /cutover approval missing/);
});

test("B15 launcher refuses legacy role, proxy routing and absent secrets", () => {
  assert.throws(() => validateOH7B15LaunchEnvironment({
    ...valid, CHERNOBOG_STORAGE_ROLE: "legacy",
  }), /non-core storage role/);
  assert.throws(() => validateOH7B15LaunchEnvironment({
    ...valid, CHERNOBOG_CORE_ROUTE_MODE: "proxy",
  }), /proxy routing/);
  assert.throws(() => validateOH7B15LaunchEnvironment({
    ...valid, CHERNOBOG_CORE_GATEWAY_SECRET: "short",
  }), /32-byte gateway secret/);
});

test("B15 launcher refuses invalid ports and accepts valid simulated configuration", () => {
  for (const port of ["NaN", "80", "65536", "-2", "3191wat"]) {
    assert.throws(() => validateOH7B15LaunchEnvironment({
      ...valid, CHERNOBOG_CORE_PORT: port,
    }), /invalid core port/);
  }
  const result = validateOH7B15LaunchEnvironment(valid);
  assert.equal(result.port, 3191);
  assert.equal(result.dataRoot, "/var/lib/chernobog/data");
});

test("B15 launcher refuses incomplete production storage configuration", () => {
  assert.throws(() => validateOH7B15LaunchEnvironment({
    ...valid, CHERNOBOG_VAULT_PATH: undefined,
  }), /absolute data and vault paths/);
});
