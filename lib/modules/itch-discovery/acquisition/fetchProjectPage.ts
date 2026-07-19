import {
  ItchProjectPageBlockedError,
  ItchProjectPageFetchError,
} from "../errors";
import {
  assertAllowedItchUrl,
  canonicalizeItchProjectUrl,
} from "./canonicalizeItchUrl";
import {
  DEFAULT_PROJECT_PAGE_MAX_BYTES,
  DEFAULT_PROJECT_PAGE_MAX_REDIRECTS,
  DEFAULT_PROJECT_PAGE_RETRY_COUNT,
  DEFAULT_PROJECT_PAGE_TIMEOUT_MS,
  ITCH_PROJECT_PAGE_ACCEPT,
  ITCH_PROJECT_PAGE_USER_AGENT,
  PROJECT_PAGE_RETRYABLE_HTTP_STATUSES,
} from "./projectPageRequestPolicy";
import type { ItchProjectPageFetchResult } from "./types";

export type ItchProjectPageFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  retryCount?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
};

export async function fetchItchProjectPage(
  value: string,
  options: ItchProjectPageFetchOptions = {},
): Promise<ItchProjectPageFetchResult> {
  const canonicalUrl = canonicalizeItchProjectUrl(value);
  if (!canonicalUrl) {
    throw new ItchProjectPageFetchError(
      `Invalid itch.io project URL: ${value}`,
      { code: "ITCH_PROJECT_INVALID_URL" },
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROJECT_PAGE_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_PROJECT_PAGE_MAX_BYTES;
  const maxRedirects =
    options.maxRedirects ?? DEFAULT_PROJECT_PAGE_MAX_REDIRECTS;
  const retryCount = options.retryCount ?? DEFAULT_PROJECT_PAGE_RETRY_COUNT;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => new Date());

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetchWithRedirects({
        sourceUrl: canonicalUrl,
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

      await sleep(600 * 2 ** attempt);
    }
  }

  throw new ItchProjectPageFetchError(
    "Project page fetch failed without a captured error.",
    { cause: lastError },
  );
}

async function fetchWithRedirects(input: {
  sourceUrl: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  now: () => Date;
}): Promise<ItchProjectPageFetchResult> {
  let currentUrl = input.sourceUrl;

  for (
    let redirectCount = 0;
    redirectCount <= input.maxRedirects;
    redirectCount += 1
  ) {
    const response = await requestOnce(
      currentUrl,
      input.fetchImpl,
      input.timeoutMs,
    );

    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ItchProjectPageFetchError(
          `itch.io returned redirect status ${response.status} without a Location header.`,
          {
            code: "ITCH_PROJECT_INVALID_REDIRECT",
            statusCode: response.status,
          },
        );
      }

      if (redirectCount >= input.maxRedirects) {
        throw new ItchProjectPageFetchError(
          "itch.io project redirect limit exceeded.",
          {
            code: "ITCH_PROJECT_REDIRECT_LIMIT",
            statusCode: response.status,
          },
        );
      }

      const resolved = new URL(location, currentUrl).toString();
      assertAllowedItchUrl(resolved, "project");
      const redirectedCanonicalUrl = canonicalizeItchProjectUrl(resolved);
      if (!redirectedCanonicalUrl) {
        throw new ItchProjectPageFetchError(
          "itch.io redirected the project request to a non-project page.",
          {
            code: "ITCH_PROJECT_INVALID_REDIRECT_TARGET",
            statusCode: response.status,
          },
        );
      }

      currentUrl = redirectedCanonicalUrl;
      continue;
    }

    const fetchedAt = input.now().toISOString();

    if (response.status === 404 || response.status === 410) {
      return {
        status: "unavailable",
        sourceUrl: input.sourceUrl,
        finalUrl: currentUrl,
        fetchedAt,
        statusCode: response.status,
      };
    }

    if (response.status === 403) {
      throw new ItchProjectPageBlockedError(
        "itch.io rejected the project metadata request with HTTP 403. Chernobog will not attempt to bypass the restriction.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new ItchProjectPageFetchError(
        `itch.io project request failed with HTTP ${response.status}.`,
        {
          code: PROJECT_PAGE_RETRYABLE_HTTP_STATUSES.has(response.status)
            ? "ITCH_PROJECT_TRANSIENT_HTTP_ERROR"
            : "ITCH_PROJECT_HTTP_ERROR",
          statusCode: response.status,
        },
      );
    }

    const contentLength = parseContentLength(
      response.headers.get("content-length"),
    );
    if (contentLength !== undefined && contentLength > input.maxBytes) {
      throw new ItchProjectPageFetchError(
        `itch.io project response exceeded the ${input.maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_PROJECT_RESPONSE_TOO_LARGE" },
      );
    }

    const contentType = response.headers.get("content-type") ?? undefined;
    if (contentType && !isHtmlContentType(contentType)) {
      throw new ItchProjectPageFetchError(
        `itch.io project request returned unsupported content type: ${contentType}.`,
        { code: "ITCH_PROJECT_UNEXPECTED_CONTENT_TYPE" },
      );
    }

    const body = await readResponseTextWithLimit(response, input.maxBytes);
    if (looksLikeAccessChallenge(contentType, body)) {
      throw new ItchProjectPageBlockedError(
        "itch.io returned an access challenge instead of a project page. Chernobog will retain existing metadata and try again later.",
        response.status,
      );
    }

    return {
      status: "fetched",
      sourceUrl: input.sourceUrl,
      finalUrl: currentUrl,
      fetchedAt,
      body,
      contentType,
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };
  }

  throw new ItchProjectPageFetchError(
    "itch.io project redirect handling ended unexpectedly.",
  );
}

async function requestOnce(
  url: string,
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
        Accept: ITCH_PROJECT_PAGE_ACCEPT,
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "User-Agent": ITCH_PROJECT_PAGE_USER_AGENT,
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ItchProjectPageFetchError(
        `itch.io project request timed out after ${timeoutMs}ms.`,
        { code: "ITCH_PROJECT_TIMEOUT", cause: error },
      );
    }

    throw new ItchProjectPageFetchError(
      "Network failure while requesting an itch.io project page.",
      { code: "ITCH_PROJECT_NETWORK_ERROR", cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new ItchProjectPageFetchError(
        `itch.io project response exceeded the ${maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_PROJECT_RESPONSE_TOO_LARGE" },
      );
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ItchProjectPageFetchError(
        `itch.io project response exceeded the ${maxBytes.toLocaleString()} byte limit.`,
        { code: "ITCH_PROJECT_RESPONSE_TOO_LARGE" },
      );
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ItchProjectPageFetchError)) {
    return false;
  }

  return (
    error.code === "ITCH_PROJECT_NETWORK_ERROR" ||
    error.code === "ITCH_PROJECT_TIMEOUT" ||
    error.code === "ITCH_PROJECT_TRANSIENT_HTTP_ERROR"
  );
}

function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

function parseContentLength(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function isHtmlContentType(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("text/html") ||
    normalized.includes("application/xhtml+xml")
  );
}

function looksLikeAccessChallenge(
  contentType: string | undefined,
  body: string,
): boolean {
  const isHtml = !contentType || isHtmlContentType(contentType);
  if (!isHtml) {
    return false;
  }

  const sample = body.slice(0, 12_000).toLowerCase();
  return (
    sample.includes("cf-chl-") ||
    sample.includes("cloudflare") ||
    sample.includes("just a moment") ||
    sample.includes("verify you are human") ||
    sample.includes("checking your browser")
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
