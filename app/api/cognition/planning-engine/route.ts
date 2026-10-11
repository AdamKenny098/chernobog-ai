import {
  NextResponse,
} from "next/server";

import {
  getCognitivePlanningEngine,
} from "@chernobog/models/cognitivePlanningEngine";

import type {
  GoalDecomposition,
} from "@chernobog/models/goalDecomposer";

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
        decomposition?:
          GoalDecomposition;
        reasoningContract?:
          ReasoningContract;
      };

    if (
      !body.decomposition
    ) {
      throw new Error(
        "decomposition is required. Run OH-4P before OH-4Q.",
      );
    }

    if (
      !body.reasoningContract
    ) {
      throw new Error(
        "reasoningContract is required. Run OH-4O before OH-4Q.",
      );
    }

    const plan =
      getCognitivePlanningEngine()
        .plan({
          decomposition:
            body.decomposition,
          reasoningContract:
            body.reasoningContract,
        });

    return NextResponse.json({
      ok:
        true,
      plan,
    });
  } catch (error) {
    return failure(error);
  }
}