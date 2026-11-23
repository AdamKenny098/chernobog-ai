#!/usr/bin/env node
/**
 * OH7B15 expanded recovery set. Explicit opt-in; creates a NEW private folder.
 * No source writes, service mutations, or secret values in reports.
 * SQLite's online backup API captures committed WAL transactions.
 *
 * Live directory copies are NOT atomic; final quiescent backup is required.
 * Do not use this as authorization for production cutover.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const DEFAULTS = Object.freeze({
  dataRoot: "/var/lib/chernobog/data",
  releaseDb: "/srv/apps/chernobog/current/data/chernobog.db",
  radarDb: "/srv/apps/chernobog/shared/game-radar/chernobog-game-radar.sqlite",
  stagingRoot: "/var/lib/chernobog/backup-staging",
  vaultRoot: "/srv/storage/chernobog/vault",
  importsRoot: "/srv/storage/chernobog/imports",
  exportsRoot: "/srv/storage/chernobog/exports",
  sharedRoot: "/srv/apps/chernobog/shared",
});

const isWithin = (p, root) => p === root || p.startsWith(root + path.sep);
function hashFile(file) {
  const hash = createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buf = Buffer.allocUnsafe(64 * 1024);
  try {
    let bytes;
    while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytes));
    }
  } finally { fs.closeSync(fd); }
  return hash.digest("hex");
}

function ensureRealDirectory(directory, label) {
  const real = fs.realpathSync(directory);
  if (!fs.statSync(real).isDirectory()) {
    throw new Error("OH7B15 " + label + " is not a directory");
  }
  return real;
}
function ensureDbFile(file, label) {
  const real = fs.realpathSync(file);
  if (!fs.statSync(real).isFile()) {
    throw new Error("OH7B15 " + label + " is not a regular file");
  }
  return real;
}
function catalogue(root, exclude = () => false) {
  const entries = [];
  function visit(subdir) {
    for (const item of fs.readdirSync(path.join(root, subdir),
      { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.join(subdir, item.name);
      if (exclude(rel)) continue;
      const full = path.join(root, rel);
      if (item.isDirectory()) {
        entries.push({ relative: rel, type: "directory" });
        visit(rel);
      } else if (item.isFile()) entries.push({
        relative: rel,
        type: "file",
        size: fs.statSync(full).size,
        sha256: hashFile(full),
      });
      else throw new Error("OH7B15 unsupported source entry: " + rel);
    }
  }
  visit("");
  return entries;
}

function copyCatalogued(root, dest, entries) {
  fs.mkdirSync(dest, { mode: 0o700 });
  for (const item of entries) {
    const target = path.join(dest, item.relative);
    if (item.type === "directory") {
      fs.mkdirSync(target, { recursive: true, mode: 0o700 });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(root, item.relative), target, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(target, 0o600);
    if (hashFile(target) !== item.sha256 ||
        fs.statSync(target).size !== item.size) {
      throw new Error("OH7B15 source copy changed during backup: " + item.relative);
    }
  }
  return entries.filter(item => item.type === "file").length;
}

function checkDatabase(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma("quick_check");
    if (result.length !== 1 || result[0].quick_check !== "ok") {
      throw new Error("OH7B15 SQLite quick_check failed");
    }
  } finally { db.close(); }
}

export async function stageOH7B15ExpandedRecovery({
  destination,
  explicitOptIn = false,
  confirmDisposableRestore = false,
  ...sourceOverrides
} = {}) {
  if (explicitOptIn !== true || confirmDisposableRestore !== true) {
    throw new Error("OH7B15 expanded recovery requires both explicit flags");
  }
  if (typeof destination !== "string" || !path.isAbsolute(destination)) {
    throw new Error("OH7B15 absolute backup destination required");
  }
  const sources = { ...DEFAULTS, ...sourceOverrides };
  if (Object.keys(sourceOverrides).some(key => !(key in DEFAULTS))) {
    throw new Error("OH7B15 unknown source override");
  }
  const directoryKeys = [
    "dataRoot", "stagingRoot", "vaultRoot", "importsRoot",
    "exportsRoot", "sharedRoot",
  ];
  const directories = Object.fromEntries(directoryKeys.map(key => [
    key, ensureRealDirectory(sources[key], key),
  ]));
  const dbFiles = {
    main: ensureDbFile(path.join(directories.dataRoot, "chernobog.db"), "main database"),
    release: ensureDbFile(sources.releaseDb, "release database"),
    radar: ensureDbFile(sources.radarDb, "Game Radar database"),
    staging: ensureDbFile(path.join(directories.stagingRoot, "chernobog.db"), "staging database"),
  };
  if (new Set(Object.values(dbFiles)).size !== Object.keys(dbFiles).length) {
    throw new Error("OH7B15 recovery database paths overlap");
  }
  // The shared subtree contains the active Game Radar SQLite database and
  // journal sidecars. These are represented by its online backup, not raw cp.
  const radarRoot = path.dirname(dbFiles.radar);
  if (!isWithin(radarRoot, directories.sharedRoot)) {
    throw new Error("OH7B15 Game Radar database must be inside shared storage");
  }
  const sharedExclude = rel => {
    const abs = path.join(directories.sharedRoot, rel);
    return isWithin(abs, radarRoot) && (
      abs === dbFiles.radar || abs === dbFiles.radar + "-wal" ||
      abs === dbFiles.radar + "-shm"
    );
  };
  const stagingExclude = rel => [
    "chernobog.db", "chernobog.db-wal", "chernobog.db-shm",
  ].includes(rel);
  const trees = {
    vault: catalogue(directories.vaultRoot),
    imports: catalogue(directories.importsRoot),
    exports: catalogue(directories.exportsRoot),
    shared: catalogue(directories.sharedRoot, sharedExclude),
    stagingMetadata: catalogue(directories.stagingRoot, stagingExclude),
  };
  const dest = path.resolve(destination);
  if (fs.existsSync(dest)) throw new Error("OH7B15 destination already exists");
  const parent = ensureRealDirectory(path.dirname(dest), "destination parent");
  const canonicalDest = path.join(parent, path.basename(dest));
  for (const source of [...Object.values(directories), ...Object.values(dbFiles)]) {
    if (isWithin(canonicalDest, source) || isWithin(source, canonicalDest)) {
      throw new Error("OH7B15 destination overlaps source data");
    }
  }
  fs.mkdirSync(canonicalDest, { mode: 0o700 });
  const oldUmask = process.umask(0o077);
  try {
    const backups = path.join(canonicalDest, "databases");
    const rehearsal = path.join(canonicalDest, "restore-rehearsal");
    fs.mkdirSync(backups, { mode: 0o700 });
    fs.mkdirSync(rehearsal, { mode: 0o700 });
    for (const [name, sourceFile] of Object.entries(dbFiles)) {
      const backupFile = path.join(backups, name + ".sqlite");
      const source = new Database(sourceFile, { readonly: true, fileMustExist: true });
      try { await source.backup(backupFile); } finally { source.close(); }
      fs.chmodSync(backupFile, 0o600);
      checkDatabase(backupFile);
      const restoredFile = path.join(rehearsal, name + ".sqlite");
      fs.copyFileSync(backupFile, restoredFile, fs.constants.COPYFILE_EXCL);
      checkDatabase(restoredFile);
      if (hashFile(backupFile) !== hashFile(restoredFile)) {
        throw new Error("OH7B15 database restore hash mismatch: " + name);
      }
    }
    const directorySources = {
      vault: directories.vaultRoot,
      imports: directories.importsRoot,
      exports: directories.exportsRoot,
      shared: directories.sharedRoot,
      stagingMetadata: directories.stagingRoot,
    };
    const fileCounts = {};
    for (const [name, items] of Object.entries(trees)) {
      const backupDir = path.join(canonicalDest, name);
      const restoreDir = path.join(rehearsal, name);
      fileCounts[name] = copyCatalogued(directorySources[name], backupDir, items);
      copyCatalogued(backupDir, restoreDir, items);
      const observed = catalogue(restoreDir);
      if (JSON.stringify(observed) !== JSON.stringify(items)) {
        throw new Error("OH7B15 restore catalogue mismatch: " + name);
      }
    }
    const report = {
      mode: "oh7b15-expanded-recovery-set",
      sqliteDatabasesVerified: Object.keys(dbFiles),
      sqliteOnlineBackupAndRestorePassed: true,
      filesystemFileCounts: fileCounts,
      sensitiveSharedConfigIncludedInPrivateDirectory: true,
      restoreRehearsalPassed: true,
      liveFilesystemPointInTimeConsistencyVerified: false,
      finalQuiescentBackupVerified: false,
      osLevelWriterExclusionProven: false,
      activationAuthorized: false,
      destination: canonicalDest,
    };
    fs.writeFileSync(path.join(canonicalDest, "verification.json"),
      JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    return report;
  } finally {
    process.umask(oldUmask);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5 ||
      process.argv[2] !== "--stage-expanded-recovery" ||
      process.argv[3] !== "--confirm-disposable-restore") {
    console.error("OH7B15 expanded recovery requires two explicit flags and a new absolute destination");
    process.exitCode = 2;
  } else {
    stageOH7B15ExpandedRecovery({
      destination: process.argv[4],
      explicitOptIn: true,
      confirmDisposableRestore: true,
    }).then(report => {
      console.log(JSON.stringify(report, null, 2));
    }).catch(error => {
      console.error("OH7B15 expanded recovery failed; private destination may need inspection:", error);
      process.exitCode = 1;
    });
  }
}
