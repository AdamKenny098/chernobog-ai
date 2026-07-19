export const ITCH_CLASSIFICATIONS = [
  "game",
  "asset",
  "comic",
  "soundtrack",
  "other",
] as const;

export type ItchClassification = (typeof ITCH_CLASSIFICATIONS)[number];

export const ITCH_ADULT_STATUSES = [
  "unknown",
  "adult",
  "non-adult",
  "blocked",
] as const;

export type ItchAdultStatus = (typeof ITCH_ADULT_STATUSES)[number];

export const ITCH_METADATA_STATUSES = [
  "discovered",
  "partial",
  "enriched",
  "stale",
  "failed",
] as const;

export type ItchMetadataStatus = (typeof ITCH_METADATA_STATUSES)[number];

export const ITCH_RECOMMENDATION_STATES = [
  "unseen",
  "seen",
  "saved",
  "hidden",
  "opened",
  "played",
] as const;

export type ItchRecommendationState =
  (typeof ITCH_RECOMMENDATION_STATES)[number];

export const ITCH_SOURCE_TYPES = [
  "rss",
  "tag-rss",
  "sale-rss",
  "creator-rss",
  "manual",
] as const;

export type ItchSourceType = (typeof ITCH_SOURCE_TYPES)[number];

export const ITCH_WEIGHT_FEATURE_TYPES = [
  "tag",
  "phrase",
  "creator",
  "platform",
  "source",
] as const;

export type ItchWeightFeatureType =
  (typeof ITCH_WEIGHT_FEATURE_TYPES)[number];

export const ITCH_WEIGHT_ORIGINS = [
  "manual",
  "feedback",
  "vault",
  "default",
] as const;

export type ItchWeightOrigin = (typeof ITCH_WEIGHT_ORIGINS)[number];

export const ITCH_SIGNAL_TYPES = [
  "shown",
  "opened",
  "saved",
  "hidden",
  "played",
  "more_like_this",
  "less_like_this",
] as const;

export type ItchSignalType = (typeof ITCH_SIGNAL_TYPES)[number];

export const ITCH_REFRESH_TRIGGERS = [
  "manual",
  "schedule",
  "startup-stale",
] as const;

export type ItchRefreshTrigger = (typeof ITCH_REFRESH_TRIGGERS)[number];

export const ITCH_REFRESH_STATUSES = [
  "running",
  "completed",
  "partial",
  "failed",
] as const;

export type ItchRefreshStatus = (typeof ITCH_REFRESH_STATUSES)[number];

export const ITCH_WATCH_REASONS = [
  "saved",
  "manual",
  "opened",
  "played",
  "creator-follow",
] as const;

export type ItchWatchReason = (typeof ITCH_WATCH_REASONS)[number];

export const ITCH_DEVLOG_POST_TYPES = [
  "major-update",
  "update",
  "announcement",
  "long-form",
  "unknown",
] as const;

export type ItchDevlogPostType = (typeof ITCH_DEVLOG_POST_TYPES)[number];

export const ITCH_CHANGE_TYPES = [
  "devlog",
  "major-update",
  "price",
  "sale",
  "platform",
  "tags",
  "page",
  "availability",
] as const;

export type ItchChangeType = (typeof ITCH_CHANGE_TYPES)[number];

export const ITCH_CHANGE_CONFIDENCE = [
  "confirmed",
  "observed",
  "inferred",
] as const;

export type ItchChangeConfidence =
  (typeof ITCH_CHANGE_CONFIDENCE)[number];

export const ITCH_NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high",
] as const;

export type ItchNotificationPriority =
  (typeof ITCH_NOTIFICATION_PRIORITIES)[number];

export const ITCH_NOTIFICATION_STATES = [
  "unread",
  "read",
  "dismissed",
  "opened",
] as const;

export type ItchNotificationState =
  (typeof ITCH_NOTIFICATION_STATES)[number];

export type ItchPlatform = "windows" | "linux" | "macos" | "browser";

export const ITCH_TAG_CATEGORIES = [
  "genre",
  "theme",
  "perspective",
  "mechanic",
  "format",
  "visual",
  "setting",
  "content",
  "technology",
  "general",
  "other",
] as const;

export type ItchTagCategory = (typeof ITCH_TAG_CATEGORIES)[number];

export const ITCH_TAXONOMY_CATEGORY_IDS = [
  "adult-intensity",
  "game-format",
  "gameplay",
  "presentation",
  "engine",
  "narrative",
  "relationship",
  "representation",
  "protagonist",
  "cast",
  "adult-theme",
  "character-archetype",
  "setting",
  "platform",
  "commercial",
  "development-status",
  "session-length",
  "safety",
  "uncategorised",
] as const;

export type ItchTaxonomyCategoryId =
  (typeof ITCH_TAXONOMY_CATEGORY_IDS)[number];

export const ITCH_ADULT_EVIDENCE_LEVELS = [
  "strong",
  "supporting",
  "none",
] as const;

