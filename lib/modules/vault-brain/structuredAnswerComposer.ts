import type { StructuredVaultRecallResult } from "./structuredRecall";

export type StructuredVaultAnswer = {
  ok: boolean;
  answer: string;
  usedEntryIds: string[];
  warnings: string[];
};

export function composeStructuredVaultAnswer(
  recall: StructuredVaultRecallResult
): StructuredVaultAnswer {
  const entries = recall.packet.retrievedEntries;
  const warnings = [...recall.packet.missingInfoWarnings];

  if (recall.packet.answerMode === "vault-only" && entries.length === 0) {
    return {
      ok: false,
      answer: "I do not have enough approved structured vault memory to answer that safely.",
      usedEntryIds: [],
      warnings,
    };
  }

  const lines = entries.flatMap((entry, index) => [
    `${index + 1}. ${entry.title}`,
    `   Type: ${entry.memoryType}`,
    `   Status: ${entry.status}`,
    entry.projectId ? `   Project: ${entry.projectId}` : undefined,
    entry.version ? `   Version: ${entry.version}` : undefined,
    `   ${entry.excerpt}`,
  ]).filter((line): line is string => typeof line === "string");

  return {
    ok: true,
    answer: [
      `Structured vault recall for: ${recall.request.query}`,
      "",
      ...lines,
    ].join("\n"),
    usedEntryIds: entries.map((entry) => entry.id),
    warnings,
  };
}

export function formatStructuredVaultAnswer(answer: StructuredVaultAnswer): string {
  const warningBlock = answer.warnings.length > 0
    ? ["", "Warnings:", ...answer.warnings.map((warning) => `- ${warning}`)].join("\n")
    : "";

  return `${answer.answer}${warningBlock}`;
}
