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
function json(rel) {
  try {
    return JSON.parse(read(rel));
  } catch {
    return null;
  }
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

console.log("Chernobog OH-2E — State Runtime Verifier");
console.log("==========================================");

const runtimeRel = "packages/runtime/src/stateRuntime.ts";
const runtime = read(runtimeRel);
const runtimeIndex = read("packages/runtime/src/index.ts");
const pipeline = read("lib/chernobog/pipeline/runCommand.ts");
const doc = read("docs/overhaul/OH-2E-state-authority-map.md");
const manifest = json("docs/overhaul/OH-2E-state-authority-map.json");

check(Boolean(runtime), "authoritative State Runtime exists");
check(runtimeIndex.includes('export * from "./stateRuntime";'), "@chernobog/runtime exports State Runtime");
check(runtime.includes("export class StateRuntime"), "State Runtime has one explicit class authority");
check(runtime.includes("STATE_RUNTIME_AUTHORITIES"), "State Runtime publishes explicit authority map");
check(runtime.includes("public bindSession"), "State Runtime binds authoritative live session projection");
check(runtime.includes("public bindDomainProjection"), "State Runtime has governed domain projection binding");
check(runtime.includes("public authorityMap()"), "State Runtime exposes documented authorities");
check(runtime.includes("public snapshot()"), "State Runtime exposes read-only aggregate projection");
check(runtime.includes("getDialogueRuntime().snapshot()"), "State Runtime reads Dialogue Runtime projection");
check(runtime.includes("getRouterRuntime().snapshot()"), "State Runtime reads Router Runtime projection");
check(runtime.includes("getPlannerRuntime().snapshot()"), "State Runtime reads Planner Runtime projection");
check(runtime.includes("binding.reader()"), "State Runtime reads domain values lazily instead of copying persistence");
check(runtime.includes("rejected competing authority"), "State Runtime rejects competing projection authority");
check(runtime.includes("mutableThroughStateRuntime: false"), "State authority map explicitly denies mutation ownership");
check(runtime.includes("maxRetainedSessions = 256"), "State Runtime bounds retained session bindings");

check(
  pipeline.includes('import { getStateRuntime } from "@chernobog/runtime";'),
  "command pipeline imports State Runtime explicitly",
);
check(
  pipeline.includes("getStateRuntime().bindSession(") &&
  pipeline.includes("() => getSessionContext(sessionId)"),
  "command turn binds session projection to existing session-store reader",
);

for (const accepted of [
  "getDialogueRuntime().runTurn(",
  "getRouterRuntime().resolveRoute(dialogueTurn.id",
  "getPlannerRuntime().runPlanning(dialogueTurn.id",
  "getPlannerRuntime().runOrchestration(dialogueTurn.id",
]) {
  check(pipeline.includes(accepted), `accepted runtime authority preserved: ${accepted}`);
}

const expectedFields = {
  session: "lib/chernobog/session/store.ts",
  dialogue: "@chernobog/runtime DialogueRuntime",
  routing: "@chernobog/runtime RouterRuntime",
  planning: "@chernobog/runtime PlannerRuntime",
  execution: "lib/chernobog/execution",
  activeTask: "lib/chernobog/execution",
  worldState: "World State domain",
  runtimeHealth: "packages/models/src/runtimeReadiness.ts",
  clientProjection: "@chernobog/runtime StateRuntime",
};

check(Boolean(manifest), "machine-readable State Runtime authority manifest exists");
if (manifest) {
  check(manifest.stage === "OH-2E", "authority manifest is locked to OH-2E");
  check(
    manifest.projectionOwner === "@chernobog/runtime StateRuntime",
    "manifest names one projection owner",
  );
  check(
    manifest.mutableThroughStateRuntime === false,
    "manifest preserves domain mutation/persistence ownership",
  );

  for (const [key, owner] of Object.entries(expectedFields)) {
    check(
      manifest.fields?.[key] === owner,
      `${key} has one documented authoritative source: ${owner}`,
    );
  }
}

check(doc.includes("# Chernobog OH-2E — State Authority Map"), "human-readable authority map exists");
check(doc.includes("does **not** replace domain persistence"), "authority map documents coordination-not-database rule");
check(doc.includes("UI/API surfaces may consume"), "authority map documents read-only UI/API role");

const competingAuthorities = [];
for (const root of ["app", "apps", "components", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (rel === runtimeRel) continue;
    const text = read(rel);
    if (/class\s+StateRuntime\b|function\s+getStateRuntime\b/.test(text)) {
      competingAuthorities.push(rel);
    }
  }
}
check(
  competingAuthorities.length === 0,
  `no second StateRuntime/getStateRuntime authority exists${
    competingAuthorities.length ? `: ${competingAuthorities.join(", ")}` : ""
  }`,
);

check(
  !runtime.includes("@chernobog/tools") &&
  !runtime.includes("@chernobog/trust") &&
  !runtime.includes("executeTool") &&
  !runtime.includes("invokeTool") &&
  !runtime.includes("saveSessionContext") &&
  !runtime.includes("database"),
  "State Runtime coordinates projections without absorbing tool/trust/session/database mutation",
);

if (failures) {
  console.error(`\nOH-2E verifier: FAIL (${failures})`);
  process.exit(1);
}

console.log("\nOH-2E verifier: PASS");
