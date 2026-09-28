import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const packageRoot = "packages/runtime";
const verifierPath = "scripts/verify-oh1n-composition-root.mjs";
const requiredFiles = ["packages/runtime/package.json", "packages/runtime/README.md", "packages/runtime/COMPOSITION.md", "packages/runtime/composition-manifest.json", "packages/runtime/src/index.ts", "packages/runtime/src/types.ts", "packages/runtime/src/composition.ts"];
const expectedManifest = {"schemaVersion":1,"scope":"oh-1n-composition-root","activeRuntimeCutover":false,"package":"@chernobog/runtime","slots":[{"slot":"contracts","package":"@chernobog/contracts","role":"public contracts"},{"slot":"events","package":"@chernobog/events","role":"Event Spine"},{"slot":"trust","package":"@chernobog/trust","role":"Trust Engine"},{"slot":"tools","package":"@chernobog/tools","role":"Tool Gateway"},{"slot":"models","package":"@chernobog/models","role":"Model Gateway"},{"slot":"vault","package":"@chernobog/vault","role":"Vault"},{"slot":"personalAssistance","package":"@chernobog/personal-assistance","role":"Personal Assistance providers"},{"slot":"core","package":"@chernobog/core","role":"Core runtime"},{"slot":"observability","package":"@chernobog/observability","role":"Observability vocabulary"},{"slot":"externalProjects","package":"@chernobog/external-projects","role":"External project adapters"}],"persistenceOwnership":{"core":"@chernobog/core","events":"@chernobog/events","vault":"@chernobog/vault","personalAssistance":"@chernobog/personal-assistance","externalProjects":"@chernobog/external-projects"},"handoff":{"compatibilityCleanup":"OH-1O","runtimeRedesign":"OH-2"}};
const expectedPublicPackages = new Set(["@chernobog/contracts", "@chernobog/events", "@chernobog/trust", "@chernobog/tools", "@chernobog/models", "@chernobog/vault", "@chernobog/personal-assistance", "@chernobog/core", "@chernobog/observability", "@chernobog/external-projects"]);

function norm(value) {
  return String(value).replaceAll('\\', '/');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL ' + message);
    process.exitCode = 1;
  } else {
    console.log('PASS ' + message);
  }
}

function trackedCodeFiles() {
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(norm)
    .filter((relativePath) =>
      /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i.test(relativePath)
    )
    .filter((relativePath) => fs.existsSync(path.join(root, relativePath)));
}

function importsFrom(source) {
  const imports = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports;
}

console.log('============================================================');
console.log('CHERNOBOG OH-1N COMPOSITION ROOT VERIFIER V1');
console.log('============================================================');

for (const relativePath of requiredFiles) {
  assert(
    fs.existsSync(path.join(root, relativePath)),
    'required composition boundary exists: ' + relativePath,
  );
}

const packageJson = JSON.parse(read(packageRoot + '/package.json'));
assert(
  packageJson.name === '@chernobog/runtime',
  'runtime package has stable public package name',
);

const tsconfig = read('tsconfig.json');
assert(
  tsconfig.includes('"@chernobog/runtime"') &&
    tsconfig.includes('"@chernobog/runtime/*"'),
  'TypeScript aliases expose composition-root package',
);

const actualManifest = JSON.parse(
  read(packageRoot + '/composition-manifest.json'),
);
assert(
  JSON.stringify(actualManifest) === JSON.stringify(expectedManifest),
  'composition manifest matches accepted OH-1N wiring model',
);
assert(
  actualManifest.activeRuntimeCutover === false,
  'OH-1N composition root does not cut over live runtime entrypoints',
);

const sourceFiles = [
  packageRoot + '/src/index.ts',
  packageRoot + '/src/types.ts',
  packageRoot + '/src/composition.ts',
];
const imports = [];
for (const relativePath of sourceFiles) {
  const source = read(relativePath);
  assert(
    !source.includes('@/lib/') &&
      !source.includes('lib/chernobog/') &&
      !source.includes('lib\\chernobog\\'),
    'composition source has no private implementation import: ' + relativePath,
  );
  imports.push(...importsFrom(source));
}

const publicImports = new Set(
  imports.filter((specifier) => specifier.startsWith('@chernobog/')),
);
for (const specifier of expectedPublicPackages) {
  assert(
    publicImports.has(specifier),
    'composition root references public boundary: ' + specifier,
  );
}
for (const specifier of publicImports) {
  assert(
    expectedPublicPackages.has(specifier),
    'composition root uses reviewed public package only: ' + specifier,
  );
}

const composition = read(packageRoot + '/src/composition.ts');
assert(
  composition.includes('composeChernobogRuntime') &&
    composition.includes('Promise.all') &&
    composition.includes('Object.freeze'),
  'composition root provides one explicit lazy public-package assembly function',
);
assert(
  composition.includes('persistenceOwners'),
  'composition root records domain-owned persistence adapters at package boundaries',
);
assert(
  !/better-sqlite3|chernobog\.db|CHERNOBOG_DATA_DIR|node:fs|node:path|next\/|react/i.test(composition),
  'composition root owns no persistence, UI framework, filesystem, or provider implementation',
);
assert(
  !/new\s+(?:Chernobog|Database|Ollama|Tool|Trust|Vault)/.test(composition),
  'composition root does not create duplicate authoritative runtime/state implementations',
);

const externalRuntimeConsumers = [];
for (const relativePath of trackedCodeFiles()) {
  if (relativePath.startsWith(packageRoot + '/')) continue;
  if (relativePath === verifierPath) continue;
  if (read(relativePath).includes('@chernobog/runtime')) {
    externalRuntimeConsumers.push(relativePath);
  }
}
assert(
  externalRuntimeConsumers.length === 0,
  'live consumers remain uncut-over during OH-1N boundary establishment',
);

const docs = read(packageRoot + '/COMPOSITION.md') + '\n' +
  read(packageRoot + '/README.md');
for (const phrase of [
  'Event Spine',
  'Trust Engine',
  'Tool Gateway',
  'Model Gateway',
  'Personal Assistance',
  'persistence',
  'OH-1O',
  'OH-2',
]) {
  assert(
    docs.toLowerCase().includes(phrase.toLowerCase()),
    'composition documentation covers: ' + phrase,
  );
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('OH-1N composition root verifier V1: PASS');
