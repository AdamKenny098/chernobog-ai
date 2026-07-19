import type {
  ItchAdultEvidence,
  ItchTagCategory,
  ItchTaxonomyCategoryId,
  ItchTaxonomySafetyRole,
} from "../contract";

export type AdultTaxonomyCategoryDefinition = {
  id: ItchTaxonomyCategoryId;
  displayName: string;
  description: string;
  sortOrder: number;
  visibleInFilters: boolean;
};

export type AdultTaxonomyEntryDefinition = {
  tag: string;
  displayName: string;
  categoryId: ItchTaxonomyCategoryId;
  legacyCategory: ItchTagCategory;
  aliases: readonly string[];
  adultEvidence: ItchAdultEvidence;
  safetyRole: ItchTaxonomySafetyRole;
  description: string;
  visibleInFilters?: boolean;
  enabled?: boolean;
  isRankable?: boolean;
  impliedTags?: readonly string[];
};

export const ADULT_TAXONOMY_CATEGORIES: readonly AdultTaxonomyCategoryDefinition[] = [
  { id: "adult-intensity", displayName: "Adult Intensity", description: "How directly and explicitly adult content is presented.", sortOrder: 10, visibleInFilters: true },
  { id: "game-format", displayName: "Game Format", description: "The broad type or structural format of the game.", sortOrder: 20, visibleInFilters: true },
  { id: "gameplay", displayName: "Gameplay", description: "Primary mechanics and interaction styles.", sortOrder: 30, visibleInFilters: true },
  { id: "presentation", displayName: "Presentation", description: "Art, animation, camera and presentation style.", sortOrder: 40, visibleInFilters: true },
  { id: "engine", displayName: "Engine", description: "The engine or authoring technology used by the project.", sortOrder: 50, visibleInFilters: true },
  { id: "narrative", displayName: "Story and Tone", description: "Narrative focus, genre, mood and tone.", sortOrder: 60, visibleInFilters: true },
  { id: "relationship", displayName: "Relationship Structure", description: "How romance, dating and routes are structured.", sortOrder: 70, visibleInFilters: true },
  { id: "representation", displayName: "Representation", description: "Audience and relationship representation.", sortOrder: 80, visibleInFilters: true },
  { id: "protagonist", displayName: "Protagonist", description: "Playable-character identity and customisation.", sortOrder: 90, visibleInFilters: true },
  { id: "cast", displayName: "Cast", description: "The broad makeup of the central cast.", sortOrder: 100, visibleInFilters: true },
  { id: "adult-theme", displayName: "Adult Themes", description: "Consensual fictional adult themes and content descriptors.", sortOrder: 110, visibleInFilters: true },
  { id: "character-archetype", displayName: "Characters", description: "Character species, archetypes and fantasy identities.", sortOrder: 120, visibleInFilters: true },
  { id: "setting", displayName: "Setting", description: "Where and when the game takes place.", sortOrder: 130, visibleInFilters: true },
  { id: "platform", displayName: "Platform", description: "Supported delivery and operating-system formats.", sortOrder: 140, visibleInFilters: true },
  { id: "commercial", displayName: "Price and Access", description: "Commercial model and release access.", sortOrder: 150, visibleInFilters: true },
  { id: "development-status", displayName: "Development Status", description: "Current production and release state.", sortOrder: 160, visibleInFilters: true },
  { id: "session-length", displayName: "Length and Replayability", description: "Expected session length and replay structure.", sortOrder: 170, visibleInFilters: true },
  { id: "safety", displayName: "Safety and Review", description: "Internal review and catalogue-safety classifications.", sortOrder: 180, visibleInFilters: false },
  { id: "uncategorised", displayName: "Uncategorised", description: "Discovered tags that have not yet been assigned to the taxonomy.", sortOrder: 999, visibleInFilters: true },
] as const;

const normal = "normal" as const;
const review = "review" as const;
const blocked = "blocked" as const;
const none = "none" as const;
const supporting = "supporting" as const;
const strong = "strong" as const;

