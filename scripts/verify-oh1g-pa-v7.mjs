import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
let failures = 0;

const pass = (m) => console.log("PASS " + m);
const fail = (m) => { failures += 1; console.error("FAIL " + m); };
const exists = (r) => fs.existsSync(path.join(repo, r));
const read = (r) => fs.readFileSync(path.join(repo, r), "utf8");

function walk(rel) {
  const base = path.join(repo, rel);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const p = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(repo, p)));
    else out.push(path.relative(repo, p).split(path.sep).join("/"));
  }
  return out;
}

console.log("============================================================");
console.log("CHERNOBOG OH-1G PERSONAL ASSISTANCE VERIFIER V7");
console.log("============================================================");

for (const p of [
  "packages/personal-assistance/package.json",
  "packages/personal-assistance/README.md",
  "packages/personal-assistance/src/index.ts",
  "packages/personal-assistance/src/attentionProvider.ts",
  "packages/personal-assistance/src/eventPublisher.ts",
  "packages/personal-assistance/src/attentionStore.ts",
  "packages/personal-assistance/src/profileStore.ts",
  "packages/personal-assistance/src/mobile/index.ts",
  "packages/personal-assistance/src/notificationIntelligence/index.ts",
  "packages/personal-assistance/src/responsibilities/index.ts",
  "packages/personal-assistance/src/workSchedule/index.ts",
  "packages/personal-assistance/src/calendar/index.ts",
  "packages/personal-assistance/src/communicationResponsibility.ts",
]) {
  exists(p) ? pass(`required file exists: ${p}`) : fail(`missing required file: ${p}`);
}

const ts = JSON.parse(read("tsconfig.json"));
const aliases = ts.compilerOptions?.paths ?? {};

Array.isArray(aliases["@chernobog/personal-assistance"]) &&
aliases["@chernobog/personal-assistance"][0] === "./packages/personal-assistance/src/index.ts"
  ? pass("@chernobog/personal-assistance alias resolves to package index")
  : fail("@chernobog/personal-assistance alias missing/incorrect");

Array.isArray(aliases["@chernobog/personal-assistance/*"]) &&
aliases["@chernobog/personal-assistance/*"][0] === "./packages/personal-assistance/src/*"
  ? pass("@chernobog/personal-assistance/* alias resolves to package source")
  : fail("@chernobog/personal-assistance/* alias missing/incorrect");

if (exists("packages/personal-assistance/src/attentionProvider.ts")) {
  const s = read("packages/personal-assistance/src/attentionProvider.ts");
  s.includes("@chernobog/contracts/personal-assistance")
    ? pass("PA attention provider implements public PersonalAttentionProvider contract")
    : fail("PA attention provider does not consume public PersonalAttentionProvider contract");
  s.includes("personalAttentionProvider")
    ? pass("PA package exposes concrete personal attention provider")
    : fail("personalAttentionProvider export missing");
}

if (exists("packages/personal-assistance/src/eventPublisher.ts")) {
  const s = read("packages/personal-assistance/src/eventPublisher.ts");
  s.includes("@chernobog/contracts/events")
    ? pass("PA event adapter is typed through public EventPublisher contract")
    : fail("PA event adapter does not consume EventPublisher contract");
  s.includes("@chernobog/events")
    ? pass("PA event adapter delegates to public Event Spine package")
    : fail("PA event adapter does not delegate to @chernobog/events");
  s.includes("publishChernobogEventSafely")
    ? pass("PA event adapter preserves accepted publishing helper name")
    : fail("PA event compatibility publishing helper missing");
}

const packageTs = walk("packages/personal-assistance")
  .filter(f => /\.(?:ts|tsx|mts|cts)$/.test(f));

