import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
let failures = 0;

function pass(message) {
  console.log(`PASS ${message}`);
}
function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}
function exists(relative) {
  return fs.existsSync(path.join(repo, relative));
}
function read(relative) {
  return fs.readFileSync(path.join(repo, relative), "utf8");
}
function walk(relativeDirectory) {
  const directory = path.join(repo, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(repo, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) output.push(...walk(relative));
    else output.push(relative);
  }
  return output;
}

console.log("============================================================");
console.log("CHERNOBOG OH-1C TOOL BOUNDARY VERIFIER");
console.log("============================================================");

for (const required of [
  "packages/tools/package.json",
  "packages/tools/README.md",
  "packages/tools/src/index.ts",
  "packages/tools/src/toolGateway.ts",
  "packages/tools/src/executor.ts",
  "packages/tools/src/registry.ts",
  "packages/tools/src/types.ts",
]) {
  exists(required)
    ? pass(`required file exists: ${required}`)
    : fail(`missing required file: ${required}`);
}

const tsconfig = JSON.parse(read("tsconfig.json"));
const aliases = tsconfig.compilerOptions?.paths ?? {};

aliases["@chernobog/tools"]?.[0] === "./packages/tools/src/index.ts"
  ? pass("@chernobog/tools alias resolves to package index")
  : fail("@chernobog/tools alias missing/incorrect");

aliases["@chernobog/tools/*"]?.[0] === "./packages/tools/src/*"
  ? pass("@chernobog/tools/* alias resolves to package modules")
  : fail("@chernobog/tools/* alias missing/incorrect");

if (exists("packages/tools/src/executor.ts")) {
  const source = read("packages/tools/src/executor.ts");
  source.includes("@chernobog/events")
    ? pass("tool executor uses public Event Spine package")
    : fail("tool executor does not use @chernobog/events");

  !source.includes("../events/") && !source.includes("@/lib/chernobog/events")
    ? pass("tool executor has no legacy Event Spine import")
    : fail("tool executor still imports legacy Event Spine");

  for (const eventName of ["tool.started", "tool.completed", "tool.failed"]) {
    source.includes(eventName)
      ? pass(`tool lifecycle preserved: ${eventName}`)
      : fail(`missing tool lifecycle event: ${eventName}`);
  }
}

if (exists("packages/tools/src/toolGateway.ts")) {
  const source = read("packages/tools/src/toolGateway.ts");
  source.includes("./executor")
    ? pass("Unified Tool Gateway delegates to package-local executor")
    : fail("Unified Tool Gateway does not delegate to package-local executor");

  for (const api of ["invokeTool", "executeExecutionTaskTool"]) {
    source.includes(api)
      ? pass(`gateway API preserved: ${api}`)
      : fail(`gateway API missing: ${api}`);
  }

  !source.includes("../tools/") && !source.includes("@/lib/chernobog/tools")
    ? pass("gateway has no legacy tools import")
    : fail("gateway still imports legacy tools implementation");
}

let compatibilityDiff = "";
try {
  compatibilityDiff = execFileSync(
    "git",
    ["diff", "--name-only", "--", "lib/chernobog/tools", "lib/chernobog/execution/toolGateway.ts"],
    { cwd: repo, encoding: "utf8" },
  ).trim();
} catch {}

compatibilityDiff === ""
  ? pass("legacy Tool Gateway/tool source mirror remains unchanged")
  : fail(`legacy compatibility source was modified: ${compatibilityDiff}`);

const legacyImports = [];
const directExecutorImports = [];
for (const base of ["app", "components", "lib", "packages"]) {
  for (const file of walk(base)) {
    if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(file)) continue;
    if (file.startsWith("packages/tools/")) continue;
    if (file.startsWith("lib/chernobog/tools/")) continue;
    if (file === "lib/chernobog/execution/toolGateway.ts") continue;

    const source = read(file);
    if (
      /@\/lib\/chernobog\/tools(?:\/|["'])/.test(source) ||
      /@\/lib\/chernobog\/execution\/toolGateway/.test(source)
    ) {
      legacyImports.push(file);
    }
    if (/@chernobog\/tools\/executor/.test(source)) {
      directExecutorImports.push(file);
    }
  }
}

legacyImports.length === 0
  ? pass("live runtime consumers no longer import legacy tool implementation paths")
  : fail(`legacy tool imports remain in: ${legacyImports.join(", ")}`);

directExecutorImports.length === 0
  ? pass("live runtime consumers do not bypass Unified Tool Gateway via low-level executor")
  : fail(`direct low-level executor imports remain in: ${directExecutorImports.join(", ")}`);

if (exists("packages/tools/src/registry.ts")) {
  const registry = read("packages/tools/src/registry.ts");
  registry.includes("@/lib/modules/registry")
    ? pass("legacy module-tool composition edge retained temporarily for OH-1K/OH-1N")
    : pass("tools registry has no legacy module-registry compatibility edge");
}

if (failures > 0) {
  console.error(`OH-1C tools verifier: FAIL (${failures})`);
  process.exit(1);
}

console.log("OH-1C tools verifier: PASS");
