export const ITCH_PROJECT_PAGE_USER_AGENT =
  "Chernobog-Game-Radar/0.2 (local personal discovery index; respectful metadata fetcher; +https://itch.io)";

export const ITCH_PROJECT_PAGE_ACCEPT =
  "text/html, application/xhtml+xml;q=0.95, application/json;q=0.2, */*;q=0.1";

export const DEFAULT_PROJECT_PAGE_TIMEOUT_MS = 15_000;
export const DEFAULT_PROJECT_PAGE_MAX_BYTES = 4_000_000;
export const DEFAULT_PROJECT_PAGE_MAX_REDIRECTS = 3;
export const DEFAULT_PROJECT_PAGE_RETRY_COUNT = 2;

export const PROJECT_PAGE_RETRYABLE_HTTP_STATUSES = new Set([
  429,
  500,
  502,
  503,
  504,
]);
