import type { ItchRssSourceDefinition } from "./types";

export const LEGACY_GENERAL_ITCH_RSS_SOURCES = [
  { name: "Featured Games", sourceUrl: "https://itch.io/feed/featured.xml" },
  { name: "Newest Games", sourceUrl: "https://itch.io/feed/new.xml" },
  { name: "Active Sales", sourceUrl: "https://itch.io/feed/sales.xml" },
  { name: "Newest Horror", sourceUrl: "https://itch.io/games/newest/tag-horror.xml" },
  { name: "Top Horror", sourceUrl: "https://itch.io/games/tag-horror.xml" },
  { name: "Survival Horror", sourceUrl: "https://itch.io/games/tag-survival-horror.xml" },
  { name: "Atmospheric Games", sourceUrl: "https://itch.io/games/tag-atmospheric.xml" },
  { name: "First-Person Games", sourceUrl: "https://itch.io/games/tag-first-person.xml" },
  { name: "Psychological Horror", sourceUrl: "https://itch.io/games/tag-psychological-horror.xml" },
  { name: "Free Windows Horror", sourceUrl: "https://itch.io/games/free/platform-windows/tag-horror.xml" },
] as const;

export type AdultItchSourceSeed = {
  tag: string;
  displayName: string;
  priority: number;
  variations: Array<"base" | "newest" | "free" | "windows" | "html5">;
};

const CORE_ADULT_SOURCE_SEEDS: AdultItchSourceSeed[] = [
  { tag: "adult", displayName: "Adult", priority: 120, variations: ["base", "newest", "free", "windows", "html5"] },
  { tag: "nsfw", displayName: "NSFW", priority: 118, variations: ["base", "newest", "free", "windows", "html5"] },
  { tag: "erotic", displayName: "Erotic", priority: 116, variations: ["base", "newest", "free", "windows", "html5"] },
  { tag: "explicit", displayName: "Explicit", priority: 112, variations: ["base", "newest", "free", "windows"] },
  { tag: "sex", displayName: "Sex", priority: 110, variations: ["base", "newest", "free", "windows"] },
  { tag: "porn", displayName: "Porn", priority: 108, variations: ["base", "newest", "free"] },
  { tag: "lewd", displayName: "Lewd", priority: 106, variations: ["base", "newest", "free"] },
  { tag: "nudity", displayName: "Nudity", priority: 104, variations: ["base", "newest", "free"] },
];

const FORMAT_AND_GENRE_SOURCE_SEEDS: AdultItchSourceSeed[] = [
  { tag: "adult-visual-novel", displayName: "Adult Visual Novel", priority: 115, variations: ["base", "newest", "free", "windows", "html5"] },
  { tag: "visual-novel", displayName: "Visual Novel", priority: 98, variations: ["base", "newest", "free", "windows"] },
  { tag: "adult-dating-sim", displayName: "Adult Dating Sim", priority: 112, variations: ["base", "newest", "free", "windows"] },
  { tag: "dating-sim", displayName: "Dating Sim", priority: 96, variations: ["base", "newest", "free", "windows"] },
  { tag: "simulation", displayName: "Simulation", priority: 90, variations: ["base", "newest", "free"] },
  { tag: "role-playing", displayName: "Role Playing", priority: 90, variations: ["base", "newest", "free", "windows"] },
  { tag: "rpg", displayName: "RPG", priority: 88, variations: ["base", "newest", "free", "windows"] },
  { tag: "text-based", displayName: "Text Based", priority: 86, variations: ["base", "newest", "free", "html5"] },
  { tag: "interactive-fiction", displayName: "Interactive Fiction", priority: 84, variations: ["base", "newest", "free", "html5"] },
  { tag: "twine", displayName: "Twine", priority: 82, variations: ["base", "newest", "free", "html5"] },
  { tag: "renpy", displayName: "Ren'Py", priority: 82, variations: ["base", "newest", "free", "windows"] },
  { tag: "rpg-maker", displayName: "RPG Maker", priority: 78, variations: ["base", "newest", "free", "windows"] },
  { tag: "html5", displayName: "HTML5", priority: 76, variations: ["base", "newest", "free", "html5"] },
  { tag: "adventure", displayName: "Adventure", priority: 74, variations: ["base", "newest", "free"] },
  { tag: "sandbox", displayName: "Sandbox", priority: 72, variations: ["base", "newest", "free"] },
  { tag: "life-sim", displayName: "Life Sim", priority: 72, variations: ["base", "newest", "free"] },
];

