import type { SirioCraftSchematicPreset } from "./types";

export const trainStationSmallPreset: SirioCraftSchematicPreset = {
  id: "train_station_small",
  displayName: "Small Train Station",
  description: "A small train station with rails, platform, canopy, waiting hut, cargo props, lamps, and sign metadata.",
  category: "transport",
  generator: "train_station",
  variant: "train_station_small",
  profile: "vanilla",
  allowModdedBlocks: false,
  fallbackToVanilla: true,
  size: { x: 35, y: 13, z: 17 },
  features: ["platform", "rails", "canopy", "waiting_hut", "cargo", "lamps", "station_sign"],
  tags: ["train", "station", "rail", "transport", "town", "siriocraft"],
  recommendedUse: "Settlement rail stop, spawn transport hub, or faction logistics point.",
  promptHints: ["small train station", "train station", "rail station", "station small", "small train"],
};
