import type {
  ItchPlatform,
  RecommendationScoreBreakdown,
} from "../contract";
import type {
  ItchCanonicalTag,
  ItchFilteredGame,
  ItchPreferenceProfile,
  ItchPreferenceWeight,
  ItchRecommendation,
  ItchRankedGame,
} from "../types";
import type { ItchFeedbackModel } from "./feedbackModel";
import { RECOMMENDATION_COMPONENT_CAPS } from "./recommendationConfig";

export type ScoreItchGameInput = {
  item: ItchFilteredGame;
  profile: ItchPreferenceProfile;
  preferenceWeights: ItchPreferenceWeight[];
  feedback: ItchFeedbackModel;
  canonicalTags: ItchCanonicalTag[];
  existingRecommendation?: ItchRecommendation;
  now: string;
};

type Contribution = {
  label: string;
  value: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function ageInDays(value: string | undefined, now: Date): number | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

function recencyScore(days: number | undefined): number {
  if (days === undefined) return 0;
  if (days <= 7) return 10;
  if (days <= 30) return 8;
  if (days <= 90) return 6;
  if (days <= 180) return 4;
  if (days <= 365) return 2;
  return 0;
}

function noveltyScore(days: number | undefined): number {
  if (days === undefined) return 0;
  if (days <= 7) return 5;
  if (days <= 30) return 3;
  if (days <= 90) return 1;
  return 0;
}

function activePlatforms(
  platforms: Record<ItchPlatform, boolean>,
): ItchPlatform[] {
  return (Object.entries(platforms) as Array<[ItchPlatform, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([platform]) => platform);
}

function includesText(text: string, phrase: string): boolean {
  return text.includes(phrase.trim().toLowerCase());
}

function buildReason(contributions: Contribution[], fallback: string): string {
  const positive = contributions
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 3)
    .map((entry) => entry.label);

  if (positive.length === 0) {
    return fallback;
  }

  if (positive.length === 1) {
    return `Recommended because it ${positive[0]}.`;
  }

  const last = positive.pop();
  return `Recommended because it ${positive.join(", ")} and ${last}.`;
}

export function scoreItchGame(input: ScoreItchGameInput): ItchRankedGame {
  const { game, sources, metadataCompleteness } = input.item;
  const now = new Date(input.now);
  const rankableTags = new Set(
    input.canonicalTags.filter((tag) => tag.isRankable).map((tag) => tag.tag),
  );
  const tagSet = new Set(game.tags.filter((tag) => rankableTags.has(tag)));
  const text = `${game.title} ${game.creatorName ?? ""} ${game.shortDescription ?? ""}`.toLowerCase();
  const platformSet = new Set(activePlatforms(game.platforms));
  const contributions: Contribution[] = [];
  const exclusionReasons: string[] = [];

  let tagMatch = 0;
  let textMatch = 0;
  let platformMatch = 0;
  let priceMatch = 0;
  let sourceQuality = 0;
  let feedbackAdjustment = 0;
  let penalties = 0;

  for (const weight of input.preferenceWeights) {
    const effectiveWeight = weight.weight * weight.confidence;
    let matched = false;

    if (weight.featureType === "tag") {
      matched = tagSet.has(weight.featureValue);
      if (matched && effectiveWeight > 0) {
        tagMatch += effectiveWeight;
        contributions.push({
          label: `matches ${weight.featureValue}`,
          value: effectiveWeight,
        });
      } else if (matched && effectiveWeight < 0) {
        penalties += effectiveWeight;
      }
    } else if (weight.featureType === "phrase") {
      matched = includesText(text, weight.featureValue);
      if (matched && effectiveWeight > 0) {
        textMatch += effectiveWeight;
        contributions.push({
          label: `matches the phrase “${weight.featureValue}”`,
          value: effectiveWeight,
        });
      } else if (matched && effectiveWeight < 0) {
        penalties += effectiveWeight;
      }
    } else if (weight.featureType === "creator") {
      matched =
        game.creatorName?.trim().toLowerCase() === weight.featureValue.toLowerCase();
      if (matched && effectiveWeight > 0) {
        textMatch += effectiveWeight;
        contributions.push({
          label: `is from preferred creator ${game.creatorName}`,
          value: effectiveWeight,
        });
      } else if (matched && effectiveWeight < 0) {
        penalties += effectiveWeight;
      }
    } else if (weight.featureType === "platform") {
      matched = platformSet.has(weight.featureValue as ItchPlatform);
      if (matched && effectiveWeight > 0) {
        platformMatch += effectiveWeight;
      } else if (matched && effectiveWeight < 0) {
        penalties += effectiveWeight;
      }
    } else if (weight.featureType === "source") {
      matched = sources.some(
        (source) =>
          source.id.toLowerCase() === weight.featureValue.toLowerCase() ||
          source.name.toLowerCase() === weight.featureValue.toLowerCase(),
      );
      if (matched && effectiveWeight > 0) {
        sourceQuality += effectiveWeight;
      } else if (matched && effectiveWeight < 0) {
        penalties += effectiveWeight;
      }
    }
  }

  const preferredMatches = input.profile.preferredPlatforms.filter((platform) =>
    platformSet.has(platform),
  );
  if (preferredMatches.length > 0) {
    platformMatch += 4 + Math.min(4, preferredMatches.length - 1);
    contributions.push({
      label: `supports ${preferredMatches.join(" and ")}`,
      value: 4 + preferredMatches.length,
    });
  } else if (
    input.profile.preferredPlatforms.length > 0 &&
    platformSet.size > 0
  ) {
    penalties -= 6;
  }

  if (game.price.kind === "free") {
    if (input.profile.allowFree) {
      priceMatch += 5;
      contributions.push({ label: "is free", value: 5 });
    } else {
      exclusionReasons.push("free games are disabled for this profile");
    }
  } else if (game.price.kind === "paid" || game.price.kind === "name-your-own-price") {
    if (input.profile.allowPaid) {
      priceMatch += game.price.kind === "name-your-own-price" ? 4 : 2;
      if (
        input.profile.maximumPriceMinor !== undefined &&
        game.price.amountMinor !== undefined
      ) {
        if (game.price.amountMinor <= input.profile.maximumPriceMinor) {
          priceMatch += 3;
          contributions.push({ label: "is within your price limit", value: 3 });
        } else {
          exclusionReasons.push("exceeds the profile price limit");
        }
      }
    } else {
      exclusionReasons.push("paid games are disabled for this profile");
    }
  }

  if (game.price.isOnSale) {
    priceMatch += 2;
    contributions.push({ label: "is currently on sale", value: 2 });
  }

  if (
    platformSet.has("browser") &&
    !input.profile.allowBrowserGames &&
    platformSet.size === 1
  ) {
    exclusionReasons.push("browser-only games are disabled for this profile");
  }

  const bestSource = [...sources].sort(
    (a, b) => b.priority - a.priority || a.name.localeCompare(b.name),
  )[0];
  if (bestSource) {
    sourceQuality += clamp(bestSource.priority / 10, 0, 10);
    if (bestSource.priority >= 70) {
      contributions.push({
        label: `was found through ${bestSource.name}`,
        value: bestSource.priority / 10,
      });
    }
  }

  const relevantDate =
    game.sourceUpdatedAt ?? game.publishedAt ?? game.lastDiscoveredAt;
  const recency = recencyScore(ageInDays(relevantDate, now));
  if (recency >= 6) {
    contributions.push({ label: "was released or updated recently", value: recency });
  }

  const novelty = input.existingRecommendation
    ? 0
    : noveltyScore(ageInDays(game.firstDiscoveredAt, now));

  for (const tag of tagSet) {
    feedbackAdjustment += input.feedback.tagWeights.get(tag) ?? 0;
  }
  if (game.creatorName) {
    feedbackAdjustment +=
      input.feedback.creatorWeights.get(game.creatorName.trim().toLowerCase()) ?? 0;
  }
  for (const platform of platformSet) {
    feedbackAdjustment += input.feedback.platformWeights.get(platform) ?? 0;
  }
  for (const source of sources) {
    feedbackAdjustment += input.feedback.sourceWeights.get(source.id) ?? 0;
  }
  feedbackAdjustment += input.feedback.directGameWeights.get(game.id) ?? 0;
  if (feedbackAdjustment >= 3) {
    contributions.push({
      label: "resembles games you responded positively to",
      value: feedbackAdjustment,
    });
  }

  if (game.adultStatus === "blocked") exclusionReasons.push("blocked by adult-content safety policy");
  if (!game.isAvailable) exclusionReasons.push("the project is unavailable");
  if (game.classification !== "game") {
    exclusionReasons.push(`classification is ${game.classification}, not game`);
  }
  if (game.isNsfw && input.profile.excludeNsfw) {
    exclusionReasons.push("NSFW projects are excluded");
  }
  if (
    input.existingRecommendation?.state === "hidden" ||
    input.existingRecommendation?.state === "played"
  ) {
    exclusionReasons.push(
      `recommendation state is ${input.existingRecommendation.state}`,
    );
  }

  penalties -= clamp((100 - metadataCompleteness) / 20, 0, 5);
  if (exclusionReasons.length > 0) {
    penalties -= 100;
  }

  const breakdown: RecommendationScoreBreakdown = {
    tagMatch: rounded(clamp(tagMatch, 0, RECOMMENDATION_COMPONENT_CAPS.tagMatch)),
    textMatch: rounded(clamp(textMatch, 0, RECOMMENDATION_COMPONENT_CAPS.textMatch)),
    platformMatch: rounded(
      clamp(platformMatch, 0, RECOMMENDATION_COMPONENT_CAPS.platformMatch),
    ),
    priceMatch: rounded(clamp(priceMatch, 0, RECOMMENDATION_COMPONENT_CAPS.priceMatch)),
    sourceQuality: rounded(
      clamp(sourceQuality, 0, RECOMMENDATION_COMPONENT_CAPS.sourceQuality),
    ),
    recency: rounded(recency),
    novelty: rounded(novelty),
    feedbackAdjustment: rounded(
      clamp(
        feedbackAdjustment,
        -RECOMMENDATION_COMPONENT_CAPS.feedbackAdjustment,
        RECOMMENDATION_COMPONENT_CAPS.feedbackAdjustment,
      ),
    ),
    penalties: rounded(Math.min(0, penalties)),
    total: 0,
  };

  const rawTotal =
    breakdown.tagMatch +
    breakdown.textMatch +
    breakdown.platformMatch +
    breakdown.priceMatch +
    breakdown.sourceQuality +
    breakdown.recency +
    breakdown.novelty +
    breakdown.feedbackAdjustment +
    breakdown.penalties;
  breakdown.total = rounded(clamp(rawTotal, 0, 100));

  return {
    game,
    sources,
    score: breakdown.total,
    scoreBreakdown: breakdown,
    reason: buildReason(
      contributions,
      "matches the active Game Radar eligibility rules",
    ),
    rankPosition: 0,
    eligible: exclusionReasons.length === 0,
    exclusionReasons,
    matchedFeatures: contributions
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((entry) => entry.label),
    existingRecommendation: input.existingRecommendation,
  };
}
