// lib/modules/minecraft-schematic/block-registry/blockRegistry.ts

import type { MinecraftBlockRegistryEntry } from "./blockRegistryTypes";
import type {
  BlockRegistryProfile,
  BlockRegistryProfileId,
  BlockRegistryReport,
  MinecraftBlockName,
} from "../types";
import { isMinecraftVersionAtLeast, normalizeMinecraftVersion } from "./minecraftVersion";

export const MINECRAFT_BLOCK_REGISTRY: readonly MinecraftBlockRegistryEntry[] = [
  {
    id: "minecraft:air",
    introducedIn: "1.0",
    tags: ["air", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:stone",
    introducedIn: "1.0",
    tags: ["stone", "wall", "floor", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:cobblestone",
    introducedIn: "1.0",
    tags: ["stone", "wall", "floor", "medieval", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:stone_bricks",
    introducedIn: "1.0",
    tags: ["stone", "wall", "medieval", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:mossy_stone_bricks",
    introducedIn: "1.0",
    tags: ["stone", "wall", "medieval", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:cracked_stone_bricks",
    introducedIn: "1.0",
    tags: ["stone", "wall", "medieval", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks"],
  },
  {
    id: "minecraft:chiseled_stone_bricks",
    introducedIn: "1.0",
    tags: ["stone", "wall", "medieval", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks"],
  },
  {
    id: "minecraft:sandstone",
    introducedIn: "1.0",
    tags: ["stone", "wall", "floor", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:red_sandstone",
    introducedIn: "1.8",
    tags: ["stone", "wall", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:sandstone", "minecraft:bricks"],
  },
  {
    id: "minecraft:granite",
    introducedIn: "1.8",
    tags: ["stone", "wall", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone"],
  },
  {
    id: "minecraft:polished_granite",
    introducedIn: "1.8",
    tags: ["stone", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:diorite",
    introducedIn: "1.8",
    tags: ["stone", "wall", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone"],
  },
  {
    id: "minecraft:polished_diorite",
    introducedIn: "1.8",
    tags: ["stone", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:andesite",
    introducedIn: "1.8",
    tags: ["stone", "wall", "floor", "factory"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:polished_andesite",
    introducedIn: "1.8",
    tags: ["stone", "floor", "factory", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:smooth_stone",
    introducedIn: "1.14",
    tags: ["stone", "floor", "factory", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone", "minecraft:stone_bricks"],
  },
  {
    id: "minecraft:oak_log",
    introducedIn: "1.0",
    tags: ["wood", "wall", "natural", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:spruce_log",
    introducedIn: "1.0",
    tags: ["wood", "wall", "natural", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:birch_log",
    introducedIn: "1.0",
    tags: ["wood", "wall", "natural", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },

  {
    id: "minecraft:cobblestone_wall",
    introducedIn: "1.4.2",
    tags: ["stone", "wall", "medieval", "decorative", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:stone_brick_wall",
    introducedIn: "1.14",
    tags: ["stone", "wall", "medieval", "decorative", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:cobblestone_wall", "minecraft:stone_bricks"],
  },
  {
    id: "minecraft:stone_brick_slab",
    introducedIn: "1.8",
    tags: ["stone", "floor", "medieval", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks"],
  },
  {
    id: "minecraft:standing_sign",
    introducedIn: "1.0",
    tags: ["wood", "decorative", "utility", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:oak_planks"],
  },
  {
    id: "minecraft:wall_sign",
    introducedIn: "1.0",
    tags: ["wood", "decorative", "utility", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:oak_planks"],
  },
  {
    id: "minecraft:sign",
    introducedIn: "1.0",
    tags: ["wood", "decorative", "utility", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:standing_sign", "minecraft:wall_sign", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:oak_sign",
    introducedIn: "1.14",
    tags: ["wood", "decorative", "utility", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:standing_sign", "minecraft:wall_sign", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:oak_wall_sign",
    introducedIn: "1.14",
    tags: ["wood", "decorative", "utility", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:wall_sign", "minecraft:standing_sign", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:jungle_log",
    introducedIn: "1.2.1",
    tags: ["wood", "wall", "natural"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:oak_log"],
  },
  {
    id: "minecraft:acacia_log",
    introducedIn: "1.7.2",
    tags: ["wood", "wall", "natural"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:oak_log"],
  },
  {
    id: "minecraft:dark_oak_log",
    introducedIn: "1.7.2",
    tags: ["wood", "wall", "natural", "medieval"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:spruce_log", "minecraft:oak_log"],
  },
  {
    id: "minecraft:oak_planks",
    introducedIn: "1.0",
    tags: ["wood", "wall", "floor", "roof", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:spruce_planks",
    introducedIn: "1.0",
    tags: ["wood", "wall", "floor", "roof", "medieval", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:birch_planks",
    introducedIn: "1.0",
    tags: ["wood", "wall", "floor", "roof", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:jungle_planks",
    introducedIn: "1.2.1",
    tags: ["wood", "wall", "floor", "roof"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:oak_planks"],
  },
  {
    id: "minecraft:acacia_planks",
    introducedIn: "1.7.2",
    tags: ["wood", "wall", "floor", "roof"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:oak_planks"],
  },
  {
    id: "minecraft:dark_oak_planks",
    introducedIn: "1.7.2",
    tags: ["wood", "wall", "floor", "roof", "medieval"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:spruce_planks", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:cherry_planks",
    introducedIn: "1.20",
    tags: ["wood", "wall", "floor", "roof", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:birch_planks", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:mangrove_planks",
    introducedIn: "1.19",
    tags: ["wood", "wall", "floor", "roof", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:jungle_planks", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:oak_stairs",
    introducedIn: "1.0",
    tags: ["wood", "roof", "trim", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: true,
  },
  {
    id: "minecraft:spruce_stairs",
    introducedIn: "1.0",
    tags: ["wood", "roof", "trim", "medieval", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: true,
  },
  {
    id: "minecraft:stone_brick_stairs",
    introducedIn: "1.4.2",
    tags: ["stone", "roof", "trim", "medieval"],
    vanilla: true,
    solid: true,
    transparent: true,
    substitutions: ["minecraft:stone_bricks", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:cobblestone_stairs",
    introducedIn: "1.0",
    tags: ["stone", "roof", "trim", "medieval", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: true,
  },
  {
    id: "minecraft:oak_slab",
    introducedIn: "1.3.1",
    tags: ["wood", "floor", "roof", "trim"],
    vanilla: true,
    solid: true,
    transparent: true,
    substitutions: ["minecraft:oak_planks"],
  },
  {
    id: "minecraft:stone_slab",
    introducedIn: "1.3.1",
    tags: ["stone", "floor", "roof", "trim"],
    vanilla: true,
    solid: true,
    transparent: true,
    substitutions: ["minecraft:stone"],
  },
  {
    id: "minecraft:bricks",
    introducedIn: "1.0",
    tags: ["wall", "floor", "factory", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:brick_block",
    introducedIn: "1.0",
    tags: ["wall", "floor", "factory", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:bricks"],
  },
  {
    id: "minecraft:glass",
    introducedIn: "1.0",
    tags: ["glass", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: true,
  },
  {
    id: "minecraft:glass_pane",
    introducedIn: "1.0",
    tags: ["glass", "decorative", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:glass"],
  },
  {
    id: "minecraft:iron_bars",
    introducedIn: "1.0",
    tags: ["metal", "factory", "decorative", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:iron_block",
    introducedIn: "1.0",
    tags: ["metal", "factory", "wall", "floor", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:gold_block",
    introducedIn: "1.0",
    tags: ["metal", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:wool",
    introducedIn: "1.0",
    tags: ["decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:torch",
    introducedIn: "1.0",
    tags: ["light", "utility", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:glowstone",
    introducedIn: "1.0",
    tags: ["light", "nether", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:torch"],
  },
  {
    id: "minecraft:redstone_lamp",
    introducedIn: "1.2.1",
    tags: ["light", "factory", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:glowstone", "minecraft:torch"],
  },
  {
    id: "minecraft:sea_lantern",
    introducedIn: "1.8",
    tags: ["light", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:glowstone", "minecraft:torch"],
  },
  {
    id: "minecraft:lantern",
    introducedIn: "1.14",
    tags: ["light", "decorative", "medieval", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:torch"],
  },
  {
    id: "minecraft:soul_lantern",
    introducedIn: "1.16",
    tags: ["light", "decorative", "modern", "nether"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:lantern", "minecraft:torch"],
  },
  {
    id: "minecraft:chain",
    introducedIn: "1.16",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:iron_bars"],
  },
  {
    id: "minecraft:barrel",
    introducedIn: "1.14",
    tags: ["wood", "utility", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:chest", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:chest",
    introducedIn: "1.0",
    tags: ["wood", "utility", "decorative", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:scaffolding",
    introducedIn: "1.14",
    tags: ["wood", "factory", "utility", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:oak_fence", "minecraft:oak_planks"],
  },
  {
    id: "minecraft:oak_fence",
    introducedIn: "1.0",
    tags: ["wood", "decorative", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:netherrack",
    introducedIn: "1.0",
    tags: ["nether", "natural", "legacy-safe"],
    vanilla: true,
    solid: true,
    transparent: false,
  },
  {
    id: "minecraft:fire",
    introducedIn: "1.0",
    tags: ["light", "utility", "legacy-safe"],
    vanilla: true,
    solid: false,
    transparent: true,
  },
  {
    id: "minecraft:campfire",
    introducedIn: "1.14",
    tags: ["light", "utility", "decorative", "modern"],
    vanilla: true,
    solid: false,
    transparent: true,
    substitutions: ["minecraft:netherrack", "minecraft:torch"],
    omitWhenUnavailable: true,
  },
  {
    id: "minecraft:blackstone",
    introducedIn: "1.16",
    tags: ["stone", "nether", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:cobblestone", "minecraft:stone"],
  },
  {
    id: "minecraft:polished_blackstone",
    introducedIn: "1.16",
    tags: ["stone", "nether", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:basalt",
    introducedIn: "1.16",
    tags: ["stone", "nether", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:prismarine",
    introducedIn: "1.8",
    tags: ["stone", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:purpur_block",
    introducedIn: "1.9",
    tags: ["decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:bricks"],
  },
  {
    id: "minecraft:white_concrete",
    introducedIn: "1.12",
    tags: ["wall", "floor", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:quartz_block", "minecraft:stone"],
  },
  {
    id: "minecraft:gray_concrete",
    introducedIn: "1.12",
    tags: ["wall", "floor", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone", "minecraft:stone_bricks"],
  },
  {
    id: "minecraft:quartz_block",
    introducedIn: "1.5",
    tags: ["wall", "floor", "decorative"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:sandstone", "minecraft:stone"],
  },
  {
    id: "minecraft:deepslate",
    introducedIn: "1.17",
    tags: ["stone", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:deepslate_bricks",
    introducedIn: "1.17",
    tags: ["stone", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:cobblestone"],
  },
  {
    id: "minecraft:polished_deepslate",
    introducedIn: "1.17",
    tags: ["stone", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:stone_bricks", "minecraft:stone"],
  },
  {
    id: "minecraft:cobbled_deepslate",
    introducedIn: "1.17",
    tags: ["stone", "wall", "floor", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:cobblestone", "minecraft:stone"],
  },
  {
    id: "minecraft:copper_block",
    introducedIn: "1.17",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:iron_block", "minecraft:bricks"],
  },
  {
    id: "minecraft:cut_copper",
    introducedIn: "1.17",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:iron_block", "minecraft:bricks"],
  },
  {
    id: "minecraft:exposed_copper",
    introducedIn: "1.17",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:copper_block", "minecraft:iron_block", "minecraft:bricks"],
  },
  {
    id: "minecraft:weathered_copper",
    introducedIn: "1.17",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:copper_block", "minecraft:iron_block", "minecraft:bricks"],
  },
  {
    id: "minecraft:oxidized_copper",
    introducedIn: "1.17",
    tags: ["metal", "factory", "decorative", "modern"],
    vanilla: true,
    solid: true,
    transparent: false,
    substitutions: ["minecraft:copper_block", "minecraft:iron_block", "minecraft:bricks"],
  },
];

export const MINECRAFT_BLOCK_REGISTRY_BY_ID: ReadonlyMap<string, MinecraftBlockRegistryEntry> =
  new Map(MINECRAFT_BLOCK_REGISTRY.map((entry) => [entry.id, entry]));



type SupportedProfileId = BlockRegistryProfileId;

const createFallbackBlocks: Partial<Record<MinecraftBlockName, MinecraftBlockName>> = {
  "create:andesite_alloy_block": "minecraft:iron_block",
  "create:brass_block": "minecraft:gold_block",
  "create:copper_casing": "minecraft:bricks",
  "create:andesite_casing": "minecraft:andesite",
  "create:brass_casing": "minecraft:gold_block",
  "create:industrial_iron_block": "minecraft:iron_block",
  "create:railway_casing": "minecraft:iron_block",
  "create:framed_glass": "minecraft:glass",
  "create:tiled_glass": "minecraft:glass",
  "create:metal_girder": "minecraft:iron_bars",
  "create:shaft": "minecraft:iron_bars",
  "create:cogwheel": "minecraft:oak_planks",
  "create:large_cogwheel": "minecraft:oak_planks",
  "create:belt": "minecraft:wool",
};

function makeVersionProfile(version: string): BlockRegistryProfile {
  const id = versionToProfileId(version);
  return {
    id,
    displayName: `Vanilla ${version}`,
    description: `Restricts generated blocks to blocks available in Minecraft ${version} or earlier.`,
    allowedNamespaces: ["minecraft"],
    supportedModdedBlocks: [],
    allowModdedBlocksDefault: false,
    fallbackToVanillaDefault: true,
    fallbackBlocks: {},
    aliases: [version, version.replace(/\.0$/, ""), `minecraft-${version}`, `legacy-${version}`],
    minecraftVersion: version,
    targetMinecraftVersion: version,
  };
}

export const blockRegistryProfiles: readonly BlockRegistryProfile[] = [
  {
    id: "vanilla",
    displayName: "Vanilla Minecraft",
    description: "Strict minecraft:* block output. Modded blocks fall back to vanilla replacements.",
    allowedNamespaces: ["minecraft"],
    supportedModdedBlocks: [],
    allowModdedBlocksDefault: false,
    fallbackToVanillaDefault: true,
    fallbackBlocks: {},
    aliases: ["default", "latest", "modern", "current", "minecraft", "vanilla-latest"],
  },
  {
    id: "siriocraft-create",
    displayName: "SirioCraft Create",
    description: "Allows a conservative set of Create mod blocks while keeping unsupported modded blocks replaceable with vanilla fallbacks.",
    allowedNamespaces: ["minecraft", "create"],
    supportedModdedBlocks: Object.keys(createFallbackBlocks) as MinecraftBlockName[],
    allowModdedBlocksDefault: true,
    fallbackToVanillaDefault: true,
    fallbackBlocks: createFallbackBlocks,
    aliases: ["create", "siriocraft", "siriocraft create", "siriocraft-create", "create-mod"],
  },
  makeVersionProfile("1.8.8"),
  makeVersionProfile("1.12.2"),
  makeVersionProfile("1.16.5"),
  makeVersionProfile("1.18.2"),
  makeVersionProfile("1.19.4"),
  makeVersionProfile("1.20.1"),
  makeVersionProfile("1.21.1"),
];

export type BlockRegistryProfileLike =
  | string
  | BlockRegistryProfile
  | {
      id?: string;
      profileId?: string;
      minecraftVersion?: string;
      targetMinecraftVersion?: string;
      version?: string;
    }
  | undefined;

export function normalizeBlockRegistryProfileId(profile: BlockRegistryProfileLike): SupportedProfileId {
  if (!profile) {
    return "vanilla";
  }

  const rawValue = getProfileRawValue(profile);
  const normalized = rawValue.trim().toLowerCase();

  if (!normalized || ["default", "latest", "modern", "current", "minecraft", "vanilla-latest"].includes(normalized)) {
    return "vanilla";
  }

  if (/^\d+\.\d+(?:\.\d+)?$/.test(normalized)) {
    return versionToProfileId(normalized);
  }

  const slug = normalized
    .replace(/^minecraft\s+/i, "")
    .replace(/\s+/g, "-")
    .replace(/_/g, "-") as SupportedProfileId;

  const direct = blockRegistryProfiles.find((candidate) => candidate.id === slug);
  if (direct) {
    return direct.id;
  }

  const alias = blockRegistryProfiles.find((candidate) =>
    (candidate.aliases ?? []).some((candidateAlias) => {
      const normalizedAlias = candidateAlias.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
      return normalizedAlias === slug || normalizeBlockRegistryProfileId(candidateAlias) === slug;
    }),
  );

  return alias?.id ?? slug;
}

export function getBlockRegistryProfile(profile: BlockRegistryProfileLike): BlockRegistryProfile {
  if (isBlockRegistryProfile(profile)) {
    return profile;
  }

  const normalizedId = normalizeBlockRegistryProfileId(profile);
  const directMatch = blockRegistryProfiles.find((candidate) => candidate.id === normalizedId);

  if (directMatch) {
    return directMatch;
  }

  const rawValue = getProfileRawValue(profile);
  if (/^\d+\.\d+(?:\.\d+)?$/.test(rawValue.trim())) {
    return makeVersionProfile(normalizeMinecraftVersion(rawValue).replace(/\.0$/, ""));
  }

  const versionFromProfileId = parseVersionProfileId(normalizedId);
  if (versionFromProfileId) {
    return makeVersionProfile(versionFromProfileId);
  }

  return blockRegistryProfiles[0];
}

export function formatBlockRegistryProfile(profile: BlockRegistryProfile): string[] {
  return [
    `${profile.displayName}`,
    profile.description,
    `Profile ID: ${profile.id}`,
    `Allowed namespaces: ${profile.allowedNamespaces.join(", ")}`,
    `Default modded blocks: ${profile.allowModdedBlocksDefault ? "on" : "off"}`,
    `Fallback to vanilla: ${profile.fallbackToVanillaDefault ? "on" : "off"}`,
    ...(profile.targetMinecraftVersion ? [`Target Minecraft version: ${profile.targetMinecraftVersion}`] : []),
    ...(profile.supportedModdedBlocks.length
      ? [`Supported modded blocks: ${profile.supportedModdedBlocks.join(", ")}`]
      : ["Supported modded blocks: none"]),
  ];
}

export interface ApplyBlockRegistryOptions {
  profile?: BlockRegistryProfileLike;
  profileId?: string;
  minecraftVersion?: string;
  targetMinecraftVersion?: string;
  version?: string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  preserveUnknownBlocks?: boolean;
}

export function applyBlockRegistryToBuild<TBuild>(
  build: TBuild,
  profileOrOptions?: BlockRegistryProfileLike | ApplyBlockRegistryOptions,
): TBuild;
export function applyBlockRegistryToBuild<TBuild>(
  profileOrOptions: BlockRegistryProfileLike | ApplyBlockRegistryOptions,
  build: TBuild,
): TBuild;
export function applyBlockRegistryToBuild<TBuild>(
  first: TBuild | BlockRegistryProfileLike | ApplyBlockRegistryOptions,
  second?: TBuild | BlockRegistryProfileLike | ApplyBlockRegistryOptions,
): TBuild {
  const calledAsProfileThenBuild = isProbablyProfileOrOptions(first) && second !== undefined;
  const build = (calledAsProfileThenBuild ? second : first) as TBuild;
  const profileOrOptions = (calledAsProfileThenBuild ? first : second) as
    | BlockRegistryProfileLike
    | ApplyBlockRegistryOptions;

  if (!build || typeof build !== "object") {
    return build;
  }

  const buildRecord = build as Record<string, unknown>;
  const options = normalizeApplyBlockRegistryOptions(profileOrOptions);
  const requestedProfile =
    options.profile ??
    options.profileId ??
    readString(buildRecord.profile) ??
    readString(buildRecord.profileId) ??
    "vanilla";
  const profile = getBlockRegistryProfile(requestedProfile);
  const targetMinecraftVersion =
    options.targetMinecraftVersion ??
    options.version ??
    readString(buildRecord.targetMinecraftVersion) ??
    profile.targetMinecraftVersion ??
    profile.minecraftVersion;
  const allowModdedBlocks =
    options.allowModdedBlocks ??
    readBoolean(buildRecord.allowModdedBlocks) ??
    profile.allowModdedBlocksDefault;
  const fallbackToVanilla =
    options.fallbackToVanilla ??
    readBoolean(buildRecord.fallbackToVanilla) ??
    profile.fallbackToVanillaDefault;
  const preserveUnknownBlocks = options.preserveUnknownBlocks ?? !fallbackToVanilla;

  const replacements: NonNullable<BlockRegistryReport["replacements"]> = [];
  const unsupportedBlocks: NonNullable<BlockRegistryReport["unsupportedBlocks"]> = [];
  const warnings: string[] = [];
  let totalBlocksChecked = 0;
  let totalPaletteEntriesChecked = 0;
  let fallbackBlocks = 0;

  const resolveForBuild = (rawBlockId: string, context: string): MinecraftBlockName => {
    const original = canonicalizeBlockIdLocal(rawBlockId) as MinecraftBlockName;
    totalBlocksChecked += context === "palette" ? 0 : 1;
    totalPaletteEntriesChecked += context === "palette" ? 1 : 0;

    const namespace = original.split(":")[0] ?? "minecraft";
    let current = original;
    let reason = "";

    const namespaceAllowed = namespace === "minecraft" || (allowModdedBlocks && profile.allowedNamespaces.includes(namespace));
    const supportedModded = namespace === "minecraft" || profile.supportedModdedBlocks.includes(original);

    if (!namespaceAllowed || !supportedModded) {
      const fallback = profile.fallbackBlocks[original] ?? genericFallbackForBlock(original);

      if (fallbackToVanilla && fallback) {
        current = canonicalizeBlockIdLocal(fallback) as MinecraftBlockName;
        reason = `Unsupported block ${original} replaced for profile ${profile.id}.`;
        fallbackBlocks += 1;
      } else {
        unsupportedBlocks.push({
          block: original,
          reason: `Block namespace or modded block is not allowed by profile ${profile.id}.`,
        });
        return preserveUnknownBlocks ? original : "minecraft:air";
      }
    }

    if (targetMinecraftVersion) {
      const versionResolved = resolveRegistryBlockIdForVersionWithReason(
        current,
        targetMinecraftVersion,
        preserveUnknownBlocks,
      );

      if (versionResolved.block !== current) {
        reason = versionResolved.reason;
        current = versionResolved.block;
        fallbackBlocks += 1;
      }

      if (!versionResolved.compatible) {
        unsupportedBlocks.push({
          block: original,
          reason: versionResolved.reason,
        });
      }
    }

    if (current !== original) {
      replacements.push({
        original,
        replacement: current,
        reason: reason || `Block replaced by profile ${profile.id}.`,
        context,
      });
    }

    return current;
  };

  const outputRecord: Record<string, unknown> = {
    ...buildRecord,
    profile: profile.id,
    allowModdedBlocks,
    fallbackToVanilla,
  };

  if (targetMinecraftVersion) {
    outputRecord.targetMinecraftVersion = targetMinecraftVersion;
  }

  if (Array.isArray(buildRecord.palette)) {
    outputRecord.palette = Array.from(
      new Set(
        buildRecord.palette
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => resolveForBuild(entry, "palette")),
      ),
    );
  }

  if (Array.isArray(buildRecord.blocks)) {
    outputRecord.blocks = buildRecord.blocks.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return entry;
      }

      const blockRecord = entry as Record<string, unknown>;
      const blockValue = blockRecord.block;

      if (typeof blockValue !== "string") {
        return entry;
      }

      return {
        ...blockRecord,
        block: resolveForBuild(blockValue, `blocks[${index}].block`),
      };
    });
  }

  const uniqueReplacementKey = new Set<string>();
  const dedupedReplacements = replacements.filter((replacement) => {
    const key = `${replacement.context}|${replacement.original}|${replacement.replacement}`;
    if (uniqueReplacementKey.has(key)) {
      return false;
    }
    uniqueReplacementKey.add(key);
    return true;
  });

  if (unsupportedBlocks.length > 0) {
    warnings.push(`${unsupportedBlocks.length} unsupported block issue(s) found for profile ${profile.id}.`);
  }

  if (dedupedReplacements.length > 0) {
    warnings.push(`${dedupedReplacements.length} block replacement(s) applied for profile ${profile.id}.`);
  }

  outputRecord.blockRegistryReport = {
    profileId: profile.id,
    profileDisplayName: profile.displayName,
    allowModdedBlocks,
    fallbackToVanilla,
    allowedNamespaces: profile.allowedNamespaces,
    supportedModdedBlocks: profile.supportedModdedBlocks,
    totalBlocksChecked,
    totalPaletteEntriesChecked,
    changedBlocks: dedupedReplacements.length,
    fallbackBlocks,
    unsupportedBlocks,
    replacements: dedupedReplacements,
    warnings,
  } satisfies BlockRegistryReport;

  if (Array.isArray(outputRecord.palette) && Array.isArray(outputRecord.blocks)) {
    const paletteFromBlocks = Array.from(
      new Set(
        (outputRecord.blocks as Array<Record<string, unknown>>)
          .map((entry) => entry.block)
          .filter((entry): entry is MinecraftBlockName => typeof entry === "string"),
      ),
    );
    outputRecord.palette = Array.from(new Set([...(outputRecord.palette as MinecraftBlockName[]), ...paletteFromBlocks]));
  }

  return outputRecord as TBuild;
}

function normalizeApplyBlockRegistryOptions(
  profileOrOptions: BlockRegistryProfileLike | ApplyBlockRegistryOptions,
): ApplyBlockRegistryOptions {
  if (!profileOrOptions) {
    return {};
  }

  if (typeof profileOrOptions === "string" || isBlockRegistryProfile(profileOrOptions)) {
    return { profile: profileOrOptions };
  }

  return profileOrOptions;
}

function isProbablyProfileOrOptions(value: unknown): boolean {
  if (typeof value === "string") {
    return true;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" ||
    typeof record.profileId === "string" ||
    typeof record.minecraftVersion === "string" ||
    typeof record.targetMinecraftVersion === "string" ||
    typeof record.version === "string" ||
    typeof record.allowModdedBlocks === "boolean" ||
    typeof record.fallbackToVanilla === "boolean"
  );
}

function isBlockRegistryProfile(value: unknown): value is BlockRegistryProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.displayName === "string";
}

function getProfileRawValue(profile: BlockRegistryProfileLike): string {
  if (!profile) {
    return "vanilla";
  }

  if (typeof profile === "string") {
    return profile;
  }

  const record = profile as Record<string, string | undefined>;
  return (
    record.id ??
    record.profileId ??
    record.targetMinecraftVersion ??
    record.minecraftVersion ??
    record.version ??
    "vanilla"
  );
}

function versionToProfileId(version: string): SupportedProfileId {
  const normalizedVersion = normalizeMinecraftVersion(version).replace(/\.0$/, "");
  return `vanilla-${normalizedVersion.replaceAll(".", "-")}` as SupportedProfileId;
}

function parseVersionProfileId(profileId: string): string | undefined {
  const match = profileId.match(/^vanilla-(\d+)-(\d+)(?:-(\d+))?$/);
  if (!match) {
    return undefined;
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}${patch ? `.${patch}` : ""}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function genericFallbackForBlock(blockId: MinecraftBlockName): MinecraftBlockName {
  if (blockId.includes("glass")) return "minecraft:glass";
  if (blockId.includes("copper")) return "minecraft:iron_block";
  if (blockId.includes("brass") || blockId.includes("gold")) return "minecraft:gold_block";
  if (blockId.includes("chain") || blockId.includes("shaft") || blockId.includes("girder")) return "minecraft:iron_bars";
  if (blockId.includes("log")) return "minecraft:oak_log";
  if (blockId.includes("planks") || blockId.includes("cogwheel")) return "minecraft:oak_planks";
  if (blockId.includes("deepslate")) return "minecraft:stone_bricks";
  if (blockId.includes("lantern")) return "minecraft:torch";
  return "minecraft:stone";
}

function resolveRegistryBlockIdForVersionWithReason(
  blockId: MinecraftBlockName,
  targetMinecraftVersion: string,
  preserveUnknownBlocks: boolean,
): { block: MinecraftBlockName; compatible: boolean; reason: string } {
  const visited = new Set<string>();
  let currentBlockId = canonicalizeBlockIdLocal(blockId) as MinecraftBlockName;

  while (!visited.has(currentBlockId)) {
    visited.add(currentBlockId);

    const entry = MINECRAFT_BLOCK_REGISTRY_BY_ID.get(currentBlockId);

    if (!entry) {
      return {
        block: preserveUnknownBlocks ? blockId : "minecraft:air",
        compatible: preserveUnknownBlocks,
        reason: `Block is not present in the Minecraft block registry: ${currentBlockId}`,
      };
    }

    if (isMinecraftVersionAtLeast(targetMinecraftVersion, entry.introducedIn)) {
      return {
        block: currentBlockId,
        compatible: true,
        reason:
          currentBlockId === blockId
            ? `${currentBlockId} is available in Minecraft ${targetMinecraftVersion}.`
            : `${blockId} was replaced with ${currentBlockId} for Minecraft ${targetMinecraftVersion}.`,
      };
    }

    for (const substitution of entry.substitutions ?? []) {
      const candidate = canonicalizeBlockIdLocal(substitution) as MinecraftBlockName;
      const candidateEntry = MINECRAFT_BLOCK_REGISTRY_BY_ID.get(candidate);

      if (candidateEntry && isMinecraftVersionAtLeast(targetMinecraftVersion, candidateEntry.introducedIn)) {
        return {
          block: candidate,
          compatible: true,
          reason: `${blockId} was introduced in Minecraft ${entry.introducedIn}; replaced with ${candidate} for target ${targetMinecraftVersion}.`,
        };
      }

      if (candidateEntry) {
        currentBlockId = candidate;
        break;
      }
    }

    if (currentBlockId !== blockId && visited.has(currentBlockId)) {
      continue;
    }

    if (entry.omitWhenUnavailable) {
      return {
        block: "minecraft:air",
        compatible: true,
        reason: `${blockId} was introduced in Minecraft ${entry.introducedIn}; omitted for target ${targetMinecraftVersion}.`,
      };
    }

    const fallback = genericFallbackForBlock(blockId);
    const fallbackEntry = MINECRAFT_BLOCK_REGISTRY_BY_ID.get(fallback);
    if (fallbackEntry && isMinecraftVersionAtLeast(targetMinecraftVersion, fallbackEntry.introducedIn)) {
      return {
        block: fallback,
        compatible: true,
        reason: `${blockId} was introduced in Minecraft ${entry.introducedIn}; replaced with ${fallback} for target ${targetMinecraftVersion}.`,
      };
    }

    return {
      block: preserveUnknownBlocks ? blockId : "minecraft:air",
      compatible: false,
      reason: `${blockId} was introduced in Minecraft ${entry.introducedIn}, which is newer than target ${targetMinecraftVersion}. No compatible fallback was found.`,
    };
  }

  return {
    block: preserveUnknownBlocks ? blockId : "minecraft:air",
    compatible: false,
    reason: `Substitution cycle detected while resolving ${blockId} for Minecraft ${targetMinecraftVersion}.`,
  };
}

function canonicalizeBlockIdLocal(blockId: string): MinecraftBlockName {
  const trimmed = blockId.trim();
  const withoutState = trimmed.split("[")[0] ?? trimmed;
  const withoutNbt = withoutState.split("{")[0] ?? withoutState;

  if (!withoutNbt) {
    return "minecraft:air";
  }

  if (withoutNbt.includes(":")) {
    return withoutNbt as MinecraftBlockName;
  }

  return `minecraft:${withoutNbt}` as MinecraftBlockName;
}
