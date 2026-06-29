import type { ExportScenePlanPackResult } from "./types";

export function renderScenePackSummary(result: ExportScenePlanPackResult): string {
  const lines = [
    "Scene pack exported",
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
    `- Vault Note Folder: ${result.paths.vaultDirectory}`,
    "",
    "Planned schematics:",
    ...result.manifest.structures
      .sort((left, right) => left.priority - right.priority)
      .map((structure) => `- ${structure.schematicName} (${structure.displayName})`),
    "",
    "M6-E note: this creates the scene-pack filesystem contract. M6-F will compile the planned schematic slots into real `.schem` files.",
  ];

  return lines.join("\n");
}
