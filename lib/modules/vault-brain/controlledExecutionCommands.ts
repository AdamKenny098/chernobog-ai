import { controlledExecutionBoundaryText } from "./controlledExecutionTypes";
import {
  approveControlledExecutionCheckpoint,
  approveControlledExecutionPlan,
  createControlledExecutionDryRun,
  createControlledExecutionPlan,
  formatControlledExecutionDryRun,
  formatControlledExecutionPlan,
  formatControlledExecutionPlanList,
  getControlledExecutionPlanById,
  getControlledExecutionStoreSnapshot,
  readControlledExecutionAuditLog,
  readControlledExecutionPlans,
  rejectControlledExecutionCheckpoint,
} from "./controlledExecutionStore";
import type { VaultBrainCommandResult } from "./types";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function parsePlanDraft(command: string): { missionId: string; objective?: string } | undefined {
  const match = command.match(/^(?:create|draft|propose)\s+(?:controlled\s+)?execution\s+plan\s+for\s+mission\s+(mission-\S+)(?:\s+::\s+(.+))?$/i);
  if (!match?.[1]) {
    return undefined;
  }

  return {
    missionId: match[1].trim(),
    objective: match[2]?.trim(),
  };
}

function formatExecutionAuditLog(
  events: Awaited<ReturnType<typeof readControlledExecutionAuditLog>>
): string {
  if (events.length === 0) {
    return "No controlled execution audit events found.";
  }

  return events
    .slice(-25)
    .reverse()
    .map((event) => `- ${event.createdAt} | ${event.action} | ${event.planId ?? "system"} | ${event.summary}`)
    .join("\n");
}

function controlledExecutionPolicyMessage(): string {
  return [
    "Chernobog V5.9.5 Controlled Agentic Execution",
    "",
    "Boundary:",
    ...controlledExecutionBoundaryText().map((line) => `- ${line}`),
    "",
    "What this layer can do:",
    "- create controlled execution plans from approved missions",
    "- evaluate planned steps through trust governance",
    "- create approval checkpoints",
    "- record rollback notes",
    "- create dry-run records",
    "- audit the execution-planning lifecycle",
    "",
    "What this layer cannot do:",
    "- execute tools",
    "- run shell commands",
    "- write repo files",
    "- act autonomously",
    "- bypass mission, checkpoint, or governance approval",
  ].join("\n");
}

export function isControlledExecutionCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show\s+(?:controlled\s+)?execution\s+(?:system|policy)$/i.test(normalized) ||
    /^show\s+(?:controlled\s+)?execution\s+plans$/i.test(normalized) ||
    /^show\s+(?:controlled\s+)?execution\s+audit\s+log$/i.test(normalized) ||
    /^show\s+(?:controlled\s+)?execution\s+plan\s+execution-\S+$/i.test(normalized) ||
    /^(?:create|draft|propose)\s+(?:controlled\s+)?execution\s+plan\s+for\s+mission\s+mission-\S+(?:\s+::\s+.+)?$/i.test(normalized) ||
    /^approve\s+execution\s+checkpoint\s+execution-\S+\s+\S+$/i.test(normalized) ||
    /^reject\s+execution\s+checkpoint\s+execution-\S+\s+\S+$/i.test(normalized) ||
    /^approve\s+execution\s+plan\s+execution-\S+$/i.test(normalized) ||
    /^run\s+execution\s+dry\s+run\s+execution-\S+$/i.test(normalized) ||
    /^dry\s+run\s+execution\s+plan\s+execution-\S+$/i.test(normalized)
  );
}

