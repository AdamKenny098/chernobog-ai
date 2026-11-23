#!/usr/bin/env node
/**
 * OH-7B15 read-only backup readiness inventory.
 * Does not open SQLite, copy files, access secrets or modify services.
 * WAL/SHM metadata matters: a raw copy of a live SQLite database alone
 * is NOT a consistent backup. A separate offline/SQLite backup procedure
 * and restore rehearsal must be reviewed before cutover.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA = "/var/lib/chernobog/data";
const VAULT = "/srv/storage/chernobog/vault";
const RELEASE = "/srv/apps/chernobog/releases/20260915T194421Z-forge-v1-99fdab99";

function statusFor(file, required, stat = fs.statSync) {
  try {
    const info = stat(file);
    return { state: "present", type: info.isDirectory() ? "directory" :
      info.isFile() ? "file" : "other", sizeBytes: info.isFile() ? info.size : null };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code) : "";
    return {
      state: code === "ENOENT" ? (required ? "missing" : "absent") :
        code === "EACCES" || code === "EPERM" ? "inaccessible" : "unknown",
    };
  }
}

export function inspectOH7B15BackupReadiness({
  stat = fs.statSync,
  statfs = fs.statfsSync,
  dataRoot = DATA,
  vaultRoot = VAULT,
  legacyRelease = RELEASE,
} = {}) {
  if (![dataRoot, vaultRoot, legacyRelease].every(value =>
    typeof value === "string" && path.isAbsolute(value))) {
    throw new Error("OH7B15 absolute inventory paths required");
  }
  const database = path.join(dataRoot, "chernobog.db");
  const files = {
    data: statusFor(dataRoot, true, stat),
    database: statusFor(database, true, stat),
    wal: statusFor(database + "-wal", false, stat),
    shm: statusFor(database + "-shm", false, stat),
    vault: statusFor(vaultRoot, true, stat),
    legacyRelease: statusFor(legacyRelease, true, stat),
    scheduler: statusFor(path.join(dataRoot, "scheduler", "jobs.json"), false, stat),
  };
  const blockers = [];
  for (const [key, entry] of Object.entries(files)) {
    if (!["present", "absent"].includes(entry.state)) {
      blockers.push(key + ": " + entry.state);
    }
  }
  for (const key of ["data", "vault", "legacyRelease"]) {
    if (files[key].state === "present" && files[key].type !== "directory") {
      blockers.push(key + ": expected directory");
    }
  }
  if (files.database.state === "present" && files.database.type !== "file") {
    blockers.push("database: expected regular file");
  }
  let space;
  try {
    const info = statfs(dataRoot);
    space = {
      filesystemAvailableBytes: Number(info.bavail) * Number(info.bsize),
      filesystemTotalBytes: Number(info.blocks) * Number(info.bsize),
    };
  } catch {
    space = { status: "unavailable" };
    blockers.push("storage free-space information unavailable");
  }
  return {
    mode: "oh7b15-readonly-backup-readiness",
    files, space,
    snapshotVerified: false,
    sqliteConsistencyVerified: false,
    vaultBackupVerified: false,
    restoreRehearsalPassed: false,
    activationAuthorized: false,
    blockers,
    guidance: "Never raw-copy a running SQLite database without a consistent snapshot or SQLite backup API",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(inspectOH7B15BackupReadiness(), null, 2));
}
