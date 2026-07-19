import { NextResponse } from "next/server";

import { ITCH_RECOMMENDATION_STATES, type ItchRecommendationState } from "@/lib/modules/itch-discovery/contract";
import { apiFailureResponseInit, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
import { getItchRecommendationFeed } from "@/lib/modules/itch-discovery/services/getItchRecommendationFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? "unseen";
    if (!ITCH_RECOMMENDATION_STATES.includes(state as ItchRecommendationState)) {
      throw new TypeError(`Unsupported recommendation state: ${state}`);
    }

    return NextResponse.json(
      getItchRecommendationFeed({
        profileId: url.searchParams.get("profileId") ?? undefined,
        state: state as ItchRecommendationState,
        limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 100),
        offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100000),
      }),
    );
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

function parseQueryInteger(value: string | null, field: string, minimum: number, maximum: number): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`${field} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}
