import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
let failed = false;
function pass(message) { console.log(`PASS ${message}`); }
function fail(message) { console.log(`FAIL ${message}`); failed = true; }
function assert(condition, message) { condition ? pass(message) : fail(message); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(repo, rel)); }
function git(args) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true });
  if (r.error || r.status !== 0) throw new Error(r.error?.message ?? r.stderr ?? `git ${args.join(' ')} failed`);
  return String(r.stdout ?? '');
}

console.log('============================================================');
console.log('CHERNOBOG OH-1O COMPATIBILITY CLEANUP VERIFIER V2');
console.log('============================================================');

const required = [
  'docs/overhaul/OH-1-COMPATIBILITY-REGISTER.md',
  'docs/overhaul/OH-1-COMPLETION-REPORT.md',
  'scripts/verify-oh1-final.mjs',
  'packages/runtime/COMPOSITION.md',
  'packages/core/src/compatibility.ts',
  'packages/external-projects/COMPATIBILITY.md',
  'components/chernobog-ui/sensory/SensoryControlDeck.tsx',
  'mobile/android-companion',
];
for (const rel of required) assert(exists(rel), `required compatibility/closure surface exists: ${rel}`);

const register = read('docs/overhaul/OH-1-COMPATIBILITY-REGISTER.md');
for (const phrase of [
  'lib/chernobog/**',
  'packages/core/src/compatibility.ts',
  'packages/external-projects',
  'components/chernobog-ui/**',
  'mobile/android-companion/**',
  'OH-10',
  '0 safe compatibility code deletions',
]) {
  assert(register.toLowerCase().includes(phrase.toLowerCase()), `compatibility register covers: ${phrase}`);
}
assert(/RETAIN/i.test(register), 'compatibility register explicitly classifies retained bridges');
assert(/source-sensitive|source-verification|exact-path/i.test(register), 'compatibility register records source-verification retention rationale');
assert(/active|consum/i.test(register), 'compatibility register records active-consumer retention rationale');

const diff = git(['diff', '--name-status']);
const deleted = diff.split(/\r?\n/).filter(Boolean).filter((line) => line.startsWith('D\t'));
assert(deleted.length === 0, 'OH-1O performs no unproven source deletion');

const changed = diff.split(/\r?\n/).filter(Boolean).map((line) => line.split('\t').at(-1)?.replaceAll('\\', '/') ?? '');
const allowedPrefixes = [
  'docs/overhaul/OH-1-COMPATIBILITY-REGISTER.md',
  'docs/overhaul/OH-1-COMPLETION-REPORT.md',
  'scripts/verify-oh1o-compatibility-cleanup.mjs',
  'scripts/verify-oh1-final.mjs',
  'packages/observability/observability-manifest.json',
  'scripts/verify-oh1m-observability.mjs',
];
for (const rel of changed) {
  assert(allowedPrefixes.includes(rel), `OH-1O working-tree change is bounded: ${rel}`);
}

const report = read('docs/overhaul/OH-1-COMPLETION-REPORT.md');
assert(report.includes('Compatibility layers remaining'), 'completion report includes remaining compatibility layers');
assert(report.includes('Deferred work for OH-2+'), 'completion report records deferred overhaul work');
assert(report.includes('Final repository architecture'), 'completion report records final repository architecture');

if (failed) process.exit(1);
console.log('OH-1O compatibility cleanup verifier V2: PASS');
