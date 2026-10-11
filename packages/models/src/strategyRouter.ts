import type {
  InputInterpretation,
} from "./inputInterpreter";

import type {
  ModelRouteDecision,
  RankedModelCandidate,
} from "./modelDecisionRouter";

export const STRATEGY_ROUTER_VERSION =
  "oh4n.v1";

export type CognitiveStrategyKind =
  | "single-model"
  | "cheap-first-escalation"
  | "specialist"
  | "competition"
  | "critic-loop"
  | "refinement"
  | "tool-assisted";

export interface StrategyRoutingConstraints {
  allowedStrategies?:
    CognitiveStrategyKind[];

  excludedStrategies?:
    CognitiveStrategyKind[];

  requireToolAssistance?:
    boolean;

  forbidMultiModel?:
    boolean;

  maxPasses?:
    number;

  minimumStrategyConfidence?:
    number;
}

export interface StrategyRecipeStep {
  order: number;

  action:
    | "reason"
    | "use-tools"
    | "critique"
    | "refine"
    | "compare"
    | "escalate";

  purpose: string;

  modelRole:
    | "primary"
    | "secondary"
    | "critic"
    | "specialist"
    | "fallback";

  toolUseAllowed:
    boolean;
}

export interface StrategyRecipe {
  strategy:
    CognitiveStrategyKind;

  multiPass:
    boolean;
  multiModel:
    boolean;
  requiresTools:
    boolean;

  maxPasses: number;

  steps:
    StrategyRecipeStep[];
}

export interface StrategyScoreComponent {
  component:
    | "complexity-fit"
    | "reasoning-fit"
    | "factuality-fit"
    | "creativity-fit"
    | "tool-fit"
    | "cost-fit"
    | "latency-fit"
    | "model-confidence-fit";

  score: number;
  weight: number;
  weightedScore: number;

  reasons: string[];
}

export interface RankedStrategy {
  strategy:
    CognitiveStrategyKind;

  eligible: boolean;
  exclusionReasons:
    string[];

  score: number;
  confidence: number;

  components:
    StrategyScoreComponent[];

  recipe:
    StrategyRecipe;

  reasons: string[];
}

export interface StrategyRouteDecision {
  version: string;
  routedAt: string;

  status:
    | "selected"
    | "no-eligible-strategy";

  selected?:
    RankedStrategy;

  ranking:
    RankedStrategy[];

  modelRouteStatus:
    ModelRouteDecision[
      "status"
    ];

  selectedModelId?:
    string;

  taskSummary: {
    primaryDomain:
      string;
    complexity:
      string;
    creativity:
      string;
    factuality:
      string;
    reasoningDepth:
      string;
    latencyTolerance:
      string;
    costTolerance:
      string;
    toolUseRequired:
      boolean;
  };

  constraints:
    StrategyRoutingConstraints;

  warnings:
    string[];
}

function clamp01(
  value: number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function setOf<T extends string>(
  values:
    readonly T[]
    | undefined,
): Set<T> {
  return new Set(
    values ?? [],
  );
}

function selectedModelConfidence(
  modelRoute:
    ModelRouteDecision,
): number {
  return clamp01(
    modelRoute
      .selected
      ?.confidence ??
    0,
  );
}

function eligibleModels(
  modelRoute:
    ModelRouteDecision,
): RankedModelCandidate[] {
  return modelRoute
    .ranking
    .filter(
      (entry) =>
        entry.eligible,
    );
}

function scoreComponent(
  component:
    StrategyScoreComponent[
      "component"
    ],
  score:
    number,
  weight:
    number,
  reasons:
    string[],
): StrategyScoreComponent {
  const normalized =
    clamp01(
      score,
    );

  return {
    component,
    score:
      normalized,
    weight,
    weightedScore:
      normalized *
      weight,
    reasons,
  };
}

function complexityValue(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .complexity.value
  ) {
    case "trivial":
      return 0.1;
    case "simple":
      return 0.25;
    case "moderate":
      return 0.5;
    case "complex":
      return 0.8;
    case "very-complex":
      return 1;
    default:
      return 0.5;
  }
}

function reasoningValue(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .reasoningDepth.value
  ) {
    case "shallow":
      return 0.15;
    case "moderate":
      return 0.45;
    case "deep":
      return 0.8;
    case "very-deep":
      return 1;
    default:
      return 0.45;
  }
}

function factualityValue(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .factuality.value
  ) {
    case "low":
      return 0.15;
    case "medium":
      return 0.45;
    case "high":
      return 0.8;
    case "critical":
      return 1;
    default:
      return 0.45;
  }
}

