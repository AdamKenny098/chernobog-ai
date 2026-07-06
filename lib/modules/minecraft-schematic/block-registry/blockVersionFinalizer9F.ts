// lib/modules/minecraft-schematic/block-registry/blockVersionFinalizer9F.ts
// Milestone 9F — final Minecraft version block-limit hardening.
//
// Purpose:
// - Run after applyBlockRegistryToBuild(...).
// - Run before normalizeBlockEntitiesForBuild(...) and 9D validation.
// - Catch common registry gaps and unknown modern blocks with conservative legacy fallbacks.

import type {
  BlockRegistryReport,
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
} from "../types";

import {
  canonicalizeMinecraftBlockId,
  getMinecraftBlockRegistryEntry,
  resolveBlockForVersion,
} from "./blockCompatibility";

import { isMinecraftVersionAtLeast, normalizeMinecraftVersion } from "./minecraftVersion";

export type Milestone9FHardeningStatus = "passed" | "warning" | "skipped";

export interface Milestone9FCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface Milestone9FReplacementSummary {
  original: MinecraftBlockName;
  replacement: MinecraftBlockName;
  count: number;
  reason: string;
  exampleCoordinates: Milestone9FCoordinate[];
}

export interface Milestone9FUnresolvedSummary {
  original: MinecraftBlockName;
  count: number;
  reason: string;
  exampleCoordinates: Milestone9FCoordinate[];
}

export interface Milestone9FHardeningReport {
  milestone: "9F";
  status: Milestone9FHardeningStatus;
  ok: boolean;
  targetMinecraftVersion?: string;
  checkedBlockCount: number;
  changedBlockCount: number;
  changedBlockTypeCount: number;
  omittedBlockCount: number;
  unresolvedBlockCount: number;
  unresolvedBlockTypeCount: number;
  replacements: Milestone9FReplacementSummary[];
  unresolvedBlocks: Milestone9FUnresolvedSummary[];
  summary: string;
}

interface SupplementalRule {
  id: MinecraftBlockName;
  introducedIn: string;
  substitutions: MinecraftBlockName[];
  omitWhenUnavailable?: boolean;
  reason: string;
}

interface ResolutionResult {
  original: MinecraftBlockName;
  replacement: MinecraftBlockName;
  changed: boolean;
  omitted: boolean;
  compatible: boolean;
  reason: string;
}

interface ResolutionContext {
  targetMinecraftVersion: string;
  allowModdedBlocks: boolean;
  supportedModdedBlocks: ReadonlySet<MinecraftBlockName>;
}

interface MutableReplacementSummary {
  original: MinecraftBlockName;
  replacement: MinecraftBlockName;
  count: number;
  reason: string;
  exampleCoordinates: Milestone9FCoordinate[];
}

interface MutableUnresolvedSummary {
  original: MinecraftBlockName;
  count: number;
  reason: string;
  exampleCoordinates: Milestone9FCoordinate[];
}

const EXAMPLE_COORDINATE_LIMIT = 6;

const LEGACY_STONE = "minecraft:stone" as MinecraftBlockName;
const LEGACY_COBBLESTONE = "minecraft:cobblestone" as MinecraftBlockName;
const LEGACY_STONE_BRICKS = "minecraft:stone_bricks" as MinecraftBlockName;
const LEGACY_BRICKS = "minecraft:bricks" as MinecraftBlockName;
const LEGACY_IRON_BLOCK = "minecraft:iron_block" as MinecraftBlockName;
const LEGACY_IRON_BARS = "minecraft:iron_bars" as MinecraftBlockName;
const LEGACY_GOLD_BLOCK = "minecraft:gold_block" as MinecraftBlockName;
const LEGACY_OAK_PLANKS = "minecraft:oak_planks" as MinecraftBlockName;
const LEGACY_SPRUCE_PLANKS = "minecraft:spruce_planks" as MinecraftBlockName;
const LEGACY_OAK_LOG = "minecraft:oak_log" as MinecraftBlockName;
const LEGACY_GLASS = "minecraft:glass" as MinecraftBlockName;
const LEGACY_TORCH = "minecraft:torch" as MinecraftBlockName;
const LEGACY_GLOWSTONE = "minecraft:glowstone" as MinecraftBlockName;
const LEGACY_WOOL = "minecraft:wool" as MinecraftBlockName;
const LEGACY_CHEST = "minecraft:chest" as MinecraftBlockName;
const LEGACY_OAK_FENCE = "minecraft:oak_fence" as MinecraftBlockName;
const LEGACY_NETHERRACK = "minecraft:netherrack" as MinecraftBlockName;
const LEGACY_AIR = "minecraft:air" as MinecraftBlockName;

function rule(
  id: MinecraftBlockName,
  introducedIn: string,
  substitutions: MinecraftBlockName[],
  reason: string,
  omitWhenUnavailable = false,
): SupplementalRule {
  return { id, introducedIn, substitutions, reason, omitWhenUnavailable };
}

