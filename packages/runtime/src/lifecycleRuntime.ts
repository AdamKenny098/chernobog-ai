/**
 * OH-2I — Runtime Lifecycle authority.
 *
 * Owns generic runtime/dependency lifecycle state:
 * startup, temporary unavailability, recovery, retry accounting,
 * shutdown, and read-only lifecycle projection.
 *
 * Provider-specific readiness probes, failure taxonomy, retry backoff,
 * and model fallback remain delegated to their accepted domain owners.
 * This runtime coordinates those outcomes; it does not replace them.
 */

export const OLLAMA_LIFECYCLE_DEPENDENCY =
  "model-provider:ollama";

export type LifecycleStatus =
  | "idle"
  | "starting"
  | "ready"
  | "degraded"
  | "unavailable"
  | "recovering"
  | "stopping"
  | "stopped";

export type LifecycleDependencyStatus =
  | "unknown"
  | "ready"
  | "degraded"
  | "unavailable"
  | "stopped";

export type LifecycleMetadataValue =
  | string
  | number
  | boolean
  | null;

export type LifecycleDependencyAssessment = {
  status:
    | "ready"
    | "degraded"
    | "unavailable";
  reason?: string;
  attempts?: number;
  retries?: number;
  metadata?: Record<
    string,
    LifecycleMetadataValue
  >;
};

export type LifecycleDependencySnapshot = {
  id: string;
  status: LifecycleDependencyStatus;
  firstObservedAt: string;
  updatedAt: string;
  lastRecoveredAt?: string;
  reason?: string;
  operationCount: number;
  observationCount: number;
  totalRetries: number;
  recoveryCount: number;
  metadata: Record<
    string,
    LifecycleMetadataValue
  >;
};

export type LifecycleRuntimeSnapshot = {
  authority:
    "@chernobog/runtime LifecycleRuntime";
  revision: number;
  status: LifecycleStatus;
  startedAt?: string;
  updatedAt: string;
  stoppedAt?: string;
  dependencies:
    LifecycleDependencySnapshot[];
};

export type LifecycleDependencyOperation<T> = {
  dependencyId: string;
  operation: () => Promise<T>;
  assess:
    (
      result: T,
    ) => LifecycleDependencyAssessment;
};

type MutableDependencyState = {
  id: string;
  status: LifecycleDependencyStatus;
  firstObservedAt: string;
  updatedAt: string;
  lastRecoveredAt?: string;
  reason?: string;
  operationCount: number;
  observationCount: number;
  totalRetries: number;
  recoveryCount: number;
  metadata: Record<
    string,
    LifecycleMetadataValue
  >;
};

export class LifecycleRuntime {
  private revision = 0;
  private statusValue: LifecycleStatus = "idle";
  private startedAt: string | undefined;
  private stoppedAt: string | undefined;
  private updatedAt = new Date().toISOString();

  private readonly dependencies =
    new Map<string, MutableDependencyState>();

  private readonly maxRetainedDependencies = 64;

  private now(): string {
    return new Date().toISOString();
  }

  private touch(): void {
    this.revision += 1;
    this.updatedAt = this.now();
  }

  private normalizedId(
    dependencyId: string,
  ): string {
    const normalized = dependencyId.trim();

    if (!normalized) {
      throw new Error(
        "Lifecycle dependency id must not be empty.",
      );
    }

    return normalized;
  }

  private ensureStarted(): void {
    if (
      this.statusValue === "stopped" ||
      !this.startedAt
    ) {
      this.startedAt = this.now();
      this.stoppedAt = undefined;
    }
  }

  private trimDependencies(): void {
    while (
      this.dependencies.size >
      this.maxRetainedDependencies
    ) {
      const first =
        this.dependencies
          .keys()
          .next()
          .value as
            | string
            | undefined;

      if (!first) {
        return;
      }

      this.dependencies.delete(first);
    }
  }

  private dependency(
    dependencyId: string,
  ): MutableDependencyState {
    const id =
      this.normalizedId(
        dependencyId,
      );

    const existing =
      this.dependencies.get(id);

    if (existing) {
      return existing;
    }

    const now = this.now();

    const created:
      MutableDependencyState = {
        id,
        status: "unknown",
        firstObservedAt: now,
        updatedAt: now,
        operationCount: 0,
        observationCount: 0,
        totalRetries: 0,
        recoveryCount: 0,
        metadata: {},
      };

    this.dependencies.set(
      id,
      created,
    );

    this.trimDependencies();

    return created;
  }

