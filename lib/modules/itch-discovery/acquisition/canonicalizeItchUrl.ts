const ITCH_HOST = "itch.io";
const RESERVED_BASE_PATHS = new Set([
  "api",
  "blog",
  "dashboard",
  "devlogs",
  "directory",
  "docs",
  "feed",
  "games",
  "jam",
  "jams",
  "post",
  "profile",
  "sales",
  "t",
  "updates",
]);

export function isAllowedItchHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized === ITCH_HOST || normalized.endsWith(`.${ITCH_HOST}`);
}

export function assertAllowedItchUrl(
  value: string,
  purpose: "feed" | "project" = "feed",
): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid itch.io ${purpose} URL: ${value}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported protocol for itch.io ${purpose} URL.`);
  }

  if (!isAllowedItchHost(url.hostname)) {
    throw new Error(`Blocked non-itch.io ${purpose} host: ${url.hostname}`);
  }

  if (url.username || url.password) {
    throw new Error(`Credentials are not allowed in itch.io ${purpose} URLs.`);
  }

  if (url.port) {
    throw new Error(`Explicit ports are not allowed in itch.io ${purpose} URLs.`);
  }

  return url;
}

export function canonicalizeItchFeedUrl(value: string): string {
  const url = assertAllowedItchUrl(value, "feed");
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.search = "";
  url.pathname = normalizePathname(url.pathname);

  if (!url.pathname.endsWith(".xml") && !url.pathname.endsWith(".rss")) {
    throw new Error(`Itch.io feed URL must end in .xml or .rss: ${value}`);
  }

  return url.toString();
}

export function canonicalizeItchProjectUrl(value: string): string | null {
  let url: URL;

  try {
    url = assertAllowedItchUrl(decodeXmlEntities(value), "project");
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (hostname === ITCH_HOST || hostname === `www.${ITCH_HOST}`) {
    if (segments.length === 0 || RESERVED_BASE_PATHS.has(segments[0].toLowerCase())) {
      return null;
    }
  } else if (segments.length === 0) {
    return null;
  }

  const projectPath = `/${segments[0]}`;
  url.protocol = "https:";
  url.hostname = hostname;
  url.port = "";
  url.pathname = projectPath;
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function inferCreatorNameFromProjectUrl(value: string): string | undefined {
  const canonicalUrl = canonicalizeItchProjectUrl(value);
  if (!canonicalUrl) {
    return undefined;
  }

  const hostname = new URL(canonicalUrl).hostname;
  if (hostname === ITCH_HOST || hostname === `www.${ITCH_HOST}`) {
    return undefined;
  }

  const label = hostname.slice(0, -`.${ITCH_HOST}`.length).split(".").at(-1);
  if (!label) {
    return undefined;
  }

  return label
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/{2,}/g, "/");
  if (normalized === "/") {
    return normalized;
  }

  return normalized.replace(/\/$/, "");
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&amp;/gi, "&");
}
