import type Database from "better-sqlite3";

import {
  ITCH_CLASSIFICATIONS,
  ITCH_FILTER_DELIVERY_TYPES,
  ITCH_FILTER_METADATA_MODES,
  ITCH_FILTER_SORT_FIELDS,
  ITCH_RECOMMENDATION_STATES,
  type ItchFilterMetadataMode,
  type ItchFilterRule,
  type ItchFilterSort,
} from "../contract";
import { ItchFilterValidationError } from "../errors";
import type { ItchFilterQuery } from "../types";
import { ItchTagNormalizer } from "../domain/tagNormalization";
import { ItchTagAliasRepository } from "../repositories/itchTagAliasRepository";

export type NormalizedItchFilterQuery = {
  rules: ItchFilterRule[];
  sort: ItchFilterSort[];
  metadataMode: ItchFilterMetadataMode;
  profileId?: string;
  limit: number;
  offset: number;
  now: string;
};

const PLATFORM_VALUES = new Set(["windows", "linux", "macos", "browser"]);
const CLASSIFICATION_VALUES = new Set<string>(ITCH_CLASSIFICATIONS);
const STATE_VALUES = new Set<string>(ITCH_RECOMMENDATION_STATES);
const DELIVERY_VALUES = new Set<string>(ITCH_FILTER_DELIVERY_TYPES);
const SORT_FIELDS = new Set<string>(ITCH_FILTER_SORT_FIELDS);
const METADATA_MODES = new Set<string>(ITCH_FILTER_METADATA_MODES);
const ADULT_STATUS_VALUES = new Set(["unknown", "adult", "non-adult", "blocked"]);

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function requireNonEmptyValues(
  label: string,
  values: string[],
  issues: string[],
): string[] {
  const normalized = uniqueStrings(values);
  if (normalized.length === 0) {
    issues.push(`${label} requires at least one value`);
  }
  return normalized;
}

function requireFiniteNumber(
  label: string,
  value: number | undefined,
  issues: string[],
  options: { minimum?: number; maximum?: number } = {},
): number {
  if (value === undefined || !Number.isFinite(value)) {
    issues.push(`${label} requires a finite numeric value`);
    return 0;
  }

  if (options.minimum !== undefined && value < options.minimum) {
    issues.push(`${label} must be at least ${options.minimum}`);
  }
  if (options.maximum !== undefined && value > options.maximum) {
    issues.push(`${label} must be no greater than ${options.maximum}`);
  }

  return value;
}

