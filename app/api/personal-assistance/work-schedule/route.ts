import {
  NextResponse,
} from "next/server";
import {
  getWorkScheduleStatus,
} from "@/lib/chernobog/personalAssistance/workSchedule";

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
        await getWorkScheduleStatus(),
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,
        error:
          "work_schedule_read_failed",
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
