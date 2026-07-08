import fs from "fs/promises";
import path from "path";

import {
  requiredPaletteRoles,
  type PaletteRole,
  type SchematicPaletteDefinition,
} from "./paletteTypes";
import { normalizePaletteId, paletteJsonPath, schematicPaletteRoot } from "./palettePaths";

export type PaletteLibraryEntry = {
  id: string;
  displayName: string;
  description?: string;
  minecraftVersion?: string;
  targetMinecraftVersion?: string;
  profile?: string;
  tags: string[];
  aliases: string[];
  filePath: string;
};

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

export function validatePaletteShape(value: unknown): SchematicPaletteDefinition {
  assertRecord(value, "Palette");

  if (value.schemaVersion !== 1) {
    throw new Error("Palette schemaVersion must be 1.");
  }

  if (typeof value.id !== "string" || normalizePaletteId(value.id).length === 0) {
    throw new Error("Palette id is required.");
  }

  if (typeof value.displayName !== "string" || value.displayName.trim().length === 0) {
    throw new Error("Palette displayName is required.");
  }

  assertRecord(value.roles, "Palette roles");

  for (const role of requiredPaletteRoles) {
    const block = value.roles[role];

    if (typeof block !== "string" || block.trim().length === 0) {
      throw new Error(`Palette role ${role} must define a block id.`);
    }
  }

  if (value.textures !== undefined) {
    assertRecord(value.textures, "Palette textures");

    for (const [textureRole, entries] of Object.entries(value.textures)) {
      if (!Array.isArray(entries)) {
        throw new Error(`Texture ${textureRole} must be an array.`);
      }

      for (const entry of entries) {
        assertRecord(entry, `Texture ${textureRole} entry`);

        if (typeof entry.block !== "string" || entry.block.trim().length === 0) {
          throw new Error(`Texture ${textureRole} entry block is required.`);
        }

        if (typeof entry.weight !== "number" || !Number.isFinite(entry.weight) || entry.weight <= 0) {
          throw new Error(`Texture ${textureRole} entry weight must be a positive number.`);
        }
      }
    }
  }

  return value as SchematicPaletteDefinition;
}

async function ensurePaletteDirectory(): Promise<void> {
  await fs.mkdir(schematicPaletteRoot(), { recursive: true });
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function toLibraryEntry(palette: SchematicPaletteDefinition, filePath: string): PaletteLibraryEntry {
  return {
    id: palette.id,
    displayName: palette.displayName,
    description: palette.description,
    minecraftVersion: palette.minecraftVersion,
    targetMinecraftVersion: palette.targetMinecraftVersion,
    profile: palette.profile,
    tags: palette.tags ?? [],
    aliases: palette.aliases ?? [],
    filePath,
  };
}

export async function listPalettes(): Promise<PaletteLibraryEntry[]> {
  await ensurePaletteDirectory();

  const entries = await fs.readdir(schematicPaletteRoot(), { withFileTypes: true });
  const palettes: PaletteLibraryEntry[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(schematicPaletteRoot(), entry.name);

    try {
      const palette = validatePaletteShape(await readJsonFile(filePath));
      palettes.push(toLibraryEntry(palette, filePath));
    } catch {
      // A broken palette should not hide the rest of the library from the user.
    }
  }

  return palettes.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadPalette(paletteIdOrAlias: string): Promise<SchematicPaletteDefinition> {
  await ensurePaletteDirectory();

  const directPath = paletteJsonPath(paletteIdOrAlias);

  try {
    return validatePaletteShape(await readJsonFile(directPath));
  } catch {
    const normalized = normalizePaletteId(paletteIdOrAlias);
    const palettes = await listPalettes();
    const match = palettes.find(
      (entry) =>
        normalizePaletteId(entry.id) === normalized ||
        entry.aliases.some((alias) => normalizePaletteId(alias) === normalized),
    );

    if (!match) {
      throw new Error(`Palette not found: ${paletteIdOrAlias}`);
    }

    return validatePaletteShape(await readJsonFile(match.filePath));
  }
}

export async function savePalette(
  palette: SchematicPaletteDefinition,
  options: { overwrite?: boolean } = {},
): Promise<string> {
  await ensurePaletteDirectory();

  const normalizedPalette: SchematicPaletteDefinition = {
    ...palette,
    id: normalizePaletteId(palette.id),
  };
  const validatedPalette = validatePaletteShape(normalizedPalette);
  const filePath = paletteJsonPath(validatedPalette.id);

  if (!options.overwrite) {
    try {
      await fs.access(filePath);
      throw new Error(`Palette already exists: ${validatedPalette.id}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Palette already exists")) {
        throw error;
      }
    }
  }

  await fs.writeFile(filePath, `${JSON.stringify(validatedPalette, null, 2)}\n`, "utf8");
  return filePath;
}

export function allPaletteBlocks(palette: SchematicPaletteDefinition): string[] {
  const blocks = new Set<string>();

  for (const role of requiredPaletteRoles) {
    blocks.add(palette.roles[role]);
  }

  for (const entries of Object.values(palette.textures ?? {})) {
    for (const entry of entries ?? []) {
      blocks.add(entry.block);
    }
  }

  return [...blocks].sort();
}

export function paletteRoleForBlock(
  palette: SchematicPaletteDefinition,
  block: string,
): PaletteRole | undefined {
  return requiredPaletteRoles.find((role) => palette.roles[role] === block);
}
