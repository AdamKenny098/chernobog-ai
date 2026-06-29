import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SchematicScenePlan, SceneStructurePlan } from "../scenes/types";
import { writeScenePlacementGuide } from "../scenes/writeScenePlacementGuide";
import type {
  ExportScenePlanPackOptions,
  ExportScenePlanPackResult,
  ScenePackExportPaths,
  ScenePackManifest,
  ScenePackStructureExport,
} from "./types";

function toProjectPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function toRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createPackPaths(plan: SchematicScenePlan, options: ExportScenePlanPackOptions): ScenePackExportPaths {
  const packRoot = options.outputRoot
    ? path.isAbsolute(options.outputRoot)
      ? options.outputRoot
      : toProjectPath(options.outputRoot)
    : toProjectPath("exports", "schematic-packs", plan.id);

  return {
    packRoot,
    packJson: path.join(packRoot, "pack.json"),
    latestJson: toProjectPath("exports", "schematic-packs", "latest.json"),
    placementGuide: path.join(packRoot, "placement-guide.md"),
    terrainMetadata: path.join(packRoot, "terrain", "placement-metadata.json"),
    structuresDirectory: path.join(packRoot, "structures"),
    schematicsDirectory: path.join(packRoot, "schematics"),
    metadataDirectory: path.join(packRoot, "metadata"),
    createDirectory: path.join(packRoot, "create"),
    vaultDirectory: path.join(packRoot, "vault"),
    readme: path.join(packRoot, "README.md"),
    serverInstructions: path.join(packRoot, "server-instructions.md"),
  };
}

async function ensurePackDirectories(paths: ScenePackExportPaths): Promise<void> {
  await mkdir(paths.packRoot, { recursive: true });
  await mkdir(paths.structuresDirectory, { recursive: true });
  await mkdir(paths.schematicsDirectory, { recursive: true });
  await mkdir(paths.metadataDirectory, { recursive: true });
  await mkdir(paths.createDirectory, { recursive: true });
  await mkdir(path.dirname(paths.terrainMetadata), { recursive: true });
  await mkdir(paths.vaultDirectory, { recursive: true });
  await mkdir(path.dirname(paths.latestJson), { recursive: true });
}

function createStructureExport(
  structure: SceneStructurePlan,
  paths: ScenePackExportPaths,
): ScenePackStructureExport {
  const manifestPath = path.join(paths.structuresDirectory, `${structure.id}.structure-plan.json`);
  const plannedSchematicPath = path.join(paths.schematicsDirectory, structure.schematicName);

  return {
    structureId: structure.id,
    displayName: structure.displayName,
    kind: structure.kind,
    schematicName: structure.schematicName,
    plannedSchematicPath: toRelativePath(plannedSchematicPath),
    manifestPath: toRelativePath(manifestPath),
    generatorHint: structure.generatorHint,
    priority: structure.priority,
    status: "planned",
    warnings: [
      "M6-E exports the pack plan and folder structure. M6-F will wire real per-structure .schem generation into this slot.",
    ],
  };
}

function createManifest(
  plan: SchematicScenePlan,
  paths: ScenePackExportPaths,
  structures: ScenePackStructureExport[],
): ScenePackManifest {
  return {
    packId: plan.id,
    createdAt: new Date().toISOString(),
    status: "planned",
    prompt: plan.prompt,
    sceneType: plan.sceneType,
    biomeHint: plan.biomeHint,
    scale: plan.scale,
    styleProfile: plan.styleProfile,
    purpose: plan.purpose,
    structureCount: plan.structures.length,
    plannedSchematicCount: plan.structures.length,
    generatedSchematicCount: structures.filter((structure) => structure.status === "generated").length,
    outputRoot: toRelativePath(paths.packRoot),
    structures,
    warnings: [
      ...plan.warnings,
      "Pack contains deterministic structure manifests and placement metadata. Actual multi-schematic compilation is the M6-F target.",
    ],
    notes: [
      ...plan.notes,
      "M6-E created the build-pack filesystem contract.",
      "M6-F should replace planned schematic slots with actual .schem exports.",
    ],
  };
}

function renderReadme(plan: SchematicScenePlan, manifest: ScenePackManifest): string {
  return [
    `# ${plan.id}`,
    "",
    "## Summary",
    "",
    `- Status: ${manifest.status}`,
    `- Scene type: ${plan.sceneType}`,
    `- Biome: ${plan.biomeHint}`,
    `- Scale: ${plan.scale}`,
    `- Style profile: ${plan.styleProfile}`,
    "",
    "## Structures",
    "",
    ...manifest.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure) => `- ${structure.schematicName} — ${structure.displayName} (${structure.status})`),
    "",
    "## Notes",
    "",
    ...manifest.notes.map((note) => `- ${note}`),
    "",
  ].join("\n");
}

function renderServerInstructions(plan: SchematicScenePlan, manifest: ScenePackManifest): string {
  return [
    `# Server Instructions — ${plan.id}`,
    "",
    "## Intended Use",
    "",
    plan.purpose,
    "",
    "## Paste Flow",
    "",
    "1. Read `placement-guide.md`.",
    "2. Prepare terrain using `terrain/placement-metadata.json`.",
    "3. Paste structures in priority order once M6-F generates the actual `.schem` files.",
    "4. Dress the biome manually after paste.",
    "",
    "## Planned Paste Order",
    "",
    ...manifest.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure, index) => `${index + 1}. ${structure.schematicName} — ${structure.displayName}`),
    "",
    "## Current Limitation",
    "",
    "M6-E exports the pack folder and deterministic scene contracts. M6-F performs real multi-schematic compilation.",
    "",
  ].join("\n");
}

