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
import { classifyToolIntent } from "@/lib/chernobog/tools/intent";
import { normalizeToolCall } from "@/lib/chernobog/tools/normalize";
import { logToolCall } from "@/lib/chernobog/db";

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
      const data = result.data as { message: string };
      return data.message;
    }

    case "open_url": {
      const data = result.data as { message: string };
      return data.message;
    }

    case "find_files": {
      const data = result.data as {
        root: string;
        query: string;
        matches: { path: string; name: string; extension: string }[];
      };

      if (data.matches.length === 0) {
        return `I could not find any files matching "${data.query}" in ${data.root}.`;
      }

      const preview = data.matches
        .slice(0, 8)
        .map((match, index) => `${index + 1}. ${match.name} — ${match.path}`)
        .join("\n");

      const extraCount = data.matches.length - 8;
      const suffix = extraCount > 0 ? `\n...and ${extraCount} more.` : "";

      return `I found ${data.matches.length} file(s) matching "${data.query}" in ${data.root}:\n${preview}${suffix}`;
    }

    default:
      return "Tool executed successfully.";
  }
}
function looksLikeExplicitFilePath(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;

  // Windows absolute path
  if (/^[a-zA-Z]:\\/.test(trimmed)) return true;

  // UNC/network path
  if (/^\\\\/.test(trimmed)) return true;

  // Relative hints
  if (trimmed.includes("\\") || trimmed.includes("/")) return true;

  // File with extension
  if (/\.[a-zA-Z0-9]{1,10}$/.test(trimmed)) return true;

  return false;
}

function extractSearchQueryFromReadPath(value: string): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\.[a-zA-Z0-9]{1,10}$/, "")
    .replace(/\b(file|document|doc)\b/gi, "")
    .trim();
}

type FindFilesResultData = {
  root: string;
  query: string;
  matches: {
    path: string;
    name: string;
    extension: string;
  }[];
};

type ReadTextFileResultData = {
  path: string;
  content: string;
  truncated: boolean;
};

async function tryReadViaFileSearchFallback(
  userMessage: string,
  requestedPath: string
): Promise<string | null> {
  const query = extractSearchQueryFromReadPath(requestedPath);

  if (!query) {
    return null;
  }

  const searchResult = await executeTool(
    "find_files",
    { query, maxResults: 8 },
    { platform: process.platform }
  );

  try {
    logToolCall({
      toolName: "find_files",
      input: { query, maxResults: 8, fallbackFrom: userMessage },
      output: searchResult,
      success: searchResult.ok,
    });
  } catch (logError) {
    console.error("Failed to log fallback file search:", logError);
  }

  if (!searchResult.ok) {
    return `I could not search for "${query}". ${searchResult.error}`;
  }

  const data = searchResult.data as FindFilesResultData;

  if (data.matches.length === 0) {
    return `I could not find any files matching "${query}".`;
  }

  if (data.matches.length === 1) {
    const chosen = data.matches[0];

    const readResult = await executeTool(
      "read_text_file",
      { path: chosen.path },
      { platform: process.platform }
    );

    try {
      logToolCall({
        toolName: "read_text_file",
        input: { path: chosen.path, fallbackFrom: userMessage },
        output: readResult,
        success: readResult.ok,
      });
    } catch (logError) {
      console.error("Failed to log fallback file read:", logError);
    }

    if (!readResult.ok) {
      return `I found ${chosen.name}, but I could not read it. ${readResult.error}`;
    }

    const readData = readResult.data as ReadTextFileResultData;

    return readData.truncated
      ? `I found ${chosen.name} and read the start of it:\n\n${readData.content}\n\n[truncated]`
      : `I found ${chosen.name} and read it:\n\n${readData.content}`;
  }

  const preview = data.matches
    .slice(0, 5)
    .map((match, index) => `${index + 1}. ${match.name} — ${match.path}`)
    .join("\n");

  const extraCount = data.matches.length - 5;
  const suffix =
    extraCount > 0 ? `\n...and ${extraCount} more matches.` : "";

  return `I found multiple files matching "${query}". Tell me which one you want:\n${preview}${suffix}`;
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
      
        const normalizedToolCall = normalizeToolCall(parsedToolCommand);
      
        if (
          normalizedToolCall.tool === "read_text_file" &&
          !looksLikeExplicitFilePath(normalizedToolCall.input.path)
        ) {
          const fallbackReply = await tryReadViaFileSearchFallback(
            userMessage,
            normalizedToolCall.input.path
          );
      
          if (fallbackReply) {
            reply = fallbackReply;
          } else {
            const toolResult = await executeTool(
              normalizedToolCall.tool,
              normalizedToolCall.input,
              { platform: process.platform }
            );
      
            try {
              logToolCall({
                toolName: normalizedToolCall.tool,
                input: normalizedToolCall.input,
                output: toolResult,
                success: toolResult.ok,
              });
            } catch (logError) {
              console.error("Failed to log tool call:", logError);
            }
      
            reply = formatToolReply(toolResult);
          }
        } else {
          const toolResult = await executeTool(
            normalizedToolCall.tool,
            normalizedToolCall.input,
            { platform: process.platform }
          );
      
          try {
            logToolCall({
              toolName: normalizedToolCall.tool,
              input: normalizedToolCall.input,
              output: toolResult,
              success: toolResult.ok,
            });
          } catch (logError) {
            console.error("Failed to log tool call:", logError);
          }
      
          reply = formatToolReply(toolResult);
        }
      }else {
        const toolIntent = await classifyToolIntent(userMessage);

if (toolIntent.tool !== "none") {
  route = "tools";

  saveMessage("user", userMessage, route);

  const normalizedToolCall = normalizeToolCall(toolIntent);

  if (
    normalizedToolCall.tool === "read_text_file" &&
    !looksLikeExplicitFilePath(normalizedToolCall.input.path)
  ) {
    const fallbackReply = await tryReadViaFileSearchFallback(
      userMessage,
      normalizedToolCall.input.path
    );

    if (fallbackReply) {
      reply = fallbackReply;
    } else {
      const toolResult = await executeTool(
        normalizedToolCall.tool,
        normalizedToolCall.input,
        { platform: process.platform }
      );

      try {
        logToolCall({
          toolName: normalizedToolCall.tool,
          input: normalizedToolCall.input,
          output: toolResult,
          success: toolResult.ok,
        });
      } catch (logError) {
        console.error("Failed to log tool call:", logError);
      }

      reply = formatToolReply(toolResult);
    }
  } else {
    const toolResult = await executeTool(
      normalizedToolCall.tool,
      normalizedToolCall.input,
      { platform: process.platform }
    );

    try {
      logToolCall({
        toolName: normalizedToolCall.tool,
        input: normalizedToolCall.input,
        output: toolResult,
        success: toolResult.ok,
      });
    } catch (logError) {
      console.error("Failed to log tool call:", logError);
    }

    reply = formatToolReply(toolResult);
  }
} else {
  route = await routeMessage(userMessage);

  saveMessage("user", userMessage, route);

  const recentMessages = getRecentMessages(8);
  const storedMemories = getMemories(12);

  reply = await respondForRoute(route, userMessage, {
    memories: storedMemories,
    recentMessages,
  });
}
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
      {
        error: "Failed to process directive.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}