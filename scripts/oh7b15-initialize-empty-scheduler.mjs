#!/usr/bin/env node
/**
 * B15 explicit initialization of an EMPTY OH3 scheduler store.
 * This is NOT invoked by the app/bootstrap or a systemd service.
 *
 * Safety properties:
 * - CLI requires --initialize-empty-jobs and a second independent opt-in
 * - legacy writer must be inactive AND masked
 * - no overwrite, migration, deletion or implicit directory creation
 * - existing production data directory and scheduler directory required
 * - ownership/permission setup is deliberately left to the operator
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertLegacyQuiescent } from "./oh7b12-production-ownership.mjs";

export function initializeEmptyOH7B15Scheduler({
  dataRoot,
  explicitOptIn = false,
  emptyStoreConfirmed = false,
  legacyState,
  fsApi = fs,
} = {}) {
  if (explicitOptIn !== true || emptyStoreConfirmed !== true) {
    throw new Error("OH7B15 empty scheduler initialization requires both explicit approvals");
  }
  if (typeof dataRoot !== "string" || !path.isAbsolute(dataRoot)) {
    throw new Error("OH7B15 absolute data root required");
  }
  const root = path.resolve(dataRoot);
  if (root === path.parse(root).root) {
    throw new Error("OH7B15 root directory cannot be scheduler data");
  }
  assertLegacyQuiescent(legacyState);
  const dataStat = fsApi.statSync(root);
  const schedulerDirectory = path.join(root, "scheduler");
  const schedulerStat = fsApi.statSync(schedulerDirectory);
  if (!dataStat.isDirectory() || !schedulerStat.isDirectory()) {
    throw new Error("OH7B15 pre-existing data and scheduler directories required");
  }
  // Never initialize the wrong data root, and never initialize as an
  // operational core while legacy writer exclusion is being prepared.
  const target = path.join(schedulerDirectory, "jobs.json");
  const snapshot = { schemaVersion: 1, jobs: [], schedules: [], runs: [] };
  const fd = fsApi.openSync(target, "wx", 0o600);
  try {
    fsApi.writeFileSync(fd, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    fsApi.fsyncSync(fd);
  } finally {
    fsApi.closeSync(fd);
  }
  return { initialized: true, file: target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 ||
      process.argv[2] !== "--initialize-empty-jobs" ||
      process.argv[3] !== "--confirm-no-existing-oh3-state") {
    console.error("OH7B15 scheduler initialization disabled without two explicit flags");
    process.exitCode = 2;
  } else {
    const dataRoot = process.env.CHERNOBOG_DATA_DIR;
    if (process.env.CHERNOBOG_STORAGE_ROLE === "core") {
      throw new Error("OH7B15 refuse initialization within operational core process");
    }
    initializeEmptyOH7B15Scheduler({
      dataRoot, explicitOptIn: true, emptyStoreConfirmed: true,
    });
    console.log("OH7B15 empty scheduler store initialized");
  }
}
