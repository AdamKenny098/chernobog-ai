import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { snapshotOH5Database, rehearseOH5Recovery } from "../packages/vault/src/oh5/resilience";
import { createHash } from "node:crypto";

test("OH7B13 unowned core refuses OH5 backup destination writes", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b13-resilience-"));
  const input = path.join(fixture, "source.db");
  const output = path.join(fixture, "backup");
  const database = new Database(input);
  try {
    database.exec(`
      CREATE TABLE memory (
        id TEXT, projectId TEXT, revision INTEGER, supersededBy TEXT, tier TEXT
      );
      CREATE TABLE audit (id TEXT);
      CREATE TABLE approval_consumed (id TEXT);
      CREATE TABLE oh5_evidence_receipts (memoryId TEXT, projectId TEXT);
    `);
  } finally {
    database.close();
  }
  const role = process.env.CHERNOBOG_STORAGE_ROLE;
  try {
    process.env.CHERNOBOG_STORAGE_ROLE = "core";
    await assert.rejects(snapshotOH5Database(input, output), /CORE_WRITER_DENIED/);
    assert.equal(fs.existsSync(output), false);
  } finally {
    if (role === undefined) delete process.env.CHERNOBOG_STORAGE_ROLE;
    else process.env.CHERNOBOG_STORAGE_ROLE = role;
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("OH7B13 recovery rehearsal uses only temporary scratch data", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "oh7b13-rehearsal-"));
  const backup = path.join(fixture, "sample.sqlite");
  const db = new Database(backup);
  try {
    db.exec(`
      CREATE TABLE memory (
        id TEXT, projectId TEXT, revision INTEGER, supersededBy TEXT, tier TEXT
      );
      CREATE TABLE audit (id TEXT);
      CREATE TABLE approval_consumed (id TEXT);
      CREATE TABLE oh5_evidence_receipts (memoryId TEXT, projectId TEXT);
    `);
  } finally {
    db.close();
  }
  const before = fs.readFileSync(backup);
  const digest = createHash("sha256").update(before).digest("hex");
  const role = process.env.CHERNOBOG_STORAGE_ROLE;
  try {
    process.env.CHERNOBOG_STORAGE_ROLE = "core";
    const result = rehearseOH5Recovery(backup, digest);
    assert.equal(result.healthy, true);
    assert.deepEqual(fs.readFileSync(backup), before);
  } finally {
    if (role === undefined) delete process.env.CHERNOBOG_STORAGE_ROLE;
    else process.env.CHERNOBOG_STORAGE_ROLE = role;
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
