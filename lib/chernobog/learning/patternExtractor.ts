import type { EvaluatedLearningExperience } from "./evaluationTypes";
import { DEFAULT_LEARNING_PATTERN_POLICY, validateLearningPatternPolicy } from "./patternPolicy";
import type { LearningPatternCandidate, LearningPatternExtractionResult, LearningPatternKind, LearningPatternPolicy } from "./patternTypes";

interface PatternContribution {
  key: string;
  kind: LearningPatternKind;
  statement: string;
  support: boolean;
  confidence: number;
  observedAt: string;
  evaluation: EvaluatedLearningExperience;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
}

function subjectFor(evaluation: EvaluatedLearningExperience): string {
  return evaluation.experience.subject?.trim() || "general";
}

function contributionsFor(evaluation: EvaluatedLearningExperience): PatternContribution[] {
  const contributions: PatternContribution[] = [];
  const subject = subjectFor(evaluation);
  const subjectKey = normalizeKey(subject);
  const feedback = evaluation.resolvedFeedback;

  if (feedback.kind === "correction" && feedback.detail) {
    contributions.push({
      key: `correction:${subjectKey}:${normalizeKey(feedback.detail)}`,
      kind: "correction-pattern",
      statement: feedback.detail,
      support: true,
      confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
  }

  if (feedback.kind === "explicit-positive") {
    contributions.push({
      key: `preference:${subjectKey}:positive`,
      kind: "preference",
      statement: `Positive feedback is repeatedly associated with ${subject}.`,
      support: true,
      confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
  }

  if (feedback.kind === "explicit-negative") {
    contributions.push({
      key: `preference:${subjectKey}:positive`,
      kind: "preference",
      statement: `Positive feedback is repeatedly associated with ${subject}.`,
      support: false,
      confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
  }

  const outcome = evaluation.resolvedOutcome;
  if (outcome.status === "success") {
    contributions.push({
      key: `success:${subjectKey}`,
      kind: "success-pattern",
      statement: `${subject} is repeatedly associated with successful outcomes.`,
      support: true,
      confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
  }
  if (outcome.status === "failure") {
    contributions.push({
      key: `failure:${subjectKey}`,
      kind: "failure-pattern",
      statement: `${subject} is repeatedly associated with failed outcomes.`,
      support: true,
      confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
    contributions.push({
      key: `success:${subjectKey}`,
      kind: "success-pattern",
      statement: `${subject} is repeatedly associated with successful outcomes.`,
      support: false,
      confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
      observedAt: evaluation.evaluatedAt,
      evaluation,
    });
  }
  return contributions;
}

export function extractLearningPatterns(
  evaluations: readonly EvaluatedLearningExperience[],
  policy: LearningPatternPolicy = DEFAULT_LEARNING_PATTERN_POLICY,
): LearningPatternExtractionResult {
  validateLearningPatternPolicy(policy);
  const grouped = new Map<string, PatternContribution[]>();
  for (const evaluation of evaluations) {
    for (const contribution of contributionsFor(evaluation)) {
      const current = grouped.get(contribution.key) ?? [];
      current.push(contribution);
      grouped.set(contribution.key, current);
    }
  }

  const candidates: LearningPatternCandidate[] = [];
  const rejectedKeys: string[] = [];
  for (const [key, contributions] of [...grouped.entries()].sort(([a],[b]) => a.localeCompare(b))) {
    const support = contributions.filter((item) => item.support);
    const contradictions = contributions.filter((item) => !item.support);
    if (support.length < policy.minimumSupport) { rejectedKeys.push(key); continue; }
    const total = support.length + contradictions.length;
    const contradictionRatio = total === 0 ? 0 : contradictions.length / total;
    if (contradictionRatio > policy.maximumContradictionRatio) { rejectedKeys.push(key); continue; }
    const averageConfidence = support.reduce((sum,item)=>sum+item.confidence,0)/support.length;
    const confidence = Math.max(0, Math.min(1, averageConfidence * (1 - contradictionRatio)));
    if (confidence < policy.confidenceFloor) { rejectedKeys.push(key); continue; }
    const ordered = support.slice().sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
    const representative = ordered[0]!;
    candidates.push({
      id: `pattern:${key}`,
      key,
      kind: representative.kind,
      statement: representative.statement,
      supportCount: support.length,
      contradictionCount: contradictions.length,
      confidence,
      firstObservedAt: ordered[0]!.observedAt,
      lastObservedAt: ordered[ordered.length-1]!.observedAt,
      evidence: {
        experienceIds: [...new Set(ordered.map((item)=>item.evaluation.experience.id))].sort(),
        subjects: [...new Set(ordered.map((item)=>subjectFor(item.evaluation)))].sort(),
        feedbackKinds: [...new Set(ordered.map((item)=>item.evaluation.resolvedFeedback.kind))].sort(),
        outcomeStatuses: [...new Set(ordered.map((item)=>item.evaluation.resolvedOutcome.status))].sort(),
      },
      sourceEvaluations: ordered.map((item)=>structuredClone(item.evaluation)),
    });
  }
  candidates.sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key));
  return { candidates, rejectedKeys: rejectedKeys.sort() };
}
