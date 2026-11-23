import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readOllamaStream } from '../scripts/phone-stream.mjs';

test('streaming survives split Unicode and frames, and emits before completion', async () => {
  const encoded = new TextEncoder().encode('{"message":{"content":"Hello ☀"}}\n{"message":{"content":" Adam"},"done":true}\n');
  async function* chunks() { for (const byte of encoded) yield new Uint8Array([byte]); }
  const tokens = [];
  assert.equal(await readOllamaStream(chunks(), token => tokens.push(token)), 'Hello ☀ Adam');
  assert.deepEqual(tokens, ['Hello ☀', ' Adam']);
});

test('truncated or failed model streams cannot be accepted as completed turns', async () => {
  async function* truncated() { yield new TextEncoder().encode('{"message":{"content":"partial"}}\n'); }
  await assert.rejects(readOllamaStream(truncated(), () => {}), /Incomplete/);
  async function* failed() { yield new TextEncoder().encode('{"error":"failed"}\n'); }
  await assert.rejects(readOllamaStream(failed(), () => {}), /failed/);
});
