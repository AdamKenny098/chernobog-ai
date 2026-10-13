import type {
  ObservabilityErrorMetadata,
  ObservabilityTimingMetadata,
} from "./types";

export function createTimingMetadata(
  startedAt: string,
  completedAt?: string,
): ObservabilityTimingMetadata {
  if (!completedAt) return { startedAt };
  const startMs = Date.parse(startedAt);
  const completedMs = Date.parse(completedAt);
  return {
    startedAt,
    completedAt,
    durationMs:
      Number.isFinite(startMs) && Number.isFinite(completedMs)
        ? Math.max(0, completedMs - startMs)
        : undefined,
  };
}

export function toObservabilityErrorMetadata(
  error: unknown,
): ObservabilityErrorMetadata {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    return { message: error.message, name: error.name, code };
  }
  return { message: String(error) };
}
