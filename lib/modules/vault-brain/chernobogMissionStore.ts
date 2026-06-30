import { promises as fs } from "fs";
import path from "path";
import { getDefaultMissionWorkerRoles } from "./chernobogDepartmentWorkers";
import {
  canTransitionMissionStatus,
  ChernobogIncDepartment,
  ChernobogMissionApprovalCheckpoint,
  ChernobogMissionAuditEvent,
  ChernobogMissionRecord,
  ChernobogMissionStatus,
  ChernobogMissionStoreSnapshot,
  ChernobogMissionWorkerAssignment,
  CreateChernobogMissionInput,
  defaultMissionDepartments,
  isChernobogMissionStatus,
  normalizeMissionPriority,
} from "./chernobogMissionTypes";

const MISSION_STORE_DIR = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "chernobog-inc",
  "missions"
);

const MISSIONS_PATH = path.join(MISSION_STORE_DIR, "missions.json");
const MISSION_AUDIT_PATH = path.join(MISSION_STORE_DIR, "mission-audit-log.json");

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function makeMissionId(title: string) {
  const slug = slugify(title) || "mission";
  return `mission-${slug}-${Date.now().toString(36)}`;
}

function makeAuditId() {
  return `mission-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureMissionStore() {
  await fs.mkdir(MISSION_STORE_DIR, { recursive: true });
  await Promise.all([
    fs.access(MISSIONS_PATH).catch(() => fs.writeFile(MISSIONS_PATH, "[]\n", "utf8")),
    fs.access(MISSION_AUDIT_PATH).catch(() => fs.writeFile(MISSION_AUDIT_PATH, "[]\n", "utf8")),
  ]);
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureMissionStore();
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function writeJsonArray<T>(filePath: string, items: T[]) {
  await ensureMissionStore();
  await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function buildApprovalCheckpoints(departments: ChernobogIncDepartment[]): ChernobogMissionApprovalCheckpoint[] {
  const timestamp = nowIso();
  const checkpoints: ChernobogMissionApprovalCheckpoint[] = [
    {
      id: "ceo-approval",
      title: "CEO approval",
      description: "The user must approve this mission before it can move out of proposed state.",
      required: true,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  if (departments.includes("security")) {
    checkpoints.push({
      id: "security-review",
      title: "Security review",
      description: "Security must review the mission before approved mission work begins.",
      required: true,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return checkpoints;
}

function buildWorkerAssignments(departments: ChernobogIncDepartment[]): ChernobogMissionWorkerAssignment[] {
  return departments.map((department) => ({
    department,
    roles: getDefaultMissionWorkerRoles(department),
    leadRole: "project-lead",
  }));
}

async function appendAudit(event: Omit<ChernobogMissionAuditEvent, "id" | "createdAt">) {
  const auditLog = await readJsonArray<ChernobogMissionAuditEvent>(MISSION_AUDIT_PATH);
  auditLog.push({
    id: makeAuditId(),
    createdAt: nowIso(),
    ...event,
  });
  await writeJsonArray(MISSION_AUDIT_PATH, auditLog);
}

export async function readChernobogMissions(): Promise<ChernobogMissionRecord[]> {
  return readJsonArray<ChernobogMissionRecord>(MISSIONS_PATH);
}

export async function readChernobogMissionAuditLog(): Promise<ChernobogMissionAuditEvent[]> {
  return readJsonArray<ChernobogMissionAuditEvent>(MISSION_AUDIT_PATH);
}

export async function getChernobogMissionStoreSnapshot(): Promise<ChernobogMissionStoreSnapshot> {
  const [missions, auditLog] = await Promise.all([
    readChernobogMissions(),
    readChernobogMissionAuditLog(),
  ]);
  return { missions, auditLog };
}

export async function createChernobogMission(
  input: CreateChernobogMissionInput
): Promise<ChernobogMissionRecord> {
  const title = input.title.trim();
  const objective = input.objective.trim();

  if (!title) {
    throw new Error("Mission title is required.");
  }

  if (!objective) {
    throw new Error("Mission objective is required.");
  }

  const departments = defaultMissionDepartments(input.departments);
  const timestamp = nowIso();
  const mission: ChernobogMissionRecord = {
    id: makeMissionId(title),
    title,
    objective,
    status: "proposed",
    priority: normalizeMissionPriority(input.priority),
    projectId: input.projectId?.trim() || "chernobog",
    version: input.version?.trim() || undefined,
    departments,
    workerAssignments: buildWorkerAssignments(departments),
    approvalCheckpoints: buildApprovalCheckpoints(departments),
    executionAllowed: false,
    toolExecutionAllowed: false,
    autonomousExecutionAllowed: false,
    createdBy: input.createdBy ?? "ceo",
    tags: input.tags ?? [],
    notes: input.notes,
    sourceRef: input.sourceRef,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const missions = await readChernobogMissions();
  missions.push(mission);
  await writeJsonArray(MISSIONS_PATH, missions);
  await appendAudit({
    missionId: mission.id,
    action: "created",
    summary: `Mission created: ${mission.title}`,
    nextStatus: mission.status,
  });
  return mission;
}

export async function getChernobogMissionById(
  missionId: string
): Promise<ChernobogMissionRecord | undefined> {
  const missions = await readChernobogMissions();
  return missions.find((mission) => mission.id === missionId);
}

export function requiredMissionCheckpointsApproved(mission: ChernobogMissionRecord) {
  return mission.approvalCheckpoints
    .filter((checkpoint) => checkpoint.required)
    .every((checkpoint) => checkpoint.status === "approved");
}

async function updateMission(
  missionId: string,
  updater: (mission: ChernobogMissionRecord) => ChernobogMissionRecord
): Promise<ChernobogMissionRecord> {
  const missions = await readChernobogMissions();
  const index = missions.findIndex((mission) => mission.id === missionId);

  if (index === -1) {
    throw new Error(`Mission not found: ${missionId}`);
  }

  const updated = updater(missions[index]);
  missions[index] = updated;
  await writeJsonArray(MISSIONS_PATH, missions);
  return updated;
}

export async function updateChernobogMissionStatus(
  missionId: string,
  nextStatus: string,
  notes?: string
): Promise<ChernobogMissionRecord> {
  if (!isChernobogMissionStatus(nextStatus)) {
    throw new Error(`Invalid mission status: ${nextStatus}`);
  }

  let previousStatus: ChernobogMissionStatus | undefined;
  const updated = await updateMission(missionId, (mission) => {
    previousStatus = mission.status;

    if (!canTransitionMissionStatus(mission.status, nextStatus)) {
      throw new Error(`Invalid mission status transition: ${mission.status} -> ${nextStatus}`);
    }

    if (nextStatus === "approved" && !requiredMissionCheckpointsApproved(mission)) {
      throw new Error("Mission cannot be approved until all required checkpoints are approved.");
    }

    return {
      ...mission,
      status: nextStatus,
      notes: notes ?? mission.notes,
      executionAllowed: false,
      toolExecutionAllowed: false,
      autonomousExecutionAllowed: false,
      updatedAt: nowIso(),
    };
  });

  await appendAudit({
    missionId,
    action: "status-updated",
    summary: `Mission status updated: ${previousStatus ?? "unknown"} -> ${updated.status}`,
    previousStatus,
    nextStatus: updated.status,
  });

  return updated;
}

export async function approveChernobogMissionCheckpoint(
  missionId: string,
  checkpointId: string,
  notes?: string
): Promise<ChernobogMissionRecord> {
  const updated = await updateMission(missionId, (mission) => {
    const timestamp = nowIso();
    let found = false;
    const checkpoints = mission.approvalCheckpoints.map((checkpoint) => {
      if (checkpoint.id !== checkpointId) {
        return checkpoint;
      }
      found = true;
      return {
        ...checkpoint,
        status: "approved" as const,
        approvedAt: timestamp,
        rejectedAt: undefined,
        notes: notes ?? checkpoint.notes,
        updatedAt: timestamp,
      };
    });

    if (!found) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    return {
      ...mission,
      approvalCheckpoints: checkpoints,
      updatedAt: timestamp,
    };
  });

  await appendAudit({
    missionId,
    action: "checkpoint-approved",
    summary: `Mission checkpoint approved: ${checkpointId}`,
  });

  return updated;
}

export async function rejectChernobogMissionCheckpoint(
  missionId: string,
  checkpointId: string,
  notes?: string
): Promise<ChernobogMissionRecord> {
  const updated = await updateMission(missionId, (mission) => {
    const timestamp = nowIso();
    let found = false;
    const checkpoints = mission.approvalCheckpoints.map((checkpoint) => {
      if (checkpoint.id !== checkpointId) {
        return checkpoint;
      }
      found = true;
      return {
        ...checkpoint,
        status: "rejected" as const,
        rejectedAt: timestamp,
        approvedAt: undefined,
        notes: notes ?? checkpoint.notes,
        updatedAt: timestamp,
      };
    });

    if (!found) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    return {
      ...mission,
      approvalCheckpoints: checkpoints,
      updatedAt: timestamp,
    };
  });

  await appendAudit({
    missionId,
    action: "checkpoint-rejected",
    summary: `Mission checkpoint rejected: ${checkpointId}`,
  });

  return updated;
}

export function formatChernobogMission(mission: ChernobogMissionRecord) {
  return [
    `${mission.title}`,
    `ID: ${mission.id}`,
    `Status: ${mission.status}`,
    `Priority: ${mission.priority}`,
    `Project: ${mission.projectId}`,
    mission.version ? `Version: ${mission.version}` : "Version: none",
    `Departments: ${mission.departments.join(", ")}`,
    `Execution allowed: ${mission.executionAllowed ? "yes" : "no"}`,
    `Tool execution allowed: ${mission.toolExecutionAllowed ? "yes" : "no"}`,
    "",
    "Objective:",
    mission.objective,
    "",
    "Approval checkpoints:",
    ...mission.approvalCheckpoints.map(
      (checkpoint) =>
        `- ${checkpoint.id}: ${checkpoint.status}${checkpoint.required ? " (required)" : ""} — ${checkpoint.title}`
    ),
    "",
    "Worker assignments:",
    ...mission.workerAssignments.map(
      (assignment) => `- ${assignment.department}: ${assignment.roles.join(", ")}`
    ),
  ].join("\n");
}

export function formatChernobogMissionList(missions: ChernobogMissionRecord[]) {
  if (missions.length === 0) {
    return "No Chernobog Inc missions found.";
  }

  return missions
    .map(
      (mission) =>
        `- ${mission.id} | ${mission.status} | ${mission.projectId}${mission.version ? ` ${mission.version}` : ""} | ${mission.title}`
    )
    .join("\n");
}

export const CHERNOBOG_MISSION_STORE_PATHS = {
  root: MISSION_STORE_DIR,
  missions: MISSIONS_PATH,
  auditLog: MISSION_AUDIT_PATH,
} as const;
