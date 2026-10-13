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
console.log("CHERNOBOG OH-1F VAULT BOUNDARY VERIFIER V2");
console.log("============================================================");

for (const p of [
  "packages/vault/package.json",
  "packages/vault/README.md",
  "packages/vault/src/index.ts",
  "packages/vault/src/publicContracts.ts",
  "packages/vault/src/memory-architecture/index.ts",
  "packages/vault/src/vault-brain/index.ts",
  "packages/vault/src/obsidian-vault/index.ts",
]) exists(p) ? pass(`required file exists: ${p}`) : fail(`missing required file: ${p}`);

const ts = JSON.parse(read("tsconfig.json"));
const paths = ts.compilerOptions?.paths ?? {};
Array.isArray(paths["@chernobog/vault"]) &&
paths["@chernobog/vault"][0] === "./packages/vault/src/index.ts"
  ? pass("@chernobog/vault alias resolves to package index")
  : fail("@chernobog/vault alias missing/incorrect");

Array.isArray(paths["@chernobog/vault/*"]) &&
paths["@chernobog/vault/*"][0] === "./packages/vault/src/*"
  ? pass("@chernobog/vault/* alias resolves to package adapters")
  : fail("@chernobog/vault/* alias missing/incorrect");

if (exists("packages/vault/src/publicContracts.ts")) {
  const s = read("packages/vault/src/publicContracts.ts");
  for (const name of ["VaultReader", "VaultWriter", "MemoryContextProvider", "MemoryContextPacket"]) {
    s.includes(name) ? pass(`public Vault contract exposed: ${name}`) : fail(`missing public Vault contract: ${name}`);
  }
  s.includes("@chernobog/contracts/vault")
    ? pass("Vault public contracts come from contracts package")
    : fail("Vault public contracts do not come from contracts package");
}

for (const [p, target] of [
  ["packages/vault/src/memory-architecture/index.ts", "@/lib/chernobog/memory-architecture"],
  ["packages/vault/src/vault-brain/index.ts", "@/lib/modules/vault-brain"],
  ["packages/vault/src/obsidian-vault/index.ts", "@/lib/modules/obsidian-vault"],
]) {
  if (!exists(p)) continue;
  const s = read(p);
  s.includes(target) ? pass(`transitional adapter delegates to single accepted authority: ${target}`) : fail(`${p} does not delegate to ${target}`);
}

const gitExe = process.platform === "win32" ? "git.exe" : "git";
const mirrorCheck = spawnSync(
  gitExe,
  ["diff", "--name-only", "--",
    "lib/chernobog/memory-architecture",
    "lib/modules/vault-brain",
    "lib/modules/obsidian-vault"],
  { cwd: repo, encoding: "utf8", shell: false }
);
const mirrorDiff = (mirrorCheck.stdout ?? "").trim();
mirrorDiff === ""
  ? pass("legacy memory/Vault/Obsidian implementation mirrors remain unchanged")
  : fail("accepted legacy Vault implementation was modified: " + mirrorDiff);

const corePrivate = [];
const corePublic = [];
for (const f of walk("lib/chernobog")) {
  if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f)) continue;
  if (f.startsWith("lib/chernobog/memory-architecture/")) continue;
  if (/\.pre-|\.bak(?:\.|$)/.test(f)) continue;
  const s = read(f);
  if (/@\/lib\/modules\/(?:vault-brain|obsidian-vault)(?:\/|["'])/.test(s) ||
      /@\/lib\/chernobog\/memory-architecture(?:\/|["'])/.test(s) ||
      /(?:from\s*|import\s*\(\s*)["'][.]{1,2}\/.*(?:memory-architecture|modules\/vault-brain|modules\/obsidian-vault)/.test(s)) {
    corePrivate.push(f);
  }
  if (s.includes("@chernobog/vault")) corePublic.push(f);
}

corePrivate.length === 0
  ? pass("Core no longer imports private Vault Brain / memory-architecture / Obsidian implementation paths")
  : fail("private Vault implementation imports remain in Core: " + corePrivate.join(", "));

corePublic.length > 0
  ? pass(`Core consumes public Vault boundary (${corePublic.length} file(s))`)
  : fail("no Core consumer was migrated to @chernobog/vault");

const packageFiles = walk("packages/vault").filter(f => /\.(?:ts|tsx|mts|cts)$/.test(f));
const implementationCopies = packageFiles.filter(f => {
  if (f === "packages/vault/src/index.ts" || f === "packages/vault/src/publicContracts.ts") return false;
  const s = read(f);
  const nonComment = s
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.trim().startsWith("/*"))
    .join("\n");
  return /\b(?:readFile|writeFile|appendFile|mkdir|better-sqlite3|CHERNOBOG_VAULT_PATH|OBSIDIAN_VAULT_PATH|CHERNOBOG_STRUCTURED_MEMORY_ROOT)\b/.test(nonComment);
});

implementationCopies.length === 0
  ? pass("packages/vault introduces no duplicate persistence authority")
  : fail("duplicate persistence implementation detected in: " + implementationCopies.join(", "));

const forbiddenAuthority = packageFiles.filter(f => {
  const s = read(f);
  return /@chernobog\/(?:tools|trust)/.test(s) ||
         /@\/lib\/chernobog\/(?:execution|governance|trust|tools)/.test(s);
});
forbiddenAuthority.length === 0
  ? pass("Vault boundary does not gain tool/execution/governance authority")
  : fail("Vault package imports action authority: " + forbiddenAuthority.join(", "));

const deferred = [];
for (const base of ["app", "lib/modules"]) {
  for (const f of walk(base)) {
    if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f)) continue;
    if (f.startsWith("lib/modules/vault-brain/") || f.startsWith("lib/modules/obsidian-vault/")) continue;
    if (/\.pre-|\.bak(?:\.|$)/.test(f)) continue;
    const s = read(f);
    if (/@\/lib\/modules\/(?:vault-brain|obsidian-vault)(?:\/|["'])/.test(s) ||
        /@\/lib\/chernobog\/memory-architecture(?:\/|["'])/.test(s)) {
      deferred.push(f);
    }
  }
}
console.log(`NOTE deferred API/external-project Vault compatibility imports: ${deferred.length}`);

if (failures) {
  console.error(`OH-1F Vault verifier V2: FAIL (${failures})`);
  process.exit(1);
}
console.log("OH-1F Vault verifier V2: PASS");
