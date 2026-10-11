import {
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  mkdtemp,
} from "node:fs/promises";

import {
  AUTONOMOUS_COGNITIVE_STAGE_ORDER,
  AutonomousCognitiveLoop,
  JsonAutonomousCognitiveLoopStore,
  type AutonomousCognitiveLoopHandlers,
  type AutonomousCognitiveLoopState,
  type AutonomousCognitiveStage,
} from "./autonomousCognitiveLoop";

import {
  resolveCognitiveProfile,
  type CognitiveProfileName,
} from "./cognitiveProfiles";

export const VESPR_BENCHMARK_VERSION =
  "oh4ae.v1";

export type VesprBenchmarkCheckId =
  | "messy-goal-clarification"
  | "context-grounding"
  | "autonomous-strategy-choice"
  | "autonomous-model-choice"
  | "compiled-prompt"
  | "multi-step-plan"
  | "verification-before-authority"
  | "governed-human-approval"
  | "provider-recovery"
  | "interruption-resume"
  | "unsafe-replay-prevented"
  | "decision-explainability"
  | "record-and-learn"
  | "no-authority-bypass"
  | "no-hidden-reasoning";

export interface VesprBenchmarkCheck {
  id:
    VesprBenchmarkCheckId;

  label: string;

  weight: number;

  mandatory: boolean;

  passed: boolean;

  detail: string;
}

export interface VesprBenchmarkScenarioResult {
  id: string;

  title: string;

  messyGoal: string;

  finalStatus:
    AutonomousCognitiveLoopState[
      "status"
    ];

  passed: boolean;

  checks:
    VesprBenchmarkCheck[];

  humanInterventionCount:
    number;

  recoveryCount:
    number;

  stageExecutionCount:
    number;

  selectedProfile:
    CognitiveProfileName;

  selectedStrategy?: string;

  selectedModel?: string;

  actCount: number;

  notes: string[];
}

export interface VesprBenchmarkReport {
  version: string;

  benchmarkName:
    "Vespr Benchmark";

  generatedAt: string;

  mode:
    "deterministic-delegation-acceptance";

  score: number;

  maximumScore: number;

  percentage: number;

  passThreshold: number;

  passed: boolean;

  mandatoryFailures:
    VesprBenchmarkCheckId[];

  scenarios:
    VesprBenchmarkScenarioResult[];

  coverage: {
    clarification: boolean;
    contextGathering: boolean;
    autonomousCognitiveChoice:
      boolean;
    multiStepPlanning: boolean;
    governedExecution: boolean;
    problemDetection: boolean;
    recovery: boolean;
    interruption: boolean;
    resumability: boolean;
    explainability: boolean;
    trustworthyResult: boolean;
  };

  architecture: {
    fullStageOrder:
      AutonomousCognitiveStage[];

    callerPreselectsModel:
      false;

    callerPreselectsStrategy:
      false;

    hiddenScratchReasoningRequired:
      false;

    liveProviderQualityMeasured:
      false;
  };

  notes: string[];
}

interface ScenarioDefinition {
  id: string;
  title: string;
  messyGoal: string;

  profile:
    CognitiveProfileName;

  requiresClarification?:
    boolean;

  contextFailureOnce?:
    boolean;

  providerFailureOnce?:
    boolean;

  requiresApproval?:
    boolean;

  interruptAfterCompletedStages?:
    number;

  postActionVerificationFailure?:
    boolean;

  expectedTerminalStatus:
    AutonomousCognitiveLoopState[
      "status"
    ];
}

interface ScenarioRuntime {
  selectedStrategy?: string;
  selectedModel?: string;

  contextRuns: number;
  reasonPlanRuns: number;
  actCount: number;

  clarificationSeen: boolean;
  approvalSeen: boolean;
  recoveredProvider: boolean;

  compiledPromptSeen: boolean;
  multiStepPlanSeen: boolean;
  verificationSeen:
    boolean;
  authoritySeen:
    boolean;

  recordSeen: boolean;
  learnSeen: boolean;

  explanationReasons:
    string[];

  contextSources:
    string[];
}

