#!/usr/bin/env node
/**
 * OH-7B14 candidate host bootstrap. Deliberately non-operational.
 *
 * The production composition is validated separately, but this host NEVER
 * imports it, opens SQLite, acquires a lease, runs jobs or exposes chat.
 * B15 must replace this entrypoint after proving production writer exclusion.
 */
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { inspectOH7B14Deployment } from "./oh7b14-deployment-preflight.mjs";

const HOST = "127.0.0.1";
const portRaw = process.env.CHERNOBOG_OH7B14_PORT ?? "3191";
const port = Number(portRaw);
if (!/^\d+$/.test(portRaw) || !Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  throw new Error("OH7B14 invalid candidate port");
}
if (process.env.CHERNOBOG_STORAGE_ROLE === "core" ||
    process.env.CHERNOBOG_CORE_ROUTE_MODE === "proxy" ||
    process.env.CHERNOBOG_OH7B14_ACTIVATE === "1") {
  throw new Error("OH7B14 candidate host refuses operational activation");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let shuttingDown = false;
function json(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}
const server = http.createServer((req, res) => {
  if (shuttingDown) return json(res, 503, { ok: false, error: "shutting_down" });
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "method_not_allowed" });
  if (req.url === "/health/live") {
    return json(res, 200, {
      ok: true, mode: "oh7b14-candidate", operationalOwner: false,
      operationalCoreReady: false,
    });
  }
  if (req.url === "/health/ready") {
    try {
      const result = inspectOH7B14Deployment({ root });
      return json(res, 503, {
        ok: false, mode: "oh7b14-candidate", operationalOwner: false,
        operationalCoreReady: false, activationAuthorized: false,
        blockers: result.blockers, preflightBlockers: result.preflightBlockers,
      });
    } catch {
      return json(res, 503, { ok: false, error: "preflight_unavailable", operationalCoreReady: false });
    }
  }
  return json(res, 404, { ok: false, error: "not_found" });
});
server.on("error", (error) => {
  console.error("OH7B14 candidate listener failed", error);
  process.exitCode = 1;
});
server.listen(port, HOST, () => {
  console.log(`OH7B14 candidate alive on http://${HOST}:${port}; production activation denied`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close((error) => {
      if (error) process.exitCode = 1;
    });
  });
}
