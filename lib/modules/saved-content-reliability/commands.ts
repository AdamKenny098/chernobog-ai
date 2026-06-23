import { querySavedContentItems } from "@/lib/modules/saved-content";

import {
  formatSavedContentDiagnostics,
  formatSourceReliabilityReport,
  getSavedContentDiagnostics,
  getSourceReliabilityReport,
} from "./diagnostics";
import { importManualTranscriptForSavedContent } from "./manualTranscriptImport";
import { SavedContentReliabilityCommandResult } from "./types";

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function parseIndex(command: string) {
  const match = command.match(/\b(\d+)\b/);
  const value = match?.[1] ? Number(match[1]) : NaN;

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function formatItemLine(
  index: number,
  item: Awaited<ReturnType<typeof querySavedContentItems>>[number]
) {
  return `${index}. ${item.title} — ${item.creator ?? "Unknown creator"} [${item.platform}/${item.sourceType}/${item.queueStatus}/${item.transcriptStatus ?? "not-started"}]`;
}

export function isSavedContentReliabilityCommand(command: string) {
  const normalized = normalize(command);

  return (
    /^show saved content diagnostics$/i.test(normalized) ||
    /^saved content diagnostics$/i.test(normalized) ||
    /^content diagnostics$/i.test(normalized) ||
    /^show source reliability report$/i.test(normalized) ||
    /^show saved source reliability$/i.test(normalized) ||
    /^import youtube saved archive\s+.+$/i.test(normalized) ||
    /^show latest youtube saved import$/i.test(normalized) ||
    /^show youtube saved archive content(?:\s+\d+)?$/i.test(normalized) ||
    /^import transcript for saved content\s+\d+\s+from\s+.+$/i.test(normalized)
  );
}

async function showYouTubeSavedArchiveContent(command: string): Promise<SavedContentReliabilityCommandResult> {
  const limitMatch = command.match(/\s(\d+)$/);
  const limit = limitMatch?.[1] ? Math.max(1, Math.min(100, Number(limitMatch[1]))) : 20;

  const items = await querySavedContentItems({
    platform: "youtube",
    sourceType: "watch-later",
    includeClosed: false,
    limit,
  });

  return {
    ok: true,
    title: "YouTube Saved Archive Content",
    message: [
      `Items: ${items.length}`,
      "",
      items.length
        ? items.map((item, index) => formatItemLine(index + 1, item)).join("\n")
        : "No active YouTube saved/archive content found.",
    ].join("\n"),
    data: { items },
  };
}

export async function executeSavedContentReliabilityCommand(
  command: string
): Promise<SavedContentReliabilityCommandResult> {
  const normalized = normalize(command);

  if (
    /^show saved content diagnostics$/i.test(normalized) ||
    /^saved content diagnostics$/i.test(normalized) ||
    /^content diagnostics$/i.test(normalized)
  ) {
    const diagnostics = await getSavedContentDiagnostics();

    return {
      ok: true,
      title: "Saved Content Diagnostics",
      message: formatSavedContentDiagnostics(diagnostics),
      data: diagnostics,
    };
  }

  if (
    /^show source reliability report$/i.test(normalized) ||
    /^show saved source reliability$/i.test(normalized)
  ) {
    const report = await getSourceReliabilityReport();

    return {
      ok: true,
      title: "Saved Source Reliability Report",
      message: formatSourceReliabilityReport(report),
      data: report,
    };
  }

  if (/^import youtube saved archive\s+.+$/i.test(normalized)) {
    const match = normalized.match(/^import youtube saved archive\s+(.+)$/i);
    const archivePath = match?.[1]?.trim().replace(/^[\"']|[\"']$/g, "");

    if (!archivePath) {
      return {
        ok: false,
        title: "YouTube saved archive import failed",
        message: "Provide a path: import youtube saved archive <path>",
      };
    }

    const mod = await import("@/lib/modules/youtube-archive-ingest");
    const result = await mod.importYouTubeSavedArchive(archivePath);

    return {
      ok: true,
      title: "YouTube saved archive imported",
      message: [
        `Archive path: ${archivePath}`,
        `Videos found: ${result.videosFound}`,
        `Queue added: ${result.savedContent.added}`,
        `Queue updated: ${result.savedContent.updated}`,
        `Queue unchanged: ${result.savedContent.unchanged}`,
        `Total queue items: ${result.savedContent.total}`,
        `Summary: ${result.summaryPath}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^show latest youtube saved import$/i.test(normalized)) {
    const mod = await import("@/lib/modules/youtube-archive-ingest");
    const result = await mod.getLatestYouTubeSavedArchiveImportSummary();

    return {
      ok: Boolean(result),
      title: result ? "Latest YouTube Saved Import" : "No YouTube Saved Import Found",
      message: result
        ? [
            `Import ID: ${result.importId}`,
            `Imported at: ${result.importedAt}`,
            `Videos found: ${result.videosFound}`,
            `Summary: ${result.summaryPath}`,
          ].join("\n")
        : "No YouTube saved archive import summary was found.",
      data: result,
    };
  }

  if (/^show youtube saved archive content(?:\s+\d+)?$/i.test(normalized)) {
    return showYouTubeSavedArchiveContent(normalized);
  }

  if (/^import transcript for saved content\s+\d+\s+from\s+.+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    const transcriptPath = normalized.replace(
      /^import transcript for saved content\s+\d+\s+from\s+/i,
      ""
    );

    if (!index) {
      return {
        ok: false,
        title: "Manual transcript import failed",
        message: "No valid saved content item number was found.",
      };
    }

    const result = await importManualTranscriptForSavedContent({
      activeIndex: index,
      transcriptPath,
    });

    if (!result) {
      return {
        ok: false,
        title: "Manual transcript import failed",
        message: `No active saved content item exists at number ${index}.`,
      };
    }

    return {
      ok: true,
      title: "Manual transcript imported",
      message: [
        `Item: ${result.item.title}`,
        `Segments: ${result.transcript.segments.length}`,
        `Transcript JSON: ${result.paths.jsonPath}`,
        `Transcript Markdown: ${result.paths.markdownPath}`,
      ].join("\n"),
      data: result,
    };
  }

  return {
    ok: false,
    title: "Saved content reliability command not recognized",
    message: [
      "Try one of these:",
      "- show saved content diagnostics",
      "- show source reliability report",
      "- import youtube saved archive <path>",
      "- show latest youtube saved import",
      "- show youtube saved archive content",
      "- import transcript for saved content 1 from <path>",
    ].join("\n"),
  };
}
