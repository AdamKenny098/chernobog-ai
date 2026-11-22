import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function absolutePath(root, env, names, fallback) {
  for (const name of names) {
    const raw = env[name];
    if (typeof raw === 'string' && raw.trim()) {
      return path.resolve(root, raw.trim());
    }
  }
  return path.resolve(root, fallback);
}

/** Pure path resolution. Never changes process.cwd(), creates files or opens a database. */
export function resolveStoragePaths(repoRoot, env = process.env) {
  const root = path.resolve(repoRoot);
  const data = absolutePath(root, env, ['CHERNOBOG_DATA_DIR'], 'data');
  const vault = absolutePath(root, env,
    ['CHERNOBOG_VAULT_PATH','CHERNOBOG_VAULT_ROOT','OBSIDIAN_VAULT_PATH'],
    path.join('vault', 'chernobog'));
  const runtime = absolutePath(root, env, ['CHERNOBOG_RUNTIME_DIR'], path.join(data, 'runtime'));
  const eventLog = absolutePath(root, env, ['CHERNOBOG_EVENT_LOG_PATH'],
    path.join('.chernobog','runtime','events','events.jsonl'));
  return Object.freeze({ root, data, vault, runtime, eventLog,
    mainDb: path.join(data, 'chernobog.db'),
    paDb: path.join(data, 'chernobog.db'),
    ownerLock: path.join(runtime, 'oh7b2-core-owner.lock') });
}

/** Read-only inventory. Does not stat/open SQLite journal contents. */
export function inspectStorageBoundary(repoRoot, env = process.env) {
  const paths = resolveStoragePaths(repoRoot, env);
  const probes = Object.fromEntries(['data','vault','runtime','eventLog','mainDb','paDb','ownerLock']
    .map(key => [key, fs.existsSync(paths[key])]));
  return {
    mode: 'passive-observer',
    operationalOwner: false,
    storageInitialized: false,
    mainAndPaDatabaseAligned: paths.mainDb === paths.paDb,
    paths,
    exists: probes,
    warnings: [
      'Legacy Next.js is the active mutation authority until a later explicit cutover.',
      'OH-7B2 lease does not constrain legacy Next.js writers or in-memory event subscribers.',
    ],
  };
}

/**
 * Opt-in prospective owner lease; not invoked by the B1 bootstrap.
 * This protects only cooperating future core processes, NOT legacy Next.js.
 * Never auto-breaks an unknown or stale lease.
 */
export function acquireProspectiveCoreLease(paths, options = {}) {
  if (options.explicitOptIn !== true || options.legacyHostVerifiedStopped !== true) {
    throw new Error('Core writer lease denied: explicit opt-in and verified legacy stop required');
  }
  if (!fs.existsSync(paths.runtime)) {
    throw new Error('Core writer lease denied: runtime directory does not exist');
  }
  const token = randomUUID();
  const fd = fs.openSync(paths.ownerLock, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify({token, pid:process.pid, acquiredAt:new Date().toISOString()}));
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
  fs.closeSync(fd);
  let released = false;
  return {
    assertHeld() {
      if (released) throw new Error('Core lease already released');
      const payload = JSON.parse(fs.readFileSync(paths.ownerLock, 'utf8'));
      if (payload.token !== token || payload.pid !== process.pid) {
        throw new Error('Core lease changed: refusing ownership');
      }
    },
    release() {
      if (released) return;
      const payload = JSON.parse(fs.readFileSync(paths.ownerLock, 'utf8'));
      if (payload.token !== token) throw new Error('Lease changed: refusing unsafe release');
      fs.unlinkSync(paths.ownerLock);
      released = true;
    },
  };
}
