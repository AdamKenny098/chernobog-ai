import {
  NextResponse,
} from "next/server";
import {
  applyCommunicationAction,
} from "@/lib/chernobog/personalAssistance/communicationResponsibility";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type Context = {
  params:
    Promise<{
      id: string;
    }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  try {
    const {
      id,
    } =
      await context.params;

    return NextResponse.json({
      ok:
        true,
      responsibility:
        await applyCommunicationAction(
          id,
          await request.json(),
        ),
      boundaries: {
        sendsMessages:
          false,
        clicksApps:
          false,
        grantsPermissions:
          false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "communication_responsibility_action_failed",
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