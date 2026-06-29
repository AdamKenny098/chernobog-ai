import type { MinecraftBlockName } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";

export function placeLanternPost(
  grid: SchematicBlockGrid,
  x: number,
  z: number,
  y1: number,
  y2: number,
  postBlock: MinecraftBlockName,
  lampBlock: MinecraftBlockName,
): void {
  grid.pillar(x, z, y1, y2, postBlock);
  grid.set(x, y2 + 1, z, lampBlock);
}

export function placeRailLineX(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  y: number,
  z: number,
  postEvery: number,
  postBlock: MinecraftBlockName,
  railBlock: MinecraftBlockName,
): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    grid.set(x, y, z, railBlock);
    if ((x - Math.min(x1, x2)) % postEvery === 0 || x === Math.max(x1, x2)) {
      grid.set(x, y + 1, z, postBlock);
    }
  }
}

export function placeRailLineZ(
  grid: SchematicBlockGrid,
  x: number,
  y: number,
  z1: number,
  z2: number,
  postEvery: number,
  postBlock: MinecraftBlockName,
  railBlock: MinecraftBlockName,
): void {
  for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
    grid.set(x, y, z, railBlock);
    if ((z - Math.min(z1, z2)) % postEvery === 0 || z === Math.max(z1, z2)) {
      grid.set(x, y + 1, z, postBlock);
    }
  }
}

export function placeCrateStack(
  grid: SchematicBlockGrid,
  x: number,
  y: number,
  z: number,
  barrel: MinecraftBlockName,
  chest: MinecraftBlockName,
): void {
  grid.set(x, y, z, blockState(barrel, { facing: "north", open: false }));
  grid.set(x + 1, y, z, blockState(chest, { facing: "north", type: "single", waterlogged: false }));
  grid.set(x, y + 1, z, blockState(barrel, { facing: "east", open: false }));
}

export function placeTrapdoorShutters(
  grid: SchematicBlockGrid,
  x: number,
  y: number,
  z: number,
  orientation: "north" | "south" | "east" | "west",
): void {
  const shutter = "minecraft:spruce_trapdoor" as MinecraftBlockName;

  if (orientation === "north" || orientation === "south") {
    grid.set(x - 1, y, z, blockState(shutter, { facing: orientation, half: "bottom", open: true, powered: false, waterlogged: false }));
    grid.set(x + 1, y, z, blockState(shutter, { facing: orientation, half: "bottom", open: true, powered: false, waterlogged: false }));
    return;
  }

  grid.set(x, y, z - 1, blockState(shutter, { facing: orientation, half: "bottom", open: true, powered: false, waterlogged: false }));
  grid.set(x, y, z + 1, blockState(shutter, { facing: orientation, half: "bottom", open: true, powered: false, waterlogged: false }));
}

export function placeSmokePuff(grid: SchematicBlockGrid, x: number, y: number, z: number): void {
  const cobweb = "minecraft:cobweb" as MinecraftBlockName;
  grid.set(x, y, z, cobweb);
  grid.set(x + 1, y + 1, z, cobweb);
  grid.set(x, y + 2, z + 1, cobweb);
}
