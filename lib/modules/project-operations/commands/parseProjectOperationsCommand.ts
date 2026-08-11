import type {
  CommandConfidenceLevel,
  UnifiedCommand,
} from "@/lib/chernobog/command-language";

import type {
  ProjectOperationsModuleCommand,
  TaskColumnId,
} from "../types";

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function confidenceLevel(confidence: number): CommandConfidenceLevel {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

function buildCommand(args: {
  raw: string;
  action: UnifiedCommand["action"];
  target: UnifiedCommand["target"];
  query?: string;
  confidence: number;
  reason: string;
  moduleCommand: ProjectOperationsModuleCommand;
}): UnifiedCommand {
  return {
    raw: args.raw,
    normalized: normalizeMessage(args.raw).toLowerCase(),
    domain: "project",
    action: args.action,
    target: args.target,
    reference: "explicit",
    query: args.query,
    confidence: args.confidence,
    confidenceLevel: confidenceLevel(args.confidence),
    reasons: [args.reason],
    moduleId: "project-operations",
    moduleCommand: args.moduleCommand,
  };
}

export function parseProjectOperationsCommand(
  message: string,
): UnifiedCommand | null {
  const normalized = normalizeMessage(message);

  if (
    /^(?:project operations|project command center|dev command center) status$/i.test(
      normalized,
    )
  ) {
    return buildCommand({
      raw: message,
      action: "status",
      target: "project",
      confidence: 0.99,
      reason: "project operations parsed explicit status command",
      moduleCommand: { kind: "project_operations_status" },
    });
  }

  if (/^(?:list|show) projects$/i.test(normalized)) {
    return buildCommand({
      raw: message,
      action: "show",
      target: "project",
      confidence: 0.98,
      reason: "project operations parsed project list command",
      moduleCommand: { kind: "project_list" },
    });
  }

  if (/^(?:list|show) urgent (?:project )?tasks$/i.test(normalized)) {
    return buildCommand({
      raw: message,
      action: "show",
      target: "project_task",
      confidence: 0.99,
      reason: "project operations parsed urgent task list command",
      moduleCommand: { kind: "project_urgent_list" },
    });
  }

  const showProjectMatch = normalized.match(/^show project\s+(.+)$/i);
  if (showProjectMatch?.[1]) {
    const projectQuery = showProjectMatch[1].trim();
    return buildCommand({
      raw: message,
      action: "show",
      target: "project",
      query: projectQuery,
      confidence: 0.97,
      reason: "project operations parsed explicit project lookup",
      moduleCommand: { kind: "project_show", projectQuery },
    });
  }

  const createProjectMatch = normalized.match(
    /^create project(?: named)?\s*:\s*(.+)$/i,
  );
  if (createProjectMatch?.[1]) {
    const name = createProjectMatch[1].trim();
    return buildCommand({
      raw: message,
      action: "create",
      target: "project",
      query: name,
      confidence: 0.99,
      reason: "project operations parsed explicit project creation",
      moduleCommand: { kind: "project_create", name },
    });
  }

  const addTaskMatch = normalized.match(
    /^(?:add|create) (urgent )?task to (.+?)\s*:\s*(.+)$/i,
  );
  if (addTaskMatch?.[2] && addTaskMatch[3]) {
    const projectQuery = addTaskMatch[2].trim();
    const title = addTaskMatch[3].trim();
    return buildCommand({
      raw: message,
      action: "create",
      target: "project_task",
      query: title,
      confidence: 0.99,
      reason: "project operations parsed explicit task creation",
      moduleCommand: {
        kind: "project_task_add",
        projectQuery,
        title,
        urgent: Boolean(addTaskMatch[1]),
      },
    });
  }

  const moveTaskMatch = normalized.match(
    /^move task\s+([a-zA-Z0-9-]+)\s+to\s+(backlog|next|doing|done)$/i,
  );
  if (moveTaskMatch?.[1] && moveTaskMatch[2]) {
    const taskIdentifier = moveTaskMatch[1];
    const column = moveTaskMatch[2].toLowerCase() as TaskColumnId;
    return buildCommand({
      raw: message,
      action: "revise",
      target: "project_task",
      query: taskIdentifier,
      confidence: 0.99,
      reason: "project operations parsed explicit task movement",
      moduleCommand: {
        kind: "project_task_move",
        taskIdentifier,
        column,
      },
    });
  }

  const completeTaskMatch = normalized.match(
    /^(?:complete|finish) task\s+([a-zA-Z0-9-]+)$/i,
  );
  if (completeTaskMatch?.[1]) {
    return buildCommand({
      raw: message,
      action: "complete",
      target: "project_task",
      query: completeTaskMatch[1],
      confidence: 0.99,
      reason: "project operations parsed explicit task completion",
      moduleCommand: {
        kind: "project_task_complete",
        taskIdentifier: completeTaskMatch[1],
      },
    });
  }

  const focusMatch = normalized.match(
    /^set project\s+(.+?)\s+focus\s*:\s*(.+)$/i,
  );
  if (focusMatch?.[1] && focusMatch[2]) {
    const projectQuery = focusMatch[1].trim();
    const focus = focusMatch[2].trim();
    return buildCommand({
      raw: message,
      action: "revise",
      target: "project",
      query: projectQuery,
      confidence: 0.99,
      reason: "project operations parsed focus update",
      moduleCommand: {
        kind: "project_focus_set",
        projectQuery,
        focus,
      },
    });
  }

  const nextActionMatch = normalized.match(
    /^set project\s+(.+?)\s+next action\s*:\s*(.+)$/i,
  );
  if (nextActionMatch?.[1] && nextActionMatch[2]) {
    const projectQuery = nextActionMatch[1].trim();
    const nextAction = nextActionMatch[2].trim();
    return buildCommand({
      raw: message,
      action: "revise",
      target: "project",
      query: projectQuery,
      confidence: 0.99,
      reason: "project operations parsed next-action update",
      moduleCommand: {
        kind: "project_next_action_set",
        projectQuery,
        nextAction,
      },
    });
  }

  return null;
}
