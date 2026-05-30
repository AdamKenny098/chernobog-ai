import type {
    CommandConfidenceLevel,
    UnifiedCommand,
  } from "@/lib/chernobog/command-language";
  import type { DiscordScanModuleCommand } from "../types";
  
  function normalizeDiscordMessage(message: string): string {
    return message.trim().replace(/\s+/g, " ");
  }
  
  function toConfidenceLevel(confidence: number): CommandConfidenceLevel {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }
  
  function clampLimit(value: number): number {
    if (!Number.isFinite(value)) {
      return 25;
    }
  
    return Math.max(1, Math.min(100, Math.floor(value)));
  }
  
  function getLimitFromMessage(message: string): number {
    const normalized = normalizeDiscordMessage(message);
    const match = normalized.match(/\b(?:last|latest|recent)\s+(\d{1,3})\b/i);
  
    if (!match) {
      return 25;
    }
  
    return clampLimit(Number(match[1]));
  }
  
  function buildDiscordCommand(args: {
    raw: string;
    action: UnifiedCommand["action"];
    target: UnifiedCommand["target"];
    query?: string;
    confidence: number;
    reasons: string[];
    moduleCommand?: unknown;
  }): UnifiedCommand {
    return {
      raw: args.raw,
      normalized: normalizeDiscordMessage(args.raw),
      domain: "discord",
      action: args.action,
      target: args.target,
      reference: "explicit",
      query: args.query,
      confidence: args.confidence,
      confidenceLevel: toConfidenceLevel(args.confidence),
      reasons: args.reasons,
      moduleId: "discord-ingest",
      moduleCommand: args.moduleCommand,
    };
  }
  
  function buildDiscordScanCommand(message: string, confidence: number): UnifiedCommand {
    const limit = getLimitFromMessage(message);
    const moduleCommand: DiscordScanModuleCommand = {
      kind: "discord_scan_messages",
      limit,
    };
  
    return buildDiscordCommand({
      raw: message,
      action: "search",
      target: "discord_channel",
      query: "ideas",
      confidence,
      reasons: ["discord module parsed idea channel scan command"],
      moduleCommand,
    });
  }
  
  export function parseDiscordCommand(message: string): UnifiedCommand | null {
    const normalized = normalizeDiscordMessage(message);
  
    if (/^discord\s+status$/i.test(normalized)) {
      return buildDiscordCommand({
        raw: message,
        action: "status",
        target: "discord",
        confidence: 0.96,
        reasons: ["discord module parsed explicit status command"],
      });
    }
  
    if (/^discord\s+(?:ingest\s+)?(?:check|health|connection)$/i.test(normalized)) {
      return buildDiscordCommand({
        raw: message,
        action: "status",
        target: "discord",
        confidence: 0.9,
        reasons: ["discord module parsed connection check command"],
      });
    }
  
    if (/^check\s+discord$/i.test(normalized)) {
      return buildDiscordCommand({
        raw: message,
        action: "status",
        target: "discord",
        confidence: 0.84,
        reasons: ["discord module parsed natural status command"],
      });
    }
  
    if (
      /^discord\s+(?:scan|fetch|preview)\s+(?:ideas|idea\s+channel)$/i.test(
        normalized
      )
    ) {
      return buildDiscordScanCommand(message, 0.92);
    }
  
    if (
      /^discord\s+(?:scan|fetch|preview)\s+(?:last|latest|recent)\s+\d{1,3}\s+(?:messages|ideas)$/i.test(
        normalized
      )
    ) {
      return buildDiscordScanCommand(message, 0.9);
    }
  
    if (/^discord\s+scan\s+last\s+\d{1,3}\s+messages\s+from\s+ideas$/i.test(normalized)) {
      return buildDiscordScanCommand(message, 0.9);
    }
  
    return null;
  }