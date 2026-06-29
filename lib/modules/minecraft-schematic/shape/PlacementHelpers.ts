import type { CardinalDirection, Half, SlabType } from './BlockDefinition';
import { offsetForDirection, oppositeDirection } from './directions';
import type { ShapeKernelGrid } from './ShapeKernelGrid';
import { getGridBlock, setGridBlock } from './ShapeKernelGrid';
import {
  type DoorHinge,
  type StairShape,
  doorState,
  fenceState,
  ladderState,
  lanternState,
  paneState,
  slabState,
  stairState,
  trapdoorState,
  wallState,
} from './BlockStateBuilders';
import { DEFAULT_BLOCK_REGISTRY } from './BlockRegistry';
import { parseBlockState } from './blockStateString';

export type PlacementResult = {
  placed: number;
  warnings: string[];
};

export function placeStair(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  blockId: string,
  options: { facing: CardinalDirection; half?: Half; shape?: StairShape; waterlogged?: boolean },
): void {
  setGridBlock(grid, x, y, z, stairState(blockId, options));
}

export function placeSlab(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  blockId: string,
  options: { type?: SlabType; waterlogged?: boolean } = {},
): void {
  setGridBlock(grid, x, y, z, slabState(blockId, options));
}

export function placeDoor(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  blockId: string,
  options: { facing: CardinalDirection; hinge?: DoorHinge; open?: boolean; powered?: boolean },
): void {
  setGridBlock(grid, x, y, z, doorState(blockId, { ...options, half: 'lower' }));
  setGridBlock(grid, x, y + 1, z, doorState(blockId, { ...options, half: 'upper' }));
}

export function placeTrapdoor(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  blockId: string,
  options: { facing: CardinalDirection; half?: Half; open?: boolean; powered?: boolean; waterlogged?: boolean },
): void {
  setGridBlock(grid, x, y, z, trapdoorState(blockId, options));
}

export function placeFenceLine(
  grid: ShapeKernelGrid,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  blockId = 'minecraft:oak_fence',
): PlacementResult {
  return placeLine(grid, from, to, fenceState(blockId));
}

export function placeWallLine(
  grid: ShapeKernelGrid,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  blockId = 'minecraft:cobblestone_wall',
): PlacementResult {
  return placeLine(grid, from, to, wallState(blockId));
}

export function placeGlassPaneLine(
  grid: ShapeKernelGrid,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  blockId = 'minecraft:glass_pane',
): PlacementResult {
  return placeLine(grid, from, to, paneState(blockId));
}

export function placeLadder(
  grid: ShapeKernelGrid,
  x: number,
  y1: number,
  z: number,
  y2: number,
  options: { facing: CardinalDirection; waterlogged?: boolean; requireSupport?: boolean } = { facing: 'north' },
): PlacementResult {
  const warnings: string[] = [];
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  const backingDirection = oppositeDirection(options.facing);
  const backingOffset = offsetForDirection(backingDirection);
  let placed = 0;

  for (let y = startY; y <= endY; y += 1) {
    if (options.requireSupport !== false) {
      const backingState = getGridBlock(grid, x + backingOffset.dx, y, z + backingOffset.dz);
      if (!isSolidSupport(backingState)) {
        warnings.push(`Ladder at ${x},${y},${z} has no backing block at ${x + backingOffset.dx},${y},${z + backingOffset.dz}.`);
        continue;
      }
    }

    setGridBlock(grid, x, y, z, ladderState({ facing: options.facing, waterlogged: options.waterlogged }));
    placed += 1;
  }

  return { placed, warnings };
}

export function placeLantern(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  options: { blockId?: string; hanging?: boolean; requireSupport?: boolean } = {},
): PlacementResult {
  const hanging = options.hanging ?? false;
  const blockId = options.blockId ?? 'minecraft:lantern';
  const supportY = hanging ? y + 1 : y - 1;
  const warnings: string[] = [];

  if (options.requireSupport !== false) {
    const supportState = getGridBlock(grid, x, supportY, z);
    if (!isSolidSupport(supportState)) {
      warnings.push(`Lantern at ${x},${y},${z} has no ${hanging ? 'ceiling' : 'floor'} support at ${x},${supportY},${z}.`);
      return { placed: 0, warnings };
    }
  }

  setGridBlock(grid, x, y, z, lanternState(blockId, { hanging }));
  return { placed: 1, warnings };
}

function placeLine(
  grid: ShapeKernelGrid,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  blockState: string,
): PlacementResult {
  const warnings: string[] = [];

  if (from.y !== to.y) {
    warnings.push('Shape line helpers only support horizontal lines with a constant y value.');
    return { placed: 0, warnings };
  }

  if (from.x !== to.x && from.z !== to.z) {
    warnings.push('Shape line helpers only support straight X or Z axis lines.');
    return { placed: 0, warnings };
  }

  const xStep = from.x === to.x ? 0 : from.x < to.x ? 1 : -1;
  const zStep = from.z === to.z ? 0 : from.z < to.z ? 1 : -1;
  let x = from.x;
  let z = from.z;
  let placed = 0;

  while (true) {
    setGridBlock(grid, x, from.y, z, blockState);
    placed += 1;

    if (x === to.x && z === to.z) break;
    x += xStep;
    z += zStep;
  }

  return { placed, warnings };
}

function isSolidSupport(blockState: string | undefined): boolean {
  if (!blockState) return false;
  const parsed = parseBlockState(blockState);
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  return Boolean(definition?.isSolidSupport || definition?.canAttachTo);
}
