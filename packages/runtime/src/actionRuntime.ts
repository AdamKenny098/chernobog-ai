/**
 * OH-2F — Authoritative Action Selection & Interruption Runtime.
 *
 * Consolidates "what should happen next?" decisions without expanding autonomy.
 * Existing cognition/initiative logic stays the decision engine behind this
 * authority. Trust and Tool Gateway remain mandatory for executable actions.
 */

export type ActionSelectionOutcome =
  | "respond"
  | "continue"
  | "plan"
  | "act"
  | "wait"
  | "defer"
  | "interrupt"
  | "cancel"
  | "resume"
  | "request-approval"
  | "unknown";

export type ActionDecisionSnapshot = {
  id: string;
  revision: number;
  source: string;
  outcome: ActionSelectionOutcome;
  turnId: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionRuntimeSnapshot = {
  revision: number;
  current: ActionDecisionSnapshot | null;
  recent: ActionDecisionSnapshot[];
};

export class ActionRuntime {
  private revision = 0;
  private sequence = 0;
  private current: ActionDecisionSnapshot | null = null;
  private readonly recent: ActionDecisionSnapshot[] = [];
  private readonly maxRetainedDecisions = 256;

  private now(): string {
    return new Date().toISOString();
  }

  private inferOutcome(value: unknown): ActionSelectionOutcome {
    const candidates: unknown[] = [value];

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      candidates.push(
        record.outcome,
        record.action,
        record.decision,
        record.kind,
        record.intent,
        record.nextAction,
        record.status,
      );
    }

    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const normalized = candidate.trim().toLowerCase().replace(/[_\s]+/g, "-");

      if (["respond", "reply"].includes(normalized)) return "respond";
      if (["continue", "proceed"].includes(normalized)) return "continue";
      if (["plan", "planning"].includes(normalized)) return "plan";
      if (["act", "execute", "execution", "tool"].includes(normalized)) return "act";
      if (["wait", "waiting", "waiting-user", "waiting-for-user"].includes(normalized)) return "wait";
      if (["defer", "deferred"].includes(normalized)) return "defer";
      if (["interrupt", "interrupted", "barge-in"].includes(normalized)) return "interrupt";
      if (["cancel", "cancelled", "canceled"].includes(normalized)) return "cancel";
      if (["resume", "resumed"].includes(normalized)) return "resume";
      if (
        ["request-approval", "approval-required", "approval", "needs-approval"].includes(
          normalized,
        )
      ) {
        return "request-approval";
      }
    }

    return "unknown";
  }

  private record(
    source: string,
    outcome: ActionSelectionOutcome,
    options: {
      turnId?: string | null;
      reason?: string | null;
    } = {},
  ): ActionDecisionSnapshot {
    this.sequence += 1;
    this.revision += 1;
    const timestamp = this.now();

    const decision: ActionDecisionSnapshot = {
      id: `action-${this.sequence}`,
      revision: this.revision,
      source,
      outcome,
      turnId: options.turnId ?? null,
      reason: options.reason?.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.current = decision;
    this.recent.push(decision);

    if (this.recent.length > this.maxRetainedDecisions) {
      this.recent.splice(0, this.recent.length - this.maxRetainedDecisions);
    }

    return { ...decision };
  }

  public select<T>(
    source: string,
    resolver: () => T,
  ): T {
    const result = resolver();
    this.record(source, this.inferOutcome(result));
    return result;
  }

  public async selectAsync<T>(
    source: string,
    resolver: () => T | Promise<T>,
  ): Promise<T> {
    const result = await resolver();
    this.record(source, this.inferOutcome(result));
    return result;
  }

  public interrupt(
    turnId: string,
    reason?: string,
    source = "dialogue-runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "interrupt", { turnId, reason });
  }

  public cancel(
    turnId: string,
    reason?: string,
    source = "runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "cancel", { turnId, reason });
  }

  public resume(
    turnId: string,
    source = "dialogue-runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "resume", { turnId });
  }

  public wait(
    turnId: string,
    reason?: string,
    source = "runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "wait", { turnId, reason });
  }

  public defer(
    turnId: string,
    reason?: string,
    source = "runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "defer", { turnId, reason });
  }

  public requestApproval(
    turnId: string,
    reason?: string,
    source = "runtime",
  ): ActionDecisionSnapshot {
    return this.record(source, "request-approval", { turnId, reason });
  }

  public snapshot(): ActionRuntimeSnapshot {
    return {
      revision: this.revision,
      current: this.current ? { ...this.current } : null,
      recent: this.recent.map((decision) => ({ ...decision })),
    };
  }
}

const actionRuntime = new ActionRuntime();

export function getActionRuntime(): ActionRuntime {
  return actionRuntime;
}
