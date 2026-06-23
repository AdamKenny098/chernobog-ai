import { buildAnalysisRecord, extractCandidateTasksAndIdeas, inferPossibleReasonSaved } from "../analysis";
import {
  getActiveSavedContentItems,
  getSavedContentItemsVaultPath,
  getSavedContentQueueSummary,
  querySavedContentItems,
  readSavedContentStore,
  updateSavedContentItemByActiveIndex,
} from "../store";
import {
  chunkTranscript,
  readTranscript,
  readTranscriptChunks,
  writeAnalysisRecord,
  writeCandidateMemoryRecord,
  writeTranscript,
  writeTranscriptChunks,
} from "../transcriptStore";
import { SavedContentAnalysisStatus, SavedContentItem, SavedContentQueueStatus } from "../types";
import { fetchYouTubeTranscript } from "../youtubeTranscript";
import { SavedContentCommandResult } from "./types";

import {
  formatSavedContentDiagnostics,
  getSavedContentDiagnostics,
} from "../diagnostics";

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

function parseLimit(command: string, fallback = 20) {
  const match = command.match(/\s(\d+)$/);
  const value = match?.[1] ? Number(match[1]) : fallback;

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(100, Math.floor(value)));
}

function formatItemLine(index: number, item: SavedContentItem) {
  return `${index}. ${item.title} — ${item.creator ?? "Unknown creator"} [${item.platform}/${item.sourceType}/${item.queueStatus}/${item.analysisStatus}/${item.transcriptStatus ?? "not-started"}]`;
}

async function getActiveItemByIndex(index: number) {
  const items = await getActiveSavedContentItems(100);
  return items[index - 1] ?? null;
}

async function showQueueSummary(): Promise<SavedContentCommandResult> {
  const store = await readSavedContentStore();
  const summary = await getSavedContentQueueSummary();

  const activeCount =
    summary.byQueueStatus.unprocessed +
    summary.byQueueStatus["watch-next"] +
    summary.byQueueStatus["analyze-next"] +
    summary.byQueueStatus.processing;

  const processedCount =
    summary.byQueueStatus.watched +
    summary.byQueueStatus.analyzed +
    summary.byQueueStatus.archived +
    summary.byQueueStatus.dismissed;

  const latestItems = store.items.slice(0, 10);

  const latestLines =
    latestItems.length > 0
      ? latestItems.map((item, index) => formatItemLine(index + 1, item)).join("\n")
      : "No saved content items found.";

  return {
    ok: true,
    title: "Saved Content Queue",
    message: [
      `Queue file: ${getSavedContentItemsVaultPath()}`,
      "",
      `Total items: ${summary.total}`,
      `Active queue: ${activeCount}`,
      `Processed/closed: ${processedCount}`,
      "",
      "Queue status:",
      `- Unprocessed: ${summary.byQueueStatus.unprocessed}`,
      `- Watch next: ${summary.byQueueStatus["watch-next"]}`,
      `- Analyze next: ${summary.byQueueStatus["analyze-next"]}`,
      `- Processing: ${summary.byQueueStatus.processing}`,
      `- Watched: ${summary.byQueueStatus.watched}`,
      `- Analyzed: ${summary.byQueueStatus.analyzed}`,
      `- Archived: ${summary.byQueueStatus.archived}`,
      `- Dismissed: ${summary.byQueueStatus.dismissed}`,
      "",
      "Transcript status:",
      `- Not started: ${summary.byTranscriptStatus["not-started"]}`,
      `- Queued: ${summary.byTranscriptStatus.queued}`,
      `- Available: ${summary.byTranscriptStatus.available}`,
      `- Unavailable: ${summary.byTranscriptStatus.unavailable}`,
      `- Failed: ${summary.byTranscriptStatus.failed}`,
      "",
      "Source breakdown:",
      `- YouTube: ${summary.byPlatform.youtube}`,
      `- TikTok: ${summary.byPlatform.tiktok}`,
      "",
      "Latest items:",
      latestLines,
    ].join("\n"),
    data: {
      summary,
      latestItems,
    },
  };
}

