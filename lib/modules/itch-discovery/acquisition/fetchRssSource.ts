import type { ItchSource } from "../types";
import {
  ItchRssBlockedError,
  ItchRssFetchError,
} from "../errors";
import { canonicalizeItchFeedUrl } from "./canonicalizeItchUrl";
import {
  DEFAULT_RSS_MAX_BYTES,
  DEFAULT_RSS_MAX_REDIRECTS,
  DEFAULT_RSS_RETRY_COUNT,
  DEFAULT_RSS_TIMEOUT_MS,
  ITCH_RSS_ACCEPT,
  ITCH_RSS_USER_AGENT,
  RETRYABLE_HTTP_STATUSES,
} from "./requestPolicy";
import type { ItchRssFetchResult } from "./types";

export type ItchRssFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  retryCount?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
};

export async function fetchItchRssSource(
  source: ItchSource,
  options: ItchRssFetchOptions = {},
): Promise<ItchRssFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_RSS_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_RSS_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_RSS_MAX_REDIRECTS;
  const retryCount = options.retryCount ?? DEFAULT_RSS_RETRY_COUNT;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => new Date());
  const sourceUrl = canonicalizeItchFeedUrl(source.sourceUrl);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetchWithRedirects({
        source,
        sourceUrl,
        fetchImpl,
        timeoutMs,
        maxBytes,
        maxRedirects,
        now,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt >= retryCount) {
        throw error;
      }

      const delay = 500 * 2 ** attempt;
      await sleep(delay);
    }
  }

  throw new ItchRssFetchError("RSS fetch failed without a captured error.", {
    cause: lastError,
  });
}

async function fetchWithRedirects(input: {
  source: ItchSource;
  sourceUrl: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  now: () => Date;
}): Promise<ItchRssFetchResult> {
  let currentUrl = input.sourceUrl;

  for (let redirectCount = 0; redirectCount <= input.maxRedirects; redirectCount += 1) {
    const response = await requestOnce(currentUrl, input.source, input.fetchImpl, input.timeoutMs);

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ItchRssFetchError(
          `itch.io returned redirect status ${response.status} without a Location header.`,
          { code: "ITCH_RSS_INVALID_REDIRECT", statusCode: response.status },
        );
      }

      if (redirectCount >= input.maxRedirects) {
        throw new ItchRssFetchError("itch.io RSS redirect limit exceeded.", {
          code: "ITCH_RSS_REDIRECT_LIMIT",
          statusCode: response.status,
        });
      }

      currentUrl = canonicalizeItchFeedUrl(new URL(location, currentUrl).toString());
      continue;
    }

    const fetchedAt = input.now().toISOString();
    const etag = response.headers.get("etag") ?? undefined;
    const lastModified = response.headers.get("last-modified") ?? undefined;

    if (response.status === 304) {
      return {
        status: "not-modified",
        sourceUrl: input.sourceUrl,
        finalUrl: currentUrl,
        fetchedAt,
        etag,
        lastModified,
      };
    }

    if (response.status === 403) {
      throw new ItchRssBlockedError(
        "itch.io rejected the RSS request with HTTP 403. Chernobog will not attempt to bypass the access restriction.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new ItchRssFetchError(
        `itch.io RSS request failed with HTTP ${response.status}.`,
        {
          code: RETRYABLE_HTTP_STATUSES.has(response.status)
            ? "ITCH_RSS_TRANSIENT_HTTP_ERROR"
            : "ITCH_RSS_HTTP_ERROR",
          statusCode: response.status,
        },
      );
    }

    const contentLength = parseContentLength(response.headers.get("content-length"));
    if (contentLength !== undefined && contentLength > input.maxBytes) {
      throw new ItchRssFetchError(
        `itch.io RSS response exceeded the ${input.maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_RSS_RESPONSE_TOO_LARGE" },
      );
    }

    const contentType = response.headers.get("content-type") ?? undefined;
    const body = await readResponseTextWithLimit(response, input.maxBytes);
    if (looksLikeCloudflareChallenge(contentType, body)) {
      throw new ItchRssBlockedError(
        "itch.io returned an HTML access challenge instead of RSS. Chernobog will retain cached data and try again later.",
        response.status,
      );
    }

    if (contentType && !isRssContentType(contentType)) {
      throw new ItchRssFetchError(
        `itch.io RSS request returned unsupported content type: ${contentType}.`,
        { code: "ITCH_RSS_UNEXPECTED_CONTENT_TYPE" },
      );
    }

    return {
      status: "fetched",
      sourceUrl: input.sourceUrl,
      finalUrl: currentUrl,
      fetchedAt,
      body,
      etag,
      lastModified,
      contentType,
    };
  }

  throw new ItchRssFetchError("itch.io RSS redirect handling ended unexpectedly.");
}

async function requestOnce(
  url: string,
  source: ItchSource,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: ITCH_RSS_ACCEPT,
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "User-Agent": ITCH_RSS_USER_AGENT,
        ...(source.etag ? { "If-None-Match": source.etag } : {}),
        ...(source.lastModified ? { "If-Modified-Since": source.lastModified } : {}),
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ItchRssFetchError(
        `itch.io RSS request timed out after ${timeoutMs}ms.`,
        { code: "ITCH_RSS_TIMEOUT", cause: error },
      );
    }

    throw new ItchRssFetchError("Network failure while requesting itch.io RSS.", {
      code: "ITCH_RSS_NETWORK_ERROR",
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ItchRssFetchError)) {
    return false;
  }

  return (
    error.code === "ITCH_RSS_NETWORK_ERROR" ||
    error.code === "ITCH_RSS_TIMEOUT" ||
    error.code === "ITCH_RSS_TRANSIENT_HTTP_ERROR"
  );
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function parseContentLength(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}


async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new ItchRssFetchError(
        `itch.io RSS response exceeded the ${maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_RSS_RESPONSE_TOO_LARGE" },
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ItchRssFetchError(
        `itch.io RSS response exceeded the ${maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_RSS_RESPONSE_TOO_LARGE" },
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function isRssContentType(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("application/rss+xml") ||
    normalized.includes("application/atom+xml") ||
    normalized.includes("application/xml") ||
    normalized.includes("text/xml") ||
    normalized.includes("text/plain")
  );
}

function looksLikeCloudflareChallenge(
  contentType: string | undefined,
  body: string,
): boolean {
  const isHtml = contentType?.toLowerCase().includes("text/html") ?? false;
  if (!isHtml) {
    return false;
  }

  const sample = body.slice(0, 8_000).toLowerCase();
  return (
    sample.includes("cf-chl-") ||
    sample.includes("cloudflare") ||
    sample.includes("just a moment") ||
    sample.includes("verify you are human")
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
