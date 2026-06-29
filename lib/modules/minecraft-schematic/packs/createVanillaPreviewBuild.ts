import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlock } from "../types";

type LooseBlock = Record<string, unknown>;

const VANILLA_FALLBACKS: Record<string, MinecraftBlockName> = {
  "create:shaft": "minecraft:stripped_oak_log" as MinecraftBlockName,
  "create:cogwheel": "minecraft:cut_copper" as MinecraftBlockName,
  "create:large_cogwheel": "minecraft:copper_block" as MinecraftBlockName,
  "create:gearbox": "minecraft:polished_andesite" as MinecraftBlockName,
  "create:vertical_gearbox": "minecraft:polished_andesite" as MinecraftBlockName,
  "create:belt": "minecraft:black_wool" as MinecraftBlockName,
  "create:mechanical_belt": "minecraft:black_wool" as MinecraftBlockName,
  "create:belt_connector": "minecraft:black_wool" as MinecraftBlockName,
  "create:depot": "minecraft:smooth_stone_slab" as MinecraftBlockName,
  "create:chute": "minecraft:hopper" as MinecraftBlockName,
  "create:andesite_funnel": "minecraft:hopper" as MinecraftBlockName,
  "create:brass_funnel": "minecraft:hopper" as MinecraftBlockName,
  "create:mechanical_press": "minecraft:anvil" as MinecraftBlockName,
  "create:mechanical_mixer": "minecraft:lightning_rod" as MinecraftBlockName,
  "create:basin": "minecraft:cauldron" as MinecraftBlockName,
  "create:water_wheel": "minecraft:oak_planks" as MinecraftBlockName,
  "create:large_water_wheel": "minecraft:oak_planks" as MinecraftBlockName,
  "create:andesite_casing": "minecraft:polished_andesite" as MinecraftBlockName,
  "create:brass_casing": "minecraft:cut_copper" as MinecraftBlockName,
  "create:fluid_pipe": "minecraft:copper_block" as MinecraftBlockName,
  "create:railway_casing": "minecraft:polished_deepslate" as MinecraftBlockName,
  "create:metal_girder": "minecraft:iron_bars" as MinecraftBlockName,
  "create:track": "minecraft:rail" as MinecraftBlockName,
};

const KNOWN_PROBLEMATIC_VANILLA_STATES: Record<string, MinecraftBlockName> = {
  "minecraft:water": "minecraft:blue_stained_glass" as MinecraftBlockName,
};

function getLooseBlockId(block: LooseBlock): string {
  const candidates = [
    block.block,
    block.blockId,
    block.id,
    block.name,
    block.state,
    block.blockState,
    block.rawState,
    block.createState,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.split("[")[0] ?? candidate;
    }
  }

  return "minecraft:stone";
}

function toVanillaPreviewBlockId(blockId: string): MinecraftBlockName {
  const baseId = blockId.split("[")[0] ?? blockId;

  if (VANILLA_FALLBACKS[baseId]) {
    return VANILLA_FALLBACKS[baseId];
  }

  if (KNOWN_PROBLEMATIC_VANILLA_STATES[baseId]) {
    return KNOWN_PROBLEMATIC_VANILLA_STATES[baseId];
  }

  if (baseId.startsWith("minecraft:")) {
    return baseId as MinecraftBlockName;
  }

  return "minecraft:stone" as MinecraftBlockName;
}

function normalizePreviewBlock(block: SchematicBlock): SchematicBlock {
  const looseBlock = block as unknown as LooseBlock;
  const originalBlockId = getLooseBlockId(looseBlock);
  const previewBlock = toVanillaPreviewBlockId(originalBlockId);

  return {
    ...block,
    block: previewBlock,
    blockId: previewBlock,
    id: previewBlock,
    name: previewBlock,
    state: previewBlock,
    blockState: previewBlock,
    rawState: previewBlock,
    createState: previewBlock,
    originalBlock: originalBlockId,
    previewReplacement: originalBlockId === previewBlock ? undefined : previewBlock,
  } as unknown as SchematicBlock;
}

function createPalette(blocks: SchematicBlock[]): MinecraftBlockName[] {
  return Array.from(new Set<MinecraftBlockName>([
    "minecraft:air" as MinecraftBlockName,
    ...blocks.map((block) => {
      const looseBlock = block as unknown as LooseBlock;
      return getLooseBlockId(looseBlock) as MinecraftBlockName;
    }),
  ])).sort();
}

function countReplacements(original: GeneratedSchematicBuild, preview: SchematicBlock[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (let index = 0; index < original.blocks.length; index += 1) {
    const originalBlock = getLooseBlockId(original.blocks[index] as unknown as LooseBlock);
    const previewBlock = getLooseBlockId(preview[index] as unknown as LooseBlock);

    if (originalBlock === previewBlock) {
      continue;
    }

    const key = `${originalBlock} -> ${previewBlock}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export type VanillaPreviewBuildResult = {
  build: GeneratedSchematicBuild;
  replacements: Record<string, number>;
  replacementCount: number;
  notes: string[];
};

export function createVanillaPreviewBuild(build: GeneratedSchematicBuild): VanillaPreviewBuildResult {
  const previewBlocks = build.blocks.map(normalizePreviewBlock);
  const replacements = countReplacements(build, previewBlocks);
  const replacementCount = Object.values(replacements).reduce((total, count) => total + count, 0);

  const previewBuild = {
    ...build,
    buildId: `${build.buildId}_vanilla_preview`,
    displayName: `${build.displayName ?? build.buildId} Vanilla Preview`,
    variant: `${build.variant ?? "default"}_vanilla_preview`,
    profile: "vanilla",
    allowModdedBlocks: false,
    fallbackToVanilla: true,
    blockEntities: [],
    palette: createPalette(previewBlocks),
    blocks: previewBlocks,
    blockCount: previewBlocks.length,
    features: Array.from(new Set([
      ...(build.features ?? []),
      "m6h_vanilla_preview",
      "schematio_compatible_preview",
      "modded_blocks_replaced_with_vanilla_fallbacks",
    ])),
    placementWarnings: [
      ...(build.placementWarnings ?? []),
      "M6-H vanilla preview: this schematic is for browser preview only and is not the real Create/modded build.",
      "Use the original schematics for final Minecraft placement.",
    ],
  } as unknown as GeneratedSchematicBuild;

  return {
    build: previewBuild,
    replacements,
    replacementCount,
    notes: [
      "Preview build generated with vanilla fallback blocks.",
      "Create/modded states were intentionally removed for Schemat.io-style compatibility.",
      "Original schematic files were not modified.",
    ],
  };
}
