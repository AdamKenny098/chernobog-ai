import {
  NextResponse,
} from "next/server";

import {
  authenticatePersonalAssistanceMobileRequest,
  reconcilePersonalAssistanceMobileNotificationReceipts,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
) {
  try {
    const device =
      authenticatePersonalAssistanceMobileRequest(
        request,
      );

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

    const eventIds =
      (
        body as
          Record<string, unknown>
      ).eventIds;

    if (!Array.isArray(eventIds)) {
      throw new Error(
        "eventIds must be an array.",
      );
    }

    const result =
      reconcilePersonalAssistanceMobileNotificationReceipts(
        device,
        eventIds as string[],
      );

    return NextResponse.json({
      ok: true,
      ...result,
      boundary: {
        executesTools: false,
        grantsPermissions: false,
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
            ? "mobile_notification_reconcile_unauthorized"
            : "mobile_notification_reconcile_invalid",
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
