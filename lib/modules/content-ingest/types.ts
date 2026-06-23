export type ContentIngestPlatform = "youtube" | "tiktok";

export type ContentIngestRunKind = "scan" | "import" | "batch" | "lifecycle" | "duplicates";

export type ContentIngestRunStatus = "scanned" | "imported" | "completed" | "failed";

export type ArchiveCandidate = {
  id: string;
  platform: ContentIngestPlatform;
  externalId: string;
  url: string;
  title?: string;
  creator?: string;
  sourceType: "playlist" | "watch-later" | "favorites" | "collection" | "archive" | "history";
  sourceContainerId?: string;
  sourceContainerTitle?: string;
  sourceFile: string;
  discoveredAt: string;
  savedAt?: string;
  raw?: Record<string, unknown>;
};

export type ContentIngestRunStats = {
  filesScanned: number;
  urlsFound: number;
  candidatesFound: number;
  added: number;
  updated: number;
  unchanged: number;
  duplicatesSkipped: number;
  errors: number;
  warnings: number;
};

export type ContentIngestRun = {
  version: 1;
  id: string;
  kind: ContentIngestRunKind;
  status: ContentIngestRunStatus;
  platform?: ContentIngestPlatform;
  archivePath?: string;
  createdAt: string;
  completedAt?: string;
  stats: ContentIngestRunStats;
  candidateIds: string[];
  queueItemIds: string[];
  warnings: string[];
  errors: string[];
  files: string[];
  candidates: ArchiveCandidate[];
};

export type ContentIngestRunIndexEntry = {
  id: string;
  kind: ContentIngestRunKind;
  status: ContentIngestRunStatus;
  platform?: ContentIngestPlatform;
  archivePath?: string;
  createdAt: string;
  completedAt?: string;
  candidatesFound: number;
  queueItems: number;
};

export type ContentIngestRunIndex = {
  version: 1;
  updatedAt: string;
  runs: ContentIngestRunIndexEntry[];
};

export type ContentIngestCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};

export type DuplicateGroup = {
  key: string;
  reason: "id" | "url" | "external-id";
  itemIds: string[];
  titles: string[];
  urls: string[];
};

export type LifecycleReport = {
  generatedAt: string;
  total: number;
  active: number;
  closed: number;
  analyzedButActive: number;
  completeButActive: number;
  recommendations: string[];
};
