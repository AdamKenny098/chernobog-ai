import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlockEntity, SchematicVariant } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { medievalPalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  variant?: SchematicVariant;
  minecraftVersion?: string;
};

const SPRUCE_TRAPDOOR = "minecraft:spruce_trapdoor" as MinecraftBlockName;
const SPRUCE_STAIRS = "minecraft:spruce_stairs" as MinecraftBlockName;
const SPRUCE_SLAB = "minecraft:spruce_slab" as MinecraftBlockName;
const OAK_SLAB = "minecraft:oak_slab" as MinecraftBlockName;
const CAMPFIRE = "minecraft:campfire" as MinecraftBlockName;
const CRAFTING_TABLE = "minecraft:crafting_table" as MinecraftBlockName;
const FURNACE = "minecraft:furnace" as MinecraftBlockName;
const BED_RED = "minecraft:red_bed" as MinecraftBlockName;

function placeDoor(grid: SchematicBlockGrid, x: number, z: number): void {
  grid.set(x, 2, z, blockState(medievalPalette.door, {
    facing: "south",
    half: "lower",
    hinge: "left",
    open: false,
    powered: false,
  }));
  grid.set(x, 3, z, blockState(medievalPalette.door, {
    facing: "south",
    half: "upper",
    hinge: "left",
    open: false,
    powered: false,
  }));
}

function placeWindowWithShutters(grid: SchematicBlockGrid, x: number, y: number, z: number, side: "front" | "back" | "left" | "right"): void {
  grid.set(x, y, z, medievalPalette.glass);
  grid.set(x, y + 1, z, medievalPalette.glass);

  if (side === "front" || side === "back") {
    const facing = side === "front" ? "south" : "north";
    grid.set(x - 1, y, z, blockState(SPRUCE_TRAPDOOR, { facing, half: "bottom", open: false, powered: false, waterlogged: false }));
    grid.set(x + 1, y, z, blockState(SPRUCE_TRAPDOOR, { facing, half: "bottom", open: false, powered: false, waterlogged: false }));
    return;
  }

  const facing = side === "left" ? "west" : "east";
  grid.set(x, y, z - 1, blockState(SPRUCE_TRAPDOOR, { facing, half: "bottom", open: false, powered: false, waterlogged: false }));
  grid.set(x, y, z + 1, blockState(SPRUCE_TRAPDOOR, { facing, half: "bottom", open: false, powered: false, waterlogged: false }));
}

function placeLowerPitchedRoof(grid: SchematicBlockGrid): void {
  // V1.1C's roof was technically correct but visually dominated the build.
  // This version deliberately keeps the roof low, wide, and overhanging.
  const roofZ1 = 2;
  const roofZ2 = 14;
  const roofBaseY = 7;
  const leftEdge = 2;
  const rightEdge = 14;

  for (let layer = 0; layer <= 3; layer += 1) {
    const leftX = leftEdge + layer;
    const rightX = rightEdge - layer;
    const y = roofBaseY + layer;

    for (let z = roofZ1; z <= roofZ2; z += 1) {
      grid.set(leftX, y, z, blockState(medievalPalette.roofStair, { facing: "east", half: "bottom", shape: "straight", waterlogged: false }));
      grid.set(rightX, y, z, blockState(medievalPalette.roofStair, { facing: "west", half: "bottom", shape: "straight", waterlogged: false }));
    }
  }

  for (let x = 6; x <= 10; x += 1) {
    for (let z = roofZ1; z <= roofZ2; z += 1) {
      grid.set(x, 11, z, medievalPalette.roofSlab);
    }
  }

  // Filled gable faces stop the front/back from looking hollow in schematic viewers.
  for (const z of [3, 13]) {
    grid.lineX(4, 12, 7, z, medievalPalette.wall);
    grid.lineX(5, 11, 8, z, medievalPalette.wall);
    grid.lineX(6, 10, 9, z, medievalPalette.wall);
    grid.lineX(7, 9, 10, z, medievalPalette.wall);
  }
}

function placePorch(grid: SchematicBlockGrid): void {
  grid.fill(5, 1, 0, 11, 1, 2, medievalPalette.floor);
  grid.set(5, 2, 1, medievalPalette.fence);
  grid.set(11, 2, 1, medievalPalette.fence);
  grid.pillar(5, 1, 2, 4, medievalPalette.accent);
  grid.pillar(11, 1, 2, 4, medievalPalette.accent);

  for (let x = 4; x <= 12; x += 1) {
    grid.set(x, 5, 0, OAK_SLAB);
    grid.set(x, 5, 1, OAK_SLAB);
    grid.set(x, 5, 2, OAK_SLAB);
  }

  grid.set(8, 4, 1, medievalPalette.lamp);
}

