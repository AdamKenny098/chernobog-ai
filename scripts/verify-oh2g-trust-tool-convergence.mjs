#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = process.cwd();
const requireFromRepo = createRequire(path.join(repo, "package.json"));
const ts = requireFromRepo("typescript");
let failures = 0;

function pass(msg) { console.log(`PASS ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); failures++; }
function read(rel) {
  const full = path.join(repo, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "") : "";
}
function parse(rel, text) {
  return ts.createSourceFile(
    rel,
    text,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}
function walk(roots) {
  const out = [];
  for (const rootRel of roots) {
    const root = path.join(repo, rootRel);
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(entry.name)) {
          out.push(path.relative(repo, full).split(path.sep).join("/"));
        }
      }
    }
  }
  return [...new Set(out)];
}
function importModules(rel, text) {
  const source = parse(rel, text);
  const rows = [];
  for (const st of source.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const named = [];
    const bindings = st.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        named.push(el.propertyName?.text ?? el.name.text);
      }
    }
    rows.push({ module: st.moduleSpecifier.text, named });
  }
  return rows;
}
function functionContext(node) {
  let cur = node;
  while (cur) {
    if (
      ts.isFunctionDeclaration(cur) ||
      ts.isMethodDeclaration(cur) ||
      ts.isFunctionExpression(cur) ||
      ts.isArrowFunction(cur)
    ) {
      if (cur.name && ts.isIdentifier(cur.name)) return cur.name.text;
      const p = cur.parent;
      if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
      return "<anonymous>";
    }
    cur = cur.parent;
  }
  return "<module>";
}
function callSites(rel, text, names) {
  const source = parse(rel, text);
  const rows = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      names.has(node.expression.text)
    ) {
      const lc = source.getLineAndCharacterOfPosition(node.getStart(source));
      rows.push({
        rel,
        line: lc.line + 1,
        function: functionContext(node),
        name: node.expression.text,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return rows;
}
function check(condition, msg) {
  condition ? pass(msg) : fail(msg);
}

console.log("Chernobog OH-2G V6 — Trust -> Tool Execution Convergence");
console.log("==========================================================");

const helperRel = "lib/chernobog/execution/governedToolExecution.ts";
const helper = read(helperRel);
const pipeline = read("lib/chernobog/pipeline/toolExecution.ts");
const orchestrator = read("lib/chernobog/orchestration/orchestrator.ts");
const approvals = read("lib/chernobog/execution/approvalCommands.ts");
const runExecution = read("lib/chernobog/execution/runExecutionTask.ts");
const index = read("lib/chernobog/execution/index.ts");

check(Boolean(helper), "governed legacy tool adapter exists");
check(
  index.includes('export * from "./governedToolExecution";'),
  "execution subsystem exports governed tool adapter",
);
check(
  helper.includes("runExecutionTask("),
  "governed adapter enters authoritative runExecutionTask",
);
check(
  helper.includes("executePipelineTool(") &&
  helper.includes("executeOrchestrationTool("),
  "governed adapter preserves original pipeline/orchestration gateway origins",
);
check(
  helper.includes("deriveExecutionStateFromTask("),
  "governed adapter persists approval-capable ExecutionState",
);
check(
  helper.includes("createGovernedToolContinuationHandlers"),
  "governed adapter exposes approval continuation handlers",
);
check(
  approvals.includes("createGovernedToolContinuationHandlers") &&
  approvals.includes("createGovernedToolContinuationHandlers(approvedTask)"),
  "approval/resume path preserves governed legacy gateway continuation",
);

check(
  !pipeline.includes("executePipelineTool") &&
  pipeline.includes("executeGovernedToolAction"),
  "pipeline no longer invokes Unified Tool Gateway directly",
);
check(
  pipeline.includes(
    'export type ToolExecutionResult = Awaited<ReturnType<typeof executeGovernedToolAction>>["result"];',
  ) &&
  !/\bexecuteTool\b/.test(pipeline),
  "legacy ToolExecutionResult type now derives from governed adapter and has no stale executeTool symbol",
);
check(
  !orchestrator.includes("executeOrchestrationTool") &&
  orchestrator.includes("executeGovernedToolAction") &&
  orchestrator.includes("executeGovernedOrchestrationTool"),
  "orchestration no longer invokes Unified Tool Gateway directly",
);

check(
  /evaluateTaskRuntimeGovernance/.test(runExecution) &&
  /evaluateStepRuntimeGovernance/.test(runExecution) &&
  /waiting_for_approval/.test(runExecution),
  "runExecutionTask retains task/step governance and approval semantics",
);

const files = walk(["app", "apps", "components", "lib", "packages"]);
const production = files.filter(
  (rel) =>
    !rel.startsWith("scripts/") &&
    !rel.includes("/__tests__/") &&
    !rel.includes("/tests/"),
);

const lowLevelBypasses = [];
for (const rel of production) {
  const imports = importModules(rel, read(rel));
  for (const rec of imports) {
    const isLow =
      rec.module === "@chernobog/tools/executor" ||
      /(?:^|\/)tools\/executor$/.test(rec.module) ||
      /packages\/tools\/src\/executor/.test(rec.module);
    if (!isLow) continue;

    const isGatewayImpl =
      /(?:^|\/)toolGateway\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel);

    if (!isGatewayImpl) {
      lowLevelBypasses.push(`${rel} -> ${rec.module}`);
    }
  }
}
check(
  lowLevelBypasses.length === 0,
  lowLevelBypasses.length
    ? `no low-level executor bypasses (${lowLevelBypasses.join("; ")})`
    : "no production low-level executor bypass exists",
);

const forbiddenGatewayImports = [];
for (const rel of production) {
  if (
    rel === helperRel ||
    rel.endsWith("/toolExecutionHandlers.ts") ||
    /(?:^|\/)toolGateway\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)
  ) continue;

  for (const rec of importModules(rel, read(rel))) {
    const gatewayNames = new Set([
      "executePipelineTool",
      "executeOrchestrationTool",
      "executeDirectTool",
      "executeExecutionTaskTool",
      "invokeTool",
      "invokeToolDetailed",
    ]);

    const bad = rec.named.filter((name) => gatewayNames.has(name));
    if (bad.length) {
      forbiddenGatewayImports.push(
        `${rel} -> ${rec.module}: ${bad.join(", ")}`,
      );
    }
  }
}
check(
  forbiddenGatewayImports.length === 0,
  forbiddenGatewayImports.length
    ? `no unclassified gateway import remains (${forbiddenGatewayImports.join("; ")})`
    : "gateway imports are confined to governed adapter, execution-task handlers, and gateway implementation",
);

for (const [rel, label] of [
  ["packages/runtime/src/actionRuntime.ts", "ActionRuntime"],
  ["packages/runtime/src/plannerRuntime.ts", "PlannerRuntime"],
  ["packages/runtime/src/routerRuntime.ts", "RouterRuntime"],
]) {
  const text = read(rel);
  check(
    text &&
    !text.includes("@chernobog/tools") &&
    !text.includes("executeTool") &&
    !text.includes("toolGateway"),
    `${label} remains unable to execute tools directly`,
  );
}

if (failures) {
  console.error(`\nOH-2G V6 verifier: FAIL (${failures})`);
  process.exit(1);
}

console.log("\nOH-2G V6 verifier: PASS");
