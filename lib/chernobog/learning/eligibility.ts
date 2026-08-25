import type {
  LearningEligibilityAssessment,
  LearningEligibilityReason,
  LearningExperience,
} from "./types";

function addReason(
  reasons: LearningEligibilityReason[],
  code: LearningEligibilityReason["code"],
  weight: number,
  detail: string,
): void {
  reasons.push({ code, weight, detail });
}

export function assessLearningEligibility(
  experience: LearningExperience,
): LearningEligibilityAssessment {
  const reasons: LearningEligibilityReason[] = [];
  let score = 0;

  if (experience.feedback.kind !== "none") {
    score += 50;
    addReason(
      reasons,
      "explicit-feedback",
      50,
      "Explicit user feedback or correction is a strong learning signal.",
    );
  }

  if (experience.outcome.status !== "unknown") {
    score += 30;
    addReason(
      reasons,
      "known-outcome",
      30,
      "The experience has an observed success, failure, or mixed outcome.",
    );
  }

  const evidenceCount =
    experience.evidence.eventIds.length +
    experience.evidence.worldStateKeys.length +
    experience.evidence.cognitiveDecisionIds.length;

  if (evidenceCount > 0) {
    score += 10;
    addReason(
      reasons,
      "grounded-evidence",
      10,
      "The experience is grounded in retained evidence.",
    );
  }

  if (experience.confidence >= 0.7) {
    score += 10;
    addReason(
      reasons,
      "adequate-confidence",
      10,
      "Evidence confidence is sufficient for candidate learning.",
    );
  } else if (experience.confidence < 0.4) {
    score = Math.round(score * 0.5);
    addReason(
      reasons,
      "low-confidence",
      0,
      "Low confidence dampens the learning signal.",
    );
  }

  score = Math.max(0, Math.min(100, score));
  const eligible = score >= 40;

  if (!eligible) {
    addReason(
      reasons,
      "insufficient-signal",
      0,
      "The experience is not strong enough to become a learning candidate yet.",
    );
  }

  return {
    experienceId: experience.id,
    eligible,
    score,
    reasons,
  };
}
