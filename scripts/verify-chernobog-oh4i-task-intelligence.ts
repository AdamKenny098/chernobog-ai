import assert from "node:assert/strict";
import {
  TaskIntelligenceEngine,
} from "@chernobog/models/taskIntelligence";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function main() {
  console.log(
    "Chernobog OH-4I â€” Task Intelligence Verification",
  );
  console.log(
    "===============================================",
  );

  const engine =
    new TaskIntelligenceEngine();

  const simple =
    engine.classify({
      domains: [
        "conversation",
      ],
      estimatedSteps:
        1,
      dependencyCount:
        0,
      ambiguityLevel:
        0,
      noveltyLevel:
        0,
      creativeGeneration:
        0,
      styleSensitivity:
        0,
      factualVerification:
        0.1,
      evidenceDependency:
        0,
      consequenceSeverity:
        0,
      reasoningSteps:
        1,
      requestedLatencyMs:
        1_000,
      minimizeCost:
        true,
    });

  assert.equal(
    simple.primaryDomain.value,
    "conversation",
  );

  assert.equal(
    simple.complexity.value,
    "trivial",
  );

  assert.equal(
    simple.creativity.value,
    "none",
  );

  assert.equal(
    simple.reasoningDepth.value,
    "shallow",
  );

  assert.equal(
    simple.latencyTolerance.value,
    "immediate",
  );

  assert.equal(
    simple.costTolerance.value,
    "minimal",
  );

  pass(
    "engine classifies low-complexity interactive work across required dimensions",
  );

  const research =
    engine.classify({
      domains: [
        "research",
        "factual",
      ],
      estimatedSteps:
        8,
      dependencyCount:
        4,
      ambiguityLevel:
        0.6,
      noveltyLevel:
        0.7,
      creativeGeneration:
        0.2,
      styleSensitivity:
        0.1,
      factualVerification:
        1,
      evidenceDependency:
        1,
      consequenceSeverity:
        0.9,
      reasoningSteps:
        8,
      crossDomainReasoning:
        true,
      containsPersonalData:
        true,
      requiredTools: [
        "web",
        "files",
        "web",
      ],
      requestedLatencyMs:
        30_000,
      costCeilingRelative:
        0.7,
    });

  assert.equal(
    research.primaryDomain.value,
    "research",
  );

  assert.deepEqual(
    research.secondaryDomains,
    [
      "factual",
    ],
  );

  assert.equal(
    research.derived.multiDomain,
    true,
  );

  assert.equal(
    research.factuality.value,
    "critical",
  );

  assert.equal(
    research.reasoningDepth.value,
    "very-deep",
  );

  assert.equal(
    research.privacySensitivity.value,
    "personal",
  );

  assert.equal(
    research.derived.requiresExternalEvidence,
    true,
  );

  assert.equal(
    research.derived.highRiskIncorrectness,
    true,
  );

  assert.deepEqual(
    research.requiredTools,
    [
      "files",
      "web",
    ],
  );

  assert.equal(
    research.derived.toolUseRequired,
    true,
  );

  pass(
    "engine classifies multi-domain factual work, risk, evidence and tool requirements",
  );

  const creative =
    engine.classify({
      domains: [
        "creative",
      ],
      estimatedSteps:
        4,
      creativeGeneration:
        1,
      styleSensitivity:
        1,
      factualVerification:
        0.1,
      evidenceDependency:
        0,
      reasoningSteps:
        4,
      canRunAsynchronously:
        true,
      costCeilingRelative:
        1,
    });

  assert.equal(
    creative.creativity.value,
    "high",
  );

  assert.equal(
    creative.factuality.value,
    "low",
  );

  assert.equal(
    creative.latencyTolerance.value,
    "batch",
  );

  assert.equal(
    creative.costTolerance.value,
    "high",
  );

  pass(
    "engine separates creative intensity from factuality and resource tolerances",
  );

  const sensitive =
    engine.classify({
      domains: [
        "personal-assistance",
      ],
      containsCredentials:
        true,
      factualVerification:
        0.5,
      consequenceSeverity:
        0.5,
    });

  assert.equal(
    sensitive.privacySensitivity.value,
    "highly-sensitive",
  );

  assert.equal(
    sensitive.derived.prefersLocalExecution,
    true,
  );

  pass(
    "sensitive task classification explicitly signals local-execution preference",
  );

  const defaults =
    engine.classify({});

  assert.equal(
    defaults.primaryDomain.value,
    "general",
  );

  assert.ok(
    defaults.primaryDomain.confidence <
    0.6,
  );

  assert.ok(
    defaults.primaryDomain.reasons.length >
    0,
  );

  pass(
    "uncertain inputs degrade to explicit defaults with confidence and reasons",
  );

  const dimensions = [
    simple.primaryDomain,
    simple.complexity,
    simple.creativity,
    simple.factuality,
    simple.reasoningDepth,
    simple.privacySensitivity,
    simple.latencyTolerance,
    simple.costTolerance,
  ];

  assert.ok(
    dimensions.every(
      (dimension) =>
        dimension.confidence >=
          0 &&
        dimension.confidence <=
          1 &&
        dimension.reasons.length >
          0,
    ),
  );

  pass(
    "every task-intelligence dimension is inspectable through confidence and reasons",
  );

  console.log("");
  console.log(
    "OH-4I task intelligence verification complete.",
  );
}

main();