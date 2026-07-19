import type {
  ItchFilterRule,
  ItchFilterSort,
  ItchPlatform,
} from "../contract";
import type {
  ItchFilterCandidate,
  ItchFilteredGame,
  ItchFilterRuleEvaluation,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1_000;

function lower(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function listIntersection(values: string[], expected: string[]): string[] {
  const expectedSet = new Set(expected.map(lower));
  return values.filter((value) => expectedSet.has(lower(value)));
}

function compareMembership(
  actual: string[],
  expected: string[],
  operator: "in" | "notIn",
): boolean {
  const matched = listIntersection(actual, expected).length > 0;
  return operator === "in" ? matched : !matched;
}

function formatRule(rule: ItchFilterRule): string {
  switch (rule.field) {
    case "tag":
    case "platform":
    case "delivery":
    case "creator":
    case "source":
    case "state":
    case "classification":
    case "adultStatus":
      return `${rule.field}:${rule.operator}:${rule.values.join("|")}`;
    case "price":
    case "sale":
      return `${rule.field}:${rule.operator}:${rule.value ?? ""}`;
    case "releaseAgeDays":
    case "updateAgeDays":
    case "minimumScore":
      return `${rule.field}:${rule.operator}:${rule.value}`;
    case "availability":
    case "nsfw":
    case "metadataCompleteness":
      return `${rule.field}:${rule.operator}`;
  }
}

function evaluation(
  rule: ItchFilterRule,
  outcome: ItchFilterRuleEvaluation["outcome"],
  explanation: string,
  missingFields: string[] = [],
): ItchFilterRuleEvaluation {
  return { rule, outcome, explanation, missingFields };
}

function ageInDays(value: string | undefined, nowMs: number): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return Math.max(0, (nowMs - parsed) / DAY_MS);
}

function getActivePlatforms(candidate: ItchFilterCandidate): ItchPlatform[] {
  return (Object.entries(candidate.game.platforms) as Array<
    [ItchPlatform, boolean]
  >)
    .filter(([, enabled]) => enabled)
    .map(([platform]) => platform);
}

function evaluateRule(
  candidate: ItchFilterCandidate,
  rule: ItchFilterRule,
  nowMs: number,
): ItchFilterRuleEvaluation {
  const game = candidate.game;

  switch (rule.field) {
    case "tag": {
      if (game.tags.length === 0) {
        return evaluation(
          rule,
          "unknown",
          "The game has no usable tag metadata.",
          ["tags"],
        );
      }

      const matched = listIntersection(game.tags, rule.values);
      if (rule.operator === "includesAny") {
        return evaluation(
          rule,
          matched.length > 0 ? "pass" : "fail",
          matched.length > 0
            ? `Matched tag${matched.length === 1 ? "" : "s"}: ${matched.join(", ")}.`
            : `Did not match any required tag: ${rule.values.join(", ")}.`,
        );
      }

      if (rule.operator === "includesAll") {
        const missing = rule.values.filter(
          (value) => !game.tags.some((tag) => lower(tag) === lower(value)),
        );
        return evaluation(
          rule,
          missing.length === 0 ? "pass" : "fail",
          missing.length === 0
            ? `Matched all required tags: ${rule.values.join(", ")}.`
            : `Missing required tags: ${missing.join(", ")}.`,
        );
      }

      return evaluation(
        rule,
        matched.length === 0 ? "pass" : "fail",
        matched.length === 0
          ? `Matched none of the excluded tags: ${rule.values.join(", ")}.`
          : `Matched excluded tag${matched.length === 1 ? "" : "s"}: ${matched.join(", ")}.`,
      );
    }

    case "platform": {
      const active = getActivePlatforms(candidate);
      if (active.length === 0) {
        return evaluation(
          rule,
          "unknown",
          "The game has no confirmed platform metadata.",
          ["platforms"],
        );
      }

      const matched = listIntersection(active, rule.values);
      if (rule.operator === "includesAny") {
        return evaluation(
          rule,
          matched.length > 0 ? "pass" : "fail",
          matched.length > 0
            ? `Supported platform match: ${matched.join(", ")}.`
            : `No required platform match: ${rule.values.join(", ")}.`,
        );
      }

      if (rule.operator === "includesAll") {
        const missing = rule.values.filter((platform) => !active.includes(platform));
        return evaluation(
          rule,
          missing.length === 0 ? "pass" : "fail",
          missing.length === 0
            ? `Supports all required platforms: ${rule.values.join(", ")}.`
            : `Missing required platforms: ${missing.join(", ")}.`,
        );
      }

      return evaluation(
        rule,
        matched.length === 0 ? "pass" : "fail",
        matched.length === 0
          ? `Supports none of the excluded platforms: ${rule.values.join(", ")}.`
          : `Supports excluded platform${matched.length === 1 ? "" : "s"}: ${matched.join(", ")}.`,
      );
    }

    case "delivery": {
      const deliveries: string[] = [];
      if (game.platforms.browser) {
        deliveries.push("browser");
      }
      if (
        game.platforms.windows ||
        game.platforms.linux ||
        game.platforms.macos
      ) {
        deliveries.push("downloadable");
      }

      if (deliveries.length === 0) {
        return evaluation(
          rule,
          "unknown",
          "The game has no confirmed browser or downloadable delivery type.",
          ["platforms"],
        );
      }

      const matched = compareMembership(deliveries, rule.values, rule.operator);
      return evaluation(
        rule,
        matched ? "pass" : "fail",
        matched
          ? `Delivery type accepted: ${deliveries.join(", ")}.`
          : `Delivery type rejected: ${deliveries.join(", ")}.`,
      );
    }

    case "price": {
      if (game.price.kind === "unknown") {
        return evaluation(
          rule,
          "unknown",
          "The game has no reliable price classification.",
          ["price"],
        );
      }

      if (rule.operator === "free") {
        return evaluation(
          rule,
          game.price.isFree ? "pass" : "fail",
          game.price.isFree ? "The game is free." : "The game is not free.",
        );
      }

      if (rule.operator === "paid") {
        const paid = !game.price.isFree;
        return evaluation(
          rule,
          paid ? "pass" : "fail",
          paid ? "The game is paid." : "The game is not paid.",
        );
      }

      const effectivePrice = game.price.isFree
        ? 0
        : game.price.amountMinor;
      if (effectivePrice === undefined) {
        return evaluation(
          rule,
          "unknown",
          "The game has a price type but no comparable numeric price.",
          ["price.amountMinor"],
        );
      }

      const threshold = rule.value ?? 0;
      const passed =
        rule.operator === "maximum"
          ? effectivePrice <= threshold
          : effectivePrice >= threshold;
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `${effectivePrice} minor currency units ${passed ? "satisfies" : "does not satisfy"} ${rule.operator} ${threshold}.`,
      );
    }

    case "sale": {
      const saleKnown =
        game.price.kind !== "unknown" || Boolean(game.price.saleText);
      if (!saleKnown) {
        return evaluation(
          rule,
          "unknown",
          "The game has no reliable sale metadata.",
          ["sale"],
        );
      }

      if (rule.operator === "onSale") {
        return evaluation(
          rule,
          game.price.isOnSale ? "pass" : "fail",
          game.price.isOnSale
            ? "The game is currently marked as on sale."
            : "The game is not currently marked as on sale.",
        );
      }

      if (rule.operator === "offSale") {
        return evaluation(
          rule,
          game.price.isOnSale ? "fail" : "pass",
          game.price.isOnSale
            ? "The game is currently on sale."
            : "The game is not currently on sale.",
        );
      }

      if (!game.price.isOnSale) {
        return evaluation(
          rule,
          "fail",
          "The game is not currently on sale.",
        );
      }

      if (candidate.discountPercent === undefined) {
        return evaluation(
          rule,
          "unknown",
          "The sale is visible but its discount percentage could not be determined.",
          ["sale.discountPercent"],
        );
      }

      const passed = candidate.discountPercent >= (rule.value ?? 0);
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `Discount ${candidate.discountPercent}% ${passed ? "meets" : "does not meet"} the ${rule.value ?? 0}% minimum.`,
      );
    }

    case "releaseAgeDays":
    case "updateAgeDays": {
      const fieldValue =
        rule.field === "releaseAgeDays"
          ? game.publishedAt
          : game.sourceUpdatedAt;
      const missingField =
        rule.field === "releaseAgeDays" ? "publishedAt" : "sourceUpdatedAt";
      const age = ageInDays(fieldValue, nowMs);
      if (age === undefined) {
        return evaluation(
          rule,
          "unknown",
          `The game has no usable ${missingField} value.`,
          [missingField],
        );
      }

      const passed = rule.operator === "lte" ? age <= rule.value : age >= rule.value;
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `${missingField} age is ${age.toFixed(1)} days and ${passed ? "satisfies" : "does not satisfy"} ${rule.operator} ${rule.value}.`,
      );
    }

    case "minimumScore": {
      const score = candidate.recommendation?.score;
      if (score === undefined) {
        return evaluation(
          rule,
          "unknown",
          "The game has not been scored by the recommendation engine yet.",
          ["recommendationScore"],
        );
      }

      const passed = rule.operator === "lte" ? score <= rule.value : score >= rule.value;
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `Recommendation score ${score} ${passed ? "satisfies" : "does not satisfy"} ${rule.operator} ${rule.value}.`,
      );
    }

    case "creator": {
      if (!game.creatorName) {
        return evaluation(
          rule,
          "unknown",
          "The game has no creator metadata.",
          ["creatorName"],
        );
      }
      const passed = compareMembership(
        [game.creatorName],
        rule.values,
        rule.operator,
      );
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `${game.creatorName} is ${passed ? "accepted" : "rejected"} by the creator rule.`,
      );
    }

    case "source": {
      if (candidate.sources.length === 0) {
        return evaluation(
          rule,
          "unknown",
          "The game has no discovery-source metadata.",
          ["sources"],
        );
      }

      const actual = candidate.sources.flatMap((source) => [
        source.id,
        source.name,
        source.sourceType,
        source.sourceUrl,
      ]);
      const passed = compareMembership(actual, rule.values, rule.operator);
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        passed
          ? `Discovery source accepted: ${candidate.sources.map((source) => source.name).join(", ")}.`
          : `Discovery source rejected: ${candidate.sources.map((source) => source.name).join(", ")}.`,
      );
    }

    case "state": {
      const state = candidate.recommendation?.state ?? "unseen";
      const passed = compareMembership([state], rule.values, rule.operator);
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `Recommendation state ${state} is ${passed ? "accepted" : "rejected"}.`,
      );
    }

    case "classification": {
      const passed = compareMembership(
        [game.classification],
        rule.values,
        rule.operator,
      );
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `Classification ${game.classification} is ${passed ? "accepted" : "rejected"}.`,
      );
    }

    case "availability": {
      const expected = rule.operator === "available";
      const passed = game.isAvailable === expected;
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        `Game is ${game.isAvailable ? "available" : "unavailable"}.`,
      );
    }

    case "adultStatus": {
      const status = game.adultStatus ?? (game.isNsfw ? "adult" : "unknown");
      const matched = rule.values.includes(status);
      const passed = rule.operator === "in" ? matched : !matched;
      return evaluation(rule, passed ? "pass" : "fail", `Adult classification is ${status}.`);
    }

    case "nsfw": {
      if (rule.operator === "include") {
        return evaluation(rule, "pass", "NSFW status is not restricting this filter.");
      }
      const passed = rule.operator === "exclude" ? !game.isNsfw : game.isNsfw;
      return evaluation(
        rule,
        passed ? "pass" : "fail",
        game.isNsfw
          ? "The game is marked NSFW."
          : "The game is not marked NSFW.",
      );
    }

    case "metadataCompleteness":
      return evaluation(
        rule,
        "pass",
        `Metadata mode is ${rule.operator}.`,
      );
  }
}

