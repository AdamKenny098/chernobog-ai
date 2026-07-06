import fs from "node:fs/promises";
import path from "node:path";
import { createSchematicId } from "./schematicLibraryPaths";
import { createSchematicAsset } from "./schematicLibraryStore";
import { SchematicMetadata, SchematicSize } from "./schematicLibraryTypes";

export interface RegisterGeneratedSchematicInput {
  name: string;
  category?: string;
  theme?: string;
  targetMinecraftVersion?: string;
  requiredMods?: string[];
  size?: Partial<SchematicSize>;
  blockCount?: number;
  tags?: string[];
  generatorSource?: string;
  notes?: string;
  sourceAssetPath?: string;
  schematicJson?: unknown;
}

export interface RegisterGeneratedSchematicResult {
  ok: boolean;
  id?: string;
  metadataPath?: string;
  assetPath?: string;
  warning?: string;
}

function normalizeString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function normalizeSize(size: Partial<SchematicSize> | undefined): SchematicSize {
  return {
    width: Number.isFinite(size?.width) ? Number(size?.width) : 0,
    height: Number.isFinite(size?.height) ? Number(size?.height) : 0,
    length: Number.isFinite(size?.length) ? Number(size?.length) : 0,
  };
}

function inferAssetKind(sourceAssetPath: string | undefined): "schem" | "json" | "unknown" {
  if (!sourceAssetPath) {
    return "unknown";
  }

  const extension = path.extname(sourceAssetPath).toLowerCase();

  if (extension === ".schem" || extension === ".schematic") {
    return "schem";
  }

  if (extension === ".json") {
    return "json";
  }

  return "unknown";
}

async function readOptionalSourceAsset(
  sourceAssetPath: string | undefined,
): Promise<{
  schematicJson?: unknown;
  schemBytes?: Uint8Array;
}> {
  if (!sourceAssetPath) {
    return {};
  }

  const assetKind = inferAssetKind(sourceAssetPath);

  if (assetKind === "json") {
    const raw = await fs.readFile(sourceAssetPath, "utf8");

    return {
      schematicJson: JSON.parse(raw) as unknown,
    };
  }

  if (assetKind === "schem") {
    const bytes = await fs.readFile(sourceAssetPath);

    return {
      schemBytes: new Uint8Array(bytes),
    };
  }

  return {};
}

export async function registerGeneratedSchematic(
  input: RegisterGeneratedSchematicInput,
): Promise<RegisterGeneratedSchematicResult> {
  try {
    const name = normalizeString(input.name, "Generated Schematic");
    const id = createSchematicId(name);
    const now = new Date().toISOString();
    const sourceAsset = await readOptionalSourceAsset(input.sourceAssetPath);

    const metadata: SchematicMetadata = {
      id,
      name,
      category: normalizeString(input.category, "generated"),
      theme: normalizeString(input.theme, "default"),
      targetMinecraftVersion: normalizeString(
        input.targetMinecraftVersion,
        "unknown",
      ),
      requiredMods: normalizeStringArray(input.requiredMods),
      size: normalizeSize(input.size),
      blockCount: Number.isFinite(input.blockCount)
        ? Number(input.blockCount)
        : 0,
      tags: normalizeStringArray(["generated", ...(input.tags ?? [])]),
      generatorSource: normalizeString(
        input.generatorSource,
        "minecraft-schematic-generator",
      ),
      createdAt: now,
      updatedAt: now,
      notes: input.notes,
    };

    const entry = await createSchematicAsset({
      metadata,
      schematicJson: input.schematicJson ?? sourceAsset.schematicJson,
      schemBytes: sourceAsset.schemBytes,
    });

    return {
      ok: true,
      id: entry.id,
      metadataPath: entry.metadataPath,
      assetPath: entry.assetPath,
    };
  } catch (error: unknown) {
    const warning =
      error instanceof Error
        ? error.message
        : "Unknown error while registering generated schematic.";

    return {
      ok: false,
      warning,
    };
  }
}
