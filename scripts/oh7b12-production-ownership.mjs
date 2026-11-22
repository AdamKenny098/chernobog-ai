/**
 * OH-7B12: explicit, fail-closed production writer handover.
 *
 * This module never stops, masks, starts, or alters any systemd service.
 * The operator must first stop AND permanently mask the legacy writer.
 * The lease only fences cooperating core processes. Do not use this as a
 * substitute for systemd-level exclusion or for checks before each write.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  acquireProspectiveCoreLease,
  resolveStoragePaths,
} from "./oh7b2-storage-boundary.mjs";

const LEGACY_UNIT = "chernobog.service";
const REQUIRED_VARS = ["CHERNOBOG_DATA_DIR", "CHERNOBOG_VAULT_PATH"];
const REQUIRED_STATE = Object.freeze({
  ActiveState: "inactive",
  UnitFileState: "masked",
  LoadState: "masked",
});

/** Read systemd state using argument vectors, never a shell. */
export function readLegacySystemdState() {
  const output = execFileSync("/usr/bin/systemctl", [
    "show", LEGACY_UNIT, "--no-pager",
    "--property=ActiveState,SubState,UnitFileState,LoadState",
  ], { encoding: "utf8", timeout: 5000 });
  const fields = Object.fromEntries(
    output.trim().split("\n").filter(Boolean).map(line => {
      const position = line.indexOf("=");
      if (position < 1) throw new Error("Invalid systemd legacy state response");
      return [line.slice(0, position), line.slice(position + 1)];
    }),
  );
  return fields;
}

export function assertLegacyQuiescent(getLegacyState = readLegacySystemdState) {
  const state = getLegacyState();
  if (!state || typeof state !== "object") {
    throw new Error("OH7B12: legacy systemd status unavailable");
  }
  for (const [key, value] of Object.entries(REQUIRED_STATE)) {
    if (state[key] !== value) {
      throw new Error(
        `OH7B12: legacy writer not safely stopped/masked (${key}=${String(state[key])}); refusing ownership`,
      );
    }
  }
  return true;
}

export function assertProductionPaths(root, env = process.env) {
  for (const variable of REQUIRED_VARS) {
    const value = env[variable]?.trim();
    if (!value || !path.isAbsolute(value)) {
      throw new Error(`OH7B12: absolute ${variable} required`);
    }
  }
  const paths = resolveStoragePaths(root, env);
  if (paths.data === paths.root || paths.runtime === paths.root) {
    throw new Error("OH7B12: storage may not resolve to repository root");
  }
  for (const key of ["data", "vault", "runtime"]) {
    if (!fs.existsSync(paths[key]) || !fs.statSync(paths[key]).isDirectory()) {
      throw new Error(`OH7B12: required directory ${key} does not exist; refusing initialization`);
    }
  }
  if (!fs.existsSync(paths.mainDb) || !fs.statSync(paths.mainDb).isFile()) {
    throw new Error("OH7B12: existing production database required; refusing initialization");
  }
  return paths;
}

/**
 * Requires an operator's explicit opt-in, existing state, and verified
 * permanently masked/stopped legacy service both BEFORE and AFTER lease.
 *
 * The caller must continue invoking assertStillOwned() before every
 * operational request and state-changing background tick.
 */
export function acquireOH7B12Ownership({
  root = "",
  env = process.env,
  explicitOptIn = false,
  getLegacyState = readLegacySystemdState,
} = {}) {
  if (explicitOptIn !== true) {
    throw new Error("OH7B12: explicit operator opt-in required");
  }
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("OH7B12: absolute repository root required");
  }
  const paths = assertProductionPaths(root, env);
  assertLegacyQuiescent(getLegacyState);
  const lease = acquireProspectiveCoreLease(paths, {
    explicitOptIn: true,
    legacyHostVerifiedStopped: true,
  });
  let released = false;
  let invalidated = false;
  function assertStillOwned() {
    if (released || invalidated) throw new Error("OH7B12: ownership no longer valid");
    try {
      assertLegacyQuiescent(getLegacyState);
      lease.assertHeld();
    } catch (error) {
      invalidated = true;
      throw error;
    }
  }
  try {
    assertStillOwned();
  } catch (error) {
    lease.release();
    throw error;
  }
  return Object.freeze({
    paths: Object.freeze({ ...paths }),
    assertStillOwned,
    release() {
      if (released) return;
      // If the lock was replaced, lease.release() refuses to delete it.
      lease.release();
      released = true;
    },
  });
}
