import fs from "node:fs/promises";
import path from "node:path";

import {
  getActiveSavedContentItems,
  updateSavedContentItemByActiveIndex,
  writeTranscript,
} from "@/lib/modules/saved-content";

function normalizePath(inputPath: string) {
  const cleaned = inputPath.trim().replace(/^[\"']|[\"']$/g, "");

  return path.isAbsolute(cleaned)
    ? cleaned
    : path.join(process.cwd(), cleaned);
}

function parseTimestampToSeconds(value: string) {
  const parts = value.replace(",", ".").split(":").map(Number);

  if (parts.some((part) => Number.isNaN(part))) {
    return undefined;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return parts[0];
}

function parseSrtOrVtt(raw: string) {
  const normalized = raw.replace(/\r/g, "");
  const blocks = normalized.split(/\n\s*\n/g);
  const segments: Array<{
    startSeconds?: number;
    durationSeconds?: number;
    text: string;
  }> = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const timeIndex = lines.findIndex((line) => line.includes("-->"));

    if (timeIndex < 0) {
      continue;
    }

    const [startRaw, endRaw] = lines[timeIndex].split("-->").map((part) => part.trim());
    const startSeconds = parseTimestampToSeconds(startRaw);
    const endSeconds = parseTimestampToSeconds(endRaw);
    const text = lines
      .slice(timeIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      continue;
    }

    segments.push({
      startSeconds,
      durationSeconds:
        typeof startSeconds === "number" && typeof endSeconds === "number"
          ? Math.max(0, endSeconds - startSeconds)
          : undefined,
      text,
    });
  }

  return segments;
}

function parsePlainText(raw: string) {
  return raw
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export async function importManualTranscriptForSavedContent(params: {
  activeIndex: number;
  transcriptPath: string;
}) {
  const activeItems = await getActiveSavedContentItems(100);
  const item = activeItems[params.activeIndex - 1];

  if (!item) {
    return null;
  }

  const absolutePath = normalizePath(params.transcriptPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const lower = absolutePath.toLowerCase();

  const segments =
    lower.endsWith(".srt") || lower.endsWith(".vtt")
      ? parseSrtOrVtt(raw)
      : parsePlainText(raw);

  const transcript = {
    version: 1 as const,
    platform: item.platform,
    externalId: item.externalId,
    sourceUrl: item.url,
    fetchedAt: new Date().toISOString(),
    status: "available" as const,
    language: "manual",
    segments,
    raw: {
      importSource: "manual-file",
      filePath: absolutePath,
    },
  };

  const paths = await writeTranscript(transcript);

  const update = await updateSavedContentItemByActiveIndex({
    activeIndex: params.activeIndex,
    transcriptStatus: "available",
    patch: {
      transcriptPath: paths.jsonPath,
      transcriptFetchedAt: transcript.fetchedAt,
      transcriptError: undefined,
    },
  });

  return {
    item,
    update,
    transcript,
    paths,
  };
}
