import {
  NextResponse,
} from "next/server";
import {
  beginGoogleCalendarConnection,
} from "@/lib/chernobog/personalAssistance/calendar";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET(
  request:
    Request,
) {
  try {
    const authorizationUrl =
      await beginGoogleCalendarConnection(
        new URL(
          request.url,
        ).origin,
      );

    return NextResponse.redirect(
      authorizationUrl,
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "google_calendar_connect_failed",
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