async function showActiveItems(limit: number): Promise<SavedContentCommandResult> {
  const items = await getActiveSavedContentItems(limit);

  const lines =
    items.length > 0
      ? items.map((item, index) => formatItemLine(index + 1, item)).join("\n")
      : "No active saved content remains. The queue is dry.";

  return {
    ok: true,
    title: "Active Saved Content",
    message: [
      `Showing active items: ${items.length}`,
      `Queue file: ${getSavedContentItemsVaultPath()}`,
      "",
      lines,
      "",
      "Use the visible number to update an item:",
      "- watch next saved content 1",
      "- analyze next saved content 1",
      "- fetch transcript for saved content 1",
      "- summarize saved content 1",
      "- mark saved content 1 watched",
      "- archive saved content 1",
      "- dismiss saved content 1",
    ].join("\n"),
    data: {
      items,
    },
  };
}

async function updateItemStatus(params: {
  command: string;
  queueStatus: SavedContentQueueStatus;
  analysisStatus?: SavedContentAnalysisStatus;
  actionLabel: string;
}): Promise<SavedContentCommandResult> {
  const index = parseIndex(params.command);

  if (!index) {
    return {
      ok: false,
      title: "Saved content update failed",
      message: "No valid item number was found.",
    };
  }

  const result = await updateSavedContentItemByActiveIndex({
    activeIndex: index,
    queueStatus: params.queueStatus,
    analysisStatus: params.analysisStatus,
  });

  if (!result) {
    return {
      ok: false,
      title: "Saved content item not found",
      message: [
        `No active saved content item exists at number ${index}.`,
        "",
        "Run this first:",
        "show saved content items",
      ].join("\n"),
    };
  }

  return {
    ok: true,
    title: "Saved content updated",
    message: [
      `${params.actionLabel}: ${result.item.title}`,
      "",
      `Creator: ${result.item.creator ?? "Unknown creator"}`,
      `URL: ${result.item.url}`,
      "",
      `Queue status: ${result.previousQueueStatus} -> ${result.item.queueStatus}`,
      `Analysis status: ${result.previousAnalysisStatus} -> ${result.item.analysisStatus}`,
      "",
      `Queue file: ${result.queuePath}`,
    ].join("\n"),
    data: result,
  };
}

async function fetchTranscriptForIndex(index: number): Promise<SavedContentCommandResult> {
  const item = await getActiveItemByIndex(index);

  if (!item) {
    return {
      ok: false,
      title: "Transcript fetch failed",
      message: `No active saved content item exists at number ${index}.`,
    };
  }

  if (item.platform !== "youtube") {
    return {
      ok: false,
      title: "Transcript fetch unsupported",
      message: `Transcript fetching is currently implemented for YouTube items only. This item is ${item.platform}.`,
    };
  }

  const transcript = await fetchYouTubeTranscript(item.externalId, item.url);
  const paths = await writeTranscript(transcript);

  const transcriptStatus =
    transcript.status === "available"
      ? "available"
      : transcript.status === "unavailable"
        ? "unavailable"
        : "failed";

  await updateSavedContentItemByActiveIndex({
    activeIndex: index,
    transcriptStatus,
    patch: {
      transcriptPath: paths.jsonPath,
      transcriptFetchedAt: transcript.fetchedAt,
      transcriptError: transcript.error,
    },
  });

  return {
    ok: transcript.status === "available",
    title:
      transcript.status === "available"
        ? "Transcript fetched"
        : "Transcript not available",
    message: [
      `Item: ${item.title}`,
      `Status: ${transcript.status}`,
      `Segments: ${transcript.segments.length}`,
      transcript.error ? `Error: ${transcript.error}` : "",
      "",
      `Transcript JSON: ${paths.jsonPath}`,
      `Transcript Markdown: ${paths.markdownPath}`,
    ].filter(Boolean).join("\n"),
    data: {
      transcript,
      paths,
    },
  };
}

async function fetchAnalyzeNextTranscripts(): Promise<SavedContentCommandResult> {
  const items = await querySavedContentItems({
    queueStatus: "analyze-next",
    platform: "youtube",
    limit: 25,
  });

  let available = 0;
  let unavailable = 0;
  let failed = 0;

  for (const item of items) {
    const transcript = await fetchYouTubeTranscript(item.externalId, item.url);
    const paths = await writeTranscript(transcript);

    if (transcript.status === "available") available += 1;
    if (transcript.status === "unavailable") unavailable += 1;
    if (transcript.status === "failed") failed += 1;

    await updateSavedContentItemByActiveIndex({
      activeIndex: 1,
      patch: {},
    });

    const store = await readSavedContentStore();
    const target = store.items.find((storedItem) => storedItem.id === item.id);
    if (target) {
      const { updateSavedContentItemById } = await import("../store");
      await updateSavedContentItemById({
        id: item.id,
        transcriptStatus:
          transcript.status === "available"
            ? "available"
            : transcript.status === "unavailable"
              ? "unavailable"
              : "failed",
        patch: {
          transcriptPath: paths.jsonPath,
          transcriptFetchedAt: transcript.fetchedAt,
          transcriptError: transcript.error,
        },
      });
    }
  }

  return {
    ok: true,
    title: "Analyze-next transcript fetch complete",
    message: [
      `Items checked: ${items.length}`,
      `Available: ${available}`,
      `Unavailable: ${unavailable}`,
      `Failed: ${failed}`,
    ].join("\n"),
  };
}

