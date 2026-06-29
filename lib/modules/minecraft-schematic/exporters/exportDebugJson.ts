import { promises as fs } from "fs";
import path from "path";

import type { GeneratedSchematicBuild, SchematicValidationResult } from "../types";

export async function exportDebugJson(
  build: GeneratedSchematicBuild,
  validation: SchematicValidationResult,
  absoluteOutputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });

  const debugPayload = {
    format: "chernobog-debug-block-grid-v2",
    buildId: build.buildId,
    displayName: build.displayName,
    generatedAt: build.generatedAt,
    generatorName: build.generatorName,
    variant: build.variant,
    presetId: build.presetId,
    profile: build.profile,
    allowModdedBlocks: build.allowModdedBlocks,
    fallbackToVanilla: build.fallbackToVanilla,
    prompt: build.prompt,
    command: build.command,
    minecraftVersion: build.minecraftVersion,
    size: build.size,
    palette: build.palette,
    blockCount: build.blockCount,
    features: build.features ?? [],
    blockEntities: build.blockEntities ?? [],
    blockEntityExport: build.blockEntityExport,
    validation,
    shapeValidation: build.shapeValidation,
    shapeResolverReports: build.shapeResolverReports,
    placementWarnings: build.placementWarnings,
    unsupportedBlockWarnings: build.unsupportedBlockWarnings,
    blockRegistryReport: build.blockRegistryReport,
    blocks: build.blocks,
  };

  await fs.writeFile(absoluteOutputPath, JSON.stringify(debugPayload, null, 2), "utf8");
}
