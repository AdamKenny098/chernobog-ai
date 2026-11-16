import { NextResponse } from "next/server";
import { getResponsibilityLedger } from "@chernobog/personal-assistance/responsibilities";
import { getWorkScheduleStatus } from "@chernobog/personal-assistance/workSchedule";
import { getGoogleCalendarStatus } from "@chernobog/personal-assistance/calendar";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { getPersonalAttentionSnapshot } from "@chernobog/personal-assistance/attentionStore";
import { buildScheduleCalendarDiagnostics } from "@chernobog/personal-assistance/scheduleCalendarAuthority/diagnostics";
import { buildUnifiedAttentionQueue } from "@chernobog/personal-assistance/unifiedAttentionQueue/readModel";
import { assessUnifiedAttentionPolicy } from "@chernobog/personal-assistance/unifiedAttentionQueue/policy";
import { evaluateUnifiedAttentionAcceptance } from "@chernobog/personal-assistance/unifiedAttentionQueue/acceptance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** F3: a single-snapshot, privacy-minimized, aggregate OH-6F acceptance read. */
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
    // PA-1A normally expires elapsed timed attention overrides when read;
    // OH-6F3 never changes the state or bypasses that existing authority.
    const attention = getPersonalAttentionSnapshot(now);
    const queue = buildUnifiedAttentionQueue(
      responsibilities, diagnostics, now,
      { limit: rawLimit === null ? 100 : Number(rawLimit) },
    );
    const policy = assessUnifiedAttentionPolicy(queue, attention, profile);
    const acceptance = evaluateUnifiedAttentionAcceptance(queue, policy);
    const ok = acceptance.status !== "inconsistent";
    return NextResponse.json(
      { ok, acceptance },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "attention_queue_acceptance_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
