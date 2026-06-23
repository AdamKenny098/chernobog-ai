import path from "node:path";

import {
  ArchiveCandidate,
  ContentIngestRun,
} from "./types";
import {
  cleanUrl,
  createRunId,
  hashShort,
  readArchiveTextFiles,
  resolveArchivePath,
} from "./archiveScanner";

const TIKTOK_URL_REGEX =
  /https?:\/\/(?:www\.|m\.)?(?:tiktok\.com|tiktokv\.com)\/(?:@[^/\s"'<>\\]+\/video\/\d+|share\/video\/\d+|t\/[^\s"'<>\\]+)[^\s"'<>\\]{}]*/gi;

const TIKTOK_SHORT_URL_REGEX =
  /https?:\/\/(?:vm\.tiktok\.com|vt\.tiktok\.com)\/[^\s"'<>\\]{}]+/gi;

type TikTokExportEntry = {
  Date?: unknown;
  date?: unknown;
  Link?: unknown;
  link?: unknown;
  Title?: unknown;
  title?: unknown;
  SharedContent?: unknown;
  AdLink?: unknown;
  [key: string]: unknown;
};

type ExtractedList = {
  name: string;
  path: string;
  sourceType: ArchiveCandidate["sourceType"];
  sourceContainerTitle: string;
  entries: TikTokExportEntry[];
  importByDefault: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): TikTokExportEntry[] {
  return Array.isArray(value) ? (value as TikTokExportEntry[]) : [];
}

function getByPath(root: unknown, parts: string[]) {
  let current: unknown = root;

  for (const part of parts) {
    const record = asRecord(current);

    if (!record) {
      return undefined;
    }

    current = record[part];
  }

  return current;
}

function extractTikTokVideoId(url: string) {
  try {
    const parsed = new URL(url);

    const videoMatch =
      parsed.pathname.match(/\/video\/(\d+)/) ??
      parsed.pathname.match(/\/share\/video\/(\d+)/);

    if (videoMatch?.[1]) {
      return videoMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeTikTokUrl(rawUrl: string) {
  const cleaned = cleanUrl(rawUrl);

  try {
    const parsed = new URL(cleaned);

    parsed.hash = "";

    return parsed.toString();
  } catch {
    return cleaned;
  }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getEntryLink(entry: TikTokExportEntry) {
  return firstString(
    entry.Link,
    entry.link,
    entry.SharedContent,
    entry.AdLink
  );
}

function getEntryDate(entry: TikTokExportEntry) {
  return firstString(entry.Date, entry.date);
}

function getEntryTitle(entry: TikTokExportEntry, fallback: string) {
  return firstString(entry.Title, entry.title, entry.SharedContent) ?? fallback;
}

function guessCreator(url: string) {
  const match = url.match(/tiktok\.com\/@([^/]+)/i);

  return match?.[1] ? `@${match[1]}` : undefined;
}

function inferSourceType(filePath: string): ArchiveCandidate["sourceType"] {
  const lower = filePath.toLowerCase();

  if (lower.includes("favorite") || lower.includes("favourite") || lower.includes("liked")) {
    return "favorites";
  }

  if (lower.includes("collection")) {
    return "collection";
  }

  if (lower.includes("saved")) {
    return "watch-later";
  }

  if (lower.includes("history")) {
    return "history";
  }

  return "archive";
}

function guessTitle(text: string, url: string) {
  const index = text.indexOf(url);

  if (index < 0) {
    return undefined;
  }

  const before = text.slice(Math.max(0, index - 240), index);
  const lines = before
    .split(/\r?\n/)
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

  const candidate = lines[lines.length - 1];

  if (!candidate || candidate.startsWith("http") || candidate.length < 3) {
    return undefined;
  }

  return candidate.slice(0, 180);
}

function findRealTikTokExportLists(data: unknown): ExtractedList[] {
  const favoriteVideos = asArray(
    getByPath(data, [
      "Likes and Favorites",
      "Favorite Videos",
      "FavoriteVideoList",
    ])
  );

  const likedVideos = asArray(
    getByPath(data, [
      "Likes and Favorites",
      "Like List",
      "ItemFavoriteList",
    ])
  );

  const watchHistory = asArray(
    getByPath(data, [
      "Your Activity",
      "Watch History",
      "VideoList",
    ])
  );

  const reposts = asArray(
    getByPath(data, [
      "Your Activity",
      "Reposts",
      "RepostList",
    ])
  );

  const shares = asArray(
    getByPath(data, [
      "Your Activity",
      "Share History",
      "ShareHistoryList",
    ])
  );

  return [
    {
      name: "Favorite Videos",
      path: "Likes and Favorites.Favorite Videos.FavoriteVideoList",
      sourceType: "favorites",
      sourceContainerTitle: "TikTok Favorite Videos",
      entries: favoriteVideos,
      importByDefault: true,
    },
    {
      name: "Liked Videos",
      path: "Likes and Favorites.Like List.ItemFavoriteList",
      sourceType: "favorites",
      sourceContainerTitle: "TikTok Liked Videos",
      entries: likedVideos,
      importByDefault: false,
    },
    {
      name: "Watch History",
      path: "Your Activity.Watch History.VideoList",
      sourceType: "history",
      sourceContainerTitle: "TikTok Watch History",
      entries: watchHistory,
      importByDefault: false,
    },
    {
      name: "Reposts",
      path: "Your Activity.Reposts.RepostList",
      sourceType: "archive",
      sourceContainerTitle: "TikTok Reposts",
      entries: reposts,
      importByDefault: false,
    },
    {
      name: "Share History",
      path: "Your Activity.Share History.ShareHistoryList",
      sourceType: "archive",
      sourceContainerTitle: "TikTok Share History",
      entries: shares,
      importByDefault: false,
    },
  ];
}

function candidateFromEntry(options: {
  entry: TikTokExportEntry;
  list: ExtractedList;
  sourceFile: string;
  absoluteArchivePath: string;
  discoveredAt: string;
  entryIndex: number;
}): ArchiveCandidate | null {
  const rawLink = getEntryLink(options.entry);

  if (!rawLink) {
    return null;
  }

  const url = normalizeTikTokUrl(rawLink);
  const videoId = extractTikTokVideoId(url);
  const externalId = videoId ?? `url-hash:${hashShort(url)}`;
  const id = `tiktok:${externalId}`;
  const savedAt = getEntryDate(options.entry);

  return {
    id,
    platform: "tiktok",
    externalId,
    url,
    title: getEntryTitle(options.entry, "Saved TikTok Video"),
    creator: guessCreator(url),
    sourceType: options.list.sourceType,
    sourceContainerId: `tiktok-export:${hashShort(options.absoluteArchivePath)}:${hashShort(options.list.path)}`,
    sourceContainerTitle: options.list.sourceContainerTitle,
    sourceFile: path.relative(process.cwd(), options.sourceFile).replace(/\\/g, "/"),
    discoveredAt: options.discoveredAt,
    savedAt,
    raw: {
      importPath: options.list.path,
      importList: options.list.name,
      entryIndex: options.entryIndex,
      entry: options.entry,
      originalUrl: rawLink,
      sourceFile: options.sourceFile,
    },
  };
}

function extractCandidatesFromRealTikTokJson(options: {
  text: string;
  sourceFile: string;
  absoluteArchivePath: string;
  discoveredAt: string;
  warnings: string[];
  errors: string[];
}) {
  let data: unknown;

  try {
    data = JSON.parse(options.text);
  } catch {
    return [];
  }

  const lists = findRealTikTokExportLists(data);
  const importLists = lists.filter((list) => list.importByDefault && list.entries.length > 0);
  const skippedLists = lists.filter((list) => !list.importByDefault && list.entries.length > 0);

  for (const list of lists.filter((candidateList) => candidateList.entries.length > 0)) {
    options.warnings.push(
      `${list.importByDefault ? "Importing" : "Detected but skipped"} ${list.entries.length} item(s) from ${list.path}.`
    );
  }

  if (skippedLists.length > 0) {
    options.warnings.push(
      "Skipped liked/watch-history/repost/share lists by default to avoid flooding the saved-content queue."
    );
  }

  const candidates: ArchiveCandidate[] = [];

  for (const list of importLists) {
    list.entries.forEach((entry, index) => {
      const candidate = candidateFromEntry({
        entry,
        list,
        sourceFile: options.sourceFile,
        absoluteArchivePath: options.absoluteArchivePath,
        discoveredAt: options.discoveredAt,
        entryIndex: index,
      });

      if (candidate) {
        candidates.push(candidate);
      }
    });
  }

  return candidates;
}

function extractCandidatesFromPlainText(options: {
  text: string;
  sourceFile: string;
  absoluteArchivePath: string;
  discoveredAt: string;
}) {
  const seen = new Map<string, ArchiveCandidate>();
  const matches = [
    ...(options.text.match(TIKTOK_URL_REGEX) ?? []),
    ...(options.text.match(TIKTOK_SHORT_URL_REGEX) ?? []),
  ];

  for (const rawMatch of matches) {
    const url = normalizeTikTokUrl(rawMatch);
    const videoId = extractTikTokVideoId(url);
    const externalId = videoId ?? `url-hash:${hashShort(url)}`;
    const id = `tiktok:${externalId}`;

    if (seen.has(id)) {
      continue;
    }

    seen.set(id, {
      id,
      platform: "tiktok",
      externalId,
      url,
      title: guessTitle(options.text, rawMatch) ?? "Saved TikTok Video",
      creator: guessCreator(url),
      sourceType: inferSourceType(options.sourceFile),
      sourceContainerId: `tiktok-archive:${hashShort(options.absoluteArchivePath)}`,
      sourceContainerTitle: "TikTok Archive Import",
      sourceFile: path.relative(process.cwd(), options.sourceFile).replace(/\\/g, "/"),
      discoveredAt: options.discoveredAt,
      raw: {
        originalUrl: url,
        sourceFile: options.sourceFile,
        parser: "plain-text-url-scan",
      },
    });
  }

  return Array.from(seen.values());
}

export async function scanTikTokArchive(archivePath: string) {
  const absolutePath = resolveArchivePath(archivePath);
  const scanned = await readArchiveTextFiles(archivePath);
  const seen = new Map<string, ArchiveCandidate>();
  const discoveredAt = new Date().toISOString();
  const warnings: string[] = [];

  for (const file of scanned.readable) {
    const extension = path.extname(file.path).toLowerCase();
    const errors: string[] = [];
    const jsonCandidates =
      extension === ".json"
        ? extractCandidatesFromRealTikTokJson({
            text: file.text,
            sourceFile: file.path,
            absoluteArchivePath: absolutePath,
            discoveredAt,
            warnings,
            errors,
          })
        : [];

    scanned.errors.push(...errors);

    const candidates =
      jsonCandidates.length > 0
        ? jsonCandidates
        : extractCandidatesFromPlainText({
            text: file.text,
            sourceFile: file.path,
            absoluteArchivePath: absolutePath,
            discoveredAt,
          });

    for (const candidate of candidates) {
      if (seen.has(candidate.id)) {
        continue;
      }

      seen.set(candidate.id, candidate);
    }
  }

  const candidates = Array.from(seen.values());

  const run: ContentIngestRun = {
    version: 1,
    id: createRunId("tiktok-archive-scan"),
    kind: "scan",
    status: "scanned",
    platform: "tiktok",
    archivePath: absolutePath,
    createdAt: discoveredAt,
    completedAt: new Date().toISOString(),
    stats: {
      filesScanned: scanned.files.length,
      urlsFound: candidates.length,
      candidatesFound: candidates.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      duplicatesSkipped: 0,
      errors: scanned.errors.length,
      warnings: warnings.length,
    },
    candidateIds: candidates.map((candidate) => candidate.id),
    queueItemIds: [],
    warnings,
    errors: scanned.errors,
    files: scanned.files.map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/")),
    candidates,
  };

  return run;
}
