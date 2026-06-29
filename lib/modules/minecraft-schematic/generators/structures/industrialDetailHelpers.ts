import type { MinecraftBlockName, SchematicBlockEntity } from "../../types";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { fillGableWallAcrossZ, fillSawtoothDropFaces, fillSawtoothEndCaps, fillSawtoothRoofSideBacking } from "./roofIntegrityHelpers";
import type { StructurePalette } from "./structurePalettes";

export function placeIndustrialWindowPanelNorthSouth(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  x2: number,
  z: number,
  y1: number,
  y2: number,
): void {
  grid.fill(x1 - 1, y1 - 1, z, x2 + 1, y2 + 1, z, palette.trim);

  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      grid.set(x, y, z, palette.glass);
    }
  }

  const mid = Math.floor((x1 + x2) / 2);
  grid.pillar(mid, z, y1, y2, palette.trim);
}

export function placeIndustrialWindowPanelEastWest(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x: number,
  z1: number,
  z2: number,
  y1: number,
  y2: number,
): void {
  grid.fill(x, y1 - 1, z1 - 1, x, y2 + 1, z2 + 1, palette.trim);

  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      grid.set(x, y, z, palette.glass);
    }
  }

  const mid = Math.floor((z1 + z2) / 2);
  grid.pillar(x, mid, y1, y2, palette.trim);
}

export function placeSawtoothRoof(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  baseY: number,
  bayWidth = 7,
): void {
  for (let x = x1; x <= x2; x += 1) {
    const local = (x - x1) % bayWidth;
    const y = baseY + Math.min(local, bayWidth - 2);

    for (let z = z1; z <= z2; z += 1) {
      grid.set(x, y, z, palette.roof);

      // Fill a little underneath the high sides so the roof reads as a solid shell from the outside.
      if (local >= bayWidth - 3) {
        grid.set(x, y - 1, z, palette.roof);
      }
    }

    // Vertical skylight/drop face at the end of each sawtooth bay.
    if (local === bayWidth - 1 && x < x2) {
      for (let z = z1 + 1; z <= z2 - 1; z += 1) {
        for (let y = baseY + 1; y <= baseY + bayWidth - 3; y += 1) {
          grid.set(x, y, z, palette.glass);
        }
      }
    }
  }

  fillSawtoothRoofSideBacking(grid, x1, x2, z1, z2, baseY, bayWidth, palette.wall, palette.trim);
  fillSawtoothDropFaces(grid, x1, x2, z1, z2, baseY, bayWidth, {
    wallBlock: palette.wall,
    trimBlock: palette.trim,
    windowBlock: palette.glass,
    includeClerestoryGlass: true,
  });
  fillSawtoothEndCaps(grid, x1, x2, z1, z2, baseY, bayWidth, {
    wallBlock: palette.wall,
    trimBlock: palette.trim,
    windowBlock: palette.glass,
    includeClerestoryGlass: true,
  });

  // Dark trim bands make the roof rhythm visible in a top-down layer/debug viewer.
  for (let x = x1 + bayWidth - 1; x <= x2; x += bayWidth) {
    grid.fill(x, baseY + bayWidth - 2, z1, x, baseY + bayWidth - 2, z2, palette.trim);
  }
}

export function placeSteppedWarehouseRoof(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  baseY: number,
): void {
  const centerZ = Math.floor((z1 + z2) / 2);
  const roofRise = Math.floor((z2 - z1) / 2);
  const peakY = baseY + roofRise;

  for (let z = z1 - 1; z <= z2 + 1; z += 1) {
    const offset = Math.abs(z - centerZ);
    const y = baseY + Math.max(0, roofRise - offset);
    grid.fill(x1 - 1, y, z, x2 + 1, y, z, palette.roof);
  }

  // Fill both gable ends so the roof has attic backing instead of hanging in the air.
  fillGableWallAcrossZ(grid, x1, z1, z2, baseY, peakY - 1, {
    wallBlock: palette.wall,
    trimBlock: palette.trim,
    windowBlock: palette.glass,
    includeAtticVent: true,
  });
  fillGableWallAcrossZ(grid, x2, z1, z2, baseY, peakY - 1, {
    wallBlock: palette.wall,
    trimBlock: palette.trim,
    windowBlock: palette.glass,
    includeAtticVent: true,
  });

  grid.lineX(x1 - 1, x2 + 1, peakY + 1, centerZ, palette.roofSlab);
}

export function placeChimneyStack(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  z1: number,
  y1: number,
  height: number,
): void {
  const x2 = x1 + 3;
  const z2 = z1 + 3;
  const topY = y1 + height;

  grid.fill(x1, y1, z1, x2, topY, z2, palette.chimney);
  grid.clearBox(x1 + 1, y1 + 1, z1 + 1, x2 - 1, topY, z2 - 1);
  grid.fill(x1 - 1, topY + 1, z1 - 1, x2 + 1, topY + 1, z2 + 1, palette.trim);
  grid.set(x1 + 1, topY + 2, z1 + 1, "minecraft:campfire" as MinecraftBlockName);
  grid.set(x2 - 1, topY + 2, z2 - 1, "minecraft:campfire" as MinecraftBlockName);

  const cobweb = "minecraft:cobweb" as MinecraftBlockName;
  grid.set(x1 + 1, topY + 3, z1 + 1, cobweb);
  grid.set(x1 + 2, topY + 4, z1 + 1, cobweb);
  grid.set(x1 + 2, topY + 5, z1 + 2, cobweb);
}

