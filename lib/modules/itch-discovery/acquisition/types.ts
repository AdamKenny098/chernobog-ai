import type {
  ItchGamePlatforms,
  ItchGamePrice,
  ItchRefreshRun,
  ItchSource,
} from "../types";

export type ItchRssSourceDefinition = {
  name: string;
  sourceType: "rss" | "tag-rss" | "sale-rss" | "creator-rss";
  sourceUrl: string;
  enabled: boolean;
  priority: number;
  refreshIntervalHours: number;
};

export type ParsedItchRssEntry = {
  title: string;
  link?: string;
  guid?: string;
  description?: string;
  creatorName?: string;
  imageUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  categories: string[];
};

export type ParsedItchRssFeed = {
  title?: string;
  link?: string;
  description?: string;
  entries: ParsedItchRssEntry[];
};

export type NormalizedItchRssEntry = {
  canonicalUrl: string;
  title: string;
  rawTitle: string;
  creatorName?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  inferredPrice?: ItchGamePrice;
  inferredPlatforms: ItchGamePlatforms;
  publishedAt?: string;
  sourceUpdatedAt?: string;
  sourceGuid?: string;
  categories: string[];
  dedupeKey: string;
};

export type ItchRssFetchResult =
  | {
      status: "fetched";
      sourceUrl: string;
      finalUrl: string;
      fetchedAt: string;
      body: string;
      etag?: string;
      lastModified?: string;
      contentType?: string;
    }
  | {
      status: "not-modified";
      sourceUrl: string;
      finalUrl: string;
      fetchedAt: string;
      etag?: string;
      lastModified?: string;
    };

export type ItchRssSourceRefreshResult = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  status: "fetched" | "not-modified" | "skipped" | "failed";
  entriesScanned: number;
  acceptedEntries: number;
  rejectedEntries: number;
  newGamesAdded: number;
  existingGamesTouched: number;
  discoveriesCreated: number;
  error?: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
  };
};

export type RefreshItchRssDiscoveryOptions = {
  trigger?: "manual" | "schedule" | "startup-stale";
  force?: boolean;
  sourceIds?: string[];
  maxEntriesPerSource?: number;
  requestDelayMs?: number;
  now?: Date;
};

export type RefreshItchRssDiscoveryResult = {
  run: ItchRefreshRun;
  sources: ItchRssSourceRefreshResult[];
};

export type FetchItchRssSource = (
  source: ItchSource,
) => Promise<ItchRssFetchResult>;

export type ItchProjectPageFetchResult =
  | {
      status: "fetched";
      sourceUrl: string;
      finalUrl: string;
      fetchedAt: string;
      body: string;
      contentType?: string;
      etag?: string;
      lastModified?: string;
    }
  | {
      status: "unavailable";
      sourceUrl: string;
      finalUrl: string;
      fetchedAt: string;
      statusCode: 404 | 410;
    };

export type FetchItchProjectPage = (
  canonicalUrl: string,
) => Promise<ItchProjectPageFetchResult>;

export type ItchProjectEnrichmentItemResult = {
  gameId: string;
  canonicalUrl: string;
  title: string;
  status: "enriched" | "unchanged" | "partial" | "unavailable" | "failed";
  metadataHash?: string;
  completenessScore?: number;
  snapshotCreated: boolean;
  warnings: string[];
  error?: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
  };
};

export type EnrichItchGamesOptions = {
  gameIds?: string[];
  limit?: number;
  staleAfterHours?: number;
  includeFailed?: boolean;
  requestDelayMs?: number;
  now?: Date;
};

export type EnrichItchGamesResult = {
  attempted: number;
  enriched: number;
  partial: number;
  unchanged: number;
  unavailable: number;
  failed: number;
  snapshotsCreated: number;
  startedAt: string;
  finishedAt: string;
  items: ItchProjectEnrichmentItemResult[];
};
