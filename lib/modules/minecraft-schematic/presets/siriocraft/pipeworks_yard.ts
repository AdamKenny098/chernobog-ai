import type { SirioCraftSchematicPreset } from "./types";

export const pipeworksYardPreset: SirioCraftSchematicPreset = {
  id: "pipeworks_yard",
  displayName: "Pipeworks Yard",
  description: "An open utility yard focused on pipe racks, service hut, industrial clutter, and Create-aware pipe details.",
  category: "industrial",
  generator: "factory",
  variant: "pipeworks_yard",
  profile: "siriocraft-create",
  allowModdedBlocks: true,
  fallbackToVanilla: true,
  size: { x: 36, y: 16, z: 30 },
  features: ["pipe_racks", "service_hut", "open_yard", "utility_clutter", "yard_lights"],
  tags: ["industrial", "pipeworks", "pipes", "yard", "utility", "create", "siriocraft", "create-blocks"],
  recommendedUse: "Utility corner beside a factory, rail yard, or mechanical district.",
  promptHints: ["pipeworks yard", "pipe works yard", "pipe yard", "pipeworks", "pipe rack yard"],
};