function placeLeanTo(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.fill(13, 0, 8, 15, 0, 13, medievalPalette.foundation);
  grid.fill(13, 1, 8, 15, 1, 13, medievalPalette.floor);

  for (let y = 2; y <= 5; y += 1) {
    grid.lineZ(15, y, 8, 13, medievalPalette.wall);
    grid.lineX(13, 15, y, 13, medievalPalette.wall);
  }

  for (let z = 8; z <= 13; z += 1) {
    grid.set(13, 6, z, blockState(SPRUCE_STAIRS, { facing: "east", half: "bottom", shape: "straight", waterlogged: false }));
    grid.set(14, 6, z, SPRUCE_SLAB);
    grid.set(15, 5, z, blockState(SPRUCE_STAIRS, { facing: "west", half: "bottom", shape: "straight", waterlogged: false }));
  }

  grid.set(14, 2, 10, blockState(medievalPalette.barrel, { facing: "north", open: false }));
  grid.set(14, 2, 11, blockState(medievalPalette.chest, { facing: "north", type: "single", waterlogged: false }));
  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 14, y: 2, z: 10, label: "Lean-to supply barrel", metadata: { items: [] } });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: 14, y: 2, z: 11, label: "House storage chest", metadata: { items: [] } });
}

function placeInterior(grid: SchematicBlockGrid): void {
  grid.set(4, 2, 11, blockState(BED_RED, { facing: "east", part: "foot", occupied: false }));
  grid.set(5, 2, 11, blockState(BED_RED, { facing: "east", part: "head", occupied: false }));
  grid.set(11, 2, 10, FURNACE);
  grid.set(10, 2, 10, CRAFTING_TABLE);
  grid.set(11, 3, 10, "minecraft:bricks" as MinecraftBlockName);
  grid.set(8, 2, 8, blockState(SPRUCE_STAIRS, { facing: "south", half: "bottom", shape: "straight", waterlogged: false }));
  grid.set(7, 2, 8, SPRUCE_SLAB);
}

function placeChimney(grid: SchematicBlockGrid): void {
  grid.pillar(12, 11, 6, 11, medievalPalette.chimney);
  grid.pillar(12, 12, 7, 10, medievalPalette.chimney);
  grid.set(12, 12, 11, CAMPFIRE);
}


function generateMarketStall(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 13, y: 9, z: 11 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(1, 0, 1, 11, 0, 9, medievalPalette.foundation);
  grid.fill(2, 1, 2, 10, 1, 8, medievalPalette.floor);

  for (const [x, z] of [[2, 2], [10, 2], [2, 8], [10, 8]] as const) {
    grid.pillar(x, z, 2, 5, medievalPalette.accent);
  }

  // Open stall counter and back wall.
  grid.lineX(3, 9, 2, 2, SPRUCE_SLAB);
  grid.lineX(2, 10, 2, 8, medievalPalette.wall);
  grid.lineX(2, 10, 3, 8, medievalPalette.wall);
  grid.set(6, 2, 8, blockState(medievalPalette.door, { facing: "north", half: "lower", hinge: "left", open: false, powered: false }));
  grid.set(6, 3, 8, blockState(medievalPalette.door, { facing: "north", half: "upper", hinge: "left", open: false, powered: false }));

  for (let z = 1; z <= 9; z += 1) {
    grid.set(1, 6, z, blockState(SPRUCE_STAIRS, { facing: "east", half: "bottom", shape: "straight", waterlogged: false }));
    grid.set(11, 6, z, blockState(SPRUCE_STAIRS, { facing: "west", half: "bottom", shape: "straight", waterlogged: false }));
  }

  for (let x = 2; x <= 10; x += 1) {
    grid.set(x, 7, 1, medievalPalette.roofSlab);
    grid.set(x, 7, 9, medievalPalette.roofSlab);
  }

  for (const [x, z, label] of [[3, 3, "Market goods"], [9, 3, "Market stock"], [3, 7, "Merchant storage"]] as const) {
    grid.set(x, 2, z, blockState(medievalPalette.barrel, { facing: "north", open: false }));
    blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x, y: 2, z, label, metadata: { items: [] } });
  }

  grid.set(6, 4, 1, blockState(medievalPalette.sign, { facing: "north", waterlogged: false }));
  blockEntities.push({
    id: "minecraft:oak_sign",
    kind: "sign",
    x: 6,
    y: 4,
    z: 1,
    text: ["SirioCraft", "Market", "Stall"],
    label: "Market stall sign",
  });

  grid.set(2, 5, 2, medievalPalette.lamp);
  grid.set(10, 5, 2, medievalPalette.lamp);

  return grid.toBuild({
    buildIdPrefix: "spawn_market_stall",
    displayName: "Spawn Market Stall",
    generatorName: "house",
    variant: "market_stall",
    presetId: options.presetId,
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: ["open_market_stall", "counter", "canopy", "barrel_storage", "spawn_trade_use", "sign_metadata"],
    blockEntities,
    placementWarnings: ["Market inventory is intentionally empty; fill barrels manually after placement."],
  });
}

