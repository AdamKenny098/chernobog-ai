import { NextResponse } from "next/server";
import { respondForRoute, routeMessage } from "@/lib/chernobog/router";
import {
  extractMemoryFact,
  getMemories,
  getRecentMessages,
  isRecallRequest,
  isRememberRequest,
  saveMemory,
  saveMessage,
} from "@/lib/chernobog/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = String(body?.message ?? "").trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const recentMessages = getRecentMessages(8);
    const storedMemories = getMemories(12);

    const route = await routeMessage(userMessage);

    saveMessage("user", userMessage, route);

    let reply = "";

    if (route === "memory" && isRememberRequest(userMessage)) {
      const fact = extractMemoryFact(userMessage);

      if (!fact) {
        reply = "State the fact you want stored.";
      } else {
        const result = saveMemory(fact);
        reply = result.saved
          ? `Memory stored: ${result.fact}.`
          : `That memory already exists: ${result.fact}.`;
      }
    } else if (route === "memory" && isRecallRequest(userMessage)) {
      const memories = getMemories(20);

      reply =
        memories.length === 0
          ? "I do not have any persisted memories yet."
          : await respondForRoute("memory", userMessage, {
              memories,
              recentMessages,
            });
    } else {
      reply = await respondForRoute(route, userMessage, {
        memories: storedMemories,
        recentMessages,
      });
    }

    saveMessage("assistant", reply, route);

    return NextResponse.json({
      route,
      reply: reply || "No response returned.",
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Failed to process directive." },
      { status: 500 }
    );
  }
}