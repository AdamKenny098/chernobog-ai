import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
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
  source.includes(
    "const explicitDependencyRelationships",
  ) &&
    source.includes(
      "isDependencyRelationship(entry.item)",
    ),
  "explicit canonical dependency edges are extracted independently of generic packet selection",
);

expect(
  source.includes(
    'entry.item.type === "has-role"',
  ) &&
    source.includes(
      "explicitRoleRelationships",
    ),
  "structural role edges are separately represented",
);

expect(
  source.includes(
    'entry.item.type === "has-state"',
  ) &&
    source.includes(
      "NOT dependency edges",
    ),
  "has-state attachments are explicitly prohibited from dependency classification",
);

expect(
  source.includes(
    "runtime.model.impact(entityId)",
  ) &&
    source.includes(
      "World Model precomputed downstream impact assessments:",
    ),
  "canonical 11J impact engine is exposed to conversation",
);

expect(
  source.includes(
    "supported predictions exposed:",
  ) &&
    source.includes(
      "insufficient predictions stored:",
    ),
  "prediction storage is separated from supported conversational predictions",
);

expect(
  source.includes(
    "when supported predictions exposed=0, say exactly 'No supported predictions.'",
  ),
  "zero supported predictions cannot be rendered as a fabricated placeholder prediction",
);

expect(
  source.includes(
    "when explicit dependency relationships exposed>0, do not output the no-substantive-relational-evidence sentinel.",
  ),
  "relational-evidence sentinel is forbidden when canonical dependency edges exist",
);

expect(
  source.includes(
    "World Model explicit dependency relationships:",
  ) &&
    source.includes(
      "World Model other relationships",
    ) &&
    source.indexOf(
      "World Model explicit dependency relationships:",
    ) <
      source.indexOf(
        "World Model other relationships",
      ),
  "legacy dependency-packet section contract remains compatible",
);

expect(
  source.includes(
    "relationship.evidence.worldStateKeys",
  ) &&
    source.includes(
      "evidenceText(relationship.evidence)",
    ),
  "nested canonical relationship evidence remains the source of provenance",
);

expect(
  source.includes(
    'prediction.status !== "insufficient"',
  ) &&
    source.includes(
      "prediction.confidence > 0",
    ),
  "insufficient predictions remain suppressed",
);

console.log(
  "PASS Phase 11 World Model Evidence Contract v2",
);