export type ItchAdultEvidence =
  (typeof ITCH_ADULT_EVIDENCE_LEVELS)[number];

export const ITCH_TAXONOMY_SAFETY_ROLES = [
  "normal",
  "review",
  "blocked",
] as const;

export type ItchTaxonomySafetyRole =
  (typeof ITCH_TAXONOMY_SAFETY_ROLES)[number];

export const ITCH_UNCATEGORISED_TAG_STATUSES = [
  "pending",
  "mapped",
  "ignored",
] as const;

export type ItchUncategorisedTagStatus =
  (typeof ITCH_UNCATEGORISED_TAG_STATUSES)[number];

export const ITCH_TAG_RESOLUTIONS = [
  "direct",
  "alias",
  "generated",
  "legacy",
  "rejected",
] as const;

export type ItchTagResolution = (typeof ITCH_TAG_RESOLUTIONS)[number];

export type RecommendationScoreBreakdown = {
  tagMatch: number;
  textMatch: number;
  platformMatch: number;
  priceMatch: number;
  sourceQuality: number;
  recency: number;
  novelty: number;
  feedbackAdjustment: number;
  penalties: number;
  total: number;
};


export const ITCH_FEEDBACK_CANDIDATE_STATUSES = [
  "candidate",
  "approved",
  "rejected",
  "superseded",
] as const;

export type ItchFeedbackCandidateStatus =
  (typeof ITCH_FEEDBACK_CANDIDATE_STATUSES)[number];

export const ITCH_SCHEDULER_RUN_RESULTS = [
  "never",
  "not-due",
  "disabled",
  "locked",
  "completed",
  "partial",
  "failed",
] as const;

export type ItchSchedulerRunResult =
  (typeof ITCH_SCHEDULER_RUN_RESULTS)[number];

export const ITCH_RECOMMENDATION_SCORE_VERSION = "stage-f-v1" as const;
export type ItchRecommendationScoreVersion =
  typeof ITCH_RECOMMENDATION_SCORE_VERSION;

export const ITCH_FILTER_METADATA_MODES = ["strict", "permissive"] as const;

export type ItchFilterMetadataMode =
  (typeof ITCH_FILTER_METADATA_MODES)[number];

export const ITCH_FILTER_DELIVERY_TYPES = [
  "browser",
  "downloadable",
] as const;

export type ItchFilterDeliveryType =
  (typeof ITCH_FILTER_DELIVERY_TYPES)[number];

export const ITCH_FILTER_SORT_FIELDS = [
  "score",
  "title",
  "creatorName",
  "price",
  "publishedAt",
  "sourceUpdatedAt",
  "firstDiscoveredAt",
  "lastDiscoveredAt",
  "lastEnrichedAt",
  "metadataCompleteness",
] as const;

export type ItchFilterSortField =
  (typeof ITCH_FILTER_SORT_FIELDS)[number];

export type ItchFilterRule =
  | {
      field: "tag";
      operator: "includesAny" | "includesAll" | "excludesAny";
      values: string[];
    }
  | {
      field: "platform";
      operator: "includesAny" | "includesAll" | "excludesAny";
      values: ItchPlatform[];
    }
  | {
      field: "delivery";
      operator: "in" | "notIn";
      values: ItchFilterDeliveryType[];
    }
  | {
      field: "price";
      operator: "free" | "paid" | "maximum" | "minimum";
      value?: number;
    }
  | {
      field: "sale";
      operator: "onSale" | "offSale" | "minimumDiscount";
      value?: number;
    }
  | {
      field: "releaseAgeDays" | "updateAgeDays" | "minimumScore";
      operator: "lte" | "gte";
      value: number;
    }
  | {
      field: "creator" | "source" | "state" | "classification";
      operator: "in" | "notIn";
      values: string[];
    }
  | {
      field: "availability";
      operator: "available" | "unavailable";
    }
  | {
      field: "nsfw";
      operator: "exclude" | "only" | "include";
    }
  | {
      field: "adultStatus";
      operator: "in" | "notIn";
      values: ItchAdultStatus[];
    }
  | {
      field: "metadataCompleteness";
      operator: ItchFilterMetadataMode;
    };

export type ItchFilterSort = {
  field: ItchFilterSortField;
  direction: "asc" | "desc";
};


export const ITCH_MAINTENANCE_OPERATIONS = [
  "diagnostic",
  "backup",
  "restore",
  "recovery",
] as const;

export type ItchMaintenanceOperation =
  (typeof ITCH_MAINTENANCE_OPERATIONS)[number];

export const ITCH_MAINTENANCE_STATUSES = [
  "running",
  "completed",
  "partial",
  "failed",
] as const;

export type ItchMaintenanceStatus =
  (typeof ITCH_MAINTENANCE_STATUSES)[number];

export const ITCH_PIPELINE_PHASES = [
  "starting",
  "discovering",
  "enriching",
  "normalizing",
  "ranking",
  "watching",
  "digesting",
  "completed",
] as const;

export type ItchPipelinePhase = (typeof ITCH_PIPELINE_PHASES)[number];
