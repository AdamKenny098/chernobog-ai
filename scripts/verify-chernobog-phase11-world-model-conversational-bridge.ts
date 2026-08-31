import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(repo, relativePath),
    "utf8",
  );
}

function expect(
  condition: boolean,
  label: string,
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

const runCommand = read(
  "lib/chernobog/pipeline/runCommand.ts",
);

const bridge = read(
  "lib/chernobog/pipeline/worldModelContext.ts",
);

expect(
  bridge.includes("getChernobogWorldModelRuntime"),
  "bridge consumes canonical 11J runtime singleton",
);

expect(
  bridge.includes("runtime.ingestCurrentWorldState();"),
  "bridge synchronizes 11J from canonical current 11G state before snapshotting",
);

expect(
  bridge.includes("runtime.model.snapshot()"),
  "bridge reads canonical World Model snapshot",
);

expect(
  bridge.includes("snapshot.graph.entities") &&
    bridge.includes("snapshot.graph.relationships"),
  "bridge exposes explicit entities and relationships",
);

expect(
  bridge.includes("snapshot.predictions") &&
    bridge.includes("snapshot.causalHypotheses"),
  "bridge exposes bounded predictions and causal hypotheses",
);

expect(
  bridge.includes(
    "Only relationships explicitly listed below may be attributed to the World Model."
  ),
  "bridge prevents plausible LLM inference from masquerading as canonical relationship evidence",
);

expect(
  bridge.includes(
    "Predictions and causal hypotheses are not facts."
  ),
  "bridge preserves World Model epistemic boundaries",
);

expect(
  !bridge.includes("upsertEntity(") &&
    !bridge.includes("upsertRelationship("),
  "conversational bridge does not manually manufacture World Model graph facts",
);

expect(
  runCommand.includes(
    "const worldModelContext ="
  ) &&
    runCommand.includes(
      "buildChernobogWorldModelContext()"
    ),
  "normal routed pipeline builds canonical World Model context",
);

expect(
  runCommand.includes(
    "[memoryContext.systemText, worldStateContext.systemText]"
  ) &&
    runCommand.includes(
      "worldModelContext.systemText"
    ),
  "World Model evidence extends the preserved memory plus World State composition",
);

expect(
  runCommand.includes(
    `[memoryContext.systemText, worldStateContext.systemText]
                    .filter(Boolean)
                    .join("\\n\\n")`
  ),
  "legacy 11G model-facing composition remains structurally intact for regression compatibility",
);

console.log(
  "PASS Phase 11 World Model Conversational Bridge Acceptance",
);
