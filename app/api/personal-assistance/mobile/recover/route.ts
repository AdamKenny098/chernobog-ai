import { NextResponse } from "next/server";
import {
  recoverPersonalAssistanceMobileDevice,
  publishMobileDeviceCredentialRecovered,
} from "@chernobog/personal-assistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consumes a locally generated, single-use, device-bound recovery secret.
 * This endpoint never mints a recovery secret and never accepts the old token.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("Request body must be a JSON object.");
    }
    const input = body as Record<string, unknown>;
    const result = recoverPersonalAssistanceMobileDevice({
      deviceId: typeof input.deviceId === "string" ? input.deviceId : "",
      installationId:
        typeof input.installationId === "string" ? input.installationId : "",
      recoveryCode:
        typeof input.recoveryCode === "string" ? input.recoveryCode : "",
    });

    await publishMobileDeviceCredentialRecovered(result.device);
    return NextResponse.json({
      ok: true,
      device: result.device,
      credential: { scheme: "Bearer", token: result.token },
      warning: "New bearer credential is returned only once. Persist it securely.",
      boundary: {
        recoveryCodeGeneratedLocallyOnly: true,
        deviceAndInstallationPreserved: true,
        executesTools: false,
        grantsPermissions: false,
      },
    });
  } catch (error) {
    // No secret or provided credential is ever echoed in responses.
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: "mobile_recovery_denied",
        message: message.includes("revoked")
          ? "Device is not eligible for recovery."
          : "Recovery code or device identity is invalid, expired, or already consumed.",
      },
      { status: 400 },
    );
  }
}
