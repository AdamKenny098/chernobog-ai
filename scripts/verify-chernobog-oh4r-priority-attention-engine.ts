import assert from "node:assert/strict";

import type {
  CognitivePlan,
  CognitivePlanStep,
} from "@chernobog/models/cognitivePlanningEngine";

import {
  PRIORITY_ATTENTION_ENGINE_VERSION,
  PriorityAttentionEngine,
} from "@chernobog/models/priorityAttentionEngine";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function step(
  input: {
    id: string;
    sequence: number;
    stage: number;
    dependsOn?: string[];
    kind?:
      CognitivePlanStep["kind"];
    tools?:
      string[];
  },
): CognitivePlanStep {
  return {
    id:
      input.id,
    sequence:
      input.sequence,
    stage:
      input.stage,
    goalId:
      `goal:${input.id}`,
    kind:
      input.kind ??
      "work",
    title:
      input.id,
    objective:
      `Complete ${input.id}`,
    readiness:
      input.dependsOn
        ?.length
        ? "waiting"
        : "ready",
    dependsOnStepIds:
      input.dependsOn ??
      [],
    acceptanceCriteria: [
      `${input.id} complete`,
    ],
    evidenceNeeds:
      input.tools
        ?.length
        ? [
            {
              kind:
                "tool",
              description:
                `Evidence for ${input.id}`,
              required:
                true,
            },
          ]
        : [],
    requiredTools:
      input.tools ??
      [],
    assumptions:
      [],
    blockers:
      [],
    verification: {
      required:
        input.kind ===
          "verification",
      mode:
        input.kind ===
          "verification"
          ? "critic"
          : "none",
      checks:
        [],
      failureBehavior:
        "surface-uncertainty",
    },
    mayExecute:
      false,
    requiresAuthorityBeforeExecution:
      true,
    provenance: {
      goalNodeId:
        `goal:${input.id}`,
      goalSourceRef:
        `test:${input.id}`,
      planningEngineVersion:
        "oh4q.test",
    },
  };
}

function plan():
  CognitivePlan {
  const steps = [
    step({
      id:
        "plan:requirements",
      sequence:
        1,
      stage:
        1,
    }),
    step({
      id:
        "plan:implement",
      sequence:
        2,
      stage:
        2,
      dependsOn: [
        "plan:requirements",
      ],
      tools: [
        "files",
      ],
    }),
    step({
      id:
        "plan:verify",
      sequence:
        3,
      stage:
        3,
      dependsOn: [
        "plan:implement",
      ],
      kind:
        "verification",
    }),
  ];

  return {
    version:
      "oh4q.test",
    generatedAt:
      new Date()
        .toISOString(),
    status:
      "ready",
    rootGoalId:
      "root:test",
    goal:
      "Build feature",
    desiredOutcome:
      "Verified feature",
    strategy:
      "critic-loop",
    steps,
    stages: [
      {
        stage:
          1,
        stepIds: [
          "plan:requirements",
        ],
        parallelizable:
          false,
      },
      {
        stage:
          2,
        stepIds: [
          "plan:implement",
        ],
        parallelizable:
          false,
      },
      {
        stage:
          3,
        stepIds: [
          "plan:verify",
        ],
        parallelizable:
          false,
      },
    ],
    planningReady:
      true,
    unresolvedQuestions:
      [],
    warnings:
      [],
    invariants: {
      dependencyOrderValidated:
        true,
      schedulingPerformed:
        false,
      priorityAssigned:
        false,
      actionsExecutable:
        false,
      authorityBypassed:
        false,
    },
  };
}

