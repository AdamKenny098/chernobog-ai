import type { CommandConfidenceLevel } from "./types";

export function normalizeCommandText(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

export function confidenceLevel(score: number): CommandConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function extractStepIndex(message: string): number | undefined {
  const match = message.match(/\b(?:step\s*)?(\d{1,2})\b/);

  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1], 10);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function cleanQuery(message: string): string {
  return message
    .trim()
    .replace(/^(can you|could you|please)\s+/i, "")
    .replace(/\b(the|a|an)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}