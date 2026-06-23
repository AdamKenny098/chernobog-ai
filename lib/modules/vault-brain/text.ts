export const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "have",
  "has",
  "into",
  "your",
  "you",
  "are",
  "was",
  "were",
  "will",
  "would",
  "should",
  "could",
  "about",
  "there",
  "their",
  "them",
  "then",
  "than",
  "what",
  "when",
  "where",
  "which",
  "because",
  "how",
  "why",
  "who",
  "can",
  "not",
  "but",
  "all",
  "any",
  "our",
  "out",
  "use",
  "using",
  "used",
]);

export function normalizeText(content: string) {
  return content
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9_-]{2,}/g)
        ?.filter((word) => !STOPWORDS.has(word)) ?? []
    )
  );
}

export function extractKeywords(text: string, limit = 24) {
  const counts = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g) ?? [];

  for (const word of words) {
    if (STOPWORDS.has(word)) {
      continue;
    }

    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function trimSnippet(text: string, maxLength = 700) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

export function sentenceSplit(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function countOccurrences(text: string, term: string) {
  if (!term) {
    return 0;
  }

  return text.split(term).length - 1;
}