function getSortValue(
  item: ItchFilteredGame,
  field: ItchFilterSort["field"],
): string | number | undefined {
  switch (field) {
    case "score":
      return item.recommendationScore;
    case "title":
      return lower(item.game.title);
    case "creatorName":
      return item.game.creatorName ? lower(item.game.creatorName) : undefined;
    case "price":
      return item.game.price.isFree ? 0 : item.game.price.amountMinor;
    case "publishedAt":
      return item.game.publishedAt
        ? Date.parse(item.game.publishedAt)
        : undefined;
    case "sourceUpdatedAt":
      return item.game.sourceUpdatedAt
        ? Date.parse(item.game.sourceUpdatedAt)
        : undefined;
    case "firstDiscoveredAt":
      return Date.parse(item.game.firstDiscoveredAt);
    case "lastDiscoveredAt":
      return Date.parse(item.game.lastDiscoveredAt);
    case "lastEnrichedAt":
      return item.game.lastEnrichedAt
        ? Date.parse(item.game.lastEnrichedAt)
        : undefined;
    case "metadataCompleteness":
      return item.metadataCompleteness;
  }
}

function compareValues(
  left: string | number | undefined,
  right: string | number | undefined,
  direction: "asc" | "desc",
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }

  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "en", {
          sensitivity: "base",
          numeric: true,
        });

  return direction === "asc" ? comparison : -comparison;
}

