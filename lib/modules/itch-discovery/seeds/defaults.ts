import type {
  ItchTagCategory,
} from "../contract";
import type { UpsertItchFilterPresetInput } from "../types";

export type DefaultCanonicalTagDefinition = {
  tag: string;
  displayName: string;
  category: ItchTagCategory;
  aliases: string[];
  isFilterable?: boolean;
  isRankable?: boolean;
};

export const DEFAULT_CANONICAL_TAGS: ReadonlyArray<DefaultCanonicalTagDefinition> = [
  { tag: "horror", displayName: "Horror", category: "genre", aliases: [] },
  { tag: "survival-horror", displayName: "Survival Horror", category: "genre", aliases: ["survival horror", "survival_horror"] },
  { tag: "psychological-horror", displayName: "Psychological Horror", category: "genre", aliases: ["psych horror", "psychological horror"] },
  { tag: "action", displayName: "Action", category: "genre", aliases: [] },
  { tag: "adventure", displayName: "Adventure", category: "genre", aliases: [] },
  { tag: "action-adventure", displayName: "Action Adventure", category: "genre", aliases: ["action adventure"] },
  { tag: "puzzle", displayName: "Puzzle", category: "genre", aliases: [] },
  { tag: "puzzle-platformer", displayName: "Puzzle Platformer", category: "genre", aliases: ["puzzle platformer"] },
  { tag: "platformer", displayName: "Platformer", category: "genre", aliases: [] },
  { tag: "shooter", displayName: "Shooter", category: "genre", aliases: [] },
  { tag: "first-person-shooter", displayName: "First-Person Shooter", category: "genre", aliases: ["first person shooter", "fps"] },
  { tag: "role-playing", displayName: "Role-Playing", category: "genre", aliases: ["role playing", "roleplaying", "rpg"] },
  { tag: "jrpg", displayName: "JRPG", category: "genre", aliases: ["j-rpg"] },
  { tag: "strategy", displayName: "Strategy", category: "genre", aliases: [] },
  { tag: "simulation", displayName: "Simulation", category: "genre", aliases: ["sim"] },
  { tag: "management", displayName: "Management", category: "genre", aliases: ["management sim", "management simulation"] },
  { tag: "visual-novel", displayName: "Visual Novel", category: "genre", aliases: ["visual novel", "visualnovel", "vn"] },
  { tag: "interactive-fiction", displayName: "Interactive Fiction", category: "genre", aliases: ["interactive fiction", "text adventure"] },
  { tag: "point-and-click", displayName: "Point and Click", category: "genre", aliases: ["point and click", "point & click", "point n click", "point-and-click adventure"] },
  { tag: "roguelike", displayName: "Roguelike", category: "genre", aliases: ["rogue-like"] },
  { tag: "roguelite", displayName: "Roguelite", category: "genre", aliases: ["rogue-lite"] },
  { tag: "atmospheric", displayName: "Atmospheric", category: "theme", aliases: ["atmosphere"] },
  { tag: "mystery", displayName: "Mystery", category: "theme", aliases: [] },
  { tag: "comedy", displayName: "Comedy", category: "theme", aliases: [] },
  { tag: "romance", displayName: "Romance", category: "theme", aliases: [] },
  { tag: "dark", displayName: "Dark", category: "theme", aliases: [] },
  { tag: "cosmic-horror", displayName: "Cosmic Horror", category: "theme", aliases: ["cosmic horror", "lovecraftian"] },
  { tag: "body-horror", displayName: "Body Horror", category: "theme", aliases: ["body horror"] },
  { tag: "analog-horror", displayName: "Analog Horror", category: "theme", aliases: ["analogue horror", "analog horror"] },
  { tag: "found-footage", displayName: "Found Footage", category: "theme", aliases: ["found footage"] },
  { tag: "sci-fi", displayName: "Sci-Fi", category: "theme", aliases: ["sci fi", "scifi", "science fiction", "science-fiction"] },
  { tag: "fantasy", displayName: "Fantasy", category: "theme", aliases: [] },
  { tag: "dark-fantasy", displayName: "Dark Fantasy", category: "theme", aliases: ["dark fantasy"] },
  { tag: "post-apocalyptic", displayName: "Post-Apocalyptic", category: "theme", aliases: ["post apocalyptic", "post apocalypse"] },
  { tag: "cyberpunk", displayName: "Cyberpunk", category: "theme", aliases: ["cyber punk"] },
  { tag: "liminal-space", displayName: "Liminal Space", category: "theme", aliases: ["liminal spaces", "liminal space"] },
  { tag: "backrooms", displayName: "Backrooms", category: "theme", aliases: ["the backrooms"] },
  { tag: "first-person", displayName: "First Person", category: "perspective", aliases: ["first person", "firstperson", "1st person", "1st-person"] },
  { tag: "third-person", displayName: "Third Person", category: "perspective", aliases: ["third person", "thirdperson", "3rd person", "3rd-person"] },
  { tag: "top-down", displayName: "Top Down", category: "perspective", aliases: ["top down", "topdown"] },
  { tag: "side-scroller", displayName: "Side Scroller", category: "perspective", aliases: ["side scroller", "side-scrolling", "side scrolling"] },
  { tag: "isometric", displayName: "Isometric", category: "perspective", aliases: [] },
  { tag: "exploration", displayName: "Exploration", category: "mechanic", aliases: [] },
  { tag: "survival", displayName: "Survival", category: "mechanic", aliases: [] },
  { tag: "crafting", displayName: "Crafting", category: "mechanic", aliases: [] },
  { tag: "stealth", displayName: "Stealth", category: "mechanic", aliases: [] },
  { tag: "narrative", displayName: "Narrative", category: "mechanic", aliases: ["narrative-driven"] },
  { tag: "story-rich", displayName: "Story Rich", category: "mechanic", aliases: ["story rich", "story-driven", "story driven"] },
  { tag: "walking-simulator", displayName: "Walking Simulator", category: "mechanic", aliases: ["walking sim", "walking simulator"] },
  { tag: "immersive-sim", displayName: "Immersive Sim", category: "mechanic", aliases: ["immersive sim", "immersive simulation", "imsim"] },
  { tag: "multiple-endings", displayName: "Multiple Endings", category: "mechanic", aliases: ["multiple endings", "multiple ending"] },
  { tag: "singleplayer", displayName: "Singleplayer", category: "format", aliases: ["single player", "single-player"] },
  { tag: "multiplayer", displayName: "Multiplayer", category: "format", aliases: ["multi player", "multi-player"] },
  { tag: "local-multiplayer", displayName: "Local Multiplayer", category: "format", aliases: ["local multiplayer", "couch multiplayer"] },
  { tag: "online-multiplayer", displayName: "Online Multiplayer", category: "format", aliases: ["online multiplayer"] },
  { tag: "co-op", displayName: "Co-op", category: "format", aliases: ["co op", "coop", "cooperative", "co-operative"] },
  { tag: "local-co-op", displayName: "Local Co-op", category: "format", aliases: ["local co op", "local coop", "couch co-op", "couch coop"] },
  { tag: "browser", displayName: "Browser", category: "format", aliases: ["web", "web game", "browser game"] },
  { tag: "demo", displayName: "Demo", category: "format", aliases: ["game demo"] },
  { tag: "short", displayName: "Short", category: "format", aliases: ["short game"] },
  { tag: "game-jam", displayName: "Game Jam", category: "format", aliases: ["game jam", "gamejam"] },
  { tag: "pixel-art", displayName: "Pixel Art", category: "visual", aliases: ["pixel art", "pixelart"] },
  { tag: "low-poly", displayName: "Low Poly", category: "visual", aliases: ["low poly", "lowpoly"] },
  { tag: "hand-drawn", displayName: "Hand Drawn", category: "visual", aliases: ["hand drawn", "hand-drawn art"] },
  { tag: "retro", displayName: "Retro", category: "visual", aliases: ["retro style", "retro-styled"] },
  { tag: "2d", displayName: "2D", category: "visual", aliases: ["2-d", "two dimensional"] },
  { tag: "3d", displayName: "3D", category: "visual", aliases: ["3-d", "three dimensional"] },
  { tag: "virtual-reality", displayName: "Virtual Reality", category: "technology", aliases: ["virtual reality", "vr"] },
  { tag: "nsfw", displayName: "NSFW", category: "content", aliases: ["18+", "mature content"], isRankable: false },
  { tag: "adult", displayName: "Adult", category: "content", aliases: ["adult game", "adult games"], isRankable: true },
  { tag: "erotic", displayName: "Erotic", category: "content", aliases: ["erotica"], isRankable: true },
  { tag: "adult-visual-novel", displayName: "Adult Visual Novel", category: "genre", aliases: ["adult visual novel", "nsfw visual novel"], isRankable: true },
  { tag: "adult-dating-sim", displayName: "Adult Dating Sim", category: "genre", aliases: ["adult dating sim", "nsfw dating sim"], isRankable: true },
  { tag: "mature-romance", displayName: "Mature Romance", category: "theme", aliases: ["mature romance"], isRankable: true },
  { tag: "asset-pack", displayName: "Asset Pack", category: "content", aliases: ["asset pack", "assets"], isRankable: false },
  { tag: "soundtrack", displayName: "Soundtrack", category: "content", aliases: ["ost", "music soundtrack"], isRankable: false },
  { tag: "comic", displayName: "Comic", category: "content", aliases: ["comics"], isRankable: false },
  { tag: "indie", displayName: "Indie", category: "general", aliases: ["independent"], isRankable: false },
];

