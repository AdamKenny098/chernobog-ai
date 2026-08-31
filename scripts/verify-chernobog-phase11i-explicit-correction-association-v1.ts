import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  associateExplicitLearningCorrection,
  captureLiveLearningIngress,
  extractExplicitLearningCorrection,
} from "../lib/chernobog/pipeline/liveLearningIngress";

async function main(): Promise<void> {
  assert.equal(
    extractExplicitLearningCorrection(
      "Correction: Prefer concise status reports.",
    ),
    "Prefer concise status reports.",
  );

  assert.equal(
    extractExplicitLearningCorrection(
      "That's wrong: the planner role uses DeepSeek.",
    ),
    "the planner role uses DeepSeek.",
  );

  assert.equal(
    extractExplicitLearningCorrection(
      "You got that wrong - default uses Gemma.",
    ),
    "default uses Gemma.",
  );

  assert.equal(
    extractExplicitLearningCorrection(
      "Actually, I was thinking about something else.",
    ),
    undefined,
  );

  assert.equal(
    extractExplicitLearningCorrection(
      "No, thanks.",
    ),
    undefined,
  );

  console.log(
    "PASS correction detector accepts explicit corrections and rejects ambiguous no/actually messages",
  );

  const cycle = {
    cycle: 11,
    generatedAt:
      "2026-08-31T21:30:00.000Z",
    focus: {
      currentKey:
        "model.ollama.health",
      selected: undefined,
    },
    action: {
      id:
        "decision:11",
      mode:
        "observe",
      requestedMode:
        "observe",
      permittedToExecute:
        false,
    },
    initiative: {
      disposition:
        "none",
    },
    observedRecords:
      1,
  } as any;

  const experience = {
    id:
      "cognitive-cycle:11:test",
    context: {
      projectId:
        "chernobog",
    },
  };

  let feedbackCount = 0;
  let refreshCount = 0;
  let promoteCount = 0;
  let capturedFeedback:
    any;

  const learning = {
    experiences: {
      get: (
        id: string,
      ) =>
        id === experience.id
          ? experience
          : undefined,
    },
    captureCognitiveCycle: (
      receivedCycle: any,
      scope: {
        projectId?: string;
      },
    ) => {
      assert.equal(
        receivedCycle,
        cycle,
      );
      assert.equal(
        scope.projectId,
        "chernobog",
      );

      return experience;
    },
    addFeedback: (
      observation: any,
    ) => {
      feedbackCount += 1;
      capturedFeedback =
        observation;
    },
    refreshPatterns: () => {
      refreshCount += 1;
    },
    promote: () => {
      promoteCount += 1;
    },
  };

  await captureLiveLearningIngress(
    {
      sessionId:
        "session-a",
      projectId:
        "chernobog",
    },
    {
      getCognitiveRuntime:
        (async () =>
          ({
            evaluate:
              async () =>
                cycle,
          })) as any,
      getLearningRuntime:
        (async () =>
          learning) as any,
    },
  );

  const associated =
    await associateExplicitLearningCorrection(
      {
        userMessage:
          "Correction: Prefer concise status reports.",
        sessionId:
          "session-a",
        projectId:
          "chernobog",
      },
      {
        getLearningRuntime:
          (async () =>
            learning) as any,
      },
    );

  assert.equal(
    associated.status,
    "associated",
  );

  if (
    associated.status !==
    "associated"
  ) {
    throw new Error(
      "Expected associated correction.",
    );
  }

  assert.equal(
    associated.experienceId,
    experience.id,
  );
  assert.equal(
    associated.projectId,
    "chernobog",
  );
  assert.equal(
    feedbackCount,
    1,
  );
  assert.equal(
    refreshCount,
    1,
  );
  assert.equal(
    promoteCount,
    0,
  );
  assert.equal(
    capturedFeedback.experienceId,
    experience.id,
  );
  assert.equal(
    capturedFeedback.kind,
    "correction",
  );
  assert.equal(
    capturedFeedback.detail,
    "Prefer concise status reports.",
  );

  console.log(
    "PASS explicit correction attaches to the preceding session/project experience and refreshes patterns without promotion",
  );

  const consumed =
    await associateExplicitLearningCorrection(
      {
        userMessage:
          "Correction: Prefer concise status reports.",
        sessionId:
          "session-a",
        projectId:
          "chernobog",
      },
      {
        getLearningRuntime:
          (async () =>
            learning) as any,
      },
    );

  assert.equal(
    consumed.status,
    "ignored",
  );

  if (
    consumed.status !==
    "ignored"
  ) {
    throw new Error(
      "Expected consumed association to be ignored.",
    );
  }

  assert.equal(
    consumed.reason,
    "no-linked-experience",
  );
  assert.equal(
    feedbackCount,
    1,
  );

  console.log(
    "PASS one prior experience can receive at most one explicit correction through the live association",
  );

  await captureLiveLearningIngress(
    {
      sessionId:
        "session-b",
      projectId:
        "chernobog",
    },
    {
      getCognitiveRuntime:
        (async () =>
          ({
            evaluate:
              async () =>
                cycle,
          })) as any,
      getLearningRuntime:
        (async () =>
          learning) as any,
    },
  );

  const mismatch =
    await associateExplicitLearningCorrection(
      {
        userMessage:
          "Correction: This belongs elsewhere.",
        sessionId:
          "session-b",
        projectId:
          "other-project",
      },
      {
        getLearningRuntime:
          (async () =>
            learning) as any,
      },
    );

  assert.equal(
    mismatch.status,
    "ignored",
  );

  if (
    mismatch.status !==
    "ignored"
  ) {
    throw new Error(
      "Expected project mismatch to be ignored.",
    );
  }

  assert.equal(
    mismatch.reason,
    "project-scope-mismatch",
  );
  assert.equal(
    feedbackCount,
    1,
  );

  console.log(
    "PASS correction cannot cross project scope",
  );

  const ambiguous =
    await associateExplicitLearningCorrection(
      {
        userMessage:
          "Actually, carry on.",
        sessionId:
          "session-c",
        projectId:
          "chernobog",
      },
      {
        getLearningRuntime:
          (async () =>
            learning) as any,
      },
    );

  assert.equal(
    ambiguous.status,
    "ignored",
  );

  if (
    ambiguous.status !==
    "ignored"
  ) {
    throw new Error(
      "Expected ambiguous feedback to be ignored.",
    );
  }

  assert.equal(
    ambiguous.reason,
    "not-explicit-correction",
  );

  console.log(
    "PASS ambiguous conversational disagreement does not become training feedback",
  );

  const helperSource =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/pipeline/liveLearningIngress.ts",
      ),
      "utf8",
    );

  const captureFunctionStart =
    helperSource.indexOf(
      "export async function captureLiveLearningIngress(",
    );

  const captureFunctionEnd =
    helperSource.indexOf(
      "\nexport ",
      captureFunctionStart + 10,
    ) >= 0
      ? helperSource.indexOf(
          "\nexport ",
          captureFunctionStart + 10,
        )
      : helperSource.length;

  const captureFunction =
    helperSource.slice(
      captureFunctionStart,
      captureFunctionEnd,
    );

  assert.ok(
    captureFunction.includes(
      "const sessionId =",
    ),
  );
  assert.ok(
    captureFunction.includes(
      "normalizeSessionId(",
    ),
  );
  assert.ok(
    captureFunction.includes(
      "input.sessionId",
    ),
  );

  console.log(
    "PASS capture function owns its own sessionId normalization before registering the live experience link",
  );

  assert.equal(
    helperSource.includes("$/is"),
    false,
  );

  assert.ok(
    helperSource.includes(
      "[\\s\\S]+",
    ),
  );

  console.log(
    "PASS explicit correction regexes avoid ES2018 dotAll flags while preserving multiline matching",
  );

  for (
    const required
    of [
      "extractExplicitLearningCorrection(",
      "associateExplicitLearningCorrection(",
      "liveLearningExperienceRegistry().set(",
      "learning.addFeedback(",
      "learning.refreshPatterns();",
      "registry.delete(",
      "project-scope-mismatch",
    ]
  ) {
    assert.ok(
      helperSource.includes(
        required,
      ),
      `Missing correction association marker: ${required}`,
    );
  }

  for (
    const forbidden
    of [
      "learning.promote(",
      "promoteLearningPattern(",
      "executeFromMessage(",
      "runExecutionTask(",
      "toolGateway",
      "grantPermission",
      "rewriteGovernance",
    ]
  ) {
    assert.equal(
      helperSource.includes(
        forbidden,
      ),
      false,
      `Correction association must not gain authority: ${forbidden}`,
    );
  }

  console.log(
    "PASS correction association has no promotion, tool, execution, permission, or governance path",
  );

  const runCommand =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/pipeline/runCommand.ts",
      ),
      "utf8",
    );

  const responseIndex =
    runCommand.lastIndexOf(
      "reply = await respondForRoute(",
    );

  const associationIndex =
    runCommand.lastIndexOf(
      "await associateExplicitLearningCorrection(",
      responseIndex,
    );

  const captureIndex =
    runCommand.indexOf(
      "await captureLiveLearningIngress(",
      responseIndex,
    );

  assert.ok(
    associationIndex >= 0,
  );
  assert.ok(
    associationIndex <
      responseIndex,
  );
  assert.ok(
    captureIndex >
      responseIndex,
  );

  const associationRegion =
    runCommand.slice(
      associationIndex,
      responseIndex,
    );

  assert.ok(
    associationRegion.includes(
      "sessionId",
    ),
  );
  assert.ok(
    associationRegion.includes(
      "activeSession.activeProjectId",
    ),
  );

  const captureRegion =
    runCommand.slice(
      captureIndex,
      captureIndex + 320,
    );

  assert.ok(
    captureRegion.includes(
      "sessionId,",
    ),
  );

  console.log(
    "PASS normal routed chat associates correction before answering and records the new experience after answering",
  );

  console.log(
    "PASS Phase 11I Explicit Correction Association v1",
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
