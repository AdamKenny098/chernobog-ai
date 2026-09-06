const DEFAULT_MAX_SPOKEN_CHARS = 520;
const MIN_SENTENCE_CUT = 180;

function removeCodeBlocks(value: string): {
  text: string;
  removedCode: boolean;
} {
  let removedCode = false;
  const text = value.replace(
    /```[\s\S]*?```/g,
    () => {
      removedCode = true;
      return " ";
    },
  );

  return { text, removedCode };
}

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "the link on screen")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/`([^`]+)`/g, "$1");
}

function removeMarkdownTables(value: string): {
  text: string;
  removedTable: boolean;
} {
  let removedTable = false;
  const kept = value
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      const looksLikeTable =
        trimmed.startsWith("|") &&
        trimmed.endsWith("|") &&
        (trimmed.match(/\|/g)?.length ?? 0) >= 3;

      if (looksLikeTable) {
        removedTable = true;
        return false;
      }

      return true;
    });

  return {
    text: kept.join("\n"),
    removedTable,
  };
}

function collapseForSpeech(value: string): string {
  return value
    .replace(/\r?\n+/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\.\s*([,;:])/g, "$1")
    .trim();
}

function cutAtNaturalBoundary(
  value: string,
  maxChars: number,
): string {
  if (value.length <= maxChars) {
    return value;
  }

  const window = value.slice(0, maxChars);
  const sentenceMatches = [
    ...window.matchAll(/[.!?](?=\s|$)/g),
  ];
  const validBoundaries = sentenceMatches
    .map((match) => match.index ?? -1)
    .filter((index) => index >= MIN_SENTENCE_CUT);
  const sentenceBoundary =
    validBoundaries.length > 0
      ? validBoundaries[validBoundaries.length - 1]
      : -1;

  if (sentenceBoundary >= MIN_SENTENCE_CUT) {
    return window.slice(0, sentenceBoundary + 1).trim();
  }

  const wordBoundary = window.lastIndexOf(" ");
  return window
    .slice(0, wordBoundary > 0 ? wordBoundary : maxChars)
    .trim();
}

export function buildSpokenReply(
  reply: string,
  maxChars = DEFAULT_MAX_SPOKEN_CHARS,
): string {
  const source = reply.trim();
  if (!source) {
    return "No response returned.";
  }

  const codeResult = removeCodeBlocks(source);
  const tableResult = removeMarkdownTables(codeResult.text);
  const cleaned = collapseForSpeech(
    stripMarkdown(tableResult.text),
  );

  const fallback = cleaned || "The result is on screen.";
  const truncated = fallback.length > maxChars;
  let spoken = cutAtNaturalBoundary(
    fallback,
    maxChars,
  );

  const omittedVisualMaterial =
    codeResult.removedCode ||
    tableResult.removedTable ||
    truncated;

  if (omittedVisualMaterial) {
    const suffix = "The full result is on screen.";
    if (!spoken.toLowerCase().includes(suffix.toLowerCase())) {
      spoken = `${spoken} ${suffix}`.trim();
    }
  }

  return spoken;
}
