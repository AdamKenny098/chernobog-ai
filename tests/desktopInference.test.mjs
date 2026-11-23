import { test } from 'node:test';
import assert from 'node:assert/strict';
const { createDesktopInference } = await import(process.env.CHERNOBOG_GATEWAY_BUNDLE ?? new URL('../../desktop-inference.bundle.mjs', import.meta.url));

test('gateway reuses role routing, restricts methods, and preserves model streams', async () => {
  const secret = 'g'.repeat(48);
  let generated;
  const server = createDesktopInference({ secret, fetchModel: async (url, options) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3.5:9b' }] });
    generated = JSON.parse(options.body);
    return new Response('{"message":{"content":"Hello"},"done":true}\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/api/tags`)).status, 401);
    assert.equal((await fetch(`${base}/api/delete`, { method: 'POST', headers, body: '{}' })).status, 404);
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ role: 'root', messages: [] }) })).status, 400);
    const result = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ model: 'untrusted-model', messages: [{ role: 'user', content: 'Hello' }], stream: true }) });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('x-chernobog-model'), 'qwen3.5:9b');
    assert.match(await result.text(), /Hello/);
    assert.equal(generated.model, 'qwen3.5:9b');
    assert.equal(generated.think, false);
    assert.equal(generated.options.num_ctx, 4096);
    assert.equal(generated.messages[0].role, 'system');
    assert.match(generated.messages[0].content, /warmth/);
    assert.equal(generated.messages[1].content, 'Hello');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
