export type MinecraftBlockFace =
  | "top"
  | "bottom"
  | "north"
  | "south"
  | "east"
  | "west";

export type MinecraftTextureSet = Record<MinecraftBlockFace, string[]> & {
  transparent: boolean;
  opacity: number;
  tint?: "grass" | "foliage" | "water";
};

const FACE_NAMES: MinecraftBlockFace[] = [
  "top",
  "bottom",
  "north",
  "south",
  "east",
  "west",
];

const SIMPLE_ALIASES: Record<string, string> = {
  bricks: "brick",
  stone_bricks: "stonebrick",
  mossy_stone_bricks: "mossy_stonebrick",
  cracked_stone_bricks: "cracked_stonebrick",
  chiseled_stone_bricks: "chiseled_stonebrick",
  smooth_stone_slab: "smooth_stone",
  redstone_lamp_lit: "redstone_lamp_on",
  lit_redstone_lamp: "redstone_lamp_on",
  glass_pane: "glass",
  iron_bars: "iron_bars",
  water: "water_still",
  flowing_water: "water_flow",
  lava: "lava_still",
  flowing_lava: "lava_flow",
  grass: "grass_block",
  dirt_path: "grass_path_top",
  grass_path: "grass_path_top",
  farmland: "farmland",
  wet_farmland: "farmland_wet",
  torch: "torch_on",
  redstone_torch: "redstone_torch_on",
  wall_torch: "torch_on",
  soul_torch: "soul_torch",
  fire: "fire_0",
  soul_fire: "soul_fire_0",
  crafting_table: "crafting_table_top",
  workbench: "crafting_table_top",
  command_block: "command_block_front",
};

const FALLBACK_TEXTURE_ALIASES: Record<string, string[]> = {
  grass_block_top: ["grass_top"],
  grass_block_side: ["grass_side"],
  grass_block_side_overlay: ["grass_side_overlay"],
  dirt_path_top: ["grass_path_top"],
  dirt_path_side: ["grass_path_side"],
  stone_bricks: ["stonebrick"],
  mossy_stone_bricks: ["mossy_stonebrick"],
  cracked_stone_bricks: ["cracked_stonebrick"],
  chiseled_stone_bricks: ["chiseled_stonebrick"],
  oak_log: ["log_oak"],
  oak_log_top: ["log_oak_top"],
  spruce_log: ["log_spruce"],
  spruce_log_top: ["log_spruce_top"],
  birch_log: ["log_birch"],
  birch_log_top: ["log_birch_top"],
  jungle_log: ["log_jungle"],
  jungle_log_top: ["log_jungle_top"],
  acacia_log: ["log_acacia"],
  acacia_log_top: ["log_acacia_top"],
  dark_oak_log: ["log_big_oak"],
  dark_oak_log_top: ["log_big_oak_top"],
  stripped_oak_log: ["stripped_oak_log"],
  stripped_oak_log_top: ["stripped_oak_log_top"],
  oak_planks: ["planks_oak"],
  spruce_planks: ["planks_spruce"],
  birch_planks: ["planks_birch"],
  jungle_planks: ["planks_jungle"],
  acacia_planks: ["planks_acacia"],
  dark_oak_planks: ["planks_big_oak"],
  white_wool: ["wool_colored_white"],
  orange_wool: ["wool_colored_orange"],
  magenta_wool: ["wool_colored_magenta"],
  light_blue_wool: ["wool_colored_light_blue"],
  yellow_wool: ["wool_colored_yellow"],
  lime_wool: ["wool_colored_lime"],
  pink_wool: ["wool_colored_pink"],
  gray_wool: ["wool_colored_gray"],
  light_gray_wool: ["wool_colored_silver"],
  cyan_wool: ["wool_colored_cyan"],
  purple_wool: ["wool_colored_purple"],
  blue_wool: ["wool_colored_blue"],
  brown_wool: ["wool_colored_brown"],
  green_wool: ["wool_colored_green"],
  red_wool: ["wool_colored_red"],
  black_wool: ["wool_colored_black"],
  white_terracotta: ["hardened_clay_stained_white"],
  orange_terracotta: ["hardened_clay_stained_orange"],
  magenta_terracotta: ["hardened_clay_stained_magenta"],
  light_blue_terracotta: ["hardened_clay_stained_light_blue"],
  yellow_terracotta: ["hardened_clay_stained_yellow"],
  lime_terracotta: ["hardened_clay_stained_lime"],
  pink_terracotta: ["hardened_clay_stained_pink"],
  gray_terracotta: ["hardened_clay_stained_gray"],
  light_gray_terracotta: ["hardened_clay_stained_silver"],
  cyan_terracotta: ["hardened_clay_stained_cyan"],
  purple_terracotta: ["hardened_clay_stained_purple"],
  blue_terracotta: ["hardened_clay_stained_blue"],
  brown_terracotta: ["hardened_clay_stained_brown"],
  green_terracotta: ["hardened_clay_stained_green"],
  red_terracotta: ["hardened_clay_stained_red"],
  black_terracotta: ["hardened_clay_stained_black"],
  terracotta: ["hardened_clay"],
  water_still: ["water_still"],
  lava_still: ["lava_still"],
};

