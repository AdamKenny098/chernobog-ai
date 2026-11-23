import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhoneInferenceRouter } from '../scripts/phone-inference-router.mjs';

const secret = 's'.repeat(48);
const desktopUrl = 'https://desktop.example.ts.net:11443';
test('private desktop receives credentials and local fallback does not', async () => {
  const calls = [];
  const router = createPhoneInferenceRouter({ desktopUrl, desktopSecret: secret, fetchModel: async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/api/tags')) return Response.json({ models: [] });
    return Response.json({ message: { content: 'desktop' } });
  } });
  await router.fetch('http://127.0.0.1:11434/api/chat', { body: '{}', headers: { 'Content-Type': 'application/json' } });
  assert.equal(router.status().lastRoute, 'desktop');
  assert.equal(calls[1][1].headers.Authorization, `Bearer ${secret}`);
});
test('offline and busy desktop fall back, credential errors fail closed', async () => {
  for (const status of [429, 503, 401]) {
    let local = false;
    const router = createPhoneInferenceRouter({ desktopUrl, desktopSecret: secret, fetchModel: async (url, options) => {
      if (url.endsWith('/api/tags')) return Response.json({});
      if (url.startsWith(desktopUrl)) return new Response('{}', { status });
      local = true;
      assert.equal(options.headers.Authorization, undefined);
      return Response.json({ message: { content: 'local' } });
    } });
    const request = router.fetch('http://127.0.0.1:11434/api/chat', { headers: {}, body: '{}' });
    if (status === 401) { await assert.rejects(request, /configuration rejected/); assert.equal(local, false); }
    else { await request; assert.equal(local, true); assert.equal(router.status().lastRoute, 'local'); }
  }
});
test('interrupted desktop body cannot silently replay on local model', async () => {
  let local = false;
  const router = createPhoneInferenceRouter({ desktopUrl, desktopSecret: secret, fetchModel: async url => {
    if (url.endsWith('/api/tags')) return Response.json({});
    if (!url.startsWith(desktopUrl)) local = true;
    return new Response(new ReadableStream({ start(controller) { controller.error(new Error('broken stream')); } }));
  } });
  const response = await router.fetch('http://127.0.0.1:11434/api/chat');
  await assert.rejects(response.text(), /broken/);
  assert.equal(local, false);
});
test('public or insecure desktop endpoints are rejected', () => {
  for (const url of ['http://desktop.example.ts.net', 'https://public.example.com', 'https://desktop.example.ts.net/other']) {
    assert.throws(() => createPhoneInferenceRouter({ desktopUrl: url, desktopSecret: secret }), /Tailscale/);
  }
});
