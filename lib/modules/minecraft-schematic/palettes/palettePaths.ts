import path from "path";

import { projectRoot } from "../paths";

const paletteIdUnsafePattern = /[^a-z0-9_.-]+/g;

export function normalizePaletteId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(paletteIdUnsafePattern, "-")
    .replace(/^-+|-+$/g, "");
}

export function schematicPaletteRoot(): string {
  return path.join(projectRoot(), "data", "schematic-palettes");
}

export function paletteJsonPath(paletteId: string): string {
  return path.join(schematicPaletteRoot(), `${normalizePaletteId(paletteId)}.json`);
}
