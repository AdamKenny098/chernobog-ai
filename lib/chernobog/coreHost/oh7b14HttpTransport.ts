/**
 * OH-7B14: loopback-only HTTP transport for an externally owned core.
 *
 * The transport never obtains production ownership or imports storage.
 * Instantiate only after a caller supplies an OH7B14ProductionComposition.
 * No entrypoint or systemd unit uses this transport in B14.
 */
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { AddressInfo } from "node:net";
import { OH7B14ProductionComposition, type ProductionEndpoint } from "./oh7b14ProductionComposition";

const MAX_BYTES = 128 * 1024;
const HOST = "127.0.0.1";

function reply(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function authorized(header: string | string[] | undefined, secret: Buffer): boolean {
  if (typeof header !== "string") return false;
  const received = Buffer.from(header, "utf8");
  return received.length === secret.length && timingSafeEqual(received, secret);
}

async function decodeRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const buffers: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > MAX_BYTES) throw new Error("OH7B14_PAYLOAD_TOO_LARGE");
    buffers.push(buffer);
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === "x-chernobog-core-gateway") continue;
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }
  const method = req.method ?? "GET";
  return new Request(url, {
    method,
    headers,
    ...(method === "POST" ? { body: Buffer.concat(buffers).toString("utf8") } : {}),
  });
}

export interface OH7B14TransportOptions {
  readonly composition: OH7B14ProductionComposition;
  readonly gatewaySecret: string;
  readonly port: number;
}

export function createOH7B14Transport(options: OH7B14TransportOptions) {
  if (!(options.composition instanceof OH7B14ProductionComposition)) {
    throw new Error("OH7B14 transport requires an externally owned composition");
  }
  if (Buffer.byteLength(options.gatewaySecret, "utf8") < 32) {
    throw new Error("OH7B14 gateway secret must be at least 32 bytes");
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error("OH7B14 invalid port");
  }
  const secret = Buffer.from(options.gatewaySecret, "utf8");
  let closing = false;
  let stopTask: Promise<void> | undefined;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (closing) return reply(res, 503, { error: "core_shutting_down" });
    try {
      const url = new URL(req.url ?? "/", `http://${HOST}:${options.port}`);
      if (url.pathname === "/health/live" && req.method === "GET") {
        return reply(res, 200, { ok: true, mode: "production-candidate" });
      }
      if (url.pathname === "/health/ready" && req.method === "GET") {
        const health = options.composition.health();
        return reply(res, health.operationalCoreReady ? 200 : 503, {
          ok: health.operationalCoreReady,
          operationalOwner: health.operationalOwner,
          operationalCoreReady: health.operationalCoreReady,
          lifecycle: health.lifecycle,
        });
      }
      if (!authorized(req.headers["x-chernobog-core-gateway"], secret)) {
        return reply(res, 401, { error: "unauthorized" });
      }
      if (url.pathname !== "/internal/chat" && url.pathname !== "/internal/session") {
        return reply(res, 404, { error: "not_found" });
      }
      if (url.pathname === "/internal/chat" && req.method !== "POST" ||
          url.pathname === "/internal/session" && req.method !== "GET") {
        return reply(res, 405, { error: "method_not_allowed" });
      }
      // Important: deny before reading a body if ownership has disappeared.
      if (!options.composition.health().operationalCoreReady) {
        return reply(res, 503, { error: "core_not_ready" });
      }
      const request = await decodeRequest(req, url);
      const response = await options.composition.dispatch(url.pathname as ProductionEndpoint, request);
      if (res.destroyed) return;
      res.writeHead(response.status, {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      });
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (error instanceof Error && error.message === "OH7B14_PAYLOAD_TOO_LARGE") {
        return reply(res, 413, { error: "payload_too_large" });
      }
      return reply(res, 503, { error: "core_request_failed" });
    }
  });
  return Object.freeze({
    async listen(): Promise<number> {
      if (closing || server.listening) throw new Error("OH7B14 transport already started or closing");
      return new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port, HOST, () => {
          server.off("error", reject);
          const address = server.address() as AddressInfo;
          resolve(address.port);
        });
      });
    },
    stop(): Promise<void> {
      if (stopTask) return stopTask;
      closing = true;
      stopTask = (async () => {
        // Deny new core dispatch immediately, then await in-flight HTTP before
        // tearing down adapters and revoking externally held lease.
        if (server.listening) {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
            server.closeIdleConnections();
          });
        }
        await options.composition.stop();
      })();
      return stopTask;
    },
  });
}
