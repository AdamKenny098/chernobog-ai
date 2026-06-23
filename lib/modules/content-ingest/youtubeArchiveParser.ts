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

const YOUTUBE_URL_REGEX =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s"'<>\\]+/gi;

function extractYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").split(/[?&/]/)[0] || null;
    }

    if (parsed.pathname.startsWith("/watch")) {
      return parsed.searchParams.get("v");
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function canonicalYouTubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function inferSourceType(filePath: string): ArchiveCandidate["sourceType"] {
  const lower = filePath.toLowerCase();

  if (lower.includes("watch-later") || lower.includes("watch_later") || lower.includes("saved")) {
    return "watch-later";
  }

  if (lower.includes("liked")) {
    return "favorites";
  }

  if (lower.includes("playlist")) {
    return "playlist";
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

  const before = text.slice(Math.max(0, index - 300), index);
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

export async function scanYouTubeArchive(archivePath: string) {
  const absolutePath = resolveArchivePath(archivePath);
  const scanned = await readArchiveTextFiles(archivePath);
  const seen = new Map<string, ArchiveCandidate>();
  const discoveredAt = new Date().toISOString();

  for (const file of scanned.readable) {
    const matches = file.text.match(YOUTUBE_URL_REGEX) ?? [];

    for (const rawMatch of matches) {
      const url = cleanUrl(rawMatch);
      const videoId = extractYouTubeVideoId(url);

      if (!videoId) {
        continue;
      }

      const canonicalUrl = canonicalYouTubeUrl(videoId);
      const id = `youtube:${videoId}`;

      if (seen.has(id)) {
        continue;
      }

      seen.set(id, {
        id,
        platform: "youtube",
        externalId: videoId,
        url: canonicalUrl,
        title: guessTitle(file.text, rawMatch),
        sourceType: inferSourceType(file.path),
        sourceContainerId: `youtube-archive:${hashShort(absolutePath)}`,
        sourceContainerTitle: "YouTube Archive Import",
        sourceFile: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
        discoveredAt,
        raw: {
          originalUrl: url,
          sourceFile: file.path,
        },
      });
    }
  }

  const candidates = Array.from(seen.values());

  const run: ContentIngestRun = {
    version: 1,
    id: createRunId("youtube-archive-scan"),
    kind: "scan",
    status: "scanned",
    platform: "youtube",
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
      warnings: 0,
    },
    candidateIds: candidates.map((candidate) => candidate.id),
    queueItemIds: [],
    warnings: [],
    errors: scanned.errors,
    files: scanned.files.map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/")),
    candidates,
  };

  return run;
}
