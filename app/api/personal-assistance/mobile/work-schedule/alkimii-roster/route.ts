import {
  syncWorkScheduleToGoogleCalendarSafely,
} from "@/lib/chernobog/personalAssistance/calendar";import {
  NextResponse,
} from "next/server";
import {
  authenticatePersonalAssistanceMobileRequest,
} from "@/lib/chernobog/personalAssistance";
import {
  importAlkimiiMobileRoster,
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
    !Array.isArray(
      value,
    )
  );
}

export async function POST(
  request: Request,
) {
  try {
    const device =
      authenticatePersonalAssistanceMobileRequest(
        request,
      );

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
      body.packageName !==
      "com.alkimii.connect.app"
    ) {
      throw new Error(
        "Only the Alkimii Android application is accepted by this roster bridge.",
      );
    }

    if (
      typeof body.captureId !==
        "string" ||
      body.captureId.trim().length <
        12 ||
      body.captureId.trim().length >
        160
    ) {
      throw new Error(
        "captureId must be a stable string between 12 and 160 characters.",
      );
    }

    if (
      !Array.isArray(
        body.nodes,
      )
    ) {
      throw new Error(
        "nodes must be an array.",
      );
    }

    const observedAt =
      typeof body.observedAt ===
        "string"
        ? body.observedAt
        : undefined;

    const result =
      await importAlkimiiMobileRoster({
        captureId:
          body.captureId.trim(),
        nodes:
          body.nodes,
        observedAt,
        deviceId:
          device.deviceId,
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
      boundaries: {
        sourcePackage:
          "com.alkimii.connect.app",
        readOnly:
          true,
        executesTools:
          false,
        grantsPermissions:
          false,
        createsCalendarEvents:
          false,
        sendsMessages:
          false,
      },
    });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const unauthorized =
      /authorization|bearer|credential|revoked/i.test(
        message,
      );

    return NextResponse.json(
      {
        ok:
          false,
        error:
          unauthorized
            ? "alkimii_roster_unauthorized"
            : "alkimii_roster_capture_invalid",
        message,
      },
      {
        status:
          unauthorized
            ? 401
            : 400,
      },
    );
  }
}
