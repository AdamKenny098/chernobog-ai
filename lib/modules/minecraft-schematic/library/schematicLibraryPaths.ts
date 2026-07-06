import path from "node:path";
import { randomUUID } from "node:crypto";
import { SchematicLibraryError } from "./schematicLibraryTypes";

export const SCHEMATIC_LIBRARY_ROOT = path.join(
  process.cwd(),
  "data",
  "schematics",
  "generated",
);

const VALID_SCHEMATIC_ID = /^[a-z0-9][a-z0-9-_]{1,96}$/;

export function slugifySchematicName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug.length > 0 ? slug : "schematic";
}

export function createSchematicId(name: string): string {
  const slug = slugifySchematicName(name);
  const suffix = randomUUID().slice(0, 8);
  return `${slug}-${Date.now()}-${suffix}`;
}

export function assertValidSchematicId(id: string): void {
  if (!VALID_SCHEMATIC_ID.test(id)) {
    throw new SchematicLibraryError(
      "INVALID_ID",
      `Invalid schematic id "${id}". Expected lowercase letters, numbers, hyphens, or underscores.`,
    );
  }
}

export function getSchematicDirectoryPath(id: string): string {
  assertValidSchematicId(id);
  return path.join(SCHEMATIC_LIBRARY_ROOT, id);
}

export function getSchematicMetadataPath(id: string): string {
  return path.join(getSchematicDirectoryPath(id), "metadata.json");
}

export function getSchematicJsonAssetPath(id: string): string {
  return path.join(getSchematicDirectoryPath(id), "schematic.json");
}

export function getSchemAssetPath(id: string): string {
  return path.join(getSchematicDirectoryPath(id), `${id}.schem`);
}