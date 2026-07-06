import { promises as fs } from "fs";
import path from "path";

import { normalizeBlockEntitiesForBuild } from "../block-entities/blockEntitySupport";
import { applyBlockVersionValidationToBuild, createBlockVersionLimitReport } from "../block-registry";
import { applyBlockRegistryToBuild } from "../block-registry/blockRegistry";
import { exportDebugJson } from "../exporters/exportDebugJson";
import { exportSchem, validateSchemFile } from "../exporters/exportSchem";
import { writeSchematicMetadata } from "../metadata/writeSchematicMetadata";
import { getGenerationAbsolutePaths, getGenerationRelativePaths, projectRoot } from "../paths";
import { writeLatestBuildRecord } from "../state/latestBuildStore";
import type {
  GeneratedSchematicBuild,
  MinecraftBlockName,
  MinecraftSchematicCommandResult,
  MinecraftSchematicParsedCommand,
  SchematicBlock,
  SchematicMetadata,
  SchematicValidationResult,
} from "../types";
import { validateGeneratedBuild } from "../validation/validateGeneratedBuild";
import { writeSchematicVaultNote } from "../vault/writeSchematicVaultNote";

import { applyMilestone9FFinalVersionHardeningToBuild } from "../block-registry/blockVersionFinalizer9F";

type ConvertBuildVersionCommand = Extract<
  MinecraftSchematicParsedCommand,
  { kind: "convert-build-version" }
>;

type DebugBuildPayload = Record<string, unknown> & {
  blocks?: unknown;
  blockEntities?: unknown;
  palette?: unknown;
};

function safeBuildId(buildId: string): string | null {
  const trimmed = buildId.trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function metadataPathForBuildId(buildId: string): string {
  return path.join(projectRoot(), "exports", "schematics", "metadata", `${buildId}.metadata.json`);
}

async function readJsonFile<T>(absolutePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readMetadataByBuildId(buildId: string): Promise<SchematicMetadata | null> {
  return readJsonFile<SchematicMetadata>(metadataPathForBuildId(buildId));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function isMinecraftBlockName(value: unknown): value is MinecraftBlockName {
  return typeof value === "string" && /^([a-z0-9_.-]+):([a-z0-9_./-]+)$/.test(value);
}

function isSchematicBlock(value: unknown): value is SchematicBlock {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.z === "number" &&
    isMinecraftBlockName(value.block)
  );
}

function readBlocks(value: unknown): SchematicBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isSchematicBlock);
}

function readPalette(value: unknown, fallback: readonly MinecraftBlockName[]): MinecraftBlockName[] {
  const fromDebug = Array.isArray(value) ? value.filter(isMinecraftBlockName) : [];
  return Array.from(new Set([...fallback, ...fromDebug]));
}

