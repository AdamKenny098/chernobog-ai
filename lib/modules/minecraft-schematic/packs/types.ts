import type { SchematicScenePlan, SceneStructurePlan } from "../scenes/types";

export type ScenePackStatus = "planned" | "partial" | "generated" | "failed";

export type ScenePackStructureExport = {
  structureId: string;
  displayName: string;
  kind: SceneStructurePlan["kind"];
  schematicName: string;
  plannedSchematicPath: string;
  manifestPath: string;
  generatorHint: string;
  priority: number;
  status: "planned" | "generated" | "skipped" | "failed";
  warnings: string[];
};

export type ScenePackExportPaths = {
  packRoot: string;
  packJson: string;
  latestJson: string;
  placementGuide: string;
  terrainMetadata: string;
  structuresDirectory: string;
  schematicsDirectory: string;
  metadataDirectory: string;
  createDirectory: string;
  vaultDirectory: string;
  readme: string;
  serverInstructions: string;
};

export type ScenePackManifest = {
  packId: string;
  createdAt: string;
  status: ScenePackStatus;
  prompt: string;
  sceneType: SchematicScenePlan["sceneType"];
  biomeHint: SchematicScenePlan["biomeHint"];
  scale: SchematicScenePlan["scale"];
  styleProfile: string;
  purpose: string;
  structureCount: number;
  plannedSchematicCount: number;
  generatedSchematicCount: number;
  outputRoot: string;
  structures: ScenePackStructureExport[];
  warnings: string[];
  notes: string[];
};

export type ExportScenePlanPackOptions = {
  outputRoot?: string;
  writeLatest?: boolean;
};

export type ExportScenePlanPackResult = {
  ok: boolean;
  packId: string;
  status: ScenePackStatus;
  plan: SchematicScenePlan;
  manifest: ScenePackManifest;
  paths: ScenePackExportPaths;
  summary: string;
};
