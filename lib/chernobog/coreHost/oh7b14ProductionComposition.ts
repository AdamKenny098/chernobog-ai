/**
 * OH-7B14: production-shaped composition boundary, not a production entrypoint.
 *
 * Constructing this object NEVER obtains a lease, imports databases, opens a
 * listener, or starts background work. B15 must supply a real B13 ownership
 * guard after OS-level exclusion of the legacy writer has been established.
 *
 * Each request and health check reads the revocable guard. The caller owns
 * the responsibility to stop background work after ownership loss; every
 * mutation-bearing adapter must separately enforce its storage fence.
 */
import {
  HeadlessBackgroundLifecycle,
  type BackgroundAdapter,
  type BackgroundSnapshot,
} from "./backgroundLifecycle";
import { OH7B13OwnershipGuard } from "./oh7b13OwnershipGuard";

type RequestHandler = (request: Request) => Promise<Response>;
export type ProductionEndpoint = "/internal/chat" | "/internal/session";

export interface OH7B14ProductionCompositionOptions {
  /** An externally acquired B13 ownership guard. Never created implicitly. */
  readonly guard: OH7B13OwnershipGuard;
  readonly adapters: readonly BackgroundAdapter[];
  readonly chat: RequestHandler;
  readonly session: RequestHandler;
}

export type OH7B14ProductionHealth = Readonly<{
  mode: "production-candidate";
  operationalCoreReady: boolean;
  operationalOwner: boolean;
  lifecycle: "new" | "starting" | "active" | "stopping" | "stopped";
  background: BackgroundSnapshot;
}>;

export class OH7B14ProductionComposition {
  private readonly background: HeadlessBackgroundLifecycle;
  private readonly guard: OH7B13OwnershipGuard;
  private readonly chat: RequestHandler;
  private readonly session: RequestHandler;
  private lifecycle: OH7B14ProductionHealth["lifecycle"] = "new";
  private startTask: Promise<void> | null = null;
  private stopTask: Promise<void> | null = null;

  constructor(options: OH7B14ProductionCompositionOptions) {
    if (!(options.guard instanceof OH7B13OwnershipGuard)) {
      throw new Error("OH7B14 requires an externally granted B13 ownership guard");
    }
    this.guard = options.guard;
    this.chat = this.guard.guardRequest(options.chat);
    this.session = this.guard.guardRequest(options.session);
    this.background = new HeadlessBackgroundLifecycle(options.adapters, this.guard.hasOwnership);
  }

  health(): OH7B14ProductionHealth {
    const background = this.background.snapshot();
    const owned = this.lifecycle === "active" && this.guard.hasOwnership();
    return Object.freeze({
      mode: "production-candidate",
      operationalOwner: owned,
      operationalCoreReady: owned && background.lifecycle === "active",
      lifecycle: this.lifecycle,
      background,
    });
  }

  start(): Promise<void> {
    if (this.lifecycle !== "new") {
      return Promise.reject(new Error("OH7B14 core already started or stopped"));
    }
    // Move to starting synchronously: stop() must observe a pending startup.
    this.lifecycle = "starting";
    this.startTask = this.activate();
    return this.startTask;
  }

  private async activate(): Promise<void> {
    try {
      this.guard.assertOwned();
      await this.background.start();
      // Catch revocation and shutdown while async adapters were starting.
      this.guard.assertOwned();
      if (this.lifecycle !== "starting") {
        throw new Error("OH7B14 startup cancelled by shutdown");
      }
      this.lifecycle = "active";
    } catch (error) {
      // stop() waits for startTask, preventing overlapping lifecycle transitions.
      // We own cleanup on startup failure when stop() was not requested.
      if (this.lifecycle !== "stopping") {
        this.lifecycle = "stopping";
        await this.background.stop();
        this.lifecycle = "stopped";
      }
      throw error;
    }
  }

  async dispatch(endpoint: ProductionEndpoint, request: Request): Promise<Response> {
    if (!this.health().operationalCoreReady) {
      return Response.json({ error: "core_not_ready" }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (endpoint === "/internal/chat" && request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    if (endpoint === "/internal/session" && request.method !== "GET") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    return endpoint === "/internal/chat" ? this.chat(request) : this.session(request);
  }

  stop(): Promise<void> {
    if (this.stopTask) return this.stopTask;
    if (this.lifecycle === "stopped") return Promise.resolve();
    this.lifecycle = "stopping";
    this.stopTask = (async () => {
      try {
        // Never call background.stop while background.start is in flight.
        await this.startTask?.catch(() => {});
        await this.background.stop();
      } finally {
        this.lifecycle = "stopped";
      }
    })();
    return this.stopTask;
  }
}
