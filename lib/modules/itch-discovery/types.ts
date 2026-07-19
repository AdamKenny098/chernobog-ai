import type {
  ItchAdultEvidence,
  ItchAdultStatus,
  ItchChangeConfidence,
  ItchChangeType,
  ItchClassification,
  ItchDevlogPostType,
  ItchFeedbackCandidateStatus,
  ItchFilterMetadataMode,
  ItchFilterRule,
  ItchFilterSort,
  ItchMetadataStatus,
  ItchMaintenanceOperation,
  ItchMaintenanceStatus,
  ItchNotificationPriority,
  ItchNotificationState,
  ItchPlatform,
  ItchPipelinePhase,
  ItchRecommendationScoreVersion,
  ItchRecommendationState,
  ItchRefreshStatus,
  ItchRefreshTrigger,
  ItchSchedulerRunResult,
  ItchSignalType,
  ItchTagCategory,
  ItchTaxonomyCategoryId,
  ItchTaxonomySafetyRole,
  ItchUncategorisedTagStatus,
  ItchTagResolution,
  ItchSourceType,
  ItchWatchReason,
  ItchWeightFeatureType,
  ItchWeightOrigin,
  RecommendationScoreBreakdown,
} from "./contract";

export type ItchPriceKind = "free" | "paid" | "name-your-own-price" | "unknown";

export type ItchGamePrice = {
  kind: ItchPriceKind;
  amountMinor?: number;
  currency?: string;
  displayText?: string;
  isFree: boolean;
  isOnSale: boolean;
  saleText?: string;
};

export type ItchGamePlatforms = Record<ItchPlatform, boolean>;