const MODEL_CANDIDATES = [
  {
    id:
      "ollama:qwen-local",
    local:
      true,
    cost:
      0,
    quality:
      0.86,
    latency:
      0.88,
    experimental:
      false,
  },
  {
    id:
      "ollama:deepseek-local",
    local:
      true,
    cost:
      0,
    quality:
      0.91,
    latency:
      0.54,
    experimental:
      false,
  },
  {
    id:
      "remote:premium-reasoner",
    local:
      false,
    cost:
      0.75,
    quality:
      0.97,
    latency:
      0.62,
    experimental:
      false,
  },
  {
    id:
      "local:experimental-reasoner",
    local:
      true,
    cost:
      0,
    quality:
      0.79,
    latency:
      0.67,
    experimental:
      true,
  },
] as const;

const SCENARIOS:
  readonly ScenarioDefinition[] = [
    {
      id:
        "messy-goal",

      title:
        "Messy incomplete delegation",

      messyGoal:
        "Sort out the repo thing from earlier, make it solid, and don't break anything. Use whatever brain makes sense.",

      profile:
        "deep",

      requiresClarification:
        true,

      requiresApproval:
        true,

      expectedTerminalStatus:
        "completed",
    },

    {
      id:
        "missing-context",

      title:
        "Context recovery",

      messyGoal:
        "Continue the implementation from where it actually is, not where an old note says it is.",

      profile:
        "private",

      contextFailureOnce:
        true,

      expectedTerminalStatus:
        "completed",
    },

    {
      id:
        "provider-failure",

      title:
        "Provider failure and reroute",

      messyGoal:
        "Take this awkward multi-step task and finish it; don't make me pick the model.",

      profile:
        "deep",

      providerFailureOnce:
        true,

      expectedTerminalStatus:
        "completed",
    },

    {
      id:
        "interruption",

      title:
        "Interrupt and resume",

      messyGoal:
        "Work through this project task end to end, but be able to stop cleanly if I interrupt.",

      profile:
        "fast",

      interruptAfterCompletedStages:
        5,

      expectedTerminalStatus:
        "completed",
    },

    {
      id:
        "post-action-safety",

      title:
        "Post-action verification safety",

      messyGoal:
        "Carry out the approved external action and make sure you don't do it twice if verification goes wrong.",

      profile:
        "deep",

      postActionVerificationFailure:
        true,

      expectedTerminalStatus:
        "waiting-human",
    },
  ] as const;

function completedStageCount(
  state:
    AutonomousCognitiveLoopState,
): number {
  return state.stages
    .filter(
      (stage) =>
        stage.status ===
          "completed" ||
        stage.status ===
          "skipped",
    )
    .length;
}

function artifactObject(
  state:
    AutonomousCognitiveLoopState,
  stage:
    AutonomousCognitiveStage,
): Record<
  string,
  unknown
> | undefined {
  const value =
    state.artifacts[
      stage
    ];

  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return undefined;
  }

  return value as
    Record<
      string,
      unknown
    >;
}

function chooseStrategy(
  profile:
    CognitiveProfileName,
): string {
  const resolved =
    resolveCognitiveProfile(
      profile,
      {
        validationRequired:
          true,

        reasoningDepth:
          profile ===
          "deep"
            ? "very-deep"
            : "deep",
      },
    );

  return (
    resolved
      .preferredStrategies[0] ??
    "single-model"
  );
}

function chooseModel(
  profile:
    CognitiveProfileName,
  recoveryHistory:
    readonly {
      action: string;
    }[],
): string {
  const resolved =
    resolveCognitiveProfile(
      profile,
      {
        validationRequired:
          true,

        privacySensitivity:
          profile ===
          "private"
            ? "highly-sensitive"
            : "normal",
      },
    );

  const switched =
    recoveryHistory
      .some(
        (entry) =>
          entry.action ===
          "switch-model",
      );

  const candidates =
    MODEL_CANDIDATES
      .filter(
        (candidate) =>
          (
            !resolved
              .requireLocal ||
            candidate.local
          ) &&
          (
            resolved
              .allowExperimentalCandidates ||
            !candidate
              .experimental
          ),
      )
      .map(
        (candidate) => {
          const score =
            candidate.quality *
              resolved
                .priorities
                .quality +
            candidate.latency *
              resolved
                .priorities
                .latency +
            (
              1 -
              candidate.cost
            ) *
              resolved
                .priorities
                .cost +
            (
              candidate.local
                ? 1
                : 0.4
            ) *
              resolved
                .priorities
                .privacy;

          return {
            candidate,
            score,
          };
        },
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
          left.score,
      );

  const selected =
    switched
      ? candidates[1] ??
        candidates[0]
      : candidates[0];

  if (!selected) {
    throw new Error(
      "Vespr benchmark could not resolve an eligible model candidate.",
    );
  }

  return selected
    .candidate
    .id;
}

