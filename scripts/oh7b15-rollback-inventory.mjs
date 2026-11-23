#!/usr/bin/env node
/**
 * OH-7B15 rollback inventory (READ ONLY).
 * Captures release pointers and sanitized unit metadata, NOT application data,
 * secrets, database contents, or backups. It NEVER authorizes cutover.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_RELEASE = "/srv/apps/chernobog/current";
const DEFAULT_UNITS = [
  "chernobog.service",
  "chernobog-village.service",
  "chernobog-agent-host.service",
  "chernobog-core-passive.service",
];

function readUnit(unit) {
  if (!DEFAULT_UNITS.includes(unit)) {
    throw new Error("OH7B15 rollback audit refuses unknown unit");
  }
  const output = execFileSync("/usr/bin/systemctl", [
    "show", unit, "--no-pager",
    "--property=ActiveState,UnitFileState,LoadState,User,Group,WorkingDirectory,FragmentPath",
  ], { encoding: "utf8", timeout: 5000 });
  return Object.fromEntries(output.split("\n").filter(Boolean).map(line => {
    const at = line.indexOf("=");
    if (at < 1) throw new Error("OH7B15 invalid systemd state");
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}

export function inspectOH7B15Rollback({
  releasePath = DEFAULT_RELEASE,
  getUnit = readUnit,
  getLstat = file => fs.lstatSync(file),
  getRealpath = file => fs.realpathSync(file),
} = {}) {
  const blockers = [];
  let release;
  try {
    if (!path.isAbsolute(releasePath)) throw new Error("nonabsolute release path");
    const stat = getLstat(releasePath);
    release = {
      path: releasePath,
      symlink: stat.isSymbolicLink(),
      target: getRealpath(releasePath),
    };
    if (!release.symlink) blockers.push("Legacy release pointer is not a symlink");
    if (!path.isAbsolute(release.target)) blockers.push("Resolved legacy release target is not absolute");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code) : "";
    const status = code === "EACCES" || code === "EPERM" ? "inaccessible" :
      code === "ENOENT" ? "missing" : "unavailable";
    release = { path: releasePath, status };
    blockers.push("Legacy release pointer could not be inspected (" + status + ")");
  }

  const services = {};
  for (const unit of DEFAULT_UNITS) {
    try {
      const s = getUnit(unit);
      if (!s || !s.ActiveState || !s.UnitFileState || !s.LoadState) {
        throw new Error("incomplete unit");
      }
      services[unit] = {
        active: s.ActiveState,
        unitFile: s.UnitFileState,
        load: s.LoadState,
        user: s.User ?? "",
        group: s.Group ?? "",
        workingDirectory: s.WorkingDirectory ?? "",
        fragmentPath: s.FragmentPath ?? "",
      };
    } catch {
      services[unit] = { status: "unavailable" };
      blockers.push("Unit state unavailable: " + unit);
    }
  }
  if (services["chernobog.service"]?.active !== "active") {
    blockers.push("Legacy service is not currently active for baseline capture");
  }
  return {
    mode: "oh7b15-readonly-rollback-inventory",
    capturedAt: new Date().toISOString(),
    legacyRelease: release,
    services,
    backupExistsVerified: false,
    restoreRehearsalPassed: false,
    osLevelWriterExclusionProven: false,
    activationAuthorized: false,
    blockers,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(inspectOH7B15Rollback(), null, 2));
}
