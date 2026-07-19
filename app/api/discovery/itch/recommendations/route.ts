import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  ITCH_RECOMMENDATION_STATES,
  ITCH_SIGNAL_TYPES,
  type ItchRecommendationState,
  type ItchSignalType,
} from "@/lib/modules/itch-discovery/contract";
import {
  apiFailureResponseInit,
  optionalFiniteNumber,
  optionalString,
  readJsonObject,
  requiredString,
  toItchApiFailure,
  isRecord,
} from "@/lib/modules/itch-discovery/api/http";
import { recordItchGameAction } from "@/lib/modules/itch-discovery/services/recordItchGameAction";
import { recordItchRecommendationAction } from "@/lib/modules/itch-discovery/services/recordItchRecommendationAction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "recommendations:patch", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const { state, signalType } = readAction(body);

    const result = recordItchRecommendationAction({
      recommendationId: requiredString(body.recommendationId, "recommendationId"),
      state,
      signalType,
      signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
      metadata: isRecord(body.metadata) ? body.metadata : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "recommendations:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const { state, signalType } = readAction(body);

    const result = recordItchGameAction({
      gameId: requiredString(body.gameId, "gameId"),
      profileId: optionalString(body.profileId, "profileId"),
      state,
      signalType,
      signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
      metadata: isRecord(body.metadata) ? body.metadata : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

function readAction(body: Record<string, unknown>): {
  state: ItchRecommendationState;
  signalType?: ItchSignalType;
} {
  const state = requiredString(body.state, "state") as ItchRecommendationState;
  if (!ITCH_RECOMMENDATION_STATES.includes(state)) {
    throw new TypeError(`Unsupported recommendation state: ${state}`);
  }

  const signalType = optionalString(body.signalType, "signalType") as
    | ItchSignalType
    | undefined;
  if (signalType && !ITCH_SIGNAL_TYPES.includes(signalType)) {
    throw new TypeError(`Unsupported signal type: ${signalType}`);
  }

  return { state, signalType };
}
