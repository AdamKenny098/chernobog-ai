import {
  CREATE_1_21_1_NEOFORGE_PROFILE_ID,
  assertCreateSupported,
} from "./createSupportProfile";
import { getCreateBlockIdForNodeKind } from "./createBlockIds";
import type {
  CreateAxis,
  CreateBlockPlacement,
  CreateBlockStateProperties,
  CreateGraphFactoryOptions,
  CreateMechanicalConnection,
  CreateMechanicalGraph,
  CreateMechanicalNode,
  CreateVector3,
} from "./types";

function at(origin: CreateVector3, x: number, y: number, z: number): CreateVector3 {
  return {
    x: origin.x + x,
    y: origin.y + y,
    z: origin.z + z,
  };
}

function node(input: Omit<CreateMechanicalNode, "blockId">): CreateMechanicalNode {
  return {
    ...input,
    blockId: getCreateBlockIdForNodeKind(input.kind),
  };
}

function connection(input: CreateMechanicalConnection): CreateMechanicalConnection {
  return input;
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

function toBlockPlacements(nodes: CreateMechanicalNode[]): CreateBlockPlacement[] {
  return nodes
    .filter((entry) => entry.blockId)
    .map((entry) => ({
      id: entry.id,
      blockId: entry.blockId as string,
      position: entry.position,
      properties: createNodeProperties(entry),
      role: entry.role ?? entry.kind,
      note: entry.notes?.join(" "),
    }));
}

export function createPressLineGraph(options: CreateGraphFactoryOptions = {}): CreateMechanicalGraph {
  const profileId = options.profileId ?? CREATE_1_21_1_NEOFORGE_PROFILE_ID;
  assertCreateSupported(profileId);

  const origin = options.origin ?? { x: 0, y: 0, z: 0 };
  const id = options.id ?? "create_press_line_01";
  const axis: CreateAxis = "x";

  const nodes: CreateMechanicalNode[] = [
    node({
      id: "water_wheel_01",
      kind: "water_wheel",
      position: at(origin, 0, 2, 0),
      axis,
      role: "power_source",
      notes: ["Basic rotational power source for the press line."],
    }),
    node({
      id: "shaft_01",
      kind: "shaft",
      position: at(origin, 1, 2, 0),
      axis,
      role: "power_transfer",
    }),
    node({
      id: "shaft_02",
      kind: "shaft",
      position: at(origin, 2, 2, 0),
      axis,
      role: "power_transfer",
    }),
    node({
      id: "gearbox_01",
      kind: "gearbox",
      position: at(origin, 3, 2, 0),
      axis,
      role: "rotation_router",
      notes: ["Validator tracks gearbox routing, not true Create stress simulation."],
    }),
    node({
      id: "shaft_press",
      kind: "shaft",
      position: at(origin, 4, 2, 0),
      axis,
      role: "machine_input_shaft",
    }),
    node({
      id: "press_01",
      kind: "mechanical_press",
      position: at(origin, 4, 1, 0),
      facing: "down",
      role: "processor",
    }),
    node({
      id: "depot_01",
      kind: "depot",
      position: at(origin, 4, 0, 0),
      role: "input_output_surface",
    }),
    node({
      id: "chute_01",
      kind: "chute",
      position: at(origin, 4, -1, 0),
      facing: "down",
      role: "output_drop",
      decorative: options.decorative,
    }),
  ];

  const connections: CreateMechanicalConnection[] = [
    connection({ id: "c_water_to_shaft_01", kind: "shaft", from: "water_wheel_01", to: "shaft_01", axis }),
    connection({ id: "c_shaft_01_to_02", kind: "shaft", from: "shaft_01", to: "shaft_02", axis }),
    connection({ id: "c_shaft_02_to_gearbox", kind: "shaft", from: "shaft_02", to: "gearbox_01", axis }),
    connection({ id: "c_gearbox_to_press_shaft", kind: "gearbox", from: "gearbox_01", to: "shaft_press", axis }),
    connection({ id: "c_press_power", kind: "machine_input", from: "shaft_press", to: "press_01", axis }),
    connection({ id: "c_depot_to_press", kind: "machine_input", from: "depot_01", to: "press_01" }),
    connection({ id: "c_press_to_chute", kind: "machine_output", from: "press_01", to: "chute_01" }),
  ];

  return {
    id,
    purpose: "press_line",
    profileId,
    nodes,
    connections,
    flowHints: [
      "Items are placed on depot_01.",
      "press_01 processes items above the depot.",
      "chute_01 is marked as a downward output hint.",
    ],
    blockPlacements: toBlockPlacements(nodes),
  };
}

export function createMixerStationGraph(options: CreateGraphFactoryOptions = {}): CreateMechanicalGraph {
  const profileId = options.profileId ?? CREATE_1_21_1_NEOFORGE_PROFILE_ID;
  assertCreateSupported(profileId);

  const origin = options.origin ?? { x: 0, y: 0, z: 0 };
  const id = options.id ?? "create_mixer_station_01";
  const axis: CreateAxis = "x";

  const nodes: CreateMechanicalNode[] = [
    node({
      id: "water_wheel_01",
      kind: "water_wheel",
      position: at(origin, 0, 2, 0),
      axis,
      role: "power_source",
    }),
    node({
      id: "shaft_01",
      kind: "shaft",
      position: at(origin, 1, 2, 0),
      axis,
      role: "power_transfer",
    }),
    node({
      id: "gearbox_01",
      kind: "gearbox",
      position: at(origin, 2, 2, 0),
      axis,
      role: "rotation_router",
    }),
    node({
      id: "shaft_mixer",
      kind: "shaft",
      position: at(origin, 3, 2, 0),
      axis,
      role: "machine_input_shaft",
    }),
    node({
      id: "mixer_01",
      kind: "mechanical_mixer",
      position: at(origin, 3, 1, 0),
      facing: "down",
      role: "processor",
    }),
    node({
      id: "basin_01",
      kind: "basin",
      position: at(origin, 3, 0, 0),
      role: "input_output_container",
    }),
    node({
      id: "funnel_01",
      kind: "funnel",
      position: at(origin, 3, 0, -1),
      facing: "south",
      role: "item_io_hint",
      decorative: options.decorative,
    }),
  ];

  const connections: CreateMechanicalConnection[] = [
    connection({ id: "c_water_to_shaft_01", kind: "shaft", from: "water_wheel_01", to: "shaft_01", axis }),
    connection({ id: "c_shaft_01_to_gearbox", kind: "shaft", from: "shaft_01", to: "gearbox_01", axis }),
    connection({ id: "c_gearbox_to_mixer_shaft", kind: "gearbox", from: "gearbox_01", to: "shaft_mixer", axis }),
    connection({ id: "c_mixer_power", kind: "machine_input", from: "shaft_mixer", to: "mixer_01", axis }),
    connection({ id: "c_basin_to_mixer", kind: "machine_input", from: "basin_01", to: "mixer_01" }),
    connection({ id: "c_funnel_to_basin", kind: "item_flow", from: "funnel_01", to: "basin_01" }),
  ];

  return {
    id,
    purpose: "mixer_station",
    profileId,
    nodes,
    connections,
    flowHints: [
      "Items enter through funnel_01.",
      "basin_01 holds the recipe contents.",
      "mixer_01 processes contents directly above basin_01.",
    ],
    blockPlacements: toBlockPlacements(nodes),
  };
}

export function createWaterWheelPowerGraph(options: CreateGraphFactoryOptions = {}): CreateMechanicalGraph {
  const profileId = options.profileId ?? CREATE_1_21_1_NEOFORGE_PROFILE_ID;
  assertCreateSupported(profileId);

  const origin = options.origin ?? { x: 0, y: 0, z: 0 };
  const id = options.id ?? "create_water_wheel_power_01";
  const axis: CreateAxis = "x";

  const nodes: CreateMechanicalNode[] = [
    node({
      id: "water_wheel_01",
      kind: "water_wheel",
      position: at(origin, 0, 2, 0),
      axis,
      role: "power_source",
    }),
    node({
      id: "shaft_01",
      kind: "shaft",
      position: at(origin, 1, 2, 0),
      axis,
      role: "power_transfer",
    }),
    node({
      id: "shaft_02",
      kind: "shaft",
      position: at(origin, 2, 2, 0),
      axis,
      role: "power_transfer",
    }),
    node({
      id: "cogwheel_01",
      kind: "cogwheel",
      position: at(origin, 3, 2, 0),
      axis,
      role: "rotation_transfer",
    }),
    node({
      id: "large_cogwheel_01",
      kind: "large_cogwheel",
      position: at(origin, 3, 2, 1),
      axis: "z",
      role: "rotation_transfer",
      notes: ["Prototype large/small cog adjacency for visual factory machinery."],
    }),
    node({
      id: "gearbox_01",
      kind: "gearbox",
      position: at(origin, 3, 2, 2),
      axis: "z",
      role: "rotation_router",
    }),
  ];

  const connections: CreateMechanicalConnection[] = [
    connection({ id: "c_water_to_shaft_01", kind: "shaft", from: "water_wheel_01", to: "shaft_01", axis }),
    connection({ id: "c_shaft_01_to_02", kind: "shaft", from: "shaft_01", to: "shaft_02", axis }),
    connection({ id: "c_shaft_02_to_cog", kind: "shaft", from: "shaft_02", to: "cogwheel_01", axis }),
    connection({ id: "c_cog_to_large_cog", kind: "cog_mesh", from: "cogwheel_01", to: "large_cogwheel_01" }),
    connection({ id: "c_large_cog_to_gearbox", kind: "shaft", from: "large_cogwheel_01", to: "gearbox_01", axis: "z" }),
  ];

  return {
    id,
    purpose: "water_wheel_power",
    profileId,
    nodes,
    connections,
    flowHints: [
      "water_wheel_01 provides the first rotational source.",
      "shaft_01 and shaft_02 relay rotation in a straight line.",
      "cogwheel_01 and large_cogwheel_01 are used as a visible transfer assembly.",
    ],
    blockPlacements: toBlockPlacements(nodes),
  };
}
