import type { MinecraftBlockName } from "../../types";
import { SchematicBlockGrid } from "./SchematicBlockGrid";

export type GableFillOptions = {
  wallBlock: MinecraftBlockName;
  trimBlock?: MinecraftBlockName;
  windowBlock?: MinecraftBlockName;
  includeAtticVent?: boolean;
};

function clampTop(baseY: number, peakY: number, computedTop: number): number {
  return Math.max(baseY, Math.min(peakY, computedTop));
}

/**
 * Fills a triangular/gabled attic wall on a fixed Z face.
 * Use this when the roof ridge runs along Z and the roof slopes across X.
 */
export function fillGableWallAcrossX(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  z: number,
  baseY: number,
  peakY: number,
  options: GableFillOptions,
): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const center = (minX + maxX) / 2;
  const halfWidth = Math.max(1, (maxX - minX) / 2);

  for (let x = minX; x <= maxX; x += 1) {
    const normalized = 1 - Math.abs(x - center) / halfWidth;
    const topY = clampTop(baseY, peakY, baseY + Math.floor(normalized * (peakY - baseY)));

    for (let y = baseY; y <= topY; y += 1) {
      grid.set(x, y, z, options.wallBlock);
    }
  }

  if (options.trimBlock) {
    grid.lineX(minX, maxX, baseY, z, options.trimBlock);
    grid.set(minX, baseY, z, options.trimBlock);
    grid.set(maxX, baseY, z, options.trimBlock);
    grid.set(Math.floor(center), peakY, z, options.trimBlock);
  }

  if (options.includeAtticVent && options.windowBlock && peakY - baseY >= 3) {
    const ventX = Math.floor(center);
    const ventY = baseY + 2;
    grid.set(ventX, ventY, z, options.windowBlock);
    if (options.trimBlock) {
      grid.set(ventX - 1, ventY, z, options.trimBlock);
      grid.set(ventX + 1, ventY, z, options.trimBlock);
      grid.set(ventX, ventY + 1, z, options.trimBlock);
    }
  }
}

/**
 * Fills a triangular/gabled attic wall on a fixed X face.
 * Use this when the roof ridge runs along X and the roof slopes across Z.
 */
export function fillGableWallAcrossZ(
  grid: SchematicBlockGrid,
  x: number,
  z1: number,
  z2: number,
  baseY: number,
  peakY: number,
  options: GableFillOptions,
): void {
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);
  const center = (minZ + maxZ) / 2;
  const halfDepth = Math.max(1, (maxZ - minZ) / 2);

  for (let z = minZ; z <= maxZ; z += 1) {
    const normalized = 1 - Math.abs(z - center) / halfDepth;
    const topY = clampTop(baseY, peakY, baseY + Math.floor(normalized * (peakY - baseY)));

    for (let y = baseY; y <= topY; y += 1) {
      grid.set(x, y, z, options.wallBlock);
    }
  }

  if (options.trimBlock) {
    grid.lineZ(x, baseY, minZ, maxZ, options.trimBlock);
    grid.set(x, baseY, minZ, options.trimBlock);
    grid.set(x, baseY, maxZ, options.trimBlock);
    grid.set(x, peakY, Math.floor(center), options.trimBlock);
  }

  if (options.includeAtticVent && options.windowBlock && peakY - baseY >= 3) {
    const ventZ = Math.floor(center);
    const ventY = baseY + 2;
    grid.set(x, ventY, ventZ, options.windowBlock);
    if (options.trimBlock) {
      grid.set(x, ventY, ventZ - 1, options.trimBlock);
      grid.set(x, ventY, ventZ + 1, options.trimBlock);
      grid.set(x, ventY + 1, ventZ, options.trimBlock);
    }
  }
}



export type SawtoothClosureOptions = {
  wallBlock: MinecraftBlockName;
  trimBlock?: MinecraftBlockName;
  windowBlock?: MinecraftBlockName;
  includeClerestoryGlass?: boolean;
};

