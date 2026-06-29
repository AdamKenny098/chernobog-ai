import type { ExportScenePlanPackResult } from "./types";

export function renderCompiledScenePackSummary(result: ExportScenePlanPackResult): string {
  return [
    "Scene pack generated",
    "",
    `Pack ID: ${result.packId}`,
    `Status: ${result.status}`,
    `Scene type: ${result.manifest.sceneType}`,
    `Biome: ${result.manifest.biomeHint}`,
    `Scale: ${result.manifest.scale}`,
    `Structures planned: ${result.manifest.structureCount}`,
    `Generated schematics: ${result.manifest.generatedSchematicCount}`,
    "",
    "Files:",
    `- Pack JSON: ${result.paths.packJson}`,
    `- Placement Guide: ${result.paths.placementGuide}`,
    `- Terrain Metadata: ${result.paths.terrainMetadata}`,
    `- README: ${result.paths.readme}`,
    `- Server Instructions: ${result.paths.serverInstructions}`,
    `- Schematics Folder: ${result.paths.schematicsDirectory}`,
    `- Metadata Folder: ${result.paths.metadataDirectory}`,
    `- Vault Note Folder: ${result.paths.vaultDirectory}`,
    "",
    "Generated / planned schematics:",
    ...result.manifest.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure) => `- ${structure.schematicName} (${structure.displayName}) — ${structure.status}`),
    "",
    "M6-F note: planned scene slots now compile into real `.schem` files. M6-G should add review UI and repair actions for packs.",
  ].join("\n");
}
