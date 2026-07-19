export const ITCH_RSS_USER_AGENT =
  "Chernobog-Game-Radar/0.1 (local personal RSS reader; +https://itch.io)";

export const ITCH_RSS_ACCEPT =
  "application/rss+xml, application/atom+xml;q=0.95, application/xml;q=0.9, text/xml;q=0.8, text/plain;q=0.2";

export const DEFAULT_RSS_TIMEOUT_MS = 15_000;
export const DEFAULT_RSS_MAX_BYTES = 2_500_000;
export const DEFAULT_RSS_MAX_REDIRECTS = 3;
export const DEFAULT_RSS_RETRY_COUNT = 2;

export const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
