import type {
  CreateAxis,
  CreateMechanicalConnection,
  CreateMechanicalGraph,
  CreateMechanicalNode,
  CreateMechanicalValidationResult,
  CreateValidationIssue,
  CreateValidationSeverity,
} from "./types";
import { getCreateSupportProfile, isCreateBlockAllowed } from "./createSupportProfile";

function issue(
  severity: CreateValidationSeverity,
  code: string,
  message: string,
  target?: string,
  repairHint?: string,
): CreateValidationIssue {
  return { severity, code, message, target, repairHint };
}

function getNode(graph: CreateMechanicalGraph, id: string): CreateMechanicalNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

function manhattanDistance(a: CreateMechanicalNode, b: CreateMechanicalNode): number {
  return Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y) + Math.abs(a.position.z - b.position.z);
}

function areAlignedOnAxis(a: CreateMechanicalNode, b: CreateMechanicalNode, axis: CreateAxis): boolean {
  if (axis === "x") {
    return a.position.y === b.position.y && a.position.z === b.position.z && a.position.x !== b.position.x;
  }

  if (axis === "y") {
    return a.position.x === b.position.x && a.position.z === b.position.z && a.position.y !== b.position.y;
  }

  return a.position.x === b.position.x && a.position.y === b.position.y && a.position.z !== b.position.z;
}

function hasIncomingRotationalConnection(graph: CreateMechanicalGraph, nodeId: string): boolean {
  return graph.connections.some((connection) => {
    return (
      connection.to === nodeId &&
      (connection.kind === "shaft" ||
        connection.kind === "gearbox" ||
        connection.kind === "belt" ||
        connection.kind === "cog_mesh" ||
        connection.kind === "machine_input")
    );
  });
}

function hasPowerSource(graph: CreateMechanicalGraph): boolean {
  return graph.nodes.some((node) => node.kind === "power_source" || node.kind === "water_wheel");
}

function validateNodeBlockIds(graph: CreateMechanicalGraph, issues: CreateValidationIssue[]): void {
  const profile = getCreateSupportProfile(graph.profileId);

  if (!profile.supportsCreate) {
    issues.push(
      issue(
        "error",
        "CREATE_PROFILE_UNSUPPORTED",
        `Mechanical graph ${graph.id} requires Create, but profile ${profile.id} does not support Create.`,
        graph.id,
        "Switch to the Create registry profile before compiling this graph.",
      ),
    );
    return;
  }

  for (const node of graph.nodes) {
    if (!node.blockId) {
      issues.push(
        issue(
          node.decorative ? "warning" : "error",
          "CREATE_MISSING_BLOCK_ID",
          `Create node ${node.id} has no block ID mapping.`,
          node.id,
          "Add the node kind to getCreateBlockIdForNodeKind or mark it as decorative.",
        ),
      );
      continue;
    }

    if (!isCreateBlockAllowed(graph.profileId, node.blockId)) {
      issues.push(
        issue(
          "error",
          "CREATE_BLOCK_NOT_ALLOWED_BY_PROFILE",
          `Block ${node.blockId} is not allowed by profile ${profile.id}.`,
          node.id,
          "Add the block to the Create support profile or change the active registry profile.",
        ),
      );
    }
  }
}

