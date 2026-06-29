import { DEFAULT_BLOCK_REGISTRY } from '../shape/BlockRegistry';
import { fenceState, paneState, wallState } from '../shape/BlockStateBuilders';
import { parseBlockState } from '../shape/blockStateString';
import type { CardinalDirection } from '../shape/BlockDefinition';
import { CARDINAL_DIRECTIONS, offsetForDirection } from '../shape/directions';
import type { ShapeKernelGrid } from '../shape/ShapeKernelGrid';
import { getGridBlock, getGridEntries, setGridBlock } from '../shape/ShapeKernelGrid';

export type ResolverReport = {
  passName: string;
  changed: number;
  warnings: string[];
};

export function resolveFenceConnections(grid: ShapeKernelGrid): ResolverReport {
  let changed = 0;
  const warnings: string[] = [];
  const entries = getGridEntries(grid);

  for (const entry of entries) {
    const parsed = parseBlockState(entry.blockState);
    const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
    if (definition?.kind !== 'fence') continue;

    const connections = getCardinalConnectionMap(grid, entry.x, entry.y, entry.z, canFenceConnectTo);
    const next = fenceState(parsed.id, {
      ...connections,
      waterlogged: parsed.properties.waterlogged === true,
    });

    if (next !== entry.blockState) {
      setGridBlock(grid, entry.x, entry.y, entry.z, next);
      changed += 1;
    }
  }

  return { passName: 'resolveFenceConnections', changed, warnings };
}

export function resolvePaneConnections(grid: ShapeKernelGrid): ResolverReport {
  let changed = 0;
  const warnings: string[] = [];
  const entries = getGridEntries(grid);

  for (const entry of entries) {
    const parsed = parseBlockState(entry.blockState);
    const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
    if (definition?.kind !== 'pane') continue;

    const connections = getCardinalConnectionMap(grid, entry.x, entry.y, entry.z, canPaneConnectTo);
    const next = paneState(parsed.id, {
      ...connections,
      waterlogged: parsed.properties.waterlogged === true,
    });

    if (next !== entry.blockState) {
      setGridBlock(grid, entry.x, entry.y, entry.z, next);
      changed += 1;
    }
  }

  return { passName: 'resolvePaneConnections', changed, warnings };
}

export function resolveWallConnections(grid: ShapeKernelGrid): ResolverReport {
  let changed = 0;
  const warnings: string[] = [];
  const entries = getGridEntries(grid);

  for (const entry of entries) {
    const parsed = parseBlockState(entry.blockState);
    const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
    if (definition?.kind !== 'wall') continue;

    const connections = getCardinalConnectionMap(grid, entry.x, entry.y, entry.z, canWallConnectTo);
    const next = wallState(parsed.id, {
      north: connections.north ? 'low' : 'none',
      south: connections.south ? 'low' : 'none',
      east: connections.east ? 'low' : 'none',
      west: connections.west ? 'low' : 'none',
      up: true,
      waterlogged: parsed.properties.waterlogged === true,
    });

    if (next !== entry.blockState) {
      setGridBlock(grid, entry.x, entry.y, entry.z, next);
      changed += 1;
    }
  }

  return { passName: 'resolveWallConnections', changed, warnings };
}

export function runConnectionResolvers(grid: ShapeKernelGrid): ResolverReport[] {
  return [
    resolveFenceConnections(grid),
    resolvePaneConnections(grid),
    resolveWallConnections(grid),
  ];
}

function getCardinalConnectionMap(
  grid: ShapeKernelGrid,
  x: number,
  y: number,
  z: number,
  predicate: (neighborBlockState: string | undefined) => boolean,
): Record<CardinalDirection, boolean> {
  const result: Record<CardinalDirection, boolean> = {
    north: false,
    south: false,
    east: false,
    west: false,
  };

  for (const direction of CARDINAL_DIRECTIONS) {
    const offset = offsetForDirection(direction);
    const neighbor = getGridBlock(grid, x + offset.dx, y, z + offset.dz);
    result[direction] = predicate(neighbor);
  }

  return result;
}

function canFenceConnectTo(blockState: string | undefined): boolean {
  if (!blockState) return false;
  const parsed = parseBlockState(blockState);
  if (parsed.id === 'minecraft:air') return false;
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  return Boolean(definition?.canConnectFence || definition?.kind === 'fence' || definition?.kind === 'wall');
}

function canPaneConnectTo(blockState: string | undefined): boolean {
  if (!blockState) return false;
  const parsed = parseBlockState(blockState);
  if (parsed.id === 'minecraft:air') return false;
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  return Boolean(definition?.canConnectPane || definition?.kind === 'pane');
}

function canWallConnectTo(blockState: string | undefined): boolean {
  if (!blockState) return false;
  const parsed = parseBlockState(blockState);
  if (parsed.id === 'minecraft:air') return false;
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  return Boolean(definition?.canConnectWall || definition?.kind === 'wall' || definition?.kind === 'fence');
}
