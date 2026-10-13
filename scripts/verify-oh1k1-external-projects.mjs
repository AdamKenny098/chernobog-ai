import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = 'packages/external-projects';
const legacyCoreRoot = 'lib/chernobog';
const manifestExpected = {"owner":"packages/external-projects","purpose":"transitional adapters between Core orchestration and external/project implementations","adapters":[{"specifier":"content-ingest","legacyImplementation":"@/lib/modules/content-ingest","consumers":["lib/chernobog/pipeline/runCommand.ts"]},{"specifier":"content-review","legacyImplementation":"@/lib/modules/content-review","consumers":["lib/chernobog/pipeline/runCommand.ts"]},{"specifier":"project-operations","legacyImplementation":"@/lib/modules/project-operations","consumers":["lib/chernobog/project/activeProjectContext.ts"]},{"specifier":"registry","legacyImplementation":"@/lib/modules/registry","consumers":["lib/chernobog/command-language/moduleParsers.ts","lib/chernobog/pipeline/domainHandlers.ts","lib/chernobog/tools/registry.ts"]},{"specifier":"saved-content","legacyImplementation":"@/lib/modules/saved-content","consumers":["lib/chernobog/pipeline/runCommand.ts"]},{"specifier":"saved-content-reliability","legacyImplementation":"@/lib/modules/saved-content-reliability","consumers":["lib/chernobog/pipeline/runCommand.ts"]},{"specifier":"youtube-ingest","legacyImplementation":"@/lib/modules/youtube-ingest","consumers":["lib/chernobog/pipeline/runCommand.ts"]},{"specifier":"youtube-oauth","legacyImplementation":"@/lib/modules/youtube-oauth","consumers":["lib/chernobog/pipeline/runCommand.ts"]}]};

function assert(condition, message) {
  if (!condition) { console.error('FAIL ' + message); process.exitCode = 1; }
  else console.log('PASS ' + message);
}
function read(rp) { return fs.readFileSync(path.join(root,rp),'utf8'); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
function norm(p) { return p.replaceAll('\\','/'); }

console.log('============================================================');
console.log('CHERNOBOG OH-1K1 EXTERNAL PROJECT BOUNDARY VERIFIER V1');
console.log('============================================================');
for (const rp of [
  packageRoot + '/package.json',
  packageRoot + '/README.md',
  packageRoot + '/COMPATIBILITY.md',
  packageRoot + '/adapter-manifest.json',
  packageRoot + '/src/index.ts',
]) assert(fs.existsSync(path.join(root,rp)), 'required file exists: ' + rp);

const pkg = JSON.parse(read(packageRoot + '/package.json'));
assert(pkg.name === '@chernobog/external-projects', 'external project adapter package has stable public package name');

const tsconfig = read('tsconfig.json');
assert(tsconfig.includes('"@chernobog/external-projects"') && tsconfig.includes('"@chernobog/external-projects/*"'), 'TypeScript aliases expose external project adapter boundary');

const manifest = JSON.parse(read(packageRoot + '/adapter-manifest.json'));
assert(JSON.stringify(manifest) === JSON.stringify(manifestExpected), 'adapter manifest matches installer-observed Core project dependencies');

for (const item of manifest.adapters) {
  const rp = packageRoot + '/src/' + item.specifier + '.ts';
  assert(fs.existsSync(path.join(root,rp)), 'adapter exists: ' + item.specifier);
  const text = read(rp);
  assert(text.includes('@/' + 'lib/modules/' + item.specifier), 'adapter owns legacy implementation bridge: ' + item.specifier);
}

const coreFiles = walk(path.join(root,legacyCoreRoot)).filter(p => /\.(?:ts|tsx)$/i.test(p));
const violations = [];
let publicUses = 0;
for (const abs of coreFiles) {
  const text = fs.readFileSync(abs,'utf8');
  if (text.includes('@/lib/modules/')) violations.push(norm(path.relative(root,abs)));
  if (text.includes('@chernobog/external-projects/')) publicUses += 1;
}
assert(violations.length === 0, 'legacy Core runtime has no direct lib/modules implementation imports');
assert(publicUses >= 4, 'Core runtime consumes external projects through public adapter boundary');

const packageText = walk(path.join(root,packageRoot,'src')).filter(p => /\.ts$/i.test(p)).map(p => fs.readFileSync(p,'utf8')).join('\n');
assert(!packageText.includes('@/lib/chernobog/'), 'external project adapter package does not import private Core implementation');
assert(!packageText.includes('data/chernobog.db'), 'external project adapter package does not own persistence');

const compat = read(packageRoot + '/COMPATIBILITY.md');
assert(compat.includes('transitional') && compat.includes('OH-1N') && compat.includes('OH-1O'), 'compatibility boundary documents composition and cleanup handoff');

if (process.exitCode) process.exit(process.exitCode);
console.log('OH-1K1 external project boundary verifier V1: PASS');
