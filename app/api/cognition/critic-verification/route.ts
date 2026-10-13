import {
  NextResponse,
} from "next/server";

import {
  CriticVerificationLayer,
  type VerificationEvidenceBundle,
} from "@chernobog/models/criticVerificationLayer";

import {
  getGatewayCognitiveModelExecutor,
} from "@chernobog/models/multiModelGatewayExecutor";

import type {
  ModelRoutingCandidate,
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
        orchestration?:
          MultiModelOrchestrationResult;

        reasoningContract?:
          ReasoningContract;

        evidence?:
          VerificationEvidenceBundle;

        criticCandidate?:
          ModelRoutingCandidate;

        requireIndependentCritic?:
          boolean;

        timeoutMs?:
          number;
      };

    if (
      !body.orchestration
    ) {
      throw new Error(
        "orchestration is required. Run OH-4S before OH-4T.",
      );
    }

    if (
      !body.reasoningContract
    ) {
      throw new Error(
        "reasoningContract is required. Run OH-4O before OH-4T.",
      );
    }

    const layer =
      new CriticVerificationLayer(
        getGatewayCognitiveModelExecutor(),
      );

    const result =
      await layer.verify({
        orchestration:
          body.orchestration,
        reasoningContract:
          body.reasoningContract,
        evidence:
          body.evidence,
        criticCandidate:
          body.criticCandidate,
        requireIndependentCritic:
          body.requireIndependentCritic,
        timeoutMs:
          body.timeoutMs,
      });

    return NextResponse.json({
      ok:
        true,
      result,
    });
  } catch (error) {
    return failure(error);
  }
}