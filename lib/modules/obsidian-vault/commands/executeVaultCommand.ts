import type { ToolResult } from "@/lib/chernobog/tools/types";
import type { ModuleCommandContext, ModuleCommandResult } from "../contract";
import { vaultToolRegistry } from "../tools/registry";
import { formatVaultReply } from "./formatVaultReply";

async function executeVaultTool(
  name: keyof typeof vaultToolRegistry,
  input: unknown
): Promise<ToolResult<unknown>> {
  const tool = vaultToolRegistry[name];
  const result = await tool.execute(input as never, { platform: process.platform });
  return result as ToolResult<unknown>;
}

export async function handleVaultCommand(
  context: ModuleCommandContext
): Promise<ModuleCommandResult> {
  const command = context.command;

  switch (command.action) {
    case "search": {
      const result = await executeVaultTool("vault_search", {
        query: command.query ?? "",
        folder: command.folder,
        maxResults: 20,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "read": {
      const result = await executeVaultTool("vault_read_note", {
        note: command.note ?? "",
        folder: command.folder,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "create": {
      const result = await executeVaultTool("vault_create_note", {
        title: command.note ?? "Untitled Vault Note",
        type: command.type ?? "note",
        folder: command.folder,
        project: command.project,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "append": {
      const result = await executeVaultTool("vault_append_note", {
        note: command.note ?? "",
        content: command.content ?? "",
        folder: command.folder,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "link": {
      const result = await executeVaultTool("vault_link_notes", {
        from: command.note ?? "",
        to: command.targetNote ?? "",
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "backlinks": {
      const result = await executeVaultTool("vault_backlinks", {
        note: command.note ?? "",
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "orphans": {
      const result = await executeVaultTool("vault_find_orphans", {
        maxResults: 50,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "index": {
      const result = await executeVaultTool("vault_generate_index", {
        project: command.project ?? command.note ?? "Chernobog",
        overwrite: true,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    case "daily_log": {
      const result = await executeVaultTool("vault_daily_log", {
        project: command.project,
        content: command.content ?? context.userMessage,
      });

      return {
        route: "tools",
        reply: formatVaultReply(result),
      };
    }

    default: {
      return {
        route: "tools",
        reply: `Vault command not implemented: ${command.action}`,
      };
    }
  }
}