  private deriveStatus():
    LifecycleStatus {
    if (
      this.statusValue === "stopping" ||
      this.statusValue === "stopped"
    ) {
      return this.statusValue;
    }

    const dependencies =
      [...this.dependencies.values()];

    if (
      dependencies.length === 0
    ) {
      return this.startedAt
        ? "starting"
        : "idle";
    }

    const available =
      dependencies.filter(
        (entry) =>
          entry.status === "ready" ||
          entry.status === "degraded",
      ).length;

    const unavailable =
      dependencies.filter(
        (entry) =>
          entry.status === "unavailable",
      ).length;

    const degraded =
      dependencies.some(
        (entry) =>
          entry.status === "degraded",
      );

    if (
      unavailable > 0 &&
      available === 0
    ) {
      return "unavailable";
    }

    if (
      unavailable > 0 ||
      degraded
    ) {
      return "degraded";
    }

    if (available > 0) {
      return "ready";
    }

    return "starting";
  }

  private applyAssessment(
    dependencyId: string,
    assessment:
      LifecycleDependencyAssessment,
    source:
      | "operation"
      | "observation",
  ): void {
    this.ensureStarted();

    const dependency =
      this.dependency(
        dependencyId,
      );

    const previousStatus =
      dependency.status;

    const now = this.now();

    dependency.status =
      assessment.status;

    dependency.updatedAt = now;

    if (
      source === "operation"
    ) {
      dependency.operationCount += 1;
    } else {
      dependency.observationCount += 1;
    }

    dependency.totalRetries +=
      Math.max(
        0,
        assessment.retries ?? 0,
      );

    if (
      previousStatus ===
        "unavailable" &&
      (
        assessment.status ===
          "ready" ||
        assessment.status ===
          "degraded"
      )
    ) {
      dependency.recoveryCount += 1;
      dependency.lastRecoveredAt = now;
    }

    if (assessment.reason) {
      dependency.reason =
        assessment.reason;
    } else {
      delete dependency.reason;
    }

    if (assessment.metadata) {
      dependency.metadata = {
        ...dependency.metadata,
        ...assessment.metadata,
      };
    }

    this.statusValue =
      this.deriveStatus();

    this.touch();
  }

  public start(): void {
    if (
      this.statusValue !== "idle" &&
      this.statusValue !== "stopped"
    ) {
      return;
    }

    this.ensureStarted();
    this.statusValue = "starting";
    this.touch();
  }

  public observeDependency(
    dependencyId: string,
    assessment:
      LifecycleDependencyAssessment,
  ): void {
    this.applyAssessment(
      dependencyId,
      assessment,
      "observation",
    );
  }

  public async runDependencyOperation<T>(
    options:
      LifecycleDependencyOperation<T>,
  ): Promise<T> {
    this.ensureStarted();

    const dependency =
      this.dependency(
        options.dependencyId,
      );

    this.statusValue =
      dependency.status ===
        "unavailable"
        ? "recovering"
        : "starting";

    this.touch();

    try {
      const result =
        await options.operation();

      const assessment =
        options.assess(result);

      this.applyAssessment(
        options.dependencyId,
        assessment,
        "operation",
      );

      return result;
    } catch (error) {
      this.applyAssessment(
        options.dependencyId,
        {
          status: "unavailable",
          reason:
            error instanceof Error
              ? error.message
              : String(error),
        },
        "operation",
      );

      throw error;
    }
  }

  public shutdown(): void {
    if (
      this.statusValue === "stopped"
    ) {
      return;
    }

    this.statusValue = "stopping";
    this.touch();

    const now = this.now();

    for (
      const dependency
      of this.dependencies.values()
    ) {
      dependency.status = "stopped";
      dependency.updatedAt = now;
    }

    this.statusValue = "stopped";
    this.stoppedAt = now;
    this.touch();
  }

  public snapshot():
    LifecycleRuntimeSnapshot {
    return {
      authority:
        "@chernobog/runtime LifecycleRuntime",
      revision: this.revision,
      status: this.statusValue,
      ...(this.startedAt
        ? {
            startedAt:
              this.startedAt,
          }
        : {}),
      updatedAt:
        this.updatedAt,
      ...(this.stoppedAt
        ? {
            stoppedAt:
              this.stoppedAt,
          }
        : {}),
      dependencies:
        [...this.dependencies.values()]
          .map(
            (dependency) =>
              structuredClone(
                dependency,
              ),
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.id.localeCompare(
                right.id,
              ),
          ),
    };
  }
}

const lifecycleRuntime =
  new LifecycleRuntime();

export function getLifecycleRuntime():
  LifecycleRuntime {
  return lifecycleRuntime;
}
