/**
 * OH-2E — Authoritative State Runtime.
 *
 * Coordinates authoritative current runtime state and read-only projections.
 * It does not absorb domain persistence. Dialogue, routing, planning, session,
 * execution, World State, and readiness keep their accepted source owners.
 */

import { getActionRuntime } from "./actionRuntime";
import { getDialogueRuntime } from "./dialogueRuntime";
import { getPlannerRuntime } from "./plannerRuntime";
import { getRouterRuntime } from "./routerRuntime";

export type StateAuthorityKey =
  | "session"
  | "actionSelection"
  | "dialogue"
  | "routing"
  | "planning"
  | "execution"
  | "activeTask"
  | "worldState"
  | "runtimeHealth"
  | "clientProjection";

export type StateAuthorityDescriptor = {
  authority: string;
  persistenceOwner: string | null;
  projectionOwner: "@chernobog/runtime StateRuntime";
  mutableThroughStateRuntime: false;
};

export const STATE_RUNTIME_AUTHORITIES: Readonly<
  Record<StateAuthorityKey, StateAuthorityDescriptor>
> = Object.freeze({
  actionSelection: {
    authority: "@chernobog/runtime ActionRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  session: {
    authority: "lib/chernobog/session/store.ts",
    persistenceOwner: "session store",
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  dialogue: {
    authority: "@chernobog/runtime DialogueRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  routing: {
    authority: "@chernobog/runtime RouterRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  planning: {
    authority: "@chernobog/runtime PlannerRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  execution: {
    authority: "lib/chernobog/execution",
    persistenceOwner: "execution domain",
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  activeTask: {
    authority: "lib/chernobog/execution",
    persistenceOwner: "execution domain",
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  worldState: {
    authority: "World State domain",
    persistenceOwner: "World State domain",
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  runtimeHealth: {
    authority: "@chernobog/runtime LifecycleRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
  clientProjection: {
    authority: "@chernobog/runtime StateRuntime",
    persistenceOwner: null,
    projectionOwner: "@chernobog/runtime StateRuntime",
    mutableThroughStateRuntime: false,
  },
});

type ProjectionReader = () => unknown;

type SessionBinding = {
  turnId: string;
  sessionId: string;
  reader: ProjectionReader;
  boundAt: string;
};

type DomainProjectionBinding = {
  key: Exclude<
    StateAuthorityKey,
    "dialogue" | "routing" | "planning" | "actionSelection" | "session" | "clientProjection"
  >;
  authority: string;
  reader: ProjectionReader;
  boundAt: string;
};

export type StateRuntimeSnapshot = {
  revision: number;
  capturedAt: string;
  authorities: Readonly<Record<StateAuthorityKey, StateAuthorityDescriptor>>;
  actionSelection: ReturnType<ReturnType<typeof getActionRuntime>["snapshot"]>;
  dialogue: ReturnType<ReturnType<typeof getDialogueRuntime>["snapshot"]>;
  routing: ReturnType<ReturnType<typeof getRouterRuntime>["snapshot"]>;
  planning: ReturnType<ReturnType<typeof getPlannerRuntime>["snapshot"]>;
  sessions: Array<{
    turnId: string;
    sessionId: string;
    boundAt: string;
    value: unknown;
  }>;
  domainProjections: Partial<
    Record<
      Exclude<
        StateAuthorityKey,
        "dialogue" | "routing" | "planning" | "actionSelection" | "session" | "clientProjection"
      >,
      {
        authority: string;
        boundAt: string;
        value: unknown;
      }
    >
  >;
};

export class StateRuntime {
  private revision = 0;
  private readonly sessions = new Map<string, SessionBinding>();
  private readonly domainProjections = new Map<
    DomainProjectionBinding["key"],
    DomainProjectionBinding
  >();
  private readonly maxRetainedSessions = 256;

  private now(): string {
    return new Date().toISOString();
  }

  private touch(): void {
    this.revision += 1;
  }

  private trimSessions(): void {
    while (this.sessions.size > this.maxRetainedSessions) {
      const firstKey = this.sessions.keys().next().value as string | undefined;
      if (!firstKey) return;
      this.sessions.delete(firstKey);
    }
  }

  public bindSession(
    turnId: string,
    sessionId: string,
    reader: ProjectionReader,
  ): void {
    const existing = this.sessions.get(turnId);

    if (existing) {
      if (existing.sessionId !== sessionId) {
        throw new Error(
          `State Runtime turn ${turnId} cannot change session authority from ${existing.sessionId} to ${sessionId}.`,
        );
      }
      return;
    }

    this.sessions.set(turnId, {
      turnId,
      sessionId,
      reader,
      boundAt: this.now(),
    });
    this.trimSessions();
    this.touch();
  }

  public bindDomainProjection(
    key: DomainProjectionBinding["key"],
    authority: string,
    reader: ProjectionReader,
  ): void {
    const expected = STATE_RUNTIME_AUTHORITIES[key].authority;

    if (authority !== expected) {
      throw new Error(
        `State Runtime rejected competing authority for ${key}: expected "${expected}", received "${authority}".`,
      );
    }

    const existing = this.domainProjections.get(key);
    if (existing && existing.authority !== authority) {
      throw new Error(
        `State Runtime projection ${key} already belongs to ${existing.authority}.`,
      );
    }

    this.domainProjections.set(key, {
      key,
      authority,
      reader,
      boundAt: existing?.boundAt ?? this.now(),
    });
    this.touch();
  }

  public authorityMap(): Readonly<
    Record<StateAuthorityKey, StateAuthorityDescriptor>
  > {
    return STATE_RUNTIME_AUTHORITIES;
  }

  public snapshot(): StateRuntimeSnapshot {
    const sessions = [...this.sessions.values()].map((binding) => ({
      turnId: binding.turnId,
      sessionId: binding.sessionId,
      boundAt: binding.boundAt,
      value: binding.reader(),
    }));

    const domainProjections: StateRuntimeSnapshot["domainProjections"] = {};

    for (const [key, binding] of this.domainProjections.entries()) {
      domainProjections[key] = {
        authority: binding.authority,
        boundAt: binding.boundAt,
        value: binding.reader(),
      };
    }

    return {
      revision: this.revision,
      capturedAt: this.now(),
      authorities: STATE_RUNTIME_AUTHORITIES,
      actionSelection: getActionRuntime().snapshot(),
      dialogue: getDialogueRuntime().snapshot(),
      routing: getRouterRuntime().snapshot(),
      planning: getPlannerRuntime().snapshot(),
      sessions,
      domainProjections,
    };
  }
}

const stateRuntime = new StateRuntime();

export function getStateRuntime(): StateRuntime {
  return stateRuntime;
}
