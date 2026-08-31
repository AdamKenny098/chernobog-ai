import {
  assessLearningPromotion,
} from "./promotionGate";
import type {
  LearningPatternCandidate,
  LearningPatternScope,
} from "./patternTypes";
import type {
  LearnedLesson,
  LearningPromotionContext,
  LearningPromotionPolicy,
} from "./promotionTypes";

function approvedAt(
  context: LearningPromotionContext,
): string | undefined {
  if (!context.approvedAt) {
    return undefined;
  }

  const parsed =
    new Date(context.approvedAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      "learning promotion approvedAt must be a valid timestamp.",
    );
  }

  return parsed.toISOString();
}

function normalizedProjectId(
  pattern: LearningPatternCandidate,
): string | undefined {
  const value =
    pattern.projectId?.trim();

  return value || undefined;
}

function promotedScope(
  pattern: LearningPatternCandidate,
): {
  scope: LearningPatternScope;
  projectId?: string;
} {
  const projectId =
    normalizedProjectId(pattern);

  if (
    pattern.scope === "project" ||
    projectId
  ) {
    if (!projectId) {
      throw new Error(
        `project-scoped learning pattern ${pattern.key} requires projectId.`,
      );
    }

    return {
      scope: "project",
      projectId,
    };
  }

  return {
    scope: "global",
  };
}

export function promoteLearningPattern(
  pattern: LearningPatternCandidate,
  context: LearningPromotionContext,
  options: {
    policy?: LearningPromotionPolicy;
    now?: Date;
  } = {},
): LearnedLesson {
  const assessment =
    assessLearningPromotion(
      pattern,
      context,
      options.policy,
    );

  if (
    assessment.decision !== "promote"
  ) {
    throw new Error(
      `learning pattern ${pattern.key} is not approved for promotion: ${assessment.decision}`,
    );
  }

  const now =
    options.now ?? new Date();

  const scope =
    promotedScope(pattern);

  return {
    id:
      `lesson:${pattern.key}`,
    key:
      pattern.key,
    kind:
      pattern.kind,
    statement:
      pattern.statement,
    status:
      "active",
    scope:
      scope.scope,
    projectId:
      scope.projectId,
    confidence:
      pattern.confidence,
    supportCount:
      pattern.supportCount,
    contradictionCount:
      pattern.contradictionCount,
    promotedAt:
      now.toISOString(),
    governance: {
      authority:
        context.authority,
      approved:
        context.approved,
      approvedBy:
        context.approvedBy?.trim() ||
        undefined,
      approvedAt:
        approvedAt(context),
    },
    evidence:
      structuredClone(
        pattern.evidence,
      ),
    sourcePattern:
      structuredClone(pattern),
  };
}

export function revokeLearnedLesson(
  lesson: LearnedLesson,
  reason: string,
  now = new Date(),
): LearnedLesson {
  const normalized =
    reason.trim();

  if (!normalized) {
    throw new Error(
      "learning lesson revocation reason must not be empty.",
    );
  }

  return {
    ...structuredClone(lesson),
    status:
      "revoked",
    revokedAt:
      now.toISOString(),
    revocationReason:
      normalized,
  };
}
