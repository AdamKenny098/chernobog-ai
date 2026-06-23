import {
  SavedContentAnalysisRecord,
  SavedContentTranscriptChunk,
} from "./transcriptStore";
import { SavedContentItem } from "./types";

const PROJECT_RULES: Array<{ project: string; keywords: string[] }> = [
  {
    project: "chernobog",
    keywords: ["ai", "llm", "rag", "vault", "memory", "agent", "assistant", "oauth"],
  },
  {
    project: "polar-night",
    keywords: ["unity", "horror", "survival", "lighting", "level design", "npc", "navmesh"],
  },
  {
    project: "siriocraft",
    keywords: ["minecraft", "create mod", "server", "modpack", "smp", "forge", "neoforge"],
  },
  {
    project: "098-forge",
    keywords: ["portfolio", "website", "indie", "studio", "brand"],
  },
  {
    project: "homelab",
    keywords: ["server", "docker", "linux", "tailscale", "portainer", "backup", "self host"],
  },
];

const TOPIC_KEYWORDS = [
  "unity",
  "unreal",
  "ai",
  "llm",
  "rag",
  "memory",
  "agent",
  "minecraft",
  "create mod",
  "server",
  "docker",
  "linux",
  "homelab",
  "horror",
  "lighting",
  "level design",
  "blender",
  "animation",
  "oauth",
  "api",
  "typescript",
  "next.js",
  "database",
  "obsidian",
  "vault",
  "productivity",
  "game design",
];

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sourceText(item: SavedContentItem, chunks: SavedContentTranscriptChunk[]) {
  const chunkText = chunks.map((chunk) => chunk.text).join("\n");
  return [item.title, item.description ?? "", chunkText].join("\n").toLowerCase();
}

export function extractTopics(item: SavedContentItem, chunks: SavedContentTranscriptChunk[]) {
  const text = sourceText(item, chunks);

  return TOPIC_KEYWORDS.filter((keyword) => text.includes(keyword.toLowerCase()));
}

export function extractRelatedProjects(
  item: SavedContentItem,
  chunks: SavedContentTranscriptChunk[]
) {
  const text = sourceText(item, chunks);
  const projects = [...item.relatedProjects];

  for (const rule of PROJECT_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      projects.push(rule.project);
    }
  }

  return unique(projects);
}

export function summarizeContent(
  item: SavedContentItem,
  chunks: SavedContentTranscriptChunk[]
) {
  const transcriptText = chunks.map((chunk) => chunk.text).join(" ");
  const sentences = splitSentences(transcriptText);
  const basis = sentences.length > 0 ? sentences : splitSentences(item.description ?? "");

  const keyPoints = basis.slice(0, 5).map((sentence) => {
    return sentence.length > 220 ? `${sentence.slice(0, 217)}...` : sentence;
  });

  const summary =
    keyPoints.length > 0
      ? keyPoints.slice(0, 3).join(" ")
      : `Saved content item titled "${item.title}" from ${item.creator ?? "unknown creator"}. No transcript-derived summary is available yet.`;

  return {
    summary,
    keyPoints,
  };
}

export function inferPossibleReasonSaved(params: {
  item: SavedContentItem;
  topics: string[];
  relatedProjects: string[];
}) {
  const { item, topics, relatedProjects } = params;

  if (item.confirmedReasonSaved) {
    return {
      possibleReasonSaved: item.confirmedReasonSaved,
      reasonConfidence: 100,
      reasonEvidence: ["User-confirmed reason."],
    };
  }

  if (relatedProjects.length > 0 && topics.length > 0) {
    return {
      possibleReasonSaved: `This appears related to ${relatedProjects[0]} because it touches on ${topics.slice(0, 3).join(", ")}.`,
      reasonConfidence: 74,
      reasonEvidence: [
        `Related project match: ${relatedProjects[0]}`,
        `Topic matches: ${topics.slice(0, 5).join(", ")}`,
      ],
    };
  }

  if (topics.length > 0) {
    return {
      possibleReasonSaved: `This appears to have been saved because it covers ${topics.slice(0, 3).join(", ")}.`,
      reasonConfidence: 58,
      reasonEvidence: [`Topic matches: ${topics.slice(0, 5).join(", ")}`],
    };
  }

  return {
    possibleReasonSaved:
      "The reason saved is unclear from the title, description, and available transcript data.",
    reasonConfidence: 20,
    reasonEvidence: ["Insufficient topic/project evidence."],
  };
}

export function extractCandidateTasksAndIdeas(
  item: SavedContentItem,
  chunks: SavedContentTranscriptChunk[]
) {
  const text = chunks.length
    ? chunks.map((chunk) => chunk.text).join(" ")
    : [item.title, item.description ?? ""].join(" ");

  const sentences = splitSentences(text);

  const taskIndicators = [
    "need to",
    "should",
    "must",
    "create",
    "add",
    "build",
    "fix",
    "set up",
    "configure",
    "implement",
    "test",
    "review",
  ];

  const ideaIndicators = [
    "idea",
    "could",
    "concept",
    "approach",
    "strategy",
    "system",
    "design",
    "workflow",
    "pipeline",
  ];

  const tasks = sentences
    .filter((sentence) =>
      taskIndicators.some((indicator) =>
        sentence.toLowerCase().includes(indicator)
      )
    )
    .slice(0, 12)
    .map((sentence) => sentence.length > 220 ? `${sentence.slice(0, 217)}...` : sentence);

  const ideas = sentences
    .filter((sentence) =>
      ideaIndicators.some((indicator) =>
        sentence.toLowerCase().includes(indicator)
      )
    )
    .slice(0, 12)
    .map((sentence) => sentence.length > 220 ? `${sentence.slice(0, 217)}...` : sentence);

  return {
    tasks: unique(tasks),
    ideas: unique(ideas),
    warnings: [] as string[],
  };
}

export function buildAnalysisRecord(params: {
  item: SavedContentItem;
  chunks: SavedContentTranscriptChunk[];
}): SavedContentAnalysisRecord {
  const topics = extractTopics(params.item, params.chunks);
  const relatedProjects = extractRelatedProjects(params.item, params.chunks);
  const { summary, keyPoints } = summarizeContent(params.item, params.chunks);
  const reason = inferPossibleReasonSaved({
    item: params.item,
    topics,
    relatedProjects,
  });
  const candidates = extractCandidateTasksAndIdeas(params.item, params.chunks);

  return {
    version: 1,
    platform: params.item.platform,
    externalId: params.item.externalId,
    analyzedAt: new Date().toISOString(),
    summary,
    keyPoints,
    topics,
    relatedProjects,
    possibleReasonSaved: reason.possibleReasonSaved,
    reasonConfidence: reason.reasonConfidence,
    reasonEvidence: reason.reasonEvidence,
    extractedTasks: candidates.tasks,
    extractedIdeas: candidates.ideas,
    extractedWarnings: candidates.warnings,
  };
}
