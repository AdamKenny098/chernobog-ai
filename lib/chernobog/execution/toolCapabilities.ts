import {
  getRegisteredModules,
} from "../../modules/registry";
import {
  toolRegistry,
} from "../tools/registry";
import {
  createToolExecutionHandlers,
} from "./toolExecutionHandlers";

export type ToolCapabilitySource =
  | "builtin"
  | "module";

export interface ToolCapability {
  name: string;
  description: string;
  source:
    ToolCapabilitySource;
  moduleId?: string;
  executionTaskAvailable: boolean;
}

export interface ToolCatalogSnapshot {
  toolCount: number;
  builtinToolCount: number;
  moduleToolCount: number;
  executionTaskHandlerCount: number;
  executionTaskCoveredToolCount: number;
  orphanExecutionHandlers: string[];
  unhandledRegisteredTools: string[];
  tools: ToolCapability[];
}

type CatalogToolDefinition = {
  name?: string;
  description?: string;
};

function buildModuleOwnerMap():
  Map<string, string> {
  const owners =
    new Map<string, string>();

  for (
    const module
    of getRegisteredModules()
  ) {
    if (!module.tools) {
      continue;
    }

    for (
      const toolName
      of Object.keys(
        module.tools,
      )
    ) {
      owners.set(
        toolName,
        module.id,
      );
    }
  }

  return owners;
}

export function getToolCatalogSnapshot():
  ToolCatalogSnapshot {
  const moduleOwners =
    buildModuleOwnerMap();

  const handlers =
    createToolExecutionHandlers();

  const executionHandlerNames =
    Object.keys(
      handlers,
    ).sort();

  const registeredNames =
    Object.keys(
      toolRegistry,
    ).sort();

  const registeredNameSet =
    new Set(
      registeredNames,
    );

  const orphanExecutionHandlers =
    executionHandlerNames.filter(
      (name) =>
        !registeredNameSet.has(
          name,
        ),
    );

  const executionHandlerSet =
    new Set(
      executionHandlerNames,
    );

  const tools =
    registeredNames.map(
      (name): ToolCapability => {
        const definition =
          toolRegistry[
            name as keyof typeof toolRegistry
          ] as CatalogToolDefinition;

        const moduleId =
          moduleOwners.get(
            name,
          );

        return {
          name,
          description:
            typeof definition
              .description ===
              "string"
              ? definition
                  .description
              : "",
          source:
            moduleId
              ? "module"
              : "builtin",
          moduleId,
          executionTaskAvailable:
            executionHandlerSet.has(
              name,
            ),
        };
      },
    );

  const builtinToolCount =
    tools.filter(
      (tool) =>
        tool.source ===
        "builtin",
    ).length;

  const moduleToolCount =
    tools.length -
    builtinToolCount;

  const executionTaskCoveredToolCount =
    tools.filter(
      (tool) =>
        tool.executionTaskAvailable,
    ).length;

  const unhandledRegisteredTools =
    tools
      .filter(
        (tool) =>
          !tool.executionTaskAvailable,
      )
      .map(
        (tool) =>
          tool.name,
      );

  return {
    toolCount:
      tools.length,
    builtinToolCount,
    moduleToolCount,
    executionTaskHandlerCount:
      executionHandlerNames.length,
    executionTaskCoveredToolCount,
    orphanExecutionHandlers,
    unhandledRegisteredTools,
    tools:
      structuredClone(
        tools,
      ),
  };
}
