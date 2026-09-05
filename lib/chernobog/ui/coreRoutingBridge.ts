"use client";

export type ChernobogRuntimeRoute =
  | "chat"
  | "planner"
  | "memory"
  | "tools"
  | "guardian";

export type ChernobogExecutiveRouteTarget =
  | "engineering"
  | "operations"
  | "vault"
  | "security";

export type ChernobogRoutingSignal = {
  route: ChernobogRuntimeRoute;
  executiveId: ChernobogExecutiveRouteTarget | null;
  changedAt: number;
};

export const CHERNOBOG_ROUTING_EVENT =
  "chernobog:routing-signal";

export const CHERNOBOG_ROUTING_STORAGE_KEY =
  "chernobog.routing-signal.v1";

export const CHERNOBOG_ROUTING_VISUAL_TTL_MS = 2600;

const VALID_ROUTES: readonly ChernobogRuntimeRoute[] = [
  "chat",
  "planner",
  "memory",
  "tools",
  "guardian",
];

const ROUTE_TO_EXECUTIVE: Record<
  ChernobogRuntimeRoute,
  ChernobogExecutiveRouteTarget | null
> = {
  chat: null,
  planner: "operations",
  memory: "vault",
  tools: "engineering",
  guardian: "security",
};

function normalizeRuntimeRoute(
  value: unknown,
): ChernobogRuntimeRoute | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return VALID_ROUTES.includes(
    normalized as ChernobogRuntimeRoute,
  )
    ? (normalized as ChernobogRuntimeRoute)
    : null;
}

function isExecutiveTarget(
  value: unknown,
): value is ChernobogExecutiveRouteTarget | null {
  return (
    value === null ||
    value === "engineering" ||
    value === "operations" ||
    value === "vault" ||
    value === "security"
  );
}

function parseSignal(
  raw: string,
): ChernobogRoutingSignal | null {
  try {
    const parsed = JSON.parse(raw) as
      Partial<ChernobogRoutingSignal>;

    const route = normalizeRuntimeRoute(parsed.route);

    if (
      !route ||
      !isExecutiveTarget(parsed.executiveId) ||
      typeof parsed.changedAt !== "number"
    ) {
      return null;
    }

    return {
      route,
      executiveId: parsed.executiveId,
      changedAt: parsed.changedAt,
    };
  } catch {
    return null;
  }
}

export function clearChernobogRoutingSignal(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      CHERNOBOG_ROUTING_STORAGE_KEY,
    );
  } catch {
    // Same-tab CustomEvent still clears local consumers.
  }

  window.dispatchEvent(
    new CustomEvent<{ signal: null }>(
      CHERNOBOG_ROUTING_EVENT,
      {
        detail: { signal: null },
      },
    ),
  );
}

export function publishChernobogRoutingSignal(
  routeValue: string,
): ChernobogRoutingSignal | null {
  if (typeof window === "undefined") {
    return null;
  }

  const route = normalizeRuntimeRoute(routeValue);

  if (!route) {
    clearChernobogRoutingSignal();
    return null;
  }

  const signal: ChernobogRoutingSignal = {
    route,
    executiveId: ROUTE_TO_EXECUTIVE[route],
    changedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      CHERNOBOG_ROUTING_STORAGE_KEY,
      JSON.stringify(signal),
    );
  } catch {
    // Same-tab CustomEvent still carries the signal.
  }

  window.dispatchEvent(
    new CustomEvent<{
      signal: ChernobogRoutingSignal;
    }>(CHERNOBOG_ROUTING_EVENT, {
      detail: { signal },
    }),
  );

  return signal;
}

export function subscribeChernobogRoutingSignal(
  listener: (
    signal: ChernobogRoutingSignal | null,
  ) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleCustom(event: Event) {
    const custom = event as CustomEvent<{
      signal?: ChernobogRoutingSignal | null;
    }>;

    if (custom.detail?.signal === null) {
      listener(null);
      return;
    }

    const signal = custom.detail?.signal;

    if (
      signal &&
      normalizeRuntimeRoute(signal.route) &&
      isExecutiveTarget(signal.executiveId) &&
      typeof signal.changedAt === "number"
    ) {
      listener(signal);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== CHERNOBOG_ROUTING_STORAGE_KEY) {
      return;
    }

    if (!event.newValue) {
      listener(null);
      return;
    }

    const signal = parseSignal(event.newValue);
    if (signal) {
      listener(signal);
    }
  }

  window.addEventListener(
    CHERNOBOG_ROUTING_EVENT,
    handleCustom,
  );
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      CHERNOBOG_ROUTING_EVENT,
      handleCustom,
    );
    window.removeEventListener("storage", handleStorage);
  };
}