#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const EXPECTED_BRANCH = "oh-1-repository-decomposition";
const EXPECTED_BASELINE = "36e1d27d7d56fa4fa144ebbac0cf51063791fd7c";
const jsonPath = path.join(repo, "docs", "overhaul", "OH-2A-runtime-path-audit.json");
const mdPath = path.join(repo, "docs", "overhaul", "OH-2A-runtime-path-audit.md");

let failures = 0;
function check(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else { console.error(`FAIL ${message}`); failures++; }
}
function git(args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}
function readJsonFile(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

console.log("Chernobog OH-2A — Runtime Path Audit Verifier");
console.log("==============================================");

check(fs.existsSync(jsonPath), "machine-readable audit manifest exists");
check(fs.existsSync(mdPath), "human-readable architecture report exists");

let report = null;
if (fs.existsSync(jsonPath)) {
  try { report = readJsonFile(jsonPath); }
  catch (err) { console.error(`FAIL audit JSON parses: ${err.message}`); failures++; }
}
if (!report) process.exit(1);

check(report.stage === "OH-2A", "audit stage is OH-2A");
check(report.auditRevision === "V4", "audit revision is V4");
check(report.baseline?.branch === EXPECTED_BRANCH, "audit locked to expected OH-1 branch");
check(report.baseline?.commit === EXPECTED_BASELINE, "audit locked to accepted OH-1 checkpoint");
check(git(["branch", "--show-current"]) === EXPECTED_BRANCH, "repository remains on expected branch");
check(
  report.canonicalIngress === "app/api/chat/route.ts" ||
  report.canonicalIngress === "apps/chernobog-ui/app/api/chat/route.ts",
  `canonical chat ingress is locked: ${report.canonicalIngress}`
);
check(Number(report.reachableFileCount) >= 8, `canonical ingress dependency graph is materially resolved (${report.reachableFileCount} files)`);
check(
  Array.isArray(report.unresolvedImportsOnReachableGraph),
  "unresolved internal imports on canonical graph are explicitly recorded"
);
check(Boolean(report.currentTurnCoordinator?.path), "current turn coordinator evidence is recorded");
if (report.currentTurnCoordinator?.path) {
  check(fs.existsSync(path.join(repo, report.currentTurnCoordinator.path)), `turn coordinator exists: ${report.currentTurnCoordinator.path}`);
}

const requiredCategories = [
  "ingress", "dialogue", "routing", "planning", "actionSelection",
  "trust", "tool", "event", "state", "response", "readiness"
];
for (const category of requiredCategories) {
  const primary = report.authorities?.[category]?.primary;
  check(Boolean(primary?.path), `${category} has an observed primary candidate`);
  if (primary?.path) {
    check(fs.existsSync(path.join(repo, primary.path)), `${category} primary candidate exists: ${primary.path}`);
    check(Number(primary.score) > 0, `${category} primary candidate has positive evidence score`);
    const basis = report.authorities?.[category]?.authorityBasis;
    check(
      basis === "canonical-ingress-import-graph" || basis === "global-fallback",
      `${category} records how its authority candidate was derived`
    );
  }
}

check(Array.isArray(report.questionAnswers) && report.questionAnswers.length === 10, "all ten OH-2A ownership questions are answered");
check(Array.isArray(report.commandLifecycle) && report.commandLifecycle.length === 10, "full ingress-to-response lifecycle is represented");

const suspiciousAuthority = [];
for (const category of ["dialogue", "routing", "planning", "actionSelection", "trust", "tool", "event", "state"]) {
  const p = report.authorities?.[category]?.primary?.path ?? "";
  if (p === report.canonicalIngress) suspiciousAuthority.push(`${category}:${p}`);
  if (/personality\/profile\.(ts|tsx|js)$/i.test(p) && ["dialogue", "trust", "state"].includes(category)) {
    suspiciousAuthority.push(`${category}:${p}`);
  }
}
check(
  suspiciousAuthority.length <= 2,
  `authority map is not dominated by ingress/personality false positives${suspiciousAuthority.length ? ` (${suspiciousAuthority.join(", ")})` : ""}`
);
check(Array.isArray(report.directToolExecutionCandidates), "direct tool-execution candidates are explicitly recorded");
check(Array.isArray(report.directStateMutationCandidates), "direct state-mutation candidates are explicitly recorded");
check(Array.isArray(report.importEdges), "static import/dependency evidence is recorded");

const expectedPackages = {
  runtime: "@chernobog/runtime",
  core: "@chernobog/core",
  events: "@chernobog/events",
  tools: "@chernobog/tools",
  trust: "@chernobog/trust",
  observability: "@chernobog/observability",
};
for (const [pkg, expectedName] of Object.entries(expectedPackages)) {
  const pkgPath = path.join(repo, "packages", pkg);
  check(fs.existsSync(pkgPath), `OH-1 package boundary exists: packages/${pkg}`);
  const packageJson = path.join(pkgPath, "package.json");
  if (fs.existsSync(packageJson)) {
    try {
      const parsed = readJsonFile(packageJson);
      check(parsed.name === expectedName, `package identity preserved: ${expectedName}`);
    } catch (err) {
      console.error(`FAIL parse ${packageJson}: ${err.message}`);
      failures++;
    }
  }
}

const md = fs.readFileSync(mdPath, "utf8");
for (const heading of [
  "# Chernobog OH-2A — Runtime Path Audit & Lock",
  "## Canonical audit anchor",
  "## Ten ownership questions",
  "## Observed lifecycle path",
  "## Competing ownership / parallel-path candidates",
  "## Direct tool-execution review candidates",
  "## Direct authoritative-state mutation review candidates",
  "## Runtime lifecycle / readiness",
  "## OH-2A lock",
]) {
  check(md.includes(heading), `report contains ${heading}`);
}
check(md.includes("Ingress") && md.includes("Dialogue") && md.includes("Response"), "report documents ingress -> dialogue -> response lifecycle");
check(md.includes("No OH-3+ work is authorized by this audit."), "audit explicitly defers later-overhaul work");

if (failures) {
  console.error(`\nOH-2A verifier: FAIL (${failures} failure${failures === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log("\nOH-2A verifier: PASS");
