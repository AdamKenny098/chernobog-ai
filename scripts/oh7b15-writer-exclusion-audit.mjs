#!/usr/bin/env node
/**
 * OH-7B15 pre-cutover systemd audit. READ ONLY.
 *
 * Never installs, stops, masks, enables, starts, or restarts services.
 * A masked legacy unit is evidence of systemd-level startup prevention,
 * not a substitute for confirming there are no other legacy writers.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LEGACY = "chernobog.service";
const CORE = "chernobog-core-b15.service";
const SIBLINGS = [
  "chernobog-village.service",
  "chernobog-agent-host.service",
  "chernobog-core-passive.service",
];
const FIELDS = [
  "Id", "LoadState", "ActiveState", "SubState", "UnitFileState",
  "User", "Group", "WorkingDirectory", "FragmentPath", "MainPID",
];

export function readOH7B15SystemdUnit(unit) {
  if (![LEGACY, CORE, ...SIBLINGS].includes(unit)) {
    throw new Error("OH7B15 systemd audit refuses unknown unit");
  }
  // systemctl show returns nonzero on some hosts for an absent unit.
  // A known absent unit is a safe inventory state, not an unknown failure.
  // Capture output with spawnSync so we can distinguish that case.
  const result = spawnSync("/usr/bin/systemctl", [
    "show", unit, "--no-pager", "--property=" + FIELDS.join(","),
  ], { timeout: 5000, encoding: "utf8" });
  if (result.error) throw result.error;
  const output = result.stdout ?? "";
  if (result.status !== 0 && !/^(?:LoadState=not-found)$/m.test(output)) {
    throw new Error("OH7B15 systemd status unavailable");
  }
  return Object.fromEntries(output.split("\n").filter(Boolean).map(line => {
    const at = line.indexOf("=");
    if (at < 1) throw new Error("OH7B15 malformed systemd status");
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}

export function auditOH7B15WriterExclusion({
  getUnit = readOH7B15SystemdUnit,
  draftText,
} = {}) {
  if (typeof draftText !== "string") {
    throw new Error("OH7B15 explicitly supplied service draft required");
  }
  const blockers = [];
  const statuses = {};
  for (const unit of [LEGACY, CORE, ...SIBLINGS]) {
    try {
      const state = getUnit(unit);
      if (!state || !state.LoadState || !state.ActiveState) {
        throw new Error("incomplete systemd status");
      }
      // systemd reports UnitFileState="" for a unit that does not exist.
      // Classify that specifically before requiring UnitFileState on loaded units.
      if (unit === CORE && state.LoadState === "not-found" &&
          state.ActiveState === "inactive" && state.UnitFileState === "") {
        statuses[unit] = { status: "not-installed", load: "not-found", active: "inactive" };
        continue;
      }
      if (!state.UnitFileState) throw new Error("incomplete systemd status");
      statuses[unit] = {
        load: state.LoadState,
        active: state.ActiveState,
        file: state.UnitFileState,
        user: state.User ?? "",
        group: state.Group ?? "",
      };
    } catch {
      statuses[unit] = { status: "unknown" };
      blockers.push(unit + " status unavailable");
    }
  }
  const legacy = statuses[LEGACY];
  const core = statuses[CORE];
  if (legacy?.active !== "inactive" ||
      legacy?.load !== "masked" || legacy?.file !== "masked") {
    blockers.push("Legacy service must be inactive and masked by operator before handover");
  }
  // The B15 template is not an installable operational service. Audit its
  // negative guarantees; this does not approve the replacement.
  for (const [label, ok] of [
    ["draft must have no install target", !/^\[Install\]/m.test(draftText)],
    ["draft must not inject secrets", !/^EnvironmentFile=/m.test(draftText)],
    ["draft role remains legacy", /^Environment=CHERNOBOG_STORAGE_ROLE=legacy$/m.test(draftText)],
    ["draft must not stop legacy automatically", !/^Conflicts=.*chernobog\.service/m.test(draftText)],
    ["draft must use production identity", /^User=chernobog$/m.test(draftText) &&
      /^Group=chernobog$/m.test(draftText)],
  ]) {
    if (!ok) blockers.push("Unsafe B15 draft: " + label);
  }
  if (core?.active === "active" || core?.file === "enabled") {
    blockers.push("B15 core unit unexpectedly operational or enabled");
  }
  // Siblings are not core writers by designation; status only does not prove
  // that their filesystem/mutation behavior is isolated.
  const siblingStates = Object.fromEntries(SIBLINGS.map(unit => [unit, statuses[unit]]));
  return {
    mode: "oh7b15-readonly-writer-exclusion-audit",
    legacyState: legacy,
    proposedCoreState: core,
    siblingStates,
    legacySystemdStartupBlocked: legacy?.load === "masked" &&
      legacy?.file === "masked" && legacy?.active === "inactive",
    osLevelWriterExclusionProven: false,
    activationAuthorized: false,
    blockers,
  };
}

const current = process.argv[1] && path.resolve(process.argv[1]);
if (current === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const draft = fs.readFileSync(path.resolve(
    here, "../deploy/oh7/chernobog-core-b15-draft.service"), "utf8");
  console.log(JSON.stringify(auditOH7B15WriterExclusion({ draftText: draft }), null, 2));
}
