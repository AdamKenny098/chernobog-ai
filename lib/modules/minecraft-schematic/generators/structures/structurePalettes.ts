import type { MinecraftBlockName } from "../../types";

type StructurePalette = {
  foundation: MinecraftBlockName;
  wall: MinecraftBlockName;
  accent: MinecraftBlockName;
  cracked: MinecraftBlockName;
  mossy: MinecraftBlockName;
  floor: MinecraftBlockName;
  roof: MinecraftBlockName;
  roofStair: MinecraftBlockName;
  roofSlab: MinecraftBlockName;
  glass: MinecraftBlockName;
  door: MinecraftBlockName;
  fence: MinecraftBlockName;
  railing: MinecraftBlockName;
  lamp: MinecraftBlockName;
  chimney: MinecraftBlockName;
  metal: MinecraftBlockName;
  bars: MinecraftBlockName;
  pipe: MinecraftBlockName;
  gear: MinecraftBlockName;
  trim: MinecraftBlockName;
  road: MinecraftBlockName;
  support: MinecraftBlockName;
  chest: MinecraftBlockName;
  barrel: MinecraftBlockName;
  sign: MinecraftBlockName;
};

export const medievalPalette: StructurePalette = {
  foundation: "minecraft:stone_bricks",
  wall: "minecraft:spruce_planks",
  accent: "minecraft:stripped_spruce_log",
  cracked: "minecraft:cracked_stone_bricks",
  mossy: "minecraft:mossy_stone_bricks",
  floor: "minecraft:oak_planks",
  roof: "minecraft:deepslate_tiles",
  roofStair: "minecraft:deepslate_tile_stairs",
  roofSlab: "minecraft:deepslate_tile_slab",
  glass: "minecraft:glass_pane",
  door: "minecraft:spruce_door",
  fence: "minecraft:spruce_fence",
  railing: "minecraft:stone_brick_wall",
  lamp: "minecraft:lantern",
  chimney: "minecraft:bricks",
  metal: "minecraft:iron_block",
  bars: "minecraft:iron_bars",
  pipe: "minecraft:copper_block",
  gear: "minecraft:cut_copper",
  trim: "minecraft:dark_oak_planks",
  road: "minecraft:cobblestone",
  support: "minecraft:stone_brick_wall",
  chest: "minecraft:chest",
  barrel: "minecraft:barrel",
  sign: "minecraft:oak_wall_sign",
};

export const stonePalette: StructurePalette = {
  ...medievalPalette,
  wall: "minecraft:stone_bricks",
  accent: "minecraft:chiseled_stone_bricks",
  floor: "minecraft:smooth_stone",
  roof: "minecraft:stone_bricks",
  roofStair: "minecraft:stone_brick_stairs",
  roofSlab: "minecraft:stone_brick_slab",
  railing: "minecraft:stone_brick_wall",
  road: "minecraft:stone_bricks",
};

export const industrialPalette: StructurePalette = {
  foundation: "minecraft:deepslate_bricks",
  wall: "minecraft:bricks",
  accent: "minecraft:cut_copper",
  cracked: "minecraft:cracked_stone_bricks",
  mossy: "minecraft:exposed_cut_copper",
  floor: "minecraft:smooth_stone",
  roof: "minecraft:dark_oak_planks",
  roofStair: "minecraft:dark_oak_stairs",
  roofSlab: "minecraft:dark_oak_slab",
  glass: "minecraft:glass_pane",
  door: "minecraft:iron_door",
  fence: "minecraft:iron_bars",
  railing: "minecraft:iron_bars",
  lamp: "minecraft:lantern",
  chimney: "minecraft:bricks",
  metal: "minecraft:iron_block",
  bars: "minecraft:iron_bars",
  pipe: "minecraft:copper_block",
  gear: "minecraft:cut_copper",
  trim: "minecraft:polished_deepslate",
  road: "minecraft:stone_bricks",
  support: "minecraft:deepslate_brick_wall",
  chest: "minecraft:chest",
  barrel: "minecraft:barrel",
  sign: "minecraft:oak_wall_sign",
};

export const createIndustrialPalette: StructurePalette = {
  ...industrialPalette,
  accent: "create:brass_casing",
  metal: "create:andesite_casing",
  pipe: "create:fluid_pipe",
  gear: "create:cogwheel",
  support: "create:shaft",
};

export type { StructurePalette };
