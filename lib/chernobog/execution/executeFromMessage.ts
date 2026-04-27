// lib/chernobog/execution/executeFromMessage.ts

import { buildExecutionTaskFromMessage } from "./buildExecutionTask";
import {
    createEmptyExecutionState,
    deriveExecutionStateFromTask,
    ExecutionState,
  } from "./executionState";
import { formatExecutionResponse } from "./formatExecutionResponse";
import { runExecutionTask } from "./runExecutionTask";
import { ExecutionTask } from "./types";
import { handleApprovalCommand } from "./approvalCommands";
import { createDefaultExecutionHandlers } from "./defaultExecutionHandlers";
import { createInternalExecutionHandlers } from "./internalExecutionHandlers";

export interface ExecuteFromMessageOptions {
  previousState?: ExecutionState;
}

export interface ExecuteFromMessageResult {
  handled: boolean;
  response: string;
  task?: ExecutionTask;
  executionState: ExecutionState;
}

export async function executeFromMessage(
  message: string,
  options: ExecuteFromMessageOptions = {}
): Promise<ExecuteFromMessageResult> {
  const previousState = options.previousState ?? createEmptyExecutionState();
  const approvalCommand = await handleApprovalCommand(message, previousState);

if (approvalCommand.kind !== "none") {
  if (!approvalCommand.task) {
    return {
      handled: true,
      response: approvalCommand.error ?? "No approval action was taken.",
      executionState: previousState,
    };
  }

  const executionState = deriveExecutionStateFromTask(
    approvalCommand.task,
    previousState
  );

  return {
    handled: true,
    response: formatExecutionResponse(approvalCommand.task),
    task: approvalCommand.task,
    executionState,
  };
}

  const task = buildExecutionTaskFromMessage(message, {
    previousState,
  });

  if (!task) {
    return {
      handled: false,
      response: "",
      executionState: previousState,
    };
  }

  const completedTask = await runExecutionTask(task, {
    handlers: {
        ...createDefaultExecutionHandlers(),
        ...createInternalExecutionHandlers({
          previousState,
        }),
      },
  });

  const executionState = deriveExecutionStateFromTask(
    completedTask,
    previousState
  );

  return {
    handled: true,
    response: formatExecutionResponse(completedTask),
    task: completedTask,
    executionState,
  };
}