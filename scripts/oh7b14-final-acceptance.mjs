#!/usr/bin/env node
/**
 * OH-7B14 final acceptance aggregator: read-only and fail-closed.
 *
 * No production environment loading, service mutation, database opening,
 * lease acquisition, or operational activation. Reports evidence still
 * required at the B15 handover instead of declaring production safe.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { inspectOH7B14Deployment } from "./oh7b14-deployment-preflight.mjs";
import { inspectOH7B14WriterExclusion } from "./oh7b14-writer-exclusion.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePath = path.join(root, "deploy/oh7/chernobog-core-candidate.service");

export function inspectOH7B14FinalAcceptance({
  deployment = inspectOH7B14Deployment,
  writerExclusion = inspectOH7B14WriterExclusion,
  readCandidate = () => readFileSync(candidatePath, "utf8"),
} = {}) {
  const findings = [];
  let preflight;
  let exclusion;
  try {
    preflight = deployment();
    if (preflight?.activationAuthorized !== false || preflight?.productionCoreReady !== false) {
      findings.push("Deployment preflight did not explicitly deny production activation");
    }
  } catch {
    findings.push("Deployment preflight unavailable");
  }
  try {
    exclusion = writerExclusion({ candidateUnit: readCandidate() });
    if (exclusion?.activationAuthorized !== false ||
        exclusion?.runtimeWriterExclusionProven !== false) {
      findings.push("Writer-exclusion inspection did not explicitly deny cutover");
    }
    if (exclusion?.candidateTemplateSafeForNonoperationalInspection !== true) {
      findings.push("Nonoperational systemd template failed inspection");
    }
  } catch {
    findings.push("Writer-exclusion inspection unavailable");
  }

  return Object.freeze({
    mode: "oh7b14-final-readonly-acceptance",
    candidateTemplateSafe: exclusion?.candidateTemplateSafeForNonoperationalInspection === true,
    liveLegacyQuiescent: exclusion?.legacyServiceCurrentlyQuiescent === true,
    sourceLevelValidation: "must be confirmed by separate test, typecheck and lint commands",
    supervisedOperationalCoreEntryPointPresent: false,
    productionFilesystemExclusionProven: false,
    realProductionJobHandlersVerified: false,
    verifiedRollbackAvailable: false,
    productionCoreReady: false,
    activationAuthorized: false,
    findings,
    blockersForB15: [
      "No reviewed executable production bootstrap with B13 authority acquisition",
      "No proved OS-level mutually exclusive production writer service",
      "No validated inventory and registration of every enabled production job kind",
      "No tested production permissions, recovery, rollback and soak",
    ],
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(inspectOH7B14FinalAcceptance(), null, 2));
}
