import {
  NextResponse,
} from "next/server";

import {
  getDecisionProvenanceRecorder,
  type DecisionProvenanceInput,
} from "@chernobog/models/decisionProvenance";

export const runtime =
  "nodejs";

function failure(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    },
    {
      status,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        record?:
          DecisionProvenanceInput;
      };

    if (
      !body.record
    ) {
      throw new Error(
        "record is required. OH-4AA records structured decision provenance, not hidden chain-of-thought.",
      );
    }

    const result =
      await getDecisionProvenanceRecorder()
        .record(
          body.record,
        );

    return NextResponse.json({
      ok:
        true,

      result,
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const correlationId =
      url.searchParams
        .get(
          "correlationId",
        )
        ?.trim();

    if (
      !correlationId
    ) {
      throw new Error(
        "correlationId query parameter is required.",
      );
    }

    const limitRaw =
      url.searchParams
        .get(
          "limit",
        );

    const limit =
      limitRaw
        ? Number(
            limitRaw,
          )
        : 100;

    if (
      !Number.isInteger(
        limit,
      ) ||
      limit < 1
    ) {
      throw new Error(
        "limit must be a positive integer.",
      );
    }

    const records =
      await getDecisionProvenanceRecorder()
        .findByCorrelationId(
          correlationId,
          limit,
        );

    return NextResponse.json({
      ok:
        true,

      records,
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}