export function placeLoadingBayNorth(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  x2: number,
  z: number,
  y1: number,
  y2: number,
): void {
  grid.fill(x1 - 1, y1 - 1, z, x2 + 1, y2 + 1, z, palette.trim);
  grid.clearBox(x1, y1, z, x2, y2, z);

  // A barred rolling-door placeholder keeps the bay visible while still implying machinery/security.
  for (let x = x1; x <= x2; x += 1) {
    grid.set(x, y2, z, palette.bars);
    if ((x - x1) % 2 === 0) {
      grid.pillar(x, z, y1, y2, palette.bars);
    }
  }

  grid.fill(x1 - 2, 1, z - 5, x2 + 2, 1, z - 1, palette.road);
  grid.lineX(x1 - 3, x2 + 3, 1, z - 6, palette.road);
}

export function placeCogwheelMotif(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  cx: number,
  cy: number,
  z: number,
): void {
  const usingCreateBlocks = palette.gear.startsWith("create:");
  const gear = usingCreateBlocks ? ("create:cogwheel" as MinecraftBlockName) : palette.gear;
  const largeGear = usingCreateBlocks ? ("create:large_cogwheel" as MinecraftBlockName) : palette.gear;
  const spoke = usingCreateBlocks ? ("create:shaft" as MinecraftBlockName) : palette.accent;

  grid.set(cx, cy, z, largeGear);
  grid.set(cx + 1, cy, z, gear);
  grid.set(cx - 1, cy, z, gear);
  grid.set(cx, cy + 1, z, gear);
  grid.set(cx, cy - 1, z, gear);
  grid.set(cx + 2, cy, z, spoke);
  grid.set(cx - 2, cy, z, spoke);
  grid.set(cx, cy + 2, z, spoke);
  grid.set(cx, cy - 2, z, spoke);
  grid.set(cx + 1, cy + 1, z, spoke);
  grid.set(cx - 1, cy - 1, z, spoke);
  grid.set(cx + 1, cy - 1, z, spoke);
  grid.set(cx - 1, cy + 1, z, spoke);
}

export function placePipeRunX(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  x2: number,
  y: number,
  z: number,
  verticalDrops: number[] = [],
): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    grid.set(x, y, z, palette.pipe);
  }

  for (const x of verticalDrops) {
    for (let dropY = y - 1; dropY >= Math.max(2, y - 4); dropY -= 1) {
      grid.set(x, dropY, z, palette.pipe);
    }
  }
}

export function placePipeRunZ(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x: number,
  y: number,
  z1: number,
  z2: number,
  verticalDrops: number[] = [],
): void {
  for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
    grid.set(x, y, z, palette.pipe);
  }

  for (const z of verticalDrops) {
    for (let dropY = y - 1; dropY >= Math.max(2, y - 4); dropY -= 1) {
      grid.set(x, dropY, z, palette.pipe);
    }
  }
}

export function placeRoofVent(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x: number,
  y: number,
  z: number,
): void {
  grid.fill(x - 1, y, z - 1, x + 1, y, z + 1, palette.trim);
  grid.set(x, y + 1, z, palette.bars);
  grid.set(x, y + 2, z, palette.roofSlab);
}

export function placeStorageCluster(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  blockEntities: SchematicBlockEntity[],
  x: number,
  y: number,
  z: number,
  label: string,
): void {
  grid.set(x, y, z, blockState(palette.barrel, { facing: "north", open: false }));
  grid.set(x + 1, y, z, blockState(palette.chest, { facing: "north", type: "single", waterlogged: false }));
  grid.set(x, y + 1, z, blockState(palette.barrel, { facing: "east", open: false }));
  grid.set(x + 2, y, z, blockState(palette.barrel, { facing: "west", open: false }));

  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x, y, z, label: `${label} barrel` });
  blockEntities.push({ id: "minecraft:chest", kind: "chest", x: x + 1, y, z, label: `${label} chest` });
  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: x + 2, y, z, label: `${label} spare barrel` });
}

export function placeIndustrialFence(
  grid: SchematicBlockGrid,
  palette: StructurePalette,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  gateStartX?: number,
  gateEndX?: number,
): void {
  for (let x = x1; x <= x2; x += 1) {
    const inGate = gateStartX !== undefined && gateEndX !== undefined && x >= gateStartX && x <= gateEndX;
    if (!inGate) {
      grid.set(x, 2, z1, palette.fence);
      grid.set(x, 2, z2, palette.fence);
    }
  }

  for (let z = z1; z <= z2; z += 1) {
    grid.set(x1, 2, z, palette.fence);
    grid.set(x2, 2, z, palette.fence);
  }
}
