"use client";

import {
  readChernobogCoreState,
  subscribeChernobogCoreState,
  type ChernobogCoreState,
} from "./coreStateBridge";
import type {
  ChernobogRuntimeRoute,
} from "./coreRoutingBridge";

const SESSION_STORAGE_KEY = "chernobog.sessionId";
const POLL_INTERVAL_MS = 650;
const COMMAND_START_GRACE_MS = 250;
const MAX_EVENT_AGE_MS = 20_000;

const ACTIVE_STATES: readonly ChernobogCoreState[] = [
  "thinking",
  "routing",
];

const VALID_ROUTES: readonly ChernobogRuntimeRoute[] = [
  "chat",
  "planner",
  "memory",
  "tools",
  "guardian",
];

const TOOL_EVENT_TYPES = [
  "tool.invocation.routed",
  "tool.invocation.completed",
  "tool.invocation.failed",
] as const;

const EXECUTION_STEP_EVENT_TYPES = [
  "execution.step.started",
  "execution.step.completed",
  "execution.step.failed",
  "execution.step.blocked",
] as const;

type ToolEventType =
  (typeof TOOL_EVENT_TYPES)[number];

type ExecutionStepEventType =
  (typeof EXECUTION_STEP_EVENT_TYPES)[number];

export type RuntimeToolActivityStatus =
  | "running"
  | "completed"
  | "failed";

export type ObservedRuntimeRoute = {
  eventId: string;
  traceId: string;
  sessionId: string;
  route: ChernobogRuntimeRoute;
  occurredAt: string;
};

export type ObservedRuntimeToolActivity = {
  eventId: string;
  toolName: string;
  origin: string;
  sessionId: string;
  status: RuntimeToolActivityStatus;
  occurredAt: string;
};

export type RuntimeExecutionStepStatus =
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type ObservedRuntimeExecutionStep = {
  eventId: string;
  taskId: string;
  sessionId: string;
  stepId: string;
  stepIndex: number;
  stepCount: number;
  stepKind: string;
  stepLabel: string;
  action: string;
  risk: string;
  status: RuntimeExecutionStepStatus;
  error?: string;
  occurredAt: string;
};

export type ObservedRuntimeApproval = {
  eventId: string;
  taskId: string;
  sessionId: string;
  category: string;
  risk: string;
  reason: string;
  stepId?: string;
  stepKind?: string;
  stepLabel?: string;
  action?: string;
  occurredAt: string;
};

type RuntimeEventPayload = {
  sessionId?: unknown;
  traceId?: unknown;
  route?: unknown;
  toolName?: unknown;
  origin?: unknown;
  taskId?: unknown;
  stepId?: unknown;
  stepIndex?: unknown;
  stepCount?: unknown;
  stepKind?: unknown;
  stepLabel?: unknown;
  action?: unknown;
  risk?: unknown;
  status?: unknown;
  error?: unknown;
  category?: unknown;
  reason?: unknown;};

type RuntimeEvent = {
  id?: unknown;
  type?: unknown;
  occurredAt?: unknown;
  correlationId?: unknown;
  payload?: RuntimeEventPayload;
};

type EventApiResponse = {
  ok?: unknown;
  events?: RuntimeEvent[];
};

type RuntimeActivityListeners = {
  onRoute: (event: ObservedRuntimeRoute) => void;
  onTool: (
    activity: ObservedRuntimeToolActivity,
  ) => void;
  onExecutionStep: (
    activity: ObservedRuntimeExecutionStep,
  ) => void;
  onApproval: (
    activity: ObservedRuntimeApproval,
  ) => void;
};

function isActiveState(
  state: ChernobogCoreState,
): boolean {
  return ACTIVE_STATES.includes(state);
}

function readSessionId(): string | null {
  try {
    return (
      window.localStorage
        .getItem(SESSION_STORAGE_KEY)
        ?.trim() || null
    );
  } catch {
    return null;
  }
}

function readRoute(
  value: unknown,
): ChernobogRuntimeRoute | null {
  if (
    typeof value !== "string" ||
    !VALID_ROUTES.includes(
      value as ChernobogRuntimeRoute,
    )
  ) {
    return null;
  }

  return value as ChernobogRuntimeRoute;
}

function isToolEventType(
  value: unknown,
): value is ToolEventType {
  return (
    typeof value === "string" &&
    TOOL_EVENT_TYPES.includes(
      value as ToolEventType,
    )
  );
}

function isExecutionStepEventType(
  value: unknown,
): value is ExecutionStepEventType {
  return (
    typeof value === "string" &&
    EXECUTION_STEP_EVENT_TYPES.includes(
      value as ExecutionStepEventType,
    )
  );
}

