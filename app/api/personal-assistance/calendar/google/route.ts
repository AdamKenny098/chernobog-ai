import {
  NextResponse,
} from "next/server";
import {
  configureGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  syncWorkScheduleToGoogleCalendarSafely,
} from "@/lib/chernobog/personalAssistance/calendar";
import {
  getWorkScheduleStatus,
} from "@/lib/chernobog/personalAssistance/workSchedule";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type JsonObject =
  Record<
    string,
    unknown
  >;

function isObject(
  value:
    unknown,
): value is
  JsonObject {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function origin(
  request:
    Request,
): string {
  return new URL(
    request.url,
  ).origin;
}

export async function GET(
  request:
    Request,
) {
  try {
    return NextResponse.json({
      ok:
        true,
      status:
        await getGoogleCalendarStatus(
          origin(
            request,
          ),
        ),
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "google_calendar_status_failed",
        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}

export async function PATCH(
  request:
    Request,
) {
  try {
    const body =
      (await request.json()) as
        unknown;

    if (
      !isObject(
        body,
      )
    ) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    const allowed =
      new Set([
        "calendarId",
        "autoSyncWorkSchedule",
        "eventTitle",
      ]);

    for (
      const key of
      Object.keys(
        body,
      )
    ) {
      if (
        !allowed.has(
          key,
        )
      ) {
        throw new Error(
          `Unknown Google Calendar setting: ${key}`,
        );
      }
    }

    const status =
      await configureGoogleCalendar({
        calendarId:
          typeof body.calendarId ===
            "string"
            ? body.calendarId
            : undefined,
        autoSyncWorkSchedule:
          typeof body.autoSyncWorkSchedule ===
            "boolean"
            ? body.autoSyncWorkSchedule
            : undefined,
        eventTitle:
          typeof body.eventTitle ===
            "string"
            ? body.eventTitle
            : undefined,
      });

    return NextResponse.json({
      ok:
        true,
      status,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "google_calendar_configuration_failed",
        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          400,
      },
    );
  }
}

export async function POST(
  request:
    Request,
) {
  try {
    const schedule =
      await getWorkScheduleStatus();

    if (
      !schedule.snapshot
    ) {
      return NextResponse.json(
        {
          ok:
            false,
          error:
            "work_schedule_unavailable",
          message:
            "PA-4 does not currently have an authoritative work schedule snapshot.",
        },
        {
          status:
            409,
        },
      );
    }

    const sync =
      await syncWorkScheduleToGoogleCalendarSafely(
        schedule.snapshot,
        "manual",
      );

    return NextResponse.json({
      ok:
        sync.disposition !==
        "failed",
      sync,
      status:
        await getGoogleCalendarStatus(
          origin(
            request,
          ),
        ),
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "google_calendar_sync_failed",
        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}

export async function DELETE(
  request:
    Request,
) {
  try {
    return NextResponse.json({
      ok:
        true,
      status:
        await disconnectGoogleCalendar(),
      note:
        "Google authorization removed. Existing Chernobog-managed calendar events are left intact.",
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "google_calendar_disconnect_failed",
        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}