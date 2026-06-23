import {
  getSavedContentDuplicateReport,
  getSavedContentLifecycleReport,
  listContentIngestRuns,
} from "@/lib/modules/content-ingest";
import {
  listContentReviews,
} from "@/lib/modules/content-review";
import {
  getSavedContentDiagnostics,
  getSourceReliabilityReport,
} from "@/lib/modules/saved-content-reliability";
import {
  readSavedContentStore,
} from "@/lib/modules/saved-content";

import {
  readThumbnailStore,
} from "./thumbnailStore";
import {
  DashboardQueueItem,
  SavedContentDashboardData,
  SavedContentWorkflowLane,
} from "./types";

const CLOSED_STATUSES = new Set(["watched", "analyzed", "archived", "dismissed"]);

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function deriveLane(item: Record<string, unknown>, reviewStatus?: string): SavedContentWorkflowLane {
  const queueStatus = String(item.queueStatus ?? "");
  const analysisStatus = String(item.analysisStatus ?? "");
  const transcriptStatus = String(item.transcriptStatus ?? "");

  if (queueStatus === "archived") return "archived";
  if (queueStatus === "dismissed") return "dismissed";
  if (reviewStatus === "applied") return "applied";
  if (reviewStatus && reviewStatus !== "applied" && reviewStatus !== "rejected") return "needs-approval";
  if (analysisStatus === "complete") return "ready-for-review";
  if (transcriptStatus !== "available") return "needs-transcript";
  if (queueStatus === "unprocessed" || queueStatus === "analyze-next") return "ready-to-analyze";
  if (CLOSED_STATUSES.has(queueStatus)) return "closed";

  return "inbox";
}

function toQueueItem(
  item: Record<string, unknown>,
  reviewBySourceItemId: Map<string, { id: string; status: string }>,
  thumbnailByItemId: Record<string, DashboardQueueItem["thumbnail"]>
): DashboardQueueItem {
  const id = String(item.id ?? "");
  const review = reviewBySourceItemId.get(id);

  return {
    id,
    title: String(item.title ?? "Untitled saved content"),
    platform: String(item.platform ?? "unknown"),
    sourceType: String(item.sourceType ?? "unknown"),
    creator: typeof item.creator === "string" ? item.creator : undefined,
    url: String(item.url ?? ""),
    externalId: typeof item.externalId === "string" ? item.externalId : undefined,
    sourceContainerId:
      typeof item.sourceContainerId === "string" ? item.sourceContainerId : undefined,
    sourceContainerTitle:
      typeof item.sourceContainerTitle === "string"
        ? item.sourceContainerTitle
        : undefined,
    queueStatus: String(item.queueStatus ?? "unknown"),
    analysisStatus: String(item.analysisStatus ?? "unknown"),
    transcriptStatus:
      typeof item.transcriptStatus === "string" ? item.transcriptStatus : undefined,
    importedAt: typeof item.importedAt === "string" ? item.importedAt : undefined,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
    summary: typeof item.summary === "string" ? item.summary : undefined,
    possibleReasonSaved:
      typeof item.possibleReasonSaved === "string"
        ? item.possibleReasonSaved
        : undefined,
    topics: stringArray(item.topics),
    relatedProjects: stringArray(item.relatedProjects),
    extractedTasks: stringArray(item.extractedTasks),
    extractedIdeas: stringArray(item.extractedIdeas),
    extractedWarnings: stringArray(item.extractedWarnings),
    review,
    lane: deriveLane(item, review?.status),
    thumbnail: thumbnailByItemId[id],
  };
}

export async function getSavedContentDashboardData(): Promise<SavedContentDashboardData> {
  const [
    store,
    ingestRuns,
    reviews,
    savedContentDiagnostics,
    sourceReliability,
    lifecycle,
    duplicateReport,
    thumbnailStore,
  ] = await Promise.all([
    readSavedContentStore(),
    listContentIngestRuns(100),
    listContentReviews(),
    getSavedContentDiagnostics().catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
    getSourceReliabilityReport().catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
    getSavedContentLifecycleReport().catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
    })),
    getSavedContentDuplicateReport().catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
      duplicateGroups: [],
    })),
    readThumbnailStore(),
  ]);

  const reviewBySourceItemId = new Map(
    reviews.map((review) => [
      review.sourceItemId,
      {
        id: review.id,
        status: review.status,
      },
    ])
  );

  const rawItems = (store.items ?? []) as Array<Record<string, unknown>>;
  const queue = rawItems.map((item) =>
    toQueueItem(item, reviewBySourceItemId, thumbnailStore.thumbnails)
  );

  const activeItems = queue.filter((item) => !CLOSED_STATUSES.has(item.queueStatus)).length;
  const closedItems = queue.length - activeItems;

  const duplicateGroups = Array.isArray(
    (duplicateReport as { duplicateGroups?: unknown[] }).duplicateGroups
  )
    ? (duplicateReport as { duplicateGroups: unknown[] }).duplicateGroups.length
    : 0;

  const pendingReviews = reviews.filter((review) =>
    ["draft", "pending-review", "partially-approved", "approved"].includes(review.status)
  ).length;

  const thumbnailRecords = Object.values(thumbnailStore.thumbnails);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      totalItems: queue.length,
      activeItems,
      closedItems,
      youtubeItems: queue.filter((item) => item.platform === "youtube").length,
      tiktokItems: queue.filter((item) => item.platform === "tiktok").length,
      needsTranscript: queue.filter((item) => item.lane === "needs-transcript").length,
      readyToAnalyze: queue.filter((item) => item.lane === "ready-to-analyze").length,
      readyForReview: queue.filter((item) => item.lane === "ready-for-review").length,
      pendingReviews,
      ingestRuns: ingestRuns.length,
      reviews: reviews.length,
      duplicateGroups,
    },
    queue,
    ingestRuns,
    reviews,
    diagnostics: {
      savedContent: savedContentDiagnostics,
      lifecycle,
      duplicates: duplicateReport,
      sourceReliability,
      thumbnails: {
        total: thumbnailRecords.length,
        available: thumbnailRecords.filter((record) => record.thumbnailUrl).length,
        failed: thumbnailRecords.filter((record) => record.status === "failed").length,
      },
    },
  };
}