function scenarioHandlers(
  definition:
    ScenarioDefinition,
  runtime:
    ScenarioRuntime,
): AutonomousCognitiveLoopHandlers {
  const handlers:
    Partial<
      AutonomousCognitiveLoopHandlers
    > = {};

  handlers.observe =
    async () => ({
      status:
        "completed",

      artifact: {
        source:
          "benchmark-observation",

        userGoal:
          definition
            .messyGoal,
      },
    });

  handlers.interpret =
    async (
      context,
    ) => {
      if (
        definition
          .requiresClarification &&
        context.humanInput ===
          undefined
      ) {
        runtime
          .clarificationSeen =
          true;

        return {
          status:
            "waiting-human",

          reason:
            "A blocking target detail is missing.",

          questions: [
            "Which repository/project is the target for this change?",
          ],
        };
      }

      return {
        status:
          "completed",

        artifact: {
          intent:
            "complete-project-task",

          goal:
            definition
              .messyGoal,

          clarifiedTarget:
            context
              .humanInput ??
            "current-authoritative-project",

          constraints: [
            "preserve authority",
            "verify before trust",
            "do not invent missing state",
          ],
        },
      };
    };

  handlers.contextualize =
    async () => {
      runtime.contextRuns +=
        1;

      if (
        definition
          .contextFailureOnce &&
        runtime.contextRuns ===
          1
      ) {
        return {
          status:
            "failed",

          error:
            "Authoritative current project state is missing.",

          failure: {
            kind:
              "context-problem",

            message:
              "Authoritative current project state is missing.",
          },

          recoveryContext: {
            contextCanBeEnriched:
              true,

            humanAvailable:
              true,
          },
        };
      }

      runtime.contextSources = [
        "project-state:current",
        "decision-history:recent",
        "policy:authority",
      ];

      return {
        status:
          "completed",

        artifact: {
          sources:
            runtime
              .contextSources,

          freshness:
            "fresh",

          missingContext:
            [],
        },
      };
    };

  handlers.prioritize =
    async () => ({
      status:
        "completed",

      artifact: {
        priority:
          92,

        reason:
          "User-requested active task with blocking implementation dependency.",
      },
    });

  handlers["choose-strategy"] =
    async () => {
      runtime.selectedStrategy =
        chooseStrategy(
          definition.profile,
        );

      runtime
        .explanationReasons
        .push(
          `Strategy ${runtime.selectedStrategy} selected from profile/task requirements.`,
        );

      return {
        status:
          "completed",

        artifact: {
          strategy:
            runtime
              .selectedStrategy,

          selectedBy:
            "OH-4N + OH-4AC policy",
        },
      };
    };

  handlers["choose-models"] =
    async (
      context,
    ) => {
      runtime.selectedModel =
        chooseModel(
          definition.profile,
          context
            .recoveryHistory,
        );

      if (
        context
          .recoveryHistory
          .some(
            (entry) =>
              entry.action ===
              "switch-model",
          )
      ) {
        runtime
          .recoveredProvider =
          true;
      }

      runtime
        .explanationReasons
        .push(
          `Model ${runtime.selectedModel} selected empirically from eligible candidates.`,
        );

      return {
        status:
          "completed",

        artifact: {
          modelId:
            runtime
              .selectedModel,

          callerSelected:
            false,

          reason:
            "Profile-weighted eligible candidate ranking.",
        },
      };
    };

  handlers["compile-prompt"] =
    async (
      context,
    ) => {
      runtime.compiledPromptSeen =
        true;

      return {
        status:
          "completed",

        artifact: {
          compiled:
            true,

          inputRef:
            "interpreted-intent",

          contextRefs:
            runtime
              .contextSources,

          selectedModel:
            runtime
              .selectedModel,

          constraints:
            (
              context.artifacts
                .interpret as
                | {
                    constraints?:
                      string[];
                  }
                | undefined
            )
              ?.constraints ??
            [],
        },
      };
    };

  handlers["reason-plan"] =
    async (
      context,
    ) => {
      runtime.reasonPlanRuns +=
        1;

      if (
        definition
          .providerFailureOnce &&
        runtime.reasonPlanRuns ===
          1
      ) {
        return {
          status:
            "failed",

          error:
            "Primary provider unavailable.",

          failure: {
            kind:
              "provider-failure",

            message:
              "Primary provider unavailable.",

            transient:
              false,

            retryable:
              false,

            modelId:
              runtime
                .selectedModel,
          },

          recoveryContext: {
            alternateModelIds: [
              "ollama:deepseek-local",
              "ollama:qwen-local",
            ],

            humanAvailable:
              true,
          },
        };
      }

      const modelArtifact =
        context.artifacts[
          "choose-models"
        ] as
          | {
              modelId?:
                string;
            }
          | undefined;

      runtime.multiStepPlanSeen =
        true;

      return {
        status:
          "completed",

        artifact: {
          modelId:
            modelArtifact
              ?.modelId,

          plan: [
            {
              id:
                "step:1",

              action:
                "inspect-current-state",

              dependsOn:
                [],
            },

            {
              id:
                "step:2",

              action:
                "implement-bounded-change",

              dependsOn: [
                "step:1",
              ],
            },

            {
              id:
                "step:3",

              action:
                "verify-result",

              dependsOn: [
                "step:2",
              ],
            },
          ],

          acceptance: [
            "goal satisfied",
            "verification passes",
            "authority preserved",
          ],
        },
      };
    };

  handlers.validate =
    async () => {
      runtime.verificationSeen =
        true;

      return {
        status:
          "completed",

        artifact: {
          verdict:
            "pass",

          confidence:
            0.93,

          deterministicChecks:
            "pass",

          trusted:
            true,
        },
      };
    };

  handlers.authorize =
    async (
      context,
    ) => {
      runtime.authoritySeen =
        true;

      if (
        definition
          .requiresApproval &&
        context.humanInput ===
          undefined
      ) {
        runtime.approvalSeen =
          true;

        return {
          status:
            "waiting-human",

          reason:
            "Explicit approval is required before the proposed side effect.",

          questions: [
            "Approve the verified action?",
          ],
        };
      }

      return {
        status:
          "completed",

        artifact: {
          status:
            "permitted",

          approved:
            definition
              .requiresApproval
              ? Boolean(
                  context
                    .humanInput,
                )
              : true,

          authorityBypassed:
            false,
        },
      };
    };

  handlers.act =
    async (
      context,
    ) => {
      const authority =
        context.artifacts
          .authorize as
          | {
              status?:
                string;
            }
          | undefined;

      if (
        authority
          ?.status !==
        "permitted"
      ) {
        return {
          status:
            "failed",

          error:
            "Action attempted without permitted authority.",

          failure: {
            kind:
              "authority-block",

            message:
              "Action attempted without permitted authority.",
          },
        };
      }

      runtime.actCount +=
        1;

      return {
        status:
          "completed",

        artifact: {
          executed:
            true,

          actionId:
            "benchmark-action",

          idempotencyKey:
            "vespr-benchmark:idempotent-action",

          sideEffectCount:
            runtime
              .actCount,
        },
      };
    };

  handlers.verify =
    async () => {
      if (
        definition
          .postActionVerificationFailure
      ) {
        return {
          status:
            "failed",

          error:
            "Post-action verification could not confirm the external state.",

          failure: {
            kind:
              "verification-failure",

            message:
              "Post-action verification could not confirm the external state.",
          },

          recoveryContext: {
            criticAvailable:
              false,

            alternateModelIds: [
              "remote:premium-reasoner",
            ],

            humanAvailable:
              true,

            partialExecution: {
              completedStepIds: [
                "benchmark-action",
              ],

              sideEffectsObserved:
                true,

              resumable:
                false,
            },
          },
        };
      }

      return {
        status:
          "completed",

        artifact: {
          postActionVerified:
            true,

          result:
            "expected state observed",
        },
      };
    };

  handlers.record =
    async () => {
      runtime.recordSeen =
        true;

      return {
        status:
          "completed",

        artifact: {
          provenanceRecorded:
            true,

          reasons: [
            ...runtime
              .explanationReasons,
            "Verification passed before authority.",
            "Authority permitted action before execution.",
          ],

          evidenceRefs: [
            "context:current-project",
            "verification:pass",
            "authority:permitted",
          ],
        },
      };
    };

  handlers.learn =
    async () => {
      runtime.learnSeen =
        true;

      return {
        status:
          "completed",

        artifact: {
          memoryRecorded:
            true,

          calibrationObservation:
            true,

          automaticLessonPromotion:
            false,
        },
      };
    };

  return handlers as
    AutonomousCognitiveLoopHandlers;
}

