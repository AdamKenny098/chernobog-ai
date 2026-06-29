import type { SirioCraftSchematicPreset } from "./types";

export const machineHousePreset: SirioCraftSchematicPreset = {
  id: "machine_house",
  displayName: "Machine House",
  description: "A compact industrial machine hall with pipes, cog motifs, roof detail, and Create-aware block details for future Create machinery.",
  category: "industrial",
  generator: "factory",
  variant: "machine_house",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 30, y: 20, z: 26 },
  features: ["machine_hall", "pipe_runs", "cog_motifs", "chimney", "industrial_windows"],
  tags: ["industrial", "machine", "factory", "utility", "create", "siriocraft", "create-blocks"],
  recommendedUse: "Small Create-adjacent utility building, workshop core, or machinery room.",
  promptHints: ["machine house", "machinehouse", "small machine hall", "machine building", "create machine house"],
};
