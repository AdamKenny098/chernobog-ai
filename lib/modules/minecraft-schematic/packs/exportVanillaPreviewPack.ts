import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportDebugJson } from "../exporters/exportDebugJson";
import { exportSchem, validateSchemFile } from "../exporters/exportSchem";
import type { GeneratedSchematicBuild } from "../types";
import { validateGeneratedBuild } from "../validation/validateGeneratedBuild";
import { createVanillaPreviewBuild } from "./createVanillaPreviewBuild";
import { getLatestScenePack } from "./getLatestScenePack";
import type { ScenePackManifest } from "./types";

export type VanillaPreviewStructureRecord = {
  structureId: string;
  displayName: string;
  sourceSchematicName: string;
  previewSchematicName: string;
  sourceDebugJsonPath: string;
  previewSchematicPath: string;
  previewDebugJsonPath: string;
  previewMetadataJsonPath: string;
  status: "generated" | "failed";
  validationOk: boolean;
  readBackOk: boolean;
  replacementCount: number;
  replacements: Record<string, number>;
  errors: string[];
  warnings: string[];
};

export type VanillaPreviewPackResult = {
  ok: boolean;
  packId?: string;
  status: "generated" | "partial" | "failed";
  outputRoot?: string;
  previewRoot?: string;
  generatedPreviewCount: number;
  structureCount: number;
  records: VanillaPreviewStructureRecord[];
  summary: string;
  data?: unknown;
};

type LooseObject = Record<string, unknown>;

function isRecord(value: unknown): value is LooseObject {
  return typeof value === "object" && value !== null;
}

function toAbs(relativeOrAbsolute: string): string {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(process.cwd(), relativeOrAbsolute);
}

function toRel(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function extractGeneratedBuild(value: unknown): GeneratedSchematicBuild | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates = [
    value.build,
    value.generatedBuild,
    value.debugBuild,
    value.schematic,
    value,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    if (Array.isArray(candidate.blocks) && isRecord(candidate.size)) {
      return candidate as unknown as GeneratedSchematicBuild;
    }
  }

  return null;
}

function getStructureDebugPath(packRoot: string, structureId: string): string {
  return path.join(packRoot, "metadata", `${structureId}.debug.json`);
}

function getPreviewSchematicName(sourceName: string): string {
  return sourceName.endsWith(".schem")
    ? sourceName.replace(/\.schem$/u, ".preview.schem")
    : `${sourceName}.preview.schem`;
}

async function exportOnePreview(
  manifest: ScenePackManifest,
  packRoot: string,
  previewRoot: string,
  structureId: string,
  displayName: string,
  sourceSchematicName: string,
): Promise<VanillaPreviewStructureRecord> {
  const sourceDebugPath = getStructureDebugPath(packRoot, structureId);
  const previewSchematicName = getPreviewSchematicName(sourceSchematicName);
  const previewSchematicPath = path.join(previewRoot, "schematics", previewSchematicName);
  const previewDebugPath = path.join(previewRoot, "metadata", `${structureId}.preview.debug.json`);
  const previewMetadataPath = path.join(previewRoot, "metadata", `${structureId}.preview.metadata.json`);

  const sourceDebug = await readJson<unknown>(sourceDebugPath);
  const sourceBuild = extractGeneratedBuild(sourceDebug);

  if (!sourceBuild) {
    const record: VanillaPreviewStructureRecord = {
      structureId,
      displayName,
      sourceSchematicName,
      previewSchematicName,
      sourceDebugJsonPath: toRel(sourceDebugPath),
      previewSchematicPath: toRel(previewSchematicPath),
      previewDebugJsonPath: toRel(previewDebugPath),
      previewMetadataJsonPath: toRel(previewMetadataPath),
      status: "failed",
      validationOk: false,
      readBackOk: false,
      replacementCount: 0,
      replacements: {},
      errors: [`Could not read source build from ${toRel(sourceDebugPath)}.`],
      warnings: [],
    };

    await writeJson(previewMetadataPath, record);
    return record;
  }

  const preview = createVanillaPreviewBuild(sourceBuild);
  const validation = validateGeneratedBuild(preview.build);

  const recordBase: VanillaPreviewStructureRecord = {
    structureId,
    displayName,
    sourceSchematicName,
    previewSchematicName,
    sourceDebugJsonPath: toRel(sourceDebugPath),
    previewSchematicPath: toRel(previewSchematicPath),
    previewDebugJsonPath: toRel(previewDebugPath),
    previewMetadataJsonPath: toRel(previewMetadataPath),
    status: validation.ok ? "generated" : "failed",
    validationOk: validation.ok,
    readBackOk: false,
    replacementCount: preview.replacementCount,
    replacements: preview.replacements,
    errors: [...validation.errors],
    warnings: [
      ...validation.warnings,
      ...preview.notes,
      "This is a preview-only schematic. It is not the real modded/Create schematic.",
    ],
  };

  await mkdir(path.dirname(previewSchematicPath), { recursive: true });
  await mkdir(path.dirname(previewDebugPath), { recursive: true });
  await exportDebugJson(preview.build, validation, previewDebugPath);

  if (!validation.ok) {
    await writeJson(previewMetadataPath, recordBase);
    return recordBase;
  }

  await exportSchem(preview.build, previewSchematicPath);
  const readBack = await validateSchemFile(previewSchematicPath, preview.build.minecraftVersion);

  const finalRecord: VanillaPreviewStructureRecord = {
    ...recordBase,
    status: readBack.ok ? "generated" : "failed",
    readBackOk: readBack.ok,
    errors: readBack.ok ? recordBase.errors : [...recordBase.errors, readBack.message],
  };

  await writeJson(previewMetadataPath, {
    ...finalRecord,
    sourcePackId: manifest.packId,
    sourceOutputRoot: manifest.outputRoot,
    previewPurpose: "Browser/Schemat.io-compatible visual preview.",
  });

  return finalRecord;
}

