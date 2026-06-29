export type Vec3 = {
    x: number;
    y: number;
    z: number;
  };
  
  export type Direction = "north" | "south" | "east" | "west" | "up" | "down";
  
  export type Bounds = {
    min: Vec3;
    max: Vec3;
  };
  
  export type BlockPropertyValue = string | number | boolean;
  
  export type BlockState = {
    id: string;
    properties?: Record<string, BlockPropertyValue>;
  };
  
  export type DebugBlock = {
    position: Vec3;
    state: BlockState;
  };
  
  export type DebugSchematicDocument = {
    format: "chernobog.minecraft.debug-block-grid";
    version: 1;
    name: string;
    createdAt: string;
    metadata: {
      generator: string;
      command: string;
      notes: string[];
    };
    bounds: Bounds | null;
    size: Vec3 | null;
    palette: string[];
    blockCount: number;
    blocks: DebugBlock[];
  };
  
  export const AIR_BLOCK: BlockState = {
    id: "minecraft:air",
  };