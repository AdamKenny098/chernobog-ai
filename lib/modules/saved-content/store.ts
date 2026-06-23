import fs from "node:fs/promises";
import path from "node:path";

import {
  SavedContentAnalysisStatus,
  SavedContentItem,
  SavedContentPlatform,
  SavedContentQueueStatus,
  SavedContentQueueSummary,
  SavedContentSourceType,
  SavedContentStore,
  SavedContentTranscriptStatus,
  SavedContentUpsertResult,
} from "./types";

export function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getQueueRoot() {
  return path.join(getVaultRoot(), "content-queue");
}

export function getItemsPath() {
  return path.join(getQueueRoot(), "items.json");
}

export function relativeToVault(absolutePath: string) {
  return path.relative(getVaultRoot(), absolutePath).replace(/\\/g, "/");
}

export function resolveVaultPath(vaultRelativePath: string) {
  return path.join(getVaultRoot(), vaultRelativePath);
}

async function fileExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function createEmptyStore(): SavedContentStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

function createDedupKey(item: Pick<SavedContentItem, "platform" | "externalId">) {
  return `${item.platform}:${item.externalId}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSavedContentItem(item: SavedContentItem): SavedContentItem {
  const now = new Date().toISOString();

  return {
    ...item,
    id: item.id || `${item.platform}:${item.externalId}`,
    importedAt: item.importedAt || now,
    queueStatus: item.queueStatus || "unprocessed",
    analysisStatus: item.analysisStatus || "not-started",
    transcriptStatus: item.transcriptStatus || "not-started",
    relatedProjects: normalizeStringArray(item.relatedProjects),
    topics: normalizeStringArray(item.topics),
    keyPoints: normalizeStringArray(item.keyPoints),
    extractedTasks: normalizeStringArray(item.extractedTasks),
    extractedIdeas: normalizeStringArray(item.extractedIdeas),
    extractedWarnings: normalizeStringArray(item.extractedWarnings),
    reasonEvidence: normalizeStringArray(item.reasonEvidence),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };
}

function areItemsMeaningfullyEqual(
  current: SavedContentItem,
  incoming: SavedContentItem
) {
  const ignoredFields = new Set(["updatedAt", "createdAt"]);

  const currentComparable = Object.fromEntries(
    Object.entries(current).filter(([key]) => !ignoredFields.has(key))
  );

  const incomingComparable = Object.fromEntries(
    Object.entries(incoming).filter(([key]) => !ignoredFields.has(key))
  );

  return JSON.stringify(currentComparable) === JSON.stringify(incomingComparable);
}

export async function readSavedContentStore(): Promise<SavedContentStore> {
  const itemsPath = getItemsPath();

  if (!(await fileExists(itemsPath))) {
    return createEmptyStore();
  }

  try {
    const raw = await fs.readFile(itemsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SavedContentStore>;

    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => normalizeSavedContentItem(item as SavedContentItem))
        : [],
    };
  } catch {
    return createEmptyStore();
  }
}

export async function writeSavedContentStore(store: SavedContentStore) {
  const itemsPath = getItemsPath();

  await fs.mkdir(path.dirname(itemsPath), { recursive: true });

  await fs.writeFile(
    itemsPath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        items: store.items.map(normalizeSavedContentItem),
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function upsertSavedContentItems(
  incomingItems: SavedContentItem[]
): Promise<SavedContentUpsertResult> {
  const store = await readSavedContentStore();
  const now = new Date().toISOString();

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  const itemMap = new Map<string, SavedContentItem>();

  for (const item of store.items) {
    const normalized = normalizeSavedContentItem(item);
    itemMap.set(createDedupKey(normalized), normalized);
  }

  for (const rawIncoming of incomingItems) {
    const incoming = normalizeSavedContentItem(rawIncoming);
    const key = createDedupKey(incoming);
    const existing = itemMap.get(key);

    if (!existing) {
      itemMap.set(key, incoming);
      added += 1;
      continue;
    }

    const merged: SavedContentItem = normalizeSavedContentItem({
      ...incoming,

      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,

      queueStatus: existing.queueStatus,
      analysisStatus: existing.analysisStatus,
      transcriptStatus: existing.transcriptStatus,

      possibleReasonSaved:
        existing.possibleReasonSaved ?? incoming.possibleReasonSaved,
      reasonConfidence: existing.reasonConfidence ?? incoming.reasonConfidence,
      reasonEvidence: Array.from(
        new Set([...(existing.reasonEvidence ?? []), ...(incoming.reasonEvidence ?? [])])
      ),
      reasonReviewed: existing.reasonReviewed ?? incoming.reasonReviewed,
      confirmedReasonSaved:
        existing.confirmedReasonSaved ?? incoming.confirmedReasonSaved,

      relatedProjects: Array.from(
        new Set([...existing.relatedProjects, ...incoming.relatedProjects])
      ),
      topics: Array.from(new Set([...existing.topics, ...incoming.topics])),

      summary: existing.summary ?? incoming.summary,
      keyPoints: Array.from(new Set([...(existing.keyPoints ?? []), ...(incoming.keyPoints ?? [])])),

      extractedTasks: Array.from(
        new Set([...existing.extractedTasks, ...incoming.extractedTasks])
      ),
      extractedIdeas: Array.from(
        new Set([...existing.extractedIdeas, ...incoming.extractedIdeas])
      ),
      extractedWarnings: Array.from(
        new Set([...(existing.extractedWarnings ?? []), ...(incoming.extractedWarnings ?? [])])
      ),

      transcriptPath: existing.transcriptPath ?? incoming.transcriptPath,
      transcriptFetchedAt: existing.transcriptFetchedAt ?? incoming.transcriptFetchedAt,
      transcriptError: existing.transcriptError ?? incoming.transcriptError,
      analysisPath: existing.analysisPath ?? incoming.analysisPath,
      analyzedAt: existing.analyzedAt ?? incoming.analyzedAt,
      candidateMemoryPath: existing.candidateMemoryPath ?? incoming.candidateMemoryPath,
    });

    if (areItemsMeaningfullyEqual(existing, merged)) {
      unchanged += 1;
      continue;
    }

    itemMap.set(key, merged);
    updated += 1;
  }

  const items = Array.from(itemMap.values()).sort((a, b) => {
    const aTime = a.savedAt ?? a.importedAt;
    const bTime = b.savedAt ?? b.importedAt;

    return bTime.localeCompare(aTime);
  });

  await writeSavedContentStore({
    version: 1,
    updatedAt: now,
    items,
  });

  return {
    added,
    updated,
    unchanged,
    total: items.length,
    queuePath: relativeToVault(getItemsPath()),
  };
}

const CLOSED_QUEUE_STATUSES: SavedContentQueueStatus[] = [
  "watched",
  "analyzed",
  "archived",
  "dismissed",
];

export function isSavedContentItemClosed(status: SavedContentQueueStatus) {
  return CLOSED_QUEUE_STATUSES.includes(status);
}

export async function getActiveSavedContentItems(limit = 20) {
  const store = await readSavedContentStore();

  return store.items
    .filter((item) => !isSavedContentItemClosed(item.queueStatus))
    .slice(0, limit);
}

export type SavedContentStatusUpdateResult = {
  item: SavedContentItem;
  previousQueueStatus: SavedContentQueueStatus;
  previousAnalysisStatus: SavedContentAnalysisStatus;
  previousTranscriptStatus: SavedContentTranscriptStatus;
  queuePath: string;
};

export async function updateSavedContentItemByActiveIndex(params: {
  activeIndex: number;
  queueStatus?: SavedContentQueueStatus;
  analysisStatus?: SavedContentAnalysisStatus;
  transcriptStatus?: SavedContentTranscriptStatus;
  patch?: Partial<SavedContentItem>;
}): Promise<SavedContentStatusUpdateResult | null> {
  const store = await readSavedContentStore();

  const activeItems = store.items.filter(
    (item) => !isSavedContentItemClosed(item.queueStatus)
  );

  const target = activeItems[params.activeIndex - 1];

  if (!target) {
    return null;
  }

  return updateSavedContentItemById({
    id: target.id,
    queueStatus: params.queueStatus,
    analysisStatus: params.analysisStatus,
    transcriptStatus: params.transcriptStatus,
    patch: params.patch,
  });
}

export async function updateSavedContentItemById(params: {
  id: string;
  queueStatus?: SavedContentQueueStatus;
  analysisStatus?: SavedContentAnalysisStatus;
  transcriptStatus?: SavedContentTranscriptStatus;
  patch?: Partial<SavedContentItem>;
}): Promise<SavedContentStatusUpdateResult | null> {
  const store = await readSavedContentStore();
  const targetIndex = store.items.findIndex((item) => item.id === params.id);

  if (targetIndex < 0) {
    return null;
  }

  const target = normalizeSavedContentItem(store.items[targetIndex]);
  const previousQueueStatus = target.queueStatus;
  const previousAnalysisStatus = target.analysisStatus;
  const previousTranscriptStatus = target.transcriptStatus ?? "not-started";

  const updatedItem = normalizeSavedContentItem({
    ...target,
    ...(params.patch ?? {}),
    queueStatus: params.queueStatus ?? params.patch?.queueStatus ?? target.queueStatus,
    analysisStatus:
      params.analysisStatus ?? params.patch?.analysisStatus ?? target.analysisStatus,
    transcriptStatus:
      params.transcriptStatus ?? params.patch?.transcriptStatus ?? target.transcriptStatus,
    updatedAt: new Date().toISOString(),
  });

  store.items[targetIndex] = updatedItem;

  await writeSavedContentStore({
    version: 1,
    updatedAt: new Date().toISOString(),
    items: store.items,
  });

  return {
    item: updatedItem,
    previousQueueStatus,
    previousAnalysisStatus,
    previousTranscriptStatus,
    queuePath: getSavedContentItemsVaultPath(),
  };
}

function createZeroQueueStatusCounts(): Record<SavedContentQueueStatus, number> {
  return {
    unprocessed: 0,
    "watch-next": 0,
    "analyze-next": 0,
    processing: 0,
    watched: 0,
    analyzed: 0,
    archived: 0,
    dismissed: 0,
  };
}

function createZeroAnalysisStatusCounts(): Record<
  SavedContentAnalysisStatus,
  number
> {
  return {
    "not-started": 0,
    queued: 0,
    processing: 0,
    complete: 0,
    failed: 0,
  };
}

function createZeroTranscriptStatusCounts(): Record<
  SavedContentTranscriptStatus,
  number
> {
  return {
    "not-started": 0,
    queued: 0,
    available: 0,
    unavailable: 0,
    failed: 0,
  };
}

function createZeroPlatformCounts(): Record<SavedContentPlatform, number> {
  return {
    youtube: 0,
    tiktok: 0,
  };
}

function createZeroSourceTypeCounts(): Record<SavedContentSourceType, number> {
  return {
    playlist: 0,
    "watch-later": 0,
    favorites: 0,
    collection: 0,
  };
}

export async function getSavedContentQueueSummary(): Promise<SavedContentQueueSummary> {
  const store = await readSavedContentStore();

  const summary: SavedContentQueueSummary = {
    total: store.items.length,
    byQueueStatus: createZeroQueueStatusCounts(),
    byAnalysisStatus: createZeroAnalysisStatusCounts(),
    byTranscriptStatus: createZeroTranscriptStatusCounts(),
    byPlatform: createZeroPlatformCounts(),
    bySourceType: createZeroSourceTypeCounts(),
  };

  for (const rawItem of store.items) {
    const item = normalizeSavedContentItem(rawItem);

    summary.byQueueStatus[item.queueStatus] += 1;
    summary.byAnalysisStatus[item.analysisStatus] += 1;
    summary.byTranscriptStatus[item.transcriptStatus ?? "not-started"] += 1;
    summary.byPlatform[item.platform] += 1;
    summary.bySourceType[item.sourceType] += 1;
  }

  return summary;
}

export type SavedContentFilter = {
  platform?: SavedContentPlatform;
  sourceType?: SavedContentSourceType;
  queueStatus?: SavedContentQueueStatus;
  analysisStatus?: SavedContentAnalysisStatus;
  transcriptStatus?: SavedContentTranscriptStatus;
  project?: string;
  topic?: string;
  includeClosed?: boolean;
  limit?: number;
};

export async function querySavedContentItems(filter: SavedContentFilter) {
  const store = await readSavedContentStore();
  const limit = Math.max(1, Math.min(100, filter.limit ?? 20));

  return store.items
    .filter((item) => {
      if (!filter.includeClosed && isSavedContentItemClosed(item.queueStatus)) {
        return false;
      }

      if (filter.platform && item.platform !== filter.platform) {
        return false;
      }

      if (filter.sourceType && item.sourceType !== filter.sourceType) {
        return false;
      }

      if (filter.queueStatus && item.queueStatus !== filter.queueStatus) {
        return false;
      }

      if (filter.analysisStatus && item.analysisStatus !== filter.analysisStatus) {
        return false;
      }

      if (filter.transcriptStatus && item.transcriptStatus !== filter.transcriptStatus) {
        return false;
      }

      if (
        filter.project &&
        !item.relatedProjects.some(
          (project) => project.toLowerCase() === filter.project?.toLowerCase()
        )
      ) {
        return false;
      }

      if (
        filter.topic &&
        !item.topics.some((topic) =>
          topic.toLowerCase().includes(filter.topic?.toLowerCase() ?? "")
        )
      ) {
        return false;
      }

      return true;
    })
    .slice(0, limit);
}

export function getSavedContentItemsVaultPath() {
  return relativeToVault(getItemsPath());
}