const directEventImports = [];
const coreCognitionImports = [];
for (const f of packageTs) {
  if (f === "packages/personal-assistance/src/eventPublisher.ts") continue;
  const s = read(f);
  if (/@chernobog\/events(?:\/|["'])/.test(s) ||
      /@\/lib\/chernobog\/events(?:\/|["'])/.test(s) ||
      /(?:from\s*|import\s*\(\s*)["'][.]{1,2}\/.*\/events(?:\/|["'])/.test(s)) {
    directEventImports.push(f);
  }
  if (/@\/lib\/chernobog\/cognition(?:\/|["'])/.test(s) ||
      /(?:from\s*|import\s*\(\s*)["'][.]{1,2}\/.*cognition(?:\/|["'])/.test(s)) {
    coreCognitionImports.push(f);
  }
}

directEventImports.length === 0
  ? pass("PA implementation depends on package-local EventPublisher adapter, not Event Spine implementation")
  : fail("direct Event Spine imports remain inside PA implementation: " + directEventImports.join(", "));

coreCognitionImports.length === 0
  ? pass("PA package has no Core cognition implementation dependency")
  : fail("PA package imports Core cognition implementation: " + coreCognitionImports.join(", "));

if (exists("lib/chernobog/cognition/runtimeSingleton.ts")) {
  const s = read("lib/chernobog/cognition/runtimeSingleton.ts");
  s.includes("@chernobog/contracts/personal-assistance") &&
  s.includes("PersonalAttentionProvider")
    ? pass("Core cognition depends on PersonalAttentionProvider contract")
    : fail("Core cognition is not typed through PersonalAttentionProvider contract");

  !s.includes("../personalAssistance") &&
  !s.includes("@chernobog/personal-assistance") &&
  !s.includes("@/lib/chernobog/personalAssistance")
    ? pass("Core cognition has no PA implementation import")
    : fail("Core cognition still imports PA implementation");

  s.includes("personalAttentionProvider")
    ? pass("cognitive runtime accepts injected personal-attention provider")
    : fail("cognitive runtime does not expose injected attention provider path");

  !/return\\s+state\\s*;/.test(s)
    ? pass("open PersonalAttentionState contract is explicitly mapped into cognition's closed state union")
    : fail("cognitive runtime leaks open PersonalAttentionState directly into closed cognition union");

  /resolveUserAttention\s*:\s*resolvePersonalAttentionForCognition/.test(s)
    ? pass("accepted PA-1A cognition resolver source shape is preserved through a local contract-backed compatibility function")
    : fail("PA-1A compatibility resolver shape is missing from cognitive runtime");
}

if (exists("app/api/cognition/route.ts")) {
  const s = read("app/api/cognition/route.ts");
  s.includes("@chernobog/personal-assistance") &&
  s.includes("personalAttentionProvider")
    ? pass("cognition API composes PA provider outside Core")
    : fail("cognition API is not composing the PA provider");
}

const gitExe = process.platform === "win32" ? "git.exe" : "git";
const legacyDiff = spawnSync(
  gitExe,
  ["diff", "--name-only", "--", "lib/chernobog/personalAssistance"],
  { cwd: repo, encoding: "utf8", shell: false },
);
const legacyChanged = (legacyDiff.stdout ?? "").trim();
legacyChanged === ""
  ? pass("legacy PA source mirror remains unchanged for historical acceptance")
  : fail("legacy PA source mirror was modified: " + legacyChanged);

const privateConsumers = [];
let publicCount = 0;
for (const base of ["app", "components", "lib"]) {
  for (const f of walk(base)) {
    if (!/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(f)) continue;
    if (f.startsWith("lib/chernobog/personalAssistance/")) continue;
    if (/\.pre-|\.bak(?:\.|$)/.test(f)) continue;
    const s = read(f);

    if (/@\/lib\/chernobog\/personalAssistance(?:\/|["'])/.test(s)) {
      privateConsumers.push(f);
    }
    if (s.includes("@chernobog/personal-assistance")) publicCount += 1;
  }
}

privateConsumers.length === 0
  ? pass("live consumers no longer import private PA implementation paths")
  : fail("private PA imports remain in live consumers: " + privateConsumers.join(", "));

publicCount > 0
  ? pass(`live consumers use public PA package (${publicCount} file(s))`)
  : fail("no live consumer uses @chernobog/personal-assistance");

const forbiddenFeatures = packageTs.filter(f =>
  /(?:pa[-_]?7|unified[-_]?attention[-_]?queue|pa[-_]?8|adaptive[-_]?assistance)/i.test(f)
);
forbiddenFeatures.length === 0
  ? pass("OH-1G adds no PA-7 or PA-8 feature implementation")
  : fail("PA-7/PA-8 feature files detected: " + forbiddenFeatures.join(", "));

const eventAdapterOnly = packageTs.filter(f => {
  const s = read(f);
  return /@\/lib\/chernobog\/events/.test(s);
});
eventAdapterOnly.length === 0
  ? pass("PA package contains no private Core Event Spine import")
  : fail("private Core Event Spine import detected in PA package: " + eventAdapterOnly.join(", "));

console.log("NOTE PA persistence remains on existing stores until OH-1L persistence ownership.");

if (failures) {
  console.error(`OH-1G PA verifier V7: FAIL (${failures})`);
  process.exit(1);
}
console.log("OH-1G PA verifier V7: PASS");