export async function executeControlledExecutionCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show\s+(?:controlled\s+)?execution\s+(?:system|policy)$/i.test(normalized)) {
    const snapshot = await getControlledExecutionStoreSnapshot();
    return {
      ok: true,
      title: "Controlled Execution Policy",
      message: controlledExecutionPolicyMessage(),
      data: {
        planCount: snapshot.plans.length,
        dryRunCount: snapshot.dryRuns.length,
        auditEventCount: snapshot.auditLog.length,
        executionAllowed: false,
        toolExecutionAllowed: false,
        autonomousExecutionAllowed: false,
      },
    };
  }

  if (/^show\s+(?:controlled\s+)?execution\s+plans$/i.test(normalized)) {
    const plans = await readControlledExecutionPlans();
    return {
      ok: true,
      title: "Controlled Execution Plans",
      message: formatControlledExecutionPlanList(plans),
      data: plans,
    };
  }

  if (/^show\s+(?:controlled\s+)?execution\s+audit\s+log$/i.test(normalized)) {
    const auditLog = await readControlledExecutionAuditLog();
    return {
      ok: true,
      title: "Controlled Execution Audit Log",
      message: formatExecutionAuditLog(auditLog),
      data: auditLog,
    };
  }

  const showPlanMatch = normalized.match(/^show\s+(?:controlled\s+)?execution\s+plan\s+(execution-\S+)$/i);
  if (showPlanMatch?.[1]) {
    const plan = await getControlledExecutionPlanById(showPlanMatch[1]);
    if (!plan) {
      return {
        ok: false,
        title: "Controlled execution plan not found",
        message: `Could not find controlled execution plan: ${showPlanMatch[1]}`,
      };
    }

    return {
      ok: true,
      title: "Controlled Execution Plan",
      message: formatControlledExecutionPlan(plan),
      data: plan,
    };
  }

  const draft = parsePlanDraft(normalized);
  if (draft) {
    const plan = await createControlledExecutionPlan({
      missionId: draft.missionId,
      objective: draft.objective,
      createdBy: "ceo",
    });

    return {
      ok: true,
      title: "Controlled execution plan proposed",
      message: [
        "Created a controlled execution plan.",
        "No tools were executed.",
        "No autonomous action was enabled.",
        "",
        formatControlledExecutionPlan(plan),
        "",
        "Next safe step:",
        `- approve execution checkpoint ${plan.id} ceo-execution-approval`,
        `- approve execution checkpoint ${plan.id} security-execution-review`,
        ...plan.checkpoints
          .filter((checkpoint) => checkpoint.stepId && checkpoint.status === "pending")
          .map((checkpoint) => `- approve execution checkpoint ${plan.id} ${checkpoint.id}`),
        `- approve execution plan ${plan.id}`,
        `- run execution dry run ${plan.id}`,
      ].join("\n"),
      data: plan,
    };
  }

  const approveCheckpointMatch = normalized.match(/^approve\s+execution\s+checkpoint\s+(execution-\S+)\s+(\S+)$/i);
  if (approveCheckpointMatch?.[1] && approveCheckpointMatch[2]) {
    const plan = await approveControlledExecutionCheckpoint(approveCheckpointMatch[1], approveCheckpointMatch[2]);
    return {
      ok: true,
      title: "Controlled execution checkpoint approved",
      message: formatControlledExecutionPlan(plan),
      data: plan,
    };
  }

  const rejectCheckpointMatch = normalized.match(/^reject\s+execution\s+checkpoint\s+(execution-\S+)\s+(\S+)$/i);
  if (rejectCheckpointMatch?.[1] && rejectCheckpointMatch[2]) {
    const plan = await rejectControlledExecutionCheckpoint(rejectCheckpointMatch[1], rejectCheckpointMatch[2]);
    return {
      ok: true,
      title: "Controlled execution checkpoint rejected",
      message: formatControlledExecutionPlan(plan),
      data: plan,
    };
  }

  const approvePlanMatch = normalized.match(/^approve\s+execution\s+plan\s+(execution-\S+)$/i);
  if (approvePlanMatch?.[1]) {
    const plan = await approveControlledExecutionPlan(approvePlanMatch[1]);
    return {
      ok: true,
      title: "Controlled execution plan approved",
      message: [
        "Controlled execution plan approved for dry-run planning only.",
        "Tool execution remains blocked.",
        "Autonomous execution remains blocked.",
        "",
        formatControlledExecutionPlan(plan),
      ].join("\n"),
      data: plan,
    };
  }

  const dryRunMatch = normalized.match(/^run\s+execution\s+dry\s+run\s+(execution-\S+)$/i) ??
    normalized.match(/^dry\s+run\s+execution\s+plan\s+(execution-\S+)$/i);
  if (dryRunMatch?.[1]) {
    const dryRun = await createControlledExecutionDryRun(dryRunMatch[1]);
    return {
      ok: true,
      title: "Controlled execution dry run",
      message: formatControlledExecutionDryRun(dryRun),
      data: dryRun,
    };
  }

  return {
    ok: false,
    title: "Unknown controlled execution command",
    message: `The command was recognized as controlled-execution-related but no handler matched it: ${normalized}`,
  };
}
