import {
  NextResponse,
} from "next/server";

import {
  getUnifiedToolExecutionStatus,
} from "@/lib/chernobog/execution";

export const runtime = "nodejs";

export async function GET() {
  try {
    const execution = getUnifiedToolExecutionStatus();

    return NextResponse.json({
      ok: true,
      execution,
      boundaries: {
        readOnlyEndpoint: true,
        executesTools: false,
        acceptsToolInput: false,
        grantsPermissions: false,
        changesApprovalState: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "tool_execution_status_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
