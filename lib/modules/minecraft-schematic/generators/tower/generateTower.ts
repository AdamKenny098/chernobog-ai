import { buildShapeAwareTower, type ShapeAwareTowerOptions } from "../../builders/buildShapeAwareTower";
import { InMemoryShapeGrid } from "../../shape/InMemoryShapeGrid";
import { getGridEntries } from "../../shape/ShapeKernelGrid";
import type {
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
  TowerVariant,
} from "../../types";

type GenerateTowerOptions = {
  variant?: TowerVariant | string;
  prompt?: string;
  command?: string;
  minecraftVersion?: string;
};

type TowerScale = "small" | "medium" | "large";

type ControlledTowerTheme =
  | "default"
  | "medieval"
  | "ruined"
  | "snow"
  | "dark_fantasy"
  | "create_industrial"
  | "deepslate"
  | "wooden";

type ThemeProfile = {
  id: ControlledTowerTheme;
  buildIdPrefix: string;
  wallBlock: MinecraftBlockName;
  accentBlock: MinecraftBlockName;
  weatheredBlock: MinecraftBlockName;
  crackedBlock: MinecraftBlockName;
  stairBlock: MinecraftBlockName;
  slabBlock: MinecraftBlockName;
  doorBlock: MinecraftBlockName;
  paneBlock: MinecraftBlockName;
  fenceBlock: MinecraftBlockName;
  wallRailingBlock: MinecraftBlockName;
  trapdoorBlock: MinecraftBlockName;
  detailBlock: MinecraftBlockName;
  glowBlock: MinecraftBlockName;
  includeWeathering: boolean;
  weatheringChance: number;
  damageChance: number;
};

const DEFAULT_MINECRAFT_VERSION = "1.21.1";