const NINE_F_SUPPLEMENTAL_RULES: readonly SupplementalRule[] = [
  // Modern stone families.
  rule("minecraft:tuff", "1.17", [LEGACY_STONE, LEGACY_COBBLESTONE], "Tuff is modern cave stone; plain stone is the safest legacy equivalent."),
  rule("minecraft:polished_tuff", "1.21", [LEGACY_STONE_BRICKS, LEGACY_STONE], "Polished tuff reads closest as legacy stone brick trim."),
  rule("minecraft:tuff_bricks", "1.21", [LEGACY_STONE_BRICKS, LEGACY_COBBLESTONE], "Tuff bricks are modern masonry; stone bricks preserve the role."),
  rule("minecraft:chiseled_tuff", "1.21", [LEGACY_STONE_BRICKS, LEGACY_STONE], "Chiseled tuff is modern decorative stone; stone bricks keep the build solid."),
  rule("minecraft:chiseled_tuff_bricks", "1.21", [LEGACY_STONE_BRICKS, LEGACY_STONE], "Chiseled tuff bricks are modern decorative masonry."),
  rule("minecraft:calcite", "1.17", [LEGACY_STONE, "minecraft:quartz_block" as MinecraftBlockName, "minecraft:sandstone" as MinecraftBlockName], "Calcite is modern pale stone; stone/quartz/sandstone are safer legacy reads."),
  rule("minecraft:dripstone_block", "1.17", [LEGACY_STONE, LEGACY_COBBLESTONE], "Dripstone is modern cave stone; stone is the safest fallback."),
  rule("minecraft:smooth_basalt", "1.17", [LEGACY_STONE, LEGACY_COBBLESTONE], "Smooth basalt is modern; stone keeps the structural role."),
  rule("minecraft:reinforced_deepslate", "1.19", [LEGACY_IRON_BLOCK, LEGACY_STONE_BRICKS], "Reinforced deepslate is modern heavy masonry."),
  rule("minecraft:mud", "1.19", ["minecraft:dirt" as MinecraftBlockName, LEGACY_COBBLESTONE], "Mud is modern; dirt or cobblestone are safer legacy terrain substitutes."),
  rule("minecraft:packed_mud", "1.19", [LEGACY_BRICKS, LEGACY_COBBLESTONE], "Packed mud is modern earthen masonry; bricks/cobblestone preserve the role."),
  rule("minecraft:mud_bricks", "1.19", [LEGACY_BRICKS, LEGACY_STONE_BRICKS], "Mud bricks are modern masonry; bricks are the closest legacy block."),

  // Wood introduced after legacy targets or with modern naming.
  rule("minecraft:stripped_oak_log", "1.13", [LEGACY_OAK_LOG], "Stripped logs are modern; regular logs are the closest legacy equivalent."),
  rule("minecraft:stripped_spruce_log", "1.13", ["minecraft:spruce_log" as MinecraftBlockName, LEGACY_OAK_LOG], "Stripped logs are modern; regular logs are safer."),
  rule("minecraft:stripped_birch_log", "1.13", ["minecraft:birch_log" as MinecraftBlockName, LEGACY_OAK_LOG], "Stripped logs are modern; regular logs are safer."),
  rule("minecraft:stripped_dark_oak_log", "1.13", ["minecraft:dark_oak_log" as MinecraftBlockName, "minecraft:spruce_log" as MinecraftBlockName], "Stripped logs are modern; regular logs are safer."),
  rule("minecraft:bamboo_block", "1.20", [LEGACY_OAK_PLANKS, LEGACY_OAK_LOG], "Bamboo blocks are modern; oak wood is a conservative legacy substitute."),
  rule("minecraft:bamboo_planks", "1.20", [LEGACY_OAK_PLANKS], "Bamboo planks are modern; oak planks preserve the construction role."),
  rule("minecraft:bamboo_mosaic", "1.20", [LEGACY_OAK_PLANKS, LEGACY_SPRUCE_PLANKS], "Bamboo mosaic is modern decorative wood."),
  rule("minecraft:crimson_planks", "1.16", [LEGACY_SPRUCE_PLANKS, LEGACY_OAK_PLANKS], "Crimson planks are Nether Update wood; spruce is safer for legacy medieval builds."),
  rule("minecraft:warped_planks", "1.16", [LEGACY_OAK_PLANKS, LEGACY_SPRUCE_PLANKS], "Warped planks are modern Nether wood; oak/spruce preserve the structure."),
  rule("minecraft:crimson_stem", "1.16", [LEGACY_OAK_LOG, "minecraft:spruce_log" as MinecraftBlockName], "Crimson stems are modern Nether wood; logs preserve the role."),
  rule("minecraft:warped_stem", "1.16", [LEGACY_OAK_LOG, "minecraft:spruce_log" as MinecraftBlockName], "Warped stems are modern Nether wood; logs preserve the role."),
  rule("minecraft:crimson_hyphae", "1.16", [LEGACY_OAK_LOG, "minecraft:spruce_log" as MinecraftBlockName], "Hyphae are modern Nether wood; logs preserve the role."),
  rule("minecraft:warped_hyphae", "1.16", [LEGACY_OAK_LOG, "minecraft:spruce_log" as MinecraftBlockName], "Hyphae are modern Nether wood; logs preserve the role."),

  // Copper and 1.21 trial/chamber blocks.
  rule("minecraft:copper_grate", "1.21", [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK], "Copper grates are modern open metal; iron bars keep the silhouette."),
  rule("minecraft:exposed_copper_grate", "1.21", [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK], "Copper grates are modern open metal."),
  rule("minecraft:weathered_copper_grate", "1.21", [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK], "Copper grates are modern open metal."),
  rule("minecraft:oxidized_copper_grate", "1.21", [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK], "Copper grates are modern open metal."),
  rule("minecraft:copper_bulb", "1.21", [LEGACY_GLOWSTONE, LEGACY_TORCH, LEGACY_IRON_BLOCK], "Copper bulbs are modern lights; glowstone/torch preserve lighting."),
  rule("minecraft:exposed_copper_bulb", "1.21", [LEGACY_GLOWSTONE, LEGACY_TORCH, LEGACY_IRON_BLOCK], "Copper bulbs are modern lights."),
  rule("minecraft:weathered_copper_bulb", "1.21", [LEGACY_GLOWSTONE, LEGACY_TORCH, LEGACY_IRON_BLOCK], "Copper bulbs are modern lights."),
  rule("minecraft:oxidized_copper_bulb", "1.21", [LEGACY_GLOWSTONE, LEGACY_TORCH, LEGACY_IRON_BLOCK], "Copper bulbs are modern lights."),
  rule("minecraft:chiseled_copper", "1.21", [LEGACY_IRON_BLOCK, LEGACY_BRICKS], "Chiseled copper is modern decorative metal."),
  rule("minecraft:copper_trapdoor", "1.21", [LEGACY_IRON_BARS, LEGACY_OAK_PLANKS], "Copper trapdoors are modern; bars/planks preserve detail without modern metal."),
  rule("minecraft:copper_door", "1.21", [LEGACY_IRON_BLOCK, LEGACY_OAK_PLANKS], "Copper doors are modern; iron/wood preserve the role."),
  rule("minecraft:heavy_core", "1.21", [LEGACY_IRON_BLOCK], "Heavy core is modern; iron block is the safest heavy metal fallback."),
  rule("minecraft:trial_spawner", "1.21", [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK], "Trial spawner is modern and functional; replace with inert legacy metal."),
  rule("minecraft:vault", "1.21", [LEGACY_CHEST, LEGACY_IRON_BLOCK], "Vault is modern and functional; chest/iron block preserve the visual intent."),

  // Workstations and utility blocks.
  rule("minecraft:smoker", "1.14", ["minecraft:furnace" as MinecraftBlockName, LEGACY_COBBLESTONE], "Smoker is modern; furnace is the closest legacy utility block."),
  rule("minecraft:blast_furnace", "1.14", ["minecraft:furnace" as MinecraftBlockName, LEGACY_IRON_BLOCK], "Blast furnace is modern; furnace/iron preserve industrial intent."),
  rule("minecraft:grindstone", "1.14", [LEGACY_STONE, LEGACY_OAK_PLANKS], "Grindstone is modern; stone/wood preserve detail."),
  rule("minecraft:stonecutter", "1.14", [LEGACY_STONE, LEGACY_IRON_BLOCK], "Stonecutter is modern; stone/iron preserve utility detail."),
  rule("minecraft:smithing_table", "1.14", [LEGACY_OAK_PLANKS, LEGACY_IRON_BLOCK], "Smithing table is modern; wood/iron preserve workshop role."),
  rule("minecraft:cartography_table", "1.14", [LEGACY_OAK_PLANKS], "Cartography table is modern; planks preserve table mass."),
  rule("minecraft:fletching_table", "1.14", [LEGACY_OAK_PLANKS], "Fletching table is modern; planks preserve table mass."),
  rule("minecraft:composter", "1.14", [LEGACY_OAK_FENCE, LEGACY_OAK_PLANKS], "Composter is modern; fence/planks preserve open wooden detail."),
  rule("minecraft:lectern", "1.14", [LEGACY_OAK_PLANKS, LEGACY_CHEST], "Lectern is modern; planks/chest preserve utility detail."),
  rule("minecraft:bell", "1.14", [LEGACY_GOLD_BLOCK, LEGACY_IRON_BARS], "Bell is modern; gold/iron preserve the hanging metal accent."),
  rule("minecraft:beehive", "1.15", [LEGACY_OAK_PLANKS, LEGACY_CHEST], "Beehive is modern; wood/chest preserve small storage mass."),
  rule("minecraft:bee_nest", "1.15", [LEGACY_OAK_PLANKS, LEGACY_OAK_LOG], "Bee nest is modern; wood preserves natural mass."),
  rule("minecraft:target", "1.16", [LEGACY_WOOL, LEGACY_OAK_PLANKS], "Target block is modern; wool/planks preserve decorative target mass."),
  rule("minecraft:respawn_anchor", "1.16", [LEGACY_OBSIDIAN(), LEGACY_GLOWSTONE], "Respawn anchor is modern and functional; inert obsidian/glowstone is safer."),

  // Lighting/decorative modern blocks.
  rule("minecraft:candle", "1.17", [LEGACY_TORCH], "Candles are modern lights; torch is the safest legacy light."),
  rule("minecraft:white_candle", "1.17", [LEGACY_TORCH], "Candles are modern lights; torch is the safest legacy light."),
  rule("minecraft:black_candle", "1.17", [LEGACY_TORCH], "Candles are modern lights; torch is the safest legacy light."),
  rule("minecraft:soul_torch", "1.16", [LEGACY_TORCH], "Soul torch is modern; torch preserves lighting."),
  rule("minecraft:shroomlight", "1.16", [LEGACY_GLOWSTONE, LEGACY_TORCH], "Shroomlight is modern; glowstone preserves luminous block mass."),
  rule("minecraft:ochre_froglight", "1.19", [LEGACY_GLOWSTONE, LEGACY_TORCH], "Froglights are modern; glowstone preserves luminous block mass."),
  rule("minecraft:verdant_froglight", "1.19", [LEGACY_GLOWSTONE, LEGACY_TORCH], "Froglights are modern; glowstone preserves luminous block mass."),
  rule("minecraft:pearlescent_froglight", "1.19", [LEGACY_GLOWSTONE, LEGACY_TORCH], "Froglights are modern; glowstone preserves luminous block mass."),
  rule("minecraft:glow_lichen", "1.17", [LEGACY_TORCH], "Glow lichen is modern; torch preserves lighting intent."),
  rule("minecraft:chain", "1.16", [LEGACY_IRON_BARS], "Chains are modern; iron bars preserve thin metal detail."),

  // Amethyst, sculk, archaeology, and other modern systems.
  rule("minecraft:amethyst_block", "1.17", [LEGACY_GOLD_BLOCK, LEGACY_WOOL, LEGACY_GLASS], "Amethyst is modern; decorative legacy blocks preserve accent role."),
  rule("minecraft:budding_amethyst", "1.17", [LEGACY_GOLD_BLOCK, LEGACY_WOOL, LEGACY_GLASS], "Budding amethyst is modern and functional; inert decorative blocks are safer."),
  rule("minecraft:amethyst_cluster", "1.17", [LEGACY_GLASS, LEGACY_TORCH], "Amethyst clusters are modern; glass/torch preserve small highlight detail."),
  rule("minecraft:tinted_glass", "1.17", [LEGACY_GLASS], "Tinted glass is modern; glass preserves transparency."),
  rule("minecraft:sculk", "1.19", [LEGACY_OBSIDIAN(), LEGACY_STONE], "Sculk is modern; dark inert stone is safer."),
  rule("minecraft:sculk_sensor", "1.19", [LEGACY_OBSIDIAN(), LEGACY_IRON_BARS], "Sculk sensor is modern and functional; inert blocks are safer."),
  rule("minecraft:sculk_shrieker", "1.19", [LEGACY_OBSIDIAN(), LEGACY_IRON_BARS], "Sculk shrieker is modern and functional; inert blocks are safer."),
  rule("minecraft:sculk_catalyst", "1.19", [LEGACY_OBSIDIAN(), LEGACY_STONE], "Sculk catalyst is modern and functional; inert blocks are safer."),
  rule("minecraft:decorated_pot", "1.20", [LEGACY_BRICKS], "Decorated pot is modern; bricks preserve ceramic/brick material."),
  rule("minecraft:suspicious_sand", "1.20", ["minecraft:sand" as MinecraftBlockName], "Suspicious sand is modern archaeology; sand is the inert fallback."),
  rule("minecraft:suspicious_gravel", "1.20", ["minecraft:gravel" as MinecraftBlockName, LEGACY_COBBLESTONE], "Suspicious gravel is modern archaeology; gravel/cobblestone are inert fallbacks."),

  // Create and Create-like blocks not always covered by the base fallback table.
  rule("create:gearbox", "1.0", [LEGACY_IRON_BLOCK, LEGACY_OAK_PLANKS], "Create gearbox is modded; use vanilla industrial mass."),
  rule("create:vertical_gearbox", "1.0", [LEGACY_IRON_BLOCK, LEGACY_OAK_PLANKS], "Create gearbox is modded; use vanilla industrial mass."),
  rule("create:mechanical_bearing", "1.0", [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS], "Create bearing is modded; use vanilla industrial metal."),
  rule("create:windmill_bearing", "1.0", [LEGACY_IRON_BLOCK, LEGACY_OAK_LOG], "Create bearing is modded; use vanilla metal/wood mass."),
  rule("create:mechanical_piston", "1.0", [LEGACY_IRON_BLOCK, LEGACY_OAK_PLANKS], "Create piston is modded; use vanilla industrial mass."),
  rule("create:gantry_carriage", "1.0", [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS], "Create gantry carriage is modded; use vanilla industrial metal."),
  rule("create:gantry_shaft", "1.0", [LEGACY_IRON_BARS], "Create gantry shaft is modded; iron bars preserve thin metal."),
  rule("create:depot", "1.0", [LEGACY_IRON_BLOCK, LEGACY_STONE], "Create depot is modded; use inert industrial block."),
  rule("create:basin", "1.0", [LEGACY_IRON_BLOCK, LEGACY_COBBLESTONE], "Create basin is modded; use inert industrial block."),
  rule("create:crushing_wheel", "1.0", [LEGACY_COBBLESTONE, LEGACY_STONE], "Create crushing wheel is modded; stone preserves heavy machine mass."),
  rule("create:millstone", "1.0", [LEGACY_COBBLESTONE, LEGACY_STONE], "Create millstone is modded; stone preserves heavy machine mass."),
  rule("create:encased_fan", "1.0", [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS], "Create fan is modded; iron preserves machine mass."),
  rule("create:fluid_tank", "1.0", [LEGACY_GLASS, LEGACY_IRON_BARS], "Create fluid tank is modded; glass/bars preserve tank silhouette."),
  rule("create:mechanical_pump", "1.0", [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS], "Create pump is modded; iron preserves machine mass."),
  rule("create:item_vault", "1.0", [LEGACY_CHEST, LEGACY_IRON_BLOCK], "Create item vault is modded; chest/iron preserve storage role."),
];

