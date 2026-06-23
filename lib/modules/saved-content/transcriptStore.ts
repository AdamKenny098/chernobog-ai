import fs from "node:fs/promises";
import path from "node:path";

import { getQueueRoot, relativeToVault } from "./store";
import { SavedContentPlatform } from "./types";

export type SavedContentTranscriptSegment = {
  startSeconds?: number;
  durationSeconds?: number;
  text: string;
};

export type SavedContentTranscript = {
  version: 1;
  platform: SavedContentPlatform;
  externalId: string;
  sourceUrl: string;
  fetchedAt: string;
  status: "available" | "unavailable" | "failed";
  language?: string;
  segments: SavedContentTranscriptSegment[];
  raw?: unknown;
  error?: string;
};

export type SavedContentTranscriptChunk = {
  id: string;
  platform: SavedContentPlatform;
  externalId: string;
  chunkIndex: number;
  startSeconds?: number;
  endSeconds?: number;
  title?: string;
  text: string;
  tokenEstimate?: number;
};

export type SavedContentAnalysisRecord = {
  version: 1;
  platform: SavedContentPlatform;
  externalId: string;
  analyzedAt: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  relatedProjects: string[];
  possibleReasonSaved?: string;
  reasonConfidence?: number;
  reasonEvidence?: string[];
  extractedTasks: string[];
  extractedIdeas: string[];
  extractedWarnings: string[];
};

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getTranscriptJsonPath(platform: SavedContentPlatform, externalId: string) {
  return path.join(
    getQueueRoot(),
    "transcripts",
    platform,
    `${safeFileName(externalId)}.json`
  );
}

export function getTranscriptMarkdownPath(
  platform: SavedContentPlatform,
  externalId: string
) {
  return path.join(
    getQueueRoot(),
    "transcripts",
    platform,
    `${safeFileName(externalId)}.md`
  );
}

export function getTranscriptChunksJsonPath(
  platform: SavedContentPlatform,
  externalId: string
) {
  return path.join(
    getQueueRoot(),
    "chunks",
    platform,
    `${safeFileName(externalId)}.chunks.json`
  );
}

export function getTranscriptChunksMarkdownPath(
  platform: SavedContentPlatform,
  externalId: string
) {
  return path.join(
    getQueueRoot(),
    "chunks",
    platform,
    `${safeFileName(externalId)}.chunks.md`
  );
}

export function getAnalysisJsonPath(platform: SavedContentPlatform, externalId: string) {
  return path.join(
    getQueueRoot(),
    "analysis",
    platform,
    `${safeFileName(externalId)}.analysis.json`
  );
}

export function getAnalysisMarkdownPath(
  platform: SavedContentPlatform,
  externalId: string
) {
  return path.join(
    getQueueRoot(),
    "analysis",
    platform,
    `${safeFileName(externalId)}.summary.md`
  );
}

export function getCandidateMemoryJsonPath(
  platform: SavedContentPlatform,
  externalId: string
) {
  return path.join(
    getQueueRoot(),
    "candidates",
    platform,
    `${safeFileName(externalId)}.candidate-memory.json`
  );
}

function transcriptToMarkdown(transcript: SavedContentTranscript) {
  if (transcript.status !== "available") {
    return [
      `# Transcript unavailable`,
      "",
      `Platform: ${transcript.platform}`,
      `External ID: ${transcript.externalId}`,
      `Status: ${transcript.status}`,
      transcript.error ? `Error: ${transcript.error}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `# Transcript — ${transcript.externalId}`,
    "",
    `Platform: ${transcript.platform}`,
    `Fetched at: ${transcript.fetchedAt}`,
    `Language: ${transcript.language ?? "unknown"}`,
    "",
    ...transcript.segments.map((segment) => {
      const time =
        typeof segment.startSeconds === "number"
          ? `[${Math.floor(segment.startSeconds)}s] `
          : "";

      return `${time}${segment.text}`;
    }),
    "",
  ].join("\n");
}

export async function writeTranscript(transcript: SavedContentTranscript) {
  const jsonPath = getTranscriptJsonPath(transcript.platform, transcript.externalId);
  const markdownPath = getTranscriptMarkdownPath(
    transcript.platform,
    transcript.externalId
  );

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });

  await fs.writeFile(jsonPath, JSON.stringify(transcript, null, 2), "utf8");
  await fs.writeFile(markdownPath, transcriptToMarkdown(transcript), "utf8");

  return {
    jsonPath: relativeToVault(jsonPath),
    markdownPath: relativeToVault(markdownPath),
  };
}

export async function readTranscript(
  platform: SavedContentPlatform,
  externalId: string
): Promise<SavedContentTranscript | null> {
  try {
    const raw = await fs.readFile(getTranscriptJsonPath(platform, externalId), "utf8");
    return JSON.parse(raw) as SavedContentTranscript;
  } catch {
    return null;
  }
}

