import { compileCreateMachineGraph } from "../create-support/compileCreateMachineGraph";
import {
  createMixerStationGraph,
  createPressLineGraph,
  createWaterWheelPowerGraph,
} from "../create-support/createMechanicalGraph";
import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlock } from "../types";
import type { SceneStructurePlan, SchematicScenePlan } from "../scenes/types";
import { generateFactory } from "../generators/structures/generateFactory";
import { generateGatehouse } from "../generators/structures/generateGatehouse";
import { generateTower } from "../generators/tower/generateTower";
import { generateTrainStation } from "../generators/structures/generateTrainStation";

export type CompiledScenePackStructure = {
  structure: SceneStructurePlan;
  build: GeneratedSchematicBuild;
  warnings: string[];
};

type BlockInput = {
  x: number;
  y: number;
  z: number;
  block: MinecraftBlockName;
};

function makeBlock(input: BlockInput): SchematicBlock {
  return {
    x: input.x,
    y: input.y,
    z: input.z,
    block: input.block,
  };
}

function addBlock(blocks: SchematicBlock[], occupied: Set<string>, input: BlockInput): void {
  const key = `${input.x},${input.y},${input.z}`;

  if (occupied.has(key)) {
    return;
  }

  occupied.add(key);
  blocks.push(makeBlock(input));
}

function createPalette(blocks: SchematicBlock[]): MinecraftBlockName[] {
  return Array.from(new Set<MinecraftBlockName>([
    "minecraft:air" as MinecraftBlockName,
    ...blocks.map((block) => block.block),
  ])).sort();
}

function createSceneBuildId(plan: SchematicScenePlan, structure: SceneStructurePlan): string {
  return `${plan.id}_${structure.id}`;
}

function createStructureCommand(plan: SchematicScenePlan, structure: SceneStructurePlan): string {
  return `scene pack compile ${plan.id} ${structure.id}`;
}

function getSceneVariant(structure: SceneStructurePlan): string {
  switch (structure.kind) {
    case "factory_shell":
      return "factory_with_yard";
    case "storage_yard":
      return "industrial_storage_yard";
    case "train_stop":
      return "train_station_small";
    case "central_tower":
      return "deepslate";
    case "watchtower":
      return "medieval";
    case "gatehouse":
      return "gatehouse";
    case "machine_module":
      return structure.createMachinePreset ?? "press_line";
    default:
      return structure.kind;
  }
}

function requiredFeaturePadding(structure: SceneStructurePlan): string[] {
  switch (structure.kind) {
    case "factory_shell":
      return ["large_hall", "chimney", "loading_door", "big_windows", "industrial_roof", "catwalks", "pipes"];
    case "train_stop":
      return ["platform", "rails", "canopy"];
    case "central_tower":
    case "watchtower":
      return ["foundation", "walls", "roof", "door", "windows", "battlements"];
    case "gatehouse":
      return ["two_towers", "central_gate", "wall_segments", "battlements", "portcullis_bars", "walkway"];
    case "storage_yard":
      return ["storage", "yard", "crates", "loading_lane"];
    case "road_segment":
      return ["paths", "road_layout", "scene_connections"];
    case "machine_module":
      return ["create_mechanical_graph", "machine_module", "foundation_platform"];
    default:
      return ["scene_pack_structure"];
  }
}

