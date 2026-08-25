import type {
  WorldStateFreshness,
  WorldStateFreshnessBasis,
  WorldStateFreshnessStatus,
} from "./types";

export interface WorldStateFreshnessInput {
  observedAt: string;
  expiresAt?: string;
  basis?: WorldStateFreshnessBasis;
  ttlMs?: number;
}

export interface WorldStateFreshnessOptions {
  now?: Date;
  agingWindowMs?: number;
}

function timestampMs(value: string, field: string): number {
  const result = new Date(value).getTime();
  if (Number.isNaN(result)) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
  return result;
}

export function normalizeWorldStateTtlMs(
  ttlMs: number | undefined,
): number | undefined {
  if (ttlMs === undefined) {
    return undefined;
  }

  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error("worldState freshness TTL must be a finite number >= 0.");
  }

  return ttlMs;
}

export function resolveWorldStateExpiry(
  observedAt: string,
  ttlMs: number,
): string {
  const observedAtMs = timestampMs(
    observedAt,
    "worldState.observedAt",
  );
  const normalizedTtl = normalizeWorldStateTtlMs(ttlMs);

  if (normalizedTtl === undefined) {
    throw new Error("worldState freshness TTL is required.");
  }

  return new Date(observedAtMs + normalizedTtl).toISOString();
}

export function determineWorldStateFreshness(
  input: WorldStateFreshnessInput,
  options: WorldStateFreshnessOptions = {},
): WorldStateFreshnessStatus {
  if (!input.expiresAt) {
    return "unknown";
  }

  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const observedAtMs = timestampMs(
    input.observedAt,
    "worldState.observedAt",
  );
  const expiresAtMs = timestampMs(
    input.expiresAt,
    "worldState.expiresAt",
  );
  const lifetimeMs = Math.max(0, expiresAtMs - observedAtMs);

  if (nowMs >= expiresAtMs) {
    return "stale";
  }

  const requestedAgingWindow = Math.max(
    0,
    options.agingWindowMs ?? 60_000,
  );
  const agingWindowMs = Math.min(
    requestedAgingWindow,
    lifetimeMs,
  );
  const agingAtMs = expiresAtMs - agingWindowMs;

  return nowMs >= agingAtMs ? "aging" : "fresh";
}

export function buildWorldStateFreshness(
  input: WorldStateFreshnessInput,
  options: WorldStateFreshnessOptions = {},
): WorldStateFreshness {
  const now = options.now ?? new Date();
  const ttlMs = normalizeWorldStateTtlMs(input.ttlMs);
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt).toISOString()
    : undefined;
  const basis =
    input.basis ??
    (expiresAt ? "explicit-expiry" : "none");

  if (basis === "none" && expiresAt) {
    throw new Error(
      "worldState freshness basis cannot be none when expiresAt is present.",
    );
  }

  if (basis === "ttl" && ttlMs === undefined) {
    throw new Error(
      "worldState freshness basis ttl requires freshnessTtlMs.",
    );
  }

  return {
    status: determineWorldStateFreshness(
      {
        observedAt: input.observedAt,
        expiresAt,
      },
      {
        ...options,
        now,
      },
    ),
    basis,
    expiresAt,
    ttlMs,
    evaluatedAt: now.toISOString(),
  };
}
