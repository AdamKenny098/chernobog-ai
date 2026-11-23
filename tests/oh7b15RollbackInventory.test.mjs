import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B15Rollback } from "../scripts/oh7b15-rollback-inventory.mjs";

const activeLegacy = {
  ActiveState: "active", UnitFileState: "enabled", LoadState: "loaded",
  User: "chernobog", Group: "chernobog",
  WorkingDirectory: "/srv/apps/chernobog/current",
  FragmentPath: "/etc/systemd/system/chernobog.service",
};
const sibling = {
  ActiveState: "active", UnitFileState: "enabled", LoadState: "loaded",
  User: "omen", Group: "omen",
};
function fakeUnit(unit) {
  return unit === "chernobog.service" ? activeLegacy : sibling;
}

test("B15 rollback inventory preserves release target without backup claims", () => {
  const report = inspectOH7B15Rollback({
    getUnit: fakeUnit,
    getLstat: () => ({ isSymbolicLink: () => true }),
    getRealpath: () => "/srv/apps/chernobog/releases/pre-b15",
  });
  assert.equal(report.legacyRelease.symlink, true);
  assert.equal(report.legacyRelease.target, "/srv/apps/chernobog/releases/pre-b15");
  assert.equal(report.services["chernobog.service"].user, "chernobog");
  assert.equal(report.backupExistsVerified, false);
  assert.equal(report.restoreRehearsalPassed, false);
  assert.equal(report.activationAuthorized, false);
  assert.deepEqual(report.blockers, []);
});

test("B15 rollback inventory flags release paths that are not symlinks", () => {
  const report = inspectOH7B15Rollback({
    getUnit: fakeUnit,
    getLstat: () => ({ isSymbolicLink: () => false }),
    getRealpath: () => "/srv/apps/chernobog/current",
  });
  assert.ok(report.blockers.some(x => x.includes("not a symlink")));
  assert.equal(report.activationAuthorized, false);
});

test("B15 rollback inventory fails closed on inaccessible units and release", () => {
  const report = inspectOH7B15Rollback({
    getUnit() { throw new Error("unavailable"); },
    getLstat() { throw new Error("not found"); },
    getRealpath() { throw new Error("not found"); },
  });
  assert.equal(report.legacyRelease.status, "unavailable");
  assert.ok(report.blockers.some(x => x.includes("release pointer")));
  assert.ok(report.blockers.some(x => x.includes("Unit state unavailable")));
  assert.equal(report.activationAuthorized, false);
});

test("B15 rollback inventory distinguishes permission failures from missing release", () => {
  const resultFor = code => inspectOH7B15Rollback({
    getUnit: fakeUnit,
    getLstat() {
      const error = new Error("synthetic metadata failure");
      error.code = code;
      throw error;
    },
  });
  assert.equal(resultFor("EACCES").legacyRelease.status, "inaccessible");
  assert.equal(resultFor("EPERM").legacyRelease.status, "inaccessible");
  assert.equal(resultFor("ENOENT").legacyRelease.status, "missing");
  assert.equal(resultFor("EIO").legacyRelease.status, "unavailable");
});
