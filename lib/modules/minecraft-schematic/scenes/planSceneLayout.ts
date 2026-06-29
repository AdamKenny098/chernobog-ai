import type {
  SceneBiomeHint,
  SceneBounds2,
  SceneExportPlan,
  ScenePlannerOptions,
  SceneRoadPlan,
  SceneScale,
  SceneStructurePlan,
  SceneType,
  SchematicScenePlan,
  TerrainPlacementPlan,
} from "./types";

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "scene";
}

function timestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function inferSceneType(prompt: string): SceneType {
  const text = prompt.toLowerCase();
  if (includesAny(text, ["factory yard", "factory", "industrial"])) return "factory_yard";
  if (includesAny(text, ["train depot", "depot", "train stop", "station"])) return "train_depot";
  if (includesAny(text, ["spawn market", "marketplace", "market"])) return "spawn_marketplace";
  if (includesAny(text, ["faction camp", "camp"])) return "faction_camp";
  if (includesAny(text, ["ruined", "ruins", "abandoned settlement"])) return "ruined_settlement";
  if (includesAny(text, ["village", "town", "hamlet"])) return "village";
  return "outpost";
}

export function inferBiomeHint(prompt: string): SceneBiomeHint {
  const text = prompt.toLowerCase();
  if (includesAny(text, ["snowy mountain", "snow mountain", "frozen peak"])) return "snowy_mountain";
  if (includesAny(text, ["mountain", "cliff", "stony peak", "peak"])) return "mountain";
  if (includesAny(text, ["desert", "sand", "badlands"])) return "desert";
  if (includesAny(text, ["swamp", "marsh"])) return "swamp";
  if (includesAny(text, ["coastal", "harbor", "sea", "ocean"])) return "coastal";
  if (includesAny(text, ["forest", "spruce", "taiga", "woods"])) return "forest";
  if (includesAny(text, ["nether"])) return "nether";
  if (includesAny(text, ["plains", "field"])) return "plains";
  return "unknown";
}

export function inferScale(prompt: string): SceneScale {
  const text = prompt.toLowerCase();
  if (includesAny(text, ["spawn", "server spawn", "hub"])) return "server_spawn";
  if (includesAny(text, ["large", "huge", "city", "district"])) return "large";
  if (includesAny(text, ["small", "starter", "compact"])) return "small";
  return "medium";
}

function createBounds(center: { x: number; z: number }, halfSize: { x: number; z: number }): SceneBounds2 {
  return { min: { x: center.x - halfSize.x, z: center.z - halfSize.z }, max: { x: center.x + halfSize.x, z: center.z + halfSize.z } };
}

function createRoad(id: string, fromStructureId: string, toStructureId: string, materialRole: SceneRoadPlan["materialRole"] = "main_path"): SceneRoadPlan {
  return { id, fromStructureId, toStructureId, width: materialRole === "rail_path" ? 5 : 3, materialRole, waypoints: [] };
}

function createBiomeDressingHints(biomeHint: SceneBiomeHint): string[] {
  switch (biomeHint) {
    case "mountain":
      return ["Use stone, deepslate, spruce, and andesite retaining walls.", "Allow some structures to sit on stilts instead of flattening the whole mountain.", "Add cliff-edge fences, warning signs, and support beams."];
    case "snowy_mountain":
      return ["Use spruce, deepslate, snow layers, lanterns, and covered paths.", "Add retaining walls and support stilts around exposed slopes.", "Avoid large flat plazas unless the server owner manually carves a plateau."];
    case "desert":
      return ["Use sandstone, cut sandstone, terracotta, and canvas awnings.", "Use fewer trees and more shade structures."];
    case "forest":
      return ["Use spruce/oak trim and hide support structures among trees.", "Add lantern paths and small clearings instead of one huge flattened area."];
    case "coastal":
      return ["Use retaining piers, dock posts, and waterline supports.", "Keep heavy buildings away from the lowest shoreline."];
    default:
      return ["Use local biome blocks for path edges, vegetation, and retaining walls.", "Keep major roads readable from above."];
  }
}

function createTerrainPlan(biomeHint: SceneBiomeHint, scale: SceneScale): TerrainPlacementPlan {
  const halfSize = scale === "server_spawn" ? 72 : scale === "large" ? 64 : scale === "small" ? 32 : 48;
  return {
    recommendedPasteOrigin: { x: 0, y: 72, z: 0 },
    foundationDepth: biomeHint === "mountain" || biomeHint === "snowy_mountain" ? 5 : 3,
    terrainFlatteningBounds: { min: { x: -halfSize, z: -halfSize }, max: { x: halfSize, z: halfSize } },
    supportStilts: biomeHint === "mountain" || biomeHint === "snowy_mountain" || biomeHint === "coastal",
    basementFill: biomeHint !== "coastal",
    biomeDressingHints: createBiomeDressingHints(biomeHint),
  };
}

