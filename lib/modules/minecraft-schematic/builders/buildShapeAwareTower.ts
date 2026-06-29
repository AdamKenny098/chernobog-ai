import { runConnectionResolvers, type ResolverReport } from '../resolvers/ConnectionResolvers';
import type { CardinalDirection } from '../shape/BlockDefinition';
import type { ShapeKernelGrid } from '../shape/ShapeKernelGrid';
import { removeGridBlock, setGridBlock } from '../shape/ShapeKernelGrid';
import {
  placeDoor,
  placeFenceLine,
  placeGlassPaneLine,
  placeLadder,
  placeLantern,
  placeSlab,
  placeTrapdoor,
  placeStair,
  placeWallLine,
  type PlacementResult,
} from '../shape/PlacementHelpers';
import { formatValidationReport, validateShapeGrid, type ShapeValidationReport } from '../validation/ShapeValidation';

export type ShapeAwareTowerOptions = {
  originX?: number;
  originY?: number;
  originZ?: number;
  width?: number;
  height?: number;
  wallBlock?: string;
  accentBlock?: string;
  weatheredBlock?: string;
  crackedBlock?: string;
  stairBlock?: string;
  slabBlock?: string;
  doorBlock?: string;
  paneBlock?: string;
  fenceBlock?: string;
  wallRailingBlock?: string;
  ladderFacing?: CardinalDirection;
  trapdoorBlock?: string;
  includeWeathering?: boolean;
};

export type ShapeAwareTowerBuildResult = {
  blockCountEstimate: number;
  placementWarnings: string[];
  resolverReports: ResolverReport[];
  validation: ShapeValidationReport;
  validationText: string;
};

const DEFAULT_OPTIONS: Required<ShapeAwareTowerOptions> = {
  originX: 0,
  originY: 0,
  originZ: 0,
  width: 9,
  height: 17,
  wallBlock: 'minecraft:stone_bricks',
  accentBlock: 'minecraft:cobblestone',
  weatheredBlock: 'minecraft:mossy_stone_bricks',
  crackedBlock: 'minecraft:cracked_stone_bricks',
  stairBlock: 'minecraft:stone_brick_stairs',
  slabBlock: 'minecraft:stone_brick_slab',
  doorBlock: 'minecraft:spruce_door',
  paneBlock: 'minecraft:glass_pane',
  fenceBlock: 'minecraft:spruce_fence',
  wallRailingBlock: 'minecraft:stone_brick_wall',
  ladderFacing: 'south',
  trapdoorBlock: 'minecraft:spruce_trapdoor',
  includeWeathering: true,
};

export function buildShapeAwareTower(grid: ShapeKernelGrid, options: ShapeAwareTowerOptions = {}): ShapeAwareTowerBuildResult {
  const o = { ...DEFAULT_OPTIONS, ...options };
  const warnings: string[] = [];
  const width = ensureOdd(Math.max(7, o.width));
  const height = Math.max(11, o.height);
  const minX = o.originX;
  const minY = o.originY;
  const minZ = o.originZ;
  const maxX = minX + width - 1;
  const maxZ = minZ + width - 1;
  const centerX = minX + Math.floor(width / 2);
  const centerZ = minZ + Math.floor(width / 2);
  const roofY = minY + height;

  buildFoundationAndShell(grid, { minX, minY, minZ, maxX, maxZ, height, centerX, options: o });
  carveInterior(grid, { minX, minY, minZ, maxX, maxZ, height });
  addEntrance(grid, { centerX, minY, minZ, options: o });
  addWindows(grid, { minX, minY, minZ, maxX, maxZ, centerX, centerZ, options: o, warnings });
  addRoofAndBattlements(grid, { minX, minY, minZ, maxX, maxZ, roofY, options: o, warnings });
  addInteriorAccessAndLighting(grid, { centerX, centerZ, minY, minZ, maxX, maxZ, height, options: o, warnings });

  const resolverReports = runConnectionResolvers(grid);
  const validation = validateShapeGrid(grid);

  return {
    blockCountEstimate: validation.blockCount,
    placementWarnings: warnings,
    resolverReports,
    validation,
    validationText: formatValidationReport(validation),
  };
}

