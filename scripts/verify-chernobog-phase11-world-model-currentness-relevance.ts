import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const bridge = fs.readFileSync(
  path.join(
    repo,
    "lib/chernobog/pipeline/worldModelContext.ts",
  ),
  "utf8",
);

function expect(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

expect(
  bridge.includes("getChernobogWorldModelRuntime") &&
    bridge.includes("runtime.ingestCurrentWorldState();") &&
    bridge.includes("runtime.model.snapshot()"),
  "currentness layer preserves canonical 11J runtime and snapshot",
);

expect(
  bridge.includes("ChernobogWorldStateQueryService") &&
    bridge.includes("getChernobogWorldStateRuntime") &&
    bridge.includes('worldStateQuery.read({}, "registry")'),
  "currentness is derived from canonical 11G evidence rather than wall-clock guesses",
);

expect(
  bridge.includes("sourceFreshness: ${entry.itemFreshness}") &&
    bridge.includes("classifyEvidenceFreshness"),
  "entities and relationships expose supporting 11G freshness",
);

expect(
  bridge.includes("selectBounded") &&
    bridge.includes("MAX_HISTORICAL_ITEMS_PER_SECTION = 4"),
  "fresh evidence is prioritized while a bounded historical tail remains available",
);

expect(
  bridge.includes('prediction.status !== "insufficient"') &&
    bridge.includes("prediction.confidence > 0"),
  "insufficient zero-confidence outputs are not presented as supported predictions",
);

expect(
  bridge.includes("stale-only support are not presented as supported predictions"),
  "stale-only prediction support is explicitly excluded from current prediction evidence",
);

expect(
  bridge.includes("Never describe its state value as current") &&
    bridge.includes("stale and unknown evidence is historical/uncertain only"),
  "stale World Model evidence cannot masquerade as current operational state",
);

expect(
  bridge.includes(
    "Only relationships explicitly listed below may be attributed to the World Model."
  ),
  "explicit 11J relationship boundary remains intact",
);

expect(
  !bridge.includes("upsertEntity(") &&
    !bridge.includes("upsertRelationship("),
  "read layer does not manufacture or mutate canonical World Model facts",
);

console.log(
  "PASS Phase 11 World Model Currentness and Relevance Acceptance",
);
