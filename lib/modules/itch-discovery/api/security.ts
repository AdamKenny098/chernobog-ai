import {
  ItchApiRateLimitError,
  ItchApiSecurityError,
} from "../errors";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitRecord>();

export type ItchMutationGuardOptions = {
  limit?: number;
  windowMs?: number;
  now?: number;
};

export function guardItchMutationRequest(
  request: Request,
  bucket: string,
  options: ItchMutationGuardOptions = {},
): void {
  assertTrustedItchMutationOrigin(request);
  enforceItchApiRateLimit(request, bucket, options);
}

export function assertTrustedItchMutationOrigin(request: Request): void {
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    throw new ItchApiSecurityError("Cross-site Game Radar mutations are blocked.", {
      code: "GAME_RADAR_CROSS_SITE_BLOCKED",
    });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return;
  }

  let originUrl: URL;
  let requestUrl: URL;
  try {
    originUrl = new URL(origin);
    requestUrl = new URL(request.url);
  } catch {
    throw new ItchApiSecurityError("The request origin was invalid.", {
      code: "GAME_RADAR_ORIGIN_INVALID",
    });
  }

  if (originUrl.protocol !== requestUrl.protocol || originUrl.host !== requestUrl.host) {
    throw new ItchApiSecurityError("The request origin does not match Chernobog.", {
      code: "GAME_RADAR_ORIGIN_MISMATCH",
    });
  }
}

export function enforceItchApiRateLimit(
  request: Request,
  bucket: string,
  options: ItchMutationGuardOptions = {},
): void {
  const now = options.now ?? Date.now();
  const limit = clamp(options.limit ?? 60, 1, 10_000);
  const windowMs = clamp(options.windowMs ?? 60_000, 1_000, 24 * 60 * 60_000);
  const key = `${bucket}:${requestIdentity(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(now);
    return;
  }

  if (current.count >= limit) {
    throw new ItchApiRateLimitError((current.resetAt - now) / 1000);
  }

  current.count += 1;
}

export function resetItchApiRateLimits(): void {
  buckets.clear();
}

function requestIdentity(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "local";
}

function pruneExpired(now: number): void {
  if (buckets.size < 500) return;
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
