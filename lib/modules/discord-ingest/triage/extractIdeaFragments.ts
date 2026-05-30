import type {
    DiscordIdeaFragment,
    NormalizedDiscordMessage,
  } from "../types";
  
  const MAX_FRAGMENTS_PER_MESSAGE = 150;
  
  const DISCORD_EXPORT_LINE_PATTERNS = [
    /^.+\s+—\s+(?:today|yesterday|\d{1,2}\/\d{1,2}\/\d{4})\s+/i,
    /^\[\d{1,2}:\d{2}\s*(?:am|pm)?\]/i,
  ];
  
  const CATEGORY_HEADING_PATTERNS = [
    /^[A-Za-z /&+-]+Tools$/i,
    /^[A-Za-z /&+-]+Tooling$/i,
    /^[A-Za-z /&+-]+Ideas$/i,
  ];
  
  function normalizeFragment(value: string): string {
    return value
      .replace(/^\s*[-*•]\s+/, "")
      .replace(/^\s*\d+[.)]\s+/, "")
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function isDiscordExportLine(value: string): boolean {
    return DISCORD_EXPORT_LINE_PATTERNS.some((pattern) => pattern.test(value));
  }
  
  function isLowValueConnectorLine(value: string): boolean {
    const cleaned = value.trim();
  
    if (!cleaned) {
      return true;
    }
  
    if (/^these are\b/i.test(cleaned)) {
      return true;
    }
  
    if (/^this is\b/i.test(cleaned)) {
      return true;
    }
  
    if (/^the strongest\b/i.test(cleaned)) {
      return true;
    }
  
    if (/^more visual\b/i.test(cleaned)) {
      return true;
    }
  
    return false;
  }
  
  function shouldKeepHeadingAsFragment(value: string): boolean {
    return CATEGORY_HEADING_PATTERNS.some((pattern) => pattern.test(value.trim()));
  }
  
  function splitLineOnSeparators(line: string): string[] {
    const normalized = normalizeFragment(line);
  
    if (!normalized) {
      return [];
    }
  
    if (normalized.includes(" | ")) {
      return normalized.split(" | ").map(normalizeFragment);
    }
  
    if (normalized.includes(" • ")) {
      return normalized.split(" • ").map(normalizeFragment);
    }
  
    if (normalized.includes(" ; ")) {
      return normalized.split(" ; ").map(normalizeFragment);
    }
  
    return [normalized];
  }
  
  function splitContentIntoRawFragments(content: string): string[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  
    if (lines.length <= 1) {
      return splitLineOnSeparators(content);
    }
  
    const fragments: string[] = [];
  
    for (const line of lines) {
      if (isDiscordExportLine(line)) {
        continue;
      }
  
      if (isLowValueConnectorLine(line)) {
        continue;
      }
  
      const normalized = normalizeFragment(line);
  
      if (!normalized) {
        continue;
      }
  
      if (shouldKeepHeadingAsFragment(normalized)) {
        fragments.push(normalized);
        continue;
      }
  
      fragments.push(...splitLineOnSeparators(normalized));
    }
  
    return fragments;
  }
  
  function dedupeFragments(fragments: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];
  
    for (const fragment of fragments) {
      const normalized = normalizeFragment(fragment);
      const key = normalized.toLowerCase();
  
      if (!normalized || seen.has(key)) {
        continue;
      }
  
      seen.add(key);
      deduped.push(normalized);
    }
  
    return deduped;
  }
  
  export function extractIdeaFragments(
    message: NormalizedDiscordMessage
  ): DiscordIdeaFragment[] {
    const rawFragments = dedupeFragments(
      splitContentIntoRawFragments(message.content)
    ).slice(0, MAX_FRAGMENTS_PER_MESSAGE);
  
    const fallbackFragments =
      rawFragments.length > 0 ? rawFragments : [message.content.trim()];
  
    const wasSplitFromMultiIdeaMessage = fallbackFragments.length > 1;
  
    return fallbackFragments.map((fragmentContent, index) => ({
      id: `${message.id}:${index + 1}`,
      sourceMessageId: message.id,
      fragmentIndex: index + 1,
      content: fragmentContent,
      sourceContent: message.content,
      wasSplitFromMultiIdeaMessage,
    }));
  }