function buildFoundationAndShell(
  grid: ShapeKernelGrid,
  args: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxZ: number;
    height: number;
    centerX: number;
    options: Required<ShapeAwareTowerOptions>;
  },
): void {
  const { minX, minY, minZ, maxX, maxZ, height, options } = args;

  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      setGridBlock(grid, x, minY, z, options.accentBlock);
    }
  }

  for (let y = minY + 1; y < minY + height; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (!isOuterWall(x, z, minX, minZ, maxX, maxZ)) continue;

        const block = chooseWallBlock(options, x, y, z);
        setGridBlock(grid, x, y, z, block);
      }
    }
  }

  for (let x = minX + 1; x <= maxX - 1; x += 1) {
    for (let z = minZ + 1; z <= maxZ - 1; z += 1) {
      setGridBlock(grid, x, minY + height - 1, z, options.wallBlock);
    }
  }
}

function carveInterior(
  grid: ShapeKernelGrid,
  args: { minX: number; minY: number; minZ: number; maxX: number; maxZ: number; height: number },
): void {
  const { minX, minY, minZ, maxX, maxZ, height } = args;

  for (let y = minY + 1; y < minY + height - 1; y += 1) {
    for (let x = minX + 1; x <= maxX - 1; x += 1) {
      for (let z = minZ + 1; z <= maxZ - 1; z += 1) {
        removeGridBlock(grid, x, y, z);
      }
    }
  }
}

function addEntrance(
  grid: ShapeKernelGrid,
  args: { centerX: number; minY: number; minZ: number; options: Required<ShapeAwareTowerOptions> },
): void {
  const { centerX, minY, minZ, options } = args;

  removeGridBlock(grid, centerX, minY + 1, minZ);
  removeGridBlock(grid, centerX, minY + 2, minZ);
  placeDoor(grid, centerX, minY + 1, minZ, options.doorBlock, {
    facing: 'south',
    hinge: 'left',
    open: false,
    powered: false,
  });

  placeStair(grid, centerX - 1, minY + 3, minZ, options.stairBlock, { facing: 'north', half: 'bottom' });
  placeStair(grid, centerX, minY + 3, minZ, options.stairBlock, { facing: 'north', half: 'bottom' });
  placeStair(grid, centerX + 1, minY + 3, minZ, options.stairBlock, { facing: 'north', half: 'bottom' });
}

function addWindows(
  grid: ShapeKernelGrid,
  args: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxZ: number;
    centerX: number;
    centerZ: number;
    options: Required<ShapeAwareTowerOptions>;
    warnings: string[];
  },
): void {
  const { minX, minY, minZ, maxX, maxZ, centerX, centerZ, options, warnings } = args;
  const windowBaseLevels = [minY + 5, minY + 9, minY + 13];

  for (const y of windowBaseLevels) {
    placeVerticalPaneWindow(grid, centerX, y, minZ, options.paneBlock, warnings);
    placeVerticalPaneWindow(grid, centerX, y, maxZ, options.paneBlock, warnings);
    placeVerticalPaneWindow(grid, minX, y, centerZ, options.paneBlock, warnings);
    placeVerticalPaneWindow(grid, maxX, y, centerZ, options.paneBlock, warnings);
  }
}

function placeVerticalPaneWindow(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  paneBlock: string,
  warnings: string[],
): void {
  removeGridBlock(grid, x, y, z);
  removeGridBlock(grid, x, y + 1, z);
  collectPlacementWarnings(placeGlassPaneLine(grid, { x, y, z }, { x, y, z }, paneBlock), warnings);
  collectPlacementWarnings(placeGlassPaneLine(grid, { x, y: y + 1, z }, { x, y: y + 1, z }, paneBlock), warnings);
}

