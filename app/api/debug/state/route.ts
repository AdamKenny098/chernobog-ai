import { NextResponse } from "next/server";
import db, { getRecentToolCalls } from "@/lib/chernobog/db";
import { getMemories } from "@/lib/chernobog/memory";

export const runtime = "nodejs";

type MessageRow = {
  id: number;
  role: string;
  content: string;
  route: string | null;
  created_at: string;
};

const getRecentMessageRowsStmt = db.prepare(`
SELECT id, role, content, route, created_at
FROM messages
ORDER BY id DESC
LIMIT ?
`);

function getRecentMessageRows(limit = 20): MessageRow[] {
  return getRecentMessageRowsStmt.all(limit) as MessageRow[];
}

function safeParseJson(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET() {
  try {
    const messages = getRecentMessageRows(20);
    const memories = getMemories(20);
    const toolCalls = getRecentToolCalls(20);

    return NextResponse.json({
      messages,
      memories,
      toolCalls: toolCalls.map((row) => ({
        id: row.id,
        tool_name: row.tool_name,
        success: Boolean(row.success),
        created_at: row.created_at,
        input: safeParseJson(row.input_json),
        output: safeParseJson(row.output_json),
      })),
    });
  } catch (error) {
    console.error("Debug state route error:", error);

    return NextResponse.json(
      {
        error: "Failed to load debug state.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}