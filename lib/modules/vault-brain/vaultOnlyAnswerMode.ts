import { createVaultMemoryStore } from "./memoryStore";
import type { VaultMemoryEntry, VaultMemoryType } from "./memoryTypes";
import { resolveProjectMemoryScope } from "./projectMemoryScope";

export type VaultOnlyAnswerSource = {
  id: string;
  title: string;
  memoryType: VaultMemoryType;
  projectId?: string;
  version?: string;
  confidence: number;
  relevanceScore: number;
  excerpt: string;
};

export type VaultOnlyAnswerPolicy = {
  mode: "vault-only";
  approvedOnly: true;
  allowCandidateMemory: false;
  allowRawMemory: false;
  allowOutsideModelMemory: false;
  strictVersion: boolean;
};

export type VaultOnlyAnswerRequest = {
  query: string;
  projectId?: string;
  version?: string;
  memoryTypes?: readonly VaultMemoryType[];
  tags?: readonly string[];
  limit?: number;
  strictVersion?: boolean;
};

export type VaultOnlyAnswerResult = {
  ok: boolean;
  query: string;
  answer: string;
  projectId?: string;
  version?: string;
  usedEntryIds: string[];
  sources: VaultOnlyAnswerSource[];
  warnings: string[];
  policy: VaultOnlyAnswerPolicy;
};

