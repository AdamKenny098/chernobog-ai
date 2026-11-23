import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { auditOH7B15WriterExclusion } from "../scripts/oh7b15-writer-exclusion-audit.mjs";

const draftText = fs.readFileSync(path.resolve(
  "deploy/oh7/chernobog-core-b15-draft.service"), "utf8");

const base = {
  LoadState: "loaded",
  ActiveState: "active",
  UnitFileState: "enabled",
  User: "chernobog",
  Group: "chernobog",
};

test("B15 audit recognizes not-found core with empty UnitFileState", () => {
  const report = auditOH7B15WriterExclusion({
    draftText,
    getUnit(unit) {
      if (unit === "chernobog-core-b15.service") return {
        LoadState: "not-found",
        ActiveState: "inactive",
        UnitFileState: "",
      };
      return { ...base };
    },
  });
  assert.equal(report.proposedCoreState.status, "not-installed");
  assert.equal(report.osLevelWriterExclusionProven, false);
  assert.equal(report.activationAuthorized, false);
  assert.ok(report.blockers.some(value => value.includes("Legacy service must be inactive")));
  assert.ok(!report.blockers.some(value => value.includes("core-b15.service status unavailable")));
});

test("B15 audit fails closed if installed core unit status incomplete", () => {
  const report = auditOH7B15WriterExclusion({
    draftText,
    getUnit(unit) {
      if (unit === "chernobog-core-b15.service") return {
        LoadState: "loaded",
        ActiveState: "inactive",
        UnitFileState: "",
      };
      return { ...base };
    },
  });
  assert.equal(report.proposedCoreState.status, "unknown");
  assert.ok(report.blockers.some(value => value.includes("core-b15.service status unavailable")));
  assert.equal(report.activationAuthorized, false);
});
