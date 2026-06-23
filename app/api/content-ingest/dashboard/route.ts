import { NextResponse } from "next/server";

import {
  getSavedContentDashboardData,
} from "@/lib/modules/content-ingest-ui";

export async function GET() {
  try {
    const data = await getSavedContentDashboardData();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load saved-content dashboard data.",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
