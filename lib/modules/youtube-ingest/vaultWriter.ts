import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createSavedContentItemsFromYouTubePlaylistDump,
  upsertSavedContentItems,
} from "@/lib/modules/saved-content";

import {
  YouTubeCandidateMemoryEntry,
  YouTubePlaylistIngestResult,
  YouTubePlaylistRawDump,
} from "./types";

type YouTubeImportManifestEntry = {
  importId: string;
  playlistId: string;
  playlistTitle: string;
  channelTitle: string;
  videoCount: number;
  contentHash: string;
  importedAt: string;
  updatedAt: string;
  vaultPaths: YouTubePlaylistIngestResult["vaultPaths"];
};

type YouTubeImportManifest = {
  version: 1;
  updatedAt: string;
  imports: YouTubeImportManifestEntry[];
};

function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

function getYouTubeInboxRoot() {
  return path.join(getVaultRoot(), "inbox", "youtube");
}

function getManifestPath() {
  return path.join(getYouTubeInboxRoot(), "_manifest.json");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeTags(tags: string[] | undefined) {
  const baseTags = ["youtube", "playlist", "vault-ingest"];

  const extraTags =
    tags
      ?.map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .map((tag) => tag.replace(/\s+/g, "-")) ?? [];

  return Array.from(new Set([...baseTags, ...extraTags]));
}

function relativeToVault(absolutePath: string) {
  const vaultRoot = getVaultRoot();

  return path.relative(vaultRoot, absolutePath).replace(/\\/g, "/");
}

function resolveVaultRelativePath(vaultRelativePath: string) {
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

async function readManifest(): Promise<YouTubeImportManifest> {
  const manifestPath = getManifestPath();

  if (!(await fileExists(manifestPath))) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      imports: [],
    };
  }

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<YouTubeImportManifest>;

    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
    };
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      imports: [],
    };
  }
}

async function writeManifest(manifest: YouTubeImportManifest) {
  const manifestPath = getManifestPath();

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });

  const updatedManifest: YouTubeImportManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    imports: manifest.imports,
  };

  await fs.writeFile(
    manifestPath,
    JSON.stringify(updatedManifest, null, 2),
    "utf8"
  );
}

function buildPlaylistContentHash(dump: YouTubePlaylistRawDump) {
  const hashPayload = {
    playlistId: dump.playlist.playlistId,
    playlistTitle: dump.playlist.title,
    playlistDescription: dump.playlist.description,
    channelId: dump.playlist.channelId,
    channelTitle: dump.playlist.channelTitle,
    videos: dump.videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      position: video.position,
      addedToPlaylistAt: video.addedToPlaylistAt,
      videoPublishedAt: video.videoPublishedAt,
      channelTitle: video.videoOwnerChannelTitle ?? video.channelTitle,
    })),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(hashPayload))
    .digest("hex");
}

async function findDuplicateImport(params: {
  playlistId: string;
  contentHash: string;
  manifest: YouTubeImportManifest;
}) {
  const matchingImports = [...params.manifest.imports]
    .reverse()
    .filter(
      (entry) =>
        entry.playlistId === params.playlistId &&
        entry.contentHash === params.contentHash
    );

  for (const entry of matchingImports) {
    const rawJsonPath = resolveVaultRelativePath(entry.vaultPaths.rawJson);

    if (await fileExists(rawJsonPath)) {
      return entry;
    }
  }

  return null;
}

