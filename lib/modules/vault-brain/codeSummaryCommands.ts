import type { VaultBrainCommandResult } from "./types";
import type { VaultMemoryEntry } from "./memoryTypes";
import {
  createCodeSummaryMemoryCandidates,
  getCodeSummaryMemoryStatus,
  listCodeSummaryMemory,
  previewCodeSummaryMemory,
} from "./codeSummaryMemory";
import type { CodeSummaryAnalysis, CodeSummaryMemoryWriteResult } from "./codeSummaryTypes";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function parseIncludePath(command: string): string[] | undefined {
  const match = command.match(/\s+for\s+(.+)$/i);
  if (!match) {
    return undefined;
  }

  const target = match[1].trim();
  return target ? [target] : undefined;
}

function formatAnalysis(analysis: CodeSummaryAnalysis): string {
  return [
    `- ${analysis.file.relativePath}`,
    `  ID: ${analysis.id}`,
    `  Kind: ${analysis.file.kind}`,
    `  Exports: ${analysis.exports.length > 0 ? analysis.exports.slice(0, 8).join(", ") : "none detected"}`,
    `  Functions: ${analysis.functions.length > 0 ? analysis.functions.slice(0, 8).join(", ") : "none detected"}`,
    `  Tags: ${analysis.tags.join(", ")}`,
  ].join("\n");
}

function formatEntry(entry: VaultMemoryEntry): string {
  return [
    `- ${entry.title}`,
    `  ID: ${entry.id}`,
    `  Status: ${entry.status}`,
    `  Scope: ${[entry.projectId, entry.version].filter(Boolean).join(" / ") || "none"}`,
    `  Source: ${entry.sourceRef?.path ?? "unknown"}`,
    `  Updated: ${entry.updatedAt}`,
  ].join("\n");
}

function formatWriteResult(result: CodeSummaryMemoryWriteResult): string {
  return [
    `Scanned files: ${result.scannedFiles}`,
    `Created candidates: ${result.created}`,
    `Updated candidates: ${result.updated}`,
    `Skipped protected entries: ${result.skipped}`,
    `- approved: ${result.skippedApproved}`,
    `- reviewed: ${result.skippedReviewed}`,
    `- other protected: ${result.skippedOtherStatuses}`,
    `Candidate IDs: ${result.entries.length > 0 ? result.entries.slice(0, 20).join(", ") : "none"}`,
    result.warnings.length > 0 ? `Warnings:\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}` : "Warnings: none",
    "",
    "Review rule: generated code-summary entries are candidates. They are not approved vault truth until reviewed and approved.",
  ].join("\n");
}

export function isCodeSummaryMemoryCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show code summary memory status$/i.test(normalized) ||
    /^scan code summary memory(?:\s+for\s+.+)?$/i.test(normalized) ||
    /^preview code summary memory(?:\s+for\s+.+)?$/i.test(normalized) ||
    /^create code summary candidates(?:\s+for\s+.+)?$/i.test(normalized) ||
    /^generate code summary memory(?:\s+for\s+.+)?$/i.test(normalized) ||
    /^list code summary memory$/i.test(normalized) ||
    /^show code summary memory\s+.+$/i.test(normalized)
  );
}

export async function executeCodeSummaryMemoryCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show code summary memory status$/i.test(normalized)) {
    const status = await getCodeSummaryMemoryStatus();
    const countLines = Object.keys(status.codeSummaryCounts).length > 0
      ? Object.entries(status.codeSummaryCounts).map(([key, value]) => `- ${key}: ${value}`)
      : ["- none yet"];

    return {
      ok: true,
      title: "Code Summary Memory Status",
      message: [
        `Total code-summary entries: ${status.totalCodeSummaryEntries}`,
        "Counts by status:",
        ...countLines,
        "",
        `Supported extensions: ${status.supportedExtensions.join(", ")}`,
        `Excluded dirs: ${status.defaultExcludedDirs.join(", ")}`,
      ].join("\n"),
      data: status,
    };
  }

  if (/^(scan|preview) code summary memory/i.test(normalized)) {
    const analyses = await previewCodeSummaryMemory({
      includePaths: parseIncludePath(normalized),
      maxFiles: 80,
    });

    return {
      ok: true,
      title: "Code Summary Memory Preview",
      message: analyses.length > 0
        ? [
            `Scanned files: ${analyses.length}`,
            "No memory was written by this preview command.",
            "",
            ...analyses.slice(0, 25).map(formatAnalysis),
          ].join("\n")
        : "No supported source files were found.",
      data: analyses,
    };
  }

  if (/^(create code summary candidates|generate code summary memory)/i.test(normalized)) {
    const result = await createCodeSummaryMemoryCandidates({
      includePaths: parseIncludePath(normalized),
      actor: "chernobog-command",
    });

    return {
      ok: true,
      title: "Code Summary Memory Candidates Created",
      message: formatWriteResult(result),
      data: result,
    };
  }

  if (/^list code summary memory$/i.test(normalized)) {
    const entries = await listCodeSummaryMemory({ limit: 50 });
    return {
      ok: true,
      title: "Code Summary Memory",
      message: entries.length > 0
        ? entries.map(formatEntry).join("\n\n")
        : "No code-summary memory entries exist yet.",
      data: entries,
    };
  }

  const showMatch = normalized.match(/^show code summary memory\s+(.+)$/i);
  if (showMatch) {
    const query = showMatch[1].trim();
    const entries = await listCodeSummaryMemory({ text: query, limit: 10 });
    return {
      ok: true,
      title: "Code Summary Memory Search",
      message: entries.length > 0
        ? entries.map(formatEntry).join("\n\n")
        : `No code-summary memory matched: ${query}`,
      data: { query, entries },
    };
  }

  return {
    ok: false,
    title: "Code summary memory command not recognized",
    message: [
      "Try one of these:",
      "- show code summary memory status",
      "- scan code summary memory",
      "- scan code summary memory for lib/modules/vault-brain",
      "- create code summary candidates",
      "- create code summary candidates for lib/modules/vault-brain",
      "- list code summary memory",
      "- show code summary memory vault-brain",
    ].join("\n"),
  };
}
