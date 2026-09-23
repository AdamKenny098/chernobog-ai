import {
  NextResponse,
} from "next/server";

import {
  enrollPersonalAssistanceMobileDevice,
  publishMobileDeviceEnrolled,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      (await request.json()) as unknown;

    if (!isObject(body)) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    const result =
      enrollPersonalAssistanceMobileDevice({
        pairingCode:
          typeof body.pairingCode ===
            "string"
            ? body.pairingCode
            : "",
        installationId:
          typeof body.installationId ===
            "string"
            ? body.installationId
            : "",
        displayName:
          typeof body.displayName ===
            "string"
            ? body.displayName
            : "",
        appVersion:
          typeof body.appVersion ===
            "string" ||
          body.appVersion === null
            ? body.appVersion
            : undefined,
      });

    await publishMobileDeviceEnrolled(
      result.device,
    );

    return NextResponse.json({
      ok: true,
      device:
        result.device,
      credential: {
        scheme:
          "Bearer",
        token:
          result.token,
      },
      warning:
        "The bearer token is returned only at enrollment time. Store it securely on the mobile device.",
      boundary: {
        authorizesMobileApiOnly: true,
        executesTools: false,
        grantsPermissions: false,
        notificationIngestEnabled: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_enrollment_consume_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}