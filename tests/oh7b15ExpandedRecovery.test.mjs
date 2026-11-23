import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { stageOH7B15ExpandedRecovery } from "../scripts/oh7b15-expanded-recovery.mjs";

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b15-expanded-"));
  const dirs = Object.fromEntries([
    "data", "release", "shared", "staging", "vault", "imports", "exports", "backups",
  ].map(name => {
    const folder = path.join(root, name);
    fs.mkdirSync(folder);
    return [name, folder];
  }));
  const radar = path.join(dirs.shared, "game-radar");
  const repair = path.join(dirs.shared, ".repair");
  fs.mkdirSync(radar);
  fs.mkdirSync(repair);
  fs.writeFileSync(path.join(repair, "chernobog.env"), "TOKEN=synthetic-private-value\n");
  fs.writeFileSync(path.join(dirs.vault, "memory.md"), "test memory\n");
  fs.writeFileSync(path.join(dirs.staging, "snapshot-created-at.txt"), "synthetic\n");
  const dbPaths = {
    main: path.join(dirs.data, "chernobog.db"),
    release: path.join(dirs.release, "chernobog.db"),
    radar: path.join(radar, "chernobog-game-radar.sqlite"),
    staging: path.join(dirs.staging, "chernobog.db"),
  };
  const open = {};
  for (const [name, file] of Object.entries(dbPaths)) {
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE acceptance (value TEXT NOT NULL)");
    db.prepare("INSERT INTO acceptance(value) VALUES (?)").run(name + "-committed-WAL");
    open[name] = db;
  }
  return {
    root, dirs, open,
    opts: {
      dataRoot: dirs.data,
      releaseDb: dbPaths.release,
      radarDb: dbPaths.radar,
      stagingRoot: dirs.staging,
      vaultRoot: dirs.vault,
      importsRoot: dirs.imports,
      exportsRoot: dirs.exports,
      sharedRoot: dirs.shared,
      explicitOptIn: true,
      confirmDisposableRestore: true,
    },
    close() {
      for (const db of Object.values(open)) db.close();
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

test("B15 expanded backup captures four WAL-backed DBs and private shared config", async () => {
  const f = buildFixture();
  try {
    const destination = path.join(f.dirs.backups, "recovery-001");
    const result = await stageOH7B15ExpandedRecovery({ ...f.opts, destination });
    assert.equal(result.sqliteOnlineBackupAndRestorePassed, true);
    assert.deepEqual(result.sqliteDatabasesVerified, ["main", "release", "radar", "staging"]);
    assert.equal(result.restoreRehearsalPassed, true);
    assert.equal(result.activationAuthorized, false);
    assert.equal(result.finalQuiescentBackupVerified, false);
    assert.equal(result.liveFilesystemPointInTimeConsistencyVerified, false);
    assert.equal(result.filesystemFileCounts.shared, 1);
    assert.equal(result.filesystemFileCounts.vault, 1);
    for (const name of result.sqliteDatabasesVerified) {
      const restored = new Database(path.join(
        destination, "restore-rehearsal", name + ".sqlite"), { readonly: true });
      try {
        assert.equal(restored.prepare("SELECT value FROM acceptance").get().value,
          name + "-committed-WAL");
      } finally { restored.close(); }
    }
    const secretCopy = path.join(destination, "shared/.repair/chernobog.env");
    assert.equal(fs.readFileSync(secretCopy, "utf8"), "TOKEN=synthetic-private-value\n");
    assert.equal(fs.statSync(secretCopy).mode & 0o777, 0o600);
    assert.equal(fs.statSync(destination).mode & 0o777, 0o700);
    assert.equal(fs.readFileSync(path.join(destination,
      "restore-rehearsal/vault/memory.md"), "utf8"), "test memory\n");
    await assert.rejects(() =>
      stageOH7B15ExpandedRecovery({ ...f.opts, destination }), /already exists/);
  } finally { f.close(); }
});

test("B15 expanded recovery refuses unapproved or overlapping destinations", async () => {
  const f = buildFixture();
  try {
    await assert.rejects(() => stageOH7B15ExpandedRecovery({
      ...f.opts, explicitOptIn: false, destination: path.join(f.dirs.backups, "no"),
    }), /both explicit flags/);
    await assert.rejects(() => stageOH7B15ExpandedRecovery({
      ...f.opts, destination: path.join(f.dirs.shared, "bad-backup"),
    }), /overlaps source data/);
    assert.equal(fs.existsSync(path.join(f.dirs.shared, "bad-backup")), false);
  } finally { f.close(); }
});

test("B15 expanded recovery refuses symlinked shared config", async () => {
  const f = buildFixture();
  try {
    fs.symlinkSync(path.join(f.dirs.vault, "memory.md"),
      path.join(f.dirs.shared, "memory-link"));
    await assert.rejects(() => stageOH7B15ExpandedRecovery({
      ...f.opts, destination: path.join(f.dirs.backups, "bad-link"),
    }), /unsupported source entry/);
  } finally { f.close(); }
});
