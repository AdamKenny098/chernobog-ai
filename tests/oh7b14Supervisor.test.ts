import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:net";
import { once } from "node:events";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { OH7B14Supervisor } from "../lib/chernobog/coreHost/oh7b14Supervisor";

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

const secret = "oh7b14-supervisor-synthetic-gateway-secret-1234";

test("OH7B14 supervisor starts owned handlers and releases after shutdown", async () => {
  const port = await freePort();
  const events: string[] = [];
  const guard = new OH7B13OwnershipGuard({ assertStillOwned() {} });
  const supervisor = new OH7B14Supervisor({
    guard, port, gatewaySecret: secret,
    adapters: [{
      id: "personalAssistance",
      start() { events.push("start"); },
      stop() { events.push("stop"); },
    }],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
    release() { events.push("release"); },
  });
  try {
    await supervisor.start();
    assert.equal(supervisor.phase, "running");
    const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
    assert.equal(response.status, 200);
  } finally {
    await supervisor.stop();
  }
  await supervisor.stop();
  assert.deepEqual(events, ["start", "stop", "release"]);
  assert.equal(supervisor.phase, "stopped");
});

test("OH7B14 supervisor refuses ownership and releases without binding", async () => {
  const port = await freePort();
  let releases = 0;
  const supervisor = new OH7B14Supervisor({
    guard: new OH7B13OwnershipGuard({
      assertStillOwned() { throw new Error("legacy writer active"); },
    }),
    port, gatewaySecret: secret,
    adapters: [],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
    release() { releases++; },
  });
  await assert.rejects(supervisor.start(), /legacy writer active/);
  await supervisor.stop();
  assert.equal(releases, 1);
  assert.equal(supervisor.phase, "stopped");
  await assert.rejects(fetch(`http://127.0.0.1:${port}/health/live`));
});

test("OH7B14 supervisor serializes stop requested during async startup", async () => {
  const port = await freePort();
  let unblock: (() => void) | undefined;
  const barrier = new Promise<void>(resolve => { unblock = resolve; });
  const events: string[] = [];
  const supervisor = new OH7B14Supervisor({
    guard: new OH7B13OwnershipGuard({ assertStillOwned() {} }),
    port, gatewaySecret: secret,
    adapters: [{
      id: "scheduler",
      async start() { events.push("start"); await barrier; },
      stop() { events.push("stop"); },
    }],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
    release() { events.push("release"); },
  });
  const starting = supervisor.start();
  assert.equal(supervisor.phase, "starting");
  const stopping = supervisor.stop();
  unblock?.();
  await assert.rejects(starting, /cancelled/);
  await stopping;
  assert.deepEqual(events, ["start", "stop", "release"]);
});

test("OH7B14 supervisor fatal callback stops core and releases authority", async () => {
  const port = await freePort();
  const events: string[] = [];
  const supervisor = new OH7B14Supervisor({
    guard: new OH7B13OwnershipGuard({ assertStillOwned() {} }),
    port, gatewaySecret: secret,
    adapters: [{
      id: "workers",
      start() { events.push("start"); },
      stop() { events.push("stop"); },
    }],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
    release() { events.push("release"); },
  });
  await supervisor.start();
  supervisor.onFatal(new Error("synthetic job failure"));
  await supervisor.stop();
  assert.deepEqual(events, ["start", "stop", "release"]);
  assert.equal(supervisor.phase, "stopped");
});
