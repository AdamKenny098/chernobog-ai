export const CHERNOBOG_MISSION_STATUSES = [
  "proposed",
  "approved",
  "in_progress",
  "blocked",
  "needs_review",
  "completed",
  "rejected",
] as const;

export type ChernobogMissionStatus = (typeof CHERNOBOG_MISSION_STATUSES)[number];

export const CHERNOBOG_MISSION_PRIORITIES = [
  "low",
  "normal",
  "high",
  "critical",
] as const;

export type ChernobogMissionPriority = (typeof CHERNOBOG_MISSION_PRIORITIES)[number];

export const CHERNOBOG_INC_DEPARTMENTS = [
  "engineering",
  "design",
  "narrative",
  "research",
  "operations",
  "security",
] as const;

export type ChernobogIncDepartment = (typeof CHERNOBOG_INC_DEPARTMENTS)[number];

export const CHERNOBOG_WORKER_ROLES = [
  "project-lead",
  "planner",
  "designer",
  "creator",
  "reviewer",
  "security-analyst",
] as const;

export type ChernobogWorkerRole = (typeof CHERNOBOG_WORKER_ROLES)[number];

export const CHERNOBOG_CHECKPOINT_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type ChernobogCheckpointStatus = (typeof CHERNOBOG_CHECKPOINT_STATUSES)[number];

export type ChernobogMissionSourceRef = {
  type: "manual" | "proposal" | "memory" | "roadmap" | "system";
  id?: string;
  path?: string;
  url?: string;
};

export type ChernobogMissionApprovalCheckpoint = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  status: ChernobogCheckpointStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
};

export type ChernobogMissionWorkerAssignment = {
  department: ChernobogIncDepartment;
  roles: ChernobogWorkerRole[];
  leadRole: ChernobogWorkerRole;
};

export type ChernobogMissionRecord = {
  id: string;
  title: string;
  objective: string;
  status: ChernobogMissionStatus;
  priority: ChernobogMissionPriority;
  projectId: string;
  version?: string;
  departments: ChernobogIncDepartment[];
  workerAssignments: ChernobogMissionWorkerAssignment[];
  approvalCheckpoints: ChernobogMissionApprovalCheckpoint[];
  executionAllowed: false;
  toolExecutionAllowed: false;
  autonomousExecutionAllowed: false;
  createdBy: "ceo" | "executive-core" | "system";
  tags: string[];
  notes?: string;
  sourceRef?: ChernobogMissionSourceRef;
  createdAt: string;
  updatedAt: string;
};

export type ChernobogMissionAuditEvent = {
  id: string;
  missionId?: string;
  action:
    | "created"
    | "status-updated"
    | "checkpoint-approved"
    | "checkpoint-rejected"
    | "read"
    | "verification";
  summary: string;
  previousStatus?: ChernobogMissionStatus;
  nextStatus?: ChernobogMissionStatus;
  createdAt: string;
};

export type CreateChernobogMissionInput = {
  title: string;
  objective: string;
  projectId?: string;
  version?: string;
  departments?: string[];
  priority?: string;
  tags?: string[];
  createdBy?: "ceo" | "executive-core" | "system";
  notes?: string;
  sourceRef?: ChernobogMissionSourceRef;
};

export type ChernobogMissionStoreSnapshot = {
  missions: ChernobogMissionRecord[];
  auditLog: ChernobogMissionAuditEvent[];
};

export function isChernobogMissionStatus(value: string): value is ChernobogMissionStatus {
  return CHERNOBOG_MISSION_STATUSES.includes(value as ChernobogMissionStatus);
}

export function isChernobogMissionPriority(value: string): value is ChernobogMissionPriority {
  return CHERNOBOG_MISSION_PRIORITIES.includes(value as ChernobogMissionPriority);
}

export function isChernobogIncDepartment(value: string): value is ChernobogIncDepartment {
  return CHERNOBOG_INC_DEPARTMENTS.includes(value as ChernobogIncDepartment);
}

export function isChernobogWorkerRole(value: string): value is ChernobogWorkerRole {
  return CHERNOBOG_WORKER_ROLES.includes(value as ChernobogWorkerRole);
}

export function normalizeMissionDepartment(value: string): ChernobogIncDepartment | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (normalized === "eng") {
    return "engineering";
  }
  if (normalized === "ops") {
    return "operations";
  }
  if (isChernobogIncDepartment(normalized)) {
    return normalized;
  }
  return undefined;
}

export function normalizeMissionPriority(value: string | undefined): ChernobogMissionPriority {
  if (!value) {
    return "normal";
  }
  const normalized = value.trim().toLowerCase();
  return isChernobogMissionPriority(normalized) ? normalized : "normal";
}

export function defaultMissionDepartments(input?: string[]): ChernobogIncDepartment[] {
  const normalized = (input ?? [])
    .map((department) => normalizeMissionDepartment(department))
    .filter((department): department is ChernobogIncDepartment => Boolean(department));

  if (normalized.length === 0) {
    return ["engineering", "security"];
  }

  return Array.from(new Set(normalized));
}

export function getAllowedMissionTransitions(
  status: ChernobogMissionStatus
): ChernobogMissionStatus[] {
  switch (status) {
    case "proposed":
      return ["approved", "rejected"];
    case "approved":
      return ["in_progress", "rejected"];
    case "in_progress":
      return ["blocked", "needs_review", "completed", "rejected"];
    case "blocked":
      return ["in_progress", "rejected"];
    case "needs_review":
      return ["in_progress", "completed", "rejected"];
    case "completed":
    case "rejected":
      return [];
  }
}

export function canTransitionMissionStatus(
  currentStatus: ChernobogMissionStatus,
  nextStatus: ChernobogMissionStatus
): boolean {
  return getAllowedMissionTransitions(currentStatus).includes(nextStatus);
}