export const DEFAULT_TAG_ALIASES = DEFAULT_CANONICAL_TAGS.map((definition) => ({
  canonicalTag: definition.tag,
  aliases: definition.aliases,
}));

export const DEFAULT_PREFERENCE_WEIGHTS = [
  { featureValue: "adult", weight: 7 },
  { featureValue: "nsfw", weight: 7 },
  { featureValue: "erotic", weight: 5 },
  { featureValue: "adult-visual-novel", weight: 4 },
  { featureValue: "adult-dating-sim", weight: 4 },
  { featureValue: "mature-romance", weight: 3 },
  { featureValue: "romance", weight: 2 },
  { featureValue: "story-rich", weight: 2 },
  { featureValue: "visual-novel", weight: 2 },
  { featureValue: "simulation", weight: 1 },
] as const;

export const DEFAULT_FILTER_PRESETS: ReadonlyArray<UpsertItchFilterPresetInput> = [
  {
    name: "For You",
    description: "The default ranked NSFW adult-game discovery view.",
    isDefault: true,
    isSystem: true,
    rules: [
      {
        field: "classification",
        operator: "in",
        values: ["game"],
      },
      {
        field: "availability",
        operator: "available",
      },
      {
        field: "adultStatus",
        operator: "in",
        values: ["adult"],
      },
      {
        field: "tag",
        operator: "includesAny",
        values: [
          "nsfw",
          "adult",
          "erotic",
          "explicit",
          "sexual-content",
          "adult-visual-novel",
          "adult-dating-sim",
          "mature-romance"
        ],
      },
      {
        field: "metadataCompleteness",
        operator: "permissive",
      },
    ],
    sort: [
      { field: "score", direction: "desc" },
      { field: "lastDiscoveredAt", direction: "desc" },
    ],
  },
  {
    name: "Free Horror",
    description: "Free games carrying at least one horror-related tag.",
    isDefault: false,
    isSystem: true,
    rules: [
      { field: "price", operator: "free" },
      {
        field: "tag",
        operator: "includesAny",
        values: ["horror", "survival-horror", "psychological-horror"],
      },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Windows Downloads",
    description: "Games with Windows support.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "platform",
        operator: "includesAny",
        values: ["windows"],
      },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Browser Games",
    description: "Games playable in the browser.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "platform",
        operator: "includesAny",
        values: ["browser"],
      },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "On Sale",
    description: "Eligible games currently marked as on sale.",
    isDefault: false,
    isSystem: true,
    rules: [{ field: "sale", operator: "onSale" }],
    sort: [{ field: "score", direction: "desc" }],
  },
  {
    name: "Recently Updated",
    description: "Games with a public update signal from the last 90 days.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "updateAgeDays",
        operator: "lte",
        value: 90,
      },
    ],
    sort: [{ field: "sourceUpdatedAt", direction: "desc" }],
  },
  {
    name: "New and Unseen",
    description: "Unseen recommendations ordered by discovery time.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "state",
        operator: "in",
        values: ["unseen"],
      },
    ],
    sort: [{ field: "lastDiscoveredAt", direction: "desc" }],
  },
  {
    name: "Saved Games With Updates",
    description: "Saved games with update activity.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "state",
        operator: "in",
        values: ["saved"],
      },
    ],
    sort: [{ field: "sourceUpdatedAt", direction: "desc" }],
  },
  {
    name: "Strict Exclusions",
    description: "Game-only results with strict metadata handling.",
    isDefault: false,
    isSystem: true,
    rules: [
      {
        field: "classification",
        operator: "in",
        values: ["game"],
      },
      {
        field: "tag",
        operator: "excludesAny",
        values: ["asset-pack", "soundtrack", "comic"],
      },
      {
        field: "availability",
        operator: "available",
      },
      {
        field: "adultStatus",
        operator: "in",
        values: ["adult"],
      },
      {
        field: "metadataCompleteness",
        operator: "strict",
      },
    ],
    sort: [{ field: "score", direction: "desc" }],
  },
];
