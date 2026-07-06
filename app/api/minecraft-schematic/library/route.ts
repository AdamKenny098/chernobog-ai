import { NextResponse } from "next/server";

import {
  createVisualSchematicLibraryFacets,
  createVisualSchematicLibraryFilters,
  createVisualSchematicLibraryStats,
  filterVisualSchematics,
} from "@/lib/modules/minecraft-schematic/visual-library/filterVisualSchematicLibrary";
import { readVisualSchematicSummaries } from "@/lib/modules/minecraft-schematic/visual-library/readVisualSchematicLibrary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = createVisualSchematicLibraryFilters({
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "",
    category: url.searchParams.get("category") ?? "",
    theme: url.searchParams.get("theme") ?? "",
    version: url.searchParams.get("version") ?? "",
    tag: url.searchParams.get("tag") ?? "",
    sort: url.searchParams.get("sort") ?? "created-desc",
  });

  const schematics = await readVisualSchematicSummaries();
  const filtered = filterVisualSchematics(schematics, filters);

  return NextResponse.json({
    count: filtered.length,
    total: schematics.length,
    filters,
    facets: createVisualSchematicLibraryFacets(schematics),
    stats: createVisualSchematicLibraryStats(schematics, filtered),
    schematics: filtered,
    generatedAt: new Date().toISOString(),
  });
}
