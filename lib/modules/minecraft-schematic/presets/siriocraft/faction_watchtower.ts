import type { SirioCraftSchematicPreset } from "./types";

export const factionWatchtowerPreset: SirioCraftSchematicPreset = {
  id: "faction_watchtower",
  displayName: "Faction Watchtower",
  description: "A medieval watchtower preset for faction borders, settlement defense, and navigation landmarks.",
  category: "faction",
  generator: "tower",
  variant: "medieval",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 15, y: 22, z: 15 },
  features: ["vertical_silhouette", "battlements", "windows", "faction_defense"],
  tags: ["faction", "watchtower", "defense", "tower"],
  recommendedUse: "Faction border marker, town lookout, or road-side warning post.",
  promptHints: ["faction watchtower", "faction tower", "watchtower", "defense tower"],
};
