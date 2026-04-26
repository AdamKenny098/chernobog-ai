import { NextResponse } from "next/server";
import { getMemories, getRecentMessages } from "@/lib/chernobog/memory";
import {
  getSessionContext,
  resolveSessionId,
} from "@/lib/chernobog/session/store";
import { buildMemoryContext } from "@/lib/chernobog/memory-architecture";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = resolveSessionId(url.searchParams.get("sessionId"));

  const session = getSessionContext(sessionId);
  const persistedMemories = getMemories(50);
  const recentMessages = getRecentMessages(12);

  const query = url.searchParams.get("query") ?? "";

    const memoryContext = buildMemoryContext({
    session,
    persistedMemories,
    recentMessages,
    userMessage: query,
    });

  return NextResponse.json({
    sessionId,
    memoryContext,
  });
}