const WOOD_TYPES = [
  "oak",
  "spruce",
  "birch",
  "jungle",
  "acacia",
  "dark_oak",
  "mangrove",
  "cherry",
  "bamboo",
  "crimson",
  "warped",
] as const;

const COLOR_NAMES = [
  "white",
  "orange",
  "magenta",
  "light_blue",
  "yellow",
  "lime",
  "pink",
  "gray",
  "light_gray",
  "cyan",
  "purple",
  "blue",
  "brown",
  "green",
  "red",
  "black",
] as const;

export function normalizeMinecraftBlockId(blockId: string): string {
  return blockId
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/^block\//, "")
    .replace(/^blocks\//, "")
    .replace(/\[.*\]$/, "")
    .replace(/[^a-z0-9_/-]+/g, "_")
    .replace(/\//g, "_");
}

export function resolveMinecraftTextureSet(blockId: string): MinecraftTextureSet {
  const normalized = normalizeMinecraftBlockId(blockId);
  const aliased = SIMPLE_ALIASES[normalized] ?? normalized;
  const transparent = isTransparentBlock(aliased);
  const opacity = resolveOpacity(aliased);
  const tint = resolveTint(aliased);

  const set = createTextureSet(aliased, transparent, opacity, tint);

  if (aliased === "grass_block") {
    return faceTextureSet(
      {
        top: names("grass_block_top"),
        bottom: names("dirt"),
        side: names("grass_block_side", "grass_block_side_overlay"),
      },
      transparent,
      opacity,
      "grass",
    );
  }

  if (aliased === "snowy_grass_block") {
    return faceTextureSet(
      {
        top: names("grass_block_top"),
        bottom: names("dirt"),
        side: names("grass_block_snow"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "podzol") {
    return faceTextureSet(
      {
        top: names("podzol_top"),
        bottom: names("dirt"),
        side: names("podzol_side"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "mycelium") {
    return faceTextureSet(
      {
        top: names("mycelium_top"),
        bottom: names("dirt"),
        side: names("mycelium_side"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "dirt_path" || aliased === "grass_path_top") {
    return faceTextureSet(
      {
        top: names("dirt_path_top", "grass_path_top"),
        bottom: names("dirt"),
        side: names("dirt_path_side", "grass_path_side"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "farmland" || aliased === "farmland_wet") {
    return faceTextureSet(
      {
        top: names(aliased),
        bottom: names("dirt"),
        side: names("dirt"),
      },
      transparent,
      opacity,
    );
  }

  for (const wood of WOOD_TYPES) {
    if (aliased === `${wood}_log` || aliased === `${wood}_stem`) {
      return logTextureSet(wood, false, transparent, opacity);
    }

    if (aliased === `stripped_${wood}_log` || aliased === `stripped_${wood}_stem`) {
      return logTextureSet(wood, true, transparent, opacity);
    }

    if (aliased === `${wood}_wood` || aliased === `${wood}_hyphae`) {
      return createTextureSet(`${wood}_log`, transparent, opacity, tint);
    }

    if (aliased === `stripped_${wood}_wood` || aliased === `stripped_${wood}_hyphae`) {
      return createTextureSet(`stripped_${wood}_log`, transparent, opacity, tint);
    }

    if (aliased === `${wood}_leaves`) {
      return createTextureSet(aliased, true, 0.82, "foliage");
    }
  }

  if (aliased === "crafting_table") {
    return faceTextureSet(
      {
        top: names("crafting_table_top"),
        bottom: names("oak_planks", "planks_oak"),
        north: names("crafting_table_front"),
        south: names("crafting_table_front"),
        east: names("crafting_table_side"),
        west: names("crafting_table_side"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "furnace" || aliased === "blast_furnace" || aliased === "smoker") {
    return directionalMachineTextureSet(aliased, transparent, opacity);
  }

  if (aliased === "lit_furnace" || aliased === "furnace_on") {
    return directionalMachineTextureSet("furnace", transparent, opacity, "furnace_front_on");
  }

  if (aliased === "bookshelf") {
    return faceTextureSet(
      {
        top: names("oak_planks", "planks_oak"),
        bottom: names("oak_planks", "planks_oak"),
        side: names("bookshelf"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased === "pumpkin" || aliased === "carved_pumpkin" || aliased === "jack_o_lantern") {
    const front = aliased === "jack_o_lantern" ? "jack_o_lantern" : aliased;
    return faceTextureSet(
      {
        top: names("pumpkin_top"),
        bottom: names("pumpkin_top"),
        north: names(front),
        south: names("pumpkin_side"),
        east: names("pumpkin_side"),
        west: names("pumpkin_side"),
      },
      transparent,
      opacity,
    );
  }

  if (aliased.endsWith("_ore")) {
    return set;
  }

  for (const color of COLOR_NAMES) {
    if (aliased === `${color}_bed`) {
      return createTextureSet(`${color}_wool`, transparent, opacity, tint);
    }
  }

  return set;
}

export function getTextureNameCandidates(textureName: string): string[] {
  const normalized = normalizeMinecraftBlockId(textureName);
  const aliases = FALLBACK_TEXTURE_ALIASES[normalized] ?? [];
  return unique([normalized, ...aliases]);
}

function createTextureSet(
  textureName: string,
  transparent: boolean,
  opacity: number,
  tint?: MinecraftTextureSet["tint"],
): MinecraftTextureSet {
  const candidates = names(textureName);

  return {
    top: candidates,
    bottom: candidates,
    north: candidates,
    south: candidates,
    east: candidates,
    west: candidates,
    transparent,
    opacity,
    tint,
  };
}

function faceTextureSet(
  input: {
    top?: string[];
    bottom?: string[];
    side?: string[];
    north?: string[];
    south?: string[];
    east?: string[];
    west?: string[];
  },
  transparent: boolean,
  opacity: number,
  tint?: MinecraftTextureSet["tint"],
): MinecraftTextureSet {
  const side = input.side ?? names("missing_texture");

  return {
    top: input.top ?? side,
    bottom: input.bottom ?? side,
    north: input.north ?? side,
    south: input.south ?? side,
    east: input.east ?? side,
    west: input.west ?? side,
    transparent,
    opacity,
    tint,
  };
}

function logTextureSet(
  wood: string,
  stripped: boolean,
  transparent: boolean,
  opacity: number,
): MinecraftTextureSet {
  const prefix = stripped ? `stripped_${wood}_log` : `${wood}_log`;
  const legacySide = stripped ? `stripped_${wood}_log` : `log_${legacyWoodName(wood)}`;
  const legacyTop = stripped ? `stripped_${wood}_log_top` : `log_${legacyWoodName(wood)}_top`;

  return faceTextureSet(
    {
      top: names(`${prefix}_top`, legacyTop),
      bottom: names(`${prefix}_top`, legacyTop),
      side: names(prefix, legacySide),
    },
    transparent,
    opacity,
  );
}

function directionalMachineTextureSet(
  blockName: string,
  transparent: boolean,
  opacity: number,
  frontOverride?: string,
): MinecraftTextureSet {
  const front = frontOverride ?? `${blockName}_front`;
  const side = `${blockName}_side`;
  const top = `${blockName}_top`;

  return faceTextureSet(
    {
      top: names(top, side, blockName),
      bottom: names(top, side, blockName),
      north: names(front, blockName),
      south: names(side, blockName),
      east: names(side, blockName),
      west: names(side, blockName),
    },
    transparent,
    opacity,
  );
}

function names(...textureNames: string[]): string[] {
  return unique(textureNames.flatMap(getTextureNameCandidates));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function legacyWoodName(wood: string): string {
  return wood === "dark_oak" ? "big_oak" : wood;
}

function isTransparentBlock(blockName: string): boolean {
  return (
    blockName.includes("glass") ||
    blockName.includes("water") ||
    blockName.includes("ice") ||
    blockName.includes("leaves") ||
    blockName.includes("slime") ||
    blockName.includes("honey") ||
    blockName.includes("barrier") ||
    blockName.includes("stained_glass")
  );
}

function resolveOpacity(blockName: string): number {
  if (blockName.includes("water")) {
    return 0.54;
  }

  if (blockName.includes("glass")) {
    return 0.42;
  }

  if (blockName.includes("ice")) {
    return 0.62;
  }

  if (blockName.includes("leaves")) {
    return 0.82;
  }

  if (blockName.includes("slime") || blockName.includes("honey")) {
    return 0.7;
  }

  return 1;
}

function resolveTint(blockName: string): MinecraftTextureSet["tint"] | undefined {
  if (blockName === "grass_block") {
    return "grass";
  }

  if (blockName.includes("leaves")) {
    return "foliage";
  }

  if (blockName.includes("water")) {
    return "water";
  }

  return undefined;
}

export function getAllTextureCandidatesForBlock(blockId: string): string[] {
  const textureSet = resolveMinecraftTextureSet(blockId);

  return unique(
    FACE_NAMES.flatMap((face) => textureSet[face]).flatMap(getTextureNameCandidates),
  );
}
