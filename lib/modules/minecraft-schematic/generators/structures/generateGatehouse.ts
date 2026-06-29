import type { GeneratedSchematicBuild, SchematicBlockEntity } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { stonePalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  minecraftVersion?: string;
};

function placeBattlements(grid: SchematicBlockGrid, x1: number, x2: number, z1: number, z2: number, y: number): void {
  for (let x = x1; x <= x2; x += 2) {
    grid.set(x, y, z1, stonePalette.railing);
    grid.set(x, y, z2, stonePalette.railing);
  }

  for (let z = z1; z <= z2; z += 2) {
    grid.set(x1, y, z, stonePalette.railing);
    grid.set(x2, y, z, stonePalette.railing);
  }
}

function placeArrowSlit(grid: SchematicBlockGrid, x: number, y: number, z: number): void {
  grid.set(x, y, z, stonePalette.bars);
  grid.set(x, y + 1, z, stonePalette.bars);
}

function placeTower(grid: SchematicBlockGrid, x1: number, z1: number, x2: number, z2: number, outerSideX: number): void {
  grid.fill(x1, 0, z1, x2, 0, z2, stonePalette.foundation);

  // Hollow shell. V1.1D was readable but too blocky, so this keeps the mass but adds more openings and trim.
  for (let y = 1; y <= 14; y += 1) {
    grid.lineX(x1, x2, y, z1, stonePalette.wall);
    grid.lineX(x1, x2, y, z2, stonePalette.wall);
    grid.lineZ(x1, y, z1, z2, stonePalette.wall);
    grid.lineZ(x2, y, z1, z2, stonePalette.wall);
  }

  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]] as const) {
    grid.pillar(x, z, 1, 15, stonePalette.accent);
  }

  // Horizontal trim breaks up the big flat tower faces.
  for (const y of [5, 10, 14]) {
    grid.lineX(x1, x2, y, z1, stonePalette.accent);
    grid.lineX(x1, x2, y, z2, stonePalette.accent);
    grid.lineZ(x1, y, z1, z2, stonePalette.accent);
    grid.lineZ(x2, y, z1, z2, stonePalette.accent);
  }

  grid.fill(x1 + 1, 6, z1 + 1, x2 - 1, 6, z2 - 1, stonePalette.floor);
  grid.fill(x1 + 1, 11, z1 + 1, x2 - 1, 11, z2 - 1, stonePalette.floor);

  const midX = Math.floor((x1 + x2) / 2);
  const midZ = Math.floor((z1 + z2) / 2);

  // Front/back arrow slits.
  placeArrowSlit(grid, midX, 4, z1);
  placeArrowSlit(grid, midX, 8, z1);
  placeArrowSlit(grid, midX, 4, z2);
  placeArrowSlit(grid, midX, 8, z2);

  // Outer side slits. The side screenshot showed too much blank stone.
  placeArrowSlit(grid, outerSideX, 5, midZ - 2);
  placeArrowSlit(grid, outerSideX, 9, midZ + 2);

  // Slight cap ring without creating a solid roof slab.
  grid.lineX(x1, x2, 15, z1, stonePalette.roofSlab);
  grid.lineX(x1, x2, 15, z2, stonePalette.roofSlab);
  grid.lineZ(x1, 15, z1, z2, stonePalette.roofSlab);
  grid.lineZ(x2, 15, z1, z2, stonePalette.roofSlab);
  placeBattlements(grid, x1, x2, z1, z2, 16);
}

