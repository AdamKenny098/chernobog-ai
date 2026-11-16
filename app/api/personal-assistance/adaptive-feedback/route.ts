import { NextResponse } from "next/server";
import { readLiveAdaptiveRecommendations } from "@chernobog/personal-assistance/adaptiveRecommendations/liveSnapshot";
import {
  liveAdaptiveFeedbackStore,
  type AdaptiveFeedbackAction,
} from "@chernobog/personal-assistance/adaptiveRecommendations/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };
const REQUEST_FIELDS = new Set(["actionKey", "recommendationId", "expectedRevision", "verdict", "revisitAt"]);

/** Read-only, metadata-only feedback audit; no titles, raw notifications or source secrets. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("recommendationId");
  const rawLimit = url.searchParams.get("limit");
  if (!id || !/^recommendation:(responsibility|health):[A-Za-z0-9_-]+$/u.test(id) ||
      (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100))) {
    return NextResponse.json({ ok: false, error: "invalid_feedback_query" },
      { status: 400, headers: HEADERS });
  }
  try {
    const store = await liveAdaptiveFeedbackStore();
    return NextResponse.json({
      ok: true,
      feedback: store.get(id),
      history: store.history(id, rawLimit === null ? 20 : Number(rawLimit)),
      boundaries: { readOnly: true, changesPreferences: false, changesReminders: false },
    }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ ok: false, error: "adaptive_feedback_unavailable" },
      { status: 503, headers: HEADERS });
  }
}

/** Explicit owner action only; same-origin browser requests, no automatic feedback. */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if ((origin !== null && origin !== url.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false, error: "cross_origin_feedback_rejected" },
      { status: 403, headers: HEADERS });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "json_required" },
      { status: 415, headers: HEADERS });
  }
  try {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error("Feedback request too large.");
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some((key) => !REQUEST_FIELDS.has(key))) {
      throw new Error("Unknown feedback fields.");
    }
    const input = body as AdaptiveFeedbackAction;
    if (typeof input.recommendationId !== "string") throw new Error("Recommendation ID required.");
    const snapshot = await readLiveAdaptiveRecommendations(url.origin);
    const current = snapshot.items.find((item) => item.id === input.recommendationId);
    if (!current) {
      return NextResponse.json({ ok: false, error: "recommendation_stale_or_unknown" },
        { status: 409, headers: HEADERS });
    }
    const store = await liveAdaptiveFeedbackStore();
    const result = store.record(current, input);
    return NextResponse.json({ ok: true, ...result,
      boundaries: { explicitOnly: true, inferredLearning: false, changesProfile: false,
        sendsMessages: false, changesDnd: false, schedulesWork: false },
    }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ ok: false, error: "adaptive_feedback_rejected" },
      { status: 400, headers: HEADERS });
  }
}
