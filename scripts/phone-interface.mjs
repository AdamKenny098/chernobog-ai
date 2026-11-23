import { randomUUID } from 'node:crypto';

export async function handlePhoneInterface(req, res, { frontend, speech, fetchUpstream = fetch }) {
  const url = new URL(req.url, 'http://localhost');
  const respond = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/api/sensory/event' && req.method === 'POST') {
    req.resume();
    respond(200, { ok: true });
    return true;
  }
  if (url.pathname === '/api/sensory/status' && req.method === 'GET') {
    let online = false;
    try { online = (await fetchUpstream(`${speech}/health`, { signal: AbortSignal.timeout(3000) })).ok; } catch {}
    const provider = name => ({ provider: name, configured: true, online, detail: online ? 'online' : 'Speech service unavailable' });
    respond(200, { providers: { stt: provider('faster-whisper'), tts: provider('piper'), vision: { configured: false, online: false, provider: 'ollama-vision', detail: 'Not enabled in phone core' } } });
    return true;
  }
  if (req.method === 'POST' && ['/api/sensory/transcribe', '/api/sensory/speak'].includes(url.pathname)) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 12 * 1024 * 1024) { respond(413, { error: 'Audio too large' }); return true; } chunks.push(chunk); }
    const target = url.pathname.endsWith('/transcribe') ? '/transcribe' : '/speak';
    const response = await fetchUpstream(`${speech}${target}`, { method: 'POST', headers: { 'Content-Type': req.headers['content-type'] ?? 'application/octet-stream' }, body: Buffer.concat(chunks), signal: AbortSignal.timeout(120000) });
    if (target === '/transcribe' && response.ok) {
      const body = await response.json();
      respond(200, { ...body, turnId: randomUUID() });
    } else {
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
      res.end(Buffer.from(await response.arrayBuffer()));
    }
    return true;
  }
  if (frontend && req.method === 'GET' && (url.pathname === '/command-center' || url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/personal-assistance/') || /\.(?:svg|png|ico|woff2?)$/.test(url.pathname))) {
    const response = await fetchUpstream(`${frontend}${url.pathname}${url.search}`, { headers: { Accept: req.headers.accept ?? '*/*' }, signal: AbortSignal.timeout(15000), redirect: 'manual' });
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') ?? 'text/html', 'Cache-Control': 'no-store' });
    res.end(Buffer.from(await response.arrayBuffer()));
    return true;
  }
  return false;
}
