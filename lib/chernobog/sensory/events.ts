import { getChernobogEventBus } from "../events";

export interface SensoryEventOptions {
  turnId?: string;
  modality?: "audio-input" | "audio-output" | "vision";
  severity?: "debug" | "info" | "notice" | "warning" | "critical";
  subject?: string;
  payload?: Record<string, unknown>;
}

export async function publishSensoryEvent(
  type: string,
  options: SensoryEventOptions = {},
): Promise<void> {
  await getChernobogEventBus().publish({
    type,
    source: {
      subsystem: "sensory",
      nodeId: options.modality ?? "presence",
    },
    severity: options.severity ?? "info",
    subject: options.subject,
    scope: "chernobog.presence",
    correlationId: options.turnId,
    payload: {
      turnId: options.turnId,
      modality: options.modality,
      ...(options.payload ?? {}),
    },
    metadata: {
      sensitive: true,
      tags: [
        "sensory",
        "presence",
        ...(options.modality ? [options.modality] : []),
      ],
    },
  });
}
