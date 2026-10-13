import type {
  CognitivePlan,
  CognitivePlanStep,
} from "./cognitivePlanningEngine";

export const PRIORITY_ATTENTION_ENGINE_VERSION =
  "oh4r.v1";

export type UserAttentionAvailability =
  | "available"
  | "limited"
  | "unavailable";

export type PlanAttentionReasonCode =
  | "ready"
  | "dependency-wait"
  | "blocked"
  | "completed"
  | "importance"
  | "urgency"
  | "user-pinned"
  | "verification"
  | "evidence-needed"
  | "tool-needed"
  | "continuity"
  | "user-attention-fit";

export interface PlanPriorityHint {
  importance?: number;
  urgency?: number;

  userPinned?: boolean;

  requiresUserAttention?: boolean;

  reason?: string;
}

export interface PlanAttentionProgress {
  completedStepIds?: string[];
  blockedStepIds?: string[];
}

export interface PlanAttentionPolicy {
  baseReadyScore: number;

  importanceWeight: number;
  urgencyWeight: number;

  verificationWeight: number;
  evidenceWeight: number;
  toolWeight: number;

  userPinnedWeight: number;
  continuityWeight: number;

  limitedAttentionPenalty: number;
  unavailableAttentionPenalty: number;

  minimumFocusScore: number;
  switchMargin: number;
}

export interface PlanAttentionReason {
  code:
    PlanAttentionReasonCode;

  weight: number;
  detail: string;
}

export interface PlanAttentionCandidate {
  rank: number;

  stepId: string;
  goalId: string;

  eligible: boolean;

  readiness:
    | "ready"
    | "waiting"
    | "blocked"
    | "completed";

  score: number;

  importance: number;
  urgency: number;

  reasons:
    PlanAttentionReason[];

  unmetDependencies:
    string[];

  blockers:
    string[];

  step:
    CognitivePlanStep;
}

export type PlanFocusReason =
  | "no-candidates"
  | "no-eligible-step"
  | "initial-focus"
  | "retained-focus"
  | "switched-focus";

export interface PlanAttentionDecision {
  version: string;
  generatedAt: string;

  reason:
    PlanFocusReason;

  changed: boolean;

  previousStepId?:
    string;

  selected?:
    PlanAttentionCandidate;

  candidates:
    PlanAttentionCandidate[];

  planStatus:
    CognitivePlan["status"];

  userAttention:
    UserAttentionAvailability;

  policy:
    PlanAttentionPolicy;

  invariants: {
    dependenciesCanBeBypassed: false;
    blockedStepsCanBeSelected: false;
    schedulingPerformed: false;
    executionPerformed: false;
    planMutated: false;
  };

  warnings:
    string[];
}

export const DEFAULT_PLAN_ATTENTION_POLICY:
  PlanAttentionPolicy = {
    baseReadyScore:
      30,

    importanceWeight:
      25,
    urgencyWeight:
      25,

    verificationWeight:
      8,
    evidenceWeight:
      6,
    toolWeight:
      4,

    userPinnedWeight:
      20,
    continuityWeight:
      10,

    limitedAttentionPenalty:
      15,
    unavailableAttentionPenalty:
      40,

    minimumFocusScore:
      25,
    switchMargin:
      10,
  };

function clampUnit(
  value:
    number
    | undefined,
  fallback:
    number,
): number {
  if (
    value ===
    undefined
  ) {
    return fallback;
  }

  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      "Priority values must be finite numbers.",
    );
  }

  if (
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Priority values must be between 0 and 1.",
    );
  }

  return value;
}

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        value,
      ),
    ),
  );
}

function validatePolicy(
  policy:
    PlanAttentionPolicy,
): void {
  const nonNegativeFields: Array<
    keyof PlanAttentionPolicy
  > = [
    "baseReadyScore",
    "importanceWeight",
    "urgencyWeight",
    "verificationWeight",
    "evidenceWeight",
    "toolWeight",
    "userPinnedWeight",
    "continuityWeight",
    "limitedAttentionPenalty",
    "unavailableAttentionPenalty",
    "minimumFocusScore",
    "switchMargin",
  ];

  for (
    const field
    of nonNegativeFields
  ) {
    const value =
      policy[field];

    if (
      !Number.isFinite(
        value,
      ) ||
      value <
        0
    ) {
      throw new Error(
        `Plan attention policy ${field} must be a non-negative finite number.`,
      );
    }
  }

  if (
    policy.minimumFocusScore >
      100 ||
    policy.switchMargin >
      100
  ) {
    throw new Error(
      "Plan attention policy minimumFocusScore and switchMargin must not exceed 100.",
    );
  }
}

function setOf(
  values:
    readonly string[]
    | undefined,
): Set<string> {
  return new Set(
    values ?? [],
  );
}

function reason(
  reasons:
    PlanAttentionReason[],
  code:
    PlanAttentionReasonCode,
  weight:
    number,
  detail:
    string,
): number {
  reasons.push({
    code,
    weight,
    detail,
  });

  return weight;
}