const THEME_PROFILES: Record<ControlledTowerTheme, ThemeProfile> = {
  default: {
    id: "default",
    buildIdPrefix: "stone_tower",
    wallBlock: "minecraft:stone_bricks" as MinecraftBlockName,
    accentBlock: "minecraft:chiseled_stone_bricks" as MinecraftBlockName,
    weatheredBlock: "minecraft:mossy_stone_bricks" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_stone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:stone_brick_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:stone_brick_slab" as MinecraftBlockName,
    doorBlock: "minecraft:spruce_door" as MinecraftBlockName,
    paneBlock: "minecraft:glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:spruce_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:stone_brick_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:spruce_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:chiseled_stone_bricks" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 10,
    damageChance: 0,
  },
  medieval: {
    id: "medieval",
    buildIdPrefix: "medieval_tower",
    wallBlock: "minecraft:mossy_cobblestone" as MinecraftBlockName,
    accentBlock: "minecraft:cobblestone" as MinecraftBlockName,
    weatheredBlock: "minecraft:stone_bricks" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_stone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:mossy_cobblestone_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:mossy_cobblestone_slab" as MinecraftBlockName,
    doorBlock: "minecraft:dark_oak_door" as MinecraftBlockName,
    paneBlock: "minecraft:glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:dark_oak_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:cobblestone_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:dark_oak_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:oak_log" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 18,
    damageChance: 0,
  },
  ruined: {
    id: "ruined",
    buildIdPrefix: "ruined_tower",
    wallBlock: "minecraft:stone_bricks" as MinecraftBlockName,
    accentBlock: "minecraft:cobblestone" as MinecraftBlockName,
    weatheredBlock: "minecraft:mossy_stone_bricks" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_stone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:stone_brick_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:stone_brick_slab" as MinecraftBlockName,
    doorBlock: "minecraft:dark_oak_door" as MinecraftBlockName,
    paneBlock: "minecraft:glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:dark_oak_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:cobblestone_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:dark_oak_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:mossy_cobblestone" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 36,
    damageChance: 18,
  },
  snow: {
    id: "snow",
    buildIdPrefix: "snowy_tower",
    wallBlock: "minecraft:stone_bricks" as MinecraftBlockName,
    accentBlock: "minecraft:polished_andesite" as MinecraftBlockName,
    weatheredBlock: "minecraft:andesite" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_stone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:stone_brick_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:stone_brick_slab" as MinecraftBlockName,
    doorBlock: "minecraft:spruce_door" as MinecraftBlockName,
    paneBlock: "minecraft:light_blue_stained_glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:spruce_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:stone_brick_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:spruce_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:snow_block" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 14,
    damageChance: 6,
  },
  dark_fantasy: {
    id: "dark_fantasy",
    buildIdPrefix: "dark_fantasy_tower",
    wallBlock: "minecraft:deepslate_tiles" as MinecraftBlockName,
    accentBlock: "minecraft:polished_blackstone_bricks" as MinecraftBlockName,
    weatheredBlock: "minecraft:cracked_deepslate_tiles" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_polished_blackstone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:deepslate_tile_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:deepslate_tile_slab" as MinecraftBlockName,
    doorBlock: "minecraft:dark_oak_door" as MinecraftBlockName,
    paneBlock: "minecraft:purple_stained_glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:dark_oak_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:polished_blackstone_brick_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:dark_oak_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:obsidian" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 22,
    damageChance: 4,
  },
  create_industrial: {
    id: "create_industrial",
    buildIdPrefix: "create_industrial_tower",
    wallBlock: "minecraft:bricks" as MinecraftBlockName,
    accentBlock: "minecraft:cut_copper" as MinecraftBlockName,
    weatheredBlock: "minecraft:exposed_cut_copper" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_stone_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:brick_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:brick_slab" as MinecraftBlockName,
    doorBlock: "minecraft:iron_door" as MinecraftBlockName,
    paneBlock: "minecraft:glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:oak_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:brick_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:iron_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:copper_block" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 16,
    damageChance: 0,
  },
  deepslate: {
    id: "deepslate",
    buildIdPrefix: "deepslate_tower",
    wallBlock: "minecraft:deepslate_bricks" as MinecraftBlockName,
    accentBlock: "minecraft:deepslate_tiles" as MinecraftBlockName,
    weatheredBlock: "minecraft:cobbled_deepslate" as MinecraftBlockName,
    crackedBlock: "minecraft:cracked_deepslate_bricks" as MinecraftBlockName,
    stairBlock: "minecraft:deepslate_brick_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:deepslate_brick_slab" as MinecraftBlockName,
    doorBlock: "minecraft:spruce_door" as MinecraftBlockName,
    paneBlock: "minecraft:gray_stained_glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:spruce_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:deepslate_brick_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:spruce_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:polished_deepslate" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: true,
    weatheringChance: 20,
    damageChance: 3,
  },
  wooden: {
    id: "wooden",
    buildIdPrefix: "wooden_tower",
    wallBlock: "minecraft:spruce_planks" as MinecraftBlockName,
    accentBlock: "minecraft:stripped_spruce_log" as MinecraftBlockName,
    weatheredBlock: "minecraft:dark_oak_planks" as MinecraftBlockName,
    crackedBlock: "minecraft:oak_planks" as MinecraftBlockName,
    stairBlock: "minecraft:spruce_stairs" as MinecraftBlockName,
    slabBlock: "minecraft:spruce_slab" as MinecraftBlockName,
    doorBlock: "minecraft:spruce_door" as MinecraftBlockName,
    paneBlock: "minecraft:glass_pane" as MinecraftBlockName,
    fenceBlock: "minecraft:spruce_fence" as MinecraftBlockName,
    wallRailingBlock: "minecraft:cobblestone_wall" as MinecraftBlockName,
    trapdoorBlock: "minecraft:spruce_trapdoor" as MinecraftBlockName,
    detailBlock: "minecraft:spruce_log" as MinecraftBlockName,
    glowBlock: "minecraft:glowstone" as MinecraftBlockName,
    includeWeathering: false,
    weatheringChance: 12,
    damageChance: 0,
  },
};

function normalize(input: string): string {
  return input.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
}

function createBuildId(generatorName: string): string {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `${generatorName}-${timestamp}`;
}

