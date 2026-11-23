#!/usr/bin/env node
/**
 * OH-7B15 staged backup and disposable restore rehearsal.
 *
 * Explicitly invoked by an operator, never by a systemd unit or production
 * launcher. Uses SQLite's online backup API (includes committed WAL changes).
 * Vault copy is a file-by-file snapshot, NOT an atomic live vault snapshot:
 * perform a final quiescent capture and re-verify before real cutover.
 *
 * Source is opened read-only, without mutating the live SQLite journal.
 * Destination must be NEW, under an existing non-production parent directory.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const REQUIRED_FLAGS = ["--stage-backup", "--confirm-disposable-restore"];
const DB_NAME = "chernobog.db";

function inside(candidate, root) {
  return candidate === root || candidate.startsWith(root + path.sep);
}
function requireDirectory(directory, label) {
  if (!fs.statSync(directory).isDirectory()) throw new Error(label + " must be a directory");
}
function sha256(file) {
  const hash = createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(128 * 1024);
  try {
    let count;
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, count));
    }
  } finally { fs.closeSync(fd); }
  return hash.digest("hex");
}
function inventoryTree(root) {
  const results = [];
  function walk(dir, relative) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name))) {
      const rel = path.join(relative, item.name);
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full, rel);
      else if (item.isFile()) {
        results.push({ relativePath: rel, size: fs.statSync(full).size, sha256: sha256(full) });
      } else {
        // No externally escaping links, special files, or broken links in backup.
        throw new Error("OH7B15 vault includes unsupported non-file entry: " + rel);
      }
    }
  }
  walk(root, "");
  return results;
}
function verifySqlite(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma("quick_check");
    if (!Array.isArray(result) || result.length !== 1 || result[0].quick_check !== "ok") {
      throw new Error("OH7B15 SQLite quick_check failed");
    }
  } finally { db.close(); }
}

export async function stageOH7B15Backup({
  dataRoot,
  vaultRoot,
  destination,
  explicitOptIn = false,
  confirmDisposableRestore = false,
} = {}) {
  if (explicitOptIn !== true || confirmDisposableRestore !== true) {
    throw new Error("OH7B15 backup requires both explicit operator flags");
  }
  if (![dataRoot, vaultRoot, destination].every(value =>
    typeof value === "string" && path.isAbsolute(value))) {
    throw new Error("OH7B15 absolute paths required");
  }
  const sourceData = fs.realpathSync(dataRoot);
  const sourceVault = fs.realpathSync(vaultRoot);
  requireDirectory(sourceData, "Data");
  requireDirectory(sourceVault, "Vault");
  const sourceDb = path.join(sourceData, DB_NAME);
  if (!fs.statSync(sourceDb).isFile()) throw new Error("OH7B15 existing SQLite database required");
  const dest = path.resolve(destination);
  const parent = fs.realpathSync(path.dirname(dest));
  requireDirectory(parent, "Backup parent");
  // Resolve the *existing* parent so symbolic links cannot redirect output
  // into a live data or vault directory.
  const canonicalDest = path.join(parent, path.basename(dest));
  if ([sourceData, sourceVault].some(root =>
    inside(canonicalDest, root) || inside(root, canonicalDest))) {
    throw new Error("OH7B15 backup destination overlaps production storage");
  }
  if (fs.existsSync(canonicalDest)) {
    throw new Error("OH7B15 destination already exists; will not overwrite");
  }
  // A dedicated private directory is made only after all source checks pass.
  fs.mkdirSync(canonicalDest, { mode: 0o700 });
  const previousUmask = process.umask(0o077);
  try {
    const backedDb = path.join(canonicalDest, DB_NAME);
    const source = new Database(sourceDb, { readonly: true, fileMustExist: true });
    try { await source.backup(backedDb); } finally { source.close(); }
    verifySqlite(backedDb);
    const copiedVault = path.join(canonicalDest, "vault");
    // Do not follow symlinks in source; inventory rejects them.
    const sourceInventory = inventoryTree(sourceVault);
    fs.cpSync(sourceVault, copiedVault, { recursive: true, dereference: false, errorOnExist: true });
    const backupInventory = inventoryTree(copiedVault);
    if (JSON.stringify(sourceInventory) !== JSON.stringify(backupInventory)) {
      throw new Error("OH7B15 vault files changed while copying; no consistent vault backup");
    }
    // Restore rehearsal uses a NEW disposable location inside the private
    // backup directory. It never opens live production storage for writing.
    const rehearsal = path.join(canonicalDest, "restore-rehearsal");
    fs.mkdirSync(rehearsal, { mode: 0o700 });
    const restoredDb = path.join(rehearsal, DB_NAME);
    fs.copyFileSync(backedDb, restoredDb, fs.constants.COPYFILE_EXCL);
    verifySqlite(restoredDb);
    if (sha256(restoredDb) !== sha256(backedDb)) {
      throw new Error("OH7B15 restored SQLite checksum mismatch");
    }
    const restoredVault = path.join(rehearsal, "vault");
    fs.cpSync(copiedVault, restoredVault, {
      recursive: true, dereference: false, errorOnExist: true,
    });
    if (JSON.stringify(inventoryTree(restoredVault)) !== JSON.stringify(backupInventory)) {
      throw new Error("OH7B15 disposable vault restore checksum mismatch");
    }
    const result = {
      mode: "oh7b15-staged-backup-and-disposable-restore",
      databaseQuickCheckPassed: true,
      restoreRehearsalPassed: true,
      vaultFilesVerified: backupInventory.length,
      vaultPointInTimeConsistencyVerified: false,
      finalQuiescentBackupVerified: false,
      osLevelWriterExclusionProven: false,
      activationAuthorized: false,
      destination: canonicalDest,
    };
    fs.writeFileSync(path.join(canonicalDest, "verification.json"),
      JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return result;
  } finally { process.umask(previousUmask); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 6 ||
      process.argv[2] !== REQUIRED_FLAGS[0] ||
      process.argv[3] !== REQUIRED_FLAGS[1]) {
    console.error("Usage: node scripts/oh7b15-stage-backup.mjs --stage-backup --confirm-disposable-restore /absolute/vault /absolute/new-backup-dir");
    process.exitCode = 2;
  } else {
    stageOH7B15Backup({
      dataRoot: process.env.CHERNOBOG_DATA_DIR,
      vaultRoot: process.argv[4],
      destination: process.argv[5],
      explicitOptIn: true, confirmDisposableRestore: true,
    }).then(report => {
      console.log(JSON.stringify(report, null, 2));
    }).catch(error => {
      console.error("OH7B15 backup failed; inspect private destination before retry:", error);
      process.exitCode = 1;
    });
  }
}
