import type { SirioCraftSchematicPreset } from "./types";

export const industrialStorageYardPreset: SirioCraftSchematicPreset = {
  id: "industrial_storage_yard",
  displayName: "Industrial Storage Yard",
  description: "A yard-first industrial preset with fenced work area, cargo stacks, pipe racks, rail siding placeholder, warehouse, and gantry silhouette.",
  category: "industrial",
  generator: "factory",
  variant: "industrial_storage_yard",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 44, y: 18, z: 36 },
  features: ["fenced_yard", "warehouse", "rail_siding", "gantry", "cargo_stacks", "pipe_racks", "yard_lighting"],
  tags: ["industrial", "storage", "yard", "factory", "rail", "cargo", "warehouse", "gantry", "siriocraft", "create-blocks"],
  recommendedUse: "Industrial district filler, rail-side cargo area, or faction logistics yard.",
  promptHints: [
    "industrial storage yard",
    "storage yard",
    "cargo yard",
    "rail storage yard",
    "industrial yard",
    "large cargo storage yard",
    "rail loading storage yard",
  ],
};
