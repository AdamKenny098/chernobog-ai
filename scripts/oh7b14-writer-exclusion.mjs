#!/usr/bin/env node
/**
 * OH-7B14: read-only systemd writer-exclusion inspection.
 *
 * A deployment aid, NEVER permission to enable the core. No service mutation,
 * filesystem writes, secrets, or unbounded shell commands. A running/missing
 * unit is always reported rather than silently interpreted as safe.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const LEGACY_UNIT = "chernobog.service";
const SIBLINGS = [
  "chernobog-agent-host.service",
  "chernobog-village.service",
  "chernobog-core-passive.service",
];
const DEFAULT_UNIT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../deploy/oh7/chernobog-core-candidate.service",
);
const FIELDS = ["Id", "LoadState", "ActiveState", "UnitFileState", "User", "Group", "MainPID"];

export function readUnitStatus(unit) {
  if (![LEGACY_UNIT, ...SIBLINGS].includes(unit)) {
    throw new Error("OH7B14 unknown unit inspection target");
  }
  const output = execFileSync("/usr/bin/systemctl", [
    "show", unit, "--no-pager", "--property=" + FIELDS.join(","),
  ], { encoding: "utf8", timeout: 5000 });
  return Object.fromEntries(output.trim().split("\n").filter(Boolean).map((line) => {
    const at = line.indexOf("=");
    if (at < 1) throw new Error("OH7B14 malformed systemd response");
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}

export function inspectOH7B14WriterExclusion({
  getUnitStatus = readUnitStatus,
  candidateUnit = readFileSync(DEFAULT_UNIT, "utf8"),
} = {}) {
  const findings = [];
  const units = [];
  for (const name of [LEGACY_UNIT, ...SIBLINGS]) {
    try {
      const status = getUnitStatus(name);
      const state = status?.ActiveState;
      if (!state || !status?.LoadState || !status?.UnitFileState) {
        findings.push(name + ": systemd state incomplete");
      }
      units.push({
        name, active: state === "active",
        loaded: status?.LoadState === "loaded",
        bootEnabled: status?.UnitFileState === "enabled",
      });
      if (name === LEGACY_UNIT &&
          (state !== "inactive" || status.UnitFileState !== "masked" ||
           status.LoadState !== "masked")) {
        findings.push("Legacy writer not stopped and masked");
      }
    } catch {
      units.push({ name, unknown: true });
      findings.push(name + ": status unavailable");
    }
  }
  const required = [
    ["no service install target", !/^\[Install\]/m.test(candidateUnit)],
    ["no secret environment file", !/^EnvironmentFile=/m.test(candidateUnit)],
    ["no production storage grant", !/^ReadWritePaths=/m.test(candidateUnit) &&
      !/^BindPaths=/m.test(candidateUnit) && !/^SupplementaryGroups=/m.test(candidateUnit)],
    ["no production core role", !/^Environment=CHERNOBOG_STORAGE_ROLE=core$/m.test(candidateUnit)],
    ["read-only system partition", /^ProtectSystem=strict$/m.test(candidateUnit)],
    ["no legacy auto-conflicts stop", !/^Conflicts=.*chernobog\.service/m.test(candidateUnit)],
  ];
  for (const [label, ok] of required) {
    if (!ok) findings.push("Candidate unit failed: " + label);
  }
  const siblingsRunning = units.filter((unit) => unit.name !== LEGACY_UNIT && unit.active)
    .map((unit) => unit.name);
  // Running sibling services are an independent storage review obligation.
  if (siblingsRunning.length) {
    findings.push("Running sibling services require independent writer review");
  }
  return Object.freeze({
    mode: "read-only-systemd-exclusion-audit",
    candidateTemplateSafeForNonoperationalInspection: required.every(([, ok]) => ok),
    legacyServiceCurrentlyQuiescent: !findings.includes("Legacy writer not stopped and masked") &&
      units[0]?.active === false && units[0]?.loaded === false,
    siblingsRunning,
    units,
    findings,
    runtimeWriterExclusionProven: false,
    activationAuthorized: false,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectOH7B14WriterExclusion();
  console.log(JSON.stringify(report, null, 2));
}
