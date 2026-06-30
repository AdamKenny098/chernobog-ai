import { buildMemoryContextPacket } from "./memoryContextPacket";
import { createVaultMemoryStore } from "./memoryStore";
import type { VaultMemoryManifest } from "./memoryManifest";
import { composeStructuredVaultAnswer, formatStructuredVaultAnswer } from "./structuredAnswerComposer";
import { recallStructuredVaultMemory } from "./structuredRecall";
import type { VaultBrainCommandResult } from "./types";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function formatManifest(status: VaultMemoryManifest): string {
  return [
    `Generated: ${status.generatedAt}`,
    `Total entries: ${status.totalEntries}`,
    `Approved entries: ${status.approvedEntries}`,
    `Review queue entries: ${status.reviewQueueEntries}`,
    `Raw entries: ${status.rawEntries}`,
    "",
    "By status:",
    ...Object.entries(status.byStatus).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "By type:",
    ...Object.entries(status.byType).map(([key, value]) => `- ${key}: ${value}`),
  ].join("\n");
}

export function isStructuredMemoryCommand(command: string): boolean {
  const normalized = normalize(command);
  return (
    /^show structured memory status$/i.test(normalized) ||
    /^show structured memory manifest$/i.test(normalized) ||
    /^recall approved memory\s+.+$/i.test(normalized) ||
    /^recall vault memory\s+.+$/i.test(normalized) ||
    /^ask approved vault\s+.+$/i.test(normalized) ||
    /^ask structured vault\s+.+$/i.test(normalized) ||
    /^build memory context packet\s+.+$/i.test(normalized)
  );
}

export async function executeStructuredMemoryCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);
  const store = createVaultMemoryStore();

  if (/^show structured memory (status|manifest)$/i.test(normalized)) {
    const manifest = await store.loadManifest();
    return {
      ok: true,
      title: "Structured Memory Manifest",
      message: formatManifest(manifest),
      data: manifest,
    };
  }

  if (/^recall approved memory\s+.+$/i.test(normalized) || /^recall vault memory\s+.+$/i.test(normalized)) {
    const query = normalized
      .replace(/^recall approved memory\s+/i, "")
      .replace(/^recall vault memory\s+/i, "");
    const result = await recallStructuredVaultMemory({ query, answerMode: "vault-only" });

    return {
      ok: true,
      title: "Approved Structured Memory Recall",
      message: result.packet.retrievedEntries.length > 0
        ? result.packet.retrievedEntries
            .map((entry, index) => [
              `${index + 1}. ${entry.title}`,
              `   ID: ${entry.id}`,
              `   Type: ${entry.memoryType}`,
              `   Status: ${entry.status}`,
              entry.projectId ? `   Project: ${entry.projectId}` : undefined,
              entry.version ? `   Version: ${entry.version}` : undefined,
              `   ${entry.excerpt}`,
            ].filter(Boolean).join("\n"))
            .join("\n\n")
        : "No approved structured memory matched that query.",
      data: result,
    };
  }

  if (/^ask approved vault\s+.+$/i.test(normalized) || /^ask structured vault\s+.+$/i.test(normalized)) {
    const query = normalized
      .replace(/^ask approved vault\s+/i, "")
      .replace(/^ask structured vault\s+/i, "");
    const recall = await recallStructuredVaultMemory({ query, answerMode: "vault-only" });
    const answer = composeStructuredVaultAnswer(recall);

    return {
      ok: answer.ok,
      title: "Structured Vault Answer",
      message: formatStructuredVaultAnswer(answer),
      data: { recall, answer },
    };
  }

  if (/^build memory context packet\s+.+$/i.test(normalized)) {
    const query = normalized.replace(/^build memory context packet\s+/i, "");
    const recall = await recallStructuredVaultMemory({ query, answerMode: "vault-only" });
    const packet = buildMemoryContextPacket({
      query,
      entries: recall.entries,
      answerMode: "vault-only",
      projectScope: recall.request.projectId,
      versionScope: recall.request.version,
      missingInfoWarnings: recall.warnings,
    });

    return {
      ok: true,
      title: "Memory Context Packet",
      message: JSON.stringify(packet, null, 2),
      data: packet,
    };
  }

  return {
    ok: false,
    title: "Structured memory command not recognized",
    message: "Try: show structured memory manifest, recall approved memory <query>, or ask approved vault <question>.",
  };
}

// V5.6.4A compatibility aliases for V5.6.3 command bridge imports.
export const isStructuredVaultMemoryCommand = isStructuredMemoryCommand;
export const executeStructuredVaultMemoryCommand = executeStructuredMemoryCommand;
