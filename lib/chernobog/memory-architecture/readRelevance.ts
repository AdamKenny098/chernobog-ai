import type {
  UnifiedMemoryRecord,
} from "./unifiedTypes";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "what",
  "when",
  "where",
  "which",
  "about",
  "into",
  "your",
  "you",
  "are",
  "was",
  "were",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token));
}

export function scoreUnifiedMemoryRecord(
  record: UnifiedMemoryRecord,
  query: string,
): number {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = [
    record.content,
    record.key ?? "",
    record.projectId ?? "",
    record.source,
    record.layer,
    record.scope,
    JSON.stringify(record.metadata ?? {}),
  ]
    .join("\n")
    .toLowerCase();

  const memoryTokens = new Set(tokenize(haystack));
  let score = 0;

  for (const token of queryTokens) {
    if (memoryTokens.has(token)) {
      score += 2;
    }

    for (const memoryToken of memoryTokens) {
      if (
        memoryToken.includes(token) ||
        token.includes(memoryToken)
      ) {
        score += 0.5;
      }
    }
  }

  return score;
}

export function selectRelevantUnifiedMemories(
  records: UnifiedMemoryRecord[],
  query: string,
  limit: number,
): UnifiedMemoryRecord[] {
  const boundedLimit = Math.max(
    1,
    Math.min(100, Math.trunc(limit)),
  );

  if (!query.trim()) {
    return records
      .slice(0, boundedLimit)
      .map((record) => structuredClone(record));
  }

  const scored = records
    .map((record) => ({
      record,
      score: scoreUnifiedMemoryRecord(record, query),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.record.id.localeCompare(b.record.id),
    );

  const relevant = scored.filter((item) => item.score > 0);
  const selected =
    relevant.length > 0
      ? relevant
      : scored.slice(
          0,
          Math.min(3, boundedLimit),
        );

  return selected
    .slice(0, boundedLimit)
    .map((item) => structuredClone(item.record));
}
