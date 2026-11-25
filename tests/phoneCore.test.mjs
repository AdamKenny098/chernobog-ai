import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPhoneCore } from '../scripts/phone-core.mjs';

test('private chat rejects unauthorized input, persists history and sends it after restart', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'chernobog-phone-'));
  const token = 'a'.repeat(48);
  const calls = [];
  const fetchModel = async (url, options) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'gemma3:4b' }] });
    calls.push(JSON.parse(options.body));
    return Response.json({ message: { content: 'Hello from Chernobog' } });
  };
  let server;
  async function start() {
    server = await createPhoneCore({ token, dataDir, fetchModel });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  try {
    let base = await start();
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST' })).status, 401);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(`${base}/health/ready`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers, body: '{' })).status, 400);
    const first = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'Hello, my name is Adam' }) });
    assert.equal(first.status, 200);
    const { sessionId, reply } = await first.json();
    assert.equal(reply, 'Hello from Chernobog');
    assert.equal(JSON.parse(await readFile(path.join(dataDir, `${sessionId}.json`))).length, 2);
    await stop();
    base = await start();
    const second = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ sessionId, message: 'What did I say?' }) });
    assert.equal(second.status, 200);
    assert.equal(calls[1].messages[1].content, 'Hello, my name is Adam');
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: { ...headers, Origin: 'https://attacker.example' }, body: '{}' })).status, 403);
    assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ sessionId: '../escape', message: 'hello' }) })).status, 400);
  } finally { if (server.listening) await stop(); await rm(dataDir, { recursive: true, force: true }); }
});