function creativityValue(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .creativity.value
  ) {
    case "none":
      return 0;
    case "low":
      return 0.3;
    case "medium":
      return 0.65;
    case "high":
      return 1;
    default:
      return 0.3;
  }
}

function costPressure(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .costTolerance.value
  ) {
    case "minimal":
      return 1;
    case "low":
      return 0.8;
    case "standard":
      return 0.4;
    case "high":
      return 0.1;
    default:
      return 0.4;
  }
}

function latencyPressure(
  interpretation:
    InputInterpretation,
): number {
  switch (
    interpretation
      .taskIntelligence
      .latencyTolerance.value
  ) {
    case "immediate":
      return 1;
    case "interactive":
      return 0.75;
    case "flexible":
      return 0.35;
    case "batch":
      return 0.1;
    default:
      return 0.5;
  }
}

function toolDemand(
  interpretation:
    InputInterpretation,
): number {
  return interpretation
    .taskIntelligence
    .derived
    .toolUseRequired
      ? 1
      : 0;
}

function strategyBaseScores(
  strategy:
    CognitiveStrategyKind,
  interpretation:
    InputInterpretation,
  modelRoute:
    ModelRouteDecision,
): {
  complexity:
    number;
  reasoning:
    number;
  factuality:
    number;
  creativity:
    number;
  tools:
    number;
  cost:
    number;
  latency:
    number;
  modelConfidence:
    number;
  reasons:
    string[];
} {
  const complexity =
    complexityValue(
      interpretation,
    );

  const reasoning =
    reasoningValue(
      interpretation,
    );

  const factuality =
    factualityValue(
      interpretation,
    );

  const creativity =
    creativityValue(
      interpretation,
    );

  const tools =
    toolDemand(
      interpretation,
    );

  const cost =
    costPressure(
      interpretation,
    );

  const latency =
    latencyPressure(
      interpretation,
    );

  const confidence =
    selectedModelConfidence(
      modelRoute,
    );

  const candidateCount =
    eligibleModels(
      modelRoute,
    ).length;

  switch (
    strategy
  ) {
    case "single-model":
      return {
        complexity:
          1 - complexity,
        reasoning:
          1 - reasoning * 0.7,
        factuality:
          1 - factuality * 0.45,
        creativity:
          0.6,
        tools:
          tools
            ? 0.25
            : 1,
        cost:
          1,
        latency:
          1,
        modelConfidence:
          confidence,
        reasons: [
          "Single-model reasoning is favored for simpler, lower-latency tasks.",
        ],
      };

    case "cheap-first-escalation":
      return {
        complexity:
          0.55 +
          complexity *
            0.25,
        reasoning:
          0.5 +
          reasoning *
            0.25,
        factuality:
          0.45 +
          factuality *
            0.25,
        creativity:
          0.45,
        tools:
          tools
            ? 0.55
            : 0.65,
        cost,
        latency:
          1 -
          latency *
            0.35,
        modelConfidence:
          1 -
          confidence *
            0.45,
        reasons: [
          "Cheap-first escalation is favored when cost pressure is high and escalation can recover uncertain results.",
        ],
      };

    case "specialist":
      return {
        complexity:
          0.6 +
          complexity *
            0.25,
        reasoning:
          0.6 +
          reasoning *
            0.2,
        factuality:
          0.55 +
          factuality *
            0.25,
        creativity:
          0.5 +
          creativity *
            0.15,
        tools:
          tools
            ? 0.6
            : 0.65,
        cost:
          0.55,
        latency:
          0.55,
        modelConfidence:
          candidateCount >
          1
            ? 0.75
            : 0.55,
        reasons: [
          "Specialist routing is useful for domain-specific work when multiple eligible models exist.",
        ],
      };

    case "competition":
      return {
        complexity:
          0.55 +
          complexity *
            0.3,
        reasoning:
          0.6 +
          reasoning *
            0.3,
        factuality:
          0.6 +
          factuality *
            0.25,
        creativity:
          0.6 +
          creativity *
            0.25,
        tools:
          tools
            ? 0.45
            : 0.55,
        cost:
          1 -
          cost *
            0.65,
        latency:
          1 -
          latency *
            0.7,
        modelConfidence:
          candidateCount >
          1
            ? 1 -
              confidence *
                0.35
            : 0.1,
        reasons: [
          "Competition is useful when multiple eligible models can independently produce candidates for comparison.",
        ],
      };

    case "critic-loop":
      return {
        complexity:
          0.55 +
          complexity *
            0.35,
        reasoning:
          0.55 +
          reasoning *
            0.35,
        factuality:
          0.6 +
          factuality *
            0.35,
        creativity:
          0.45,
        tools:
          tools
            ? 0.6
            : 0.55,
        cost:
          1 -
          cost *
            0.55,
        latency:
          1 -
          latency *
            0.55,
        modelConfidence:
          1 -
          confidence *
            0.25,
        reasons: [
          "Critic loops are favored for high-factuality or high-consequence reasoning that benefits from an explicit review pass.",
        ],
      };

    case "refinement":
      return {
        complexity:
          0.5 +
          complexity *
            0.3,
        reasoning:
          0.55 +
          reasoning *
            0.25,
        factuality:
          0.5 +
          factuality *
            0.2,
        creativity:
          0.6 +
          creativity *
            0.35,
        tools:
          tools
            ? 0.45
            : 0.6,
        cost:
          1 -
          cost *
            0.4,
        latency:
          1 -
          latency *
            0.45,
        modelConfidence:
          0.65,
        reasons: [
          "Refinement is favored for creative or quality-sensitive work that benefits from iterative improvement.",
        ],
      };

    case "tool-assisted":
      return {
        complexity:
          0.55 +
          complexity *
            0.25,
        reasoning:
          0.55 +
          reasoning *
            0.2,
        factuality:
          0.6 +
          factuality *
            0.25,
        creativity:
          0.45,
        tools:
          tools
            ? 1
            : 0.15,
        cost:
          0.65,
        latency:
          0.55,
        modelConfidence:
          0.75,
        reasons: [
          "Tool-assisted reasoning is favored when the task explicitly requires external tools or evidence.",
        ],
      };
  }
}

