export type ShapeGridBlockValue = string | { id?: string; name?: string; state?: string; blockState?: string; type?: string } | null | undefined;

export type ShapeKernelGrid = {
  setBlock?: (x: number, y: number, z: number, blockState: string) => void;
  set?: (x: number, y: number, z: number, blockState: string) => void;
  placeBlock?: (x: number, y: number, z: number, blockState: string) => void;
  getBlock?: (x: number, y: number, z: number) => ShapeGridBlockValue;
  get?: (x: number, y: number, z: number) => ShapeGridBlockValue;
  removeBlock?: (x: number, y: number, z: number) => void;
  remove?: (x: number, y: number, z: number) => void;
  entries?: () => Iterable<{ x: number; y: number; z: number; blockState: string }>;
  getAllBlocks?: () => Iterable<{ x: number; y: number; z: number; blockState?: string; state?: string; id?: string }>;
};

export type ShapeGridEntry = { x: number; y: number; z: number; blockState: string };

export function setGridBlock(grid: ShapeKernelGrid, x: number, y: number, z: number, blockState: string): void {
  if (typeof grid.setBlock === 'function') {
    grid.setBlock(x, y, z, blockState);
    return;
  }

  if (typeof grid.set === 'function') {
    grid.set(x, y, z, blockState);
    return;
  }

  if (typeof grid.placeBlock === 'function') {
    grid.placeBlock(x, y, z, blockState);
    return;
  }

  throw new Error('ShapeKernelGrid is missing setBlock(x, y, z, blockState) or set(x, y, z, blockState).');
}

export function getGridBlock(grid: ShapeKernelGrid, x: number, y: number, z: number): string | undefined {
  const value = typeof grid.getBlock === 'function'
    ? grid.getBlock(x, y, z)
    : typeof grid.get === 'function'
      ? grid.get(x, y, z)
      : undefined;

  return normalizeGridBlockValue(value);
}

export function removeGridBlock(grid: ShapeKernelGrid, x: number, y: number, z: number): void {
  if (typeof grid.removeBlock === 'function') {
    grid.removeBlock(x, y, z);
    return;
  }

  if (typeof grid.remove === 'function') {
    grid.remove(x, y, z);
    return;
  }

  setGridBlock(grid, x, y, z, 'minecraft:air');
}

export function getGridEntries(grid: ShapeKernelGrid): ShapeGridEntry[] {
  if (typeof grid.entries === 'function') {
    return Array.from(grid.entries()).map((entry) => ({
      x: entry.x,
      y: entry.y,
      z: entry.z,
      blockState: entry.blockState,
    }));
  }

  if (typeof grid.getAllBlocks === 'function') {
    return Array.from(grid.getAllBlocks()).map((entry) => ({
      x: entry.x,
      y: entry.y,
      z: entry.z,
      blockState: normalizeGridBlockValue(entry) ?? 'minecraft:air',
    }));
  }

  throw new Error('ShapeKernelGrid is missing entries() or getAllBlocks(). Validation and resolver passes need iterable block data.');
}

function normalizeGridBlockValue(value: ShapeGridBlockValue): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.blockState ?? value.state ?? value.id ?? value.name ?? value.type;
}
