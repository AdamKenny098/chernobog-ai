import type { SirioCraftSchematicPreset } from "./types";

export const warehouseSmallPreset: SirioCraftSchematicPreset = {
  id: "warehouse_small",
  displayName: "Small Warehouse",
  description: "A small industrial warehouse with loading bay, storage rows, and simple vanilla industrial styling.",
  category: "industrial",
  generator: "factory",
  variant: "warehouse_small",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 28, y: 16, z: 24 },
  features: ["warehouse_shell", "loading_bay", "storage_rows", "industrial_roof", "cargo"],
  tags: ["industrial", "warehouse", "storage", "cargo", "small", "siriocraft"],
  recommendedUse: "Factory support building, storage lot anchor, or rail cargo shed.",
  promptHints: ["small warehouse", "warehouse small", "cargo warehouse", "industrial warehouse"],
};