function LEGACY_OBSIDIAN(): MinecraftBlockName {
  return "minecraft:obsidian" as MinecraftBlockName;
}

const NINE_F_RULE_BY_ID = new Map<MinecraftBlockName, SupplementalRule>(
  NINE_F_SUPPLEMENTAL_RULES.map((entry) => [entry.id, entry]),
);

function asMinecraftBlockName(blockId: string): MinecraftBlockName {
  return canonicalizeMinecraftBlockId(blockId) as MinecraftBlockName;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeTargetMinecraftVersion(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return normalizeMinecraftVersion(value).replace(/\.0$/, "");
  } catch {
    return value.trim();
  }
}

function inferTargetVersionFromProfile(profile: GeneratedSchematicBuild["profile"]): string | undefined {
  if (typeof profile !== "string") {
    return undefined;
  }

  const direct = profile.match(/^(\d+\.\d+(?:\.\d+)?)$/);
  if (direct?.[1]) {
    return direct[1];
  }

  const versionProfile = profile.match(/^vanilla-(\d+)-(\d+)(?:-(\d+))?$/i);
  if (!versionProfile) {
    return undefined;
  }

  const [, major, minor, patch] = versionProfile;
  return `${major}.${minor}${patch ? `.${patch}` : ""}`;
}

function readTargetMinecraftVersion(build: GeneratedSchematicBuild): string | undefined {
  return normalizeTargetMinecraftVersion(build.targetMinecraftVersion ?? inferTargetVersionFromProfile(build.profile));
}

