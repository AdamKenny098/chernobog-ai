/**
 * OH-7B: Narrow internal HTTP transport for future exclusive-core cutover.
 * Defaults OFF. No import of SQLite-backed application services.
 * Does not authorize production cutover by itself.
 */
export function isCoreProxyRequested(): boolean {
  return process.env.CHERNOBOG_CORE_ROUTE_MODE === "proxy";
}

export async function forwardCoreRequest(
  request: Request,
  endpoint: "/internal/chat" | "/internal/session",
): Promise<Response> {
  const secret = process.env.CHERNOBOG_CORE_GATEWAY_SECRET ?? "";
  if (secret.length < 32) {
    return Response.json({ error: "core_gateway_unconfigured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const portRaw = process.env.CHERNOBOG_CORE_PORT ?? "3188";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return Response.json({ error: "core_gateway_invalid_port" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  headers.set("x-chernobog-core-gateway", secret);
  if (request.method === "POST") {
    headers.set("content-type", "application/json");
  }
  const incoming = new URL(request.url);
  const target = `http://127.0.0.1:${port}${endpoint}${endpoint === "/internal/session" ? incoming.search : ""}`;
  try {
    const reply = await fetch(target, {
      method: request.method,
      headers,
      ...(request.method === "POST" ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    const outputHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": reply.headers.get("content-type") ?? "application/json",
    });
    return new Response(await reply.arrayBuffer(), { status: reply.status, headers: outputHeaders });
  } catch {
    // Fail closed: never silently run a second local authority.
    return Response.json({ error: "core_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

/**
 * Mobile transport must preserve the ORIGINAL device bearer authorization.
 * The internal gateway secret authenticates Next.js to the core only; it is
 * never accepted as replacement phone authentication by mobile handlers.
 * This is opt-in. Other mobile routes still require an owner handoff.
 */
export async function forwardMobileCoreRequest(
  request: Request,
  endpoint: "/internal/mobile/heartbeat" | "/internal/mobile/reminders/claim" | "/internal/mobile/reminders/authorize" | "/internal/mobile/reminders/ack",
): Promise<Response> {
  const secret = process.env.CHERNOBOG_CORE_GATEWAY_SECRET ?? "";
  const port = Number(process.env.CHERNOBOG_CORE_PORT ?? "3188");
  if (secret.length < 32 || !Number.isInteger(port) || port < 1024 || port > 65535) {
    return Response.json({ ok: false, error: "core_gateway_unconfigured" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (endpoint.startsWith("/internal/mobile/reminders/") && request.method !== "POST") {
    return Response.json({ ok: false, error: "method_not_allowed" },
      { status: 405, headers: { "Cache-Control": "no-store" } });
  }
  if (endpoint === "/internal/mobile/heartbeat" && request.method !== "POST" && request.method !== "GET") {
    return Response.json({ ok: false, error: "method_not_allowed" },
      { status: 405, headers: { "Cache-Control": "no-store" } });
  }
  const headers = new Headers();
  // Pass through the phone credential; NEVER use the internal secret as a phone token.
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  headers.set("x-chernobog-core-gateway", secret);
  if (request.method === "POST") headers.set("content-type", "application/json");
  const url = new URL(request.url);
  const target = `http://127.0.0.1:${port}${endpoint}${endpoint === "/internal/mobile/heartbeat" ? url.search : ""}`;
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      ...(request.method === "POST" ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    // Never fall back to a second local writer when the headless core is unavailable.
    return Response.json({ ok: false, error: "core_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
