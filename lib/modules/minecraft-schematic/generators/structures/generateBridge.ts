import type { GeneratedSchematicBuild, MinecraftBlockName } from "../../types";
import { SchematicBlockGrid } from "./SchematicBlockGrid";
import { stonePalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  minecraftVersion?: string;
  ruined?: boolean;
};

const SPRUCE_FENCE = "minecraft:spruce_fence" as MinecraftBlockName;
const GRAVEL = "minecraft:gravel" as MinecraftBlockName;
const COBBLE = "minecraft:cobblestone" as MinecraftBlockName;
const MOSSY_COBBLE = "minecraft:mossy_cobblestone" as MinecraftBlockName;

function placeRoadDeck(grid: SchematicBlockGrid): void {
  for (let z = 0; z < grid.size.z; z += 1) {
    // Slimmer deck: the previous bridge looked like a castle wall laid sideways.
    grid.fill(2, 6, z, 8, 6, z, stonePalette.road);
    grid.fill(4, 7, z, 6, 7, z, GRAVEL);

    // Side curbs below the rail line.
    grid.set(1, 7, z, stonePalette.roofSlab);
    grid.set(9, 7, z, stonePalette.roofSlab);
  }
}

function placeAbutment(grid: SchematicBlockGrid, z: number): void {
  grid.fill(0, 0, z, 10, 5, z, stonePalette.foundation);
  grid.fill(1, 6, z, 9, 6, z, stonePalette.accent);

  for (const x of [0, 10]) {
    grid.pillar(x, z, 0, 6, stonePalette.accent);
  }
}

function placePier(grid: SchematicBlockGrid, z: number): void {
  // Piers stay chunky only where the arches need real support.
  grid.fill(0, 0, z - 1, 2, 5, z + 1, stonePalette.foundation);
  grid.fill(8, 0, z - 1, 10, 5, z + 1, stonePalette.foundation);
  grid.fill(3, 4, z, 7, 5, z, stonePalette.accent);

  for (const x of [0, 2, 8, 10]) {
    grid.pillar(x, z, 0, 6, stonePalette.accent);
  }
}

function placeOpenSideArch(grid: SchematicBlockGrid, z1: number, z2: number): void {
  const span = Math.max(1, z2 - z1);

  for (let z = z1; z <= z2; z += 1) {
    const t = (z - z1) / span;
    const distanceFromCenter = Math.abs(t - 0.5) * 2;

    // Corrected from V1.1D: center of the span now has the tallest opening.
    const archCeiling = 2 + Math.round((1 - distanceFromCenter * distanceFromCenter) * 3);

    for (const x of [0, 10]) {
      grid.set(x, archCeiling, z, stonePalette.accent);

      for (let y = archCeiling + 1; y <= 5; y += 1) {
        grid.set(x, y, z, stonePalette.wall);
      }
    }
  }
}

function placeUndersideBeams(grid: SchematicBlockGrid): void {
  // Clean longitudinal beams under the deck so the bridge reads engineered, not random.
  for (let z = 1; z < grid.size.z - 1; z += 1) {
    grid.set(2, 5, z, stonePalette.roofSlab);
    grid.set(5, 5, z, stonePalette.roofSlab);
    grid.set(8, 5, z, stonePalette.roofSlab);
  }

  for (const z of [6, 18, 30]) {
    grid.fill(1, 4, z, 9, 5, z, stonePalette.accent);
  }
}

function placeRailingsAndLamps(grid: SchematicBlockGrid): void {
  for (let z = 0; z < grid.size.z; z += 1) {
    if (z % 4 !== 2) {
      grid.set(0, 7, z, stonePalette.railing);
      grid.set(10, 7, z, stonePalette.railing);
    }

    if (z % 8 === 0 || z === grid.size.z - 1) {
      grid.set(0, 8, z, stonePalette.accent);
      grid.set(10, 8, z, stonePalette.accent);
    }
  }

  for (const z of [4, 12, 20, 28, 34]) {
    for (const x of [0, 10]) {
      grid.fill(x, 6, z, x, 7, z, stonePalette.accent);
      grid.pillar(x, z, 8, 9, SPRUCE_FENCE);
      grid.set(x, 10, z, stonePalette.lamp);
    }
  }
}

function applyRuinedDamage(grid: SchematicBlockGrid): void {
  const removed: Array<[number, number, number]> = [
    [0, 7, 18], [0, 7, 19], [0, 8, 18],
    [10, 7, 25], [10, 7, 26], [10, 8, 26],
    [7, 7, 21], [8, 7, 21], [3, 7, 22],
  ];

  for (const [x, y, z] of removed) {
    grid.delete(x, y, z);
  }

  for (const [x, y, z] of [[1, 6, 18], [9, 6, 26], [4, 6, 22], [6, 5, 19], [7, 7, 21]] as const) {
    grid.set(x, y, z, (x + z) % 2 === 0 ? stonePalette.cracked : stonePalette.mossy);
  }

  for (const [x, z] of [[1, 19], [9, 26], [4, 23], [8, 21], [5, 20]] as const) {
    grid.set(x, 7, z, (x + z) % 2 === 0 ? COBBLE : MOSSY_COBBLE);
  }
}

export function generateBridge(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 11, y: 12, z: 37 });
  const ruined = options.ruined ?? /ruin|ruined|broken|damaged|collapsed/i.test(options.prompt);

  placeRoadDeck(grid);
  placeAbutment(grid, 0);
  placeAbutment(grid, 36);

  for (const z of [12, 24]) {
    placePier(grid, z);
  }

  for (const [z1, z2] of [[0, 12], [12, 24], [24, 36]] as const) {
    placeOpenSideArch(grid, z1, z2);
  }

  placeUndersideBeams(grid);
  placeRailingsAndLamps(grid);

  if (ruined) {
    applyRuinedDamage(grid);
  }

  return grid.toBuild({
    buildIdPrefix: ruined ? "ruined_stone_bridge" : "stone_bridge",
    displayName: ruined ? "Ruined Stone Bridge" : "Stone Bridge",
    generatorName: "bridge",
    variant: ruined ? "ruined_bridge" : "stone_bridge",
    presetId: options.presetId,
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "open_side_arches",
      "slimmer_deck",
      "thick_abutments",
      "road_deck",
      "center_path_strip",
      "railings",
      "lamp_posts",
      "longitudinal_underside_beams",
      "traversable_deck",
      ...(ruined ? ["ruined_sections"] : []),
    ],
  });
}
