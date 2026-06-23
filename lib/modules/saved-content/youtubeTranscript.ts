import { SavedContentTranscript } from "./transcriptStore";

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\\u0026/g, "&");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function parseXmlTranscript(xml: string) {
  const segments: SavedContentTranscript["segments"] = [];
  const regex = /<text[^>]*start="([^"]*)"[^>]*(?:dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml))) {
    segments.push({
      startSeconds: Number(match[1]),
      durationSeconds: match[2] ? Number(match[2]) : undefined,
      text: decodeHtml(stripTags(match[3])).replace(/\s+/g, " ").trim(),
    });
  }

  return segments.filter((segment) => segment.text);
}

function parseJson3Transcript(raw: unknown) {
  const segments: SavedContentTranscript["segments"] = [];

  const data = raw as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };

  for (const event of data.events ?? []) {
    const text = (event.segs ?? [])
      .map((seg) => seg.utf8 ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      continue;
    }

    segments.push({
      startSeconds:
        typeof event.tStartMs === "number" ? event.tStartMs / 1000 : undefined,
      durationSeconds:
        typeof event.dDurationMs === "number"
          ? event.dDurationMs / 1000
          : undefined,
      text,
    });
  }

  return segments;
}

function extractCaptionTracks(html: string) {
  const match = html.match(/"captionTracks":(\[.*?\])(?=,"audioTracks"|,"translationLanguages"|})/s);

  if (!match?.[1]) {
    return [];
  }

  try {
    return JSON.parse(match[1]) as Array<{
      baseUrl: string;
      name?: { simpleText?: string; runs?: Array<{ text?: string }> };
      languageCode?: string;
      kind?: string;
    }>;
  } catch {
    return [];
  }
}

function captionName(track: {
  name?: { simpleText?: string; runs?: Array<{ text?: string }> };
}) {
  return (
    track.name?.simpleText ??
    track.name?.runs?.map((run) => run.text ?? "").join("") ??
    "unknown"
  );
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ChernobogSavedContentQueue/1.0)",
    },
    cache: "no-store",
  });

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

export async function fetchYouTubeTranscript(
  videoId: string,
  sourceUrl: string
): Promise<SavedContentTranscript> {
  const fetchedAt = new Date().toISOString();

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const watch = await fetchText(watchUrl);

    if (!watch.ok) {
      return {
        version: 1,
        platform: "youtube",
        externalId: videoId,
        sourceUrl,
        fetchedAt,
        status: "failed",
        segments: [],
        error: `Failed to load YouTube watch page: ${watch.status}`,
      };
    }

    const tracks = extractCaptionTracks(watch.text);

    if (tracks.length === 0) {
      return {
        version: 1,
        platform: "youtube",
        externalId: videoId,
        sourceUrl,
        fetchedAt,
        status: "unavailable",
        segments: [],
        error: "No public caption tracks were found for this video.",
      };
    }

    const preferred =
      tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en")) ??
      tracks[0];

    const baseUrl = decodeHtml(preferred.baseUrl);
    const transcriptUrl = baseUrl.includes("fmt=")
      ? baseUrl
      : `${baseUrl}&fmt=json3`;

    const transcriptResponse = await fetchText(transcriptUrl);

    if (!transcriptResponse.ok) {
      return {
        version: 1,
        platform: "youtube",
        externalId: videoId,
        sourceUrl,
        fetchedAt,
        status: "failed",
        language: preferred.languageCode,
        segments: [],
        error: `Failed to fetch caption track: ${transcriptResponse.status}`,
      };
    }

    let segments: SavedContentTranscript["segments"] = [];

    try {
      segments = parseJson3Transcript(JSON.parse(transcriptResponse.text));
    } catch {
      segments = parseXmlTranscript(transcriptResponse.text);
    }

    if (segments.length === 0) {
      return {
        version: 1,
        platform: "youtube",
        externalId: videoId,
        sourceUrl,
        fetchedAt,
        status: "unavailable",
        language: preferred.languageCode,
        segments: [],
        error: "Caption track was found, but no transcript text could be parsed.",
      };
    }

    return {
      version: 1,
      platform: "youtube",
      externalId: videoId,
      sourceUrl,
      fetchedAt,
      status: "available",
      language: preferred.languageCode ?? captionName(preferred),
      segments,
      raw: {
        captionTrackName: captionName(preferred),
        captionTrackKind: preferred.kind,
      },
    };
  } catch (error) {
    return {
      version: 1,
      platform: "youtube",
      externalId: videoId,
      sourceUrl,
      fetchedAt,
      status: "failed",
      segments: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
