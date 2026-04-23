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
import {
  clearPendingDisambiguation,
  getSessionContext,
  saveSessionContext,
  setPendingDisambiguation,
} from "@/lib/chernobog/session/store";
import {
  looksLikeOrdinalFileFollowUp,
  tryResolveFollowUp,
} from "@/lib/chernobog/session/followups";
import {
  setSelectedFileFromPath,
  updateSessionAfterRoute,
  updateSessionFromToolResult,
} from "@/lib/chernobog/session/update";
import type { RouteName } from "@/lib/chernobog/session/types";
import type { ChatUiPayload, CommandPipelineResult } from "./types";

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

type ToolExecutionResult = Awaited<ReturnType<typeof executeTool>>;

function buildUiPayload(
  sessionId: string,
  route: RouteName,
  reply: string
): ChatUiPayload {
  const session = getSessionContext(sessionId);
  const workflow = session.workflow;

  const selectedCandidate =
    workflow.kind === "file"
      ? workflow.candidates.find((c) => c.id === workflow.selectedCandidateId)
      : null;

  const readCandidate =
    workflow.kind === "file"
      ? workflow.candidates.find((c) => c.id === workflow.readCandidateId)
      : null;

  return {
    route,
    reply: reply || "No response returned.",
    sessionId,
    tool: session.lastTool?.name ?? "none",
    toolSummary: session.lastToolResult?.summary ?? "No tool activity yet",
    searchQuery:
      workflow.kind === "file"
        ? workflow.query ?? "none"
        : session.fileContext?.lastSearch?.query ?? "none",
    searchRoot:
      workflow.kind === "file"
        ? workflow.root ?? "none"
        : session.fileContext?.lastSearch?.normalizedRoot ??
          session.fileContext?.lastSearch?.root ??
          "none",
    selectedFile:
      selectedCandidate?.path ??
      session.fileContext?.lastSelected?.path ??
      "none",
    readFile:
      readCandidate?.path ??
      session.fileContext?.lastRead?.path ??
      "none",
    pendingState:
      workflow.kind === "file" && workflow.awaitingDisambiguation
        ? "file selection required"
        : session.pendingDisambiguation
          ? "file selection required"
          : "none",
    workflowKind: workflow.kind,
    workflowStep: workflow.kind === "file" ? workflow.step : "none",
    workflowCandidateCount:
      workflow.kind === "file" ? workflow.candidates.length : 0,
  };
}

function formatToolReply(result: ToolExecutionResult, sessionId?: string): string {
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
        .map((entry) => (entry.type === "directory" ? `[DIR] ${entry.name}` : entry.name))
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

    case "open_app": {
      const data = result.data as { message: string };
      return data.message;
    }

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
        ? `\nYou can now say things like "read the first one" or "search Documents instead".`
        : "";

      return `I found ${data.matches.length} file(s) matching "${data.query}" in ${data.root}:\n${preview}${suffix}${sessionNote}`;
    }

    default:
      return "Tool executed successfully.";
  }
}

function looksLikeExplicitFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (/^[a-zA-Z]:\\/.test(trimmed)) return true;
  if (/^\\\\/.test(trimmed)) return true;
  if (trimmed.includes("\\") || trimmed.includes("/")) return true;
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

async function executeAndTrackTool(
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
    if (!(session.workflow.kind === "file" && session.workflow.awaitingDisambiguation)) {
      clearPendingDisambiguation(session);
    }
  }

  if (result.ok && toolName === "read_text_file") {
    const data = result.data as ReadTextFileResultData;
    setSelectedFileFromPath(session, "recent_read", data.path);
    clearPendingDisambiguation(session);
  }

  saveSessionContext(session);
  return result;
}

