import type {
  VisualSchematicFacetOption,
  VisualSchematicLibraryFacets,
  VisualSchematicLibraryFilters,
  VisualSchematicLibrarySort,
  VisualSchematicLibraryStats,
  VisualSchematicSummary,
} from "./types";
import { matchesVisualSchematicQuery } from "./readVisualSchematicLibrary";

const SORT_VALUES = new Set<VisualSchematicLibrarySort>([
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
  "blocks-desc",
  "blocks-asc",
  "size-desc",
  "size-asc",
]);

export function createVisualSchematicLibraryFilters(input: {
  q?: string | string[];
  status?: string | string[];
  category?: string | string[];
  theme?: string | string[];
  version?: string | string[];
  tag?: string | string[];
  sort?: string | string[];
}): VisualSchematicLibraryFilters {
  const sortValue = firstParam(input.sort);

  return {
    q: firstParam(input.q),
    status: firstParam(input.status),
    category: firstParam(input.category),
    theme: firstParam(input.theme),
    version: firstParam(input.version),
    tag: firstParam(input.tag),
    sort: SORT_VALUES.has(sortValue as VisualSchematicLibrarySort)
      ? (sortValue as VisualSchematicLibrarySort)
      : "created-desc",
  };
}

export function filterVisualSchematics(
  schematics: VisualSchematicSummary[],
  filters: VisualSchematicLibraryFilters,
): VisualSchematicSummary[] {
  return sortVisualSchematics(
    schematics.filter((schematic) => {
      if (!matchesVisualSchematicQuery(schematic, filters.q)) {
        return false;
      }

      if (filters.status && schematic.status !== filters.status) {
        return false;
      }

      if (filters.category && schematic.category !== filters.category) {
        return false;
      }

      if (filters.theme && schematic.theme !== filters.theme) {
        return false;
      }

      if (
        filters.version &&
        schematic.targetMinecraftVersion !== filters.version
      ) {
        return false;
      }

      if (filters.tag && !schematic.tags.includes(filters.tag)) {
        return false;
      }

      return true;
    }),
    filters.sort,
  );
}

export function createVisualSchematicLibraryFacets(
  schematics: VisualSchematicSummary[],
): VisualSchematicLibraryFacets {
  return {
    statuses: createFacetOptions(schematics.map((schematic) => schematic.status)),
    categories: createFacetOptions(
      schematics.map((schematic) => schematic.category),
    ),
    themes: createFacetOptions(schematics.map((schematic) => schematic.theme)),
    versions: createFacetOptions(
      schematics.map((schematic) => schematic.targetMinecraftVersion),
    ),
    tags: createFacetOptions(schematics.flatMap((schematic) => schematic.tags)),
  };
}

export function createVisualSchematicLibraryStats(
  allSchematics: VisualSchematicSummary[],
  filteredSchematics: VisualSchematicSummary[],
): VisualSchematicLibraryStats {
  const totalBlocks = sumBlocks(allSchematics);
  const filteredBlocks = sumBlocks(filteredSchematics);
  const largestSchematic = filteredSchematics.reduce<VisualSchematicSummary | null>(
    (largest, schematic) => {
      if (!largest || schematic.blockCount > largest.blockCount) {
        return schematic;
      }

      return largest;
    },
    null,
  );

  return {
    totalSchematics: allSchematics.length,
    filteredSchematics: filteredSchematics.length,
    totalBlocks,
    filteredBlocks,
    okCount: filteredSchematics.filter((schematic) => schematic.status === "ok")
      .length,
    issueCount: filteredSchematics.filter((schematic) => schematic.status !== "ok")
      .length,
    averageBlockCount:
      filteredSchematics.length > 0
        ? Math.round(filteredBlocks / filteredSchematics.length)
        : 0,
    largestSchematic,
  };
}

export function hasActiveVisualSchematicFilters(
  filters: VisualSchematicLibraryFilters,
): boolean {
  return Boolean(
    filters.q ||
      filters.status ||
      filters.category ||
      filters.theme ||
      filters.version ||
      filters.tag ||
      filters.sort !== "created-desc",
  );
}

function sortVisualSchematics(
  schematics: VisualSchematicSummary[],
  sort: VisualSchematicLibrarySort,
): VisualSchematicSummary[] {
  return [...schematics].sort((a, b) => {
    switch (sort) {
      case "created-asc":
        return compareCreatedAt(a, b);
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "blocks-desc":
        return b.blockCount - a.blockCount;
      case "blocks-asc":
        return a.blockCount - b.blockCount;
      case "size-desc":
        return volumeOf(b) - volumeOf(a);
      case "size-asc":
        return volumeOf(a) - volumeOf(b);
      case "created-desc":
      default:
        return compareCreatedAt(b, a);
    }
  });
}

function compareCreatedAt(
  a: VisualSchematicSummary,
  b: VisualSchematicSummary,
): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;

  return aTime - bTime || a.name.localeCompare(b.name);
}

function volumeOf(schematic: VisualSchematicSummary): number {
  return schematic.size.x * schematic.size.y * schematic.size.z;
}

function createFacetOptions(values: string[]): VisualSchematicFacetOption[] {
  const counts = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue.trim();

    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function sumBlocks(schematics: VisualSchematicSummary[]): number {
  return schematics.reduce((sum, schematic) => sum + schematic.blockCount, 0);
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}
