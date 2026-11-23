import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { stageOH7B15Backup } from "../scripts/oh7b15-stage-backup.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b15-backup-fixture-"));
  const dataRoot = path.join(root, "data");
  const vaultRoot = path.join(root, "vault");
  const backups = path.join(root, "backups");
  for (const directory of [dataRoot, vaultRoot, backups]) fs.mkdirSync(directory);
  const db = new Database(path.join(dataRoot, "chernobog.db"));
  db.pragma("journal_mode = WAL");
  db.exec("CREATE TABLE acceptance (value TEXT NOT NULL)");
  db.prepare("INSERT INTO acceptance(value) VALUES (?)").run("committed-WAL-row");
  fs.writeFileSync(path.join(vaultRoot, "note.md"), "# restore test\n");
  return { root, dataRoot, vaultRoot, backups, db };
}

test("B15 stage backup includes WAL-committed records and rehearses restore", async () => {
  const f = fixture();
  try {
    const destination = path.join(f.backups, "backup-001");
    const report = await stageOH7B15Backup({
      dataRoot: f.dataRoot, vaultRoot: f.vaultRoot, destination,
      explicitOptIn: true, confirmDisposableRestore: true,
    });
    assert.equal(report.databaseQuickCheckPassed, true);
    assert.equal(report.restoreRehearsalPassed, true);
    assert.equal(report.vaultPointInTimeConsistencyVerified, false);
    assert.equal(report.activationAuthorized, false);
    const restored = new Database(path.join(destination, "restore-rehearsal/chernobog.db"),
      { readonly: true });
    try {
      assert.equal(restored.prepare("SELECT value FROM acceptance").get().value,
        "committed-WAL-row");
    } finally { restored.close(); }
    assert.equal(fs.readFileSync(path.join(
      destination, "restore-rehearsal/vault/note.md"), "utf8"), "# restore test\n");
    assert.throws(() => awaitUnused(), /unreachable/);
    await assert.rejects(() => stageOH7B15Backup({
      dataRoot: f.dataRoot, vaultRoot: f.vaultRoot, destination,
      explicitOptIn: true, confirmDisposableRestore: true,
    }), /already exists/);
  } finally {
    f.db.close();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

function awaitUnused() { throw new Error("unreachable"); }

test("B15 backup is opt-in and refuses output inside live data", async () => {
  const f = fixture();
  try {
    const destination = path.join(f.dataRoot, "not-a-backup");
    await assert.rejects(() => stageOH7B15Backup({
      dataRoot: f.dataRoot, vaultRoot: f.vaultRoot, destination,
      explicitOptIn: true, confirmDisposableRestore: true,
    }), /overlaps production storage/);
    await assert.rejects(() => stageOH7B15Backup({
      dataRoot: f.dataRoot, vaultRoot: f.vaultRoot,
      destination: path.join(f.backups, "unapproved"),
    }), /both explicit operator flags/);
    assert.equal(fs.existsSync(destination), false);
  } finally {
    f.db.close();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("B15 refuses vault symlinks rather than following external targets", async () => {
  const f = fixture();
  try {
    fs.symlinkSync(path.join(f.dataRoot, "chernobog.db"),
      path.join(f.vaultRoot, "unapproved-database-link"));
    await assert.rejects(() => stageOH7B15Backup({
      dataRoot: f.dataRoot, vaultRoot: f.vaultRoot,
      destination: path.join(f.backups, "unsafe-vault"),
      explicitOptIn: true, confirmDisposableRestore: true,
    }), /unsupported non-file entry/);
  } finally {
    f.db.close();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