function withScenePackMetadata(
  build: GeneratedSchematicBuild,
  plan: SchematicScenePlan,
  structure: SceneStructurePlan,
  qualitySource: string,
): GeneratedSchematicBuild {
  const features = Array.from(new Set([
    ...(build.features ?? []),
    "m6f1_quality_scene_pack_structure",
    "scene_pack_high_quality_delegation",
    `quality_source_${qualitySource}`,
    `scene_${plan.sceneType}`,
    `structure_${structure.kind}`,
    ...requiredFeaturePadding(structure),
    ...structure.tags,
  ]));

  return {
    ...build,
    buildId: createSceneBuildId(plan, structure),
    displayName: structure.displayName,
    presetId: `scene-pack:${plan.id}:${structure.id}`,
    prompt: plan.prompt,
    command: createStructureCommand(plan, structure),
    minecraftVersion: build.minecraftVersion ?? "1.21.1",
    profile: build.profile ?? plan.styleProfile,
    allowModdedBlocks: build.allowModdedBlocks ?? plan.styleProfile === "siriocraft-create",
    fallbackToVanilla: build.fallbackToVanilla ?? false,
    features,
    blockCount: build.blocks.length,
    placementWarnings: [
      ...(build.placementWarnings ?? []),
      `Scene pack placement offset: x:${structure.origin.x}, z:${structure.origin.z}. Facing ${structure.orientation}.`,
      "M6-F.1 uses the existing high-quality single-structure generator instead of prototype pack geometry.",
    ],
  };
}

function compileFactoryShell(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  return withScenePackMetadata(
    generateFactory({
      prompt: `${plan.prompt} | high-quality factory shell for ${structure.displayName}`,
      command: createStructureCommand(plan, structure),
      presetId: "factory_with_yard",
      variant: "factory_with_yard",
      minecraftVersion: "1.21.1",
      profile: "siriocraft-create",
      allowModdedBlocks: true,
      fallbackToVanilla: false,
    }),
    plan,
    structure,
    "generateFactory_factory_with_yard",
  );
}

function compileStorageYard(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  return withScenePackMetadata(
    generateFactory({
      prompt: `${plan.prompt} | high-quality industrial storage yard for ${structure.displayName}`,
      command: createStructureCommand(plan, structure),
      presetId: "industrial_storage_yard",
      variant: "industrial_storage_yard",
      minecraftVersion: "1.21.1",
      profile: "siriocraft-create",
      allowModdedBlocks: true,
      fallbackToVanilla: false,
    }),
    plan,
    structure,
    "generateFactory_industrial_storage_yard",
  );
}

function compileTrainStop(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  return withScenePackMetadata(
    generateTrainStation({
      prompt: `${plan.prompt} | high-quality train platform for ${structure.displayName}`,
      command: createStructureCommand(plan, structure),
      presetId: "train_station_small",
      minecraftVersion: "1.21.1",
    }),
    plan,
    structure,
    "generateTrainStation",
  );
}

function compileTowerStructure(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  const mountainVariant = plan.biomeHint === "mountain" || plan.biomeHint === "snowy_mountain" ? "deepslate" : "medieval";

  return withScenePackMetadata(
    generateTower({
      prompt: `${plan.prompt} | high-quality ${mountainVariant} central tower for ${structure.displayName}`,
      command: createStructureCommand(plan, structure),
      variant: mountainVariant,
      minecraftVersion: "1.21.1",
    }),
    plan,
    structure,
    "generateTower",
  );
}

function compileGatehouseStructure(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  return withScenePackMetadata(
    generateGatehouse({
      prompt: `${plan.prompt} | high-quality gatehouse for ${structure.displayName}`,
      command: createStructureCommand(plan, structure),
      presetId: "siriocraft_gatehouse",
      minecraftVersion: "1.21.1",
    }),
    plan,
    structure,
    "generateGatehouse",
  );
}

function compileMachineModule(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  const preset = structure.createMachinePreset ?? "press_line";
  const graph =
    preset === "mixer_station"
      ? createMixerStationGraph({ id: `${plan.id}_${structure.id}_graph` })
      : preset === "water_wheel_power"
        ? createWaterWheelPowerGraph({ id: `${plan.id}_${structure.id}_graph` })
        : createPressLineGraph({ id: `${plan.id}_${structure.id}_graph` });

  const compiled = compileCreateMachineGraph(graph, {
    buildId: createSceneBuildId(plan, structure),
    prompt: plan.prompt,
    command: createStructureCommand(plan, structure),
    displayName: structure.displayName,
  });

  return withScenePackMetadata(
    compiled.build,
    plan,
    structure,
    `compileCreateMachineGraph_${preset}`,
  );
}