export function applyItchFilterRules(
  candidates: ItchFilterCandidate[],
  rules: ItchFilterRule[],
  metadataMode: "strict" | "permissive",
  sort: ItchFilterSort[],
  now: string,
): {
  matched: ItchFilteredGame[];
  rejectedByRule: Record<string, number>;
} {
  const nowMs = Date.parse(now);
  const matched: ItchFilteredGame[] = [];
  const rejectedByRule: Record<string, number> = {};

  for (const candidate of candidates) {
    const evaluations: ItchFilterRuleEvaluation[] = [];
    let rejectedKey: string | undefined;

    for (const rule of rules) {
      const result = evaluateRule(candidate, rule, nowMs);
      evaluations.push(result);

      const rejected =
        result.outcome === "fail" ||
        (result.outcome === "unknown" && metadataMode === "strict");
      if (rejected && !rejectedKey) {
        rejectedKey = formatRule(rule);
      }
    }

    if (rejectedKey) {
      rejectedByRule[rejectedKey] = (rejectedByRule[rejectedKey] ?? 0) + 1;
      continue;
    }

    matched.push({
      game: candidate.game,
      sources: candidate.sources,
      recommendationScore: candidate.recommendation?.score,
      recommendationState: candidate.recommendation?.state ?? "unseen",
      metadataCompleteness: candidate.metadataCompleteness,
      missingMetadataFields: candidate.missingMetadataFields,
      discountPercent: candidate.discountPercent,
      matchedReasons: evaluations
        .filter((item) => item.outcome === "pass")
        .map((item) => item.explanation),
      warnings: evaluations
        .filter((item) => item.outcome === "unknown")
        .map((item) => item.explanation),
      evaluations,
    });
  }

  matched.sort((left, right) => {
    for (const sortItem of sort) {
      const result = compareValues(
        getSortValue(left, sortItem.field),
        getSortValue(right, sortItem.field),
        sortItem.direction,
      );
      if (result !== 0) {
        return result;
      }
    }

    const titleResult = left.game.title.localeCompare(right.game.title, "en", {
      sensitivity: "base",
      numeric: true,
    });
    return titleResult !== 0 ? titleResult : left.game.id.localeCompare(right.game.id);
  });

  return { matched, rejectedByRule };
}
