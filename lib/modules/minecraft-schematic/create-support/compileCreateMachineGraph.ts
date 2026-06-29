import type { GeneratedSchematicBuild } from "../types";
import { CREATE_BLOCK_IDS } from "./createBlockIds";
import type {
  CreateBlockPlacement,
  CreateBlockStateProperties,
  CreateMechanicalGraph,
  CreateMechanicalNode,
  CreateVector3,
} from "./types";

export type CreateMachineCompileOptions = {
  buildId?: string;
  prompt?: string;
  command?: string;
  displayName?: string;
  minecraftVersion?: string;
};

export type CreateMachineCompileResult = {
  build: GeneratedSchematicBuild;
  graph: CreateMechanicalGraph;
  placementOffset: CreateVector3;
  bounds: {
    min: CreateVector3;
    max: CreateVector3;
    size: CreateVector3;
  };
  notes: string[];
};

type CompiledBlock = {
  x: number;
  y: number;
  z: number;
  blockId: string;
  properties?: Record<string, string | number | boolean>;
  role?: string;
  note?: string;
};

type ExportCompatibleBlock = CompiledBlock & {
  /**
   * Compatibility aliases for the existing schematic exporter/validator stack.
   *
   * M6-C keeps the M6-B registry-safe rule:
   * - legacy fields use base block IDs so blockRegistry.ts can validate allow-lists
   * - serialized Create states are preserved separately as rawState/createState
   */
  id: string;
  name: string;
  state: string;
  blockState: string;
  block: string;
  rawState: string;
  createState: string;
};

function serializeBlockState(
  blockId: string,
  properties?: Record<string, string | number | boolean>,
): string {
  const entries = Object.entries(properties ?? {}).filter(([, value]) => value !== undefined && value !== null);

  if (entries.length === 0) {
    return blockId;
  }

  const serializedProperties = entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(",");

  return `${blockId}[${serializedProperties}]`;
}

function toExportCompatibleBlock(block: CompiledBlock): ExportCompatibleBlock {
  const rawState = serializeBlockState(block.blockId, block.properties);

  return {
    ...block,
    id: block.blockId,
    name: block.blockId,
    state: block.blockId,
    blockState: block.blockId,
    block: block.blockId,
    rawState,
    createState: rawState,
  };
}

function createPalette(blocks: ExportCompatibleBlock[]): string[] {
  return Array.from(new Set(blocks.map((block) => block.blockId))).sort();
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "create_machine";
}

function timestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createNodeProperties(node: CreateMechanicalNode): CreateBlockStateProperties | undefined {
  const properties: CreateBlockStateProperties = {};

  if (node.axis) {
    properties.axis = node.axis;
  }

  if (node.facing) {
    properties.facing = node.facing;
  }

  return Object.keys(properties).length > 0 ? properties : undefined;
}

function getPlacements(graph: CreateMechanicalGraph): CreateBlockPlacement[] {
  if (graph.blockPlacements?.length) {
    return graph.blockPlacements;
  }

  return graph.nodes
    .filter((node) => node.blockId)
    .map((node) => ({
      id: node.id,
      blockId: node.blockId as string,
      position: node.position,
      properties: createNodeProperties(node),
      role: node.role ?? node.kind,
      note: node.notes?.join(" "),
    }));
}

function calculateBounds(placements: CreateBlockPlacement[]): { min: CreateVector3; max: CreateVector3 } {
  const first = placements[0]?.position ?? { x: 0, y: 0, z: 0 };

  const min = { ...first };
  const max = { ...first };

  for (const placement of placements) {
    min.x = Math.min(min.x, placement.position.x);
    min.y = Math.min(min.y, placement.position.y);
    min.z = Math.min(min.z, placement.position.z);
    max.x = Math.max(max.x, placement.position.x);
    max.y = Math.max(max.y, placement.position.y);
    max.z = Math.max(max.z, placement.position.z);
  }

  return { min, max };
}

function blockKey(block: Pick<CompiledBlock, "x" | "y" | "z">): string {
  return `${block.x},${block.y},${block.z}`;
}

function addBlock(blocks: CompiledBlock[], occupied: Set<string>, block: CompiledBlock): void {
  const key = blockKey(block);

  if (occupied.has(key)) {
    return;
  }

  occupied.add(key);
  blocks.push(block);
}

