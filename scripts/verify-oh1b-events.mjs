#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const pkg=path.join(root,'packages','events','src');
const legacy=path.join(root,'lib','chernobog','events');
const failures=[]; const passes=[];
const pass=m=>passes.push(m); const fail=m=>failures.push(m);
const implementationFiles=['corruption.ts','diagnostics.ts','eventBus.ts','eventContext.ts','index.ts','publishers.ts','replay.ts','retention.ts','schema.ts','store.ts','types.ts'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

for(const name of implementationFiles){
  const lp=path.join(legacy,name), pp=path.join(pkg,name);
  if(!fs.existsSync(lp)){fail(`legacy compatibility mirror missing: lib/chernobog/events/${name}`);continue}
  if(!fs.existsSync(pp)){fail(`authoritative Event Spine file missing: packages/events/src/${name}`);continue}
  if(name==='index.ts'){
    const legacyText=fs.readFileSync(lp,'utf8');
    const packageText=fs.readFileSync(pp,'utf8');
    if(packageText.startsWith(legacyText)&&packageText.includes('./publicContracts'))pass('authoritative package preserves baseline index and adds public contracts');
    else fail('package index diverged beyond the allowed public-contract export');
  }else if(hash(lp)===hash(pp))pass(`authoritative package preserves baseline implementation: ${name}`);
  else fail(`package implementation diverged during structural move: ${name}`);
}

const contractFile=path.join(pkg,'publicContracts.ts');
if(fs.existsSync(contractFile)){
  const t=fs.readFileSync(contractFile,'utf8');
  if(t.includes('@chernobog/contracts/events')&&t.includes('EventPublisher')&&t.includes('EventSubscriber'))pass('Event package exposes public cross-domain event contracts');
  else fail('Event package public contract export is incomplete');
}else fail('missing packages/events/src/publicContracts.ts');

try{
  const cfg=JSON.parse(fs.readFileSync(path.join(root,'tsconfig.json'),'utf8')); const paths=cfg?.compilerOptions?.paths??{};
  JSON.stringify(paths['@chernobog/events'])===JSON.stringify(['./packages/events/src/index.ts'])?pass('@chernobog/events alias resolves to package index'):fail('@chernobog/events alias missing/incorrect');
  JSON.stringify(paths['@chernobog/events/*'])===JSON.stringify(['./packages/events/src/*'])?pass('@chernobog/events/* alias resolves to package source'):fail('@chernobog/events/* alias missing/incorrect');
}catch(e){fail(`tsconfig parse failed: ${e.message}`)}

const skipDirs=new Set(['.git','node_modules','.next','dist','build','coverage']);
const sourceExt=/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const runtimeRoots=['app','components','lib','packages','services'];
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skipDirs.has(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f,out);else if(e.isFile()&&sourceExt.test(e.name))out.push(f)}return out}
function norm(p){return p.replace(/\\/g,'/').replace(/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i,'').replace(/\/index$/,'')}
function resolveRelative(file,spec){const base=path.resolve(path.dirname(file),spec);for(const c of [base,...['.ts','.tsx','.js','.jsx','.mjs','.cjs'].map(x=>base+x),...['.ts','.tsx','.js','.jsx','.mjs','.cjs'].map(x=>path.join(base,'index'+x))]){if(fs.existsSync(c)&&fs.statSync(c).isFile())return c}return base}
const importPatterns=[/\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,/\bexport\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/g,/\brequire\(\s*["']([^"']+)["']\s*\)/g,/\bimport\(\s*["']([^"']+)["']\s*\)/g];
let packageImports=0; const legacyLeaks=[];
const runtimeFiles=runtimeRoots.flatMap(r=>walk(path.join(root,r)));
for(const file of runtimeFiles){
  const abs=path.resolve(file);
  if(abs.startsWith(path.resolve(legacy)+path.sep)||abs.startsWith(path.resolve(pkg)+path.sep))continue;
  const text=fs.readFileSync(file,'utf8');
  for(const rx of importPatterns){rx.lastIndex=0;let m;while((m=rx.exec(text))){const spec=m[1];if(spec==='@chernobog/events'||spec.startsWith('@chernobog/events/'))packageImports++;
    if(spec==='@/lib/chernobog/events'||spec.startsWith('@/lib/chernobog/events/'))legacyLeaks.push(`${path.relative(root,file)} -> ${spec}`);
    if(spec.startsWith('.')){const resolved=resolveRelative(file,spec);const r=norm(resolved),l=norm(legacy);if(r===l||r.startsWith(l+'/'))legacyLeaks.push(`${path.relative(root,file)} -> ${spec}`)}}}
}
if(legacyLeaks.length===0)pass('no live runtime source outside compatibility mirror imports legacy Event Spine implementation');else for(const x of legacyLeaks)fail(`legacy Event Spine runtime import remains: ${x}`);
if(packageImports>0)pass(`live runtime consumers use @chernobog/events (${packageImports} import references)`);else fail('no live runtime consumer imports @chernobog/events');

for(const name of implementationFiles){
  const text=fs.readFileSync(path.join(pkg,name),'utf8');
  for(const rx of importPatterns){rx.lastIndex=0;let m;while((m=rx.exec(text))){const spec=m[1];if(spec.startsWith('../'))fail(`events package has outward relative dependency in ${name}: ${spec}`);if(/^@\/lib\/(?:chernobog|modules)(?:\/|$)/.test(spec))fail(`events package imports private implementation in ${name}: ${spec}`);if(/^(?:next|react)(?:\/|$)/.test(spec))fail(`events package imports UI framework in ${name}: ${spec}`)}}
}
if(!failures.some(f=>f.includes('events package')))pass('events package is isolated from Core/project/UI implementation imports');

const eventBus=fs.existsSync(path.join(pkg,'eventBus.ts'))?fs.readFileSync(path.join(pkg,'eventBus.ts'),'utf8'):'';
if(eventBus.includes('dedupeWindowMs')&&eventBus.includes('recentDedupe'))pass('authoritative package retains bounded duplicate suppression implementation');else fail('authoritative package lost duplicate suppression implementation');
const store=fs.existsSync(path.join(pkg,'store.ts'))?fs.readFileSync(path.join(pkg,'store.ts'),'utf8'):'';
if(store.includes('appendFile'))pass('authoritative package retains append-only Event Spine persistence implementation');else fail('authoritative package no longer exposes append-only persistence evidence');

console.log('============================================================');
console.log('CHERNOBOG OH-1B EVENTS VERIFIER V3');
console.log('============================================================');
for(const p of passes)console.log(`PASS ${p}`);
if(failures.length){for(const f of failures)console.log(`FAIL ${f}`);console.log(`OH-1B Event Spine verifier: FAIL (${failures.length})`);process.exit(1)}
console.log('OH-1B Event Spine verifier: PASS');
