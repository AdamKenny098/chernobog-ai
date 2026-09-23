import {
  NextResponse,
} from "next/server";

import {
  authenticatePersonalAssistanceMobileRequest,
  getPersonalAssistanceMobileTransportPolicy,
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
      deviceId:
        device.deviceId,
      transport:
        getPersonalAssistanceMobileTransportPolicy(),
      boundary: {
        requestSourceNetworkInferred: false,
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_transport_unauthorized",
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