function deterministicHash(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function chance(seed: string, percent: number): boolean {
  return deterministicHash(seed) % 100 < percent;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function inferScale(promptText: string): TowerScale {
  if (includesAny(promptText, ["tiny", "small", "short", "compact", "little"])) {
    return "small";
  }

  if (includesAny(promptText, ["large", "huge", "massive", "giant", "grand", "tall", "imposing"])) {
    return "large";
  }

  return "medium";
}

function inferTheme(options: GenerateTowerOptions): ThemeProfile {
  const promptText = normalize(
    [options.variant ?? "", options.prompt ?? "", options.command ?? ""].join(" "),
  );

  if (includesAny(promptText, ["dark wizard", "wizard", "dark fantasy", "gothic", "necromancer", "evil", "shadow"])) {
    return THEME_PROFILES.dark_fantasy;
  }

  if (includesAny(promptText, ["create", "industrial", "factory", "copper", "brass", "steam", "gear", "cog"])) {
    return THEME_PROFILES.create_industrial;
  }

  if (includesAny(promptText, ["snow", "snowy", "frozen", "ice", "icy", "winter", "arctic"])) {
    return THEME_PROFILES.snow;
  }

  if (includesAny(promptText, ["ruin", "ruined", "abandoned", "collapsed", "broken", "damaged", "decayed"])) {
    return THEME_PROFILES.ruined;
  }

  if (includesAny(promptText, ["deepslate", "blackstone", "deep stone"])) {
    return THEME_PROFILES.deepslate;
  }

  if (includesAny(promptText, ["wood", "wooden", "timber", "log", "palisade"])) {
    return THEME_PROFILES.wooden;
  }

  if (includesAny(promptText, ["medieval", "castle", "keep", "mossy", "old stone"])) {
    return THEME_PROFILES.medieval;
  }

  return THEME_PROFILES.default;
}

function getShapeSize(scale: TowerScale, promptText: string): { width: number; height: number } {
  if (scale === "small") {
    return { width: 9, height: 14 };
  }

  if (scale === "large") {
    return { width: 15, height: includesAny(promptText, ["watchtower", "watch tower", "lookout"]) ? 30 : 28 };
  }

  return { width: includesAny(promptText, ["watchtower", "watch tower", "lookout"]) ? 11 : 13, height: 20 };
}

function getShapeAwareOptions(profile: ThemeProfile, scale: TowerScale, promptText: string): ShapeAwareTowerOptions {
  const size = getShapeSize(scale, promptText);

  return {
    originX: 1,
    originY: 0,
    originZ: 1,
    width: size.width,
    height: size.height,
    wallBlock: profile.wallBlock,
    accentBlock: profile.accentBlock,
    weatheredBlock: profile.weatheredBlock,
    crackedBlock: profile.crackedBlock,
    stairBlock: profile.stairBlock,
    slabBlock: profile.slabBlock,
    doorBlock: profile.doorBlock,
    paneBlock: profile.paneBlock,
    fenceBlock: profile.fenceBlock,
    wallRailingBlock: profile.wallRailingBlock,
    trapdoorBlock: profile.trapdoorBlock,
    ladderFacing: "west",
    includeWeathering: profile.includeWeathering,
  };
}

function normalizeEntriesToBuildBlocks(
  entries: ReturnType<typeof getGridEntries>,
): { blocks: SchematicBlock[]; size: { x: number; y: number; z: number } } {
  const nonAirEntries = entries.filter((entry) => entry.blockState !== "minecraft:air");

  if (nonAirEntries.length === 0) {
    return {
      blocks: [],
      size: { x: 1, y: 1, z: 1 },
    };
  }

  const minX = Math.min(...nonAirEntries.map((entry) => entry.x));
  const minY = Math.min(...nonAirEntries.map((entry) => entry.y));
  const minZ = Math.min(...nonAirEntries.map((entry) => entry.z));
  const maxX = Math.max(...nonAirEntries.map((entry) => entry.x));
  const maxY = Math.max(...nonAirEntries.map((entry) => entry.y));
  const maxZ = Math.max(...nonAirEntries.map((entry) => entry.z));

  const blocks = nonAirEntries.map((entry) => ({
    x: entry.x - minX,
    y: entry.y - minY,
    z: entry.z - minZ,
    block: entry.blockState as MinecraftBlockName,
  }));

  return {
    blocks: sortBlocks(blocks),
    size: {
      x: maxX - minX + 1,
      y: maxY - minY + 1,
      z: maxZ - minZ + 1,
    },
  };
}

function sortBlocks(blocks: SchematicBlock[]): SchematicBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.z !== b.z) return a.z - b.z;
    return a.x - b.x;
  });
}

function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function mapBlocks(blocks: SchematicBlock[]): Map<string, SchematicBlock> {
  const map = new Map<string, SchematicBlock>();

  for (const block of blocks) {
    map.set(blockKey(block.x, block.y, block.z), { ...block });
  }

  return map;
}

function isOuterShell(block: SchematicBlock, size: { x: number; y: number; z: number }): boolean {
  return block.x === 0 || block.z === 0 || block.x === size.x - 1 || block.z === size.z - 1;
}

function isCorner(block: SchematicBlock, size: { x: number; y: number; z: number }): boolean {
  const cornerX = block.x === 0 || block.x === size.x - 1;
  const cornerZ = block.z === 0 || block.z === size.z - 1;

  return cornerX && cornerZ;
}