function createExportPlan(sceneId: string, structures: SceneStructurePlan[]): SceneExportPlan {
  return { packId: sceneId, outputRoot: `exports/schematic-packs/${sceneId}`, schematicNames: structures.map((s) => s.schematicName), includeReadme: true, includePlacementGuide: true, includeVaultNote: true, includeServerInstructions: true };
}

function createFactoryYardStructures(): SceneStructurePlan[] {
  return [
    { id: "central_factory_shell", kind: "factory_shell", displayName: "Central Factory Shell", origin: { x: 0, z: 0 }, size: { x: 31, z: 25 }, orientation: "south", priority: 1, generatorHint: "factory", schematicName: "central_factory_shell.schem", purpose: "Main industrial shell for Create machinery and future processing lines.", dependencies: [], tags: ["industrial", "landmark", "create"], placementNotes: ["Paste this first. Roads and yard modules align around it."] },
    { id: "train_platform", kind: "train_stop", displayName: "Train Platform", origin: { x: -36, z: 0 }, size: { x: 37, z: 9 }, orientation: "east", priority: 2, generatorHint: "train_station", schematicName: "train_platform.schem", purpose: "Track-adjacent arrival point and cargo platform.", dependencies: ["central_factory_shell"], tags: ["transport", "train", "create"], placementNotes: ["Align long edge beside existing or planned Create track."] },
    { id: "storage_yard", kind: "storage_yard", displayName: "Storage Yard", origin: { x: 34, z: 4 }, size: { x: 23, z: 19 }, orientation: "west", priority: 3, generatorHint: "storage_yard", schematicName: "storage_yard.schem", purpose: "Crates, depots, barrels, yard lanes, and raw material staging.", dependencies: ["central_factory_shell"], tags: ["storage", "yard"], placementNotes: ["Keep this near the factory output side."] },
    { id: "press_line_module", kind: "machine_module", displayName: "Press Line Module", origin: { x: 3, z: -22 }, size: { x: 15, z: 11 }, orientation: "south", priority: 4, generatorHint: "create_press_line", schematicName: "press_line_module.schem", purpose: "First functional Create machine module for the factory yard.", dependencies: ["central_factory_shell"], tags: ["create", "machine", "press"], createMachinePreset: "press_line", placementNotes: ["Can be pasted inside the factory shell or as an exterior yard machine."] },
    { id: "yard_paths", kind: "road_segment", displayName: "Yard Paths", origin: { x: 0, z: 28 }, size: { x: 55, z: 17 }, orientation: "north", priority: 5, generatorHint: "paths", schematicName: "yard_paths.schem", purpose: "Connects platform, factory, storage, and machine modules.", dependencies: ["central_factory_shell", "train_platform", "storage_yard"], tags: ["path", "layout"], placementNotes: ["Paste after major structures to avoid accidental overlap."] },
  ];
}

function createOutpostStructures(): SceneStructurePlan[] {
  return [
    { id: "central_tower", kind: "central_tower", displayName: "Central Tower", origin: { x: 0, z: 0 }, size: { x: 17, z: 17 }, orientation: "south", priority: 1, generatorHint: "tower", schematicName: "central_tower.schem", purpose: "Faction landmark, lookout, and navigation anchor.", dependencies: [], tags: ["landmark", "defense", "faction"], placementNotes: ["Paste first at the selected scene origin."] },
    { id: "train_stop", kind: "train_stop", displayName: "Mountain Train Stop", origin: { x: -32, z: 2 }, size: { x: 35, z: 9 }, orientation: "east", priority: 2, generatorHint: "train_station", schematicName: "train_stop.schem", purpose: "Arrival point for Create trains and faction logistics.", dependencies: ["central_tower"], tags: ["transport", "train"], placementNotes: ["Use support stilts if pasted beside a slope."] },
    { id: "factory_shell", kind: "factory_shell", displayName: "Faction Factory Shell", origin: { x: 28, z: -4 }, size: { x: 27, z: 21 }, orientation: "west", priority: 3, generatorHint: "factory", schematicName: "factory_shell.schem", purpose: "Industrial wing for Create machinery.", dependencies: ["central_tower"], tags: ["industrial", "create"], placementNotes: ["Place on the most stable/flat side of the outpost."] },
    { id: "storage_yard", kind: "storage_yard", displayName: "Storage Yard", origin: { x: 24, z: 24 }, size: { x: 23, z: 17 }, orientation: "north", priority: 4, generatorHint: "storage_yard", schematicName: "storage_yard.schem", purpose: "Outdoor storage, materials, and faction logistics.", dependencies: ["factory_shell"], tags: ["storage", "yard"], placementNotes: ["Keep close to factory shell and road spine."] },
    { id: "outpost_paths", kind: "road_segment", displayName: "Outpost Paths", origin: { x: 0, z: 24 }, size: { x: 61, z: 19 }, orientation: "north", priority: 5, generatorHint: "paths", schematicName: "outpost_paths.schem", purpose: "Connects tower, train stop, factory, and yard.", dependencies: ["central_tower", "train_stop", "factory_shell", "storage_yard"], tags: ["path", "layout"], placementNotes: ["Paste after major structures."] },
  ];
}

