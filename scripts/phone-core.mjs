import http from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handlePhoneInterface } from './phone-interface.mjs';
import { readOllamaStream } from './phone-stream.mjs';

export async function createPhoneCore({ token, dataDir, model = 'gemma3:4b', ollama = 'http://127.0.0.1:11434', fetchModel = fetch, frontend, speech = 'http://127.0.0.1:3194', fetchUpstream = fetch }) {
  if (!token || Buffer.byteLength(token) < 32 || !path.isAbsolute(dataDir)) throw new Error('Absolute data directory and 32-byte token required');
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const page = await readFile(new URL('../deploy/phone/index.html', import.meta.url));
  let busy = false;
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); return res.end(page); }
      if (req.method === 'GET' && req.url === '/app.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(await readFile(new URL('../deploy/phone/app.js', import.meta.url))); }
      if (req.method === 'GET' && req.url === '/style.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); return res.end(await readFile(new URL('../deploy/phone/style.css', import.meta.url))); }
      if (req.method === 'GET' && req.url === '/health/live') return send(200, { ok: true });
      if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `https://${req.headers.host}` && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Origin rejected' });
      const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('__Host-chernobog='))?.slice('__Host-chernobog='.length);
      const supplied = Buffer.from(req.headers.authorization ?? (cookie ? `Bearer ${cookie}` : ''));
      const expected = Buffer.from(`Bearer ${token}`);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(401, { error: 'Unauthorized' });
      if (req.method === 'POST' && req.url === '/api/login') {
        req.resume();
        res.setHeader('Set-Cookie', `__Host-chernobog=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
        return send(200, { ok: true });
      }
      if (await handlePhoneInterface(req, res, { frontend, speech, fetchUpstream })) return;
      if (req.method === 'GET' && req.url === '/health/ready') {
        const result = await fetchModel(`${ollama}/api/tags`, { signal: AbortSignal.timeout(5000) });
        const tags = await result.json();
        const ready = result.ok && tags.models?.some(item => item.name === model);
        return send(ready ? 200 : 503, { ok: !!ready, model });
      }
      if (req.method !== 'POST' || req.url !== '/api/chat') return send(404, { error: 'Not found' });
      if (busy) return send(429, { error: 'A reply is still being prepared. Try again shortly.' });
      if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}` && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Origin rejected' });
      busy = true;
      try {
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) return send(413, { error: 'Message too large' }); }
        let input;
        try { input = JSON.parse(body); } catch { return send(400, { error: 'Invalid JSON' }); }
        const sessionId = input.sessionId ?? randomUUID();
        if (!/^(?:sensory-)?[a-f0-9-]{36}$/.test(sessionId) || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 8000) return send(400, { error: 'Invalid message or session' });
        const filename = path.join(dataDir, `${sessionId}.json`);
        let history = [];
        try { history = JSON.parse(await readFile(filename, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (!Array.isArray(history)) throw new Error('Invalid conversation store');
        const messages = [...history.slice(-24), { role: 'user', content: input.message.trim() }];
        const streaming = input.stream === true;
        const controller = new AbortController();
        const abort = () => { if (!res.writableEnded) controller.abort(); };
        res.once('close', abort);
        let reply;
        try {
          const result = await fetchModel(`${ollama}/api/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]),
            body: JSON.stringify({ model, stream: streaming, messages: [{ role: 'system', content: 'You are Chernobog, a personal assistant running on the owner\'s homelab. Be helpful, candid and concise. This chat can converse and remember the recent conversation, but has no tools or access to other stored memories. Never claim to have performed actions.' }, ...messages] }),
          });
          if (!result.ok) throw new Error('Model unavailable');
          if (streaming) {
            res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
            res.flushHeaders();
            reply = await readOllamaStream(result.body, token => { if (res.destroyed) throw new Error('Client disconnected'); res.write(JSON.stringify({ type: 'token', text: token }) + '\n'); });
          } else {
            const output = await result.json();
            reply = output.message?.content;
          }
        } finally { res.off('close', abort); }
        if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty model reply');
        await writeFile(`${filename}.tmp`, JSON.stringify([...messages, { role: 'assistant', content: reply }]), { mode: 0o600 });
        await rename(`${filename}.tmp`, filename);
        if (streaming) { res.end(JSON.stringify({ type: 'done', sessionId, reply }) + '\n'); return; }
        return send(200, { sessionId, reply, spokenReply: reply });
      } finally { busy = false; }
    } catch {
      if (res.destroyed) return;
      if (res.headersSent) res.end(JSON.stringify({ type: 'error', error: 'Conversation interrupted. Please retry.' }) + '\n');
      else send(503, { error: 'Conversation unavailable. Check the model and service logs.' });
    }
  });
  server.requestTimeout = 150000;
  server.headersTimeout = 15000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createPhoneCore({ token: process.env.CHERNOBOG_PHONE_TOKEN, dataDir: process.env.CHERNOBOG_PHONE_DATA ?? '/var/lib/chernobog-phone', model: process.env.CHERNOBOG_PHONE_MODEL, ollama: process.env.OLLAMA_URL, frontend: process.env.CHERNOBOG_FRONTEND_URL });
  server.listen(3192, '127.0.0.1');
  const stop = () => { server.close(); server.closeIdleConnections(); setTimeout(() => process.exit(1), 130000).unref(); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
