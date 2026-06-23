import { NextRequest, NextResponse } from "next/server";

import {
  runDashboardAction,
} from "@/lib/modules/content-ingest-ui";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await runDashboardAction(body);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: "Dashboard action failed",
        message: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
