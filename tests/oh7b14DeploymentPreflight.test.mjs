import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B14Deployment } from "../scripts/oh7b14-deployment-preflight.mjs";

const quiescent = () => ({
  ActiveState: "inactive", SubState: "dead",
  UnitFileState: "masked", LoadState: "masked",
});
const running = () => ({
  ActiveState: "active", SubState: "running",
  UnitFileState: "enabled", LoadState: "loaded",
});

test("OH7B14 refuses activation even if legacy is masked and stopped", () => {
  const report = inspectOH7B14Deployment({
    root: "/no-production-path-is-created",
    env: { CHERNOBOG_STORAGE_ROLE: "legacy" },
    getLegacyState: quiescent,
  });
  assert.equal(report.legacyWriterStoppedAndMasked, true);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.productionCoreReady, false);
  assert.equal(report.productionServiceUnchanged, true);
  assert.ok(report.blockers.length);
});

test("OH7B14 reports active legacy and refuses both core and proxy modes", () => {
  const report = inspectOH7B14Deployment({
    root: "/no-production-path-is-created",
    env: { CHERNOBOG_STORAGE_ROLE: "core", CHERNOBOG_CORE_ROUTE_MODE: "proxy" },
    getLegacyState: running,
  });
  assert.equal(report.legacyWriterStoppedAndMasked, false);
  assert.equal(report.activationAuthorized, false);
  assert.ok(report.blockers.some((s) => s.includes("operational core role")));
  assert.ok(report.blockers.some((s) => s.includes("proxy routing")));
});
