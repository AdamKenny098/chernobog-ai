import {
  NextResponse,
} from "next/server";
import {
  getCommunicationStatus,
} from "@/lib/chernobog/personalAssistance/communicationResponsibility";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      ok:
        true,
      status:
        await getCommunicationStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "communication_responsibility_read_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status:
          500,
      },
    );
  }
}