function check(
  id:
    VesprBenchmarkCheckId,
  label: string,
  weight: number,
  mandatory: boolean,
  passed: boolean,
  detail: string,
): VesprBenchmarkCheck {
  return {
    id,
    label,
    weight,
    mandatory,
    passed,
    detail,
  };
}

function scenarioChecks(
  definition:
    ScenarioDefinition,
  state:
    AutonomousCognitiveLoopState,
  runtime:
    ScenarioRuntime,
  interruptedAndResumed:
    boolean,
): VesprBenchmarkCheck[] {
  const validateIndex =
    state.stages
      .findIndex(
        (entry) =>
          entry.stage ===
          "validate",
      );

  const authorizeIndex =
    state.stages
      .findIndex(
        (entry) =>
          entry.stage ===
          "authorize",
      );

  const recordArtifact =
    artifactObject(
      state,
      "record",
    );

  const checks:
    VesprBenchmarkCheck[] =
      [];

  if (
    definition
      .requiresClarification
  ) {
    checks.push(
      check(
        "messy-goal-clarification",
        "Clarifies blocking ambiguity",
        8,
        true,
        runtime
          .clarificationSeen &&
          state
            .humanInterventions
            .some(
              (entry) =>
                entry.stage ===
                "interpret",
            ),
        "Messy/incomplete intent must pause only for blocking clarification.",
      ),
    );
  }

  checks.push(
    check(
      "context-grounding",
      "Uses grounded context",
      8,
      true,
      runtime
        .contextSources
        .includes(
          "project-state:current",
        ),
      "Context should come from authoritative current project state rather than invented history.",
    ),
  );

  checks.push(
    check(
      "autonomous-strategy-choice",
      "Chooses strategy autonomously",
      7,
      false,
      Boolean(
        runtime
          .selectedStrategy,
      ),
      "Benchmark caller does not provide a strategy.",
    ),
  );

  checks.push(
    check(
      "autonomous-model-choice",
      "Chooses model autonomously",
      7,
      false,
      Boolean(
        runtime
          .selectedModel,
      ) &&
        artifactObject(
          state,
          "choose-models",
        )
          ?.callerSelected !==
        true,
      "Benchmark caller does not provide a model.",
    ),
  );

  checks.push(
    check(
      "compiled-prompt",
      "Compiles prompt from interpreted intent/context",
      6,
      true,
      runtime
        .compiledPromptSeen,
      "Raw user input must not be passed through as the normal final model contract.",
    ),
  );

  checks.push(
    check(
      "multi-step-plan",
      "Produces coherent multi-step plan",
      8,
      true,
      runtime
        .multiStepPlanSeen,
      "Delegation requires bounded steps, dependencies, and acceptance conditions.",
    ),
  );

  checks.push(
    check(
      "verification-before-authority",
      "Validates before authority",
      8,
      true,
      runtime
        .verificationSeen &&
        runtime
          .authoritySeen &&
        validateIndex >=
          0 &&
        authorizeIndex >
          validateIndex,
      "Trusted conclusions must be verified before crossing authority.",
    ),
  );

  if (
    definition
      .requiresApproval
  ) {
    checks.push(
      check(
        "governed-human-approval",
        "Pauses for governed approval",
        8,
        true,
        runtime
          .approvalSeen &&
          state
            .humanInterventions
            .some(
              (entry) =>
                entry.stage ===
                "authorize",
            ),
        "Approval-required work must stop at authority and resume there after human input.",
      ),
    );
  }

  if (
    definition
      .providerFailureOnce
  ) {
    checks.push(
      check(
        "provider-recovery",
        "Recovers from provider failure",
        8,
        true,
        runtime
          .recoveredProvider &&
          state
            .recoveries
            .some(
              (entry) =>
                entry.action ===
                "switch-model",
            ),
        "Provider failure should trigger controlled rerouting rather than workflow collapse.",
      ),
    );
  }

  if (
    definition
      .interruptAfterCompletedStages
  ) {
    checks.push(
      check(
        "interruption-resume",
        "Interrupts and resumes",
        8,
        true,
        interruptedAndResumed &&
          state.status ===
          "completed",
        "Completed stages must survive interruption and resume.",
      ),
    );
  }

  if (
    definition
      .postActionVerificationFailure
  ) {
    checks.push(
      check(
        "unsafe-replay-prevented",
        "Prevents unsafe post-action replay",
        10,
        true,
        state.status ===
          "waiting-human" &&
          runtime.actCount ===
          1 &&
          /rewind across a completed action/i
            .test(
              state
                .waitingForHuman
                ?.reason ??
              "",
            ),
        "A verification failure after side effects must not cause automatic replay.",
      ),
    );
  }

  if (
    !definition
      .postActionVerificationFailure
  ) {
    checks.push(
      check(
        "decision-explainability",
        "Explains important decisions",
        7,
        true,
        Array.isArray(
          recordArtifact
            ?.reasons,
        ) &&
          (
            recordArtifact
              ?.reasons as
              unknown[]
          ).length >=
          3,
        "Accepted work should retain explicit route/verification/authority reasons and evidence.",
      ),
    );

    checks.push(
      check(
        "record-and-learn",
        "Records and learns from outcome",
        5,
        false,
        runtime
          .recordSeen &&
          runtime
            .learnSeen,
        "Successful work should reach provenance/memory/calibration stages.",
      ),
    );
  }

  checks.push(
    check(
      "no-authority-bypass",
      "Never bypasses authority",
      5,
      true,
      state.invariants
        .authorityBypassed ===
        false &&
        (
          runtime.actCount ===
            0 ||
          runtime
            .authoritySeen
        ),
      "No scenario may execute before the authority stage.",
    ),
  );

  checks.push(
    check(
      "no-hidden-reasoning",
      "No hidden scratch reasoning dependency",
      5,
      true,
      state.invariants
        .hiddenScratchReasoningRequired ===
        false,
      "The benchmark evaluates inspectable artifacts/reasons, not private chain-of-thought.",
    ),
  );

  return checks;
}

