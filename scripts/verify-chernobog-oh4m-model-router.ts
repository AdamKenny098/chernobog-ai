import assert from "node:assert/strict";

import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

import {
  MODEL_ROUTER_VERSION,
  ModelRouter,
  type ModelRoutingCandidate,
} from "@chernobog/models/modelDecisionRouter";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function candidate(
  input: {
    id: string;
    provider?: string;
    model?: string;
    local?: boolean;
    enabled?: boolean;
    availability?: "available" | "unavailable" | "unknown";
    capabilities?: string[];
    strengths?: string[];
    tags?: string[];
    promptLeavesDevice?: boolean | null;
    costMode?: "local-compute" | "metered" | "subscription" | "unknown";
    inputCost?: number;
    outputCost?: number;
  },
): ModelRoutingCandidate {
  const parts =
    input.id.split(
      ":",
    );

  const provider =
    input.provider ??
    parts[0] ??
    "test";

  const model =
    input.model ??
    (
      parts
        .slice(
          1,
        )
        .join(":") ||
      input.id
    );

  const local =
    input.local ??
    false;

  return {
    id:
      input.id,
    provider,
    model,
    displayName:
      input.id,
    enabled:
      input.enabled ??
      true,
    availability:
      input.availability ??
      "available",
    local,
    roles:
      [],
    capabilities:
      input.capabilities ??
      [],
    contextLimits: {
      known:
        false,
    },
    cost: {
      known:
        input.costMode ===
          "metered",
      mode:
        input.costMode ??
        (
          local
            ? "local-compute"
            : "unknown"
        ),
      inputPerMillionTokens:
        input.inputCost,
      outputPerMillionTokens:
        input.outputCost,
    },
    privacy: {
      execution:
        local
          ? "local"
          : "remote",
      promptLeavesDevice:
        input
          .promptLeavesDevice ??
        (
          local
            ? false
            : true
        ),
      retention:
        local
          ? "local-runtime"
          : "provider-policy",
    },
    strengths:
      input.strengths ??
      [],
    weaknesses:
      [],
    tags:
      input.tags ??
      [],
  };
}

async function interpretationFor(
  options: {
    domain?: "general" | "conversation" | "planning" | "coding" | "research" | "factual" | "creative" | "personal-assistance" | "system-operations" | "data-analysis" | "other";
    privacy?: "public" | "internal" | "personal" | "sensitive" | "highly-sensitive";
    latency?: "immediate" | "interactive" | "flexible" | "batch";
    cost?: "minimal" | "low" | "standard" | "high";
    factuality?: "low" | "medium" | "high" | "critical";
    complexity?: "trivial" | "simple" | "moderate" | "complex" | "very-complex";
    creativity?: "none" | "low" | "medium" | "high";
    reasoningDepth?: "shallow" | "moderate" | "deep" | "very-deep";
  } = {},
) {
  const domain =
    options.domain ??
    "coding";

  const interpreter =
    new InputInterpreter(
      async () => ({
        intentKind:
          "create",
        goal:
          "Create a safe implementation plan",
        desiredOutcome:
          "A correct implementation plan",
        explicitConstraints: [],
        unresolvedQuestions: [],
        domains: [
          domain,
        ],
        estimatedSteps:
          6,
        dependencyCount:
          3,
        ambiguityLevel:
          0.05,
        noveltyLevel:
          0.4,
        creativeGeneration:
          options.creativity ===
            "high"
            ? 0.9
            : 0.1,
        factualVerification:
          options.factuality ===
            "critical"
            ? 1
            : 0.8,
        evidenceDependency:
          0.8,
        consequenceSeverity:
          options.factuality ===
            "critical"
            ? 1
            : 0.6,
        reasoningSteps:
          options.reasoningDepth ===
            "very-deep"
            ? 12
            : 6,
        crossDomainReasoning:
          false,
        containsPersonalData:
          options.privacy ===
            "personal" ||
          options.privacy ===
            "sensitive" ||
          options.privacy ===
            "highly-sensitive",
        containsSecrets:
          options.privacy ===
            "sensitive" ||
          options.privacy ===
            "highly-sensitive",
        containsCredentials:
          options.privacy ===
            "highly-sensitive",
        requestedLatencyMs:
          options.latency ===
            "immediate"
            ? 1_000
            : options.latency ===
                "interactive"
              ? 4_000
              : undefined,
        canRunAsynchronously:
          options.latency ===
            "batch",
        minimizeCost:
          options.cost ===
            "minimal" ||
          options.cost ===
            "low",
        confidence:
          0.97,
      }),
    );

  const result =
    await interpreter
      .interpret({
        modality:
          "typed",
        text:
          "Create a safe implementation plan.",
      });

  return result;
}