export function normalizeTranscriptText(transcript: SavedContentTranscript) {
  return transcript.segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function chunkTranscript(
  transcript: SavedContentTranscript,
  maxCharacters = 4500
): SavedContentTranscriptChunk[] {
  const chunks: SavedContentTranscriptChunk[] = [];

  if (transcript.status !== "available") {
    return chunks;
  }

  let currentText = "";
  let currentStart: number | undefined;
  let currentEnd: number | undefined;
  let chunkIndex = 0;

  function pushChunk() {
    const text = currentText.trim();

    if (!text) {
      return;
    }

    chunks.push({
      id: `${transcript.platform}:${transcript.externalId}:chunk-${chunkIndex + 1}`,
      platform: transcript.platform,
      externalId: transcript.externalId,
      chunkIndex: chunkIndex + 1,
      startSeconds: currentStart,
      endSeconds: currentEnd,
      title: `Chunk ${chunkIndex + 1}`,
      text,
      tokenEstimate: Math.ceil(text.length / 4),
    });

    chunkIndex += 1;
    currentText = "";
    currentStart = undefined;
    currentEnd = undefined;
  }

  for (const segment of transcript.segments) {
    const nextText = segment.text.trim();

    if (!nextText) {
      continue;
    }

    if (currentText.length + nextText.length > maxCharacters) {
      pushChunk();
    }

    if (currentStart === undefined) {
      currentStart = segment.startSeconds;
    }

    if (
      typeof segment.startSeconds === "number" &&
      typeof segment.durationSeconds === "number"
    ) {
      currentEnd = segment.startSeconds + segment.durationSeconds;
    }

    currentText += `${nextText} `;
  }

  pushChunk();

  return chunks;
}

export async function writeTranscriptChunks(
  platform: SavedContentPlatform,
  externalId: string,
  chunks: SavedContentTranscriptChunk[]
) {
  const jsonPath = getTranscriptChunksJsonPath(platform, externalId);
  const markdownPath = getTranscriptChunksMarkdownPath(platform, externalId);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });

  const markdown = [
    `# Transcript Chunks — ${externalId}`,
    "",
    ...chunks.map((chunk) => {
      return [
        `## ${chunk.title ?? `Chunk ${chunk.chunkIndex}`}`,
        "",
        chunk.startSeconds !== undefined
          ? `Start: ${Math.floor(chunk.startSeconds)}s`
          : "",
        chunk.endSeconds !== undefined ? `End: ${Math.floor(chunk.endSeconds)}s` : "",
        "",
        chunk.text,
        "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n");

  await fs.writeFile(jsonPath, JSON.stringify(chunks, null, 2), "utf8");
  await fs.writeFile(markdownPath, markdown, "utf8");

  return {
    jsonPath: relativeToVault(jsonPath),
    markdownPath: relativeToVault(markdownPath),
  };
}

export async function readTranscriptChunks(
  platform: SavedContentPlatform,
  externalId: string
): Promise<SavedContentTranscriptChunk[]> {
  try {
    const raw = await fs.readFile(getTranscriptChunksJsonPath(platform, externalId), "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as SavedContentTranscriptChunk[]) : [];
  } catch {
    return [];
  }
}

export async function writeAnalysisRecord(record: SavedContentAnalysisRecord) {
  const jsonPath = getAnalysisJsonPath(record.platform, record.externalId);
  const markdownPath = getAnalysisMarkdownPath(record.platform, record.externalId);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });

  const markdown = [
    `# Saved Content Analysis — ${record.externalId}`,
    "",
    `Analyzed at: ${record.analyzedAt}`,
    "",
    "## Summary",
    "",
    record.summary,
    "",
    "## Key Points",
    "",
    ...record.keyPoints.map((point) => `- ${point}`),
    "",
    "## Topics",
    "",
    record.topics.length ? record.topics.map((topic) => `- ${topic}`).join("\n") : "_None_",
    "",
    "## Related Projects",
    "",
    record.relatedProjects.length
      ? record.relatedProjects.map((project) => `- ${project}`).join("\n")
      : "_None_",
    "",
    "## Possible Reason Saved",
    "",
    record.possibleReasonSaved
      ? `${record.possibleReasonSaved}\n\nConfidence: ${record.reasonConfidence ?? 0}%`
      : "_Not inferred_",
    "",
    "## Extracted Tasks",
    "",
    record.extractedTasks.length
      ? record.extractedTasks.map((task) => `- ${task}`).join("\n")
      : "_None_",
    "",
    "## Extracted Ideas",
    "",
    record.extractedIdeas.length
      ? record.extractedIdeas.map((idea) => `- ${idea}`).join("\n")
      : "_None_",
    "",
  ].join("\n");

  await fs.writeFile(jsonPath, JSON.stringify(record, null, 2), "utf8");
  await fs.writeFile(markdownPath, markdown, "utf8");

  return {
    jsonPath: relativeToVault(jsonPath),
    markdownPath: relativeToVault(markdownPath),
  };
}

export async function writeCandidateMemoryRecord(params: {
  platform: SavedContentPlatform;
  externalId: string;
  tasks: string[];
  ideas: string[];
  warnings?: string[];
}) {
  const jsonPath = getCandidateMemoryJsonPath(params.platform, params.externalId);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });

  const payload = {
    version: 1,
    status: "candidate",
    source: "saved-content",
    platform: params.platform,
    externalId: params.externalId,
    createdAt: new Date().toISOString(),
    tasks: params.tasks,
    ideas: params.ideas,
    warnings: params.warnings ?? [],
  };

  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  return {
    jsonPath: relativeToVault(jsonPath),
  };
}
