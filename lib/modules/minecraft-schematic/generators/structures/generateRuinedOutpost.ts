import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlockEntity } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { medievalPalette, stonePalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  minecraftVersion?: string;
};

const GRASS = "minecraft:coarse_dirt" as MinecraftBlockName;
const CAMPFIRE = "minecraft:campfire" as MinecraftBlockName;
const COBBLE = "minecraft:cobblestone" as MinecraftBlockName;
const MOSS_COBBLE = "minecraft:mossy_cobblestone" as MinecraftBlockName;
const OAK_SLAB = "minecraft:oak_slab" as MinecraftBlockName;
const OAK_FENCE = "minecraft:oak_fence" as MinecraftBlockName;

function damagedWallBlock(x: number, z: number): MinecraftBlockName {
  if ((x + z) % 5 === 0) return stonePalette.mossy;
  if ((x * 3 + z) % 7 === 0) return stonePalette.cracked;
  if ((x + z) % 3 === 0) return COBBLE;
  return stonePalette.wall;
}

function wallHeight(x: number, z: number): number {
  const value = (x * 11 + z * 7) % 6;
  if (value === 0) return 1;
  if (value <= 2) return 2;
  if (value <= 4) return 3;
  return 4;
}

function placeBrokenPerimeter(grid: SchematicBlockGrid): void {
  for (let x = 2; x <= 20; x += 1) {
    const frontGap = x >= 10 && x <= 13;
    const backBreak = x >= 5 && x <= 7;

    if (!frontGap) {
      grid.pillar(x, 2, 1, wallHeight(x, 2), damagedWallBlock(x, 2));
    }

    if (!backBreak) {
      grid.pillar(x, 20, 1, wallHeight(x, 20), damagedWallBlock(x, 20));
    }
  }

  for (let z = 3; z <= 19; z += 1) {
    const leftBreak = z >= 12 && z <= 15;
    const rightGap = z >= 6 && z <= 8;

    if (!leftBreak) {
      grid.pillar(2, z, 1, wallHeight(2, z), damagedWallBlock(2, z));
    }

    if (!rightGap) {
      grid.pillar(20, z, 1, wallHeight(20, z), damagedWallBlock(20, z));
    }
  }

  // Gate threshold and fallen chunks.
  grid.fill(10, 0, 1, 13, 0, 3, stonePalette.road);
  for (const [x, z] of [[6, 19], [7, 19], [3, 13], [19, 7], [14, 3], [17, 20]] as const) {
    grid.set(x, 1, z, damagedWallBlock(x, z));
    grid.set(x + 1, 1, z, stonePalette.cracked);
  }
}

function placeCornerLookoutRuin(grid: SchematicBlockGrid): void {
  // Small corner lookout, intentionally not a full tower.
  grid.fill(3, 0, 3, 8, 0, 8, stonePalette.foundation);

  for (let y = 1; y <= 6; y += 1) {
    for (let x = 3; x <= 8; x += 1) {
      if (!(x >= 6 && y >= 5)) {
        grid.set(x, y, 3, damagedWallBlock(x, 3));
      }
      if (!(x <= 5 && y >= 4)) {
        grid.set(x, y, 8, damagedWallBlock(x, 8));
      }
    }

    for (let z = 3; z <= 8; z += 1) {
      if (!(z >= 6 && y >= 5)) {
        grid.set(3, y, z, damagedWallBlock(3, z));
      }
      if (!(z <= 5 && y >= 4)) {
        grid.set(8, y, z, damagedWallBlock(8, z));
      }
    }
  }

  grid.fill(4, 4, 4, 7, 4, 7, stonePalette.floor);
  grid.clearBox(5, 1, 3, 6, 3, 3);
  grid.set(5, 5, 4, stonePalette.railing);
  grid.set(7, 5, 7, stonePalette.railing);
  grid.set(4, 5, 7, stonePalette.railing);
  grid.set(8, 3, 5, stonePalette.bars);
}