function renderVaultNote(plan: SchematicScenePlan, manifest: ScenePackManifest): string {
  return [
    "---",
    `type: minecraft-schematic-pack`,
    `pack_id: "${manifest.packId}"`,
    `status: "${manifest.status}"`,
    `scene_type: "${plan.sceneType}"`,
    `biome: "${plan.biomeHint}"`,
    `scale: "${plan.scale}"`,
    "---",
    "",
    `# ${manifest.packId}`,
    "",
    "## Prompt",
    "",
    plan.prompt,
    "",
    "## Pack Summary",
    "",
    `- Output root: ${manifest.outputRoot}`,
    `- Structures planned: ${manifest.structureCount}`,
    `- Schematics generated: ${manifest.generatedSchematicCount}`,
    "",
    "## Structures",
    "",
    ...manifest.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure) => `- ${structure.displayName}: ${structure.schematicName} (${structure.status})`),
    "",
    "## Next Step",
    "",
    "M6-F should compile each structure slot into actual schematic files.",
    "",
  ].join("\n");
}

async function writeStructureManifests(
  plan: SchematicScenePlan,
  paths: ScenePackExportPaths,
): Promise<ScenePackStructureExport[]> {
  const exports: ScenePackStructureExport[] = [];

  for (const structure of plan.structures) {
    const structureExport = createStructureExport(structure, paths);
    exports.push(structureExport);

    await writeJson(path.join(paths.structuresDirectory, `${structure.id}.structure-plan.json`), {
      packId: plan.id,
      structure,
      export: structureExport,
    });
  }

  await writeFile(
    path.join(paths.schematicsDirectory, "README.md"),
    [
      "# Planned Schematics",
      "",
      "M6-E creates this directory as the stable schematic output target.",
      "M6-F will replace the planned slots with actual `.schem` files.",
      "",
      "Planned files:",
      "",
      ...plan.structures
        .sort((left, right) => left.priority - right.priority)
        .map((structure) => `- ${structure.schematicName}`),
      "",
    ].join("\n"),
    "utf8",
  );

  return exports;
}

export async function exportScenePlanPack(
  plan: SchematicScenePlan,
  options: ExportScenePlanPackOptions = {},
): Promise<ExportScenePlanPackResult> {
  const paths = createPackPaths(plan, options);
  await ensurePackDirectories(paths);

  const structureExports = await writeStructureManifests(plan, paths);
  const manifest = createManifest(plan, paths, structureExports);

  await writeJson(paths.packJson, manifest);
  await writeFile(paths.placementGuide, writeScenePlacementGuide(plan), "utf8");
  await writeJson(paths.terrainMetadata, plan.terrain);
  await writeFile(paths.readme, renderReadme(plan, manifest), "utf8");
  await writeFile(paths.serverInstructions, renderServerInstructions(plan, manifest), "utf8");
  await writeFile(path.join(paths.vaultDirectory, `${plan.id}.md`), renderVaultNote(plan, manifest), "utf8");

  if (options.writeLatest ?? true) {
    await writeJson(paths.latestJson, {
      packId: manifest.packId,
      status: manifest.status,
      outputRoot: manifest.outputRoot,
      createdAt: manifest.createdAt,
      sceneType: manifest.sceneType,
      biomeHint: manifest.biomeHint,
      scale: manifest.scale,
      structureCount: manifest.structureCount,
      generatedSchematicCount: manifest.generatedSchematicCount,
      packJson: toRelativePath(paths.packJson),
    });
  }

  return {
    ok: true,
    packId: manifest.packId,
    status: manifest.status,
    plan,
    manifest,
    paths: {
      ...paths,
      packRoot: toRelativePath(paths.packRoot),
      packJson: toRelativePath(paths.packJson),
      latestJson: toRelativePath(paths.latestJson),
      placementGuide: toRelativePath(paths.placementGuide),
      terrainMetadata: toRelativePath(paths.terrainMetadata),
      structuresDirectory: toRelativePath(paths.structuresDirectory),
      schematicsDirectory: toRelativePath(paths.schematicsDirectory),
      metadataDirectory: toRelativePath(paths.metadataDirectory),
      createDirectory: toRelativePath(paths.createDirectory),
      vaultDirectory: toRelativePath(paths.vaultDirectory),
      readme: toRelativePath(paths.readme),
      serverInstructions: toRelativePath(paths.serverInstructions),
    },
    summary: [
      `Scene pack exported: ${manifest.packId}`,
      `Status: ${manifest.status}`,
      `Scene type: ${manifest.sceneType}`,
      `Biome: ${manifest.biomeHint}`,
      `Structures planned: ${manifest.structureCount}`,
      `Output root: ${manifest.outputRoot}`,
      `Placement guide: ${toRelativePath(paths.placementGuide)}`,
      `Pack metadata: ${toRelativePath(paths.packJson)}`,
    ].join("\n"),
  };
}
