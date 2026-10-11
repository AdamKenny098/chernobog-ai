import {
  getModelCandidates,
  type ModelRole,
} from "./modelRouter";

export type ModelProviderId = string;

export type ModelCapability =
  | "chat"
  | "planning"
  | "coding"
  | "repair"
  | "json"
  | "tools"
  | "vision"
  | "embeddings"
  | "other";

export type ModelRegistrySource =
  | "builtin"
  | "configuration"
  | "discovery"
  | "user"
  | "runtime";

export type ModelAvailability =
  | "available"
  | "unavailable"
  | "unknown";

export interface ModelContextLimits {
  known: boolean;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
}

export interface ModelCostCharacteristics {
  known: boolean;
  mode:
    | "local-compute"
    | "metered"
    | "subscription"
    | "unknown";
  currency?: string;
  inputPerMillionTokens?: number;
  outputPerMillionTokens?: number;
}

export interface ModelPrivacyProperties {
  execution:
    | "local"
    | "remote"
    | "hybrid"
    | "unknown";
  promptLeavesDevice:
    | boolean
    | null;
  retention:
    | "none"
    | "local-runtime"
    | "provider-policy"
    | "unknown";
}

export interface ModelRegistryEntry {
  id: string;
  provider: ModelProviderId;
  model: string;
  displayName: string;

  roles: ModelRole[];
  capabilities: ModelCapability[];

  enabled: boolean;
  local: boolean;

  availability: ModelAvailability;
  version?: string;

  contextLimits: ModelContextLimits;
  cost: ModelCostCharacteristics;
  privacy: ModelPrivacyProperties;

  strengths: string[];
  weaknesses: string[];

  source: ModelRegistrySource;
  tags: string[];

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}

export interface ModelRegistryQuery {
  provider?: ModelProviderId;
  role?: ModelRole;
  capability?: ModelCapability;
  enabled?: boolean;
  local?: boolean;
}

function normalizeProvider(
  provider: string,
): string {
  return provider
    .trim()
    .toLowerCase();
}

function normalizeModel(
  model: string,
): string {
  return model.trim();
}

export function createModelRegistryId(
  provider: string,
  model: string,
): string {
  const normalizedProvider =
    normalizeProvider(provider);

  const normalizedModel =
    normalizeModel(model);

  if (!normalizedProvider) {
    throw new Error(
      "Model provider must not be empty.",
    );
  }

  if (!normalizedModel) {
    throw new Error(
      "Model name must not be empty.",
    );
  }

  return `${normalizedProvider}:${normalizedModel}`;
}

function cloneEntry(
  entry: ModelRegistryEntry,
): ModelRegistryEntry {
  return structuredClone(entry);
}

function uniqueSorted<T extends string>(
  values: readonly T[],
): T[] {
  return [
    ...new Set(values),
  ].sort() as T[];
}

function normalizeEntry(
  entry: ModelRegistryEntry,
): ModelRegistryEntry {
  const provider =
    normalizeProvider(entry.provider);

  const model =
    normalizeModel(entry.model);

  const id =
    createModelRegistryId(
      provider,
      model,
    );

  if (
    entry.id &&
    entry.id !== id
  ) {
    throw new Error(
      `Model registry id mismatch: expected ${id}, received ${entry.id}`,
    );
  }

  return {
    ...structuredClone(entry),
    id,
    provider,
    model,
    displayName:
      entry.displayName.trim() ||
      model,
    roles:
      uniqueSorted(entry.roles),
    capabilities:
      uniqueSorted(
        entry.capabilities,
      ),
    version:
      entry.version?.trim() ||
      undefined,
    strengths:
      uniqueSorted(
        entry.strengths
          .map(
            (value) =>
              value.trim(),
          )
          .filter(Boolean),
      ),
    weaknesses:
      uniqueSorted(
        entry.weaknesses
          .map(
            (value) =>
              value.trim(),
          )
          .filter(Boolean),
      ),
    tags:
      uniqueSorted(
        entry.tags
          .map(
            (tag) =>
              tag.trim(),
          )
          .filter(Boolean),
      ),
  };
}

export class ModelRegistry {
  private readonly entries =
    new Map<
      string,
      ModelRegistryEntry
    >();

