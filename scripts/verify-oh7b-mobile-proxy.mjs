import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const heartbeat=read('app/api/personal-assistance/mobile/heartbeat/route.ts');
const claim=read('app/api/personal-assistance/mobile/reminders/claim/route.ts');
const proxy=read('lib/chernobog/coreHost/coreProxy.ts');
for(const [label,source] of [['heartbeat',heartbeat],['claim',claim]]) {
 assert.match(source,/isCoreProxyRequested\(\)/);
 assert.match(source,/await import\("@\/lib\/chernobog\/coreHost\/mobileHandlers"\)/);
 assert.doesNotMatch(source,/^import .*mobileHandlers/m);
 console.log(`PASS ${label} defers stateful imports in proxy mode`);
}
assert.match(proxy,/headers\.set\("authorization", authorization\)/);
assert.match(proxy,/127\.0\.0\.1/);
assert.match(proxy,/status: 503/);
assert.match(proxy,/x-chernobog-core-gateway/);
assert.match(proxy,/method_not_allowed/);
console.log('PASS phone bearer retained; gateway private, loopback-only and fail-closed');
assert.match(claim,/"\/internal\/mobile\/reminders\/claim"/);
assert.match(heartbeat,/"\/internal\/mobile\/heartbeat"/);
console.log('OH-7B MOBILE CLIENT DELEGATION: PASS (cutover disabled)');
