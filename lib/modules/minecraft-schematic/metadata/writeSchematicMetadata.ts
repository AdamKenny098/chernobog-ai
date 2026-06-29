import { promises as fs } from "fs";
import path from "path";

import type {
  GeneratedSchematicBuild,
  SchematicMetadata,
  SchematicOutputPaths,
  SchematicValidationResult,
} from "../types";
import { createSchematicBuildReport } from "./buildSchematicBuildReport";

export async function writeSchematicMetadata(
  build: GeneratedSchematicBuild,
  validation: SchematicValidationResult,
  outputPaths: SchematicOutputPaths,
  absoluteMetadataPath: string,
): Promise<SchematicMetadata> {
  await fs.mkdir(path.dirname(absoluteMetadataPath), { recursive: true });

  const metadata: SchematicMetadata = {
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
    blockEntities: build.blockEntities ?? [],
    blockEntityExport: build.blockEntityExport,
    features: build.features ?? [],
    outputPaths,
    validation,
    shapeValidation: build.shapeValidation,
    shapeResolverReports: build.shapeResolverReports,
    placementWarnings: build.placementWarnings,
    unsupportedBlockWarnings: build.unsupportedBlockWarnings,
    blockRegistryReport: build.blockRegistryReport,
  };

  metadata.buildReport = createSchematicBuildReport(metadata);

  await fs.writeFile(absoluteMetadataPath, JSON.stringify(metadata, null, 2), "utf8");

  return metadata;
}
