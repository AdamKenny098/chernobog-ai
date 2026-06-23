import { NextRequest, NextResponse } from "next/server";

import { exchangeYouTubeOAuthCode } from "@/lib/modules/youtube-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing OAuth code.",
        },
        { status: 400 }
      );
    }

    await exchangeYouTubeOAuthCode(code);

    return new NextResponse(
      [
        "<!doctype html>",
        "<html>",
        "<head><title>YouTube Connected</title></head>",
        "<body>",
        "<h1>YouTube account connected.</h1>",
        "<p>You can close this tab and return to Chernobog.</p>",
        "</body>",
        "</html>",
      ].join(""),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete YouTube OAuth callback.",
      },
      { status: 500 }
    );
  }
}