function createGenericStructures(sceneType: SceneType): SceneStructurePlan[] {
  return sceneType === "factory_yard" || sceneType === "train_depot" ? createFactoryYardStructures() : createOutpostStructures();
}

function createZones(sceneType: SceneType): SchematicScenePlan["zones"] {
  if (sceneType === "factory_yard" || sceneType === "train_depot") {
    return [
      { id: "industrial_core", label: "Industrial Core", kind: "industrial", bounds: createBounds({ x: 0, z: 0 }, { x: 24, z: 22 }), notes: ["Factory shell and machine modules live here."] },
      { id: "transport_edge", label: "Transport Edge", kind: "transport", bounds: createBounds({ x: -36, z: 0 }, { x: 24, z: 10 }), notes: ["Train platform and track-adjacent details."] },
      { id: "storage_side", label: "Storage Side", kind: "storage", bounds: createBounds({ x: 34, z: 4 }, { x: 20, z: 18 }), notes: ["Crates, barrels, depots, and yard lanes."] },
    ];
  }
  return [
    { id: "outpost_core", label: "Outpost Core", kind: "core", bounds: createBounds({ x: 0, z: 0 }, { x: 22, z: 22 }), notes: ["Central tower, main path spine, faction landmark."] },
    { id: "transport_wing", label: "Transport Wing", kind: "transport", bounds: createBounds({ x: -32, z: 2 }, { x: 24, z: 12 }), notes: ["Train stop and arrival staging."] },
    { id: "industrial_wing", label: "Industrial Wing", kind: "industrial", bounds: createBounds({ x: 28, z: -4 }, { x: 24, z: 20 }), notes: ["Factory shell and Create modules."] },
  ];
}

function createRoads(structures: SceneStructurePlan[]): SceneRoadPlan[] {
  const core = structures[0];
  if (!core) return [];
  return structures.filter((s) => s.id !== core.id).map((s, index) => {
    const materialRole = s.kind === "train_stop" ? "rail_path" : s.kind === "factory_shell" || s.kind === "machine_module" ? "factory_path" : "main_path";
    return createRoad(`road_${index + 1}_${core.id}_to_${s.id}`, core.id, s.id, materialRole);
  });
}

export function planSceneLayout(options: ScenePlannerOptions): SchematicScenePlan {
  const sceneType = options.sceneType ?? inferSceneType(options.prompt);
  const biomeHint = options.biomeHint ?? inferBiomeHint(options.prompt);
  const scale = options.scale ?? inferScale(options.prompt);
  const styleProfile = options.styleProfile ?? "siriocraft-create";
  const baseId = options.id ?? `${slug(sceneType)}-${timestampId()}`;
  const structures = createGenericStructures(sceneType);
  return {
    id: baseId,
    prompt: options.prompt,
    sceneType,
    biomeHint,
    scale,
    styleProfile,
    purpose: sceneType === "factory_yard" ? "Server-ready Create factory yard scene plan with train and storage logistics." : "Server-ready SirioCraft outpost scene plan with landmark, train access, industry, and storage.",
    centralLandmarkId: structures[0]?.id,
    structures,
    roads: createRoads(structures),
    zones: createZones(sceneType),
    terrain: createTerrainPlan(biomeHint, scale),
    exports: createExportPlan(baseId, structures),
    warnings: ["M6-D is a scene planning layer only. It does not yet export multi-schematic packs.", "Structure generators are referenced by generatorHint and will be wired in M6-E."],
    notes: ["Scene planning is now separated from individual structure generation.", "Roads, zones, terrain notes, paste order, and schematic names are deterministic.", "M6-E should compile this plan into multiple schematics and a pack folder."],
  };
}
