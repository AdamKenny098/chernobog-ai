import type { SirioCraftSchematicPreset } from "./types";

export const spawnMarketStallPreset: SirioCraftSchematicPreset = {
  id: "spawn_market_stall",
  displayName: "Spawn Market Stall",
  description: "A small spawn-town trading stall preset. Uses the house-family generator until a dedicated market generator exists.",
  category: "spawn",
  generator: "house",
  variant: "market_stall",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 13, y: 9, z: 11 },
  features: ["stall_counter", "canopy", "storage_barrels", "spawn_market_use"],
  tags: ["spawn", "market", "stall", "town", "shop"],
  recommendedUse: "Spawn market, trade square, town shop row, or community notice area.",
  promptHints: ["spawn market stall", "market stall", "spawn shop", "trading stall", "shop stall"],
};
