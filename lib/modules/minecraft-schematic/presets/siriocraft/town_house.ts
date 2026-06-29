import type { SirioCraftSchematicPreset } from "./types";

export const townHousePreset: SirioCraftSchematicPreset = {
  id: "town_house",
  displayName: "Town House",
  description: "A town-facing house preset using the current house generator and settlement metadata.",
  category: "town",
  generator: "house",
  variant: "town_house",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 17, y: 13, z: 17 },
  features: ["house_shell", "porch", "roof", "windows", "chimney", "settlement_use"],
  tags: ["town", "house", "settlement", "spawn", "village"],
  recommendedUse: "Spawn town plot, player settlement filler, or faction residential street.",
  promptHints: ["town house", "village house", "settlement house", "spawn house"],
};