async function chunkTranscriptForIndex(index: number): Promise<SavedContentCommandResult> {
  const item = await getActiveItemByIndex(index);

  if (!item) {
    return {
      ok: false,
      title: "Transcript chunking failed",
      message: `No active saved content item exists at number ${index}.`,
    };
  }

  const transcript = await readTranscript(item.platform, item.externalId);

  if (!transcript || transcript.status !== "available") {
    return {
      ok: false,
      title: "Transcript chunking failed",
      message: [
        `No available transcript found for: ${item.title}`,
        "",
        "Run first:",
        `fetch transcript for saved content ${index}`,
      ].join("\n"),
    };
  }

  const chunks = chunkTranscript(transcript);
  const paths = await writeTranscriptChunks(item.platform, item.externalId, chunks);

  return {
    ok: true,
    title: "Transcript chunked",
    message: [
      `Item: ${item.title}`,
      `Chunks: ${chunks.length}`,
      "",
      `Chunks JSON: ${paths.jsonPath}`,
      `Chunks Markdown: ${paths.markdownPath}`,
    ].join("\n"),
    data: {
      chunks,
      paths,
    },
  };
}

async function summarizeSavedContent(index: number): Promise<SavedContentCommandResult> {
  const item = await getActiveItemByIndex(index);

  if (!item) {
    return {
      ok: false,
      title: "Summary failed",
      message: `No active saved content item exists at number ${index}.`,
    };
  }

  let chunks = await readTranscriptChunks(item.platform, item.externalId);

  if (chunks.length === 0) {
    const transcript = await readTranscript(item.platform, item.externalId);
    if (transcript?.status === "available") {
      chunks = chunkTranscript(transcript);
      await writeTranscriptChunks(item.platform, item.externalId, chunks);
    }
  }

  const analysis = buildAnalysisRecord({ item, chunks });
  const paths = await writeAnalysisRecord(analysis);

  await updateSavedContentItemByActiveIndex({
    activeIndex: index,
    analysisStatus: "complete",
    patch: {
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      topics: analysis.topics,
      relatedProjects: analysis.relatedProjects,
      possibleReasonSaved: analysis.possibleReasonSaved,
      reasonConfidence: analysis.reasonConfidence,
      reasonEvidence: analysis.reasonEvidence,
      extractedTasks: analysis.extractedTasks,
      extractedIdeas: analysis.extractedIdeas,
      extractedWarnings: analysis.extractedWarnings,
      analysisPath: paths.jsonPath,
      analyzedAt: analysis.analyzedAt,
    },
  });

  return {
    ok: true,
    title: "Saved content summarized",
    message: [
      `Item: ${item.title}`,
      "",
      "Summary:",
      analysis.summary,
      "",
      "Topics:",
      analysis.topics.length ? analysis.topics.map((topic) => `- ${topic}`).join("\n") : "- None",
      "",
      "Related projects:",
      analysis.relatedProjects.length
        ? analysis.relatedProjects.map((project) => `- ${project}`).join("\n")
        : "- None",
      "",
      `Analysis JSON: ${paths.jsonPath}`,
      `Analysis Markdown: ${paths.markdownPath}`,
    ].join("\n"),
    data: {
      analysis,
      paths,
    },
  };
}

