/**
 * OH-7B14 supervised host assembly, with ownership supplied externally.
 *
 * Construction does no I/O. This is not a runnable production entrypoint;
 * no service or lease is installed/acquired here. Caller must supply an
 * independently validated B13 authority and explicit handlers/adapters.
 */
import { OH7B13OwnershipGuard } from "./oh7b13OwnershipGuard";
import { OH7B14ProductionComposition } from "./oh7b14ProductionComposition";
import { createOH7B14Transport } from "./oh7b14HttpTransport";
import type { BackgroundAdapter } from "./backgroundLifecycle";

export interface OH7B14SupervisorOptions {
  readonly guard: OH7B13OwnershipGuard;
  readonly adapters: readonly BackgroundAdapter[];
  readonly gatewaySecret: string;
  readonly port: number;
  readonly chat: (request: Request) => Promise<Response>;
  readonly session: (request: Request) => Promise<Response>;
  /** Revokes the externally supplied authority only after background work stops. */
  readonly release: () => void | Promise<void>;
}

export class OH7B14Supervisor {
  readonly composition: OH7B14ProductionComposition;
  private readonly transport: ReturnType<typeof createOH7B14Transport>;
  private readonly release: OH7B14SupervisorOptions["release"];
  private state: "new" | "starting" | "running" | "stopping" | "stopped" = "new";
  private startupTask: Promise<void> | undefined;
  private shutdownTask: Promise<void> | undefined;
  private released = false;

  constructor(options: OH7B14SupervisorOptions) {
    if (!(options.guard instanceof OH7B13OwnershipGuard)) {
      throw new Error("OH7B14 supervisor requires externally acquired ownership");
    }
    if (typeof options.release !== "function") {
      throw new Error("OH7B14 supervisor requires ownership release callback");
    }
    this.composition = new OH7B14ProductionComposition({
      guard: options.guard,
      adapters: options.adapters,
      chat: options.chat,
      session: options.session,
    });
    this.transport = createOH7B14Transport({
      composition: this.composition,
      gatewaySecret: options.gatewaySecret,
      port: options.port,
    });
    this.release = options.release;
  }

  get phase(): string { return this.state; }

  start(): Promise<void> {
    if (this.state !== "new") {
      return Promise.reject(new Error("OH7B14 supervisor cannot restart"));
    }
    this.state = "starting";
    this.startupTask = (async () => {
      try {
        // No HTTP listener until all externally supplied adapters have started.
        await this.composition.start();
        if (this.state !== "starting") throw new Error("OH7B14 supervised startup cancelled");
        await this.transport.listen();
        if (this.state !== "starting") throw new Error("OH7B14 supervised startup cancelled");
        this.state = "running";
      } catch (error) {
        // Avoid awaiting shutdown here: shutdown itself waits for startup.
        void this.stop().catch(() => {});
        throw error;
      }
    })();
    return this.startupTask;
  }

  /**
   * May be passed directly to OH7B14Jobs.onFatal.
   * Refuses future dispatch synchronously by changing composition state.
   */
  onFatal = (_error: Error): void => {
    void this.stop().catch(() => {
      // A real systemd entrypoint must treat this as process-fatal; B14 has none.
    });
  };

  stop(): Promise<void> {
    if (this.shutdownTask) return this.shutdownTask;
    if (this.state === "stopped") return Promise.resolve();
    this.state = "stopping";
    this.shutdownTask = (async () => {
      let failure: unknown;
      // Composition.stop synchronously denies new dispatch and safely waits
      // for adapters still starting. Startup may still be binding its port,
      // so drain it before closing the transport.
      const coreStop = this.composition.stop();
      await this.startupTask?.catch(() => {});
      try { await this.transport.stop(); } catch (error) { failure = error; }
      try { await coreStop; } catch (error) { failure ??= error; }
      // Do not release storage authority if background cleanup failed: the
      // supervisor must terminate instead, preserving fail-closed ownership.
      if (!failure && !this.released) {
        this.released = true;
        try { await this.release(); } catch (error) { failure = error; }
      }
      this.state = "stopped";
      if (failure) throw failure;
    })();
    return this.shutdownTask;
  }
}
