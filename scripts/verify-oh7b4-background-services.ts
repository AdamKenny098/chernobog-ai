import assert from "node:assert/strict";
import { HeadlessBackgroundLifecycle, type BackgroundAdapter } from "../lib/chernobog/coreHost/backgroundLifecycle";
function pass(s: string): void { console.log(`PASS ${s}`); }
async function main(): Promise<void> {
  let owner = false;
  const events: string[] = [];
  const adapters: BackgroundAdapter[] = (["personalAssistance", "scheduler", "workers", "androidDelivery"] as const)
    .map(id => ({ id, start: () => { events.push(`start:${id}`); }, stop: () => { events.push(`stop:${id}`); } }));
  const lifecycle = new HeadlessBackgroundLifecycle(adapters, () => owner);
  assert.equal(lifecycle.snapshot().operationalOwner, false);
  await assert.rejects(() => lifecycle.start(), /not granted/);
  assert.deepEqual(events, []);
  pass("passive mode cannot start PA, Android or worker services");
  owner = true;
  await lifecycle.start();
  assert.equal(lifecycle.snapshot().operationalOwner, true);
  await assert.rejects(() => lifecycle.start(), /already started/);
  await lifecycle.stop();
  assert.equal(lifecycle.snapshot().operationalOwner, false);
  assert.deepEqual(events, [...adapters.map(a => `start:${a.id}`), ...[...adapters].reverse().map(a => `stop:${a.id}`)]);
  pass("single startup, no duplicate activation, reverse-order shutdown");
  const unwind: string[] = [];
  const failure = new HeadlessBackgroundLifecycle([
    { id: "personalAssistance", start: () => { unwind.push("start-pa"); }, stop: () => { unwind.push("stop-pa"); } },
    { id: "scheduler", start: () => { throw new Error("fixture failure"); }, stop: () => { unwind.push("stop-scheduler"); } },
  ], () => true);
  await assert.rejects(() => failure.start(), /fixture failure/);
  assert.deepEqual(unwind, ["start-pa", "stop-pa"]);
  assert.equal(failure.snapshot().operationalOwner, false);
  pass("startup failure unwinds previously activated components");
  let allow = true;
  const lostActions: string[] = [];
  const lost = new HeadlessBackgroundLifecycle([
    { id: "personalAssistance", start: () => { lostActions.push("start-pa"); allow = false; }, stop: () => { lostActions.push("stop-pa"); } },
    { id: "workers", start: () => { lostActions.push("start-workers"); }, stop: () => { lostActions.push("stop-workers"); } },
  ], () => allow);
  await assert.rejects(() => lost.start(), /ownership lost/);
  assert.deepEqual(lostActions, ["start-pa", "stop-pa"]);
  pass("ownership loss blocks the next service and triggers cleanup");
  assert.throws(() => new HeadlessBackgroundLifecycle([adapters[0], adapters[0]], () => true), /Duplicate/);
  pass("duplicate adapter registration rejected");
  console.log("OH-7B4 BACKGROUND SERVICES LIFECYCLE: PASS (fixtures only)");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
