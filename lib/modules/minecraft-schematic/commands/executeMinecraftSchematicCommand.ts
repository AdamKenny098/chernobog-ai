import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

import { normalizeBlockEntitiesForBuild } from "../block-entities/blockEntitySupport";
import {
  applyBlockRegistryToBuild,
  blockRegistryProfiles,
  formatBlockRegistryProfile,
  getBlockRegistryProfile,
  normalizeBlockRegistryProfileId,
} from "../block-registry/blockRegistry";
import { applyBlockVersionValidationToBuild } from "../block-registry";
import { applyVersionSafePaletteIntentToBuild, createBlockVersionLimitReport } from "../block-registry";
import { exportDebugJson } from "../exporters/exportDebugJson";
import { exportSchem, validateSchemFile } from "../exporters/exportSchem";
import { generateStructure } from "../generators/structures/generateStructure";
import { generateTower } from "../generators/tower/generateTower";
import { writeSchematicMetadata } from "../metadata/writeSchematicMetadata";
import {
  getSirioCraftPreset,
  getSirioCraftPresetCategories,
  getSirioCraftPresetTags,
  isSirioCraftPresetCategory,
  listSirioCraftPresets,
  listSirioCraftPresetsByTag,
  recommendSirioCraftPresets,
  searchSirioCraftPresets,
} from "../presets/siriocraft";
import type { SirioCraftSchematicPreset } from "../presets/siriocraft";
import { getGenerationAbsolutePaths, getGenerationRelativePaths, projectRoot } from "../paths";
import { readLatestBuildRecord, writeLatestBuildRecord } from "../state/latestBuildStore";
import type {
  GeneratedSchematicBuild,
  MinecraftSchematicCommandResult,
  MinecraftSchematicParsedCommand,
  SchematicGeneratorName,
  SchematicMetadata,
  ShapeResolverReportRecord,
  ShapeValidationIssueRecord,
  ShapeValidationReportRecord,
  TowerVariant,
} from "../types";
import { validateGeneratedBuild } from "../validation/validateGeneratedBuild";
import { writeSchematicVaultNote } from "../vault/writeSchematicVaultNote";
import { parseMinecraftSchematicCommand } from "./parseMinecraftSchematicCommand";
import {
  applyVersionOptionsToGeneratedBuild,
  enrichMinecraftSchematicParsedCommandWithVersion,
  formatMinecraftVersionParserSelfTest,
  parseMinecraftSchematicCommandWithVersionSupport,
  parseMinecraftVersionTargetFromText,
} from "./minecraftVersionCommandSupport";
import { executeMilestone6CreateCommand } from "./executeMilestone6CreateCommand";
import { executeMilestone6ScenePackCommand } from "./executeMilestone6ScenePackCommand";
import { executeMilestone6PackReviewCommand } from "./executeMilestone6PackReviewCommand";
import { executeMilestone6PreviewCommand } from "./executeMilestone6PreviewCommand";
import { executeMilestone6BuildDepartmentCommand } from "./executeMilestone6BuildDepartmentCommand";
import { executeMilestone6FinalizationCommand } from "./executeMilestone6FinalizationCommand";
import type { Milestone6CreateParsedCommand } from "./parseMilestone6CreateCommand";
import type { Milestone6ScenePackParsedCommand } from "./parseMilestone6ScenePackCommand";
import type { Milestone6PackReviewParsedCommand } from "./parseMilestone6PackReviewCommand";
import type { Milestone6PreviewParsedCommand } from "./parseMilestone6PreviewCommand";
import type { Milestone6BuildDepartmentParsedCommand } from "./parseMilestone6BuildDepartmentCommand";
import type { Milestone6FinalizationParsedCommand } from "./parseMilestone6FinalizationCommand";
import { compileCreateMachineGraph } from "../create-support/compileCreateMachineGraph";
import { exportCreateMechanicalArtifacts } from "../create-support/exportCreateMechanicalArtifacts";

import {
  executeSchematicLibraryCommand,
  SchematicLibraryExecutableCommand,
} from "../library/executeSchematicLibraryCommand";

import { registerGeneratedSchematic } from "../library/registerGeneratedSchematic";

import { executeConvertBuildVersion9E } from "./executeConvertBuildVersion9E";

import { applyMilestone9FFinalVersionHardeningToBuild } from "../block-registry/blockVersionFinalizer9F";

const execFileAsync = promisify(execFile);

function helpMessage(): string {
  return [
    "Available schematic commands:",
    "- generate minecraft schematic: small house",
    "- generate minecraft schematic: stone bridge",
    "- generate minecraft schematic: town bridge",
    "- generate minecraft schematic: gatehouse",
    "- generate minecraft schematic: small Create-style starter factory",
    "- generate minecraft schematic: industrial storage yard",
    "- generate minecraft schematic: small workshop",
    "- generate minecraft schematic: machine house",
    "- generate minecraft schematic: factory with yard",
    "- generate minecraft schematic: rail loading factory",
    "- generate minecraft schematic: small warehouse",
    "- generate minecraft schematic: pipeworks yard",
    "- generate minecraft schematic: small train station",
    "- generate minecraft schematic: faction watchtower",
    "- generate minecraft schematic: ruined outpost",
    "- schematic status",
    "- schematic help",
    "- schematic list",
    "- list schematics",
    "- search schematics <query>",
    "- show schematic <id>",
    "- duplicate schematic <id>",
    "- delete schematic <id>",
    "- schematic list presets",
    "- schematic list presets <category>",
    "- schematic list presets category <category>",
    "- schematic list presets tag <tag>",
    "- schematic list profiles",
    "- schematic show profile vanilla",
    "- schematic show profile siriocraft-create",
    "- generate tower version 1.8.8",
    "- generate house version 1.12.2",
    "- generate medieval house using only 1.12.2 blocks",
    "- generate factory vanilla 1.20.1",
    "- generate spawn compatible with 1.8.8",
    "- validate schematic <build-id> version 1.8.8",
    "- convert schematic <build-id> to version 1.8.8",
    "- test version parser",
    "- schematic search presets <query>",
    "- schematic recommend preset <query>",
    "- schematic show preset <preset-id>",
    "- generate minecraft schematic preset <preset-id>",
    "- generate minecraft schematic from preset <preset-id>",
    "- schematic show latest",
    "- schematic validate latest",
    "- schematic open folder",
    "- schematic open folder latest",
    "- schematic open folder <build-id>",
    "- schematic review latest",
    "- schematic review <build-id>",
    "- schematic show <build-id>",
    "- generate create press line",
    "- generate create mixer station",
    "- generate create water wheel power test",
    "- generate create press line",
    "- generate create mixer station",
    "- generate create water wheel power test",
    "- schematic milestone status",
    "- schematic test plan",
  ].join("\n");
}

function getParsedCommandKind(command: unknown): string | undefined {
  if (
    typeof command === "object" &&
    command !== null &&
    "kind" in command &&
    typeof (command as { kind?: unknown }).kind === "string"
  ) {
    return (command as { kind: string }).kind;
  }

  return undefined;
}

async function safelyRegisterGeneratedSchematic(input: {
  name: string;
  category?: string;
  theme?: string;
  targetMinecraftVersion?: string;
  requiredMods?: string[];
  size?: {
    width?: number;
    height?: number;
    length?: number;
  };
  blockCount?: number;
  tags?: string[];
  generatorSource?: string;
  notes?: string;
  sourceAssetPath?: string;
  schematicJson?: unknown;
}): Promise<string> {
  const result = await registerGeneratedSchematic(input);

  if (!result.ok) {
    return `\n\nLibrary warning: generated schematic was not registered. ${result.warning}`;
  }

  return [
    "",
    "",
    "Library asset registered.",
    `Library id: ${result.id}`,
    `Metadata: ${result.metadataPath}`,
    result.assetPath ? `Asset: ${result.assetPath}` : "Asset: metadata only",
  ].join("\n");
}

