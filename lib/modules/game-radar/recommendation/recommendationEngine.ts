import {
  GameRadarCatalogEntry,
  GameRadarRecommendationBuildInput,
  GameRadarRecommendationItem,
  GameRadarRecommendationReason,
  GameRadarRecommendationSnapshot,
} from "./types";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeToken(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

function parseCsvTokens(value: string): string[] {
  return value
    .split(",")
    .map(normalizeToken)
    .filter(Boolean);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstString(entry: GameRadarCatalogEntry, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asString(entry[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function firstStringArray(entry: GameRadarCatalogEntry, keys: string[]): string[] {
  for (const key of keys) {
    const value = asStringArray(entry[key]);
    if (value.length > 0) {
      return value;
    }
  }

  return [];
}

function getEntryId(entry: GameRadarCatalogEntry, index: number): string {
  const directId = firstString(entry, ["id", "slug", "gameId"]);
  if (directId) {
    return directId;
  }

  const title = getEntryTitle(entry, index);
  return `${normalizeToken(title)}-${index + 1}`;
}

function getEntryTitle(entry: GameRadarCatalogEntry, index: number): string {
  return firstString(entry, ["title", "name", "gameTitle"]) ?? `Untitled Game ${index + 1}`;
}

function getEntryUrl(entry: GameRadarCatalogEntry): string {
  return firstString(entry, ["url", "href", "link", "gameUrl"]) ?? "";
}

function getEntryCreator(entry: GameRadarCatalogEntry): string | undefined {
  return firstString(entry, ["creator", "author", "developer", "publisher"]);
}

function getEntryDescription(entry: GameRadarCatalogEntry): string | undefined {
  return firstString(entry, ["shortDescription", "description", "summary", "blurb"]);
}

function getEntryPrice(entry: GameRadarCatalogEntry): string | undefined {
  return firstString(entry, ["price", "minimumPrice", "salePrice"]);
}

function getEntryTags(entry: GameRadarCatalogEntry): string[] {
  const rawTags = [
    ...firstStringArray(entry, ["tags"]),
    ...firstStringArray(entry, ["genres"]),
    ...firstStringArray(entry, ["categories"]),
  ];

  return Array.from(new Set(rawTags.map(normalizeToken).filter(Boolean))).sort();
}

function getEntryPlatforms(entry: GameRadarCatalogEntry): string[] {
  const rawPlatforms = firstStringArray(entry, ["platforms", "platform", "os"]);

  return Array.from(new Set(rawPlatforms.map(normalizeToken).filter(Boolean))).sort();
}

function hasAnyMatch(values: string[], filters: string[]): boolean {
  if (filters.length === 0) {
    return false;
  }

  const valueSet = new Set(values);
  return filters.some((filter) => valueSet.has(filter));
}

function countMatches(values: string[], filters: string[]): number {
  if (filters.length === 0) {
    return 0;
  }

  const valueSet = new Set(values);
  return filters.filter((filter) => valueSet.has(filter)).length;
}

function detectSafetySignals(tags: string[]): string[] {
  const safetyTags = new Set([
    "adult",
    "nsfw",
    "erotic",
    "horror",
    "gore",
    "violence",
    "mature",
  ]);

  return tags.filter((tag) => safetyTags.has(tag));
}

function scoreEntry(params: {
  entry: GameRadarCatalogEntry;
  tags: string[];
  platforms: string[];
  includeTags: string[];
  preferredPlatforms: string[];
}): { score: number; reasons: GameRadarRecommendationReason[] } {
  const reasons: GameRadarRecommendationReason[] = [];
  let score = 50;

  const tagMatches = countMatches(params.tags, params.includeTags);
  if (tagMatches > 0) {
    const weight = tagMatches * 20;
    score += weight;
    reasons.push({
      type: "tag-match",
      label: `${tagMatches} included tag match${tagMatches === 1 ? "" : "es"}`,
      weight,
    });
  }

  const platformMatches = countMatches(params.platforms, params.preferredPlatforms);
  if (platformMatches > 0) {
    const weight = platformMatches * 8;
    score += weight;
    reasons.push({
      type: "platform-match",
      label: `${platformMatches} preferred platform match${platformMatches === 1 ? "" : "es"}`,
      weight,
    });
  }

  const url = getEntryUrl(params.entry);
  if (url.length > 0) {
    score += 5;
    reasons.push({
      type: "metadata",
      label: "has source URL",
      weight: 5,
    });
  }

  const description = getEntryDescription(params.entry);
  if (description && description.length >= 80) {
    score += 5;
    reasons.push({
      type: "catalogue-signal",
      label: "has useful description",
      weight: 5,
    });
  }

  const creator = getEntryCreator(params.entry);
  if (creator) {
    score += 3;
    reasons.push({
      type: "metadata",
      label: "has creator metadata",
      weight: 3,
    });
  }

  const safetySignals = detectSafetySignals(params.tags);
  if (safetySignals.length > 0) {
    reasons.push({
      type: "safety-signal",
      label: `flagged tags: ${safetySignals.join(", ")}`,
      weight: 0,
    });
  }

  return { score, reasons };
}

function sortRecommendations(
  left: GameRadarRecommendationItem,
  right: GameRadarRecommendationItem,
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.title.localeCompare(right.title);
}

function makeSnapshotId(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function buildGameRadarRecommendationSnapshot(
  input: GameRadarRecommendationBuildInput,
): GameRadarRecommendationSnapshot {
  const now = input.now ?? new Date();

  const includeTags = parseCsvTokens(input.profile.includeTags);
  const excludeTags = parseCsvTokens(input.profile.excludeTags);
  const preferredPlatforms = parseCsvTokens(input.profile.preferredPlatforms);

  const recommended: GameRadarRecommendationItem[] = [];
  let filteredOutCount = 0;

  input.entries.forEach((entry, index) => {
    const tags = getEntryTags(entry);
    const platforms = getEntryPlatforms(entry);

    if (hasAnyMatch(tags, excludeTags)) {
      filteredOutCount += 1;
      return;
    }

    const result = scoreEntry({
      entry,
      tags,
      platforms,
      includeTags,
      preferredPlatforms,
    });

    if (result.score < input.profile.minScore) {
      filteredOutCount += 1;
      return;
    }

    recommended.push({
      rank: 0,
      id: getEntryId(entry, index),
      title: getEntryTitle(entry, index),
      url: getEntryUrl(entry),
      creator: getEntryCreator(entry),
      description: getEntryDescription(entry),
      tags,
      platforms,
      price: getEntryPrice(entry),
      score: result.score,
      reasons: result.reasons,
      sourceEntry: entry,
    });
  });

  const items = recommended
    .sort(sortRecommendations)
    .slice(0, input.profile.limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return {
    snapshotId: makeSnapshotId(now),
    generatedAt: now.toISOString(),
    profile: input.profile,
    sourceCount: input.entries.length,
    recommendedCount: items.length,
    filteredOutCount,
    items,
  };
}
