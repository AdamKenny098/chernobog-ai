import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeBlockEntitiesForBuild } from "../block-entities/blockEntitySupport";
import { applyBlockRegistryToBuild } from "../block-registry/blockRegistry";
import { exportDebugJson } from "../exporters/exportDebugJson";
import { exportSchem, validateSchemFile } from "../exporters/exportSchem";
import type { GeneratedSchematicBuild } from "../types";
import { validateGeneratedBuild } from "../validation/validateGeneratedBuild";
import { writeScenePlacementGuide } from "../scenes/writeScenePlacementGuide";
import type { SchematicScenePlan } from "../scenes/types";
import { compileScenePlanStructures } from "./compileScenePlanStructures";
import { exportScenePlanPack } from "./exportScenePlanPack";
import type { ExportScenePlanPackOptions, ExportScenePlanPackResult, ScenePackManifest } from "./types";

type StructureExportStatus = "generated" | "failed";

type StructureGenerationRecord = {
  structureId: string;
  buildId: string;
  schematicName: string;
  status: StructureExportStatus;
  schemPath: string;
  debugJsonPath: string;
  metadataJsonPath: string;
  validationOk: boolean;
  readBackOk: boolean;
  errors: string[];
  warnings: string[];
};

function toAbs(relativeOrAbsolute: string): string {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(process.cwd(), relativeOrAbsolute);
}