function eventTimeMs(
  event: RuntimeEvent,
): number | null {
  if (typeof event.occurredAt !== "string") {
    return null;
  }

  const value = new Date(
    event.occurredAt,
  ).getTime();

  return Number.isNaN(value)
    ? null
    : value;
}

function normalizeRoute(
  event: RuntimeEvent,
  sessionId: string,
  windowStartedAt: number,
): ObservedRuntimeRoute | null {
  if (
    event.type !== "runtime.route.selected" ||
    typeof event.id !== "string" ||
    typeof event.occurredAt !== "string"
  ) {
    return null;
  }

  const occurredAtMs = eventTimeMs(event);

  if (
    occurredAtMs === null ||
    occurredAtMs < windowStartedAt ||
    Date.now() - occurredAtMs > MAX_EVENT_AGE_MS
  ) {
    return null;
  }

  const payload = event.payload;

  if (
    !payload ||
    payload.sessionId !== sessionId
  ) {
    return null;
  }

  const route = readRoute(payload.route);

  if (!route) {
    return null;
  }

  const traceId =
    typeof payload.traceId === "string"
      ? payload.traceId
      : typeof event.correlationId === "string"
        ? event.correlationId
        : event.id;

  return {
    eventId: event.id,
    traceId,
    sessionId,
    route,
    occurredAt: event.occurredAt,
  };
}

function toolStatus(
  type: ToolEventType,
): RuntimeToolActivityStatus {
  if (type === "tool.invocation.routed") {
    return "running";
  }

  if (type === "tool.invocation.failed") {
    return "failed";
  }

  return "completed";
}

function normalizeTool(
  event: RuntimeEvent,
  sessionId: string,
  windowStartedAt: number,
): ObservedRuntimeToolActivity | null {
  if (
    !isToolEventType(event.type) ||
    typeof event.id !== "string" ||
    typeof event.occurredAt !== "string"
  ) {
    return null;
  }

  const occurredAtMs = eventTimeMs(event);

  if (
    occurredAtMs === null ||
    occurredAtMs < windowStartedAt ||
    Date.now() - occurredAtMs > MAX_EVENT_AGE_MS
  ) {
    return null;
  }

  const payload = event.payload;

  if (
    !payload ||
    payload.sessionId !== sessionId ||
    typeof payload.toolName !== "string"
  ) {
    return null;
  }

  return {
    eventId: event.id,
    toolName: payload.toolName,
    origin:
      typeof payload.origin === "string"
        ? payload.origin
        : "unknown",
    sessionId,
    status: toolStatus(event.type),
    occurredAt: event.occurredAt,
  };
}

function executionStepStatus(
  type: ExecutionStepEventType,
): RuntimeExecutionStepStatus {
  if (type === "execution.step.started") {
    return "running";
  }

  if (type === "execution.step.completed") {
    return "completed";
  }

  if (type === "execution.step.blocked") {
    return "blocked";
  }

  return "failed";
}

function normalizeExecutionStep(
  event: RuntimeEvent,
  sessionId: string,
  windowStartedAt: number,
): ObservedRuntimeExecutionStep | null {
  if (
    !isExecutionStepEventType(event.type) ||
    typeof event.id !== "string" ||
    typeof event.occurredAt !== "string"
  ) {
    return null;
  }

  const occurredAtMs = eventTimeMs(event);

  if (
    occurredAtMs === null ||
    occurredAtMs < windowStartedAt ||
    Date.now() - occurredAtMs > MAX_EVENT_AGE_MS
  ) {
    return null;
  }

  const payload = event.payload;

  if (
    !payload ||
    payload.sessionId !== sessionId ||
    typeof payload.taskId !== "string" ||
    typeof payload.stepId !== "string" ||
    typeof payload.stepIndex !== "number" ||
    typeof payload.stepCount !== "number" ||
    typeof payload.stepKind !== "string" ||
    typeof payload.stepLabel !== "string" ||
    typeof payload.action !== "string" ||
    typeof payload.risk !== "string"
  ) {
    return null;
  }

  return {
    eventId: event.id,
    taskId: payload.taskId,
    sessionId,
    stepId: payload.stepId,
    stepIndex: payload.stepIndex,
    stepCount: payload.stepCount,
    stepKind: payload.stepKind,
    stepLabel: payload.stepLabel,
    action: payload.action,
    risk: payload.risk,
    status: executionStepStatus(event.type),
    ...(typeof payload.error === "string"
      ? {
          error: payload.error,
        }
      : {}),
    occurredAt: event.occurredAt,
  };
}

