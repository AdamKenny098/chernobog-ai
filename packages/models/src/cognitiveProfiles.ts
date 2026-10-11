export const COGNITIVE_PROFILES_VERSION =
  "oh4ac.v1";

export type CognitiveProfileName =
  | "fast"
  | "deep"
  | "private"
  | "cheap"
  | "experimental";

export type CognitiveProfileReasoningEffort =
  | "standard"
  | "deep"
  | "very-deep"
  | "maximum";

export type CognitiveProfileVerificationMode =
  | "standard"
  | "strict";

export interface CognitiveProfilePriorities {
  quality: number;
  latency: number;
  cost: number;
  privacy: number;
  exploration: number;
}

export interface CognitiveProfileDefinition {
  name:
    CognitiveProfileName;

  displayName: string;

  description: string;

  priorities:
    CognitiveProfilePriorities;

  routing: {
    preferLocal:
      boolean;

    requireLocal:
      boolean;

    preferLowCost:
      boolean;

    allowExperimentalCandidates:
      boolean;

    candidateBreadth:
      number;
  };

  strategy: {
    preferred:
      string[];

    maxPasses:
      number;

    allowMultiModel:
      boolean;

    allowCritic:
      boolean;

    allowCompetition:
      boolean;

    allowRefinement:
      boolean;
  };

  reasoningEffort:
    CognitiveProfileReasoningEffort;

  verification:
    CognitiveProfileVerificationMode;
}

export interface CognitiveProfileTaskConstraints {
  privacySensitivity?:
    string;

  localOnly?:
    boolean;

  remoteAllowed?:
    boolean;

  allowExperimental?:
    boolean;

  validationRequired?:
    boolean;

  maxPasses?:
    number;

  reasoningDepth?:
    string;

  costSensitive?:
    boolean;

  latencySensitive?:
    boolean;
}

export interface CognitiveProfileRoutingHints {
  profile:
    CognitiveProfileName;

  priorities:
    CognitiveProfilePriorities;

  requireLocal:
    boolean;

  allowRemote:
    boolean;

  preferLocal:
    boolean;

  preferLowCost:
    boolean;

  allowExperimentalCandidates:
    boolean;

  candidateBreadth:
    number;

  preferredStrategies:
    string[];

  maxPasses:
    number;

  reasoningEffort:
    CognitiveProfileReasoningEffort;

  verification:
    CognitiveProfileVerificationMode;

  validationRequired:
    boolean;

  warnings:
    string[];

  invariants: {
    taskPrivacyCanBeWeakened:
      false;

    taskPassBudgetCanBeExceeded:
      false;

    requiredReasoningCanBeReduced:
      false;

    registryEligibilityBypassed:
      false;

    authorityModified:
      false;

    safetyModified:
      false;

    verificationDisabled:
      false;

    workflowRewritten:
      false;
  };
}

