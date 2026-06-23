export type SavedContentPlatform = "youtube" | "tiktok";

export type SavedContentSourceType =
  | "playlist"
  | "watch-later"
  | "favorites"
  | "collection";

export type SavedContentQueueStatus =
  | "unprocessed"
  | "watch-next"
  | "analyze-next"
  | "processing"
  | "watched"
  | "analyzed"
  | "archived"
  | "dismissed";

export type SavedContentAnalysisStatus =
  | "not-started"
  | "queued"
  | "processing"
  | "complete"
  | "failed";

export type SavedContentTranscriptStatus =
  | "not-started"
  | "queued"
  | "available"
  | "unavailable"
  | "failed";

export type SavedContentItem = {
  id: string;

  platform: SavedContentPlatform;
  sourceType: SavedContentSourceType;

  externalId: string;
  sourceContainerId?: string;
  sourceContainerTitle?: string;

  title: string;
  description?: string;
  creator?: string;
  url: string;
  thumbnailUrl?: string;

  savedAt?: string;
  publishedAt?: string;
  importedAt: string;

  queueStatus: SavedContentQueueStatus;
  analysisStatus: SavedContentAnalysisStatus;
  transcriptStatus?: SavedContentTranscriptStatus;

  possibleReasonSaved?: string;
  reasonConfidence?: number;
  reasonEvidence?: string[];
  reasonReviewed?: boolean;
  confirmedReasonSaved?: string;

  relatedProjects: string[];
  topics: string[];

  summary?: string;
  keyPoints?: string[];

  extractedTasks: string[];
  extractedIdeas: string[];
  extractedWarnings?: string[];

  transcriptPath?: string;
  transcriptFetchedAt?: string;
  transcriptError?: string;

  analysisPath?: string;
  analyzedAt?: string;
  candidateMemoryPath?: string;

  createdAt: string;
  updatedAt: string;
};

export type SavedContentStore = {
  version: 1;
  updatedAt: string;
  items: SavedContentItem[];
};

export type SavedContentUpsertResult = {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
  queuePath: string;
};

export type SavedContentQueueSummary = {
  total: number;
  byQueueStatus: Record<SavedContentQueueStatus, number>;
  byAnalysisStatus: Record<SavedContentAnalysisStatus, number>;
  byTranscriptStatus: Record<SavedContentTranscriptStatus, number>;
  byPlatform: Record<SavedContentPlatform, number>;
  bySourceType: Record<SavedContentSourceType, number>;
};

export type SavedContentCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};