function placeRuinedHut(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.fill(12, 0, 13, 18, 0, 18, medievalPalette.foundation);
  grid.fill(13, 1, 14, 17, 1, 17, medievalPalette.floor);

  // Broken timber/stone shell.
  for (let y = 2; y <= 4; y += 1) {
    grid.lineX(12, 18, y, 13, y === 4 ? medievalPalette.accent : medievalPalette.wall);
    grid.lineX(12, 15, y, 18, medievalPalette.wall);
    grid.lineZ(12, y, 13, 18, medievalPalette.accent);
    if (y < 4) {
      grid.lineZ(18, y, 13, 16, medievalPalette.wall);
    }
  }

  grid.clearBox(15, 2, 13, 15, 3, 13);
  grid.set(15, 2, 13, blockState(medievalPalette.door, { facing: "south", half: "lower", hinge: "left", open: true, powered: false }));
  grid.set(15, 3, 13, blockState(medievalPalette.door, { facing: "south", half: "upper", hinge: "left", open: true, powered: false }));

  // Partial collapsed roof.
  grid.lineX(12, 18, 5, 13, medievalPalette.roofSlab);
  grid.lineX(12, 16, 5, 18, medievalPalette.roofSlab);
  grid.set(14, 6, 15, medievalPalette.roofSlab);
  grid.set(15, 6, 16, medievalPalette.roofSlab);

  grid.set(14, 2, 16, blockState(medievalPalette.barrel, { facing: "north", open: false }));
  grid.set(16, 2, 16, blockState(medievalPalette.chest, { facing: "north", type: "single", waterlogged: false }));
  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 14, y: 2, z: 16, label: "Abandoned outpost supplies", metadata: { items: [] } });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: 16, y: 2, z: 16, label: "Ruined outpost cache", metadata: { items: [] } });
}

function placeCampAndBarricades(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.set(11, 1, 10, CAMPFIRE);
  grid.set(10, 1, 10, OAK_SLAB);
  grid.set(12, 1, 10, OAK_SLAB);
  grid.set(11, 1, 9, OAK_SLAB);

  // Rough internal paths.
  for (let z = 3; z <= 19; z += 1) {
    grid.set(11, 0, z, stonePalette.road);
  }
  for (let x = 4; x <= 18; x += 1) {
    grid.set(x, 0, 10, (x + 10) % 3 === 0 ? MOSS_COBBLE : stonePalette.road);
  }

  // Palisade and debris piles.
  for (const [x, z] of [[9, 5], [10, 5], [14, 6], [15, 6], [6, 14], [7, 14], [17, 9]] as const) {
    grid.pillar(x, z, 1, 2, OAK_FENCE);
  }

  for (const [x, z] of [[5, 16], [6, 17], [16, 5], [17, 5], [18, 11], [4, 11]] as const) {
    grid.set(x, 1, z, (x + z) % 2 === 0 ? COBBLE : MOSS_COBBLE);
    grid.set(x, 2, z, OAK_SLAB);
  }

  grid.set(11, 3, 1, blockState(medievalPalette.sign, { facing: "north", waterlogged: false }));
  blockEntities.push({
    id: "minecraft:oak_sign",
    kind: "sign",
    x: 11,
    y: 3,
    z: 1,
    text: ["Ruined", "Outpost"],
    label: "Ruined outpost sign",
  });
}

export function generateRuinedOutpost(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 23, y: 10, z: 23 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(1, 0, 1, 21, 0, 21, GRASS);
  placeBrokenPerimeter(grid);
  placeCornerLookoutRuin(grid);
  placeRuinedHut(grid, blockEntities);
  placeCampAndBarricades(grid, blockEntities);

  return grid.toBuild({
    buildIdPrefix: "ruined_outpost",
    displayName: "Ruined Outpost",
    generatorName: "outpost",
    variant: "ruined_outpost",
    presetId: options.presetId ?? "ruined_outpost",
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "broken_perimeter_walls",
      "gate_gap",
      "corner_lookout_ruin",
      "ruined_hut",
      "camp_area",
      "storage_placeholders",
      "sign_metadata",
      "fallen_debris",
    ],
    blockEntities,
    placementWarnings: [
      "Ruined outpost is now its own compound generator, not a tower preset.",
      "Supported chest/barrel/sign block entities are exported as NBT and mirrored in metadata.",
    ],
  });
}
