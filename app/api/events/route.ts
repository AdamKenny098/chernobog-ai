import { NextResponse } from "next/server";

import {
  getChernobogEventBus,
  type ChernobogEventQuery,
} from "@/lib/chernobog/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const MAX_EVENT_LIMIT = 1_000;
const DEFAULT_EVENT_LIMIT = 100;

const ALLOWED_SEVERITIES = new Set([
  "debug",
  "info",
  "notice",
  "warning",
  "critical",
]);

class EventQueryValidationError extends Error {}

function readList(
  searchParams: URLSearchParams,
  singularName: string,
  pluralName: string
): string[] | undefined {
  const values = [
    ...searchParams.getAll(
      singularName
    ),

    ...searchParams
      .getAll(
        pluralName
      )
      .flatMap(
        (value) =>
          value.split(",")
      ),
  ]
    .map(
      (value) =>
        value.trim()
    )
    .filter(
      Boolean
    );

  if (
    values.length === 0
  ) {
    return undefined;
  }

  return [
    ...new Set(
      values
    ),
  ];
}

function readLimit(
  searchParams: URLSearchParams
): number {
  const raw =
    searchParams
      .get("limit")
      ?.trim();

  if (!raw) {
    return DEFAULT_EVENT_LIMIT;
  }

  const parsed =
    Number(raw);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new EventQueryValidationError(
      "Event query limit must be a positive integer."
    );
  }

  if (
    parsed >
    MAX_EVENT_LIMIT
  ) {
    throw new EventQueryValidationError(
      `Event query limit cannot exceed ${MAX_EVENT_LIMIT}.`
    );
  }

  return parsed;
}

function readBoolean(
  searchParams: URLSearchParams,
  name: string,
  fallback: boolean
): boolean {
  const raw =
    searchParams
      .get(name)
      ?.trim()
      .toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (
    raw === "true" ||
    raw === "1"
  ) {
    return true;
  }

  if (
    raw === "false" ||
    raw === "0"
  ) {
    return false;
  }

  throw new EventQueryValidationError(
    `${name} must be true or false.`
  );
}

function readTimestamp(
  searchParams: URLSearchParams,
  name: string
): string | undefined {
  const value =
    searchParams
      .get(name)
      ?.trim();

  if (!value) {
    return undefined;
  }

  const parsed =
    new Date(
      value
    ).getTime();

  if (
    Number.isNaN(
      parsed
    )
  ) {
    throw new EventQueryValidationError(
      `${name} must be a valid timestamp.`
    );
  }

  return value;
}

function buildEventQuery(
  request: Request
): ChernobogEventQuery {
  const url =
    new URL(
      request.url
    );

  const {
    searchParams,
  } = url;

  const types =
    readList(
      searchParams,
      "type",
      "types"
    );

  const typePrefixes =
    readList(
      searchParams,
      "typePrefix",
      "typePrefixes"
    );

  const sources =
    readList(
      searchParams,
      "source",
      "sources"
    );

  const severities =
    readList(
      searchParams,
      "severity",
      "severities"
    );

  if (
    severities
  ) {
    for (
      const severity of
      severities
    ) {
      if (
        !ALLOWED_SEVERITIES.has(
          severity
        )
      ) {
        throw new EventQueryValidationError(
          `Unsupported event severity: ${severity}`
        );
      }
    }
  }

  const correlationId =
    searchParams
      .get("correlationId")
      ?.trim() ||
    undefined;

  const after =
    readTimestamp(
      searchParams,
      "after"
    );

  const before =
    readTimestamp(
      searchParams,
      "before"
    );

  if (
    after &&
    before &&
    new Date(after).getTime() >=
      new Date(before).getTime()
  ) {
    throw new EventQueryValidationError(
      "after must be earlier than before."
    );
  }

  return {
    types,

    typePrefixes,

    sources,

    severities:
      severities as
        ChernobogEventQuery["severities"],

    correlationId,

    after,

    before,

    newestFirst:
      readBoolean(
        searchParams,
        "newestFirst",
        true
      ),

    limit:
      readLimit(
        searchParams
      ),
  };
}

export async function GET(
  request: Request
) {
  try {
    const query =
      buildEventQuery(
        request
      );

    const events =
      await getChernobogEventBus()
        .query(
          query
        );

    return NextResponse.json(
      {
        ok: true,

        count:
          events.length,

        query: {
          types:
            query.types,

          typePrefixes:
            query.typePrefixes,

          sources:
            query.sources,

          severities:
            query.severities,

          correlationId:
            query.correlationId,

          after:
            query.after,

          before:
            query.before,

          newestFirst:
            query.newestFirst,

          limit:
            query.limit,
        },

        events,
      },
      {
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    if (
      error instanceof
      EventQueryValidationError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error.message,
        },
        {
          status: 400,
          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    console.error(
      "Chernobog event history error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to read Chernobog event history.",
      },
      {
        status: 500,
        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}