import { formatVaultBrainAnswer, answerFromVault } from "./answerComposer";
import { isControlledExecutionCommand, executeControlledExecutionCommand } from "./controlledExecutionCommands";
import { formatStaleVaultBrainFiles, formatVaultBrainDiagnostics, inspectVaultSource } from "./diagnostics";
import { buildVaultBrainIndex } from "./indexer";
import { formatVaultBrainSearchResults, searchVaultBrain } from "./search";
import { getVaultBrainStatus } from "./store";
import { isChernobogIncCommand, executeChernobogIncCommand } from "./chernobogIncCommands";
import { isChernobogMissionCommand, executeChernobogMissionCommand } from "./chernobogMissionCommands";
import { executeGovernanceCommand, isGovernanceCommand } from "./governanceCommands";
import { executeCurrentStateBriefingCommand, isCurrentStateBriefingCommand } from "./currentStateBriefingCommands";
import { executeCodeSummaryMemoryCommand, isCodeSummaryMemoryCommand } from "./codeSummaryCommands";
import { executeMemoryCorrectionCommand, isMemoryCorrectionCommand } from "./memoryCorrectionCommands";
import { executeVaultOnlyAnswerCommand, isVaultOnlyAnswerCommand } from "./vaultOnlyAnswerCommands";
import { executeProjectMemoryProfileCommand, isProjectMemoryProfileCommand } from "./projectMemoryProfileCommands";
import {
  executeStructuredMemoryCommand,
  executeStructuredVaultMemoryCommand,
  isStructuredMemoryCommand,
  isStructuredVaultMemoryCommand,
} from "./structuredMemoryCommands";
import { executeStructuredMemoryReviewCommand, isStructuredMemoryReviewCommand } from "./memoryReview";
import type { VaultBrainCommandResult } from "./types";

import { executeV6ReadinessCommand, isV6ReadinessCommand } from "./v6ReadinessCommands";
import { executeV6PersonalIntelligenceCommand, isV6PersonalIntelligenceCommand } from "./personalIntelligenceCommands";
function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

export function isVaultBrainCommand(command: string) {
  const normalized = normalize(command);
  if (isChernobogIncCommand(normalized)) return true;

  return (
    isGovernanceCommand(normalized) ||
    isCurrentStateBriefingCommand(normalized) ||
    isCodeSummaryMemoryCommand(normalized) ||
    isMemoryCorrectionCommand(normalized) ||
    isVaultOnlyAnswerCommand(normalized) ||
    isProjectMemoryProfileCommand(normalized) ||
    isStructuredMemoryCommand(normalized) ||
    isStructuredMemoryReviewCommand(normalized) ||
    isStructuredVaultMemoryCommand(normalized) ||
    /^index vault brain$/i.test(normalized) ||
    /^refresh vault brain$/i.test(normalized) ||
    /^show vault brain status$/i.test(normalized) ||
    /^show vault brain diagnostics$/i.test(normalized) ||
    /^show stale vault brain files$/i.test(normalized) ||
    /^search vault brain\s+.+$/i.test(normalized) ||
    /^ask vault\s+.+$/i.test(normalized) ||
    /^ask vault brain\s+.+$/i.test(normalized) ||
    /^inspect vault source\s+.+$/i.test(normalized)
   ||
    isChernobogMissionCommand(normalized) ||
    isControlledExecutionCommand(normalized) ||
    isV6ReadinessCommand(normalized) ||
    isV6PersonalIntelligenceCommand(normalized));
}