function isKnownOrSupplementalAllowed(blockId: MinecraftBlockName, context: ResolutionContext): boolean {
  const namespace = blockId.split(":")[0] ?? "minecraft";

  if (namespace !== "minecraft") {
    return context.allowModdedBlocks && context.supportedModdedBlocks.has(blockId);
  }

  const registryEntry = getMinecraftBlockRegistryEntry(blockId);
  if (registryEntry) {
    return isMinecraftVersionAtLeast(context.targetMinecraftVersion, registryEntry.introducedIn);
  }

  const supplementalRule = NINE_F_RULE_BY_ID.get(blockId);
  if (supplementalRule) {
    return isMinecraftVersionAtLeast(context.targetMinecraftVersion, supplementalRule.introducedIn);
  }

  return false;
}

function genericFallbacksFor(blockId: MinecraftBlockName): MinecraftBlockName[] {
  const lower = blockId.toLowerCase();

  if (lower.includes("air")) return [LEGACY_AIR];
  if (lower.includes("glass")) return [LEGACY_GLASS, LEGACY_IRON_BARS, LEGACY_AIR];
  if (lower.includes("light") || lower.includes("lamp") || lower.includes("lantern") || lower.includes("bulb")) {
    return [LEGACY_TORCH, LEGACY_GLOWSTONE, LEGACY_AIR];
  }
  if (lower.includes("copper") || lower.includes("brass") || lower.includes("metal")) {
    return [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS, LEGACY_BRICKS, LEGACY_STONE];
  }
  if (lower.includes("chain") || lower.includes("bar") || lower.includes("shaft") || lower.includes("girder")) {
    return [LEGACY_IRON_BARS, LEGACY_IRON_BLOCK, LEGACY_STONE];
  }
  if (lower.includes("deepslate") || lower.includes("blackstone") || lower.includes("basalt") || lower.includes("tuff")) {
    return [LEGACY_STONE_BRICKS, LEGACY_COBBLESTONE, LEGACY_STONE];
  }
  if (lower.includes("brick")) return [LEGACY_BRICKS, LEGACY_STONE_BRICKS, LEGACY_COBBLESTONE];
  if (lower.includes("log") || lower.includes("stem") || lower.includes("hyphae")) {
    return [LEGACY_OAK_LOG, "minecraft:spruce_log" as MinecraftBlockName, LEGACY_OAK_PLANKS];
  }
  if (lower.includes("planks") || lower.includes("wood") || lower.includes("bamboo") || lower.includes("cherry")) {
    return [LEGACY_OAK_PLANKS, LEGACY_SPRUCE_PLANKS, LEGACY_OAK_LOG];
  }
  if (lower.includes("fence")) return [LEGACY_OAK_FENCE, LEGACY_OAK_PLANKS];
  if (lower.includes("chest") || lower.includes("barrel") || lower.includes("vault")) {
    return [LEGACY_CHEST, LEGACY_OAK_PLANKS, LEGACY_IRON_BLOCK];
  }
  if (lower.includes("wool") || lower.includes("carpet") || lower.includes("banner")) return [LEGACY_WOOL, LEGACY_AIR];
  if (lower.includes("sand")) return ["minecraft:sand" as MinecraftBlockName, LEGACY_STONE];
  if (lower.includes("gravel")) return ["minecraft:gravel" as MinecraftBlockName, LEGACY_COBBLESTONE];
  if (lower.includes("nether") || lower.includes("soul") || lower.includes("crimson") || lower.includes("warped")) {
    return [LEGACY_NETHERRACK, LEGACY_STONE, LEGACY_OAK_PLANKS];
  }
  if (lower.startsWith("create:")) return [LEGACY_IRON_BLOCK, LEGACY_IRON_BARS, LEGACY_OAK_PLANKS, LEGACY_STONE];

  return [LEGACY_STONE_BRICKS, LEGACY_COBBLESTONE, LEGACY_STONE];
}

