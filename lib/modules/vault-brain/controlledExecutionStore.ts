import { promises as fs } from "node:fs";
import path from "node:path";
import { getChernobogMissionById } from "./chernobogMissionStore";
import {
  buildControlledExecutionCheckpoints,
  buildControlledExecutionSteps,
  createDefaultControlledExecutionStepDrafts,
  normalizeExecutionDepartments,
} from "./controlledExecutionPlanner";
import type {
  ControlledExecutionAuditEvent,
  ControlledExecutionDryRunRecord,
  ControlledExecutionDryRunStep,
  ControlledExecutionPlan,
  ControlledExecutionStoreSnapshot,
  CreateControlledExecutionPlanInput,
} from "./controlledExecutionTypes";

const CONTROLLED_EXECUTION_STORE_DIR = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "chernobog-inc",
  "controlled-execution"
);

const PLANS_PATH = path.join(CONTROLLED_EXECUTION_STORE_DIR, "execution-plans.json");
const DRY_RUNS_PATH = path.join(CONTROLLED_EXECUTION_STORE_DIR, "dry-runs.json");
const AUDIT_PATH = path.join(CONTROLLED_EXECUTION_STORE_DIR, "execution-audit-log.json");

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function makePlanId(title: string): string {
  return `execution-${slugify(title) || "plan"}-${Date.now().toString(36)}`;
}