async function readMetadataByRelativePath(relativePath: string): Promise<SchematicMetadata> {
  const absolutePath = path.join(projectRoot(), relativePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  return JSON.parse(raw) as SchematicMetadata;
}

function safeBuildId(buildId: string): string | null {
  return /^[a-zA-Z0-9_.-]+$/.test(buildId) ? buildId : null;
}

function metadataPathForBuildId(buildId: string): string {
  return path.join(metadataDirectory(), `${buildId}.metadata.json`);
}

async function readMetadataByBuildId(buildId: string): Promise<SchematicMetadata | null> {
  const safeId = safeBuildId(buildId);

  if (!safeId) {
    return null;
  }

  try {
    const raw = await fs.readFile(metadataPathForBuildId(safeId), "utf8");
    return JSON.parse(raw) as SchematicMetadata;
  } catch {
    return null;
  }
}

async function getWrittenFileInfo(
  absolutePath: string,
): Promise<{ exists: boolean; size: number }> {
  try {
    const stat = await fs.stat(absolutePath);

    return {
      exists: stat.isFile(),
      size: stat.size,
    };
  } catch {
    return {
      exists: false,
      size: 0,
    };
  }
}

function isSchematicInput(raw: string): boolean {
  const normalized = raw.trim().replace(/\s+/g, " ").toLowerCase();

  return (
    normalized.startsWith("schematic") ||
    normalized.startsWith("generate minecraft schematic")
  );
}

function metadataDirectory(): string {
  return path.join(projectRoot(), "exports", "schematics", "metadata");
}

function schematicOutputDirectory(): string {
  return path.join(projectRoot(), "exports", "schematics");
}

function formatPresetLine(preset: SirioCraftSchematicPreset): string {
  return `- ${preset.id} | ${preset.displayName} | ${preset.category} | ${preset.generator}/${preset.variant} | ${preset.size.x}x${preset.size.y}x${preset.size.z}`;
}

function formatPresetDetails(preset: SirioCraftSchematicPreset): string[] {
  return [
    `Preset: ${preset.displayName}`,
    `ID: ${preset.id}`,
    `Category: ${preset.category}`,
    `Generator: ${preset.generator}`,
    `Variant: ${preset.variant}`,
    `Profile: ${preset.profile}`,
    `Size: ${preset.size.x} x ${preset.size.y} x ${preset.size.z}`,
    `Description: ${preset.description}`,
    `Recommended Use: ${preset.recommendedUse}`,
    `Features: ${preset.features.join(", ")}`,
    `Tags: ${preset.tags.join(", ")}`,
    `Prompt Hints: ${preset.promptHints.join(", ")}`,
    `Generate: generate minecraft schematic preset ${preset.id}`,
  ];
}

function formatPresetSearchLine(result: ReturnType<typeof searchSirioCraftPresets>[number]): string {
  const reasons = result.reasons.length > 0 ? ` | matched: ${result.reasons.join(", ")}` : "";
  return `- ${result.preset.id} | ${result.preset.displayName} | ${result.preset.category} | score ${result.score}${reasons}`;
}

async function openPathInOs(absolutePath: string): Promise<{ attempted: boolean; ok: boolean; message: string }> {
  try {
    if (process.platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", absolutePath]);
      return { attempted: true, ok: true, message: "Opened folder with Windows shell." };
    }

    if (process.platform === "darwin") {
      await execFileAsync("open", [absolutePath]);
      return { attempted: true, ok: true, message: "Opened folder with macOS open." };
    }

    await execFileAsync("xdg-open", [absolutePath]);
    return { attempted: true, ok: true, message: "Opened folder with xdg-open." };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      message: error instanceof Error ? error.message : "Could not open folder from this runtime.",
    };
  }
}


function repairGeneratedBuildVersionVariantLeak(
  build: GeneratedSchematicBuild,
): GeneratedSchematicBuild {
  const variant = typeof build.variant === "string" ? build.variant.trim() : "";

  if (!/^\d+\.\d+(?:\.\d+)?$/.test(variant)) {
    return build;
  }

  return {
    ...build,
    variant: "default",
    targetMinecraftVersion: build.targetMinecraftVersion ?? variant,
  };
}

