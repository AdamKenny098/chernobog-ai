/**
 * OH-2H — Event -> State convergence bridge.
 *
 * Event Spine remains the authoritative transition feed.
 * World State keeps its accepted persistence/replay ownership.
 * StateRuntime owns read-only current projections.
 *
 * This bridge intentionally owns no domain database, tool execution,
 * trust decision, session persistence, or World State persistence.
 */

import {
  getChernobogEventBus,
  type ChernobogEvent,
} from "@chernobog/events";
import {
  getLifecycleRuntime,
  getStateRuntime,
} from "@chernobog/runtime";
import {
  ChernobogWorldStateQueryService,
  ChernobogWorldStateRegistry,
  getChernobogWorldStateRuntime,
  type WorldStateRecord,
} from "@/lib/chernobog/worldState";

type JsonRecord = Record<string, unknown>;

export type EventDerivedExecutionTaskProjection = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  taskId: string;
  sessionId?: string;
  category?: string;
  risk?: string;
  status: string;
  currentStepId?: string;
  stepCount?: number;
  error?: string;
};

export type EventDerivedExecutionStepProjection = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  taskId: string;
  sessionId?: string;
  stepId: string;
  stepIndex?: number;
  stepCount?: number;
  stepKind?: string;
  stepLabel?: string;
  action?: string;
  risk?: string;
  status: string;
  error?: string;
};

export type EventDerivedApprovalProjection = {
  eventId: string;
  eventType: "execution.approval.required";
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  taskId: string;
  sessionId?: string;
  category?: string;
  risk?: string;
  reason?: string;
  stepId?: string;
  stepKind?: string;
  stepLabel?: string;
  action?: string;
};

export type EventDerivedToolProjection = {
  eventId: string;
  eventType:
    | "tool.invocation.routed"
    | "tool.invocation.completed"
    | "tool.invocation.failed";
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  toolName: string;
  origin?: string;
  sessionId?: string;
  status: "running" | "completed" | "failed";
  failureKind?: string;
};

export type EventDerivedExecutionProjectionSnapshot = {
  source: "event-spine";
  latestTask: EventDerivedExecutionTaskProjection | null;
  activeTask: EventDerivedExecutionTaskProjection | null;
  latestStep: EventDerivedExecutionStepProjection | null;
  latestApproval: EventDerivedApprovalProjection | null;
  latestTool: EventDerivedToolProjection | null;
};

type EventStateConvergenceRuntime = {
  source: "event-spine";
  replayedEvents: number;
  failedReplayEvents: number;
  stop(): void;
};

type EventStateGlobals =
  typeof globalThis & {
    __chernobogEventStateConvergencePromise?:
      Promise<EventStateConvergenceRuntime>;
  };

const globals =
  globalThis as EventStateGlobals;

const EXECUTION_LIFECYCLE_TYPES =
  new Set([
    "execution.started",
    "execution.completed",
    "execution.failed",
    "execution.waiting_for_approval",
  ]);

const EXECUTION_STEP_TYPES =
  new Set([
    "execution.step.started",
    "execution.step.completed",
    "execution.step.failed",
    "execution.step.blocked",
  ]);

const TOOL_TYPES =
  new Set([
    "tool.invocation.routed",
    "tool.invocation.completed",
    "tool.invocation.failed",
  ]);

const TERMINAL_TASK_STATUSES =
  new Set([
    "completed",
    "failed",
    "cancelled",
    "canceled",
  ]);

function asRecord(
  value: unknown,
): JsonRecord | null {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : null;
}

function asString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function asNumber(
  value: unknown,
): number | undefined {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : undefined;
}

function eventOrder(
  left: {
    occurredAt: string;
    eventId: string;
  },
  right: {
    occurredAt: string;
    eventId: string;
  },
): number {
  const leftMs =
    new Date(left.occurredAt).getTime();
  const rightMs =
    new Date(right.occurredAt).getTime();

  if (
    Number.isFinite(leftMs) &&
    Number.isFinite(rightMs) &&
    leftMs !== rightMs
  ) {
    return leftMs < rightMs
      ? -1
      : 1;
  }

  return left.eventId.localeCompare(
    right.eventId,
  );
}

function isNewer<T extends {
  occurredAt: string;
  eventId: string;
}>(
  candidate: T,
  current: T | null,
): boolean {
  return (
    current === null ||
    eventOrder(candidate, current) > 0
  );
}

function eventBase(
  event: ChernobogEvent,
) {
  return {
    eventId: event.id,
    eventType: event.type,
    occurredAt: event.occurredAt,
    ...(event.correlationId
      ? {
          correlationId:
            event.correlationId,
        }
      : {}),
    ...(event.causationId
      ? {
          causationId:
            event.causationId,
        }
      : {}),
  };
}

