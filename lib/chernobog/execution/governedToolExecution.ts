// lib/chernobog/execution/governedToolExecution.ts
//
// OH-2G authoritative adapter for legacy pipeline/orchestration tool calls.
//
// The adapter does not implement a second trust engine.
// It converts a single legacy tool request into the existing ExecutionTask
// lifecycle so runExecutionTask remains the one governance authority before
// any Unified Tool Gateway invocation.

import {
  executeOrchestrationTool,
  executePipelineTool,
} from "@chernobog/tools";
import type {
  ToolExecutionContext,
  ToolResult,
} from "@chernobog/tools/types";
import { getRiskPolicyForStep } from "@chernobog/trust/execution/riskPolicy";

import { createExecutionTask } from "./createExecutionTask";
import {
  createEmptyExecutionState,
  deriveExecutionStateFromTask,
  type ExecutionState,
} from "./executionState";
import {
  runExecutionTask,
  type ExecutionActionHandler,
} from "./runExecutionTask";
import type {
  ExecutionRiskLevel,
  ExecutionStep,
  ExecutionTask,
} from "./types";
import { ensureChernobogEventStateConvergence } from "@/lib/chernobog/runtime/eventStateConvergence";


export type GovernedLegacyToolOrigin =
  | "pipeline"
  | "orchestration";

export interface GovernedToolExecutionOptions {
  origin: GovernedLegacyToolOrigin;
  sessionId?: string;
  previousState?: ExecutionState;
  context?: ToolExecutionContext;
}

export interface GovernedToolExecutionResult {
  result: ToolResult;
  task: ExecutionTask;
  executionState: ExecutionState;
}

const EXECUTION_RISKS = new Set<ExecutionRiskLevel>([
  "safe",
  "notice",
  "approval_required",
  "blocked",
]);

function asExecutionRisk(value: unknown): ExecutionRiskLevel | null {
  return typeof value === "string" &&
    EXECUTION_RISKS.has(value as ExecutionRiskLevel)
    ? (value as ExecutionRiskLevel)
    : null;
}

/**
 * Reuse the accepted legacy risk policy instead of inventing OH-2G risk rules.
 *
 * The historical risk-policy object has changed shape during Chernobog's
 * lifetime, so this adapter reads the policy conservatively. If no explicit
 * risk field can be projected, the step stays "safe" here; runExecutionTask
 * still performs the authoritative getRiskPolicyForStep +
 * evaluateStepRuntimeGovernance checks before handler dispatch.
 */
function resolveLegacyStepRisk(
  toolName: string,
  input: unknown,
): ExecutionRiskLevel {
  const probe: ExecutionStep = {
    id: "oh2g-risk-probe",
    kind: "tool",
    label: toolName,
    status: "pending",
    action: toolName,
    input,
    risk: "safe",
  };

  const policy = getRiskPolicyForStep(probe);
  const record = policy as unknown as Record<string, unknown>;

  for (const key of ["risk", "level", "riskLevel"]) {
    const projected = asExecutionRisk(record[key]);
    if (projected) {
      return projected;
    }
  }

  if (record.blocked === true || record.allowed === false) {
    return "blocked";
  }

  if (
    record.requiresApproval === true ||
    record.approvalRequired === true ||
    record.confirm === true
  ) {
    return "approval_required";
  }

  if (record.notice === true || record.requiresNotice === true) {
    return "notice";
  }

  return "safe";
}

function getGatewayOrigin(
  task: ExecutionTask,
): GovernedLegacyToolOrigin | null {
  const value = task.context.oh2gGatewayOrigin;

  return value === "pipeline" || value === "orchestration"
    ? value
    : null;
}

function getGatewayContext(
  task: ExecutionTask,
): ToolExecutionContext | undefined {
  const value = task.context.oh2gGatewayContext;

  return value && typeof value === "object"
    ? (value as ToolExecutionContext)
    : undefined;
}

async function invokeOriginalGateway(
  origin: GovernedLegacyToolOrigin,
  toolName: string,
  input: unknown,
  context?: ToolExecutionContext,
): Promise<ToolResult> {
  return origin === "pipeline"
    ? executePipelineTool(toolName, input, context)
    : executeOrchestrationTool(toolName, input, context);
}

