import {
  readSavedContentStore,
} from "@/lib/modules/saved-content";

import {
  readThumbnailStore,
  upsertThumbnailRecords,
} from "./thumbnailStore";
import {
  SavedContentThumbnailRecord,
} from "./types";

function normalizeExternalId(externalId?: string) {
  if (!externalId) {
    return "";
  }

  return externalId
    .replace(/^youtube:/i, "")
    .replace(/^tiktok:/i, "")
    .trim();
}

function extractYouTubeVideoId(url: string, externalId?: string) {
  const normalizedExternalId = normalizeExternalId(externalId);

  if (
    normalizedExternalId &&
    !normalizedExternalId.startsWith("url-hash:") &&
    /^[a-zA-Z0-9_-]{6,}$/.test(normalizedExternalId)
  ) {
    return normalizedExternalId;
  }

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

    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function youtubeThumbnailUrls(videoId: string) {
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
    `https://i.ytimg.com/vi_webp/${videoId}/maxresdefault.webp`,
    `https://i.ytimg.com/vi_webp/${videoId}/sddefault.webp`,
    `https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp`,
  ];
}

function youtubeThumbnailRecord(item: Record<string, unknown>): SavedContentThumbnailRecord {
  const itemId = String(item.id ?? "");
  const externalId = normalizeExternalId(String(item.externalId ?? ""));
  const url = String(item.url ?? "");
  const videoId = extractYouTubeVideoId(url, externalId);
  const fetchedAt = new Date().toISOString();

  if (!videoId) {
    return {
      itemId,
      platform: "youtube",
      externalId,
      url,
      status: "failed",
      source: "fallback",
      fetchedAt,
      error: "Could not extract YouTube video ID.",
    };
  }

  const urls = youtubeThumbnailUrls(videoId);

  return {
    itemId,
    platform: "youtube",
    externalId: videoId,
    url,
    thumbnailUrl: urls[0],
    fallbackUrl: urls[2],
    thumbnailUrls: urls,
    status: "derived",
    source: "youtube-derived",
    fetchedAt,
  };
}

function extractMetaImage(html: string) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/&amp;/g, "&");
    }
  }

  return null;
}

async function tryTikTokOEmbed(url: string) {
  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; ChernobogSavedContentBot/1.0; +local)",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      thumbnail_url?: unknown;
      title?: unknown;
      author_name?: unknown;
    };

    return typeof payload.thumbnail_url === "string"
      ? payload.thumbnail_url
      : null;
  } catch {
    return null;
  }
}

async function tryOpenGraphImage(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ChernobogSavedContentBot/1.0; +local)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return extractMetaImage(html);
  } catch {
    return null;
  }
}

async function tiktokThumbnailRecord(item: Record<string, unknown>): Promise<SavedContentThumbnailRecord> {
  const itemId = String(item.id ?? "");
  const externalId = normalizeExternalId(String(item.externalId ?? ""));
  const url = String(item.url ?? "");
  const fetchedAt = new Date().toISOString();

  const oembedImage = await tryTikTokOEmbed(url);

  if (oembedImage) {
    return {
      itemId,
      platform: "tiktok",
      externalId,
      url,
      thumbnailUrl: oembedImage,
      fallbackUrl: oembedImage,
      thumbnailUrls: [oembedImage],
      status: "scraped",
      source: "tiktok-oembed",
      fetchedAt,
    };
  }

  const ogImage = await tryOpenGraphImage(url);

  if (ogImage) {
    return {
      itemId,
      platform: "tiktok",
      externalId,
      url,
      thumbnailUrl: ogImage,
      fallbackUrl: ogImage,
      thumbnailUrls: [ogImage],
      status: "scraped",
      source: "opengraph",
      fetchedAt,
    };
  }

  return {
    itemId,
    platform: "tiktok",
    externalId,
    url,
    status: "unavailable",
    source: "fallback",
    fetchedAt,
    error: "No TikTok oEmbed or OpenGraph thumbnail could be resolved.",
  };
}

export async function refreshSavedContentThumbnails(
  limit = 100,
  options: {
    force?: boolean;
  } = {}
) {
  const force = options.force ?? true;
  const store = await readSavedContentStore();
  const thumbnailStore = await readThumbnailStore();

  const items = ((store.items ?? []) as Array<Record<string, unknown>>)
    .filter((item) => {
      if (force) {
        return true;
      }

      const itemId = String(item.id ?? "");
      const existing = thumbnailStore.thumbnails[itemId];

      return (
        !existing ||
        existing.status === "failed" ||
        existing.status === "unavailable" ||
        !existing.thumbnailUrl
      );
    })
    .slice(0, Math.max(1, Math.min(300, limit)));

  const records: SavedContentThumbnailRecord[] = [];

  for (const item of items) {
    const platform = String(item.platform ?? "");
    const url = String(item.url ?? "");

    if (!url) {
      continue;
    }

    if (platform === "youtube") {
      records.push(youtubeThumbnailRecord(item));
      continue;
    }

    if (platform === "tiktok") {
      records.push(await tiktokThumbnailRecord(item));
    }
  }

  const result = await upsertThumbnailRecords(records);

  return {
    scanned: items.length,
    updated: result.updated,
    total: result.total,
    available: records.filter((record) => record.thumbnailUrl).length,
    failed: records.filter((record) => record.status === "failed").length,
    unavailable: records.filter((record) => record.status === "unavailable").length,
  };
}
