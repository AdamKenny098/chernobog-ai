import { NextResponse } from "next/server";
import { getResponsibilityLedger } from "@chernobog/personal-assistance/responsibilities";
import { getWorkScheduleStatus } from "@chernobog/personal-assistance/workSchedule";
import { getGoogleCalendarStatus } from "@chernobog/personal-assistance/calendar";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { buildScheduleCalendarDiagnostics } from "@chernobog/personal-assistance/scheduleCalendarAuthority/diagnostics";
import { buildUnifiedAttentionQueue } from "@chernobog/personal-assistance/unifiedAttentionQueue/readModel";
import { assessUnifiedAttentionPolicy } from "@chernobog/personal-assistance/unifiedAttentionQueue/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OH-6F2: assessment only. The OH-6G dispatcher is not called. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  if (rawLimit !== null && (!/^\d{1,3}$/u.test(rawLimit) ||
      Number(rawLimit) < 1 || Number(rawLimit) > 100)) {
    return NextResponse.json(
      { ok: false, error: "invalid_limit" },
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
    });
    // Reuses PA-1A's existing effective attention-state authority. It may
    // expire a timed explicit override through PA-1A's normal lifecycle.
    const attention = getPersonalAttentionSnapshot(now);
    const policy = assessUnifiedAttentionPolicy(queue, attention, profile);
    return NextResponse.json(
      { ok: true, policy },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "attention_queue_policy_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
