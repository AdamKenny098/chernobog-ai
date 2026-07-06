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
  import type { CreateMechanicalGraphParsedCommand } from "./parseCreateMechanicalGraphCommand";
  
  export type CreateMechanicalGraphExecutionResult = {
    ok: boolean;
    kind: "create_mechanical_graph_result";
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
  
      default: {
        const exhaustiveCheck: never = preset;
        throw new Error(`Unsupported Create machine preset: ${exhaustiveCheck}`);
      }
    }
  }
  
  export function executeCreateMechanicalGraphCommand(
    command: CreateMechanicalGraphParsedCommand,
  ): CreateMechanicalGraphExecutionResult {
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
      kind: "create_mechanical_graph_result",
      preset: command.preset,
      graph,
      validation,
      summary:
        `Create ${command.preset} graph generated: ` +
        `${graph.nodes.length} node(s), ${graph.connections.length} connection(s), ` +
        `status ${validation.status}${warningText}${errorText}.`,
    };
  }