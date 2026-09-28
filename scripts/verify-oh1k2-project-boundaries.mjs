import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const expected={"slice":"OH-1K2","acceptedCheckpoint":"12fd820e027ab53322b7d68223495aaf2717b586","disposition":"verification-only-closure","privateCoreImportCount":0,"projectCodeFileCount":523,"publicChernobogImportCount":48,"publicPackageCounts":{"@chernobog/core":14,"@chernobog/events":3,"@chernobog/models":1,"@chernobog/tools":15,"@chernobog/trust":15},"publicCoreImports":[{"consumer":"lib/modules/adapters/obsidianVaultAdapter.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/adapters/obsidianVaultAdapter.ts","specifier":"@chernobog/core/session/types"},{"consumer":"lib/modules/character-generator/commands/parseCharacterGeneratorCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/discord-ingest/commands/parseDiscordCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/db"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/followups"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/store"},{"consumer":"lib/modules/file-workflow/index.ts","specifier":"@chernobog/core/session/update"},{"consumer":"lib/modules/project-operations/commands/parseProjectOperationsCommand.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/project-operations/repository.ts","specifier":"@chernobog/core/db"},{"consumer":"lib/modules/registry.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/types.ts","specifier":"@chernobog/core/command-language"},{"consumer":"lib/modules/types.ts","specifier":"@chernobog/core/session/types"}],"earlierSlicesAlreadyRemovedReverseCoupling":["OH-1C Tool Gateway","OH-1E Models","OH-1H Core"],"persistenceOwnership":{"projectOperationsSharedChernobogDb":"deferred-to-OH-1L","itchDiscoveryOwnSqlite":"preserve-external-project-ownership"},"laterHandoffs":{"composition":"OH-1N","compatibilityCleanup":"OH-1O"}};
const projectRoot='lib/modules';
const legacyCoreRoot='lib/chernobog';
const corePackageRoot='packages/core';

function assert(condition,message){if(!condition){console.error('FAIL '+message);process.exitCode=1;}else console.log('PASS '+message);}
function norm(p){return p.replaceAll('\\','/');}
function specs(text){const out=[];const patterns=[/\b(?:import|export)\s+[\s\S]*?\s+from\s*(["'])([^"']+)\1\s*;?/g,/\bimport\s*(["'])([^"']+)\1\s*;?/g,/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g,/\brequire\s*\(\s*(["'])([^"']+)\1\s*\)/g];for(const re of patterns)for(const m of text.matchAll(re))out.push(m[2]);return [...new Set(out)];}
function publicPackage(spec){if(!spec.startsWith('@chernobog/'))return null;return spec.split('/').slice(0,2).join('/');}
function isPrivate(file,spec){if(spec==='@/lib/chernobog'||spec.startsWith('@/lib/chernobog/'))return true;if(spec==='@/packages/core'||spec.startsWith('@/packages/core/'))return true;if(!spec.startsWith('.'))return false;const resolved=norm(path.resolve(path.dirname(file),spec));const legacy=norm(path.resolve(root,legacyCoreRoot));const coreSrc=norm(path.resolve(root,corePackageRoot,'src'));return resolved===legacy||resolved.startsWith(legacy+'/')||resolved===coreSrc||resolved.startsWith(coreSrc+'/');}
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}

console.log('============================================================');
console.log('CHERNOBOG OH-1K2 REVERSE PROJECT BOUNDARY VERIFIER V2');
console.log('============================================================');
for(const rp of ['packages/external-projects/package.json','scripts/verify-oh1k1-external-projects.mjs','packages/external-projects/REVERSE-BOUNDARY.md','packages/external-projects/reverse-boundary-manifest.json'])assert(fs.existsSync(path.join(root,rp)),'required boundary file exists: '+rp);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'packages/external-projects/reverse-boundary-manifest.json'),'utf8'));
assert(JSON.stringify(manifest)===JSON.stringify(expected),'reverse-boundary manifest matches accepted live scan');
const files=walk(path.join(root,projectRoot)).filter(p=>/\.(?:ts|tsx|js|jsx|mts|cts)$/i.test(p));
const privateCore=[];const packageCounts=new Map();let publicUses=0;
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const spec of specs(text)){if(isPrivate(file,spec))privateCore.push(norm(path.relative(root,file))+' -> '+spec);const pkg=publicPackage(spec);if(pkg){publicUses++;packageCounts.set(pkg,(packageCounts.get(pkg)??0)+1);}}}
assert(privateCore.length===0,'project modules contain zero imports of private Core implementation paths');
assert(publicUses>=1,'project modules consume Chernobog capabilities through public package aliases');
const actualCounts=Object.fromEntries([...packageCounts.entries()].sort(([a],[b])=>a.localeCompare(b)));
assert(JSON.stringify(actualCounts)===JSON.stringify(expected.publicPackageCounts),'public package dependency inventory remains stable during K2 closure');
assert((actualCounts['@chernobog/tools']??0)>=1,'project tools use public @chernobog/tools boundary');
assert((actualCounts['@chernobog/models']??0)>=1,'project model generation uses public @chernobog/models boundary');
const projectRepo=fs.readFileSync(path.join(root,'lib/modules/project-operations/repository.ts'),'utf8');
assert(projectRepo.includes('project_operations_projects'),'Project Operations persistence remains present for OH-1L ownership work');
const projectVerifier=fs.readFileSync(path.join(root,'scripts/verify-project-operations.ts'),'utf8');
assert(projectVerifier.includes('project data uses chernobog.db'),'accepted Project Operations verifier still records shared Core DB persistence debt');
const doc=fs.readFileSync(path.join(root,'packages/external-projects/REVERSE-BOUNDARY.md'),'utf8');
assert(doc.includes('zero private Core imports')&&doc.includes('OH-1L')&&doc.includes('OH-1N')&&doc.includes('OH-1O'),'closure documentation records zero reverse coupling and remaining handoffs');
if(process.exitCode)process.exit(process.exitCode);
console.log('OH-1K2 reverse project boundary verifier V4: PASS');
