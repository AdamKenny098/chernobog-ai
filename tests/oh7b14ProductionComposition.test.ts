import assert from "node:assert/strict";
import { test } from "node:test";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";
import { OH7B14ProductionComposition } from "../lib/chernobog/coreHost/oh7b14ProductionComposition";

const request = new Request("http://127.0.0.1/internal/chat", { method: "POST" });

test("OH7B14 cannot start without external B13 guard", () => {
  assert.throws(
    () => new OH7B14ProductionComposition({
      guard: {} as OH7B13OwnershipGuard,
      adapters: [],
      chat: async () => Response.json({ ok: true }),
      session: async () => Response.json({ ok: true }),
    }),
    /externally granted B13/,
  );
});

test("OH7B14 core is unready before activation, ready while owned, and fenced after loss", async () => {
  let valid = true;
  const events: string[] = [];
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() {
      if (!valid) throw new Error("production owner revoked");
    },
  });
  const core = new OH7B14ProductionComposition({
    guard,
    adapters: [{
      id: "scheduler",
      start: () => { events.push("start"); },
      stop: () => { events.push("stop"); },
    }],
    chat: async () => { events.push("chat"); return Response.json({ ok: true }); },
    session: async () => Response.json({ ok: true }),
  });
  assert.equal(core.health().operationalCoreReady, false);
  assert.equal((await core.dispatch("/internal/chat", request)).status, 503);
  await core.start();
  assert.equal(core.health().operationalCoreReady, true);
  assert.equal((await core.dispatch("/internal/chat", request)).status, 200);
  valid = false;
  assert.equal(core.health().operationalCoreReady, false);
  assert.equal((await core.dispatch("/internal/chat", request)).status, 503);
  valid = true;
  assert.equal(core.health().operationalCoreReady, false, "revocation is irreversible");
  await core.stop();
  assert.deepEqual(events, ["start", "chat", "stop"]);
  assert.equal(core.health().operationalCoreReady, false);
});

test("OH7B14 denies activation when lease revokes during startup", async () => {
  let valid = true;
  const events: string[] = [];
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() { if (!valid) throw new Error("lease lost"); },
  });
  const core = new OH7B14ProductionComposition({
    guard,
    adapters: [{
      id: "workers",
      async start() { events.push("start"); valid = false; },
      async stop() { events.push("stop"); },
    }],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
  });
  await assert.rejects(core.start(), /lease lost|ownership/i);
  assert.deepEqual(events, ["start", "stop"]);
  assert.equal(core.health().operationalCoreReady, false);
  assert.equal((await core.dispatch("/internal/chat", request)).status, 503);
});

test("OH7B14 shutdown during adapter startup waits, cancels readiness, and stops once", async () => {
  let releaseStart: (() => void) | undefined;
  const waitForStart = new Promise<void>((resolve) => { releaseStart = resolve; });
  const events: string[] = [];
  const guard = new OH7B13OwnershipGuard({ assertStillOwned() {} });
  const core = new OH7B14ProductionComposition({
    guard,
    adapters: [{
      id: "personalAssistance",
      async start() {
        events.push("starting");
        await waitForStart;
        events.push("started");
      },
      async stop() { events.push("stopped"); },
    }],
    chat: async () => Response.json({ ok: true }),
    session: async () => Response.json({ ok: true }),
  });
  const starting = core.start();
  assert.equal(core.health().lifecycle, "starting");
  const stopping = core.stop();
  assert.equal(core.health().operationalCoreReady, false);
  assert.equal((await core.dispatch("/internal/chat", request)).status, 503);
  releaseStart?.();
  await assert.rejects(starting, /startup cancelled/);
  await stopping;
  await core.stop();
  assert.deepEqual(events, ["starting", "started", "stopped"]);
  assert.equal(core.health().lifecycle, "stopped");
  assert.equal(core.health().operationalCoreReady, false);
});
