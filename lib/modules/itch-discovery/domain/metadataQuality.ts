import type { ItchMetadataStatus } from "../contract";
import type { ItchGame } from "../types";

const WARNING_CHECKS: Record<string, (game: ItchGame) => boolean> = {
  "creator-not-found": (game) => Boolean(game.creatorName),
  "description-not-found": (game) => Boolean(game.shortDescription),
  "cover-not-found": (game) => Boolean(game.coverImageUrl),
  "tags-not-found": (game) => game.tags.length > 0,
  "platforms-not-found": (game) => Object.values(game.platforms).some(Boolean),
  "price-not-found": (game) => game.price.kind !== "unknown",
};

export function resolveItchEnrichmentWarnings(
  warnings: string[],
  appliedGame: ItchGame,
): string[] {
  return [...new Set(warnings)].filter((warning) => {
    const isSatisfied = WARNING_CHECKS[warning];
    return isSatisfied ? !isSatisfied(appliedGame) : true;
  });
}

export function determineItchMetadataStatus(
  game: Pick<
    ItchGame,
    "shortDescription" | "coverImageUrl" | "tags" | "isAvailable"
  >,
): Extract<ItchMetadataStatus, "partial" | "enriched" | "stale"> {
  if (!game.isAvailable) {
    return "stale";
  }

  const hasRecommendationCore =
    Boolean(game.shortDescription) &&
    Boolean(game.coverImageUrl) &&
    game.tags.length > 0;

  return hasRecommendationCore ? "enriched" : "partial";
}
