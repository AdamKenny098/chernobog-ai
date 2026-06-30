import { createTrustDecision } from "./trustDecision";
import type { ChernobogIncDepartment, ChernobogWorkerRole } from "./chernobogMissionTypes";
import { defaultMissionDepartments, normalizeMissionDepartment } from "./chernobogMissionTypes";
import type {
  ControlledExecutionCheckpoint,
  ControlledExecutionStep,
  ControlledExecutionStepDraft,
} from "./controlledExecutionTypes";

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
}

function makeStepId(index: number, title: string): string {
  return `step-${String(index + 1).padStart(2, "0")}-${slugify(title) || "planned-action"}`;
}

export function normalizeExecutionDepartments(input?: string[]): ChernobogIncDepartment[] {
  const normalized = (input ?? [])
    .map((department) => normalizeMissionDepartment(department))
    .filter((department): department is ChernobogIncDepartment => Boolean(department));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : defaultMissionDepartments();
}

export function defaultExecutionWorkerRole(
  department: ChernobogIncDepartment
): ChernobogWorkerRole {
  if (department === "security") {
    return "security-analyst";
  }

  if (department === "design") {
    return "designer";
  }

  if (department === "research") {
    return "planner";
  }

  return "creator";
}

export function createDefaultControlledExecutionStepDrafts(
  missionId: string,
  objective: string,
  departments: ChernobogIncDepartment[]
): ControlledExecutionStepDraft[] {
  const primaryDepartment = departments.includes("engineering")
    ? "engineering"
    : departments[0] ?? "operations";

  return [
    {
      title: "Read mission and approved vault context",
      description: "Collect mission context and approved memory before planning any changes.",
      actionType: "memory-read",
      requestedTool: "vault.memory.read",
      target: missionId,
      department: "research",
      workerRole: "planner",
      expectedChange: "No mutation. Context only.",
      rollbackNote: "No rollback required for read-only context gathering.",
    },
    {
      title: "Prepare proposed implementation patch",
      description: `Prepare a patch plan for: ${objective}`,
      actionType: "file-write",
      requestedTool: "files.write",
      target: "repo patch proposal",
      department: primaryDepartment,
      workerRole: defaultExecutionWorkerRole(primaryDepartment),
      expectedChange: "Potential repo file changes, but V5.9.5 records only the plan.",
      rollbackNote: "Keep changed file list and restoration notes before any later write-capable milestone.",
      securityReviewRequired: true,
    },
    {
      title: "Run verification command set",
      description: "Plan the verification command sequence for the patch.",
      actionType: "project-command",
      requestedTool: "project.command",
      target: "npm run verify; npx tsc --noEmit; npm run lint",
      department: "engineering",
      workerRole: "reviewer",
      expectedChange: "No repo mutation expected from verification commands, but command execution is still gated.",
      rollbackNote: "Capture output and stop on first failure.",
      securityReviewRequired: true,
    },
    {
      title: "Security review before any future execution",
      description: "Review action risks, forbidden targets, rollback notes, and approval status.",
      actionType: "governance-edit",
      requestedTool: "governance.review",
      target: "controlled execution plan",
      department: "security",
      workerRole: "security-analyst",
      expectedChange: "No mutation. Produces a safety decision.",
      rollbackNote: "Do not proceed if security review is rejected or blocked.",
      securityReviewRequired: true,
    },
  ];
}

export function buildControlledExecutionSteps(
  drafts: ControlledExecutionStepDraft[]
): ControlledExecutionStep[] {
  const timestamp = nowIso();

  return drafts.map((draft, index) => {
    const trustDecision = createTrustDecision({
      title: draft.title,
      description: draft.description,
      actionType: draft.actionType,
      requestedTool: draft.requestedTool,
      target: draft.target,
      actor: `chernobog-inc/${draft.department ?? "operations"}/${draft.workerRole ?? "planner"}`,
      metadata: {
        executionPlanStep: true,
      },
    });
    const checkpointRequired =
      trustDecision.approvalRequired ||
      trustDecision.explicitApprovalRequired ||
      trustDecision.status === "blocked" ||
      Boolean(draft.securityReviewRequired);
    const id = makeStepId(index, draft.title);

    return {
      ...draft,
      id,
      department: draft.department ?? "operations",
      workerRole: draft.workerRole ?? "planner",
      status: trustDecision.status === "blocked" ? "blocked" : "planned",
      trustDecision,
      checkpointRequired,
      checkpointId: checkpointRequired ? `checkpoint-${id}` : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

export function buildControlledExecutionCheckpoints(
  steps: ControlledExecutionStep[]
): ControlledExecutionCheckpoint[] {
  const timestamp = nowIso();
  const checkpoints: ControlledExecutionCheckpoint[] = [
    {
      id: "ceo-execution-approval",
      title: "CEO execution approval",
      description: "The user must approve the controlled execution plan before it can leave pending approval.",
      required: true,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "security-execution-review",
      title: "Security execution review",
      description: "Security must review the plan, rollback notes, and governance decisions before later execution is considered.",
      required: true,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  for (const step of steps) {
    if (!step.checkpointRequired || !step.checkpointId) {
      continue;
    }

    checkpoints.push({
      id: step.checkpointId,
      stepId: step.id,
      title: `Step approval: ${step.title}`,
      description: `Approve or reject this planned step. Governance decision: ${step.trustDecision.status}.`,
      required: true,
      status: step.trustDecision.status === "blocked" ? "rejected" : "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return checkpoints;
}
