import {
  NextResponse,
} from "next/server";

import {
  getReasoningContractBuilder,
} from "@chernobog/models/reasoningContracts";

import type {
  InputInterpretation,
} from "@chernobog/models/inputInterpreter";

import type {
  StrategyRouteDecision,
} from "@chernobog/models/strategyRouter";

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
        strategyRoute?:
          StrategyRouteDecision;
      };

    if (
      !body.interpretation
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4O.",
      );
    }

    if (
      !body.strategyRoute
    ) {
      throw new Error(
        "strategyRoute is required. Run OH-4N before OH-4O.",
      );
    }

    const contract =
      getReasoningContractBuilder()
        .build({
          interpretation:
            body.interpretation,
          strategyRoute:
            body.strategyRoute,
        });

    return NextResponse.json({
      ok:
        true,
      contract,
    });
  } catch (error) {
    return failure(error);
  }
}