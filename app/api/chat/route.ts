import { NextResponse } from "next/server";
import { runCommandPipeline } from "@/lib/chernobog/pipeline/runCommand";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = String(body?.message ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const result = await runCommandPipeline(userMessage, sessionId);

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      {
        error: "Failed to process directive.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}