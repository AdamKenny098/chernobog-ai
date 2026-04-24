import path from "node:path";

import { executeTool } from "@/lib/chernobog/tools/executor";
import { logToolCall } from "@/lib/chernobog/db";
import type { SessionContext } from "@/lib/chernobog/session/types";
import { updateSessionFromToolResult } from "@/lib/chernobog/session/update";
import { parseOrchestrationIntent } from "./intent";
import {
  getFirstSearchResultPath,
  getLastReadFilePath,
  getSelectedFilePath,
} from "./resolver";

type OrchestrationResult =
  | {
      handled: true;
      route: "tools";
      reply: string;
    }
  | {
      handled: false;
    };

type FindFilesData = {
  root: string;
  query: string;
  matches: {
    path: string;
    name: string;
    extension: string;
  }[];
};

type ReadTextFileData = {
  path: string;
  content: string;
  truncated: boolean;
};

function logToolSafely(toolName: string, input: unknown, output: unknown, success: boolean) {
  try {
    logToolCall({
      toolName,
      input,
      output,
      success,
    });
  } catch (error) {
    console.error("Failed to log orchestration tool call:", error);
  }
}

function formatSearchReply(data: FindFilesData) {
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

function formatReadReply(data: ReadTextFileData, lead = `Here is ${data.path}:`) {
  return data.truncated
    ? `${lead}\n\n${data.content}\n\n[truncated]`
    : `${lead}\n\n${data.content}`;
}

export async function orchestrateMessage(
  userMessage: string,
  session: SessionContext
): Promise<OrchestrationResult> {
  const parsed = parseOrchestrationIntent(userMessage, session);

  if (parsed.intent === "none" || parsed.confidence < 0.75) {
    return { handled: false };
  }

  if (parsed.intent === "search") {
    if (!parsed.query) {
      return {
        handled: true,
        route: "tools",
        reply: "I can search, but I need a clearer file name or search term.",
      };
    }

    const input = {
      query: parsed.query,
      maxResults: 8,
    };

    const result = await executeTool("find_files", input, {
      platform: process.platform,
    });

    logToolSafely("find_files", input, result, result.ok);
    updateSessionFromToolResult(session, "find_files", input, result);

    if (!result.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `Tool failed: ${result.error}`,
      };
    }

    return {
      handled: true,
      route: "tools",
      reply: formatSearchReply(result.data as FindFilesData),
    };
  }

  if (parsed.intent === "search_then_read") {
    if (!parsed.query) {
      return {
        handled: true,
        route: "tools",
        reply: "I can search and read, but I need a clearer file name or search term.",
      };
    }

    const searchInput = {
      query: parsed.query,
      maxResults: 8,
    };

    const searchResult = await executeTool("find_files", searchInput, {
      platform: process.platform,
    });

    logToolSafely("find_files", searchInput, searchResult, searchResult.ok);
    updateSessionFromToolResult(session, "find_files", searchInput, searchResult);

    if (!searchResult.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `Tool failed: ${searchResult.error}`,
      };
    }

    const searchData = searchResult.data as FindFilesData;
    const firstMatch = searchData.matches[0];

    if (!firstMatch) {
      return {
        handled: true,
        route: "tools",
        reply: `I could not find any files matching "${searchData.query}".`,
      };
    }

    const readInput = {
      path: firstMatch.path,
    };

    const readResult = await executeTool("read_text_file", readInput, {
      platform: process.platform,
    });

    logToolSafely("read_text_file", readInput, readResult, readResult.ok);
    updateSessionFromToolResult(session, "read_text_file", readInput, readResult);

    if (!readResult.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `I found ${firstMatch.name}, but I could not read it.\n${readResult.error}`,
      };
    }

    return {
      handled: true,
      route: "tools",
      reply: formatReadReply(
        readResult.data as ReadTextFileData,
        `I found ${firstMatch.name} and read it:`
      ),
    };
  }

  if (parsed.intent === "read_selected") {
    const filePath = getSelectedFilePath(session) ?? getFirstSearchResultPath(session);

    if (!filePath) {
      return {
        handled: true,
        route: "tools",
        reply: "I know you want me to read a file, but there is no selected file yet.",
      };
    }

    const input = {
      path: filePath,
    };

    const result = await executeTool("read_text_file", input, {
      platform: process.platform,
    });

    logToolSafely("read_text_file", input, result, result.ok);
    updateSessionFromToolResult(session, "read_text_file", input, result);

    if (!result.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `Tool failed: ${result.error}`,
      };
    }

    return {
      handled: true,
      route: "tools",
      reply: formatReadReply(result.data as ReadTextFileData),
    };
  }

  if (parsed.intent === "open_containing_folder") {
    const lastReadPath = getLastReadFilePath(session);

    if (!lastReadPath) {
      return {
        handled: true,
        route: "tools",
        reply: "There is no recently read file to reveal in its containing folder.",
      };
    }

    const folderPath = path.dirname(lastReadPath);

    return {
      handled: true,
      route: "tools",
      reply:
        `The containing folder is:\n\n${folderPath}\n\n` +
        `Your current tool registry does not expose open_folder yet, so this is the next tool to add before I can open it automatically.`,
    };
  }

  if (parsed.intent === "search_then_open") {
    if (!parsed.query) {
      return {
        handled: true,
        route: "tools",
        reply: "I can search and open, but I need a clearer file name or search term.",
      };
    }
  
    const searchInput = {
      query: parsed.query,
      maxResults: 8,
    };
  
    const searchResult = await executeTool("find_files", searchInput, {
      platform: process.platform,
    });
  
    logToolSafely("find_files", searchInput, searchResult, searchResult.ok);
    updateSessionFromToolResult(session, "find_files", searchInput, searchResult);
  
    if (!searchResult.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `Tool failed: ${searchResult.error}`,
      };
    }
  
    const searchData = searchResult.data as FindFilesData;
    const firstMatch = searchData.matches[0];
  
    if (!firstMatch) {
      return {
        handled: true,
        route: "tools",
        reply: `I could not find any files matching "${searchData.query}".`,
      };
    }
  
    const openInput = {
      path: firstMatch.path,
    };
  
    const openResult = await executeTool("open_file", openInput, {
      platform: process.platform,
    });
  
    logToolSafely("open_file", openInput, openResult, openResult.ok);
    updateSessionFromToolResult(session, "open_file", openInput, openResult);
  
    if (!openResult.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `I found ${firstMatch.name}, but I could not open it.\n${openResult.error}`,
      };
    }
  
    const openData = openResult.data as { message: string };
  
    return {
      handled: true,
      route: "tools",
      reply: openData.message,
    };
  }

  if (parsed.intent === "open_selected") {
    const filePath = getSelectedFilePath(session) ?? getFirstSearchResultPath(session);
  
    if (!filePath) {
      return {
        handled: true,
        route: "tools",
        reply: "I know you want me to open a file, but there is no selected file yet.",
      };
    }
  
    const input = {
      path: filePath,
    };
  
    const result = await executeTool("open_file", input, {
      platform: process.platform,
    });
  
    logToolSafely("open_file", input, result, result.ok);
    updateSessionFromToolResult(session, "open_file", input, result);
  
    if (!result.ok) {
      return {
        handled: true,
        route: "tools",
        reply: `Tool failed: ${result.error}`,
      };
    }
  
    const data = result.data as { message: string };
  
    return {
      handled: true,
      route: "tools",
      reply: data.message,
    };
  }

  return { handled: false };
}