import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createPhoneCore } from '../scripts/phone-core.mjs';

test('HTTP stream emits early, preserves history only after completion, and reports truncation', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'phone-stream-'));
  const token = 's'.repeat(48);
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  let calls = 0;
  const server = await createPhoneCore({ token, dataDir, fetchModel: async () => {
    const first = ++calls === 1;
    return new Response(new ReadableStream({ async start(controller) {
      controller.enqueue(new TextEncoder().encode('{"message":{"content":"Hello"}}\n'));
      if (first) { await gate; controller.enqueue(new TextEncoder().encode('{"message":{"content":" Adam"},"done":true}\n')); }
      controller.close();
    } }));
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const sessionId = crypto.randomUUID();
  try {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ sessionId, message: 'Hi', stream: true }) });
    assert.match(response.headers.get('content-type'), /ndjson/);
    const reader = response.body.getReader();
    const early = new TextDecoder().decode((await reader.read()).value);
    assert.match(early, /"type":"token"/);
    assert.deepEqual((await readdir(dataDir)).filter(name => name.endsWith('.json')), []);
    finish();
    let rest = '';
    for (;;) { const part = await reader.read(); if (part.done) break; rest += new TextDecoder().decode(part.value); }
    assert.match(rest, /"type":"done"/);
    const saved = JSON.parse(await readFile(path.join(dataDir, `${sessionId}.json`)));
    assert.equal(saved.at(-1).content, 'Hello Adam');
    const brokenSession = crypto.randomUUID();
    const broken = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ sessionId: brokenSession, message: 'Hi', stream: true }) });
    assert.match(await broken.text(), /"type":"error"/);
    assert.deepEqual((await readdir(dataDir)).filter(name => name.endsWith('.json')), [`${sessionId}.json`]);
  } finally { finish(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
});

test('disconnect aborts model generation and frees the next turn without saving a partial reply', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'phone-cancel-'));
  const token = 'c'.repeat(48);
  let aborted;
  const cancellation = new Promise(resolve => { aborted = resolve; });
  let calls = 0;
  const server = await createPhoneCore({ token, dataDir, fetchModel: async (_url, options) => {
    if (++calls > 1) return Response.json({ message: { content: 'Next turn works' } });
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"message":{"content":"partial"}}\n'));
      options.signal.addEventListener('abort', () => { controller.error(new Error('aborted')); aborted(); }, { once: true });
    } }));
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'Hello', stream: true }) });
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
    let timeout;
    try { await Promise.race([cancellation, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Model did not abort')), 2000); })]); }
    finally { clearTimeout(timeout); }
    assert.deepEqual((await readdir(dataDir)).filter(name => name.endsWith('.json')), []);
    const next = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'Next' }) });
    assert.equal(next.status, 200);
    assert.equal((await next.json()).reply, 'Next turn works');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
});
