import type {
  WorldStateFreshnessStatus,
} from "./types";
import type {
  WorldStateReadQuery,
} from "./queryTypes";

const VALID_FRESHNESS =
  new Set<WorldStateFreshnessStatus>([
    "fresh",
    "aging",
    "stale",
    "unknown",
  ]);

function optionalText(
  value: string | null,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : undefined;
}

function parseFreshness(
  value: string | null,
): WorldStateFreshnessStatus[] | undefined {
  const normalized =
    optionalText(value);

  if (!normalized) {
    return undefined;
  }

  const statuses =
    [...new Set(
      normalized
        .split(",")
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    )];

  for (const status of statuses) {
    if (
      !VALID_FRESHNESS.has(
        status as WorldStateFreshnessStatus,
      )
    ) {
      throw new Error(
        `Invalid freshness status "${status}".`,
      );
    }
  }

  return statuses as
    WorldStateFreshnessStatus[];
}

function parseConfidence(
  value: string | null,
): number | undefined {
  const normalized =
    optionalText(value);

  if (!normalized) {
    return undefined;
  }

  const parsed =
    Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 1
  ) {
    throw new Error(
      "minConfidence must be between 0 and 1.",
    );
  }

  return parsed;
}

export function parseWorldStateReadQuery(
  searchParams: URLSearchParams,
): WorldStateReadQuery {
  const query: WorldStateReadQuery = {
    key:
      optionalText(
        searchParams.get("key"),
      ),
    namespace:
      optionalText(
        searchParams.get(
          "namespace",
        ),
      ),
    keyPrefix:
      optionalText(
        searchParams.get(
          "keyPrefix",
        ),
      ),
    freshness:
      parseFreshness(
        searchParams.get(
          "freshness",
        ),
      ),
    minConfidence:
      parseConfidence(
        searchParams.get(
          "minConfidence",
        ),
      ),
  };

  if (
    query.key &&
    (
      query.namespace ||
      query.keyPrefix ||
      query.freshness?.length ||
      query.minConfidence !== undefined
    )
  ) {
    throw new Error(
      "key cannot be combined with other World State filters.",
    );
  }

  return query;
}