export async function executeVaultBrainCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (isV6PersonalIntelligenceCommand(normalized)) {
    return executeV6PersonalIntelligenceCommand(normalized);
  }

  if (isV6ReadinessCommand(normalized)) {
    return executeV6ReadinessCommand(normalized);
  }

  if (isControlledExecutionCommand(normalized)) {
    return executeControlledExecutionCommand(normalized);
  }

  if (isChernobogMissionCommand(normalized)) {
    return executeChernobogMissionCommand(normalized);
  }
  if (isChernobogIncCommand(normalized)) return executeChernobogIncCommand(normalized);

  if (isGovernanceCommand(normalized)) {
    return executeGovernanceCommand(normalized);
  }


  if (isCurrentStateBriefingCommand(normalized)) {
    return executeCurrentStateBriefingCommand(normalized);
  }


  if (isCodeSummaryMemoryCommand(normalized)) {
    return executeCodeSummaryMemoryCommand(normalized);
  }


  if (isMemoryCorrectionCommand(normalized)) {
    return executeMemoryCorrectionCommand(normalized);
  }


  if (isVaultOnlyAnswerCommand(normalized)) {
    return executeVaultOnlyAnswerCommand(normalized);
  }


  if (isProjectMemoryProfileCommand(normalized)) {
    return executeProjectMemoryProfileCommand(normalized);
  }


  if (isStructuredMemoryCommand(normalized)) {
    return executeStructuredMemoryCommand(normalized);
  }


  if (isStructuredMemoryReviewCommand(normalized)) {
    return executeStructuredMemoryReviewCommand(normalized);
  }


  if (isStructuredVaultMemoryCommand(normalized)) {
    return executeStructuredVaultMemoryCommand(normalized);
  }

  if (/^(index|refresh) vault brain$/i.test(normalized)) {
    const result = await buildVaultBrainIndex();

    return {
      ok: true,
      title: "Vault brain indexed",
      message: [
        `Documents indexed: ${result.index.documentCount}`,
        `Chunks created: ${result.index.chunkCount}`,
        `Skipped files: ${result.diagnostics.skipped.length}`,
        "",
        "Store:",
        `- ${result.paths.indexPath}`,
        `- ${result.paths.documentsPath}`,
        `- ${result.paths.chunksPath}`,
        `- ${result.paths.diagnosticsPath}`,
        "",
        result.diagnostics.skipped.length > 0
          ? [
              "Skipped:",
              ...result.diagnostics.skipped
                .slice(0, 10)
                .map((item: { path: string; reason: string }) => `- ${item.path}: ${item.reason}`),
            ].join("\n")
          : "Skipped: none",
      ].join("\n"),
      data: result,
    };
  }

  if (/^show vault brain status$/i.test(normalized)) {
    const status = await getVaultBrainStatus();

    return {
      ok: true,
      title: "Vault Brain Status",
      message: [
        `Index exists: ${status.exists ? "yes" : "no"}`,
        `Documents: ${status.documentCount}`,
        `Chunks: ${status.chunkCount}`,
        status.index ? `Indexed at: ${status.index.indexedAt}` : "Indexed at: never",
        "",
        "Paths:",
        `- Root: ${status.paths.root}`,
        `- Index: ${status.paths.indexPath}`,
        `- Documents: ${status.paths.documentsPath}`,
        `- Chunks: ${status.paths.chunksPath}`,
        `- Diagnostics: ${status.paths.diagnosticsPath}`,
      ].join("\n"),
      data: status,
    };
  }

  if (/^show vault brain diagnostics$/i.test(normalized)) {
    const message = await formatVaultBrainDiagnostics();

    return {
      ok: true,
      title: "Vault Brain Diagnostics",
      message,
    };
  }

  if (/^show stale vault brain files$/i.test(normalized)) {
    const message = await formatStaleVaultBrainFiles();

    return {
      ok: true,
      title: "Stale Vault Brain Files",
      message,
    };
  }

  if (/^search vault brain\s+.+$/i.test(normalized)) {
    const query = normalized.replace(/^search vault brain\s+/i, "");
    const results = await searchVaultBrain(query, 8);

    return {
      ok: true,
      title: "Vault Brain Search",
      message: formatVaultBrainSearchResults(query, results),
      data: {
        query,
        results,
      },
    };
  }

  if (/^ask vault brain\s+.+$/i.test(normalized) || /^ask vault\s+.+$/i.test(normalized)) {
    const question = normalized
      .replace(/^ask vault brain\s+/i, "")
      .replace(/^ask vault\s+/i, "");
    const answer = await answerFromVault(question);

    return {
      ok: true,
      title: "Vault Brain Answer",
      message: formatVaultBrainAnswer(answer),
      data: answer,
    };
  }

  if (/^inspect vault source\s+.+$/i.test(normalized)) {
    const sourcePath = normalized.replace(/^inspect vault source\s+/i, "");
    const source = await inspectVaultSource(sourcePath);

    if (!source) {
      return {
        ok: false,
        title: "Vault source not found",
        message: `Could not inspect vault source: ${sourcePath}`,
      };
    }

    return {
      ok: true,
      title: "Vault Source",
      message: [
        `Path: ${source.relativePath}`,
        `Size: ${source.sizeBytes} bytes`,
        `Modified: ${source.modifiedAt}`,
        "",
        "Snippet:",
        source.snippet,
      ].join("\n"),
      data: source,
    };
  }

  return {
    ok: false,
    title: "Vault brain command not recognized",
    message: [
      "Try one of these:",
      "- index vault brain",
      "- show vault brain status",
      "- show structured memory status",
      "- recall approved memory Chernobog V5.6.2",
      "- ask approved vault what is the current Chernobog state?",
      "- search vault brain Chernobog saved content",
      "- ask vault what is the current Chernobog roadmap?",
      "- inspect vault source projects/chernobog/Tasks.md",
    ].join("\n"),
  };
}