async function showPossibleReason(index: number): Promise<SavedContentCommandResult> {
  const item = await getActiveItemByIndex(index);

  if (!item) {
    return {
      ok: false,
      title: "Reason lookup failed",
      message: `No active saved content item exists at number ${index}.`,
    };
  }

  const chunks = await readTranscriptChunks(item.platform, item.externalId);
  const topics = item.topics;
  const relatedProjects = item.relatedProjects;

  const reason = inferPossibleReasonSaved({
    item,
    topics: topics.length ? topics : [],
    relatedProjects: relatedProjects.length ? relatedProjects : [],
  });

  await updateSavedContentItemByActiveIndex({
    activeIndex: index,
    patch: reason,
  });

  return {
    ok: true,
    title: "Possible reason saved",
    message: [
      `Item: ${item.title}`,
      "",
      "Possible reason saved:",
      reason.possibleReasonSaved,
      "",
      `Confidence: ${reason.reasonConfidence}%`,
      "",
      "Evidence:",
      ...(reason.reasonEvidence ?? []).map((evidence) => `- ${evidence}`),
      "",
      chunks.length === 0
        ? "Note: This reason is based on metadata/current item fields. Transcript chunks were not available."
        : "",
    ].filter(Boolean).join("\n"),
    data: reason,
  };
}

async function extractCandidates(index: number): Promise<SavedContentCommandResult> {
  const item = await getActiveItemByIndex(index);

  if (!item) {
    return {
      ok: false,
      title: "Candidate extraction failed",
      message: `No active saved content item exists at number ${index}.`,
    };
  }

  const chunks = await readTranscriptChunks(item.platform, item.externalId);
  const candidates = extractCandidateTasksAndIdeas(item, chunks);
  const paths = await writeCandidateMemoryRecord({
    platform: item.platform,
    externalId: item.externalId,
    tasks: candidates.tasks,
    ideas: candidates.ideas,
    warnings: candidates.warnings,
  });

  await updateSavedContentItemByActiveIndex({
    activeIndex: index,
    patch: {
      extractedTasks: candidates.tasks,
      extractedIdeas: candidates.ideas,
      extractedWarnings: candidates.warnings,
      candidateMemoryPath: paths.jsonPath,
    },
  });

  return {
    ok: true,
    title: "Saved content candidates extracted",
    message: [
      `Item: ${item.title}`,
      "",
      "Candidate tasks:",
      candidates.tasks.length ? candidates.tasks.map((task) => `- ${task}`).join("\n") : "- None",
      "",
      "Candidate ideas:",
      candidates.ideas.length ? candidates.ideas.map((idea) => `- ${idea}`).join("\n") : "- None",
      "",
      "Status: candidate only. Nothing was promoted to approved project memory.",
      `Candidate file: ${paths.jsonPath}`,
    ].join("\n"),
    data: {
      candidates,
      paths,
    },
  };
}

async function showFilteredContent(command: string): Promise<SavedContentCommandResult> {
  const normalized = normalize(command);
  const limit = parseLimit(normalized, 20);

  const filter: Parameters<typeof querySavedContentItems>[0] = {
    limit,
  };

  if (/youtube/i.test(normalized)) filter.platform = "youtube";
  if (/tiktok/i.test(normalized)) filter.platform = "tiktok";
  if (/unprocessed/i.test(normalized)) filter.queueStatus = "unprocessed";
  if (/watch next/i.test(normalized)) filter.queueStatus = "watch-next";
  if (/analyze next/i.test(normalized)) filter.queueStatus = "analyze-next";
  if (/watched/i.test(normalized)) filter.queueStatus = "watched";
  if (/analyzed/i.test(normalized)) filter.queueStatus = "analyzed";
  if (/archived/i.test(normalized)) filter.queueStatus = "archived";
  if (/dismissed/i.test(normalized)) filter.queueStatus = "dismissed";
  if (/playlists/i.test(normalized)) filter.sourceType = "playlist";
  if (/watch later/i.test(normalized)) filter.sourceType = "watch-later";
  if (/favorites/i.test(normalized)) filter.sourceType = "favorites";
  if (/collections/i.test(normalized)) filter.sourceType = "collection";
  if (/needing transcripts/i.test(normalized)) filter.transcriptStatus = "not-started";
  if (/ready to analyze/i.test(normalized)) filter.transcriptStatus = "available";
  if (/failed analysis/i.test(normalized)) filter.analysisStatus = "failed";

  const projectMatch = normalized.match(/^show saved content for project\s+(.+)$/i);
  if (projectMatch?.[1]) {
    filter.project = projectMatch[1].trim();
  }

  const topicMatch = normalized.match(/^show saved content by topic\s+(.+)$/i);
  if (topicMatch?.[1]) {
    filter.topic = topicMatch[1].trim();
  }

  const items = await querySavedContentItems(filter);

  return {
    ok: true,
    title: "Saved Content Filter",
    message: [
      `Items: ${items.length}`,
      "",
      items.length
        ? items.map((item, index) => formatItemLine(index + 1, item)).join("\n")
        : "No saved content matched this filter.",
    ].join("\n"),
    data: {
      filter,
      items,
    },
  };
}

