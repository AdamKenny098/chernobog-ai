/**
 * OH-7B6: composition boundary for a headless core.
 *
 * This module imports no SQLite services or job handlers. The caller supplies
 * tested adapters after verifying storage isolation and ownership.
 * Production cutover is deliberately NOT implemented here.
 */
import {
  HeadlessBackgroundLifecycle,
  type BackgroundAdapter,
  type BackgroundSnapshot,
} from "./backgroundLifecycle";

export type CoreRequestHandler = (request: Request) => Promise<Response>;

export interface OH7B6CompositionOptions {
  mode: "passive" | "isolated-test";
  /** A runtime check, not a one-time ownership assertion. */
  hasOwnership: () => boolean;
  adapters: readonly BackgroundAdapter[];
  chat: CoreRequestHandler;
  session: CoreRequestHandler;
}

export type OH7B6Health = Readonly<{
  mode: "passive" | "isolated-test";
  live: boolean;
  operationalCoreReady: boolean;
  operationalOwner: boolean;
  background: BackgroundSnapshot;
}>;

export class OH7B6CoreComposition {
  private readonly background: HeadlessBackgroundLifecycle;
  private readonly options: OH7B6CompositionOptions;
  private active = false;
  private closed = false;

  constructor(options: OH7B6CompositionOptions) {
    this.options = options;
    this.background = new HeadlessBackgroundLifecycle(
      options.adapters,
      options.hasOwnership,
    );
    if (options.mode === "passive" && options.adapters.length > 0) {
      throw new Error("Passive core must not register active background adapters");
    }
  }

  health(): OH7B6Health {
    const background = this.background.snapshot();
    const operationalOwner =
      this.active && !this.closed && this.options.hasOwnership();
    return Object.freeze({
      mode: this.options.mode,
      live: !this.closed,
      operationalCoreReady:
        this.options.mode === "isolated-test" &&
        operationalOwner &&
        background.lifecycle === "active",
      operationalOwner,
      background,
    });
  }

  async start(): Promise<void> {
    if (this.closed || this.active) throw new Error("Core already started or closed");
    if (this.options.mode !== "isolated-test") {
      // The production writer transition is not implemented by OH-7B6.
      throw new Error("Operational activation unavailable outside isolated tests");
    }
    if (!this.options.hasOwnership()) {
      throw new Error("Operational ownership not granted");
    }
    await this.background.start();
    this.active = true;
  }

  async dispatch(endpoint: "/internal/chat" | "/internal/session", request: Request): Promise<Response> {
    if (!this.health().operationalCoreReady) {
      return Response.json(
        { error: "core_not_ready" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (endpoint === "/internal/chat" && request.method !== "POST") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    if (endpoint === "/internal/session" && request.method !== "GET") {
      return Response.json({ error: "method_not_allowed" }, { status: 405 });
    }
    return endpoint === "/internal/chat"
      ? this.options.chat(request)
      : this.options.session(request);
  }

  async stop(): Promise<void> {
    if (this.closed) return;
    this.active = false;
    this.closed = true;
    await this.background.stop();
  }
}