function buildSummaryMarkdown(dump: YouTubePlaylistRawDump) {
  const { playlist, videos, importedAt } = dump;
  const topVideos = videos.slice(0, 25);

  const videoLines =
    topVideos.length > 0
      ? topVideos
          .map((video, index) => {
            return `${index + 1}. [${video.title}](${video.url}) — ${
              video.videoOwnerChannelTitle ?? video.channelTitle
            }`;
          })
          .join("\n")
      : "No videos were returned by the YouTube API.";

  return `---
source: youtube
memory_status: candidate
memory_type: summary
playlist_id: ${playlist.playlistId}
playlist_title: "${playlist.title.replaceAll('"', '\\"')}"
channel: "${playlist.channelTitle.replaceAll('"', '\\"')}"
imported_at: ${importedAt}
video_count: ${videos.length}
---

# YouTube Playlist Ingest — ${playlist.title}

## Playlist

- **Title:** ${playlist.title}
- **Channel:** ${playlist.channelTitle}
- **Playlist ID:** \`${playlist.playlistId}\`
- **URL:** ${playlist.url}
- **Reported Item Count:** ${playlist.itemCount}
- **Videos Retrieved:** ${videos.length}
- **Privacy Status:** ${playlist.privacyStatus ?? "unknown"}
- **Imported At:** ${importedAt}

## Description

${playlist.description.trim() || "_No playlist description provided._"}

## First ${topVideos.length} Videos

${videoLines}

## Notes

This file is a candidate summary generated from YouTube playlist ingest.

It should not be treated as approved memory until reviewed.
`;
}

function buildVideoIndexMarkdown(dump: YouTubePlaylistRawDump) {
  const { playlist, videos, importedAt } = dump;

  const videoRows = videos
    .map((video) => {
      const owner = video.videoOwnerChannelTitle ?? video.channelTitle;
      const published = video.videoPublishedAt ?? "unknown";
      const added = video.addedToPlaylistAt || "unknown";

      return `| ${video.position} | [${video.title.replaceAll(
        "|",
        "\\|"
      )}](${video.url}) | ${owner.replaceAll(
        "|",
        "\\|"
      )} | ${published} | ${added} |`;
    })
    .join("\n");

  return `---
source: youtube
memory_status: candidate
memory_type: media-reference
playlist_id: ${playlist.playlistId}
playlist_title: "${playlist.title.replaceAll('"', '\\"')}"
imported_at: ${importedAt}
video_count: ${videos.length}
---

# YouTube Playlist Video Index — ${playlist.title}

| Position | Video | Channel | Video Published | Added To Playlist |
|---:|---|---|---|---|
${videoRows}

`;
}

