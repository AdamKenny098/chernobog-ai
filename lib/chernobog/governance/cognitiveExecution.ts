import type {
  CognitiveActionDecision,
} from "../cognition/actionTypes";
import {
  runExecutionTask,
} from "../execution/runExecutionTask";
import type {
  ExecutionActionHandler,
  RunExecutionTaskOptions,
} from "../execution/runExecutionTask";
import type {
  ExecutionTask,
} from "../execution/types";

export type CognitiveExecutionHandoffStatus =
  | "executed"
  | "not-executable";

export type CognitiveExecutionHandoffReason =
  | "decision-not-act"
  | "decision-not-permitted"
  | "missing-opportunity";

export interface CognitiveExecutionHandoffResult {
  status: CognitiveExecutionHandoffStatus;
  decisionId: string;
  reason?: CognitiveExecutionHandoffReason;
  task?: ExecutionTask;
}

export interface GovernedCognitiveExecutionOptions {
  handlers:
    Record<string, ExecutionActionHandler>;
  maxSteps?: number;
}

export function canHandoffCognitiveDecision(
  decision: CognitiveActionDecision,
): {
  allowed: boolean;
  reason?: CognitiveExecutionHandoffReason;
} {
  if (decision.mode !== "act") {
    return {
      allowed: false,
      reason: "decision-not-act",
    };
  }

  if (!decision.permittedToExecute) {
    return {
      allowed: false,
      reason: "decision-not-permitted",
    };
  }

  if (!decision.opportunity) {
    return {
      allowed: false,
      reason: "missing-opportunity",
    };
  }

  return {
    allowed: true,
  };
}

export function buildExecutionOptionsFromCognitiveDecision(
  decision: CognitiveActionDecision,
  options: GovernedCognitiveExecutionOptions,
): RunExecutionTaskOptions {
  const handoff =
    canHandoffCognitiveDecision(
      decision,
    );

  if (!handoff.allowed) {
    throw new Error(
      `Cognitive decision cannot be handed to execution: ${handoff.reason}`,
    );
  }

  return {
    handlers: options.handlers,
    maxSteps: options.maxSteps,
    governance: {
      governance:
        structuredClone(
          decision.governance,
        ),
      opportunity:
        structuredClone(
          decision.opportunity,
        ),
    },
  };
}

export async function runGovernedCognitiveExecution(
  decision: CognitiveActionDecision,
  task: ExecutionTask,
  options: GovernedCognitiveExecutionOptions,
): Promise<CognitiveExecutionHandoffResult> {
  const handoff =
    canHandoffCognitiveDecision(
      decision,
    );

  if (!handoff.allowed) {
    return {
      status: "not-executable",
      decisionId: decision.id,
      reason: handoff.reason,
    };
  }

  const executed =
    await runExecutionTask(
      task,
      buildExecutionOptionsFromCognitiveDecision(
        decision,
        options,
      ),
    );

  return {
    status: "executed",
    decisionId: decision.id,
    task:
      structuredClone(
        executed,
      ),
  };
}
