import {
  readSavedContentStore,
  updateSavedContentItemById,
} from "@/lib/modules/saved-content";
import {
  readThumbnailStore,
} from "@/lib/modules/content-ingest-ui/thumbnailStore";

import {
  createWatchSessionId,
  getLatestActiveWatchSession,
  readWatchSession,
  readWatchSessionIndex,
  writeWatchSession,
} from "./watchSessionStore";
import {
  CreateWatchSessionRequest,
  WatchActionRequest,
  WatchActionResult,
  WatchDecision,
  WatchQueueItem,
  WatchSession,
  WatchSessionFilter,
  WatchSessionOrder,
  WatchSessionPlatform,
  WatchSessionStats,
  WatchSessionView,
} from "./types";

const CLOSED_QUEUE_STATUSES = new Set(["watched", "analyzed", "archived", "dismissed"]);

function clampBatchSize(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return 50;
  }

  return Math.max(1, Math.min(500, Math.floor(numberValue)));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function itemMatchesFilter(item: Record<string, unknown>, filter: WatchSessionFilter) {
  const queueStatus = String(item.queueStatus ?? "");
  const analysisStatus = String(item.analysisStatus ?? "");
  const transcriptStatus = String(item.transcriptStatus ?? "");

  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return !CLOSED_QUEUE_STATUSES.has(queueStatus);
  }

  if (filter === "unwatched") {
    return !["watched", "archived", "dismissed"].includes(queueStatus);
  }

  if (filter === "unprocessed") {
    return queueStatus === "unprocessed";
  }

  if (filter === "needs-transcript") {
    return transcriptStatus !== "available";
  }

  if (filter === "ready-to-analyze") {
    return transcriptStatus === "available" && analysisStatus !== "complete";
  }

  return true;
}

function itemMatchesPlatform(item: Record<string, unknown>, platform: WatchSessionPlatform) {
  if (platform === "all") {
    return true;
  }

  return String(item.platform ?? "") === platform;
}

