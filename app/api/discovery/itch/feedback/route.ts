import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  ITCH_FEEDBACK_CANDIDATE_STATUSES,
  type ItchFeedbackCandidateStatus,
} from "@/lib/modules/itch-discovery/contract";
import {
  apiFailureResponseInit,
  isRecord,
  optionalFiniteNumber,
  optionalString,
  readJsonObject,
  requiredString,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import {
  ItchFeedbackRepository,
  ItchPreferenceRepository,
} from "@/lib/modules/itch-discovery/repositories";
import { applyItchFeedbackLearning } from "@/lib/modules/itch-discovery/services/applyItchFeedbackLearning";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import { recordItchPreferenceSignal } from "@/lib/modules/itch-discovery/services/recordItchPreferenceSignal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const url = new URL(request.url);
    const preferences = new ItchPreferenceRepository(database);
    const profile = url.searchParams.get("profileId")
      ? preferences.findProfileById(url.searchParams.get("profileId")!)
      : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Preference profile not found.", code: "GAME_RADAR_NOT_FOUND" },
        { status: 404 },
      );
    }
    const rawStatus = url.searchParams.get("status") as
      | ItchFeedbackCandidateStatus
      | null;
    if (rawStatus && !ITCH_FEEDBACK_CANDIDATE_STATUSES.includes(rawStatus)) {
      throw new TypeError(`Unsupported feedback candidate status: ${rawStatus}`);
    }
    const feedback = new ItchFeedbackRepository(database);
    return NextResponse.json({
      profile,
      candidates: feedback.listCandidates(profile.id, rawStatus ?? undefined),
      appliedSignals: feedback.countAppliedSignals(profile.id),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "feedback:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const action = optionalString(body.action, "action") ?? "signal";
    if (action === "learn") {
      const result = applyItchFeedbackLearning({
        profileId: optionalString(body.profileId, "profileId"),
      });
      return NextResponse.json(result);
    }
    if (action !== "signal") {
      throw new TypeError(`Unsupported feedback action: ${action}`);
    }
    const signalType = requiredString(body.signalType, "signalType");
    if (signalType !== "more_like_this" && signalType !== "less_like_this") {
      throw new TypeError(
        "signalType must be more_like_this or less_like_this.",
      );
    }
    const result = recordItchPreferenceSignal({
      gameId: optionalString(body.gameId, "gameId"),
      recommendationId: optionalString(
        body.recommendationId,
        "recommendationId",
      ),
      profileId: optionalString(body.profileId, "profileId"),
      signalType,
      signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
      metadata: isRecord(body.metadata) ? body.metadata : undefined,
    });
    return NextResponse.json(result, { status: result.signalCreated ? 201 : 200 });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "feedback:patch", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const status = requiredString(body.status, "status") as ItchFeedbackCandidateStatus;
    if (!ITCH_FEEDBACK_CANDIDATE_STATUSES.includes(status)) {
      throw new TypeError(`Unsupported feedback candidate status: ${status}`);
    }
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const candidate = new ItchFeedbackRepository(database).updateCandidateStatus(
      requiredString(body.id, "id"),
      status,
    );
    if (!candidate) {
      return NextResponse.json(
        { error: "Feedback candidate not found.", code: "GAME_RADAR_NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json({ candidate });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
