/**
 * OH-7B8: inspect configured production storage without opening or modifying it.
 * This is an observer preflight, NOT permission to initialize a core writer.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveStoragePaths } from "./oh7b2-storage-boundary.mjs";

const REQUIRED = ["CHERNOBOG_DATA_DIR", "CHERNOBOG_VAULT_PATH"];

export function inspectOH7B8ProductionPaths(repoRoot, env = process.env) {
  const missing = REQUIRED.filter(key => !env[key]?.trim());
  const nonAbsolute = REQUIRED.filter(key => env[key]?.trim() && !path.isAbsolute(env[key].trim()));
  const paths = resolveStoragePaths(repoRoot, env);
  const selected = {
    data: paths.data,
    vault: paths.vault,
    mainDb: paths.mainDb,
    runtime: paths.runtime,
  };
  const exists = Object.fromEntries(
    Object.entries(selected).map(([key, value]) => [key, fs.existsSync(value)]),
  );
  const warnings = [];
  if (missing.length) warnings.push(`Missing explicit production paths: ${missing.join(", ")}`);
  if (nonAbsolute.length) warnings.push(`Production paths must be absolute: ${nonAbsolute.join(", ")}`);
  if (!exists.data) warnings.push("Configured data directory cannot be observed");
  if (!exists.vault) warnings.push("Configured vault directory cannot be observed");
  if (!exists.mainDb) warnings.push("Configured main SQLite database cannot be observed; do not initialize a replacement");
  if (exists.data && !fs.statSync(paths.data).isDirectory()) warnings.push("Configured data path is not a directory");
  if (exists.vault && !fs.statSync(paths.vault).isDirectory()) warnings.push("Configured vault path is not a directory");
  if (exists.mainDb && !fs.statSync(paths.mainDb).isFile()) warnings.push("Configured main database path is not a file");
  return Object.freeze({
    mode: "read-only-observer",
    configured: missing.length === 0 && nonAbsolute.length === 0,
    storageVisible: warnings.length === 0,
    operationalOwner: false,
    operationalCoreReady: false,
    exists,
    warnings,
  });
}
