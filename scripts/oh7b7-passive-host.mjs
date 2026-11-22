/**
 * OH-7B7: supervised, read-only headless core host.
 *
 * A safe systemd deployment checkpoint, NOT an operational production cutover.
 * No DB/service imports, no writer lease, no proxy switch and no job execution.
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectStorageBoundary } from "./oh7b2-storage-boundary.mjs";
import { inspectOH7B8ProductionPaths } from "./oh7b8-storage-preflight.mjs";

const HOST = "127.0.0.1";
const rawPort = process.env.CHERNOBOG_OH7B7_PORT ?? "3190";
const port = Number(rawPort);
if (!/^\d+$/.test(rawPort) || !Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  throw new Error("OH7B7 invalid port");
}
if (process.env.CHERNOBOG_CORE_ROUTE_MODE === "proxy") {
  throw new Error("OH7B7 passive host refuses legacy proxy mode");
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startedAt = new Date().toISOString();
let stopping = false;
const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  if (stopping) return json(res, 503, { ok: false, error: "shutting_down" });
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "method_not_allowed" });
  if (req.url === "/health/live") {
    return json(res, 200, { ok: true, status: "alive", version: "oh7b7.v1", startedAt });
  }
  if (req.url === "/health/ready") {
    const storage = inspectStorageBoundary(root);
    const productionPaths = inspectOH7B8ProductionPaths(root);
    return json(res, 503, {
      ok: false,
      version: "oh7b7.v1",
      status: "passive-precutover",
      operationalCoreReady: false,
      operationalOwner: false,
      services: {
        commandPipeline: "not-initialized",
        sessions: "not-initialized",
        eventSpine: "not-initialized",
        personalAssistance: "not-initialized",
        scheduler: "not-initialized",
        workers: "not-initialized",
      },
      productionPaths,
      storageBoundary: {
        mode: storage.mode,
        operationalOwner: storage.operationalOwner,
        storageInitialized: storage.storageInitialized,
        mainAndPaDatabaseAligned: storage.mainAndPaDatabaseAligned,
        exists: storage.exists,
        warnings: storage.warnings,
      },
      startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }
  return json(res, 404, { ok: false, error: "not_found" });
});

server.on("error", error => {
  console.error("[OH7B7] HTTP server error:", error);
  process.exitCode = 1;
});

server.listen(port, HOST, () => {
  console.log(`[OH7B7] Passive headless host on http://${HOST}:${port}`);
  console.log("[OH7B7] Operational core NOT ready; production ownership NOT granted");
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(error => {
      if (error) {
        console.error("[OH7B7] Shutdown failed", error);
        process.exitCode = 1;
      } else {
        console.log("[OH7B7] Stopped");
      }
    });
  });
}
