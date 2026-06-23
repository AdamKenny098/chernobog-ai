export type WatchSessionPlatform = "all" | "youtube" | "tiktok";

export type WatchSessionFilter =
  | "active"
  | "unwatched"
  | "unprocessed"
  | "needs-transcript"
  | "ready-to-analyze"
  | "all";

export type WatchSessionOrder = "oldest" | "newest" | "random";

export type WatchDecision =
  | "pending"
  | "watched"
  | "analyze-later"
  | "skipped"
  | "dismissed";

export type WatchSessionStatus = "active" | "completed" | "abandoned";

export type WatchSessionItemState = {
  itemId: string;
  position: number;
  decision: WatchDecision;
  decidedAt?: string;
};

export type WatchSession = {
  version: 1;
  id: string;
  title: string;
  status: WatchSessionStatus;
  platform: WatchSessionPlatform;
  filter: WatchSessionFilter;
  order: WatchSessionOrder;
  batchSize: number;
  sourceLabel: string;
  itemIds: string[];
  itemStates: WatchSessionItemState[];
  currentIndex: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type WatchSessionIndexEntry = {
  id: string;
  title: string;
  status: WatchSessionStatus;
  platform: WatchSessionPlatform;
  filter: WatchSessionFilter;
  order: WatchSessionOrder;
  batchSize: number;
  sourceLabel: string;
  itemCount: number;
  currentIndex: number;
  pendingCount: number;
  watchedCount: number;
  analyzeLaterCount: number;
  skippedCount: number;
  dismissedCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type WatchSessionIndex = {
  version: 1;
  updatedAt: string;
  sessions: WatchSessionIndexEntry[];
};

export type WatchQueueItem = {
  id: string;
  title: string;
  platform: string;
  sourceType: string;
  creator?: string;
  url: string;
  externalId?: string;
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
  decision: WatchDecision;
  position: number;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    thumbnailUrls?: string[];
    status: string;
    source: string;
    error?: string;
  };
};

export type WatchSessionStats = {
  total: number;
  currentPosition: number;
  pending: number;
  watched: number;
  analyzeLater: number;
  skipped: number;
  dismissed: number;
  progressPercent: number;
};

export type WatchSessionView = {
  ok: true;
  generatedAt: string;
  session: WatchSession | null;
  sessions: WatchSessionIndexEntry[];
  stats: WatchSessionStats | null;
  currentItem: WatchQueueItem | null;
  items: WatchQueueItem[];
};

export type CreateWatchSessionRequest = {
  platform?: WatchSessionPlatform;
  filter?: WatchSessionFilter;
  order?: WatchSessionOrder;
  batchSize?: number;
  sourceLabel?: string;
};

export type WatchActionRequest = {
  sessionId: string;
  action:
    | "next"
    | "previous"
    | "mark-watched"
    | "analyze-later"
    | "skip"
    | "dismiss"
    | "complete"
    | "abandon";
  itemId?: string;
};

export type WatchActionResult = {
  ok: boolean;
  title: string;
  message: string;
  view?: WatchSessionView;
};
