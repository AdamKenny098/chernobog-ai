import http from "node:http";
import { inspectStorageBoundary } from "./oh7b2-storage-boundary.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const VERSION = "oh7b1.v1";
const HOST = "127.0.0.1";
const rawPort = process.env.CHERNOBOG_CORE_PORT ?? "3187";
const PORT = Number(rawPort);

if (!/^\d+$/.test(rawPort) || !Number.isInteger(PORT) ||
    PORT < 1024 || PORT > 65535) {
  console.error("Invalid CHERNOBOG_CORE_PORT");
  process.exit(1);
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function directoryStatus(variable, fallback) {
  const configured = process.env[variable]?.trim();
  const resolved = path.resolve(configured || fallback);

  return {
    configured: Boolean(configured),
    exists: existsSync(resolved),
  };
}

const startedAt = new Date().toISOString();

function health() {
  return {
    ok: true,
    version: VERSION,
    status: "bootstrap-only",
    bootstrapReady: true,
    operationalCoreReady: false,
    services: {
      commandPipeline: "not-initialized",
      sessions: "not-initialized",
      eventSpine: "not-initialized",
      personalAssistance: "not-initialized",
      scheduler: "not-initialized",
      workers: "not-initialized",
    },
    paths: {
      data: directoryStatus(
        "CHERNOBOG_DATA_DIR",
        path.join(repositoryRoot, "data"),
      ),
      vault: directoryStatus(
        "CHERNOBOG_VAULT_PATH",
        path.join(repositoryRoot, "vault", "chernobog"),
      ),
    },
    startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    storageBoundary: inspectStorageBoundary(repositoryRoot),
  };
}

const server = http.createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");

  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  if (request.url === "/health/live") {
    response.writeHead(200);
    response.end(JSON.stringify({
      ok: true,
      version: VERSION,
      status: "alive",
    }));
    return;
  }

  if (request.url === "/health/ready") {
    response.writeHead(200);
    response.end(JSON.stringify(health()));
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ ok: false, error: "not_found" }));
});

server.on("error", (error) => {
  console.error("Core bootstrap failed:", error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`CHERNOBOG CORE ${VERSION}`);
  console.log(`Bootstrap ready: http://${HOST}:${PORT}/health/ready`);
  console.log("Operational services are NOT initialized.");
});

let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;

  console.log(`Shutdown requested: ${signal}`);

  server.close((error) => {
    if (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
    console.log("Headless bootstrap stopped.");
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
