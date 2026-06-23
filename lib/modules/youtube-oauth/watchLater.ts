import {
  createSavedContentItemsFromYouTubePlaylistDump,
  upsertSavedContentItems,
} from "@/lib/modules/saved-content";
import {
  YouTubePlaylistMetadata,
  YouTubePlaylistRawDump,
  YouTubePlaylistVideo,
} from "@/lib/modules/youtube-ingest/types";

import { getValidYouTubeAccessToken } from "./oauthClient";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

type PlaylistItemsResponse = {
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
      position?: number;
      resourceId?: {
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

async function getJson<T>(url: URL, accessToken: string): Promise<T> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `YouTube OAuth API request failed: ${response.status} ${response.statusText}\n${text}`
    );
  }

  return JSON.parse(text) as T;
}

export async function importYouTubeWatchLater() {
  const accessToken = await getValidYouTubeAccessToken();
  const videos: YouTubePlaylistVideo[] = [];
  const rawApiPages: unknown[] = [];

  let pageToken: string | undefined;

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);

    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", "WL");
    url.searchParams.set("maxResults", "50");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const json = await getJson<PlaylistItemsResponse>(url, accessToken);
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
        url: `https://www.youtube.com/watch?v=${videoId}&list=WL`,
        thumbnailUrl: bestThumbnailUrl(snippet?.thumbnails),
      });
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  const playlist: YouTubePlaylistMetadata = {
    playlistId: "WL",
    title: "YouTube Watch Later",
    description: "Authenticated YouTube Watch Later import.",
    channelId: "",
    channelTitle: "YouTube",
    publishedAt: "",
    itemCount: videos.length,
    privacyStatus: "private",
    url: "https://www.youtube.com/playlist?list=WL",
  };

  const dump: YouTubePlaylistRawDump = {
    importedAt: new Date().toISOString(),
    source: "youtube",
    playlist,
    videos,
    rawApiPages,
  };

  const items = createSavedContentItemsFromYouTubePlaylistDump({
    dump,
    sourceType: "watch-later",
    projectId: "chernobog",
  });

  const savedContent = await upsertSavedContentItems(items);

  return {
    importedAt: dump.importedAt,
    videoCount: videos.length,
    savedContent,
  };
}
