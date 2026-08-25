export type LearningExperienceSource =
  | "cognitive-cycle"
  | "user-feedback"
  | "action-outcome"
  | "system-observation";

export type LearningOutcomeStatus =
  | "success"
  | "failure"
  | "mixed"
  | "unknown";

export type LearningFeedbackKind =
  | "none"
  | "explicit-positive"
  | "explicit-negative"
  | "correction";

export interface LearningOutcome {
  status: LearningOutcomeStatus;
  score?: number;
  detail?: string;
}

export interface LearningFeedback {
  kind: LearningFeedbackKind;
  detail?: string;
}

export interface LearningEvidence {
  eventIds: string[];
  worldStateKeys: string[];
  cognitiveDecisionIds: string[];
}

export interface LearningExperience {
  id: string;
  occurredAt: string;
  recordedAt: string;
  source: LearningExperienceSource;
  subject?: string;
  confidence: number;
  outcome: LearningOutcome;
  feedback: LearningFeedback;
  evidence: LearningEvidence;
  context: Record<string, unknown>;
}

export interface LearningExperienceInput {
  id: string;
  occurredAt: string;
  recordedAt?: string;
  source: LearningExperienceSource;
  subject?: string;
  confidence?: number;
  outcome?: Partial<LearningOutcome>;
  feedback?: Partial<LearningFeedback>;
  evidence?: Partial<LearningEvidence>;
  context?: Record<string, unknown>;
}

export type LearningEligibilityReasonCode =
  | "explicit-feedback"
  | "known-outcome"
  | "grounded-evidence"
  | "adequate-confidence"
  | "low-confidence"
  | "insufficient-signal";

export interface LearningEligibilityReason {
  code: LearningEligibilityReasonCode;
  weight: number;
  detail: string;
}

export interface LearningEligibilityAssessment {
  experienceId: string;
  eligible: boolean;
  score: number;
  reasons: LearningEligibilityReason[];
}
