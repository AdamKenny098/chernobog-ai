#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = process.cwd();
const requireFromRepo = createRequire(path.join(repo, "package.json"));
const ts = requireFromRepo("typescript");
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
function walk(rootRel) {
  const root = path.join(repo, rootRel);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(entry.name)) {
        out.push(path.relative(repo, full).split(path.sep).join("/"));
      }
    }
  }

  return out;
}
function parse(rel, text) {
  const kind =
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX :
    rel.endsWith(".jsx") ? ts.ScriptKind.JSX :
    rel.endsWith(".js") || rel.endsWith(".mjs") || rel.endsWith(".cjs")
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
}

console.log("Chernobog OH-2F — Action Selection & Interruption Verifier");
console.log("============================================================");

const runtimeRel = "packages/runtime/src/actionRuntime.ts";
const runtime = read(runtimeRel);
const runtimeIndex = read("packages/runtime/src/index.ts");
const initiativeRel = "lib/chernobog/cognition/initiativeDecision.ts";
const initiative = read(initiativeRel);
const dialogue = read("packages/runtime/src/dialogueRuntime.ts");
const state = read("packages/runtime/src/stateRuntime.ts");
const manifest = json("docs/overhaul/OH-2F-action-selection-authority.json");
const doc = read("docs/overhaul/OH-2F-action-selection-authority.md");

check(Boolean(runtime), "authoritative Action Runtime exists");
check(runtimeIndex.includes('export * from "./actionRuntime";'), "@chernobog/runtime exports Action Runtime");
check(runtime.includes("export class ActionRuntime"), "Action Runtime has one explicit class authority");
check(runtime.includes("public select<T>"), "Action Runtime owns synchronous action-selection entry");
check(runtime.includes("public async selectAsync<T>"), "Action Runtime owns asynchronous action-selection entry");
check(runtime.includes("public interrupt("), "Action Runtime owns interruption decision");
check(runtime.includes("public cancel("), "Action Runtime owns cancel decision");
check(runtime.includes("public resume("), "Action Runtime owns resume decision");
check(runtime.includes("public wait("), "Action Runtime owns wait decision");
check(runtime.includes("public defer("), "Action Runtime owns defer decision");
check(runtime.includes("public requestApproval("), "Action Runtime owns approval-request decision");
check(runtime.includes("maxRetainedDecisions = 256"), "Action Runtime bounds retained decision projection");
check(runtime.includes("export function getActionRuntime"), "Action Runtime exposes one process singleton getter");

for (const outcome of [
  '"respond"',
  '"continue"',
  '"plan"',
  '"act"',
  '"wait"',
  '"defer"',
  '"interrupt"',
  '"cancel"',
  '"resume"',
  '"request-approval"',
]) {
  check(runtime.includes(outcome), `canonical action outcome retained: ${outcome}`);
}

check(Boolean(manifest), "machine-readable OH-2F authority manifest exists");

if (manifest) {
  check(manifest.stage === "OH-2F", "authority manifest is locked to OH-2F");
  check(
    manifest.authority === "@chernobog/runtime ActionRuntime",
    "manifest names one Action Runtime authority",
  );
  check(manifest.autonomyExpanded === false, "manifest explicitly records no autonomy expansion");

  const governed = Array.isArray(manifest.governedExports)
    ? manifest.governedExports
    : [];

  check(governed.length >= 1, "manifest records at least one governed initiative entry point");

  for (const entry of governed) {
    const method = entry.async ? "selectAsync" : "select";
    check(
      initiative.includes(
        `getActionRuntime().${method}("initiativeDecision.${entry.name}"`,
      ),
      `initiative entry point is governed: ${entry.name}`,
    );
    check(
      entry.governancePoint === "exported function body",
      `initiative authority is enforced at export body regardless of import path: ${entry.name}`,
    );
    check(
      Number.isFinite(Number(entry.directExternalCalls)),
      `direct-import usage is retained as diagnostic evidence: ${entry.name}`,
    );
  }
}

check(
  initiative.includes('import { getActionRuntime } from "@chernobog/runtime";'),
  "initiative engine enters Action Runtime",
);

if (manifest?.governedExports?.some((entry) => entry.name === "decideCognitiveInitiative")) {
  check(
    initiative.includes("initiativeDecision.decideCognitiveInitiative"),
    "live decideCognitiveInitiative export is governed at its function body",
  );
}

check(
  /markInterrupted[\s\S]*?getActionRuntime\(\)\.interrupt\([\s\S]*?"dialogue-runtime"\)/.test(
    dialogue,
  ),
  "Dialogue Runtime interruption hands off to Action Runtime",
);
check(
  /markResumed[\s\S]*?getActionRuntime\(\)\.resume\([\s\S]*?"dialogue-runtime"\)/.test(
    dialogue,
  ),
  "Dialogue Runtime resume hands off to Action Runtime",
);
check(
  state.includes('import { getActionRuntime } from "./actionRuntime";') &&
  state.includes("actionSelection: getActionRuntime().snapshot()"),
  "State Runtime projects Action Runtime read-only",
);
check(
  state.includes('| "actionSelection"') &&
  state.includes('authority: "@chernobog/runtime ActionRuntime"'),
  "State Runtime authority map records Action Runtime",
);

const competingAuthorities = [];
for (const root of ["app", "apps", "components", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (rel === runtimeRel) continue;
    const text = read(rel);
    if (/class\s+ActionRuntime\b|function\s+getActionRuntime\b/.test(text)) {
      competingAuthorities.push(rel);
    }
  }
}
check(
  competingAuthorities.length === 0,
  `no second ActionRuntime/getActionRuntime authority exists${
    competingAuthorities.length ? `: ${competingAuthorities.join(", ")}` : ""
  }`,
);

check(
  !runtime.includes("@chernobog/tools") &&
  !runtime.includes("@chernobog/trust") &&
  !runtime.includes("toolGateway") &&
  !runtime.includes("executeTool") &&
  !runtime.includes("invokeTool"),
  "Action Runtime cannot bypass Trust or Tool Gateway",
);
check(
  !runtime.includes("ollama") && !runtime.includes("modelProvider"),
  "Action Runtime does not absorb model-provider implementation",
);

check(
  doc.includes("This slice adds no new autonomous capability"),
  "human-readable authority lock records no autonomy expansion",
);
check(
  doc.includes("DND and waiting-user behavior is not expanded or bypassed"),
  "authority lock explicitly preserves DND/waiting-user boundary",
);
check(
  doc.includes("Sensory barge-in / voice shutdown behavior remains"),
  "authority lock preserves sensory interruption ownership",
);

if (failures) {
  console.error(`\nOH-2F verifier: FAIL (${failures})`);
  process.exit(1);
}

console.log("\nOH-2F verifier: PASS");
