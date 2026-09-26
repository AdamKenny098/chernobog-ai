import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
let failures = 0;
const pass = m => console.log("PASS " + m);
const fail = m => { failures++; console.error("FAIL " + m); };
const exists = r => fs.existsSync(path.join(repo, r));
const read = r => fs.readFileSync(path.join(repo, r), "utf8");

function walk(rel) {
  const base = path.join(repo, rel);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, e.name);
    if (e.isDirectory()) out.push(...walk(path.relative(repo, p)));
    else out.push(path.relative(repo, p).split(path.sep).join("/"));
  }
  return out;
}

console.log("============================================================");
console.log("CHERNOBOG OH-1E MODELS BOUNDARY VERIFIER V3");
console.log("============================================================");

for (const p of [
  "packages/models/package.json",
  "packages/models/README.md",
  "packages/models/src/index.ts",
  "packages/models/src/gateway.ts",
  "packages/models/src/providerAdapter.ts",
  "packages/models/src/reliableOllama.ts",
  "packages/models/src/modelRouter.ts",
  "packages/models/src/modelSelection.ts",
  "packages/models/src/modelFailureFallback.ts",
  "packages/models/src/runtimeReadiness.ts",
  "packages/models/src/runtimeStatus.ts",
]) exists(p) ? pass(`required file exists: ${p}`) : fail(`missing required file: ${p}`);

!exists("packages/models/src/ollamaClient.ts")
  ? pass("models package does not duplicate the concrete Ollama transport")
  : fail("packages/models must not contain a second ollamaClient.ts transport owner");

const ts = JSON.parse(read("tsconfig.json"));
const paths = ts.compilerOptions?.paths ?? {};
Array.isArray(paths["@chernobog/models"]) &&
paths["@chernobog/models"][0] === "./packages/models/src/index.ts"
  ? pass("@chernobog/models alias resolves to package index")
  : fail("@chernobog/models alias missing/incorrect");
Array.isArray(paths["@chernobog/models/*"]) &&
paths["@chernobog/models/*"][0] === "./packages/models/src/*"
  ? pass("@chernobog/models/* alias resolves to package source")
  : fail("@chernobog/models/* alias missing/incorrect");

