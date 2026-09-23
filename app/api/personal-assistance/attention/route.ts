import {
  NextResponse,
} from "next/server";

import {
  getPersonalAttentionSnapshot,
  isPersonalAttentionState,
  listPersonalAttentionAudit,
  resetPersonalAttention,
  setPersonalAttention,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";

type JsonObject =
  Record<string, unknown>;

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function optionalString(
  body: JsonObject,
  key: string,
): string | undefined {
  const value =
    body[key];

  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : undefined;
}

function optionalPositiveNumber(
  body: JsonObject,
  key: string,
): number | undefined {
  const value =
    body[key];

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return undefined;
  }

  return value;
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );
    const includeAudit =
      url.searchParams.get(
        "includeAudit",
      ) === "true";

    return NextResponse.json({
      ok: true,
      attention:
        getPersonalAttentionSnapshot(),
      audit:
        includeAudit
          ? listPersonalAttentionAudit()
          : undefined,
      executionBoundary: {
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_attention_read_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as unknown;

    if (!isObject(body)) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    const state =
      body.state;

    if (
      !isPersonalAttentionState(
        state,
      )
    ) {
      throw new Error(
        "state must be available, busy, away, or do-not-disturb.",
      );
    }

    const explicitExpiresAt =
      optionalString(
        body,
        "expiresAt",
      );
    const durationMinutes =
      optionalPositiveNumber(
        body,
        "durationMinutes",
      );

    if (
      explicitExpiresAt &&
      durationMinutes
    ) {
      throw new Error(
        "Use expiresAt or durationMinutes, not both.",
      );
    }

    const expiresAt =
      durationMinutes
        ? new Date(
            Date.now() +
              durationMinutes *
                60_000,
          ).toISOString()
        : explicitExpiresAt;

    const attention =
      setPersonalAttention({
        state,
        expiresAt,
        reason:
          optionalString(
            body,
            "reason",
          ),
      });

    return NextResponse.json({
      ok: true,
      attention,
      executionBoundary: {
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_attention_update_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => ({}),
        );

    const reason =
      isObject(body)
        ? optionalString(
            body,
            "reason",
          )
        : undefined;

    return NextResponse.json({
      ok: true,
      attention:
        resetPersonalAttention(
          reason ??
            "Explicit personal attention override cleared.",
        ),
      executionBoundary: {
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "personal_attention_reset_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}