export type YouTubePlaylistIngestRequest = {
  playlist: string;
  projectId?: string;
  tags?: string[];
};

export type YouTubePlaylistMetadata = {
  playlistId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  itemCount: number;
  privacyStatus?: string;
  url: string;
  thumbnailUrl?: string;
};

export type YouTubePlaylistVideo = {
  playlistItemId: string;
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId?: string;
  videoOwnerChannelTitle?: string;
  videoOwnerChannelId?: string;
  position: number;
  addedToPlaylistAt: string;
  videoPublishedAt?: string;
  privacyStatus?: string;
  url: string;
  thumbnailUrl?: string;
};

export type YouTubePlaylistRawDump = {
  importedAt: string;
  source: "youtube";
  playlist: YouTubePlaylistMetadata;
  videos: YouTubePlaylistVideo[];
  rawApiPages: unknown[];
};

export type YouTubeCandidateMemoryEntry = {
  id: string;
  title: string;
  body: string;
  source: "youtube";
  memoryType: "summary" | "media-reference";
  status: "candidate";
  projectId?: string;
  tags: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  sourceRef: {
    type: "youtube-playlist" | "youtube-video";
    url: string;
    playlistId: string;
    videoId?: string;
  };
};

export type YouTubePlaylistIngestResult = {
  ok: true;
  importId: string;
  playlist: YouTubePlaylistMetadata;
  videoCount: number;

  skippedDuplicate?: boolean;
  duplicateReason?: string;
  contentHash?: string;

  savedContent?: {
    added: number;
    updated: number;
    unchanged: number;
    total: number;
    queuePath: string;
  };

  vaultPaths: {
    importFolder: string;
    rawJson: string;
    summaryMarkdown: string;
    candidateMemoryJson: string;
    videoIndexMarkdown: string;
    manifest?: string;
  };
};
