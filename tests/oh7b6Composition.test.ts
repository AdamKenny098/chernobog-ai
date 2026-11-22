import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OH7B6CoreComposition,
  type CoreRequestHandler,
} from "../lib/chernobog/coreHost/oh7b6Composition";
import type { BackgroundAdapter } from "../lib/chernobog/coreHost/backgroundLifecycle";

function fixture(owner: () => boolean, events: string[]) {
  const adapters: BackgroundAdapter[] = (["personalAssistance", "scheduler", "workers", "androidDelivery"] as const)
    .map(id => ({
      id,
      start: () => { events.push(`start:${id}`); },
      stop: () => { events.push(`stop:${id}`); },
    }));
  const chat: CoreRequestHandler = async () => {
    events.push("chat");
    return Response.json({ ok: true });
  };
  const session: CoreRequestHandler = async () => {
    events.push("session");
    return Response.json({ ok: true });
  };
  return { adapters, chat, session, hasOwnership: owner };
}

test("OH7B6 passive mode refuses background adapters and activation", async () => {
  const events: string[] = [];
  const f = fixture(() => true, events);
  assert.throws(() => new OH7B6CoreComposition({ ...f, mode: "passive" }), /Passive core/);
  const core = new OH7B6CoreComposition({ ...f, adapters: [], mode: "passive" });
  assert.equal(core.health().operationalCoreReady, false);
  await assert.rejects(() => core.start(), /unavailable outside isolated tests/);
  const response = await core.dispatch("/internal/chat", new Request("http://localhost/internal/chat", { method: "POST" }));
  assert.equal(response.status, 503);
  assert.deepEqual(events, []);
  await core.stop();
});

test("OH7B6 isolated test requires ownership and starts once", async () => {
  let owned = false;
  const events: string[] = [];
  const core = new OH7B6CoreComposition({ ...fixture(() => owned, events), mode: "isolated-test" });
  await assert.rejects(() => core.start(), /not granted/);
  assert.equal(events.length, 0);
  owned = true;
  await core.start();
  assert.equal(core.health().operationalCoreReady, true);
  await assert.rejects(() => core.start(), /already started/);
  assert.deepEqual(events, [
    "start:personalAssistance", "start:scheduler", "start:workers", "start:androidDelivery",
  ]);
  await core.stop();
  assert.equal(core.health().operationalCoreReady, false);
  assert.deepEqual(events.slice(4), [
    "stop:androidDelivery", "stop:workers", "stop:scheduler", "stop:personalAssistance",
  ]);
});

test("OH7B6 dispatch denies calls after ownership loss", async () => {
  let owned = true;
  const events: string[] = [];
  const core = new OH7B6CoreComposition({ ...fixture(() => owned, events), mode: "isolated-test" });
  await core.start();
  const valid = await core.dispatch("/internal/chat", new Request("http://localhost/internal/chat", { method: "POST" }));
  assert.equal(valid.status, 200);
  assert.equal(events.at(-1), "chat");
  const invalidMethod = await core.dispatch("/internal/session", new Request("http://localhost/internal/session", { method: "POST" }));
  assert.equal(invalidMethod.status, 405);
  owned = false;
  assert.equal(core.health().operationalCoreReady, false);
  const rejected = await core.dispatch("/internal/session", new Request("http://localhost/internal/session"));
  assert.equal(rejected.status, 503);
  assert.equal(events.filter(x => x === "session").length, 0);
  await core.stop();
});

test("OH7B6 startup failure unwinds active adapters", async () => {
  const events: string[] = [];
  const core = new OH7B6CoreComposition({
    ...fixture(() => true, events),
    adapters: [
      { id: "scheduler", start: () => { events.push("start:scheduler"); }, stop: () => { events.push("stop:scheduler"); } },
      { id: "workers", start: () => { throw new Error("fixture startup failure"); }, stop: () => { events.push("stop:workers"); } },
    ],
    mode: "isolated-test",
  });
  await assert.rejects(() => core.start(), /fixture startup failure/);
  assert.equal(core.health().operationalCoreReady, false);
  assert.deepEqual(events, ["start:scheduler", "stop:scheduler"]);
  await core.stop();
});
