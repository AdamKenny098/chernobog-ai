import { logToolCall } from "@/lib/chernobog/db";
import {
  clearPendingDisambiguation,
  getSessionContext,
  saveSessionContext,
} from "@/lib/chernobog/session/store";
import { setSelectedFileFromPath, updateSessionFromToolResult } from "@/lib/chernobog/session/update";
import { executeTool } from "@/lib/chernobog/tools/executor";

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

export type ToolExecutionResult = Awaited<ReturnType<typeof executeTool>>;
export type FileActionTool = "read_text_file" | "open_file";

export function formatToolReply(
  result: ToolExecutionResult,
  sessionId?: string
): string {
  if (!result.ok) {
    return `Tool failed: ${result.error}`;
  }

  switch (result.tool) {
    case "get_time": {
      const data = result.data as { local: string; timezone: string };
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
      const data = result.data as ReadTextFileResultData;
      return data.truncated
        ? `Here is the start of ${data.path}:\n\n${data.content}\n\n[truncated]`
        : `Here is ${data.path}:\n\n${data.content}`;
    }

    case "open_file":
    case "open_folder":
    case "open_app":
    case "open_url": {
      const data = result.data as { message: string };
      return data.message;
    }

    case "find_files": {
      const data = result.data as FindFilesResultData;

      if (data.matches.length === 0) {
        return `I could not find any files matching "${data.query}" in ${data.root}.`;
      }

      const preview = data.matches
        .slice(0, 5)
        .map((match, index) => `${index + 1}. ${match.name} — ${match.path}`)
        .join("\n");

      const extraCount = data.matches.length - 5;
      const suffix = extraCount > 0 ? `\n...and ${extraCount} more.` : "";
      const sessionNote = sessionId
        ? `\nYou can now say things like "read the first one", "open the first one", or "search Documents instead".`
        : "";

      return `I found ${data.matches.length} file(s) matching "${data.query}" in ${data.root}:\n${preview}${suffix}${sessionNote}`;
    }

    default:
      return "Tool executed successfully.";
  }
}

export function looksLikeExplicitFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (/^[a-zA-Z]:\\/.test(trimmed)) return true;
  if (/^\\\\/.test(trimmed)) return true;
  if (trimmed.includes("\\") || trimmed.includes("/")) return true;
  if (/\.[a-zA-Z0-9]{1,10}$/.test(trimmed)) return true;

  return false;
}

function extractSearchQueryFromPathLikeValue(value: string): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^(read|open|show)\s+/i, "")
    .replace(/^(my|the)\s+/i, "")
    .replace(/\b(file|document|doc)\b/gi, "")
    .replace(/\.[a-zA-Z0-9]{1,10}$/, "")
    .trim();
}

export async function executeAndTrackTool(
  toolName: string,
  input: unknown,
  sessionId: string
): Promise<ToolExecutionResult> {
  const session = getSessionContext(sessionId);

  const result = await executeTool(toolName, input, {
    platform: process.platform,
  });

  try {
    logToolCall({
      toolName,
      input,
      output: result,
      success: result.ok,
    });
  } catch (logError) {
    console.error("Failed to log tool call:", logError);
  }

  updateSessionFromToolResult(session, toolName, input, result);

  if (result.ok && toolName === "find_files") {
    if (
      !(
        session.workflow.kind === "file" &&
        session.workflow.awaitingDisambiguation
      )
    ) {
      clearPendingDisambiguation(session);
    }
  }

  if (result.ok && toolName === "read_text_file") {
    const data = result.data as ReadTextFileResultData;
    setSelectedFileFromPath(session, "recent_read", data.path);
    clearPendingDisambiguation(session);
  }

  if (result.ok && toolName === "open_file") {
    const data = result.data as { path?: string };

    if (data.path) {
      setSelectedFileFromPath(session, "recent_read", data.path);
    }

    clearPendingDisambiguation(session);
  }

  saveSessionContext(session);
  return result;
}

export async function tryFileSearchFallback(
  requestedPath: string,
  sessionId: string,
  action: FileActionTool
): Promise<string | null> {
  const query = extractSearchQueryFromPathLikeValue(requestedPath);
  if (!query) return null;

  const searchResult = await executeAndTrackTool(
    "find_files",
    { query, maxResults: 8 },
    sessionId
  );

  if (!searchResult.ok) {
    return `I could not search for "${query}".\n${searchResult.error}`;
  }

  const data = searchResult.data as FindFilesResultData;

  if (data.matches.length === 0) {
    return `I could not find any files matching "${query}".`;
  }

  if (data.matches.length === 1) {
    const chosen = data.matches[0];

    const actionResult = await executeAndTrackTool(
      action,
      { path: chosen.path },
      sessionId
    );

    if (!actionResult.ok) {
      return `I found ${chosen.name}, but I could not ${
        action === "read_text_file" ? "read" : "open"
      } it.\n${actionResult.error}`;
    }

    if (action === "read_text_file") {
      const readData = actionResult.data as ReadTextFileResultData;

      return readData.truncated
        ? `I found ${chosen.name} and read the start of it:\n\n${readData.content}\n\n[truncated]`
        : `I found ${chosen.name} and read it:\n\n${readData.content}`;
    }

    const openData = actionResult.data as { message: string };
    return openData.message;
  }

  const preview = data.matches
    .slice(0, 5)
    .map((match, index) => `${index + 1}. ${match.name} — ${match.path}`)
    .join("\n");

  return `I found multiple files matching "${query}". Tell me which one you want:\n${preview}`;
}

export function looksLikeVagueFileRequest(message: string): boolean {
  const lower = message.trim().toLowerCase();

  return (
    /^(read|open|show)\s+my\s+.+/.test(lower) ||
    /^(read|open|show)\s+.+\.(txt|md|json|csv|log|cs|ts|js|tsx|jsx|xml|ini|cfg)$/i.test(
      lower
    ) ||
    /\b(file|document|doc|notes|note)\b/.test(lower)
  );
}