function weight(
  value: number,
  field: string,
): number {
  if (
    !Number.isFinite(
      value,
    ) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${field} must be between 0 and 1.`,
    );
  }

  return value;
}

function positiveInteger(
  value: number,
  field: string,
): number {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 1
  ) {
    throw new Error(
      `${field} must be a positive integer.`,
    );
  }

  return value;
}

const PROFILES:
  Record<
    CognitiveProfileName,
    CognitiveProfileDefinition
  > = {
    fast: {
      name:
        "fast",

      displayName:
        "Fast",

      description:
        "Minimize latency and cognitive passes while preserving task constraints, verification requirements, and authority.",

      priorities: {
        quality:
          0.65,

        latency:
          1,

        cost:
          0.65,

        privacy:
          0.6,

        exploration:
          0.1,
      },

      routing: {
        preferLocal:
          true,

        requireLocal:
          false,

        preferLowCost:
          true,

        allowExperimentalCandidates:
          false,

        candidateBreadth:
          2,
      },

      strategy: {
        preferred: [
          "single-model",
          "cheap-first-escalation",
          "specialist",
        ],

        maxPasses:
          2,

        allowMultiModel:
          false,

        allowCritic:
          true,

        allowCompetition:
          false,

        allowRefinement:
          false,
      },

      reasoningEffort:
        "standard",

      verification:
        "standard",
    },

    deep: {
      name:
        "deep",

      displayName:
        "Deep",

      description:
        "Optimize for solution quality, reasoning depth, verification, and multi-pass cognition over latency or cost.",

      priorities: {
        quality:
          1,

        latency:
          0.2,

        cost:
          0.25,

        privacy:
          0.65,

        exploration:
          0.35,
      },

      routing: {
        preferLocal:
          false,

        requireLocal:
          false,

        preferLowCost:
          false,

        allowExperimentalCandidates:
          false,

        candidateBreadth:
          5,
      },

      strategy: {
        preferred: [
          "critic-loop",
          "competition",
          "refinement",
          "specialist",
          "single-model",
        ],

        maxPasses:
          6,

        allowMultiModel:
          true,

        allowCritic:
          true,

        allowCompetition:
          true,

        allowRefinement:
          true,
      },

      reasoningEffort:
        "very-deep",

      verification:
        "strict",
    },

    private: {
      name:
        "private",

      displayName:
        "Private",

      description:
        "Keep cognition local and prioritize data containment without weakening quality, verification, or authority controls.",

      priorities: {
        quality:
          0.8,

        latency:
          0.55,

        cost:
          0.7,

        privacy:
          1,

        exploration:
          0.1,
      },

      routing: {
        preferLocal:
          true,

        requireLocal:
          true,

        preferLowCost:
          true,

        allowExperimentalCandidates:
          false,

        candidateBreadth:
          3,
      },

      strategy: {
        preferred: [
          "single-model",
          "critic-loop",
          "refinement",
          "specialist",
        ],

        maxPasses:
          4,

        allowMultiModel:
          true,

        allowCritic:
          true,

        allowCompetition:
          true,

        allowRefinement:
          true,
      },

      reasoningEffort:
        "deep",

      verification:
        "strict",
    },

    cheap: {
      name:
        "cheap",

      displayName:
        "Cheap",

      description:
        "Prefer low-cost candidates and cheap-first escalation while retaining correctness, privacy, verification, and authority floors.",

      priorities: {
        quality:
          0.6,

        latency:
          0.65,

        cost:
          1,

        privacy:
          0.65,

        exploration:
          0.1,
      },

      routing: {
        preferLocal:
          true,

        requireLocal:
          false,

        preferLowCost:
          true,

        allowExperimentalCandidates:
          false,

        candidateBreadth:
          3,
      },

      strategy: {
        preferred: [
          "cheap-first-escalation",
          "single-model",
          "specialist",
        ],

        maxPasses:
          3,

        allowMultiModel:
          false,

        allowCritic:
          true,

        allowCompetition:
          false,

        allowRefinement:
          false,
      },

      reasoningEffort:
        "standard",

      verification:
        "standard",
    },

    experimental: {
      name:
        "experimental",

      displayName:
        "Experimental",

      description:
        "Permit empirically unproven or experimental candidates and broader strategy exploration while keeping normal eligibility, privacy, verification, and authority gates.",

      priorities: {
        quality:
          0.7,

        latency:
          0.35,

        cost:
          0.35,

        privacy:
          0.65,

        exploration:
          1,
      },

      routing: {
        preferLocal:
          false,

        requireLocal:
          false,

        preferLowCost:
          false,

        allowExperimentalCandidates:
          true,

        candidateBreadth:
          6,
      },

      strategy: {
        preferred: [
          "competition",
          "critic-loop",
          "refinement",
          "specialist",
          "single-model",
        ],

        maxPasses:
          6,

        allowMultiModel:
          true,

        allowCritic:
          true,

        allowCompetition:
          true,

        allowRefinement:
          true,
      },

      reasoningEffort:
        "deep",

      verification:
        "strict",
    },
  };

function validateDefinition(
  profile:
    CognitiveProfileDefinition,
): CognitiveProfileDefinition {
  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      profile.priorities,
    )
  ) {
    weight(
      value,
      `profile.${profile.name}.priorities.${key}`,
    );
  }

  positiveInteger(
    profile.routing
      .candidateBreadth,
    `profile.${profile.name}.routing.candidateBreadth`,
  );

  positiveInteger(
    profile.strategy
      .maxPasses,
    `profile.${profile.name}.strategy.maxPasses`,
  );

  if (
    profile.strategy
      .preferred.length ===
    0
  ) {
    throw new Error(
      `profile.${profile.name}.strategy.preferred must not be empty.`,
    );
  }

  return structuredClone(
    profile,
  );
}

for (
  const profile
  of Object.values(
    PROFILES,
  )
) {
  validateDefinition(
    profile,
  );
}

function requiredReasoningEffort(
  depth:
    string
    | undefined,
): CognitiveProfileReasoningEffort {
  switch (
    depth
      ?.trim()
      .toLowerCase()
  ) {
    case "very-deep":
    case "very_deep":
    case "maximum":
      return "very-deep";

    case "deep":
      return "deep";

    default:
      return "standard";
  }
}

const REASONING_ORDER:
  CognitiveProfileReasoningEffort[] = [
    "standard",
    "deep",
    "very-deep",
    "maximum",
  ];

function maxReasoningEffort(
  left:
    CognitiveProfileReasoningEffort,
  right:
    CognitiveProfileReasoningEffort,
): CognitiveProfileReasoningEffort {
  return (
    REASONING_ORDER
      .indexOf(
        left,
      ) >=
    REASONING_ORDER
      .indexOf(
        right,
      )
  )
    ? left
    : right;
}

function privacyRequiresLocal(
  value:
    string
    | undefined,
): boolean {
  const normalized =
    value
      ?.trim()
      .toLowerCase();

  return (
    normalized ===
      "highly-sensitive" ||
    normalized ===
      "highly_sensitive" ||
    normalized ===
      "local-only" ||
    normalized ===
      "local_only"
  );
}

function effectivePriorities(
  profile:
    CognitiveProfileDefinition,
  task:
    CognitiveProfileTaskConstraints,
): CognitiveProfilePriorities {
  const priorities =
    structuredClone(
      profile.priorities,
    );

  if (
    task.costSensitive
  ) {
    priorities.cost =
      Math.max(
        priorities.cost,
        0.9,
      );
  }

  if (
    task.latencySensitive
  ) {
    priorities.latency =
      Math.max(
        priorities.latency,
        0.9,
      );
  }

  if (
    privacyRequiresLocal(
      task.privacySensitivity,
    ) ||
    task.localOnly
  ) {
    priorities.privacy =
      1;
  }

  return priorities;
}

function effectivePassBudget(
  profileBudget: number,
  taskBudget:
    number
    | undefined,
): number {
  if (
    taskBudget ===
    undefined
  ) {
    return profileBudget;
  }

  positiveInteger(
    taskBudget,
    "task.maxPasses",
  );

  return Math.min(
    profileBudget,
    taskBudget,
  );
}

export function listCognitiveProfiles():
  CognitiveProfileDefinition[] {
  return Object.values(
    PROFILES,
  )
    .map(
      (profile) =>
        structuredClone(
          profile,
        ),
    );
}

export function getCognitiveProfile(
  name:
    CognitiveProfileName,
): CognitiveProfileDefinition {
  const profile =
    PROFILES[name];

  if (!profile) {
    throw new Error(
      `Unknown cognitive profile: ${String(name)}`,
    );
  }

  return structuredClone(
    profile,
  );
}

export function resolveCognitiveProfile(
  name:
    CognitiveProfileName,
  task:
    CognitiveProfileTaskConstraints =
      {},
): CognitiveProfileRoutingHints {
  const profile =
    getCognitiveProfile(
      name,
    );

  const taskForcesLocal =
    task.localOnly ===
      true ||
    privacyRequiresLocal(
      task.privacySensitivity,
    );

  const requireLocal =
    profile.routing
      .requireLocal ||
    taskForcesLocal;

  const allowRemote =
    !requireLocal &&
    task.remoteAllowed !==
      false;

  const allowExperimentalCandidates =
    profile.routing
      .allowExperimentalCandidates &&
    task.allowExperimental !==
      false;

  const validationRequired =
    task.validationRequired ??
    false;

  const minimumEffort =
    requiredReasoningEffort(
      task.reasoningDepth,
    );

  const reasoningEffort =
    maxReasoningEffort(
      profile.reasoningEffort,
      minimumEffort,
    );

  const maxPasses =
    effectivePassBudget(
      profile.strategy
        .maxPasses,
      task.maxPasses,
    );

  const verification:
    CognitiveProfileVerificationMode =
      validationRequired ||
      profile.verification ===
        "strict"
        ? "strict"
        : "standard";

  const warnings:
    string[] =
      [];

  if (
    profile.name ===
      "experimental" &&
    !allowExperimentalCandidates
  ) {
    warnings.push(
      "Experimental profile is active, but task constraints disallow experimental candidates.",
    );
  }

  if (
    profile.name !==
      "private" &&
    taskForcesLocal
  ) {
    warnings.push(
      "Task privacy constraints override profile remote preferences; local execution is required.",
    );
  }

  if (
    task.maxPasses !==
      undefined &&
    profile.strategy
      .maxPasses >
      task.maxPasses
  ) {
    warnings.push(
      "Profile pass budget was clamped to the task/reasoning-contract ceiling.",
    );
  }

  if (
    reasoningEffort !==
    profile.reasoningEffort
  ) {
    warnings.push(
      "Profile reasoning effort was raised to satisfy the task's required reasoning depth.",
    );
  }

  return {
    profile:
      profile.name,

    priorities:
      effectivePriorities(
        profile,
        task,
      ),

    requireLocal,

    allowRemote,

    preferLocal:
      requireLocal ||
      profile.routing
        .preferLocal,

    preferLowCost:
      profile.routing
        .preferLowCost,

    allowExperimentalCandidates,

    candidateBreadth:
      profile.routing
        .candidateBreadth,

    preferredStrategies:
      structuredClone(
        profile.strategy
          .preferred,
      ),

    maxPasses,

    reasoningEffort,

    verification,

    validationRequired,

    warnings,

    invariants: {
      taskPrivacyCanBeWeakened:
        false,

      taskPassBudgetCanBeExceeded:
        false,

      requiredReasoningCanBeReduced:
        false,

      registryEligibilityBypassed:
        false,

      authorityModified:
        false,

      safetyModified:
        false,

      verificationDisabled:
        false,

      workflowRewritten:
        false,
    },
  };
}