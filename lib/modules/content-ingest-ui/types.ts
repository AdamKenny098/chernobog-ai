import type { ContentIngestRunIndexEntry } from "@/lib/modules/content-ingest";
import type { ContentReviewIndexEntry } from "@/lib/modules/content-review";

export type SavedContentWorkflowLane =
  | "inbox"
  | "needs-transcript"
  | "ready-to-analyze"
  | "ready-for-review"
  | "needs-approval"
  | "applied"
  | "archived"
  | "dismissed"
  | "closed";

export type SavedContentThumbnailStatus =
  | "not-started"
  | "derived"
  | "scraped"
  | "unavailable"
  | "failed";

export type SavedContentThumbnailRecord = {
  itemId: string;
  platform: string;
  externalId: string;
  url: string;
  thumbnailUrl?: string;
  fallbackUrl?: string;
  thumbnailUrls?: string[];
  status: SavedContentThumbnailStatus;
  source: "youtube-derived" | "tiktok-oembed" | "opengraph" | "manual" | "fallback";
  fetchedAt: string;
  error?: string;
};

export type SavedContentThumbnailStore = {
  version: 1;
  updatedAt: string;
  thumbnails: Record<string, SavedContentThumbnailRecord>;
};

export type DashboardQueueItem = {
  id: string;
  title: string;
  platform: string;
  sourceType: string;
  creator?: string;
  url: string;
  externalId?: string;
  sourceContainerId?: string;
  sourceContainerTitle?: string;
  queueStatus: string;
  analysisStatus: string;
  transcriptStatus?: string;
  importedAt?: string;
  updatedAt?: string;
  summary?: string;
  possibleReasonSaved?: string;
  topics: string[];
  relatedProjects: string[];
  extractedTasks: string[];
  extractedIdeas: string[];
  extractedWarnings: string[];
  review?: {
    id: string;
    status: string;
  };
  lane: SavedContentWorkflowLane;
  thumbnail?: SavedContentThumbnailRecord;
};

export type DashboardSummary = {
  totalItems: number;
  activeItems: number;
  closedItems: number;
  youtubeItems: number;
  tiktokItems: number;
  needsTranscript: number;
  readyToAnalyze: number;
  readyForReview: number;
  pendingReviews: number;
  ingestRuns: number;
  reviews: number;
  duplicateGroups: number;
};

export type SavedContentDashboardData = {
  ok: true;
  generatedAt: string;
  summary: DashboardSummary;
  queue: DashboardQueueItem[];
  ingestRuns: ContentIngestRunIndexEntry[];
  reviews: ContentReviewIndexEntry[];
  diagnostics: {
    savedContent?: unknown;
    lifecycle?: unknown;
    duplicates?: unknown;
    sourceReliability?: unknown;
    thumbnails?: {
      total: number;
      available: number;
      failed: number;
    };
  };
};

export type DashboardActionRequest =
  | {
      type: "command";
      command: string;
    }
  | {
      type: "queue-action";
      action:
        | "watch-next"
        | "analyze-next"
        | "fetch-transcript"
        | "chunk-transcript"
        | "summarize"
        | "reason"
        | "extract-candidates"
        | "create-review"
        | "archive"
        | "dismiss"
        | "mark-watched"
        | "mark-analyzed";
      itemId: string;
    }
  | {
      type: "review-action";
      action: "show" | "approve-all" | "reject-all" | "apply";
      reviewId: string;
    }
  | {
      type: "import";
      platform: "youtube" | "tiktok";
      source: "archive" | "playlist-url";
      mode: "scan" | "import" | "scan-import";
      value: string;
    }
  | {
      type: "refresh-thumbnails";
      limit?: number;
      force?: boolean;
    };

export type ContentIngestUiActionResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};
