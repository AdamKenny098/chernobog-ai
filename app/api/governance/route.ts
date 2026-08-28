import { NextResponse } from "next/server";
import { getUnifiedGovernanceStatus } from "@/lib/chernobog/governance";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      governance: getUnifiedGovernanceStatus(),
      boundaries: {
        readOnlyEndpoint: true,
        executesTools: false,
        executesTasks: false,
        acceptsApproval: false,
        changesPermissions: false,
        changesAutonomy: false,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: "governance_status_failed",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
