import type { ShapeGridEntry, ShapeKernelGrid } from './ShapeKernelGrid';

export class InMemoryShapeGrid implements ShapeKernelGrid {
  private readonly blocks = new Map<string, string>();

  setBlock(x: number, y: number, z: number, blockState: string): void {
    const key = toKey(x, y, z);
    if (blockState === 'minecraft:air') {
      this.blocks.delete(key);
      return;
    }
    this.blocks.set(key, blockState);
  }

  getBlock(x: number, y: number, z: number): string | undefined {
    return this.blocks.get(toKey(x, y, z));
  }

  removeBlock(x: number, y: number, z: number): void {
    this.blocks.delete(toKey(x, y, z));
  }

  entries(): ShapeGridEntry[] {
    return Array.from(this.blocks.entries()).map(([key, blockState]) => {
      const [x, y, z] = key.split(',').map(Number);
      return { x, y, z, blockState };
    });
  }
}

function toKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
