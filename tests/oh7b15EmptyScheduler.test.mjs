import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initializeEmptyOH7B15Scheduler } from "../scripts/oh7b15-initialize-empty-scheduler.mjs";

const stopped = () => ({ ActiveState: "inactive", UnitFileState: "masked", LoadState: "masked" });
const running = () => ({ ActiveState: "active", UnitFileState: "enabled", LoadState: "loaded" });

test("B15 refuses implicit scheduler initialization even in a disposable fixture", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "b15-no-init-"));
  fs.mkdirSync(path.join(root, "scheduler"));
  try {
    assert.throws(() => initializeEmptyOH7B15Scheduler({
      dataRoot: root, legacyState: stopped, explicitOptIn: true,
    }), /both explicit approvals/);
    assert.equal(fs.existsSync(path.join(root, "scheduler", "jobs.json")), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("B15 refuses when legacy service is active, with no files touched", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "b15-legacy-active-"));
  fs.mkdirSync(path.join(root, "scheduler"));
  try {
    assert.throws(() => initializeEmptyOH7B15Scheduler({
      dataRoot: root, legacyState: running,
      explicitOptIn: true, emptyStoreConfirmed: true,
    }), /legacy writer not safely stopped\/masked/);
    assert.equal(fs.existsSync(path.join(root, "scheduler", "jobs.json")), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("B15 creates an empty store only when explicitly approved and legacy is quiescent", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "b15-explicit-init-"));
  fs.mkdirSync(path.join(root, "scheduler"));
  try {
    const args = {
      dataRoot: root, legacyState: stopped,
      explicitOptIn: true, emptyStoreConfirmed: true,
    };
    const result = initializeEmptyOH7B15Scheduler(args);
    assert.equal(result.initialized, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(result.file, "utf8")),
      { schemaVersion: 1, jobs: [], schedules: [], runs: [] });
    assert.throws(() => initializeEmptyOH7B15Scheduler(args), /EEXIST/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("B15 refuses missing scheduler directory instead of creating it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "b15-no-dir-"));
  try {
    assert.throws(() => initializeEmptyOH7B15Scheduler({
      dataRoot: root, legacyState: stopped,
      explicitOptIn: true, emptyStoreConfirmed: true,
    }), /ENOENT/);
    assert.equal(fs.existsSync(path.join(root, "scheduler")), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