function sortItems(items: Record<string, unknown>[], order: WatchSessionOrder) {
  const copy = [...items];

  if (order === "random") {
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  return copy.sort((a, b) => {
    const aDate = String(a.importedAt ?? a.updatedAt ?? "");
    const bDate = String(b.importedAt ?? b.updatedAt ?? "");

    return order === "newest"
      ? bDate.localeCompare(aDate)
      : aDate.localeCompare(bDate);
  });
}

function createStats(session: WatchSession): WatchSessionStats {
  const total = session.itemStates.length;
  const watched = session.itemStates.filter((item) => item.decision === "watched").length;
  const analyzeLater = session.itemStates.filter((item) => item.decision === "analyze-later").length;
  const skipped = session.itemStates.filter((item) => item.decision === "skipped").length;
  const dismissed = session.itemStates.filter((item) => item.decision === "dismissed").length;
  const pending = session.itemStates.filter((item) => item.decision === "pending").length;
  const done = total - pending;

  return {
    total,
    currentPosition: Math.min(total, session.currentIndex + 1),
    pending,
    watched,
    analyzeLater,
    skipped,
    dismissed,
    progressPercent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function toWatchQueueItem(options: {
  rawItem: Record<string, unknown>;
  session: WatchSession;
  thumbnail?: WatchQueueItem["thumbnail"];
}): WatchQueueItem {
  const state = options.session.itemStates.find(
    (itemState) => itemState.itemId === String(options.rawItem.id ?? "")
  );

  return {
    id: String(options.rawItem.id ?? ""),
    title: String(options.rawItem.title ?? "Untitled saved content"),
    platform: String(options.rawItem.platform ?? "unknown"),
    sourceType: String(options.rawItem.sourceType ?? "unknown"),
    creator:
      typeof options.rawItem.creator === "string"
        ? options.rawItem.creator
        : undefined,
    url: String(options.rawItem.url ?? ""),
    externalId:
      typeof options.rawItem.externalId === "string"
        ? options.rawItem.externalId
        : undefined,
    sourceContainerTitle:
      typeof options.rawItem.sourceContainerTitle === "string"
        ? options.rawItem.sourceContainerTitle
        : undefined,
    queueStatus: String(options.rawItem.queueStatus ?? "unknown"),
    analysisStatus: String(options.rawItem.analysisStatus ?? "unknown"),
    transcriptStatus:
      typeof options.rawItem.transcriptStatus === "string"
        ? options.rawItem.transcriptStatus
        : undefined,
    importedAt:
      typeof options.rawItem.importedAt === "string"
        ? options.rawItem.importedAt
        : undefined,
    updatedAt:
      typeof options.rawItem.updatedAt === "string"
        ? options.rawItem.updatedAt
        : undefined,
    summary:
      typeof options.rawItem.summary === "string"
        ? options.rawItem.summary
        : undefined,
    possibleReasonSaved:
      typeof options.rawItem.possibleReasonSaved === "string"
        ? options.rawItem.possibleReasonSaved
        : undefined,
    topics: stringArray(options.rawItem.topics),
    relatedProjects: stringArray(options.rawItem.relatedProjects),
    decision: state?.decision ?? "pending",
    position: state?.position ?? 0,
    thumbnail: options.thumbnail,
  };
}

export async function createWatchSession(request: CreateWatchSessionRequest = {}) {
  const store = await readSavedContentStore();
  const rawItems = ((store.items ?? []) as unknown[]).map(asRecord);

  const platform: WatchSessionPlatform = request.platform ?? "tiktok";
  const filter: WatchSessionFilter = request.filter ?? "active";
  const order: WatchSessionOrder = request.order ?? "oldest";
  const batchSize = clampBatchSize(request.batchSize ?? 50);
  const sourceLabel =
    request.sourceLabel?.trim() ||
    `${platform === "all" ? "All Saved Content" : `${platform.toUpperCase()} Saved Content`}`;

  const selected = sortItems(
    rawItems.filter(
      (item) => itemMatchesPlatform(item, platform) && itemMatchesFilter(item, filter)
    ),
    order
  ).slice(0, batchSize);

  const now = new Date().toISOString();
  const id = createWatchSessionId();

  const session: WatchSession = {
    version: 1,
    id,
    title: `${sourceLabel} // ${selected.length} item watch session`,
    status: selected.length === 0 ? "completed" : "active",
    platform,
    filter,
    order,
    batchSize,
    sourceLabel,
    itemIds: selected.map((item) => String(item.id ?? "")),
    itemStates: selected.map((item, index) => ({
      itemId: String(item.id ?? ""),
      position: index,
      decision: "pending",
    })),
    currentIndex: 0,
    startedAt: now,
    updatedAt: now,
    completedAt: selected.length === 0 ? now : undefined,
  };

  const savedSession = await writeWatchSession(session);

  return getWatchSessionView(savedSession.id);
}

export async function getWatchSessionView(sessionId?: string): Promise<WatchSessionView> {
  const session = sessionId
    ? await readWatchSession(sessionId)
    : await getLatestActiveWatchSession();

  const index = await readWatchSessionIndex();

  if (!session) {
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      session: null,
      sessions: index.sessions,
      stats: null,
      currentItem: null,
      items: [],
    };
  }

  const [store, thumbnailStore] = await Promise.all([
    readSavedContentStore(),
    readThumbnailStore().catch(() => ({
      version: 1 as const,
      updatedAt: new Date().toISOString(),
      thumbnails: {},
    })),
  ]);

  const rawItems = ((store.items ?? []) as unknown[]).map(asRecord);
  const rawById = new Map(rawItems.map((item) => [String(item.id ?? ""), item]));
  const thumbnailsByItemId =
    thumbnailStore.thumbnails as Record<string, WatchQueueItem["thumbnail"]>;

  

  const items = session.itemIds
    .map((itemId) => {
      const rawItem = rawById.get(itemId);

      if (!rawItem) {
        return null;
      }

      return toWatchQueueItem({
        rawItem,
        session,
        thumbnail: thumbnailsByItemId[itemId],
      });
    })
    .filter((item): item is WatchQueueItem => Boolean(item));

  const currentItem = items[session.currentIndex] ?? null;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    session,
    sessions: index.sessions,
    stats: createStats(session),
    currentItem,
    items,
  };
}

function advanceToNextPending(session: WatchSession, currentIndex: number) {
  for (let index = currentIndex + 1; index < session.itemStates.length; index += 1) {
    if (session.itemStates[index]?.decision === "pending") {
      return index;
    }
  }

  for (let index = 0; index < session.itemStates.length; index += 1) {
    if (session.itemStates[index]?.decision === "pending") {
      return index;
    }
  }

  return Math.min(session.itemStates.length - 1, currentIndex + 1);
}

async function markItemDecision(
  session: WatchSession,
  itemId: string,
  decision: WatchDecision
) {
  const itemIndex = session.itemStates.findIndex((item) => item.itemId === itemId);

  if (itemIndex < 0) {
    return session;
  }

  const now = new Date().toISOString();

  session.itemStates[itemIndex] = {
    ...session.itemStates[itemIndex],
    decision,
    decidedAt: now,
  };

  if (decision === "watched") {
    await updateSavedContentItemById({
      id: itemId,
      queueStatus: "watched",
      patch: {
        updatedAt: now,
      },
    });
  }

  if (decision === "analyze-later") {
    await updateSavedContentItemById({
      id: itemId,
      queueStatus: "analyze-next",
      patch: {
        updatedAt: now,
      },
    });
  }

  if (decision === "dismissed") {
    await updateSavedContentItemById({
      id: itemId,
      queueStatus: "dismissed",
      patch: {
        updatedAt: now,
      },
    });
  }

  session.currentIndex = advanceToNextPending(session, itemIndex);

  const hasPending = session.itemStates.some((item) => item.decision === "pending");

  if (!hasPending) {
    session.status = "completed";
    session.completedAt = now;
  }

  return session;
}

export async function runWatchAction(request: WatchActionRequest): Promise<WatchActionResult> {
  const session = await readWatchSession(request.sessionId);

  if (!session) {
    return {
      ok: false,
      title: "Watch session not found",
      message: request.sessionId,
    };
  }

  const currentItemId = session.itemIds[session.currentIndex];
  const targetItemId = request.itemId ?? currentItemId;

  if (!targetItemId && !["complete", "abandon"].includes(request.action)) {
    return {
      ok: false,
      title: "No watch item selected",
      message: "The session has no current item.",
    };
  }

  let nextSession = {
    ...session,
    itemStates: [...session.itemStates],
  };

  if (request.action === "next") {
    nextSession.currentIndex = Math.min(
      nextSession.itemIds.length - 1,
      nextSession.currentIndex + 1
    );
  }

  if (request.action === "previous") {
    nextSession.currentIndex = Math.max(0, nextSession.currentIndex - 1);
  }

  if (request.action === "mark-watched") {
    nextSession = await markItemDecision(nextSession, targetItemId, "watched");
  }

  if (request.action === "analyze-later") {
    nextSession = await markItemDecision(nextSession, targetItemId, "analyze-later");
  }

  if (request.action === "skip") {
    nextSession = await markItemDecision(nextSession, targetItemId, "skipped");
  }

  if (request.action === "dismiss") {
    nextSession = await markItemDecision(nextSession, targetItemId, "dismissed");
  }

  if (request.action === "complete") {
    const now = new Date().toISOString();
    nextSession.status = "completed";
    nextSession.completedAt = now;
  }

  if (request.action === "abandon") {
    const now = new Date().toISOString();
    nextSession.status = "abandoned";
    nextSession.completedAt = now;
  }

  const savedSession = await writeWatchSession(nextSession);
  const view = await getWatchSessionView(savedSession.id);

  return {
    ok: true,
    title: "Watch session updated",
    message: `${request.action} applied to ${targetItemId ?? savedSession.id}`,
    view,
  };
}
