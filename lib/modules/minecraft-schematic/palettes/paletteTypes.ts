import type {
  BlockRegistryReport,
  GeneratedSchematicBuild,
  MinecraftBlockName,
} from "../types";

export type PaletteRole =
  | "wallPrimary"
  | "wallSecondary"
  | "trim"
  | "roof"
  | "floor"
  | "window"
  | "accent"
  | "light"
  | "path"
  | "foundation";

export type PaletteTextureRole =
  | "wallTexture"
  | "floorTexture"
  | "roofTexture"
  | "foundationTexture"
  | "pathTexture"
  | "accentTexture";

export const requiredPaletteRoles: readonly PaletteRole[] = [
  "wallPrimary",
  "wallSecondary",
  "trim",
  "roof",
  "floor",
  "window",
  "accent",
  "light",
  "path",
  "foundation",
] as const;

export type WeightedPaletteBlock = {
  block: MinecraftBlockName;
  weight: number;
};

export type SchematicPaletteRoles = Record<PaletteRole, MinecraftBlockName>;

export type SchematicPaletteTextures = Partial<
  Record<PaletteTextureRole, WeightedPaletteBlock[]>
>;

export type SchematicPaletteDefinition = {
  schemaVersion: 1;
  id: string;
  displayName: string;
  description?: string;
  tags?: string[];
  minecraftVersion?: string;
  targetMinecraftVersion?: string;
  profile?: string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  roles: SchematicPaletteRoles;
  textures?: SchematicPaletteTextures;
  aliases?: string[];
  generated?: {
    prompt: string;
    generatedAt: string;
  };
};

export type PaletteCompatibilityIssue = {
  severity: "error" | "warning";
  message: string;
  block?: MinecraftBlockName;
  replacement?: MinecraftBlockName;
  role?: string;
};

export type PaletteCompatibilityResult = {
  ok: boolean;
  paletteId: string;
  targetMinecraftVersion?: string;
  profile?: string;
  changedBlocks: number;
  fallbackBlocks: number;
  unsupportedBlocks: number;
  issues: PaletteCompatibilityIssue[];
  blockRegistryReport?: BlockRegistryReport;
  finalizedPalette?: SchematicPaletteDefinition;
};

export type PaletteApplyOptions = {
  targetMinecraftVersion?: string;
  profile?: string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  seed?: string;
  retextureExistingBlocks?: boolean;
};

export type PaletteBuildMetadata = {
  paletteId: string;
  paletteDisplayName: string;
  paletteTargetMinecraftVersion?: string;
  paletteProfile?: string;
  paletteChangedBlocks?: number;
  paletteFallbackBlocks?: number;
  paletteUnsupportedBlocks?: number;
};

export type PaletteAwareBuild = GeneratedSchematicBuild & {
  paletteId?: string;
  paletteMetadata?: PaletteBuildMetadata;
  paletteCompatibility?: PaletteCompatibilityResult;
};
