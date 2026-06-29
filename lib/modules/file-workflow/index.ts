import os from "node:os";
import path from "node:path";

import { logToolCall } from "@/lib/chernobog/db";
import type {
  CommandConfidenceLevel,
  UnifiedCommand,
} from "@/lib/chernobog/command-language";
import { tryResolveFollowUp } from "@/lib/chernobog/session/followups";
import {
  clearPendingDisambiguation,
  getSessionContext,
  saveSessionContext,
  setPendingDisambiguation,
} from "@/lib/chernobog/session/store";
import {
  setSelectedFileFromPath,
  updateSessionFromToolResult,
} from "@/lib/chernobog/session/update";
import {
  listFilesTool,
  openFileTool,
  openFolderTool,
  readTextFileTool,
} from "@/lib/chernobog/tools/builtins/files";
import { findFilesTool } from "@/lib/chernobog/tools/builtins/search";
import type { ToolExecutionContext, ToolResult } from "@/lib/chernobog/tools/types";
import {
  createToolFailure,
  createToolSuccess,
} from "@/lib/chernobog/tools/types";
import type {
  ChernobogModule,
  ModuleCommandContext,
  ModuleFollowUpContext,
  ModuleHandlerResult,
} from "@/lib/modules/types";

type FileToolName =
  | "find_files"
  | "read_text_file"
  | "open_file"
  | "open_folder"
  | "list_files";

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



const fileWorkflowTools = {
  find_files: findFilesTool,
  read_text_file: readTextFileTool,
  open_file: openFileTool,
  open_folder: openFolderTool,
  list_files: listFilesTool,
} as const;

function isFileToolName(value: string): value is FileToolName {
  return value in fileWorkflowTools;
}

async function executeFileWorkflowTool(
  toolName: FileToolName,
  input: unknown
): Promise<ToolResult> {
  const tool = fileWorkflowTools[toolName];

  if (!tool) {
    return createToolFailure(toolName, `Unknown file workflow tool: ${toolName}`);
  }

  try {
    const validatedInput = tool.inputSchema.parse(input);
    const executeTool = tool.execute as (
      input: unknown,
      context?: ToolExecutionContext
    ) => Promise<unknown> | unknown;
    const output = await executeTool(validatedInput, {
      platform: process.platform,
    });

    return createToolSuccess(tool.name, output);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File workflow tool failed";

    return createToolFailure(toolName, message);
  }
}

