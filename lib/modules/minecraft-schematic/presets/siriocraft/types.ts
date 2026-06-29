import type { BlockRegistryProfileId, SchematicGeneratorName, SchematicSize, SchematicVariant } from "../../types";

export type SirioCraftPresetCategory =
  | "spawn"
  | "town"
  | "faction"
  | "industrial"
  | "transport"
  | "ruins"
  | "utility";

export type SirioCraftSchematicPreset = {
  id: string;
  displayName: string;
  description: string;
  category: SirioCraftPresetCategory;
  generator: SchematicGeneratorName;
  variant: SchematicVariant;
  profile: BlockRegistryProfileId;
  allowModdedBlocks: boolean;
  fallbackToVanilla: boolean;
  size: SchematicSize;
  features: string[];
  tags: string[];
  recommendedUse: string;
  promptHints: string[];
};
