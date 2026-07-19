export type RecommendationState =
  | "unseen"
  | "seen"
  | "saved"
  | "hidden"
  | "opened"
  | "played";

export type NotificationState = "unread" | "read" | "dismissed" | "opened";
export type Platform = "windows" | "linux" | "macos" | "browser";
export type PriceKind = "free" | "paid" | "name-your-own-price" | "unknown";
export type AdultStatus = "unknown" | "adult" | "non-adult" | "blocked";

export type GamePrice = {
  kind: PriceKind;
  amountMinor?: number;
  currency?: string;
  displayText?: string;
  isFree: boolean;
  isOnSale: boolean;
  saleText?: string;
};

export type Game = {
  id: string;
  canonicalUrl: string;
  title: string;
  rawTitle?: string;
  creatorName?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  tags: string[];
  classification: "game" | "asset" | "comic" | "soundtrack" | "other";
  price: GamePrice;
  platforms: Record<Platform, boolean>;
  isNsfw: boolean;
  adultStatus?: AdultStatus;
  adultConfidence?: number;
  adultReasons?: string[];
  adultContentTags?: string[];
  publishedAt?: string;
  sourceUpdatedAt?: string;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  lastEnrichedAt?: string;
  metadataStatus: "discovered" | "partial" | "enriched" | "stale" | "failed";
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScoreBreakdown = {
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

export type Recommendation = {
  id: string;
  gameId: string;
  profileId: string;
  batchDate: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
  state: RecommendationState;
  recommendedAt: string;
  firstSeenAt?: string;
  lastActionAt?: string;
  rankPosition?: number;
  scoreVersion: string;
};

export type FeedItem = {
  recommendation: Recommendation;
  game: Game;
  sources: Array<{
    id: string;
    name: string;
    sourceType: string;
    sourceUrl: string;
    priority: number;
  }>;
  watched: boolean;
};

export type FeedResponse = {
  profileId: string;
  state: RecommendationState;
  total: number;
  limit: number;
  offset: number;
  items: FeedItem[];
  cached: true;
  generatedAt: string;
};

export type CatalogueItem = {
  game: Game;
  sources: FeedItem["sources"];
  recommendationScore?: number;
  recommendationState: RecommendationState;
  recommendation?: Pick<
    Recommendation,
    "id" | "profileId" | "score" | "state" | "recommendedAt"
  >;
  metadataCompleteness: number;
  missingMetadataFields: string[];
  discountPercent?: number;
  matchedReasons: string[];
  warnings: string[];
};

export type CatalogueResponse = {
  metadataMode: "strict" | "permissive";
  normalizedRules: FilterRule[];
  sort: FilterSort[];
  totalCandidates: number;
  totalMatched: number;
  totalReturned: number;
  offset: number;
  limit: number;
  rejectedByRule: Record<string, number>;
  items: CatalogueItem[];
};

export type FilterRule =
  | { field: "tag"; operator: "includesAny" | "includesAll" | "excludesAny"; values: string[] }
  | { field: "platform"; operator: "includesAny" | "includesAll" | "excludesAny"; values: Platform[] }
  | { field: "delivery"; operator: "in" | "notIn"; values: Array<"browser" | "downloadable"> }
  | { field: "price"; operator: "free" | "paid" | "maximum" | "minimum"; value?: number }
  | { field: "sale"; operator: "onSale" | "offSale" | "minimumDiscount"; value?: number }
  | { field: "releaseAgeDays" | "updateAgeDays" | "minimumScore"; operator: "lte" | "gte"; value: number }
  | { field: "creator" | "source" | "state" | "classification"; operator: "in" | "notIn"; values: string[] }
  | { field: "availability"; operator: "available" | "unavailable" }
  | { field: "nsfw"; operator: "exclude" | "only" | "include" }
  | { field: "adultStatus"; operator: "in" | "notIn"; values: AdultStatus[] }
  | { field: "metadataCompleteness"; operator: "strict" | "permissive" };

export type FilterSort = {
  field:
    | "score"
    | "title"
    | "creatorName"
    | "price"
    | "publishedAt"
    | "sourceUpdatedAt"
    | "firstDiscoveredAt"
    | "lastDiscoveredAt"
    | "lastEnrichedAt"
    | "metadataCompleteness";
  direction: "asc" | "desc";
};

export type FilterPreset = {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isSystem: boolean;
  rules: FilterRule[];
  sort: FilterSort[];
  createdAt: string;
  updatedAt: string;
};

export type AdultSettings = {
  id: "default";
  enabled: boolean;
  adultOnly: boolean;
  ageGateRequired: boolean;
  blurCoversByDefault: boolean;
  discreetNotifications: boolean;
  hideExplicitTitles: boolean;
  blockUnknownAgeContent: boolean;
  hardExcludedTerms: string[];
  preferredAdultTags: string[];
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryStatus = {
  healthy: boolean;
  databaseReady: boolean;
  catalogueGames: number;
  enrichedGames: number;
  unseenRecommendations: number;
  savedRecommendations: number;
  watchedGames: number;
  unreadNotifications: number;
  enabledSources: number;
  latestPipelineRun?: {
    id: string;
    trigger: string;
    startedAt: string;
    finishedAt?: string;
    status: "running" | "completed" | "partial" | "failed";
    currentPhase: string;
    usedCachedCatalogue: boolean;
    errors: Array<{ message: string; phase: string }>;
  };
  activeLock?: {
    lockName: string;
    ownerId: string;
    acquiredAt: string;
    expiresAt: string;
  };
  stale: boolean;
  staleReason?: string;
  generatedAt: string;
};


export type GameWatch = {
  id: string;
  gameId: string;
  watchReason: string;
  watchDevlogs: boolean;
  watchPrice: boolean;
  watchMetadata: boolean;
  watchPlatforms: boolean;
  watchSale: boolean;
  enabled: boolean;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  changeEventId: string;
  gameId: string;
  notificationType: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high";
  state: NotificationState;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
};

export type NotificationDigest = {
  id: string;
  digestDate: string;
  timezone: string;
  title: string;
  body: string;
  itemCount: number;
  notificationIds: string[];
  state: "unread" | "read";
  createdAt: string;
  updatedAt: string;
  readAt?: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
  digests: NotificationDigest[];
};

export type PreferenceProfile = {
  id: string;
  profileName: string;
  enabled: boolean;
  preferredPlatforms: Platform[];
  maximumPriceMinor?: number;
  allowFree: boolean;
  allowPaid: boolean;
  allowBrowserGames: boolean;
  excludeNsfw: boolean;
  minimumScore: number;
  createdAt: string;
  updatedAt: string;
};

export type PreferenceWeight = {
  id: string;
  profileId: string;
  featureType: "tag" | "phrase" | "creator" | "platform" | "source";
  featureValue: string;
  weight: number;
  origin: "manual" | "feedback" | "vault" | "default";
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type SettingsResponse = {
  profile: PreferenceProfile;
  weights: PreferenceWeight[];
  presets: FilterPreset[];
};

export type AdvancedFilterDraft = {
  name: string;
  includeAnyTags: string;
  includeAllTags: string;
  excludeTags: string;
  platforms: Platform[];
  delivery: "any" | "browser" | "downloadable";
  priceMode: "any" | "free" | "paid";
  maximumPrice: string;
  saleOnly: boolean;
  metadataMode: "strict" | "permissive";
  sortField: FilterSort["field"];
  sortDirection: FilterSort["direction"];
};

export type FeedbackCandidate = {
  id: string;
  profileId: string;
  featureType: "tag" | "phrase" | "creator" | "platform" | "source";
  featureValue: string;
  observedWeight: number;
  observationCount: number;
  confidence: number;
  status: "candidate" | "approved" | "rejected" | "superseded";
  evidence: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
};

export type FeedbackResponse = {
  profile: PreferenceProfile;
  candidates: FeedbackCandidate[];
  appliedSignals: number;
};

export type SchedulerSettings = {
  id: string;
  enabled: boolean;
  intervalHours: number;
  staleAfterHours: number;
  preferredLocalHour: number;
  timezone: string;
  runOnStartup: boolean;
  lastCheckedAt?: string;
  lastRunAt?: string;
  lastResult: "never" | "not-due" | "disabled" | "locked" | "completed" | "partial" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type SchedulerResponse = {
  settings: SchedulerSettings;
  decision: {
    due: boolean;
    reason: string;
    latestCompletedAt?: string;
    nextEligibleAt?: string;
    checkedAt: string;
  };
};
