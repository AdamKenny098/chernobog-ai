import {
  upsertSavedContentItems,
} from "@/lib/modules/saved-content";
import type {
  SavedContentItem,
} from "@/lib/modules/saved-content/types";

import {
  processSavedContentBatch,
  createReviewsForAnalyzedContent,
} from "./batchProcessor";
import {
  formatDuplicateReport,
  getSavedContentDuplicateReport,
  repairSavedContentDuplicates,
} from "./duplicateMerge";
import {
  closeCompletedSavedContent,
  formatLifecycleReport,
  getSavedContentLifecycleReport,
} from "./lifecycle";
import {
  readContentIngestRun,
  listContentIngestRuns,
  readLatestContentIngestRun,
  writeContentIngestRun,
} from "./runStore";
import {
  scanTikTokArchive,
} from "./tiktokArchiveParser";
import {
  ArchiveCandidate,
  ContentIngestCommandResult,
  ContentIngestRun,
} from "./types";
import {
  scanYouTubeArchive,
} from "./youtubeArchiveParser";

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function stripCommandPath(command: string, pattern: RegExp) {
  return command.replace(pattern, "").trim().replace(/^["']|["']$/g, "");
}

function candidateToSavedContentItem(candidate: ArchiveCandidate): SavedContentItem {
  const now = new Date().toISOString();

  return {
    id: candidate.id,

    platform: candidate.platform,
    sourceType:
      candidate.sourceType === "favorites" || candidate.sourceType === "collection"
        ? candidate.sourceType
        : candidate.platform === "youtube"
          ? "watch-later"
          : "favorites",

    externalId: candidate.externalId,
    sourceContainerId: candidate.sourceContainerId,
    sourceContainerTitle: candidate.sourceContainerTitle,

    title: candidate.title ?? (candidate.platform === "youtube" ? "Saved YouTube Video" : "Saved TikTok Video"),
    creator: candidate.creator,
    url: candidate.url,

    importedAt: candidate.discoveredAt,

    queueStatus: "unprocessed",
    analysisStatus: "not-started",
    transcriptStatus: "not-started",

    relatedProjects: [],
    topics: [],

    extractedTasks: [],
    extractedIdeas: [],
    extractedWarnings: [],
    keyPoints: [],
    reasonEvidence: [],

    createdAt: now,
    updatedAt: now,
  };
}

async function importRunCandidates(run: ContentIngestRun) {
  const items = run.candidates.map(candidateToSavedContentItem);
  const savedContent = await upsertSavedContentItems(items);

  run.kind = "import";
  run.status = "imported";
  run.completedAt = new Date().toISOString();
  run.queueItemIds = items.map((item) => item.id);
  run.stats.added = savedContent.added;
  run.stats.updated = savedContent.updated;
  run.stats.unchanged = savedContent.unchanged;
  run.stats.duplicatesSkipped = savedContent.unchanged;
  run.stats.warnings = run.warnings.length;
  run.stats.errors = run.errors.length;

  const paths = await writeContentIngestRun(run);

  return {
    run,
    savedContent,
    paths,
  };
}

function formatRunShort(run: ContentIngestRun) {
  return [
    `Run ID: ${run.id}`,
    `Kind: ${run.kind}`,
    `Status: ${run.status}`,
    `Platform: ${run.platform ?? "mixed"}`,
    `Archive path: ${run.archivePath ?? "none"}`,
    `Candidates found: ${run.stats.candidatesFound}`,
    `Queue added: ${run.stats.added}`,
    `Queue updated: ${run.stats.updated}`,
    `Queue unchanged: ${run.stats.unchanged}`,
    `Warnings: ${run.stats.warnings}`,
    `Errors: ${run.stats.errors}`,
  ].join("\n");
}

export function isContentIngestCommand(command: string) {
  const normalized = normalize(command);

  return (
    /^scan youtube archive\s+.+$/i.test(normalized) ||
    /^import youtube archive\s+.+$/i.test(normalized) ||
    /^scan tiktok archive\s+.+$/i.test(normalized) ||
    /^import tiktok archive\s+.+$/i.test(normalized) ||
    /^show content ingest runs$/i.test(normalized) ||
    /^show latest content ingest run$/i.test(normalized) ||
    /^show content ingest run\s+[a-zA-Z0-9_-]+$/i.test(normalized) ||
    /^process saved content batch(?:\s+\d+)?$/i.test(normalized) ||
    /^process saved content analyze-next$/i.test(normalized) ||
    /^create reviews for analyzed content$/i.test(normalized) ||
    /^show saved content lifecycle report$/i.test(normalized) ||
    /^close completed saved content$/i.test(normalized) ||
    /^show saved content duplicates$/i.test(normalized) ||
    /^repair saved content duplicates$/i.test(normalized)
  );
}

export async function executeContentIngestCommand(
  command: string
): Promise<ContentIngestCommandResult> {
  const normalized = normalize(command);

  if (/^scan youtube archive\s+.+$/i.test(normalized)) {
    const archivePath = stripCommandPath(normalized, /^scan youtube archive\s+/i);
    const run = await scanYouTubeArchive(archivePath);
    const paths = await writeContentIngestRun(run);

    return {
      ok: true,
      title: "YouTube archive scan complete",
      message: [
        formatRunShort(run),
        "",
        "Files:",
        `- ${paths.jsonPath}`,
        `- ${paths.summaryPath}`,
        "",
        "Nothing was imported. Run import youtube archive <path> to add items to the queue.",
      ].join("\n"),
      data: { run, paths },
    };
  }

  if (/^import youtube archive\s+.+$/i.test(normalized)) {
    const archivePath = stripCommandPath(normalized, /^import youtube archive\s+/i);
    const run = await scanYouTubeArchive(archivePath);
    const result = await importRunCandidates(run);

    return {
      ok: true,
      title: "YouTube archive imported",
      message: [
        formatRunShort(result.run),
        "",
        "Files:",
        `- ${result.paths.jsonPath}`,
        `- ${result.paths.summaryPath}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^scan tiktok archive\s+.+$/i.test(normalized)) {
    const archivePath = stripCommandPath(normalized, /^scan tiktok archive\s+/i);
    const run = await scanTikTokArchive(archivePath);
    const paths = await writeContentIngestRun(run);

    return {
      ok: true,
      title: "TikTok archive scan complete",
      message: [
        formatRunShort(run),
        "",
        "Files:",
        `- ${paths.jsonPath}`,
        `- ${paths.summaryPath}`,
        "",
        "Nothing was imported. Run import tiktok archive <path> to add items to the queue.",
      ].join("\n"),
      data: { run, paths },
    };
  }

  if (/^import tiktok archive\s+.+$/i.test(normalized)) {
    const archivePath = stripCommandPath(normalized, /^import tiktok archive\s+/i);
    const run = await scanTikTokArchive(archivePath);
    const result = await importRunCandidates(run);

    return {
      ok: true,
      title: "TikTok archive imported",
      message: [
        formatRunShort(result.run),
        "",
        "Files:",
        `- ${result.paths.jsonPath}`,
        `- ${result.paths.summaryPath}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^show content ingest runs$/i.test(normalized)) {
    const runs = await listContentIngestRuns(20);

    return {
      ok: true,
      title: "Content Ingest Runs",
      message: runs.length
        ? runs
            .map((run, index) => {
              return `${index + 1}. ${run.id} — ${run.kind}/${run.status}/${run.platform ?? "mixed"} — candidates ${run.candidatesFound}, queue ${run.queueItems}`;
            })
            .join("\n")
        : "No content ingest runs found.",
      data: { runs },
    };
  }

  if (/^show latest content ingest run$/i.test(normalized)) {
    const run = await readLatestContentIngestRun();

    return {
      ok: Boolean(run),
      title: run ? "Latest Content Ingest Run" : "No Content Ingest Run Found",
      message: run ? formatRunShort(run) : "No content ingest run exists yet.",
      data: run,
    };
  }

  if (/^show content ingest run\s+[a-zA-Z0-9_-]+$/i.test(normalized)) {
    const runId = normalized.replace(/^show content ingest run\s+/i, "");
    const run = await readContentIngestRun(runId);

    return {
      ok: Boolean(run),
      title: run ? "Content Ingest Run" : "Content Ingest Run Not Found",
      message: run ? formatRunShort(run) : `No content ingest run found for ID: ${runId}`,
      data: run,
    };
  }

  if (/^process saved content batch(?:\s+\d+)?$/i.test(normalized) || /^process saved content analyze-next$/i.test(normalized)) {
    const match = normalized.match(/\s(\d+)$/);
    const limit = match?.[1] ? Math.max(1, Math.min(25, Number(match[1]))) : 5;
    const result = await processSavedContentBatch(limit);

    return {
      ok: true,
      title: "Saved content batch processed",
      message: [
        `Requested: ${result.requested}`,
        `Processed: ${result.processed.length}`,
        "",
        ...result.processed.map((item, index) => {
          return `${index + 1}. ${item.title} — steps ${item.steps.length}, warnings ${item.warnings.length}`;
        }),
      ].join("\n"),
      data: result,
    };
  }

  if (/^create reviews for analyzed content$/i.test(normalized)) {
    const result = await createReviewsForAnalyzedContent(10);

    return {
      ok: true,
      title: "Content reviews created for analyzed content",
      message: [
        `Created: ${result.created.length}`,
        `Skipped: ${result.skipped.length}`,
        "",
        ...result.created.map((item) => `- ${item.reviewId}: ${item.title}`),
        result.skipped.length ? "" : "",
        ...result.skipped.map((item) => `- skipped ${item.itemIndex}: ${item.title} (${item.reason})`),
      ].join("\n"),
      data: result,
    };
  }

  if (/^show saved content lifecycle report$/i.test(normalized)) {
    const report = await getSavedContentLifecycleReport();

    return {
      ok: true,
      title: "Saved Content Lifecycle Report",
      message: formatLifecycleReport(report),
      data: report,
    };
  }

  if (/^close completed saved content$/i.test(normalized)) {
    const result = await closeCompletedSavedContent();

    return {
      ok: true,
      title: "Completed saved content closed",
      message: [
        `Closed: ${result.closed}`,
        "",
        result.itemIds.length ? result.itemIds.map((id) => `- ${id}`).join("\n") : "No completed active items required closing.",
      ].join("\n"),
      data: result,
    };
  }

  if (/^show saved content duplicates$/i.test(normalized)) {
    const report = await getSavedContentDuplicateReport();

    return {
      ok: true,
      title: "Saved Content Duplicate Report",
      message: formatDuplicateReport(report),
      data: report,
    };
  }

  if (/^repair saved content duplicates$/i.test(normalized)) {
    const result = await repairSavedContentDuplicates();

    return {
      ok: true,
      title: "Saved Content Duplicate Repair",
      message: [
        result.message,
        `Duplicate groups: ${result.report.duplicateGroups.length}`,
        `Repaired: ${result.repaired}`,
      ].join("\n"),
      data: result,
    };
  }

  return {
    ok: false,
    title: "Content ingest command not recognized",
    message: [
      "Try one of these:",
      "- scan youtube archive <path>",
      "- import youtube archive <path>",
      "- scan tiktok archive <path>",
      "- import tiktok archive <path>",
      "- show content ingest runs",
      "- process saved content batch 10",
      "- show saved content lifecycle report",
      "- show saved content duplicates",
    ].join("\n"),
  };
}
