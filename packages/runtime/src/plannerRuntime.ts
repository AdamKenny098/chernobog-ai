/**
 * OH-2D — Authoritative Planner / Orchestrator Runtime.
 *
 * Owns the lifecycle shared by explicit task planning and response orchestration.
 * Existing planner/orchestrator implementations remain the engines behind this
 * authority. This runtime adds no new autonomy and never bypasses Trust or Tool
 * Gateway.
 */

export type PlannerPhase = "planning" | "orchestration";

export type PlannerLifecycleStatus =
  | "active"
  | "blocked"
  | "waiting"
  | "resumed"
  | "completed"
  | "failed";

export type PlannerActionIntent = {
  phase: PlannerPhase;
  summary: string;
};

export type PlannerStepSnapshot = {
  sequence: number;
  phase: PlannerPhase;
  status: PlannerLifecycleStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  reason: string | null;
};

export type PlannerLifecycleSnapshot = {
  turnId: string;
  revision: number;
  status: PlannerLifecycleStatus;
  activePhase: PlannerPhase | null;
  createdAt: string;
  updatedAt: string;
  reason: string | null;
  steps: PlannerStepSnapshot[];
  actionIntents: PlannerActionIntent[];
};

type MutablePlannerLifecycle = PlannerLifecycleSnapshot;

export class PlannerRuntime {
  private revision = 0;
  private readonly plans = new Map<string, MutablePlannerLifecycle>();
  private readonly maxRetainedPlans = 256;

  private now(): string {
    return new Date().toISOString();
  }

  private touch(plan: MutablePlannerLifecycle): void {
    this.revision += 1;
    plan.revision = this.revision;
    plan.updatedAt = this.now();
  }

  private getOrCreate(turnId: string): MutablePlannerLifecycle {
    const existing = this.plans.get(turnId);
    if (existing) return existing;

    const timestamp = this.now();
    this.revision += 1;

    const created: MutablePlannerLifecycle = {
      turnId,
      revision: this.revision,
      status: "active",
      activePhase: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      reason: null,
      steps: [],
      actionIntents: [],
    };

    this.plans.set(turnId, created);
    this.trim();
    return created;
  }

  private trim(): void {
    while (this.plans.size > this.maxRetainedPlans) {
      const firstKey = this.plans.keys().next().value as string | undefined;
      if (!firstKey) return;
      this.plans.delete(firstKey);
    }
  }

  private summarizeActionIntent(
    phase: PlannerPhase,
    value: unknown,
  ): PlannerActionIntent | null {
    if (!value || typeof value !== "object") return null;

    const record = value as Record<string, unknown>;
    for (const key of ["actionIntent", "intent", "action", "nextAction"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return { phase, summary: candidate.trim() };
      }
    }

    return null;
  }

  private beginPhase(
    turnId: string,
    phase: PlannerPhase,
  ): {
    plan: MutablePlannerLifecycle;
    step: PlannerStepSnapshot;
  } {
    const plan = this.getOrCreate(turnId);

    if (plan.activePhase !== null) {
      throw new Error(
        `Planner Runtime turn ${turnId} is already progressing phase ${plan.activePhase}.`,
      );
    }

    const timestamp = this.now();
    const step: PlannerStepSnapshot = {
      sequence: plan.steps.length + 1,
      phase,
      status: "active",
      startedAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      reason: null,
    };

    plan.steps.push(step);
    plan.status = "active";
    plan.activePhase = phase;
    plan.reason = null;
    this.touch(plan);

    return { plan, step };
  }

  private completePhase<T>(
    plan: MutablePlannerLifecycle,
    step: PlannerStepSnapshot,
    phase: PlannerPhase,
    result: T,
  ): T {
    step.status = "completed";
    step.completedAt = this.now();
    step.updatedAt = step.completedAt;

    const actionIntent = this.summarizeActionIntent(phase, result);
    if (actionIntent) plan.actionIntents.push(actionIntent);

    plan.status = "completed";
    plan.activePhase = null;
    plan.reason = null;
    this.touch(plan);
    return result;
  }

  private failPhase(
    plan: MutablePlannerLifecycle,
    step: PlannerStepSnapshot,
    error: unknown,
  ): never {
    step.status = "failed";
    step.completedAt = this.now();
    step.updatedAt = step.completedAt;
    step.reason =
      error instanceof Error ? error.message : "planner phase failed";

    plan.status = "failed";
    plan.activePhase = null;
    plan.reason = step.reason;
    this.touch(plan);
    throw error;
  }

  public runPlanning<T>(
    turnId: string,
    resolver: () => T,
  ): T {
    const { plan, step } = this.beginPhase(turnId, "planning");

    try {
      const result = resolver();

      if (
        result !== null &&
        typeof result === "object" &&
        "then" in (result as object)
      ) {
        throw new Error(
          "Planner Runtime runPlanning received an asynchronous result; use runOrchestration for async phases.",
        );
      }

      return this.completePhase(plan, step, "planning", result);
    } catch (error) {
      return this.failPhase(plan, step, error);
    }
  }

  public async runOrchestration<T>(
    turnId: string,
    resolver: () => T | Promise<T>,
  ): Promise<T> {
    const { plan, step } = this.beginPhase(turnId, "orchestration");

    try {
      const result = await resolver();
      return this.completePhase(plan, step, "orchestration", result);
    } catch (error) {
      return this.failPhase(plan, step, error);
    }
  }

  public markBlocked(
    turnId: string,
    reason: string,
  ): PlannerLifecycleSnapshot {
    const plan = this.getOrCreate(turnId);
    plan.status = "blocked";
    plan.reason = reason.trim() || "blocked";
    this.touch(plan);
    return this.clone(plan);
  }

  public markWaiting(
    turnId: string,
    reason: string,
  ): PlannerLifecycleSnapshot {
    const plan = this.getOrCreate(turnId);
    plan.status = "waiting";
    plan.reason = reason.trim() || "waiting";
    this.touch(plan);
    return this.clone(plan);
  }

  public resume(turnId: string): PlannerLifecycleSnapshot {
    const plan = this.getOrCreate(turnId);
    plan.status = "resumed";
    plan.reason = null;
    this.touch(plan);
    return this.clone(plan);
  }

  private clone(plan: MutablePlannerLifecycle): PlannerLifecycleSnapshot {
    return {
      turnId: plan.turnId,
      revision: plan.revision,
      status: plan.status,
      activePhase: plan.activePhase,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      reason: plan.reason,
      steps: plan.steps.map((step) => ({ ...step })),
      actionIntents: plan.actionIntents.map((intent) => ({ ...intent })),
    };
  }

  public snapshot(): {
    revision: number;
    plans: PlannerLifecycleSnapshot[];
  } {
    return {
      revision: this.revision,
      plans: [...this.plans.values()].map((plan) => this.clone(plan)),
    };
  }
}

const plannerRuntime = new PlannerRuntime();

export function getPlannerRuntime(): PlannerRuntime {
  return plannerRuntime;
}
