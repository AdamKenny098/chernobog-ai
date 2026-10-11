import {
  NextResponse,
} from "next/server";

import {
  getAuthorityBridge,
  type AuthorityApprovalSnapshot,
  type CognitiveAuthorityProposal,
} from "@chernobog/models/authorityBridge";

import type {
  CognitiveGovernanceSnapshot,
} from "@/lib/chernobog/cognition/actionTypes";

import type {
  ConfidenceAssessment,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

import type {
  EscalationDecision,
} from "@chernobog/models/escalationEngine";

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
        proposal?:
          CognitiveAuthorityProposal;

        governance?:
          CognitiveGovernanceSnapshot;

        reasoningContract?:
          ReasoningContract;

        verification?:
          CriticVerificationResult;

        confidence?:
          ConfidenceAssessment;

        escalation?:
          EscalationDecision;

        approval?:
          AuthorityApprovalSnapshot;

        safetyBlocks?:
          string[];
      };

    if (
      !body.proposal ||
      !body.governance ||
      !body.reasoningContract ||
      !body.verification ||
      !body.confidence ||
      !body.escalation
    ) {
      throw new Error(
        "proposal, governance, reasoningContract, verification, confidence, and escalation are required. OH-4W only bridges fully evaluated cognitive proposals into existing authority.",
      );
    }

    const decision =
      getAuthorityBridge()
        .decide({
          proposal:
            body.proposal,
          governance:
            body.governance,
          reasoningContract:
            body.reasoningContract,
          verification:
            body.verification,
          confidence:
            body.confidence,
          escalation:
            body.escalation,
          approval:
            body.approval,
          safetyBlocks:
            body.safetyBlocks,
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