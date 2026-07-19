import type { ItchFilterRule, ItchFilterSort } from "../contract";

export const ADULT_PREFERENCE_RULE_STATES = [
  "neutral",
  "prefer",
  "require",
  "exclude",
] as const;

export type AdultPreferenceRuleState =
  (typeof ADULT_PREFERENCE_RULE_STATES)[number];

export type AdultPreferenceProfileSeedRule = {
  tag: string;
  state: AdultPreferenceRuleState;
  weight?: number;
  categoryId?: string;
  note?: string;
};

export type AdultPreferenceProfileSeed = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  enabled: boolean;
  metadataMode: "strict" | "permissive";
  defaultSort: ItchFilterSort[];
  rules: AdultPreferenceProfileSeedRule[];
};

export const ADULT_PREFERENCE_PROFILE_SEEDS: AdultPreferenceProfileSeed[] = [
  {
    id: "adult-profile-main",
    name: "Main Adult Profile",
    description:
      "Balanced NSFW discovery with a bias toward story-rich adult visual novels, RPGs, simulations and playable Windows/browser titles.",
    isDefault: true,
    enabled: true,
    metadataMode: "permissive",
    defaultSort: [
      { field: "score", direction: "desc" },
      { field: "lastDiscoveredAt", direction: "desc" },
    ],
    rules: [
      { tag: "adult", state: "require", categoryId: "adult-intensity" },
      { tag: "nsfw", state: "prefer", weight: 4, categoryId: "adult-intensity" },
      { tag: "erotic", state: "prefer", weight: 3, categoryId: "adult-intensity" },
      { tag: "visual-novel", state: "prefer", weight: 3, categoryId: "game-format" },
      { tag: "role-playing", state: "prefer", weight: 2, categoryId: "game-format" },
      { tag: "simulation", state: "prefer", weight: 2, categoryId: "game-format" },
      { tag: "adventure", state: "prefer", weight: 1.5, categoryId: "game-format" },
      { tag: "story-rich", state: "prefer", weight: 2, categoryId: "narrative" },
      { tag: "fantasy", state: "prefer", weight: 1.5, categoryId: "setting" },
      { tag: "sci-fi", state: "prefer", weight: 1.25, categoryId: "setting" },
      { tag: "windows", state: "prefer", weight: 1.5, categoryId: "platform" },
      { tag: "android", state: "prefer", weight: 1.25, categoryId: "platform" },
      { tag: "browser", state: "prefer", weight: 1, categoryId: "platform" },
      { tag: "macos", state: "neutral", categoryId: "platform" },
      { tag: "linux", state: "neutral", categoryId: "platform" },
      { tag: "free", state: "prefer", weight: 1, categoryId: "commercial" },
      { tag: "name-your-own-price", state: "prefer", weight: 0.75, categoryId: "commercial" },
      { tag: "complete", state: "prefer", weight: 1.25, categoryId: "development-status" },
      { tag: "demo", state: "neutral", categoryId: "commercial" },
      { tag: "asset-pack", state: "exclude", categoryId: "safety" },
      { tag: "soundtrack", state: "exclude", categoryId: "safety" },
      { tag: "comic", state: "exclude", categoryId: "safety" },
    ],
  },
  {
    id: "adult-profile-story-focused",
    name: "Story Focused",
    description:
      "Adult games where narrative structure, character routes and relationship content matter more than pure mechanics.",
    isDefault: false,
    enabled: true,
    metadataMode: "permissive",
    defaultSort: [
      { field: "score", direction: "desc" },
      { field: "sourceUpdatedAt", direction: "desc" },
    ],
    rules: [
      { tag: "adult", state: "require", categoryId: "adult-intensity" },
      { tag: "visual-novel", state: "prefer", weight: 4, categoryId: "game-format" },
      { tag: "dating-sim", state: "prefer", weight: 3, categoryId: "game-format" },
      { tag: "interactive-fiction", state: "prefer", weight: 2.5, categoryId: "game-format" },
      { tag: "story-rich", state: "prefer", weight: 4, categoryId: "narrative" },
      { tag: "romance", state: "prefer", weight: 2.5, categoryId: "relationship" },
      { tag: "choices-matter", state: "prefer", weight: 2, categoryId: "gameplay" },
      { tag: "branching-story", state: "prefer", weight: 1.75, categoryId: "gameplay" },
      { tag: "multiple-endings", state: "prefer", weight: 1.5, categoryId: "relationship" },
      { tag: "multiple-routes", state: "prefer", weight: 1.5, categoryId: "relationship" },
      { tag: "female-protagonist", state: "neutral", categoryId: "protagonist" },
      { tag: "platformer", state: "exclude", categoryId: "game-format" },
      { tag: "shooter", state: "exclude", categoryId: "game-format" },
    ],
  },
  {
    id: "adult-profile-gameplay-focused",
    name: "Gameplay Focused",
    description:
      "Adult games that still have a meaningful RPG, simulation, management or adventure loop.",
    isDefault: false,
    enabled: true,
    metadataMode: "permissive",
    defaultSort: [
      { field: "score", direction: "desc" },
      { field: "metadataCompleteness", direction: "desc" },
    ],
    rules: [
      { tag: "adult", state: "require", categoryId: "adult-intensity" },
      { tag: "role-playing", state: "prefer", weight: 4, categoryId: "game-format" },
      { tag: "simulation", state: "prefer", weight: 3, categoryId: "game-format" },
      { tag: "management", state: "prefer", weight: 2, categoryId: "gameplay" },
      { tag: "adventure", state: "prefer", weight: 2, categoryId: "game-format" },
      { tag: "strategy", state: "prefer", weight: 1.5, categoryId: "gameplay" },
      { tag: "dungeon-crawler", state: "prefer", weight: 1.5, categoryId: "gameplay" },
      { tag: "life-sim", state: "prefer", weight: 1.5, categoryId: "game-format" },
      { tag: "sandbox", state: "prefer", weight: 1.25, categoryId: "game-format" },
      { tag: "card-game", state: "prefer", weight: 0.75, categoryId: "game-format" },
      { tag: "character-creator", state: "prefer", weight: 1, categoryId: "game-format" },
      { tag: "visual-novel", state: "neutral", categoryId: "game-format" },
      { tag: "kinetic-novel", state: "exclude", categoryId: "game-format" },
    ],
  },
  {
    id: "adult-profile-quick-browser",
    name: "Quick Browser Games",
    description:
      "Fast NSFW discovery for browser-playable games, short sessions and free projects.",
    isDefault: false,
    enabled: true,
    metadataMode: "permissive",
    defaultSort: [
      { field: "lastDiscoveredAt", direction: "desc" },
      { field: "score", direction: "desc" },
    ],
    rules: [
      { tag: "adult", state: "require", categoryId: "adult-intensity" },
      { tag: "browser", state: "require", categoryId: "platform" },
      { tag: "free", state: "prefer", weight: 3, categoryId: "commercial" },
      { tag: "short", state: "prefer", weight: 2, categoryId: "session-length" },
      { tag: "html5", state: "prefer", weight: 1.5, categoryId: "engine" },
      { tag: "demo", state: "prefer", weight: 0.75, categoryId: "commercial" },
      { tag: "name-your-own-price", state: "prefer", weight: 0.75, categoryId: "commercial" },
      { tag: "downloadable", state: "exclude", categoryId: "platform" },
    ],
  },
  {
    id: "adult-profile-review",
    name: "Private Review",
    description:
      "A strict profile for checking uncertain, newly imported or weakly classified adult records before they become normal recommendations.",
    isDefault: false,
    enabled: true,
    metadataMode: "strict",
    defaultSort: [
      { field: "lastDiscoveredAt", direction: "desc" },
      { field: "metadataCompleteness", direction: "asc" },
    ],
    rules: [
      { tag: "adult", state: "prefer", weight: 1, categoryId: "adult-intensity" },
      { tag: "unknown-adult-status", state: "require", categoryId: "safety" },
      { tag: "requires-review", state: "prefer", weight: 2, categoryId: "safety" },
      { tag: "metadata-conflict", state: "prefer", weight: 1.5, categoryId: "safety" },
      { tag: "unknown-classification", state: "prefer", weight: 1.5, categoryId: "safety" },
      { tag: "blocked", state: "exclude", categoryId: "safety" },
    ],
  },
];

