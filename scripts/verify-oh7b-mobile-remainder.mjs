import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
const host = read("scripts/oh7b3-core-host.ts");
const proxy = read("lib/chernobog/coreHost/coreProxy.ts");
const mobile = read("lib/chernobog/coreHost/mobileHandlers.ts");
for (const name of ["authorize", "ack"]) {
  const route = read(`app/api/personal-assistance/mobile/reminders/${name}/route.ts`);
  assert.match(route, /isCoreProxyRequested/);
  assert.match(route, /forwardMobileCoreRequest/);
  assert.match(route, /await import/);
  assert.doesNotMatch(route, /from ["']@chernobog\/personal-assistance/);
  assert.match(proxy, new RegExp(`/internal/mobile/reminders/${name}`));
  assert.match(host, /handleMobileReminderAuthorize/);
  assert.match(host, /handleMobileReminderAck/);
}
assert.match(mobile, /service\.authorize\(/);
assert.match(mobile, /service\.acknowledge\(/);
assert.match(mobile, /authenticatePersonalAssistanceMobileRequest\(request\)/);
assert.match(mobile, /getPersonalAttentionSnapshot\(\)/);
assert.match(mobile, /getPersonalAssistanceProfile\(\)/);
assert.match(host, /CHERNOBOG_OH7B3_ISOLATED_TEST/);
assert.match(host, /x-chernobog-core-gateway/);
console.log("OH-7B MOBILE AUTHORIZE + ACK GATEWAY: PASS (production cutover disabled)");
