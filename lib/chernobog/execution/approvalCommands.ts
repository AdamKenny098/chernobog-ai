// lib/chernobog/execution/approvalCommands.ts

import {
  approveExecutionTask,
  denyExecutionTask,
  markExecutionTaskApproved,
  markExecutionTaskDenied,
} from "./approval";
import { ExecutionState } from "./executionState";
import { runExecutionTask } from "./runExecutionTask";
import { ExecutionTask } from "./types";
import { createDefaultExecutionHandlers } from "./defaultExecutionHandlers";
import { createInternalExecutionHandlers } from "./internalExecutionHandlers";

export type ApprovalCommandKind = "approve" | "deny" | "none";

export interface ApprovalCommandResult {
  kind: ApprovalCommandKind;
  task?: ExecutionTask;
  error?: string;
}

function normalizeMessage(message: string) {
  return message.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getApprovalCommandKind(message: string): ApprovalCommandKind {
  const normalized = normalizeMessage(message);

  if (
    normalized === "approve" ||
    normalized === "approved" ||
    normalized === "yes" ||
    normalized === "yes continue" ||
    normalized === "continue" ||
    normalized === "continue task" ||
    normalized === "resume" ||
    normalized === "resume task" ||
    normalized === "go ahead"
  ) {
    return "approve";
  }

  if (
    normalized === "deny" ||
    normalized === "denied" ||
    normalized === "no" ||
    normalized === "cancel" ||
    normalized === "cancel task" ||
    normalized === "stop" ||
    normalized === "stop task"
  ) {
    return "deny";
  }

  return "none";
}

export async function handleApprovalCommand(
  message: string,
  state: ExecutionState
): Promise<ApprovalCommandResult> {
  const kind = getApprovalCommandKind(message);

  if (kind === "none") {
    return {
      kind,
    };
  }

  const activeTask = state.activeTask;

  if (!activeTask || activeTask.status !== "waiting_for_approval") {
    return {
      kind,
      error: "There is no execution task waiting for approval.",
    };
  }

  if (kind === "deny") {
    const deniedTask = markExecutionTaskDenied(
      denyExecutionTask(activeTask),
      "Approval denied by user."
    );

    return {
      kind,
      task: deniedTask,
    };
  }

  const approvedTask = markExecutionTaskApproved(
    approveExecutionTask(activeTask)
  );

  const resumedTask = await runExecutionTask(approvedTask, {
    handlers: {
      ...createDefaultExecutionHandlers(),
      ...createInternalExecutionHandlers({
        previousState: state,
      }),
    },
  });

  return {
    kind,
    task: resumedTask,
  };
}