function addFoundation(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  size: CreateVector3,
): void {
  for (let x = 0; x < size.x; x += 1) {
    for (let z = 0; z < size.z; z += 1) {
      const isEdge = x === 0 || z === 0 || x === size.x - 1 || z === size.z - 1;
      addBlock(blocks, occupied, {
        x,
        y: 0,
        z,
        blockId: isEdge ? CREATE_BLOCK_IDS.railwayCasing : "minecraft:polished_andesite",
        role: isEdge ? "foundation_border" : "foundation",
      });
    }
  }
}

function addCornerFrames(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  size: CreateVector3,
): void {
  const corners = [
    { x: 0, z: 0 },
    { x: size.x - 1, z: 0 },
    { x: 0, z: size.z - 1 },
    { x: size.x - 1, z: size.z - 1 },
  ];

  for (const corner of corners) {
    for (let y = 1; y <= Math.min(size.y - 1, 4); y += 1) {
      addBlock(blocks, occupied, {
        x: corner.x,
        y,
        z: corner.z,
        blockId: CREATE_BLOCK_IDS.metalGirder,
        role: "machine_frame_corner",
      });
    }
  }
}

function addLowPerimeterRail(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  size: CreateVector3,
): void {
  for (let x = 1; x < size.x - 1; x += 1) {
    if (x % 2 !== 0) {
      continue;
    }

    addBlock(blocks, occupied, {
      x,
      y: 1,
      z: 0,
      blockId: CREATE_BLOCK_IDS.metalGirder,
      role: "machine_safety_rail",
    });
    addBlock(blocks, occupied, {
      x,
      y: 1,
      z: size.z - 1,
      blockId: CREATE_BLOCK_IDS.metalGirder,
      role: "machine_safety_rail",
    });
  }

  for (let z = 1; z < size.z - 1; z += 1) {
    if (z % 2 !== 0) {
      continue;
    }

    addBlock(blocks, occupied, {
      x: 0,
      y: 1,
      z,
      blockId: CREATE_BLOCK_IDS.metalGirder,
      role: "machine_safety_rail",
    });
    addBlock(blocks, occupied, {
      x: size.x - 1,
      y: 1,
      z,
      blockId: CREATE_BLOCK_IDS.metalGirder,
      role: "machine_safety_rail",
    });
  }
}

function addSupportColumn(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  x: number,
  z: number,
  fromY: number,
  toY: number,
): void {
  for (let y = fromY; y <= toY; y += 1) {
    addBlock(blocks, occupied, {
      x,
      y,
      z,
      blockId: CREATE_BLOCK_IDS.andesiteCasing,
      role: "create_support",
    });
  }
}

function addPadAround(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  center: CreateVector3,
  y: number,
  radius: number,
  blockId: string,
  role: string,
): void {
  for (let x = center.x - radius; x <= center.x + radius; x += 1) {
    for (let z = center.z - radius; z <= center.z + radius; z += 1) {
      addBlock(blocks, occupied, {
        x,
        y,
        z,
        blockId,
        role,
      });
    }
  }
}

function translatedPosition(
  position: CreateVector3,
  offset: CreateVector3,
): CreateVector3 {
  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
    z: position.z + offset.z,
  };
}

function createTranslatedNodeMap(
  graph: CreateMechanicalGraph,
  offset: CreateVector3,
): Map<string, CreateVector3> {
  const map = new Map<string, CreateVector3>();

  for (const node of graph.nodes) {
    map.set(node.id, translatedPosition(node.position, offset));
  }

  return map;
}

