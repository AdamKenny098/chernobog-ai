#!/usr/bin/env node
/**
 * OH-7B13 final-acceptance audit: conservative read-only source inventory.
 * Review aid only: no source scan can prove transitive/runtime writer exclusion.
 *
 * --json emits structured output. Default emits a short review summary.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inventoryWriters } from "./oh7b13-writer-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Explicitly reviewed core-side source areas, NOT an automatic reachability proof. */
const CORE_AREAS = [
  "lib/chernobog/",
  "packages/events/",
  "packages/personal-assistance/",
  "packages/vault/",
  "packages/core/",
];
const MUTATION_MATCH = new Set([
  "sqlite-open",
  "sync-file-write",
  "async-file-write",
  "stream-file-write",
]);
const KNOWN_GUARDED = new Set([
  "lib/chernobog/db.ts",
  "lib/chernobog/learning/lessonStore.ts",
  "lib/chernobog/events/store.ts",
  "lib/chernobog/personalAssistance/calendar/store.ts",
  "lib/chernobog/personalAssistance/notificationIntelligence/journal.ts",
  "lib/chernobog/personalAssistance/responsibilities/store.ts",
  "packages/events/src/store.ts",
  "packages/vault/src/oh5/store.ts",
  "packages/vault/src/oh5/recall.ts",
  "packages/vault/src/oh5/layout.ts",
  "packages/personal-assistance/src/persistence.ts",
  "packages/core/src/jobStore.ts",
  "packages/personal-assistance/src/calendar/store.ts",
  "packages/personal-assistance/src/notificationIntelligence/journal.ts",
  "packages/personal-assistance/src/responsibilities/store.ts",
  "packages/personal-assistance/src/workSchedule/store.ts",
  "lib/chernobog/personalAssistance/workSchedule/store.ts",
  "lib/chernobog/worldState/snapshotStore.ts",
  "packages/vault/src/oh5/classification.ts",
  "packages/vault/src/oh5/confirmation.ts",
  "packages/vault/src/oh5/conflicts.ts",
  "packages/vault/src/oh5/ingestion.ts",
  "packages/vault/src/oh5/projectState.ts",
  "packages/vault/src/oh5/semanticRetrieval.ts",
  "lib/chernobog/tools/builtins/append-text-file.ts",
  "lib/chernobog/tools/builtins/create-folder.ts",
  "lib/chernobog/tools/builtins/create-text-file.ts",
  "lib/chernobog/tools/builtins/move-path.ts",
  "lib/chernobog/tools/builtins/rename-path.ts",
  "lib/chernobog/tools/builtins/write-project-file.ts",
]);

// Individually inspected on B13: these are scanner false positives / read-only connections.
const REVIEWED_NON_WRITERS = new Set([
  "lib/chernobog/execution/buildExecutionTask.ts", // regex /open (...)/ matches, no filesystem call
  "packages/vault/src/oh5/retrieval.ts", // readonly: true, fileMustExist: true, SELECT only
]);
// Mixed operational backup writes + temporary-only recovery rehearsal.
// This is kept separate from fully reviewed non-writers.
const REVIEWED_SPECIAL = new Set([
  "packages/vault/src/oh5/resilience.ts",
]);

export function criticalWriterAudit(findings) {
  const inCore = findings.filter((f) => CORE_AREAS.some((p) => f.path.startsWith(p)));
  // A name collision is NOT a mutation. Reject known DOM calls and common
  // regex/array helpers but retain ambiguous filesystem hits for review.
  const candidates = inCore.filter((f) =>
    f.kinds.some((kind) => MUTATION_MATCH.has(kind)) &&
    !/\b(?:window|document|globalThis)\.open\s*\(/.test(f.snippet) &&
    !/\bthis\.(?:upsert|writeFile)\s*\(/.test(f.snippet),
  );
  const grouped = new Map();
  for (const finding of candidates) {
    const group = grouped.get(finding.path) ?? {
      path: finding.path,
      guardReviewed: KNOWN_GUARDED.has(finding.path),
      classification: KNOWN_GUARDED.has(finding.path) ? "guarded" :
        REVIEWED_NON_WRITERS.has(finding.path) ? "non-writer" :
        REVIEWED_SPECIAL.has(finding.path) ? "special-review" : "unreviewed",
      lines: [],
    };
    group.lines.push({ line: finding.line, kinds: finding.kinds, snippet: finding.snippet });
    grouped.set(finding.path, group);
  }
  const files = [...grouped.values()].sort((a, b) =>
    a.classification.localeCompare(b.classification) || a.path.localeCompare(b.path));
  return {
    mode: "source-audit-not-runtime-proof",
    activationAuthorized: false,
    writerIsolationProven: false,
    scope: CORE_AREAS,
    candidateFiles: files.length,
    needsManualReview: files.filter((item) => item.classification === "unreviewed").length,
    specialReview: files.filter((item) => item.classification === "special-review").length,
    files,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = criticalWriterAudit(inventoryWriters(root));
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`OH-7B13 CORE WRITER AUDIT: ${report.candidateFiles} candidate files; ${report.needsManualReview} unreviewed; ${report.specialReview} special review`);
    console.log("Production activation: DENIED. Scanner findings require human review.");
    for (const file of report.files) {
      const label = ({ guarded: "KNOWN-GUARDED (verify)", "non-writer": "REVIEWED-NON-WRITER", "special-review": "SPECIAL-REVIEW", unreviewed: "REVIEW-REQUIRED" })[file.classification];
      console.log(`${label.padEnd(24)} ${String(file.lines.length).padStart(3)} hits  ${file.path}`);
    }
  }
}
