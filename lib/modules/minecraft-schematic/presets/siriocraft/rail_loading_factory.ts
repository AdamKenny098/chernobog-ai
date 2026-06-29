import type { SirioCraftSchematicPreset } from "./types";

export const railLoadingFactoryPreset: SirioCraftSchematicPreset = {
  id: "rail_loading_factory",
  displayName: "Rail Loading Factory",
  description: "A rail-side factory/loading preset with long loading face, cargo handling area, and rail siding placeholder.",
  category: "transport",
  generator: "factory",
  variant: "rail_loading_factory",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 42, y: 22, z: 30 },
  features: ["rail_siding", "loading_platform", "cargo_clusters", "factory_body", "transport_focus"],
  tags: ["industrial", "factory", "rail", "loading", "cargo", "transport", "siriocraft", "create-blocks"],
  recommendedUse: "Rail logistics point beside a station, factory, or storage yard.",
  promptHints: ["rail loading factory", "rail factory", "loading factory", "factory with rail", "rail siding factory"],
};