function setBlock(map: Map<string, SchematicBlock>, x: number, y: number, z: number, block: MinecraftBlockName): void {
  map.set(blockKey(x, y, z), { x, y, z, block });
}

function deleteBlock(map: Map<string, SchematicBlock>, x: number, y: number, z: number): void {
  map.delete(blockKey(x, y, z));
}

function applyWallVariation(
  map: Map<string, SchematicBlock>,
  size: { x: number; y: number; z: number },
  profile: ThemeProfile,
  promptText: string,
): void {
  for (const block of [...map.values()]) {
    if (!isOuterShell(block, size) || block.y < 2) {
      continue;
    }

    if (isCorner(block, size) && block.y % 3 === 0) {
      setBlock(map, block.x, block.y, block.z, profile.accentBlock);
      continue;
    }

    if (chance(`${promptText}:weather:${block.x}:${block.y}:${block.z}`, profile.weatheringChance)) {
      const replacement = chance(`${promptText}:cracked:${block.x}:${block.y}:${block.z}`, 45)
        ? profile.crackedBlock
        : profile.weatheredBlock;

      setBlock(map, block.x, block.y, block.z, replacement);
    }
  }
}

function applyRuinedDamage(
  map: Map<string, SchematicBlock>,
  size: { x: number; y: number; z: number },
  profile: ThemeProfile,
  promptText: string,
): void {
  const explicitRuin = includesAny(promptText, ["ruin", "ruined", "abandoned", "collapsed", "broken", "damaged"]);
  const damageChance = explicitRuin ? Math.max(profile.damageChance, 16) : profile.damageChance;

  if (damageChance <= 0) {
    return;
  }

  for (const block of [...map.values()]) {
    if (!isOuterShell(block, size) || isCorner(block, size) || block.y < Math.floor(size.y * 0.45)) {
      continue;
    }

    const upperBoost = block.y > Math.floor(size.y * 0.75) ? 8 : 0;

    if (chance(`${promptText}:damage:${block.x}:${block.y}:${block.z}`, damageChance + upperBoost)) {
      deleteBlock(map, block.x, block.y, block.z);
    }
  }
}

function addLanternDetails(
  map: Map<string, SchematicBlock>,
  size: { x: number; y: number; z: number },
  profile: ThemeProfile,
  promptText: string,
): void {
  if (!includesAny(promptText, ["lantern", "lanterns", "lit", "light", "lights", "wizard", "dark", "watchtower", "watch tower"])) {
    return;
  }

  const centerX = Math.floor(size.x / 2);
  const centerZ = Math.floor(size.z / 2);
  const yLevels = [Math.floor(size.y * 0.33), Math.floor(size.y * 0.62)].filter(
    (value, index, values) => value > 2 && value < size.y - 2 && values.indexOf(value) === index,
  );

  for (const y of yLevels) {
    setBlock(map, centerX, y, 0, profile.glowBlock);
    setBlock(map, centerX, y, size.z - 1, profile.glowBlock);
    setBlock(map, 0, y, centerZ, profile.glowBlock);
    setBlock(map, size.x - 1, y, centerZ, profile.glowBlock);
  }
}

function addSnowCaps(
  map: Map<string, SchematicBlock>,
  size: { x: number; y: number; z: number },
  promptText: string,
): void {
  if (!includesAny(promptText, ["snow", "snowy", "frozen", "ice", "icy", "winter", "arctic"])) {
    return;
  }

  const topByColumn = new Map<string, number>();

  for (const block of map.values()) {
    const key = `${block.x},${block.z}`;
    const current = topByColumn.get(key) ?? -1;
    if (block.y > current) {
      topByColumn.set(key, block.y);
    }
  }

  for (const [column, topY] of topByColumn.entries()) {
    const [rawX, rawZ] = column.split(",");
    const x = Number(rawX);
    const z = Number(rawZ);

    if (!Number.isFinite(x) || !Number.isFinite(z) || topY < 0) {
      continue;
    }

    const nearEdge = x <= 1 || z <= 1 || x >= size.x - 2 || z >= size.z - 2;
    const percent = nearEdge ? 70 : 35;

    if (chance(`${promptText}:snow:${x}:${topY}:${z}`, percent)) {
      setBlock(map, x, topY + 1, z, "minecraft:snow_block" as MinecraftBlockName);
    }
  }
}

