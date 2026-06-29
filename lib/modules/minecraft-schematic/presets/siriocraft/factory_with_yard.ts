import type { SirioCraftSchematicPreset } from "./types";

export const factoryWithYardPreset: SirioCraftSchematicPreset = {
  id: "factory_with_yard",
  displayName: "Factory With Yard",
  description: "A larger factory variant with a work yard, storage clusters, loading space, and Create-aware industrial detail.",
  category: "industrial",
  generator: "factory",
  variant: "factory_with_yard",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 43, y: 27, z: 35 },
  features: ["factory_hall", "yard", "loading", "storage", "industrial_details"],
  tags: ["industrial", "factory", "yard", "loading", "create", "siriocraft", "create-blocks"],
  recommendedUse: "Larger town/faction production site with room for future Create machinery.",
  promptHints: ["factory with yard", "yard factory", "large factory yard", "factory yard build", "industrial factory yard"],
};
