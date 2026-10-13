#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else {
    console.error(`FAIL ${message}`);
    failures++;
  }
}
function read(rel) {
  const full = path.join(repo, rel);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
}
function walk(root) {
  const out = [];
  const abs = path.join(repo, root);
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|mjs|cjs)$/i.test(entry.name)) {
        out.push(path.relative(repo, full).split(path.sep).join("/"));
      }
    }
  }
  return out;
}
function parseRouterImports(text) {
  const imports = [];
  const rx = /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']*router)["'];?/g;
  let m;
  while ((m = rx.exec(text))) {
    for (const raw of m[1].split(",")) {
      const token = raw.trim();
      if (!token || token.startsWith("type ")) continue;
      const alias = token.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (alias) imports.push({ imported: alias[1], local: alias[2] ?? alias[1], source: m[2] });
    }
  }
  return imports;
}
function looksLikeClassifier(name) {
  const lower = name.toLowerCase();
  if (lower.includes("respondforroute") || lower.startsWith("respond") || lower.includes("format")) return false;
  if (lower.includes("metadata") || lower.includes("routename")) return false;
  return lower === "route" || lower.startsWith("route") ||
    lower.includes("classifyroute") || lower.includes("classifieroute") ||
    lower.includes("resolveroute") || lower.includes("determineroute") ||
    lower.includes("selectroute");
}
function countCalls(text, name) {
  const rx = new RegExp(`\\b${name.replace(/[$]/g, "\\$&")}\\s*\\(`, "g");
  return [...text.matchAll(rx)].length;
}

console.log("Chernobog OH-2C — Router Consolidation Verifier");
console.log("================================================");

const runtimeRel = "packages/runtime/src/routerRuntime.ts";
const runtime = read(runtimeRel);
const runtimeIndex = read("packages/runtime/src/index.ts");
const pipelineRel = "lib/chernobog/pipeline/runCommand.ts";
const pipeline = read(pipelineRel);
const routerRel = "lib/chernobog/router.ts";
const router = read(routerRel);
const routingContinuityVerifierRel =
  "scripts/verify-chernobog-phase11-integration-e-routing-continuity.ts";
const routingContinuityVerifier = read(routingContinuityVerifierRel);

check(Boolean(runtime), "authoritative Router Runtime exists");
check(Boolean(router), "existing router implementation remains present");
check(runtimeIndex.includes('export * from "./routerRuntime";'), "@chernobog/runtime exports Router Runtime");
check(runtime.includes("export class RouterRuntime"), "Router Runtime has one explicit class authority");
check(runtime.includes("public async resolveRoute"), "Router Runtime owns one decision resolver");
check(runtime.includes("const existing = this.decisions.get(turnId)"), "Router Runtime reuses an existing decision for the same turn");
check(runtime.includes("return existing.promise as Promise<T>"), "same-turn re-routing returns the authoritative prior decision");
check(runtime.includes("maxRetainedDecisions = 256"), "Router Runtime bounds retained decision history");
check(runtime.includes("public snapshot()"), "Router Runtime exposes inspectable routing projection");
check(runtime.includes("const routerRuntime = new RouterRuntime()"), "Router Runtime has one process singleton");
check(runtime.includes("export function getRouterRuntime"), "Router Runtime singleton uses one public getter");

check(
  /import\s*\{[^}\n]*\bgetDialogueRuntime\b[^}\n]*\}\s*from\s*["']@chernobog\/runtime["'];?/.test(pipeline),
  "accepted OH-2B getDialogueRuntime import is preserved",
);
check(
  pipeline.includes('import { getRouterRuntime } from "@chernobog/runtime";'),
  "OH-2C adds an explicit Router Runtime import without rewriting OH-2B import shape",
);
check(
  pipeline.includes("async (dialogueTurn) => {"),
  "router decision is scoped by authoritative Dialogue Runtime turn identity",
);
check(
  pipeline.includes("getRouterRuntime().resolveRoute(dialogueTurn.id"),
  "command pipeline resolves routing through Router Runtime",
);

const pipelineRouterImports = parseRouterImports(pipeline).filter((x) => looksLikeClassifier(x.local));
check(
  pipelineRouterImports.length >= 1,
  "legacy router classifier implementation remains explicitly imported by the coordinator",
);

let pipelineClassifierCalls = 0;
for (const item of pipelineRouterImports) pipelineClassifierCalls += countCalls(pipeline, item.local);
check(
  pipelineClassifierCalls === 1,
  `command coordinator contains exactly one classifier call (${pipelineClassifierCalls})`,
);

const productionClassifierSites = [];
for (const root of ["app", "apps", "components", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (rel === routerRel || rel === pipelineRel) continue;
    const text = read(rel);
    const imports = parseRouterImports(text).filter((x) => looksLikeClassifier(x.local));
    for (const item of imports) {
      const calls = countCalls(text, item.local);
      if (calls > 0) productionClassifierSites.push({ rel, name: item.local, calls });
    }
  }
}
check(
  productionClassifierSites.length === 0,
  `no second production classifier call site exists${productionClassifierSites.length ? `: ${productionClassifierSites.map(x => `${x.rel}:${x.name}x${x.calls}`).join(", ")}` : ""}`,
);

const authorityDefinitions = [];
for (const root of ["app", "apps", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (rel === runtimeRel) continue;
    const text = read(rel);
    if (/class\s+RouterRuntime\b|function\s+getRouterRuntime\b/.test(text)) {
      authorityDefinitions.push(rel);
    }
  }
}
check(
  authorityDefinitions.length === 0,
  `no second RouterRuntime/getRouterRuntime authority exists${authorityDefinitions.length ? `: ${authorityDefinitions.join(", ")}` : ""}`,
);

check(
  !runtime.includes("@chernobog/tools") &&
  !runtime.includes("@chernobog/trust") &&
  !runtime.includes("executeTool") &&
  !runtime.includes("invokeTool"),
  "Router Runtime does not absorb trust/tool execution",
);
check(
  !runtime.includes("ollama") && !runtime.includes("modelProvider"),
  "Router Runtime does not absorb model-provider implementation",
);

check(
  routingContinuityVerifier.includes("inheritedFollowUpRoute") &&
  routingContinuityVerifier.includes("getRouterRuntime"),
  "historical routing continuity verifier preserves inherited-route precedence while recognizing Router Runtime fallback",
);
check(
  routingContinuityVerifier.includes("routeMessage\\(userMessage\\)"),
  "historical routing continuity verifier still requires the same routeMessage classifier fallback",
);

if (failures) {
  console.error(`\nOH-2C verifier: FAIL (${failures})`);
  process.exit(1);
}
console.log("\nOH-2C verifier: PASS");