function toExecutionActionResult(
  result: ToolResult,
) {
  return result.ok
    ? {
        success: true as const,
        output: result.data,
      }
    : {
        success: false as const,
        error: result.error || "Tool execution failed.",
      };
}

function buildOriginHandler(
  origin: GovernedLegacyToolOrigin,
  gatewayContext?: ToolExecutionContext,
  capture?: (result: ToolResult) => void,
): ExecutionActionHandler {
  return async (step) => {
    const toolName = step.action;

    if (!toolName) {
      return {
        success: false,
        error: "Governed tool execution step has no action name.",
      };
    }

    const result = await invokeOriginalGateway(
      origin,
      toolName,
      step.input,
      gatewayContext,
    );

    capture?.(result);
    return toExecutionActionResult(result);
  };
}

function governanceFailureResult(
  task: ExecutionTask,
): ToolResult {
  const step = task.currentStepId
    ? task.steps.find(
        (candidate) =>
          candidate.id === task.currentStepId,
      )
    : task.steps[0];

  const error =
    task.error ??
    step?.error ??
    task.approval.reason ??
    (
      task.status === "waiting_for_approval"
        ? "Tool execution requires approval before it can continue."
        : "Tool execution was stopped by governance."
    );

  return {
    ok: false,
    error,
  } as ToolResult;
}

/**
 * Build continuation handlers for a governed legacy tool task that was paused
 * for approval. ApprovalCommands merges these after the default handlers so
 * resumed execution preserves the original pipeline/orchestration gateway
 * origin instead of silently changing the invocation path.
 */
export function createGovernedToolContinuationHandlers(
  task: ExecutionTask,
): Record<string, ExecutionActionHandler> {
  const origin = getGatewayOrigin(task);

  if (!origin) {
    return {};
  }

  const step = task.steps.find(
    (candidate) =>
      typeof candidate.action === "string" &&
      candidate.action.length > 0,
  );

  if (!step?.action) {
    return {};
  }

  return {
    [step.action]: buildOriginHandler(
      origin,
      getGatewayContext(task),
    ),
  };
}

/**
 * Execute one legacy pipeline/orchestration tool call through the existing
 * authoritative ExecutionTask governance lifecycle.
 *
 * Allowed path:
 * caller -> this adapter -> runExecutionTask -> governed handler ->
 * Unified Tool Gateway -> tool.
 *
 * Denied/approval-required paths never invoke the gateway.
 */
export async function executeGovernedToolAction(
  toolName: string,
  input: unknown,
  options: GovernedToolExecutionOptions,
): Promise<GovernedToolExecutionResult> {
  await ensureChernobogEventStateConvergence();
  const previousState =
    options.previousState ??
    createEmptyExecutionState();

  const stepRisk =
    resolveLegacyStepRisk(
      toolName,
      input,
    );

  const task =
    createExecutionTask({
      input:
        `[${options.origin}] ${toolName}`,
      goal:
        `Execute ${toolName} through governed tool execution.`,
      category:
        "unknown",
      steps: [
        {
          kind:
            "tool",
          label:
            toolName,
          action:
            toolName,
          input,
          risk:
            stepRisk,
        },
      ],
      context: {
        oh2gGatewayOrigin:
          options.origin,
        oh2gGatewayContext:
          options.context ?? {},
      },
    });

  let gatewayResult: ToolResult | null = null;

  const handler =
    buildOriginHandler(
      options.origin,
      options.context,
      (result) => {
        gatewayResult = result;
      },
    );

  const completedTask =
    await runExecutionTask(
      task,
      {
        sessionId:
          options.sessionId,
        handlers: {
          [toolName]:
            handler,
        },
      },
    );

  const executionState =
    deriveExecutionStateFromTask(
      completedTask,
      previousState,
    );

  return {
    result:
      gatewayResult ??
      governanceFailureResult(
        completedTask,
      ),
    task:
      completedTask,
    executionState,
  };
}
