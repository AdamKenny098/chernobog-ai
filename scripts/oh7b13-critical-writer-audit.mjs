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
  "lib/chernobog/events/store.ts",
  "lib/chernobog/personalAssistance/calendar/store.ts",
  "lib/chernobog/personalAssistance/notificationIntelligence/journal.ts",
  "lib/chernobog/personalAssistance/responsibilities/store.ts",
  "packages/events/src/store.ts",
  "packages/vault/src/oh5/store.ts",
  "packages/vault/src/oh5/recall.ts",
  "packages/vault/src/oh5/layout.ts",
  "packages/personal-assistance/src/persistence.ts",
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
      lines: [],
    };
    group.lines.push({ line: finding.line, kinds: finding.kinds, snippet: finding.snippet });
    grouped.set(finding.path, group);
  }
  const files = [...grouped.values()].sort((a, b) =>
    Number(a.guardReviewed) - Number(b.guardReviewed) || a.path.localeCompare(b.path));
  return {
    mode: "source-audit-not-runtime-proof",
    activationAuthorized: false,
    writerIsolationProven: false,
    scope: CORE_AREAS,
    candidateFiles: files.length,
    needsManualReview: files.filter((item) => !item.guardReviewed).length,
    files,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = criticalWriterAudit(inventoryWriters(root));
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`OH-7B13 CORE WRITER AUDIT: ${report.candidateFiles} candidate files; ${report.needsManualReview} outside known guarded inventory`);
    console.log("Production activation: DENIED. Scanner findings require human review.");
    for (const file of report.files) {
      const label = file.guardReviewed ? "KNOWN-GUARDED (verify)" : "REVIEW-REQUIRED";
      console.log(`${label.padEnd(24)} ${String(file.lines.length).padStart(3)} hits  ${file.path}`);
    }
  }
}
