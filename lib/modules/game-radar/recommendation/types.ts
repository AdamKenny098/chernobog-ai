export type GameRadarPrimitive = string | number | boolean | null;

export type GameRadarUnknownRecord = {
  [key: string]: unknown;
};

export type GameRadarCatalogEntry = GameRadarUnknownRecord & {
  id?: string;
  title?: string;
  name?: string;
  url?: string;
  href?: string;
  creator?: string;
  author?: string;
  description?: string;
  shortDescription?: string;
  tags?: string[];
  genres?: string[];
  platforms?: string[];
  price?: string;
  source?: string;
  discoveredAt?: string;
  updatedAt?: string;
};

export type GameRadarRecommendationProfile = {
  profileId: string;
  label: string;
  includeTags: string;
  excludeTags: string;
  preferredPlatforms: string;
  limit: number;
  minScore: number;
};

export type GameRadarRecommendationReason = {
  type: "tag-match" | "platform-match" | "metadata" | "catalogue-signal" | "safety-signal";
  label: string;
  weight: number;
};

export type GameRadarRecommendationItem = {
  rank: number;
  id: string;
  title: string;
  url: string;
  creator?: string;
  description?: string;
  tags: string[];
  platforms: string[];
  price?: string;
  score: number;
  reasons: GameRadarRecommendationReason[];
  sourceEntry: GameRadarCatalogEntry;
};

export type GameRadarRecommendationSnapshot = {
  snapshotId: string;
  generatedAt: string;
  profile: GameRadarRecommendationProfile;
  sourceCount: number;
  recommendedCount: number;
  filteredOutCount: number;
  items: GameRadarRecommendationItem[];
};

export type GameRadarRecommendationBuildInput = {
  entries: GameRadarCatalogEntry[];
  profile: GameRadarRecommendationProfile;
  now?: Date;
};
