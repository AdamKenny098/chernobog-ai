import type { SirioCraftSchematicPreset } from "./types";

export const roadsideCheckpointPreset: SirioCraftSchematicPreset = {
  id: "roadside_checkpoint",
  displayName: "Roadside Checkpoint",
  description: "A gatehouse-routed checkpoint preset for faction roads, toll gates, and controlled settlement entrances.",
  category: "faction",
  generator: "gatehouse",
  variant: "roadside_checkpoint",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 31, y: 19, z: 13 },
  features: ["checkpoint_gate", "portcullis", "guard_towers", "road_control", "wall_stubs"],
  tags: ["faction", "checkpoint", "road", "gate", "utility"],
  recommendedUse: "Road control point, faction border crossing, or town entry checkpoint.",
  promptHints: ["roadside checkpoint", "road checkpoint", "faction checkpoint", "toll gate", "border checkpoint"],
};
