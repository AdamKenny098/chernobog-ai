import type { SirioCraftSchematicPreset } from "./types";

export const stoneBridgePreset: SirioCraftSchematicPreset = {
  id: "stone_bridge",
  displayName: "Stone Bridge",
  description: "A vanilla stone bridge with open side arches, road deck, railings, supports, and lamp rhythm.",
  category: "transport",
  generator: "bridge",
  variant: "stone_bridge",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 11, y: 12, z: 37 },
  features: ["open_arches", "road_deck", "railings", "lamps", "abutments", "supports"],
  tags: ["transport", "bridge", "stone", "road", "town"],
  recommendedUse: "River crossing, road connector, town approach, or spawn path landmark.",
  promptHints: ["stone bridge", "river bridge", "road bridge", "bridge crossing", "river crossing"],
};
