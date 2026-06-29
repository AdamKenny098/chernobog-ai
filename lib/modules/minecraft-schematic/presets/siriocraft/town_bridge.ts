import type { SirioCraftSchematicPreset } from "./types";

export const townBridgePreset: SirioCraftSchematicPreset = {
  id: "town_bridge",
  displayName: "Town Bridge",
  description: "A town-road bridge preset for paths, rivers, and settlement approaches.",
  category: "town",
  generator: "bridge",
  variant: "town_bridge",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 11, y: 12, z: 37 },
  features: ["road_deck", "railings", "lamps", "town_pathing", "bridge_supports"],
  tags: ["town", "bridge", "road", "transport"],
  recommendedUse: "Settlement entrance, path crossing, or town road network connector.",
  promptHints: ["town bridge", "settlement bridge", "village bridge", "spawn bridge"],
};
