import {
    YouTubePlaylistMetadata,
    YouTubePlaylistRawDump,
    YouTubePlaylistVideo,
  } from "./types";
  
  const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
  
  type YouTubePlaylistListResponse = {
    items?: Array<{
      id: string;
      snippet?: {
        publishedAt?: string;
        channelId?: string;
        title?: string;
        description?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
          standard?: { url?: string };
          maxres?: { url?: string };
        };
        channelTitle?: string;
      };
      contentDetails?: {
        itemCount?: number;
      };
      status?: {
        privacyStatus?: string;
      };
    }>;
  };
  
  type YouTubePlaylistItemsResponse = {
    nextPageToken?: string;
    items?: Array<{
      id: string;
      snippet?: {
        publishedAt?: string;
        channelId?: string;
        title?: string;
        description?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
          standard?: { url?: string };
          maxres?: { url?: string };
        };
        channelTitle?: string;
        playlistId?: string;
        position?: number;
        resourceId?: {
          kind?: string;
          videoId?: string;
        };
        videoOwnerChannelTitle?: string;
        videoOwnerChannelId?: string;
      };
      contentDetails?: {
        videoId?: string;
        videoPublishedAt?: string;
      };
      status?: {
        privacyStatus?: string;
      };
    }>;
  };
  
  function getYouTubeApiKey() {
    const apiKey = process.env.YOUTUBE_API_KEY;
  
    if (!apiKey) {
      throw new Error(
        "Missing YOUTUBE_API_KEY. Add it to .env.local before using YouTube ingest."
      );
    }
  
    return apiKey;
  }
  
  function bestThumbnailUrl(
    thumbnails:
      | {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
          standard?: { url?: string };
          maxres?: { url?: string };
        }
      | undefined
  ) {
    return (
      thumbnails?.maxres?.url ??
      thumbnails?.standard?.url ??
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url
    );
  }
  
  async function getJson<T>(url: URL): Promise<T> {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  
    const text = await response.text();
  
    if (!response.ok) {
      throw new Error(
        `YouTube API request failed: ${response.status} ${response.statusText}\n${text}`
      );
    }
  
    return JSON.parse(text) as T;
  }
  
  export async function fetchYouTubePlaylistMetadata(
    playlistId: string
  ): Promise<YouTubePlaylistMetadata> {
    const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
  
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("id", playlistId);
    url.searchParams.set("key", getYouTubeApiKey());
  
    const json = await getJson<YouTubePlaylistListResponse>(url);
    const playlist = json.items?.[0];
  
    if (!playlist) {
      throw new Error(
        `No playlist found for ID "${playlistId}". It may be private, deleted, or the ID may be wrong.`
      );
    }
  
    const snippet = playlist.snippet;
    const contentDetails = playlist.contentDetails;
    const status = playlist.status;
  
    return {
      playlistId: playlist.id,
      title: snippet?.title ?? "Untitled YouTube Playlist",
      description: snippet?.description ?? "",
      channelId: snippet?.channelId ?? "",
      channelTitle: snippet?.channelTitle ?? "Unknown Channel",
      publishedAt: snippet?.publishedAt ?? "",
      itemCount: contentDetails?.itemCount ?? 0,
      privacyStatus: status?.privacyStatus,
      url: `https://www.youtube.com/playlist?list=${playlist.id}`,
      thumbnailUrl: bestThumbnailUrl(snippet?.thumbnails),
    };
  }
  
  export async function fetchAllYouTubePlaylistVideos(
    playlistId: string
  ): Promise<{
    videos: YouTubePlaylistVideo[];
    rawApiPages: unknown[];
  }> {
    const videos: YouTubePlaylistVideo[] = [];
    const rawApiPages: unknown[] = [];
  
    let pageToken: string | undefined;
  
    do {
      const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  
      url.searchParams.set("part", "snippet,contentDetails,status");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", getYouTubeApiKey());
  
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }
  
      const json = await getJson<YouTubePlaylistItemsResponse>(url);
      rawApiPages.push(json);
  
      for (const item of json.items ?? []) {
        const snippet = item.snippet;
        const contentDetails = item.contentDetails;
  
        const videoId =
          contentDetails?.videoId ?? snippet?.resourceId?.videoId ?? "";
  
        if (!videoId) {
          continue;
        }
  
        videos.push({
          playlistItemId: item.id,
          videoId,
          title: snippet?.title ?? "Untitled YouTube Video",
          description: snippet?.description ?? "",
          channelTitle: snippet?.channelTitle ?? "Unknown Channel",
          channelId: snippet?.channelId,
          videoOwnerChannelTitle: snippet?.videoOwnerChannelTitle,
          videoOwnerChannelId: snippet?.videoOwnerChannelId,
          position: snippet?.position ?? videos.length,
          addedToPlaylistAt: snippet?.publishedAt ?? "",
          videoPublishedAt: contentDetails?.videoPublishedAt,
          privacyStatus: item.status?.privacyStatus,
          url: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
          thumbnailUrl: bestThumbnailUrl(snippet?.thumbnails),
        });
      }
  
      pageToken = json.nextPageToken;
    } while (pageToken);
  
    return {
      videos,
      rawApiPages,
    };
  }
  
  export async function fetchYouTubePlaylistDump(
    playlistId: string
  ): Promise<YouTubePlaylistRawDump> {
    const playlist = await fetchYouTubePlaylistMetadata(playlistId);
    const { videos, rawApiPages } = await fetchAllYouTubePlaylistVideos(
      playlistId
    );
  
    return {
      importedAt: new Date().toISOString(),
      source: "youtube",
      playlist,
      videos,
      rawApiPages,
    };
  }