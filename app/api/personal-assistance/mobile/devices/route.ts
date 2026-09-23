import {
  NextResponse,
} from "next/server";

import {
  listPersonalAssistanceMobileDevices,
  publishMobileDeviceRevoked,
  revokePersonalAssistanceMobileDevice,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      devices:
        listPersonalAssistanceMobileDevices(),
      boundary: {
        secretsReturned: false,
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_device_list_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const body =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      typeof (
        body as
          Record<string, unknown>
      ).deviceId !== "string"
    ) {
      throw new Error(
        "deviceId is required.",
      );
    }

    const device =
      revokePersonalAssistanceMobileDevice(
        (
          body as
            Record<string, string>
        ).deviceId,
      );

    await publishMobileDeviceRevoked(
      device,
    );

    return NextResponse.json({
      ok: true,
      device,
      boundary: {
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_device_revoke_failed",
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