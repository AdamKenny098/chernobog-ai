import {
    AIR_BLOCK,
    type BlockState,
    type Bounds,
    type DebugBlock,
    type DebugSchematicDocument,
    type Vec3,
  } from "./types";
  
  type StoredBlock = {
    position: Vec3;
    state: BlockState;
  };
  
  function keyFromVec3(position: Vec3): string {
    return `${position.x},${position.y},${position.z}`;
  }
  
  function assertIntegerPosition(position: Vec3) {
    if (
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y) ||
      !Number.isInteger(position.z)
    ) {
      throw new Error(
        `Block position must use integer coordinates. Received x=${position.x}, y=${position.y}, z=${position.z}.`
      );
    }
  }
  
  function cloneVec3(position: Vec3): Vec3 {
    return {
      x: position.x,
      y: position.y,
      z: position.z,
    };
  }
  
  function cloneBlockState(state: BlockState): BlockState {
    return {
      id: state.id,
      properties: state.properties ? { ...state.properties } : undefined,
    };
  }
  
  function normalizeBounds(bounds: Bounds): Bounds {
    return {
      min: {
        x: Math.min(bounds.min.x, bounds.max.x),
        y: Math.min(bounds.min.y, bounds.max.y),
        z: Math.min(bounds.min.z, bounds.max.z),
      },
      max: {
        x: Math.max(bounds.min.x, bounds.max.x),
        y: Math.max(bounds.min.y, bounds.max.y),
        z: Math.max(bounds.min.z, bounds.max.z),
      },
    };
  }
  
  function getSizeFromBounds(bounds: Bounds | null): Vec3 | null {
    if (!bounds) {
      return null;
    }
  
    return {
      x: bounds.max.x - bounds.min.x + 1,
      y: bounds.max.y - bounds.min.y + 1,
      z: bounds.max.z - bounds.min.z + 1,
    };
  }
  
  export class BlockGrid {
    private readonly blocks = new Map<string, StoredBlock>();
  
    constructor(public readonly name: string) {}
  
    setBlock(position: Vec3, state: BlockState) {
      assertIntegerPosition(position);
  
      const key = keyFromVec3(position);
  
      if (state.id === AIR_BLOCK.id) {
        this.blocks.delete(key);
        return;
      }
  
      this.blocks.set(key, {
        position: cloneVec3(position),
        state: cloneBlockState(state),
      });
    }
  
    getBlock(position: Vec3): BlockState | null {
      assertIntegerPosition(position);
  
      return this.blocks.get(keyFromVec3(position))?.state ?? null;
    }
  
    clearBlock(position: Vec3) {
      assertIntegerPosition(position);
      this.blocks.delete(keyFromVec3(position));
    }
  
    fillBox(bounds: Bounds, state: BlockState) {
      const normalized = normalizeBounds(bounds);
  
      for (let x = normalized.min.x; x <= normalized.max.x; x += 1) {
        for (let y = normalized.min.y; y <= normalized.max.y; y += 1) {
          for (let z = normalized.min.z; z <= normalized.max.z; z += 1) {
            this.setBlock({ x, y, z }, state);
          }
        }
      }
    }
  
    clearBox(bounds: Bounds) {
      const normalized = normalizeBounds(bounds);
  
      for (let x = normalized.min.x; x <= normalized.max.x; x += 1) {
        for (let y = normalized.min.y; y <= normalized.max.y; y += 1) {
          for (let z = normalized.min.z; z <= normalized.max.z; z += 1) {
            this.clearBlock({ x, y, z });
          }
        }
      }
    }
  
    getBlocks(): DebugBlock[] {
      return [...this.blocks.values()]
        .map((block) => ({
          position: cloneVec3(block.position),
          state: cloneBlockState(block.state),
        }))
        .sort((a, b) => {
          if (a.position.y !== b.position.y) {
            return a.position.y - b.position.y;
          }
  
          if (a.position.z !== b.position.z) {
            return a.position.z - b.position.z;
          }
  
          return a.position.x - b.position.x;
        });
    }
  
    getPalette(): string[] {
      return [...new Set(this.getBlocks().map((block) => block.state.id))].sort();
    }
  
    getBounds(): Bounds | null {
      const blocks = this.getBlocks();
  
      if (blocks.length === 0) {
        return null;
      }
  
      const first = blocks[0].position;
  
      const bounds: Bounds = {
        min: cloneVec3(first),
        max: cloneVec3(first),
      };
  
      for (const block of blocks) {
        bounds.min.x = Math.min(bounds.min.x, block.position.x);
        bounds.min.y = Math.min(bounds.min.y, block.position.y);
        bounds.min.z = Math.min(bounds.min.z, block.position.z);
  
        bounds.max.x = Math.max(bounds.max.x, block.position.x);
        bounds.max.y = Math.max(bounds.max.y, block.position.y);
        bounds.max.z = Math.max(bounds.max.z, block.position.z);
      }
  
      return bounds;
    }
  
    toDebugDocument(command: string): DebugSchematicDocument {
      const blocks = this.getBlocks();
      const bounds = this.getBounds();
  
      return {
        format: "chernobog.minecraft.debug-block-grid",
        version: 1,
        name: this.name,
        createdAt: new Date().toISOString(),
        metadata: {
          generator: "chernobog.minecraft-schematic.v0.3",
          command,
          notes: [
            "Debug JSON only.",
            "This is not a .schem file.",
            "AI generation is intentionally disabled for Milestone 1.",
            "Advanced Minecraft block shapes are intentionally disabled for Milestone 1.",
          ],
        },
        bounds,
        size: getSizeFromBounds(bounds),
        palette: this.getPalette(),
        blockCount: blocks.length,
        blocks,
      };
    }
  }