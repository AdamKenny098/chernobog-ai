export const ALLOWED_GENERATORS = ["tower"] as const;

export const ALLOWED_THEMES = [
  "medieval",
  "ruined",
  "snow",
  "dark_fantasy",
  "create_industrial",
  "deepslate",
  "wooden",
] as const;

export const ALLOWED_ROOF_TYPES = [
  "flat_battlement",
  "peaked",
  "ruined",
  "watch_platform",
] as const;

export const ALLOWED_FEATURES = [
  "arched_windows",
  "corner_pillars",
  "lanterns",
  "ladder",
  "broken_roof",
  "snow_layers",
  "mossy_weathering",
  "cracked_blocks",
] as const;

export const ALLOWED_PALETTES = [
  "medieval",
  "ruined",
  "snow",
  "dark_fantasy",
  "create_industrial",
  "deepslate",
  "wooden",
] as const;

export type MinecraftSchematicGenerator = (typeof ALLOWED_GENERATORS)[number];
export type MinecraftSchematicTheme = (typeof ALLOWED_THEMES)[number];
export type MinecraftSchematicRoofType = (typeof ALLOWED_ROOF_TYPES)[number];
export type MinecraftSchematicFeature = (typeof ALLOWED_FEATURES)[number];
export type MinecraftSchematicPalette = (typeof ALLOWED_PALETTES)[number];

export type BuildScale = "small" | "medium" | "large";

export interface MinecraftBuildBrief {
  originalPrompt: string;
  structureType: string;
  theme: string;
  scale: BuildScale;
  features: string[];
  moodStyle: string[];
  targetUseCase: string;
}

export interface TowerDimensions {
  radius: number;
  height: number;
  floors: number;
}

export interface MinecraftBlueprint {
  generator: MinecraftSchematicGenerator;
  theme: MinecraftSchematicTheme;
  scale: BuildScale;
  roofType: MinecraftSchematicRoofType;
  features: MinecraftSchematicFeature[];
  palette: MinecraftSchematicPalette;
  dimensions: TowerDimensions;
  seed: number;
}

export interface BlueprintValidationResult {
  valid: boolean;
  blueprint: MinecraftBlueprint;
  repairedFields: Record<string, { from: unknown; to: unknown; reason: string }>;
  warnings: string[];
  rejectedFields: Record<string, unknown>;
}

export interface BlueprintTraceMetadata {
  originalPrompt: string;
  buildBrief: MinecraftBuildBrief;
  candidateBlueprint: unknown;
  finalBlueprint: MinecraftBlueprint;
  repairedFields: BlueprintValidationResult["repairedFields"];
  validationWarnings: string[];
  rejectedFields: BlueprintValidationResult["rejectedFields"];
  outputPaths?: {
    schematic?: string;
    metadata?: string;
    vaultNote?: string;
    debugJson?: string;
  };
}

export const DEFAULT_TOWER_BLUEPRINT: MinecraftBlueprint = {
  generator: "tower",
  theme: "medieval",
  scale: "medium",
  roofType: "flat_battlement",
  features: ["arched_windows", "corner_pillars"],
  palette: "medieval",
  dimensions: {
    radius: 5,
    height: 22,
    floors: 4,
  },
  seed: 1337,
};
