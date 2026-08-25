import type { ChernobogEvent } from "../events/types";
import type {
  WorldStateJsonValue,
} from "./types";
import type {
  WorldStateProjection,
  WorldStateProjector,
} from "./projectorTypes";
import type {
  ChernobogWorldStateProjectionEngine,
} from "./projectionEngine";

const GENERIC_FACT_DOMAINS = new Set([
  "desktop",
  "backup",
  "storage",
  "execution",
]);

function canonicalSegment(
  value: unknown,
  fallback = "unknown",
): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function objectPayload(
  event: ChernobogEvent,
): Record<string, unknown> {
  return (
    event.payload &&
    typeof event.payload === "object" &&
    !Array.isArray(event.payload)
  )
    ? event.payload as Record<string, unknown>
    : {};
}

function jsonSafe(
  value: unknown,
  seen = new WeakSet<object>(),
): WorldStateJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      jsonSafe(entry, seen),
    );
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);

    const result:
      Record<string, WorldStateJsonValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      result[key] = jsonSafe(
        entry,
        seen,
      );
    }

    seen.delete(value);
    return result;
  }

  return String(value);
}

function subjectSegment(
  event: ChernobogEvent,
): string {
  if (event.subject) {
    return canonicalSegment(
      event.subject,
    );
  }

  const pieces =
    event.type.split(".");

  return canonicalSegment(
    pieces[pieces.length - 1],
  );
}

function eventDomain(
  event: ChernobogEvent,
): string | undefined {
  const typeDomain =
    canonicalSegment(
      event.type.split(".")[0],
      "",
    );

  if (
    GENERIC_FACT_DOMAINS.has(
      typeDomain,
    )
  ) {
    return typeDomain;
  }

  const subsystem =
    event.source.subsystem.toLowerCase();

  for (
    const domain
    of GENERIC_FACT_DOMAINS
  ) {
    if (
      subsystem.includes(domain)
    ) {
      return domain;
    }
  }

  return undefined;
}

function commonObservation(
  event: ChernobogEvent,
): WorldStateJsonValue {
  return {
    eventType:
      event.type,
    severity:
      event.severity,
    subject:
      event.subject ?? null,
    scope:
      event.scope ?? null,
    payload:
      jsonSafe(event.payload),
  };
}

function statusFromServiceEvent(
  type: string,
): string | undefined {
  switch (type) {
    case "service.healthy":
    case "service.recovered":
      return "healthy";
    case "service.degraded":
      return "degraded";
    case "service.failed":
      return "failed";
    default:
      return undefined;
  }
}

function runtimeObservationProjector():
  WorldStateProjector {
  return {
    id: "domain-runtime-health-observation",
    eventTypes: [
      "runtime.health_observed",
    ],
    project(event) {
      const payload =
        objectPayload(event);

      const kind =
        canonicalSegment(
          payload.kind,
        );

      const id =
        canonicalSegment(
          payload.id ??
            event.subject,
        );

      const status =
        typeof payload.status ===
        "string"
          ? payload.status
          : undefined;

      const observedAt =
        typeof payload.observedAt ===
          "string"
          ? payload.observedAt
          : undefined;

      let base: string;

      if (kind === "service") {
        base =
          `service.${id}`;
      } else if (
        kind === "runtime-node"
      ) {
        base =
          `runtime.node.${id}`;
      } else {
        base =
          `model.${id}`;
      }

      const projections:
        WorldStateProjection[] = [
          {
            key:
              `${base}.observation`,
            value:
              jsonSafe(event.payload),
            observedAt,
            ttlMs:
              300_000,
          },
        ];

      if (status) {
        projections.push({
          key:
            `${base}.health`,
          value:
            status,
          observedAt,
          ttlMs:
            300_000,
        });
      }

      return projections;
    },
  };
}

function serviceHealthProjector():
  WorldStateProjector {
  return {
    id: "domain-service-health",
    eventTypes: [
      "service.healthy",
      "service.degraded",
      "service.failed",
      "service.recovered",
    ],
    project(event) {
      const status =
        statusFromServiceEvent(
          event.type,
        );

      if (!status) {
        return undefined;
      }

      const service =
        subjectSegment(event);

      return [
        {
          key:
            `service.${service}.health`,
          value:
            status,
          ttlMs:
            300_000,
        },
        {
          key:
            `service.${service}.observation`,
          value:
            jsonSafe(event.payload),
          ttlMs:
            300_000,
        },
      ];
    },
  };
}

function runtimeNodeProjector():
  WorldStateProjector {
  return {
    id: "domain-runtime-node-availability",
    eventTypes: [
      "runtime.node_online",
      "runtime.node_offline",
    ],
    project(event) {
      const node =
        subjectSegment(event);

      return [
        {
          key:
            `runtime.node.${node}.online`,
          value:
            event.type ===
            "runtime.node_online",
          ttlMs:
            300_000,
        },
        {
          key:
            `runtime.node.${node}.observation`,
          value:
            jsonSafe(event.payload),
          ttlMs:
            300_000,
        },
      ];
    },
  };
}

function modelProviderProjector():
  WorldStateProjector {
  return {
    id: "domain-model-provider-availability",
    eventTypes: [
      "runtime.model_available",
      "runtime.model_unavailable",
    ],
    project(event) {
      const model =
        subjectSegment(event);

      return [
        {
          key:
            `model.${model}.available`,
          value:
            event.type ===
            "runtime.model_available",
          ttlMs:
            300_000,
        },
        {
          key:
            `model.${model}.observation`,
          value:
            jsonSafe(event.payload),
          ttlMs:
            300_000,
        },
      ];
    },
  };
}