class ExecutionEventProjection {
  private latestTask:
    EventDerivedExecutionTaskProjection | null =
      null;

  private activeTaskValue:
    EventDerivedExecutionTaskProjection | null =
      null;

  private activeTaskRevision:
    {
      occurredAt: string;
      eventId: string;
    } | null =
      null;

  private latestStep:
    EventDerivedExecutionStepProjection | null =
      null;

  private latestApproval:
    EventDerivedApprovalProjection | null =
      null;

  private latestTool:
    EventDerivedToolProjection | null =
      null;

  process(
    event: ChernobogEvent,
  ): void {
    const payload =
      asRecord(event.payload);

    if (!payload) {
      return;
    }

    if (
      EXECUTION_LIFECYCLE_TYPES.has(
        event.type,
      )
    ) {
      this.processLifecycle(
        event,
        payload,
      );
      return;
    }

    if (
      EXECUTION_STEP_TYPES.has(
        event.type,
      )
    ) {
      this.processStep(
        event,
        payload,
      );
      return;
    }

    if (
      event.type ===
      "execution.approval.required"
    ) {
      this.processApproval(
        event,
        payload,
      );
      return;
    }

    if (
      TOOL_TYPES.has(event.type)
    ) {
      this.processTool(
        event,
        payload,
      );
    }
  }

  private processLifecycle(
    event: ChernobogEvent,
    payload: JsonRecord,
  ): void {
    const taskId =
      asString(payload.taskId) ??
      event.correlationId;

    const status =
      asString(payload.status);

    if (!taskId || !status) {
      return;
    }

    const projection:
      EventDerivedExecutionTaskProjection = {
        ...eventBase(event),
        taskId,
        status,
        ...(asString(
          payload.sessionId,
        )
          ? {
              sessionId:
                asString(
                  payload.sessionId,
                ),
            }
          : {}),
        ...(asString(
          payload.category,
        )
          ? {
              category:
                asString(
                  payload.category,
                ),
            }
          : {}),
        ...(asString(payload.risk)
          ? {
              risk:
                asString(
                  payload.risk,
                ),
            }
          : {}),
        ...(asString(
          payload.currentStepId,
        )
          ? {
              currentStepId:
                asString(
                  payload.currentStepId,
                ),
            }
          : {}),
        ...(asNumber(
          payload.stepCount,
        ) !== undefined
          ? {
              stepCount:
                asNumber(
                  payload.stepCount,
                ),
            }
          : {}),
        ...(asString(payload.error)
          ? {
              error:
                asString(
                  payload.error,
                ),
            }
          : {}),
      };

    if (
      isNewer(
        projection,
        this.latestTask,
      )
    ) {
      this.latestTask =
        projection;
    }

    this.applyActiveTask(
      projection,
    );
  }

  private processStep(
    event: ChernobogEvent,
    payload: JsonRecord,
  ): void {
    const taskId =
      asString(payload.taskId) ??
      event.correlationId;

    const stepId =
      asString(payload.stepId);

    const status =
      asString(payload.status);

    if (
      !taskId ||
      !stepId ||
      !status
    ) {
      return;
    }

    const step:
      EventDerivedExecutionStepProjection = {
        ...eventBase(event),
        taskId,
        stepId,
        status,
        ...(asString(
          payload.sessionId,
        )
          ? {
              sessionId:
                asString(
                  payload.sessionId,
                ),
            }
          : {}),
        ...(asNumber(
          payload.stepIndex,
        ) !== undefined
          ? {
              stepIndex:
                asNumber(
                  payload.stepIndex,
                ),
            }
          : {}),
        ...(asNumber(
          payload.stepCount,
        ) !== undefined
          ? {
              stepCount:
                asNumber(
                  payload.stepCount,
                ),
            }
          : {}),
        ...(asString(
          payload.stepKind,
        )
          ? {
              stepKind:
                asString(
                  payload.stepKind,
                ),
            }
          : {}),
        ...(asString(
          payload.stepLabel,
        )
          ? {
              stepLabel:
                asString(
                  payload.stepLabel,
                ),
            }
          : {}),
        ...(asString(payload.action)
          ? {
              action:
                asString(
                  payload.action,
                ),
            }
          : {}),
        ...(asString(payload.risk)
          ? {
              risk:
                asString(
                  payload.risk,
                ),
            }
          : {}),
        ...(asString(payload.error)
          ? {
              error:
                asString(
                  payload.error,
                ),
            }
          : {}),
      };

    if (
      isNewer(
        step,
        this.latestStep,
      )
    ) {
      this.latestStep =
        step;
    }

    const taskStatus =
      asString(payload.taskStatus);

    if (taskStatus) {
      const task:
        EventDerivedExecutionTaskProjection = {
          ...eventBase(event),
          taskId,
          status: taskStatus,
          ...(step.sessionId
            ? {
                sessionId:
                  step.sessionId,
              }
            : {}),
          ...(asString(
            payload.category,
          )
            ? {
                category:
                  asString(
                    payload.category,
                  ),
              }
            : {}),
          ...(step.risk
            ? {
                risk: step.risk,
              }
            : {}),
          currentStepId:
            step.stepId,
          ...(step.stepCount !== undefined
            ? {
                stepCount:
                  step.stepCount,
              }
            : {}),
          ...(step.error
            ? {
                error: step.error,
              }
            : {}),
        };

      this.applyActiveTask(
        task,
      );
    }
  }

