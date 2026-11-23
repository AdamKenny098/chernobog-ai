#!/usr/bin/env node
/**
 * B15 read-only host inspection. No SQLite driver imports, no writes, no
 * service changes and no secrets in output. Run WITHOUT core storage role.
 *
 * Production environment may be supplied by an administrator through
 * existing service configuration, but this script never loads a secrets file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacySystemdState } from "./oh7b12-production-ownership.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function inspectOH7B15Host({
  env = process.env,
  readLegacy = readLegacySystemdState,
  readText = file => fs.readFileSync(file, "utf8"),
  inspectStat = file => fs.statSync(file),
} = {}) {
  const blockers = [];
  if (env.CHERNOBOG_STORAGE_ROLE === "core") {
    blockers.push("Inspection cannot execute as operational core");
  }
  const data = env.CHERNOBOG_DATA_DIR?.trim() ?? "";
  const vault = env.CHERNOBOG_VAULT_PATH?.trim() ?? "";
  if (!path.isAbsolute(data) || !path.isAbsolute(vault)) {
    blockers.push("Absolute data and vault environment paths required");
  }
  const isRealStorage = path.isAbsolute(data) && path.isAbsolute(vault);
  const canonicalData = isRealStorage ? path.resolve(data) : "";
  if (isRealStorage && (canonicalData === ROOT ||
      canonicalData.startsWith(ROOT + path.sep) ||
      canonicalData === path.parse(canonicalData).root)) {
    blockers.push("Invalid production data root");
  }

  const inspections = {};
  if (isRealStorage && blockers.every(x => x !== "Invalid production data root")) {
    for (const [label, file, kind] of [
      ["data", data, "directory"],
      ["vault", vault, "directory"],
      ["mainDb", path.join(data, "chernobog.db"), "file"],
      ["jobs", path.join(data, "scheduler", "jobs.json"), "file"],
    ]) {
      try {
        // existsSync returns false on EACCES as well as ENOENT. statSync
        // distinguishes genuine absence from an unreadable parent directory.
        const stat = inspectStat(file);
        inspections[label] = {
          present: true,
          typeMatches: kind === "directory" ? stat.isDirectory() : stat.isFile(),
          state: "present",
        };
        if (!inspections[label].typeMatches) {
          blockers.push(label + " production path has wrong type");
        }
      } catch (error) {
        const missing = error?.code === "ENOENT";
        inspections[label] = {
          present: missing ? false : null,
          typeMatches: false,
          state: missing ? "missing" : "inaccessible",
        };
        // Missing OH3 storage is an activation blocker, even when no jobs
        // could be inventoried. B15 bootstrap refuses to initialize it.
        blockers.push(label + (missing ? " production path missing" : " production path inaccessible"));
      }
    }
  }
  let enabledJobKinds = [];
  let enabledJobs = 0;
  let jobInventoryState = inspections.jobs?.typeMatches ? "present-unread" :
    inspections.jobs?.state === "missing" ? "missing" :
    inspections.jobs?.state === "inaccessible" ? "inaccessible" : "not-inspected";
  if (inspections.jobs?.typeMatches) {
    try {
      const jobs = JSON.parse(readText(path.join(data, "scheduler", "jobs.json")));
      if (jobs?.schemaVersion !== 1 || !Array.isArray(jobs.jobs)) {
        throw new Error("Unsupported OH3 store format");
      }
      const enabled = jobs.jobs.filter(job => job?.enabled === true);
      enabledJobs = enabled.length;
      enabledJobKinds = [...new Set(enabled.map(job => String(job.kind ?? "")))].sort();
      jobInventoryState = "read";
      if (enabledJobKinds.length) blockers.push("Enabled production job kinds require audited handler registry");
    } catch {
      blockers.push("Job inventory unreadable or malformed");
    }
  }
  let legacy = "unknown";
  try {
    const state = readLegacy();
    legacy = state?.ActiveState === "inactive" &&
      state?.UnitFileState === "masked" &&
      state?.LoadState === "masked" ? "quiescent" : "not-quiescent";
  } catch {
    blockers.push("Legacy systemd state unavailable");
  }
  if (legacy !== "quiescent") blockers.push("Legacy writer not verified stopped and masked");
  // This inspection is never authority to cut over, even if all checks pass.
  return Object.freeze({
    mode: "oh7b15-readonly-host-preflight",
    legacyWriterState: legacy,
    storage: inspections,
    enabledJobs,
    enabledJobKinds,
    jobInventoryState,
    activationAuthorized: false,
    productionCoreReady: false,
    blockers,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(inspectOH7B15Host(), null, 2));
}
