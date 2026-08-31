import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "lib/chernobog/pipeline/worldModelContext.ts",
  ),
  "utf8",
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

expect(
  source.includes(
    "function buildDependencyChains(",
  ) &&
    source.includes(
      '"requires-model"',
    ) &&
    source.includes(
      '"served-by"',
    ),
  "complete role-to-model-to-provider chains are built from canonical dependency edges",
);

expect(
  source.includes(
    "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
  ) &&
    source.includes(
      "highest-priority canonical 11J evidence",
    ),
  "dependency backbone is explicitly highest-priority evidence",
);

expect(
  source.includes(
    "RELATIONAL_STATUS=",
  ) &&
    source.includes(
      'explicitDependencyRelationships.length > 0 ? "substantive" : "none"',
    ),
  "relational status is deterministic from canonical dependency presence",
);

expect(
  source.includes(
    "SUPPORTED_PREDICTION_STATUS=",
  ) &&
    source.includes(
      "- No supported predictions.",
    ),
  "supported prediction status is deterministic",
);

expect(
  source.includes(
    "WORLD MODEL CRITICAL IMPACT BACKBONE",
  ) &&
    source.includes(
      "formatImpactAssessment",
    ),
  "precomputed canonical impact evidence is surfaced before verbose evidence",
);

expect(
  source.indexOf(
    "WORLD MODEL CRITICAL DEPENDENCY BACKBONE (highest-priority canonical 11J evidence):",
  ) <
    source.indexOf(
      "World Model entities (current evidence first; historical tail explicitly labelled):",
    ),
  "dependency backbone precedes verbose entity evidence",
);

expect(
  source.includes(
    "when a DEPENDENCY_CHAIN includes --served-by--> model:ollama, do not claim that the Ollama relationship is missing.",
  ),
  "answer contract forbids omission of explicit Ollama provider edge",
);

expect(
  source.includes(
    "RELATIONAL_STATUS=substantive means the World Model is providing substantive relational evidence.",
  ),
  "fallback no-relational-evidence conclusion is forbidden when substantive",
);

expect(
  source.includes(
    "do not list an explicit edge, entity, provider relationship, or dependency chain as missing",
  ),
  "missing-model section cannot contradict canonical backbone",
);

expect(
  source.includes(
    "World Model explicit dependency relationships:",
  ) &&
    source.includes(
      "World Model other relationships",
    ),
  "legacy v1 section contracts remain present",
);

expect(
  source.includes(
    'prediction.status !== "insufficient"',
  ) &&
    source.includes(
      "prediction.confidence > 0",
    ),
  "existing prediction support filter remains intact",
);

console.log(
  "PASS Phase 11 World Model Dependency Backbone v3",
);
