import { NextRequest, NextResponse } from "next/server";

import {
  runContentIngestUiAction,
} from "@/lib/modules/content-ingest-ui";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      command?: unknown;
    };

    const command = typeof body.command === "string" ? body.command : "";
    const result = await runContentIngestUiAction(command);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: "Dashboard command failed",
        message: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
