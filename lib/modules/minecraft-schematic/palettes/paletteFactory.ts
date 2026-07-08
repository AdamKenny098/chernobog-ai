import type { SchematicPaletteDefinition } from "./paletteTypes";
import { normalizePaletteId } from "./palettePaths";
import { savePalette } from "./paletteLibrary";

const nowIso = () => new Date().toISOString();

function resolvePaletteVersion(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "vanilla" || normalized === "modded") {
    return undefined;
  }

  if (/^\d+\.\d+(\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function resolvePaletteProfile(value?: string): string | undefined {
  if (!value) {
    return "vanilla";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "modded" || normalized === "create" || normalized === "siriocraft-create") {
    return "siriocraft-create";
  }

  return "vanilla";
}

function versionSuffix(versionOrProfile?: string): string {
  if (!versionOrProfile) {
    return "vanilla";
  }

  return normalizePaletteId(versionOrProfile);
}

function medievalPalette(prompt: string, versionOrProfile?: string): SchematicPaletteDefinition {
  const version = resolvePaletteVersion(versionOrProfile);
  const profile = resolvePaletteProfile(versionOrProfile);

  return {
    schemaVersion: 1,
    id: normalizePaletteId(`medieval-${versionSuffix(versionOrProfile ?? version ?? profile)}`),
    displayName: `Medieval ${version ?? profile ?? "Vanilla"} Palette`,
    description: "Reusable stone-and-wood castle palette for towers, keeps, walls, roads, and fortified towns.",
    tags: ["medieval", "castle", "stone", "vanilla"],
    minecraftVersion: version,
    targetMinecraftVersion: version,
    profile,
    fallbackToVanilla: true,
    roles: {
      wallPrimary: "minecraft:stone_bricks",
      wallSecondary: "minecraft:cobblestone",
      trim: "minecraft:oak_log",
      roof: "minecraft:spruce_planks",
      floor: "minecraft:oak_planks",
      window: "minecraft:glass_pane",
      accent: "minecraft:oak_fence",
      light: "minecraft:torch",
      path: "minecraft:gravel",
      foundation: "minecraft:stone",
    },
    textures: {
      wallTexture: [
        { block: "minecraft:stone_bricks", weight: 70 },
        { block: "minecraft:cracked_stone_bricks", weight: 15 },
        { block: "minecraft:cobblestone", weight: 15 },
      ],
      floorTexture: [
        { block: "minecraft:oak_planks", weight: 75 },
        { block: "minecraft:spruce_planks", weight: 25 },
      ],
      pathTexture: [
        { block: "minecraft:gravel", weight: 70 },
        { block: "minecraft:cobblestone", weight: 30 },
      ],
      foundationTexture: [
        { block: "minecraft:stone", weight: 65 },
        { block: "minecraft:cobblestone", weight: 35 },
      ],
    },
    aliases: ["medieval", "castle", "medieval-castle"],
    generated: { prompt, generatedAt: nowIso() },
  };
}

function factoryPalette(prompt: string, versionOrProfile?: string): SchematicPaletteDefinition {
  const version = resolvePaletteVersion(versionOrProfile);
  const profile = resolvePaletteProfile(versionOrProfile);
  const modded = profile === "siriocraft-create" || /create|industrial/.test(prompt.toLowerCase());

  return {
    schemaVersion: 1,
    id: normalizePaletteId(`create-industrial-${versionSuffix(versionOrProfile ?? version ?? profile)}`),
    displayName: `Industrial Factory ${version ?? profile ?? "Vanilla"} Palette`,
    description: "Factory palette with brick walls, iron trim, dark roofing, and grimy floor variation.",
    tags: ["factory", "industrial", modded ? "create" : "vanilla"],
    minecraftVersion: version,
    targetMinecraftVersion: version,
    profile: modded ? "siriocraft-create" : profile,
    allowModdedBlocks: modded,
    fallbackToVanilla: true,
    roles: {
      wallPrimary: "minecraft:bricks",
      wallSecondary: "minecraft:stone_bricks",
      trim: "minecraft:iron_bars",
      roof: "minecraft:dark_oak_planks",
      floor: "minecraft:stone",
      window: "minecraft:glass_pane",
      accent: modded ? "create:andesite_casing" : "minecraft:iron_block",
      light: "minecraft:torch",
      path: "minecraft:gravel",
      foundation: "minecraft:cobblestone",
    },
    textures: {
      wallTexture: [
        { block: "minecraft:bricks", weight: 65 },
        { block: "minecraft:stone_bricks", weight: 25 },
        { block: "minecraft:cobblestone", weight: 10 },
      ],
      floorTexture: [
        { block: "minecraft:stone", weight: 70 },
        { block: "minecraft:cobblestone", weight: 20 },
        { block: "minecraft:gravel", weight: 10 },
      ],
      accentTexture: [
        { block: modded ? "create:andesite_casing" : "minecraft:iron_block", weight: 60 },
        { block: "minecraft:iron_bars", weight: 40 },
      ],
    },
    aliases: ["factory", "industrial", "create-industrial"],
    generated: { prompt, generatedAt: nowIso() },
  };
}

function snowyPalette(prompt: string, versionOrProfile?: string): SchematicPaletteDefinition {
  const version = resolvePaletteVersion(versionOrProfile);
  const profile = resolvePaletteProfile(versionOrProfile);

  return {
    schemaVersion: 1,
    id: normalizePaletteId(`snowy-frontier-${versionSuffix(versionOrProfile ?? version ?? profile)}`),
    displayName: `Snowy Frontier ${version ?? profile ?? "Vanilla"} Palette`,
    description: "Cold frontier palette for outposts, snow towns, watchtowers, and survival settlements.",
    tags: ["snow", "frontier", "outpost", "vanilla"],
    minecraftVersion: version,
    targetMinecraftVersion: version,
    profile,
    fallbackToVanilla: true,
    roles: {
      wallPrimary: "minecraft:spruce_planks",
      wallSecondary: "minecraft:cobblestone",
      trim: "minecraft:spruce_log",
      roof: "minecraft:spruce_planks",
      floor: "minecraft:spruce_planks",
      window: "minecraft:glass_pane",
      accent: "minecraft:snow",
      light: "minecraft:torch",
      path: "minecraft:gravel",
      foundation: "minecraft:stone",
    },
    textures: {
      wallTexture: [
        { block: "minecraft:spruce_planks", weight: 70 },
        { block: "minecraft:cobblestone", weight: 20 },
        { block: "minecraft:spruce_log", weight: 10 },
      ],
      roofTexture: [
        { block: "minecraft:spruce_planks", weight: 80 },
        { block: "minecraft:snow", weight: 20 },
      ],
      pathTexture: [
        { block: "minecraft:gravel", weight: 60 },
        { block: "minecraft:snow", weight: 40 },
      ],
    },
    aliases: ["snowy", "frontier", "snowy-frontier"],
    generated: { prompt, generatedAt: nowIso() },
  };
}

function abandonedPalette(prompt: string, versionOrProfile?: string): SchematicPaletteDefinition {
  const version = resolvePaletteVersion(versionOrProfile);
  const profile = resolvePaletteProfile(versionOrProfile);

  return {
    schemaVersion: 1,
    id: normalizePaletteId(`abandoned-stone${version ? `-${version}` : ""}`),
    displayName: "Abandoned Stone Palette",
    description: "Weathered stone palette for ruins, abandoned factories, broken towers, and old roads.",
    tags: ["abandoned", "stone", "ruins", "weathered"],
    minecraftVersion: version,
    targetMinecraftVersion: version,
    profile,
    fallbackToVanilla: true,
    roles: {
      wallPrimary: "minecraft:stone_bricks",
      wallSecondary: "minecraft:cobblestone",
      trim: "minecraft:mossy_cobblestone",
      roof: "minecraft:dark_oak_planks",
      floor: "minecraft:stone",
      window: "minecraft:iron_bars",
      accent: "minecraft:vine",
      light: "minecraft:torch",
      path: "minecraft:gravel",
      foundation: "minecraft:cobblestone",
    },
    textures: {
      wallTexture: [
        { block: "minecraft:stone_bricks", weight: 55 },
        { block: "minecraft:cracked_stone_bricks", weight: 20 },
        { block: "minecraft:cobblestone", weight: 15 },
        { block: "minecraft:mossy_cobblestone", weight: 10 },
      ],
      floorTexture: [
        { block: "minecraft:stone", weight: 55 },
        { block: "minecraft:cobblestone", weight: 25 },
        { block: "minecraft:gravel", weight: 20 },
      ],
      foundationTexture: [
        { block: "minecraft:cobblestone", weight: 70 },
        { block: "minecraft:mossy_cobblestone", weight: 30 },
      ],
    },
    aliases: ["abandoned", "abandoned-stone", "ruins"],
    generated: { prompt, generatedAt: nowIso() },
  };
}

export function generatePaletteFromPrompt(
  prompt: string,
  versionOrProfile?: string,
): SchematicPaletteDefinition {
  const normalizedPrompt = prompt.trim().toLowerCase();

  if (/snow|frontier|frozen|ice|winter/.test(normalizedPrompt)) {
    return snowyPalette(prompt, versionOrProfile);
  }

  if (/abandoned|ruin|broken|decay|weathered/.test(normalizedPrompt)) {
    return abandonedPalette(prompt, versionOrProfile);
  }

  if (/factory|industrial|create|workshop|mill/.test(normalizedPrompt)) {
    return factoryPalette(prompt, versionOrProfile);
  }

  return medievalPalette(prompt, versionOrProfile);
}

export async function generateAndSavePalette(
  prompt: string,
  versionOrProfile?: string,
): Promise<{ palette: SchematicPaletteDefinition; filePath: string }> {
  const palette = generatePaletteFromPrompt(prompt, versionOrProfile);
  const filePath = await savePalette(palette, { overwrite: true });
  return { palette, filePath };
}
