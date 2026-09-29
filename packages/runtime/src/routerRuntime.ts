/**
 * OH-2C — Authoritative Router Runtime.
 *
 * Owns one routing decision per Dialogue Runtime turn.
 * The existing router implementation remains responsible for intent/domain
 * classification. This runtime owns decision singularity, projection, and reuse.
 */

export type RouterDecisionStatus = "resolving" | "resolved" | "failed";

export type RouterDecisionSnapshot = {
  turnId: string;
  revision: number;
  status: RouterDecisionStatus;
  createdAt: string;
  updatedAt: string;
  summary: string | null;
};

type RouterDecisionEntry = {
  snapshot: RouterDecisionSnapshot;
  promise: Promise<unknown>;
};

export class RouterRuntime {
  private revision = 0;
  private readonly decisions = new Map<string, RouterDecisionEntry>();
  private readonly maxRetainedDecisions = 256;

  private now(): string {
    return new Date().toISOString();
  }

  private summarize(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of ["route", "name", "intent", "domain"]) {
        const candidate = record[key];
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    return null;
  }

  private touch(snapshot: RouterDecisionSnapshot): void {
    this.revision += 1;
    snapshot.revision = this.revision;
    snapshot.updatedAt = this.now();
  }

  private trim(): void {
    while (this.decisions.size > this.maxRetainedDecisions) {
      const firstKey = this.decisions.keys().next().value as string | undefined;
      if (!firstKey) return;
      this.decisions.delete(firstKey);
    }
  }

  public snapshot(): {
    revision: number;
    decisions: RouterDecisionSnapshot[];
  } {
    return {
      revision: this.revision,
      decisions: [...this.decisions.values()].map((entry) => ({ ...entry.snapshot })),
    };
  }

  public async resolveRoute<T>(
    turnId: string,
    resolver: () => T | Promise<T>,
  ): Promise<T> {
    const existing = this.decisions.get(turnId);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    const timestamp = this.now();
    this.revision += 1;

    const snapshot: RouterDecisionSnapshot = {
      turnId,
      revision: this.revision,
      status: "resolving",
      createdAt: timestamp,
      updatedAt: timestamp,
      summary: null,
    };

    const promise = Promise.resolve()
      .then(resolver)
      .then((result) => {
        snapshot.status = "resolved";
        snapshot.summary = this.summarize(result);
        this.touch(snapshot);
        return result;
      })
      .catch((error) => {
        snapshot.status = "failed";
        this.touch(snapshot);
        throw error;
      });

    this.decisions.set(turnId, { snapshot, promise });
    this.trim();
    return promise;
  }
}

const routerRuntime = new RouterRuntime();

export function getRouterRuntime(): RouterRuntime {
  return routerRuntime;
}
