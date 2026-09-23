import {
  NextResponse,
} from "next/server";

import {
  authenticatePersonalAssistanceMobileRequest,
  getPersonalAssistanceMobileHealth,
  getPersonalAssistanceProfile,
  getPersonalAssistanceMobileTransportPolicy,
  recordPersonalAssistanceMobileHeartbeat,
} from "@/lib/chernobog/personalAssistance";
import type {
  PersonalAssistanceMobileHeartbeatInput,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
) {
  try {
    const device =
      authenticatePersonalAssistanceMobileRequest(
        request,
      );

    return NextResponse.json({
      ok: true,
      device,
      health:
        getPersonalAssistanceMobileHealth(
          device.deviceId,
        ),
      transport:
        getPersonalAssistanceMobileTransportPolicy(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_health_unauthorized",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 401,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const device =
      authenticatePersonalAssistanceMobileRequest(
        request,
      );

    const profile =
      getPersonalAssistanceProfile();

    const notificationCaptureAllowed =
      profile.notification.capture !==
      "disabled";

    const body =
      (await request.json()) as unknown;

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    const result =
      recordPersonalAssistanceMobileHeartbeat(
        device,
        body as PersonalAssistanceMobileHeartbeatInput,
      );

    return NextResponse.json({
      ok: true,
      result,
      transport:
        getPersonalAssistanceMobileTransportPolicy(),
      capabilities: {
        heartbeat: true,
        notificationApiAvailable: true,
        notificationCaptureMode:
          profile.notification.capture,
        notificationIngest:
          notificationCaptureAllowed,
        offlineSpoolUpload:
          notificationCaptureAllowed,
        toolExecution: false,
        permissionGranting: false,
      },
    });
  } catch (error) {
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
        ok: false,
        error:
          unauthorized
            ? "mobile_heartbeat_unauthorized"
            : "mobile_heartbeat_invalid",
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