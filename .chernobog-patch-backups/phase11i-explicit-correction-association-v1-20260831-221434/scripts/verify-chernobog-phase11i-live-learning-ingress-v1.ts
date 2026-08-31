import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  captureLiveLearningIngress,
} from "../lib/chernobog/pipeline/liveLearningIngress";

async function main(): Promise<void> {
  let cognitionCalls = 0;
  let learningCalls = 0;
  let evaluateCalls = 0;
  let captureCalls = 0;
  let capturedProjectId:
    string | undefined;

  const cycle = {
    cycle: 7,
    generatedAt:
      "2026-08-31T21:00:00.000Z",
    focus: {
      currentKey:
        "model.ollama.health",
      selected: undefined,
    },
    action: {
      id:
        "decision:7",
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
    observedRecords: 1,
  } as any;

  const result =
    await captureLiveLearningIngress(
      {
        projectId:
          "  chernobog  ",
      },
      {
        getCognitiveRuntime:
          (async () => {
            cognitionCalls += 1;

            return {
              evaluate:
                async () => {
                  evaluateCalls += 1;
                  return cycle;
                },
            } as any;
          }) as any,
        getLearningRuntime:
          (async () => {
            learningCalls += 1;

            return {
              captureCognitiveCycle:
                (
                  receivedCycle: any,
                  scope: {
                    projectId?: string;
                  },
                ) => {
                  captureCalls += 1;

                  assert.equal(
                    receivedCycle,
                    cycle,
                  );

                  capturedProjectId =
                    scope.projectId;

                  return {
                    id:
                      "cognitive-cycle:7:test",
                  };
                },
            } as any;
          }) as any,
      },
    );

  assert.equal(
    result.status,
    "captured",
  );

  if (
    result.status !==
    "captured"
  ) {
    throw new Error(
      "Expected captured ingress result.",
    );
  }

  assert.equal(
    result.cycle,
    7,
  );
  assert.equal(
    result.experienceId,
    "cognitive-cycle:7:test",
  );
  assert.equal(
    result.projectId,
    "chernobog",
  );

  assert.equal(
    cognitionCalls,
    1,
  );
  assert.equal(
    learningCalls,
    1,
  );
  assert.equal(
    evaluateCalls,
    1,
  );
  assert.equal(
    captureCalls,
    1,
  );
  assert.equal(
    capturedProjectId,
    "chernobog",
  );

  console.log(
    "PASS live ingress evaluates one canonical cognitive cycle and captures it once with normalized project scope",
  );

  const cognitionFailure =
    await captureLiveLearningIngress(
      {
        projectId:
          "chernobog",
      },
      {
        getCognitiveRuntime:
          (async () => {
            throw new Error(
              "cognition unavailable",
            );
          }) as any,
        getLearningRuntime:
          (async () => {
            throw new Error(
              "must not matter",
            );
          }) as any,
      },
    );

  assert.equal(
    cognitionFailure.status,
    "unavailable",
  );

  console.log(
    "PASS cognition startup failure degrades to unavailable instead of throwing",
  );

  const captureFailure =
    await captureLiveLearningIngress(
      {
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
            ({
              captureCognitiveCycle:
                () => {
                  throw new Error(
                    "learning capture unavailable",
                  );
                },
            })) as any,
      },
    );

  assert.equal(
    captureFailure.status,
    "unavailable",
  );

  console.log(
    "PASS learning capture failure degrades to unavailable instead of throwing",
  );

  const helperSource =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/pipeline/liveLearningIngress.ts",
      ),
      "utf8",
    );

  for (
    const required
    of [
      "getChernobogCognitiveRuntime",
      "getChernobogLearningRuntime",
      "await cognition.evaluate()",
      "learning.captureCognitiveCycle(",
      "projectId,",
      'status:\n        "unavailable"',
    ]
  ) {
    assert.ok(
      helperSource.includes(
        required,
      ),
      `Missing live ingress marker: ${required}`,
    );
  }

  for (
    const forbidden
    of [
      ".promote(",
      "promoteLearningPattern(",
      ".addFeedback(",
      ".addOutcome(",
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
      `Live ingress must not perform unsafe or premature action: ${forbidden}`,
    );
  }

  console.log(
    "PASS live ingress captures experience only; it does not infer feedback, record outcomes, promote lessons, execute tools, or grant authority",
  );

  const runCommand =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/pipeline/runCommand.ts",
      ),
      "utf8",
    );

  const hookMatches =
    runCommand.match(
      /captureLiveLearningIngress\(/g,
    ) ?? [];

  assert.equal(
    hookMatches.length,
    1,
  );

  const respondIndex =
    runCommand.lastIndexOf(
      "reply = await respondForRoute(",
    );

  const hookIndex =
    runCommand.indexOf(
      "await captureLiveLearningIngress(",
      respondIndex,
    );

  const finalIndex =
    runCommand.indexOf(
      "return finalizePipelinePayload(sessionId, route, reply, trace);",
      respondIndex,
    );

  assert.ok(
    respondIndex >= 0,
  );
  assert.ok(
    hookIndex >
      respondIndex,
  );
  assert.ok(
    finalIndex >
      hookIndex,
  );

  const ingressRegion =
    runCommand.slice(
      hookIndex,
      finalIndex,
    );

  assert.ok(
    ingressRegion.includes(
      "getSessionContext(",
    ),
  );

  assert.ok(
    ingressRegion.includes(
      "sessionId",
    ),
  );

  assert.ok(
    ingressRegion.includes(
      ".activeProjectId",
    ),
  );

  assert.equal(
    ingressRegion.includes(
      "activeSession.activeProjectId",
    ),
    false,
  );

  console.log(
    "PASS normal routed chat captures cognition after response generation using session-resolved project scope before final persistence/return",
  );

  const learningRuntime =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/learning/learningRuntime.ts",
      ),
      "utf8",
    );

  assert.ok(
    learningRuntime.includes(
      "activeLessonsForScope(",
    ),
  );
  assert.ok(
    learningRuntime.includes(
      "const partitions =",
    ),
  );

  console.log(
    "PASS live ingress depends on the already-installed project-scope hardening",
  );

  console.log(
    "PASS Phase 11I Live Cognition -> Learning Ingress v1",
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
