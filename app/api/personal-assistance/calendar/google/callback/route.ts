import {
  NextResponse,
} from "next/server";
import {
  completeGoogleCalendarConnection,
  syncWorkScheduleToGoogleCalendarSafely,
} from "@/lib/chernobog/personalAssistance/calendar";
import {
  getWorkScheduleStatus,
} from "@/lib/chernobog/personalAssistance/workSchedule";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET(
  request:
    Request,
) {
  const url =
    new URL(
      request.url,
    );

  const error =
    url.searchParams.get(
      "error",
    );

  if (
    error
  ) {
    return NextResponse.redirect(
      new URL(
        `/personal-assistance/calendar?error=${encodeURIComponent(
          error,
        )}`,
        url.origin,
      ),
    );
  }

  try {
    const code =
      url.searchParams.get(
        "code",
      );

    const state =
      url.searchParams.get(
        "state",
      );

    if (
      !code ||
      !state
    ) {
      throw new Error(
        "Google Calendar callback is missing code or state.",
      );
    }

    await completeGoogleCalendarConnection({
      code,
      state,
    });

    const schedule =
      await getWorkScheduleStatus();

    if (
      schedule.snapshot
    ) {
      await syncWorkScheduleToGoogleCalendarSafely(
        schedule.snapshot,
        "manual",
      );
    }

    return NextResponse.redirect(
      new URL(
        "/personal-assistance/calendar?connected=1",
        url.origin,
      ),
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
            error,
          );

    return NextResponse.redirect(
      new URL(
        `/personal-assistance/calendar?error=${encodeURIComponent(
          message,
        )}`,
        url.origin,
      ),
    );
  }
}