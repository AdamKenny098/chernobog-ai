import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const file = path.join(
  repo,
  "lib/chernobog/pipeline/worldModelContext.ts",
);

function expect(
  condition: unknown,
  label: string,
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`PASS ${label}`);
}

const source = fs.readFileSync(file, "utf8");

expect(
  source.includes("isDependencyRelationship"),
  "packet uses canonical 11J dependency classifier",
);

expect(
  source.includes("function selectRelationships(") &&
    source.includes("MAX_DEPENDENCY_RELATIONSHIPS"),
  "dependency-aware bounded relationship selection exists",
);

expect(
  source.includes("relationshipPriority(") &&
    source.includes('relationship.type === "has-state"'),
  "low-information state attachments are deprioritized",
);

expect(
  source.includes("function selectEntitiesForRelationships(") &&
    source.includes("relationship.item.fromEntityId") &&
    source.includes("relationship.item.toEntityId"),
  "selected relationship endpoints are closed into the entity packet",
);

expect(
  source.includes(
    "World Model explicit dependency relationships:",
  ),
  "dependency relationships receive a dedicated model-facing section",
);

expect(
  source.indexOf(
    "World Model explicit dependency relationships:",
  ) <
    source.indexOf(
      "World Model other relationships",
    ),
  "dependency section precedes generic relationship evidence",
);

expect(
  source.includes(
    "Use explicit dependency relationships for consequence reasoning.",
  ),
  "model-facing instructions bind consequence reasoning to explicit dependency evidence",
);

expect(
  source.includes(
    "If at least one explicit dependency relationship is listed, substantive relational evidence is present.",
  ),
  "model-facing instructions prevent contradictory no-relational-evidence sentinel",
);

expect(
  source.includes(
    'prediction.status !== "insufficient"',
  ) &&
    source.includes(
      "prediction.confidence > 0",
    ),
  "prediction discipline from currentness patch remains intact",
);

expect(
  source.includes(
    'entry.itemFreshness === "stale"',
  ),
  "historical freshness semantics remain intact",
);

console.log(
  "PASS Phase 11 World Model Dependency-Aware Conversational Packet v1",
);
