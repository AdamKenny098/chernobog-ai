/**
 * OH-7B13: bridge a revocable OH-7B12 ownership lease to the existing
 * headless composition and background lifecycle.
 *
 * No production services are started here; callers inject a real lease only
 * after explicit cutover. Each check fails closed and latches revocation.
 */
export interface RevocableOwnership {
  assertStillOwned(): void;
}

export class OH7B13OwnershipGuard {
  private revoked = false;
  private readonly lease: RevocableOwnership;

  constructor(lease: RevocableOwnership) {
    this.lease = lease;
  }

  assertOwned(): void {
    if (this.revoked) throw new Error("OH7B13 ownership revoked");
    try {
      this.lease.assertStillOwned();
    } catch (error) {
      this.revoked = true;
      throw error;
    }
  }

  hasOwnership = (): boolean => {
    try {
      this.assertOwned();
      return true;
    } catch {
      return false;
    }
  };

  /** Wraps a mutation-bearing request handler and refuses dispatch on lease loss. */
  guardRequest(
    handler: (request: Request) => Promise<Response>,
  ): (request: Request) => Promise<Response> {
    return async request => {
      if (!this.hasOwnership()) {
        return Response.json(
          { error: "core_ownership_lost" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
      return handler(request);
    };
  }

  /** Background ticks must call assertOwned before touching persisted state. */
  guardTick<T>(tick: () => T): () => T {
    return () => {
      this.assertOwned();
      return tick();
    };
  }
}
