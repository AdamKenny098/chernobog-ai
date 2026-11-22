import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B14WriterExclusion } from "../scripts/oh7b14-writer-exclusion.mjs";

const candidateUnit = [
  "[Unit]",
  "Description=Safe candidate",
  "[Service]",
  "User=omen",
  "ProtectSystem=strict",
  "Environment=CHERNOBOG_STORAGE_ROLE=legacy",
].join("\n");
const masked = () => ({
  LoadState: "masked", ActiveState: "inactive", UnitFileState: "masked",
});
const running = () => ({
  LoadState: "loaded", ActiveState: "active", UnitFileState: "enabled",
});
const inactive = () => ({
  LoadState: "loaded", ActiveState: "inactive", UnitFileState: "disabled",
});

test("B14 reports active legacy and independent siblings, never grants activation", () => {
  const report = inspectOH7B14WriterExclusion({
    candidateUnit,
    getUnitStatus: (name) => name === "chernobog.service" ? running() :
      name === "chernobog-agent-host.service" ? running() : inactive(),
  });
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.runtimeWriterExclusionProven, false);
  assert.equal(report.legacyServiceCurrentlyQuiescent, false);
  assert.equal(report.siblingsRunning.length, 1);
  assert.ok(report.findings.includes("Legacy writer not stopped and masked"));
});

test("B14 fully quiescent synthetic units still cannot authorize cutover", () => {
  const report = inspectOH7B14WriterExclusion({
    candidateUnit,
    getUnitStatus: (name) => name === "chernobog.service" ? masked() : inactive(),
  });
  assert.equal(report.legacyServiceCurrentlyQuiescent, true);
  assert.equal(report.candidateTemplateSafeForNonoperationalInspection, true);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.runtimeWriterExclusionProven, false);
});

test("B14 rejects writable and auto-handover candidate unit configuration", () => {
  const report = inspectOH7B14WriterExclusion({
    candidateUnit: candidateUnit + [
      "",
      "EnvironmentFile=/etc/chernobog/chernobog.env",
      "ReadWritePaths=/var/lib/chernobog",
      "Conflicts=chernobog.service",
      "[Install]",
    ].join("\n"),
    getUnitStatus: () => inactive(),
  });
  assert.equal(report.candidateTemplateSafeForNonoperationalInspection, false);
  assert.equal(report.activationAuthorized, false);
  assert.ok(report.findings.some((item) => item.includes("production storage grant")));
  assert.ok(report.findings.some((item) => item.includes("legacy auto-conflicts stop")));
});

test("B14 missing or invalid systemd state fails closed", () => {
  const report = inspectOH7B14WriterExclusion({
    candidateUnit,
    getUnitStatus: (name) => {
      if (name === "chernobog.service") throw new Error("systemd unavailable");
      return {};
    },
  });
  assert.equal(report.legacyServiceCurrentlyQuiescent, false);
  assert.equal(report.activationAuthorized, false);
  assert.ok(report.findings.some((item) => item.includes("status unavailable")));
});
