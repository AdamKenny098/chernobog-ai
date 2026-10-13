import {
  NextResponse,
} from "next/server";

import {
  getStrategyRouter,
  type StrategyRoutingConstraints,
} from "@chernobog/models/strategyRouter";

import type {
  InputInterpretation,
} from "@chernobog/models/inputInterpreter";

import type {
  ModelRouteDecision,
} from "@chernobog/models/modelDecisionRouter";

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
        modelRoute?:
          ModelRouteDecision;
        constraints?:
          StrategyRoutingConstraints;
      };

    if (
      !body.interpretation
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4N.",
      );
    }

    if (
      !body.modelRoute
    ) {
      throw new Error(
        "modelRoute is required. Run OH-4M before OH-4N.",
      );
    }

    const decision =
      getStrategyRouter()
        .route({
          interpretation:
            body.interpretation,
          modelRoute:
            body.modelRoute,
          constraints:
            body.constraints,
        });

    return NextResponse.json({
      ok:
        true,
      decision,
    });
  } catch (error) {
    return failure(error);
  }
}