function resolveWithSupplementalFallback(
  blockId: MinecraftBlockName,
  context: ResolutionContext,
  visited = new Set<MinecraftBlockName>(),
): ResolutionResult {
  const original = asMinecraftBlockName(blockId);

  if (visited.has(original)) {
    return {
      original,
      replacement: LEGACY_STONE,
      changed: true,
      omitted: false,
      compatible: isKnownOrSupplementalAllowed(LEGACY_STONE, context),
      reason: `9F detected a fallback cycle for ${original}; replaced with ${LEGACY_STONE}.`,
    };
  }

  visited.add(original);

  if (isKnownOrSupplementalAllowed(original, context)) {
    return {
      original,
      replacement: original,
      changed: false,
      omitted: false,
      compatible: true,
      reason: `${original} is compatible with Minecraft ${context.targetMinecraftVersion}.`,
    };
  }

  const registryResolution = resolveBlockForVersion(original, context.targetMinecraftVersion);
  const registryReplacement = asMinecraftBlockName(registryResolution.resolvedBlockId);
  if (
    registryResolution.allowed &&
    registryReplacement !== original &&
    isKnownOrSupplementalAllowed(registryReplacement, context)
  ) {
    return {
      original,
      replacement: registryReplacement,
      changed: true,
      omitted: registryResolution.omitted,
      compatible: true,
      reason: `9F accepted registry fallback: ${registryResolution.reason}`,
    };
  }

  const supplementalRule = NINE_F_RULE_BY_ID.get(original);
  const fallbackCandidates = uniqueStrings([
    ...(supplementalRule?.substitutions ?? []),
    ...genericFallbacksFor(original),
    LEGACY_STONE,
  ]).map(asMinecraftBlockName);

  if (supplementalRule?.omitWhenUnavailable) {
    return {
      original,
      replacement: LEGACY_AIR,
      changed: true,
      omitted: true,
      compatible: true,
      reason: `9F omitted ${original} for Minecraft ${context.targetMinecraftVersion}: ${supplementalRule.reason}`,
    };
  }

  for (const candidate of fallbackCandidates) {
    if (candidate === original) {
      continue;
    }

    if (isKnownOrSupplementalAllowed(candidate, context)) {
      return {
        original,
        replacement: candidate,
        changed: true,
        omitted: candidate === LEGACY_AIR,
        compatible: true,
        reason: supplementalRule
          ? `9F supplemental fallback: ${supplementalRule.reason}`
          : `9F generic fallback for unknown or incompatible block ${original}.`,
      };
    }

    const nested = resolveWithSupplementalFallback(candidate, context, new Set(visited));
    if (nested.compatible) {
      return {
        original,
        replacement: nested.replacement,
        changed: true,
        omitted: nested.omitted,
        compatible: true,
        reason: supplementalRule
          ? `9F supplemental fallback chain: ${supplementalRule.reason}`
          : `9F generic fallback chain for ${original}: ${nested.reason}`,
      };
    }
  }

  return {
    original,
    replacement: LEGACY_AIR,
    changed: true,
    omitted: true,
    compatible: false,
    reason: `9F could not find a compatible fallback for ${original} in Minecraft ${context.targetMinecraftVersion}; replaced with air and marked unresolved.`,
  };
}

