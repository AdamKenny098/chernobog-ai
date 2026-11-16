import { NextResponse } from "next/server";
import { readLiveAdaptiveRecommendations } from "@chernobog/personal-assistance/adaptiveRecommendations/liveSnapshot";
import { applyAdaptiveFeedback, liveAdaptiveFeedbackStore } from "@chernobog/personal-assistance/adaptiveRecommendations/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };

/** OH-6K4: read-only, evidence-scoped feedback overlay over the OH-6K2 queue. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const rawIncludeHidden = url.searchParams.get("includeHidden");
  if ((rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
       Number(rawLimit) < 1 || Number(rawLimit) > 100)) ||
      (rawIncludeHidden !== null && rawIncludeHidden !== "true" && rawIncludeHidden !== "false")) {
    return NextResponse.json({ ok: false, error: "invalid_recommendation_query" },
      { status: 400, headers: HEADERS });
  }
  try {
    const now = new Date();
    const snapshot = await readLiveAdaptiveRecommendations(url.origin, now);
    const feedback = await liveAdaptiveFeedbackStore();
    const records = feedback.listFor(snapshot.items.map((item) => item.id));
    const recommendations = applyAdaptiveFeedback(
      snapshot, records, now, rawLimit === null ? 25 : Number(rawLimit), rawIncludeHidden === "true",
    );
    return NextResponse.json({ ok: true, recommendations }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ ok: false, error: "adaptive_recommendations_unavailable" },
      { status: 503, headers: HEADERS });
  }
}