async function tryReadViaFileSearchFallback(
  requestedPath: string,
  sessionId: string
): Promise<string | null> {
  const query = extractSearchQueryFromReadPath(requestedPath);
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
    const readResult = await executeAndTrackTool(
      "read_text_file",
      { path: chosen.path },
      sessionId
    );

    if (!readResult.ok) {
      return `I found ${chosen.name}, but I could not read it.\n${readResult.error}`;
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

  return `I found multiple files matching "${query}". Tell me which one you want:\n${preview}`;
}

function buildSessionSummary(sessionId: string): string {
  const session = getSessionContext(sessionId);
  const lines: string[] = [];

  if (session.lastRoute) lines.push(`- Last route: ${session.lastRoute}`);
  if (session.lastTool) lines.push(`- Last tool: ${session.lastTool.name}`);
  if (session.lastToolResult?.summary) {
    lines.push(`- Last tool result: ${session.lastToolResult.summary}`);
  }

  if (session.workflow.kind === "file") {
    const workflow = session.workflow;

    lines.push(`- Workflow: file/${workflow.step}`);

    if (workflow.query) {
      lines.push(`- Workflow query: "${workflow.query}"`);
    }

    if (workflow.root) {
      lines.push(`- Workflow root: "${workflow.root}"`);
    }

    lines.push(`- Workflow candidates: ${workflow.candidates.length}`);

    const selected = workflow.candidates.find(
      (candidate) => candidate.id === workflow.selectedCandidateId
    );
    if (selected?.path) {
      lines.push(`- Workflow selected file: ${selected.path}`);
    }

    const read = workflow.candidates.find(
      (candidate) => candidate.id === workflow.readCandidateId
    );
    if (read?.path) {
      lines.push(`- Workflow read file: ${read.path}`);
    }
  } else {
    if (session.fileContext?.lastSearch) {
      lines.push(
        `- Last file search: query="${session.fileContext.lastSearch.query}" root="${session.fileContext.lastSearch.normalizedRoot ?? session.fileContext.lastSearch.root ?? "default"}" results=${session.fileContext.lastSearch.results.length}`
      );
    }
    if (session.fileContext?.lastSelected?.path) {
      lines.push(`- Last selected file: ${session.fileContext.lastSelected.path}`);
    }
    if (session.fileContext?.lastRead?.path) {
      lines.push(`- Last read file: ${session.fileContext.lastRead.path}`);
    }
  }

  return lines.join("\n");
}

export async function runCommandPipeline(
  userMessage: string,
  sessionId: string
): Promise<CommandPipelineResult> {
  let route: RouteName = "chat";
  let reply = "";

  if (isWipeMemoriesRequest(userMessage)) {
    route = "memory";
    saveMessage("user", userMessage, route);

    const deletedCount = clearAllMemories();

    reply =
      deletedCount > 0
        ? `All memories wiped. Removed ${deletedCount} stored entr${deletedCount === 1 ? "y" : "ies"}.`
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
        : ["Persisted memories:", ...memories.map((memory, index) => `${index + 1}. ${memory}`)].join("\n");
  } else {
    const session = getSessionContext(sessionId);
    const followUp = tryResolveFollowUp(userMessage, session);

    if (followUp.kind === "needs_disambiguation") {
      route = "tools";
      saveMessage("user", userMessage, route);
      setPendingDisambiguation(session, followUp.pending);
      saveSessionContext(session);
      reply = followUp.message;
    } else if (followUp.kind === "resolved_tool_action") {
      route = "tools";
      saveMessage("user", userMessage, route);

      const toolResult = await executeAndTrackTool(
        followUp.tool,
        followUp.input,
        sessionId
      );

      reply = formatToolReply(toolResult, sessionId);
    } else if (looksLikeOrdinalFileFollowUp(userMessage)) {
      route = "tools";
      saveMessage("user", userMessage, route);
      reply = "I do not have a valid active file result set for that selection yet.";
    } else {
      const parsedToolCommand = parseToolCommand(userMessage);

      if (parsedToolCommand) {
        route = "tools";
        saveMessage("user", userMessage, route);

        const normalizedToolCall = normalizeToolCall(parsedToolCommand);

        if (normalizedToolCall.tool === "read_text_file") {
          const readInput = normalizedToolCall.input as { path: string };

          if (!looksLikeExplicitFilePath(readInput.path)) {
            const fallbackReply = await tryReadViaFileSearchFallback(
              readInput.path,
              sessionId
            );

            if (fallbackReply) {
              reply = fallbackReply;
            } else {
              const toolResult = await executeAndTrackTool(
                normalizedToolCall.tool,
                normalizedToolCall.input,
                sessionId
              );
              reply = formatToolReply(toolResult, sessionId);
            }
          } else {
            const toolResult = await executeAndTrackTool(
              normalizedToolCall.tool,
              normalizedToolCall.input,
              sessionId
            );
            reply = formatToolReply(toolResult, sessionId);
          }
        } else {
          const toolResult = await executeAndTrackTool(
            normalizedToolCall.tool,
            normalizedToolCall.input,
            sessionId
          );
          reply = formatToolReply(toolResult, sessionId);
        }
      } else {
        const toolIntent = await classifyToolIntent(userMessage);

        if (toolIntent.tool !== "none") {
          route = "tools";
          saveMessage("user", userMessage, route);

          const normalizedToolCall = normalizeToolCall(toolIntent);

          if (normalizedToolCall.tool === "read_text_file") {
            const readInput = normalizedToolCall.input as { path: string };

            if (!looksLikeExplicitFilePath(readInput.path)) {
              const fallbackReply = await tryReadViaFileSearchFallback(
                readInput.path,
                sessionId
              );

              if (fallbackReply) {
                reply = fallbackReply;
              } else {
                const toolResult = await executeAndTrackTool(
                  normalizedToolCall.tool,
                  normalizedToolCall.input,
                  sessionId
                );
                reply = formatToolReply(toolResult, sessionId);
              }
            } else {
              const toolResult = await executeAndTrackTool(
                normalizedToolCall.tool,
                normalizedToolCall.input,
                sessionId
              );
              reply = formatToolReply(toolResult, sessionId);
            }
          } else {
            const toolResult = await executeAndTrackTool(
              normalizedToolCall.tool,
              normalizedToolCall.input,
              sessionId
            );
            reply = formatToolReply(toolResult, sessionId);
          }
        } else {
          route = await routeMessage(userMessage);
          saveMessage("user", userMessage, route);

          const storedMemories = getMemories(12);
          const recentMessages = getRecentMessages(8);

          reply = await respondForRoute(route, userMessage, {
            memories: storedMemories,
            recentMessages,
            sessionSummary: buildSessionSummary(sessionId),
          });

          const activeSession = getSessionContext(sessionId);
          updateSessionAfterRoute(activeSession, route);
          saveSessionContext(activeSession);
        }
      }
    }
  }

  saveMessage("assistant", reply, route);

  return {
    payload: buildUiPayload(sessionId, route, reply),
  };
}