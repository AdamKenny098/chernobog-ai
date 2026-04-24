import { NextResponse } from "next/server";
import { getMemories } from "@/lib/chernobog/memory";
import { db } from "@/lib/chernobog/db"

export const runtime = "nodejs";

export async function GET() {
  try {
    const messages = db
      .prepare(
        `
        SELECT id, role, content, route, created_at
        FROM messages
        ORDER BY id DESC
        LIMIT 25
        `
      )
      .all();

    const toolCalls = db
      .prepare(
        `
        SELECT id, tool_name, input, output, success, created_at
        FROM tool_calls
        ORDER BY id DESC
        LIMIT 25
        `
      )
      .all()
      .map((row: any) => ({
        ...row,
        success: Boolean(row.success),
        input: safeJsonParse(row.input),
        output: safeJsonParse(row.output),
      }));

    return NextResponse.json({
      messages,
      memories: getMemories(50),
      toolCalls,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load debug state.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function safeJsonParse(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}