import type { SirioCraftSchematicPreset } from "./types";

export const smallWorkshopPreset: SirioCraftSchematicPreset = {
  id: "small_workshop",
  displayName: "Small Industrial Workshop",
  description: "A compact workshop preset with small yard, chimney detail, and Create-aware industrial decoration.",
  category: "industrial",
  generator: "factory",
  variant: "small_workshop",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 28, y: 18, z: 24 },
  features: ["compact_workshop", "small_yard", "chimney", "storage", "industrial_trim"],
  tags: ["industrial", "workshop", "small", "starter", "utility", "siriocraft", "create-blocks"],
  recommendedUse: "Starter industrial building, faction utility shop, or town workshop.",
  promptHints: ["small workshop", "workshop", "industrial workshop", "create workshop", "starter workshop"],
};