function formatFileWorkflowReply(
  result: ToolResult,
  sessionId?: string
): string {
  if (!result.ok) {
    return `File workflow failed: ${result.error}`;
  }

  switch (result.tool) {
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
    case "open_folder": {
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
      return "File workflow tool executed successfully.";
  }
}

async function executeAndTrackFileWorkflowTool(
  toolName: FileToolName,
  input: unknown,
  sessionId: string
): Promise<ToolResult> {
  const session = getSessionContext(sessionId);
  const result = await executeFileWorkflowTool(toolName, input);

  try {
    logToolCall({
      toolName,
      input,
      output: result,
      success: result.ok,
    });
  } catch (logError) {
    console.error("Failed to log file workflow tool call:", logError);
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

function normalizeFileMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function cleanFileQuery(value: string): string {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\.$/, "")
    .trim();
}

function toCommandConfidenceLevel(confidence: number): CommandConfidenceLevel {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

function isOrdinalSelection(value: string): boolean {
  return /^(?:the\s+)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)?)(?:\s+(?:one|result|file))?$/i.test(
    value.trim()
  );
}

function buildFileUnifiedCommand(args: {
  raw: string;
  action: UnifiedCommand["action"];
  target: UnifiedCommand["target"];
  query: string;
  confidence: number;
  reasons: string[];
}): UnifiedCommand {
  return {
    raw: args.raw,
    normalized: normalizeFileMessage(args.raw),
    domain: "file",
    action: args.action,
    target: args.target,
    reference: "explicit",
    query: args.query,
    confidence: args.confidence,
    confidenceLevel: toCommandConfidenceLevel(args.confidence),
    reasons: args.reasons,
    moduleId: "file-workflow",
  };
}

function parseFileWorkflowCommand(message: string): UnifiedCommand | null {
  const normalized = normalizeFileMessage(message);
  const lower = normalized.toLowerCase();

  let match = normalized.match(
    /^(?:search|find)\s+(?:files?|documents?)\s+(?:for|matching|called|named)\s+(.+)$/i
  );

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query || isOrdinalSelection(query)) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "search",
      target: "file",
      query,
      confidence: 0.88,
      reasons: ["file module parsed explicit file search command"],
    });
  }

  match = normalized.match(/^search\s+(?:for\s+)?(.+)$/i);

  if (
    match &&
    /\b(file|files|document|documents|readme|roadmap|note|notes)\b/i.test(lower)
  ) {
    const query = cleanFileQuery(match[1]);

    if (!query || isOrdinalSelection(query)) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "search",
      target: "file",
      query,
      confidence: 0.72,
      reasons: ["file module parsed broad search command with file-like terms"],
    });
  }

  match = normalized.match(/^find\s+(.+)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query || isOrdinalSelection(query)) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "search",
      target: "file",
      query,
      confidence: 0.78,
      reasons: ["file module parsed find command as file search"],
    });
  }

  match = normalized.match(/^(?:list|show)\s+files\s+(?:in|inside)\s+(.+)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "show",
      target: "folder",
      query,
      confidence: 0.86,
      reasons: ["file module parsed explicit list files command"],
    });
  }

  match = normalized.match(/^(?:open|show)\s+(?:folder|directory)\s+(.+)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "open",
      target: "folder",
      query,
      confidence: 0.88,
      reasons: ["file module parsed explicit open folder command"],
    });
  }

  match = normalized.match(/^(?:open|show)\s+(.+?)\s+(?:folder|directory)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "open",
      target: "folder",
      query,
      confidence: 0.86,
      reasons: ["file module parsed trailing folder command"],
    });
  }

  match = normalized.match(/^read\s+(?:file\s+)?(.+)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query || isOrdinalSelection(query)) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "read",
      target: "file",
      query,
      confidence: 0.84,
      reasons: ["file module parsed explicit read file command"],
    });
  }

  match = normalized.match(/^open\s+(?:file\s+)?(.+)$/i);

  if (match) {
    const query = cleanFileQuery(match[1]);

    if (!query || isOrdinalSelection(query)) {
      return null;
    }

    return buildFileUnifiedCommand({
      raw: message,
      action: "open",
      target: "file",
      query,
      confidence: 0.82,
      reasons: ["file module parsed explicit open file command"],
    });
  }

  return null;
}

function hasFolderKeyword(value: string): boolean {
  const cleaned = value.trim();

  return (
    /^(?:folder|directory)\s+/i.test(cleaned) ||
    /\s+(?:folder|directory)$/i.test(cleaned)
  );
}

function stripFolderKeyword(value: string): string {
  return cleanFileQuery(value)
    .replace(/^(?:folder|directory)\s+/i, "")
    .replace(/\s+(?:folder|directory)$/i, "")
    .trim();
}

function isCommonFolderAlias(value: string): boolean {
    const key = stripFolderKeyword(value).toLowerCase();
  
    return [
      "home",
      "~",
      "desktop",
      "downloads",
      "download",
      "documents",
      "document",
      "docs",
      "pictures",
      "photos",
      "music",
      "videos",
    ].includes(key);
  }

  function shouldTreatAsFolder(target: string, query: string): boolean {
    return target === "folder" || hasFolderKeyword(query) || isCommonFolderAlias(query);
  }