export type ItchGame = {
  id: string;
  canonicalUrl: string;
  title: string;
  rawTitle?: string;
  creatorName?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  tags: string[];
  classification: ItchClassification;
  price: ItchGamePrice;
  platforms: ItchGamePlatforms;
  isNsfw: boolean;
  adultStatus?: ItchAdultStatus;
  adultConfidence?: number;
  adultReasons?: string[];
  adultContentTags?: string[];
  publishedAt?: string;
  sourceUpdatedAt?: string;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  lastEnrichedAt?: string;
  metadataStatus: ItchMetadataStatus;
  metadataHash?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchGameInput = Omit<
  ItchGame,
  | "id"
  | "tags"
  | "createdAt"
  | "updatedAt"
  | "firstDiscoveredAt"
  | "lastDiscoveredAt"
> & {
  id?: string;
  tags?: string[];
  firstDiscoveredAt?: string;
  lastDiscoveredAt?: string;
};

export type ItchSource = {
  id: string;
  name: string;
  sourceType: ItchSourceType;
  sourceUrl: string;
  enabled: boolean;
  priority: number;
  refreshIntervalHours: number;
  etag?: string;
  lastModified?: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchSourceInput = Omit<
  ItchSource,
  | "id"
  | "etag"
  | "lastModified"
  | "lastAttemptAt"
  | "lastSuccessAt"
  | "lastError"
  | "createdAt"
  | "updatedAt"
> & {
  id?: string;
};

export type ItchDiscovery = {
  id: string;
  gameId: string;
  sourceId: string;
  discoveredAt: string;
  sourcePosition?: number;
  sourceTitle?: string;
  sourceGuid?: string;
  dedupeKey: string;
};

export type CreateItchDiscoveryInput = Omit<ItchDiscovery, "id"> & {
  id?: string;
};


export type ItchAdultSettings = {
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

export type ItchAdultClassificationRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  gamesScanned: number;
  adult: number;
  nonAdult: number;
  unknown: number;
  blocked: number;
};

export type ClassifyItchAdultCatalogueResult = {
  run: ItchAdultClassificationRun;
  changed: number;
};

export type ItchPreferenceProfile = {
  id: string;
  profileName: string;
  enabled: boolean;
  preferredPlatforms: ItchPlatform[];
  maximumPriceMinor?: number;
  allowFree: boolean;
  allowPaid: boolean;
  allowBrowserGames: boolean;
  excludeNsfw: boolean;
  minimumScore: number;
  createdAt: string;
  updatedAt: string;
};

export type ItchPreferenceWeight = {
  id: string;
  profileId: string;
  featureType: ItchWeightFeatureType;
  featureValue: string;
  weight: number;
  origin: ItchWeightOrigin;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type ItchRecommendation = {
  id: string;
  gameId: string;
  profileId: string;
  batchDate: string;
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  reason: string;
  state: ItchRecommendationState;
  recommendedAt: string;
  firstSeenAt?: string;
  lastActionAt?: string;
  rankPosition?: number;
  scoreVersion: ItchRecommendationScoreVersion;
};

export type UpsertItchRecommendationInput = Omit<
  ItchRecommendation,
  "id" | "firstSeenAt" | "lastActionAt" | "scoreVersion"
> & {
  id?: string;
  firstSeenAt?: string;
  lastActionAt?: string;
  scoreVersion?: ItchRecommendationScoreVersion;
};

export type ItchUserSignal = {
  id: string;
  gameId: string;
  signalType: ItchSignalType;
  signalValue?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type ItchRefreshRun = {
  id: string;
  trigger: ItchRefreshTrigger;
  startedAt: string;
  finishedAt?: string;
  status: ItchRefreshStatus;
  sourcesAttempted: number;
  sourcesSucceeded: number;
  entriesScanned: number;
  uniqueGamesFound: number;
  newGamesAdded: number;
  gamesUpdated: number;
  gamesEnriched: number;
  gamesRejected: number;
  recommendationsCreated: number;
  errors: Array<Record<string, unknown>>;
};

export type FinishItchRefreshRunInput = Partial<
  Omit<ItchRefreshRun, "id" | "trigger" | "startedAt">
> & {
  status: Exclude<ItchRefreshStatus, "running">;
};

export type ItchGameWatch = {
  id: string;
  gameId: string;
  watchReason: ItchWatchReason;
  watchDevlogs: boolean;
  watchPrice: boolean;
  watchMetadata: boolean;
  watchPlatforms: boolean;
  watchSale: boolean;
  enabled: boolean;
  lastCheckedAt?: string;
  devlogFeedUrl?: string;
  devlogEtag?: string;
  devlogLastModified?: string;
  devlogInitializedAt?: string;
  lastSnapshotId?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchGameWatchInput = Omit<
  ItchGameWatch,
  | "id"
  | "lastCheckedAt"
  | "devlogEtag"
  | "devlogLastModified"
  | "devlogInitializedAt"
  | "lastSnapshotId"
  | "lastSuccessAt"
  | "lastError"
  | "lastErrorAt"
  | "createdAt"
  | "updatedAt"
> & {
  id?: string;
  lastCheckedAt?: string;
  devlogEtag?: string;
  devlogLastModified?: string;
  devlogInitializedAt?: string;
  lastSnapshotId?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastErrorAt?: string;
};

export type ItchDevlogEntry = {
  id: string;
  gameId: string;
  entryGuid: string;
  entryUrl: string;
  title: string;
  summary?: string;
  publishedAt?: string;
  postType: ItchDevlogPostType;
  contentHash: string;
  firstSeenAt: string;
};

export type ItchGameSnapshot = {
  id: string;
  gameId: string;
  capturedAt: string;
  metadataHash: string;
  priceText?: string;
  isFree: boolean;
  isOnSale: boolean;
  saleText?: string;
  platforms: ItchGamePlatforms;
  tags: string[];
  title: string;
  shortDescriptionHash?: string;
  availability: boolean;
};

export type ItchGameChangeEvent = {
  id: string;
  gameId: string;
  type: ItchChangeType;
  confidence: ItchChangeConfidence;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  sourceUrl?: string;
  detectedAt: string;
  dedupeKey: string;
};

export type CreateItchGameChangeEventInput = Omit<
  ItchGameChangeEvent,
  "id" | "detectedAt"
> & {
  id?: string;
  detectedAt?: string;
};

export type ItchNotification = {
  id: string;
  changeEventId: string;
  gameId: string;
  notificationType: string;
  title: string;
  body: string;
  priority: ItchNotificationPriority;
  state: ItchNotificationState;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
};

export type CreateItchNotificationInput = Omit<
  ItchNotification,
  "id" | "state" | "createdAt" | "readAt" | "dismissedAt"
> & {
  id?: string;
};

export type ItchFilterPreset = {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isSystem: boolean;
  rules: ItchFilterRule[];
  sort: ItchFilterSort[];
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchFilterPresetInput = Omit<
  ItchFilterPreset,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export type ItchFilterCandidateSource = {
  id: string;
  name: string;
  sourceType: ItchSourceType;
  sourceUrl: string;
  priority: number;
};

export type ItchFilterCandidate = {
  game: ItchGame;
  sources: ItchFilterCandidateSource[];
  recommendation?: Pick<
    ItchRecommendation,
    "id" | "profileId" | "score" | "state" | "recommendedAt"
  >;
  metadataCompleteness: number;
  missingMetadataFields: string[];
  discountPercent?: number;
};

export type ItchFilterQuery = {
  rules: ItchFilterRule[];
  sort?: ItchFilterSort[];
  profileId?: string;
  limit?: number;
  offset?: number;
  now?: string;
};

export type ItchFilterRuleOutcome = "pass" | "fail" | "unknown";

export type ItchFilterRuleEvaluation = {
  rule: ItchFilterRule;
  outcome: ItchFilterRuleOutcome;
  explanation: string;
  missingFields: string[];
};

export type ItchFilteredGame = {
  game: ItchGame;
  sources: ItchFilterCandidateSource[];
  recommendationScore?: number;
  recommendationState: ItchRecommendationState;
  metadataCompleteness: number;
  missingMetadataFields: string[];
  discountPercent?: number;
  matchedReasons: string[];
  warnings: string[];
  evaluations: ItchFilterRuleEvaluation[];
};

export type ItchFilterExecutionResult = {
  metadataMode: ItchFilterMetadataMode;
  normalizedRules: ItchFilterRule[];
  sort: ItchFilterSort[];
  totalCandidates: number;
  totalMatched: number;
  totalReturned: number;
  offset: number;
  limit: number;
  rejectedByRule: Record<string, number>;
  items: ItchFilteredGame[];
};

export type ExecuteItchFilterPresetInput = {
  presetId?: string;
  presetName?: string;
  profileId?: string;
  limit?: number;
  offset?: number;
  now?: string;
};

export type ItchTagAlias = {
  canonicalTag: string;
  alias: string;
  source: "system" | "manual" | "learned";
};

export const ITCH_ENRICHMENT_FIELDS = [
  "title",
  "creatorName",
  "shortDescription",
  "coverImageUrl",
  "classification",
  "price",
  "platforms",
  "tags",
  "isNsfw",
  "publishedAt",
  "sourceUpdatedAt",
] as const;

export type ItchEnrichmentField =
  (typeof ITCH_ENRICHMENT_FIELDS)[number];

export type ItchGameEnrichmentData = {
  canonicalUrl: string;
  title: string;
  rawTitle?: string;
  creatorName?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  classification: ItchClassification;
  price: ItchGamePrice;
  platforms: ItchGamePlatforms;
  tags: string[];
  isNsfw: boolean;
  publishedAt?: string;
  sourceUpdatedAt?: string;
  fetchedAt: string;
  metadataHash: string;
  completenessScore: number;
  metadataStatus: Extract<ItchMetadataStatus, "partial" | "enriched">;
  detectedFields: ItchEnrichmentField[];
  warnings: string[];
};


export type ItchCanonicalTag = {
  tag: string;
  displayName: string;
  category: ItchTagCategory;
  isFilterable: boolean;
  isRankable: boolean;
  source: "system" | "manual" | "discovered";
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchCanonicalTagInput = Omit<
  ItchCanonicalTag,
  "createdAt" | "updatedAt"
>;

export type ItchTaxonomyCategory = {
  id: ItchTaxonomyCategoryId;
  displayName: string;
  description: string;
  sortOrder: number;
  visibleInFilters: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchTaxonomyCategoryInput = Omit<
  ItchTaxonomyCategory,
  "createdAt" | "updatedAt"
>;

export type ItchTaxonomyEntry = {
  tag: string;
  categoryId: ItchTaxonomyCategoryId;
  adultEvidence: ItchAdultEvidence;
  safetyRole: ItchTaxonomySafetyRole;
  description: string;
  visibleInFilters: boolean;
  enabled: boolean;
  impliedTags: string[];
  createdAt: string;
  updatedAt: string;
};

export type UpsertItchTaxonomyEntryInput = Omit<
  ItchTaxonomyEntry,
  "createdAt" | "updatedAt"
>;

export type ItchUncategorisedTag = {
  canonicalTag: string;
  occurrenceCount: number;
  gameCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: ItchUncategorisedTagStatus;
  suggestedCategoryId?: ItchTaxonomyCategoryId;
  notes?: string;
};

export type ItchTaxonomyReclassificationRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  gamesScanned: number;
  gamesWithStructuredTags: number;
  tagsScanned: number;
  taxonomyMatches: number;
  uncategorisedTags: number;
  impliedTagsAdded: number;
  aliasesSeeded: number;
};

export type ReclassifyItchAdultTaxonomyResult = {
  run: ItchTaxonomyReclassificationRun;
  categoryCount: number;
  taxonomyEntryCount: number;
  uncategorised: ItchUncategorisedTag[];
};

export type ItchTaxonomySnapshot = {
  categories: Array<
    ItchTaxonomyCategory & {
      entries: Array<ItchTaxonomyEntry & { displayName: string }>;
    }
  >;
  uncategorised: ItchUncategorisedTag[];
  counts: {
    categories: number;
    entries: number;
    uncategorised: number;
    filterableEntries: number;
    reviewEntries: number;
    blockedEntries: number;
  };
};

export type ItchRawTagObservation = {
  gameId: string;
  rawTag: string;
  normalizedKey?: string;
  canonicalTag?: string;
  source: string;
  confidence: number;
  resolution: ItchTagResolution;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ObserveItchRawTagInput = Omit<
  ItchRawTagObservation,
  "firstSeenAt" | "lastSeenAt"
> & {
  observedAt?: string;
};

export type ItchTagNormalization = {
  rawTag: string;
  normalizedKey: string;
  canonicalTag?: string;
  resolution: ItchTagResolution;
  aliasSource?: ItchTagAlias["source"];
  changed: boolean;
  reason?: string;
};

export type ItchTagNormalizationBatch = {
  items: ItchTagNormalization[];
  canonicalTags: string[];
  aliasHits: number;
  generatedTags: number;
  rejectedTags: number;
  collisionsRemoved: number;
};

export type NormalizeExistingItchTagsResult = {
  gamesScanned: number;
  gamesChanged: number;
  rawTagsObserved: number;
  canonicalTagsBefore: number;
  canonicalTagsAfter: number;
  canonicalVocabularySize: number;
  aliasHits: number;
  generatedTags: number;
  rejectedTags: number;
  collisionsRemoved: number;
  snapshotsChanged: number;
  preferenceWeightsChanged: number;
  filterPresetsChanged: number;
};


export type ItchRecommendationBatch = {
  id: string;
  profileId: string;
  presetId?: string;
  batchDate: string;
  timezone: string;
  scoreVersion: ItchRecommendationScoreVersion;
  candidateCount: number;
  eligibleCount: number;
  selectedCount: number;
  minimumScore: number;
  batchSize: number;
  generatedAt: string;
  config: Record<string, unknown>;
};

export type ItchRankedGame = {
  game: ItchGame;
  sources: ItchFilterCandidateSource[];
  score: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  reason: string;
  rankPosition: number;
  eligible: boolean;
  exclusionReasons: string[];
  matchedFeatures: string[];
  existingRecommendation?: ItchRecommendation;
};

export type BuildItchRecommendationBatchInput = {
  profileId?: string;
  profileName?: string;
  presetId?: string;
  presetName?: string;
  batchSize?: number;
  batchDate?: string;
  timezone?: string;
  now?: string;
};

export type BuildItchRecommendationBatchResult = {
  batch: ItchRecommendationBatch;
  alreadyBuilt: boolean;
  profile: ItchPreferenceProfile;
  preset: ItchFilterPreset;
  totalCandidates: number;
  eligibleCandidates: number;
  scoredCandidates: number;
  selected: ItchRankedGame[];
  carriedUnseen: number;
  updatedExisting: number;
  rejectedByMinimumScore: number;
  excludedByRanking: number;
};

export type ItchUpdateWatchRun = {
  id: string;
  trigger: ItchRefreshTrigger;
  startedAt: string;
  finishedAt?: string;
  status: ItchRefreshStatus;
  watchesAttempted: number;
  watchesSucceeded: number;
  devlogEntriesScanned: number;
  devlogEntriesAdded: number;
  snapshotsCompared: number;
  changeEventsCreated: number;
  notificationsCreated: number;
  errors: Array<Record<string, unknown>>;
};

export type ItchNotificationDigest = {
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

export type ItchDevlogFeedItem = {
  entryGuid: string;
  entryUrl: string;
  title: string;
  summary?: string;
  publishedAt?: string;
  postType: ItchDevlogPostType;
  contentHash: string;
};

export type ItchWatchRefreshItemResult = {
  watchId: string;
  gameId: string;
  title: string;
  status: "checked" | "not-modified" | "baseline" | "no-devlog-feed" | "failed";
  historicalDevlogsStored: number;
  newDevlogs: number;
  snapshotsCompared: number;
  changeEventsCreated: number;
  notificationsCreated: number;
  error?: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
  };
};

export type RefreshItchGameUpdatesOptions = {
  trigger?: ItchRefreshTrigger;
  gameIds?: string[];
  limit?: number;
  requestDelayMs?: number;
  enrichMetadata?: boolean;
  metadataStaleAfterHours?: number;
  now?: Date;
};

export type RefreshItchGameUpdatesResult = {
  run: ItchUpdateWatchRun;
  items: ItchWatchRefreshItemResult[];
  automaticWatchesCreated: number;
};

export type BuildItchNotificationDigestInput = {
  digestDate?: string;
  timezone?: string;
  now?: string;
};

export type BuildItchNotificationDigestResult = {
  digest: ItchNotificationDigest;
  alreadyBuilt: boolean;
  notifications: ItchNotification[];
};



export type ItchPipelineRun = {
  id: string;
  trigger: ItchRefreshTrigger;
  startedAt: string;
  finishedAt?: string;
  status: ItchRefreshStatus;
  currentPhase: ItchPipelinePhase;
  rssRefreshRunId?: string;
  updateWatchRunId?: string;
  recommendationBatchId?: string;
  notificationDigestId?: string;
  metrics: Record<string, unknown>;
  errors: ItchPipelineError[];
  usedCachedCatalogue: boolean;
};

export type ItchPipelineError = {
  phase: ItchPipelinePhase;
  name: string;
  message: string;
  code?: string;
  recoverable: boolean;
};

export type ItchPipelinePhaseResult<T = unknown> = {
  phase: ItchPipelinePhase;
  status: "completed" | "partial" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string;
  data?: T;
  error?: ItchPipelineError;
};

export type RunItchDiscoveryPipelineInput = {
  trigger?: ItchRefreshTrigger;
  forceDiscovery?: boolean;
  rssMaxEntriesPerSource?: number;
  rssRequestDelayMs?: number;
  enrichLimit?: number;
  enrichStaleAfterHours?: number;
  enrichRequestDelayMs?: number;
  updateLimit?: number;
  updateRequestDelayMs?: number;
  batchSize?: number;
  profileId?: string;
  profileName?: string;
  presetId?: string;
  presetName?: string;
  batchDate?: string;
  digestDate?: string;
  timezone?: string;
  skipDiscovery?: boolean;
  skipEnrichment?: boolean;
  skipNormalization?: boolean;
  skipRanking?: boolean;
  skipUpdates?: boolean;
  skipDigest?: boolean;
  now?: Date;
};

export type RunItchDiscoveryPipelineResult = {
  run: ItchPipelineRun;
  lockAcquired: boolean;
  phases: ItchPipelinePhaseResult[];
  cachedCatalogueAvailable: boolean;
};

export type ItchDiscoveryStatus = {
  healthy: boolean;
  databaseReady: boolean;
  catalogueGames: number;
  enrichedGames: number;
  unseenRecommendations: number;
  savedRecommendations: number;
  watchedGames: number;
  unreadNotifications: number;
  enabledSources: number;
  latestPipelineRun?: ItchPipelineRun;
  latestRssRefresh?: ItchRefreshRun;
  activeLock?: {
    lockName: string;
    ownerId: string;
    acquiredAt: string;
    expiresAt: string;
  };
  stale: boolean;
  staleReason?: string;
  scheduler?: ItchSchedulerSettings;
  generatedAt: string;
};

export type ItchFeedItem = {
  recommendation: ItchRecommendation;
  game: ItchGame;
  sources: ItchFilterCandidateSource[];
  watched: boolean;
};

export type GetItchFeedInput = {
  profileId?: string;
  state?: ItchRecommendationState;
  limit?: number;
  offset?: number;
};

export type GetItchFeedResult = {
  profileId: string;
  state: ItchRecommendationState;
  total: number;
  limit: number;
  offset: number;
  items: ItchFeedItem[];
  cached: true;
  generatedAt: string;
};

export type RecordItchRecommendationActionInput = {
  recommendationId: string;
  state: ItchRecommendationState;
  signalType?: ItchSignalType;
  signalValue?: number;
  metadata?: Record<string, unknown>;
};

export type RecordItchRecommendationActionResult = {
  recommendation: ItchRecommendation;
  signal?: ItchUserSignal;
  signalCreated?: boolean;
  learning?: ApplyItchFeedbackLearningResult;
  watch?: ItchGameWatch;
};


export type ItchFeedbackLearningRun = {
  id: string;
  profileId: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "partial" | "failed";
  signalsScanned: number;
  signalsApplied: number;
  weightsChanged: number;
  candidatesCreated: number;
  summary: Record<string, unknown>;
  errors: Array<Record<string, unknown>>;
};

export type ItchFeedbackCandidate = {
  id: string;
  profileId: string;
  featureType: ItchWeightFeatureType;
  featureValue: string;
  observedWeight: number;
  observationCount: number;
  confidence: number;
  status: ItchFeedbackCandidateStatus;
  evidence: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
};

export type ApplyItchFeedbackLearningInput = {
  profileId?: string;
  profileName?: string;
  signalIds?: string[];
  limit?: number;
  now?: string;
};

export type ApplyItchFeedbackLearningResult = {
  run: ItchFeedbackLearningRun;
  appliedSignalIds: string[];
  changedWeights: ItchPreferenceWeight[];
  candidates: ItchFeedbackCandidate[];
};

export type RecordItchPreferenceSignalInput = {
  gameId?: string;
  recommendationId?: string;
  profileId?: string;
  signalType: Extract<ItchSignalType, "more_like_this" | "less_like_this">;
  signalValue?: number;
  metadata?: Record<string, unknown>;
};

export type RecordItchPreferenceSignalResult = {
  game: ItchGame;
  recommendation?: ItchRecommendation;
  signal: ItchUserSignal;
  signalCreated: boolean;
  learning?: ApplyItchFeedbackLearningResult;
};

export type ItchSchedulerSettings = {
  id: string;
  enabled: boolean;
  intervalHours: number;
  staleAfterHours: number;
  preferredLocalHour: number;
  timezone: string;
  runOnStartup: boolean;
  lastCheckedAt?: string;
  lastRunAt?: string;
  lastResult: ItchSchedulerRunResult;
  createdAt: string;
  updatedAt: string;
};

export type ItchScheduleDecision = {
  due: boolean;
  reason: string;
  settings: ItchSchedulerSettings;
  latestCompletedAt?: string;
  nextEligibleAt?: string;
  checkedAt: string;
};

export type RunItchScheduledRefreshInput = {
  mode?: "schedule" | "startup-stale";
  force?: boolean;
  now?: Date;
};

export type RunItchScheduledRefreshResult = {
  decision: ItchScheduleDecision;
  executed: boolean;
  pipeline?: RunItchDiscoveryPipelineResult;
};

export type ItchDiscoveryCommand =
  | { type: "open-radar" }
  | { type: "status" }
  | { type: "refresh"; force: boolean }
  | { type: "show-feed"; state: ItchRecommendationState }
  | { type: "show-updates" }
  | { type: "show-filter"; query: "free-horror" | "recently-updated" | "on-sale" | "under-price"; maximumPriceMinor?: number }
  | { type: "game-action"; action: "saved" | "hidden" | "played"; title: string }
  | { type: "watch"; enabled: boolean; title: string }
  | { type: "feedback"; signalType: "more_like_this" | "less_like_this"; title: string }
  | { type: "explain"; title: string };

export type ItchDiscoveryCommandResult = {
  handled: boolean;
  ok: boolean;
  message: string;
  navigationPath?: string;
  data?: Record<string, unknown>;
};


export type ItchMaintenanceRun = {
  id: string;
  operation: ItchMaintenanceOperation;
  status: ItchMaintenanceStatus;
  startedAt: string;
  finishedAt?: string;
  details: Record<string, unknown>;
  errorMessage?: string;
};

export type FinishItchMaintenanceRunInput = {
  status: Exclude<ItchMaintenanceStatus, "running">;
  finishedAt?: string;
  details?: Record<string, unknown>;
  errorMessage?: string;
};

export type ItchDatabaseBackupInfo = {
  path: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
};

export type ItchDatabaseBackupResult = {
  backup: ItchDatabaseBackupInfo;
  manifestPath: string;
  pruned: string[];
};

export type ItchDatabaseRestoreResult = {
  restoredFrom: string;
  databasePath: string;
  preRestoreBackup: string;
  schemaVersion: number;
  restoredAt: string;
};

export type ItchRuntimeRecoveryResult = {
  expiredLocksRemoved: number;
  pipelineRunsRecovered: number;
  refreshRunsRecovered: number;
  updateRunsRecovered: number;
  feedbackRunsRecovered: number;
  recoveredAt: string;
};

export type ItchDiagnosticCheck = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  details?: Record<string, unknown>;
};

export type ItchDiagnosticsReport = {
  status: "healthy" | "degraded" | "unhealthy";
  checks: ItchDiagnosticCheck[];
  databasePath: string;
  schemaVersion: number;
  latestSchemaVersion: number;
  tableCount: number;
  generatedAt: string;
};
