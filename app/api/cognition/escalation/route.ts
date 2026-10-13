import {
  NextResponse,
} from "next/server";

import {
  getEscalationEngine,
  type EscalationContext,
  type EscalationPolicy,
} from "@chernobog/models/escalationEngine";

import type {
  ConfidenceAssessment,
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
        confidence?:
          ConfidenceAssessment;

        verification?:
          CriticVerificationResult;

        orchestration?:
          MultiModelOrchestrationResult;

        modelRoute?:
          ModelRouteDecision;

        reasoningContract?:
          ReasoningContract;

        context?:
          EscalationContext;

        policy?:
          Partial<
            EscalationPolicy
          >;
      };

    if (
      !body.confidence ||
      !body.verification ||
      !body.orchestration ||
      !body.modelRoute ||
      !body.reasoningContract
    ) {
      throw new Error(
        "confidence, verification, orchestration, modelRoute, and reasoningContract are required. Run OH-4M/OH-4O/OH-4S/OH-4T/OH-4U before OH-4V.",
      );
    }

    const decision =
      getEscalationEngine()
        .decide({
          confidence:
            body.confidence,
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
          policy:
            body.policy,
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