function placeSawtoothClosureBlock(
  grid: SchematicBlockGrid,
  x: number,
  y: number,
  z: number,
  z1: number,
  z2: number,
  baseY: number,
  topY: number,
  options: SawtoothClosureOptions,
): void {
  const isOuterZ = z === z1 || z === z2;
  const isNearOuterZ = z === z1 + 1 || z === z2 - 1;
  const isBottom = y === baseY;
  const isTop = y === topY;
  const isRhythmPost = (z - z1) % 5 === 0;

  if (options.trimBlock && (isOuterZ || isNearOuterZ || isBottom || isTop || isRhythmPost)) {
    grid.set(x, y, z, options.trimBlock);
    return;
  }

  if (
    options.includeClerestoryGlass
    && options.windowBlock
    && y > baseY + 1
    && y < topY
    && z > z1 + 1
    && z < z2 - 1
  ) {
    grid.set(x, y, z, options.windowBlock);
    return;
  }

  grid.set(x, y, z, options.wallBlock);
}

/**
 * Closes the vertical drop face at the high side of each sawtooth bay.
 * Without this, the slanted roof strips can look like they are hanging above open air.
 */
export function fillSawtoothDropFaces(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  baseY: number,
  bayWidth: number,
  options: SawtoothClosureOptions,
): void {
  const peakY = baseY + Math.max(1, bayWidth - 3);

  for (let x = x1 + bayWidth - 1; x <= x2; x += bayWidth) {
    if (x <= x1 || x >= x2) {
      continue;
    }

    for (let z = z1; z <= z2; z += 1) {
      for (let y = baseY; y <= peakY; y += 1) {
        placeSawtoothClosureBlock(grid, x, y, z, z1, z2, baseY, peakY, options);
      }
    }
  }
}

/**
 * Adds a backing wall to the exposed end of a sawtooth roof run.
 * This is useful when the building side wall does not naturally continue up to the final roof height.
 */
export function fillSawtoothEndCap(
  grid: SchematicBlockGrid,
  x: number,
  z1: number,
  z2: number,
  baseY: number,
  topY: number,
  options: SawtoothClosureOptions,
): void {
  if (topY <= baseY) {
    return;
  }

  for (let z = z1; z <= z2; z += 1) {
    for (let y = baseY; y <= topY; y += 1) {
      placeSawtoothClosureBlock(grid, x, y, z, z1, z2, baseY, topY, options);
    }
  }
}

export function fillSawtoothEndCaps(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  baseY: number,
  bayWidth: number,
  options: SawtoothClosureOptions,
): void {
  const leftLocal = 0;
  const rightLocal = (x2 - x1) % bayWidth;
  const leftTopY = baseY + Math.min(leftLocal, bayWidth - 2);
  const rightTopY = baseY + Math.min(rightLocal, bayWidth - 2);

  fillSawtoothEndCap(grid, x1, z1, z2, baseY, leftTopY, options);
  fillSawtoothEndCap(grid, x2, z1, z2, baseY, rightTopY, options);
}

/**
 * Adds perimeter backing under sawtooth roof strips so the roof does not read as floating.
 * This intentionally only fills the long outside faces, preserving interior volume and skylight drops.
 */
export function fillSawtoothRoofSideBacking(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  baseY: number,
  bayWidth: number,
  wallBlock: MinecraftBlockName,
  trimBlock?: MinecraftBlockName,
): void {
  for (let x = x1; x <= x2; x += 1) {
    const local = (x - x1) % bayWidth;
    const roofY = baseY + Math.min(local, bayWidth - 2);

    for (let y = baseY; y < roofY; y += 1) {
      grid.set(x, y, z1, wallBlock);
      grid.set(x, y, z2, wallBlock);
    }

    if (trimBlock && roofY > baseY) {
      grid.set(x, roofY - 1, z1, trimBlock);
      grid.set(x, roofY - 1, z2, trimBlock);
    }
  }
}
