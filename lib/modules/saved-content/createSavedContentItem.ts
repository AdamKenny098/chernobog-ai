import crypto from "node:crypto";

import type { YouTubePlaylistRawDump } from "@/lib/modules/youtube-ingest/types";

import { SavedContentItem, SavedContentSourceType } from "./types";

function createSavedContentId(platform: string, externalId: string) {
  return `${platform}:${externalId}`;
}

function createHashId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function createSavedContentItemsFromYouTubePlaylistDump(params: {
  dump: YouTubePlaylistRawDump;
  sourceType?: Extract<SavedContentSourceType, "playlist" | "watch-later">;
  projectId?: string;
  topics?: string[];
}): SavedContentItem[] {
  const { dump, projectId } = params;
  const sourceType = params.sourceType ?? "playlist";
  const topics = params.topics ?? [];
  const now = new Date().toISOString();

  return dump.videos.map((video) => {
    const creator = video.videoOwnerChannelTitle ?? video.channelTitle;

    return {
      id: createSavedContentId("youtube", video.videoId),

      platform: "youtube",
      sourceType,

      externalId: video.videoId,
      sourceContainerId: dump.playlist.playlistId,
      sourceContainerTitle: dump.playlist.title,

      title: video.title,
      description: video.description,
      creator,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,

      savedAt: video.addedToPlaylistAt || undefined,
      publishedAt: video.videoPublishedAt,
      importedAt: dump.importedAt,

      queueStatus: "unprocessed",
      analysisStatus: "not-started",
      transcriptStatus: "not-started",

      relatedProjects: projectId ? [projectId] : [],
      topics,

      extractedTasks: [],
      extractedIdeas: [],
      extractedWarnings: [],
      keyPoints: [],
      reasonEvidence: [],

      createdAt: now,
      updatedAt: now,
    };
  });
}

export function createSavedContentItemFromTikTokUrl(params: {
  url: string;
  title?: string;
  creator?: string;
  sourceType?: Extract<SavedContentSourceType, "favorites" | "collection">;
  sourceContainerTitle?: string;
  savedAt?: string;
  importedAt?: string;
}): SavedContentItem {
  const now = new Date().toISOString();
  const externalId = createHashId(params.url);

  return {
    id: createSavedContentId("tiktok", externalId),

    platform: "tiktok",
    sourceType: params.sourceType ?? "favorites",

    externalId,
    sourceContainerTitle: params.sourceContainerTitle,

    title: params.title ?? "Saved TikTok",
    creator: params.creator,
    url: params.url,

    savedAt: params.savedAt,
    importedAt: params.importedAt ?? now,

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