function addCoordinate(target: Milestone9FCoordinate[], coordinate: Milestone9FCoordinate): void {
  if (target.length < EXAMPLE_COORDINATE_LIMIT) {
    target.push(coordinate);
  }
}

function makeSkippedReport(): Milestone9FHardeningReport {
  return {
    milestone: "9F",
    status: "skipped",
    ok: true,
    checkedBlockCount: 0,
    changedBlockCount: 0,
    changedBlockTypeCount: 0,
    omittedBlockCount: 0,
    unresolvedBlockCount: 0,
    unresolvedBlockTypeCount: 0,
    replacements: [],
    unresolvedBlocks: [],
    summary: "9F final version hardening skipped because no target Minecraft version was provided.",
  };
}

function createReport(args: {
  targetMinecraftVersion: string;
  checkedBlockCount: number;
  changedBlockCount: number;
  omittedBlockCount: number;
  replacementMap: Map<string, MutableReplacementSummary>;
  unresolvedMap: Map<MinecraftBlockName, MutableUnresolvedSummary>;
}): Milestone9FHardeningReport {
  const replacements = Array.from(args.replacementMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return `${a.original}->${a.replacement}`.localeCompare(`${b.original}->${b.replacement}`);
  });

  const unresolvedBlocks = Array.from(args.unresolvedMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.original.localeCompare(b.original);
  });

  const ok = unresolvedBlocks.length === 0;
  const status: Milestone9FHardeningStatus = ok ? "passed" : "warning";
  const summary = ok
    ? `9F final version hardening passed for Minecraft ${args.targetMinecraftVersion}: ${args.checkedBlockCount} placed block(s), ${args.changedBlockCount} fallback replacement(s), ${args.omittedBlockCount} omitted block(s), 0 unresolved block(s).`
    : `9F final version hardening needs review for Minecraft ${args.targetMinecraftVersion}: ${args.unresolvedMap.size} unresolved block type(s), ${args.changedBlockCount} fallback replacement(s).`;

  return {
    milestone: "9F",
    status,
    ok,
    targetMinecraftVersion: args.targetMinecraftVersion,
    checkedBlockCount: args.checkedBlockCount,
    changedBlockCount: args.changedBlockCount,
    changedBlockTypeCount: replacements.length,
    omittedBlockCount: args.omittedBlockCount,
    unresolvedBlockCount: Array.from(args.unresolvedMap.values()).reduce((total, entry) => total + entry.count, 0),
    unresolvedBlockTypeCount: unresolvedBlocks.length,
    replacements,
    unresolvedBlocks,
    summary,
  };
}

