import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { getModelCandidates } from '../packages/models/src/modelRouter.ts';
import { findInstalledOllamaModelMatch } from '../packages/models/src/modelMatching.ts';

export function createDesktopInference({ secret, ollama = 'http://127.0.0.1:11434', fetchModel = fetch }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('Inference secret must contain at least 32 bytes');
  const expected = Buffer.from(`Bearer ${secret}`);
  let busy = false;
  return http.createServer(async (req, res) => {
    const send = (status, body) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); } };
    const received = Buffer.from(req.headers.authorization ?? '');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return send(401, { error: 'Unauthorized' });
    if (!(req.method === 'GET' && req.url === '/api/tags') && !(req.method === 'POST' && req.url === '/api/chat')) return send(404, { error: 'Inference only' });
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', disconnect);
    let ownsSlot = false;
    try {
      const inventory = await fetchModel(`${ollama}/api/tags`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]) });
      if (!inventory.ok) return send(503, { error: 'Desktop Ollama unavailable' });
      const tags = await inventory.json();
      if (req.method === 'GET') return send(200, tags);
      if (busy) return send(429, { error: 'Desktop inference busy' });
      busy = true;
      ownsSlot = true;
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 128 * 1024) return send(413, { error: 'Request too large' }); }
      let input;
      try { input = JSON.parse(raw); } catch { return send(400, { error: 'Invalid JSON' }); }
      const role = input.role ?? 'default';
      if (!['default', 'code', 'planner', 'repair'].includes(role) || !Array.isArray(input.messages) || !input.messages.length) return send(400, { error: 'Invalid role or messages' });
      const installed = (tags.models ?? []).map(item => item.name);
      const selected = getModelCandidates(role).map(candidate => findInstalledOllamaModelMatch(candidate.model, installed)).find(Boolean);
      if (!selected) return send(503, { error: 'No installed model matches the configured role' });
      const upstream = await fetchModel(`${ollama}/api/chat`, {
        method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selected, messages: input.messages, stream: input.stream === true, think: false, keep_alive: '10m', options: { num_ctx: 4096, num_predict: 1024 } }),
      });
      if (!upstream.ok) return send(upstream.status >= 500 ? 503 : upstream.status, { error: 'Desktop model unavailable' });
      res.writeHead(200, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', 'X-Chernobog-Model': selected, 'X-Chernobog-Role': role });
      res.flushHeaders();
      for await (const chunk of upstream.body) {
        if (res.destroyed) break;
        res.write(chunk);
      }
      res.end();
    } catch {
      if (!res.destroyed) { if (res.headersSent) res.destroy(); else send(503, { error: 'Desktop inference unavailable' }); }
    } finally {
      if (ownsSlot) busy = false;
      res.off('close', disconnect);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  for (const [role, variable] of Object.entries({ default: 'OLLAMA_MODEL', code: 'OLLAMA_CODE_MODEL', planner: 'OLLAMA_PLANNER_MODEL', repair: 'OLLAMA_REPAIR_MODEL' })) {
    if (config.models?.[role]) process.env[variable] = config.models[role];
  }
  const server = createDesktopInference(config);
  server.listen(11435, '127.0.0.1', () => console.log('Private desktop inference listening on loopback:11435'));
  if (config.warmOnStart !== false) {
    const model = getModelCandidates('default')[0].model;
    fetch(`${config.ollama ?? 'http://127.0.0.1:11434'}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000), body: JSON.stringify({ model, stream: false, keep_alive: '10m', options: { num_ctx: 4096 } }) })
      .then(response => console.log(response.ok ? `Default model warm: ${model}` : 'Default model warm-up unavailable'))
      .catch(() => console.log('Default model warm-up unavailable; Acer fallback remains available'));
  }
  process.once('SIGTERM', () => { server.close(); server.closeAllConnections(); });
}