export const ADULT_FILTER_PRESET_SEEDS: Array<{
  name: string;
  description: string;
  rules: ItchFilterRule[];
  sort: ItchFilterSort[];
  isDefault?: boolean;
}> = [
  {
    name: "All Adult Games",
    description: "Every accepted adult game in the local catalogue.",
    isDefault: false,
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "availability", operator: "available" },
      { field: "classification", operator: "in", values: ["game"] },
    ],
    sort: [
      { field: "lastDiscoveredAt", direction: "desc" },
      { field: "title", direction: "asc" },
    ],
  },
  {
    name: "Adult Visual Novels",
    description: "Accepted adult visual novels, dating sims and interactive fiction.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "tag", operator: "includesAny", values: ["visual-novel", "dating-sim", "interactive-fiction"] },
      { field: "classification", operator: "in", values: ["game"] },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Adult RPGs and Sims",
    description: "Adult role-playing, simulation, management and adventure games.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "tag", operator: "includesAny", values: ["role-playing", "simulation", "management", "adventure"] },
      { field: "classification", operator: "in", values: ["game"] },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Browser Adult Games",
    description: "Adult games that can be played in the browser.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "delivery", operator: "in", values: ["browser"] },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "lastDiscoveredAt", direction: "desc" }],
  },
  {
    name: "Windows Adult Downloads",
    description: "Adult games with confirmed Windows support.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "platform", operator: "includesAny", values: ["windows"] },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Free Adult Games",
    description: "Free accepted adult games.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "price", operator: "free" },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "lastDiscoveredAt", direction: "desc" }],
  },
  {
    name: "Recently Updated Adult Games",
    description: "Adult games updated recently or seen recently by the catalogue.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["adult"] },
      { field: "updateAgeDays", operator: "lte", value: 120 },
      { field: "availability", operator: "available" },
    ],
    sort: [{ field: "sourceUpdatedAt", direction: "desc" }],
  },
  {
    name: "Needs Adult Review",
    description: "Unclear, uncategorised or review-flagged records that should not enter normal recommendations yet.",
    rules: [
      { field: "adultStatus", operator: "in", values: ["unknown"] },
      { field: "availability", operator: "available" },
    ],
    sort: [
      { field: "lastDiscoveredAt", direction: "desc" },
      { field: "metadataCompleteness", direction: "asc" },
    ],
  },
];