  register(
    entry: ModelRegistryEntry,
  ): ModelRegistryEntry {
    const normalized =
      normalizeEntry(entry);

    if (
      this.entries.has(
        normalized.id,
      )
    ) {
      throw new Error(
        `Model is already registered: ${normalized.id}`,
      );
    }

    this.entries.set(
      normalized.id,
      normalized,
    );

    return cloneEntry(
      normalized,
    );
  }

  upsert(
    entry: ModelRegistryEntry,
  ): ModelRegistryEntry {
    const normalized =
      normalizeEntry(entry);

    this.entries.set(
      normalized.id,
      normalized,
    );

    return cloneEntry(
      normalized,
    );
  }

  get(
    id: string,
  ): ModelRegistryEntry | undefined {
    const entry =
      this.entries.get(id);

    return entry
      ? cloneEntry(entry)
      : undefined;
  }

  getByProviderModel(
    provider: string,
    model: string,
  ): ModelRegistryEntry | undefined {
    return this.get(
      createModelRegistryId(
        provider,
        model,
      ),
    );
  }

  has(
    id: string,
  ): boolean {
    return this.entries.has(id);
  }

  remove(
    id: string,
  ): boolean {
    return this.entries.delete(id);
  }

  list(
    query: ModelRegistryQuery = {},
  ): ModelRegistryEntry[] {
    const provider =
      query.provider
        ? normalizeProvider(
            query.provider,
          )
        : undefined;

    return [
      ...this.entries.values(),
    ]
      .filter(
        (entry) =>
          (
            provider === undefined ||
            entry.provider === provider
          ) &&
          (
            query.role === undefined ||
            entry.roles.includes(
              query.role,
            )
          ) &&
          (
            query.capability === undefined ||
            entry.capabilities.includes(
              query.capability,
            )
          ) &&
          (
            query.enabled === undefined ||
            entry.enabled ===
              query.enabled
          ) &&
          (
            query.local === undefined ||
            entry.local ===
              query.local
          ),
      )
      .sort(
        (a, b) =>
          a.id.localeCompare(
            b.id,
          ),
      )
      .map(cloneEntry);
  }
}

function capabilitiesForRole(
  role: ModelRole,
): ModelCapability[] {
  switch (role) {
    case "planner":
      return [
        "planning",
      ];

    case "code":
      return [
        "coding",
      ];

    case "repair":
      return [
        "repair",
      ];

    case "default":
    default:
      return [
        "chat",
      ];
  }
}

export function createConfiguredModelRegistry():
  ModelRegistry {
  const registry =
    new ModelRegistry();

  const roles:
    ModelRole[] = [
      "default",
      "code",
      "planner",
      "repair",
    ];

  for (const role of roles) {
    const candidates =
      getModelCandidates(role);

    for (
      const candidate
      of candidates
    ) {
      const id =
        createModelRegistryId(
          "ollama",
          candidate.model,
        );

      const existing =
        registry.get(id);

      if (existing) {
        registry.upsert({
          ...existing,
          roles:
            uniqueSorted([
              ...existing.roles,
              role,
            ]),
          capabilities:
            uniqueSorted([
              ...existing.capabilities,
              ...capabilitiesForRole(
                role,
              ),
            ]),
          tags:
            uniqueSorted([
              ...existing.tags,
              candidate.source,
            ]),
        });

        continue;
      }

      registry.register({
        id,
        provider:
          "ollama",
        model:
          candidate.model,
        displayName:
          candidate.model,
        roles: [
          role,
        ],
        capabilities:
          capabilitiesForRole(
            role,
          ),
        enabled:
          true,
        local:
          true,
        availability:
          "unknown",
        contextLimits: {
          known:
            false,
        },
        cost: {
          known:
            true,
          mode:
            "local-compute",
        },
        privacy: {
          execution:
            "local",
          promptLeavesDevice:
            false,
          retention:
            "unknown",
        },
        strengths: [
          ...capabilitiesForRole(
            role,
          ),
        ],
        weaknesses: [
          "Empirical performance not yet calibrated",
        ],
        source:
          "configuration",
        tags: [
          candidate.source,
        ],
      });
    }
  }

  return registry;
}

const defaultModelRegistry =
  createConfiguredModelRegistry();

export function getDefaultModelRegistry():
  ModelRegistry {
  return defaultModelRegistry;
}