function main() {
  console.log(
    "Chernobog OH-4R â€” Priority / Attention Engine Verification",
  );
  console.log(
    "==========================================================",
  );

  const engine =
    new PriorityAttentionEngine();

  const initial =
    engine.prioritize({
      plan:
        plan(),
      priorityHints: {
        "plan:implement": {
          importance:
            1,
          urgency:
            1,
          userPinned:
            true,
        },
        "plan:requirements": {
          importance:
            0.4,
          urgency:
            0.4,
        },
      },
    });

  assert.equal(
    initial.version,
    PRIORITY_ATTENTION_ENGINE_VERSION,
  );

  assert.equal(
    initial.selected
      ?.stepId,
    "plan:requirements",
  );

  const waiting =
    initial.candidates
      .find(
        (candidate) =>
          candidate.stepId ===
          "plan:implement",
      );

  assert.equal(
    waiting?.eligible,
    false,
  );

  assert.equal(
    waiting?.readiness,
    "waiting",
  );

  assert.ok(
    waiting
      ?.unmetDependencies
      .includes(
        "plan:requirements",
      ),
  );

  pass(
    "dependency readiness is a hard gate and cannot be bypassed by urgency, importance, or user pinning",
  );

  const afterRequirements =
    engine.prioritize({
      plan:
        plan(),
      progress: {
        completedStepIds: [
          "plan:requirements",
        ],
      },
      priorityHints: {
        "plan:implement": {
          importance:
            0.9,
          urgency:
            0.8,
        },
      },
    });

  assert.equal(
    afterRequirements.selected
      ?.stepId,
    "plan:implement",
  );

  assert.equal(
    afterRequirements.selected
      ?.readiness,
    "ready",
  );

  pass(
    "completing dependencies makes the next plan step eligible for attention",
  );

  const blocked =
    engine.prioritize({
      plan:
        plan(),
      progress: {
        completedStepIds: [
          "plan:requirements",
        ],
        blockedStepIds: [
          "plan:implement",
        ],
      },
      priorityHints: {
        "plan:implement": {
          importance:
            1,
          urgency:
            1,
          userPinned:
            true,
        },
      },
    });

  const blockedImplement =
    blocked.candidates
      .find(
        (candidate) =>
          candidate.stepId ===
          "plan:implement",
      );

  assert.equal(
    blockedImplement
      ?.eligible,
    false,
  );

  assert.equal(
    blockedImplement
      ?.readiness,
    "blocked",
  );

  assert.notEqual(
    blocked.selected
      ?.stepId,
    "plan:implement",
  );

  pass(
    "blocked steps remain ineligible even when explicitly high priority",
  );

  const attentionPlan =
    plan();

  const attentionDecision =
    engine.prioritize({
      plan:
        attentionPlan,
      progress: {
        completedStepIds: [
          "plan:requirements",
        ],
      },
      userAttention:
        "unavailable",
      priorityHints: {
        "plan:implement": {
          importance:
            0.8,
          urgency:
            0.8,
          requiresUserAttention:
            true,
        },
      },
    });

  const attentionCandidate =
    attentionDecision
      .candidates
      .find(
        (candidate) =>
          candidate.stepId ===
          "plan:implement",
      );

  assert.ok(
    attentionCandidate
      ?.reasons.some(
        (entry) =>
          entry.code ===
          "user-attention-fit" &&
          entry.weight >
          0,
      ),
  );

  assert.ok(
    attentionDecision.warnings
      .some(
        (warning) =>
          /user attention is unavailable/i.test(
            warning,
          ),
      ),
  );

  pass(
    "user-attention availability influences priority without changing plan legality or executing anything",
  );

  const continuityPlan:
    CognitivePlan = {
      ...plan(),
      steps: [
        step({
          id:
            "plan:a",
          sequence:
            1,
          stage:
            1,
        }),
        step({
          id:
            "plan:b",
          sequence:
            2,
          stage:
            1,
        }),
      ],
      stages: [
        {
          stage:
            1,
          stepIds: [
            "plan:a",
            "plan:b",
          ],
          parallelizable:
            true,
        },
      ],
    };

  const retained =
    engine.prioritize({
      plan:
        continuityPlan,
      previousStepId:
        "plan:a",
      priorityHints: {
        "plan:a": {
          importance:
            0.7,
          urgency:
            0.7,
        },
        "plan:b": {
          importance:
            0.85,
          urgency:
            0.75,
        },
      },
      policy: {
        switchMargin:
          15,
      },
    });

  assert.equal(
    retained.selected
      ?.stepId,
    "plan:a",
  );

  assert.equal(
    retained.reason,
    "retained-focus",
  );

  pass(
    "focus hysteresis retains the incumbent when a challenger does not clear the switch margin",
  );

  const switched =
    engine.prioritize({
      plan:
        continuityPlan,
      previousStepId:
        "plan:a",
      priorityHints: {
        "plan:a": {
          importance:
            0.3,
          urgency:
            0.3,
        },
        "plan:b": {
          importance:
            1,
          urgency:
            1,
          userPinned:
            true,
        },
      },
      policy: {
        switchMargin:
          10,
      },
    });

  assert.equal(
    switched.selected
      ?.stepId,
    "plan:b",
  );

  assert.equal(
    switched.reason,
    "switched-focus",
  );

  pass(
    "attention switches when a challenger materially exceeds the incumbent",
  );

  const verificationPlan =
    plan();

  const verificationDecision =
    engine.prioritize({
      plan:
        verificationPlan,
      progress: {
        completedStepIds: [
          "plan:requirements",
          "plan:implement",
        ],
      },
    });

  assert.equal(
    verificationDecision
      .selected
      ?.stepId,
    "plan:verify",
  );

  assert.ok(
    verificationDecision
      .selected
      ?.reasons.some(
        (entry) =>
          entry.code ===
          "verification",
      ),
  );

  pass(
    "required verification checkpoints receive explicit attention weight once dependencies are satisfied",
  );

  assert.equal(
    switched.invariants
      .dependenciesCanBeBypassed,
    false,
  );

  assert.equal(
    switched.invariants
      .blockedStepsCanBeSelected,
    false,
  );

  assert.equal(
    switched.invariants
      .schedulingPerformed,
    false,
  );

  assert.equal(
    switched.invariants
      .executionPerformed,
    false,
  );

  assert.equal(
    switched.invariants
      .planMutated,
    false,
  );

  pass(
    "OH-4R prioritizes cognitive focus without scheduling, execution, dependency bypass, or plan mutation",
  );

  console.log("");
  console.log(
    "OH-4R priority / attention engine verification complete.",
  );
}

main();