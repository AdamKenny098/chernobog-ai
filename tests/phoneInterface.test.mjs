import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createPhoneCore } from '../scripts/phone-core.mjs';

test('Command Center authenticates, preserves assets, and routes speech away from legacy', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'phone-interface-'));
  const token = 'b'.repeat(48);
  const forwarded = [];
  const server = await createPhoneCore({ token, dataDir, frontend: 'http://frontend', speech: 'http://speech', fetchUpstream: async (url, options) => {
    forwarded.push([url, options]);
    if (url.endsWith('/health')) return Response.json({ ok: true });
    if (url.endsWith('/transcribe')) return Response.json({ transcript: 'Hello Chernobog' });
    if (url.endsWith('/speak')) return new Response('WAV', { headers: { 'Content-Type': 'audio/wav' } });
    return new Response('<h1>Command Center</h1>', { headers: { 'Content-Type': 'text/html' } });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/command-center`)).status, 401);
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /Secure; HttpOnly; SameSite=Strict/);
    const headers = { Cookie: cookie.split(';')[0] };
    const page = await fetch(`${base}/command-center`, { headers });
    assert.equal(await page.text(), '<h1>Command Center</h1>');
    assert.equal((await fetch(`${base}/_next/static/chunk.js`, { headers })).status, 200);
    const health = await (await fetch(`${base}/api/sensory/status`, { headers })).json();
    assert.equal(health.providers.stt.online, true);
    const audio = new FormData();
    audio.append('audio', new Blob(['test'], { type: 'audio/wav' }), 'test.wav');
    const transcript = await (await fetch(`${base}/api/sensory/transcribe`, { method: 'POST', headers, body: audio })).json();
    assert.equal(transcript.transcript, 'Hello Chernobog');
    assert.ok(transcript.turnId);
    const speech = await fetch(`${base}/api/sensory/speak`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello' }) });
    assert.equal(speech.headers.get('content-type'), 'audio/wav');
    assert.equal(await speech.text(), 'WAV');
    assert.ok(forwarded.some(([url]) => url === 'http://speech/transcribe'));
    assert.equal((await fetch(`${base}/api/personal-assistance/profile`, { method: 'POST', headers, body: '{}' })).status, 404);
    assert.equal((await fetch(`${base}/api/sensory/speak`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}' })).status, 403);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
});
