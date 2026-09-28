import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const expected={"slice":"OH-1K2","acceptedCheckpoint":"81bcbe16ae8ae241cb5f0a0f32fec6dd002378a9","refreshedBy":"OH-1L","disposition":"post-persistence-ownership-closure","privateCoreImportCount":0,"projectCodeFileCount":524,"publicChernobogImportCount":47,"publicPackageCounts":{"@chernobog/core":13,"@chernobog/events":3,"@chernobog/models":1,"@chernobog/tools":15,"@chernobog/trust":15},"publicCoreImports":[{"consumer":"lib/modules/adapters/obsidianVaultAdapter.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/adapters/obsidianVaultAdapter.ts","specifier":"@chernobog/core/session/types"},{"consumer":"lib/modules/character-generator/commands/parseCharacterGeneratorCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/discord-ingest/commands/parseDiscordCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/db"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/followups"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/store"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/update"},{"consumer":"lib/modules/project-operations/commands/parseProjectOperationsCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/registry.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/types.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/types.ts","specifier":"@chernobog/core/session/types"}],"earlierSlicesAlreadyRemovedReverseCoupling":["OH-1C Tool Gateway","OH-1E Models","OH-1H Core"],"persistenceOwnership":{"projectOperations":"domain-owned-client-established-in-OH-1L","physicalCompatibilityFile":"data/chernobog.db","itchDiscoveryOwnSqlite":"preserve-external-project-ownership"},"laterHandoffs":{"composition":"OH-1N","compatibilityCleanup":"OH-1O"}};
function assert(condition,message){if(!condition){console.error('FAIL '+message);process.exitCode=1;}else console.log('PASS '+message);}
function norm(p){return p.replaceAll('\\','/');}
function specs(text){const out=[];const patterns=[/\b(?:import|export)\s+[\s\S]*?\s+from\s*(["'])([^"']+)\1\s*;?/g,/\bimport\s*(["'])([^"']+)\1\s*;?/g,/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g,/\brequire\s*\(\s*(["'])([^"']+)\1\s*\)/g];for(const re of patterns)for(const m of text.matchAll(re))out.push(m[2]);return [...new Set(out)];}
function publicPackage(spec){if(!spec.startsWith('@chernobog/'))return null;return spec.split('/').slice(0,2).join('/');}
function isPrivate(file,spec){if(spec==='@/lib/chernobog'||spec.startsWith('@/lib/chernobog/'))return true;if(spec==='@/packages/core'||spec.startsWith('@/packages/core/'))return true;if(!spec.startsWith('.'))return false;const resolved=norm(path.resolve(path.dirname(file),spec));const legacy=norm(path.resolve(root,'lib/chernobog'));const coreSrc=norm(path.resolve(root,'packages/core/src'));return resolved===legacy||resolved.startsWith(legacy+'/')||resolved===coreSrc||resolved.startsWith(coreSrc+'/');}
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}

console.log('============================================================');
console.log('CHERNOBOG OH-1K2 REVERSE PROJECT BOUNDARY VERIFIER V5');
console.log('============================================================');
for(const rp of ['packages/external-projects/package.json','scripts/verify-oh1k1-external-projects.mjs','packages/external-projects/REVERSE-BOUNDARY.md','packages/external-projects/reverse-boundary-manifest.json','lib/modules/project-operations/persistence.ts'])assert(fs.existsSync(path.join(root,rp)),'required boundary file exists: '+rp);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'packages/external-projects/reverse-boundary-manifest.json'),'utf8'));
assert(JSON.stringify(manifest)===JSON.stringify(expected),'reverse-boundary manifest matches post-OH-1L live scan');
const files=walk(path.join(root,'lib/modules')).filter(p=>/\.(?:ts|tsx|js|jsx|mts|cts)$/i.test(p));
const privateCore=[];const packageCounts=new Map();let publicUses=0;
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const spec of specs(text)){if(isPrivate(file,spec))privateCore.push(norm(path.relative(root,file))+' -> '+spec);const pkg=publicPackage(spec);if(pkg){publicUses++;packageCounts.set(pkg,(packageCounts.get(pkg)??0)+1);}}}
assert(privateCore.length===0,'project modules contain zero imports of private Core implementation paths');
assert(publicUses>=1,'project modules consume Chernobog capabilities through public package aliases');
const actualCounts=Object.fromEntries([...packageCounts.entries()].sort(([a],[b])=>a.localeCompare(b)));
assert(JSON.stringify(actualCounts)===JSON.stringify(expected.publicPackageCounts),'public package dependency inventory matches post-OH-1L closure snapshot');
assert((actualCounts['@chernobog/tools']??0)>=1,'project tools use public @chernobog/tools boundary');
assert((actualCounts['@chernobog/models']??0)>=1,'project model generation uses public @chernobog/models boundary');
const projectRepo=fs.readFileSync(path.join(root,'lib/modules/project-operations/repository.ts'),'utf8');
assert(projectRepo.includes('project_operations_projects'),'Project Operations persistence remains present');
assert(projectRepo.includes('projectOperationsDb as db'),'Project Operations uses its OH-1L domain-owned persistence client');
assert(!projectRepo.includes('@chernobog/core/db')&&!projectRepo.includes('@/lib/chernobog/db'),'Project Operations no longer borrows Core persistence');
const persistence=fs.readFileSync(path.join(root,'lib/modules/project-operations/persistence.ts'),'utf8');
assert(persistence.includes('better-sqlite3')&&persistence.includes('CHERNOBOG_DATA_DIR')&&persistence.includes('chernobog.db'),'Project Operations domain-owned client preserves physical database compatibility');
const projectVerifier=fs.readFileSync(path.join(root,'scripts/verify-project-operations.ts'),'utf8');
assert(projectVerifier.includes('project data uses chernobog.db'),'accepted Project Operations verifier still records physical database compatibility');
const doc=fs.readFileSync(path.join(root,'packages/external-projects/REVERSE-BOUNDARY.md'),'utf8');
assert(doc.includes('OH-1L')&&doc.includes('domain-owned')&&doc.includes('physical compatibility'),'closure documentation records persistence ownership resolution and compatibility handoff');
if(process.exitCode)process.exit(process.exitCode);
console.log('OH-1K2 reverse project boundary verifier V5: PASS');