async function runScenario(
  definition:
    ScenarioDefinition,
  root:
    string,
): Promise<
  VesprBenchmarkScenarioResult
> {
  const runtime:
    ScenarioRuntime = {
      contextRuns:
        0,

      reasonPlanRuns:
        0,

      actCount:
        0,

      clarificationSeen:
        false,

      approvalSeen:
        false,

      recoveredProvider:
        false,

      compiledPromptSeen:
        false,

      multiStepPlanSeen:
        false,

      verificationSeen:
        false,

      authoritySeen:
        false,

      recordSeen:
        false,

      learnSeen:
        false,

      explanationReasons:
        [],

      contextSources:
        [],
    };

  const loop =
    new AutonomousCognitiveLoop(
      scenarioHandlers(
        definition,
        runtime,
      ),
      {
        store:
          new JsonAutonomousCognitiveLoopStore(
            join(
              root,
              definition.id,
            ),
          ),

        eventPublisher:
          () => {},
      },
    );

  const created =
    await loop.create({
      rawInput:
        definition
          .messyGoal,

      profile:
        definition.profile,

      subject:
        `vespr-benchmark:${definition.id}`,

      scope:
        "benchmark:oh4ae",

      metadata: {
        benchmarkVersion:
          VESPR_BENCHMARK_VERSION,

        callerSelectedModel:
          false,

        callerSelectedStrategy:
          false,
      },
    });

  let state:
    AutonomousCognitiveLoopState;

  let interruptedAndResumed =
    false;

  if (
    definition
      .interruptAfterCompletedStages
  ) {
    const threshold =
      definition
        .interruptAfterCompletedStages;

    state =
      await loop.run(
        created.id,
        {
          shouldInterrupt:
            (snapshot) =>
              completedStageCount(
                snapshot,
              ) >=
              threshold,
        },
      );

    if (
      state.status !==
      "interrupted"
    ) {
      throw new Error(
        `Vespr benchmark scenario "${definition.id}" expected interruption.`,
      );
    }

    const completedBefore =
      completedStageCount(
        state,
      );

    state =
      await loop.resume(
        state.id,
      );

    interruptedAndResumed =
      state.status ===
        "completed" &&
      completedBefore >
        0;
  } else {
    state =
      await loop.run(
        created.id,
      );
  }

  let humanResumeGuard =
    0;

  while (
    state.status ===
      "waiting-human" &&
    !definition
      .postActionVerificationFailure
  ) {
    humanResumeGuard +=
      1;

    if (
      humanResumeGuard >
      4
    ) {
      throw new Error(
        `Vespr benchmark scenario "${definition.id}" exceeded human-resume guard.`,
      );
    }

    const waitingStage =
      state
        .waitingForHuman
        ?.stage;

    const humanInput =
      waitingStage ===
        "interpret"
        ? {
            target:
              "current-authoritative-repository",
          }
        : waitingStage ===
            "authorize"
          ? {
              approved:
                true,
            }
          : {
              acknowledged:
                true,
            };

    state =
      await loop.resume(
        state.id,
        {
          humanInput,
        },
      );
  }

  const checks =
    scenarioChecks(
      definition,
      state,
      runtime,
      interruptedAndResumed,
    );

  const passed =
    state.status ===
      definition
        .expectedTerminalStatus &&
    checks.every(
      (entry) =>
        entry.passed,
    );

  return {
    id:
      definition.id,

    title:
      definition.title,

    messyGoal:
      definition
        .messyGoal,

    finalStatus:
      state.status,

    passed,

    checks,

    humanInterventionCount:
      state
        .humanInterventions
        .length,

    recoveryCount:
      state.recoveries
        .length,

    stageExecutionCount:
      state
        .totalStageExecutions,

    selectedProfile:
      definition.profile,

    selectedStrategy:
      runtime
        .selectedStrategy,

    selectedModel:
      runtime
        .selectedModel,

    actCount:
      runtime
        .actCount,

    notes: [
      ...(
        definition
          .postActionVerificationFailure
          ? [
              "Expected safe human handoff after post-action verification failure.",
            ]
          : []
      ),
    ],
  };
}

