export type SceneType =
  | "village"
  | "outpost"
  | "factory_yard"
  | "train_depot"
  | "faction_camp"
  | "spawn_marketplace"
  | "ruined_settlement";

export type SceneScale = "small" | "medium" | "large" | "server_spawn";

export type SceneBiomeHint =
  | "plains"
  | "forest"
  | "mountain"
  | "snowy_mountain"
  | "desert"
  | "swamp"
  | "coastal"
  | "nether"
  | "unknown";

export type SceneStructureKind =
  | "central_tower"
  | "train_stop"
  | "factory_shell"
  | "storage_yard"
  | "road_segment"
  | "decorations"
  | "gatehouse"
  | "barracks"
  | "warehouse"
  | "market_stalls"
  | "campfire_ring"
  | "ruined_house"
  | "watchtower"
  | "machine_module";

export type SceneOrientation = "north" | "south" | "east" | "west";

export type SceneVector2 = { x: number; z: number };
export type SceneBounds2 = { min: SceneVector2; max: SceneVector2 };

export type SceneStructurePlan = {
  id: string;
  kind: SceneStructureKind;
  displayName: string;
  origin: SceneVector2;
  size: SceneVector2;
  orientation: SceneOrientation;
  priority: number;
  generatorHint: string;
  schematicName: string;
  purpose: string;
  dependencies: string[];
  tags: string[];
  createMachinePreset?: "press_line" | "mixer_station" | "water_wheel_power";
  placementNotes: string[];
};

export type SceneRoadPlan = {
  id: string;
  fromStructureId: string;
  toStructureId: string;
  width: number;
  materialRole: "main_path" | "factory_path" | "rail_path" | "ruined_path";
  waypoints: SceneVector2[];
};

export type SceneZonePlan = {
  id: string;
  label: string;
  kind: "core" | "industrial" | "transport" | "storage" | "housing" | "defense" | "market" | "ruins";
  bounds: SceneBounds2;
  notes: string[];
};

export type TerrainPlacementPlan = {
  recommendedPasteOrigin: { x: number; y: number; z: number };
  foundationDepth: number;
  terrainFlatteningBounds: SceneBounds2;
  supportStilts: boolean;
  basementFill: boolean;
  biomeDressingHints: string[];
};

export type SceneExportPlan = {
  packId: string;
  outputRoot: string;
  schematicNames: string[];
  includeReadme: boolean;
  includePlacementGuide: boolean;
  includeVaultNote: boolean;
  includeServerInstructions: boolean;
};

export type SchematicScenePlan = {
  id: string;
  prompt: string;
  sceneType: SceneType;
  biomeHint: SceneBiomeHint;
  scale: SceneScale;
  styleProfile: string;
  purpose: string;
  centralLandmarkId?: string;
  structures: SceneStructurePlan[];
  roads: SceneRoadPlan[];
  zones: SceneZonePlan[];
  terrain: TerrainPlacementPlan;
  exports: SceneExportPlan;
  warnings: string[];
  notes: string[];
};

export type ScenePlannerOptions = {
  id?: string;
  prompt: string;
  sceneType?: SceneType;
  biomeHint?: SceneBiomeHint;
  scale?: SceneScale;
  styleProfile?: string;
};