if (exists("packages/models/src/providerAdapter.ts")) {
  const s = read("packages/models/src/providerAdapter.ts");
  s.includes("@/lib/chernobog/llm/ollamaClient")
    ? pass("single transitional provider adapter delegates to accepted Ollama transport")
    : fail("provider adapter does not delegate to accepted transport");
  !/\bfetch\s*\(/.test(s) &&
  !s.includes("getOllamaGenerateUrl") &&
  !s.includes("getOllamaChatUrl")
    ? pass("provider adapter contains no duplicate HTTP transport")
    : fail("provider adapter duplicates concrete Ollama transport behavior");
}

if (exists("packages/models/src/gateway.ts")) {
  const s = read("packages/models/src/gateway.ts");
  s.includes("@chernobog/contracts/models")
    ? pass("provider-neutral gateway consumes public model contracts")
    : fail("gateway does not consume @chernobog/contracts/models");
  s.includes("generateWithModel")
    ? pass("provider-neutral generateWithModel entry point exists")
    : fail("generateWithModel entry point missing");
  s.includes("modelGateway")
    ? pass("ModelGateway implementation is exposed")
    : fail("ModelGateway implementation missing");
}

if (exists("packages/models/src/reliableOllama.ts")) {
  const s = read("packages/models/src/reliableOllama.ts");
  s.includes("./providerAdapter")
    ? pass("reliable runtime delegates transport through provider adapter")
    : fail("reliable runtime does not use provider adapter");
  s.includes("model.route.selected")
    ? pass("model route-selection telemetry preserved")
    : fail("model.route.selected telemetry missing");
  s.includes("model.route.failed-over")
    ? pass("model failover telemetry preserved")
    : fail("model.route.failed-over telemetry missing");
}

const git = process.platform === "win32" ? "git.exe" : "git";
const d = spawnSync(git, ["diff", "--name-only", "--", "lib/chernobog/llm"], {
  cwd: repo, encoding: "utf8", shell: false,
});
const compat = (d.stdout ?? "").trim();
compat === ""
  ? pass("legacy model source mirror remains unchanged for historical acceptance")
  : fail(`legacy lib/chernobog/llm mirror was modified: ${compat}`);

const legacyImports = [];
const providerLeaks = [];
for (const base of ["app", "components", "lib", "packages"]) {
  for (const f of walk(base)) {
    if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f)) continue;
    if (f.startsWith("lib/chernobog/llm/")) continue;
    const s = read(f);

    if (f !== "packages/models/src/providerAdapter.ts" &&
        f !== "lib/chernobog/execution/internalExecutionHandlers.ts" &&
        /@\/lib\/chernobog\/llm(?:\/|["'])/.test(s)) {
      legacyImports.push(f);
    }

    if (f === "lib/chernobog/execution/internalExecutionHandlers.ts" &&
        !s.includes('from "../llm/ollamaClient"')) {
      legacyImports.push(f + " (accepted Phase 11 compatibility import missing)");
    }

    if (f.startsWith("lib/modules/") &&
        (/\bgenerateWithOllama\b/.test(s) ||
         /@chernobog\/models\/providerAdapter/.test(s))) {
      providerLeaks.push(f);
    }
  }
}

legacyImports.length === 0
  ? pass("live consumers use models package except the accepted internal execution compatibility edge")
  : fail("unexpected private Core model imports remain in: " + legacyImports.join(", "));

if (exists("lib/chernobog/execution/internalExecutionHandlers.ts")) {
  const s = read("lib/chernobog/execution/internalExecutionHandlers.ts");
  s.includes('from "../llm/ollamaClient"')
    ? pass("accepted Phase 11 internal execution -> Ollama transport compatibility edge is preserved")
    : fail("accepted internal execution compatibility import was changed");
}

providerLeaks.length === 0
  ? pass("business/project modules have no direct Ollama provider dependency")
  : fail("provider-specific model dependency remains in: " + providerLeaks.join(", "));

for (const p of [
  "lib/modules/character-generator/brief/characterBriefGenerator.ts",
]) {
  if (!exists(p)) continue;
  const s = read(p);
  s.includes('from "@chernobog/models"') && s.includes("generateWithModel")
    ? pass(`${p} uses provider-neutral generateWithModel`)
    : fail(`${p} is not using provider-neutral generateWithModel`);
}

const packageSources = walk("packages/models").filter(f => /\.(?:ts|tsx|mts|cts)$/.test(f));
const duplicateTransport = packageSources.filter(f => {
  const s = read(f);
  return /\bfetch\s*\(/.test(s) ||
         s.includes("getOllamaGenerateUrl") ||
         s.includes("getOllamaChatUrl");
});
duplicateTransport.length === 0
  ? pass("packages/models contains no duplicate HTTP generation transport")
  : fail("duplicate model transport detected in: " + duplicateTransport.join(", "));

const authorityLeaks = packageSources.filter(f => {
  const s = read(f);
  return /@chernobog\/(?:tools|trust)/.test(s) ||
         /@\/lib\/chernobog\/(?:tools|trust|governance|execution\/approval|execution\/riskPolicy)/.test(s);
});
authorityLeaks.length === 0
  ? pass("models package has no tool/trust/governance authority dependency")
  : fail("models package imports execution/trust authority: " + authorityLeaks.join(", "));

console.log("NOTE accepted Ollama transport remains behind one transitional provider adapter until later runtime/service extraction.");

if (failures) {
  console.error(`OH-1E models verifier V3: FAIL (${failures})`);
  process.exit(1);
}
console.log("OH-1E models verifier V3: PASS");