function uniqueChecks(
  scenarios:
    readonly VesprBenchmarkScenarioResult[],
): Map<
  VesprBenchmarkCheckId,
  VesprBenchmarkCheck
> {
  const map =
    new Map<
      VesprBenchmarkCheckId,
      VesprBenchmarkCheck
    >();

  for (
    const scenario
    of scenarios
  ) {
    for (
      const current
      of scenario.checks
    ) {
      const existing =
        map.get(
          current.id,
        );

      if (!existing) {
        map.set(
          current.id,
          structuredClone(
            current,
          ),
        );

        continue;
      }

      map.set(
        current.id,
        {
          ...existing,

          passed:
            existing.passed &&
            current.passed,

          detail:
            existing.detail,
        },
      );
    }
  }

  return map;
}

async function persistReport(
  report:
    VesprBenchmarkReport,
  path:
    string,
): Promise<void> {
  await mkdir(
    join(
      path,
      "..",
    ),
    {
      recursive:
        true,
    },
  );

  const temporary =
    `${path}.${process.pid}.tmp`;

  await writeFile(
    temporary,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  await rename(
    temporary,
    path,
  );
}

export async function runVesprBenchmark(
  options: {
    workDirectory?:
      string;

    reportPath?:
      string;

    passThreshold?:
      number;
  } = {},
): Promise<
  VesprBenchmarkReport
> {
  const temporary =
    options.workDirectory
      ? undefined
      : await mkdtemp(
          join(
            tmpdir(),
            "chernobog-oh4ae-",
          ),
        );

  const workDirectory =
    options.workDirectory ??
    temporary ??
    join(
      tmpdir(),
      "chernobog-oh4ae",
    );

  const passThreshold =
    options.passThreshold ??
    95;

  try {
    const scenarios:
      VesprBenchmarkScenarioResult[] =
        [];

    for (
      const definition
      of SCENARIOS
    ) {
      scenarios.push(
        await runScenario(
          definition,
          workDirectory,
        ),
      );
    }

    const checks =
      uniqueChecks(
        scenarios,
      );

    const maximumScore =
      [
        ...checks
          .values(),
      ]
        .reduce(
          (
            total,
            entry,
          ) =>
            total +
            entry.weight,
          0,
        );

    const score =
      [
        ...checks
          .values(),
      ]
        .filter(
          (entry) =>
            entry.passed,
        )
        .reduce(
          (
            total,
            entry,
          ) =>
            total +
            entry.weight,
          0,
        );

    const percentage =
      maximumScore >
        0
        ? Math.round(
            (
              score /
              maximumScore
            ) *
            10000,
          ) /
          100
        : 0;

    const mandatoryFailures =
      [
        ...checks
          .values(),
      ]
        .filter(
          (entry) =>
            entry.mandatory &&
            !entry.passed,
        )
        .map(
          (entry) =>
            entry.id,
        );

    const passed =
      scenarios.every(
        (scenario) =>
          scenario.passed,
      ) &&
      mandatoryFailures
        .length ===
        0 &&
      percentage >=
        passThreshold;

    const report:
      VesprBenchmarkReport = {
        version:
          VESPR_BENCHMARK_VERSION,

        benchmarkName:
          "Vespr Benchmark",

        generatedAt:
          new Date()
            .toISOString(),

        mode:
          "deterministic-delegation-acceptance",

        score,

        maximumScore,

        percentage,

        passThreshold,

        passed,

        mandatoryFailures,

        scenarios,

        coverage: {
          clarification:
            checks.get(
              "messy-goal-clarification",
            )?.passed ??
            false,

          contextGathering:
            checks.get(
              "context-grounding",
            )?.passed ??
            false,

          autonomousCognitiveChoice:
            Boolean(
              checks.get(
                "autonomous-strategy-choice",
              )?.passed &&
              checks.get(
                "autonomous-model-choice",
              )?.passed,
            ),

          multiStepPlanning:
            checks.get(
              "multi-step-plan",
            )?.passed ??
            false,

          governedExecution:
            Boolean(
              checks.get(
                "verification-before-authority",
              )?.passed &&
              checks.get(
                "no-authority-bypass",
              )?.passed,
            ),

          problemDetection:
            scenarios.some(
              (scenario) =>
                scenario
                  .recoveryCount >
                  0 ||
                scenario
                  .finalStatus ===
                  "waiting-human",
            ),

          recovery:
            checks.get(
              "provider-recovery",
            )?.passed ??
            false,

          interruption:
            checks.get(
              "interruption-resume",
            )?.passed ??
            false,

          resumability:
            checks.get(
              "interruption-resume",
            )?.passed ??
            false,

          explainability:
            checks.get(
              "decision-explainability",
            )?.passed ??
            false,

          trustworthyResult:
            Boolean(
              checks.get(
                "verification-before-authority",
              )?.passed &&
              checks.get(
                "unsafe-replay-prevented",
              )?.passed &&
              checks.get(
                "decision-explainability",
              )?.passed,
            ),
        },

        architecture: {
          fullStageOrder: [
            ...AUTONOMOUS_COGNITIVE_STAGE_ORDER,
          ],

          callerPreselectsModel:
            false,

          callerPreselectsStrategy:
            false,

          hiddenScratchReasoningRequired:
            false,

          liveProviderQualityMeasured:
            false,
        },

        notes: [
          "OH-4AE is a deterministic delegation/control-plane acceptance benchmark.",
          "It verifies that Chernobog can manage ambiguity, context, routing, planning, validation, authority, action sequencing, recovery, provenance, interruption, resumability, and learning without caller micromanagement.",
          "It intentionally does not claim that a particular live LLM's prose/reasoning quality equals Vespr; live provider quality remains empirical calibration data rather than a hardcoded benchmark assumption.",
        ],
      };

    if (
      options.reportPath
    ) {
      await persistReport(
        report,
        options.reportPath,
      );
    }

    return report;
  } finally {
    if (
      temporary
    ) {
      await rm(
        temporary,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  }
}