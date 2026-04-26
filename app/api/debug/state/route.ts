import { NextResponse } from "next/server";
import { getRecentToolCalls } from "@/lib/chernobog/db";
import { getMemories, getRecentMessages } from "@/lib/chernobog/memory";

export const runtime = "nodejs";

type DebugMessage = {
  id: number;
  role: string;
  content: string;
  route: string | null;
  created_at: string;
};

type RawToolCall = {
  id: number;
  tool_name: string;
  input_json?: string | null;
  output_json?: string | null;
  input?: string | null;
  output?: string | null;
  success: number | boolean;
  created_at: string;
};

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== "string") {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET() {
  const messages = getRecentMessages(20) as DebugMessage[];
  const memories = getMemories(50);

  const rawToolCalls = getRecentToolCalls(20) as unknown as RawToolCall[];

  const toolCalls = rawToolCalls.map((toolCall) => {
    const input = toolCall.input_json ?? toolCall.input ?? null;
    const output = toolCall.output_json ?? toolCall.output ?? null;

    return {
      id: toolCall.id,
      tool_name: toolCall.tool_name,
      success: Boolean(toolCall.success),
      created_at: toolCall.created_at,
      input: safeJsonParse(input),
      output: safeJsonParse(output),
    };
  });

  return NextResponse.json({
    messages,
    memories,
    toolCalls,
  });
}