import {
  applyMemoryCorrection,
  loadMemoryCorrections,
  normalizeCorrectableVaultMemoryField,
  type CorrectableVaultMemoryField,
  type JsonValue,
  type VaultMemoryCorrection,
} from "./memoryCorrections";
import type { VaultMemoryEntry } from "./memoryTypes";
import type { VaultBrainCommandResult } from "./types";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function formatJsonValue(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function formatCorrection(correction: VaultMemoryCorrection): string {
  return [
    `- ${correction.correctedAt}: ${correction.fieldChanged}`,
    `  Correction ID: ${correction.id}`,
    `  Entry: ${correction.memoryEntryId}`,
    correction.actor ? `  Actor: ${correction.actor}` : undefined,
    correction.reason ? `  Reason: ${correction.reason}` : undefined,
    `  Previous: ${formatJsonValue(correction.previousValue)}`,
    `  New: ${formatJsonValue(correction.newValue)}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatEntrySummary(entry: VaultMemoryEntry): string {
  const scope = [entry.projectId, entry.version].filter(Boolean).join(" / ");
  return [
    `ID: ${entry.id}`,
    `Title: ${entry.title}`,
    `Status: ${entry.status}`,
    `Type: ${entry.memoryType}`,
    scope ? `Scope: ${scope}` : undefined,
    `Confidence: ${entry.confidence}`,
    entry.tags.length > 0 ? `Tags: ${entry.tags.join(", ")}` : "Tags: none",
    `Updated: ${entry.updatedAt}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function extractCorrectionMatch(command: string): {
  memoryEntryId: string;
  field: CorrectableVaultMemoryField;
  value: string;
} | undefined {
  const entryFirst = command.match(/^correct memory entry\s+(\S+)\s+([a-z0-9_\- ]+?)\s+to\s+([\s\S]+)$/i)
    ?? command.match(/^set memory entry\s+(\S+)\s+([a-z0-9_\- ]+?)\s+to\s+([\s\S]+)$/i);

  if (entryFirst) {
    const field = normalizeCorrectableVaultMemoryField(entryFirst[2]);
    if (field) {
      return {
        memoryEntryId: entryFirst[1],
        field,
        value: entryFirst[3].trim(),
      };
    }
  }

  const fieldFirst = command.match(/^correct memory\s+([a-z0-9_\- ]+?)\s+(\S+)\s+to\s+([\s\S]+)$/i)
    ?? command.match(/^set memory\s+([a-z0-9_\- ]+?)\s+(\S+)\s+to\s+([\s\S]+)$/i);

  if (fieldFirst) {
    const field = normalizeCorrectableVaultMemoryField(fieldFirst[1]);
    if (field) {
      return {
        memoryEntryId: fieldFirst[2],
        field,
        value: fieldFirst[3].trim(),
      };
    }
  }

  const projectMove = command.match(/^move memory entry\s+(\S+)\s+to project\s+(\S+)$/i);
  if (projectMove) {
    return {
      memoryEntryId: projectMove[1],
      field: "projectId",
      value: projectMove[2],
    };
  }

  const versionMove = command.match(/^move memory entry\s+(\S+)\s+to version\s+(\S+)$/i);
  if (versionMove) {
    return {
      memoryEntryId: versionMove[1],
      field: "version",
      value: versionMove[2],
    };
  }

  const retag = command.match(/^retag memory entry\s+(\S+)\s+as\s+([\s\S]+)$/i);
  if (retag) {
    return {
      memoryEntryId: retag[1],
      field: "tags",
      value: retag[2].trim(),
    };
  }

  const confidence = command.match(/^set memory confidence\s+(\S+)\s+to\s+([\d.]+)$/i);
  if (confidence) {
    return {
      memoryEntryId: confidence[1],
      field: "confidence",
      value: confidence[2],
    };
  }

  return undefined;
}

async function showCorrections(memoryEntryId?: string): Promise<VaultBrainCommandResult> {
  const corrections = await loadMemoryCorrections({ memoryEntryId, limit: 40 });
  return {
    ok: true,
    title: memoryEntryId ? "Memory Correction History" : "Memory Correction Audit Trail",
    message: corrections.length > 0
      ? corrections.map(formatCorrection).join("\n\n")
      : memoryEntryId
        ? `No corrections have been recorded for memory entry: ${memoryEntryId}`
        : "No memory corrections have been recorded yet.",
    data: corrections,
  };
}

export function isMemoryCorrectionCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show memory corrections$/i.test(normalized) ||
    /^show memory correction audit$/i.test(normalized) ||
    /^show memory corrections for\s+\S+$/i.test(normalized) ||
    /^show memory correction history\s+\S+$/i.test(normalized) ||
    /^correct memory entry\s+\S+\s+[a-z0-9_\- ]+?\s+to\s+.+$/i.test(normalized) ||
    /^correct memory\s+[a-z0-9_\- ]+?\s+\S+\s+to\s+.+$/i.test(normalized) ||
    /^set memory entry\s+\S+\s+[a-z0-9_\- ]+?\s+to\s+.+$/i.test(normalized) ||
    /^set memory\s+[a-z0-9_\- ]+?\s+\S+\s+to\s+.+$/i.test(normalized) ||
    /^move memory entry\s+\S+\s+to project\s+\S+$/i.test(normalized) ||
    /^move memory entry\s+\S+\s+to version\s+\S+$/i.test(normalized) ||
    /^retag memory entry\s+\S+\s+as\s+.+$/i.test(normalized) ||
    /^set memory confidence\s+\S+\s+to\s+[\d.]+$/i.test(normalized)
  );
}

export async function executeMemoryCorrectionCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show memory corrections$/i.test(normalized) || /^show memory correction audit$/i.test(normalized)) {
    return showCorrections();
  }

  const historyMatch = normalized.match(/^show memory corrections for\s+(\S+)$/i)
    ?? normalized.match(/^show memory correction history\s+(\S+)$/i);
  if (historyMatch) {
    return showCorrections(historyMatch[1]);
  }

  const correction = extractCorrectionMatch(normalized);
  if (!correction) {
    return {
      ok: false,
      title: "Memory correction command not recognized",
      message: [
        "Try one of these:",
        "- show memory corrections",
        "- show memory corrections for <id>",
        "- correct memory entry <id> <field> to <value>",
        "- correct memory <field> <id> to <value>",
        "- move memory entry <id> to project <projectId>",
        "- move memory entry <id> to version <version>",
        "- retag memory entry <id> as <tag1>, <tag2>",
      ].join("\n"),
    };
  }

  try {
    const result = await applyMemoryCorrection({
      memoryEntryId: correction.memoryEntryId,
      field: correction.field,
      value: correction.value,
      actor: "chernobog-command",
      reason: `V5.6.7 command correction for ${correction.field}.`,
    });

    return {
      ok: true,
      title: "Memory Correction Applied",
      message: [
        formatEntrySummary(result.entry),
        "",
        "Correction:",
        formatCorrection(result.correction),
      ].join("\n"),
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      title: "Memory correction blocked",
      message: error instanceof Error ? error.message : "Unknown memory correction error.",
    };
  }
}
