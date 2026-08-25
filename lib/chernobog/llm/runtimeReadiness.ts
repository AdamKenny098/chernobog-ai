import {
  probeOllamaHealth,
  type OllamaHealthResult,
} from "../runtime/ollamaHealth";
import {
  resolveModelRoleAvailability,
  type ModelRoleAvailability,
} from "../runtime/modelAvailability";
import type {
  ModelRole,
} from "./modelRouter";

export type OllamaReadinessFailureKind =
  | "provider-unavailable"
  | "model-unavailable";

export interface OllamaRuntimeReadiness {
  ready: boolean;
  role: ModelRole;
  configuredModel: string;
  matchedInstalledModel?: string;
  providerStatus: string;
  installedModels: string[];
  checkedAt: string;
  cached: boolean;
  failureKind?: OllamaReadinessFailureKind;
  reason?: string;
}

export interface OllamaRuntimeReadinessOptions {
  timeoutMs?: number;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
}

interface CachedHealth {
  checkedAtMs: number;
  result: OllamaHealthResult;
}

let cachedHealth:
  | CachedHealth
  | undefined;

function cloneHealth(
  value: OllamaHealthResult,
): OllamaHealthResult {
  return structuredClone(value);
}

async function readHealth(
  options: OllamaRuntimeReadinessOptions,
): Promise<{
  result: OllamaHealthResult;
  cached: boolean;
  checkedAtMs: number;
}> {
  const cacheTtlMs =
    options.cacheTtlMs ?? 5_000;

  if (
    !Number.isFinite(cacheTtlMs) ||
    cacheTtlMs < 0
  ) {
    throw new Error(
      "Ollama readiness cacheTtlMs must be non-negative.",
    );
  }

  const now = Date.now();

  if (
    !options.forceRefresh &&
    cachedHealth &&
    now - cachedHealth.checkedAtMs <=
      cacheTtlMs
  ) {
    return {
      result:
        cloneHealth(
          cachedHealth.result,
        ),
      cached: true,
      checkedAtMs:
        cachedHealth.checkedAtMs,
    };
  }

  const result =
    await probeOllamaHealth({
      timeoutMs:
        options.timeoutMs ??
        3_000,
    });

  cachedHealth = {
    checkedAtMs: now,
    result:
      cloneHealth(result),
  };

  return {
    result,
    cached: false,
    checkedAtMs: now,
  };
}

function fromAvailability(
  role: ModelRole,
  health: OllamaHealthResult,
  availability: ModelRoleAvailability,
  checkedAtMs: number,
  cached: boolean,
): OllamaRuntimeReadiness {
  const providerStatus =
    health.observation.status;

  if (
    providerStatus !== "healthy"
  ) {
    return {
      ready: false,
      role,
      configuredModel:
        availability.configuredModel,
      matchedInstalledModel:
        availability.matchedInstalledModel,
      providerStatus,
      installedModels:
        [...health.installedModels],
      checkedAt:
        new Date(
          checkedAtMs,
        ).toISOString(),
      cached,
      failureKind:
        "provider-unavailable",
      reason:
        health.observation.message ??
        "Ollama provider is not healthy.",
    };
  }

  if (!availability.available) {
    return {
      ready: false,
      role,
      configuredModel:
        availability.configuredModel,
      providerStatus,
      installedModels:
        [...health.installedModels],
      checkedAt:
        new Date(
          checkedAtMs,
        ).toISOString(),
      cached,
      failureKind:
        "model-unavailable",
      reason:
        `Configured model is not installed for role ${role}: ${availability.configuredModel}`,
    };
  }

  return {
    ready: true,
    role,
    configuredModel:
      availability.configuredModel,
    matchedInstalledModel:
      availability.matchedInstalledModel,
    providerStatus,
    installedModels:
      [...health.installedModels],
    checkedAt:
      new Date(
        checkedAtMs,
      ).toISOString(),
    cached,
  };
}

export async function checkOllamaRuntimeReadiness(
  role: ModelRole = "default",
  options:
    OllamaRuntimeReadinessOptions = {},
): Promise<OllamaRuntimeReadiness> {
  const {
    result,
    cached,
    checkedAtMs,
  } = await readHealth(options);

  const availability =
    resolveModelRoleAvailability(
      role,
      result.installedModels,
    );

  return fromAvailability(
    role,
    result,
    availability,
    checkedAtMs,
    cached,
  );
}

export function resetOllamaRuntimeReadinessCache():
  void {
  cachedHealth = undefined;
}