function renderPreviewReadme(manifest: ScenePackManifest, records: VanillaPreviewStructureRecord[]): string {
  return [
    `# Vanilla Preview Pack — ${manifest.packId}`,
    "",
    "This folder contains preview-only schematics generated by M6-H.",
    "",
    "These files replace Create/modded blocks with approximate vanilla blocks so browser schematic viewers can open them.",
    "",
    "Do not use these as the final build files. Use the original pack schematics for real Minecraft/Create placement.",
    "",
    "## Preview Schematics",
    "",
    ...records.map((record) => `- ${record.previewSchematicName} — ${record.status}, replacements: ${record.replacementCount}`),
    "",
    "## Common Replacement Examples",
    "",
    "- Create shafts -> stripped logs",
    "- Create cogwheels -> copper blocks/cut copper",
    "- Create casings -> andesite/copper/deepslate",
    "- Create belts -> black wool",
    "- Create tracks -> rails",
    "- Water hints -> blue stained glass",
    "",
  ].join("\n");
}

function renderSummary(result: Omit<VanillaPreviewPackResult, "summary">): string {
  return [
    "Vanilla preview pack exported",
    "",
    `Pack ID: ${result.packId ?? "unknown"}`,
    `Status: ${result.status}`,
    `Output root: ${result.outputRoot ?? "unknown"}`,
    `Preview root: ${result.previewRoot ?? "unknown"}`,
    `Preview schematics generated: ${result.generatedPreviewCount}/${result.structureCount}`,
    "",
    "Preview files:",
    ...result.records.map((record) => `- ${record.previewSchematicName}: ${record.status}, replacements=${record.replacementCount}`),
    "",
    "Note:",
    "- These are browser-preview schematics only.",
    "- Use the original schematics for final Create-enabled Minecraft placement.",
  ].join("\n");
}

export async function exportLatestVanillaPreviewPack(): Promise<VanillaPreviewPackResult> {
  const latest = await getLatestScenePack();

  if (!latest) {
    const result = {
      ok: false,
      status: "failed" as const,
      generatedPreviewCount: 0,
      structureCount: 0,
      records: [],
      data: undefined,
    };

    return {
      ...result,
      summary: "No latest schematic pack found. Generate a scene pack first.",
    };
  }

  const manifest = await readJson<ScenePackManifest>(toAbs(latest.packJson));

  if (!manifest) {
    const result = {
      ok: false,
      packId: latest.packId,
      status: "failed" as const,
      outputRoot: latest.outputRoot,
      generatedPreviewCount: 0,
      structureCount: latest.structureCount,
      records: [],
      data: latest,
    };

    return {
      ...result,
      summary: `Could not read pack manifest: ${latest.packJson}`,
    };
  }

  const packRoot = toAbs(manifest.outputRoot);
  const previewRoot = path.join(packRoot, "vanilla-preview");
  await mkdir(path.join(previewRoot, "schematics"), { recursive: true });
  await mkdir(path.join(previewRoot, "metadata"), { recursive: true });

  const records: VanillaPreviewStructureRecord[] = [];

  for (const structure of manifest.structures) {
    const sourceSchematicPath = toAbs(structure.plannedSchematicPath);
    const sourceSchematicExists = await pathExists(sourceSchematicPath);

    if (!sourceSchematicExists) {
      records.push({
        structureId: structure.structureId,
        displayName: structure.displayName,
        sourceSchematicName: structure.schematicName,
        previewSchematicName: getPreviewSchematicName(structure.schematicName),
        sourceDebugJsonPath: toRel(getStructureDebugPath(packRoot, structure.structureId)),
        previewSchematicPath: toRel(path.join(previewRoot, "schematics", getPreviewSchematicName(structure.schematicName))),
        previewDebugJsonPath: toRel(path.join(previewRoot, "metadata", `${structure.structureId}.preview.debug.json`)),
        previewMetadataJsonPath: toRel(path.join(previewRoot, "metadata", `${structure.structureId}.preview.metadata.json`)),
        status: "failed",
        validationOk: false,
        readBackOk: false,
        replacementCount: 0,
        replacements: {},
        errors: [`Source schematic does not exist: ${structure.plannedSchematicPath}`],
        warnings: [],
      });
      continue;
    }

    records.push(await exportOnePreview(
      manifest,
      packRoot,
      previewRoot,
      structure.structureId,
      structure.displayName,
      structure.schematicName,
    ));
  }

  const generatedPreviewCount = records.filter((record) => record.status === "generated").length;
  const status: VanillaPreviewPackResult["status"] =
  generatedPreviewCount === records.length
    ? "generated"
    : generatedPreviewCount > 0
      ? "partial"
      : "failed";
      
  const data = {
    packId: manifest.packId,
    sourcePack: manifest.outputRoot,
    previewRoot: toRel(previewRoot),
    status,
    generatedPreviewCount,
    structureCount: records.length,
    records,
  };

  await writeJson(path.join(previewRoot, "preview-pack.json"), data);
  await writeJson(path.join(previewRoot, "metadata", "preview-report.json"), data);
  await writeFile(path.join(previewRoot, "README.md"), renderPreviewReadme(manifest, records), "utf8");

  const resultWithoutSummary = {
    ok: status !== "failed",
    packId: manifest.packId,
    status,
    outputRoot: manifest.outputRoot,
    previewRoot: toRel(previewRoot),
    generatedPreviewCount,
    structureCount: records.length,
    records,
    data,
  };

  return {
    ...resultWithoutSummary,
    summary: renderSummary(resultWithoutSummary),
  };
}
