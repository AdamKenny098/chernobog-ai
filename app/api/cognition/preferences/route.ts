import {
  NextResponse,
} from "next/server";

import {
  getPreferenceEstimates,
  recordPairwisePreference,
  recordPreferenceRating,
  type PreferenceSubjectKind,
} from "@chernobog/models/preferenceLearning";

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

function subjectKind(
  value: unknown,
): PreferenceSubjectKind {
  if (
    value ===
      "model" ||
    value ===
      "strategy" ||
    value ===
      "candidate"
  ) {
    return value;
  }

  throw new Error(
    "subject.kind must be model, strategy, or candidate.",
  );
}

function readSubject(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new Error(
      "Preference subject must be an object.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return {
    kind:
      subjectKind(
        record.kind,
      ),
    id:
      String(
        record.id ??
        "",
      ),
  };
}

function readContext(
  body:
    Record<string, unknown>,
) {
  return {
    taskClass:
      String(
        body.taskClass ??
        "unspecified",
      ),
    scopeKey:
      typeof body.scopeKey ===
        "string"
        ? body.scopeKey
        : undefined,
    projectKey:
      typeof body.projectKey ===
        "string"
        ? body.projectKey
        : undefined,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const subjectKindValue =
      url.searchParams.get(
        "subjectKind",
      );

    return NextResponse.json({
      ok:
        true,
      preferences:
        await getPreferenceEstimates({
          taskClass:
            url.searchParams.get(
              "taskClass",
            ) ??
            undefined,
          scopeKey:
            url.searchParams.get(
              "scopeKey",
            ) ??
            undefined,
          projectKey:
            url.searchParams.get(
              "projectKey",
            ) ??
            undefined,
          subjectKind:
            subjectKindValue
              ? subjectKind(
                  subjectKindValue,
                )
              : undefined,
          subjectId:
            url.searchParams.get(
              "subjectId",
            ) ??
            undefined,
        }),
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
    const action =
      body.action;

    if (
      action ===
      "rating"
    ) {
      await recordPreferenceRating({
        context:
          readContext(
            body,
          ),
        subject:
          readSubject(
            body.subject,
          ),
        score:
          Number(
            body.score,
          ),
        confidence:
          body.confidence ===
          undefined
            ? undefined
            : Number(
                body.confidence,
              ),
        detail:
          typeof body.detail ===
            "string"
            ? body.detail
            : undefined,
        source:
          body.source ===
            "user-correction"
            ? "user-correction"
            : "explicit-user",
        correlationId:
          typeof body.correlationId ===
            "string"
            ? body.correlationId
            : undefined,
      });

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      action ===
      "pairwise"
    ) {
      await recordPairwisePreference({
        context:
          readContext(
            body,
          ),
        winner:
          readSubject(
            body.winner,
          ),
        loser:
          readSubject(
            body.loser,
          ),
        confidence:
          body.confidence ===
          undefined
            ? undefined
            : Number(
                body.confidence,
              ),
        detail:
          typeof body.detail ===
            "string"
            ? body.detail
            : undefined,
        correlationId:
          typeof body.correlationId ===
            "string"
            ? body.correlationId
            : undefined,
      });

      return NextResponse.json({
        ok:
          true,
      });
    }

    return failure(
      new Error(
        "Unknown preference-learning action.",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}