function addRoofAndBattlements(
  grid: ShapeKernelGrid,
  args: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxZ: number;
    roofY: number;
    options: Required<ShapeAwareTowerOptions>;
    warnings: string[];
  },
): void {
  const { minX, minZ, maxX, maxZ, roofY, options, warnings } = args;

  for (let x = minX; x <= maxX; x += 1) {
    placeStair(grid, x, roofY, minZ - 1, options.stairBlock, { facing: 'north', half: 'bottom' });
    placeStair(grid, x, roofY, maxZ + 1, options.stairBlock, { facing: 'south', half: 'bottom' });
  }

  for (let z = minZ; z <= maxZ; z += 1) {
    placeStair(grid, minX - 1, roofY, z, options.stairBlock, { facing: 'west', half: 'bottom' });
    placeStair(grid, maxX + 1, roofY, z, options.stairBlock, { facing: 'east', half: 'bottom' });
  }

  for (let x = minX + 1; x <= maxX - 1; x += 1) {
    for (let z = minZ + 1; z <= maxZ - 1; z += 1) {
      placeSlab(grid, x, roofY, z, options.slabBlock, { type: 'bottom' });
    }
  }

  collectPlacementWarnings(placeWallLine(grid, { x: minX, y: roofY + 1, z: minZ }, { x: maxX, y: roofY + 1, z: minZ }, options.wallRailingBlock), warnings);
  collectPlacementWarnings(placeWallLine(grid, { x: minX, y: roofY + 1, z: maxZ }, { x: maxX, y: roofY + 1, z: maxZ }, options.wallRailingBlock), warnings);
  collectPlacementWarnings(placeWallLine(grid, { x: minX, y: roofY + 1, z: minZ }, { x: minX, y: roofY + 1, z: maxZ }, options.wallRailingBlock), warnings);
  collectPlacementWarnings(placeWallLine(grid, { x: maxX, y: roofY + 1, z: minZ }, { x: maxX, y: roofY + 1, z: maxZ }, options.wallRailingBlock), warnings);

  for (let x = minX + 1; x <= maxX - 1; x += 2) {
    placeSlab(grid, x, roofY + 2, minZ, options.slabBlock, { type: 'bottom' });
    placeSlab(grid, x, roofY + 2, maxZ, options.slabBlock, { type: 'bottom' });
  }

  for (let z = minZ + 1; z <= maxZ - 1; z += 2) {
    placeSlab(grid, minX, roofY + 2, z, options.slabBlock, { type: 'bottom' });
    placeSlab(grid, maxX, roofY + 2, z, options.slabBlock, { type: 'bottom' });
  }

  collectPlacementWarnings(placeFenceLine(grid, { x: minX + 2, y: roofY + 1, z: minZ + 2 }, { x: maxX - 2, y: roofY + 1, z: minZ + 2 }, options.fenceBlock), warnings);
}

function addInteriorAccessAndLighting(
  grid: ShapeKernelGrid,
  args: {
    centerX: number;
    centerZ: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxZ: number;
    height: number;
    options: Required<ShapeAwareTowerOptions>;
    warnings: string[];
  },
): void {
  const { centerX, centerZ, minY, minZ, maxX, height, options, warnings } = args;
  const ladderX = maxX - 1;
  const ladderZ = centerZ - 2;

  collectPlacementWarnings(placeLadder(grid, ladderX, minY + 1, ladderZ, minY + height - 2, {
    facing: 'west',
    requireSupport: true,
  }), warnings);

  removeGridBlock(grid, ladderX, minY + height - 1, ladderZ);
  placeTrapdoor(grid, ladderX, minY + height - 1, ladderZ, options.trapdoorBlock, {
    facing: 'west',
    half: 'top',
    open: true,
    powered: false,
  });

  collectPlacementWarnings(placeLantern(grid, centerX - 2, minY + 1, minZ + 2, { hanging: false, requireSupport: true }), warnings);
  collectPlacementWarnings(placeLantern(grid, centerX + 2, minY + 1, minZ + 2, { hanging: false, requireSupport: true }), warnings);
  collectPlacementWarnings(placeLantern(grid, centerX, minY + height - 2, minZ + 2, { hanging: true, requireSupport: true }), warnings);
}

function chooseWallBlock(options: Required<ShapeAwareTowerOptions>, x: number, y: number, z: number): string {
  if (!options.includeWeathering) return options.wallBlock;
  const value = deterministicNoise(x, y, z);
  if (value % 23 === 0) return options.crackedBlock;
  if (value % 17 === 0) return options.weatheredBlock;
  return options.wallBlock;
}

function deterministicNoise(x: number, y: number, z: number): number {
  let n = x * 374761393 + y * 668265263 + z * 2147483647;
  n = (n ^ (n >> 13)) * 1274126177;
  return Math.abs(n ^ (n >> 16));
}

function isOuterWall(x: number, z: number, minX: number, minZ: number, maxX: number, maxZ: number): boolean {
  return x === minX || x === maxX || z === minZ || z === maxZ;
}

function ensureOdd(value: number): number {
  return value % 2 === 0 ? value + 1 : value;
}

function collectPlacementWarnings(result: PlacementResult, warnings: string[]): void {
  warnings.push(...result.warnings);
}
