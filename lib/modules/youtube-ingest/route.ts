import { NextRequest, NextResponse } from "next/server";

import { ingestYouTubePlaylist } from "@/lib/modules/youtube-ingest";

export const runtime = "nodejs";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      playlist?: unknown;
      projectId?: unknown;
      tags?: unknown;
    };

    if (typeof body.playlist !== "string" || !body.playlist.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing playlist. Send { playlist: \"<playlist URL or playlist ID>\" }.",
        },
        { status: 400 }
      );
    }

    if (
      body.projectId !== undefined &&
      typeof body.projectId !== "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "projectId must be a string when provided.",
        },
        { status: 400 }
      );
    }

    if (body.tags !== undefined && !isStringArray(body.tags)) {
      return NextResponse.json(
        {
          ok: false,
          error: "tags must be an array of strings when provided.",
        },
        { status: 400 }
      );
    }

    const result = await ingestYouTubePlaylist({
      playlist: body.playlist,
      projectId: body.projectId,
      tags: body.tags,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown YouTube ingest error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}