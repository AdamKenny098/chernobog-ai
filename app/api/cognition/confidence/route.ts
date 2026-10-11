import {
  NextResponse,
} from "next/server";

import {
  getConfidenceEngine,
  type ConfidenceContextEvidence,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

import type {
  ModelRouteDecision,
} from "@chernobog/models/modelDecisionRouter";

import type {
  MultiModelOrchestrationResult,
} from "@chernobog/models/multiModelOrchestrator";

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
        verification?:
          CriticVerificationResult;

        orchestration?:
          MultiModelOrchestrationResult;

        modelRoute?:
          ModelRouteDecision;

        reasoningContract?:
          ReasoningContract;

        context?:
          ConfidenceContextEvidence;
      };

    if (
      !body.verification ||
      !body.orchestration ||
      !body.modelRoute ||
      !body.reasoningContract
    ) {
      throw new Error(
        "verification, orchestration, modelRoute, and reasoningContract are required. Run OH-4M/OH-4O/OH-4S/OH-4T before OH-4U.",
      );
    }

    const assessment =
      getConfidenceEngine()
        .assess({
          verification:
            body.verification,
          orchestration:
            body.orchestration,
          modelRoute:
            body.modelRoute,
          reasoningContract:
            body.reasoningContract,
          context:
            body.context,
        });

    return NextResponse.json({
      ok:
        true,
      assessment,
    });
  } catch (error) {
    return failure(error);
  }
}