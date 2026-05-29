import type {
    CommandConfidenceLevel,
    CommandTarget,
    UnifiedCommand,
  } from "@/lib/chernobog/command-language";
  
  import {
    handleVaultCommand,
    handleVaultFollowUp,
  } from "@/lib/modules/obsidian-vault";
  
  import { parseVaultCommand } from "@/lib/modules/obsidian-vault/commands/parseVaultCommand";
  import { vaultToolRegistry } from "@/lib/modules/obsidian-vault/tools/registry";
  import type { VaultParsedCommand } from "@/lib/modules/obsidian-vault/types";
  import type {
    ChernobogModule,
    ModuleCommandContext,
    ModuleHandlerResult,
  } from "@/lib/modules/types";

import type { RouteName } from "@/lib/chernobog/session/types";
import type { ModuleCommandResult } from "@/lib/modules/obsidian-vault/contract";
  
  function toConfidenceLevel(confidence: number): CommandConfidenceLevel {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }
  
  function getVaultTarget(command: VaultParsedCommand): CommandTarget {
    switch (command.action) {
      case "search":
        return "vault";
  
      case "read":
      case "create":
      case "append":
      case "link":
        return "vault_note";
  
      case "backlinks":
      case "orphans":
        return "vault_graph";
  
      case "index":
        return "vault_index";
  
      case "daily_log":
        return "daily_log";
  
      default:
        return "vault";
    }
  }
  
  function getVaultQuery(command: VaultParsedCommand): string | undefined {
    const candidate = command as VaultParsedCommand & {
      query?: string;
      note?: string;
      project?: string;
      targetNote?: string;
      sourceNote?: string;
    };
  
    return (
      candidate.query ??
      candidate.note ??
      candidate.project ??
      candidate.targetNote ??
      candidate.sourceNote ??
      undefined
    );
  }
  
  function adaptVaultCommand(command: VaultParsedCommand): UnifiedCommand {
    return {
      raw: command.raw,
      normalized: command.normalized,
      domain: "vault",
      action: command.action as UnifiedCommand["action"],
      target: getVaultTarget(command),
      reference: "explicit",
      query: getVaultQuery(command),
      confidence: command.confidence,
      confidenceLevel: toConfidenceLevel(command.confidence),
      reasons: command.reasons,
  
      moduleId: "obsidian-vault",
      moduleCommand: command,
    };
  }

  function normalizeVaultMessage(message: string): string {
    return message.trim().replace(/\s+/g, " ");
  }
  
  function cleanVaultValue(value: string): string {
    return value
      .trim()
      .replace(/^\[\[|\]\]$/g, "")
      .replace(/^['"]|['"]$/g, "")
      .replace(/\.$/, "")
      .trim();
  }
  
  function parseUnifiedVaultGrammar(message: string): VaultParsedCommand | null {
    const normalized = normalizeVaultMessage(message);
  
    let match = normalized.match(/^search\s+vault\s+(?:for|about)\s+(.+)$/i);
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "search",
        query: cleanVaultValue(match[1]),
        confidence: 0.9,
        reasons: ["vault module parsed unified vault search grammar"],
      };
    }
  
    match = normalized.match(/^read\s+(?:vault\s+)?(?:note\s+)?(.+)$/i);
  
    if (match && /\bvault\b/i.test(normalized)) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "read",
        note: cleanVaultValue(match[1]),
        confidence: 0.86,
        reasons: ["vault module parsed unified vault read grammar"],
      };
    }
  
    match = normalized.match(/^read\s+note\s+(.+?)\s+from\s+vault$/i);
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "read",
        note: cleanVaultValue(match[1]),
        confidence: 0.88,
        reasons: ["vault module parsed read note from vault grammar"],
      };
    }
  
    match = normalized.match(
      /^(?:show\s+)?backlinks\s+(?:for\s+)?(?:vault\s+note\s+|note\s+)?(.+)$/i
    );
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "backlinks",
        note: cleanVaultValue(match[1]),
        confidence: 0.84,
        reasons: ["vault module parsed unified backlinks grammar"],
      };
    }
  
    match = normalized.match(/^create\s+vault\s+note\s+(.+)$/i);
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "create",
        note: cleanVaultValue(match[1]),
        confidence: 0.84,
        reasons: ["vault module parsed unified create vault note grammar"],
      };
    }
  
    match = normalized.match(/^append\s+to\s+vault\s+note\s+(.+?)\s*[:\-]\s*(.+)$/i);
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "append",
        note: cleanVaultValue(match[1]),
        content: match[2].trim(),
        confidence: 0.86,
        reasons: ["vault module parsed unified append vault note grammar"],
      };
    }
  
    match = normalized.match(
      /^link\s+vault\s+note\s+(.+?)\s+(?:to|with)\s+(.+)$/i
    );
  
    if (match) {
      return {
        raw: message,
        normalized,
        domain: "vault",
        action: "link",
        note: cleanVaultValue(match[1]),
        targetNote: cleanVaultValue(match[2]),
        confidence: 0.86,
        reasons: ["vault module parsed unified link vault note grammar"],
      };
    }
  
    return null;
  }
  
  function parseObsidianVaultCommand(message: string): UnifiedCommand | null {
    const unifiedGrammarCommand = parseUnifiedVaultGrammar(message);
  
    if (unifiedGrammarCommand) {
      return adaptVaultCommand(unifiedGrammarCommand);
    }
  
    const parsed = parseVaultCommand(message);
  
    if (!parsed) {
      return null;
    }
  
    return adaptVaultCommand(parsed);
  }
  
  function getVaultModuleCommand(command: UnifiedCommand): VaultParsedCommand | null {
    if (command.domain !== "vault") {
      return null;
    }
  
    const moduleCommand = command.moduleCommand as VaultParsedCommand | undefined;
  
    if (!moduleCommand || moduleCommand.domain !== "vault") {
      return null;
    }
  
    return moduleCommand;
  }

  function normalizeVaultRoute(route: ModuleCommandResult["route"]): RouteName {
    switch (route) {
      case "tools":
      case "memory":
      case "planner":
      case "chat":
        return route;
  
      case "context":
      default:
        return "chat";
    }
  }
  
  function adaptVaultResult(result: ModuleCommandResult): ModuleHandlerResult {
    return {
      route: normalizeVaultRoute(result.route),
      reply: result.reply,
      moduleId: "obsidian-vault",
      modulePayload: result.modulePayload,
    };
  }
  
  async function handleObsidianVaultCommand(
    context: ModuleCommandContext
  ): Promise<ModuleHandlerResult> {
    const vaultCommand = getVaultModuleCommand(context.command);
  
    if (!vaultCommand) {
      return {
        route: "tools",
        reply:
          "Vault command was recognized, but the vault module payload was missing.",
      };
    }
  
    const result = await handleVaultCommand({
      userMessage: context.userMessage,
      sessionId: context.sessionId,
      command: vaultCommand,
    });
  
    return adaptVaultResult(result);
  }

  async function handleObsidianVaultFollowUp(context: {
    userMessage: string;
    sessionId: string;
  }): Promise<ModuleHandlerResult | null> {
    const result = await handleVaultFollowUp({
      userMessage: context.userMessage,
      sessionId: context.sessionId,
    });
  
    if (!result) {
      return null;
    }
  
    return adaptVaultResult(result);
  }
  
  export const obsidianVaultModule: ChernobogModule = {
    id: "obsidian-vault",
    displayName: "Obsidian Vault",
    domains: ["vault"],
    followUpPriority: 80,
  
    tools: vaultToolRegistry,
  
    parseCommand: parseObsidianVaultCommand,
    handleCommand: handleObsidianVaultCommand,
    handleFollowUp: handleObsidianVaultFollowUp,
  };