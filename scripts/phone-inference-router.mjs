export function createPhoneInferenceRouter({ desktopUrl, desktopSecret, fetchModel = fetch, connectTimeoutMs = 2500 }) {
  if (desktopUrl) {
    const url = new URL(desktopUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.ts.net') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Desktop inference requires a private Tailscale HTTPS origin');
    if (!desktopSecret || Buffer.byteLength(desktopSecret) < 32) throw new Error('Desktop inference secret missing');
  }
  let lastRoute = 'local';
  let lastReason = 'Desktop not configured';
  return {
    status: () => ({ configured: !!desktopUrl, lastRoute, lastReason }),
    async fetch(url, options = {}) {
      if (!desktopUrl || !String(url).endsWith('/api/chat')) return fetchModel(url, options);
      const controller = new AbortController();
      let timer = setTimeout(() => controller.abort(), connectTimeoutMs);
      try {
        const probe = await fetchModel(`${desktopUrl.replace(/\/$/, '')}/api/tags`, {
          signal: AbortSignal.any([...(options.signal ? [options.signal] : []), controller.signal]), headers: { Authorization: `Bearer ${desktopSecret}` },
        });
        await probe.body?.cancel();
        if (!probe.ok) {
          if ([401, 403].includes(probe.status)) throw new Error(`Desktop configuration rejected: HTTP ${probe.status}`);
          throw new Error('Desktop not ready');
        }
        clearTimeout(timer);
        timer = setTimeout(() => controller.abort(), 15000);
        const response = await fetchModel(`${desktopUrl.replace(/\/$/, '')}/api/chat`, {
          ...options, signal: AbortSignal.any([...(options.signal ? [options.signal] : []), controller.signal]),
          headers: { ...options.headers, Authorization: `Bearer ${desktopSecret}` },
        });
        if (response.ok) { lastRoute = 'desktop'; lastReason = 'Desktop accepted request'; return response; }
        await response.body?.cancel();
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`Desktop configuration rejected: HTTP ${response.status}`);
        lastReason = `Desktop HTTP ${response.status}`;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        if (error.message?.startsWith('Desktop configuration rejected:')) throw error;
        lastReason = controller.signal.aborted ? 'Desktop response timeout' : 'Desktop unreachable';
      } finally { clearTimeout(timer); }
      lastRoute = 'local';
      return fetchModel(url, options);
    },
  };
}
