import {
  NextResponse,
} from "next/server";

import {
  getCognitiveTelemetrySummary,
  recordCognitiveUserCorrectionTelemetry,
  recordCognitiveValidationTelemetry,
} from "@chernobog/models/telemetry";

export const runtime =
  "nodejs";

function failure(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok: false,
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

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const requestedLimit =
      Number(
        url.searchParams.get(
          "limit",
        ) ??
        "1000",
      );

    const limit =
      Number.isFinite(
        requestedLimit,
      )
        ? Math.max(
            1,
            Math.min(
              1000,
              Math.trunc(
                requestedLimit,
              ),
            ),
          )
        : 1000;

    return NextResponse.json({
      ok: true,
      summary:
        await getCognitiveTelemetrySummary(
          limit,
        ),
    });
  } catch (error) {
    return failure(
      error,
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  let body:
    Record<string, unknown>;

  try {
    body =
      await request.json();
  } catch (error) {
    return failure(error);
  }

  try {
    const signal =
      body.signal;

    if (
      signal ===
      "validation"
    ) {
      await recordCognitiveValidationTelemetry(
        {
          taskType:
            String(
              body.taskType ??
              "unspecified",
            ),
          provider:
            typeof body.provider ===
              "string"
              ? body.provider
              : undefined,
          model:
            typeof body.model ===
              "string"
              ? body.model
              : undefined,
          validator:
            String(
              body.validator ??
              "unspecified",
            ),
          valid:
            body.valid ===
            true,
          score:
            typeof body.score ===
              "number"
              ? body.score
              : undefined,
          reason:
            typeof body.reason ===
              "string"
              ? body.reason
              : undefined,
        },
        typeof body.correlationId ===
          "string"
          ? body.correlationId
          : undefined,
      );

      return NextResponse.json({
        ok: true,
      });
    }

    if (
      signal ===
      "user-correction"
    ) {
      await recordCognitiveUserCorrectionTelemetry(
        {
          taskType:
            String(
              body.taskType ??
              "unspecified",
            ),
          provider:
            typeof body.provider ===
              "string"
              ? body.provider
              : undefined,
          model:
            typeof body.model ===
              "string"
              ? body.model
              : undefined,
          correctionKind:
            String(
              body.correctionKind ??
              "unspecified",
            ),
          accepted:
            body.accepted !==
            false,
          detail:
            typeof body.detail ===
              "string"
              ? body.detail
              : undefined,
        },
        typeof body.correlationId ===
          "string"
          ? body.correlationId
          : undefined,
      );

      return NextResponse.json({
        ok: true,
      });
    }

    return failure(
      new Error(
        "Unknown cognitive telemetry signal.",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}