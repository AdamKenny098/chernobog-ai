// lib/modules/minecraft-schematic/block-registry/blockRegistryTypes.ts

export type MinecraftBlockTag =
  | "air"
  | "stone"
  | "wood"
  | "wall"
  | "floor"
  | "roof"
  | "trim"
  | "glass"
  | "light"
  | "metal"
  | "factory"
  | "medieval"
  | "natural"
  | "decorative"
  | "utility"
  | "nether"
  | "modern"
  | "legacy-safe"
  | "abandoned"
  | "ruins"
  | "weathered";


export interface MinecraftBlockRegistryEntry {
  id: string;
  introducedIn: string;
  tags: MinecraftBlockTag[];
  vanilla: boolean;
  solid: boolean;
  transparent: boolean;
  substitutions?: string[];
  omitWhenUnavailable?: boolean;
  legacyAliases?: Partial<Record<string, string>>;
}

export interface BlockResolutionResult {
  requestedBlockId: string;
  resolvedBlockId: string;
  targetMinecraftVersion: string;
  allowed: boolean;
  substituted: boolean;
  omitted: boolean;
  reason: string;
  chain: string[];
}

export interface BlockVersionIssue {
  blockId: string;
  targetMinecraftVersion: string;
  introducedIn?: string;
  reason: string;
  suggestedReplacement?: string;
}

export interface BlockVersionLimitReport {
  targetMinecraftVersion: string;
  checkedBlockCount: number;
  allowedBlocks: string[];
  substitutedBlocks: Array<{
    from: string;
    to: string;
    chain: string[];
  }>;
  omittedBlocks: string[];
  incompatibleBlocks: BlockVersionIssue[];
}
