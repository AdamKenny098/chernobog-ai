import type { SirioCraftSchematicPreset } from "./types";

export const watchPostPreset: SirioCraftSchematicPreset = {
  id: "watch_post",
  displayName: "Watch Post",
  description: "A compact defensive lookout preset routed through the tower generator for faction roads and town outskirts.",
  category: "faction",
  generator: "tower",
  variant: "wooden",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 15, y: 22, z: 15 },
  features: ["lookout", "vertical_marker", "defensive_post", "faction_utility"],
  tags: ["faction", "watch", "post", "lookout", "defense"],
  recommendedUse: "Roadside lookout, border post, hill marker, or faction watch point.",
  promptHints: ["watch post", "lookout post", "small lookout", "road watch post"],
};