function makeAuditId(): string {
  return `execution-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDryRunId(): string {
  return `dry-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureControlledExecutionStore(): Promise<void> {
  await fs.mkdir(CONTROLLED_EXECUTION_STORE_DIR, { recursive: true });
  await Promise.all([
    fs.access(PLANS_PATH).catch(() => fs.writeFile(PLANS_PATH, "[]\n", "utf8")),
    fs.access(DRY_RUNS_PATH).catch(() => fs.writeFile(DRY_RUNS_PATH, "[]\n", "utf8")),
    fs.access(AUDIT_PATH).catch(() => fs.writeFile(AUDIT_PATH, "[]\n", "utf8")),
  ]);
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureControlledExecutionStore();
  const raw = await fs.readFile(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function writeJsonArray<T>(filePath: string, items: T[]): Promise<void> {
  await ensureControlledExecutionStore();
  await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

async function appendControlledExecutionAudit(
  event: Omit<ControlledExecutionAuditEvent, "id" | "createdAt">
): Promise<ControlledExecutionAuditEvent> {
  const auditLog = await readJsonArray<ControlledExecutionAuditEvent>(AUDIT_PATH);
  const next = {
    id: makeAuditId(),
    createdAt: nowIso(),
    ...event,
  };
  auditLog.push(next);
  await writeJsonArray(AUDIT_PATH, auditLog);
  return next;
}

function requiredCheckpointsApproved(plan: ControlledExecutionPlan): boolean {
  return plan.checkpoints
    .filter((checkpoint) => checkpoint.required)
    .every((checkpoint) => checkpoint.status === "approved");
}

function hasBlockedStep(plan: ControlledExecutionPlan): boolean {
  return plan.steps.some((step) => step.status === "blocked" || step.trustDecision.status === "blocked");
}

async function updatePlan(
  planId: string,
  updater: (plan: ControlledExecutionPlan) => ControlledExecutionPlan
): Promise<ControlledExecutionPlan> {
  const plans = await readControlledExecutionPlans();
  const index = plans.findIndex((plan) => plan.id === planId);

  if (index === -1) {
    throw new Error(`Controlled execution plan not found: ${planId}`);
  }

  const updated = updater(plans[index]);
  plans[index] = updated;
  await writeJsonArray(PLANS_PATH, plans);
  return updated;
}

export async function readControlledExecutionPlans(): Promise<ControlledExecutionPlan[]> {
  return readJsonArray<ControlledExecutionPlan>(PLANS_PATH);
}

export async function readControlledExecutionDryRuns(): Promise<ControlledExecutionDryRunRecord[]> {
  return readJsonArray<ControlledExecutionDryRunRecord>(DRY_RUNS_PATH);
}

export async function readControlledExecutionAuditLog(): Promise<ControlledExecutionAuditEvent[]> {
  return readJsonArray<ControlledExecutionAuditEvent>(AUDIT_PATH);
}

export async function getControlledExecutionStoreSnapshot(): Promise<ControlledExecutionStoreSnapshot> {
  const [plans, dryRuns, auditLog] = await Promise.all([
    readControlledExecutionPlans(),
    readControlledExecutionDryRuns(),
    readControlledExecutionAuditLog(),
  ]);

  return { plans, dryRuns, auditLog };
}

export async function getControlledExecutionPlanById(
  planId: string
): Promise<ControlledExecutionPlan | undefined> {
  const plans = await readControlledExecutionPlans();
  return plans.find((plan) => plan.id === planId);
}

export async function createControlledExecutionPlan(
  input: CreateControlledExecutionPlanInput
): Promise<ControlledExecutionPlan> {
  const mission = await getChernobogMissionById(input.missionId);
  if (!mission) {
    throw new Error(`Mission not found: ${input.missionId}`);
  }

  if (mission.status !== "approved" && mission.status !== "in_progress") {
    throw new Error("Controlled execution plans require an approved or in-progress mission.");
  }

  const title = input.title?.trim() || `Controlled execution plan for ${mission.title}`;
  const objective = input.objective?.trim() || mission.objective;
  const departments = normalizeExecutionDepartments(input.departments ?? mission.departments);
  const stepDrafts = input.steps?.length
    ? input.steps
    : createDefaultControlledExecutionStepDrafts(mission.id, objective, departments);
  const steps = buildControlledExecutionSteps(stepDrafts);
  const checkpoints = buildControlledExecutionCheckpoints(steps);
  const timestamp = nowIso();

  const plan: ControlledExecutionPlan = {
    id: makePlanId(title),
    missionId: mission.id,
    title,
    objective,
    status: hasBlockedStep({ steps } as ControlledExecutionPlan) ? "blocked" : "pending_approval",
    mode: "dry-run",
    projectId: input.projectId?.trim() || mission.projectId,
    version: input.version?.trim() || mission.version,
    departments,
    steps,
    checkpoints,
    executionAllowed: false,
    toolExecutionAllowed: false,
    autonomousExecutionAllowed: false,
    dryRunOnly: true,
    governanceEvaluated: true,
    securityReviewRequired: true,
    rollbackNotes: steps.map((step) => step.rollbackNote).filter((note): note is string => Boolean(note)),
    createdBy: input.createdBy ?? "ceo",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const plans = await readControlledExecutionPlans();
  plans.push(plan);
  await writeJsonArray(PLANS_PATH, plans);

  await appendControlledExecutionAudit({
    planId: plan.id,
    missionId: plan.missionId,
    action: "plan-created",
    summary: `Controlled execution plan created with ${plan.steps.length} planned step(s).`,
  });

  return plan;
}

export async function approveControlledExecutionCheckpoint(
  planId: string,
  checkpointId: string,
  notes?: string
): Promise<ControlledExecutionPlan> {
  const updated = await updatePlan(planId, (plan) => {
    const checkpointIndex = plan.checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    if (checkpointIndex === -1) {
      throw new Error(`Controlled execution checkpoint not found: ${checkpointId}`);
    }

    const checkpoints = plan.checkpoints.map((checkpoint, index) => index === checkpointIndex
      ? {
          ...checkpoint,
          status: "approved" as const,
          notes: notes ?? checkpoint.notes,
          approvedAt: nowIso(),
          updatedAt: nowIso(),
        }
      : checkpoint);

    const checkpoint = checkpoints[checkpointIndex];
    const steps = checkpoint.stepId
      ? plan.steps.map((step) => step.id === checkpoint.stepId
          ? { ...step, status: "approved" as const, updatedAt: nowIso() }
          : step)
      : plan.steps;

    return {
      ...plan,
      checkpoints,
      steps,
      updatedAt: nowIso(),
    };
  });

  await appendControlledExecutionAudit({
    planId,
    missionId: updated.missionId,
    action: "checkpoint-approved",
    summary: `Controlled execution checkpoint approved: ${checkpointId}`,
  });

  return updated;
}

export async function rejectControlledExecutionCheckpoint(
  planId: string,
  checkpointId: string,
  notes?: string
): Promise<ControlledExecutionPlan> {
  const updated = await updatePlan(planId, (plan) => {
    const checkpointIndex = plan.checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    if (checkpointIndex === -1) {
      throw new Error(`Controlled execution checkpoint not found: ${checkpointId}`);
    }

    const checkpoints = plan.checkpoints.map((checkpoint, index) => index === checkpointIndex
      ? {
          ...checkpoint,
          status: "rejected" as const,
          notes: notes ?? checkpoint.notes,
          rejectedAt: nowIso(),
          updatedAt: nowIso(),
        }
      : checkpoint);

    return {
      ...plan,
      status: "rejected",
      checkpoints,
      executionAllowed: false,
      toolExecutionAllowed: false,
      autonomousExecutionAllowed: false,
      updatedAt: nowIso(),
    };
  });

  await appendControlledExecutionAudit({
    planId,
    missionId: updated.missionId,
    action: "checkpoint-rejected",
    summary: `Controlled execution checkpoint rejected: ${checkpointId}`,
  });

  return updated;
}

export async function approveControlledExecutionPlan(
  planId: string
): Promise<ControlledExecutionPlan> {
  const updated = await updatePlan(planId, (plan) => {
    if (plan.status === "rejected" || plan.status === "completed") {
      throw new Error(`Controlled execution plan is terminal: ${plan.status}`);
    }

    if (hasBlockedStep(plan)) {
      throw new Error("Controlled execution plan has blocked steps and cannot be approved.");
    }

    if (!requiredCheckpointsApproved(plan)) {
      throw new Error("Controlled execution plan cannot be approved until all required checkpoints are approved.");
    }

    return {
      ...plan,
      status: "approved",
      executionAllowed: false,
      toolExecutionAllowed: false,
      autonomousExecutionAllowed: false,
      dryRunOnly: true,
      updatedAt: nowIso(),
    };
  });

  await appendControlledExecutionAudit({
    planId,
    missionId: updated.missionId,
    action: "plan-approved",
    summary: "Controlled execution plan approved for dry-run planning only. Tool execution remains blocked.",
  });

  return updated;
}

export async function createControlledExecutionDryRun(
  planId: string
): Promise<ControlledExecutionDryRunRecord> {
  const plan = await getControlledExecutionPlanById(planId);
  if (!plan) {
    throw new Error(`Controlled execution plan not found: ${planId}`);
  }

  const steps: ControlledExecutionDryRunStep[] = plan.steps.map((step) => ({
    stepId: step.id,
    title: step.title,
    actionType: step.actionType,
    requestedTool: step.requestedTool,
    target: step.target,
    wouldExecute: false,
    decisionStatus: step.trustDecision.status,
    risk: step.trustDecision.risk,
    reason: step.trustDecision.reason,
  }));

  const dryRun: ControlledExecutionDryRunRecord = {
    id: makeDryRunId(),
    planId: plan.id,
    missionId: plan.missionId,
    createdAt: nowIso(),
    wouldExecute: false,
    steps,
    notes: [
      "Dry run created without executing tools.",
      "V5.9.5 records what would happen and which governance decisions apply.",
      "Actual execution remains blocked until a later explicit execution milestone.",
    ],
  };

  const dryRuns = await readControlledExecutionDryRuns();
  dryRuns.push(dryRun);
  await writeJsonArray(DRY_RUNS_PATH, dryRuns);

  await appendControlledExecutionAudit({
    planId: plan.id,
    missionId: plan.missionId,
    action: "dry-run-created",
    summary: `Controlled execution dry-run created with ${dryRun.steps.length} non-executing step(s).`,
  });

  return dryRun;
}

export function formatControlledExecutionPlan(plan: ControlledExecutionPlan): string {
  const checkpoints = plan.checkpoints.map((checkpoint) => [
    `- ${checkpoint.id}: ${checkpoint.title}`,
    `  Status: ${checkpoint.status}`,
    `  Required: ${checkpoint.required ? "yes" : "no"}`,
    checkpoint.stepId ? `  Step: ${checkpoint.stepId}` : undefined,
  ].filter((line): line is string => typeof line === "string").join("\n"));

  const steps = plan.steps.map((step) => [
    `- ${step.id}: ${step.title}`,
    `  Department: ${step.department ?? "operations"}`,
    `  Worker role: ${step.workerRole ?? "planner"}`,
    `  Action: ${step.actionType}`,
    step.requestedTool ? `  Tool: ${step.requestedTool}` : undefined,
    step.target ? `  Target: ${step.target}` : undefined,
    `  Status: ${step.status}`,
    `  Trust decision: ${step.trustDecision.status}`,
    `  Risk: ${step.trustDecision.risk}`,
  ].filter((line): line is string => typeof line === "string").join("\n"));

  return [
    `ID: ${plan.id}`,
    `Mission: ${plan.missionId}`,
    `Title: ${plan.title}`,
    `Status: ${plan.status}`,
    `Mode: ${plan.mode}`,
    `Project: ${plan.projectId}`,
    plan.version ? `Version: ${plan.version}` : undefined,
    `Execution allowed: ${plan.executionAllowed ? "yes" : "no"}`,
    `Tool execution allowed: ${plan.toolExecutionAllowed ? "yes" : "no"}`,
    `Autonomous execution allowed: ${plan.autonomousExecutionAllowed ? "yes" : "no"}`,
    `Dry run only: ${plan.dryRunOnly ? "yes" : "no"}`,
    "",
    "Objective:",
    plan.objective,
    "",
    "Steps:",
    steps.join("\n"),
    "",
    "Checkpoints:",
    checkpoints.join("\n"),
    "",
    "Rollback notes:",
    plan.rollbackNotes.length > 0 ? plan.rollbackNotes.map((note) => `- ${note}`).join("\n") : "- none recorded",
  ].filter((line): line is string => typeof line === "string").join("\n");
}

export function formatControlledExecutionPlanList(plans: ControlledExecutionPlan[]): string {
  if (plans.length === 0) {
    return "No controlled execution plans found.";
  }

  return plans
    .slice(-25)
    .reverse()
    .map((plan) => `- ${plan.id} | ${plan.status} | ${plan.title} | mission: ${plan.missionId}`)
    .join("\n");
}

export function formatControlledExecutionDryRun(dryRun: ControlledExecutionDryRunRecord): string {
  return [
    `Dry run: ${dryRun.id}`,
    `Plan: ${dryRun.planId}`,
    `Mission: ${dryRun.missionId}`,
    `Would execute: ${dryRun.wouldExecute ? "yes" : "no"}`,
    "",
    "Steps:",
    ...dryRun.steps.map((step) => [
      `- ${step.stepId}: ${step.title}`,
      `  Would execute: ${step.wouldExecute ? "yes" : "no"}`,
      `  Decision: ${step.decisionStatus}`,
      `  Risk: ${step.risk}`,
    ].join("\n")),
    "",
    "Notes:",
    ...dryRun.notes.map((note) => `- ${note}`),
  ].join("\n");
}
