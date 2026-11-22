import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveStoragePaths, inspectStorageBoundary, acquireProspectiveCoreLease } from './oh7b2-storage-boundary.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'chernobog-oh7b2-'));
function pass(name) { console.log(`PASS ${name}`); }
try {
  const runtime = path.join(fixture,'runtime');
  fs.mkdirSync(runtime);
  const env = { CHERNOBOG_RUNTIME_DIR:runtime };
  const paths = resolveStoragePaths(fixture,env);
  assert.equal(paths.mainDb,paths.paDb);
  assert.equal(paths.eventLog,path.join(fixture,'.chernobog','runtime','events','events.jsonl'));
  pass('main and PA database paths share an authority; event log resolves from repository root');

  const fromOtherWorkingDirectory = spawnSync(process.execPath, [
    '--input-type=module','-e',
    `import { resolveStoragePaths } from ${JSON.stringify(new URL('./oh7b2-storage-boundary.mjs', import.meta.url).href)}; process.stdout.write(JSON.stringify(resolveStoragePaths(${JSON.stringify(fixture)}, ${JSON.stringify(env)})));`,
  ], {cwd:os.tmpdir(),encoding:'utf8'});
  assert.equal(fromOtherWorkingDirectory.status,0,fromOtherWorkingDirectory.stderr);
  assert.deepEqual(JSON.parse(fromOtherWorkingDirectory.stdout),paths);
  pass('path resolution is independent of process working directory');

  const before = fs.readdirSync(runtime);
  const status = inspectStorageBoundary(fixture,env);
  assert.equal(status.operationalOwner,false);
  assert.equal(status.storageInitialized,false);
  assert.deepEqual(fs.readdirSync(runtime),before);
  pass('passive inspection creates no files and grants no writer authority');

  assert.throws(()=>acquireProspectiveCoreLease(paths),/denied/);
  assert.deepEqual(fs.readdirSync(runtime),before);
  pass('writer lease fails closed unless explicitly activated after legacy stop');

  const a = acquireProspectiveCoreLease(paths,{explicitOptIn:true,legacyHostVerifiedStopped:true});
  assert.throws(()=>acquireProspectiveCoreLease(paths,{explicitOptIn:true,legacyHostVerifiedStopped:true}), /EEXIST/);
  a.release();
  assert.equal(fs.existsSync(paths.ownerLock),false);
  pass('cooperating core processes cannot hold duplicate leases; release cleans up');
  console.log('OH-7B2 STORAGE OWNERSHIP BOUNDARY: PASS');
} finally {
  fs.rmSync(fixture,{recursive:true,force:true});
}
