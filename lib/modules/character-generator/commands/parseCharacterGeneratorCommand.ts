import type {
  CommandConfidenceLevel,
  UnifiedCommand,
} from "@/lib/chernobog/command-language";

import type { CharacterGeneratorModuleCommand } from "../types";

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function confidenceLevel(confidence: number): CommandConfidenceLevel {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

function buildCommand(args: {
  raw: string;
  action: UnifiedCommand["action"];
  query?: string;
  confidence: number;
  reason: string;
  moduleCommand: CharacterGeneratorModuleCommand;
}): UnifiedCommand {
  return {
    raw: args.raw,
    normalized: normalizeMessage(args.raw).toLowerCase(),
    domain: "character",
    action: args.action,
    target: "character_project",
    reference: "explicit",
    query: args.query,
    confidence: args.confidence,
    confidenceLevel: confidenceLevel(args.confidence),
    reasons: [args.reason],
    moduleId: "character-generator",
    moduleCommand: args.moduleCommand,
  };
}

function parseCreateCommand(
  rawMessage: string,
  normalized: string
): UnifiedCommand | null {
  const namedMatch = normalized.match(
    /^(?:create\s+(?:a\s+)?character\s+project|character\s+forge\s+create)\s+named\s+(.+?)\s*:\s*(.+)$/i
  );

  if (namedMatch) {
    const name = namedMatch[1]?.trim();
    const prompt = namedMatch[2]?.trim();

    if (name && prompt) {
      return buildCommand({
        raw: rawMessage,
        action: "create",
        query: prompt,
        confidence: 0.98,
        reason: "character generator parsed explicit named project creation",
        moduleCommand: {
          kind: "character_project_create",
          name,
          prompt,
        },
      });
    }
  }

  const promptMatch = normalized.match(
    /^(?:create\s+(?:a\s+)?character\s+project|character\s+forge\s+create)\s*:\s*(.+)$/i
  );

  const prompt = promptMatch?.[1]?.trim();

  if (!prompt) {
    return null;
  }

  return buildCommand({
    raw: rawMessage,
    action: "create",
    query: prompt,
    confidence: 0.97,
    reason: "character generator parsed explicit project creation",
    moduleCommand: {
      kind: "character_project_create",
      prompt,
    },
  });
}

export function parseCharacterGeneratorCommand(
  message: string
): UnifiedCommand | null {
  const normalized = normalizeMessage(message);

  if (/^(?:character\s+forge|character\s+generator)\s+status$/i.test(normalized)) {
    return buildCommand({
      raw: message,
      action: "status",
      confidence: 0.98,
      reason: "character generator parsed explicit status command",
      moduleCommand: { kind: "character_generator_status" },
    });
  }

  if (/^(?:list|show)\s+character\s+projects$/i.test(normalized)) {
    return buildCommand({
      raw: message,
      action: "show",
      confidence: 0.97,
      reason: "character generator parsed project list command",
      moduleCommand: { kind: "character_project_list" },
    });
  }

  const showMatch = normalized.match(
    /^(?:show|view)\s+character\s+project\s+(character-[a-zA-Z0-9._-]+)$/i
  );

  if (showMatch?.[1]) {
    return buildCommand({
      raw: message,
      action: "show",
      query: showMatch[1],
      confidence: 0.98,
      reason: "character generator parsed explicit project lookup",
      moduleCommand: {
        kind: "character_project_show",
        projectId: showMatch[1],
      },
    });
  }

  return parseCreateCommand(message, normalized);
}