function validateConnections(graph: CreateMechanicalGraph, issues: CreateValidationIssue[]): void {
  const seenIds = new Set<string>();

  for (const connection of graph.connections) {
    if (seenIds.has(connection.id)) {
      issues.push(issue("error", "CREATE_DUPLICATE_CONNECTION_ID", `Duplicate connection ID ${connection.id}.`, connection.id));
    }
    seenIds.add(connection.id);

    const from = getNode(graph, connection.from);
    const to = getNode(graph, connection.to);

    if (!from || !to) {
      issues.push(
        issue(
          "error",
          "CREATE_CONNECTION_TARGET_MISSING",
          `Connection ${connection.id} references a missing node.`,
          connection.id,
          "Repair the graph by removing the connection or adding the missing node.",
        ),
      );
      continue;
    }

    if (connection.kind === "shaft" || connection.kind === "gearbox") {
      if (!connection.axis) {
        issues.push(
          issue(
            "error",
            "CREATE_CONNECTION_AXIS_MISSING",
            `Connection ${connection.id} needs an axis.`,
            connection.id,
            "Set axis to x, y, or z.",
          ),
        );
        continue;
      }

      if (!areAlignedOnAxis(from, to, connection.axis)) {
        issues.push(
          issue(
            "error",
            "CREATE_SHAFT_ALIGNMENT_INVALID",
            `Connection ${connection.id} is not aligned on the ${connection.axis} axis.`,
            connection.id,
            "Move both nodes onto the same line or change the connection axis.",
          ),
        );
      }

      if (from.axis && from.axis !== connection.axis && from.kind !== "gearbox") {
        issues.push(
          issue(
            "warning",
            "CREATE_FROM_AXIS_MISMATCH",
            `${from.id} has axis ${from.axis}, but connection ${connection.id} uses ${connection.axis}.`,
            from.id,
            "Match shaft/cog axis to the connection axis unless this is intentional decorative machinery.",
          ),
        );
      }

      if (to.axis && to.axis !== connection.axis && to.kind !== "gearbox") {
        issues.push(
          issue(
            "warning",
            "CREATE_TO_AXIS_MISMATCH",
            `${to.id} has axis ${to.axis}, but connection ${connection.id} uses ${connection.axis}.`,
            to.id,
            "Match shaft/cog axis to the connection axis unless this is intentional decorative machinery.",
          ),
        );
      }
    }

    if (connection.kind === "cog_mesh") {
      if (manhattanDistance(from, to) !== 1) {
        issues.push(
          issue(
            "error",
            "CREATE_COG_MESH_DISTANCE_INVALID",
            `Cog mesh ${connection.id} must connect directly adjacent cogwheels.`,
            connection.id,
            "Move the cogwheels to adjacent block positions.",
          ),
        );
      }

      const validKinds = new Set(["cogwheel", "large_cogwheel"]);
      if (!validKinds.has(from.kind) || !validKinds.has(to.kind)) {
        issues.push(
          issue(
            "error",
            "CREATE_COG_MESH_KIND_INVALID",
            `Cog mesh ${connection.id} must connect cogwheel or large_cogwheel nodes.`,
            connection.id,
            "Use kind cogwheel or large_cogwheel for both mesh endpoints.",
          ),
        );
      }
    }

    if (connection.kind === "belt") {
      if (!connection.axis) {
        issues.push(
          issue(
            "warning",
            "CREATE_BELT_AXIS_MISSING",
            `Belt connection ${connection.id} has no axis hint.`,
            connection.id,
            "Add the belt axis so the compiler can place valid belt endpoints.",
          ),
        );
      }

      if (from.kind !== "shaft" || to.kind !== "shaft") {
        issues.push(
          issue(
            "warning",
            "CREATE_BELT_ENDPOINT_NOT_SHAFT",
            `Belt connection ${connection.id} should usually connect two shaft endpoints.`,
            connection.id,
            "Use shafts as belt pulleys or mark this connection as decorative.",
          ),
        );
      }
    }
  }
}