function placeGateTunnel(grid: SchematicBlockGrid): void {
  grid.fill(8, 0, 1, 22, 0, 11, stonePalette.foundation);

  for (let y = 1; y <= 10; y += 1) {
    grid.lineX(8, 22, y, 1, stonePalette.wall);
    grid.lineX(8, 22, y, 11, stonePalette.wall);
    grid.lineZ(8, y, 1, 11, stonePalette.wall);
    grid.lineZ(22, y, 1, 11, stonePalette.wall);
  }

  // Wider carriage opening and clear pass-through.
  grid.clearBox(12, 1, 0, 18, 8, 12);
  grid.fill(12, 0, 0, 18, 0, 12, stonePalette.road);

  for (const z of [1, 11]) {
    // Recessed arch frame around the gate face.
    grid.lineX(11, 19, 9, z, stonePalette.accent);
    grid.lineX(10, 20, 10, z, stonePalette.wall);
    grid.set(11, 8, z, blockState(stonePalette.roofStair, { facing: "east", half: "bottom", shape: "straight", waterlogged: false }));
    grid.set(19, 8, z, blockState(stonePalette.roofStair, { facing: "west", half: "bottom", shape: "straight", waterlogged: false }));

    for (const x of [10, 20]) {
      grid.pillar(x, z, 1, 9, stonePalette.accent);
    }
  }

  // Portcullis sits inside the tunnel, visible through the larger opening.
  for (let x = 13; x <= 17; x += 2) {
    for (let y = 1; y <= 8; y += 1) {
      grid.set(x, y, 3, stonePalette.bars);
    }
  }

  // Usable upper walkway.
  grid.fill(9, 11, 2, 21, 11, 10, stonePalette.floor);
  for (let x = 9; x <= 21; x += 2) {
    grid.set(x, 12, 1, stonePalette.railing);
    grid.set(x, 12, 11, stonePalette.railing);
  }
}

function placeButtresses(grid: SchematicBlockGrid): void {
  for (const [x, z] of [[8, 1], [22, 1], [8, 11], [22, 11], [1, 1], [29, 1], [1, 11], [29, 11]] as const) {
    grid.fill(x, 1, z, x, 5, z, stonePalette.accent);
    grid.set(x, 0, z, stonePalette.foundation);
  }

  // Front/rear gate buttresses make the gate read less like a flat wall.
  for (const x of [10, 20]) {
    grid.pillar(x, 0, 1, 8, stonePalette.accent);
    grid.pillar(x, 12, 1, 8, stonePalette.accent);
  }
}

function placeWallStubs(grid: SchematicBlockGrid): void {
  // Shorter side wall stubs keep it usable as a gatehouse without turning it into a plain box.
  for (let y = 1; y <= 6; y += 1) {
    grid.lineX(0, 7, y, 6, stonePalette.wall);
    grid.lineX(23, 30, y, 6, stonePalette.wall);
  }

  for (const x of [0, 2, 4, 6, 24, 26, 28, 30]) {
    grid.set(x, 7, 6, stonePalette.railing);
  }
}

function placeDetails(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  grid.set(15, 5, 0, blockState(stonePalette.sign, { facing: "north", waterlogged: false }));
  blockEntities.push({
    id: "minecraft:oak_sign",
    kind: "sign",
    x: 15,
    y: 5,
    z: 0,
    text: ["SirioCraft", "Gatehouse"],
    label: "Gatehouse name sign",
  });

  for (const [x, z] of [[10, 0], [20, 0], [10, 12], [20, 12]] as const) {
    grid.set(x, 8, z, stonePalette.lamp);
  }

  // Small rear/side detail to reduce the blank backside seen in the test render.
  for (const [x, z] of [[6, 6], [24, 6], [3, 1], [27, 11]] as const) {
    grid.set(x, 3, z, stonePalette.cracked);
    grid.set(x, 4, z, stonePalette.mossy);
  }
}

export function generateGatehouse(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 31, y: 19, z: 13 });
  const blockEntities: SchematicBlockEntity[] = [];

  placeTower(grid, 1, 1, 7, 11, 1);
  placeTower(grid, 23, 1, 29, 11, 29);
  placeGateTunnel(grid);
  placeButtresses(grid);
  placeWallStubs(grid);
  placeDetails(grid, blockEntities);

  return grid.toBuild({
    buildIdPrefix: "siriocraft_gatehouse",
    displayName: "SirioCraft Gatehouse",
    generatorName: "gatehouse",
    variant: "gatehouse",
    presetId: options.presetId,
    profile: "vanilla",
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "two_towers",
      "less_boxy_tower_mass",
      "deep_gate_tunnel",
      "wider_gate_opening",
      "wall_segments",
      "battlements",
      "inset_portcullis_bars",
      "walkway",
      "arrow_slits",
      "tower_cap_rings",
      "buttresses",
      "face_trim",
      "sign_metadata",
    ],
    blockEntities,
    placementWarnings: ["Supported sign block entities are exported as NBT and mirrored in metadata."],
  });
}
