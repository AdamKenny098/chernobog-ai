import {
  NextResponse,
} from "next/server";

import {
  getModelRouter,
  type ModelRoutingConstraints,
  type ModelRoutingEvidence,
} from "@chernobog/models/modelDecisionRouter";
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

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        interpretation?:
          InputInterpretation;
        evidence?:
          ModelRoutingEvidence;
        constraints?:
          ModelRoutingConstraints;
      };

    if (
      !body.interpretation
    ) {
      throw new Error(
        "interpretation is required. Run OH-4J before OH-4M.",
      );
    }

    const decision =
      await getModelRouter()
        .route({
          interpretation:
            body.interpretation,
          evidence:
            body.evidence,
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