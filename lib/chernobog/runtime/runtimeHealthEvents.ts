import { publishChernobogEventSafely } from "../events/publishers";

import type {
  ChernobogHealthStatus,
  ChernobogRuntimeObservation,
} from "./runtimeHealth";

export interface PublishRuntimeHealthOptions {
  previousStatus?: ChernobogHealthStatus;
}

function recovered(
  previousStatus: ChernobogHealthStatus | undefined,
  currentStatus: ChernobogHealthStatus
): boolean {
  return (
    currentStatus === "healthy" &&
    previousStatus !== undefined &&
    previousStatus !== "healthy"
  );
}

function buildCommonPayload(
  observation: ChernobogRuntimeObservation
) {
  return {
    id: observation.id,
    kind: observation.kind,
    status: observation.status,
    nodeId: observation.nodeId,
    platform: observation.platform,
    latencyMs: observation.latencyMs,
    capabilities: observation.capabilities,
    observedAt: observation.observedAt,
  };
}

export async function publishRuntimeHealthObservation(
  observation: ChernobogRuntimeObservation,
  options: PublishRuntimeHealthOptions = {}
): Promise<void> {
  const payload =
    buildCommonPayload(observation);

  await publishChernobogEventSafely({
    type: "runtime.health_observed",

    source: {
      subsystem: "runtime-health",
      nodeId: observation.nodeId,
    },

    severity: "debug",

    subject: observation.id,

    scope: observation.nodeId
      ? `node:${observation.nodeId}`
      : "runtime",

    payload,

    dedupeKey: [
      "runtime.health_observed",
      observation.kind,
      observation.id,
      observation.status,
      observation.nodeId ?? "local",
    ].join(":"),

    metadata: {
      tags: [
        "runtime",
        "health",
        observation.kind,
        observation.status,
      ],
    },
  });

  if (observation.kind === "service") {
    if (
      recovered(
        options.previousStatus,
        observation.status
      )
    ) {
      await publishChernobogEventSafely({
        type: "service.recovered",

        source: {
          subsystem: "runtime-health",
          nodeId: observation.nodeId,
        },

        severity: "info",

        subject: observation.id,

        payload: {
          ...payload,
          previousStatus:
            options.previousStatus,
        },

        dedupeKey:
          `service.recovered:${observation.id}:${observation.nodeId ?? "local"}`,

        metadata: {
          tags: [
            "service",
            "health",
            "recovered",
          ],
        },
      });
    }

    const type =
      observation.status === "healthy"
        ? "service.healthy"
        : observation.status === "degraded"
          ? "service.degraded"
          : "service.failed";

    await publishChernobogEventSafely({
      type,

      source: {
        subsystem: "runtime-health",
        nodeId: observation.nodeId,
      },

      severity:
        observation.status === "healthy"
          ? "info"
          : observation.status === "degraded"
            ? "notice"
            : "warning",

      subject: observation.id,

      payload,

      dedupeKey:
        `${type}:${observation.id}:${observation.nodeId ?? "local"}`,

      metadata: {
        tags: [
          "service",
          "health",
          observation.status,
        ],
      },
    });

    return;
  }

  if (
    observation.kind === "runtime-node"
  ) {
    const online =
      observation.status === "healthy" ||
      observation.status === "degraded";

    await publishChernobogEventSafely({
      type: online
        ? "runtime.node_online"
        : "runtime.node_offline",

      source: {
        subsystem: "runtime-health",
        nodeId: observation.nodeId,
      },

      severity: online
        ? "info"
        : "warning",

      subject: observation.id,

      payload,

      dedupeKey: [
        online
          ? "runtime.node_online"
          : "runtime.node_offline",
        observation.id,
        observation.nodeId ?? "local",
      ].join(":"),

      metadata: {
        tags: [
          "runtime",
          "node",
          online ? "online" : "offline",
        ],
      },
    });

    return;
  }

  const available =
    observation.status === "healthy" ||
    observation.status === "degraded";

  await publishChernobogEventSafely({
    type: available
      ? "runtime.model_available"
      : "runtime.model_unavailable",

    source: {
      subsystem: "runtime-health",
      nodeId: observation.nodeId,
    },

    severity: available
      ? "info"
      : "warning",

    subject: observation.id,

    payload,

    dedupeKey: [
      available
        ? "runtime.model_available"
        : "runtime.model_unavailable",
      observation.id,
      observation.nodeId ?? "local",
    ].join(":"),

    metadata: {
      tags: [
        "runtime",
        "model-provider",
        available
          ? "available"
          : "unavailable",
      ],
    },
  });
}