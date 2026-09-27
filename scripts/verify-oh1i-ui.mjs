import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
function assert(c,m){if(!c){console.error('FAIL '+m);process.exitCode=1;}else console.log('PASS '+m);}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function walk(d){if(!fs.existsSync(d))return[];return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
console.log('============================================================');
console.log('CHERNOBOG OH-1I UI BOUNDARY VERIFIER V6');
console.log('============================================================');
for(const p of ['apps/chernobog-ui/package.json','apps/chernobog-ui/README.md','apps/chernobog-ui/src/index.ts','apps/chernobog-ui/src/compatibility.ts','apps/chernobog-ui/src/registry/moduleRegistry.ts','apps/chernobog-ui/src/registry/routeRegistry.ts','apps/chernobog-ui/src/runtime/coreStateBridge.ts','apps/chernobog-ui/src/runtime/coreRoutingBridge.ts','apps/chernobog-ui/src/runtime/runtimeActivityObserver.ts']) assert(fs.existsSync(path.join(root,p)),'required file exists: '+p);
const ts=read('tsconfig.json');
assert(ts.includes('"@chernobog/ui"')&&ts.includes('./apps/chernobog-ui/src/index.ts'),'@chernobog/ui alias resolves to app boundary');
assert(ts.includes('"@chernobog/ui/*"')&&ts.includes('./apps/chernobog-ui/src/*'),'@chernobog/ui/* alias resolves to app modules');
const boundary=walk(path.join(root,'apps/chernobog-ui')).filter(p=>/\.(?:ts|tsx|js|jsx)$/.test(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
assert(!boundary.includes('better-sqlite3')&&!boundary.includes('data/chernobog.db'),'UI boundary owns no direct database persistence');
assert(!boundary.includes('@/lib/modules/')&&!boundary.includes('lib/modules/'),'UI boundary does not own external project implementations');
assert(!boundary.includes('personalAssistance/'),'UI boundary does not import PA implementation internals');
const uiSources=[...walk(path.join(root,'app')),...walk(path.join(root,'components'))].filter(p=>/\.(?:ts|tsx|js|jsx)$/.test(p));
let legacyRegistry=[]; for(const p of uiSources){const t=fs.readFileSync(p,'utf8'); if(t.includes('@/lib/chernobog-ui/moduleRegistry')||t.includes('@/lib/chernobog-ui/routeRegistry')) legacyRegistry.push(path.relative(root,p));}
assert(legacyRegistry.length===0,'presentation consumers no longer import private lib/chernobog-ui registries');
const cc=read('components/chernobog-ui/command-center/CommandCenterScene3D.tsx');
assert(!cc.includes('@/lib/chernobog/ui/coreStateBridge')&&!cc.includes('@/lib/chernobog/ui/coreRoutingBridge')&&!cc.includes('@/lib/chernobog/ui/runtimeActivityObserver'),'3D scene consumes public UI runtime projection boundary');
const compat=read('apps/chernobog-ui/src/compatibility.ts');
assert(compat.includes('authoritativePersistence: false')&&compat.includes('presenceProjectionOnly: true'),'UI boundary explicitly rejects authoritative persistence and preserves 3D as projection');
const protectedPaths=['components/chernobog-ui/sensory/SensoryControlDeck.tsx','components/UmbraAIConsole.tsx'];
for(const p of protectedPaths){const r=spawnSync('git',['diff','--quiet','HEAD','--',p],{cwd:root});assert(r.status===0,p+' remains byte-for-byte source-equivalent to accepted OH-1H Git state');}
assert(read('apps/chernobog-ui/README.md').includes('historical acceptance tests')&&read('apps/chernobog-ui/README.md').includes('compatibility'),'UI boundary documents compatibility-first physical relocation strategy');
if(process.exitCode)process.exit(process.exitCode);
console.log('OH-1I UI verifier V6: PASS');