async function persistGeneratedBuild(
  build: GeneratedSchematicBuild,
  generatedTitle: string,
): Promise<MinecraftSchematicCommandResult> {
  const repairedBuild = repairGeneratedBuildVersionVariantLeak(build);
  const versionSafeBuild = applyVersionSafePaletteIntentToBuild(repairedBuild); 
  const registryBuild = applyBlockRegistryToBuild(versionSafeBuild);
  const milestone9FinalBuild = applyMilestone9FFinalVersionHardeningToBuild(registryBuild);
  const normalized = normalizeBlockEntitiesForBuild(milestone9FinalBuild);
  const versionValidatedBuild = applyBlockVersionValidationToBuild(normalized.build);
  const exportBuild = versionValidatedBuild;
  const validation = validateGeneratedBuild(exportBuild);
  const shapeValid = exportBuild.shapeValidation?.valid ?? true;

  if (!validation.ok || !shapeValid) {
    return {
      ok: false,
      title: `${generatedTitle} failed validation`,
      message: [
        ...validation.errors,
        ...(exportBuild.shapeValidation && !exportBuild.shapeValidation.valid
          ? ["Shape Kernel validation failed.", ...formatShapeValidation(exportBuild.shapeValidation)]
          : []),
      ].join("\n"),
      data: {
        build: exportBuild,
        validation,
        shapeValidation: exportBuild.shapeValidation,
      },
    };
  }

  const absolutePaths = getGenerationAbsolutePaths(exportBuild.buildId);
  const relativePaths = getGenerationRelativePaths(exportBuild.buildId);

  await exportDebugJson(exportBuild, validation, absolutePaths.debugJsonPath);
  await exportSchem(exportBuild, absolutePaths.schemPath);

  const schemFile = await getWrittenFileInfo(absolutePaths.schemPath);

  if (!schemFile.exists || schemFile.size <= 0) {
    return {
      ok: false,
      title: "Schematic export failed",
      message: [
        "9B_ACTIVE_PERSIST_MARKER",
        `DEBUG exportBuild.variant=${exportBuild.variant}`,
        `DEBUG exportBuild.targetMinecraftVersion=${exportBuild.targetMinecraftVersion ?? "missing"}`,
        `Build ID: ${exportBuild.buildId}`,
        "",
        "The generator produced a valid build object, but the .schem file was not written.",
        `Project Root: ${projectRoot()}`,
        `Expected Relative Schematic: ${relativePaths.schemPath}`,
        `Expected Absolute Schematic: ${absolutePaths.schemPath}`,
        `File Exists: ${schemFile.exists ? "yes" : "no"}`,
        `File Size: ${schemFile.size} byte(s)`,
      ].join("\n"),
      data: {
        build: exportBuild,
        validation,
        relativePaths,
        absolutePaths,
        schemFile,
        projectRoot: projectRoot(),
      },
    };
  }

  const schemValidation = await validateSchemFile(absolutePaths.schemPath, exportBuild.minecraftVersion);

  const finalValidation = {
    ok: validation.ok && schemValidation.ok && shapeValid,
    warnings: schemValidation.ok
      ? validation.warnings
      : [...validation.warnings, "Schematic file failed read-back validation."],
    errors: schemValidation.ok ? validation.errors : [...validation.errors, schemValidation.message],
  };

  const metadata = await writeSchematicMetadata(
    exportBuild,
    finalValidation,
    relativePaths,
    absolutePaths.metadataJsonPath,
  );

  await writeSchematicVaultNote(metadata, absolutePaths.vaultNotePath);
  await writeLatestBuildRecord(metadata);

  if (!finalValidation.ok) {
    return {
      ok: false,
      title: `${generatedTitle} generated but schematic validation failed`,
      message: [
        `Build ID: ${exportBuild.buildId}`,
        `Debug JSON: ${relativePaths.debugJsonPath}`,
        `Metadata JSON: ${relativePaths.metadataJsonPath}`,
        `Schematic: ${relativePaths.schemPath}`,
        `Vault Note: ${relativePaths.vaultNotePath}`,
        "",
        "Validation errors:",
        ...finalValidation.errors.map((error) => `- ${error}`),
      ].join("\n"),
      data: metadata,
    };
  }

  const libraryMessage = await safelyRegisterGeneratedSchematic({
    name: exportBuild.displayName ?? exportBuild.buildId,
    category: exportBuild.generatorName,
    theme: exportBuild.variant,
    targetMinecraftVersion: exportBuild.targetMinecraftVersion ?? exportBuild.minecraftVersion,
    requiredMods: [
      "minecraft",
      ...(exportBuild.profile === "siriocraft-create" || exportBuild.allowModdedBlocks
        ? ["create"]
        : []),
    ],
    size: {
      width: exportBuild.size.x,
      height: exportBuild.size.y,
      length: exportBuild.size.z,
    },
    blockCount: exportBuild.blockCount,
    tags: [
      "generated",
      "milestone-7",
      exportBuild.generatorName,
      exportBuild.variant,
      exportBuild.presetId ?? "",
      exportBuild.profile ?? "",
      ...(exportBuild.features ?? []),
    ].filter((tag) => tag.trim().length > 0),
    generatorSource: `minecraft-schematic:${exportBuild.generatorName}`,
    notes: [
      `Registered automatically from generated build ${exportBuild.buildId}.`,
      `Generated title: ${generatedTitle}.`,
      exportBuild.presetId ? `Preset: ${exportBuild.presetId}.` : "",
      exportBuild.profile ? `Profile: ${exportBuild.profile}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    sourceAssetPath: absolutePaths.schemPath,
  });

  return {
    ok: true,
    title: `${generatedTitle} generated`,
    message: [
      `Build ID: ${exportBuild.buildId}`,
      `Name: ${exportBuild.displayName ?? exportBuild.buildId}`,
      `Generator: ${exportBuild.generatorName}`,
      `Variant: ${exportBuild.variant}`,
      ...(exportBuild.presetId ? [`Preset: ${exportBuild.presetId}`] : []),
      ...(exportBuild.profile ? [`Profile: ${exportBuild.profile}`] : []),
      ...(exportBuild.targetMinecraftVersion ? [`Target Minecraft Version: ${exportBuild.targetMinecraftVersion}`] : []),
      ...(exportBuild.blockRegistryReport ? [`Block Registry: ${exportBuild.blockRegistryReport.profileId} | ${exportBuild.blockRegistryReport.changedBlocks} fallback replacement(s) | ${exportBuild.blockRegistryReport.unsupportedBlocks.length} unsupported block(s)`] : []),
      ...(metadata.buildReport ? [`Use Case: ${metadata.buildReport.sirioCraftUseCase}`, `Next Action: ${metadata.buildReport.recommendedNextAction}`] : []),
      `Size: ${exportBuild.size.x} x ${exportBuild.size.y} x ${exportBuild.size.z}`,
      `Block Count: ${exportBuild.blockCount}`,
      ...(exportBuild.blockEntityExport
        ? [`Block Entity NBT: ${exportBuild.blockEntityExport.nbtWritten} written, ${exportBuild.blockEntityExport.metadataOnly} metadata-only`]
        : []),
      ...(exportBuild.features?.length ? [`Features: ${exportBuild.features.join(", ")}`] : []),
      ...(finalValidation.warnings.length ? ["", "Warnings:", ...finalValidation.warnings.map((warning) => `- ${warning}`)] : []),
      "",
      "Generated files:",
      `- Debug JSON: ${relativePaths.debugJsonPath}`,
      `- Metadata JSON: ${relativePaths.metadataJsonPath}`,
      `- Schematic: ${relativePaths.schemPath}`,
      `- Vault Note: ${relativePaths.vaultNotePath}`,
      "",
      `Review Route: /review/schematic/${exportBuild.buildId}`,
      `Project Root: ${projectRoot()}`,
      `Absolute Schematic: ${absolutePaths.schemPath}`,
      `Schematic Bytes: ${schemFile.size}`,
      "",
      `Read-back Validation: ${schemValidation.ok ? "passed" : "failed"}`,
      libraryMessage,
      ...(exportBuild.shapeValidation ? ["", ...formatShapeValidation(exportBuild.shapeValidation)] : []),
    ].join("\n"),
    data: metadata,
  };
}

async function executeGenerateTower(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "generate-tower" }>,
): Promise<MinecraftSchematicCommandResult> {
  const build = applyVersionOptionsToGeneratedBuild(
    generateTower({
      variant: command.variant,
      prompt: command.raw,
      command: command.raw,
    }),
    command,
  );

  return persistGeneratedBuild(
    {
      ...build,
      presetId: command.presetId ?? build.presetId,
      profile: build.profile ?? "vanilla",
      allowModdedBlocks: build.allowModdedBlocks ?? false,
      fallbackToVanilla: build.fallbackToVanilla ?? true,
      features: build.features ?? ["tower_shell", "battlements", "windows", "theme_variation"],
    },
    "Minecraft tower schematic",
  );
}

async function executeGenerateStructure(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "generate-structure" }>,
): Promise<MinecraftSchematicCommandResult> {
  const build = applyVersionOptionsToGeneratedBuild(
    generateStructure({
      generator: command.generator,
      variant: command.variant,
      presetId: command.presetId,
      prompt: command.prompt,
      command: command.raw,
    }),
    command,
  );

  return persistGeneratedBuild(build, "Minecraft schematic");
}

async function executeGeneratePreset(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "generate-preset" }>,
): Promise<MinecraftSchematicCommandResult> {
  const preset = getSirioCraftPreset(command.presetId);

  if (!preset) {
    return {
      ok: false,
      title: "Schematic preset not found",
      message: [
        `Preset ID: ${command.presetId}`,
        "Run schematic list presets to see available SirioCraft presets.",
      ].join("\n"),
    };
  }

  const build = applyVersionOptionsToGeneratedBuild(
    generateStructure({
      generator: preset.generator,
      variant: preset.variant,
      presetId: preset.id,
      prompt: `SirioCraft preset: ${preset.displayName}`,
      command: command.raw,
    }),
    command,
  );

  return persistGeneratedBuild(build, `Minecraft schematic preset ${preset.id}`);
}

function formatMetadataSummary(metadata: SchematicMetadata): string[] {
  return [
    `Build ID: ${metadata.buildId}`,
    `Name: ${metadata.displayName ?? metadata.buildId}`,
    `Generated At: ${metadata.generatedAt}`,
    `Generator: ${metadata.generatorName}`,
    `Variant: ${metadata.variant}`,
    ...(metadata.presetId ? [`Preset: ${metadata.presetId}`] : []),
    ...(metadata.profile ? [`Profile: ${metadata.profile}`] : []),
    ...(metadata.targetMinecraftVersion ? [`Target Minecraft Version: ${metadata.targetMinecraftVersion}`] : []),
    ...(metadata.blockRegistryReport ? [`Block Registry: ${metadata.blockRegistryReport.profileId} | ${metadata.blockRegistryReport.changedBlocks} fallback replacement(s) | ${metadata.blockRegistryReport.unsupportedBlocks.length} unsupported block(s)`] : []),
    ...(metadata.buildReport ? [`Use Case: ${metadata.buildReport.sirioCraftUseCase}`, `Suggested Placement: ${metadata.buildReport.suggestedPlacement}`, `Next Action: ${metadata.buildReport.recommendedNextAction}`] : []),
    `Size: ${metadata.size.x} x ${metadata.size.y} x ${metadata.size.z}`,
    `Block Count: ${metadata.blockCount}`,
    ...(metadata.features?.length ? [`Features: ${metadata.features.join(", ")}`] : []),
    ...(metadata.blockEntities?.length ? [`Block Entities: ${metadata.blockEntities.length}`] : []),
    ...(metadata.blockEntityExport ? [`Block Entity NBT: ${metadata.blockEntityExport.nbtWritten} written, ${metadata.blockEntityExport.metadataOnly} metadata-only`] : []),
    "",
    "Generated files:",
    `- Debug JSON: ${metadata.outputPaths.debugJsonPath}`,
    `- Metadata JSON: ${metadata.outputPaths.metadataJsonPath}`,
    `- Schematic: ${metadata.outputPaths.schemPath}`,
    `- Vault Note: ${metadata.outputPaths.vaultNotePath}`,
    "",
    `Review Route: /review/schematic/${metadata.buildId}`,
    `Download .schem: /api/minecraft-schematic/file/${metadata.buildId}/schem`,
    `Download Metadata: /api/minecraft-schematic/file/${metadata.buildId}/metadata`,
    `Download Debug JSON: /api/minecraft-schematic/file/${metadata.buildId}/debug`,
    `Validation: ${metadata.validation.ok ? "passed" : "failed"}`,
    ...(metadata.shapeValidation ? ["", ...formatShapeValidation(metadata.shapeValidation)] : []),
  ];
}

function schematicFolderForMetadata(metadata: SchematicMetadata): string {
  return path.dirname(path.join(projectRoot(), metadata.outputPaths.schemPath));
}

async function executeShowLatest(): Promise<MinecraftSchematicCommandResult> {
  const latest = await readLatestBuildRecord();

  if (!latest) {
    return {
      ok: false,
      title: "No latest schematic found",
      message: "No schematic has been generated yet. Run: generate minecraft schematic: small house",
    };
  }

  const metadata = await readMetadataByRelativePath(latest.metadataJsonPath);

  return {
    ok: true,
    title: "Latest Minecraft schematic",
    message: formatMetadataSummary(metadata).join("\n"),
    data: metadata,
  };
}

async function executeShowBuild(buildId: string): Promise<MinecraftSchematicCommandResult> {
  const safeId = safeBuildId(buildId);

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
        `Expected Metadata: ${metadataPathForBuildId(safeId)}`,
        "Run schematic list to see available generated builds.",
      ].join("\n"),
    };
  }

  return {
    ok: true,
    title: "Minecraft schematic",
    message: formatMetadataSummary(metadata).join("\n"),
    data: metadata,
  };
}

async function executeValidateLatest(): Promise<MinecraftSchematicCommandResult> {
  const latest = await readLatestBuildRecord();

  if (!latest) {
    return {
      ok: false,
      title: "No latest schematic found",
      message: "No schematic has been generated yet. Run: generate minecraft schematic: small house",
    };
  }

  const metadata = await readMetadataByRelativePath(latest.metadataJsonPath);
  const absoluteSchemPath = path.join(projectRoot(), metadata.outputPaths.schemPath);
  const schemValidation = await validateSchemFile(absoluteSchemPath, metadata.minecraftVersion);
  const shapeValidationOk = metadata.shapeValidation?.valid ?? true;
  const ok = schemValidation.ok && metadata.validation.ok && shapeValidationOk;

  return {
    ok,
    title: ok ? "Latest schematic is valid" : "Latest schematic is invalid",
    message: [
      `Build ID: ${metadata.buildId}`,
      `Generator: ${metadata.generatorName}`,
      `Variant: ${metadata.variant}`,
      `Schematic: ${metadata.outputPaths.schemPath}`,
      `Read-back validation: ${schemValidation.ok ? "passed" : "failed"}`,
      schemValidation.ok ? "" : `Error: ${schemValidation.message}`,
      ...(metadata.validation.warnings.length ? ["", "Warnings:", ...metadata.validation.warnings.map((warning) => `- ${warning}`)] : []),
      ...(metadata.validation.errors.length ? ["", "Errors:", ...metadata.validation.errors.map((error) => `- ${error}`)] : []),
      ...(metadata.shapeValidation ? ["", ...formatShapeValidation(metadata.shapeValidation)] : ["", "Shape validation: unavailable"]),
      ...(metadata.shapeResolverReports?.length
        ? ["", ...formatResolverReports(metadata.shapeResolverReports)]
        : []),
    ]
      .filter(Boolean)
      .join("\n"),
    data: {
      latest,
      metadata,
      schemValidation,
      shapeValidation: metadata.shapeValidation,
      shapeResolverReports: metadata.shapeResolverReports,
    },
  };
}

async function executeValidateBuildVersion(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "validate-build-version" }>,
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
        "Could not run version compatibility parse check because metadata was not found.",
        "Run schematic list to see available generated builds.",
      ].join("\n"),
    };
  }

  const report = createBlockVersionLimitReport({
    blockIds: metadata.palette,
    targetMinecraftVersion: command.targetMinecraftVersion,
  });

  const ok = report.incompatibleBlocks.length === 0;

  return {
    ok,
    title: ok ? "Schematic version compatibility check parsed" : "Schematic has version compatibility warnings",
    message: [
      `Build ID: ${metadata.buildId}`,
      `Target Minecraft Version: ${command.targetMinecraftVersion}`,
      `Palette entries checked: ${report.checkedBlockCount}`,
      `Allowed: ${report.allowedBlocks.length}`,
      `Substituted: ${report.substitutedBlocks.length}`,
      `Omitted: ${report.omittedBlocks.length}`,
      `Incompatible: ${report.incompatibleBlocks.length}`,
      "",
      ...(report.substitutedBlocks.length
        ? [
            "Suggested substitutions:",
            ...report.substitutedBlocks.slice(0, 30).map((item) => `- ${item.from} -> ${item.to}`),
            "",
          ]
        : []),
      ...(report.incompatibleBlocks.length
        ? [
            "Incompatible blocks:",
            ...report.incompatibleBlocks.slice(0, 30).map((item) => `- ${item.blockId}: ${item.reason}`),
            "",
          ]
        : []),
      "Milestone 9B note: command parsing and palette-level compatibility reporting are active. Full block-by-block validator integration lands in 9D.",
    ].join("\n"),
    data: {
      metadata,
      report,
    },
  };
}

async function executeConvertBuildVersion(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "convert-build-version" }>,
): Promise<MinecraftSchematicCommandResult> {
  return executeConvertBuildVersion9E(command);
}

function executeVersionParserSelfTest(): MinecraftSchematicCommandResult {
  return {
    ok: true,
    title: "Minecraft version parser self-test",
    message: formatMinecraftVersionParserSelfTest(),
  };
}

async function executeList(): Promise<MinecraftSchematicCommandResult> {
  try {
    const dir = metadataDirectory();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".metadata.json"));

    const records = await Promise.all(
      jsonFiles.map(async (entry) => {
        const absolutePath = path.join(dir, entry.name);
        const raw = await fs.readFile(absolutePath, "utf8");
        return JSON.parse(raw) as SchematicMetadata;
      }),
    );

    const sorted = records.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt)).slice(0, 15);

    if (sorted.length === 0) {
      return {
        ok: true,
        title: "Minecraft schematics",
        message: "No generated schematic metadata files were found yet.",
        data: [],
      };
    }

    return {
      ok: true,
      title: "Minecraft schematics",
      message: [
        `Found ${records.length} generated schematic(s). Showing latest ${sorted.length}.`,
        "",
        ...sorted.map(
          (metadata) =>
            `- ${metadata.generatedAt} | ${metadata.displayName ?? metadata.buildId} | ${metadata.generatorName}/${metadata.variant} | ${metadata.size.x}x${metadata.size.y}x${metadata.size.z} | /review/schematic/${metadata.buildId}`,
        ),
      ].join("\n"),
      data: sorted,
    };
  } catch (error) {
    return {
      ok: false,
      title: "Could not list schematics",
      message: error instanceof Error ? error.message : "Unknown list error.",
    };
  }
}

async function executeListPresets(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "list-presets" }>,
): Promise<MinecraftSchematicCommandResult> {
  const category = command.category;
  const tag = command.tag;

  if (category && category !== "siriocraft" && !isSirioCraftPresetCategory(category)) {
    return {
      ok: false,
      title: "Unknown SirioCraft preset category",
      message: [
        `Category: ${category}`,
        "Valid categories:",
        ...getSirioCraftPresetCategories().map((entry) => `- ${entry.category} (${entry.count})`),
        "",
        "You can also search instead: schematic search presets <query>",
      ].join("\n"),
    };
  }

  const presets = tag
    ? listSirioCraftPresetsByTag(tag)
    : listSirioCraftPresets(category === "siriocraft" ? undefined : category);
  const categories = getSirioCraftPresetCategories();
  const tags = getSirioCraftPresetTags();

  return {
    ok: true,
    title: tag
      ? `SirioCraft presets tagged ${tag}`
      : category && category !== "siriocraft"
        ? `SirioCraft ${category} presets`
        : "SirioCraft schematic presets",
    message: [
      `Found ${presets.length} preset(s).`,
      "",
      "Categories:",
      ...categories.map((entry) => `- ${entry.category}: ${entry.count}`),
      "",
      "Common tags:",
      ...tags
        .filter((entry) => entry.count >= 2)
        .slice(0, 20)
        .map((entry) => `- ${entry.tag}: ${entry.count}`),
      "",
      "Presets:",
      ...(presets.length ? presets.map(formatPresetLine) : ["- No presets matched this filter."]),
      "",
      "Use: schematic show preset <preset-id>",
      "Use: schematic search presets <query>",
      "Use: schematic recommend preset <query>",
      "Use: generate minecraft schematic preset <preset-id>",
    ].join("\n"),
    data: { presets, categories, tags, filter: { category, tag } },
  };
}


async function executeListProfiles(): Promise<MinecraftSchematicCommandResult> {
  return {
    ok: true,
    title: "Minecraft schematic block registry profiles",
    message: [
      `Found ${blockRegistryProfiles.length} block registry profile(s).`,
      "",
      ...blockRegistryProfiles.flatMap((profile) => [
        `- ${profile.id} | ${profile.displayName} | namespaces: ${profile.allowedNamespaces.join(", ")} | default modded: ${profile.allowModdedBlocksDefault ? "on" : "off"} | fallback: ${profile.fallbackToVanillaDefault ? "on" : "off"}`,
      ]),
      "",
      "Use: schematic show profile <profile-id>",
      "Current safe default: vanilla",
      "V1.6B enables conservative Create block placement for SirioCraft Create presets.",
    ].join("\n"),
    data: { profiles: blockRegistryProfiles },
  };
}

async function executeShowProfile(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "show-profile" }>,
): Promise<MinecraftSchematicCommandResult> {
  const profile = getBlockRegistryProfile(command.profileId);

  return {
    ok: true,
    title: profile.displayName,
    message: [
      ...formatBlockRegistryProfile(profile),
      "",
      "Notes:",
      "- V1.6B emits selected Create block IDs from Create-aware industrial presets.",
      "- Vanilla presets still remain minecraft:* only.",
      "- fallbackToVanilla keeps schematics usable even when a modded block is unsupported.",
    ].join("\n"),
    data: profile,
  };
}

async function executeSearchPresets(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "search-presets" }>,
): Promise<MinecraftSchematicCommandResult> {
  const results = searchSirioCraftPresets(command.query, { limit: 10 });

  if (results.length === 0) {
    return {
      ok: true,
      title: "No matching SirioCraft presets",
      message: [
        `Query: ${command.query}`,
        "No preset matched that search.",
        "Try broader terms such as factory, faction, bridge, rail, spawn, town, storage, or ruins.",
      ].join("\n"),
      data: { query: command.query, results },
    };
  }

  return {
    ok: true,
    title: "SirioCraft preset search",
    message: [
      `Query: ${command.query}`,
      `Found ${results.length} matching preset(s).`,
      "",
      ...results.map(formatPresetSearchLine),
      "",
      `Best Match: ${results[0].preset.id}`,
      `Show: schematic show preset ${results[0].preset.id}`,
      `Generate: generate minecraft schematic preset ${results[0].preset.id}`,
    ].join("\n"),
    data: { query: command.query, results },
  };
}

async function executeRecommendPreset(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "recommend-preset" }>,
): Promise<MinecraftSchematicCommandResult> {
  const results = recommendSirioCraftPresets(command.query, 5);

  if (results.length === 0) {
    return {
      ok: true,
      title: "No preset recommendation found",
      message: [
        `Request: ${command.query}`,
        "No useful preset recommendation was found.",
        "Run schematic list presets to browse the library.",
      ].join("\n"),
      data: { query: command.query, results },
    };
  }

  const best = results[0].preset;

  return {
    ok: true,
    title: "Recommended SirioCraft preset",
    message: [
      `Request: ${command.query}`,
      "",
      `Recommended: ${best.displayName}`,
      `ID: ${best.id}`,
      `Category: ${best.category}`,
      `Generator: ${best.generator}/${best.variant}`,
      `Recommended Use: ${best.recommendedUse}`,
      `Why: ${results[0].reasons.join(", ") || "best search score"}`,
      "",
      "Alternatives:",
      ...results.slice(1).map(formatPresetSearchLine),
      "",
      `Show: schematic show preset ${best.id}`,
      `Generate: generate minecraft schematic preset ${best.id}`,
    ].join("\n"),
    data: { query: command.query, recommendation: best, results },
  };
}

async function executeShowPreset(
  command: Extract<MinecraftSchematicParsedCommand, { kind: "show-preset" }>,
): Promise<MinecraftSchematicCommandResult> {
  const preset = getSirioCraftPreset(command.presetId);

  if (!preset) {
    return {
      ok: false,
      title: "Schematic preset not found",
      message: [
        `Preset ID: ${command.presetId}`,
        "Run schematic list presets to see available SirioCraft presets.",
      ].join("\n"),
    };
  }

  return {
    ok: true,
    title: preset.displayName,
    message: formatPresetDetails(preset).join("\n"),
    data: preset,
  };
}

async function executeOpenFolder(
  command?: Extract<MinecraftSchematicParsedCommand, { kind: "open-folder" }>,
): Promise<MinecraftSchematicCommandResult> {
  let folder = schematicOutputDirectory();
  let label = "Schematic export folder";
  let metadata: SchematicMetadata | null = null;

  if (command?.latest) {
    const latest = await readLatestBuildRecord();

    if (!latest) {
      return {
        ok: false,
        title: "No latest schematic found",
        message: "No schematic has been generated yet. Run: generate minecraft schematic: small house",
      };
    }

    metadata = await readMetadataByRelativePath(latest.metadataJsonPath);
  } else if (command?.buildId) {
    metadata = await readMetadataByBuildId(command.buildId);

    if (!metadata) {
      return {
        ok: false,
        title: "Schematic metadata not found",
        message: [
          `Build ID: ${command.buildId}`,
          "Run schematic list to see available generated builds.",
        ].join("\n"),
      };
    }
  }

  if (metadata) {
    folder = schematicFolderForMetadata(metadata);
    label = `Output folder for ${metadata.buildId}`;
  }

  await fs.mkdir(folder, { recursive: true });
  const openResult = await openPathInOs(folder);

  return {
    ok: openResult.ok,
    title: openResult.ok ? "Schematic folder opened" : "Schematic folder path",
    message: [
      label,
      `Folder: ${folder}`,
      openResult.message,
      metadata ? `Review Route: /review/schematic/${metadata.buildId}` : "",
      openResult.ok ? "" : "If Chernobog is running in a restricted runtime, open the folder manually from the path above.",
    ]
      .filter(Boolean)
      .join("\n"),
    data: {
      folder,
      metadata,
      openResult,
    },
  };
}
async function executeReviewLatest(): Promise<MinecraftSchematicCommandResult> {
  const latest = await readLatestBuildRecord();

  if (!latest) {
    return {
      ok: false,
      title: "No latest schematic found",
      message: "No schematic has been generated yet. Run: generate minecraft schematic: small house",
    };
  }

  return executeReviewBuild(latest.buildId, "Latest schematic review route");
}

async function executeReviewBuild(
  buildId: string,
  title = "Schematic review route",
): Promise<MinecraftSchematicCommandResult> {
  const safeId = safeBuildId(buildId);

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
        `Expected Metadata: ${metadataPathForBuildId(safeId)}`,
        "Run schematic list to see available generated builds.",
      ].join("\n"),
    };
  }

  return {
    ok: true,
    title,
    message: [
      `Build ID: ${metadata.buildId}`,
      `Name: ${metadata.displayName ?? metadata.buildId}`,
      `Generator: ${metadata.generatorName}`,
      `Variant: ${metadata.variant}`,
      ...(metadata.presetId ? [`Preset: ${metadata.presetId}`] : []),
      `Validation: ${metadata.validation.ok ? "passed" : "failed"}`,
      ...(metadata.buildReport ? [`Report: ${metadata.buildReport.status}`, `Use Case: ${metadata.buildReport.sirioCraftUseCase}`] : []),
      `Review Route: /review/schematic/${metadata.buildId}`,
    ].join("\n"),
    data: {
      metadata,
      route: `/review/schematic/${metadata.buildId}`,
    },
  };
}

function formatShapeValidation(validation: ShapeValidationReportRecord): string[] {
  const lines = [
    `Shape Validation: ${validation.valid ? "PASS" : "FAIL"}`,
    `Block count: ${validation.blockCount}`,
    `Invalid blocks: ${validation.invalidBlocks}`,
    `Invalid states: ${validation.invalidStates}`,
    `Unsupported complex blocks: ${validation.unsupportedComplexBlocks}`,
    `Missing support: ${validation.missingSupport}`,
    `Malformed multi-block structures: ${validation.malformedMultiBlocks}`,
    `Warnings: ${validation.warnings}`,
  ];

  if (validation.issues.length > 0) {
    lines.push("Issues:");
    for (const issue of validation.issues.slice(0, 80)) {
      lines.push(formatShapeIssue(issue));
    }
  }

  return lines;
}

function formatShapeIssue(issue: ShapeValidationIssueRecord): string {
  const position = issue.x === undefined ? "" : ` @ ${issue.x},${issue.y},${issue.z}`;
  return `- [${issue.severity}/${issue.category}]${position} ${issue.message}`;
}

function formatResolverReports(reports: ShapeResolverReportRecord[]): string[] {
  return [
    "Resolver passes:",
    ...reports.map((report) => `- ${report.passName}: changed ${report.changed} block(s)`),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceGenerator(value: unknown): SchematicGeneratorName {
  const generator = typeof value === "string" ? value : "tower";
  if (["tower", "house", "bridge", "gatehouse", "factory", "train_station", "outpost"].includes(generator)) {
    return generator as SchematicGeneratorName;
  }

  return "tower";
}







function readMilestone6FinalizationCommand(input: unknown): Milestone6FinalizationParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_finalization") {
    return null;
  }

  const action = input.action === "write_docs" ? "write_docs" : "status";
  const prompt =
    typeof input.prompt === "string"
      ? input.prompt
      : typeof input.raw === "string"
        ? input.raw
        : "";

  return {
    kind: "milestone6_finalization",
    action,
    raw: typeof input.raw === "string" ? input.raw : prompt,
    prompt,
  };
}

function asMilestone6FinalizationParsedCommand(command: Milestone6FinalizationParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

async function executeMilestone6Finalization(
  command: Milestone6FinalizationParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const result = await executeMilestone6FinalizationCommand(command);

  return {
    ok: result.ok,
    title: "Milestone 6",
    message: result.summary,
    data: result.data,
  };
}

function readMilestone6BuildDepartmentCommand(input: unknown): Milestone6BuildDepartmentParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_build_department") {
    return null;
  }

  const action =
    input.action === "plan"
      ? "plan"
      : input.action === "generate"
        ? "generate"
        : input.action === "review"
          ? "review"
          : input.action === "repair"
            ? "repair"
            : input.action === "preview"
              ? "preview"
              : input.action === "full_pipeline"
                ? "full_pipeline"
                : "status";

  const prompt =
    typeof input.prompt === "string"
      ? input.prompt
      : typeof input.raw === "string"
        ? input.raw
        : "";

  return {
    kind: "milestone6_build_department",
    action,
    raw: typeof input.raw === "string" ? input.raw : prompt,
    prompt,
  };
}

function asMilestone6BuildDepartmentParsedCommand(command: Milestone6BuildDepartmentParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

async function executeMilestone6BuildDepartment(
  command: Milestone6BuildDepartmentParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const result = await executeMilestone6BuildDepartmentCommand(command);

  return {
    ok: result.ok,
    title: "Build Department",
    message: result.summary,
    data: result.data,
  };
}

function readMilestone6PreviewCommand(input: unknown): Milestone6PreviewParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_preview_pack") {
    return null;
  }

  return {
    kind: "milestone6_preview_pack",
    action: "preview",
    target: "latest",
    raw: typeof input.raw === "string" ? input.raw : "",
    prompt: typeof input.prompt === "string" ? input.prompt : typeof input.raw === "string" ? input.raw : "",
  };
}

function asMilestone6PreviewParsedCommand(command: Milestone6PreviewParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

async function executeMilestone6Preview(
  command: Milestone6PreviewParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const result = await executeMilestone6PreviewCommand(command);

  return {
    ok: result.ok,
    title: "Vanilla preview pack",
    message: result.summary,
    data: result.data,
  };
}

function readMilestone6PackReviewCommand(input: unknown): Milestone6PackReviewParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_pack_review") {
    return null;
  }

  const action =
    input.action === "repair"
      ? "repair"
      : input.action === "inspect"
        ? "inspect"
        : "review";

  return {
    kind: "milestone6_pack_review",
    action,
    target: "latest",
    raw: typeof input.raw === "string" ? input.raw : "",
    prompt: typeof input.prompt === "string" ? input.prompt : typeof input.raw === "string" ? input.raw : "",
  };
}

function asMilestone6PackReviewParsedCommand(command: Milestone6PackReviewParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

async function executeMilestone6PackReview(
  command: Milestone6PackReviewParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const result = await executeMilestone6PackReviewCommand(command);

  return {
    ok: result.ok,
    title:
      command.action === "repair"
        ? "Scene pack repair"
        : command.action === "inspect"
          ? "Scene pack inspection"
          : "Scene pack review",
    message: result.summary,
    data: result.data,
  };
}

function readMilestone6ScenePackCommand(input: unknown): Milestone6ScenePackParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_scene_pack") {
    return null;
  }

  const action = input.action === "latest" ? "latest" : "generate";
  const prompt =
    typeof input.prompt === "string"
      ? input.prompt
      : typeof input.raw === "string"
        ? input.raw
        : typeof input.target === "string"
          ? input.target
          : "";

  return {
    kind: "milestone6_scene_pack",
    action,
    raw: typeof input.raw === "string" ? input.raw : prompt,
    prompt,
  };
}

function asMilestone6ScenePackParsedCommand(command: Milestone6ScenePackParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

async function executeMilestone6ScenePack(
  command: Milestone6ScenePackParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const result = await executeMilestone6ScenePackCommand(command);

  return {
    ok: result.ok,
    title: result.ok
      ? command.action === "latest"
        ? "Latest schematic pack"
        : "Scene pack exported"
      : command.action === "latest"
        ? "No latest schematic pack found"
        : "Scene pack export failed",
    message: result.summary,
    data: result.data,
  };
}

function isCreateMachinePreset(value: unknown): value is Milestone6CreateParsedCommand["preset"] {
  return value === "press_line" || value === "mixer_station" || value === "water_wheel_power";
}

function readMilestone6CreateCommand(input: unknown): Milestone6CreateParsedCommand | null {
  if (!isRecord(input)) {
    return null;
  }

  const kind = typeof input.kind === "string" ? input.kind : "";
  if (kind !== "milestone6_create_machine") {
    return null;
  }

  const preset =
    typeof input.preset === "string"
      ? input.preset
      : typeof input.target === "string"
        ? input.target
        : Array.isArray(input.args) && typeof input.args[0] === "string"
          ? input.args[0]
          : "";

  if (!isCreateMachinePreset(preset)) {
    return null;
  }

  return {
    kind: "milestone6_create_machine",
    preset,
    raw: typeof input.raw === "string" ? input.raw : "",
  };
}

function asMinecraftSchematicParsedCommand(command: Milestone6CreateParsedCommand): MinecraftSchematicParsedCommand {
  return command as unknown as MinecraftSchematicParsedCommand;
}

function formatCreateValidationIssueLines(
  result: ReturnType<typeof executeMilestone6CreateCommand>,
): string[] {
  if (result.validation.issues.length === 0) {
    return ["Validation issues: none"];
  }

  return [
    "Validation issues:",
    ...result.validation.issues.map((entry) => {
      const target = entry.target ? ` (${entry.target})` : "";
      const repairHint = entry.repairHint ? ` Repair: ${entry.repairHint}` : "";
      return `- [${entry.severity}] ${entry.code}${target}: ${entry.message}${repairHint}`;
    }),
  ];
}

function formatMilestone6CreateResult(
  result: ReturnType<typeof executeMilestone6CreateCommand>,
): MinecraftSchematicCommandResult {
  return {
    ok: result.ok,
    title: "Create mechanical graph generated",
    message: [
      result.summary,
      "",
      `Preset: ${result.preset}`,
      `Graph ID: ${result.graph.id}`,
      `Profile: ${result.graph.profileId}`,
      `Nodes: ${result.graph.nodes.length}`,
      `Connections: ${result.graph.connections.length}`,
      `Status: ${result.validation.status}`,
      "",
      "Flow hints:",
      ...result.graph.flowHints.map((hint) => `- ${hint}`),
      "",
      ...formatCreateValidationIssueLines(result),
      "",
      "M6-A fallback note: this is a mechanical graph and validation result only.",
    ].join("\n"),
    data: result,
  };
}

async function executeMilestone6CreateSchematic(
  command: Milestone6CreateParsedCommand,
): Promise<MinecraftSchematicCommandResult> {
  const createResult = executeMilestone6CreateCommand(command);

  if (!createResult.ok) {
    return formatMilestone6CreateResult(createResult);
  }

  const compileResult = compileCreateMachineGraph(createResult.graph, {
    prompt: command.raw || `generate create ${command.preset}`,
    command: command.raw || `generate create ${command.preset}`,
  });

  const artifacts = await exportCreateMechanicalArtifacts({
    buildId: compileResult.build.buildId,
    graph: createResult.graph,
    validation: createResult.validation,
    compileResult,
  });

  const schematicResult = await persistGeneratedBuild(
    compileResult.build,
    `Create ${command.preset} schematic`,
  );

  return {
    ...schematicResult,
    title: schematicResult.ok
      ? `Create ${command.preset} schematic generated`
      : `Create ${command.preset} schematic failed`,
    message: [
      schematicResult.message,
      "",
      "Create mechanical artifacts:",
      `- Mechanical Graph: ${artifacts.graphJsonPath}`,
      `- Create Validation: ${artifacts.validationJsonPath}`,
      `- Compile Report: ${artifacts.compileJsonPath}`,
      "",
      "Create graph summary:",
      `- Preset: ${createResult.preset}`,
      `- Graph ID: ${createResult.graph.id}`,
      `- Profile: ${createResult.graph.profileId}`,
      `- Nodes: ${createResult.graph.nodes.length}`,
      `- Connections: ${createResult.graph.connections.length}`,
      `- Status: ${createResult.validation.status}`,
      "",
      "Flow hints:",
      ...createResult.graph.flowHints.map((hint) => `- ${hint}`),
      "",
      ...formatCreateValidationIssueLines(createResult),
      "",
      "M6-B note: this is the first real Create graph-to-schematic compiler pass. Visual polish and stronger Create machine layouts come in M6-C.",
    ].join("\n"),
    data: {
      schematic: schematicResult.data,
      create: createResult,
      compile: {
        placementOffset: compileResult.placementOffset,
        bounds: compileResult.bounds,
        notes: compileResult.notes,
      },
      artifacts,
    },
  };
}

function readVersionLikeTextFromParsedInput(input: Record<string, unknown>): string | undefined {
  const candidates = [
    input.targetMinecraftVersion,
    input.minecraftVersionTarget,
    input.minecraftVersion,
    input.version,
    input.variant,
    input.target,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const parsed = parseMinecraftVersionTargetFromText(candidate);

    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function isVersionOnlyVariant(value: unknown): boolean {
  return typeof value === "string" && /^\d+\.\d+(?:\.\d+)?$/.test(value.trim());
}

function readTargetMinecraftVersionForParsedInput(
  input: Record<string, unknown>,
  raw: string,
): string | undefined {
  return (
    parseMinecraftVersionTargetFromText(raw) ??
    readVersionLikeTextFromParsedInput(input)
  );
}

function coerceMinecraftSchematicCommand(input: unknown): MinecraftSchematicParsedCommand {
  if (typeof input === "string") {
    return parseMinecraftSchematicCommandWithVersionSupport(input, parseMinecraftSchematicCommand);
  }

  if (!isRecord(input)) {
    return {
      kind: "unknown",
      raw: "",
      reason: "Invalid schematic command payload.",
    };
  }

  if (isRecord(input.parsedCommand)) {
    return coerceMinecraftSchematicCommand(input.parsedCommand);
  }

  if (isRecord(input.moduleCommand)) {
    return coerceMinecraftSchematicCommand(input.moduleCommand);
  }

  const raw =
    typeof input.raw === "string"
      ? input.raw
      : typeof input.normalized === "string"
        ? input.normalized
        : "";

  const kind =
    typeof input.kind === "string"
      ? input.kind
      : typeof input.action === "string"
        ? input.action
        : "";

  if (raw) {
    const versionAwareCommand = parseMinecraftSchematicCommandWithVersionSupport(
      raw,
      parseMinecraftSchematicCommand,
    );

    if (
      versionAwareCommand.kind === "validate-build-version" ||
      versionAwareCommand.kind === "convert-build-version" ||
      versionAwareCommand.kind === "version-parser-self-test" ||
      ((versionAwareCommand.kind === "generate-tower" ||
        versionAwareCommand.kind === "generate-structure" ||
        versionAwareCommand.kind === "generate-preset" ||
        versionAwareCommand.kind === "validate-latest") &&
        "targetMinecraftVersion" in versionAwareCommand &&
        typeof versionAwareCommand.targetMinecraftVersion === "string")
    ) {
      return versionAwareCommand;
    }
  }

  const milestone6FinalizationCommand = readMilestone6FinalizationCommand(input);
  if (milestone6FinalizationCommand) {
    return asMilestone6FinalizationParsedCommand(milestone6FinalizationCommand);
  }

  const milestone6BuildDepartmentCommand = readMilestone6BuildDepartmentCommand(input);
  if (milestone6BuildDepartmentCommand) {
    return asMilestone6BuildDepartmentParsedCommand(milestone6BuildDepartmentCommand);
  }

  const milestone6PreviewCommand = readMilestone6PreviewCommand(input);
  if (milestone6PreviewCommand) {
    return asMilestone6PreviewParsedCommand(milestone6PreviewCommand);
  }

  const milestone6PackReviewCommand = readMilestone6PackReviewCommand(input);
  if (milestone6PackReviewCommand) {
    return asMilestone6PackReviewParsedCommand(milestone6PackReviewCommand);
  }

  const milestone6ScenePackCommand = readMilestone6ScenePackCommand(input);
  if (milestone6ScenePackCommand) {
    return asMilestone6ScenePackParsedCommand(milestone6ScenePackCommand);
  }

  const milestone6CreateCommand = readMilestone6CreateCommand(input);
  if (milestone6CreateCommand) {
    return asMinecraftSchematicParsedCommand(milestone6CreateCommand);
  }

  if (kind === "status") {
    return { kind: "status", raw };
  }

  if (kind === "help") {
    return { kind: "help", raw };
  }

  if (kind === "milestone-status") {
    return { kind: "milestone-status", raw };
  }

  if (kind === "test-plan") {
    return { kind: "test-plan", raw };
  }

  if (kind === "list") {
    return { kind: "list", raw };
  }

  if (kind === "list-presets") {
    return {
      kind: "list-presets",
      category: typeof input.category === "string" ? input.category : undefined,
      tag: typeof input.tag === "string" ? input.tag : undefined,
      raw,
    };
  }

  if (kind === "list-profiles" || kind === "profiles") {
    return { kind: "list-profiles", raw };
  }

  if (kind === "show-profile") {
    const profileId = normalizeBlockRegistryProfileId(typeof input.profileId === "string" ? input.profileId : typeof input.target === "string" ? input.target : undefined);
    return { kind: "show-profile", profileId, raw };
  }

  if (kind === "search-presets" || kind === "search") {
    const query = typeof input.query === "string" ? input.query : typeof input.target === "string" ? input.target : raw;
    return query
      ? { kind: "search-presets", query, raw }
      : { kind: "unknown", raw, reason: "Missing schematic preset search query." };
  }

  if (kind === "recommend-preset" || kind === "recommend") {
    const query = typeof input.query === "string" ? input.query : typeof input.target === "string" ? input.target : raw;
    return query
      ? { kind: "recommend-preset", query, raw }
      : { kind: "unknown", raw, reason: "Missing schematic preset recommendation query." };
  }

  if (kind === "show-preset") {
    const presetId = typeof input.presetId === "string" ? input.presetId : typeof input.target === "string" ? input.target : "";
    return presetId
      ? { kind: "show-preset", presetId, raw }
      : { kind: "unknown", raw, reason: "Missing schematic preset id for show command." };
  }

  if (kind === "generate-preset") {
    const presetId = typeof input.presetId === "string" ? input.presetId : typeof input.target === "string" ? input.target : "";
    return presetId
      ? { kind: "generate-preset", presetId, raw }
      : { kind: "unknown", raw, reason: "Missing schematic preset id for generate preset command." };
  }

  if (kind === "open-folder" || kind === "open") {
    const target = typeof input.target === "string" ? input.target : "";
    const buildId = typeof input.buildId === "string" ? input.buildId : target && target !== "folder" && target !== "latest" ? target : undefined;
    return { kind: "open-folder", buildId, latest: target === "latest", raw };
  }

  if (kind === "review-latest" || (kind === "review" && input.target === "latest")) {
    return { kind: "review-latest", raw };
  }

  if (kind === "review-build") {
    const buildId = typeof input.buildId === "string" ? input.buildId : "";
    return buildId
      ? { kind: "review-build", buildId, raw }
      : { kind: "unknown", raw, reason: "Missing schematic build id for review command." };
  }

  if (kind === "review" && typeof input.target === "string" && input.target !== "latest") {
    return { kind: "review-build", buildId: input.target, raw };
  }

  if (kind === "show-latest" || (kind === "show" && input.target === "latest")) {
    return { kind: "show-latest", raw };
  }

  if (kind === "show-build" || (kind === "show" && typeof input.target === "string" && input.target !== "latest")) {
    const buildId = typeof input.buildId === "string" ? input.buildId : typeof input.target === "string" ? input.target : "";
    return buildId
      ? { kind: "show-build", buildId, raw }
      : { kind: "unknown", raw, reason: "Missing schematic build id for show command." };
  }

  if (kind === "validate-latest" || (kind === "validate" && input.target === "latest")) {
    return { kind: "validate-latest", raw };
  }

  if (kind === "generate-tower" || (kind === "generate" && input.target === "tower")) {
    const targetMinecraftVersion = readTargetMinecraftVersionForParsedInput(input, raw);
    const variant = isVersionOnlyVariant(input.variant)
      ? "default"
      : (typeof input.variant === "string" ? input.variant : "default");

    return {
      kind: "generate-tower",
      variant: variant as TowerVariant,
      presetId: typeof input.presetId === "string" ? input.presetId : undefined,
      targetMinecraftVersion,
      profile: typeof input.profile === "string" ? input.profile : undefined,
      allowModdedBlocks: typeof input.allowModdedBlocks === "boolean" ? input.allowModdedBlocks : undefined,
      fallbackToVanilla: typeof input.fallbackToVanilla === "boolean" ? input.fallbackToVanilla : undefined,
      raw,
    };
  }

  if (kind === "generate-structure" || kind === "generate") {
    const targetMinecraftVersion = readTargetMinecraftVersionForParsedInput(input, raw);
    const variant = isVersionOnlyVariant(input.variant)
      ? "default"
      : (typeof input.variant === "string" ? input.variant : "default");

    return {
      kind: "generate-structure",
      generator: coerceGenerator(input.generator ?? input.target),
      variant,
      presetId: typeof input.presetId === "string" ? input.presetId : undefined,
      prompt: typeof input.prompt === "string" ? input.prompt : raw,
      targetMinecraftVersion,
      profile: typeof input.profile === "string" ? input.profile : undefined,
      allowModdedBlocks: typeof input.allowModdedBlocks === "boolean" ? input.allowModdedBlocks : undefined,
      fallbackToVanilla: typeof input.fallbackToVanilla === "boolean" ? input.fallbackToVanilla : undefined,
      raw,
    };
  }

  if (isSchematicInput(raw)) {
    return parseMinecraftSchematicCommand(raw);
  }

  return {
    kind: "unknown",
    raw,
    reason: "Unknown schematic command payload.",
  };
}


function executeMilestoneStatus(): MinecraftSchematicCommandResult {
  return {
    ok: true,
    title: "Milestone 5 closeout status",
    message: [
      "Milestone 5 — SirioCraft Utility",
      "Status: V1.6C closeout ready",
      "Overall: complete after final regression tests pass in the local repo and Minecraft/Create client.",
      "",
      "Completed:",
      "- V1.1 structure generators: house, bridge, gatehouse, factory, train station, outpost",
      "- V1.2 industrial/factory variants and roof integrity fixes",
      "- V1.3 review UI and file actions",
      "- V1.4 block entities, metadata, and vault notes",
      "- V1.5 SirioCraft preset library, search, recommendation, direct preset generation",
      "- V1.6 block registry profiles, vanilla fallback, and conservative Create block support",
      "",
      "Final checks:",
      "- Run schematic test plan",
      "- Generate and validate all major presets",
      "- Confirm vanilla presets stay minecraft:* only",
      "- Confirm Create-aware presets use siriocraft-create and include create:* palette entries",
      "- Import at least one Create factory schematic into a Create-enabled Minecraft test world",
    ].join("\n"),
    data: {
      milestone: 5,
      version: "1.6C",
      status: "closeout-ready",
    },
  };
}

function executeMilestoneTestPlan(): MinecraftSchematicCommandResult {
  const generationTests = [
    "generate minecraft schematic preset small_house",
    "generate minecraft schematic preset town_bridge",
    "generate minecraft schematic preset faction_gatehouse",
    "generate minecraft schematic preset ruined_outpost",
    "generate minecraft schematic preset train_station_small",
    "generate minecraft schematic preset create_starter_factory",
    "generate minecraft schematic preset machine_house",
    "generate minecraft schematic preset industrial_storage_yard",
    "generate minecraft schematic preset pipeworks_yard",
    "generate minecraft schematic: a small faction checkpoint",
    "generate minecraft schematic: railway loading factory",
  ];

  const commandTests = [
    "schematic list presets",
    "schematic search presets factory",
    "schematic recommend preset small faction checkpoint",
    "schematic list profiles",
    "schematic show profile vanilla",
    "schematic show profile siriocraft-create",
    "schematic show latest",
    "schematic validate latest",
    "schematic review latest",
    "schematic open folder latest",
  ];

  return {
    ok: true,
    title: "Milestone 5 final test plan",
    message: [
      "Run these tests after applying V1.6C.",
      "",
      "Generation regression tests:",
      ...generationTests.map((command) => `- ${command}`),
      "",
      "After each generated schematic:",
      "- schematic validate latest",
      "- schematic review latest",
      "- Check metadata/vault note exists",
      "",
      "Command/workflow tests:",
      ...commandTests.map((command) => `- ${command}`),
      "",
      "Expected pass conditions:",
      "- npm run build or npm run typecheck passes",
      "- all major presets generate valid .schem files",
      "- review page loads for generated builds",
      "- downloads/actions still work",
      "- vanilla presets do not include create:* blocks",
      "- Create-aware industrial presets use profile siriocraft-create and include supported create:* blocks",
      "- unsupported block count remains 0 for shipped presets",
    ].join("\n"),
    data: {
      generationTests,
      commandTests,
    },
  };
}

export async function executeMinecraftSchematicCommand(
  inputOrCommand: unknown,
): Promise<MinecraftSchematicCommandResult> {
  const command = enrichMinecraftSchematicParsedCommandWithVersion(
    coerceMinecraftSchematicCommand(inputOrCommand),
    inputOrCommand,
  );

  const parsedCommandKind = getParsedCommandKind(command);

  if (
    parsedCommandKind === "schematic-library" ||
    parsedCommandKind === "schematic-library-error"
  ) {
    const libraryResult = await executeSchematicLibraryCommand(
      command as unknown as SchematicLibraryExecutableCommand,
    );

    return {
      ok: libraryResult.ok,
      title: libraryResult.title,
      message: libraryResult.message,
      data: libraryResult.data,
    } as unknown as Awaited<ReturnType<typeof executeMinecraftSchematicCommand>>;
  }

  const milestone6FinalizationCommand = readMilestone6FinalizationCommand(command);
  if (milestone6FinalizationCommand) {
    return executeMilestone6Finalization(milestone6FinalizationCommand);
  }

  const milestone6BuildDepartmentCommand = readMilestone6BuildDepartmentCommand(command);
  if (milestone6BuildDepartmentCommand) {
    return executeMilestone6BuildDepartment(milestone6BuildDepartmentCommand);
  }

  const milestone6PreviewCommand = readMilestone6PreviewCommand(command);
  if (milestone6PreviewCommand) {
    return executeMilestone6Preview(milestone6PreviewCommand);
  }

  const milestone6PackReviewCommand = readMilestone6PackReviewCommand(command);
  if (milestone6PackReviewCommand) {
    return executeMilestone6PackReview(milestone6PackReviewCommand);
  }

  const milestone6ScenePackCommand = readMilestone6ScenePackCommand(command);
  if (milestone6ScenePackCommand) {
    return executeMilestone6ScenePack(milestone6ScenePackCommand);
  }

  const milestone6CreateCommand = readMilestone6CreateCommand(command);

  if (milestone6CreateCommand) {
    return executeMilestone6CreateSchematic(milestone6CreateCommand);
  }

  switch (command.kind) {
    case "status":
      return {
        ok: true,
        title: "Minecraft schematic module status",
        message:
          "Minecraft schematic module is online. Milestone 5 V1.6C is the closeout build: SirioCraft preset catalog, prompt-routed structures, industrial presets, review actions, downloads, folder opening, .schem export, vault reports, basic block entity NBT, block registry validation/fallbacks, conservative Create block output, and final milestone test-plan commands are available.",
      };

    case "help":
      return {
        ok: true,
        title: "Minecraft schematic help",
        message: helpMessage(),
      };

    case "milestone-status":
      return executeMilestoneStatus();

    case "test-plan":
      return executeMilestoneTestPlan();

    case "generate-tower":
      return executeGenerateTower(command);

    case "generate-structure":
      return executeGenerateStructure(command);

    case "generate-preset":
      return executeGeneratePreset(command);

    case "show-latest":
      return executeShowLatest();

    case "show-build":
      return executeShowBuild(command.buildId);

    case "show-preset":
      return executeShowPreset(command);

    case "validate-latest":
      return executeValidateLatest();

    case "validate-build-version":
      return executeValidateBuildVersion(command);

    case "convert-build-version":
      return executeConvertBuildVersion(command);

    case "version-parser-self-test":
      return executeVersionParserSelfTest();

    case "list":
      return executeList();

    case "list-presets":
      return executeListPresets(command);

    case "list-profiles":
      return executeListProfiles();

    case "show-profile":
      return executeShowProfile(command);

    case "search-presets":
      return executeSearchPresets(command);

    case "recommend-preset":
      return executeRecommendPreset(command);

    case "open-folder":
      return executeOpenFolder(command);

    case "review-latest":
      return executeReviewLatest();

    case "review-build":
      return executeReviewBuild(command.buildId);

    case "unknown":
      return {
        ok: false,
        title: "Unknown schematic command",
        message: command.reason,
      };

    default:
      return {
        ok: false,
        title: "Unhandled schematic command",
        message: "The schematic command parser returned an unsupported command kind.",
      };
  }
}

export async function executeParsedMinecraftSchematicCommand(
  command: unknown,
): Promise<MinecraftSchematicCommandResult> {
  return executeMinecraftSchematicCommand(command);
}
