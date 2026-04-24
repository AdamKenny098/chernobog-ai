import { NextResponse } from "next/server";
import {
  clearSessionContext,
  resolveSessionId,
} from "@/lib/chernobog/session/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = resolveSessionId(body?.sessionId);

    clearSessionContext(sessionId);

    return NextResponse.json({
      ok: true,
      sessionId,
      message: "Session context cleared.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to reset session.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}