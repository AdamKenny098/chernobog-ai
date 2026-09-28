import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const manifest={"schemaVersion":2,"slice":"OH-1L","physicalDataMigration":"none","owners":{"core":{"scope":"Core runtime/session/state persistence","compatibilityFile":"data/chernobog.db"},"events":{"scope":"Event Spine persistence","implementation":"packages/events/src/store.ts"},"vault":{"scope":"Vault and memory persistence","implementationBoundary":"packages/vault"},"personalAssistance":{"scope":"PA profile/attention/mobile/responsibility/calendar/work-schedule persistence","client":"packages/personal-assistance/src/persistence.ts","physicalCompatibilityFile":"data/chernobog.db","dataDirectoryOverride":"CHERNOBOG_DATA_DIR"},"externalProjects":{"projectOperations":{"scope":"project_operations_* tables","client":"lib/modules/project-operations/persistence.ts","physicalCompatibilityFile":"data/chernobog.db"},"itchGameRadar":{"scope":"Itch/Game Radar SQLite","implementation":"lib/modules/itch-discovery/database/client.ts","ownership":"independent"}}},"rules":["No package reaches directly into another package persistence implementation","No stored data is moved or deleted in OH-1L","Physical compatibility locations may remain while logical ownership is separated"]};
function assert(condition,message){if(!condition){console.error('FAIL '+message);process.exitCode=1;}else console.log('PASS '+message);}
function read(rp){return fs.readFileSync(path.join(root,rp),'utf8');}
function allFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allFiles(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function hasDestructivePersistenceOperation(text){const compact=text.replaceAll(' ','').replaceAll('\n','').replaceAll('\r','').replaceAll('\t','').toLowerCase();const upper=text.toUpperCase();return compact.includes('rename(')||compact.includes('copyfile(')||compact.includes('unlink(')||compact.includes('rmsync(')||upper.includes('DROP TABLE')||upper.includes('VACUUM');}

console.log('============================================================');
console.log('CHERNOBOG OH-1L PERSISTENCE OWNERSHIP VERIFIER V6');
console.log('============================================================');
for(const rp of ["lib/modules/project-operations/repository.ts","lib/modules/project-operations/persistence.ts","packages/personal-assistance/src/persistence.ts","packages/external-projects/persistence-ownership.json","packages/core/PERSISTENCE.md","packages/events/PERSISTENCE.md","packages/vault/PERSISTENCE.md","packages/personal-assistance/PERSISTENCE.md","packages/external-projects/PERSISTENCE.md"]) assert(fs.existsSync(path.join(root,rp)),'required persistence boundary exists: '+rp);
const current=JSON.parse(read('packages/external-projects/persistence-ownership.json'));
assert(JSON.stringify(current)===JSON.stringify(manifest),'persistence ownership manifest matches accepted implementation');
const repo=read('lib/modules/project-operations/repository.ts');
const pdb=read('lib/modules/project-operations/persistence.ts');
assert(repo.includes('projectOperationsDb as db'),'Project Operations repository consumes its own persistence client');
assert(!repo.includes('@/lib/chernobog/db')&&!repo.includes('@chernobog/core/db'),'Project Operations no longer imports Core database implementation');
assert(repo.includes('chernobog.db'),'accepted shared physical database location remains explicit for compatibility');
assert(pdb.includes('better-sqlite3'),'Project Operations owns its SQLite connection implementation');
assert(pdb.includes('CHERNOBOG_DATA_DIR')&&pdb.includes('chernobog.db'),'Project Operations preserves configured data-directory semantics and existing database filename');
assert(pdb.includes('closeProjectOperationsPersistence'),'Project Operations persistence exposes explicit verifier lifecycle disposal');
const projectVerifierLifecycle=read('scripts/verify-project-operations.ts');
assert(projectVerifierLifecycle.includes('closeProjectOperationsPersistence')&&projectVerifierLifecycle.includes('OH-1L lifecycle cleanup: Project Operations'),'Project Operations verifier releases domain persistence before temporary-directory cleanup');
assert(!hasDestructivePersistenceOperation(pdb),'Project Operations persistence boundary performs no destructive migration');
const itchClient=read('lib/modules/itch-discovery/database/client.ts');
assert(itchClient.includes('better-sqlite3'),'Itch/Game Radar retains its independent SQLite implementation');
assert(!itchClient.includes('chernobog/db')&&!itchClient.includes('@chernobog/core/db'),'Itch/Game Radar does not borrow Core persistence');
const eventStore=read('packages/events/src/store.ts');
assert(!eventStore.includes('@chernobog/core/db')&&!eventStore.includes('@/lib/chernobog/db'),'Event persistence remains owned by Events');
const paRoot=path.join(root,'packages/personal-assistance/src');
const vaultRoot=path.join(root,'packages/vault/src');
const paText=allFiles(paRoot).filter(p=>/\.(?:ts|tsx|js|mjs|cjs)$/i.test(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
const vaultText=allFiles(vaultRoot).filter(p=>/\.(?:ts|tsx|js|mjs|cjs)$/i.test(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
assert(!paText.includes('@chernobog/core/db')&&!paText.includes('@/lib/chernobog/db'),'PA package does not import Core database implementation');
assert(!vaultText.includes('@chernobog/core/db')&&!vaultText.includes('@/lib/chernobog/db'),'Vault package does not import Core database implementation');
const paDb=read('packages/personal-assistance/src/persistence.ts');
assert(paDb.includes('better-sqlite3'),'PA owns its SQLite connection implementation');
assert(paDb.includes('CHERNOBOG_DATA_DIR'),'PA preserves accepted CHERNOBOG_DATA_DIR test/runtime override semantics');
assert(paDb.includes('chernobog.db'),'PA preserves the existing physical database filename');
assert(paDb.includes('journal_mode = WAL'),'PA preserves WAL compatibility semantics');
assert(paDb.includes('closePersonalAssistancePersistence'),'PA persistence exposes explicit verifier lifecycle disposal');
assert(!hasDestructivePersistenceOperation(paDb),'PA persistence boundary performs no destructive migration');
const coreDoc=read('packages/core/PERSISTENCE.md');
assert(coreDoc.includes('Core runtime/session/state'),'Core persistence ownership is documented as runtime/session/state only');
const paDoc=read('packages/personal-assistance/PERSISTENCE.md');
assert(paDoc.includes('own SQLite connection')&&paDoc.includes('CHERNOBOG_DATA_DIR'),'PA persistence ownership document records local connection and compatibility semantics');
const extDoc=read('packages/external-projects/PERSISTENCE.md');
assert(extDoc.includes('Project Operations')&&extDoc.includes('Itch'),'external-project persistence ownership is documented');
if(process.exitCode)process.exit(process.exitCode);
console.log('OH-1L persistence ownership verifier V6: PASS');
