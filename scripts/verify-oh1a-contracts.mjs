#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractsRoot = path.join(root, "packages", "contracts");
const required = [
  "package.json",
  "README.md",
  "src/index.ts",
  "src/commands.ts",
  "src/events.ts",
  "src/tools.ts",
  "src/trust.ts",
  "src/models.ts",
  "src/personal-assistance.ts",
  "src/vault.ts",
];

const failures = [];
const passes = [];
const pass = (message) => passes.push(message);
const fail = (message) => failures.push(message);

for (const rel of required) {
  const full = path.join(contractsRoot, rel);
  if (fs.existsSync(full)) pass(`required file exists: packages/contracts/${rel}`);
  else fail(`missing required file: packages/contracts/${rel}`);
}

const sourceExt = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (sourceExt.test(entry.name)) out.push(full);
  }
  return out;
}

const forbidden = [
  /(?:^|\/)(?:lib\/chernobog|lib\/modules|app|components|mobile)(?:\/|$)/,
  /^next(?:\/|$)/,
  /^react(?:\/|$)/,
  /^better-sqlite3$/,
  /ollama/i,
];

for (const file of walk(path.join(contractsRoot, "src"))) {
  const text = fs.readFileSync(file, "utf8");
  for (const rx of importPatterns) {
    let match;
    while ((match = rx.exec(text))) {
      const spec = match[1];
      if (forbidden.some((rule) => rule.test(spec))) {
        fail(`${path.relative(root, file)} imports forbidden implementation dependency: ${spec}`);
      }
    }
  }
}
if (!failures.some((item) => item.includes("forbidden implementation"))) {
  pass("contracts source imports no runtime/framework/provider implementation");
}

const tsconfigPath = path.join(root, "tsconfig.json");
if (!fs.existsSync(tsconfigPath)) {
  fail("tsconfig.json missing");
} else {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
    const paths = tsconfig?.compilerOptions?.paths ?? {};
    if (JSON.stringify(paths["@chernobog/contracts"]) === JSON.stringify(["./packages/contracts/src/index.ts"])) {
      pass("@chernobog/contracts alias resolves to the public contracts index");
    } else {
      fail("@chernobog/contracts alias is missing or incorrect");
    }
    if (JSON.stringify(paths["@chernobog/contracts/*"]) === JSON.stringify(["./packages/contracts/src/*"])) {
      pass("@chernobog/contracts/* alias resolves to contract modules");
    } else {
      fail("@chernobog/contracts/* alias is missing or incorrect");
    }
  } catch (error) {
    fail(`tsconfig.json is not parseable JSON: ${error.message}`);
  }
}

const contractText = walk(path.join(contractsRoot, "src"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const names = [
  "Command", "UnifiedCommand", "RouteName", "RouteResult",
  "EventEnvelope", "EventPublisher", "EventSubscriber",
  "ToolDefinition", "ToolRequest", "ToolResult", "ToolGateway",
  "TrustAction", "TrustDecision", "ApprovalRequirement",
  "ModelRequest", "ModelResult", "ModelCapability", "ModelGateway",
  "PersonalAttentionProvider",
  "VaultReader", "VaultWriter", "MemoryContextProvider", "MemoryContextPacket",
];
for (const name of names) {
  if (new RegExp(`\\b${name}\\b`).test(contractText)) pass(`public contract declared: ${name}`);
  else fail(`public contract missing: ${name}`);
}

console.log("============================================================");
console.log("CHERNOBOG OH-1A CONTRACTS VERIFIER");
console.log("============================================================");
for (const item of passes) console.log(`PASS ${item}`);
if (failures.length) {
  for (const item of failures) console.log(`FAIL ${item}`);
  console.log(`OH-1A contracts verifier: FAIL (${failures.length})`);
  process.exit(1);
}
console.log("OH-1A contracts verifier: PASS");
