/** OH-7B4: dependency-injected lifecycle for accepted PA, scheduler and workers.
 * No live services are instantiated on import. Ownership is checked at each activation.
 */
export type BackgroundComponent = "personalAssistance" | "scheduler" | "workers" | "androidDelivery";
export type ComponentState = "inactive" | "starting" | "active" | "stopping" | "stopped" | "failed";
export interface BackgroundAdapter {
  readonly id: BackgroundComponent;
  start(): void | Promise<void>;
  stop(): void | Promise<void>;
}
export type BackgroundSnapshot = Readonly<{
  operationalOwner: boolean;
  lifecycle: "inactive" | "starting" | "active" | "stopping" | "stopped" | "failed";
  components: Readonly<Record<BackgroundComponent, ComponentState>>;
}>;
const ids: readonly BackgroundComponent[] = ["personalAssistance", "scheduler", "workers", "androidDelivery"];
function blank(): Record<BackgroundComponent, ComponentState> {
  return { personalAssistance: "inactive", scheduler: "inactive", workers: "inactive", androidDelivery: "inactive" };
}
export class HeadlessBackgroundLifecycle {
  private readonly states = blank();
  private phase: BackgroundSnapshot["lifecycle"] = "inactive";
  private started: BackgroundAdapter[] = [];
  private inFlight = false;
  constructor(private readonly adapters: readonly BackgroundAdapter[],
    private readonly hasOwnership: () => boolean) {
    if (new Set(adapters.map(a => a.id)).size !== adapters.length ||
      adapters.some(a => !ids.includes(a.id))) throw new Error("Duplicate or invalid background adapter");
  }
  snapshot(): BackgroundSnapshot {
    return Object.freeze({ operationalOwner: this.phase === "active", lifecycle: this.phase,
      components: Object.freeze({ ...this.states }) });
  }
  async start(): Promise<void> {
    if (this.inFlight || this.phase !== "inactive") throw new Error("Background lifecycle already started or transitioning");
    if (!this.hasOwnership()) throw new Error("Operational owner not granted");
    this.inFlight = true; this.phase = "starting";
    try {
      for (const adapter of this.adapters) {
        if (!this.hasOwnership()) throw new Error("Operational ownership lost");
        this.states[adapter.id] = "starting";
        await adapter.start();
        this.started.push(adapter);
        this.states[adapter.id] = "active";
      }
      this.phase = "active";
    } catch (error) {
      this.phase = "failed";
      await this.stopStarted();
      throw error;
    } finally { this.inFlight = false; }
  }
  private async stopStarted(): Promise<void> {
    for (const adapter of [...this.started].reverse()) {
      this.states[adapter.id] = "stopping";
      try { await adapter.stop(); this.states[adapter.id] = "stopped"; }
      catch { this.states[adapter.id] = "failed"; }
    }
    this.started = [];
  }
  async stop(): Promise<void> {
    if (this.inFlight) throw new Error("Background lifecycle is transitioning");
    if (this.phase === "stopped" || this.phase === "inactive") { this.phase = "stopped"; return; }
    this.inFlight = true; this.phase = "stopping";
    try { await this.stopStarted(); this.phase = Object.values(this.states).some(s => s === "failed") ? "failed" : "stopped"; }
    finally { this.inFlight = false; }
  }
}
