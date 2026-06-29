import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlockEntity } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { placeCrateStack, placeLanternPost } from "./detailHelpers";
import { industrialPalette, medievalPalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  minecraftVersion?: string;
};

const SMOOTH_STONE = "minecraft:smooth_stone" as MinecraftBlockName;
const GRAVEL = "minecraft:gravel" as MinecraftBlockName;
const OAK_SLAB = "minecraft:oak_slab" as MinecraftBlockName;
const SPRUCE_STAIRS = "minecraft:spruce_stairs" as MinecraftBlockName;

function placeRails(grid: SchematicBlockGrid): void {
  for (let z = 2; z <= 44; z += 1) {
    grid.set(12, 2, z, "minecraft:rail" as MinecraftBlockName);
    grid.set(14, 2, z, "minecraft:rail" as MinecraftBlockName);
    grid.set(11, 1, z, GRAVEL);
    grid.set(13, 1, z, GRAVEL);
    grid.set(15, 1, z, GRAVEL);
  }
}

function placeCanopy(grid: SchematicBlockGrid): void {
  // The old station was close, but the canopy posts accidentally became side walls.
  // Posts now use a proper interval rhythm.
  for (const z of [4, 10, 16, 22, 28, 34, 40]) {
    grid.pillar(4, z, 3, 7, medievalPalette.accent);
    grid.pillar(22, z, 3, 7, medievalPalette.accent);
    grid.lineX(4, 22, 7, z, medievalPalette.accent);
  }

  for (let z = 4; z <= 42; z += 1) {
    grid.fill(3, 8, z, 23, 8, z, industrialPalette.roofSlab);
    grid.fill(8, 9, z, 18, 9, z, industrialPalette.roofSlab);
    grid.fill(11, 10, z, 15, 10, z, industrialPalette.roofSlab);
  }

  for (let z = 4; z <= 42; z += 6) {
    grid.lineX(3, 23, 9, z, industrialPalette.roof);
    grid.lineX(9, 17, 10, z, industrialPalette.roof);
  }
}

function placeWaitingRoom(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.fill(2, 2, 5, 8, 6, 15, medievalPalette.wall);
  grid.clearBox(3, 3, 6, 7, 5, 14);
  grid.fill(3, 2, 6, 7, 2, 14, medievalPalette.floor);

  grid.clearBox(5, 2, 5, 5, 3, 5);
  grid.set(5, 2, 5, blockState(medievalPalette.door, { facing: "south", half: "lower", hinge: "left", open: false, powered: false }));
  grid.set(5, 3, 5, blockState(medievalPalette.door, { facing: "south", half: "upper", hinge: "left", open: false, powered: false }));

  for (const [x, z] of [[3, 5], [7, 5], [2, 9], [8, 9], [5, 15]] as const) {
    grid.set(x, 4, z, medievalPalette.glass);
    grid.set(x, 5, z, medievalPalette.glass);
  }

  grid.fill(1, 7, 4, 9, 7, 16, industrialPalette.roofSlab);
  grid.lineX(1, 9, 8, 4, industrialPalette.roof);
  grid.lineX(1, 9, 8, 16, industrialPalette.roof);
  grid.lineZ(5, 8, 5, 15, industrialPalette.roof);

  grid.set(4, 3, 10, blockState(medievalPalette.barrel, { facing: "north", open: false }));
  grid.set(6, 3, 10, blockState(medievalPalette.chest, { facing: "north", type: "single", waterlogged: false }));
  grid.set(5, 3, 12, blockState(SPRUCE_STAIRS, { facing: "south", half: "bottom", shape: "straight", waterlogged: false }));

  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 4, y: 3, z: 10, label: "Station supplies" });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: 6, y: 3, z: 10, label: "Lost property" });
}

function placeCargoArea(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.fill(18, 1, 30, 24, 1, 40, industrialPalette.foundation);
  grid.fill(18, 2, 30, 24, 2, 40, medievalPalette.floor);
  grid.fill(18, 3, 30, 24, 3, 40, OAK_SLAB);
  placeCrateStack(grid, 19, 3, 32, medievalPalette.barrel, medievalPalette.chest);
  placeCrateStack(grid, 21, 3, 36, medievalPalette.barrel, medievalPalette.chest);

  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 19, y: 3, z: 32, label: "Cargo barrel" });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: 20, y: 3, z: 32, label: "Cargo chest" });
  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 21, y: 3, z: 36, label: "Spare parts barrel" });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: 22, y: 3, z: 36, label: "Spare parts chest" });
}

function placePlatformTrim(grid: SchematicBlockGrid): void {
  for (let z = 3; z <= 43; z += 1) {
    grid.set(3, 3, z, OAK_SLAB);
    grid.set(10, 3, z, OAK_SLAB);
    grid.set(16, 3, z, OAK_SLAB);
    grid.set(23, 3, z, OAK_SLAB);
  }

  for (const z of [5, 15, 25, 35, 43]) {
    grid.lineX(3, 10, 3, z, medievalPalette.accent);
    grid.lineX(16, 23, 3, z, medievalPalette.accent);
  }
}

function placeStationDetails(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  for (const z of [7, 17, 27, 37]) {
    placeLanternPost(grid, 3, z, 3, 6, medievalPalette.fence, medievalPalette.lamp);
    placeLanternPost(grid, 23, z, 3, 6, medievalPalette.fence, medievalPalette.lamp);
  }

  grid.set(5, 6, 4, blockState(medievalPalette.sign, { facing: "north", waterlogged: false }));
  blockEntities.push({
    id: "minecraft:oak_sign",
    kind: "sign",
    x: 5,
    y: 6,
    z: 4,
    text: ["SirioCraft", "Station"],
    label: "Station sign",
  });

  grid.set(17, 4, 13, blockState(medievalPalette.sign, { facing: "east", waterlogged: false }));
  blockEntities.push({
    id: "minecraft:oak_sign",
    kind: "sign",
    x: 17,
    y: 4,
    z: 13,
    text: ["Platform", "1"],
    label: "Platform sign",
  });
}

export function generateTrainStation(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 27, y: 13, z: 47 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(1, 0, 1, 25, 0, 45, industrialPalette.foundation);
  grid.fill(2, 1, 2, 24, 1, 44, SMOOTH_STONE);
  grid.fill(3, 2, 3, 10, 2, 43, medievalPalette.floor);
  grid.fill(16, 2, 3, 23, 2, 43, medievalPalette.floor);

  placeRails(grid);
  placeCanopy(grid);
  placeWaitingRoom(grid, blockEntities);
  placeCargoArea(grid, blockEntities);
  placePlatformTrim(grid);
  placeStationDetails(grid, blockEntities);

  return grid.toBuild({
    buildIdPrefix: "train_station_small",
    displayName: "Small Train Station",
    generatorName: "train_station",
    variant: "train_station_small",
    presetId: options.presetId ?? "train_station_small",
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "platform",
      "rails",
      "canopy",
      "interval_support_posts",
      "waiting_room",
      "ticket_booth",
      "lamps",
      "cargo_area",
      "platform_trim",
      "sign_metadata",
    ],
    blockEntities,
    placementWarnings: ["Rails are vanilla placeholders. Create train track blocks are intentionally gated for a later profile pass."],
  });
}
