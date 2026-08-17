import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ChernobogEventBus } from "../lib/chernobog/events/eventBus";
import { JsonlChernobogEventStore } from "../lib/chernobog/events/store";

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "chernobog-event-spine-"));
  const eventFile = join(root, "events.jsonl");

  try {
    const bus = new ChernobogEventBus({
      store: new JsonlChernobogEventStore(eventFile),
      dedupeWindowMs: 60_000,
    });

    const observed: string[] = [];
    const unsubscribe = bus.subscribe(
      { typePrefixes: ["project."] },
      async (event) => {
        observed.push(event.type);
      },
    );

    const first = await bus.publish({
      type: "project.test_failed",
      source: { subsystem: "verification", nodeId: "desktop-dev" },
      severity: "warning",
      subject: "questledger",
      scope: "project:questledger",
      dedupeKey: "questledger:test_failed",
      payload: { command: "npm test", exitCode: 1 },
      metadata: { confidence: 1, tags: ["project", "test"] },
    });

    assert.equal(first.deduplicated, false);
    assert.equal(first.delivered, 1);
    assert.deepEqual(observed, ["project.test_failed"]);
    console.log("PASS canonical project event publishes to matching subscriber");

    const duplicate = await bus.publish({
      type: "project.test_failed",
      source: { subsystem: "verification", nodeId: "desktop-dev" },
      severity: "warning",
      subject: "questledger",
      scope: "project:questledger",
      dedupeKey: "questledger:test_failed",
      payload: { command: "npm test", exitCode: 1 },
    });

    assert.equal(duplicate.deduplicated, true);
    assert.equal(duplicate.delivered, 0);
    assert.equal(observed.length, 1);
    console.log("PASS duplicate event is suppressed inside dedupe window");

    const recovered = await bus.publish({
      type: "service.recovered",
      source: { subsystem: "verification", nodeId: "homelab" },
      severity: "notice",
      subject: "chernobog",
      payload: { health: "ok" },
    });

    assert.equal(recovered.delivered, 0);
    console.log("PASS subscription filters prevent unrelated delivery");

    const persisted = await bus.query({ limit: 10 });
    assert.equal(persisted.length, 2);
    assert.equal(persisted[0]?.type, "project.test_failed");
    assert.equal(persisted[1]?.type, "service.recovered");
    console.log("PASS non-duplicate events persist to JSONL history");

    const warnings = await bus.query({ severities: ["warning"] });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]?.type, "project.test_failed");
    console.log("PASS event history supports metadata filtering");

    unsubscribe();
    const afterUnsubscribe = await bus.publish({
      type: "project.build_completed",
      source: { subsystem: "verification" },
      severity: "info",
      subject: "questledger",
      payload: { build: "ok" },
    });
    assert.equal(afterUnsubscribe.delivered, 0);
    console.log("PASS subscribers can detach cleanly");

    await assert.rejects(
      () =>
        bus.publish({
          type: "Invalid Event Name",
          source: { subsystem: "verification" },
          payload: {},
        }),
      /lowercase namespaced identifier/,
    );
    console.log("PASS malformed event types are rejected");

    console.log("\nChernobog Phase 11F-A event spine verification passed.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