function validateMachineLayout(graph: CreateMechanicalGraph, issues: CreateValidationIssue[]): void {
  for (const node of graph.nodes) {
    if ((node.kind === "mechanical_press" || node.kind === "mechanical_mixer") && node.facing !== "down") {
      issues.push(
        issue(
          "warning",
          "CREATE_MACHINE_FACING_UNUSUAL",
          `${node.id} is ${node.kind} but is not facing down.`,
          node.id,
          "Most schematic presets should face presses and mixers downward.",
        ),
      );
    }

    if (node.kind === "mechanical_press") {
      const hasDepotBelow = graph.nodes.some((candidate) => {
        return (
          candidate.kind === "depot" &&
          candidate.position.x === node.position.x &&
          candidate.position.z === node.position.z &&
          candidate.position.y === node.position.y - 1
        );
      });

      if (!hasDepotBelow) {
        issues.push(
          issue(
            node.decorative ? "warning" : "error",
            "CREATE_PRESS_DEPOT_ALIGNMENT",
            `${node.id} does not have a depot directly below it.`,
            node.id,
            "Place a depot one block below the mechanical press.",
          ),
        );
      }

      if (!hasIncomingRotationalConnection(graph, node.id)) {
        issues.push(
          issue(
            "warning",
            "CREATE_UNPOWERED_PRESS",
            `${node.id} has no incoming rotational connection.`,
            node.id,
            "Connect a shaft, gearbox, belt, or decorative rotational input to the press.",
          ),
        );
      }
    }

    if (node.kind === "mechanical_mixer") {
      const hasBasinBelow = graph.nodes.some((candidate) => {
        return (
          candidate.kind === "basin" &&
          candidate.position.x === node.position.x &&
          candidate.position.z === node.position.z &&
          candidate.position.y === node.position.y - 1
        );
      });

      if (!hasBasinBelow) {
        issues.push(
          issue(
            node.decorative ? "warning" : "error",
            "CREATE_BASIN_MIXER_ALIGNMENT",
            `${node.id} is not positioned directly above a basin.`,
            node.id,
            "Move the mixer to the same x/z as the basin and one block above it.",
          ),
        );
      }

      if (!hasIncomingRotationalConnection(graph, node.id)) {
        issues.push(
          issue(
            "warning",
            "CREATE_UNPOWERED_MIXER",
            `${node.id} has no incoming rotational connection.`,
            node.id,
            "Connect a shaft, gearbox, belt, or decorative rotational input to the mixer.",
          ),
        );
      }
    }

    if (node.kind === "chute" && node.facing && node.facing !== "down" && node.facing !== "up") {
      issues.push(
        issue(
          "warning",
          "CREATE_CHUTE_HORIZONTAL_HINT",
          `${node.id} is a chute with horizontal facing ${node.facing}.`,
          node.id,
          "Use vertical chute flow unless this is only a visual/detail marker.",
        ),
      );
    }
  }
}

function validatePowerAndFlow(graph: CreateMechanicalGraph, issues: CreateValidationIssue[]): void {
  if (!hasPowerSource(graph)) {
    issues.push(
      issue(
        "warning",
        "CREATE_NO_POWER_SOURCE",
        `Mechanical graph ${graph.id} has no power source.`,
        graph.id,
        "Add a water wheel or mark the machinery as decorative.",
      ),
    );
  }

  if (graph.flowHints.length === 0) {
    issues.push(
      issue(
        "info",
        "CREATE_FLOW_HINTS_EMPTY",
        `Mechanical graph ${graph.id} has no input/output flow hints.`,
        graph.id,
        "Add simple player-facing flow hints for the placement guide and review UI.",
      ),
    );
  }
}

export function validateCreateMechanicalGraph(graph: CreateMechanicalGraph): CreateMechanicalValidationResult {
  const issues: CreateValidationIssue[] = [];

  validateNodeBlockIds(graph, issues);
  validateConnections(graph, issues);
  validateMachineLayout(graph, issues);
  validatePowerAndFlow(graph, issues);

  const errors = issues.filter((entry) => entry.severity === "error").length;
  const warnings = issues.filter((entry) => entry.severity === "warning").length;
  const info = issues.filter((entry) => entry.severity === "info").length;

  return {
    kind: "create_mechanical_validation",
    graphId: graph.id,
    status: errors > 0 ? "failed" : warnings > 0 ? "warnings" : "passed",
    summary: {
      nodes: graph.nodes.length,
      connections: graph.connections.length,
      errors,
      warnings,
      info,
    },
    issues,
  };
}