function generateStorageShed(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 13, y: 10, z: 13 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(1, 0, 1, 11, 0, 11, medievalPalette.foundation);
  grid.fill(2, 1, 2, 10, 1, 10, medievalPalette.floor);

  for (let y = 2; y <= 5; y += 1) {
    grid.lineX(2, 10, y, 2, medievalPalette.wall);
    grid.lineX(2, 10, y, 10, medievalPalette.wall);
    grid.lineZ(2, y, 2, 10, medievalPalette.wall);
    grid.lineZ(10, y, 2, 10, medievalPalette.wall);
  }

  for (const [x, z] of [[2, 2], [10, 2], [2, 10], [10, 10]] as const) {
    grid.pillar(x, z, 1, 6, medievalPalette.accent);
  }

  grid.clearBox(6, 2, 2, 6, 3, 2);
  placeDoor(grid, 6, 2);
  placeWindowWithShutters(grid, 3, 3, 6, "left");
  placeWindowWithShutters(grid, 10, 3, 6, "right");

  for (let layer = 0; layer <= 2; layer += 1) {
    for (let z = 1; z <= 11; z += 1) {
      grid.set(1 + layer, 6 + layer, z, blockState(SPRUCE_STAIRS, { facing: "east", half: "bottom", shape: "straight", waterlogged: false }));
      grid.set(11 - layer, 6 + layer, z, blockState(SPRUCE_STAIRS, { facing: "west", half: "bottom", shape: "straight", waterlogged: false }));
    }
  }

  for (let x = 4; x <= 8; x += 1) {
    for (let z = 1; z <= 11; z += 1) {
      grid.set(x, 9, z, medievalPalette.roofSlab);
    }
  }

  for (const [x, z, label] of [[4, 4, "Tool barrel"], [8, 4, "Supply barrel"], [4, 8, "Storage chest"], [8, 8, "Spare parts chest"]] as const) {
    const isChest = label.includes("chest");
    grid.set(x, 2, z, blockState(isChest ? medievalPalette.chest : medievalPalette.barrel, isChest ? { facing: "north", type: "single", waterlogged: false } : { facing: "north", open: false }));
    blockEntities.push({ id: isChest ? "minecraft:chest" : "minecraft:barrel", kind: isChest ? "chest" : "barrel", x, y: 2, z, label, metadata: { items: [] } });
  }

  return grid.toBuild({
    buildIdPrefix: "storage_shed",
    displayName: "Storage Shed",
    generatorName: "house",
    variant: "storage_shed",
    presetId: options.presetId,
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: ["storage_shed", "small_roof", "utility_shell", "storage_barrels", "storage_chests", "windows"],
    blockEntities,
    placementWarnings: ["Storage containers are exported as empty NBT containers and labelled in metadata."],
  });
}

export function generateHouse(options: GenerateStructureOptions): GeneratedSchematicBuild {
  if (options.variant === "market_stall") {
    return generateMarketStall(options);
  }

  if (options.variant === "storage_shed") {
    return generateStorageShed(options);
  }

  const variant = options.variant === "town_house" ? "town_house" : "small_house";
  const grid = new SchematicBlockGrid({ x: 17, y: 13, z: 17 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(2, 0, 2, 14, 0, 14, medievalPalette.foundation);
  grid.fill(3, 1, 3, 13, 1, 13, medievalPalette.floor);

  for (let y = 2; y <= 6; y += 1) {
    grid.lineZ(3, y, 3, 13, medievalPalette.wall);
    grid.lineZ(13, y, 3, 13, medievalPalette.wall);
    grid.lineX(3, 13, y, 3, medievalPalette.wall);
    grid.lineX(3, 13, y, 13, medievalPalette.wall);
  }

  for (const [x, z] of [[3, 3], [13, 3], [3, 13], [13, 13]] as const) {
    grid.pillar(x, z, 1, 7, medievalPalette.accent);
  }
  grid.lineX(3, 13, 6, 3, medievalPalette.accent);
  grid.lineX(3, 13, 6, 13, medievalPalette.accent);
  grid.lineZ(3, 6, 3, 13, medievalPalette.accent);
  grid.lineZ(13, 6, 3, 13, medievalPalette.accent);

  grid.clearBox(8, 2, 3, 8, 3, 3);
  placeDoor(grid, 8, 3);
  placeWindowWithShutters(grid, 5, 3, 3, "front");
  placeWindowWithShutters(grid, 11, 3, 3, "front");
  placeWindowWithShutters(grid, 5, 3, 13, "back");
  placeWindowWithShutters(grid, 11, 3, 13, "back");
  placeWindowWithShutters(grid, 3, 3, 7, "left");

  placePorch(grid);
  placeLeanTo(grid, blockEntities);
  placeInterior(grid);
  placeLowerPitchedRoof(grid);
  placeChimney(grid);

  return grid.toBuild({
    buildIdPrefix: variant === "town_house" ? "siriocraft_town_house" : "siriocraft_house",
    displayName: variant === "town_house" ? "SirioCraft Town House" : "SirioCraft Small House",
    generatorName: "house",
    variant,
    presetId: options.presetId,
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: ["foundation", "walls", "lower_roof", "roof_overhang", "porch", "door", "windows", "shutters", "chimney", "lean_to", "interior_zones", "storage"],
    blockEntities,
    placementWarnings: ["Supported chest/barrel/sign block entities are exported as NBT and mirrored in metadata."],
  });
}
