import {
  NextResponse,
} from "next/server";

import {
  getContextEngine,
  type ContextCategory,
} from "@chernobog/models/contextEngine";
import type {
  InputInterpretation,
} from "@chernobog/models/inputInterpreter";

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

function stringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item ===
        "string",
    )
    .map(
      (item) =>
        item.trim(),
    )
    .filter(Boolean);
}

export async function GET() {
  return NextResponse.json({
    ok:
      true,
    sources:
      getContextEngine()
        .listSources(),
  });
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    if (
      !body.interpretation ||
      typeof body.interpretation !==
        "object"
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4K.",
      );
    }

    const packet =
      await getContextEngine()
        .assemble({
          interpretation:
            body.interpretation as
              InputInterpretation,
          projectId:
            typeof body.projectId ===
              "string"
              ? body.projectId
              : undefined,
          requestedCategories:
            stringArray(
              body.requestedCategories,
            ) as
              ContextCategory[],
          requestedSourceIds:
            stringArray(
              body.requestedSourceIds,
            ),
          maxItems:
            typeof body.maxItems ===
              "number"
              ? body.maxItems
              : undefined,
          maxChars:
            typeof body.maxChars ===
              "number"
              ? body.maxChars
              : undefined,
        });

    return NextResponse.json({
      ok:
        true,
      packet,
    });
  } catch (error) {
    return failure(error);
  }
}