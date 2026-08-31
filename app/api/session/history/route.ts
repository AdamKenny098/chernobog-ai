import { NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/chernobog/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function parseLimit(value: string | null): number {
  if (!value) return 50;

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return 50;
  }

  return Math.max(1, Math.min(parsed, 200));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = String(url.searchParams.get("sessionId") ?? "").trim();

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "sessionId query parameter is required.",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  const messages = getRecentMessages(
    sessionId,
    parseLimit(url.searchParams.get("limit"))
  );

  return NextResponse.json(
    {
      sessionId,
      messages,
    },
    {
      headers: NO_STORE_HEADERS,
    }
  );
}
