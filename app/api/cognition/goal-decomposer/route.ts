import {
  NextResponse,
} from "next/server";

import {
  getGoalDecomposer,
} from "@chernobog/models/goalDecomposer";

import type {
  InputInterpretation,
} from "@chernobog/models/inputInterpreter";

import type {
  ReasoningContract,
} from "@chernobog/models/reasoningContracts";

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
        interpretation?:
          InputInterpretation;
        reasoningContract?:
          ReasoningContract;
      };

    if (
      !body.interpretation
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4P.",
      );
    }

    if (
      !body.reasoningContract
    ) {
      throw new Error(
        "reasoningContract is required. Run OH-4O before OH-4P.",
      );
    }

    const decomposition =
      await getGoalDecomposer()
        .decompose({
          interpretation:
            body.interpretation,
          reasoningContract:
            body.reasoningContract,
        });

    return NextResponse.json({
      ok:
        true,
      decomposition,
    });
  } catch (error) {
    return failure(error);
  }
}