  private processApproval(
    event: ChernobogEvent,
    payload: JsonRecord,
  ): void {
    const taskId =
      asString(payload.taskId) ??
      event.correlationId;

    if (!taskId) {
      return;
    }

    const approval:
      EventDerivedApprovalProjection = {
        ...eventBase(event),
        eventType:
          "execution.approval.required",
        taskId,
        ...(asString(
          payload.sessionId,
        )
          ? {
              sessionId:
                asString(
                  payload.sessionId,
                ),
            }
          : {}),
        ...(asString(
          payload.category,
        )
          ? {
              category:
                asString(
                  payload.category,
                ),
            }
          : {}),
        ...(asString(payload.risk)
          ? {
              risk:
                asString(
                  payload.risk,
                ),
            }
          : {}),
        ...(asString(payload.reason)
          ? {
              reason:
                asString(
                  payload.reason,
                ),
            }
          : {}),
        ...(asString(payload.stepId)
          ? {
              stepId:
                asString(
                  payload.stepId,
                ),
            }
          : {}),
        ...(asString(
          payload.stepKind,
        )
          ? {
              stepKind:
                asString(
                  payload.stepKind,
                ),
            }
          : {}),
        ...(asString(
          payload.stepLabel,
        )
          ? {
              stepLabel:
                asString(
                  payload.stepLabel,
                ),
            }
          : {}),
        ...(asString(payload.action)
          ? {
              action:
                asString(
                  payload.action,
                ),
            }
          : {}),
      };

    if (
      isNewer(
        approval,
        this.latestApproval,
      )
    ) {
      this.latestApproval =
        approval;
    }

    this.applyActiveTask({
      ...eventBase(event),
      taskId,
      status:
        "waiting_for_approval",
      ...(approval.sessionId
        ? {
            sessionId:
              approval.sessionId,
          }
        : {}),
      ...(approval.category
        ? {
            category:
              approval.category,
          }
        : {}),
      ...(approval.risk
        ? {
            risk:
              approval.risk,
          }
        : {}),
      ...(approval.stepId
        ? {
            currentStepId:
              approval.stepId,
          }
        : {}),
      ...(approval.reason
        ? {
            error:
              approval.reason,
          }
        : {}),
    });
  }

  private processTool(
    event: ChernobogEvent,
    payload: JsonRecord,
  ): void {
    const toolName =
      asString(payload.toolName);

    if (!toolName) {
      return;
    }

    const eventType =
      event.type as
        EventDerivedToolProjection["eventType"];

    const tool:
      EventDerivedToolProjection = {
        ...eventBase(event),
        eventType,
        toolName,
        status:
          eventType ===
          "tool.invocation.routed"
            ? "running"
            : eventType ===
                "tool.invocation.completed"
              ? "completed"
              : "failed",
        ...(asString(payload.origin)
          ? {
              origin:
                asString(
                  payload.origin,
                ),
            }
          : {}),
        ...(asString(
          payload.sessionId,
        )
          ? {
              sessionId:
                asString(
                  payload.sessionId,
                ),
            }
          : {}),
        ...(asString(
          payload.failureKind,
        )
          ? {
              failureKind:
                asString(
                  payload.failureKind,
                ),
            }
          : {}),
      };

    if (
      isNewer(
        tool,
        this.latestTool,
      )
    ) {
      this.latestTool =
        tool;
    }
  }

  private applyActiveTask(
    candidate:
      EventDerivedExecutionTaskProjection,
  ): void {
    if (
      this.activeTaskRevision &&
      eventOrder(
        candidate,
        this.activeTaskRevision,
      ) <= 0
    ) {
      return;
    }

    this.activeTaskRevision = {
      occurredAt:
        candidate.occurredAt,
      eventId:
        candidate.eventId,
    };

    this.activeTaskValue =
      TERMINAL_TASK_STATUSES.has(
        candidate.status,
      )
        ? null
        : candidate;
  }

  activeTask():
    EventDerivedExecutionTaskProjection | null {
    return this.activeTaskValue
      ? structuredClone(
          this.activeTaskValue,
        )
      : null;
  }