function compileRoads(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  const width = Math.max(25, structure.size.x);
  const depth = Math.max(11, structure.size.z);
  const blocks: SchematicBlock[] = [];
  const occupied = new Set<string>();
  const centerX = Math.floor(width / 2);
  const centerZ = Math.floor(depth / 2);

  for (let x = 0; x < width; x += 1) {
    for (let offset = -1; offset <= 1; offset += 1) {
      addBlock(blocks, occupied, {
        x,
        y: 0,
        z: centerZ + offset,
        block: offset === 0 ? "minecraft:stone_bricks" as MinecraftBlockName : "minecraft:gravel" as MinecraftBlockName,
      });
    }
  }

  for (let z = 0; z < depth; z += 1) {
    for (let offset = -1; offset <= 1; offset += 1) {
      addBlock(blocks, occupied, {
        x: centerX + offset,
        y: 0,
        z,
        block: offset === 0 ? "minecraft:stone_bricks" as MinecraftBlockName : "minecraft:gravel" as MinecraftBlockName,
      });
    }
  }

  for (let x = 0; x < width; x += 6) {
    addBlock(blocks, occupied, { x, y: 1, z: centerZ - 2, block: "minecraft:lantern" as MinecraftBlockName });
    addBlock(blocks, occupied, { x, y: 1, z: centerZ + 2, block: "minecraft:lantern" as MinecraftBlockName });
  }

  const build: GeneratedSchematicBuild = {
    buildId: createSceneBuildId(plan, structure),
    displayName: structure.displayName,
    generatorName: "outpost",
    variant: "scene_paths",
    presetId: `scene-pack:${plan.id}:${structure.id}`,
    profile: "vanilla",
    allowModdedBlocks: false,
    fallbackToVanilla: true,
    prompt: plan.prompt,
    command: createStructureCommand(plan, structure),
    minecraftVersion: "1.21.1",
    generatedAt: new Date().toISOString(),
    size: { x: width, y: 2, z: depth },
    palette: createPalette(blocks),
    blocks,
    blockCount: blocks.length,
    features: [
      "m6f1_quality_scene_pack_structure",
      "fallback_roads_only",
      "paths",
      "road_layout",
      "scene_connections",
      ...structure.tags,
    ],
    placementWarnings: [
      "Road/path modules are still fallback geometry. Major buildings now use high-quality individual generators.",
      `Scene pack placement offset: x:${structure.origin.x}, z:${structure.origin.z}. Facing ${structure.orientation}.`,
    ],
  };

  return build;
}

function compileFallbackStructure(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  if (structure.kind === "road_segment" || structure.kind === "decorations") {
    return compileRoads(plan, structure);
  }

  return compileFactoryShell(plan, structure);
}

function compileStructure(plan: SchematicScenePlan, structure: SceneStructurePlan): GeneratedSchematicBuild {
  switch (structure.kind) {
    case "factory_shell":
      return compileFactoryShell(plan, structure);
    case "storage_yard":
      return compileStorageYard(plan, structure);
    case "train_stop":
      return compileTrainStop(plan, structure);
    case "central_tower":
    case "watchtower":
      return compileTowerStructure(plan, structure);
    case "gatehouse":
      return compileGatehouseStructure(plan, structure);
    case "machine_module":
      return compileMachineModule(plan, structure);
    case "road_segment":
    case "decorations":
      return compileRoads(plan, structure);
    default:
      return compileFallbackStructure(plan, structure);
  }
}

export function compileScenePlanStructures(plan: SchematicScenePlan): CompiledScenePackStructure[] {
  return [...plan.structures]
    .sort((left, right) => left.priority - right.priority)
    .map((structure) => ({
      structure,
      build: compileStructure(plan, structure),
      warnings: [
        `M6-F.1 compiled ${structure.id} using ${getSceneVariant(structure)} routing.`,
        structure.kind === "road_segment" || structure.kind === "decorations"
          ? "This structure still uses fallback path/decor geometry."
          : "This structure delegates to a higher-quality individual generator or the M6-C Create machine compiler.",
      ],
    }));
}
