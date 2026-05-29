import {
    clearPendingDisambiguation,
    getSessionContext,
    saveSessionContext,
    setPendingDisambiguation,
  } from "@/lib/chernobog/session/store";
  import { tryResolveFollowUp } from "@/lib/chernobog/session/followups";
  import {
    setSelectedFileFromPath,
    updateSessionFromToolResult,
  } from "@/lib/chernobog/session/update";
  import { logToolCall } from "@/lib/chernobog/db";
  import type { ToolDefinition, ToolResult } from "@/lib/chernobog/tools/types";
  import {
    createToolFailure,
    createToolSuccess,
  } from "@/lib/chernobog/tools/types";
  import {
    listFilesTool,
    openFileTool,
    openFolderTool,
    readTextFileTool,
  } from "@/lib/chernobog/tools/builtins/files";
  import { findFilesTool } from "@/lib/chernobog/tools/builtins/search";
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
  
  type FileToolDefinition = ToolDefinition<any, any>;
  
  const fileWorkflowTools: Record<FileToolName, FileToolDefinition> = {
    find_files: findFilesTool,
    read_text_file: readTextFileTool,
    open_file: openFileTool,
    open_folder: openFolderTool,
    list_files: listFilesTool,
  };
  
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
      const output = await tool.execute(validatedInput, {
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
      if (!(session.workflow.kind === "file" && session.workflow.awaitingDisambiguation)) {
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
      return {
        tool: command.target === "folder" ? "open_folder" : "open_file",
        input: {
          path: command.query,
        },
      };
    }
  
    if (command.action === "show" && command.target === "folder" && command.query) {
      return {
        tool: "list_files",
        input: {
          path: command.query,
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
        reply: "I recognized a file command, but could not map it to a file workflow action.",
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
  
    handleCommand: handleFileWorkflowCommand,
    handleFollowUp: handleFileWorkflowFollowUp,
  };