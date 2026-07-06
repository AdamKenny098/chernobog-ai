import fs from "node:fs/promises";
import path from "node:path";
import {
  CreateSchematicAssetInput,
  DuplicateSchematicAssetInput,
  SchematicAssetKind,
  SchematicLibraryEntry,
  SchematicLibraryError,
  SchematicLibraryListResult,
  SchematicLibrarySearchOptions,
  SchematicMetadata,
  SchematicSize,
} from "./schematicLibraryTypes";
import {
  assertValidSchematicId,
  createSchematicId,
  getSchemAssetPath,
  getSchematicDirectoryPath,
  getSchematicJsonAssetPath,
  getSchematicMetadataPath,
  SCHEMATIC_LIBRARY_ROOT,
} from "./schematicLibraryPaths";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidSize(value: unknown): value is SchematicSize {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    isPositiveNumber(value.length)
  );
}

function requireString(
  record: Record<string, unknown>,
  key: keyof SchematicMetadata,
): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata field "${String(key)}" must be a non-empty string.`,
    );
  }

  return value;
}

function requireNumber(
  record: Record<string, unknown>,
  key: keyof SchematicMetadata,
): number {
  const value = record[key];

  if (!isPositiveNumber(value)) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata field "${String(key)}" must be a positive number.`,
    );
  }

  return value;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function normalizeMetadata(raw: unknown, fallbackId: string): SchematicMetadata {
  if (!isRecord(raw)) {
    throw new SchematicLibraryError(
      "CORRUPTED_METADATA",
      `metadata.json for "${fallbackId}" is not a JSON object.`,
    );
  }

  const id = requireString(raw, "id");
  assertValidSchematicId(id);

  if (id !== fallbackId) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata id "${id}" does not match folder id "${fallbackId}".`,
    );
  }

  const requiredMods = raw.requiredMods;
  const tags = raw.tags;
  const size = raw.size;

  if (!isStringArray(requiredMods)) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata field "requiredMods" must be an array of strings.`,
    );
  }

  if (!isStringArray(tags)) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata field "tags" must be an array of strings.`,
    );
  }

  if (!isValidSize(size)) {
    throw new SchematicLibraryError(
      "INVALID_METADATA",
      `Metadata field "size" must contain width, height, and length numbers.`,
    );
  }

  return {
    id,
    name: requireString(raw, "name"),
    category: requireString(raw, "category"),
    theme: requireString(raw, "theme"),
    targetMinecraftVersion: requireString(raw, "targetMinecraftVersion"),
    requiredMods,
    size,
    blockCount: requireNumber(raw, "blockCount"),
    tags,
    generatorSource: requireString(raw, "generatorSource"),
    createdAt: requireString(raw, "createdAt"),
    updatedAt: requireString(raw, "updatedAt"),
    parentId: normalizeOptionalString(raw.parentId),
    revision: normalizeOptionalNumber(raw.revision),
    notes: normalizeOptionalString(raw.notes),
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<unknown> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SchematicLibraryError(
        "CORRUPTED_METADATA",
        `Invalid JSON in "${filePath}".`,
      );
    }

    throw new SchematicLibraryError(
      "READ_FAILED",
      `Failed to read "${filePath}".`,
    );
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  try {
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    await fs.writeFile(filePath, serialized, "utf8");
  } catch {
    throw new SchematicLibraryError(
      "WRITE_FAILED",
      `Failed to write "${filePath}".`,
    );
  }
}

async function getAssetInfo(id: string): Promise<{
  assetPath?: string;
  assetKind: SchematicAssetKind;
}> {
  const schemPath = getSchemAssetPath(id);
  const jsonPath = getSchematicJsonAssetPath(id);

  if (await pathExists(schemPath)) {
    return {
      assetPath: schemPath,
      assetKind: "schem",
    };
  }

  if (await pathExists(jsonPath)) {
    return {
      assetPath: jsonPath,
      assetKind: "json",
    };
  }

  return {
    assetKind: "none",
  };
}

export async function ensureSchematicLibraryRoot(): Promise<void> {
  await fs.mkdir(SCHEMATIC_LIBRARY_ROOT, { recursive: true });
}

export async function readSchematicMetadata(id: string): Promise<SchematicMetadata> {
  assertValidSchematicId(id);

  const metadataPath = getSchematicMetadataPath(id);

  if (!(await pathExists(metadataPath))) {
    throw new SchematicLibraryError(
      "MISSING_METADATA",
      `No metadata.json found for schematic "${id}".`,
    );
  }

  const raw = await readJsonFile(metadataPath);
  return normalizeMetadata(raw, id);
}

export async function getSchematicEntry(id: string): Promise<SchematicLibraryEntry> {
  assertValidSchematicId(id);

  const directoryPath = getSchematicDirectoryPath(id);

  if (!(await pathExists(directoryPath))) {
    throw new SchematicLibraryError(
      "NOT_FOUND",
      `Schematic "${id}" does not exist.`,
    );
  }

  const metadata = await readSchematicMetadata(id);
  const assetInfo = await getAssetInfo(id);

  return {
    id,
    directoryPath,
    metadataPath: getSchematicMetadataPath(id),
    assetPath: assetInfo.assetPath,
    assetKind: assetInfo.assetKind,
    metadata,
  };
}

export async function listSchematicEntries(): Promise<SchematicLibraryListResult> {
  await ensureSchematicLibraryRoot();

  const entries: SchematicLibraryEntry[] = [];
  const warnings: SchematicLibraryListResult["warnings"] = [];

  const children = await fs.readdir(SCHEMATIC_LIBRARY_ROOT, {
    withFileTypes: true,
  });

  for (const child of children) {
    if (!child.isDirectory()) {
      continue;
    }

    const id = child.name;
    const directoryPath = path.join(SCHEMATIC_LIBRARY_ROOT, id);

    try {
      assertValidSchematicId(id);
      entries.push(await getSchematicEntry(id));
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown schematic library error.";

      warnings.push({
        id,
        path: directoryPath,
        reason,
      });
    }
  }

  entries.sort((a, b) => {
    return b.metadata.updatedAt.localeCompare(a.metadata.updatedAt);
  });

  return {
    entries,
    warnings,
  };
}

export async function searchSchematicEntries(
  options: SchematicLibrarySearchOptions,
): Promise<SchematicLibraryListResult> {
  const result = await listSchematicEntries();

  const query = options.query?.trim().toLowerCase();
  const tags = options.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const limit = options.limit ?? 25;

  const entries = result.entries.filter((entry) => {
    const metadata = entry.metadata;

    if (options.category && metadata.category !== options.category) {
      return false;
    }

    if (options.theme && metadata.theme !== options.theme) {
      return false;
    }

    if (
      options.targetMinecraftVersion &&
      metadata.targetMinecraftVersion !== options.targetMinecraftVersion
    ) {
      return false;
    }

    if (tags.length > 0) {
      const metadataTags = new Set(metadata.tags.map((tag) => tag.toLowerCase()));

      for (const tag of tags) {
        if (!metadataTags.has(tag)) {
          return false;
        }
      }
    }

    if (!query) {
      return true;
    }

    const searchableText = [
      metadata.id,
      metadata.name,
      metadata.category,
      metadata.theme,
      metadata.targetMinecraftVersion,
      metadata.generatorSource,
      metadata.notes ?? "",
      ...metadata.requiredMods,
      ...metadata.tags,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  return {
    entries: entries.slice(0, limit),
    warnings: result.warnings,
  };
}

export async function createSchematicAsset(
  input: CreateSchematicAssetInput,
): Promise<SchematicLibraryEntry> {
  const id = input.metadata.id;
  assertValidSchematicId(id);

  const directoryPath = getSchematicDirectoryPath(id);
  const metadataPath = getSchematicMetadataPath(id);

  if (!input.overwrite && (await pathExists(directoryPath))) {
    throw new SchematicLibraryError(
      "DUPLICATE_ID",
      `Schematic "${id}" already exists.`,
    );
  }

  await fs.mkdir(directoryPath, { recursive: true });

  const normalizedMetadata = normalizeMetadata(input.metadata, id);

  await writeJsonFile(metadataPath, normalizedMetadata);

  if (input.schematicJson !== undefined) {
    await writeJsonFile(getSchematicJsonAssetPath(id), input.schematicJson);
  }

  if (input.schemBytes !== undefined) {
    await fs.writeFile(getSchemAssetPath(id), input.schemBytes);
  }

  return getSchematicEntry(id);
}

export async function deleteSchematicAsset(id: string): Promise<boolean> {
  assertValidSchematicId(id);

  const directoryPath = getSchematicDirectoryPath(id);

  if (!(await pathExists(directoryPath))) {
    return false;
  }

  await fs.rm(directoryPath, {
    recursive: true,
    force: true,
  });

  return true;
}

export async function duplicateSchematicAsset(
  input: DuplicateSchematicAssetInput,
): Promise<SchematicLibraryEntry> {
  const source = await getSchematicEntry(input.sourceId);
  const now = new Date().toISOString();

  const newId = input.newId ?? createSchematicId(`${source.metadata.name}-copy`);
  assertValidSchematicId(newId);

  const newDirectoryPath = getSchematicDirectoryPath(newId);

  if (await pathExists(newDirectoryPath)) {
    throw new SchematicLibraryError(
      "DUPLICATE_ID",
      `Cannot duplicate schematic. Target id "${newId}" already exists.`,
    );
  }

  await fs.mkdir(newDirectoryPath, { recursive: true });

  const copiedMetadata: SchematicMetadata = {
    ...source.metadata,
    id: newId,
    name: input.name ?? `${source.metadata.name} Copy`,
    tags: input.tags ?? source.metadata.tags,
    notes: input.notes ?? source.metadata.notes,
    parentId: source.metadata.id,
    revision: (source.metadata.revision ?? 1) + 1,
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonFile(getSchematicMetadataPath(newId), copiedMetadata);

  if (source.assetPath && source.assetKind !== "none") {
    if (source.assetKind === "schem") {
      await fs.copyFile(source.assetPath, getSchemAssetPath(newId));
    }

    if (source.assetKind === "json") {
      await fs.copyFile(source.assetPath, getSchematicJsonAssetPath(newId));
    }
  }

  return getSchematicEntry(newId);
}