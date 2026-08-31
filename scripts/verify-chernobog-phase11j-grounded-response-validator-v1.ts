import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  validateWorldModelResponseAgainstEvidence,
  type GroundedWorldModelResponseEvidence,
} from "../lib/chernobog/worldModel/responseValidation";
import type {
  WorldModelRelationship,
} from "../lib/chernobog/worldModel/types";

function relationship(
  type: string,
  fromEntityId: string,
  toEntityId: string,
): WorldModelRelationship {
  return {
    id:
      `relation:${type}:${fromEntityId}->${toEntityId}`,
    type,
    fromEntityId,
    toEntityId,
    directed: true,
    confidence: 1,
    observedAt:
      "2026-08-31T16:00:00.000Z",
    attributes: {},
    evidence: {
      eventIds: [
        `event:${type}:${fromEntityId}`,
      ],
      worldStateKeys: [
        `state:${fromEntityId}`,
      ],
      lessonKeys: [],
    },
  };
}

const relationships = [
  relationship(
    "requires-model",
    "model-role:code",
    "model:deepseek-coder-v2:16b",
  ),
  relationship(
    "requires-model",
    "model-role:planner",
    "model:deepseek-coder-v2:16b",
  ),
  relationship(
    "requires-model",
    "model-role:repair",
    "model:deepseek-coder-v2:16b",
  ),
  relationship(
    "requires-model",
    "model-role:default",
    "model:gemma3:latest",
  ),
  relationship(
    "served-by",
    "model:deepseek-coder-v2:16b",
    "model:ollama",
  ),
  relationship(
    "served-by",
    "model:gemma3:latest",
    "model:ollama",
  ),
];

const evidence:
  GroundedWorldModelResponseEvidence = {
    dependencyRelationships:
      relationships,
    supportedPredictions: [],
    impacts: [
      {
        sourceEntityId:
          "model:deepseek-coder-v2:16b",
        directlyDependentEntityIds: [
          "model-role:code",
          "model-role:planner",
          "model-role:repair",
        ],
        transitivelyDependentEntityIds:
          [],
        dependencyPaths: [],
      },
      {
        sourceEntityId:
          "model:gemma3:latest",
        directlyDependentEntityIds: [
          "model-role:default",
        ],
        transitivelyDependentEntityIds:
          [],
        dependencyPaths: [],
      },
      {
        sourceEntityId:
          "model:ollama",
        directlyDependentEntityIds: [
          "model:deepseek-coder-v2:16b",
          "model:gemma3:latest",
        ],
        transitivelyDependentEntityIds: [
          "model-role:code",
          "model-role:default",
          "model-role:planner",
          "model-role:repair",
        ],
        dependencyPaths: [],
      },
    ],
  };

const userMessage = `
Inspect the current World Model.
List all explicit dependency paths currently represented.

CONSEQUENCES
- model:ollama becomes unavailable
- model:deepseek-coder-v2:16b becomes unavailable
- model:gemma3:latest becomes unavailable

PREDICTIONS
List only supported predictions.
`;

const good = `
WORLD MODEL ENTITIES
- model:ollama
- model:deepseek-coder-v2:16b
- model:gemma3:latest
- model-role:code
- model-role:planner
- model-role:repair
- model-role:default

RELATIONSHIPS
source entity: model-role:code
relationship type: requires-model
target entity: model:deepseek-coder-v2:16b
source entity: model-role:planner
relationship type: requires-model
target entity: model:deepseek-coder-v2:16b
source entity: model-role:repair
relationship type: requires-model
target entity: model:deepseek-coder-v2:16b
source entity: model-role:default
relationship type: requires-model
target entity: model:gemma3:latest
source entity: model:deepseek-coder-v2:16b
relationship type: served-by
target entity: model:ollama
source entity: model:gemma3:latest
relationship type: served-by
target entity: model:ollama

DEPENDENCIES
- model-role:code -> requires-model -> model:deepseek-coder-v2:16b -> served-by -> model:ollama
- model-role:planner -> requires-model -> model:deepseek-coder-v2:16b -> served-by -> model:ollama
- model-role:repair -> requires-model -> model:deepseek-coder-v2:16b -> served-by -> model:ollama
- model-role:default -> requires-model -> model:gemma3:latest -> served-by -> model:ollama

CONSEQUENCES
- model:ollama becomes unavailable: model:deepseek-coder-v2:16b, model:gemma3:latest, model-role:code, model-role:default, model-role:planner, and model-role:repair are downstream dependents.
- model:deepseek-coder-v2:16b becomes unavailable: model-role:code, model-role:planner, and model-role:repair are downstream dependents.
- model:gemma3:latest becomes unavailable: model-role:default is a downstream dependent.

PREDICTIONS
No supported predictions.

MISSING MODEL
- No additional missing dependency is inferred.
`;

