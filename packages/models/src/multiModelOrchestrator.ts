import type {
  CompiledPrompt,
} from "./promptCompiler";

import type {
  ModelRouteDecision,
  ModelRoutingCandidate,
  RankedModelCandidate,
} from "./modelDecisionRouter";

import type {
  CognitiveStrategyKind,
  StrategyRouteDecision,
} from "./strategyRouter";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const MULTI_MODEL_ORCHESTRATOR_VERSION =
  "oh4s.v1";

export type CognitiveModelPassKind =
  | "primary"
  | "secondary"
  | "critic"
  | "refinement"
  | "fallback";

export interface CognitiveModelExecutionRequest {
  candidate:
    ModelRoutingCandidate;

  pass:
    CognitiveModelPassKind;

  purpose: string;

  prompt: string;

  timeoutMs?: number;
}

export interface CognitiveModelExecutionResult {
  ok: boolean;

  text?: string;
  error?: string;

  provider?: string;
  model?: string;

  latencyMs?: number;
  confidence?: number;

  metadata?: Record<
    string,
    unknown
  >;
}

export type CognitiveModelExecutor =
  (
    request:
      CognitiveModelExecutionRequest,
  ) =>
    Promise<
      CognitiveModelExecutionResult
    >;

export interface MultiModelOrchestrationRun {
  id: string;

  sequence: number;

  candidateId: string;
  pass:
    CognitiveModelPassKind;

  purpose: string;

  ok: boolean;

  text?: string;
  error?: string;

  provider?: string;
  model?: string;

  latencyMs?: number;
  confidence?: number;

  routeScore?: number;
  routeConfidence?: number;

  retainedAsAuditArtifact: boolean;
}

export type MultiModelOrchestrationStatus =
  | "completed"
  | "partial"
  | "blocked"
  | "failed";

export interface MultiModelOrchestrationResult {
  version: string;
  startedAt: string;
  completedAt: string;

  status:
    MultiModelOrchestrationStatus;

  strategy:
    CognitiveStrategyKind;

  selectedModelId?:
    string;

  finalText?: string;

  finalSourceRunId?: string;

  runs:
    MultiModelOrchestrationRun[];

  blockedRequirements: string[];

  warnings: string[];

  provenance: {
    promptCompilerVersion:
      string;
    modelRouterVersion:
      string;
    strategyRouterVersion:
      string;
    reasoningContractVersion:
      string;
  };

  invariants: {
    toolsExecuted: false;
    actionsExecuted: false;
    authorityBypassed: false;
    privateScratchReasoningRequired: false;
    privateScratchReasoningPersisted: false;
  };
}

