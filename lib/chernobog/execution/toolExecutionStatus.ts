import {
  getToolCatalogSnapshot,
} from "./toolCapabilities";

export type UnifiedToolExecutionState =
  | "ready"
  | "degraded"
  | "unavailable";

export interface UnifiedToolExecutionStatus {
  status: UnifiedToolExecutionState;
  checkedAt: string;
  toolCount: number;
  builtinToolCount: number;
  moduleToolCount: number;
  executionTaskHandlerCount: number;
  executionTaskCoveredToolCount: number;
  orphanExecutionHandlers: string[];
  unhandledRegisteredTools: string[];
  invocationOrigins: string[];
  failureKinds: string[];
  authority: {
    gateway: "execution/toolGateway.ts";
    executor: "tools/executor.ts";
    registry: "tools/registry.ts";
    taskGovernance: "execution/runExecutionTask.ts";
  };
}

export function getUnifiedToolExecutionStatus(
  options: { clock?: () => Date } = {},
): UnifiedToolExecutionStatus {
  const catalog = getToolCatalogSnapshot();

  const status: UnifiedToolExecutionState =
    catalog.toolCount === 0
      ? "unavailable"
      : catalog.orphanExecutionHandlers.length > 0
        ? "degraded"
        : "ready";

  return {
    status,
    checkedAt: (options.clock ?? (() => new Date()))().toISOString(),
    toolCount: catalog.toolCount,
    builtinToolCount: catalog.builtinToolCount,
    moduleToolCount: catalog.moduleToolCount,
    executionTaskHandlerCount: catalog.executionTaskHandlerCount,
    executionTaskCoveredToolCount: catalog.executionTaskCoveredToolCount,
    orphanExecutionHandlers: [...catalog.orphanExecutionHandlers],
    unhandledRegisteredTools: [...catalog.unhandledRegisteredTools],
    invocationOrigins: [
      "execution-task",
      "orchestration",
      "pipeline",
      "direct",
    ],
    failureKinds: [
      "unknown-tool",
      "invalid-input",
      "execution-failed",
    ],
    authority: {
      gateway: "execution/toolGateway.ts",
      executor: "tools/executor.ts",
      registry: "tools/registry.ts",
      taskGovernance: "execution/runExecutionTask.ts",
    },
  };
}