const goodResult =
  validateWorldModelResponseAgainstEvidence(
    userMessage,
    good,
    evidence,
  );

assert.equal(
  goodResult.valid,
  true,
  goodResult.issues
    .map((issue) => issue.message)
    .join("\n"),
);

console.log(
  "PASS correctly directed grounded answer validates unchanged",
);

assert.equal(
  goodResult.issues.some(
    (issue) =>
      issue.code ===
      "missing-canonical-dependency",
  ),
  false,
);

console.log(
  "PASS entity-list occurrences cannot cause false missing-dependency failures",
);

const bad = `
WORLD MODEL ENTITIES
- model:ollama
- model:deepseek-coder-v2:16b
- model:gemma3:latest
- model-role:code

RELATIONSHIPS
source entity: model:deepseek-coder-v2:16b
relationship type: requires-model
target entity: model-role:code
source entity: model:ollama
relationship type: served-by
target entity: model:deepseek-coder-v2:16b

DEPENDENCIES
- model-role:code has-role model:role
- model-role:code has-state world-state:model.role.code.assignment

CONSEQUENCES
- model:ollama becomes unavailable: No dependency path exists.
- model:deepseek-coder-v2:16b becomes unavailable: model:gemma3:latest becomes unavailable.
- model:gemma3:latest becomes unavailable: model:ollama becomes unavailable.

PREDICTIONS
Prediction: none. Confidence: 1.00.

MISSING MODEL
World Model is not currently providing substantive Chernobog relational evidence.
`;

const badResult =
  validateWorldModelResponseAgainstEvidence(
    userMessage,
    bad,
    evidence,
  );

assert.equal(
  badResult.valid,
  false,
);

const codes =
  new Set(
    badResult.issues.map(
      (issue) => issue.code,
    ),
  );

for (const expected of [
  "reversed-dependency",
  "dependency-section-nondependency",
  "missing-canonical-dependency",
  "missing-impact-path",
  "invalid-consequence",
  "unsupported-prediction",
  "relational-fallback-contradiction",
]) {
  assert.ok(
    codes.has(expected as never),
    `Expected validation issue: ${expected}`,
  );
}

console.log(
  "PASS validator rejects reversed edges, fake dependencies, invalid consequences, unsupported predictions, and contradictory fallback",
);

assert.ok(
  badResult.fallbackText.includes(
    "model-role:code -> requires-model -> model:deepseek-coder-v2:16b -> served-by -> model:ollama",
  ),
);

assert.ok(
  badResult.fallbackText.includes(
    "No supported predictions.",
  ),
);

assert.ok(
  !badResult.fallbackText.includes(
    "World Model is not currently providing substantive Chernobog relational evidence.",
  ),
);

console.log(
  "PASS deterministic fallback is canonical and non-contradictory",
);

const router =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "lib/chernobog/router.ts",
    ),
    "utf8",
  );

assert.ok(
  router.includes(
    "validateWorldModelResponse(",
  ),
);

assert.ok(
  router.includes(
    "buildWorldModelRepairPrompt(",
  ),
);

assert.ok(
  router.includes(
    "temperature: 0.1",
  ),
);

assert.ok(
  router.includes(
    "return repairedValidation.fallbackText;",
  ),
);

assert.ok(
  router.indexOf(
    "const validation =",
  ) <
    router.indexOf(
      "return repairedValidation.fallbackText;",
    ),
);

console.log(
  "PASS router performs one bounded repair before deterministic fallback",
);

const validatorSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "lib/chernobog/worldModel/responseValidation.ts",
    ),
    "utf8",
  );

assert.ok(
  validatorSource.includes(
    "function parsedDependencyClaimKeys(",
  ),
);

assert.equal(
  validatorSource.includes(
    "const fromIndex =",
  ),
  false,
);

console.log(
  "PASS completeness validation uses parsed directed claims rather than first entity occurrence",
);

for (const forbidden of [
  "executeTool",
  "runExecutionTask",
  "saveMemory",
  "promoteLearningPattern",
  "grantPermission",
]) {
  assert.equal(
    validatorSource.includes(forbidden),
    false,
    `Validator must not contain ${forbidden}`,
  );
}

console.log(
  "PASS validator has no tool, execution, permission, memory-write, or learning-promotion path",
);

console.log(
  "PASS Phase 11J Grounded Response Validator / Repair Guard v1",
);
