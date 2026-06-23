import { NextRequest, NextResponse } from "next/server";

import { executeYouTubeIngestCommand } from "@/lib/modules/youtube-ingest";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/youtube/command",
    examples: [
      "ingest youtube playlist https://www.youtube.com/playlist?list=PLMU4d-OqRsgTcfYtzNoKFDkc0uVVPZB2S",
      "youtube ingest https://www.youtube.com/playlist?list=PLMU4d-OqRsgTcfYtzNoKFDkc0uVVPZB2S",
      "yt ingest https://www.youtube.com/playlist?list=PLMU4d-OqRsgTcfYtzNoKFDkc0uVVPZB2S",
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      command?: unknown;
    };

    if (typeof body.command !== "string" || !body.command.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing command. Send { command: "ingest youtube playlist <url>" }.',
        },
        { status: 400 }
      );
    }

    const result = await executeYouTubeIngestCommand(body.command);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown YouTube command error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}