import {
  syncWorkScheduleToGoogleCalendarSafely,
} from "@/lib/chernobog/personalAssistance/calendar";import {
  NextResponse,
} from "next/server";
import {
  importAlkimiiWorkSchedule,
} from "@/lib/chernobog/personalAssistance/workSchedule";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type JsonObject =
  Record<string, unknown>;

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    if (
      !isObject(
        body,
      )
    ) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    if (
      typeof body.csvText !==
        "string"
    ) {
      throw new Error(
        "csvText must be a string.",
      );
    }

    const fileName =
      typeof body.fileName ===
        "string" &&
      body.fileName.trim()
        ? body.fileName.trim()
        : undefined;

    const observedAt =
      typeof body.observedAt ===
        "string" &&
      body.observedAt.trim()
        ? body.observedAt.trim()
        : undefined;

    const result =
      await importAlkimiiWorkSchedule({
        csvText:
          body.csvText,
        fileName,
        observedAt,
      });

        const calendarSync =
      await syncWorkScheduleToGoogleCalendarSafely(
        result.result.snapshot,
        "automatic",
      );
return NextResponse.json({
      calendarSync,
      ok:
        true,
      ...result,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "work_schedule_import_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status:
          400,
      },
    );
  }
}
