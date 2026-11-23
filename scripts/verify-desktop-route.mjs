import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createPhoneCore } from './phone-core.mjs';
const config = Object.fromEntries((await readFile('/home/omen/.config/chernobog/desktop-inference.env', 'utf8')).trim().split('\n').map(line => line.trim().split(/=(.*)/s).slice(0, 2)));
const headers = { Authorization: `Bearer ${config.CHERNOBOG_DESKTOP_SECRET}`, 'Content-Type': 'application/json' };
const origin = config.CHERNOBOG_DESKTOP_URL;
const tags = await fetch(`${origin}/api/tags`, { headers, signal: AbortSignal.timeout(10000) });
if (!tags.ok) throw new Error(`Desktop inventory returned HTTP ${tags.status}`);
console.log('Tailscale HTTPS verified; desktop models:', (await tags.json()).models.map(model => model.name).join(', '));
const blocked = await fetch(`${origin}/api/delete`, { method: 'POST', headers, body: '{}' });
if (blocked.status !== 404) throw new Error('Management endpoint not blocked');
const unauthenticated = await fetch(`${origin}/api/tags`);
if (unauthenticated.status !== 401) throw new Error('Unauthenticated gateway request accepted');
console.log('Unauthenticated and model-management requests rejected');
const dataDir = await mkdtemp('/tmp/chernobog-desktop-route-');
const token = 'route-test-'.repeat(8);
const server = await createPhoneCore({ token, dataDir, desktopUrl: origin, desktopSecret: config.CHERNOBOG_DESKTOP_SECRET });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const start = Date.now();
  const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Say hello to Adam in one short friendly sentence.', stream: true }) });
  let pending = '', first = true, complete = false;
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    pending += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'token' && first) { console.log('First text milliseconds:', Date.now() - start); first = false; }
      if (event.type === 'done') { complete = true; console.log('Reply:', event.reply, 'Total milliseconds:', Date.now() - start); }
      if (event.type === 'error') throw new Error(event.error);
    }
  }
  if (!complete) throw new Error('No completed reply');
  console.log('Actual route:', await (await fetch(`${base}/api/inference/status`, { headers: { Authorization: `Bearer ${token}` } })).text());
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
