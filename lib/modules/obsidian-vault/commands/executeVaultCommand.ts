import type { ToolResult } from "@/lib/chernobog/tools/types";
import type { ModuleCommandContext, ModuleCommandResult } from "../contract";
import {
  buildVaultModulePayload,
  getVaultSessionState,
  summarizeVaultState,
  updateVaultSessionFromToolResult,
} from "../session/vaultSession";
import { vaultToolRegistry } from "../tools/registry";
import { formatVaultReply } from "./formatVaultReply";
import { parseVaultFollowUp } from "./parseVaultFollowUp";

async function executeVaultTool(
  name: keyof typeof vaultToolRegistry,
  input: unknown
): Promise<ToolResult<unknown>> {
  const tool = vaultToolRegistry[name];
  const result = await tool.execute(input as never, { platform: process.platform });
  return result as ToolResult<unknown>;
}

async function executeAndRecord(
  context: ModuleCommandContext,
  toolName: keyof typeof vaultToolRegistry,
  input: unknown
): Promise<ModuleCommandResult> {
  const result = await executeVaultTool(toolName, input);
  updateVaultSessionFromToolResult(context.sessionId, context.command.action, result);

  return {
    route: "tools",
    reply: formatVaultReply(result),
    modulePayload: buildVaultModulePayload(context.sessionId),
  };
}

export async function handleVaultCommand(
  context: ModuleCommandContext
): Promise<ModuleCommandResult> {
  const command = context.command;

  switch (command.action) {
    case "search": {
      return executeAndRecord(context, "vault_search", {
        query: command.query ?? "",
        folder: command.folder,
        maxResults: 20,
      });
    }

    case "read": {
      return executeAndRecord(context, "vault_read_note", {
        note: command.note ?? "",
        folder: command.folder,
      });
    }

    case "create": {
      return executeAndRecord(context, "vault_create_note", {
        title: command.note ?? "Untitled Vault Note",
        type: command.type ?? "note",
        folder: command.folder,
        project: command.project,
        content: command.content,
      });
    }

    case "append": {
      return executeAndRecord(context, "vault_append_note", {
        note: command.note ?? "",
        content: command.content ?? "",
        folder: command.folder,
        createIfMissing: true,
      });
    }

    case "link": {
      return executeAndRecord(context, "vault_link_notes", {
        from: command.note ?? "",
        to: command.targetNote ?? "",
      });
    }

    case "backlinks": {
      return executeAndRecord(context, "vault_backlinks", {
        note: command.note ?? "",
      });
    }

    case "orphans": {
      return executeAndRecord(context, "vault_find_orphans", {
        maxResults: 50,
      });
    }

    case "index": {
      return executeAndRecord(context, "vault_generate_index", {
        project: command.project ?? command.note ?? "Chernobog",
        overwrite: true,
      });
    }

    case "daily_log": {
      return executeAndRecord(context, "vault_daily_log", {
        project: command.project,
        content: command.content ?? context.userMessage,
      });
    }

    case "status": {
      const state = getVaultSessionState(context.sessionId);
      return {
        route: "tools",
        reply: summarizeVaultState(state),
        modulePayload: buildVaultModulePayload(context.sessionId),
      };
    }

    default: {
      return {
        route: "tools",
        reply: `Vault command not implemented: ${command.action}`,
        modulePayload: buildVaultModulePayload(context.sessionId),
      };
    }
  }
}

export async function handleVaultFollowUp(
  context: Omit<ModuleCommandContext, "command">
): Promise<ModuleCommandResult | null> {
  const command = parseVaultFollowUp(context.sessionId, context.userMessage);

  if (!command) {
    return null;
  }

  return handleVaultCommand({
    ...context,
    command,
  });
}