const STOP_WORDS = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "next",
  "of",
  "on",
  "or",
  "our",
  "should",
  "show",
  "tell",
  "that",
  "the",
  "this",
  "to",
  "vault",
  "we",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
]);

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.min(20, Math.floor(value)));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(body: string, maxLength = 520): string {
  const clean = compact(body);
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function entryHaystack(entry: VaultMemoryEntry): string {
  return [
    entry.id,
    entry.title,
    entry.body,
    entry.memoryType,
    entry.projectId ?? "",
    entry.version ?? "",
    ...entry.tags,
    entry.sourceRef?.path ?? "",
    entry.sourceRef?.url ?? "",
    entry.sourceRef?.commitHash ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function scoreEntry(entry: VaultMemoryEntry, queryTokens: readonly string[]): number {
  const haystack = entryHaystack(entry);
  const title = entry.title.toLowerCase();
  const body = entry.body.toLowerCase();
  const tags = entry.tags.join(" ").toLowerCase();

  if (queryTokens.length === 0) {
    return 0.25 + entry.confidence * 0.5;
  }

  let score = 0;
  let matched = false;
  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 3;
      matched = true;
    }

    if (tags.includes(token)) {
      score += 2;
      matched = true;
    }

    if (body.includes(token)) {
      score += 1;
      matched = true;
    }

    if (haystack.includes(token)) {
      score += 0.25;
      matched = true;
    }
  }

  if (!matched) {
    return 0;
  }

  score += entry.confidence * 0.5;

  if (entry.memoryType === "project-state") {
    score += 0.5;
  }

  if (entry.memoryType === "decision" || entry.memoryType === "roadmap") {
    score += 0.25;
  }

  return Number(score.toFixed(4));
}

function toSource(entry: VaultMemoryEntry, relevanceScore: number): VaultOnlyAnswerSource {
  return {
    id: entry.id,
    title: entry.title,
    memoryType: entry.memoryType,
    projectId: entry.projectId,
    version: entry.version,
    confidence: entry.confidence,
    relevanceScore,
    excerpt: excerpt(entry.body),
  };
}

function formatAnswer(args: {
  query: string;
  sources: VaultOnlyAnswerSource[];
  projectId?: string;
  version?: string;
  warnings: readonly string[];
}): string {
  if (args.sources.length === 0) {
    return [
      "I do not have enough approved structured vault memory to answer that safely.",
      "",
      "Vault-only answer mode does not use raw, candidate, rejected, stale, superseded, or outside model memory as truth.",
    ].join("\n");
  }

  const scope = [
    args.projectId ? `Project: ${args.projectId}` : undefined,
    args.version ? `Version: ${args.version}` : undefined,
  ]
    .filter((line): line is string => typeof line === "string")
    .join(" | ");

  const sourceLines = args.sources.flatMap((source, index) => [
    `${index + 1}. ${source.title}`,
    `   Type: ${source.memoryType}`,
    source.projectId ? `   Project: ${source.projectId}` : undefined,
    source.version ? `   Version: ${source.version}` : undefined,
    `   Confidence: ${source.confidence}`,
    `   ${source.excerpt}`,
  ]).filter((line): line is string => typeof line === "string");

  return [
    `Vault-only answer for: ${args.query}`,
    scope ? scope : undefined,
    "",
    "This answer is based only on approved structured vault memory.",
    "",
    "Relevant approved memory:",
    ...sourceLines,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

async function loadApprovedEntries(args: {
  projectId?: string;
  version?: string;
  memoryTypes?: readonly VaultMemoryType[];
  tags?: readonly string[];
  strictVersion: boolean;
}): Promise<{ entries: VaultMemoryEntry[]; warnings: string[] }> {
  const store = createVaultMemoryStore();
  const warnings: string[] = [];
  const baseFilter = {
    statuses: ["approved" as const],
    projectId: args.projectId,
    memoryTypes: args.memoryTypes ? [...args.memoryTypes] : undefined,
    tags: args.tags ? [...args.tags] : undefined,
  };

  const scoped = await store.listEntries({
    ...baseFilter,
    version: args.version,
  });

  if (!args.version || args.strictVersion || scoped.length > 0) {
    return { entries: scoped, warnings };
  }

  const projectLevel = await store.listEntries(baseFilter);
  const fallback = projectLevel.filter((entry) => !entry.version);

  if (fallback.length > 0) {
    warnings.push(
      `No approved memory matched version ${args.version}; using approved project-level memory without a version.`
    );
  }

  return { entries: fallback, warnings };
}

export function getVaultOnlyAnswerPolicy(input: { strictVersion?: boolean } = {}): VaultOnlyAnswerPolicy {
  return {
    mode: "vault-only",
    approvedOnly: true,
    allowCandidateMemory: false,
    allowRawMemory: false,
    allowOutsideModelMemory: false,
    strictVersion: Boolean(input.strictVersion),
  };
}

export async function answerVaultOnlyQuestion(
  request: VaultOnlyAnswerRequest
): Promise<VaultOnlyAnswerResult> {
  const query = request.query.trim();
  if (!query) {
    throw new Error("Vault-only answer mode requires a non-empty query.");
  }

  const scope = await resolveProjectMemoryScope({
    query,
    projectId: request.projectId,
    version: request.version,
  });
  const policy = getVaultOnlyAnswerPolicy({ strictVersion: request.strictVersion });
  const loaded = await loadApprovedEntries({
    projectId: scope.projectId,
    version: scope.version,
    memoryTypes: request.memoryTypes,
    tags: request.tags,
    strictVersion: policy.strictVersion,
  });
  const queryTokens = tokenize(query);
  const scored = loaded.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTokens) }))
    .filter((item) => queryTokens.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.updatedAt.localeCompare(a.entry.updatedAt));

  const selected = scored.slice(0, normalizeLimit(request.limit));
  const sources = selected.map((item) => toSource(item.entry, item.score));
  const warnings = [...scope.warnings, ...loaded.warnings];

  if (sources.length === 0) {
    warnings.push("No approved structured memory entries matched the vault-only answer request.");
  }

  return {
    ok: sources.length > 0,
    query,
    answer: formatAnswer({
      query,
      sources,
      projectId: scope.projectId,
      version: scope.version,
      warnings,
    }),
    projectId: scope.projectId,
    version: scope.version,
    usedEntryIds: sources.map((source) => source.id),
    sources,
    warnings,
    policy,
  };
}

export function formatVaultOnlyAnswerResult(result: VaultOnlyAnswerResult): string {
  const warningBlock = result.warnings.length > 0
    ? ["", "Warnings:", ...result.warnings.map((warning) => `- ${warning}`)].join("\n")
    : "";

  const sourceBlock = result.sources.length > 0
    ? [
        "",
        "Source entry IDs:",
        ...result.sources.map((source) => `- ${source.id}`),
      ].join("\n")
    : "";

  return `${result.answer}${warningBlock}${sourceBlock}`;
}
