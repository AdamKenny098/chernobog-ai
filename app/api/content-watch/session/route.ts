import { NextRequest, NextResponse } from "next/server";

import {
  createWatchSession,
  getWatchSessionView,
} from "@/lib/modules/content-watch";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
    const view = await getWatchSessionView(sessionId);

    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: "Failed to load watch session",
        message: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const view = await createWatchSession(body);

    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        title: "Failed to create watch session",
        message: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    );
  }
}