export const ADULT_TAXONOMY_ENTRIES: readonly AdultTaxonomyEntryDefinition[] = [
  // Adult intensity
  { tag: "adult", displayName: "Adult", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["adult game", "adult games", "18 plus", "18-plus", "18+"], adultEvidence: strong, safetyRole: normal, description: "General adult-only classification." },
  { tag: "nsfw", displayName: "NSFW", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["not safe for work", "not-safe-for-work", "mature 18+"], adultEvidence: strong, safetyRole: normal, description: "Creator-supplied not-safe-for-work classification.", isRankable: false, impliedTags: ["adult"] },
  { tag: "explicit", displayName: "Explicit", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["explicit content", "sexually explicit", "porn", "pornographic"], adultEvidence: strong, safetyRole: normal, description: "Explicit sexual content.", impliedTags: ["adult"] },
  { tag: "sexual-content", displayName: "Sexual Content", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["sexual content", "sexual themes", "sex"], adultEvidence: strong, safetyRole: normal, description: "Sexual material is a notable part of the project.", impliedTags: ["adult"] },
  { tag: "erotic", displayName: "Erotic", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["erotica", "erotic content"], adultEvidence: strong, safetyRole: normal, description: "Erotic content or presentation.", impliedTags: ["adult"] },
  { tag: "nudity", displayName: "Nudity", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["nude", "adult nudity"], adultEvidence: strong, safetyRole: normal, description: "Nudity is present.", impliedTags: ["adult"] },
  { tag: "suggestive", displayName: "Suggestive", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["suggestive content", "sexual innuendo", "lewd"], adultEvidence: supporting, safetyRole: normal, description: "Suggestive rather than necessarily explicit material." },
  { tag: "mature-content", displayName: "Mature Content", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["mature", "mature content", "mature themes"], adultEvidence: supporting, safetyRole: normal, description: "Broad mature themes that may or may not be sexual." },
  { tag: "adult-language", displayName: "Adult Language", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["strong language", "explicit language"], adultEvidence: none, safetyRole: normal, description: "Strong language without implying sexual content." },
  { tag: "romance-only", displayName: "Romance Only", categoryId: "adult-intensity", legacyCategory: "content", aliases: ["non explicit romance", "non-explicit romance"], adultEvidence: none, safetyRole: normal, description: "Romance without explicit adult content." },

  // Game format
  { tag: "visual-novel", displayName: "Visual Novel", categoryId: "game-format", legacyCategory: "genre", aliases: ["visual novel", "visualnovel", "vn"], adultEvidence: none, safetyRole: normal, description: "Visual-novel structure." },
  { tag: "adult-visual-novel", displayName: "Adult Visual Novel", categoryId: "game-format", legacyCategory: "genre", aliases: ["adult visual novel", "nsfw visual novel", "h visual novel"], adultEvidence: strong, safetyRole: normal, description: "Composite adult visual-novel label.", impliedTags: ["adult", "visual-novel"] },
  { tag: "dating-sim", displayName: "Dating Sim", categoryId: "game-format", legacyCategory: "genre", aliases: ["dating sim", "dating simulator", "dating simulation"], adultEvidence: none, safetyRole: normal, description: "Dating-focused simulation." },
  { tag: "adult-dating-sim", displayName: "Adult Dating Sim", categoryId: "game-format", legacyCategory: "genre", aliases: ["adult dating sim", "nsfw dating sim"], adultEvidence: strong, safetyRole: normal, description: "Composite adult dating-sim label.", impliedTags: ["adult", "dating-sim"] },
  { tag: "interactive-fiction", displayName: "Interactive Fiction", categoryId: "game-format", legacyCategory: "genre", aliases: ["interactive fiction", "text adventure", "if game"], adultEvidence: none, safetyRole: normal, description: "Choice-driven interactive fiction." },
  { tag: "text-based", displayName: "Text Based", categoryId: "game-format", legacyCategory: "genre", aliases: ["text based", "text-only", "text game"], adultEvidence: none, safetyRole: normal, description: "Primarily text-based presentation." },
  { tag: "role-playing", displayName: "Role-Playing", categoryId: "game-format", legacyCategory: "genre", aliases: ["role playing", "roleplaying", "rpg"], adultEvidence: none, safetyRole: normal, description: "Role-playing game." },
  { tag: "action-rpg", displayName: "Action RPG", categoryId: "game-format", legacyCategory: "genre", aliases: ["action rpg", "arpg"], adultEvidence: none, safetyRole: normal, description: "Action-oriented role-playing game." },
  { tag: "tactical-rpg", displayName: "Tactical RPG", categoryId: "game-format", legacyCategory: "genre", aliases: ["tactical rpg", "strategy rpg", "srpg"], adultEvidence: none, safetyRole: normal, description: "Tactical role-playing game." },
  { tag: "dungeon-crawler", displayName: "Dungeon Crawler", categoryId: "game-format", legacyCategory: "genre", aliases: ["dungeon crawler", "dungeon-crawling"], adultEvidence: none, safetyRole: normal, description: "Dungeon-crawling game." },
  { tag: "life-sim", displayName: "Life Sim", categoryId: "game-format", legacyCategory: "genre", aliases: ["life sim", "life simulator", "life simulation"], adultEvidence: none, safetyRole: normal, description: "Life simulation." },
  { tag: "simulation", displayName: "Simulation", categoryId: "game-format", legacyCategory: "genre", aliases: ["sim", "simulator"], adultEvidence: none, safetyRole: normal, description: "Simulation game." },
  { tag: "management", displayName: "Management", categoryId: "game-format", legacyCategory: "genre", aliases: ["management sim", "management simulation"], adultEvidence: none, safetyRole: normal, description: "Management-focused game." },
  { tag: "strategy", displayName: "Strategy", categoryId: "game-format", legacyCategory: "genre", aliases: ["strategy game"], adultEvidence: none, safetyRole: normal, description: "Strategy game." },
  { tag: "action", displayName: "Action", categoryId: "game-format", legacyCategory: "genre", aliases: ["action game"], adultEvidence: none, safetyRole: normal, description: "Action game." },
  { tag: "adventure", displayName: "Adventure", categoryId: "game-format", legacyCategory: "genre", aliases: ["adventure game"], adultEvidence: none, safetyRole: normal, description: "Adventure game." },
  { tag: "puzzle", displayName: "Puzzle", categoryId: "game-format", legacyCategory: "genre", aliases: ["puzzle game"], adultEvidence: none, safetyRole: normal, description: "Puzzle game." },
  { tag: "platformer", displayName: "Platformer", categoryId: "game-format", legacyCategory: "genre", aliases: ["platform game"], adultEvidence: none, safetyRole: normal, description: "Platform game." },
  { tag: "shooter", displayName: "Shooter", categoryId: "game-format", legacyCategory: "genre", aliases: ["shooting game"], adultEvidence: none, safetyRole: normal, description: "Shooter game." },
  { tag: "fighting", displayName: "Fighting", categoryId: "game-format", legacyCategory: "genre", aliases: ["fighting game", "fighter"], adultEvidence: none, safetyRole: normal, description: "Fighting game." },
  { tag: "beat-em-up", displayName: "Beat 'Em Up", categoryId: "game-format", legacyCategory: "genre", aliases: ["beat em up", "brawler"], adultEvidence: none, safetyRole: normal, description: "Beat-em-up or brawler." },
  { tag: "roguelike", displayName: "Roguelike", categoryId: "game-format", legacyCategory: "genre", aliases: ["rogue-like"], adultEvidence: none, safetyRole: normal, description: "Roguelike structure." },
  { tag: "roguelite", displayName: "Roguelite", categoryId: "game-format", legacyCategory: "genre", aliases: ["rogue-lite"], adultEvidence: none, safetyRole: normal, description: "Roguelite structure." },
  { tag: "incremental", displayName: "Incremental", categoryId: "game-format", legacyCategory: "genre", aliases: ["incremental game", "progression game"], adultEvidence: none, safetyRole: normal, description: "Incremental progression game." },
  { tag: "idle", displayName: "Idle", categoryId: "game-format", legacyCategory: "genre", aliases: ["idle game"], adultEvidence: none, safetyRole: normal, description: "Idle game." },
  { tag: "clicker", displayName: "Clicker", categoryId: "game-format", legacyCategory: "genre", aliases: ["clicker game"], adultEvidence: none, safetyRole: normal, description: "Clicker game." },
  { tag: "sandbox", displayName: "Sandbox", categoryId: "game-format", legacyCategory: "genre", aliases: ["sandbox game"], adultEvidence: none, safetyRole: normal, description: "Open-ended sandbox." },
  { tag: "open-world", displayName: "Open World", categoryId: "game-format", legacyCategory: "genre", aliases: ["open world"], adultEvidence: none, safetyRole: normal, description: "Open-world game." },
  { tag: "card-game", displayName: "Card Game", categoryId: "game-format", legacyCategory: "genre", aliases: ["card game", "deckbuilder", "deck builder"], adultEvidence: none, safetyRole: normal, description: "Card or deck-building game." },
  { tag: "party-game", displayName: "Party Game", categoryId: "game-format", legacyCategory: "genre", aliases: ["party game"], adultEvidence: none, safetyRole: normal, description: "Party game." },
  { tag: "dress-up", displayName: "Dress Up", categoryId: "game-format", legacyCategory: "genre", aliases: ["dress up", "dressup"], adultEvidence: none, safetyRole: normal, description: "Dress-up game." },
  { tag: "character-creator", displayName: "Character Creator", categoryId: "game-format", legacyCategory: "genre", aliases: ["character creator", "character maker"], adultEvidence: none, safetyRole: normal, description: "Character creation experience." },

  // Gameplay
  { tag: "choices-matter", displayName: "Choices Matter", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["choices matter", "meaningful choices"], adultEvidence: none, safetyRole: normal, description: "Player choices materially affect outcomes." },
  { tag: "branching-story", displayName: "Branching Story", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["branching story", "branching narrative"], adultEvidence: none, safetyRole: normal, description: "Branching narrative structure." },
  { tag: "multiple-endings", displayName: "Multiple Endings", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["multiple endings", "multiple ending"], adultEvidence: none, safetyRole: normal, description: "More than one ending." },
  { tag: "relationship-building", displayName: "Relationship Building", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["relationship building", "relationship system"], adultEvidence: none, safetyRole: normal, description: "Relationships develop through gameplay." },
  { tag: "stat-raising", displayName: "Stat Raising", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["stat raising", "raising sim"], adultEvidence: none, safetyRole: normal, description: "Progress is driven by raising character statistics." },
  { tag: "turn-based", displayName: "Turn Based", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["turn based", "turn-based combat"], adultEvidence: none, safetyRole: normal, description: "Turn-based gameplay." },
  { tag: "real-time", displayName: "Real Time", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["real time", "real-time combat"], adultEvidence: none, safetyRole: normal, description: "Real-time gameplay." },
  { tag: "exploration", displayName: "Exploration", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["explore"], adultEvidence: none, safetyRole: normal, description: "Exploration is a major mechanic." },
  { tag: "crafting", displayName: "Crafting", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["crafting system"], adultEvidence: none, safetyRole: normal, description: "Crafting mechanics." },
  { tag: "survival", displayName: "Survival", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["survival game"], adultEvidence: none, safetyRole: normal, description: "Survival mechanics." },
  { tag: "stealth", displayName: "Stealth", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["stealth game"], adultEvidence: none, safetyRole: normal, description: "Stealth mechanics." },
  { tag: "combat", displayName: "Combat", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["combat focused", "combat-focused"], adultEvidence: none, safetyRole: normal, description: "Combat is a major system." },
  { tag: "resource-management", displayName: "Resource Management", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["resource management"], adultEvidence: none, safetyRole: normal, description: "Resource-management mechanics." },
  { tag: "procedural-generation", displayName: "Procedural Generation", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["procedural generation", "procedurally generated"], adultEvidence: none, safetyRole: normal, description: "Procedurally generated content." },
  { tag: "minigames", displayName: "Minigames", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["mini games", "mini-games", "minigame"], adultEvidence: none, safetyRole: normal, description: "Contains multiple minigames." },
  { tag: "point-and-click", displayName: "Point and Click", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["point and click", "point & click", "point n click"], adultEvidence: none, safetyRole: normal, description: "Point-and-click interaction." },
  { tag: "story-rich", displayName: "Story Rich", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["story rich", "story-driven", "story driven"], adultEvidence: none, safetyRole: normal, description: "Strong emphasis on story." },
  { tag: "gameplay-focused", displayName: "Gameplay Focused", categoryId: "gameplay", legacyCategory: "mechanic", aliases: ["gameplay focused", "gameplay-heavy"], adultEvidence: none, safetyRole: normal, description: "Strong emphasis on gameplay systems." },

  // Presentation
  { tag: "2d", displayName: "2D", categoryId: "presentation", legacyCategory: "visual", aliases: ["2-d", "two dimensional"], adultEvidence: none, safetyRole: normal, description: "Two-dimensional presentation." },
  { tag: "3d", displayName: "3D", categoryId: "presentation", legacyCategory: "visual", aliases: ["3-d", "three dimensional"], adultEvidence: none, safetyRole: normal, description: "Three-dimensional presentation." },
  { tag: "pixel-art", displayName: "Pixel Art", categoryId: "presentation", legacyCategory: "visual", aliases: ["pixel art", "pixelart"], adultEvidence: none, safetyRole: normal, description: "Pixel-art presentation." },
  { tag: "anime", displayName: "Anime", categoryId: "presentation", legacyCategory: "visual", aliases: ["anime style", "anime-styled"], adultEvidence: none, safetyRole: normal, description: "Anime-inspired presentation." },
  { tag: "realistic", displayName: "Realistic", categoryId: "presentation", legacyCategory: "visual", aliases: ["realism", "realistic art"], adultEvidence: none, safetyRole: normal, description: "Realistic visual style." },
  { tag: "stylized", displayName: "Stylized", categoryId: "presentation", legacyCategory: "visual", aliases: ["stylised", "stylized art"], adultEvidence: none, safetyRole: normal, description: "Stylised visual presentation." },
  { tag: "hand-drawn", displayName: "Hand Drawn", categoryId: "presentation", legacyCategory: "visual", aliases: ["hand drawn", "hand-drawn art"], adultEvidence: none, safetyRole: normal, description: "Hand-drawn artwork." },
  { tag: "rendered", displayName: "Rendered", categoryId: "presentation", legacyCategory: "visual", aliases: ["3d rendered", "pre-rendered", "prerendered"], adultEvidence: none, safetyRole: normal, description: "Pre-rendered or rendered imagery." },
  { tag: "live-action", displayName: "Live Action", categoryId: "presentation", legacyCategory: "visual", aliases: ["live action", "fmv", "full motion video"], adultEvidence: none, safetyRole: normal, description: "Live-action or full-motion-video presentation." },
  { tag: "animated", displayName: "Animated", categoryId: "presentation", legacyCategory: "visual", aliases: ["animation", "animated scenes"], adultEvidence: none, safetyRole: normal, description: "Contains animation." },
  { tag: "voice-acted", displayName: "Voice Acted", categoryId: "presentation", legacyCategory: "visual", aliases: ["voice acted", "voice acting", "voiced"], adultEvidence: none, safetyRole: normal, description: "Contains voice acting." },
  { tag: "text-heavy", displayName: "Text Heavy", categoryId: "presentation", legacyCategory: "visual", aliases: ["text heavy", "lots of reading"], adultEvidence: none, safetyRole: normal, description: "Reading-heavy presentation." },
  { tag: "low-poly", displayName: "Low Poly", categoryId: "presentation", legacyCategory: "visual", aliases: ["low poly", "lowpoly"], adultEvidence: none, safetyRole: normal, description: "Low-poly visual style." },
  { tag: "retro", displayName: "Retro", categoryId: "presentation", legacyCategory: "visual", aliases: ["retro style", "retro-styled"], adultEvidence: none, safetyRole: normal, description: "Retro-inspired presentation." },
  { tag: "first-person", displayName: "First Person", categoryId: "presentation", legacyCategory: "perspective", aliases: ["first person", "firstperson", "1st person", "1st-person"], adultEvidence: none, safetyRole: normal, description: "First-person perspective." },
  { tag: "third-person", displayName: "Third Person", categoryId: "presentation", legacyCategory: "perspective", aliases: ["third person", "thirdperson", "3rd person", "3rd-person"], adultEvidence: none, safetyRole: normal, description: "Third-person perspective." },
  { tag: "top-down", displayName: "Top Down", categoryId: "presentation", legacyCategory: "perspective", aliases: ["top down", "topdown"], adultEvidence: none, safetyRole: normal, description: "Top-down perspective." },
  { tag: "isometric", displayName: "Isometric", categoryId: "presentation", legacyCategory: "perspective", aliases: ["isometric view"], adultEvidence: none, safetyRole: normal, description: "Isometric perspective." },

  // Engines
  { tag: "renpy", displayName: "Ren'Py", categoryId: "engine", legacyCategory: "technology", aliases: ["ren py", "ren'py", "renpy visual novel engine"], adultEvidence: none, safetyRole: normal, description: "Built with Ren'Py." },
  { tag: "twine", displayName: "Twine", categoryId: "engine", legacyCategory: "technology", aliases: ["twine 2", "sugarcube"], adultEvidence: none, safetyRole: normal, description: "Built with Twine." },
  { tag: "rpg-maker", displayName: "RPG Maker", categoryId: "engine", legacyCategory: "technology", aliases: ["rpg maker", "rpgmaker", "rpg maker mv", "rpg maker mz"], adultEvidence: none, safetyRole: normal, description: "Built with RPG Maker." },
  { tag: "unity", displayName: "Unity", categoryId: "engine", legacyCategory: "technology", aliases: ["unity engine", "made with unity"], adultEvidence: none, safetyRole: normal, description: "Built with Unity." },
  { tag: "unreal-engine", displayName: "Unreal Engine", categoryId: "engine", legacyCategory: "technology", aliases: ["unreal engine", "ue4", "ue5"], adultEvidence: none, safetyRole: normal, description: "Built with Unreal Engine." },
  { tag: "godot", displayName: "Godot", categoryId: "engine", legacyCategory: "technology", aliases: ["godot engine"], adultEvidence: none, safetyRole: normal, description: "Built with Godot." },
  { tag: "html5", displayName: "HTML5", categoryId: "engine", legacyCategory: "technology", aliases: ["html 5", "webgl", "javascript"], adultEvidence: none, safetyRole: normal, description: "Browser technology or HTML5 build." },

  // Narrative and tone
  { tag: "romance", displayName: "Romance", categoryId: "narrative", legacyCategory: "theme", aliases: ["romantic"], adultEvidence: none, safetyRole: normal, description: "Romance-focused narrative." },
  { tag: "mature-romance", displayName: "Mature Romance", categoryId: "narrative", legacyCategory: "theme", aliases: ["mature romance", "adult romance"], adultEvidence: supporting, safetyRole: normal, description: "Mature romantic themes.", impliedTags: ["romance"] },
  { tag: "comedy", displayName: "Comedy", categoryId: "narrative", legacyCategory: "theme", aliases: ["funny", "humor", "humour"], adultEvidence: none, safetyRole: normal, description: "Comedic tone." },
  { tag: "dark", displayName: "Dark", categoryId: "narrative", legacyCategory: "theme", aliases: ["dark themes", "dark story"], adultEvidence: none, safetyRole: normal, description: "Dark tone or themes." },
  { tag: "horror", displayName: "Horror", categoryId: "narrative", legacyCategory: "genre", aliases: ["horror game"], adultEvidence: none, safetyRole: normal, description: "Horror genre." },
  { tag: "psychological", displayName: "Psychological", categoryId: "narrative", legacyCategory: "theme", aliases: ["psychological themes"], adultEvidence: none, safetyRole: normal, description: "Psychological themes." },
  { tag: "psychological-horror", displayName: "Psychological Horror", categoryId: "narrative", legacyCategory: "genre", aliases: ["psych horror", "psychological horror"], adultEvidence: none, safetyRole: normal, description: "Psychological horror." },
  { tag: "fantasy", displayName: "Fantasy", categoryId: "narrative", legacyCategory: "theme", aliases: ["fantasy setting"], adultEvidence: none, safetyRole: normal, description: "Fantasy themes." },
  { tag: "sci-fi", displayName: "Sci-Fi", categoryId: "narrative", legacyCategory: "theme", aliases: ["sci fi", "scifi", "science fiction", "science-fiction"], adultEvidence: none, safetyRole: normal, description: "Science-fiction themes." },
  { tag: "historical", displayName: "Historical", categoryId: "narrative", legacyCategory: "theme", aliases: ["historical fiction", "period piece"], adultEvidence: none, safetyRole: normal, description: "Historical setting or story." },
  { tag: "modern", displayName: "Modern", categoryId: "narrative", legacyCategory: "theme", aliases: ["contemporary", "present day"], adultEvidence: none, safetyRole: normal, description: "Modern-day setting or themes." },
  { tag: "supernatural", displayName: "Supernatural", categoryId: "narrative", legacyCategory: "theme", aliases: ["occult", "paranormal"], adultEvidence: none, safetyRole: normal, description: "Supernatural themes." },
  { tag: "slice-of-life", displayName: "Slice of Life", categoryId: "narrative", legacyCategory: "theme", aliases: ["slice of life", "slice-of-life story"], adultEvidence: none, safetyRole: normal, description: "Everyday-life narrative." },
  { tag: "mystery", displayName: "Mystery", categoryId: "narrative", legacyCategory: "theme", aliases: ["mystery story"], adultEvidence: none, safetyRole: normal, description: "Mystery narrative." },
  { tag: "drama", displayName: "Drama", categoryId: "narrative", legacyCategory: "theme", aliases: ["dramatic"], adultEvidence: none, safetyRole: normal, description: "Dramatic narrative." },
  { tag: "parody", displayName: "Parody", categoryId: "narrative", legacyCategory: "theme", aliases: ["spoof", "satire"], adultEvidence: none, safetyRole: normal, description: "Parody or satire." },
  { tag: "wholesome", displayName: "Wholesome", categoryId: "narrative", legacyCategory: "theme", aliases: ["feel good", "feel-good"], adultEvidence: none, safetyRole: normal, description: "Wholesome tone." },

  // Relationship structure
  { tag: "dating", displayName: "Dating", categoryId: "relationship", legacyCategory: "theme", aliases: ["dating focus"], adultEvidence: none, safetyRole: normal, description: "Dating is a major focus." },
  { tag: "casual-encounters", displayName: "Casual Encounters", categoryId: "relationship", legacyCategory: "theme", aliases: ["casual encounters", "hookups", "hook-up"], adultEvidence: supporting, safetyRole: normal, description: "Casual consensual encounters." },
  { tag: "multiple-romance-options", displayName: "Multiple Romance Options", categoryId: "relationship", legacyCategory: "theme", aliases: ["multiple romance options", "multiple love interests"], adultEvidence: none, safetyRole: normal, description: "Several romanceable characters." },
  { tag: "single-romance-route", displayName: "Single Romance Route", categoryId: "relationship", legacyCategory: "theme", aliases: ["single romance route", "single love interest"], adultEvidence: none, safetyRole: normal, description: "One central romance route." },
  { tag: "multiple-routes", displayName: "Multiple Routes", categoryId: "relationship", legacyCategory: "theme", aliases: ["multiple routes", "route based", "route-based"], adultEvidence: none, safetyRole: normal, description: "Multiple narrative or relationship routes." },
  { tag: "polyamory", displayName: "Polyamory", categoryId: "relationship", legacyCategory: "theme", aliases: ["poly", "polyamorous"], adultEvidence: supporting, safetyRole: normal, description: "Consensual polyamorous relationships." },
  { tag: "monogamous", displayName: "Monogamous", categoryId: "relationship", legacyCategory: "theme", aliases: ["monogamy"], adultEvidence: none, safetyRole: normal, description: "Monogamous relationship structure." },

  // Representation
  { tag: "straight", displayName: "Straight", categoryId: "representation", legacyCategory: "general", aliases: ["heterosexual", "hetero"], adultEvidence: none, safetyRole: normal, description: "Straight relationship representation." },
  { tag: "gay", displayName: "Gay", categoryId: "representation", legacyCategory: "general", aliases: ["male male", "m/m", "mlm"], adultEvidence: none, safetyRole: normal, description: "Gay relationship representation." },
  { tag: "lesbian", displayName: "Lesbian", categoryId: "representation", legacyCategory: "general", aliases: ["female female", "f/f", "wlw"], adultEvidence: none, safetyRole: normal, description: "Lesbian relationship representation." },
  { tag: "bisexual", displayName: "Bisexual", categoryId: "representation", legacyCategory: "general", aliases: ["bi", "bisexuality"], adultEvidence: none, safetyRole: normal, description: "Bisexual representation." },
  { tag: "queer", displayName: "Queer", categoryId: "representation", legacyCategory: "general", aliases: ["queer themes"], adultEvidence: none, safetyRole: normal, description: "Queer representation." },
  { tag: "lgbtqia", displayName: "LGBTQIA+", categoryId: "representation", legacyCategory: "general", aliases: ["lgbt", "lgbtq", "lgbtq+", "lgbtqia+"], adultEvidence: none, safetyRole: normal, description: "Broad LGBTQIA+ representation." },
  { tag: "boys-love", displayName: "Boys' Love", categoryId: "representation", legacyCategory: "general", aliases: ["boys love", "bl"], adultEvidence: none, safetyRole: normal, description: "Boys' Love genre label.", impliedTags: ["gay", "romance"] },
  { tag: "girls-love", displayName: "Girls' Love", categoryId: "representation", legacyCategory: "general", aliases: ["girls love", "gl"], adultEvidence: none, safetyRole: normal, description: "Girls' Love genre label.", impliedTags: ["lesbian", "romance"] },
  { tag: "yaoi", displayName: "Yaoi", categoryId: "representation", legacyCategory: "general", aliases: ["yaoi game"], adultEvidence: supporting, safetyRole: normal, description: "Yaoi genre label.", impliedTags: ["gay", "boys-love"] },
  { tag: "yuri", displayName: "Yuri", categoryId: "representation", legacyCategory: "general", aliases: ["yuri game"], adultEvidence: supporting, safetyRole: normal, description: "Yuri genre label.", impliedTags: ["lesbian", "girls-love"] },
  { tag: "bara", displayName: "Bara", categoryId: "representation", legacyCategory: "general", aliases: ["geicomi"], adultEvidence: supporting, safetyRole: normal, description: "Bara or geicomi presentation.", impliedTags: ["gay"] },
  { tag: "otome", displayName: "Otome", categoryId: "representation", legacyCategory: "general", aliases: ["otome game"], adultEvidence: none, safetyRole: normal, description: "Otome audience and romance structure." },
  { tag: "amare", displayName: "Amare", categoryId: "representation", legacyCategory: "general", aliases: ["amare game"], adultEvidence: none, safetyRole: normal, description: "Inclusive romance-game label." },
  { tag: "transgender", displayName: "Transgender", categoryId: "representation", legacyCategory: "general", aliases: ["trans", "trans characters"], adultEvidence: none, safetyRole: normal, description: "Transgender representation." },
  { tag: "nonbinary", displayName: "Nonbinary", categoryId: "representation", legacyCategory: "general", aliases: ["non-binary", "non binary", "enby"], adultEvidence: none, safetyRole: normal, description: "Nonbinary representation." },
  { tag: "gender-inclusive", displayName: "Gender Inclusive", categoryId: "representation", legacyCategory: "general", aliases: ["gender inclusive", "inclusive gender options"], adultEvidence: none, safetyRole: normal, description: "Gender-inclusive design." },
  { tag: "player-selectable-gender", displayName: "Selectable Player Gender", categoryId: "representation", legacyCategory: "general", aliases: ["player selectable gender", "choose gender", "gender choice"], adultEvidence: none, safetyRole: normal, description: "Player can select their gender." },

  // Protagonist and cast
  { tag: "male-protagonist", displayName: "Male Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["male protagonist", "male mc", "male player"], adultEvidence: none, safetyRole: normal, description: "Male protagonist." },
  { tag: "female-protagonist", displayName: "Female Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["female protagonist", "female mc", "female player"], adultEvidence: none, safetyRole: normal, description: "Female protagonist." },
  { tag: "nonbinary-protagonist", displayName: "Nonbinary Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["nonbinary protagonist", "non-binary protagonist", "enby protagonist"], adultEvidence: none, safetyRole: normal, description: "Nonbinary protagonist." },
  { tag: "custom-protagonist", displayName: "Custom Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["custom protagonist", "custom mc", "customizable protagonist"], adultEvidence: none, safetyRole: normal, description: "Customisable protagonist." },
  { tag: "selectable-protagonist", displayName: "Selectable Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["selectable protagonist", "choose protagonist"], adultEvidence: none, safetyRole: normal, description: "Choice of protagonist." },
  { tag: "multiple-protagonists", displayName: "Multiple Protagonists", categoryId: "protagonist", legacyCategory: "general", aliases: ["multiple protagonists", "multiple mc"], adultEvidence: none, safetyRole: normal, description: "Several protagonists." },
  { tag: "silent-protagonist", displayName: "Silent Protagonist", categoryId: "protagonist", legacyCategory: "general", aliases: ["silent protagonist", "blank slate protagonist"], adultEvidence: none, safetyRole: normal, description: "Silent or blank-slate protagonist." },
  { tag: "male-cast", displayName: "Male Cast", categoryId: "cast", legacyCategory: "general", aliases: ["male cast", "all male cast"], adultEvidence: none, safetyRole: normal, description: "Predominantly male cast." },
  { tag: "female-cast", displayName: "Female Cast", categoryId: "cast", legacyCategory: "general", aliases: ["female cast", "all female cast"], adultEvidence: none, safetyRole: normal, description: "Predominantly female cast." },
  { tag: "mixed-cast", displayName: "Mixed Cast", categoryId: "cast", legacyCategory: "general", aliases: ["mixed cast"], adultEvidence: none, safetyRole: normal, description: "Mixed-gender cast." },
  { tag: "nonhuman-cast", displayName: "Nonhuman Cast", categoryId: "cast", legacyCategory: "general", aliases: ["nonhuman cast", "non-human cast"], adultEvidence: none, safetyRole: normal, description: "Predominantly nonhuman cast." },
  { tag: "monster-cast", displayName: "Monster Cast", categoryId: "cast", legacyCategory: "general", aliases: ["monster cast", "monsters"], adultEvidence: none, safetyRole: normal, description: "Monster-focused cast." },
  { tag: "furry-cast", displayName: "Furry Cast", categoryId: "cast", legacyCategory: "general", aliases: ["furry cast", "anthro cast"], adultEvidence: none, safetyRole: normal, description: "Furry or anthro cast." },

  // Adult themes. These are supporting evidence unless otherwise noted.
  { tag: "vanilla", displayName: "Vanilla", categoryId: "adult-theme", legacyCategory: "content", aliases: ["vanilla content"], adultEvidence: supporting, safetyRole: normal, description: "Conventional consensual adult content." },
  { tag: "softcore", displayName: "Softcore", categoryId: "adult-theme", legacyCategory: "content", aliases: ["soft core", "softcore adult"], adultEvidence: strong, safetyRole: normal, description: "Softcore adult content.", impliedTags: ["adult"] },
  { tag: "hentai", displayName: "Hentai", categoryId: "adult-theme", legacyCategory: "content", aliases: ["h game", "h-game", "hentai game"], adultEvidence: strong, safetyRole: normal, description: "Hentai adult-content label.", impliedTags: ["adult"] },
  { tag: "furry-adult", displayName: "Furry Adult", categoryId: "adult-theme", legacyCategory: "content", aliases: ["furry adult", "furry nsfw", "adult furry"], adultEvidence: strong, safetyRole: normal, description: "Adult furry content.", impliedTags: ["adult", "furry"] },
  { tag: "monster-adult", displayName: "Monster Adult", categoryId: "adult-theme", legacyCategory: "content", aliases: ["monster adult", "monster nsfw", "adult monster"], adultEvidence: strong, safetyRole: normal, description: "Adult monster-themed content.", impliedTags: ["adult", "monster"] },
  { tag: "transformation", displayName: "Transformation", categoryId: "adult-theme", legacyCategory: "content", aliases: ["tf", "transformation theme"], adultEvidence: supporting, safetyRole: normal, description: "Transformation theme; not automatically explicit." },
  { tag: "body-modification", displayName: "Body Modification", categoryId: "adult-theme", legacyCategory: "content", aliases: ["body modification", "body mod"], adultEvidence: supporting, safetyRole: normal, description: "Body-modification theme." },
  { tag: "size-change", displayName: "Size Change", categoryId: "adult-theme", legacyCategory: "content", aliases: ["size change", "growth", "shrinking"], adultEvidence: supporting, safetyRole: normal, description: "Size-change theme." },
  { tag: "inflation", displayName: "Inflation", categoryId: "adult-theme", legacyCategory: "content", aliases: ["inflation theme"], adultEvidence: supporting, safetyRole: normal, description: "Inflation theme." },
  { tag: "pregnancy-theme", displayName: "Pregnancy Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["pregnancy", "pregnancy theme"], adultEvidence: supporting, safetyRole: normal, description: "Adult pregnancy theme involving adults." },
  { tag: "breeding-theme", displayName: "Breeding Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["breeding", "breeding theme"], adultEvidence: supporting, safetyRole: normal, description: "Consensual fictional adult breeding theme." },
  { tag: "dominance-theme", displayName: "Dominance Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["dominance", "domination", "dom"], adultEvidence: supporting, safetyRole: normal, description: "Consensual dominance theme." },
  { tag: "submission-theme", displayName: "Submission Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["submission", "submissive", "sub"], adultEvidence: supporting, safetyRole: normal, description: "Consensual submission theme." },
  { tag: "bondage-theme", displayName: "Bondage Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["bondage", "bdsm"], adultEvidence: supporting, safetyRole: normal, description: "Consensual bondage or BDSM theme." },
  { tag: "roleplay-theme", displayName: "Roleplay Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["adult roleplay", "roleplay kink"], adultEvidence: supporting, safetyRole: normal, description: "Consensual adult roleplay theme." },
  { tag: "voyeurism-theme", displayName: "Voyeurism Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["voyeurism", "voyeur"], adultEvidence: supporting, safetyRole: review, description: "Voyeurism theme requiring consent-context review." },
  { tag: "exhibitionism-theme", displayName: "Exhibitionism Theme", categoryId: "adult-theme", legacyCategory: "content", aliases: ["exhibitionism", "exhibitionist"], adultEvidence: supporting, safetyRole: review, description: "Exhibitionism theme requiring consent-context review." },

  // Character archetypes
  { tag: "human", displayName: "Human", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["human characters"], adultEvidence: none, safetyRole: normal, description: "Human characters." },
  { tag: "furry", displayName: "Furry", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["furries", "furry game"], adultEvidence: none, safetyRole: normal, description: "Furry characters or audience." },
  { tag: "anthro", displayName: "Anthro", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["anthropomorphic", "anthropomorphic animals"], adultEvidence: none, safetyRole: normal, description: "Anthropomorphic characters." },
  { tag: "monster", displayName: "Monster", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["monsters", "monster characters"], adultEvidence: none, safetyRole: normal, description: "Monster characters." },
  { tag: "monster-girl", displayName: "Monster Girl", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["monster girl", "monster girls"], adultEvidence: none, safetyRole: normal, description: "Monster-girl characters." },
  { tag: "monster-boy", displayName: "Monster Boy", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["monster boy", "monster boys"], adultEvidence: none, safetyRole: normal, description: "Monster-boy characters." },
  { tag: "demon", displayName: "Demon", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["demons", "demon characters"], adultEvidence: none, safetyRole: normal, description: "Demon characters." },
  { tag: "angel", displayName: "Angel", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["angels", "angel characters"], adultEvidence: none, safetyRole: normal, description: "Angel characters." },
  { tag: "vampire", displayName: "Vampire", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["vampires"], adultEvidence: none, safetyRole: normal, description: "Vampire characters." },
  { tag: "werewolf", displayName: "Werewolf", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["werewolves"], adultEvidence: none, safetyRole: normal, description: "Werewolf characters." },
  { tag: "alien", displayName: "Alien", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["aliens", "extraterrestrial"], adultEvidence: none, safetyRole: normal, description: "Alien characters." },
  { tag: "robot", displayName: "Robot", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["robots"], adultEvidence: none, safetyRole: normal, description: "Robot characters." },
  { tag: "android-characters", displayName: "Android Characters", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["android characters", "androids", "synthetic human"], adultEvidence: none, safetyRole: normal, description: "Android characters." },
  { tag: "superhero", displayName: "Superhero", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["superheroes", "super hero"], adultEvidence: none, safetyRole: normal, description: "Superhero characters." },
  { tag: "fantasy-race", displayName: "Fantasy Race", categoryId: "character-archetype", legacyCategory: "theme", aliases: ["fantasy race", "fantasy races"], adultEvidence: none, safetyRole: normal, description: "Fantasy humanoid races." },

  // Settings
  { tag: "college", displayName: "College", categoryId: "setting", legacyCategory: "setting", aliases: ["university", "college setting"], adultEvidence: none, safetyRole: review, description: "College or university setting; character ages still require normal classification." },
  { tag: "workplace", displayName: "Workplace", categoryId: "setting", legacyCategory: "setting", aliases: ["office", "workplace setting"], adultEvidence: none, safetyRole: normal, description: "Workplace setting." },
  { tag: "domestic", displayName: "Domestic", categoryId: "setting", legacyCategory: "setting", aliases: ["home setting", "domestic setting"], adultEvidence: none, safetyRole: normal, description: "Domestic or home setting." },
  { tag: "medieval", displayName: "Medieval", categoryId: "setting", legacyCategory: "setting", aliases: ["middle ages", "medieval setting"], adultEvidence: none, safetyRole: normal, description: "Medieval setting." },
  { tag: "cyberpunk", displayName: "Cyberpunk", categoryId: "setting", legacyCategory: "setting", aliases: ["cyber punk"], adultEvidence: none, safetyRole: normal, description: "Cyberpunk setting." },
  { tag: "post-apocalyptic", displayName: "Post-Apocalyptic", categoryId: "setting", legacyCategory: "setting", aliases: ["post apocalyptic", "post apocalypse"], adultEvidence: none, safetyRole: normal, description: "Post-apocalyptic setting." },
  { tag: "space", displayName: "Space", categoryId: "setting", legacyCategory: "setting", aliases: ["outer space", "space setting"], adultEvidence: none, safetyRole: normal, description: "Space setting." },
  { tag: "dungeon", displayName: "Dungeon", categoryId: "setting", legacyCategory: "setting", aliases: ["dungeons", "dungeon setting"], adultEvidence: none, safetyRole: normal, description: "Dungeon setting." },
  { tag: "school-setting", displayName: "School Setting", categoryId: "setting", legacyCategory: "setting", aliases: ["school setting", "school life"], adultEvidence: none, safetyRole: review, description: "School setting requiring age-context review in adult projects." },
  { tag: "rural", displayName: "Rural", categoryId: "setting", legacyCategory: "setting", aliases: ["countryside", "rural setting"], adultEvidence: none, safetyRole: normal, description: "Rural setting." },
  { tag: "urban", displayName: "Urban", categoryId: "setting", legacyCategory: "setting", aliases: ["city", "urban setting"], adultEvidence: none, safetyRole: normal, description: "Urban setting." },

  // Platforms and access
  { tag: "browser", displayName: "Browser", categoryId: "platform", legacyCategory: "format", aliases: ["web", "web game", "browser game", "play in browser"], adultEvidence: none, safetyRole: normal, description: "Playable in a browser." },
  { tag: "downloadable", displayName: "Downloadable", categoryId: "platform", legacyCategory: "format", aliases: ["download", "downloadable game"], adultEvidence: none, safetyRole: normal, description: "Downloadable build." },
  { tag: "windows", displayName: "Windows", categoryId: "platform", legacyCategory: "format", aliases: ["win", "windows download"], adultEvidence: none, safetyRole: normal, description: "Windows support." },
  { tag: "linux", displayName: "Linux", categoryId: "platform", legacyCategory: "format", aliases: ["linux download"], adultEvidence: none, safetyRole: normal, description: "Linux support." },
  { tag: "macos", displayName: "macOS", categoryId: "platform", legacyCategory: "format", aliases: ["mac", "osx", "mac os", "macos download"], adultEvidence: none, safetyRole: normal, description: "macOS support." },
  { tag: "android", displayName: "Android", categoryId: "platform", legacyCategory: "format", aliases: ["android download", "apk"], adultEvidence: none, safetyRole: normal, description: "Android support." },
  { tag: "singleplayer", displayName: "Singleplayer", categoryId: "platform", legacyCategory: "format", aliases: ["single player", "single-player"], adultEvidence: none, safetyRole: normal, description: "Single-player experience." },
  { tag: "multiplayer", displayName: "Multiplayer", categoryId: "platform", legacyCategory: "format", aliases: ["multi player", "multi-player"], adultEvidence: none, safetyRole: normal, description: "Multiplayer experience." },

  // Commercial and development
  { tag: "free", displayName: "Free", categoryId: "commercial", legacyCategory: "format", aliases: ["free game", "freeware"], adultEvidence: none, safetyRole: normal, description: "Free game." },
  { tag: "paid", displayName: "Paid", categoryId: "commercial", legacyCategory: "format", aliases: ["paid game", "premium"], adultEvidence: none, safetyRole: normal, description: "Paid game." },
  { tag: "name-your-own-price", displayName: "Name Your Own Price", categoryId: "commercial", legacyCategory: "format", aliases: ["name your own price", "pay what you want", "pwyw"], adultEvidence: none, safetyRole: normal, description: "Name-your-own-price access." },
  { tag: "demo", displayName: "Demo", categoryId: "commercial", legacyCategory: "format", aliases: ["game demo", "free demo"], adultEvidence: none, safetyRole: normal, description: "Demo release." },
  { tag: "prototype", displayName: "Prototype", categoryId: "development-status", legacyCategory: "format", aliases: ["prototype build", "proof of concept"], adultEvidence: none, safetyRole: normal, description: "Prototype-stage project." },
  { tag: "early-access", displayName: "Early Access", categoryId: "development-status", legacyCategory: "format", aliases: ["early access", "alpha", "beta"], adultEvidence: none, safetyRole: normal, description: "Early-access release." },
  { tag: "complete", displayName: "Complete", categoryId: "development-status", legacyCategory: "format", aliases: ["completed", "finished", "full release"], adultEvidence: none, safetyRole: normal, description: "Completed release." },
  { tag: "episodic", displayName: "Episodic", categoryId: "development-status", legacyCategory: "format", aliases: ["episodes", "chapter based", "chapter-based"], adultEvidence: none, safetyRole: normal, description: "Episodic release structure." },
  { tag: "abandoned", displayName: "Abandoned", categoryId: "development-status", legacyCategory: "format", aliases: ["cancelled", "canceled", "abandoned project"], adultEvidence: none, safetyRole: normal, description: "Development appears abandoned." },
  { tag: "in-development", displayName: "In Development", categoryId: "development-status", legacyCategory: "format", aliases: ["in development", "work in progress", "wip", "ongoing development"], adultEvidence: none, safetyRole: normal, description: "Actively in development." },
  { tag: "hiatus", displayName: "On Hiatus", categoryId: "development-status", legacyCategory: "format", aliases: ["on hiatus", "development paused"], adultEvidence: none, safetyRole: normal, description: "Development is paused." },

  // Length and replayability
  { tag: "short", displayName: "Short", categoryId: "session-length", legacyCategory: "format", aliases: ["short game", "under an hour"], adultEvidence: none, safetyRole: normal, description: "Short experience." },
  { tag: "medium-length", displayName: "Medium Length", categoryId: "session-length", legacyCategory: "format", aliases: ["medium length", "medium-length game"], adultEvidence: none, safetyRole: normal, description: "Medium-length experience." },
  { tag: "long", displayName: "Long", categoryId: "session-length", legacyCategory: "format", aliases: ["long game", "long-form"], adultEvidence: none, safetyRole: normal, description: "Long experience." },
  { tag: "replayable", displayName: "Replayable", categoryId: "session-length", legacyCategory: "format", aliases: ["replayability", "high replay value"], adultEvidence: none, safetyRole: normal, description: "Designed for replay." },
  { tag: "sandbox-loop", displayName: "Sandbox Loop", categoryId: "session-length", legacyCategory: "format", aliases: ["sandbox loop", "repeatable loop"], adultEvidence: none, safetyRole: normal, description: "Repeatable sandbox loop." },
  { tag: "one-shot", displayName: "One Shot", categoryId: "session-length", legacyCategory: "format", aliases: ["one shot", "single session"], adultEvidence: none, safetyRole: normal, description: "Single-session experience." },
  { tag: "ongoing", displayName: "Ongoing", categoryId: "session-length", legacyCategory: "format", aliases: ["ongoing game", "regular updates"], adultEvidence: none, safetyRole: normal, description: "Ongoing or continuously updated project." },

  // Internal safety and review tags
  { tag: "safe-for-adult-catalogue", displayName: "Safe for Adult Catalogue", categoryId: "safety", legacyCategory: "content", aliases: ["adult catalogue approved"], adultEvidence: none, safetyRole: normal, description: "Internally approved for the adult catalogue.", visibleInFilters: false, isRankable: false },
  { tag: "requires-review", displayName: "Requires Review", categoryId: "safety", legacyCategory: "content", aliases: ["manual review", "needs review"], adultEvidence: none, safetyRole: review, description: "Requires manual classification review.", visibleInFilters: false, isRankable: false },
  { tag: "age-ambiguous", displayName: "Age Ambiguous", categoryId: "safety", legacyCategory: "content", aliases: ["ambiguous age", "age unclear"], adultEvidence: none, safetyRole: review, description: "Character-age context is ambiguous.", visibleInFilters: false, isRankable: false },
  { tag: "consent-ambiguous", displayName: "Consent Ambiguous", categoryId: "safety", legacyCategory: "content", aliases: ["ambiguous consent", "consent unclear"], adultEvidence: none, safetyRole: review, description: "Consent context is ambiguous.", visibleInFilters: false, isRankable: false },
  { tag: "extreme-content", displayName: "Extreme Content", categoryId: "safety", legacyCategory: "content", aliases: ["extreme adult content"], adultEvidence: none, safetyRole: review, description: "Extreme content requiring review.", visibleInFilters: false, isRankable: false },
  { tag: "metadata-conflict", displayName: "Metadata Conflict", categoryId: "safety", legacyCategory: "content", aliases: ["conflicting metadata"], adultEvidence: none, safetyRole: review, description: "Conflicting classification metadata.", visibleInFilters: false, isRankable: false },
  { tag: "creator-warning", displayName: "Creator Warning", categoryId: "safety", legacyCategory: "content", aliases: ["creator content warning"], adultEvidence: none, safetyRole: review, description: "Creator-supplied warning requires review.", visibleInFilters: false, isRankable: false },
  { tag: "unknown-classification", displayName: "Unknown Classification", categoryId: "safety", legacyCategory: "content", aliases: ["classification unknown"], adultEvidence: none, safetyRole: review, description: "Adult classification is unknown.", visibleInFilters: false, isRankable: false },
  { tag: "blocked-content", displayName: "Blocked Content", categoryId: "safety", legacyCategory: "content", aliases: [], adultEvidence: none, safetyRole: blocked, description: "Internally blocked from normal catalogue views.", visibleInFilters: false, isRankable: false },
] as const;
