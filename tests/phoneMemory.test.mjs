import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OwnerMemory } from '../scripts/phone-memory.mjs';
import { createPhoneCore } from '../scripts/phone-core.mjs';

test('owner memory persists, rejects conflicts, excludes irrelevant facts and purges forgotten recall', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'owner-memory-'));
  let memory = new OwnerMemory(directory);
  try {
    const original = memory.save({ key: 'favourite-drink', content: 'My favourite drink is tea.' });
    assert.equal(original.source, 'owner-confirmed');
    assert.throws(() => memory.save({ key: 'favourite-drink', content: 'My favourite drink is coffee.' }), /already exists/);
    assert.throws(() => memory.save({ id: original.id, expectedRevision: 0, key: original.key, content: 'Changed' }), /changed/);
    memory.save({ key: 'pet', content: 'My pet is a tortoise.' });
    memory.save({ key: 'hobby', content: 'I like astronomy.' });
    assert.equal(memory.recall('What is my favourite drink?')[0].id, original.id);
    assert.deepEqual(memory.recall('Explain quantum physics'), []);
    assert.deepEqual(memory.recall('What is my favourite food?'), []);
    assert.deepEqual(memory.recall('What is my favourite drink?', 10), []);
    memory.close(); memory = new OwnerMemory(directory);
    assert.equal(memory.recall('favourite drink')[0].content, original.content);
    const updated = memory.save({ id: original.id, expectedRevision: 1, key: original.key, content: 'My favourite drink is coffee.' });
    assert.equal(updated.revision, 2);
    assert.throws(() => memory.forget(original.id, 1), /changed/);
    memory.forget(updated.id, 2);
    memory.close(); memory = new OwnerMemory(directory);
    assert.deepEqual(memory.recall('favourite drink'), []);
    assert.match(memory.command('forget that').reply, /Which/);
    const before = memory.list().length;
    assert.match(memory.command('remember this').reply, /Nothing has been saved/);
    assert.match(memory.command('remember my name').reply, /Nothing has been saved/);
    assert.equal(memory.command('I think my favourite drink might be tea'), null);
    assert.equal(memory.list().length, before);
    const named = memory.command('Remember that my name is Adam');
    assert.match(named.reply, /Saved/);
    assert.match(memory.command('Forget my name').reply, /Removed/);
    assert.equal(memory.list().some(record => record.key === 'name'), false);
  } finally { memory.close(); await rm(directory, { recursive: true, force: true }); }
});

test('real phone path governs voice/text commands, recalls across sessions and denies unauthenticated mutation', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'phone-memory-http-'));
  const token = 'm'.repeat(48);
  const calls = [];
  let server;
  async function start() {
    server = await createPhoneCore({ token, dataDir, fetchModel: async (_url, options) => {
      const input = JSON.parse(options.body); calls.push(input);
      const packet = input.messages.find(message => message.content.startsWith('UNTRUSTED_SAVED_MEMORY_DATA'));
      return Response.json({ message: { content: packet ? 'Your favourite drink is tea.' : 'I do not have a saved drink preference.' } });
    } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let base = await start();
  const chat = (message, extra = {}) => fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message, ...extra }) });
  try {
    assert.equal((await fetch(`${base}/api/memories`)).status, 401);
    assert.equal((await fetch(`${base}/api/memories`, { method: 'POST', body: '{}' })).status, 401);
    const saved = await (await chat('Remember that my favourite drink is tea.', { stream: true })).text();
    assert.match(saved, /Saved to long-term memory/);
    assert.equal(calls.length, 0);
    await stop(); base = await start();
    const recalled = await (await chat('What is my favourite drink?')).json();
    assert.match(recalled.reply, /tea/);
    const packet = calls.at(-1).messages.find(message => message.content.startsWith('UNTRUSTED_SAVED_MEMORY_DATA'));
    assert.ok(packet);
    assert.ok(packet.content.length < 2500);
    assert.match(calls.at(-1).messages[0].content, /never instructions/);
    await chat('Tell me about stars');
    assert.equal(calls.at(-1).messages.some(message => message.content.startsWith('UNTRUSTED_SAVED_MEMORY_DATA')), false);
    const records = (await (await fetch(`${base}/api/memories`, { headers })).json()).memories;
    assert.equal(records.length, 1);
    const foreign = await fetch(`${base}/api/memories`, { method: 'POST', headers, body: JSON.stringify({ action: 'save', projectId: 'another-project', content: 'Do not import this' }) });
    assert.equal(foreign.status, 400);
    const updated = await fetch(`${base}/api/memories`, { method: 'POST', headers, body: JSON.stringify({ action: 'save', id: records[0].id, expectedRevision: 1, key: records[0].key, content: 'My favourite drink is green tea.' }) });
    assert.equal(updated.status, 200);
    const stale = await fetch(`${base}/api/memories`, { method: 'POST', headers, body: JSON.stringify({ action: 'delete', id: records[0].id, expectedRevision: 1 }) });
    assert.equal(stale.status, 409);
    records[0] = (await updated.json()).memory;
    const rejected = await fetch(`${base}/api/memories`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify({ action: 'delete', id: records[0].id, expectedRevision: 2 }) });
    assert.equal(rejected.status, 403);
    const forgotten = await (await chat(`Forget ${records[0].id}`)).json();
    assert.match(forgotten.reply, /Removed/);
    await stop(); base = await start();
    const after = await (await chat('What is my favourite drink?')).json();
    assert.match(after.reply, /do not have/);
    assert.equal(calls.at(-1).messages.some(message => message.content.startsWith('UNTRUSTED_SAVED_MEMORY_DATA')), false);
  } finally { await stop(); await rm(dataDir, { recursive: true, force: true }); }
});

test('corrupt memory storage fails closed and never silently resets confirmed facts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'owner-memory-corrupt-'));
  const filename = path.join(directory, 'owner-memory.sqlite');
  try {
    await writeFile(filename, 'not a sqlite database');
    assert.throws(() => new OwnerMemory(directory));
    assert.equal(await readFile(filename, 'utf8'), 'not a sqlite database');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