async function importTikTokArchive(command: string): Promise<SavedContentCommandResult> {
  const match = command.match(/^import tiktok archive\s+(.+)$/i);
  const archivePath = match?.[1]?.trim().replace(/^["']|["']$/g, "");

  if (!archivePath) {
    return {
      ok: false,
      title: "TikTok archive import failed",
      message: "Provide a path: import tiktok archive <path>",
    };
  }

  const mod = await import("@/lib/modules/tiktok-archive-ingest");
  const result = await mod.importTikTokArchive(archivePath);

  return {
    ok: true,
    title: "TikTok archive imported",
    message: [
      `Archive path: ${archivePath}`,
      `URLs found: ${result.urlsFound}`,
      `Queue added: ${result.savedContent.added}`,
      `Queue updated: ${result.savedContent.updated}`,
      `Queue unchanged: ${result.savedContent.unchanged}`,
      `Total queue items: ${result.savedContent.total}`,
      `Summary: ${result.summaryPath}`,
    ].join("\n"),
    data: result,
  };
}

export async function executeSavedContentCommand(
  command: string
): Promise<SavedContentCommandResult> {
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
    /^show saved content queue$/i.test(normalized) ||
    /^saved content queue$/i.test(normalized) ||
    /^show content queue$/i.test(normalized) ||
    /^content queue$/i.test(normalized)
  ) {
    return showQueueSummary();
  }

  if (
    /^show saved content items(?:\s+\d+)?$/i.test(normalized) ||
    /^show active saved content(?:\s+\d+)?$/i.test(normalized)
  ) {
    return showActiveItems(parseLimit(normalized));
  }

  if (/^watch next saved content\s+\d+$/i.test(normalized)) {
    return updateItemStatus({
      command: normalized,
      queueStatus: "watch-next",
      actionLabel: "Marked as watch next",
    });
  }

  if (/^analyze next saved content\s+\d+$/i.test(normalized)) {
    return updateItemStatus({
      command: normalized,
      queueStatus: "analyze-next",
      analysisStatus: "queued",
      actionLabel: "Marked as analyze next",
    });
  }

  if (/^archive saved content\s+\d+$/i.test(normalized)) {
    return updateItemStatus({
      command: normalized,
      queueStatus: "archived",
      actionLabel: "Archived",
    });
  }

  if (/^dismiss saved content\s+\d+$/i.test(normalized)) {
    return updateItemStatus({
      command: normalized,
      queueStatus: "dismissed",
      actionLabel: "Dismissed",
    });
  }

  const markMatch = normalized.match(
    /^mark saved content\s+\d+\s+(watched|analyzed|archived|dismissed)$/i
  );

  if (markMatch?.[1]) {
    const status = markMatch[1].toLowerCase() as
      | "watched"
      | "analyzed"
      | "archived"
      | "dismissed";

    if (status === "analyzed") {
      return updateItemStatus({
        command: normalized,
        queueStatus: "analyzed",
        analysisStatus: "complete",
        actionLabel: "Marked as analyzed",
      });
    }

    return updateItemStatus({
      command: normalized,
      queueStatus: status,
      actionLabel: `Marked as ${status}`,
    });
  }

  if (/^fetch transcript for saved content\s+\d+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    return fetchTranscriptForIndex(index ?? 0);
  }

  if (/^fetch transcripts for analyze-next$/i.test(normalized)) {
    return fetchAnalyzeNextTranscripts();
  }

  if (
    /^normalize transcript for saved content\s+\d+$/i.test(normalized) ||
    /^chunk transcript for saved content\s+\d+$/i.test(normalized)
  ) {
    const index = parseIndex(normalized);
    return chunkTranscriptForIndex(index ?? 0);
  }

  if (/^prepare transcripts for analyze-next$/i.test(normalized)) {
    return fetchAnalyzeNextTranscripts();
  }

  if (
    /^summarize saved content\s+\d+$/i.test(normalized) ||
    /^show summary for saved content\s+\d+$/i.test(normalized)
  ) {
    const index = parseIndex(normalized);
    return summarizeSavedContent(index ?? 0);
  }

  if (/^why did i save content\s+\d+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    return showPossibleReason(index ?? 0);
  }

  if (/^set reason for saved content\s+\d+\s+as\s+.+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    const reason = normalized.replace(/^set reason for saved content\s+\d+\s+as\s+/i, "");

    const result = await updateSavedContentItemByActiveIndex({
      activeIndex: index ?? 0,
      patch: {
        confirmedReasonSaved: reason,
        possibleReasonSaved: reason,
        reasonConfidence: 100,
        reasonReviewed: true,
        reasonEvidence: ["User-provided reason."],
      },
    });

    return {
      ok: Boolean(result),
      title: result ? "Reason saved" : "Reason update failed",
      message: result
        ? `Reason set for: ${result.item.title}\n\n${reason}`
        : "No matching active item was found.",
      data: result,
    };
  }

  if (/^confirm reason for saved content\s+\d+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    const item = await getActiveItemByIndex(index ?? 0);

    if (!item?.possibleReasonSaved) {
      return {
        ok: false,
        title: "Reason confirmation failed",
        message: "No possible reason exists to confirm.",
      };
    }

    const result = await updateSavedContentItemByActiveIndex({
      activeIndex: index ?? 0,
      patch: {
        confirmedReasonSaved: item.possibleReasonSaved,
        reasonReviewed: true,
        reasonConfidence: 100,
      },
    });

    return {
      ok: Boolean(result),
      title: "Reason confirmed",
      message: result
        ? `Confirmed reason for: ${result.item.title}\n\n${result.item.confirmedReasonSaved}`
        : "No matching active item was found.",
      data: result,
    };
  }

  if (/^clear reason for saved content\s+\d+$/i.test(normalized)) {
    const index = parseIndex(normalized);
    const result = await updateSavedContentItemByActiveIndex({
      activeIndex: index ?? 0,
      patch: {
        confirmedReasonSaved: undefined,
        possibleReasonSaved: undefined,
        reasonConfidence: undefined,
        reasonReviewed: false,
        reasonEvidence: [],
      },
    });

    return {
      ok: Boolean(result),
      title: result ? "Reason cleared" : "Reason clear failed",
      message: result
        ? `Reason cleared for: ${result.item.title}`
        : "No matching active item was found.",
      data: result,
    };
  }

  if (
    /^extract tasks from saved content\s+\d+$/i.test(normalized) ||
    /^extract ideas from saved content\s+\d+$/i.test(normalized) ||
    /^extract candidates from saved content\s+\d+$/i.test(normalized) ||
    /^show candidates for saved content\s+\d+$/i.test(normalized)
  ) {
    const index = parseIndex(normalized);
    return extractCandidates(index ?? 0);
  }

  if (
    /^show saved content (youtube|tiktok|unprocessed|watch next|analyze next|watched|analyzed|archived|dismissed|playlists|watch later|favorites|collections|needing transcripts|ready to analyze|failed analysis)(?:\s+\d+)?$/i.test(normalized) ||
    /^show saved content for project\s+.+$/i.test(normalized) ||
    /^show saved content by topic\s+.+$/i.test(normalized)
  ) {
    return showFilteredContent(normalized);
  }

  if (/^import tiktok archive\s+.+$/i.test(normalized)) {
    return importTikTokArchive(normalized);
  }

  if (/^show latest tiktok import$/i.test(normalized)) {
    const mod = await import("@/lib/modules/tiktok-archive-ingest");
    const result = await mod.getLatestTikTokImportSummary();

    return {
      ok: Boolean(result),
      title: result ? "Latest TikTok Import" : "No TikTok Import Found",
      message: result
        ? [
            `Import ID: ${result.importId}`,
            `Imported at: ${result.importedAt}`,
            `URLs found: ${result.urlsFound}`,
            `Summary: ${result.summaryPath}`,
          ].join("\n")
        : "No TikTok archive import summary was found.",
      data: result,
    };
  }

  if (/^show tiktok saved content$/i.test(normalized)) {
    return showFilteredContent("show saved content tiktok");
  }

  return {
    ok: false,
    title: "Saved content command not recognized",
    message: [
      "Try one of these:",
      "- show saved content queue",
      "- show saved content items",
      "- fetch transcript for saved content 1",
      "- summarize saved content 1",
      "- why did I save content 1",
      "- extract candidates from saved content 1",
      "- import tiktok archive <path>",
    ].join("\n"),
  };
}
