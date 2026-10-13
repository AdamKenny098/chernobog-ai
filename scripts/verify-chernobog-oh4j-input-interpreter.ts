import assert from "node:assert/strict";
import {
  InputInterpreter,
  normalizeHumanInput,
} from "@chernobog/models/inputInterpreter";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  console.log(
    "Chernobog OH-4J â€” Input Interpreter Verification",
  );
  console.log(
    "===============================================",
  );

  const interpreter =
    new InputInterpreter();

  const typed =
    await interpreter.interpret({
      modality:
        "typed",
      text:
        "Plan the repository migration. Must preserve retries. Use the repo files and run the test suite. Keep cost low.",
      turnId:
        "typed-1",
    });

  assert.equal(
    typed.raw.modality,
    "typed",
  );

  assert.equal(
    typed.intent.kind,
    "plan",
  );

  assert.ok(
    typed.goal.summary.length >
    0,
  );

  assert.ok(
    typed.desiredOutcome.summary.length >
    0,
  );

  assert.ok(
    typed.constraints.some(
      (constraint) =>
        constraint.kind ===
          "explicit" &&
        /must preserve retries/i.test(
          constraint.text,
        ),
    ),
  );

  assert.ok(
    typed.taskSignals.requiredTools
      ?.includes(
        "files",
      ),
  );

  assert.ok(
    typed.taskSignals.requiredTools
      ?.includes(
        "runtime",
      ),
  );

  assert.equal(
    typed.taskIntelligence.primaryDomain.value,
    "coding",
  );

  pass(
    "typed input becomes structured intent, constraints, desired outcome and OH-4I signals",
  );

  const spokenRaw = {
    modality:
      "spoken" as const,
    text:
      "uh um continue continue that thing and",
  };

  assert.equal(
    normalizeHumanInput(
      spokenRaw,
    ),
    "continue that thing and",
  );

  const spoken =
    await interpreter.interpret(
      spokenRaw,
    );

  assert.equal(
    spoken.intent.kind,
    "continue",
  );

  assert.equal(
    spoken.clarificationRequired,
    true,
  );

  assert.ok(
    spoken.unresolvedQuestions.length >=
    1,
  );

  assert.ok(
    spoken.ambiguity >=
    0.8,
  );

  pass(
    "spoken disfluencies are normalized while incomplete and ambiguous references remain explicit",
  );

  const ambiguous =
    await interpreter.interpret({
      modality:
        "typed",
      text:
        "Change it.",
    });

  assert.equal(
    ambiguous.intent.kind,
    "modify",
  );

  assert.equal(
    ambiguous.clarificationRequired,
    true,
  );

  assert.ok(
    ambiguous.unresolvedQuestions.some(
      (question) =>
        question.blocking,
    ),
  );

  pass(
    "ambiguous executable/modify requests produce blocking unresolved questions instead of invented context",
  );

  const custom =
    new InputInterpreter(
      async (
        _input,
        normalizedText,
      ) => ({
        intentKind:
          "create",
        goal:
          "Create a project brief",
        desiredOutcome:
          "A complete Markdown project brief",
        explicitConstraints: [
          "Markdown only",
        ],
        unresolvedQuestions:
          [],
        domains: [
          "planning",
        ],
        requiredTools:
          [],
        estimatedSteps:
          3,
        ambiguityLevel:
          0.05,
        reasoningSteps:
          3,
        confidence:
          0.97,
        noveltyLevel:
          normalizedText.length >
            0
            ? 0.2
            : 0,
      }),
    );

  const customResult =
    await custom.interpret({
      modality:
        "spoken",
      text:
        "make me the thing please",
    });

  assert.equal(
    customResult.goal.summary,
    "Create a project brief",
  );

  assert.equal(
    customResult.desiredOutcome.summary,
    "A complete Markdown project brief",
  );

  assert.equal(
    customResult.intent.confidence,
    0.97,
  );

  assert.equal(
    customResult.clarificationRequired,
    false,
  );

  pass(
    "semantic analysis is replaceable without changing the Input Interpreter contract",
  );

  assert.ok(
    customResult.completeness >=
    0.9,
  );

  assert.ok(
    customResult.taskIntelligence
      .complexity.reasons.length >
    0,
  );

  pass(
    "interpretation exposes completeness and an inspectable OH-4I task profile",
  );

  console.log("");
  console.log(
    "OH-4J input interpreter verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);