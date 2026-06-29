import type { BuildScale, MinecraftBuildBrief } from "../types/blueprint";

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function detectScale(text: string): BuildScale {
  if (includesAny(text, ["tiny", "small", "short", "mini", "compact"])) return "small";
  if (includesAny(text, ["huge", "massive", "large", "giant", "tall", "grand"])) return "large";
  return "medium";
}

function detectStructureType(text: string): string {
  if (includesAny(text, ["watchtower", "watch tower", "lookout"])) return "watchtower";
  if (includesAny(text, ["wizard tower", "mage tower", "sorcerer"])) return "wizard_tower";
  if (includesAny(text, ["tower", "spire", "keep"])) return "tower";
  return "tower";
}

function detectTheme(text: string): string {
  if (includesAny(text, ["snow", "snowy", "frozen", "ice", "icy", "arctic", "winter"])) return "snow";
  if (includesAny(text, ["dark wizard", "dark fantasy", "evil", "necromancer", "shadow", "gothic"])) return "dark_fantasy";
  if (includesAny(text, ["ruin", "ruined", "broken", "abandoned", "collapsed", "decayed"])) return "ruined";
  if (includesAny(text, ["create", "industrial", "factory", "cog", "gear", "steam", "brass"])) return "create_industrial";
  if (includesAny(text, ["deepslate", "blackstone", "deep stone"])) return "deepslate";
  if (includesAny(text, ["wood", "wooden", "timber", "log cabin", "palisade"])) return "wooden";
  if (includesAny(text, ["medieval", "castle", "stone", "kingdom", "fort"])) return "medieval";
  return "medieval";
}

function detectFeatures(text: string): string[] {
  const features = new Set<string>();

  if (includesAny(text, ["window", "windows", "arched"])) features.add("arched_windows");
  if (includesAny(text, ["pillar", "pillars", "supports", "buttress", "corners"])) features.add("corner_pillars");
  if (includesAny(text, ["lantern", "lanterns", "lit", "light", "torch", "torches"])) features.add("lanterns");
  if (includesAny(text, ["ladder", "climb", "interior access"])) features.add("ladder");
  if (includesAny(text, ["broken roof", "collapsed roof", "damaged roof", "ruined roof"])) features.add("broken_roof");
  if (includesAny(text, ["snow", "snowy", "frozen", "winter", "ice"])) features.add("snow_layers");
  if (includesAny(text, ["moss", "mossy", "overgrown", "weathered", "old"])) features.add("mossy_weathering");
  if (includesAny(text, ["crack", "cracked", "broken", "damaged", "ruin", "ruined"])) features.add("cracked_blocks");

  if (features.size === 0) {
    features.add("arched_windows");
    features.add("corner_pillars");
  }

  return [...features];
}

function detectMoodStyle(text: string): string[] {
  const mood = new Set<string>();

  if (includesAny(text, ["ruined", "broken", "abandoned", "collapsed"])) mood.add("ruined");
  if (includesAny(text, ["snow", "snowy", "cold", "frozen", "winter"])) mood.add("cold");
  if (includesAny(text, ["dark", "evil", "wizard", "necromancer", "shadow"])) mood.add("ominous");
  if (includesAny(text, ["medieval", "castle", "fort", "kingdom"])) mood.add("medieval");
  if (includesAny(text, ["industrial", "factory", "create", "steam"])) mood.add("industrial");
  if (includesAny(text, ["wooden", "timber", "log"])) mood.add("rustic");

  if (mood.size === 0) mood.add("functional");

  return [...mood];
}

function detectTargetUseCase(text: string): string {
  if (includesAny(text, ["watchtower", "watch tower", "lookout", "guard"])) return "lookout_defense";
  if (includesAny(text, ["wizard", "mage", "magic", "sorcerer"])) return "wizard_outpost";
  if (includesAny(text, ["base", "starter", "survival"])) return "survival_base";
  if (includesAny(text, ["decoration", "decorative", "landmark"])) return "landmark";
  return "minecraft_structure";
}

export function createBuildBrief(prompt: string): MinecraftBuildBrief {
  const originalPrompt = prompt.trim();
  const normalized = normalizePrompt(prompt);

  return {
    originalPrompt,
    structureType: detectStructureType(normalized),
    theme: detectTheme(normalized),
    scale: detectScale(normalized),
    features: detectFeatures(normalized),
    moodStyle: detectMoodStyle(normalized),
    targetUseCase: detectTargetUseCase(normalized),
  };
}