function normalizeApproval(
  event: RuntimeEvent,
  sessionId: string,
  windowStartedAt: number,
): ObservedRuntimeApproval | null {
  if (
    event.type !== "execution.approval.required" ||
    typeof event.id !== "string" ||
    typeof event.occurredAt !== "string"
  ) {
    return null;
  }

  const occurredAtMs = eventTimeMs(event);

  if (
    occurredAtMs === null ||
    occurredAtMs < windowStartedAt ||
    Date.now() - occurredAtMs > MAX_EVENT_AGE_MS
  ) {
    return null;
  }

  const payload = event.payload;

  if (
    !payload ||
    payload.sessionId !== sessionId ||
    typeof payload.taskId !== "string" ||
    typeof payload.category !== "string" ||
    typeof payload.risk !== "string" ||
    typeof payload.reason !== "string"
  ) {
    return null;
  }

  return {
    eventId: event.id,
    taskId: payload.taskId,
    sessionId,
    category: payload.category,
    risk: payload.risk,
    reason: payload.reason,

    ...(typeof payload.stepId === "string"
      ? { stepId: payload.stepId }
      : {}),

    ...(typeof payload.stepKind === "string"
      ? { stepKind: payload.stepKind }
      : {}),

    ...(typeof payload.stepLabel === "string"
      ? { stepLabel: payload.stepLabel }
      : {}),

    ...(typeof payload.action === "string"
      ? { action: payload.action }
      : {}),

    occurredAt: event.occurredAt,
  };
}

export function subscribeChernobogRuntimeActivity(
  listeners: RuntimeActivityListeners,
): () => void {
  let disposed = false;
  let active = false;
  let pollInFlight = false;
  let interval: number | null = null;
  let windowStartedAt = 0;
  let seenIds = new Set<string>();

  function stopPolling() {
    active = false;
    pollInFlight = false;
    seenIds = new Set<string>();

    if (interval !== null) {
      window.clearInterval(interval);
      interval = null;
    }
  }

  async function poll() {
    if (
      disposed ||
      !active ||
      pollInFlight ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    const sessionId = readSessionId();

    if (!sessionId) {
      return;
    }

    pollInFlight = true;

    try {
      const response = await fetch(
        "/api/events?newestFirst=true&limit=128",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok || !active) {
        return;
      }

      const body =
        (await response.json()) as EventApiResponse;

      if (
        body.ok !== true ||
        !Array.isArray(body.events)
      ) {
        return;
      }

      const currentIds = new Set<string>();

      const unseen = body.events
        .filter((event) => {
          if (typeof event.id !== "string") {
            return false;
          }

          currentIds.add(event.id);

          return !seenIds.has(event.id);
        })
        .sort((left, right) => {
          const leftMs =
            eventTimeMs(left) ?? 0;
          const rightMs =
            eventTimeMs(right) ?? 0;

          return leftMs - rightMs;
        });

      seenIds = currentIds;

      for (const event of unseen) {
        if (!active) {
          return;
        }

        const route = normalizeRoute(
          event,
          sessionId,
          windowStartedAt,
        );

        if (route) {
          listeners.onRoute(route);
          continue;
        }

        const tool = normalizeTool(
          event,
          sessionId,
          windowStartedAt,
        );

        if (tool) {
          listeners.onTool(tool);
          continue;
        }

        const executionStep =
          normalizeExecutionStep(
            event,
            sessionId,
            windowStartedAt,
          );

        if (executionStep) {
          listeners.onExecutionStep(
            executionStep,
          );
          continue;
        }

        const approval = normalizeApproval(
          event,
          sessionId,
          windowStartedAt,
        );

        if (approval) {
          listeners.onApproval(approval);
        }
      }
    } catch {
      /*
       * Runtime visualization is observational.
       * Event read failure must not affect commands.
       */
    } finally {
      pollInFlight = false;
    }
  }

  function startPolling() {
    if (disposed || active) {
      return;
    }

    active = true;
    seenIds = new Set<string>();
    windowStartedAt =
      Date.now() - COMMAND_START_GRACE_MS;

    void poll();

    interval = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
  }

  function applyCoreState(
    state: ChernobogCoreState,
  ) {
    if (isActiveState(state)) {
      startPolling();
      return;
    }

    stopPolling();
  }

  applyCoreState(
    readChernobogCoreState(),
  );

  const unsubscribeCore =
    subscribeChernobogCoreState(
      applyCoreState,
    );

  function handleVisibilityChange() {
    if (
      document.visibilityState === "visible" &&
      active
    ) {
      void poll();
    }
  }

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );

  return () => {
    disposed = true;
    stopPolling();
    unsubscribeCore();

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
  };
}