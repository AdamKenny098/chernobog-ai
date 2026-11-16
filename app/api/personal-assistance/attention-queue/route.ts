import { NextResponse } from "next/server";
import { getResponsibilityLedger } from "@chernobog/personal-assistance/responsibilities";
import { getWorkScheduleStatus } from "@chernobog/personal-assistance/workSchedule";
import { getGoogleCalendarStatus } from "@chernobog/personal-assistance/calendar";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { buildScheduleCalendarDiagnostics } from "@chernobog/personal-assistance/scheduleCalendarAuthority/diagnostics";
import {
  buildUnifiedAttentionQueue,
  type UnifiedAttentionLane,
} from "@chernobog/personal-assistance/unifiedAttentionQueue/readModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANES: ReadonlySet<string> = new Set(["now", "upcoming", "waiting", "review"]);

/** An aggregate read. No notification replay, mutations, or proactive delivery. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const rawLane = url.searchParams.get("lane");
  if (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
      Number(rawLimit) < 1 || Number(rawLimit) > 100)) {
    return NextResponse.json(
      { ok: false, error: "invalid_limit" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (rawLane !== null && !LANES.has(rawLane)) {
    return NextResponse.json(
      { ok: false, error: "invalid_lane" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const now = new Date();
    const [responsibilities, schedule, calendar] = await Promise.all([
      getResponsibilityLedger().list({ includeClosed: false }),
      getWorkScheduleStatus(now),
      getGoogleCalendarStatus(url.origin),
    ]);
    const profile = getPersonalAssistanceProfile();
    const diagnostics = buildScheduleCalendarDiagnostics(
      schedule, calendar, profile.timeZone, now,
    );
    const queue = buildUnifiedAttentionQueue(responsibilities, diagnostics, now, {
      limit: rawLimit === null ? undefined : Number(rawLimit),
      lane: rawLane === null ? undefined : rawLane as UnifiedAttentionLane,
    });
    return NextResponse.json(
      { ok: true, queue },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "unified_attention_queue_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
