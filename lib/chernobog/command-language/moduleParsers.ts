import type {
    CommandConfidenceLevel,
    CommandTarget,
    UnifiedCommand,
  } from "./types";
  import { parseVaultCommand } from "@/lib/modules/obsidian-vault/commands/parseVaultCommand";
  import type { VaultParsedCommand } from "@/lib/modules/obsidian-vault/types";
  
  export type ModuleCommandParser = (message: string) => UnifiedCommand | null;
  
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
  
  function adaptVaultCommand(command: VaultParsedCommand): UnifiedCommand {
    return {
      raw: command.raw,
      normalized: command.normalized,
      domain: "vault",
      action: command.action,
      target: getVaultTarget(command),
      reference: "explicit",
      query:
        command.query ??
        command.note ??
        command.project ??
        command.targetNote ??
        undefined,
      confidence: command.confidence,
      confidenceLevel: toConfidenceLevel(command.confidence),
      reasons: command.reasons,
  
      moduleId: "obsidian-vault",
      moduleCommand: command,
    };
  }
  
  function parseObsidianVaultModuleCommand(message: string): UnifiedCommand | null {
    const parsed = parseVaultCommand(message);
  
    if (!parsed) {
      return null;
    }
  
    return adaptVaultCommand(parsed);
  }
  
  export const moduleCommandParsers: ModuleCommandParser[] = [
    parseObsidianVaultModuleCommand,
  ];
  
  export function parseModuleCommand(message: string): UnifiedCommand | null {
    for (const parser of moduleCommandParsers) {
      const parsed = parser(message);
  
      if (parsed) {
        return parsed;
      }
    }
  
    return null;
  }