  snapshot():
    EventDerivedExecutionProjectionSnapshot {
    return {
      source: "event-spine",
      latestTask:
        this.latestTask
          ? structuredClone(
              this.latestTask,
            )
          : null,
      activeTask:
        this.activeTask(),
      latestStep:
        this.latestStep
          ? structuredClone(
              this.latestStep,
            )
          : null,
      latestApproval:
        this.latestApproval
          ? structuredClone(
              this.latestApproval,
            )
          : null,
      latestTool:
        this.latestTool
          ? structuredClone(
              this.latestTool,
            )
          : null,
    };
  }
}

function createBoundedSeenSet() {
  const ids =
    new Set<string>();

  const order:
    string[] = [];

  const maxRetained =
    4096;

  return {
    add(id: string): boolean {
      if (ids.has(id)) {
        return false;
      }

      ids.add(id);
      order.push(id);

      while (
        order.length >
        maxRetained
      ) {
        const oldest =
          order.shift();

        if (oldest) {
          ids.delete(oldest);
        }
      }

      return true;
    },
  };
}

async function startEventStateConvergence():
  Promise<EventStateConvergenceRuntime> {
  const eventBus =
    getChernobogEventBus();

  const worldStateRuntime =
    await getChernobogWorldStateRuntime();

  const executionProjection =
    new ExecutionEventProjection();

  const seen =
    createBoundedSeenSet();

  const consume =
    (event: ChernobogEvent) => {
      if (!seen.add(event.id)) {
        return;
      }

      executionProjection.process(
        event,
      );
    };

  /*
   * Subscribe before replay so no live event can fall into the
   * replay/subscription handoff gap. Duplicate replay/live delivery
   * is suppressed by the bounded event-id set above.
   */
  const unsubscribe =
    eventBus.subscribe(
      {},
      consume,
    );

  try {
    const replay =
      await eventBus.replay(
        consume,
      );

    const stateRuntime =
      getStateRuntime();

    stateRuntime.bindDomainProjection(
      "worldState",
      "World State domain",
      () =>
        worldStateRuntime
          .engine
          .worldState
          .snapshot(),
    );

    stateRuntime.bindDomainProjection(
      "execution",
      "lib/chernobog/execution",
      () =>
        executionProjection
          .snapshot(),
    );

    stateRuntime.bindDomainProjection(
      "activeTask",
      "lib/chernobog/execution",
      () =>
        executionProjection
          .activeTask(),
    );

    stateRuntime.bindDomainProjection(
      "runtimeHealth",
      "@chernobog/runtime LifecycleRuntime",
      () =>
        getLifecycleRuntime()
          .snapshot(),
    );

    return {
      source:
        "event-spine",
      replayedEvents:
        replay.replayedEvents,
      failedReplayEvents:
        replay.failedEvents,
      stop() {
        unsubscribe();
      },
    };
  } catch (error) {
    unsubscribe();
    throw error;
  }
}

export function ensureChernobogEventStateConvergence():
  Promise<EventStateConvergenceRuntime> {
  if (
    !globals
      .__chernobogEventStateConvergencePromise
  ) {
    globals
      .__chernobogEventStateConvergencePromise =
      startEventStateConvergence()
        .catch((error) => {
          delete globals
            .__chernobogEventStateConvergencePromise;
          throw error;
        });
  }

  return globals
    .__chernobogEventStateConvergencePromise;
}

export async function getChernobogStateRuntimeWorldStateRegistry():
  Promise<ChernobogWorldStateRegistry> {
  await ensureChernobogEventStateConvergence();

  const projection =
    getStateRuntime()
      .snapshot()
      .domainProjections
      .worldState;

  if (
    !projection ||
    !Array.isArray(
      projection.value,
    )
  ) {
    throw new Error(
      "StateRuntime World State projection is unavailable.",
    );
  }

  /*
   * Build a detached read-only registry from StateRuntime's
   * current projection. This copy is not a persistence authority.
   */
  const registry =
    new ChernobogWorldStateRegistry();

  registry.replace(
    projection.value as
      WorldStateRecord[],
  );

  return registry;
}

export async function getChernobogStateRuntimeWorldStateQuery():
  Promise<ChernobogWorldStateQueryService> {
  return new ChernobogWorldStateQueryService(
    await getChernobogStateRuntimeWorldStateRegistry(),
  );
}

export async function getChernobogEventDerivedExecutionProjection():
  Promise<EventDerivedExecutionProjectionSnapshot> {
  await ensureChernobogEventStateConvergence();

  const projection =
    getStateRuntime()
      .snapshot()
      .domainProjections
      .execution;

  if (
    !projection ||
    !projection.value ||
    typeof projection.value !==
      "object"
  ) {
    throw new Error(
      "StateRuntime execution projection is unavailable.",
    );
  }

  return structuredClone(
    projection.value,
  ) as EventDerivedExecutionProjectionSnapshot;
}
