/**
 * OH-7B15 operational host entrypoint (NOT enabled by any service).
 *
 * Invoke only through an explicitly reviewed B15 cutover. This module has no
 * production import side effects before the fail-closed gate. The B12 lease
 * and legacy stopped+masked check remain authoritative at activation time.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPROVAL = "I_APPROVE_OH7B15_PRODUCTION_CUTOVER";

export interface OH7B15LaunchEnvironment {
  readonly CHERNOBOG_STORAGE_ROLE?: string;
  readonly CHERNOBOG_OH7B15_CUTOVER_APPROVAL?: string;
  readonly CHERNOBOG_DATA_DIR?: string;
  readonly CHERNOBOG_VAULT_PATH?: string;
  readonly CHERNOBOG_CORE_GATEWAY_SECRET?: string;
  readonly CHERNOBOG_CORE_PORT?: string;
  readonly CHERNOBOG_CORE_ROUTE_MODE?: string;
}

export function validateOH7B15LaunchEnvironment(env: OH7B15LaunchEnvironment): {
  readonly dataRoot: string;
  readonly port: number;
  readonly gatewaySecret: string;
} {
  if (env.CHERNOBOG_OH7B15_CUTOVER_APPROVAL !== APPROVAL) {
    throw new Error("OH7B15 explicit production cutover approval missing");
  }
  if (env.CHERNOBOG_STORAGE_ROLE !== "core") {
    throw new Error("OH7B15 refuses non-core storage role");
  }
  if (env.CHERNOBOG_CORE_ROUTE_MODE === "proxy") {
    throw new Error("OH7B15 refuses unresolved proxy routing during cutover");
  }
  const dataRoot = env.CHERNOBOG_DATA_DIR;
  if (!dataRoot || !path.isAbsolute(dataRoot) ||
      !env.CHERNOBOG_VAULT_PATH || !path.isAbsolute(env.CHERNOBOG_VAULT_PATH)) {
    throw new Error("OH7B15 requires absolute data and vault paths");
  }
  const gatewaySecret = env.CHERNOBOG_CORE_GATEWAY_SECRET ?? "";
  if (Buffer.byteLength(gatewaySecret, "utf8") < 32) {
    throw new Error("OH7B15 requires protected 32-byte gateway secret");
  }
  const rawPort = env.CHERNOBOG_CORE_PORT ?? "3191";
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isSafeInteger(port) ||
      port < 1024 || port > 65535) {
    throw new Error("OH7B15 invalid core port");
  }
  return { dataRoot, port, gatewaySecret };
}

export async function launchOH7B15ProductionHost(): Promise<void> {
  const config = validateOH7B15LaunchEnvironment(process.env);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

  // B12 must reject running/enabled legacy before any core writing authority
  // exists. Only then import the application handler graph.
  const { acquireOH7B13ProductionAuthority } =
    await import("./oh7b13ProductionAuthority");
  const authority = acquireOH7B13ProductionAuthority({
    root,
    env: process.env,
    explicitOptIn: true,
  });
  let supervisor: Awaited<ReturnType<typeof makeSupervisor>> | undefined;
  let stopping: Promise<void> | undefined;
  async function makeSupervisor() {
    // These app modules are deliberately loaded only AFTER authority.
    const { createOH7B15Bootstrap } = await import("./oh7b15Bootstrap");
    const { handleChatRequest } = await import("./chatService");
    const { handleSessionRequest } = await import("./sessionService");
    // No production job handlers have yet been audited. This registry can
    // run only when the accepted production job store has zero enabled kinds;
    // OH7B14Jobs checks every enabled job at startup and on each tick.
    return createOH7B15Bootstrap({
      authority,
      port: config.port,
      gatewaySecret: config.gatewaySecret,
      handlers: {},
      chat: handleChatRequest,
      session: handleSessionRequest,
    });
  }
  function shutdown() {
    if (stopping) return stopping;
    stopping = supervisor ? supervisor.stop() : Promise.resolve(authority.release());
    return stopping;
  }
  try {
    supervisor = await makeSupervisor();
    process.once("SIGTERM", () => { void shutdown().catch(error => { console.error(error); process.exitCode = 1; }); });
    process.once("SIGINT", () => { void shutdown().catch(error => { console.error(error); process.exitCode = 1; }); });
    await supervisor.start();
    console.log("OH7B15 operational host listening on loopback (lease owned)");
  } catch (error) {
    try { await shutdown(); } catch (cleanupError) {
      console.error("OH7B15 cleanup failed; operator intervention required", cleanupError);
    }
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  launchOH7B15ProductionHost().catch(error => {
    console.error("OH7B15 operational host startup refused", error);
    process.exitCode = 1;
  });
}
