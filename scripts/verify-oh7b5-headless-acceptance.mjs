import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}
function pass(name) { console.log(`PASS ${name}`); }
function pending(name) { console.log(`NOT VERIFIED ${name}`); }

const required = [
  'scripts/oh7b1-core-bootstrap.mjs',
  'scripts/oh7b2-storage-boundary.mjs',
  'scripts/oh7b3-core-host.ts',
  'lib/chernobog/coreHost/chatService.ts',
  'lib/chernobog/coreHost/sessionService.ts',
  'lib/chernobog/coreHost/backgroundLifecycle.ts',
  'scripts/verify-oh7b2-storage-boundary.mjs',
  'scripts/verify-oh7b3-command-session.mjs',
  'scripts/verify-oh7b4-background-services.ts',
];
for (const p of required) assert.ok(fs.existsSync(path.join(root,p)), `Missing prerequisite ${p}`);
pass('OH-7B1 through OH-7B4 implementation files present');
const bootstrap = read('scripts/oh7b1-core-bootstrap.mjs');
const boundary = read('scripts/oh7b2-storage-boundary.mjs');
const host = read('scripts/oh7b3-core-host.ts');
const lifecycle = read('lib/chernobog/coreHost/backgroundLifecycle.ts');
const chatRoute = read('app/api/chat/route.ts');
const sessionRoute = read('app/api/session/route.ts');
assert.match(bootstrap,/operationalCoreReady:\s*false/);
assert.match(bootstrap,/storageBoundary/);
assert.match(boundary,/legacyHostVerifiedStopped\s*!==\s*true/);
assert.match(boundary,/exclusive|wx/);
pass('bootstrap remains passive and prospective ownership remains gated');
assert.match(host,/CHERNOBOG_OH7B3_ISOLATED_TEST/);
assert.match(host,/\.oh7b3-fixture/);
assert.match(host,/CHERNOBOG_EVENT_LOG_PATH/);
assert.match(host,/x-chernobog-core-gateway/);
assert.match(host,/"127\.0\.0\.1"/);
assert.match(host,/handleChatRequest/);
assert.match(host,/handleSessionRequest/);
pass('headless command/session host is isolated-only, loopback-only and gateway-protected');
assert.match(chatRoute,/handleChatRequest/);
assert.match(sessionRoute,/handleSessionRequest/);
assert.match(lifecycle,/this\.hasOwnership\(\)/);
assert.match(lifecycle,/stopStarted\(\)/);
assert.doesNotMatch(lifecycle,/new AndroidReminderDeliveryService\(/);
assert.doesNotMatch(lifecycle,/new (?:SchedulerRuntime|JobWorkerRuntime)\(/);
pass('existing routes delegate and lifecycle cannot activate services on import');
const dnd = read('packages/personal-assistance/src/reminders/androidDelivery.ts');
assert.match(dnd,/this\.outbox\.reserve\(/);
assert.match(dnd,/this\.outbox\.revalidate\(/);
pass('accepted Android outbox ownership and revalidation remain referenced');

console.log('\nOH-7B5 STATIC / PRE-CUTOVER ACCEPTANCE: PASS');
pending('real headless command execution and persisted session restart');
pending('live PA, scheduler and worker ownership transfer');
pending('real Android device and absolute DND across headless restart');
pending('Next.js independent reconnect after live core cutover');
console.log('OH-7B5 FULL HEADLESS ACCEPTANCE: NOT YET ESTABLISHED');
