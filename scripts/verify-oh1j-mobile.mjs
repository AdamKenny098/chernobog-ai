import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const mobileRoot = 'mobile/android-companion';
const appRoot = 'apps/chernobog-mobile';
const expectedApis = ["/api/personal-assistance/mobile/enroll","/api/personal-assistance/mobile/heartbeat","/api/personal-assistance/mobile/notifications","/api/personal-assistance/mobile/notifications/reconcile","/api/personal-assistance/mobile/session","/api/personal-assistance/mobile/transport","/api/personal-assistance/mobile/work-schedule/alkimii-roster"];

function assert(condition, message) {
  if (!condition) { console.error('FAIL ' + message); process.exitCode = 1; }
  else console.log('PASS ' + message);
}
function read(rp) { return fs.readFileSync(path.join(root, rp), 'utf8'); }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
function norm(p) { return p.replaceAll('\\','/'); }
function discoverApis() {
  const out = new Set();
  for (const abs of walk(path.join(root,mobileRoot))) {
    if (!/\.(?:kt|java)$/i.test(abs)) continue;
    const text = fs.readFileSync(abs,'utf8');
    for (const m of text.matchAll(/["'](\/api\/[^"']+)["']/g)) out.add(m[1]);
  }
  return [...out].sort();
}

console.log('============================================================');
console.log('CHERNOBOG OH-1J ANDROID BOUNDARY VERIFIER V2');
console.log('============================================================');
for (const rp of [
  appRoot + '/README.md',
  appRoot + '/COMPATIBILITY.md',
  appRoot + '/boundary.json',
  appRoot + '/api-surface.json',
]) assert(fs.existsSync(path.join(root,rp)), 'required file exists: ' + rp);

const boundary = JSON.parse(read(appRoot + '/boundary.json'));
assert(boundary.owner === appRoot, 'Android architectural owner is apps/chernobog-mobile');
assert(boundary.legacySourceRoot === mobileRoot, 'accepted Gradle source remains available through explicit compatibility root');
assert(boundary.serverImplementationDependencies === false, 'Android boundary forbids server implementation dependencies');
assert(boundary.transport === 'authenticated-https-api', 'Android boundary declares authenticated HTTPS API transport');

const apiManifest = JSON.parse(read(appRoot + '/api-surface.json'));
const liveApis = discoverApis();
assert(JSON.stringify(apiManifest.paths) === JSON.stringify(expectedApis), 'API manifest records installer-observed accepted Android API surface');
assert(JSON.stringify(liveApis) === JSON.stringify(expectedApis), 'Android source API paths remain equal to boundary manifest');
assert(liveApis.length >= 3, 'Android companion exposes multiple explicit server API calls');
assert(liveApis.every(p => p.startsWith('/api/personal-assistance/mobile/')), 'Android server communication is constrained to Personal Assistance mobile APIs');

const sourceTexts = walk(path.join(root,mobileRoot)).filter(p => /\.(?:kt|java|kts|xml)$/i.test(p)).map(p => fs.readFileSync(p,'utf8')).join('\n');
for (const forbidden of ['@/lib/','lib/chernobog','packages/core','packages/personal-assistance','data/chernobog.db','better-sqlite3']) {
  assert(!sourceTexts.includes(forbidden), 'Android source does not depend on server internal path: ' + forbidden);
}

const manifest = read(mobileRoot + '/app/src/main/AndroidManifest.xml');
assert(manifest.includes('android:usesCleartextTraffic="false"'), 'Android application keeps cleartext transport disabled');
assert(manifest.includes('ChernobogNotificationListenerService'), 'Notification Listener remains registered');
const spool = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/NotificationSpool.kt');
assert(spool.includes('RoomDatabase') && spool.includes('NotificationSpool'), 'durable Room-backed offline notification spool remains present');
const listener = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/ChernobogNotificationListenerService.kt');
assert(listener.includes('NotificationSyncScheduler') && listener.includes('NotificationSpool'), 'Notification Listener remains wired to durable spool and sync scheduling');
const syncWorker = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/NotificationSyncWorker.kt');
assert(syncWorker.includes('NotificationTransportClient') && syncWorker.includes('Result.retry'), 'notification spool worker retains authenticated transport and retry behavior');
const syncScheduler = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/NotificationSyncScheduler.kt');
assert(syncScheduler.includes('WorkManager') || syncScheduler.includes('enqueue'), 'notification spool retains WorkManager scheduling');
assert(manifest.includes('AlkimiiRosterAccessibilityService'), 'scoped Alkimii Accessibility Service remains registered');
assert((manifest.match(/android\.permission\.BIND_ACCESSIBILITY_SERVICE/g) ?? []).length === 1, 'manifest retains exactly one Accessibility-service binding');

const alkimiiConfig = read(mobileRoot + '/app/src/main/res/xml/alkimii_roster_accessibility_service.xml');
assert(alkimiiConfig.includes('android:packageNames="com.alkimii.connect.app"'), 'Accessibility metadata remains scoped to exact Alkimii package');
assert(alkimiiConfig.includes('android:canPerformGestures="false"'), 'Accessibility service retains no gesture authority');
const alkimiiService = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/AlkimiiRosterAccessibilityService.kt');
assert(!alkimiiService.includes('performAction(') && !alkimiiService.includes('dispatchGesture(') && !alkimiiService.includes('performGlobalAction('), 'Alkimii capture remains observation-only');

const endpointPolicy = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/EndpointPolicy.kt');
assert(/https/i.test(endpointPolicy), 'endpoint policy retains HTTPS enforcement');
const transportFiles = walk(path.join(root,mobileRoot + '/app/src/main/java/ai/chernobog/companion')).filter(p => /TransportClient\.kt$/i.test(p));
assert(transportFiles.length >= 3, 'accepted companion transport clients remain present');
const transportText = transportFiles.map(p => fs.readFileSync(p,'utf8')).join('\n');
assert(transportText.includes('HttpsURLConnection'), 'mobile transport clients use HTTPS connections');
assert(transportText.includes('Authorization') && transportText.includes('Bearer $token'), 'authenticated mobile transports retain bearer credentials');

const credentialStore = read(mobileRoot + '/app/src/main/java/ai/chernobog/companion/SecureCredentialStore.kt');
assert(credentialStore.includes('AndroidKeyStore') || credentialStore.includes('KeyStore'), 'secure credential store retains Android keystore-backed credential ownership');

const compat = read(appRoot + '/COMPATIBILITY.md');
assert(compat.includes('mobile/android-companion') && compat.includes('path-sensitive'), 'compatibility boundary documents why physical relocation is deferred');
assert(compat.includes('Alkimii Accessibility Service'), 'compatibility boundary explicitly preserves later accepted Alkimii accessibility behavior');

const workScheduleService = read('lib/chernobog/personalAssistance/workSchedule/service.ts');
assert(
  workScheduleService.includes('getResponsibilityLedger') &&
  workScheduleService.includes('"work-schedule"') &&
  workScheduleService.includes('"waiting-user"') &&
  workScheduleService.includes('publishChernobogEventSafely') &&
  workScheduleService.includes('personal-assistance.work-schedule.changed'),
  'PA-4 authoritative schedule changes retain responsibility projection and Event Spine publication semantics'
);

const diff = spawnSync('git',['diff','--quiet','HEAD','--',mobileRoot],{cwd:root});
assert(diff.status === 0, 'legacy Android companion tracked source has no Git-visible OH-1J edits');

if (process.exitCode) process.exit(process.exitCode);
console.log('OH-1J Android verifier V3: PASS');
