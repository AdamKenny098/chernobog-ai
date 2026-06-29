import type { SirioCraftSchematicPreset } from "./types";

export const storageShedPreset: SirioCraftSchematicPreset = {
  id: "storage_shed",
  displayName: "Storage Shed",
  description: "A small utility shed preset for town storage, yard clutter, or faction base support buildings.",
  category: "utility",
  generator: "house",
  variant: "storage_shed",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 13, y: 10, z: 13 },
  features: ["utility_shell", "storage", "barrels", "small_roof", "yard_support"],
  tags: ["utility", "shed", "storage", "town", "faction"],
  recommendedUse: "Small storage building beside houses, factories, stations, or faction bases.",
  promptHints: ["storage shed", "small shed", "utility shed", "supply shed"],
};
