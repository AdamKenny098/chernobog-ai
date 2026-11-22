/**
 * OH-7B13 production activation preflight.
 * Read-only by construction: never acquires a lease, initializes storage,
 * stops systemd services or creates a database.
 */
import path from "node:path";
import { assertProductionPaths, assertLegacyQuiescent, readLegacySystemdState } from "./oh7b12-production-ownership.mjs";

export function inspectOH7B13Activation({
  root = "",
  env = process.env,
  getLegacyState = readLegacySystemdState,
} = {}) {
  const blockers = [];
  if (!root || !path.isAbsolute(root)) {
    blockers.push("Absolute repository root required");
  } else {
    try { assertProductionPaths(root, env); }
    catch (error) { blockers.push(error instanceof Error ? error.message : String(error)); }
  }
  let legacyWriterStoppedAndMasked = false;
  try {
    assertLegacyQuiescent(getLegacyState);
    legacyWriterStoppedAndMasked = true;
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : String(error));
  }
  // Production host composition is still in development. The mode MUST remain
  // disabled even when storage and legacy-service checks individually pass.
  blockers.push("Production runtime composition and write-path fencing not yet validated");
  return Object.freeze({
    mode: "production-preflight-only",
    legacyWriterStoppedAndMasked,
    operationalCoreReady: false,
    activationAuthorized: false,
    blockers,
  });
}
