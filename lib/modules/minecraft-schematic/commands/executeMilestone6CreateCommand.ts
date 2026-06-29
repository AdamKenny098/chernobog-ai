import {
  createMixerStationGraph,
  createPressLineGraph,
  createWaterWheelPowerGraph,
  validateCreateMechanicalGraph,
} from "../create-support";
import type {
  CreateMachinePreset,
  CreateMechanicalGraph,
  CreateMechanicalValidationResult,
} from "../create-support/types";
import type { Milestone6CreateParsedCommand } from "./parseMilestone6CreateCommand";

export type Milestone6CreateExecutionResult = {
  ok: boolean;
  kind: "milestone6_create_machine_result";
  preset: CreateMachinePreset;
  graph: CreateMechanicalGraph;
  validation: CreateMechanicalValidationResult;
  summary: string;
};

function createGraphForPreset(preset: CreateMachinePreset): CreateMechanicalGraph {
  switch (preset) {
    case "press_line":
      return createPressLineGraph();
    case "mixer_station":
      return createMixerStationGraph();
    case "water_wheel_power":
      return createWaterWheelPowerGraph();
    default:
      throw new Error(`Unsupported Create machine preset: ${preset}`);
  }
}

export function executeMilestone6CreateCommand(
  command: Milestone6CreateParsedCommand,
): Milestone6CreateExecutionResult {
  const graph = createGraphForPreset(command.preset);
  const validation = validateCreateMechanicalGraph(graph);

  const warningText =
    validation.summary.warnings > 0
      ? `, ${validation.summary.warnings} warning(s)`
      : "";

  const errorText =
    validation.summary.errors > 0
      ? `, ${validation.summary.errors} error(s)`
      : "";

  return {
    ok: validation.status !== "failed",
    kind: "milestone6_create_machine_result",
    preset: command.preset,
    graph,
    validation,
    summary:
      `Create ${command.preset} graph generated: ` +
      `${graph.nodes.length} node(s), ${graph.connections.length} connection(s), ` +
      `status ${validation.status}${warningText}${errorText}.`,
  };
}
