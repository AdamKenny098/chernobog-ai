import type { SirioCraftSchematicPreset } from "./types";

export const smallHousePreset: SirioCraftSchematicPreset = {
  id: "small_house",
  displayName: "Small House",
  description: "A compact SirioCraft settlement house with foundation, porch, shutters, chimney, lean-to, and basic interior zones.",
  category: "town",
  generator: "house",
  variant: "small_house",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 17, y: 13, z: 17 },
  features: ["foundation", "porch", "windows", "shutters", "chimney", "lean_to", "interior_storage"],
  tags: ["town", "house", "settlement", "starter", "vanilla"],
  recommendedUse: "Town housing, faction village filler, roadside shelter, or spawn settlement detail.",
  promptHints: ["small house", "starter house", "small home", "cottage", "starter home"],
};
