import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:net";
import { once } from "node:events";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { OH7B14ProductionComposition } from "../lib/chernobog/coreHost/oh7b14ProductionComposition";
import { createOH7B14Transport } from "../lib/chernobog/coreHost/oh7b14HttpTransport";

const secret = "b14-synthetic-local-test-gateway-secret-123456789";

async function availablePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("No TCP port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

test("B14 HTTP transport rejects missing production composition or gateway secret", () => {
  assert.throws(() => createOH7B14Transport({
    composition: {} as OH7B14ProductionComposition,
    gatewaySecret: secret,
    port: 3191,
  }), /externally owned composition/);
  const guard = new OH7B13OwnershipGuard({ assertStillOwned() {} });
  const composition = new OH7B14ProductionComposition({
    guard, adapters: [],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
  });
  assert.throws(() => createOH7B14Transport({
    composition, gatewaySecret: "short", port: 3191,
  }), /32 bytes/);
});

test("B14 operational-shaped HTTP serves only authenticated routes while owned, then 503", async () => {
  let owned = true;
  let calls = 0;
  let stopped = 0;
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() { if (!owned) throw new Error("legacy writer resumed"); },
  });
  const composition = new OH7B14ProductionComposition({
    guard,
    adapters: [{ id: "scheduler", start() {}, stop() { stopped++; } }],
    chat: async () => { calls++; return Response.json({ source: "injected-chat" }); },
    session: async () => Response.json({ source: "injected-session" }),
  });
  const port = await availablePort();
  const transport = createOH7B14Transport({
    composition, gatewaySecret: secret, port,
  });
  const base = `http://127.0.0.1:${port}`;
  const headers = { "x-chernobog-core-gateway": secret };
  try {
    await transport.listen();
    assert.equal((await fetch(base + "/health/live")).status, 200);
    assert.equal((await fetch(base + "/health/ready")).status, 503);
    assert.equal((await fetch(base + "/internal/session")).status, 401);
    await composition.start();
    assert.equal((await fetch(base + "/health/ready")).status, 200);
    assert.equal((await fetch(base + "/internal/session", { headers })).status, 200);
    assert.equal((await fetch(base + "/internal/chat", { method: "POST", headers, body: "{}" })).status, 200);
    assert.equal((await fetch(base + "/internal/chat", { headers })).status, 405);
    assert.equal((await fetch(base + "/internal/unknown", { headers })).status, 404);
    assert.equal(calls, 1);
    owned = false;
    assert.equal((await fetch(base + "/health/ready")).status, 503);
    assert.equal((await fetch(base + "/internal/chat", { method: "POST", headers, body: "{}" })).status, 503);
    owned = true;
    assert.equal((await fetch(base + "/health/ready")).status, 503);
    assert.equal(calls, 1);
  } finally {
    await transport.stop();
    await transport.stop();
  }
  assert.equal(stopped, 1);
});