function resolveCommonFolderAlias(value: string): string {
  const cleaned = stripFolderKeyword(value);
  const key = cleaned.toLowerCase();
  const home = os.homedir();

  switch (key) {
    case "home":
    case "~":
      return home;

    case "desktop":
      return path.join(home, "Desktop");

    case "downloads":
    case "download":
      return path.join(home, "Downloads");

    case "documents":
    case "document":
    case "docs":
      return path.join(home, "Documents");

    case "pictures":
    case "photos":
      return path.join(home, "Pictures");

    case "music":
      return path.join(home, "Music");

    case "videos":
      return path.join(home, "Videos");

    default:
      return cleaned;
  }
}

function commandToFileToolCall(context: ModuleCommandContext):
  | {
      tool: FileToolName;
      input: unknown;
    }
  | null {
  const command = context.command;

  if (command.domain !== "file") {
    return null;
  }

  if (command.action === "search" && command.query) {
    return {
      tool: "find_files",
      input: {
        query: command.query,
        maxResults: 8,
      },
    };
  }

  if (command.action === "read" && command.query) {
    return {
      tool: "read_text_file",
      input: {
        path: command.query,
      },
    };
  }

  if (command.action === "open" && command.query) {
    const target = String(command.target);
    const query = command.query;

    if (shouldTreatAsFolder(target, query)) {
      return {
        tool: "open_folder",
        input: {
          path: resolveCommonFolderAlias(query),
        },
      };
    }

    return {
      tool: "open_file",
      input: {
        path: query,
      },
    };
  }

  if (command.action === "show" && command.target === "folder" && command.query) {
    return {
      tool: "list_files",
      input: {
        path: resolveCommonFolderAlias(command.query),
      },
    };
  }

  return null;
}

async function handleFileWorkflowCommand(
  context: ModuleCommandContext
): Promise<ModuleHandlerResult> {
  const toolCall = commandToFileToolCall(context);

  if (!toolCall) {
    return {
      route: "chat",
      moduleId: "file-workflow",
      reply:
        "I recognized a file command, but could not map it to a file workflow action.",
    };
  }

  const result = await executeAndTrackFileWorkflowTool(
    toolCall.tool,
    toolCall.input,
    context.sessionId
  );

  return {
    route: "tools",
    moduleId: "file-workflow",
    reply: formatFileWorkflowReply(result, context.sessionId),
    modulePayload: {
      tool: toolCall.tool,
      input: toolCall.input,
      ok: result.ok,
    },
  };
}

async function handleFileWorkflowFollowUp(
  context: ModuleFollowUpContext
): Promise<ModuleHandlerResult | null> {
  const session = getSessionContext(context.sessionId);
  const followUp = tryResolveFollowUp(context.userMessage, session);

  if (followUp.kind === "none") {
    return null;
  }

  if (followUp.kind === "needs_disambiguation") {
    setPendingDisambiguation(session, followUp.pending);
    saveSessionContext(session);

    return {
      route: "tools",
      moduleId: "file-workflow",
      reply: followUp.message,
      modulePayload: {
        followUpKind: followUp.kind,
        pending: followUp.pending,
      },
    };
  }

  if (!isFileToolName(followUp.tool)) {
    return null;
  }

  const result = await executeAndTrackFileWorkflowTool(
    followUp.tool,
    followUp.input,
    context.sessionId
  );

  return {
    route: "tools",
    moduleId: "file-workflow",
    reply: formatFileWorkflowReply(result, context.sessionId),
    modulePayload: {
      followUpKind: followUp.kind,
      tool: followUp.tool,
      input: followUp.input,
      ok: result.ok,
    },
  };
}

export const fileWorkflowModule: ChernobogModule = {
  id: "file-workflow",
  displayName: "File Workflow",
  domains: ["file"],
  followUpPriority: 60,

  parseCommand: parseFileWorkflowCommand,
  handleCommand: handleFileWorkflowCommand,
  handleFollowUp: handleFileWorkflowFollowUp,
};