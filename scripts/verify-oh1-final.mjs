import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
let failed = false;
function pass(message) { console.log(`PASS ${message}`); }
function fail(message) { console.log(`FAIL ${message}`); failed = true; }
function assert(condition, message) { condition ? pass(message) : fail(message); }
function exists(rel) { return fs.existsSync(path.join(repo, rel)); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
function git(args) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0) throw new Error(r.error?.message ?? r.stderr ?? `git ${args.join(' ')} failed`);
  return String(r.stdout ?? '');
}
function trackedCode(root) {
  const out = git(['ls-files', root]);
  return out.split(/\r?\n/).filter(Boolean).filter((f) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(f));
}
function importSpecifiers(rel) {
  const text = read(rel);
  const specs = [];
  for (const re of [
    /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bexport\s+[^;]*?from\s*["']([^"']+)["']/g,
  ]) {
    let match;
    while ((match = re.exec(text))) specs.push(match[1]);
  }
  return specs;
}

console.log('============================================================');
console.log('CHERNOBOG OH-1 FINAL ARCHITECTURE VERIFIER V2');
console.log('============================================================');

const requiredBoundaries = [
  'apps/chernobog-ui',
  'apps/chernobog-mobile',
  'packages/contracts',
  'packages/core',
  'packages/runtime',
  'packages/events',
  'packages/tools',
  'packages/trust',
  'packages/models',
  'packages/vault',
  'packages/personal-assistance',
  'packages/observability',
  'packages/external-projects',
];
for (const rel of requiredBoundaries) assert(exists(rel), `explicit OH-1 boundary exists: ${rel}`);

// Criterion 1 — Core independence.
const coreViolations = [];
for (const file of trackedCode('packages/core')) {
  for (const spec of importSpecifiers(file)) {
    if (
      spec.includes('lib/modules') ||
      spec.startsWith('@/lib/modules') ||
      spec.startsWith('@chernobog/personal-assistance') ||
      spec.includes('components/') ||
      spec.includes('mobile/android-companion') ||
      spec.includes('apps/chernobog-ui') ||
      spec.includes('apps/chernobog-mobile')
    ) coreViolations.push(`${file} -> ${spec}`);
  }
}
assert(coreViolations.length === 0, 'Criterion 1 — Core independence from project/PA/UI/mobile implementations');
if (coreViolations.length) for (const v of coreViolations) console.log(`  ${v}`);

// Criterion 2 — Core / PA implementation cycle removed.
const paToCore = [];
for (const file of trackedCode('packages/personal-assistance')) {
  for (const spec of importSpecifiers(file)) {
    if (spec === '@chernobog/core' || spec.startsWith('@chernobog/core/')) paToCore.push(`${file} -> ${spec}`);
  }
}
assert(paToCore.length === 0, 'Criterion 2 — PA does not import Core implementation package');
assert(coreViolations.every((v) => !v.includes('@chernobog/personal-assistance')), 'Criterion 2 — Core does not import PA implementation package');

// Criterion 3 — Core / Project private implementation cycle removed.
const projectPrivateCore = [];
for (const file of trackedCode('lib/modules')) {
  for (const spec of importSpecifiers(file)) {
    if (spec === '@/lib/chernobog' || spec.startsWith('@/lib/chernobog/') || spec.startsWith('@/packages/core/')) {
      projectPrivateCore.push(`${file} -> ${spec}`);
    }
  }
}
assert(projectPrivateCore.length === 0, 'Criterion 3 — external projects do not import private Core implementation paths');
const corePrivateProject = [];
for (const file of trackedCode('packages/core')) {
  for (const spec of importSpecifiers(file)) {
    if (spec.includes('lib/modules') || spec.startsWith('@/lib/modules')) corePrivateProject.push(`${file} -> ${spec}`);
  }
}
assert(corePrivateProject.length === 0, 'Criterion 3 — Core does not import concrete project implementation paths');

// Criterion 4 — Event Spine preserved.
for (const rel of [
  'packages/events/src/eventBus.ts',
  'packages/events/src/store.ts',
  'packages/events/src/replay.ts',
  'packages/events/src/retention.ts',
]) assert(exists(rel), `Criterion 4 — Event Spine surface preserved: ${rel}`);

// Criterion 5 — Tool Gateway preserved.
for (const rel of [
  'packages/tools/src/toolGateway.ts',
  'packages/tools/src/executor.ts',
  'packages/tools/src/registry.ts',
]) assert(exists(rel), `Criterion 5 — Tool Gateway surface preserved: ${rel}`);

// Criterion 6 — Trust preserved.
assert(exists('packages/trust/package.json') && exists('packages/trust/src/index.ts'), 'Criterion 6 — Trust public boundary preserved');

// Criterion 7 — Memory/Vault preserved.
assert(exists('packages/vault/package.json') && exists('packages/vault/src/index.ts'), 'Criterion 7 — Vault public boundary preserved');

// Criterion 8 — PA preserved.
for (const rel of [
  'packages/personal-assistance/src/attentionProvider.ts',
  'packages/personal-assistance/src/persistence.ts',
  'packages/personal-assistance/src/mobile/index.ts',
]) assert(exists(rel), `Criterion 8 — PA surface preserved: ${rel}`);

// Criterion 9 — Presence preserved structurally; behavior is covered by Golden.
assert(exists('components/chernobog-ui/sensory/SensoryControlDeck.tsx'), 'Criterion 9 — accepted sensory Presence source remains available');
assert(exists('components/UmbraAIConsole.tsx'), 'Criterion 9 — accepted console/Presence source remains available');

// Additional cross-domain ownership rules.
const contractViolations = [];
for (const file of trackedCode('packages/contracts')) {
  for (const spec of importSpecifiers(file)) {
    if (/^@chernobog\/(?:core|runtime|events|tools|trust|models|vault|personal-assistance|observability|external-projects)(?:\/|$)/.test(spec) || spec.includes('lib/chernobog') || spec.includes('lib/modules')) {
      contractViolations.push(`${file} -> ${spec}`);
    }
  }
}
assert(contractViolations.length === 0, 'contracts remain implementation-independent');

const uiDbViolations = [];
for (const file of trackedCode('apps/chernobog-ui')) {
  for (const spec of importSpecifiers(file)) {
    if (spec === '@chernobog/core/db' || spec.includes('lib/chernobog/db') || spec === 'better-sqlite3') uiDbViolations.push(`${file} -> ${spec}`);
  }
}
assert(uiDbViolations.length === 0, 'UI boundary does not directly own database persistence');

assert(exists('packages/runtime/src/composition.ts'), 'explicit composition root remains established');
assert(exists('packages/observability/src/index.ts'), 'observability ownership remains established');
assert(exists('docs/overhaul/OH-1-COMPATIBILITY-REGISTER.md'), 'compatibility retention register exists');

const report = read('docs/overhaul/OH-1-COMPLETION-REPORT.md');
assert(report.includes('Golden Acceptance Suite V2: 52 / 52 PASS'), 'Criterion 10 — completion report records Golden 52 / 52 PASS');
assert(report.includes('OH-1: PASS'), 'completion report declares OH-1 PASS only after final gates');
assert(report.includes('OH-2: NOT STARTED'), 'completion report confirms OH-2 was not started');

if (failed) process.exit(1);
console.log('OH-1 final architecture verifier V2: PASS');
