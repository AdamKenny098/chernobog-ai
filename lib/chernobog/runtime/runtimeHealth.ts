export const CHERNOBOG_HEALTH_STATUSES = [
    "healthy",
    "degraded",
    "failed",
    "unknown",
  ] as const;
  
  export type ChernobogHealthStatus =
    (typeof CHERNOBOG_HEALTH_STATUSES)[number];
  
  export const CHERNOBOG_RUNTIME_KINDS = [
    "service",
    "runtime-node",
    "model-provider",
  ] as const;
  
  export type ChernobogRuntimeKind =
    (typeof CHERNOBOG_RUNTIME_KINDS)[number];
  
  export interface ChernobogRuntimeObservation {
    id: string;
  
    kind: ChernobogRuntimeKind;
  
    status: ChernobogHealthStatus;
  
    observedAt: string;
  
    nodeId?: string;
  
    platform?: string;
  
    latencyMs?: number;
  
    message?: string;
  
    capabilities?: string[];
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  }
  
  export function createRuntimeObservation(
    input: Omit<
      ChernobogRuntimeObservation,
      "observedAt"
    > & {
      observedAt?: string;
    }
  ): ChernobogRuntimeObservation {
    return {
      ...input,
      observedAt:
        input.observedAt ??
        new Date().toISOString(),
    };
  }
  
  export function isHealthyRuntimeObservation(
    observation: ChernobogRuntimeObservation
  ): boolean {
    return observation.status === "healthy";
  }
  
  export function isUnavailableRuntimeObservation(
    observation: ChernobogRuntimeObservation
  ): boolean {
    return (
      observation.status === "failed" ||
      observation.status === "unknown"
    );
  }