function addPressLinePolish(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  nodes: Map<string, CreateVector3>,
): string[] {
  const notes: string[] = [];
  const depot = nodes.get("depot_01");
  const press = nodes.get("press_01");

  if (depot) {
    addPadAround(blocks, occupied, depot, Math.max(1, depot.y - 1), 1, CREATE_BLOCK_IDS.andesiteCasing, "press_line_depot_pad");

    addBlock(blocks, occupied, {
      x: depot.x - 1,
      y: depot.y,
      z: depot.z,
      blockId: CREATE_BLOCK_IDS.belt,
      properties: { axis: "x" },
      role: "press_line_input_belt_hint",
      note: "Decorative input belt hint for the press line.",
    });

    addBlock(blocks, occupied, {
      x: depot.x + 1,
      y: depot.y,
      z: depot.z,
      blockId: CREATE_BLOCK_IDS.belt,
      properties: { axis: "x" },
      role: "press_line_output_belt_hint",
      note: "Decorative output belt hint for the press line.",
    });

    notes.push("M6-C added press line belt hints and a casing pad around the depot.");
  }

  if (press) {
    addBlock(blocks, occupied, {
      x: press.x,
      y: press.y + 1,
      z: press.z,
      blockId: CREATE_BLOCK_IDS.brassCasing,
      role: "press_line_machine_header",
    });

    notes.push("M6-C added a simple brass casing header above the mechanical press.");
  }

  return notes;
}

function addMixerStationPolish(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  nodes: Map<string, CreateVector3>,
): string[] {
  const notes: string[] = [];
  const basin = nodes.get("basin_01");
  const mixer = nodes.get("mixer_01");

  if (basin) {
    addPadAround(blocks, occupied, basin, Math.max(1, basin.y - 1), 1, CREATE_BLOCK_IDS.brassCasing, "mixer_station_basin_pad");

    addBlock(blocks, occupied, {
      x: basin.x - 1,
      y: basin.y,
      z: basin.z,
      blockId: CREATE_BLOCK_IDS.fluidPipe,
      properties: { axis: "x" },
      role: "mixer_station_fluid_pipe_hint",
      note: "Decorative fluid pipe hint for future basin input/output routing.",
    });

    addBlock(blocks, occupied, {
      x: basin.x + 1,
      y: basin.y,
      z: basin.z,
      blockId: CREATE_BLOCK_IDS.fluidPipe,
      properties: { axis: "x" },
      role: "mixer_station_fluid_pipe_hint",
      note: "Decorative fluid pipe hint for future basin input/output routing.",
    });

    notes.push("M6-C added basin casing pad and fluid pipe hints.");
  }

  if (mixer) {
    addBlock(blocks, occupied, {
      x: mixer.x,
      y: mixer.y + 1,
      z: mixer.z,
      blockId: CREATE_BLOCK_IDS.brassCasing,
      role: "mixer_station_machine_header",
    });

    notes.push("M6-C added a brass casing header above the mechanical mixer.");
  }

  return notes;
}

function addWaterWheelPolish(
  blocks: CompiledBlock[],
  occupied: Set<string>,
  nodes: Map<string, CreateVector3>,
): string[] {
  const notes: string[] = [];
  const wheel = nodes.get("water_wheel_01");

  if (!wheel) {
    return notes;
  }

  for (let z = wheel.z - 1; z <= wheel.z + 1; z += 1) {
    addBlock(blocks, occupied, {
      x: wheel.x - 1,
      y: Math.max(1, wheel.y - 1),
      z,
      blockId: "minecraft:cobbled_deepslate",
      role: "water_wheel_channel_wall",
    });

    addBlock(blocks, occupied, {
      x: wheel.x + 1,
      y: Math.max(1, wheel.y - 1),
      z,
      blockId: "minecraft:cobbled_deepslate",
      role: "water_wheel_channel_wall",
    });
  }

  addBlock(blocks, occupied, {
    x: wheel.x,
    y: Math.max(1, wheel.y - 1),
    z: wheel.z - 1,
    blockId: "minecraft:water",
    role: "water_wheel_channel_water_hint",
    note: "Water hint for Create test worlds. Replace/remove if the target schematic workflow dislikes fluids.",
  });

  notes.push("M6-C added a small water-wheel channel hint around the wheel.");

  return notes;
}

function addPurposePolish(
  graph: CreateMechanicalGraph,
  blocks: CompiledBlock[],
  occupied: Set<string>,
  offset: CreateVector3,
): string[] {
  const translatedNodes = createTranslatedNodeMap(graph, offset);

  switch (graph.purpose) {
    case "press_line":
      return addPressLinePolish(blocks, occupied, translatedNodes);
    case "mixer_station":
      return addMixerStationPolish(blocks, occupied, translatedNodes);
    case "water_wheel_power":
      return addWaterWheelPolish(blocks, occupied, translatedNodes);
    default:
      return [];
  }
}