function assessCandidate(
  input: {
    step:
      CognitivePlanStep;

    completed:
      Set<string>;

    blocked:
      Set<string>;

    hint:
      PlanPriorityHint;

    previousStepId?:
      string;

    userAttention:
      UserAttentionAvailability;

    policy:
      PlanAttentionPolicy;

    planBlocked:
      boolean;
  },
): Omit<
  PlanAttentionCandidate,
  "rank"
> {
  const step =
    input.step;

  const reasons:
    PlanAttentionReason[] =
      [];

  const importance =
    clampUnit(
      input.hint
        .importance,
      0.5,
    );

  const urgency =
    clampUnit(
      input.hint
        .urgency,
      0.5,
    );

  const completed =
    input.completed.has(
      step.id,
    );

  const explicitlyBlocked =
    input.blocked.has(
      step.id,
    );

  const unmetDependencies =
    step.dependsOnStepIds
      .filter(
        (dependency) =>
          !input.completed
            .has(
              dependency,
            ),
      );

  const blockers = [
    ...step.blockers,
    ...(
      explicitlyBlocked
        ? [
            "Step is marked blocked by live progress.",
          ]
        : []
    ),
    ...(
      input.planBlocked
        ? [
            "Parent cognitive plan is blocked.",
          ]
        : []
    ),
  ];

  let readiness:
    PlanAttentionCandidate[
      "readiness"
    ];

  if (
    completed
  ) {
    readiness =
      "completed";

    reason(
      reasons,
      "completed",
      0,
      "Step is already completed and is not eligible for focus.",
    );
  } else if (
    blockers.length >
      0
  ) {
    readiness =
      "blocked";

    reason(
      reasons,
      "blocked",
      0,
      blockers.join(
        " ",
      ),
    );
  } else if (
    unmetDependencies.length >
      0
  ) {
    readiness =
      "waiting";

    reason(
      reasons,
      "dependency-wait",
      0,
      `Waiting on dependencies: ${unmetDependencies.join(", ")}.`,
    );
  } else {
    readiness =
      "ready";

    reason(
      reasons,
      "ready",
      input.policy
        .baseReadyScore,
      "All dependencies are satisfied and the step is eligible for cognitive focus.",
    );
  }

  const eligible =
    readiness ===
    "ready";

  let rawScore =
    eligible
      ? input.policy
          .baseReadyScore
      : 0;

  if (
    eligible
  ) {
    rawScore +=
      reason(
        reasons,
        "importance",
        importance *
          input.policy
            .importanceWeight,
        `Importance=${importance.toFixed(2)}.`,
      );

    rawScore +=
      reason(
        reasons,
        "urgency",
        urgency *
          input.policy
            .urgencyWeight,
        `Urgency=${urgency.toFixed(2)}.`,
      );

    if (
      input.hint
        .userPinned
    ) {
      rawScore +=
        reason(
          reasons,
          "user-pinned",
          input.policy
            .userPinnedWeight,
          input.hint
            .reason
            ?.trim() ||
          "User explicitly pinned this step for attention.",
        );
    }

    if (
      step.kind ===
        "verification" ||
      step.verification
        .required
    ) {
      rawScore +=
        reason(
          reasons,
          "verification",
          input.policy
            .verificationWeight,
          "Step contains a required verification checkpoint.",
        );
    }

    if (
      step.evidenceNeeds
        .some(
          (need) =>
            need.required,
        )
    ) {
      rawScore +=
        reason(
          reasons,
          "evidence-needed",
          input.policy
            .evidenceWeight,
          "Step requires evidence before it can be considered complete.",
        );
    }

    if (
      step.requiredTools
        .length >
      0
    ) {
      rawScore +=
        reason(
          reasons,
          "tool-needed",
          input.policy
            .toolWeight,
          `Step references required tools: ${step.requiredTools.join(", ")}.`,
        );
    }

    if (
      input.previousStepId ===
      step.id
    ) {
      rawScore +=
        reason(
          reasons,
          "continuity",
          input.policy
            .continuityWeight,
          "Current focus receives a continuity boost to avoid unnecessary attention thrashing.",
        );
    }

    if (
      input.hint
        .requiresUserAttention
    ) {
      if (
        input.userAttention ===
        "limited"
      ) {
        rawScore -=
          reason(
            reasons,
            "user-attention-fit",
            input.policy
              .limitedAttentionPenalty,
            "Step requires user attention while user availability is limited.",
          );
      } else if (
        input.userAttention ===
        "unavailable"
      ) {
        rawScore -=
          reason(
            reasons,
            "user-attention-fit",
            input.policy
              .unavailableAttentionPenalty,
            "Step requires user attention while user is unavailable.",
          );
      } else {
        reason(
          reasons,
          "user-attention-fit",
          0,
          "Required user attention is currently available.",
        );
      }
    }
  }

  return {
    stepId:
      step.id,
    goalId:
      step.goalId,
    eligible,
    readiness,
    score:
      eligible
        ? clampScore(
            rawScore,
          )
        : 0,
    importance,
    urgency,
    reasons,
    unmetDependencies,
    blockers,
    step:
      structuredClone(
        step,
      ),
  };
}

