import type { SirioCraftSchematicPreset } from "./types";

export const createStarterFactoryPreset: SirioCraftSchematicPreset = {
  id: "create_starter_factory",
  displayName: "Create-Style Starter Factory",
  description: "A vanilla-safe starter factory with industrial hall, chimney, loading bay, yard details, pipe runs, and cogwheel-style motifs.",
  category: "industrial",
  generator: "factory",
  variant: "create_starter_factory",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 43, y: 27, z: 35 },
  features: ["industrial_hall", "sawtooth_roof", "chimney", "loading_bay", "yard", "pipes", "catwalks", "vanilla_cog_motifs"],
  tags: ["create", "factory", "industrial", "starter", "siriocraft", "create-blocks", "vanilla-fallback"],
  recommendedUse: "Create starter area, faction production zone, or spawn-side industrial district centerpiece.",
  promptHints: [
    "create starter factory",
    "starter factory",
    "small create style starter factory",
    "industrial factory",
    "small factory",
    "siriocraft factory",
  ],
};