function addThemeSilhouetteDetails(
  map: Map<string, SchematicBlock>,
  size: { x: number; y: number; z: number },
  profile: ThemeProfile,
  promptText: string,
): void {
  const maxY = size.y - 1;
  const corners = [
    [0, 0],
    [size.x - 1, 0],
    [0, size.z - 1],
    [size.x - 1, size.z - 1],
  ] as const;

  if (profile.id === "dark_fantasy") {
    for (const [x, z] of corners) {
      setBlock(map, x, maxY, z, profile.detailBlock);
      setBlock(map, x, maxY + 1, z, profile.detailBlock);
    }
  }

  if (profile.id === "create_industrial") {
    for (let y = 3; y < size.y - 2; y += 4) {
      setBlock(map, 1, y, 0, profile.detailBlock);
      setBlock(map, size.x - 2, y, 0, profile.detailBlock);
      setBlock(map, 1, y, size.z - 1, profile.detailBlock);
      setBlock(map, size.x - 2, y, size.z - 1, profile.detailBlock);
    }
  }

  if (profile.id === "wooden" || includesAny(promptText, ["wood", "wooden", "timber"])) {
    for (const [x, z] of corners) {
      for (let y = 0; y < size.y; y += 1) {
        if (y % 2 === 0 || y < 4) {
          setBlock(map, x, y, z, profile.detailBlock);
        }
      }
    }
  }
}

function rebuildBlocksAndSize(map: Map<string, SchematicBlock>): { blocks: SchematicBlock[]; size: { x: number; y: number; z: number } } {
  const blocks = [...map.values()].filter((block) => block.block !== "minecraft:air");

  if (blocks.length === 0) {
    return {
      blocks: [],
      size: { x: 1, y: 1, z: 1 },
    };
  }

  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const minZ = Math.min(...blocks.map((block) => block.z));
  const maxX = Math.max(...blocks.map((block) => block.x));
  const maxY = Math.max(...blocks.map((block) => block.y));
  const maxZ = Math.max(...blocks.map((block) => block.z));

  const normalizedBlocks = blocks.map((block) => ({
    x: block.x - minX,
    y: block.y - minY,
    z: block.z - minZ,
    block: block.block,
  }));

  return {
    blocks: sortBlocks(normalizedBlocks),
    size: {
      x: maxX - minX + 1,
      y: maxY - minY + 1,
      z: maxZ - minZ + 1,
    },
  };
}

function applyPromptThemeDetails(
  blocks: SchematicBlock[],
  size: { x: number; y: number; z: number },
  profile: ThemeProfile,
  promptText: string,
): { blocks: SchematicBlock[]; size: { x: number; y: number; z: number } } {
  const map = mapBlocks(blocks);

  applyWallVariation(map, size, profile, promptText);
  applyRuinedDamage(map, size, profile, promptText);
  addLanternDetails(map, size, profile, promptText);
  addSnowCaps(map, size, promptText);
  addThemeSilhouetteDetails(map, size, profile, promptText);

  return rebuildBlocksAndSize(map);
}

export function generateTower(options: GenerateTowerOptions = {}): GeneratedSchematicBuild {
  const promptText = normalize([options.variant ?? "", options.prompt ?? "", options.command ?? ""].join(" "));
  const profile = inferTheme(options);
  const scale = inferScale(promptText);
  const grid = new InMemoryShapeGrid();
  const shapeBuild = buildShapeAwareTower(grid, getShapeAwareOptions(profile, scale, promptText));
  const baseBuild = normalizeEntriesToBuildBlocks(getGridEntries(grid));
  const detailedBuild = applyPromptThemeDetails(baseBuild.blocks, baseBuild.size, profile, promptText);

  const palette = Array.from(
    new Set<MinecraftBlockName>(["minecraft:air" as MinecraftBlockName, ...detailedBuild.blocks.map((block) => block.block)]),
  );

  const generatedAt = new Date().toISOString();
  const generatorName = "tower";

  return {
    buildId: createBuildId(profile.buildIdPrefix),
    generatorName,
    variant: profile.id as TowerVariant,
    prompt: options.prompt ?? "deterministic shape-aware tower",
    command: options.command ?? "schematic generate tower",
    minecraftVersion: options.minecraftVersion ?? DEFAULT_MINECRAFT_VERSION,
    generatedAt,
    size: detailedBuild.size,
    palette,
    blocks: detailedBuild.blocks,
    blockCount: detailedBuild.blocks.length,
    shapeValidation: shapeBuild.validation,
    shapeResolverReports: shapeBuild.resolverReports,
    placementWarnings: shapeBuild.placementWarnings,
  };
}
