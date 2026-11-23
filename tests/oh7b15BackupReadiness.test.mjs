import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectOH7B15BackupReadiness } from "../scripts/oh7b15-backup-readiness.mjs";

const data = "/var/lib/chernobog/data";
const db = data + "/chernobog.db";
const vault = "/srv/storage/chernobog/vault";
const release = "/srv/apps/chernobog/releases/20260915T194421Z-forge-v1-99fdab99";
const dirs = new Set([data, vault, release]);
const files = new Set([db, db + "-wal", db + "-shm"]);
function mockStat(file) {
  if (dirs.has(file)) return { isDirectory: () => true, isFile: () => false };
  if (files.has(file)) return {
    isDirectory: () => false, isFile: () => true, size: 32768,
  };
  const error = new Error("missing");
  error.code = "ENOENT";
  throw error;
}
const mockFs = () => ({ bavail: 1000, bsize: 4096, blocks: 10000 });

test("B15 backup readiness records SQLite sidecars but never claims a backup", () => {
  const report = inspectOH7B15BackupReadiness({
    stat: mockStat, statfs: mockFs,
  });
  assert.equal(report.files.database.state, "present");
  assert.equal(report.files.wal.state, "present");
  assert.equal(report.files.shm.state, "present");
  assert.equal(report.files.scheduler.state, "absent");
  assert.equal(report.snapshotVerified, false);
  assert.equal(report.sqliteConsistencyVerified, false);
  assert.equal(report.restoreRehearsalPassed, false);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.space.filesystemAvailableBytes, 4096000);
  assert.deepEqual(report.blockers, []);
});

test("B15 backup readiness fails closed on permission denied vault", () => {
  const report = inspectOH7B15BackupReadiness({
    stat(file) {
      if (file === vault) {
        const error = new Error("permission denied");
        error.code = "EACCES";
        throw error;
      }
      return mockStat(file);
    },
    statfs: mockFs,
  });
  assert.equal(report.files.vault.state, "inaccessible");
  assert.ok(report.blockers.includes("vault: inaccessible"));
  assert.equal(report.activationAuthorized, false);
});

test("B15 backup readiness flags missing database, not merely absent WAL", () => {
  const report = inspectOH7B15BackupReadiness({
    stat(file) {
      if (file === db) {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      }
      return mockStat(file);
    },
    statfs: mockFs,
  });
  assert.equal(report.files.database.state, "missing");
  assert.ok(report.blockers.includes("database: missing"));
});

test("B15 backup readiness refuses relative paths", () => {
  assert.throws(() => inspectOH7B15BackupReadiness({
    dataRoot: "./data",
  }), /absolute inventory paths/);
});
