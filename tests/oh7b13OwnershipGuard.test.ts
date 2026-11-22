import assert from "node:assert/strict";
import { test } from "node:test";
import { OH7B6CoreComposition } from "../lib/chernobog/coreHost/oh7b6Composition";
import { OH7B13OwnershipGuard } from "../lib/chernobog/coreHost/oh7b13OwnershipGuard";

test("OH7B13 guarded requests require a valid ownership lease", async () => {
  let valid = true;
  let calls = 0;
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() {
      if (!valid) throw new Error("legacy writer returned");
    },
  });
  const handler = guard.guardRequest(async () => {
    calls++;
    return Response.json({ ok: true });
  });
  const request = new Request("http://localhost/internal/chat", { method: "POST" });
  assert.equal((await handler(request)).status, 200);
  valid = false;
  const rejected = await handler(request);
  assert.equal(rejected.status, 503);
  assert.deepEqual(await rejected.json(), { error: "core_ownership_lost" });
  valid = true;
  assert.equal((await handler(request)).status, 503);
  assert.equal(calls, 1);
});

test("OH7B13 refuses background ticks after ownership changes", () => {
  let valid = true;
  let ticks = 0;
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() {
      if (!valid) throw new Error("lease missing");
    },
  });
  const tick = guard.guardTick(() => ++ticks);
  assert.equal(tick(), 1);
  valid = false;
  assert.throws(() => tick(), /lease missing/);
  valid = true;
  assert.throws(() => tick(), /ownership revoked/);
  assert.equal(ticks, 1);
});

test("OH7B13 is consumable by existing isolated composition without production activation", async () => {
  let valid = true;
  const events: string[] = [];
  const guard = new OH7B13OwnershipGuard({
    assertStillOwned() {
      if (!valid) throw new Error("legacy state invalid");
    },
  });
  const core = new OH7B6CoreComposition({
    mode: "isolated-test",
    hasOwnership: guard.hasOwnership,
    adapters: [{
      id: "scheduler",
      start: () => { events.push("start"); },
      stop: () => { events.push("stop"); },
    }],
    chat: guard.guardRequest(async () => {
      events.push("chat");
      return Response.json({ ok: true });
    }),
    session: guard.guardRequest(async () => Response.json({ ok: true })),
  });
  await core.start();
  const input = new Request("http://localhost/internal/chat", { method: "POST" });
  assert.equal((await core.dispatch("/internal/chat", input)).status, 200);
  valid = false;
  assert.equal((await core.dispatch("/internal/chat", input)).status, 503);
  assert.deepEqual(events, ["start", "chat"]);
  await core.stop();
  assert.deepEqual(events, ["start", "chat", "stop"]);
});
