#!/usr/bin/env node
/**
 * OH-7B14 read-only deployment readiness report.
 *
 * Does not import application services, acquire ownership, mutate systemd,
 * create storage, or authorize production activation. Output contains no
 * environment values, paths, or secrets.
 */
import { inspectOH7B13Activation } from "./oh7b13-activation-preflight.mjs";
import { readLegacySystemdState } from "./oh7b12-production-ownership.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function inspectOH7B14Deployment({
  root = DEFAULT_ROOT,
  env = process.env,
  getLegacyState = readLegacySystemdState,
} = {}) {
  const blockers = [];
  if (env.CHERNOBOG_STORAGE_ROLE === "core") {
    blockers.push("Read-only deployment inspection must not run as operational core role");
  }
  if (env.CHERNOBOG_CORE_ROUTE_MODE === "proxy") {
    blockers.push("Read-only deployment inspection refuses proxy routing");
  }
  const legacy = inspectOH7B13Activation({ root, env, getLegacyState });
  // B13 preflight intentionally denies runtime activation even if the legacy
  // service has stopped. This B14 checkpoint must never override that denial.
  blockers.push("Production core host, dependency graph and OS-level writer exclusion have not passed B14 acceptance");
  return Object.freeze({
    mode: "oh7b14-deployment-inspection",
    productionServiceUnchanged: true,
    productionCoreReady: false,
    activationAuthorized: false,
    legacyWriterStoppedAndMasked: legacy.legacyWriterStoppedAndMasked,
    preflightBlockers: legacy.blockers,
    blockers,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectOH7B14Deployment();
  console.log(JSON.stringify(report, null, 2));
  if (report.activationAuthorized) process.exitCode = 1;
}