export class PriorityAttentionEngine {
  prioritize(
    input: {
      plan:
        CognitivePlan;

      progress?:
        PlanAttentionProgress;

      priorityHints?:
        Record<
          string,
          PlanPriorityHint
        >;

      userAttention?:
        UserAttentionAvailability;

      previousStepId?:
        string;

      policy?:
        Partial<
          PlanAttentionPolicy
        >;
    },
  ): PlanAttentionDecision {
    const policy: PlanAttentionPolicy = {
      ...DEFAULT_PLAN_ATTENTION_POLICY,
      ...input.policy,
    };

    validatePolicy(
      policy,
    );

    const completed =
      setOf(
        input.progress
          ?.completedStepIds,
      );

    const blocked =
      setOf(
        input.progress
          ?.blockedStepIds,
      );

    const userAttention =
      input.userAttention ??
      "available";

    const planBlocked =
      input.plan
        .status ===
        "blocked" ||
      !input.plan
        .planningReady;

    const candidates =
      input.plan
        .steps
        .map(
          (step) =>
            assessCandidate({
              step,
              completed,
              blocked,
              hint:
                input
                  .priorityHints
                  ?.[step.id] ??
                {},
              previousStepId:
                input
                  .previousStepId,
              userAttention,
              policy,
              planBlocked,
            }),
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
              left.step.stage !==
              right.step.stage
            ) {
              return (
                left.step.stage -
                right.step.stage
              );
            }

            if (
              left.step.sequence !==
              right.step.sequence
            ) {
              return (
                left.step.sequence -
                right.step.sequence
              );
            }

            return left.stepId
              .localeCompare(
                right.stepId,
              );
          },
        )
        .map(
          (
            candidate,
            index,
          ): PlanAttentionCandidate => ({
            rank:
              index +
              1,
            ...candidate,
          }),
        );

    const eligible =
      candidates.filter(
        (candidate) =>
          candidate.eligible &&
          candidate.score >=
            policy
              .minimumFocusScore,
      );

    const warnings:
      string[] =
        [];

    if (
      planBlocked
    ) {
      warnings.push(
        "Parent cognitive plan is blocked; no plan step may receive executable attention.",
      );
    }

    if (
      userAttention ===
        "unavailable"
    ) {
      warnings.push(
        "User attention is unavailable; steps that explicitly require user attention are deprioritized.",
      );
    }

    if (
      candidates.some(
        (candidate) =>
          candidate.step
            .requiredTools
            .length >
          0,
      )
    ) {
      warnings.push(
        "Tool requirements affect attention only; OH-4R does not invoke tools.",
      );
    }

    let selected:
      PlanAttentionCandidate
      | undefined;

    let reasonCode:
      PlanFocusReason;

    if (
      candidates.length ===
      0
    ) {
      reasonCode =
        "no-candidates";
    } else if (
      eligible.length ===
      0
    ) {
      reasonCode =
        "no-eligible-step";
    } else {
      const challenger =
        eligible[0];

      const incumbent =
        input.previousStepId
          ? eligible.find(
              (candidate) =>
                candidate.stepId ===
                input
                  .previousStepId,
            )
          : undefined;

      if (
        !input.previousStepId ||
        !incumbent
      ) {
        selected =
          challenger;

        reasonCode =
          input.previousStepId
            ? "switched-focus"
            : "initial-focus";
      } else if (
        challenger.stepId ===
        incumbent.stepId
      ) {
        selected =
          incumbent;

        reasonCode =
          "retained-focus";
      } else if (
        challenger.score <
        incumbent.score +
          policy.switchMargin
      ) {
        selected =
          incumbent;

        reasonCode =
          "retained-focus";
      } else {
        selected =
          challenger;

        reasonCode =
          "switched-focus";
      }
    }

    return {
      version:
        PRIORITY_ATTENTION_ENGINE_VERSION,
      generatedAt:
        new Date()
          .toISOString(),
      reason:
        reasonCode,
      changed:
        (
          input.previousStepId ??
          undefined
        ) !==
        selected?.stepId,
      previousStepId:
        input.previousStepId,
      selected:
        selected
          ? structuredClone(
              selected,
            )
          : undefined,
      candidates:
        structuredClone(
          candidates,
        ),
      planStatus:
        input.plan.status,
      userAttention,
      policy:
        structuredClone(
          policy,
        ),
      invariants: {
        dependenciesCanBeBypassed:
          false,
        blockedStepsCanBeSelected:
          false,
        schedulingPerformed:
          false,
        executionPerformed:
          false,
        planMutated:
          false,
      },
      warnings,
    };
  }
}

const defaultPriorityAttentionEngine =
  new PriorityAttentionEngine();

export function getPriorityAttentionEngine():
  PriorityAttentionEngine {
  return defaultPriorityAttentionEngine;
}