function normalizeRule(
  rule: ItchFilterRule,
  tagNormalizer: ItchTagNormalizer,
  issues: string[],
): ItchFilterRule {
  switch (rule.field) {
    case "tag": {
      const rawValues = requireNonEmptyValues("tag rule", rule.values, issues);
      const canonicalValues = tagNormalizer.normalizeMany(rawValues).canonicalTags;
      if (canonicalValues.length === 0) {
        issues.push("tag rule did not contain any valid canonical tags");
      }
      return { ...rule, values: canonicalValues };
    }

    case "platform": {
      const values = requireNonEmptyValues(
        "platform rule",
        rule.values,
        issues,
      );
      const invalid = values.filter((value) => !PLATFORM_VALUES.has(value));
      if (invalid.length > 0) {
        issues.push(`invalid platform values: ${invalid.join(", ")}`);
      }
      return { ...rule, values: values as typeof rule.values };
    }

    case "delivery": {
      const values = requireNonEmptyValues(
        "delivery rule",
        rule.values,
        issues,
      );
      const invalid = values.filter((value) => !DELIVERY_VALUES.has(value));
      if (invalid.length > 0) {
        issues.push(`invalid delivery values: ${invalid.join(", ")}`);
      }
      return { ...rule, values: values as typeof rule.values };
    }

    case "price": {
      if (rule.operator === "maximum" || rule.operator === "minimum") {
        return {
          ...rule,
          value: Math.round(
            requireFiniteNumber(
              `price ${rule.operator}`,
              rule.value,
              issues,
              { minimum: 0 },
            ),
          ),
        };
      }
      return { field: "price", operator: rule.operator };
    }

    case "sale": {
      if (rule.operator === "minimumDiscount") {
        return {
          ...rule,
          value: requireFiniteNumber(
            "minimum sale discount",
            rule.value,
            issues,
            { minimum: 0, maximum: 100 },
          ),
        };
      }
      return { field: "sale", operator: rule.operator };
    }

    case "releaseAgeDays":
    case "updateAgeDays":
    case "minimumScore":
      return {
        ...rule,
        value: requireFiniteNumber(
          rule.field,
          rule.value,
          issues,
          { minimum: 0 },
        ),
      };

    case "creator":
    case "source": {
      const values = requireNonEmptyValues(
        `${rule.field} rule`,
        rule.values,
        issues,
      );
      return { ...rule, values };
    }

    case "state": {
      const values = requireNonEmptyValues("state rule", rule.values, issues);
      const invalid = values.filter((value) => !STATE_VALUES.has(value));
      if (invalid.length > 0) {
        issues.push(`invalid recommendation states: ${invalid.join(", ")}`);
      }
      return { ...rule, values };
    }

    case "classification": {
      const values = requireNonEmptyValues(
        "classification rule",
        rule.values,
        issues,
      );
      const invalid = values.filter(
        (value) => !CLASSIFICATION_VALUES.has(value),
      );
      if (invalid.length > 0) {
        issues.push(`invalid classifications: ${invalid.join(", ")}`);
      }
      return { ...rule, values };
    }

    case "adultStatus": {
      const values = requireNonEmptyValues("adult status rule", rule.values, issues);
      const invalid = values.filter((value) => !ADULT_STATUS_VALUES.has(value));
      if (invalid.length > 0) issues.push(`invalid adult statuses: ${invalid.join(", ")}`);
      return { ...rule, values } as ItchFilterRule;
    }

    case "metadataCompleteness":
      if (!METADATA_MODES.has(rule.operator)) {
        issues.push(`invalid metadata mode: ${rule.operator}`);
      }
      return rule;

    case "availability":
    case "nsfw":
      return rule;
  }
}

function normalizeSort(sort: ItchFilterSort[], issues: string[]): ItchFilterSort[] {
  const normalized: ItchFilterSort[] = [];
  const seen = new Set<string>();

  for (const item of sort) {
    if (!SORT_FIELDS.has(item.field)) {
      issues.push(`invalid filter sort field: ${item.field}`);
      continue;
    }
    if (item.direction !== "asc" && item.direction !== "desc") {
      issues.push(`invalid sort direction for ${item.field}`);
      continue;
    }
    if (seen.has(item.field)) {
      continue;
    }
    seen.add(item.field);
    normalized.push(item);
  }

  if (!seen.has("title")) {
    normalized.push({ field: "title", direction: "asc" });
  }

  return normalized;
}

export function normalizeItchFilterQuery(
  db: Database.Database,
  query: ItchFilterQuery,
): NormalizedItchFilterQuery {
  const issues: string[] = [];
  const tagNormalizer = new ItchTagNormalizer(new ItchTagAliasRepository(db));
  const rules = query.rules.map((rule) =>
    normalizeRule(rule, tagNormalizer, issues),
  );

  const metadataRules = rules.filter(
    (rule): rule is Extract<ItchFilterRule, { field: "metadataCompleteness" }> =>
      rule.field === "metadataCompleteness",
  );
  const metadataModes = [...new Set(metadataRules.map((rule) => rule.operator))];
  if (metadataModes.length > 1) {
    issues.push("filter cannot be both strict and permissive");
  }

  const metadataMode = metadataModes[0] ?? "permissive";
  const executableRules = rules.filter(
    (rule) => rule.field !== "metadataCompleteness",
  );
  const sort = normalizeSort(
    query.sort ?? [
      { field: "score", direction: "desc" },
      { field: "lastDiscoveredAt", direction: "desc" },
    ],
    issues,
  );

  const limit = Math.min(500, Math.max(1, Math.floor(query.limit ?? 100)));
  const offset = Math.max(0, Math.floor(query.offset ?? 0));
  const now = query.now ?? new Date().toISOString();

  if (Number.isNaN(Date.parse(now))) {
    issues.push(`invalid filter clock value: ${now}`);
  }

  if (issues.length > 0) {
    throw new ItchFilterValidationError(issues);
  }

  return {
    rules: executableRules,
    sort,
    metadataMode,
    profileId: query.profileId?.trim() || undefined,
    limit,
    offset,
    now,
  };
}
