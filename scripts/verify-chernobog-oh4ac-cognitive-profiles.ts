import assert from "node:assert/strict";

import {
  COGNITIVE_PROFILES_VERSION,
  getCognitiveProfile,
  listCognitiveProfiles,
  resolveCognitiveProfile,
} from "@chernobog/models/cognitiveProfiles";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function main() {
  console.log(
    "Chernobog OH-4AC â€” Cognitive Profiles Verification",
  );

  console.log(
    "=================================================",
  );

  const profiles =
    listCognitiveProfiles();

  assert.deepEqual(
    profiles
      .map(
        (profile) =>
          profile.name,
      )
      .sort(),
    [
      "cheap",
      "deep",
      "experimental",
      "fast",
      "private",
    ],
  );

  assert.equal(
    COGNITIVE_PROFILES_VERSION,
    "oh4ac.v1",
  );

  pass(
    "Fast, Deep, Private, Cheap, and Experimental are all first-class profile definitions",
  );

  const fast =
    resolveCognitiveProfile(
      "fast",
    );

  assert.equal(
    fast.reasoningEffort,
    "standard",
  );

  assert.ok(
    fast.priorities
      .latency >
    fast.priorities
      .quality,
  );

  assert.ok(
    fast.maxPasses <=
    2,
  );

  assert.equal(
    fast.preferredStrategies[0],
    "single-model",
  );

  pass(
    "Fast profile prioritizes latency and bounded passes without creating a separate workflow",
  );

  const deep =
    resolveCognitiveProfile(
      "deep",
    );

  assert.equal(
    deep.reasoningEffort,
    "very-deep",
  );

  assert.equal(
    deep.verification,
    "strict",
  );

  assert.equal(
    deep.preferredStrategies[0],
    "critic-loop",
  );

  assert.ok(
    deep.candidateBreadth >
    fast.candidateBreadth,
  );

  pass(
    "Deep profile increases reasoning, verification, candidate breadth, and multi-pass strategy preference",
  );

  const privateProfile =
    resolveCognitiveProfile(
      "private",
    );

  assert.equal(
    privateProfile
      .requireLocal,
    true,
  );

  assert.equal(
    privateProfile
      .allowRemote,
    false,
  );

  assert.equal(
    privateProfile
      .priorities
      .privacy,
    1,
  );

  pass(
    "Private profile requires local execution and forbids remote candidates",
  );

  const cheap =
    resolveCognitiveProfile(
      "cheap",
    );

  assert.equal(
    cheap.preferLowCost,
    true,
  );

  assert.equal(
    cheap.preferredStrategies[0],
    "cheap-first-escalation",
  );

  assert.equal(
    cheap.priorities
      .cost,
    1,
  );

  pass(
    "Cheap profile optimizes for cost using normal routing and cheap-first strategy hints",
  );

  const experimental =
    resolveCognitiveProfile(
      "experimental",
    );

  assert.equal(
    experimental
      .allowExperimentalCandidates,
    true,
  );

  assert.equal(
    experimental
      .verification,
    "strict",
  );

  assert.equal(
    experimental
      .priorities
      .exploration,
    1,
  );

  pass(
    "Experimental profile permits broader candidate exploration while retaining strict verification",
  );

  const experimentalForbidden =
    resolveCognitiveProfile(
      "experimental",
      {
        allowExperimental:
          false,
      },
    );

  assert.equal(
    experimentalForbidden
      .allowExperimentalCandidates,
    false,
  );

  pass(
    "task constraints can disable experimental candidates even when Experimental profile is selected",
  );

  const fastPrivateTask =
    resolveCognitiveProfile(
      "fast",
      {
        privacySensitivity:
          "highly-sensitive",
      },
    );

  assert.equal(
    fastPrivateTask
      .requireLocal,
    true,
  );

  assert.equal(
    fastPrivateTask
      .allowRemote,
    false,
  );

  assert.equal(
    fastPrivateTask
      .priorities
      .privacy,
    1,
  );

  pass(
    "task privacy requirements override a profile and can only become stricter, never weaker",
  );

  const cheapDeepTask =
    resolveCognitiveProfile(
      "cheap",
      {
        reasoningDepth:
          "very-deep",

        maxPasses:
          2,

        validationRequired:
          true,
      },
    );

  assert.equal(
    cheapDeepTask
      .reasoningEffort,
    "very-deep",
  );

  assert.equal(
    cheapDeepTask
      .maxPasses,
    2,
  );

  assert.equal(
    cheapDeepTask
      .verification,
    "strict",
  );

  pass(
    "profiles cannot reduce required reasoning depth, exceed task pass budgets, or disable required validation",
  );

  const fastCostLatency =
    resolveCognitiveProfile(
      "fast",
      {
        costSensitive:
          true,

        latencySensitive:
          true,
      },
    );

  assert.ok(
    fastCostLatency
      .priorities
      .cost >=
    0.9,
  );

  assert.ok(
    fastCostLatency
      .priorities
      .latency >=
    0.9,
  );

  pass(
    "task-specific cost/latency needs strengthen profile priorities without rewriting the workflow",
  );

  const immutable =
    getCognitiveProfile(
      "deep",
    );

  immutable.priorities
    .quality =
    0;

  const deepAgain =
    getCognitiveProfile(
      "deep",
    );

  assert.equal(
    deepAgain.priorities
      .quality,
    1,
  );

  pass(
    "profile definitions are returned as copies and cannot be mutated by callers",
  );

  for (
    const name
    of [
      "fast",
      "deep",
      "private",
      "cheap",
      "experimental",
    ] as const
  ) {
    const resolved =
      resolveCognitiveProfile(
        name,
      );

    assert.equal(
      resolved
        .invariants
        .taskPrivacyCanBeWeakened,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .taskPassBudgetCanBeExceeded,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .requiredReasoningCanBeReduced,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .registryEligibilityBypassed,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .authorityModified,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .safetyModified,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .verificationDisabled,
      false,
    );

    assert.equal(
      resolved
        .invariants
        .workflowRewritten,
      false,
    );
  }

  pass(
    "all profiles remain optimization overlays only: registry eligibility, privacy, verification, safety, authority, and workflow architecture stay authoritative",
  );

  console.log("");

  console.log(
    "OH-4AC cognitive profiles verification complete.",
  );
}

main();