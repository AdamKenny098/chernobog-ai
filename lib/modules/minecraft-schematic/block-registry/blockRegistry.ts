import type {
  BlockRegistryProfile,
  BlockRegistryProfileId,
  BlockRegistryReport,
  BlockRegistryReplacementRecord,
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
} from "../types";

const CREATE_BLOCK_FALLBACKS: Partial<Record<MinecraftBlockName, MinecraftBlockName>> = {
  "create:cogwheel": "minecraft:cut_copper",
  "create:large_cogwheel": "minecraft:cut_copper",
  "create:shaft": "minecraft:stripped_oak_log",
  "create:andesite_casing": "minecraft:polished_andesite",
  "create:brass_casing": "minecraft:cut_copper",
  "create:fluid_pipe": "minecraft:copper_block",

  // Legacy / older generated names kept for compatibility.
  "create:mechanical_belt": "minecraft:black_wool",
  "create:belt_connector": "minecraft:black_wool",
  "create:vertical_gearbox": "minecraft:polished_andesite",

  // M6-B Create graph compiler block IDs.
  "create:belt": "minecraft:black_wool",
  "create:depot": "minecraft:smooth_stone_slab",
  "create:chute": "minecraft:hopper",
  "create:andesite_funnel": "minecraft:hopper",
  "create:brass_funnel": "minecraft:hopper",
  "create:gearbox": "minecraft:polished_andesite",
  "create:mechanical_press": "minecraft:anvil",
  "create:mechanical_mixer": "minecraft:lightning_rod",
  "create:basin": "minecraft:cauldron",
  "create:water_wheel": "minecraft:oak_planks",
  "create:large_water_wheel": "minecraft:oak_planks",
  "create:railway_casing": "minecraft:polished_deepslate",
  "create:metal_girder": "minecraft:iron_bars",
  "create:track": "minecraft:rail",
};

const SUPPORTED_CREATE_BLOCKS = Object.keys(CREATE_BLOCK_FALLBACKS) as MinecraftBlockName[];

export const blockRegistryProfiles = [
  {
    id: "vanilla",
    displayName: "Vanilla Minecraft",
    description: "Only minecraft:* block IDs are allowed. Modded blocks are replaced with safe vanilla fallbacks when fallbackToVanilla is enabled.",
    allowedNamespaces: ["minecraft"],
    supportedModdedBlocks: [],
    allowModdedBlocksDefault: false,
    fallbackToVanillaDefault: true,
    fallbackBlocks: CREATE_BLOCK_FALLBACKS,
  },
  {
    id: "siriocraft-create",
    displayName: "SirioCraft Create",
    description: "Minecraft blocks plus a conservative allow-list of Create block IDs. This profile is gated by allowModdedBlocks and still falls back safely when requested.",
    allowedNamespaces: ["minecraft", "create"],
    supportedModdedBlocks: SUPPORTED_CREATE_BLOCKS,
    allowModdedBlocksDefault: true,
    fallbackToVanillaDefault: true,
    fallbackBlocks: CREATE_BLOCK_FALLBACKS,
  },
] as const satisfies readonly BlockRegistryProfile[];

export function normalizeBlockRegistryProfileId(value: string | undefined): BlockRegistryProfileId {
  if (value === "siriocraft-create" || value === "siriocraft_create" || value === "create" || value === "siriocraft create") {
    return "siriocraft-create";
  }

  return "vanilla";
}

export function getBlockRegistryProfile(value: string | undefined): BlockRegistryProfile {
  const id = normalizeBlockRegistryProfileId(value);
  return blockRegistryProfiles.find((profile) => profile.id === id) ?? blockRegistryProfiles[0];
}

export function getBaseBlockId(blockState: string): string {
  return blockState.split("[")[0] ?? blockState;
}

export function getBlockNamespace(blockState: string): string {
  const baseId = getBaseBlockId(blockState);
  return baseId.includes(":") ? baseId.split(":")[0] ?? "" : "";
}

function withReplacedBaseBlockId(blockState: MinecraftBlockName, replacementBaseId: MinecraftBlockName): MinecraftBlockName {
  const stateStart = blockState.indexOf("[");

  // State carry-over is intentionally not attempted here. Many modded blocks do not
  // share state properties with their fallback blocks, and carrying invalid state text
  // would create broken .schem palette entries.
  if (stateStart >= 0) {
    return replacementBaseId;
  }

  return replacementBaseId;
}

function isSupportedByProfile(baseId: string, profile: BlockRegistryProfile, allowModdedBlocks: boolean): boolean {
  const namespace = getBlockNamespace(baseId);

  if (namespace === "minecraft") {
    return true;
  }

  if (!allowModdedBlocks) {
    return false;
  }

  if (!profile.allowedNamespaces.includes(namespace)) {
    return false;
  }

  return profile.supportedModdedBlocks.includes(baseId as MinecraftBlockName);
}

