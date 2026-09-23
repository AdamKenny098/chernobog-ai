import {
  NextResponse,
} from "next/server";

import {
  authenticatePersonalAssistanceMobileRequest,
  getPersonalAssistanceProfile,
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

    const profile =
      getPersonalAssistanceProfile();

    const notificationCaptureAllowed =
      profile.notification.capture !==
      "disabled";

    return NextResponse.json({
      ok: true,
      device,
      capabilities: {
        identity: true,
        heartbeat: true,
        notificationApiAvailable: true,
        notificationCaptureMode:
          profile.notification.capture,
        notificationStoreBodies:
          profile.notification.storeBodies,
        notificationRedactSensitiveContent:
          profile.notification.redactSensitiveContent,
        notificationStoreSenderIdentity:
          profile.privacy.storeSenderIdentity,
        notificationIngest:
          notificationCaptureAllowed,
        offlineSpoolUpload:
          notificationCaptureAllowed,
        classification: false,
        importanceScoring: false,
        toolExecution: false,
        permissionGranting: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_session_unauthorized",
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
