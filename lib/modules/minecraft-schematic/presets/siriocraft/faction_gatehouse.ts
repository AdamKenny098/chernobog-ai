import type { SirioCraftSchematicPreset } from "./types";

export const factionGatehousePreset: SirioCraftSchematicPreset = {
  id: "faction_gatehouse",
  displayName: "Faction Gatehouse",
  description: "A two-tower gatehouse for faction entrances, road checkpoints, and town wall connections.",
  category: "faction",
  generator: "gatehouse",
  variant: "gatehouse",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 31, y: 19, z: 13 },
  features: ["two_towers", "deep_gate", "portcullis", "walkway", "battlements", "arrow_slits"],
  tags: ["faction", "gatehouse", "gate", "defense", "checkpoint"],
  recommendedUse: "Faction base entrance, settlement wall gate, or controlled road entry.",
  promptHints: ["faction gatehouse", "faction gate", "castle gate", "town gate", "gatehouse", "gate house"],
};
