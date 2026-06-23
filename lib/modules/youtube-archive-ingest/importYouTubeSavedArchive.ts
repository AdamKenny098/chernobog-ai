import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  getVaultRoot,
  relativeToVault,
  upsertSavedContentItems,
} from "@/lib/modules/saved-content";
import type { SavedContentItem } from "@/lib/modules/saved-content/types";

import {
  YouTubeSavedArchiveImportResult,
  YouTubeSavedArchiveImportSummary,
} from "./types";

const YOUTUBE_URL_REGEX =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s"'<>\\]+/gi;

function slugTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
}

function hashPath(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function getYouTubeSavedInboxRoot() {
  return path.join(getVaultRoot(), "inbox", "youtube-saved");
}

function getLatestSummaryPath() {
  return path.join(getYouTubeSavedInboxRoot(), "_latest-import.json");
}

async function listFilesRecursive(inputPath: string): Promise<string[]> {
  const stat = await fs.stat(inputPath);

  if (stat.isFile()) {
    return [inputPath];
  }

  const entries = await fs.readdir(inputPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const childPath = path.join(inputPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(childPath)));
    } else if (entry.isFile()) {
      files.push(childPath);
    }
  }

  return files;
}

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

function cleanUrl(url: string) {
  return url.replace(/[),.;\]]+$/g, "");
}

function canonicalYouTubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function uniqueByVideoId(urls: string[]) {
  const map = new Map<string, string>();

  for (const rawUrl of urls) {
    const cleaned = cleanUrl(rawUrl);
    const videoId = extractYouTubeVideoId(cleaned);

    if (!videoId) {
      continue;
    }

    map.set(videoId, canonicalYouTubeUrl(videoId));
  }

  return Array.from(map.entries()).map(([videoId, url]) => ({
    videoId,
    url,
  }));
}

function extractUrlsFromText(text: string) {
  const matches = text.match(YOUTUBE_URL_REGEX) ?? [];
  return uniqueByVideoId(matches);
}

function guessTitleFromNearbyText(text: string, url: string) {
  const index = text.indexOf(url);

  if (index < 0) {
    return undefined;
  }

  const before = text.slice(Math.max(0, index - 300), index);
  const lines = before
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidate = lines[lines.length - 1];

  if (!candidate || candidate.length < 3 || candidate.startsWith("http")) {
    return undefined;
  }

  return candidate.slice(0, 160);
}

function createSavedContentItem(params: {
  videoId: string;
  url: string;
  title?: string;
  importedAt: string;
}): SavedContentItem {
  const now = new Date().toISOString();

  return {
    id: `youtube:${params.videoId}`,

    platform: "youtube",
    sourceType: "watch-later",

    externalId: params.videoId,
    sourceContainerId: "youtube-saved-archive",
    sourceContainerTitle: "YouTube Saved Archive",

    title: params.title ?? "Saved YouTube Video",
    url: params.url,

    importedAt: params.importedAt,

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

export async function importYouTubeSavedArchive(
  archivePath: string
): Promise<YouTubeSavedArchiveImportResult> {
  const absolutePath = path.isAbsolute(archivePath)
    ? archivePath
    : path.join(process.cwd(), archivePath);

  const importedAt = new Date().toISOString();
  const importId = `${slugTimestamp()}_${hashPath(absolutePath)}`;
  const importFolder = path.join(getYouTubeSavedInboxRoot(), importId);

  await fs.mkdir(importFolder, { recursive: true });

  const files = await listFilesRecursive(absolutePath);
  const textParts: string[] = [];

  for (const file of files) {
    const lower = file.toLowerCase();

    if (
      lower.endsWith(".json") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".csv") ||
      lower.endsWith(".html") ||
      lower.endsWith(".htm")
    ) {
      try {
        textParts.push(await fs.readFile(file, "utf8"));
      } catch {
        // Ignore unreadable files.
      }
    }
  }

  const fullText = textParts.join("\n");
  const videos = extractUrlsFromText(fullText);

  const items = videos.map((video) =>
    createSavedContentItem({
      videoId: video.videoId,
      url: video.url,
      title: guessTitleFromNearbyText(fullText, video.url),
      importedAt,
    })
  );

  const savedContent = await upsertSavedContentItems(items);

  const parsedJsonPath = path.join(importFolder, "parsed-youtube-saved.json");
  const summaryPath = path.join(importFolder, "summary.candidate.md");

  const parsedPayload = {
    version: 1,
    importedAt,
    archivePath: absolutePath,
    videos,
    items,
  };

  await fs.writeFile(parsedJsonPath, JSON.stringify(parsedPayload, null, 2), "utf8");

  const summaryMarkdown = [
    "---",
    "source: youtube",
    "memory_status: candidate",
    "memory_type: media-reference",
    `imported_at: ${importedAt}`,
    `videos_found: ${videos.length}`,
    "---",
    "",
    `# YouTube Saved Archive Import — ${importId}`,
    "",
    `Archive path: ${absolutePath}`,
    `Videos found: ${videos.length}`,
    "",
    "## Videos",
    "",
    videos.length
      ? videos.map((video) => `- [${video.videoId}](${video.url})`).join("\n")
      : "_No YouTube video URLs found._",
    "",
  ].join("\n");

  await fs.writeFile(summaryPath, summaryMarkdown, "utf8");

  const latestSummary: YouTubeSavedArchiveImportSummary = {
    importId,
    importedAt,
    archivePath: absolutePath,
    videosFound: videos.length,
    summaryPath: relativeToVault(summaryPath),
    parsedJsonPath: relativeToVault(parsedJsonPath),
  };

  await fs.writeFile(
    getLatestSummaryPath(),
    JSON.stringify(latestSummary, null, 2),
    "utf8"
  );

  return {
    ok: true,
    importId,
    importedAt,
    archivePath: absolutePath,
    videosFound: videos.length,
    summaryPath: relativeToVault(summaryPath),
    parsedJsonPath: relativeToVault(parsedJsonPath),
    savedContent,
  };
}

export async function getLatestYouTubeSavedArchiveImportSummary() {
  try {
    const raw = await fs.readFile(getLatestSummaryPath(), "utf8");
    return JSON.parse(raw) as YouTubeSavedArchiveImportSummary;
  } catch {
    return null;
  }
}
