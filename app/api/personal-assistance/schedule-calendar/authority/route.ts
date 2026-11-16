import {
  NextResponse,
} from "next/server";
import {
  getWorkScheduleStatus,
} from "@chernobog/personal-assistance/workSchedule";
import {
  getGoogleCalendarStatus,
} from "@chernobog/personal-assistance/calendar";
import {
  buildScheduleCalendarAuthority,
} from "@chernobog/personal-assistance/scheduleCalendarAuthority/readModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only OH-6E authority summary. No OAuth, sync, or calendar mutation. */
export async function GET(request: Request) {
  try {
    const [schedule, calendar] = await Promise.all([
      getWorkScheduleStatus(),
      getGoogleCalendarStatus(new URL(request.url).origin),
    ]);

    return NextResponse.json(
      {
        ok: true,
        authority: buildScheduleCalendarAuthority(
          schedule,
          calendar,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Avoid returning OAuth/configuration or persistence exception details.
    return NextResponse.json(
      {
        ok: false,
        error: "schedule_calendar_authority_unavailable",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