function recipeFor(
  strategy:
    CognitiveStrategyKind,
  interpretation:
    InputInterpretation,
  constraints:
    StrategyRoutingConstraints,
): StrategyRecipe {
  const capped =
    Math.max(
      1,
      Math.min(
        8,
        Math.trunc(
          constraints.maxPasses ??
          4,
        ),
      ),
    );

  switch (
    strategy
  ) {
    case "single-model":
      return {
        strategy,
        multiPass:
          false,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          1,
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "Produce the answer with the selected primary model.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "cheap-first-escalation":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          true,
        requiresTools:
          false,
        maxPasses:
          Math.min(
            capped,
            2,
          ),
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "Attempt the task with a lower-cost eligible model.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "escalate",
            purpose:
              "Escalate only if confidence/validation is insufficient.",
            modelRole:
              "fallback",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "specialist":
      return {
        strategy,
        multiPass:
          false,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          1,
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              `Use a domain-specialist model for ${interpretation.taskIntelligence.primaryDomain.value}.`,
            modelRole:
              "specialist",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "competition":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          true,
        requiresTools:
          false,
        maxPasses:
          Math.min(
            capped,
            3,
          ),
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "Generate an independent candidate with the primary model.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "reason",
            purpose:
              "Generate an independent competing candidate.",
            modelRole:
              "secondary",
            toolUseAllowed:
              false,
          },
          {
            order:
              3,
            action:
              "compare",
            purpose:
              "Compare candidates using objective task criteria.",
            modelRole:
              "critic",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "critic-loop":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          Math.min(
            capped,
            3,
          ),
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "Produce an initial candidate.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "critique",
            purpose:
              "Critique the candidate against factual, logical, and constraint requirements.",
            modelRole:
              "critic",
            toolUseAllowed:
              false,
          },
          {
            order:
              3,
            action:
              "refine",
            purpose:
              "Repair issues identified by the critique.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "refinement":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          false,
        maxPasses:
          Math.min(
            capped,
            3,
          ),
        steps: [
          {
            order:
              1,
            action:
              "reason",
            purpose:
              "Produce the first complete candidate.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
          {
            order:
              2,
            action:
              "refine",
            purpose:
              "Improve quality, clarity, completeness, and task fit.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };

    case "tool-assisted":
      return {
        strategy,
        multiPass:
          true,
        multiModel:
          false,
        requiresTools:
          true,
        maxPasses:
          Math.min(
            capped,
            3,
          ),
        steps: [
          {
            order:
              1,
            action:
              "use-tools",
            purpose:
              "Acquire required external evidence or tool results before concluding.",
            modelRole:
              "primary",
            toolUseAllowed:
              true,
          },
          {
            order:
              2,
            action:
              "reason",
            purpose:
              "Reason over authoritative tool results and task context.",
            modelRole:
              "primary",
            toolUseAllowed:
              true,
          },
          {
            order:
              3,
            action:
              "refine",
            purpose:
              "Produce the final grounded answer.",
            modelRole:
              "primary",
            toolUseAllowed:
              false,
          },
        ],
      };
  }
}

function eligibilityReasons(
  strategy:
    CognitiveStrategyKind,
  interpretation:
    InputInterpretation,
  modelRoute:
    ModelRouteDecision,
  constraints:
    StrategyRoutingConstraints,
): string[] {
  const reasons:
    string[] =
      [];

  const allowed =
    setOf(
      constraints
        .allowedStrategies,
    );

  const excluded =
    setOf(
      constraints
        .excludedStrategies,
    );

  if (
    allowed.size >
      0 &&
    !allowed.has(
      strategy,
    )
  ) {
    reasons.push(
      "strategy is not in allowedStrategies",
    );
  }

  if (
    excluded.has(
      strategy,
    )
  ) {
    reasons.push(
      "strategy is explicitly excluded",
    );
  }

  const recipe =
    recipeFor(
      strategy,
      interpretation,
      constraints,
    );

  if (
    constraints
      .forbidMultiModel &&
    recipe.multiModel
  ) {
    reasons.push(
      "multi-model strategies are forbidden",
    );
  }

  if (
    constraints
      .requireToolAssistance &&
    !recipe.requiresTools
  ) {
    reasons.push(
      "tool assistance is explicitly required",
    );
  }

  if (
    recipe.multiModel &&
    eligibleModels(
      modelRoute,
    ).length <
      2
  ) {
    reasons.push(
      "strategy requires at least two eligible models",
    );
  }

  if (
    strategy ===
      "tool-assisted" &&
    !interpretation
      .taskIntelligence
      .derived
      .toolUseRequired &&
    !constraints
      .requireToolAssistance
  ) {
    reasons.push(
      "task does not require tool assistance",
    );
  }

  if (
    modelRoute.status !==
      "selected"
  ) {
    reasons.push(
      "no primary model has been selected by OH-4M",
    );
  }

  return reasons;
}

function rankStrategy(
  strategy:
    CognitiveStrategyKind,
  interpretation:
    InputInterpretation,
  modelRoute:
    ModelRouteDecision,
  constraints:
    StrategyRoutingConstraints,
): RankedStrategy {
  const base =
    strategyBaseScores(
      strategy,
      interpretation,
      modelRoute,
    );

  const weights = {
    complexity:
      0.15,
    reasoning:
      0.16,
    factuality:
      0.16,
    creativity:
      0.1,
    tools:
      0.13,
    cost:
      0.1,
    latency:
      0.1,
    modelConfidence:
      0.1,
  };

  const components: StrategyScoreComponent[] =
    [
      scoreComponent(
        "complexity-fit",
        base.complexity,
        weights.complexity,
        [
          `Task complexity=${interpretation.taskIntelligence.complexity.value}.`,
        ],
      ),
      scoreComponent(
        "reasoning-fit",
        base.reasoning,
        weights.reasoning,
        [
          `Reasoning depth=${interpretation.taskIntelligence.reasoningDepth.value}.`,
        ],
      ),
      scoreComponent(
        "factuality-fit",
        base.factuality,
        weights.factuality,
        [
          `Factuality=${interpretation.taskIntelligence.factuality.value}.`,
        ],
      ),
      scoreComponent(
        "creativity-fit",
        base.creativity,
        weights.creativity,
        [
          `Creativity=${interpretation.taskIntelligence.creativity.value}.`,
        ],
      ),
      scoreComponent(
        "tool-fit",
        base.tools,
        weights.tools,
        [
          `Tool use required=${String(interpretedToolUse(interpretedToolUseInput(interpretation)))}.`,
        ],
      ),
      scoreComponent(
        "cost-fit",
        base.cost,
        weights.cost,
        [
          `Cost tolerance=${interpretation.taskIntelligence.costTolerance.value}.`,
        ],
      ),
      scoreComponent(
        "latency-fit",
        base.latency,
        weights.latency,
        [
          `Latency tolerance=${interpretation.taskIntelligence.latencyTolerance.value}.`,
        ],
      ),
      scoreComponent(
        "model-confidence-fit",
        base.modelConfidence,
        weights.modelConfidence,
        [
          `OH-4M selected-model confidence=${selectedModelConfidence(modelRoute).toFixed(2)}.`,
        ],
      ),
    ];

  const exclusions =
    eligibilityReasons(
      strategy,
      interpretation,
      modelRoute,
      constraints,
    );

  const rawScore =
    components.reduce(
      (
        total,
        entry,
      ) =>
        total +
        entry.weightedScore,
      0,
    );

  const confidence =
    clamp01(
      0.55 +
      selectedModelConfidence(
        modelRoute,
      ) *
        0.3 +
      (
        interpretation
          .taskIntelligence
          .primaryDomain
          .confidence ??
        0
      ) *
        0.15,
    );

  return {
    strategy,
    eligible:
      exclusions.length ===
      0,
    exclusionReasons:
      exclusions,
    score:
      exclusions.length >
        0
        ? 0
        : clamp01(
            rawScore,
          ),
    confidence,
    components,
    recipe:
      recipeFor(
        strategy,
        interpretation,
        constraints,
      ),
    reasons: [
      ...base.reasons,
      ...components.flatMap(
        (entry) =>
          entry.reasons.map(
            (reason) =>
              `${entry.component}: ${reason}`,
          ),
      ),
    ],
  };
}

function interpretedToolUseInput(
  interpretation:
    InputInterpretation,
): InputInterpretation {
  return interpretation;
}

function interpretedToolUse(
  interpretation:
    InputInterpretation,
): boolean {
  return interpretation
    .taskIntelligence
    .derived
    .toolUseRequired;
}

const ALL_STRATEGIES:
  CognitiveStrategyKind[] =
    [
      "single-model",
      "cheap-first-escalation",
      "specialist",
      "competition",
      "critic-loop",
      "refinement",
      "tool-assisted",
    ];

export class StrategyRouter {
  route(
    input: {
      interpretation:
        InputInterpretation;
      modelRoute:
        ModelRouteDecision;
      constraints?:
        StrategyRoutingConstraints;
    },
  ): StrategyRouteDecision {
    const constraints =
      structuredClone(
        input.constraints ??
        {},
      );

    const ranking =
      ALL_STRATEGIES
        .map(
          (strategy) =>
            rankStrategy(
              strategy,
              input.interpretation,
              input.modelRoute,
              constraints,
            ),
        )
        .sort(
          (
            left,
            right,
          ) => {
            if (
              left.eligible !==
              right.eligible
            ) {
              return left.eligible
                ? -1
                : 1;
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

            if (
              left.confidence !==
              right.confidence
            ) {
              return (
                right.confidence -
                left.confidence
              );
            }

            return left.strategy
              .localeCompare(
                right.strategy,
              );
          },
        );

    const minimum =
      clamp01(
        constraints
          .minimumStrategyConfidence ??
        0,
      );

    const selected =
      ranking.find(
        (entry) =>
          entry.eligible &&
          entry.confidence >=
            minimum,
      );

    const warnings:
      string[] =
        [];

    if (
      input.modelRoute
        .status !==
      "selected"
    ) {
      warnings.push(
        "OH-4M did not select a primary model; no strategy may execute safely.",
      );
    }

    if (!selected) {
      warnings.push(
        "No eligible cognitive strategy satisfied the routing constraints/confidence threshold.",
      );
    }

    if (
      selected
        ?.recipe.multiModel
    ) {
      warnings.push(
        "Selected strategy requires multiple models; execution remains deferred to OH-4S Multi-Model Orchestrator.",
      );
    }

    if (
      selected
        ?.recipe.requiresTools
    ) {
      warnings.push(
        "Selected strategy requires tools; execution remains subject to later authority/action bridges.",
      );
    }

    return {
      version:
        STRATEGY_ROUTER_VERSION,
      routedAt:
        new Date()
          .toISOString(),
      status:
        selected
          ? "selected"
          : "no-eligible-strategy",
      selected:
        selected
          ? structuredClone(
              selected,
            )
          : undefined,
      ranking,
      modelRouteStatus:
        input.modelRoute
          .status,
      selectedModelId:
        input.modelRoute
          .selected
          ?.candidate.id,
      taskSummary: {
        primaryDomain:
          input
            .interpretation
            .taskIntelligence
            .primaryDomain
            .value,
        complexity:
          input
            .interpretation
            .taskIntelligence
            .complexity
            .value,
        creativity:
          input
            .interpretation
            .taskIntelligence
            .creativity
            .value,
        factuality:
          input
            .interpretation
            .taskIntelligence
            .factuality
            .value,
        reasoningDepth:
          input
            .interpretation
            .taskIntelligence
            .reasoningDepth
            .value,
        latencyTolerance:
          input
            .interpretation
            .taskIntelligence
            .latencyTolerance
            .value,
        costTolerance:
          input
            .interpretation
            .taskIntelligence
            .costTolerance
            .value,
        toolUseRequired:
          input
            .interpretation
            .taskIntelligence
            .derived
            .toolUseRequired,
      },
      constraints,
      warnings,
    };
  }
}

const defaultStrategyRouter =
  new StrategyRouter();

export function getStrategyRouter():
  StrategyRouter {
  return defaultStrategyRouter;
}