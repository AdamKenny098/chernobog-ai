import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const chat=read('app/api/chat/route.ts');
const session=read('app/api/session/route.ts');
const transport=read('lib/chernobog/coreHost/coreProxy.ts');
for (const [name,code,method,endpoint,service] of [
 ['chat',chat,'POST','/internal/chat','chatService'],
 ['session',session,'GET','/internal/session','sessionService']
]) {
 assert.match(code,/if \(isCoreProxyRequested\(\)\) return forwardCoreRequest/);
 assert.match(code,new RegExp(`await import\\("@/lib/chernobog/coreHost/${service}"\\)`));
 assert.match(code,new RegExp(`forwardCoreRequest\\(req, "${endpoint}"\\)`));
 assert.match(code,new RegExp(`export async function ${method}`));
 assert.doesNotMatch(code,new RegExp(`^import \\{ handle(?:Chat|Session)Request`, 'm'));
 console.log(`PASS ${name} defers legacy service imports when proxy requested`);
}
assert.match(transport,/http:\/\/127\.0\.0\.1/);
assert.match(transport,/core_unavailable/);
assert.match(transport,/status: 503/);
assert.match(transport,/CHERNOBOG_CORE_ROUTE_MODE/);
assert.match(transport,/CHERNOBOG_CORE_GATEWAY_SECRET/);
assert.doesNotMatch(transport,/import .*db|import .*personalAssistance/);
console.log('PASS loopback-only proxy, explicit opt-in, fail-closed unavailability');
console.log('OH-7B CORE CLIENT TRANSPORT: PASS (no production cutover)');
