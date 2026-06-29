import type { SirioCraftSchematicPreset } from "./types";

export const ruinedOutpostPreset: SirioCraftSchematicPreset = {
  id: "ruined_outpost",
  displayName: "Ruined Outpost",
  description: "A low ruined compound with broken walls, gate gap, rubble, camp area, small lookout ruin, and abandoned storage.",
  category: "ruins",
  generator: "outpost",
  variant: "ruined_outpost",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 25, y: 12, z: 25 },
  features: ["broken_walls", "gate_gap", "rubble", "camp_area", "lookout_ruin", "abandoned_storage"],
  tags: ["ruined", "outpost", "abandoned", "faction", "compound", "frontier"],
  recommendedUse: "Exploration ruin, faction frontier marker, or roadside encounter site.",
  promptHints: ["ruined outpost", "abandoned outpost", "broken outpost", "outpost ruin"],
};
