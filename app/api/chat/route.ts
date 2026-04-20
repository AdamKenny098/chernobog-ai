import { NextResponse } from "next/server";
import { respondForRoute, routeMessage } from "@/lib/chernobog/router";
import {
  clearAllMemories,
  deleteMemory,
  extractForgetFact,
  extractMemoryFact,
  getMemories,
  getRecentMessages,
  isForgetRequest,
  isRecallRequest,
  isRememberRequest,
  isWipeMemoriesRequest,
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

    let route:
      | "chat"
      | "planner"
      | "memory"
      | "tools"
      | "guardian" = "chat";

    let reply = "";

    if (isWipeMemoriesRequest(userMessage)) {
      route = "memory";

      saveMessage("user", userMessage, route);

      const deletedCount = clearAllMemories();
      reply =
        deletedCount > 0
          ? `All memories wiped. Removed ${deletedCount} stored entr${
              deletedCount === 1 ? "y" : "ies"
            }.`
          : "There were no stored memories to wipe.";
    } else if (isForgetRequest(userMessage)) {
      route = "memory";

      saveMessage("user", userMessage, route);

      const fact = extractForgetFact(userMessage);

      reply = !fact
        ? "State the memory you want removed."
        : deleteMemory(fact).deleted
        ? `Memory removed: ${fact}.`
        : `No matching memory found for: ${fact}.`;
    } else if (isRememberRequest(userMessage)) {
      route = "memory";

      saveMessage("user", userMessage, route);

      const fact = extractMemoryFact(userMessage);

      if (!fact) {
        reply = "State the fact you want stored.";
      } else {
        const result = saveMemory(fact);
        reply = result.saved
          ? `Memory stored: ${result.fact}.`
          : `That memory already exists: ${result.fact}.`;
      }
    } else if (isRecallRequest(userMessage)) {
      route = "memory";

      saveMessage("user", userMessage, route);

      const memories = getMemories(50);
      reply =
        memories.length === 0
          ? "I do not have any persisted memories yet."
          : [
              "Persisted memories:",
              ...memories.map((memory, index) => `${index + 1}. ${memory}`),
            ].join("\n");
    } else {
      route = await routeMessage(userMessage);

      saveMessage("user", userMessage, route);

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