import type {
  PaletteRole,
  PaletteTextureRole,
  SchematicPaletteDefinition,
  WeightedPaletteBlock,
} from "./paletteTypes";

export type PaletteMaterialRequest =
  | PaletteRole
  | PaletteTextureRole
  | `palette.${string}`
  | string;

export type PaletteMaterialPosition = {
  x?: number;
  y?: number;
  z?: number;
};

const semanticAliases: Record<string, PaletteRole | PaletteTextureRole> = {
  "palette.wall.primary": "wallPrimary",
  "palette.wall.secondary": "wallSecondary",
  "palette.wall.texture": "wallTexture",
  "palette.wall": "wallTexture",
  "palette.trim": "trim",
  "palette.roof": "roofTexture",
  "palette.roof.primary": "roof",
  "palette.floor": "floorTexture",
  "palette.floor.primary": "floor",
  "palette.window": "window",
  "palette.accent": "accentTexture",
  "palette.accent.primary": "accent",
  "palette.light": "light",
  "palette.path": "pathTexture",
  "palette.path.primary": "path",
  "palette.foundation": "foundationTexture",
  "palette.foundation.primary": "foundation",
};

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

export function pickWeightedPaletteBlock(
  entries: WeightedPaletteBlock[],
  seed: string,
): string {
  const totalWeight = entries.reduce((total, entry) => total + Math.max(0, entry.weight), 0);

  if (entries.length === 0 || totalWeight <= 0) {
    throw new Error("Cannot pick from an empty weighted palette texture.");
  }

  let roll = stableHash(seed) % totalWeight;

  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) {
      return entry.block;
    }
  }

  return entries[entries.length - 1].block;
}

export function resolvePaletteMaterial(
  palette: SchematicPaletteDefinition,
  request: PaletteMaterialRequest,
  position: PaletteMaterialPosition = {},
  seed = palette.id,
): string {
  const normalized = semanticAliases[String(request)] ?? request;

  if (normalized in palette.roles) {
    return palette.roles[normalized as PaletteRole];
  }

  const textureEntries = palette.textures?.[normalized as PaletteTextureRole];

  if (textureEntries && textureEntries.length > 0) {
    return pickWeightedPaletteBlock(
      textureEntries,
      `${seed}:${String(request)}:${position.x ?? 0}:${position.y ?? 0}:${position.z ?? 0}`,
    );
  }

  throw new Error(`Unknown palette material request: ${String(request)}`);
}

export function paletteUniqueBlocks(palette: SchematicPaletteDefinition): string[] {
  const blocks = new Set<string>(Object.values(palette.roles));

  for (const entries of Object.values(palette.textures ?? {})) {
    for (const entry of entries ?? []) {
      blocks.add(entry.block);
    }
  }

  return [...blocks].sort();
}
