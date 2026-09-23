import {
  NextResponse,
} from "next/server";
import {
  analyzeAndProjectNotification,
  parseNotificationIntelligenceObservation,
} from "@/lib/chernobog/personalAssistance/notificationIntelligence";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: Request,
) {
  try {
    const {
      observation,
      persistResponsibility,
    } =
      parseNotificationIntelligenceObservation(
        await request.json(),
      );

    const result =
      await analyzeAndProjectNotification(
        observation,
        {
          persistResponsibility,
          actor:
            "steward.notification-intelligence.api",
        },
      );

    return NextResponse.json({
      ok: true,
      ...result,
      boundaries: {
        executesTools: false,
        grantsPermissions: false,
        sendsMessages: false,
      },
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze notification.",
      },
      {
        status: 400,
      },
    );
  }
}
