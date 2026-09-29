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
function findExecutableCalls(text, expression) {
  const calls = [];
  let state = "code";
  let quote = "";

  const isIdent = (ch) => Boolean(ch && /[A-Za-z0-9_$]/.test(ch));

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }
    if (state === "string") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) {
        state = "code";
        quote = "";
      }
      continue;
    }
    if (state === "template") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "`") state = "code";
      continue;
    }

    if (ch === "/" && next === "/") {
      state = "line-comment";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      state = "block-comment";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      state = "string";
      quote = ch;
      continue;
    }
    if (ch === "`") {
      state = "template";
      continue;
    }

    if (!text.startsWith(expression, i)) continue;

    const before = i > 0 ? text[i - 1] : "";
    const afterName = text[i + expression.length] ?? "";
    if (isIdent(before) || isIdent(afterName)) continue;

    let open = i + expression.length;
    while (/\s/.test(text[open] ?? "")) open++;
    if (text[open] !== "(") continue;

    const close = findMatchingDelimiter(text, open, "(", ")");
    if (close < 0) break;

    calls.push({ start: i, open, close });
    i = close;
  }

  return calls;
}
function countExecutableCalls(text, name) {
  return findExecutableCalls(text, name).length;
}
function findMatchingDelimiter(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let state = "code";
  let quote = "";
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }
    if (state === "string") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) {
        state = "code";
        quote = "";
      }
      continue;
    }
    if (state === "template") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "`") state = "code";
      continue;
    }
    if (ch === "/" && next === "/") {
      state = "line-comment";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      state = "block-comment";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      state = "string";
      quote = ch;
      continue;
    }
    if (ch === "`") {
      state = "template";
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function callsAreGoverned(text, engineName, wrapperMethod, expectedCount = null) {
  const engines = findExecutableCalls(text, engineName);
  const wrappers = findExecutableCalls(
    text,
    `getPlannerRuntime().${wrapperMethod}`,
  );

  if (expectedCount !== null && engines.length !== expectedCount) return false;
  if (engines.length === 0 || wrappers.length !== engines.length) return false;

  return engines.every((engine) =>
    wrappers.some(
      (wrapper) => wrapper.start < engine.start && wrapper.close > engine.close,
    ),
  );
}

function parseImportLocal(text, sourceFragment, importedName) {
  const rx = /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/g;
  let m;
  while ((m = rx.exec(text))) {
    if (!m[2].includes(sourceFragment)) continue;
    for (const raw of m[1].split(",")) {
      const token = raw.trim().replace(/^type\s+/, "");
      const alias = token.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (!alias || alias[1] !== importedName) continue;
      return alias[2] ?? alias[1];
    }
  }
  return null;
}

console.log("Chernobog OH-2D — Planner / Orchestrator Verifier");
console.log("===================================================");

const runtimeRel = "packages/runtime/src/plannerRuntime.ts";
const runtime = read(runtimeRel);
const runtimeIndex = read("packages/runtime/src/index.ts");
const pipelineRel = "lib/chernobog/pipeline/runCommand.ts";
const pipeline = read(pipelineRel);

check(Boolean(runtime), "authoritative Planner Runtime exists");
check(runtimeIndex.includes('export * from "./plannerRuntime";'), "@chernobog/runtime exports Planner Runtime");
check(runtime.includes("export class PlannerRuntime"), "Planner Runtime has one explicit class authority");
check(runtime.includes("public runPlanning"), "Planner Runtime owns explicit planning entry");
check(
  /public\s+(?:async\s+)?runOrchestration<T>\s*\(/.test(runtime),
  "Planner Runtime owns orchestration entry",
);
check(
  /public runPlanning<T>\([\s\S]*?resolver:\s*\(\)\s*=>\s*T,[\s\S]*?\):\s*T\s*\{/.test(runtime),
  "Planner Runtime preserves synchronous runPlannerCommand return semantics",
);
check(
  /public async runOrchestration<T>\(/.test(runtime),
  "Planner Runtime preserves asynchronous orchestration capability",
);
check(runtime.includes("public markBlocked"), "Planner Runtime owns blocked-state projection");
check(runtime.includes("public markWaiting"), "Planner Runtime owns waiting-state projection");
check(runtime.includes("public resume"), "Planner Runtime owns resume-state projection");
check(runtime.includes("public snapshot()"), "Planner Runtime exposes inspectable plan lifecycle");
check(runtime.includes("actionIntents"), "Planner Runtime projects action intent evidence");
check(
  runtime.includes("if (plan.activePhase !== null)") &&
  runtime.includes("already progressing phase"),
  "same-turn planner/orchestrator phases cannot progress in parallel",
);
check(runtime.includes("maxRetainedPlans = 256"), "Planner Runtime bounds retained lifecycle history");
check(runtime.includes("const plannerRuntime = new PlannerRuntime()"), "Planner Runtime has one process singleton");
check(runtime.includes("export function getPlannerRuntime"), "Planner Runtime singleton uses one public getter");

check(
  /import\s*\{[^}\n]*\bgetDialogueRuntime\b[^}\n]*\}\s*from\s*["']@chernobog\/runtime["'];?/.test(pipeline),
  "accepted Dialogue Runtime import is preserved",
);
check(
  /import\s*\{[^}\n]*\bgetRouterRuntime\b[^}\n]*\}\s*from\s*["']@chernobog\/runtime["'];?/.test(pipeline),
  "accepted Router Runtime import is preserved",
);
check(
  pipeline.includes('import { getPlannerRuntime } from "@chernobog/runtime";'),
  "command pipeline imports Planner Runtime explicitly",
);
check(
  pipeline.includes("getPlannerRuntime().runPlanning(dialogueTurn.id"),
  "explicit planner path is governed by authoritative turn-scoped Planner Runtime",
);
check(
  pipeline.includes("getPlannerRuntime().runOrchestration(dialogueTurn.id"),
  "orchestration path is governed by the same turn-scoped Planner Runtime",
);

const plannerLocal = parseImportLocal(
  pipeline,
  "/planner/coordinator",
  "runPlannerCommand",
);
const orchestratorLocal = parseImportLocal(
  pipeline,
  "/orchestration/orchestrator",
  "orchestrateMessage",
);

check(Boolean(plannerLocal), "existing runPlannerCommand engine remains imported");
check(Boolean(orchestratorLocal), "existing orchestrateMessage engine remains imported");

if (plannerLocal) {
  const plannerCount = countExecutableCalls(pipeline, plannerLocal);
  check(
    plannerCount >= 1,
    `accepted pipeline retains executable runPlannerCommand entrance(s) (${plannerCount})`,
  );
  check(
    callsAreGoverned(pipeline, plannerLocal, "runPlanning"),
    "every executable runPlannerCommand entrance is contained inside the same Planner Runtime authority",
  );
}
if (orchestratorLocal) {
  const orchestrationCount = countExecutableCalls(pipeline, orchestratorLocal);
  check(
    orchestrationCount >= 1,
    `accepted pipeline retains orchestration entrance(s) (${orchestrationCount})`,
  );
  check(
    callsAreGoverned(pipeline, orchestratorLocal, "runOrchestration"),
    "every orchestrateMessage entrance is contained inside the same Planner Runtime authority",
  );
}

const otherPlannerProgressionSites = [];
for (const root of ["app", "apps", "components", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (
      rel === pipelineRel ||
      rel === "lib/chernobog/planner/coordinator.ts" ||
      rel === "lib/chernobog/orchestration/orchestrator.ts" ||
      rel === runtimeRel
    ) continue;

    const text = read(rel);

    if (plannerLocal) {
      const importedPlanner = parseImportLocal(
        text,
        "/planner/coordinator",
        "runPlannerCommand",
      );
      if (importedPlanner && countExecutableCalls(text, importedPlanner) > 0) {
        otherPlannerProgressionSites.push(
          `${rel}:${importedPlanner}x${countExecutableCalls(text, importedPlanner)}`,
        );
      }
    }

    if (orchestratorLocal) {
      const importedOrchestrator = parseImportLocal(
        text,
        "/orchestration/orchestrator",
        "orchestrateMessage",
      );
      if (importedOrchestrator && countExecutableCalls(text, importedOrchestrator) > 0) {
        otherPlannerProgressionSites.push(
          `${rel}:${importedOrchestrator}x${countExecutableCalls(text, importedOrchestrator)}`,
        );
      }
    }
  }
}

check(
  otherPlannerProgressionSites.length === 0,
  `no parallel production planner/orchestrator progression site exists${
    otherPlannerProgressionSites.length
      ? `: ${otherPlannerProgressionSites.join(", ")}`
      : ""
  }`,
);

const competingAuthorities = [];
for (const root of ["app", "apps", "lib", "packages"]) {
  for (const rel of walk(root)) {
    if (rel === runtimeRel) continue;
    const text = read(rel);
    if (/class\s+PlannerRuntime\b|function\s+getPlannerRuntime\b/.test(text)) {
      competingAuthorities.push(rel);
    }
  }
}

check(
  competingAuthorities.length === 0,
  `no second PlannerRuntime/getPlannerRuntime authority exists${
    competingAuthorities.length ? `: ${competingAuthorities.join(", ")}` : ""
  }`,
);

check(
  !runtime.includes("@chernobog/tools") &&
  !runtime.includes("@chernobog/trust") &&
  !runtime.includes("executeTool") &&
  !runtime.includes("invokeTool") &&
  !runtime.includes("toolGateway"),
  "Planner Runtime cannot bypass Trust or Tool Gateway",
);
check(
  !runtime.includes("ollama") && !runtime.includes("modelProvider"),
  "Planner Runtime does not absorb model-provider implementation",
);

if (failures) {
  console.error(`\nOH-2D verifier: FAIL (${failures})`);
  process.exit(1);
}

console.log("\nOH-2D verifier: PASS");