function buildCandidateMemoryEntries(params: {
  dump: YouTubePlaylistRawDump;
  projectId?: string;
  tags?: string[];
}): YouTubeCandidateMemoryEntry[] {
  const { dump, projectId } = params;
  const tags = normalizeTags(params.tags);
  const now = new Date().toISOString();

  const playlistCandidate: YouTubeCandidateMemoryEntry = {
    id: crypto.randomUUID(),
    title: `YouTube Playlist: ${dump.playlist.title}`,
    body: [
      `Imported YouTube playlist "${dump.playlist.title}" from ${dump.playlist.channelTitle}.`,
      `The playlist contains ${dump.videos.length} retrieved video entries.`,
      `Playlist URL: ${dump.playlist.url}`,
    ].join("\n"),
    source: "youtube",
    memoryType: "summary",
    status: "candidate",
    projectId,
    tags,
    confidence: 0.9,
    createdAt: now,
    updatedAt: now,
    sourceRef: {
      type: "youtube-playlist",
      url: dump.playlist.url,
      playlistId: dump.playlist.playlistId,
    },
  };

  const videoCandidates: YouTubeCandidateMemoryEntry[] = dump.videos.map(
    (video) => {
      return {
        id: crypto.randomUUID(),
        title: `YouTube Video: ${video.title}`,
        body: [
          `Video from playlist "${dump.playlist.title}".`,
          `Video title: ${video.title}`,
          `Channel: ${video.videoOwnerChannelTitle ?? video.channelTitle}`,
          `URL: ${video.url}`,
          video.description ? `Description:\n${video.description}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        source: "youtube",
        memoryType: "media-reference",
        status: "candidate",
        projectId,
        tags,
        confidence: 0.75,
        createdAt: now,
        updatedAt: now,
        sourceRef: {
          type: "youtube-video",
          url: video.url,
          playlistId: dump.playlist.playlistId,
          videoId: video.videoId,
        },
      };
    }
  );

  return [playlistCandidate, ...videoCandidates];
}

export async function writeYouTubePlaylistDumpToVault(params: {
  dump: YouTubePlaylistRawDump;
  projectId?: string;
  tags?: string[];
}): Promise<YouTubePlaylistIngestResult> {
  const { dump, projectId, tags } = params;

  const contentHash = buildPlaylistContentHash(dump);
  const manifest = await readManifest();

  const savedContentItems = createSavedContentItemsFromYouTubePlaylistDump({
    dump,
    sourceType: "playlist",
    projectId,
  });

  const savedContent = await upsertSavedContentItems(savedContentItems);

  const duplicateImport = await findDuplicateImport({
    playlistId: dump.playlist.playlistId,
    contentHash,
    manifest,
  });

  if (duplicateImport) {
    return {
      ok: true,
      importId: duplicateImport.importId,
      playlist: dump.playlist,
      videoCount: duplicateImport.videoCount,
      skippedDuplicate: true,
      duplicateReason:
        "Duplicate playlist import skipped because this playlist content already exists in the vault inbox.",
      contentHash,
      savedContent,
      vaultPaths: {
        ...duplicateImport.vaultPaths,
        manifest: relativeToVault(getManifestPath()),
      },
    };
  }

  const safeTitle = slugify(dump.playlist.title) || "youtube-playlist";
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  const importId = `${timestamp}_${dump.playlist.playlistId}_${safeTitle}`;

  const vaultRoot = getVaultRoot();
  const importFolder = path.join(vaultRoot, "inbox", "youtube", importId);

  const rawJsonPath = path.join(importFolder, "raw-playlist.json");
  const summaryMarkdownPath = path.join(importFolder, "summary.candidate.md");
  const videoIndexMarkdownPath = path.join(
    importFolder,
    "video-index.candidate.md"
  );
  const candidateMemoryJsonPath = path.join(
    importFolder,
    "candidate-memory.json"
  );

  await fs.mkdir(importFolder, { recursive: true });

  const candidateMemory = buildCandidateMemoryEntries({
    dump,
    projectId,
    tags,
  });

  await fs.writeFile(rawJsonPath, JSON.stringify(dump, null, 2), "utf8");
  await fs.writeFile(summaryMarkdownPath, buildSummaryMarkdown(dump), "utf8");
  await fs.writeFile(
    videoIndexMarkdownPath,
    buildVideoIndexMarkdown(dump),
    "utf8"
  );
  await fs.writeFile(
    candidateMemoryJsonPath,
    JSON.stringify(candidateMemory, null, 2),
    "utf8"
  );

  const vaultPaths: YouTubePlaylistIngestResult["vaultPaths"] = {
    importFolder: relativeToVault(importFolder),
    rawJson: relativeToVault(rawJsonPath),
    summaryMarkdown: relativeToVault(summaryMarkdownPath),
    candidateMemoryJson: relativeToVault(candidateMemoryJsonPath),
    videoIndexMarkdown: relativeToVault(videoIndexMarkdownPath),
    manifest: relativeToVault(getManifestPath()),
  };

  const now = new Date().toISOString();

  manifest.imports.push({
    importId,
    playlistId: dump.playlist.playlistId,
    playlistTitle: dump.playlist.title,
    channelTitle: dump.playlist.channelTitle,
    videoCount: dump.videos.length,
    contentHash,
    importedAt: dump.importedAt,
    updatedAt: now,
    vaultPaths,
  });

  await writeManifest(manifest);

  return {
    ok: true,
    importId,
    playlist: dump.playlist,
    videoCount: dump.videos.length,
    skippedDuplicate: false,
    contentHash,
    savedContent,
    vaultPaths,
  };
}