function mergeReportIntoBlockRegistryReport(
  existing: BlockRegistryReport | undefined,
  report: Milestone9FHardeningReport,
): BlockRegistryReport | undefined {
  if (!existing || report.status === "skipped") {
    return existing;
  }

  const replacementRecords: BlockRegistryReport["replacements"] = report.replacements.map((replacement) => ({
    original: replacement.original,
    replacement: replacement.replacement,
    reason: `9F final hardening: ${replacement.reason}`,
    context: `9F final hardening x${replacement.count}`,
  }));

  const unsupportedRecords: BlockRegistryReport["unsupportedBlocks"] = report.unresolvedBlocks.map((unresolved) => ({
    block: unresolved.original,
    reason: `9F could not fully resolve ${unresolved.original}: ${unresolved.reason}`,
  }));

  return {
    ...existing,
    changedBlocks: existing.changedBlocks + replacementRecords.length,
    fallbackBlocks: existing.fallbackBlocks + report.changedBlockCount,
    replacements: [...(existing.replacements ?? []), ...replacementRecords],
    unsupportedBlocks: [...(existing.unsupportedBlocks ?? []), ...unsupportedRecords],
    warnings: uniqueStrings([...(existing.warnings ?? []), report.summary]),
  };
}

function makeUnresolvedWarnings(report: Milestone9FHardeningReport): string[] {
  return report.unresolvedBlocks.map((unresolved) => {
    const coordinates = unresolved.exampleCoordinates.map((coordinate) => `${coordinate.x},${coordinate.y},${coordinate.z}`).join("; ");
    return `9F unresolved block ${unresolved.original} x${unresolved.count}: ${unresolved.reason}${coordinates ? ` Coordinates: ${coordinates}.` : ""}`;
  });
}

function recomputePalette(blocks: readonly SchematicBlock[]): MinecraftBlockName[] {
  const palette = new Set<MinecraftBlockName>();

  palette.add(LEGACY_AIR);

  for (const block of blocks) {
    palette.add(asMinecraftBlockName(block.block));
  }

  return Array.from(palette).sort((a, b) => {
    if (a === LEGACY_AIR) return -1;
    if (b === LEGACY_AIR) return 1;
    return a.localeCompare(b);
  });
}

export function createMilestone9FHardeningReport(build: GeneratedSchematicBuild): Milestone9FHardeningReport {
  const hardened = applyMilestone9FFinalVersionHardeningToBuild(build);
  return hardened.milestone9FHardeningReport;
}