function createMachineDisplayName(graph: CreateMechanicalGraph): string {
  switch (graph.purpose) {
    case "press_line":
      return "Create Press Line";
    case "mixer_station":
      return "Create Mixer Station";
    case "water_wheel_power":
      return "Create Water Wheel Power Test";
    default:
      return `Create ${graph.purpose.replace(/_/g, " ")}`;
  }
}

export function compileCreateMachineGraph(
  graph: CreateMechanicalGraph,
  options: CreateMachineCompileOptions = {},
): CreateMachineCompileResult {
  const placements = getPlacements(graph);
  const sourceBounds = calculateBounds(placements);

  const padding = 3;
  const foundationY = 0;
  const machineBaseY = 1;

  const offset: CreateVector3 = {
    x: -sourceBounds.min.x + padding,
    y: -sourceBounds.min.y + machineBaseY,
    z: -sourceBounds.min.z + padding,
  };

  const maxTranslated = translatedPosition(sourceBounds.max, offset);
  const size: CreateVector3 = {
    x: maxTranslated.x + padding + 1,
    y: maxTranslated.y + 3,
    z: maxTranslated.z + padding + 1,
  };

  const blocks: CompiledBlock[] = [];
  const occupied = new Set<string>();

  addFoundation(blocks, occupied, size);
  addCornerFrames(blocks, occupied, size);
  addLowPerimeterRail(blocks, occupied, size);

  for (const placement of placements) {
    const position = translatedPosition(placement.position, offset);

    addBlock(blocks, occupied, {
      x: position.x,
      y: position.y,
      z: position.z,
      blockId: placement.blockId,
      properties: placement.properties,
      role: placement.role,
      note: placement.note,
    });

    if (position.y > foundationY + 1) {
      addSupportColumn(blocks, occupied, position.x, position.z, foundationY + 1, position.y - 1);
    }
  }

  const polishNotes = addPurposePolish(graph, blocks, occupied, offset);

  const buildId = options.buildId ?? `${slug(graph.purpose)}-${timestampId()}`;
  const displayName = options.displayName ?? createMachineDisplayName(graph);
  const prompt = options.prompt ?? `Create machine graph: ${graph.purpose}`;
  const command = options.command ?? prompt;

  const notes = [
    "M6-C compile result: Create mechanical graph was compiled into a more legible machine module.",
    "This pass adds stronger foundations, corner frames, perimeter rails, support columns, and purpose-specific machine hints.",
    "M6-C still uses registry-safe base block IDs for legacy exporter fields and preserves serialized Create states as rawState/createState.",
    "M6-D should start scene-pack planning and multi-structure exports.",
    ...polishNotes,
  ];

  const exportBlocks = blocks.map(toExportCompatibleBlock);
  const palette = createPalette(exportBlocks);

  const build = {
    buildId,
    displayName,
    generatorName: "factory",
    variant: graph.purpose,
    prompt,
    command,
    minecraftVersion: options.minecraftVersion ?? "1.21.1",
    profile: "siriocraft-create",
    allowModdedBlocks: true,
    fallbackToVanilla: false,
    size,
    palette,
    blocks: exportBlocks,
    blockCount: exportBlocks.length,
    features: [
      "create_mechanical_graph",
      `create_${graph.purpose}`,
      "m6c_create_graph_compiler",
      "foundation_platform",
      "support_columns",
      "corner_frames",
      "perimeter_rails",
      "purpose_specific_machine_polish",
    ],
    createMechanicalGraph: graph,
    buildReport: {
      status: "prototype",
      sirioCraftUseCase: "Create machine module for SirioCraft build-pack pipeline validation and future factory-yard composition.",
      suggestedPlacement: "Paste on flat Create-enabled test terrain. This prototype includes its own foundation, rails, and support frame.",
      recommendedNextAction: "Inspect in a Create-enabled client/world. Schemat.io may not preview the modded blocks correctly.",
    },
  } as unknown as GeneratedSchematicBuild;

  return {
    build,
    graph,
    placementOffset: offset,
    bounds: {
      min: sourceBounds.min,
      max: sourceBounds.max,
      size,
    },
    notes,
  };
}
