import {
  createModelRegistryId,
  getDefaultModelRegistry,
  type ModelCapability,
  type ModelRegistry,
  type ModelRegistryEntry,
} from "./modelRegistry";
import {
  generateWithModel,
} from "./gateway";
import type {
  ModelRole,
} from "./modelRouter";

export type ModelControlAction =
  | "add"
  | "enable"
  | "disable"
  | "configure"
  | "inspect"
  | "test"
  | "compare";

export interface ModelControlTestRequest {
  id: string;
  prompt: string;
  role?: ModelRole;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

export interface ModelControlTestResult {
  id: string;
  provider: string;
  model: string;
  ok: boolean;
  text?: string;
  error?: string;
  durationMs: number;
  attempts?: number;
  fallbackCount?: number;
}

export interface ModelControlCompareRequest {
  ids: string[];
  prompt: string;
  role?: ModelRole;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

export interface ModelControlSnapshot {
  generatedAt: string;
  models: ModelRegistryEntry[];
  totals: {
    models: number;
    enabled: number;
    disabled: number;
    available: number;
    local: number;
    remote: number;
  };
}

export interface ModelControlConfigurePatch {
  displayName?: string;
  roles?: ModelRole[];
  capabilities?: ModelCapability[];
  enabled?: boolean;
  availability?: ModelRegistryEntry["availability"];
  version?: string;
  contextLimits?: ModelRegistryEntry["contextLimits"];
  cost?: ModelRegistryEntry["cost"];
  privacy?: ModelRegistryEntry["privacy"];
  strengths?: string[];
  weaknesses?: string[];
  tags?: string[];
  metadata?: ModelRegistryEntry["metadata"];
}

export type ModelControlExecutor =
  (
    request: ModelControlTestRequest,
    entry: ModelRegistryEntry,
  ) => Promise<ModelControlTestResult>;

function requireNonEmpty(
  value: string,
  field: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function cloneEntry(
  entry: ModelRegistryEntry,
): ModelRegistryEntry {
  return structuredClone(entry);
}

async function defaultExecutor(
  request: ModelControlTestRequest,
  entry: ModelRegistryEntry,
): Promise<ModelControlTestResult> {
  const prompt =
    requireNonEmpty(
      request.prompt,
      "prompt",
    );

  if (!entry.enabled) {
    return {
      id: entry.id,
      provider:
        entry.provider,
      model:
        entry.model,
      ok:
        false,
      error:
        "Model is disabled.",
      durationMs:
        0,
    };
  }

  if (
    entry.provider !==
    "ollama"
  ) {
    return {
      id:
        entry.id,
      provider:
        entry.provider,
      model:
        entry.model,
      ok:
        false,
      error:
        `Provider is registered for administration but has no executable adapter yet: ${entry.provider}`,
      durationMs:
        0,
    };
  }

  const startedAt =
    Date.now();

  const result =
    await generateWithModel({
      role:
        request.role ??
        entry.roles[0] ??
        "default",
      prompt,
      modelOverride:
        entry.model,
      temperature:
        request.temperature,
      numPredict:
        request.numPredict,
      timeoutMs:
        request.timeoutMs,
    });

  return {
    id:
      entry.id,
    provider:
      entry.provider,
    model:
      result.model,
    ok:
      result.ok,
    text:
      result.text,
    error:
      result.error,
    durationMs:
      result.durationMs ??
      Date.now() -
        startedAt,
    attempts:
      result.attempts,
    fallbackCount:
      result.fallbackCount,
  };
}

export class ModelControlCenter {
  constructor(
    private readonly registry:
      ModelRegistry,
    private readonly executor:
      ModelControlExecutor =
        defaultExecutor,
  ) {}

  snapshot():
    ModelControlSnapshot {
    const models =
      this.registry.list();

    return {
      generatedAt:
        new Date().toISOString(),
      models,
      totals: {
        models:
          models.length,
        enabled:
          models.filter(
            (model) =>
              model.enabled,
          ).length,
        disabled:
          models.filter(
            (model) =>
              !model.enabled,
          ).length,
        available:
          models.filter(
            (model) =>
              model.availability ===
              "available",
          ).length,
        local:
          models.filter(
            (model) =>
              model.local,
          ).length,
        remote:
          models.filter(
            (model) =>
              !model.local,
          ).length,
      },
    };
  }

  inspect(
    id: string,
  ): ModelRegistryEntry {
    const normalizedId =
      requireNonEmpty(
        id,
        "id",
      );

    const entry =
      this.registry.get(
        normalizedId,
      );

    if (!entry) {
      throw new Error(
        `Unknown model: ${normalizedId}`,
      );
    }

    return cloneEntry(
      entry,
    );
  }

  add(
    entry: ModelRegistryEntry,
  ): ModelRegistryEntry {
    return this.registry.register(
      entry,
    );
  }

  setEnabled(
    id: string,
    enabled: boolean,
  ): ModelRegistryEntry {
    const entry =
      this.inspect(id);

    return this.registry.upsert({
      ...entry,
      enabled,
    });
  }

  configure(
    id: string,
    patch:
      ModelControlConfigurePatch,
  ): ModelRegistryEntry {
    const entry =
      this.inspect(id);

    if (
      "provider" in patch ||
      "model" in patch ||
      "id" in patch
    ) {
      throw new Error(
        "Model identity cannot be changed through configure(). Register a new model identity instead.",
      );
    }

    return this.registry.upsert({
      ...entry,
      ...structuredClone(
        patch,
      ),
      id:
        createModelRegistryId(
          entry.provider,
          entry.model,
        ),
      provider:
        entry.provider,
      model:
        entry.model,
    });
  }

  async test(
    request:
      ModelControlTestRequest,
  ): Promise<ModelControlTestResult> {
    const entry =
      this.inspect(
        request.id,
      );

    return this.executor(
      {
        ...request,
        prompt:
          requireNonEmpty(
            request.prompt,
            "prompt",
          ),
      },
      entry,
    );
  }

  async compare(
    request:
      ModelControlCompareRequest,
  ): Promise<
    ModelControlTestResult[]
  > {
    const ids =
      [
        ...new Set(
          request.ids
            .map(
              (id) =>
                id.trim(),
            )
            .filter(Boolean),
        ),
      ];

    if (
      ids.length < 2
    ) {
      throw new Error(
        "Model comparison requires at least two distinct model ids.",
      );
    }

    if (
      ids.length > 8
    ) {
      throw new Error(
        "Model comparison is limited to eight models per request.",
      );
    }

    const prompt =
      requireNonEmpty(
        request.prompt,
        "prompt",
      );

    return Promise.all(
      ids.map(
        (id) =>
          this.test({
            id,
            prompt,
            role:
              request.role,
            temperature:
              request.temperature,
            numPredict:
              request.numPredict,
            timeoutMs:
              request.timeoutMs,
          }),
      ),
    );
  }
}

const defaultModelControlCenter =
  new ModelControlCenter(
    getDefaultModelRegistry(),
  );

export function getModelControlCenter():
  ModelControlCenter {
  return defaultModelControlCenter;
}