import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditOH7B15WriterExclusion } from "../scripts/oh7b15-writer-exclusion-audit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draft = fs.readFileSync(path.join(
  root, "deploy/oh7/chernobog-core-b15-draft.service"), "utf8");

const legacyLive = {
  LoadState: "loaded", ActiveState: "active", UnitFileState: "enabled",
  User: "chernobog", Group: "chernobog",
};
const legacyMasked = {
  LoadState: "masked", ActiveState: "inactive", UnitFileState: "masked",
  User: "chernobog", Group: "chernobog",
};
const coreAbsent = {
  LoadState: "not-found", ActiveState: "inactive", UnitFileState: "not-found",
};
const sibling = {
  LoadState: "loaded", ActiveState: "active", UnitFileState: "enabled",
};
function fakeSystemd(legacy = legacyLive, core = coreAbsent) {
  return unit => unit === "chernobog.service" ? legacy :
    unit === "chernobog-core-b15.service" ? core : sibling;
}

test("B15 audit denies operational status while legacy service is running", () => {
  const report = auditOH7B15WriterExclusion({
    getUnit: fakeSystemd(), draftText: draft,
  });
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.osLevelWriterExclusionProven, false);
  assert.equal(report.legacySystemdStartupBlocked, false);
  assert.ok(report.blockers.some(x => x.includes("inactive and masked")));
  assert.equal(report.siblingStates["chernobog-village.service"].active, "active");
});

test("B15 audit never confuses masked legacy with cutover approval", () => {
  const report = auditOH7B15WriterExclusion({
    getUnit: fakeSystemd(legacyMasked), draftText: draft,
  });
  assert.equal(report.legacySystemdStartupBlocked, true);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.osLevelWriterExclusionProven, false);
  assert.deepEqual(report.blockers, []);
});

test("B15 audit detects unexpectedly enabled core service", () => {
  const report = auditOH7B15WriterExclusion({
    getUnit: fakeSystemd(legacyMasked, {
      LoadState: "loaded", ActiveState: "active", UnitFileState: "enabled",
    }), draftText: draft,
  });
  assert.ok(report.blockers.some(x => x.includes("unexpectedly operational")));
});

test("B15 audit rejects unsafe draft and fails closed on systemd errors", () => {
  const report = auditOH7B15WriterExclusion({
    getUnit(unit) {
      if (unit === "chernobog.service") throw new Error("systemd unavailable");
      return coreAbsent;
    },
    draftText: draft + "\n[Install]\nWantedBy=multi-user.target\n",
  });
  assert.ok(report.blockers.some(x => x.includes("status unavailable")));
  assert.ok(report.blockers.some(x => x.includes("install target")));
  assert.equal(report.legacySystemdStartupBlocked, false);
  assert.equal(report.activationAuthorized, false);
});
