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
import { parseToolCommand } from "@/lib/chernobog/tools/parser";
import { executeTool } from "@/lib/chernobog/tools/executor";

export const runtime = "nodejs";

type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";

function formatToolReply(
  result: Awaited<ReturnType<typeof executeTool>>
): string {
  if (!result.ok) {
    return `Tool failed: ${result.error}`;
  }

  switch (result.tool) {
    case "get_time": {
      const data = result.data as {
        local: string;
        timezone: string;
      };

      return `The current time is ${data.local} (${data.timezone}).`;
    }

    case "list_files": {
      const data = result.data as {
        path: string;
        entries: { name: string; type: "file" | "directory" }[];
      };

      if (data.entries.length === 0) {
        return `That folder is empty: ${data.path}`;
      }

      const preview = data.entries
        .slice(0, 12)
        .map((entry) =>
          entry.type === "directory" ? `[DIR] ${entry.name}` : entry.name
        )
        .join(", ");

      const extraCount = data.entries.length - 12;
      const suffix = extraCount > 0 ? ` ...and ${extraCount} more.` : ".";

      return `I found ${data.entries.length} item(s) in ${data.path}: ${preview}${suffix}`;
    }

    case "read_text_file": {
      const data = result.data as {
        path: string;
        content: string;
        truncated: boolean;
      };

      return data.truncated
        ? `Here is the start of ${data.path}:\n\n${data.content}\n\n[truncated]`
        : `Here is ${data.path}:\n\n${data.content}`;
    }

    case "open_app": {
      const data = result.data as {
        message: string;
      };

      return data.message;
    }

    case "open_url": {
      const data = result.data as {
        message: string;
      };

      return data.message;
    }

    default:
      return "Tool executed successfully.";
  }
}

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

    let route: RouteName = "chat";
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
      const parsedToolCommand = parseToolCommand(userMessage);

      if (parsedToolCommand) {
        route = "tools";

        saveMessage("user", userMessage, route);

        const toolResult = await executeTool(
          parsedToolCommand.tool,
          parsedToolCommand.input,
          { platform: process.platform }
        );

        reply = formatToolReply(toolResult);
      } else {
        route = await routeMessage(userMessage);

        saveMessage("user", userMessage, route);

        reply = await respondForRoute(route, userMessage, {
          memories: storedMemories,
          recentMessages,
        });
      }
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