import { publishChernobogEventSafely } from "../events/publishers";

import type {
  ModelAvailabilitySnapshot,
  ModelRoleAvailability,
} from "./modelAvailability";

async function publishModelRoleAvailability(
  entry: ModelRoleAvailability,
  providerId: string,
  nodeId?: string
): Promise<void> {
  const type =
    entry.available
      ? "runtime.model_role_available"
      : "runtime.model_role_unavailable";

  await publishChernobogEventSafely({
    type,

    source: {
      subsystem: "runtime-health",
      nodeId,
    },

    severity:
      entry.available
        ? "info"
        : "warning",

    subject: entry.role,

    scope:
      `model-role:${entry.role}`,

    payload: {
      providerId,

      role:
        entry.role,

      configuredModel:
        entry.configuredModel,

      source:
        entry.source,

      available:
        entry.available,

      matchedInstalledModel:
        entry.matchedInstalledModel,
    },

    dedupeKey: [
      type,
      providerId,
      nodeId ?? "local",
      entry.role,
      entry.configuredModel,
      entry.matchedInstalledModel ??
        "missing",
    ].join(":"),

    metadata: {
      tags: [
        "runtime",
        "model",
        "role",

        entry.available
          ? "available"
          : "unavailable",

        entry.role,
      ],
    },
  });
}

export async function publishModelAvailabilitySnapshot(
  snapshot: ModelAvailabilitySnapshot,
  options: {
    providerId?: string;
    nodeId?: string;
  } = {}
): Promise<void> {
  const providerId =
    options.providerId ??
    "ollama";

  for (
    const entry of
    snapshot.roles
  ) {
    await publishModelRoleAvailability(
      entry,
      providerId,
      options.nodeId
    );
  }
}