const THEME_AND_AUDIENCE_SOURCE_SEEDS: AdultItchSourceSeed[] = [
  { tag: "romance", displayName: "Romance", priority: 92, variations: ["base", "newest", "free"] },
  { tag: "mature-romance", displayName: "Mature Romance", priority: 108, variations: ["base", "newest", "free", "windows"] },
  { tag: "harem", displayName: "Harem", priority: 96, variations: ["base", "newest", "free"] },
  { tag: "corruption", displayName: "Corruption", priority: 95, variations: ["base", "newest", "free"] },
  { tag: "fantasy", displayName: "Fantasy", priority: 86, variations: ["base", "newest", "free"] },
  { tag: "sci-fi", displayName: "Sci-Fi", priority: 84, variations: ["base", "newest", "free"] },
  { tag: "monster-girl", displayName: "Monster Girl", priority: 94, variations: ["base", "newest", "free"] },
  { tag: "monster", displayName: "Monster", priority: 82, variations: ["base", "newest", "free"] },
  { tag: "furry", displayName: "Furry", priority: 94, variations: ["base", "newest", "free", "windows"] },
  { tag: "transformation", displayName: "Transformation", priority: 90, variations: ["base", "newest", "free"] },
  { tag: "inflation", displayName: "Inflation", priority: 86, variations: ["base", "newest", "free"] },
  { tag: "fetish", displayName: "Fetish", priority: 88, variations: ["base", "newest", "free"] },
  { tag: "bdsm", displayName: "BDSM", priority: 86, variations: ["base", "newest", "free"] },
  { tag: "lgbt", displayName: "LGBT", priority: 84, variations: ["base", "newest", "free"] },
  { tag: "gay", displayName: "Gay", priority: 84, variations: ["base", "newest", "free"] },
  { tag: "lesbian", displayName: "Lesbian", priority: 84, variations: ["base", "newest", "free"] },
  { tag: "boys-love", displayName: "Boys Love", priority: 82, variations: ["base", "newest", "free"] },
  { tag: "girls-love", displayName: "Girls Love", priority: 82, variations: ["base", "newest", "free"] },
  { tag: "yaoi", displayName: "Yaoi", priority: 80, variations: ["base", "newest", "free"] },
  { tag: "yuri", displayName: "Yuri", priority: 80, variations: ["base", "newest", "free"] },
  { tag: "otome", displayName: "Otome", priority: 78, variations: ["base", "newest", "free"] },
  { tag: "amare", displayName: "Amare", priority: 76, variations: ["base", "newest", "free"] },
];

export const ADULT_ITCH_RSS_SOURCE_SEEDS: AdultItchSourceSeed[] = [
  ...CORE_ADULT_SOURCE_SEEDS,
  ...FORMAT_AND_GENRE_SOURCE_SEEDS,
  ...THEME_AND_AUDIENCE_SOURCE_SEEDS,
];

function sourceUrlForVariation(tag: string, variation: AdultItchSourceSeed["variations"][number]): string {
  switch (variation) {
    case "newest":
      return `https://itch.io/games/newest/tag-${tag}.xml`;
    case "free":
      return `https://itch.io/games/free/tag-${tag}.xml`;
    case "windows":
      return `https://itch.io/games/platform-windows/tag-${tag}.xml`;
    case "html5":
      return `https://itch.io/games/html5/tag-${tag}.xml`;
    case "base":
    default:
      return `https://itch.io/games/tag-${tag}.xml`;
  }
}

function sourceNameForVariation(displayName: string, variation: AdultItchSourceSeed["variations"][number]): string {
  switch (variation) {
    case "newest":
      return `Newest ${displayName}`;
    case "free":
      return `Free ${displayName}`;
    case "windows":
      return `Windows ${displayName}`;
    case "html5":
      return `Browser ${displayName}`;
    case "base":
    default:
      return `${displayName} Games`;
  }
}

export function buildAdultItchRssSources(): ItchRssSourceDefinition[] {
  const definitions: ItchRssSourceDefinition[] = [];
  const seenUrls = new Set<string>();

  for (const seed of ADULT_ITCH_RSS_SOURCE_SEEDS) {
    for (const variation of seed.variations) {
      const sourceUrl = sourceUrlForVariation(seed.tag, variation);
      if (seenUrls.has(sourceUrl)) continue;
      seenUrls.add(sourceUrl);

      definitions.push({
        name: sourceNameForVariation(seed.displayName, variation),
        sourceType: "tag-rss",
        sourceUrl,
        enabled: true,
        priority: seed.priority + (variation === "newest" ? 4 : variation === "free" ? 2 : 0),
        refreshIntervalHours: variation === "newest" ? 12 : 24,
      });
    }
  }

  return definitions;
}

// These public tag feeds are best-effort discovery only. itch.io limits NSFW
// browse discovery to authenticated accounts with NSFW browsing enabled, so
// direct public project URL imports remain supported for known projects.
export const DEFAULT_ITCH_RSS_SOURCES: ItchRssSourceDefinition[] = buildAdultItchRssSources();