async function main() {
  console.log(
    "Chernobog OH-4M â€” Model Router Verification",
  );
  console.log(
    "===========================================",
  );

  const candidates = [
    candidate({
      id:
        "ollama:coder",
      local:
        true,
      capabilities: [
        "coding",
        "planning",
      ],
      strengths: [
        "coding",
      ],
      tags: [
        "coding",
      ],
    }),
    candidate({
      id:
        "remote:general",
      local:
        false,
      capabilities: [
        "general",
        "coding",
      ],
      strengths: [
        "general",
      ],
      costMode:
        "metered",
      inputCost:
        2,
      outputCost:
        8,
    }),
    candidate({
      id:
        "ollama:disabled",
      local:
        true,
      enabled:
        false,
      capabilities: [
        "coding",
      ],
    }),
    candidate({
      id:
        "ollama:offline",
      local:
        true,
      availability:
        "unavailable",
      capabilities: [
        "coding",
      ],
    }),
  ];

  const router =
    new ModelRouter(
      async () =>
        structuredClone(
          candidates,
        ),
    );

  const coding =
    await interpretationFor({
      domain:
        "coding",
      factuality:
        "high",
      reasoningDepth:
        "deep",
    });

  const routed =
    await router.route({
      interpretation:
        coding,
      evidence: {
        objectiveCalibration: {
          "ollama:coder": {
            score:
              0.94,
            confidence:
              0.9,
            sampleCount:
              20,
          },
          "remote:general": {
            score:
              0.72,
            confidence:
              0.9,
            sampleCount:
              20,
          },
        },
        subjectivePreference: {
          "ollama:coder": {
            score:
              0.45,
            confidence:
              0.8,
          },
          "remote:general": {
            score:
              0.99,
            confidence:
              0.8,
          },
        },
        telemetry: {
          "ollama:coder": {
            successRate:
              0.96,
            averageLatencyMs:
              3_000,
            confidence:
              0.9,
          },
          "remote:general": {
            successRate:
              0.95,
            averageLatencyMs:
              2_000,
            confidence:
              0.9,
          },
        },
      },
    });

  assert.equal(
    routed.version,
    MODEL_ROUTER_VERSION,
  );

  assert.equal(
    routed.status,
    "selected",
  );

  assert.equal(
    routed.selected
      ?.candidate.id,
    "ollama:coder",
  );

  pass(
    "objective calibration and task fit can outweigh subjective preference without conflating the two",
  );

  const disabled =
    routed.ranking.find(
      (entry) =>
        entry.candidate.id ===
        "ollama:disabled",
    );

  const offline =
    routed.ranking.find(
      (entry) =>
        entry.candidate.id ===
        "ollama:offline",
    );

  assert.equal(
    disabled?.eligible,
    false,
  );

  assert.equal(
    offline?.eligible,
    false,
  );

  assert.ok(
    disabled
      ?.exclusionReasons
      .some(
        (reason) =>
          /disabled/.test(
            reason,
          ),
      ),
  );

  assert.ok(
    offline
      ?.exclusionReasons
      .some(
        (reason) =>
          /unavailable/.test(
            reason,
          ),
      ),
  );

  pass(
    "disabled and unavailable registry candidates are excluded before selection",
  );

  const preferenceComponent =
    routed.selected
      ?.components
      .find(
        (entry) =>
          entry.component ===
          "subjective-preference",
      );

  const objectiveComponent =
    routed.selected
      ?.components
      .find(
        (entry) =>
          entry.component ===
          "objective-calibration",
      );

  assert.equal(
    preferenceComponent
      ?.evidence,
    "measured",
  );

  assert.equal(
    objectiveComponent
      ?.evidence,
    "measured",
  );

  assert.notEqual(
    preferenceComponent
      ?.score,
    objectiveComponent
      ?.score,
  );

  pass(
    "route provenance preserves subjective preference separately from objective capability",
  );

  const sensitive =
    await interpretationFor({
      domain:
        "coding",
      privacy:
        "highly-sensitive",
    });

  const privacyRouted =
    await router.route({
      interpretation:
        sensitive,
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

  assert.equal(
    privacyRouted.selected
      ?.candidate.id,
    "ollama:coder",
  );

  const remoteSensitive =
    privacyRouted.ranking
      .find(
        (entry) =>
          entry.candidate.id ===
          "remote:general",
      );

  assert.equal(
    remoteSensitive
      ?.eligible,
    false,
  );

  assert.ok(
    remoteSensitive
      ?.exclusionReasons
      .some(
        (reason) =>
          /highly-sensitive|requires local execution/.test(
            reason,
          ),
      ),
  );

  pass(
    "highly-sensitive tasks hard-filter models whose prompts leave the local machine",
  );

  const unknownEvidence =
    await new ModelRouter(
      () => [
        candidate({
          id:
            "ollama:a",
          local:
            true,
          capabilities: [
            "coding",
          ],
        }),
        candidate({
          id:
            "ollama:b",
          local:
            true,
          capabilities: [
            "general",
          ],
        }),
      ],
    ).route({
      interpretation:
        coding,
    });

  assert.equal(
    unknownEvidence.status,
    "selected",
  );

  assert.ok(
    unknownEvidence.warnings
      .some(
        (warning) =>
          /lacked measured\/declared evidence/.test(
            warning,
          ),
      ),
  );

  assert.ok(
    unknownEvidence.ranking
      .every(
        (entry) =>
          entry.reasons
            .length >
          0,
      ),
  );

  pass(
    "missing calibration/telemetry/preferences degrade to explicit neutral evidence rather than fabricated performance",
  );

  const none =
    await router.route({
      interpretation:
        sensitive,
      constraints: {
        requiredModelIds: [
          "remote:general",
        ],
        allowRemote:
          false,
      },
    });

  assert.equal(
    none.status,
    "no-eligible-candidate",
  );

  assert.equal(
    none.selected,
    undefined,
  );

  pass(
    "router returns an explicit no-eligible-candidate result instead of silently violating constraints",
  );

  console.log("");
  console.log(
    "OH-4M model router verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);