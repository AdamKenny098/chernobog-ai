import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

import {
  ModelRouter,
  type ModelRoutingCandidate,
} from "@chernobog/models/modelDecisionRouter";

function candidate(
  input: {
    id: string;
    local?: boolean;
    capabilities?: string[];
    costMode?: "local-compute" | "metered" | "subscription" | "unknown";
    inputCost?: number;
    outputCost?: number;
  },
): ModelRoutingCandidate {
  const parts =
    input.id.split(":");

  const provider =
    parts[0] ?? "test";

  const model =
    parts.slice(1).join(":") ||
    input.id;

  const local =
    input.local ?? false;

  return {
    id:
      input.id,
    provider,
    model,
    displayName:
      input.id,
    enabled:
      true,
    availability:
      "available",
    local,
    roles:
      [],
    capabilities:
      input.capabilities ?? [],
    contextLimits: {
      known:
        false,
    },
    cost: {
      known:
        input.costMode === "metered",
      mode:
        input.costMode ??
        (local ? "local-compute" : "unknown"),
      inputPerMillionTokens:
        input.inputCost,
      outputPerMillionTokens:
        input.outputCost,
    },
    privacy: {
      execution:
        local ? "local" : "remote",
      promptLeavesDevice:
        local ? false : true,
      retention:
        local ? "local-runtime" : "provider-policy",
    },
    strengths:
      [],
    weaknesses:
      [],
    tags:
      [],
  };
}

async function main() {
  const interpreter =
    new InputInterpreter(
      async () => ({
        intentKind:
          "create",
        goal:
          "Create a safe implementation plan",
        desiredOutcome:
          "A correct implementation plan",
        explicitConstraints:
          [],
        unresolvedQuestions:
          [],
        domains: [
          "coding",
        ],
        estimatedSteps:
          6,
        dependencyCount:
          3,
        ambiguityLevel:
          0.05,
        noveltyLevel:
          0.4,
        factualVerification:
          0.8,
        evidenceDependency:
          0.8,
        consequenceSeverity:
          0.6,
        reasoningSteps:
          6,
        crossDomainReasoning:
          false,
        personalData:
          true,
        secrets:
          true,
        credentials:
          true,
        confidence:
          0.97,
      }),
    );

  const interpretation =
    await interpreter.interpret({
      modality:
        "typed",
      text:
        "Create a safe implementation plan.",
    });

  console.log("");
  console.log("=== OH-4I PRIVACY OUTPUT ===");
  console.log(JSON.stringify({
    privacySensitivity:
      interpretation
        .taskIntelligence
        .privacySensitivity,
    derived:
      interpretation
        .taskIntelligence
        .derived,
    taskSignals:
      interpretation
        .taskSignals,
  }, null, 2));

  const router =
    new ModelRouter(
      () => [
        candidate({
          id:
            "ollama:coder",
          local:
            true,
          capabilities: [
            "coding",
          ],
        }),
        candidate({
          id:
            "remote:general",
          local:
            false,
          capabilities: [
            "coding",
          ],
          costMode:
            "metered",
          inputCost:
            2,
          outputCost:
            8,
        }),
      ],
    );

  const decision =
    await router.route({
      interpretation,
      evidence: {
        objectiveCalibration: {
          "ollama:coder": {
            score:
              0.8,
            confidence:
              0.8,
          },
          "remote:general": {
            score:
              0.99,
            confidence:
              0.95,
          },
        },
      },
    });

  console.log("");
  console.log("=== OH-4M DECISION ===");
  console.log(JSON.stringify({
    status:
      decision.status,
    selected:
      decision.selected
        ?.candidate.id,
    ranking:
      decision.ranking.map(
        (entry) => ({
          id:
            entry.candidate.id,
          eligible:
            entry.eligible,
          score:
            entry.score,
          confidence:
            entry.confidence,
          exclusionReasons:
            entry.exclusionReasons,
          privacyComponent:
            entry.components.find(
              (component) =>
                component.component ===
                "privacy",
            ),
        }),
      ),
  }, null, 2));
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);