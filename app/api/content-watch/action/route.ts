import { NextRequest, NextResponse } from "next/server";

import {
  runWatchAction,
} from "@/lib/modules/content-watch";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await runWatchAction(body);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: "Watch action failed",
        message: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