function modelRoleProjector():
  WorldStateProjector {
  return {
    id: "domain-model-role-assignment",
    eventTypePrefixes: [
      "runtime.model",
    ],
    project(event) {
      const payload =
        objectPayload(event);

      if (
        typeof payload.role !==
        "string"
      ) {
        return undefined;
      }

      const role =
        canonicalSegment(
          payload.role,
        );

      const projections:
        WorldStateProjection[] = [
          {
            key:
              `model.role.${role}.assignment`,
            value:
              jsonSafe(event.payload),
            ttlMs:
              300_000,
          },
        ];

      if (
        typeof payload.available ===
        "boolean"
      ) {
        projections.push({
          key:
            `model.role.${role}.available`,
          value:
            payload.available,
          ttlMs:
            300_000,
        });
      }

      return projections;
    },
  };
}

function projectGitProjector():
  WorldStateProjector {
  return {
    id: "domain-project-git",
    eventTypes: [
      "project.git_unavailable",
      "project.git_observed",
      "project.git_dirty",
      "project.git_clean",
    ],
    project(event) {
      if (
        event.type ===
        "project.git_unavailable"
      ) {
        return {
          key:
            "project.git.available",
          value:
            false,
          ttlMs:
            300_000,
        };
      }

      const project =
        subjectSegment(event);

      const payload =
        objectPayload(event);

      const projections:
        WorldStateProjection[] = [
          {
            key:
              `project.${project}.git.snapshot`,
            value:
              jsonSafe(event.payload),
            ttlMs:
              300_000,
          },
          {
            key:
              `project.${project}.git.available`,
            value:
              true,
            ttlMs:
              300_000,
          },
        ];

      let dirty:
        boolean | undefined;

      if (
        typeof payload.dirty ===
        "boolean"
      ) {
        dirty =
          payload.dirty;
      } else if (
        event.type ===
        "project.git_dirty"
      ) {
        dirty = true;
      } else if (
        event.type ===
        "project.git_clean"
      ) {
        dirty = false;
      }

      if (
        dirty !== undefined
      ) {
        projections.push({
          key:
            `project.${project}.git.dirty`,
          value:
            dirty,
          ttlMs:
            300_000,
        });
      }

      if (
        typeof payload.branch ===
        "string" &&
        payload.branch.trim()
      ) {
        projections.push({
          key:
            `project.${project}.git.branch`,
          value:
            payload.branch,
          ttlMs:
            300_000,
        });
      }

      if (
        typeof payload.head ===
        "string" &&
        payload.head.trim()
      ) {
        projections.push({
          key:
            `project.${project}.git.head`,
          value:
            payload.head,
          ttlMs:
            300_000,
        });
      }

      return projections;
    },
  };
}

function projectValidationProjector():
  WorldStateProjector {
  return {
    id: "domain-project-validation",
    eventTypes: [
      "project.validation_started",
      "project.validation_completed",
      "project.validation_failed",
    ],
    project(event) {
      const validation =
        subjectSegment(event);

      const status =
        event.type ===
        "project.validation_started"
          ? "running"
          : event.type ===
            "project.validation_completed"
            ? "passed"
            : "failed";

      return [
        {
          key:
            `project.validation.${validation}.status`,
          value:
            status,
          ttlMs:
            900_000,
        },
        {
          key:
            `project.validation.${validation}.result`,
          value:
            jsonSafe(event.payload),
          ttlMs:
            900_000,
        },
      ];
    },
  };
}

function toolLifecycleProjector():
  WorldStateProjector {
  return {
    id: "domain-tool-lifecycle",
    eventTypes: [
      "tool.started",
      "tool.completed",
      "tool.failed",
    ],
    project(event) {
      const tool =
        subjectSegment(event);

      const status =
        event.type ===
        "tool.started"
          ? "running"
          : event.type ===
            "tool.completed"
            ? "completed"
            : "failed";

      return [
        {
          key:
            `execution.tool.${tool}.status`,
          value:
            status,
          ttlMs:
            300_000,
        },
        {
          key:
            `execution.tool.${tool}.last-result`,
          value:
            jsonSafe(event.payload),
          ttlMs:
            300_000,
        },
      ];
    },
  };
}

function genericFactDomainProjector():
  WorldStateProjector {
  return {
    id: "domain-generic-factual-mirror",
    project(event) {
      const domain =
        eventDomain(event);

      if (!domain) {
        return undefined;
      }

      const subject =
        subjectSegment(event);

      const typeSuffix =
        canonicalSegment(
          event.type
            .split(".")
            .slice(1)
            .join("-"),
          "observation",
        );

      return {
        key:
          `${domain}.${subject}.${typeSuffix}`,
        value:
          commonObservation(event),
        ttlMs:
          300_000,
      };
    },
  };
}

export function createChernobogDomainProjectors():
  WorldStateProjector[] {
  return [
    runtimeObservationProjector(),
    serviceHealthProjector(),
    runtimeNodeProjector(),
    modelProviderProjector(),
    modelRoleProjector(),
    projectGitProjector(),
    projectValidationProjector(),
    toolLifecycleProjector(),
    genericFactDomainProjector(),
  ];
}

export function registerChernobogDomainProjectors(
  engine:
    ChernobogWorldStateProjectionEngine,
): () => void {
  const detach =
    createChernobogDomainProjectors()
      .map((projector) =>
        engine.register(projector),
      );

  return () => {
    for (
      const unregister
      of [...detach].reverse()
    ) {
      unregister();
    }
  };
}