function createEmptyReport(
  profile: BlockRegistryProfile,
  allowModdedBlocks: boolean,
  fallbackToVanilla: boolean,
): BlockRegistryReport {
  return {
    profileId: profile.id,
    profileDisplayName: profile.displayName,
    allowModdedBlocks,
    fallbackToVanilla,
    allowedNamespaces: [...profile.allowedNamespaces],
    supportedModdedBlocks: [...profile.supportedModdedBlocks],
    totalBlocksChecked: 0,
    totalPaletteEntriesChecked: 0,
    changedBlocks: 0,
    fallbackBlocks: 0,
    unsupportedBlocks: [],
    replacements: [],
    warnings: [],
  };
}

function addUnsupported(report: BlockRegistryReport, block: MinecraftBlockName, reason: string): void {
  if (!report.unsupportedBlocks.some((entry) => entry.block === block && entry.reason === reason)) {
    report.unsupportedBlocks.push({ block, reason });
  }
}

function addReplacement(report: BlockRegistryReport, replacement: BlockRegistryReplacementRecord): void {
  report.replacements.push(replacement);
  report.fallbackBlocks += 1;
}

function resolveBlockState(
  blockState: MinecraftBlockName,
  profile: BlockRegistryProfile,
  allowModdedBlocks: boolean,
  fallbackToVanilla: boolean,
  context: string,
  report: BlockRegistryReport,
): MinecraftBlockName {
  const baseId = getBaseBlockId(blockState);
  const namespace = getBlockNamespace(blockState);

  if (namespace === "minecraft") {
    return blockState;
  }

  if (isSupportedByProfile(baseId, profile, allowModdedBlocks)) {
    return blockState;
  }

  const reason = !allowModdedBlocks
    ? `Modded blocks are disabled for profile ${profile.id}.`
    : !profile.allowedNamespaces.includes(namespace)
      ? `Namespace ${namespace || "unknown"} is not allowed by profile ${profile.id}.`
      : `Block is not in the supported modded allow-list for profile ${profile.id}.`;

  const fallback = profile.fallbackBlocks[baseId as MinecraftBlockName];

  if (fallbackToVanilla && fallback) {
    const resolved = withReplacedBaseBlockId(blockState, fallback);
    addReplacement(report, {
      original: blockState,
      replacement: resolved,
      reason,
      context,
    });
    report.warnings.push(`Replaced unsupported block ${blockState} with ${resolved} (${context}). ${reason}`);
    return resolved;
  }

  addUnsupported(report, blockState, reason);
  report.warnings.push(`Unsupported block ${blockState} kept without fallback (${context}). ${reason}`);
  return blockState;
}

function rebuildPalette(blocks: SchematicBlock[]): MinecraftBlockName[] {
  return Array.from(new Set<MinecraftBlockName>(["minecraft:air" as MinecraftBlockName, ...blocks.map((block) => block.block)]));
}

export function applyBlockRegistryToBuild(build: GeneratedSchematicBuild): GeneratedSchematicBuild {
  const profile = getBlockRegistryProfile(build.profile);
  const allowModdedBlocks = build.allowModdedBlocks ?? profile.allowModdedBlocksDefault;
  const fallbackToVanilla = build.fallbackToVanilla ?? profile.fallbackToVanillaDefault;
  const report = createEmptyReport(profile, allowModdedBlocks, fallbackToVanilla);

  const blocks = build.blocks.map((block) => {
    report.totalBlocksChecked += 1;
    const resolvedBlock = resolveBlockState(
      block.block,
      profile,
      allowModdedBlocks,
      fallbackToVanilla,
      `block @ ${block.x},${block.y},${block.z}`,
      report,
    );

    if (resolvedBlock !== block.block) {
      report.changedBlocks += 1;
      return { ...block, block: resolvedBlock };
    }

    return block;
  });

  report.totalPaletteEntriesChecked = build.palette.length;

  const palette = rebuildPalette(blocks);
  const unsupportedWarnings = [
    ...(build.unsupportedBlockWarnings ?? []),
    ...report.warnings,
  ];

  return {
    ...build,
    profile: profile.id,
    allowModdedBlocks,
    fallbackToVanilla,
    blocks,
    palette,
    blockCount: blocks.length,
    unsupportedBlockWarnings: unsupportedWarnings,
    blockRegistryReport: report,
  };
}

export function formatBlockRegistryProfile(profile: BlockRegistryProfile): string[] {
  return [
    `${profile.displayName} (${profile.id})`,
    profile.description,
    `Allowed namespaces: ${profile.allowedNamespaces.join(", ")}`,
    `Default allowModdedBlocks: ${profile.allowModdedBlocksDefault ? "true" : "false"}`,
    `Default fallbackToVanilla: ${profile.fallbackToVanillaDefault ? "true" : "false"}`,
    `Supported modded blocks: ${profile.supportedModdedBlocks.length ? profile.supportedModdedBlocks.join(", ") : "none"}`,
  ];
}