function toRel(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readManifest(packJsonPath: string): Promise<ScenePackManifest> {
  return JSON.parse(await readFile(packJsonPath, "utf8")) as ScenePackManifest;
}

function createStructureMetadata(
  plan: SchematicScenePlan,
  build: GeneratedSchematicBuild,
  record: StructureGenerationRecord,
): unknown {
  return {
    packId: plan.id,
    structureId: record.structureId,
    buildId: record.buildId,
    displayName: build.displayName ?? build.buildId,
    generatorName: build.generatorName,
    variant: build.variant,
    profile: build.profile,
    size: build.size,
    blockCount: build.blockCount,
    palette: build.palette,
    features: build.features ?? [],
    files: {
      schemPath: record.schemPath,
      debugJsonPath: record.debugJsonPath,
      metadataJsonPath: record.metadataJsonPath,
    },
    validation: {
      ok: record.validationOk,
      readBackOk: record.readBackOk,
      errors: record.errors,
      warnings: record.warnings,
    },
    buildReport: build.buildReport,
  };
}

async function exportOneStructure(
  plan: SchematicScenePlan,
  packRoot: string,
  structureId: string,
  schematicName: string,
  rawBuild: GeneratedSchematicBuild,
): Promise<StructureGenerationRecord> {
  const registryBuild = applyBlockRegistryToBuild(rawBuild);
  const normalized = normalizeBlockEntitiesForBuild(registryBuild);
  const build = normalized.build;
  const validation = validateGeneratedBuild(build);

  const schemPathAbs = path.join(packRoot, "schematics", schematicName);
  const debugPathAbs = path.join(packRoot, "metadata", `${structureId}.debug.json`);
  const metadataPathAbs = path.join(packRoot, "metadata", `${structureId}.metadata.json`);

  await mkdir(path.dirname(schemPathAbs), { recursive: true });
  await mkdir(path.dirname(debugPathAbs), { recursive: true });

  const baseRecord: StructureGenerationRecord = {
    structureId,
    buildId: build.buildId,
    schematicName,
    status: validation.ok ? "generated" : "failed",
    schemPath: toRel(schemPathAbs),
    debugJsonPath: toRel(debugPathAbs),
    metadataJsonPath: toRel(metadataPathAbs),
    validationOk: validation.ok,
    readBackOk: false,
    errors: [...validation.errors],
    warnings: [
      ...validation.warnings,
      ...(build.unsupportedBlockWarnings ?? []),
    ],
  };

  await exportDebugJson(build, validation, debugPathAbs);

  if (!validation.ok) {
    await writeJson(metadataPathAbs, createStructureMetadata(plan, build, baseRecord));
    return baseRecord;
  }

  await exportSchem(build, schemPathAbs);
  const readBack = await validateSchemFile(schemPathAbs, build.minecraftVersion);

  const finalRecord: StructureGenerationRecord = {
    ...baseRecord,
    status: readBack.ok ? "generated" : "failed",
    readBackOk: readBack.ok,
    errors: readBack.ok ? baseRecord.errors : [...baseRecord.errors, readBack.message],
  };

  await writeJson(metadataPathAbs, createStructureMetadata(plan, build, finalRecord));

  return finalRecord;
}

function renderGeneratedIndex(records: StructureGenerationRecord[]): string {
  return [
    "# Generated Schematics",
    "",
    ...records.map((record) => [
      `## ${record.schematicName}`,
      "",
      `- Structure ID: ${record.structureId}`,
      `- Build ID: ${record.buildId}`,
      `- Status: ${record.status}`,
      `- Schematic: ${record.schemPath}`,
      `- Metadata: ${record.metadataJsonPath}`,
      `- Debug: ${record.debugJsonPath}`,
      `- Validation: ${record.validationOk ? "passed" : "failed"}`,
      `- Read-back: ${record.readBackOk ? "passed" : "failed"}`,
      "",
    ].join("\n")),
  ].join("\n");
}

function renderGeneratedVaultNote(plan: SchematicScenePlan, records: StructureGenerationRecord[]): string {
  const generated = records.filter((record) => record.status === "generated").length;

  return [
    "---",
    "type: minecraft-schematic-pack",
    `pack_id: "${plan.id}"`,
    `status: "${generated === records.length ? "generated" : "partial"}"`,
    `scene_type: "${plan.sceneType}"`,
    `biome: "${plan.biomeHint}"`,
    `scale: "${plan.scale}"`,
    "---",
    "",
    `# ${plan.id}`,
    "",
    "## Prompt",
    "",
    plan.prompt,
    "",
    "## M6-F Generated Schematics",
    "",
    ...records.map((record) => `- ${record.schematicName}: ${record.status} (${record.schemPath})`),
    "",
    "## Notes",
    "",
    "- M6-F compiled planned scene slots into real schematic files.",
    "- M6-G should add review UI for packs and per-structure repair actions.",
    "",
  ].join("\n");
}

export async function exportCompiledScenePlanPack(
  plan: SchematicScenePlan,
  options: ExportScenePlanPackOptions = {},
): Promise<ExportScenePlanPackResult> {
  const planned = await exportScenePlanPack(plan, {
    ...options,
    writeLatest: false,
  });

  const packRoot = toAbs(planned.paths.packRoot);
  const compiledStructures = compileScenePlanStructures(plan);
  const records: StructureGenerationRecord[] = [];

  for (const compiled of compiledStructures) {
    const record = await exportOneStructure(
      plan,
      packRoot,
      compiled.structure.id,
      compiled.structure.schematicName,
      compiled.build,
    );

    records.push(record);
  }

  const packJsonAbs = toAbs(planned.paths.packJson);
  const manifest = await readManifest(packJsonAbs);
  const generatedCount = records.filter((record) => record.status === "generated").length;
  const status = generatedCount === records.length ? "generated" : generatedCount > 0 ? "partial" : "failed";

  const updatedManifest: ScenePackManifest = {
    ...manifest,
    status,
    generatedSchematicCount: generatedCount,
    structures: manifest.structures.map((structure) => {
      const record = records.find((entry) => entry.structureId === structure.structureId);

      if (!record) {
        return structure;
      }

      return {
        ...structure,
        status: record.status,
        plannedSchematicPath: record.schemPath,
        warnings: [
          ...structure.warnings,
          ...record.warnings,
          ...record.errors,
        ],
      };
    }),
    warnings: [
      ...manifest.warnings,
      ...records.flatMap((record) => record.errors.map((error) => `${record.structureId}: ${error}`)),
    ],
    notes: [
      ...manifest.notes,
      `M6-F generated ${generatedCount}/${records.length} planned schematic file(s).`,
    ],
  };

  await writeJson(packJsonAbs, updatedManifest);
  await writeJson(path.join(packRoot, "metadata", "generation-report.json"), {
    packId: plan.id,
    status,
    generatedCount,
    total: records.length,
    records,
  });
  await writeFile(path.join(packRoot, "schematics", "README.md"), renderGeneratedIndex(records), "utf8");
  await writeFile(path.join(packRoot, "placement-guide.md"), writeScenePlacementGuide(plan), "utf8");
  await writeFile(path.join(packRoot, "vault", `${plan.id}.md`), renderGeneratedVaultNote(plan, records), "utf8");

  if (options.writeLatest ?? true) {
    await writeJson(toAbs(planned.paths.latestJson), {
      packId: updatedManifest.packId,
      status: updatedManifest.status,
      outputRoot: updatedManifest.outputRoot,
      createdAt: updatedManifest.createdAt,
      sceneType: updatedManifest.sceneType,
      biomeHint: updatedManifest.biomeHint,
      scale: updatedManifest.scale,
      structureCount: updatedManifest.structureCount,
      generatedSchematicCount: updatedManifest.generatedSchematicCount,
      packJson: planned.paths.packJson,
    });
  }

  return {
    ...planned,
    ok: status !== "failed",
    status,
    manifest: updatedManifest,
    summary: [
      `Scene pack generated: ${plan.id}`,
      `Status: ${status}`,
      `Scene type: ${plan.sceneType}`,
      `Biome: ${plan.biomeHint}`,
      `Structures generated: ${generatedCount}/${records.length}`,
      `Output root: ${updatedManifest.outputRoot}`,
      `Placement guide: ${planned.paths.placementGuide}`,
      `Pack metadata: ${planned.paths.packJson}`,
    ].join("\n"),
  };
}
