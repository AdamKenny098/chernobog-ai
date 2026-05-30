import type {
    CommandConfidenceLevel,
    UnifiedCommand,
  } from "@/lib/chernobog/command-language";
  
  function normalizeDiscordMessage(message: string): string {
    return message.trim().replace(/\s+/g, " ");
  }
  
  function toConfidenceLevel(confidence: number): CommandConfidenceLevel {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }
  
  function buildDiscordCommand(args: {
    raw: string;
    action: UnifiedCommand["action"];
    target: UnifiedCommand["target"];
    query?: string;
    confidence: number;
    reasons: string[];
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
    };
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
  
    return null;
  }