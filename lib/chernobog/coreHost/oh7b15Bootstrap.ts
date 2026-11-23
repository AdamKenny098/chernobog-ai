/**
 * OH-7B15: production-shaped bootstrap with externally injected authority.
 *
 * No live lease, systemd command, data import, or file write on module import.
 * Production launcher integration is a separate, explicitly gated step.
 */
import path from "node:path";
import type { JobHandlerMap } from "@chernobog/runtime";
import { OH7B13OwnershipGuard } from "./oh7b13OwnershipGuard";
import { OH7B14Jobs } from "./oh7b14Jobs";
import { createOH7B14PersonalAssistanceAdapters } from "./oh7b14PersonalAssistanceAdapters";
import { OH7B14Supervisor } from "./oh7b14Supervisor";

export interface OH7B15Authority {
  readonly guard: OH7B13OwnershipGuard;
  readonly paths: { readonly data: string };
  release(): void | Promise<void>;
}

export interface OH7B15BootOptions {
  readonly authority: OH7B15Authority;
  readonly port: number;
  readonly gatewaySecret: string;
  readonly handlers: JobHandlerMap;
  readonly chat: (request: Request) => Promise<Response>;
  readonly session: (request: Request) => Promise<Response>;
  readonly pa?: {
    initializePA?: () => Promise<void>;
    closePA?: () => Promise<void>;
    initializeAndroid?: () => Promise<void>;
  };
}

/** Throws before any service initializes if job handlers are not reviewed. */
export function verifyOH7B15HandlerRegistry(handlers: JobHandlerMap): void {
  if (!handlers || typeof handlers !== "object" || Array.isArray(handlers)) {
    throw new Error("OH7B15 explicit job-handler registry required");
  }
  for (const [kind, handler] of Object.entries(handlers)) {
    if (!kind.trim() || typeof handler !== "function") {
      throw new Error("OH7B15 invalid job-handler registry");
    }
  }
}

export function createOH7B15Bootstrap(options: OH7B15BootOptions): OH7B14Supervisor {
  if (!(options.authority?.guard instanceof OH7B13OwnershipGuard)) {
    throw new Error("OH7B15 requires externally acquired B13 authority");
  }
  if (typeof options.authority.release !== "function") {
    throw new Error("OH7B15 ownership release callback required");
  }
  const dataRoot = options.authority.paths?.data;
  if (!dataRoot || !path.isAbsolute(dataRoot) ||
      path.resolve(dataRoot) !== path.resolve(process.env.CHERNOBOG_DATA_DIR ?? "")) {
    throw new Error("OH7B15 data path does not match owned storage");
  }
  verifyOH7B15HandlerRegistry(options.handlers);
  options.authority.guard.assertOwned();
  let supervisor: OH7B14Supervisor | undefined;
  let earlyFatal: Error | undefined;
  const onFatal = (error: Error) => {
    if (supervisor) supervisor.onFatal(error);
    else earlyFatal = error;
  };
  // Constructors do not open databases or start background loops.
  const pa = createOH7B14PersonalAssistanceAdapters({
    dataRoot,
    assertOwned: () => options.authority.guard.assertOwned(),
    ...options.pa,
  });
  const jobs = new OH7B14Jobs({
    dataRoot,
    assertOwned: () => options.authority.guard.assertOwned(),
    handlers: options.handlers,
    onFatal,
  });
  supervisor = new OH7B14Supervisor({
    guard: options.authority.guard,
    adapters: [...pa, ...jobs.adapters],
    port: options.port,
    gatewaySecret: options.gatewaySecret,
    chat: options.chat,
    session: options.session,
    release: options.authority.release,
  });
  if (earlyFatal) supervisor.onFatal(earlyFatal);
  return supervisor;
}