function createConvertedBuildId(sourceBuildId: string, targetMinecraftVersion: string): string {
  const versionSlug = targetMinecraftVersion.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${sourceBuildId}-to-${versionSlug}-${stamp}`;
}

function resolveDebugJsonAbsolutePath(metadata: SchematicMetadata): string {
  const storedPath = metadata.outputPaths?.debugJsonPath;
  if (storedPath && path.isAbsolute(storedPath)) {
    return storedPath;
  }
  if (storedPath) {
    return path.join(projectRoot(), storedPath);
  }
  return path.join(projectRoot(), "exports", "schematics", "debug", `${metadata.buildId}.debug.json`);
}

function rebuildSourceBuildFromDebug(
  metadata: SchematicMetadata,
  debugPayload: DebugBuildPayload,
): GeneratedSchematicBuild | null {
  const blocks = readBlocks(debugPayload.blocks);
  if (blocks.length === 0 && metadata.blockCount > 0) {
    return null;
  }

  const metadataPalette = metadata.palette.filter(isMinecraftBlockName);
  const blockPalette = blocks.map((block) => block.block);
  const palette = readPalette(debugPayload.palette, [...metadataPalette, ...blockPalette]);

  return {
    buildId: metadata.buildId,
    displayName: readString(debugPayload.displayName) ?? metadata.displayName,
    generatedAt: readString(debugPayload.generatedAt) ?? metadata.generatedAt,
    generatorName: metadata.generatorName,
    variant: metadata.variant,
    presetId: readString(debugPayload.presetId) ?? metadata.presetId,
    profile: readString(debugPayload.profile) ?? metadata.profile,
    allowModdedBlocks: readBoolean(debugPayload.allowModdedBlocks) ?? metadata.allowModdedBlocks,
    fallbackToVanilla: readBoolean(debugPayload.fallbackToVanilla) ?? metadata.fallbackToVanilla,
    prompt: readString(debugPayload.prompt) ?? metadata.prompt,
    command: readString(debugPayload.command) ?? metadata.command,
    minecraftVersion: readString(debugPayload.minecraftVersion) ?? metadata.minecraftVersion,
    targetMinecraftVersion: metadata.targetMinecraftVersion,
    size: metadata.size,
    palette,
    blocks,
    blockEntities: Array.isArray(debugPayload.blockEntities)
      ? (debugPayload.blockEntities as GeneratedSchematicBuild["blockEntities"])
      : metadata.blockEntities,
    blockEntityExport: metadata.blockEntityExport,
    features: readStringList(debugPayload.features).length
      ? readStringList(debugPayload.features)
      : metadata.features,
    blockCount: blocks.length,
    shapeValidation: metadata.shapeValidation,
    shapeResolverReports: metadata.shapeResolverReports,
    placementWarnings: metadata.placementWarnings,
    unsupportedBlockWarnings: metadata.unsupportedBlockWarnings,
    blockRegistryReport: metadata.blockRegistryReport,
  };
}

async function getWrittenFileInfo(absolutePath: string): Promise<{ exists: boolean; sizeBytes: number }> {
  try {
    const stat = await fs.stat(absolutePath);
    return { exists: stat.isFile(), sizeBytes: stat.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

function mergeValidationResults(
  gridValidation: SchematicValidationResult,
  schemValidation: { ok: boolean; message: string },
): SchematicValidationResult {
  return {
    ok: gridValidation.ok && schemValidation.ok,
    warnings: schemValidation.ok
      ? gridValidation.warnings
      : [...gridValidation.warnings, schemValidation.message],
    errors: schemValidation.ok
      ? gridValidation.errors
      : [...gridValidation.errors, schemValidation.message],
  };
}

function summarizeRegistryReport(build: GeneratedSchematicBuild): string[] {
  const report = build.blockRegistryReport;
  if (!report) {
    return ["Block Registry Report: not recorded"];
  }

  return [
    `Block Registry Profile: ${report.profileId}`,
    `Blocks Checked: ${report.totalBlocksChecked}`,
    `Palette Entries Checked: ${report.totalPaletteEntriesChecked}`,
    `Fallback Replacements: ${report.fallbackBlocks}`,
    `Changed Blocks: ${report.changedBlocks}`,
    `Unsupported Blocks: ${report.unsupportedBlocks.length}`,
  ];
}

function summarizeTopReplacements(build: GeneratedSchematicBuild): string[] {
  const replacements = build.blockRegistryReport?.replacements ?? [];
  if (replacements.length === 0) {
    return ["- No replacements recorded."];
  }

  return replacements.slice(0, 20).map((replacement) => {
    return `- ${replacement.original} -> ${replacement.replacement} (${replacement.context})`;
  });
}

export async function executeConvertBuildVersion9E(
  command: ConvertBuildVersionCommand,
): Promise<MinecraftSchematicCommandResult> {
  const safeId = safeBuildId(command.buildId);
  if (!safeId) {
    return {
      ok: false,
      title: "Invalid schematic build id",
      message: "Build ids may only contain letters, numbers, underscores, hyphens, and periods.",
    };
  }

  const metadata = await readMetadataByBuildId(safeId);
  if (!metadata) {
    return {
      ok: false,
      title: "Schematic metadata not found",
      message: [
        `Build ID: ${safeId}`,
        "Could not convert this schematic because metadata was not found.",
        "Run schematic list to see available generated builds.",
      ].join("\n"),
    };
  }

  const debugJsonPath = resolveDebugJsonAbsolutePath(metadata);
  const debugPayload = await readJsonFile<DebugBuildPayload>(debugJsonPath);
  if (!debugPayload) {
    return {
      ok: false,
      title: "Schematic debug JSON not found",
      message: [
        `Build ID: ${metadata.buildId}`,
        `Expected Debug JSON: ${debugJsonPath}`,
        "9E needs the debug JSON because metadata does not contain the full block grid.",
        "Regenerate the schematic if the debug file has been deleted.",
      ].join("\n"),
    };
  }

  const sourceBuild = rebuildSourceBuildFromDebug(metadata, debugPayload);
  if (!sourceBuild) {
    return {
      ok: false,
      title: "Schematic block grid not recoverable",
      message: [
        `Build ID: ${metadata.buildId}`,
        "The debug JSON did not contain a usable blocks array.",
        "9E cannot write a converted .schem without block coordinates.",
      ].join("\n"),
    };
  }

  const sourcePaletteReport = createBlockVersionLimitReport({
    blockIds: sourceBuild.palette,
    targetMinecraftVersion: command.targetMinecraftVersion,
  });

  const convertedBuildId = createConvertedBuildId(metadata.buildId, command.targetMinecraftVersion);
  const conversionBaseBuild: GeneratedSchematicBuild = {
    ...sourceBuild,
    buildId: convertedBuildId,
    displayName: `${metadata.displayName ?? metadata.buildId} (${command.targetMinecraftVersion} conversion)`,
    generatedAt: new Date().toISOString(),
    profile: "vanilla",
    allowModdedBlocks: false,
    fallbackToVanilla: true,
    command: `convert schematic ${metadata.buildId} to version ${command.targetMinecraftVersion}`,
    targetMinecraftVersion: command.targetMinecraftVersion,
    features: Array.from(
      new Set([
        ...(sourceBuild.features ?? []),
        "version_conversion_9e",
        `converted_from_${metadata.buildId}`,
        `converted_to_${command.targetMinecraftVersion.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      ]),
    ),
    placementWarnings: [
      ...(sourceBuild.placementWarnings ?? []),
      `9E conversion source build: ${metadata.buildId}`,
      `9E conversion target Minecraft version: ${command.targetMinecraftVersion}`,
    ],
  };

  const registryBuild = applyBlockRegistryToBuild(conversionBaseBuild);
  const milestone9FinalBuild = applyMilestone9FFinalVersionHardeningToBuild(registryBuild);
  const normalized = normalizeBlockEntitiesForBuild(milestone9FinalBuild);
  const versionValidatedBuild = applyBlockVersionValidationToBuild(normalized.build);
  const exportBuild: GeneratedSchematicBuild = {
    ...versionValidatedBuild,
    blockEntityExport: normalized.summary,
  };

  const gridValidation = validateGeneratedBuild(exportBuild);
  const absolutePaths = getGenerationAbsolutePaths(exportBuild.buildId);
  const relativePaths = getGenerationRelativePaths(exportBuild.buildId);

  await exportDebugJson(exportBuild, gridValidation, absolutePaths.debugJsonPath);
  await exportSchem(exportBuild, absolutePaths.schemPath);
  const schemValidation = await validateSchemFile(absolutePaths.schemPath, exportBuild.minecraftVersion);
  const finalValidation = mergeValidationResults(gridValidation, schemValidation);

  const writtenSchem = await getWrittenFileInfo(absolutePaths.schemPath);
  const writtenDebug = await getWrittenFileInfo(absolutePaths.debugJsonPath);

  const writtenMetadata = await writeSchematicMetadata(
    exportBuild,
    finalValidation,
    relativePaths,
    absolutePaths.metadataJsonPath,
  );

  const metadataWithTarget: SchematicMetadata = {
    ...writtenMetadata,
    targetMinecraftVersion: command.targetMinecraftVersion,
  };
  await fs.writeFile(absolutePaths.metadataJsonPath, JSON.stringify(metadataWithTarget, null, 2), "utf8");
  await writeSchematicVaultNote(metadataWithTarget, absolutePaths.vaultNotePath);
  await writeLatestBuildRecord(metadataWithTarget);

  const writtenMetadataFile = await getWrittenFileInfo(absolutePaths.metadataJsonPath);
  const writtenVaultNote = await getWrittenFileInfo(absolutePaths.vaultNotePath);

  const registrySummary = summarizeRegistryReport(exportBuild);
  const replacementSummary = summarizeTopReplacements(exportBuild);

  return {
    ok: finalValidation.ok,
    title: finalValidation.ok
      ? "Schematic version conversion complete"
      : "Schematic version conversion completed with validation issues",
    message: [
      `Source Build ID: ${metadata.buildId}`,
      `Converted Build ID: ${exportBuild.buildId}`,
      `Target Minecraft Version: ${command.targetMinecraftVersion}`,
      `Source Palette Entries Checked: ${sourcePaletteReport.checkedBlockCount}`,
      `Source Potential Substitutions: ${sourcePaletteReport.substitutedBlocks.length}`,
      `Source Potential Omissions: ${sourcePaletteReport.omittedBlocks.length}`,
      `Source Potential Incompatibilities: ${sourcePaletteReport.incompatibleBlocks.length}`,
      "",
      ...registrySummary,
      "",
      "Top Replacements:",
      ...replacementSummary,
      "",
      `Validation: ${finalValidation.ok ? "passed" : "failed"}`,
      `Warnings: ${finalValidation.warnings.length}`,
      `Errors: ${finalValidation.errors.length}`,
      "",
      `Schematic: ${relativePaths.schemPath} (${writtenSchem.sizeBytes} bytes)`,
      `Debug JSON: ${relativePaths.debugJsonPath} (${writtenDebug.sizeBytes} bytes)`,
      `Metadata JSON: ${relativePaths.metadataJsonPath} (${writtenMetadataFile.sizeBytes} bytes)`,
      `Vault Note: ${relativePaths.vaultNotePath} (${writtenVaultNote.sizeBytes} bytes)`,
      "",
      "Next Action: run schematic validate latest, then open the converted build in the visual library before pasting it into a world.",
    ].join("\n"),
    data: {
      sourceBuildId: metadata.buildId,
      convertedBuildId: exportBuild.buildId,
      targetMinecraftVersion: command.targetMinecraftVersion,
      validation: finalValidation,
      paths: relativePaths,
      blockRegistryReport: exportBuild.blockRegistryReport,
    },
  };
}
