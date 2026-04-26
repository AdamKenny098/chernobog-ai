import { NextResponse } from "next/server";
import { parseUnifiedCommand } from "@/lib/chernobog/command-language";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const message = url.searchParams.get("message") ?? "";

  if (!message.trim()) {
    return NextResponse.json(
      {
        error: "message query parameter is required.",
      },
      { status: 400 }
    );
  }

  const command = parseUnifiedCommand(message);

  return NextResponse.json({
    command,
  });
}