function clamp01(
  value:
    number
    | undefined,
): number | undefined {
  if (
    value ===
    undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return undefined;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function eligibleRanking(
  route:
    ModelRouteDecision,
): RankedModelCandidate[] {
  return route.ranking
    .filter(
      (entry) =>
        entry.eligible,
    );
}

function selectedCandidate(
  route:
    ModelRouteDecision,
): RankedModelCandidate | undefined {
  if (
    route.status !==
      "selected"
  ) {
    return undefined;
  }

  return route.selected;
}

function routeEntryFor(
  route:
    ModelRouteDecision,
  id: string,
): RankedModelCandidate | undefined {
  return route.ranking
    .find(
      (entry) =>
        entry.candidate.id ===
        id,
    );
}

function promptForPass(
  base:
    CompiledPrompt,
  instruction:
    string,
  artifacts:
    Array<{
      label: string;
      text: string;
    }> = [],
): string {
  const artifactText =
    artifacts.length >
      0
      ? [
          "",
          "<<<PRIOR ORCHESTRATION ARTIFACTS>>>",
          ...artifacts.flatMap(
            (artifact) => [
              `[${artifact.label}]`,
              artifact.text,
            ],
          ),
        ].join(
          "\n",
        )
      : "";

  return [
    base.renderedPrompt,
    "",
    "<<<OH-4S ORCHESTRATION INSTRUCTION>>>",
    instruction,
    "Return only the task-relevant artifact for this pass.",
    "Do not claim tool execution, approval, authorization, or external actions unless supplied as authoritative input.",
    "Do not expose or reconstruct hidden chain-of-thought; provide conclusions, critique findings, assumptions, uncertainties, or revisions as appropriate.",
    artifactText,
  ].join(
    "\n",
  );
}

function numericCost(
  candidate:
    ModelRoutingCandidate,
): number {
  if (
    candidate.cost.mode ===
      "local-compute"
  ) {
    return 0;
  }

  if (
    !candidate.cost.known
  ) {
    return Number
      .POSITIVE_INFINITY;
  }

  return (
    candidate.cost
      .inputPerMillionTokens ??
    0
  ) +
  (
    candidate.cost
      .outputPerMillionTokens ??
    0
  );
}

function cheapCandidate(
  route:
    ModelRouteDecision,
): RankedModelCandidate | undefined {
  return eligibleRanking(
    route,
  )
    .slice()
    .sort(
      (
        left,
        right,
      ) => {
        const costDiff =
          numericCost(
            left.candidate,
          ) -
          numericCost(
            right.candidate,
          );

        if (
          Number.isFinite(
            costDiff,
          ) &&
          costDiff !==
          0
        ) {
          return costDiff;
        }

        if (
          left.score !==
          right.score
        ) {
          return (
            right.score -
            left.score
          );
        }

        return left
          .candidate.id
          .localeCompare(
            right
              .candidate.id,
          );
      },
    )[0];
}

function competitionCandidates(
  route:
    ModelRouteDecision,
): RankedModelCandidate[] {
  return eligibleRanking(
    route,
  )
    .slice(
      0,
      2,
    );
}

function provisionalCompetitionWinner(
  runs:
    readonly MultiModelOrchestrationRun[],
  route:
    ModelRouteDecision,
): MultiModelOrchestrationRun | undefined {
  const successful =
    runs.filter(
      (run) =>
        run.ok &&
        Boolean(
          run.text,
        ),
    );

  return successful
    .slice()
    .sort(
      (
        left,
        right,
      ) => {
        const leftConfidence =
          left.confidence ??
          routeEntryFor(
            route,
            left.candidateId,
          )?.confidence ??
          0;

        const rightConfidence =
          right.confidence ??
          routeEntryFor(
            route,
            right.candidateId,
          )?.confidence ??
          0;

        if (
          leftConfidence !==
          rightConfidence
        ) {
          return (
            rightConfidence -
            leftConfidence
          );
        }

        const leftScore =
          left.routeScore ??
          0;

        const rightScore =
          right.routeScore ??
          0;

        if (
          leftScore !==
          rightScore
        ) {
          return (
            rightScore -
            leftScore
          );
        }

        return left.id
          .localeCompare(
            right.id,
          );
      },
    )[0];
}

function runId(
  sequence:
    number,
  pass:
    CognitiveModelPassKind,
  candidateId:
    string,
): string {
  return [
    "oh4s",
    sequence,
    pass,
    candidateId,
  ].join(
    ":",
  );
}

export class MultiModelOrchestrator {
  constructor(
    private readonly executor:
      CognitiveModelExecutor,
  ) {}

  async orchestrate(
    input: {
      compiledPrompt:
        CompiledPrompt;
      modelRoute:
        ModelRouteDecision;
      strategyRoute:
        StrategyRouteDecision;
      reasoningContract:
        ReasoningContract;

      escalationConfidenceThreshold?:
        number;
      timeoutMs?:
        number;
    },
  ): Promise<MultiModelOrchestrationResult> {
    const startedAt =
      new Date()
        .toISOString();

    const warnings:
      string[] =
        [];

    const blockedRequirements:
      string[] =
        [];

    const runs:
      MultiModelOrchestrationRun[] =
        [];

    const strategySelection =
      input.strategyRoute
        .selected;

    const primary =
      selectedCandidate(
        input.modelRoute,
      );

    const finish =
      (
        status:
          MultiModelOrchestrationStatus,
        finalText?:
          string,
        finalSourceRunId?:
          string,
      ): MultiModelOrchestrationResult => ({
        version:
          MULTI_MODEL_ORCHESTRATOR_VERSION,
        startedAt,
        completedAt:
          new Date()
            .toISOString(),
        status,
        strategy:
          strategySelection
            ?.strategy ??
          input.reasoningContract
            .strategy,
        selectedModelId:
          primary
            ?.candidate.id,
        finalText,
        finalSourceRunId,
        runs:
          structuredClone(
            runs,
          ),
        blockedRequirements: [
          ...blockedRequirements,
        ],
        warnings: [
          ...warnings,
        ],
        provenance: {
          promptCompilerVersion:
            input
              .compiledPrompt
              .version,
          modelRouterVersion:
            input
              .modelRoute
              .version,
          strategyRouterVersion:
            input
              .strategyRoute
              .version,
          reasoningContractVersion:
            input
              .reasoningContract
              .version,
        },
        invariants: {
          toolsExecuted:
            false,
          actionsExecuted:
            false,
          authorityBypassed:
            false,
          privateScratchReasoningRequired:
            false,
          privateScratchReasoningPersisted:
            false,
        },
      });

    if (
      input.modelRoute
        .status !==
        "selected" ||
      !primary
    ) {
      blockedRequirements.push(
        "OH-4M must select an eligible primary model before orchestration.",
      );

      return finish(
        "blocked",
      );
    }

    if (
      input.strategyRoute
        .status !==
        "selected" ||
      !strategySelection
    ) {
      blockedRequirements.push(
        "OH-4N must select an eligible strategy before orchestration.",
      );

      return finish(
        "blocked",
      );
    }

    if (
      input.reasoningContract
        .strategy !==
      strategySelection
        .strategy
    ) {
      blockedRequirements.push(
        "OH-4O reasoning contract strategy does not match the OH-4N selected strategy.",
      );

      return finish(
        "blocked",
      );
    }

    const maxPasses =
      Math.max(
        1,
        input
          .reasoningContract
          .execution
          .maxPasses,
      );

    const execute =
      async (
        ranked:
          RankedModelCandidate,
        pass:
          CognitiveModelPassKind,
        purpose:
          string,
        prompt:
          string,
      ): Promise<MultiModelOrchestrationRun> => {
        if (
          runs.length >=
          maxPasses
        ) {
          return {
            id:
              runId(
                runs.length +
                1,
                pass,
                ranked
                  .candidate.id,
              ),
            sequence:
              runs.length +
              1,
            candidateId:
              ranked.candidate.id,
            pass,
            purpose,
            ok:
              false,
            error:
              "Reasoning-contract pass budget exhausted.",
            routeScore:
              ranked.score,
            routeConfidence:
              ranked.confidence,
            retainedAsAuditArtifact:
              true,
          };
        }

        const sequence =
          runs.length +
          1;

        let result:
          CognitiveModelExecutionResult;

        try {
          result =
            await this.executor({
              candidate:
                ranked.candidate,
              pass,
              purpose,
              prompt,
              timeoutMs:
                input.timeoutMs,
            });
        } catch (
          error
        ) {
          result = {
            ok:
              false,
            error:
              error instanceof Error
                ? error.message
                : String(
                    error,
                  ),
          };
        }

        const run:
          MultiModelOrchestrationRun = {
            id:
              runId(
                sequence,
                pass,
                ranked
                  .candidate.id,
              ),
            sequence,
            candidateId:
              ranked.candidate.id,
            pass,
            purpose,
            ok:
              result.ok,
            text:
              result.text,
            error:
              result.error,
            provider:
              result.provider,
            model:
              result.model,
            latencyMs:
              result.latencyMs,
            confidence:
              clamp01(
                result.confidence,
              ),
            routeScore:
              ranked.score,
            routeConfidence:
              ranked.confidence,
            retainedAsAuditArtifact:
              true,
          };

        runs.push(
          run,
        );

        return run;
      };

    const strategy =
      strategySelection
        .strategy;

    if (
      strategy ===
        "tool-assisted"
    ) {
      blockedRequirements.push(
        "Tool-assisted strategy requires authoritative tool results before model orchestration can continue.",
      );

      warnings.push(
        "OH-4S does not execute tools. Tool acquisition remains downstream of authority/action governance.",
      );

      return finish(
        "blocked",
      );
    }

    if (
      strategy ===
        "single-model" ||
      strategy ===
        "specialist"
    ) {
      const run =
        await execute(
          primary,
          "primary",
          strategy ===
            "specialist"
            ? "Produce the task artifact using the selected specialist model."
            : "Produce the task artifact using the selected primary model.",
          promptForPass(
            input
              .compiledPrompt,
            strategy ===
              "specialist"
              ? "Act as the selected domain specialist. Produce the requested artifact while preserving all constraints and uncertainty."
              : "Produce the requested artifact in one bounded pass while preserving all constraints and uncertainty.",
          ),
        );

      if (
        run.ok &&
        run.text
      ) {
        return finish(
          "completed",
          run.text,
          run.id,
        );
      }

      warnings.push(
        "Primary model execution failed.",
      );

      return finish(
        "failed",
      );
    }

    if (
      strategy ===
        "cheap-first-escalation"
    ) {
      const cheap =
        cheapCandidate(
          input.modelRoute,
        ) ??
        primary;

      const first =
        await execute(
          cheap,
          "primary",
          "Attempt the task with the lowest-cost eligible model.",
          promptForPass(
            input
              .compiledPrompt,
            "Produce a complete candidate. Be explicit about uncertainty. This is the cheap-first pass; do not claim success beyond the evidence available.",
          ),
        );

      const threshold =
        clamp01(
          input
            .escalationConfidenceThreshold ??
          0.72,
        ) ??
        0.72;

      if (
        first.ok &&
        first.text &&
        first.confidence !==
          undefined &&
        first.confidence >=
          threshold
      ) {
        warnings.push(
          "Cheap-first result met the configured execution-confidence threshold; escalation was not required.",
        );

        return finish(
          "completed",
          first.text,
          first.id,
        );
      }

      if (
        primary.candidate.id ===
        cheap.candidate.id
      ) {
        warnings.push(
          "Cheap-first pass could not escalate because the selected primary model is already the cheapest eligible candidate.",
        );

        return first.ok &&
          first.text
          ? finish(
              "partial",
              first.text,
              first.id,
            )
          : finish(
              "failed",
            );
      }

      const fallback =
        await execute(
          primary,
          "fallback",
          "Escalate to the OH-4M selected primary model after insufficient cheap-first confidence or failure.",
          promptForPass(
            input
              .compiledPrompt,
            "Produce a fresh, higher-confidence candidate. A cheaper model was attempted first but did not satisfy the escalation threshold. Do not assume its answer is correct.",
            first.text
              ? [
                  {
                    label:
                      "CHEAP-FIRST CANDIDATE",
                    text:
                      first.text,
                  },
                ]
              : [],
          ),
        );

      if (
        fallback.ok &&
        fallback.text
      ) {
        return finish(
          "completed",
          fallback.text,
          fallback.id,
        );
      }

      return first.ok &&
        first.text
        ? finish(
            "partial",
            first.text,
            first.id,
          )
        : finish(
            "failed",
          );
    }

    if (
      strategy ===
        "competition"
    ) {
      const competitors =
        competitionCandidates(
          input.modelRoute,
        );

      if (
        competitors.length <
        2
      ) {
        blockedRequirements.push(
          "Competition requires at least two eligible OH-4M model candidates.",
        );

        return finish(
          "blocked",
        );
      }

      const remainingBudget =
        Math.max(
          0,
          maxPasses -
          runs.length,
        );

      const chosenCompetitors =
        competitors.slice(
          0,
          Math.min(
            2,
            remainingBudget,
          ),
        );

      const produced =
        await Promise.all(
          chosenCompetitors.map(
            (
              competitor,
              index,
            ) =>
              execute(
                competitor,
                index ===
                  0
                  ? "primary"
                  : "secondary",
                "Generate an independent candidate for competition.",
                promptForPass(
                  input
                    .compiledPrompt,
                  "Generate an independent candidate. Do not use or assume another model's answer. Preserve constraints and surface uncertainty.",
                ),
              ),
          ),
        );

      const winner =
        provisionalCompetitionWinner(
          produced,
          input.modelRoute,
        );

      warnings.push(
        "Competition winner is provisional and based only on execution/route confidence. Formal critique and verification are deferred to OH-4T.",
      );

      if (
        winner?.text
      ) {
        return finish(
          produced.every(
            (run) =>
              run.ok,
          )
            ? "completed"
            : "partial",
          winner.text,
          winner.id,
        );
      }

      return finish(
        "failed",
      );
    }

    if (
      strategy ===
        "refinement"
    ) {
      const draft =
        await execute(
          primary,
          "primary",
          "Produce the initial candidate for refinement.",
          promptForPass(
            input
              .compiledPrompt,
            "Produce the first complete candidate. Preserve all explicit constraints and surface uncertainty.",
          ),
        );

      if (
        !draft.ok ||
        !draft.text
      ) {
        return finish(
          "failed",
        );
      }

      const refined =
        await execute(
          primary,
          "refinement",
          "Refine the initial candidate for quality, completeness, and task fit.",
          promptForPass(
            input
              .compiledPrompt,
            "Refine the prior candidate. Correct weaknesses, improve completeness and clarity, preserve valid content, and do not invent missing evidence.",
            [
              {
                label:
                  "INITIAL CANDIDATE",
                text:
                  draft.text,
              },
            ],
          ),
        );

      if (
        refined.ok &&
        refined.text
      ) {
        return finish(
          "completed",
          refined.text,
          refined.id,
        );
      }

      warnings.push(
        "Refinement pass failed; returning the initial candidate as partial output.",
      );

      return finish(
        "partial",
        draft.text,
        draft.id,
      );
    }

    if (
      strategy ===
        "critic-loop"
    ) {
      const draft =
        await execute(
          primary,
          "primary",
          "Produce the initial candidate for critique.",
          promptForPass(
            input
              .compiledPrompt,
            "Produce the first complete candidate. Preserve constraints, evidence boundaries, assumptions, and uncertainty.",
          ),
        );

      if (
        !draft.ok ||
        !draft.text
      ) {
        return finish(
          "failed",
        );
      }

      const critic =
        await execute(
          primary,
          "critic",
          "Critique the initial candidate against the active task and reasoning contract.",
          promptForPass(
            input
              .compiledPrompt,
            "Critique the prior candidate. Identify concrete factual, logical, evidence, constraint, completeness, and uncertainty defects. Do not rewrite the answer yet.",
            [
              {
                label:
                  "CANDIDATE TO CRITIQUE",
                text:
                  draft.text,
              },
            ],
          ),
        );

      if (
        !critic.ok ||
        !critic.text
      ) {
        warnings.push(
          "Critic pass failed; returning the initial candidate as partial output.",
        );

        return finish(
          "partial",
          draft.text,
          draft.id,
        );
      }

      const refined =
        await execute(
          primary,
          "refinement",
          "Revise the candidate using the explicit critique findings.",
          promptForPass(
            input
              .compiledPrompt,
            "Revise the initial candidate using the critique. Repair supported defects, preserve valid content, and do not invent evidence. Return the revised final artifact.",
            [
              {
                label:
                  "INITIAL CANDIDATE",
                text:
                  draft.text,
              },
              {
                label:
                  "CRITIQUE FINDINGS",
                text:
                  critic.text,
              },
            ],
          ),
        );

      if (
        refined.ok &&
        refined.text
      ) {
        warnings.push(
          "OH-4S completed the strategy-level critic loop. Formal independent verification remains the responsibility of OH-4T.",
        );

        return finish(
          "completed",
          refined.text,
          refined.id,
        );
      }

      warnings.push(
        "Final refinement failed after a successful critic pass; returning the initial candidate as partial output.",
      );

      return finish(
        "partial",
        draft.text,
        draft.id,
      );
    }

    blockedRequirements.push(
      `Unsupported strategy: ${strategy}.`,
    );

    return finish(
      "blocked",
    );
  }
}