export function applyMilestone9FFinalVersionHardeningToBuild<TBuild extends GeneratedSchematicBuild>(
  build: TBuild,
): TBuild & { milestone9FHardeningReport: Milestone9FHardeningReport } {
  const targetMinecraftVersion = readTargetMinecraftVersion(build);

  if (!targetMinecraftVersion) {
    return {
      ...build,
      milestone9FHardeningReport: makeSkippedReport(),
    };
  }

  const replacementMap = new Map<string, MutableReplacementSummary>();
  const unresolvedMap = new Map<MinecraftBlockName, MutableUnresolvedSummary>();
  const resolutionContext: ResolutionContext = {
    targetMinecraftVersion,
    allowModdedBlocks: build.allowModdedBlocks === true,
    supportedModdedBlocks: new Set(build.blockRegistryReport?.supportedModdedBlocks ?? []),
  };
  let changedBlockCount = 0;
  let omittedBlockCount = 0;

  const blocks = build.blocks.map((block) => {
    const original = asMinecraftBlockName(block.block);
    const resolution = resolveWithSupplementalFallback(original, resolutionContext);

    if (!resolution.changed) {
      return block;
    }

    changedBlockCount += 1;
    if (resolution.omitted) {
      omittedBlockCount += 1;
    }

    const coordinate = { x: block.x, y: block.y, z: block.z };
    const replacementKey = `${resolution.original}->${resolution.replacement}`;
    const existingReplacement = replacementMap.get(replacementKey);

    if (existingReplacement) {
      existingReplacement.count += 1;
      addCoordinate(existingReplacement.exampleCoordinates, coordinate);
    } else {
      replacementMap.set(replacementKey, {
        original: resolution.original,
        replacement: resolution.replacement,
        count: 1,
        reason: resolution.reason,
        exampleCoordinates: [coordinate],
      });
    }

    if (!resolution.compatible) {
      const existingUnresolved = unresolvedMap.get(resolution.original);
      if (existingUnresolved) {
        existingUnresolved.count += 1;
        addCoordinate(existingUnresolved.exampleCoordinates, coordinate);
      } else {
        unresolvedMap.set(resolution.original, {
          original: resolution.original,
          count: 1,
          reason: resolution.reason,
          exampleCoordinates: [coordinate],
        });
      }
    }

    return {
      ...block,
      block: resolution.replacement,
    };
  });

  const report = createReport({
    targetMinecraftVersion,
    checkedBlockCount: build.blocks.length,
    changedBlockCount,
    omittedBlockCount,
    replacementMap,
    unresolvedMap,
  });

  const features = uniqueStrings([
    ...(build.features ?? []),
    "version_registry_hardening_9f",
    report.ok ? "version_registry_hardening_clean" : "version_registry_hardening_needs_review",
    "minecraft_version_block_limits_complete",
  ]);

  const placementWarnings = report.changedBlockCount > 0 || !report.ok
    ? uniqueStrings([...(build.placementWarnings ?? []), report.summary])
    : build.placementWarnings ?? [];

  const unsupportedBlockWarnings = report.ok
    ? build.unsupportedBlockWarnings ?? []
    : uniqueStrings([...(build.unsupportedBlockWarnings ?? []), ...makeUnresolvedWarnings(report)]);

  return {
    ...build,
    blocks,
    blockCount: blocks.length,
    palette: recomputePalette(blocks),
    features,
    placementWarnings,
    unsupportedBlockWarnings,
    blockRegistryReport: mergeReportIntoBlockRegistryReport(build.blockRegistryReport, report),
    milestone9FHardeningReport: report,
  };
}

export function runMilestone9FRegistryHardeningSelfTest(): string[] {
  const baseBuild: GeneratedSchematicBuild = {
    buildId: "schematic-9f-selftest",
    displayName: "Schematic 9F Self Test",
    generatorName: "factory",
    variant: "create_industrial",
    profile: "vanilla",
    allowModdedBlocks: false,
    fallbackToVanilla: true,
    prompt: "9F self test",
    command: "schematic 9f self test",
    minecraftVersion: "1.21.1",
    targetMinecraftVersion: "1.8.8",
    generatedAt: new Date(0).toISOString(),
    size: { x: 5, y: 5, z: 5 },
    palette: [
      "minecraft:air",
      "minecraft:oak_planks",
      "minecraft:copper_bulb" as MinecraftBlockName,
      "minecraft:tuff_bricks" as MinecraftBlockName,
      "create:gearbox" as MinecraftBlockName,
    ],
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:oak_planks" },
      { x: 1, y: 0, z: 0, block: "minecraft:copper_bulb" as MinecraftBlockName },
      { x: 2, y: 0, z: 0, block: "minecraft:tuff_bricks" as MinecraftBlockName },
      { x: 3, y: 0, z: 0, block: "create:gearbox" as MinecraftBlockName },
    ],
    blockCount: 4,
    blockRegistryReport: {
      profileId: "vanilla",
      profileDisplayName: "Vanilla",
      allowModdedBlocks: false,
      fallbackToVanilla: true,
      allowedNamespaces: ["minecraft"],
      supportedModdedBlocks: [],
      totalBlocksChecked: 4,
      totalPaletteEntriesChecked: 5,
      changedBlocks: 0,
      fallbackBlocks: 0,
      unsupportedBlocks: [],
      replacements: [],
      warnings: [],
    },
  };

  const hardened = applyMilestone9FFinalVersionHardeningToBuild(baseBuild);
  const blocks = new Set(hardened.blocks.map((block) => block.block));

  if (!hardened.features?.includes("minecraft_version_block_limits_complete")) {
    throw new Error("9F self test expected final milestone feature marker.");
  }

  if (blocks.has("minecraft:copper_bulb" as MinecraftBlockName)) {
    throw new Error("9F self test expected copper bulb to be replaced for Minecraft 1.8.8.");
  }

  if (blocks.has("minecraft:tuff_bricks" as MinecraftBlockName)) {
    throw new Error("9F self test expected tuff bricks to be replaced for Minecraft 1.8.8.");
  }

  if (blocks.has("create:gearbox" as MinecraftBlockName)) {
    throw new Error("9F self test expected Create gearbox to be replaced for vanilla 1.8.8.");
  }

  if (hardened.milestone9FHardeningReport.changedBlockCount !== 3) {
    throw new Error("9F self test expected three fallback replacements.");
  }

  if (!hardened.blockRegistryReport?.replacements.length) {
    throw new Error("9F self test expected replacement records to be merged into blockRegistryReport.");
  }

  return [
    "PASS 9F replaces modern copper blocks for 1.8.8",
    "PASS 9F replaces modern tuff masonry for 1.8.8",
    "PASS 9F replaces uncovered Create blocks for vanilla 1.8.8",
    "PASS 9F emits minecraft_version_block_limits_complete",
  ];
}
