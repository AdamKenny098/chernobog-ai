import { NextResponse } from "next/server";
import { getWorkScheduleStatus } from "@chernobog/personal-assistance/workSchedule";
import { getGoogleCalendarStatus } from "@chernobog/personal-assistance/calendar";
import { getPersonalAssistanceProfile } from "@chernobog/personal-assistance/profileStore";
import { buildScheduleCalendarDiagnostics } from "@chernobog/personal-assistance/scheduleCalendarAuthority/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only diagnostic summary. Uses local PA-4/PA-5 state, never calls Google. */
export async function GET(request: Request) {
  try {
    const [schedule, calendar] = await Promise.all([
      getWorkScheduleStatus(),
      getGoogleCalendarStatus(new URL(request.url).origin),
    ]);
    const profile = getPersonalAssistanceProfile();
    return NextResponse.json(
      { ok: true, diagnostics: buildScheduleCalendarDiagnostics(schedule, calendar, profile.timeZone) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "schedule_calendar_diagnostics_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
