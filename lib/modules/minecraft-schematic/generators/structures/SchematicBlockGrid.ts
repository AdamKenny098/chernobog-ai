import type {
  BlockRegistryProfileId,
  GeneratedSchematicBuild,
  MinecraftBlockName,
  SchematicBlock,
  SchematicBlockEntity,
  SchematicGeneratorName,
  SchematicSize,
  SchematicVariant,
} from "../../types";

const DEFAULT_MINECRAFT_VERSION = "1.21.1";

export type BuildFinalizeOptions = {
  buildIdPrefix: string;
  displayName: string;
  generatorName: SchematicGeneratorName;
  variant: SchematicVariant;
  presetId?: string;
  profile?: BlockRegistryProfileId | string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  prompt: string;
  command: string;
  minecraftVersion?: string;
  features: string[];
  blockEntities?: SchematicBlockEntity[];
  placementWarnings?: string[];
  unsupportedBlockWarnings?: string[];
};

export function blockState(
  block: MinecraftBlockName,
  states: Record<string, string | number | boolean>,
): MinecraftBlockName {
  const stateText = Object.entries(states)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(",");

  return `${block}[${stateText}]` as MinecraftBlockName;
}

export function createBuildId(prefix: string): string {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `${prefix}-${timestamp}`;
}

function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function sortBlocks(blocks: SchematicBlock[]): SchematicBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.z !== b.z) return a.z - b.z;
    return a.x - b.x;
  });
}

export class SchematicBlockGrid {
  private readonly blocks = new Map<string, SchematicBlock>();

  constructor(readonly size: SchematicSize) {}

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.size.x && y < this.size.y && z < this.size.z;
  }

  set(x: number, y: number, z: number, block: MinecraftBlockName): void {
    if (!this.inBounds(x, y, z)) {
      return;
    }

    if (block === "minecraft:air") {
      this.blocks.delete(blockKey(x, y, z));
      return;
    }

    this.blocks.set(blockKey(x, y, z), { x, y, z, block });
  }

  delete(x: number, y: number, z: number): void {
    this.blocks.delete(blockKey(x, y, z));
  }

  get(x: number, y: number, z: number): SchematicBlock | undefined {
    return this.blocks.get(blockKey(x, y, z));
  }

  fill(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    block: MinecraftBlockName,
  ): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          this.set(x, y, z, block);
        }
      }
    }
  }

  hollowBox(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    block: MinecraftBlockName,
  ): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const shell = x === minX || x === maxX || y === minY || y === maxY || z === minZ || z === maxZ;
          if (shell) {
            this.set(x, y, z, block);
          }
        }
      }
    }
  }

  clearBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          this.delete(x, y, z);
        }
      }
    }
  }

  pillar(x: number, z: number, y1: number, y2: number, block: MinecraftBlockName): void {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      this.set(x, y, z, block);
    }
  }

  lineX(x1: number, x2: number, y: number, z: number, block: MinecraftBlockName): void {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      this.set(x, y, z, block);
    }
  }

  lineZ(x: number, y: number, z1: number, z2: number, block: MinecraftBlockName): void {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      this.set(x, y, z, block);
    }
  }

  toBlocks(): SchematicBlock[] {
    return sortBlocks([...this.blocks.values()]);
  }

  toBuild(options: BuildFinalizeOptions): GeneratedSchematicBuild {
    const blocks = this.toBlocks();
    const palette = Array.from(
      new Set<MinecraftBlockName>(["minecraft:air" as MinecraftBlockName, ...blocks.map((block) => block.block)]),
    );
    const generatedAt = new Date().toISOString();

    return {
      buildId: createBuildId(options.buildIdPrefix),
      displayName: options.displayName,
      generatorName: options.generatorName,
      variant: options.variant,
      presetId: options.presetId,
      profile: options.profile ?? "vanilla",
      allowModdedBlocks: options.allowModdedBlocks ?? false,
      fallbackToVanilla: options.fallbackToVanilla ?? true,
      prompt: options.prompt,
      command: options.command,
      minecraftVersion: options.minecraftVersion ?? DEFAULT_MINECRAFT_VERSION,
      generatedAt,
      size: this.size,
      palette,
      blocks,
      blockEntities: options.blockEntities ?? [],
      features: options.features,
      blockCount: blocks.length,
      placementWarnings: options.placementWarnings ?? [],
      unsupportedBlockWarnings: options.unsupportedBlockWarnings ?? [],
    };
  }
}
