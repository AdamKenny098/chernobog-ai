import { NextResponse } from "next/server";

import { createYouTubeOAuthUrl } from "@/lib/modules/youtube-oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = createYouTubeOAuthUrl();

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create YouTube OAuth URL.",
      },
      { status: 500 }
    );
  }
}
