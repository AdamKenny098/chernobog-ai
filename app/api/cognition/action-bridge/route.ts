import { NextResponse } from "next/server";

import {
  getActionBridge,
  type ActionBridgeIntent,
} from "@chernobog/models/actionBridge";

import type {
  AuthorityBridgeDecision,
} from "@chernobog/models/authorityBridge";

import type {
  ConfidenceAssessment,
} from "@chernobog/models/confidenceEngine";

import type {
  CriticVerificationResult,
} from "@chernobog/models/criticVerificationLayer";

export const runtime = "nodejs";

function failure(error: unknown, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      authority?: AuthorityBridgeDecision;
      intent?: ActionBridgeIntent;
      verification?: CriticVerificationResult;
      confidence?: ConfidenceAssessment;
    };

    if (!body.authority || !body.intent || !body.verification || !body.confidence) {
      throw new Error(
        "authority, intent, verification, and confidence are required. OH-4X only translates an OH-4W-governed cognitive action into an execution blueprint.",
      );
    }

    const packet = getActionBridge().translate({
      authority: body.authority,
      intent: body.intent,
      verification: body.verification,
      confidence: body.confidence,
    });

    return NextResponse.json({ ok: true, packet });
  } catch (error) {
    return failure(error);
  }
}