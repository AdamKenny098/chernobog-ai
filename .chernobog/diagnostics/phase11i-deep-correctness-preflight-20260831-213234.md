# Chernobog Phase 11I - Learning Deep-Correctness Preflight

Generated: 2026-08-31T21:32:34.9883412+01:00

Goal: determine whether Phase 11I learning is not only structurally present, but actually safe, scoped, durable, and model-facing in live use.

Target deep-correctness loop:

experience -> candidate pattern -> support/contradiction accumulation -> governance -> approved lesson -> durable store -> retrieval -> advisory influence

Required safety boundaries:
- learning must not execute tools
- learning must not grant permissions
- learning must not rewrite governance
- unapproved patterns must not alter behavior
- a one-off observation must not become a durable rule
- project-scoped learning must not cross-contaminate projects
- learned guidance must not override fresher World State
- learned guidance must remain advisory rather than authoritative fact

## 11I learning source inventory

Pattern: `learning|experience|pattern|lesson|promotion|promote|revoke|confidence|supportCount|contradictionCount|governance|approved|lessonKeys`

- `lib\chernobog\learning\adaptationEngine.ts:5` - DEFAULT_LEARNING_ADAPTATION_POLICY,
- `lib\chernobog\learning\adaptationEngine.ts:6` - validateLearningAdaptationPolicy,
- `lib\chernobog\learning\adaptationEngine.ts:9` - matchLessonToSignal,
- `lib\chernobog\learning\adaptationEngine.ts:10` - } from "./lessonApplicability";
- `lib\chernobog\learning\adaptationEngine.ts:12` - LearnedLesson,
- `lib\chernobog\learning\adaptationEngine.ts:13` - } from "./promotionTypes";
- `lib\chernobog\learning\adaptationEngine.ts:15` - LearningAdaptationInfluence,
- `lib\chernobog\learning\adaptationEngine.ts:16` - LearningAdaptationPolicy,
- `lib\chernobog\learning\adaptationEngine.ts:17` - LearningAdaptationResult,
- `lib\chernobog\learning\adaptationEngine.ts:18` - LearningFocusAdaptationResult,
- `lib\chernobog\learning\adaptationEngine.ts:32` - function influenceForLesson(
- `lib\chernobog\learning\adaptationEngine.ts:33` - lesson: LearnedLesson,
- `lib\chernobog\learning\adaptationEngine.ts:35` - policy: LearningAdaptationPolicy,
- `lib\chernobog\learning\adaptationEngine.ts:36` - ): LearningAdaptationInfluence | undefined {
- `lib\chernobog\learning\adaptationEngine.ts:38` - lesson.status !== "active" ||
- `lib\chernobog\learning\adaptationEngine.ts:39` - lesson.confidence <
- `lib\chernobog\learning\adaptationEngine.ts:40` - policy.minimumLessonConfidence
- `lib\chernobog\learning\adaptationEngine.ts:46` - matchLessonToSignal(
- `lib\chernobog\learning\adaptationEngine.ts:47` - lesson,
- `lib\chernobog\learning\adaptationEngine.ts:60` - lesson.confidence *
- `lib\chernobog\learning\adaptationEngine.ts:66` - lesson.kind === "correction-pattern" ||
- `lib\chernobog\learning\adaptationEngine.ts:67` - lesson.kind === "preference"
- `lib\chernobog\learning\adaptationEngine.ts:70` - lessonKey: lesson.key,
- `lib\chernobog\learning\adaptationEngine.ts:72` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationEngine.ts:74` - guidance: lesson.statement,
- `lib\chernobog\learning\adaptationEngine.ts:79` - lessonKey: lesson.key,
- `lib\chernobog\learning\adaptationEngine.ts:81` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationEngine.ts:86` - export function adaptAttentionWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:88` - lessons: readonly LearnedLesson[],
- `lib\chernobog\learning\adaptationEngine.ts:90` - LearningAdaptationPolicy =
- `lib\chernobog\learning\adaptationEngine.ts:91` - DEFAULT_LEARNING_ADAPTATION_POLICY,
- `lib\chernobog\learning\adaptationEngine.ts:92` - ): LearningAdaptationResult {
- `lib\chernobog\learning\adaptationEngine.ts:93` - validateLearningAdaptationPolicy(policy);
- `lib\chernobog\learning\adaptationEngine.ts:95` - const influences = lessons
- `lib\chernobog\learning\adaptationEngine.ts:96` - .map((lesson) =>
- `lib\chernobog\learning\adaptationEngine.ts:97` - influenceForLesson(
- `lib\chernobog\learning\adaptationEngine.ts:98` - lesson,
- `lib\chernobog\learning\adaptationEngine.ts:106` - ): influence is LearningAdaptationInfluence =>
- `lib\chernobog\learning\adaptationEngine.ts:120` - return left.lessonKey.localeCompare(
- `lib\chernobog\learning\adaptationEngine.ts:121` - right.lessonKey,
- `lib\chernobog\learning\adaptationEngine.ts:154` - export function adaptFocusCandidateWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:156` - lessons: readonly LearnedLesson[],
- `lib\chernobog\learning\adaptationEngine.ts:158` - LearningAdaptationPolicy =
- `lib\chernobog\learning\adaptationEngine.ts:159` - DEFAULT_LEARNING_ADAPTATION_POLICY,
- `lib\chernobog\learning\adaptationEngine.ts:160` - ): LearningFocusAdaptationResult {
- `lib\chernobog\learning\adaptationEngine.ts:162` - adaptAttentionWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:164` - lessons,
- `lib\chernobog\learning\adaptationPolicy.ts:2` - LearningAdaptationPolicy,
- `lib\chernobog\learning\adaptationPolicy.ts:5` - export const DEFAULT_LEARNING_ADAPTATION_POLICY:
- `lib\chernobog\learning\adaptationPolicy.ts:6` - LearningAdaptationPolicy = {
- `lib\chernobog\learning\adaptationPolicy.ts:8` - minimumLessonConfidence: 0.75,
- `lib\chernobog\learning\adaptationPolicy.ts:11` - export function validateLearningAdaptationPolicy(
- `lib\chernobog\learning\adaptationPolicy.ts:12` - policy: LearningAdaptationPolicy,
- `lib\chernobog\learning\adaptationPolicy.ts:20` - "learning adaptation maxPriorityBoost must be between 0 and 25.",
- `lib\chernobog\learning\adaptationPolicy.ts:25` - !Number.isFinite(policy.minimumLessonConfidence) ||
- `lib\chernobog\learning\adaptationPolicy.ts:26` - policy.minimumLessonConfidence < 0 ||
- `lib\chernobog\learning\adaptationPolicy.ts:27` - policy.minimumLessonConfidence > 1
- `lib\chernobog\learning\adaptationPolicy.ts:30` - "learning adaptation minimumLessonConfidence must be between 0 and 1.",
- `lib\chernobog\learning\adaptationTypes.ts:6` - LearnedLesson,
- `lib\chernobog\learning\adaptationTypes.ts:7` - } from "./promotionTypes";
- `lib\chernobog\learning\adaptationTypes.ts:9` - export type LearningAdaptationKind =
- `lib\chernobog\learning\adaptationTypes.ts:13` - export interface LearningAdaptationInfluence {
- `lib\chernobog\learning\adaptationTypes.ts:14` - lessonKey: string;
- `lib\chernobog\learning\adaptationTypes.ts:15` - kind: LearningAdaptationKind;
- `lib\chernobog\learning\adaptationTypes.ts:16` - confidence: number;
- `lib\chernobog\learning\adaptationTypes.ts:21` - export interface LearningAdaptationResult {
- `lib\chernobog\learning\adaptationTypes.ts:25` - influences: LearningAdaptationInfluence[];
- `lib\chernobog\learning\adaptationTypes.ts:28` - export interface LearningFocusAdaptationResult {
- `lib\chernobog\learning\adaptationTypes.ts:32` - influences: LearningAdaptationInfluence[];
- `lib\chernobog\learning\adaptationTypes.ts:35` - export interface LearningAdaptationPolicy {
- `lib\chernobog\learning\adaptationTypes.ts:37` - minimumLessonConfidence: number;
- `lib\chernobog\learning\adaptationTypes.ts:40` - export interface LearningLessonMatch {
- `lib\chernobog\learning\adaptationTypes.ts:41` - lesson: LearnedLesson;
- `lib\chernobog\learning\eligibility.ts:2` - LearningEligibilityAssessment,
- `lib\chernobog\learning\eligibility.ts:3` - LearningEligibilityReason,
- `lib\chernobog\learning\eligibility.ts:4` - LearningExperience,
- `lib\chernobog\learning\eligibility.ts:8` - reasons: LearningEligibilityReason[],
- `lib\chernobog\learning\eligibility.ts:9` - code: LearningEligibilityReason["code"],
- `lib\chernobog\learning\eligibility.ts:16` - export function assessLearningEligibility(
- `lib\chernobog\learning\eligibility.ts:17` - experience: LearningExperience,
- `lib\chernobog\learning\eligibility.ts:18` - ): LearningEligibilityAssessment {
- `lib\chernobog\learning\eligibility.ts:19` - const reasons: LearningEligibilityReason[] = [];
- `lib\chernobog\learning\eligibility.ts:22` - if (experience.feedback.kind !== "none") {
- `lib\chernobog\learning\eligibility.ts:28` - "Explicit user feedback or correction is a strong learning signal.",
- `lib\chernobog\learning\eligibility.ts:32` - if (experience.outcome.status !== "unknown") {
- `lib\chernobog\learning\eligibility.ts:38` - "The experience has an observed success, failure, or mixed outcome.",
- `lib\chernobog\learning\eligibility.ts:43` - experience.evidence.eventIds.length +
- `lib\chernobog\learning\eligibility.ts:44` - experience.evidence.worldStateKeys.length +
- `lib\chernobog\learning\eligibility.ts:45` - experience.evidence.cognitiveDecisionIds.length;
- `lib\chernobog\learning\eligibility.ts:53` - "The experience is grounded in retained evidence.",
- `lib\chernobog\learning\eligibility.ts:57` - if (experience.confidence >= 0.7) {
- `lib\chernobog\learning\eligibility.ts:61` - "adequate-confidence",
- `lib\chernobog\learning\eligibility.ts:63` - "Evidence confidence is sufficient for candidate learning.",
- `lib\chernobog\learning\eligibility.ts:65` - } else if (experience.confidence < 0.4) {
- `lib\chernobog\learning\eligibility.ts:69` - "low-confidence",
- `lib\chernobog\learning\eligibility.ts:71` - "Low confidence dampens the learning signal.",
- `lib\chernobog\learning\eligibility.ts:83` - "The experience is not strong enough to become a learning candidate yet.",
- `lib\chernobog\learning\eligibility.ts:88` - experienceId: experience.id,
- `lib\chernobog\learning\evaluationStore.ts:2` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluationStore.ts:3` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluationStore.ts:10` - export class ChernobogLearningEvaluationStore {
- `lib\chernobog\learning\evaluationStore.ts:14` - LearningOutcomeObservation
- `lib\chernobog\learning\evaluationStore.ts:20` - LearningFeedbackObservation
- `lib\chernobog\learning\evaluationStore.ts:25` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluationStore.ts:35` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluationStore.ts:44` - experienceId: string,
- `lib\chernobog\learning\evaluationStore.ts:45` - ): LearningOutcomeObservation[] {
- `lib\chernobog\learning\evaluationStore.ts:51` - item.experienceId ===
- `lib\chernobog\learning\evaluationStore.ts:52` - experienceId,
- `lib\chernobog\learning\evaluationStore.ts:64` - experienceId: string,
- `lib\chernobog\learning\evaluationStore.ts:65` - ): LearningFeedbackObservation[] {
- `lib\chernobog\learning\evaluationStore.ts:71` - item.experienceId ===
- `lib\chernobog\learning\evaluationStore.ts:72` - experienceId,
- `lib\chernobog\learning\evaluationTypes.ts:2` - LearningExperience,
- `lib\chernobog\learning\evaluationTypes.ts:3` - LearningFeedbackKind,
- `lib\chernobog\learning\evaluationTypes.ts:4` - LearningOutcomeStatus,
- `lib\chernobog\learning\evaluationTypes.ts:7` - export interface LearningOutcomeObservation {
- `lib\chernobog\learning\evaluationTypes.ts:9` - experienceId: string;
- `lib\chernobog\learning\evaluationTypes.ts:11` - status: LearningOutcomeStatus;
- `lib\chernobog\learning\evaluationTypes.ts:13` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:19` - export interface LearningFeedbackObservation {
- `lib\chernobog\learning\evaluationTypes.ts:21` - experienceId: string;
- `lib\chernobog\learning\evaluationTypes.ts:23` - kind: LearningFeedbackKind;
- `lib\chernobog\learning\evaluationTypes.ts:24` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:28` - export type LearningEvaluationReasonCode =
- `lib\chernobog\learning\evaluationTypes.ts:36` - | "insufficient-outcome-confidence"
- `lib\chernobog\learning\evaluationTypes.ts:39` - export interface LearningEvaluationReason {
- `lib\chernobog\learning\evaluationTypes.ts:40` - code: LearningEvaluationReasonCode;
- `lib\chernobog\learning\evaluationTypes.ts:44` - export interface EvaluatedLearningExperience {
- `lib\chernobog\learning\evaluationTypes.ts:45` - experience: LearningExperience;
- `lib\chernobog\learning\evaluationTypes.ts:47` - outcomeObservations: LearningOutcomeObservation[];
- `lib\chernobog\learning\evaluationTypes.ts:48` - feedbackObservations: LearningFeedbackObservation[];
- `lib\chernobog\learning\evaluationTypes.ts:50` - status: LearningOutcomeStatus;
- `lib\chernobog\learning\evaluationTypes.ts:52` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:55` - kind: LearningFeedbackKind;
- `lib\chernobog\learning\evaluationTypes.ts:56` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:59` - evaluationConfidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:60` - reasons: LearningEvaluationReason[];
- `lib\chernobog\learning\evaluator.ts:2` - EvaluatedLearningExperience,
- `lib\chernobog\learning\evaluator.ts:3` - LearningEvaluationReason,
- `lib\chernobog\learning\evaluator.ts:4` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluator.ts:5` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluator.ts:8` - LearningExperience,
- `lib\chernobog\learning\evaluator.ts:9` - LearningFeedbackKind,
- `lib\chernobog\learning\evaluator.ts:10` - LearningOutcomeStatus,
- `lib\chernobog\learning\evaluator.ts:18` - reasons: LearningEvaluationReason[],
- `lib\chernobog\learning\evaluator.ts:19` - code: LearningEvaluationReason["code"],
- `lib\chernobog\learning\evaluator.ts:27` - readonly LearningFeedbackObservation[],
- `lib\chernobog\learning\evaluator.ts:29` - kind: LearningFeedbackKind;
- `lib\chernobog\learning\evaluator.ts:30` - confidence: number;
- `lib\chernobog\learning\evaluator.ts:36` - kind: LearningFeedbackKind,
- `lib\chernobog\learning\evaluator.ts:59` - right.confidence !==
- `lib\chernobog\learning\evaluator.ts:60` - left.confidence
- `lib\chernobog\learning\evaluator.ts:63` - right.confidence -
- `lib\chernobog\learning\evaluator.ts:64` - left.confidence
- `lib\chernobog\learning\evaluator.ts:88` - confidence: 0,
- `lib\chernobog\learning\evaluator.ts:94` - confidence: winner.confidence,
- `lib\chernobog\learning\evaluator.ts:101` - readonly LearningOutcomeObservation[],
- `lib\chernobog\learning\evaluator.ts:103` - status: LearningOutcomeStatus;
- `lib\chernobog\learning\evaluator.ts:105` - confidence: number;
- `lib\chernobog\learning\evaluator.ts:117` - confidence: 0,
- `lib\chernobog\learning\evaluator.ts:130` - successWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:134` - failureWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:138` - mixedWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:144` - item.confidence;
- `lib\chernobog\learning\evaluator.ts:146` - item.confidence;
- `lib\chernobog\learning\evaluator.ts:154` - let status: LearningOutcomeStatus;
- `lib\chernobog\learning\evaluator.ts:192` - const averageEvidenceConfidence =
- `lib\chernobog\learning\evaluator.ts:204` - const confidence =
- `lib\chernobog\learning\evaluator.ts:209` - averageEvidenceConfidence *
- `lib\chernobog\learning\evaluator.ts:227` - confidence,
- `lib\chernobog\learning\evaluator.ts:232` - export function evaluateLearningExperience(
- `lib\chernobog\learning\evaluator.ts:233` - experience: LearningExperience,
- `lib\chernobog\learning\evaluator.ts:235` - readonly LearningOutcomeObservation[],
- `lib\chernobog\learning\evaluator.ts:237` - readonly LearningFeedbackObservation[],
- `lib\chernobog\learning\evaluator.ts:239` - ): EvaluatedLearningExperience {
- `lib\chernobog\learning\evaluator.ts:244` - item.experienceId ===
- `lib\chernobog\learning\evaluator.ts:245` - experience.id,
- `lib\chernobog\learning\evaluator.ts:253` - item.experienceId ===
- `lib\chernobog\learning\evaluator.ts:254` - experience.id,
- `lib\chernobog\learning\evaluator.ts:265` - LearningEvaluationReason[] = [];
- `lib\chernobog\learning\evaluator.ts:336` - resolvedOutcome.confidence <
- `lib\chernobog\learning\evaluator.ts:341` - "insufficient-outcome-confidence",
- `lib\chernobog\learning\evaluator.ts:356` - const evaluationConfidence =
- `lib\chernobog\learning\evaluator.ts:358` - resolvedFeedback.confidence,
- `lib\chernobog\learning\evaluator.ts:359` - resolvedOutcome.confidence,
- `lib\chernobog\learning\evaluator.ts:363` - experience: clone(experience),
- `lib\chernobog\learning\evaluator.ts:385` - confidence:
- `lib\chernobog\learning\evaluator.ts:386` - resolvedOutcome.confidence,
- `lib\chernobog\learning\evaluator.ts:389` - evaluationConfidence,
- `lib\chernobog\learning\experience.ts:2` - LearningEvidence,
- `lib\chernobog\learning\experience.ts:3` - LearningExperience,
- `lib\chernobog\learning\experience.ts:4` - LearningExperienceInput,
- `lib\chernobog\learning\experience.ts:5` - LearningFeedback,
- `lib\chernobog\learning\experience.ts:6` - LearningOutcome,
- `lib\chernobog\learning\experience.ts:36` - function requireConfidence(
- `lib\chernobog\learning\experience.ts:45` - "learningExperience.confidence must be between 0 and 1.",
- `lib\chernobog\learning\experience.ts:53` - input: Partial<LearningOutcome> | undefined,
- `lib\chernobog\learning\experience.ts:54` - ): LearningOutcome {
- `lib\chernobog\learning\experience.ts:66` - "learningExperience.outcome.score must be between -1 and 1.",
- `lib\chernobog\learning\experience.ts:78` - input: Partial<LearningFeedback> | undefined,
- `lib\chernobog\learning\experience.ts:79` - ): LearningFeedback {
- `lib\chernobog\learning\experience.ts:87` - input: Partial<LearningEvidence> | undefined,
- `lib\chernobog\learning\experience.ts:88` - ): LearningEvidence {
- `lib\chernobog\learning\experience.ts:118` - "learningExperience.context must be JSON-safe.",
- `lib\chernobog\learning\experience.ts:123` - export function createLearningExperience(
- `lib\chernobog\learning\experience.ts:124` - input: LearningExperienceInput,
- `lib\chernobog\learning\experience.ts:126` - ): LearningExperience {
- `lib\chernobog\learning\experience.ts:131` - "learningExperience.id must not be empty.",
- `lib\chernobog\learning\experience.ts:137` - "learningExperience.occurredAt",
- `lib\chernobog\learning\experience.ts:142` - "learningExperience.recordedAt",
- `lib\chernobog\learning\experience.ts:150` - "learningExperience.recordedAt must not be earlier than occurredAt.",
- `lib\chernobog\learning\experience.ts:160` - confidence: requireConfidence(
- `lib\chernobog\learning\experience.ts:161` - input.confidence ?? 0.5,
- `lib\chernobog\learning\experienceStore.ts:2` - LearningExperience,
- `lib\chernobog\learning\experienceStore.ts:5` - function cloneExperience(
- `lib\chernobog\learning\experienceStore.ts:6` - experience: LearningExperience,
- `lib\chernobog\learning\experienceStore.ts:7` - ): LearningExperience {
- `lib\chernobog\learning\experienceStore.ts:8` - return structuredClone(experience);
- `lib\chernobog\learning\experienceStore.ts:11` - export class ChernobogLearningExperienceStore {
- `lib\chernobog\learning\experienceStore.ts:12` - private readonly experiences =
- `lib\chernobog\learning\experienceStore.ts:13` - new Map<string, LearningExperience>();
- `lib\chernobog\learning\experienceStore.ts:23` - "learning experience store maxEntries must be a positive integer.",
- `lib\chernobog\learning\experienceStore.ts:31` - return this.experiences.size;
- `lib\chernobog\learning\experienceStore.ts:35` - experience: LearningExperience,
- `lib\chernobog\learning\experienceStore.ts:36` - ): LearningExperience {
- `lib\chernobog\learning\experienceStore.ts:37` - this.experiences.set(
- `lib\chernobog\learning\experienceStore.ts:38` - experience.id,
- `lib\chernobog\learning\experienceStore.ts:39` - cloneExperience(experience),
- `lib\chernobog\learning\experienceStore.ts:44` - return cloneExperience(experience);
- `lib\chernobog\learning\experienceStore.ts:49` - ): LearningExperience | undefined {
- `lib\chernobog\learning\experienceStore.ts:50` - const experience = this.experiences.get(id);
- `lib\chernobog\learning\experienceStore.ts:52` - return experience
- `lib\chernobog\learning\experienceStore.ts:53` - ? cloneExperience(experience)
- `lib\chernobog\learning\experienceStore.ts:57` - list(): LearningExperience[] {
- `lib\chernobog\learning\experienceStore.ts:58` - return [...this.experiences.values()]
- `lib\chernobog\learning\experienceStore.ts:71` - .map(cloneExperience);
- `lib\chernobog\learning\experienceStore.ts:75` - return this.experiences.delete(id);
- `lib\chernobog\learning\experienceStore.ts:79` - this.experiences.clear();
- `lib\chernobog\learning\experienceStore.ts:86` - const experience
- `lib\chernobog\learning\experienceStore.ts:89` - this.experiences.delete(experience.id);
- `lib\chernobog\learning\feedbackObservation.ts:2` - LearningFeedbackObservation,
- `lib\chernobog\learning\feedbackObservation.ts:12` - "learning feedback observedAt must be a valid timestamp.",
- `lib\chernobog\learning\feedbackObservation.ts:19` - function requireConfidence(
- `lib\chernobog\learning\feedbackObservation.ts:28` - "learning feedback confidence must be between 0 and 1.",
- `lib\chernobog\learning\feedbackObservation.ts:35` - export function createLearningFeedbackObservation(
- `lib\chernobog\learning\feedbackObservation.ts:38` - experienceId: string;
- `lib\chernobog\learning\feedbackObservation.ts:40` - kind: LearningFeedbackObservation["kind"];
- `lib\chernobog\learning\feedbackObservation.ts:41` - confidence?: number;
- `lib\chernobog\learning\feedbackObservation.ts:44` - ): LearningFeedbackObservation {
- `lib\chernobog\learning\feedbackObservation.ts:46` - const experienceId = input.experienceId.trim();
- `lib\chernobog\learning\feedbackObservation.ts:48` - if (!id || !experienceId) {
- `lib\chernobog\learning\feedbackObservation.ts:50` - "learning feedback observation id and experienceId must not be empty.",
- `lib\chernobog\learning\feedbackObservation.ts:56` - experienceId,
- `lib\chernobog\learning\feedbackObservation.ts:62` - confidence:
- `lib\chernobog\learning\feedbackObservation.ts:63` - requireConfidence(
- `lib\chernobog\learning\feedbackObservation.ts:64` - input.confidence ?? 1,
- `lib\chernobog\learning\fromCognitiveCycle.ts:5` - createLearningExperience,
- `lib\chernobog\learning\fromCognitiveCycle.ts:6` - } from "./experience";
- `lib\chernobog\learning\fromCognitiveCycle.ts:8` - LearningExperience,

## Learning runtime construction and singleton/startup

Pattern: `LearningRuntime|getChernobogLearning|startChernobogLearning|learningRuntime|new ChernobogLearning`

- `lib\chernobog\learning\index.ts:26` - export * from "./learningRuntime";
- `lib\chernobog\learning\learningRuntime.ts:49` - ChernobogLearningRuntimeOptions,
- `lib\chernobog\learning\learningRuntime.ts:50` - LearningRuntimeSnapshot,
- `lib\chernobog\learning\learningRuntime.ts:53` - export class ChernobogLearningRuntime {
- `lib\chernobog\learning\learningRuntime.ts:55` - new ChernobogLearningExperienceStore();
- `lib\chernobog\learning\learningRuntime.ts:58` - new ChernobogLearningEvaluationStore();
- `lib\chernobog\learning\learningRuntime.ts:61` - new ChernobogLearningPatternStore();
- `lib\chernobog\learning\learningRuntime.ts:73` - ChernobogLearningRuntimeOptions = {},
- `lib\chernobog\learning\learningRuntime.ts:300` - LearningRuntimeSnapshot {
- `lib\chernobog\learning\runtimeSingleton.ts:2` - ChernobogLearningRuntime,
- `lib\chernobog\learning\runtimeSingleton.ts:3` - } from "./learningRuntime";
- `lib\chernobog\learning\runtimeSingleton.ts:5` - type LearningRuntimeGlobals =
- `lib\chernobog\learning\runtimeSingleton.ts:7` - __chernobogLearningRuntimePromise?:
- `lib\chernobog\learning\runtimeSingleton.ts:8` - Promise<ChernobogLearningRuntime>;
- `lib\chernobog\learning\runtimeSingleton.ts:12` - globalThis as LearningRuntimeGlobals;
- `lib\chernobog\learning\runtimeSingleton.ts:14` - export function getChernobogLearningRuntime():
- `lib\chernobog\learning\runtimeSingleton.ts:15` - Promise<ChernobogLearningRuntime> {
- `lib\chernobog\learning\runtimeSingleton.ts:18` - .__chernobogLearningRuntimePromise
- `lib\chernobog\learning\runtimeSingleton.ts:24` - new ChernobogLearningRuntime();
- `lib\chernobog\learning\runtimeSingleton.ts:32` - .__chernobogLearningRuntimePromise;
- `lib\chernobog\learning\runtimeSingleton.ts:37` - .__chernobogLearningRuntimePromise =
- `lib\chernobog\learning\runtimeSingleton.ts:42` - .__chernobogLearningRuntimePromise;
- `lib\chernobog\learning\runtimeTypes.ts:24` - export interface ChernobogLearningRuntimeOptions {
- `lib\chernobog\learning\runtimeTypes.ts:29` - export interface LearningRuntimeSnapshot {
- `lib\chernobog\learning\runtimeTypes.ts:38` - export interface LearningRuntimePromotionResult {
- `lib\chernobog\learning\runtimeTypes.ts:44` - export interface LearningRuntimeAdaptationResult {
- `lib\chernobog\learning\runtimeTypes.ts:49` - export interface LearningRuntimeCognitiveCapture {
- `lib\chernobog\learning\runtimeTypes.ts:54` - export interface LearningRuntimeOutcomeInput {
- `lib\chernobog\learning\runtimeTypes.ts:58` - export interface LearningRuntimeFeedbackInput {
- `app\api\learning\route.ts:6` - getChernobogLearningRuntime,
- `app\api\learning\route.ts:14` - await getChernobogLearningRuntime();

## Experience recording and pattern accumulation paths

Pattern: `recordExperience|appendExperience|observeExperience|experienceFrom|patternCandidate|detectPattern|supportCount|contradictionCount|correction|preference`

- `lib\chernobog\learning\adaptationEngine.ts:66` - lesson.kind === "correction-pattern" ||
- `lib\chernobog\learning\adaptationEngine.ts:67` - lesson.kind === "preference"
- `lib\chernobog\learning\eligibility.ts:28` - "Explicit user feedback or correction is a strong learning signal.",
- `lib\chernobog\learning\evaluationTypes.ts:29` - | "explicit-correction"
- `lib\chernobog\learning\evaluator.ts:39` - case "correction":
- `lib\chernobog\learning\evaluator.ts:269` - "correction"
- `lib\chernobog\learning\evaluator.ts:273` - "explicit-correction",
- `lib\chernobog\learning\evaluator.ts:274` - "Explicit correction takes precedence as the strongest feedback signal.",
- `lib\chernobog\learning\fromCognitiveCycle.ts:11` - export function learningExperienceFromCognitiveCycle(
- `lib\chernobog\learning\learningRuntime.ts:25` - learningExperienceFromCognitiveCycle,
- `lib\chernobog\learning\learningRuntime.ts:110` - learningExperienceFromCognitiveCycle(
- `lib\chernobog\learning\lessonGuidance.ts:13` - lesson.kind === "preference" ||
- `lib\chernobog\learning\lessonGuidance.ts:14` - lesson.kind === "correction-pattern"
- `lib\chernobog\learning\lessonPromotion.ts:2` - import type { LearningPatternCandidate } from "./patternTypes";
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\patternExtractor.ts:3` - import type { LearningPatternCandidate, LearningPatternExtractionResult, LearningPatternKind, LearningPatternPolicy } from "./patternTypes";
- `lib\chernobog\learning\patternExtractor.ts:29` - if (feedback.kind === "correction" && feedback.detail) {
- `lib\chernobog\learning\patternExtractor.ts:31` - key: `correction:${subjectKey}:${normalizeKey(feedback.detail)}`,
- `lib\chernobog\learning\patternExtractor.ts:32` - kind: "correction-pattern",
- `lib\chernobog\learning\patternExtractor.ts:43` - key: `preference:${subjectKey}:positive`,
- `lib\chernobog\learning\patternExtractor.ts:44` - kind: "preference",
- `lib\chernobog\learning\patternExtractor.ts:55` - key: `preference:${subjectKey}:positive`,
- `lib\chernobog\learning\patternExtractor.ts:56` - kind: "preference",
- `lib\chernobog\learning\patternExtractor.ts:114` - const candidates: LearningPatternCandidate[] = [];
- `lib\chernobog\learning\patternExtractor.ts:133` - supportCount: support.length,
- `lib\chernobog\learning\patternExtractor.ts:134` - contradictionCount: contradictions.length,
- `lib\chernobog\learning\patternExtractor.ts:147` - candidates.sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key));
- `lib\chernobog\learning\patternStore.ts:1` - import type { LearningPatternCandidate } from "./patternTypes";
- `lib\chernobog\learning\patternStore.ts:3` - function cloneCandidate(candidate: LearningPatternCandidate): LearningPatternCandidate {
- `lib\chernobog\learning\patternStore.ts:8` - private readonly patterns = new Map<string, LearningPatternCandidate>();
- `lib\chernobog\learning\patternStore.ts:10` - upsert(candidate: LearningPatternCandidate): LearningPatternCandidate {
- `lib\chernobog\learning\patternStore.ts:14` - get(key: string): LearningPatternCandidate | undefined {
- `lib\chernobog\learning\patternStore.ts:18` - list(): LearningPatternCandidate[] {
- `lib\chernobog\learning\patternStore.ts:20` - .sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key))
- `lib\chernobog\learning\patternTypes.ts:4` - | "preference"
- `lib\chernobog\learning\patternTypes.ts:7` - | "correction-pattern";
- `lib\chernobog\learning\patternTypes.ts:16` - export interface LearningPatternCandidate {
- `lib\chernobog\learning\patternTypes.ts:21` - supportCount: number;
- `lib\chernobog\learning\patternTypes.ts:22` - contradictionCount: number;
- `lib\chernobog\learning\patternTypes.ts:37` - candidates: LearningPatternCandidate[];
- `lib\chernobog\learning\promotionGate.ts:2` - import type { LearningPatternCandidate } from "./patternTypes";
- `lib\chernobog\learning\promotionGate.ts:5` - function needsApproval(p:LearningPatternCandidate,policy:LearningPromotionPolicy){return (p.kind==="preference"&&policy.requireExplicitApprovalForPreferences)||(p.kind==="correction-pattern"&&policy.requireExplicitApprovalForCorrections);}
- `lib\chernobog\learning\promotionGate.ts:6` - export function assessLearningPromotion(pattern:LearningPatternCandidate,context:LearningPromotionContext,policy:LearningPromotionPolicy=DEFAULT_LEARNING_PROMOTION_POLICY):LearningPromotionAssessment{validateLearningPromotionPolicy(policy);const reasons:LearningPromotionReason[]=[];let reject=false,hold=false;if(pattern.supportCount>=policy.minimumSupport)add(reasons,"support-sufficient","Pattern support meets the promotion threshold.");else{hold=true;add(reasons,"support-insufficient","Pattern does not yet have enough supporting experiences.");}if(pattern.confidence>=policy.minimumConfidence)add(reasons,"confidence-sufficient","Pattern confidence meets the promotion threshold.");else{hold=true;add(reasons,"confidence-insufficient","Pattern confidence is below the promotion threshold.");}const total=pattern.supportCount+pattern.contradictionCount;const ratio=total===0?0:pattern.contradictionCount/total;if(ratio<=policy.maximumContradictionRatio)add(reasons,"contradiction-acceptable","Contradictory evidence remains within the governance ceiling.");else{reject=true;add(reasons,"contradiction-excessive","Contradictory evidence exceeds the governance ceiling.");}if(needsApproval(pattern,policy)){if(context.approved)add(reasons,"approval-present","Explicit governance approval is present.");else{hold=true;add(reasons,"approval-required","This lesson class requires explicit governance approval.");}}if(reject)return{patternKey:pattern.key,decision:"reject",reasons};if(hold)return{patternKey:pattern.key,decision:"hold",reasons};add(reasons,"eligible-for-promotion","All promotion governance requirements are satisfied.");return{patternKey:pattern.key,decision:"promote",reasons};}
- `lib\chernobog\learning\promotionPolicy.ts:2` - export const DEFAULT_LEARNING_PROMOTION_POLICY:LearningPromotionPolicy={minimumSupport:3,minimumConfidence:0.75,maximumContradictionRatio:0.25,requireExplicitApprovalForPreferences:true,requireExplicitApprovalForCorrections:true};
- `lib\chernobog\learning\promotionTypes.ts:1` - import type { LearningPatternCandidate } from "./patternTypes";
- `lib\chernobog\learning\promotionTypes.ts:5` - export interface LearningPromotionPolicy { minimumSupport:number; minimumConfidence:number; maximumContradictionRatio:number; requireExplicitApprovalForPreferences:boolean; requireExplicitApprovalForCorrections:boolean; }
- `lib\chernobog\learning\promotionTypes.ts:10` - export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
- `lib\chernobog\learning\runtimeTypes.ts:18` - LearningPatternCandidate,
- `lib\chernobog\learning\runtimeTypes.ts:33` - patterns: LearningPatternCandidate[];
- `lib\chernobog\learning\runtimeTypes.ts:39` - pattern: LearningPatternCandidate;
- `lib\chernobog\learning\types.ts:17` - | "correction";
- `lib\chernobog\pipeline\worldModelContext.ts:568` - `  supportCount: ${hypothesis.supportCount}`,
- `lib\chernobog\pipeline\worldModelContext.ts:569` - `  contradictionCount: ${hypothesis.contradictionCount}`,

## Promotion and governance gate

Pattern: `assessLearningPromotion|promoteLearningPattern|approvedBy|approvedAt|authority|approval-required|minimum confidence|reject|hold|revokeLearnedLesson`

- `lib\chernobog\learning\learningRuntime.ts:31` - promoteLearningPattern,
- `lib\chernobog\learning\learningRuntime.ts:32` - revokeLearnedLesson,
- `lib\chernobog\learning\learningRuntime.ts:218` - promoteLearningPattern(
- `lib\chernobog\learning\learningRuntime.ts:254` - revokeLearnedLesson(
- `lib\chernobog\learning\lessonPromotion.ts:1` - import { assessLearningPromotion } from "./promotionGate";
- `lib\chernobog\learning\lessonPromotion.ts:4` - function approvedAt(c:LearningPromotionContext){if(!c.approvedAt)return undefined;const d=new Date(c.approvedAt);if(Number.isNaN(d.getTime()))throw new Error("learning promotion approvedAt must be a valid timestamp.");return d.toISOString();}
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\lessonPromotion.ts:6` - export function revokeLearnedLesson(lesson:LearnedLesson,reason:string,now=new Date()):LearnedLesson{const r=reason.trim();if(!r)throw new Error("learning lesson revocation reason must not be empty.");return{...structuredClone(lesson),status:"revoked",revokedAt:now.toISOString(),revocationReason:r};}
- `lib\chernobog\learning\patternExtractor.ts:115` - const rejectedKeys: string[] = [];
- `lib\chernobog\learning\patternExtractor.ts:119` - if (support.length < policy.minimumSupport) { rejectedKeys.push(key); continue; }
- `lib\chernobog\learning\patternExtractor.ts:122` - if (contradictionRatio > policy.maximumContradictionRatio) { rejectedKeys.push(key); continue; }
- `lib\chernobog\learning\patternExtractor.ts:125` - if (confidence < policy.confidenceFloor) { rejectedKeys.push(key); continue; }
- `lib\chernobog\learning\patternExtractor.ts:148` - return { candidates, rejectedKeys: rejectedKeys.sort() };
- `lib\chernobog\learning\patternTypes.ts:38` - rejectedKeys: string[];
- `lib\chernobog\learning\promotionGate.ts:6` - export function assessLearningPromotion(pattern:LearningPatternCandidate,context:LearningPromotionContext,policy:LearningPromotionPolicy=DEFAULT_LEARNING_PROMOTION_POLICY):LearningPromotionAssessment{validateLearningPromotionPolicy(policy);const reasons:LearningPromotionReason[]=[];let reject=false,hold=false;if(pattern.supportCount>=policy.minimumSupport)add(reasons,"support-sufficient","Pattern support meets the promotion threshold.");else{hold=true;add(reasons,"support-insufficient","Pattern does not yet have enough supporting experiences.");}if(pattern.confidence>=policy.minimumConfidence)add(reasons,"confidence-sufficient","Pattern confidence meets the promotion threshold.");else{hold=true;add(reasons,"confidence-insufficient","Pattern confidence is below the promotion threshold.");}const total=pattern.supportCount+pattern.contradictionCount;const ratio=total===0?0:pattern.contradictionCount/total;if(ratio<=policy.maximumContradictionRatio)add(reasons,"contradiction-acceptable","Contradictory evidence remains within the governance ceiling.");else{reject=true;add(reasons,"contradiction-excessive","Contradictory evidence exceeds the governance ceiling.");}if(needsApproval(pattern,policy)){if(context.approved)add(reasons,"approval-present","Explicit governance approval is present.");else{hold=true;add(reasons,"approval-required","This lesson class requires explicit governance approval.");}}if(reject)return{patternKey:pattern.key,decision:"reject",reasons};if(hold)return{patternKey:pattern.key,decision:"hold",reasons};add(reasons,"eligible-for-promotion","All promotion governance requirements are satisfied.");return{patternKey:pattern.key,decision:"promote",reasons};}
- `lib\chernobog\learning\promotionTypes.ts:2` - export type LearningPromotionDecision = "promote" | "hold" | "reject";
- `lib\chernobog\learning\promotionTypes.ts:4` - export type LearningGovernanceAuthority = "system-policy" | "user-approved" | "operator-approved";
- `lib\chernobog\learning\promotionTypes.ts:6` - export interface LearningPromotionContext { authority:LearningGovernanceAuthority; approved:boolean; approvedBy?:string; approvedAt?:string; }
- `lib\chernobog\learning\promotionTypes.ts:7` - export type LearningPromotionReasonCode = "support-sufficient"|"support-insufficient"|"confidence-sufficient"|"confidence-insufficient"|"contradiction-acceptable"|"contradiction-excessive"|"approval-required"|"approval-present"|"eligible-for-promotion";
- `lib\chernobog\learning\promotionTypes.ts:10` - export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
- `lib\chernobog\governance\policyBridge.ts:25` - | "execution-approval-required"
- `lib\chernobog\governance\policyBridge.ts:120` - "execution-approval-required",
- `lib\chernobog\governance\runtimeGovernance.ts:72` - reason.code === "execution-approval-required"
- `lib\chernobog\governance\status.ts:15` - authority: {
- `lib\chernobog\governance\status.ts:59` - authority: {

## Lesson persistence / restore / active-only retrieval

Pattern: `lessonStore|lessonPath|save\(|load\(|activeOnly|schemaVersion|lessons\.json|LearnedLessonStore|list\(`

- `lib\chernobog\learning\experience.ts:9` - function normalizeTextList(
- `lib\chernobog\learning\experience.ts:90` - eventIds: normalizeTextList(input?.eventIds),
- `lib\chernobog\learning\experience.ts:91` - worldStateKeys: normalizeTextList(
- `lib\chernobog\learning\experience.ts:94` - cognitiveDecisionIds: normalizeTextList(
- `lib\chernobog\learning\experienceStore.ts:57` - list(): LearningExperience[] {
- `lib\chernobog\learning\experienceStore.ts:83` - const ordered = this.list();
- `lib\chernobog\learning\index.ts:19` - export * from "./lessonStore";
- `lib\chernobog\learning\learningRuntime.ts:28` - ChernobogLearnedLessonStore,
- `lib\chernobog\learning\learningRuntime.ts:29` - } from "./lessonStore";
- `lib\chernobog\learning\learningRuntime.ts:64` - new ChernobogLearnedLessonStore();
- `lib\chernobog\learning\learningRuntime.ts:66` - private readonly lessonPath: string;
- `lib\chernobog\learning\learningRuntime.ts:75` - this.lessonPath =
- `lib\chernobog\learning\learningRuntime.ts:76` - options.lessonPath ??
- `lib\chernobog\learning\learningRuntime.ts:81` - "lessons.json",
- `lib\chernobog\learning\learningRuntime.ts:91` - await this.lessons.load(
- `lib\chernobog\learning\learningRuntime.ts:92` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:171` - .list()
- `lib\chernobog\learning\learningRuntime.ts:277` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:278` - activeOnly: true,
- `lib\chernobog\learning\learningRuntime.ts:285` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:286` - activeOnly: true,
- `lib\chernobog\learning\learningRuntime.ts:293` - await this.lessons.save(
- `lib\chernobog\learning\learningRuntime.ts:294` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:303` - .list()
- `lib\chernobog\learning\learningRuntime.ts:320` - this.experiences.list(),
- `lib\chernobog\learning\learningRuntime.ts:323` - this.patterns.list(),
- `lib\chernobog\learning\learningRuntime.ts:325` - this.lessons.list(),
- `lib\chernobog\learning\learningRuntime.ts:327` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:328` - activeOnly: true,
- `lib\chernobog\learning\lessonStore.ts:4` - interface Snapshot{schemaVersion:1;savedAt:string;lessons:LearnedLesson[]}
- `lib\chernobog\learning\lessonStore.ts:7` - export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
- `lib\chernobog\learning\outcomeObservation.ts:37` - function normalizeList(
- `lib\chernobog\learning\outcomeObservation.ts:99` - normalizeList(input.evidenceEventIds),
- `lib\chernobog\learning\outcomeObservation.ts:101` - normalizeList(input.evidenceWorldStateKeys),
- `lib\chernobog\learning\patternStore.ts:18` - list(): LearningPatternCandidate[] {
- `lib\chernobog\learning\runtimeTypes.ts:25` - lessonPath?: string;
- `lib\chernobog\cognition\attentionQueue.ts:41` - list(query: AttentionQueueQuery = {}): CognitiveAttentionSignal[] {
- `lib\chernobog\cognition\attentionQueue.ts:72` - const keep = this.list({ limit: this.maximumSize });
- `lib\chernobog\cognition\cognitiveControlLoop.ts:105` - : this.attention.list();
- `lib\chernobog\cognition\cognitiveControlLoop.ts:113` - this.goals.list({
- `lib\chernobog\cognition\cognitiveControlLoop.ts:114` - activeOnly: true,
- `lib\chernobog\cognition\cognitiveRuntime.ts:233` - this.goals.list({
- `lib\chernobog\cognition\cognitiveRuntime.ts:234` - activeOnly: true,
- `lib\chernobog\cognition\cognitiveRuntime.ts:237` - this.attentionQueue.list(),
- `lib\chernobog\cognition\cognitiveRuntime.ts:239` - this.deferredInitiative.list(),
- `lib\chernobog\cognition\goalAwareAttention.ts:31` - this.goals.list({
- `lib\chernobog\cognition\goalAwareAttention.ts:32` - activeOnly: true,
- `lib\chernobog\cognition\goalRegistry.ts:97` - list(
- `lib\chernobog\cognition\goalRegistry.ts:101` - activeOnly?: boolean;
- `lib\chernobog\cognition\goalRegistry.ts:105` - options.activeOnly
- `lib\chernobog\cognition\goals.ts:52` - function normalizeTextList(
- `lib\chernobog\cognition\goals.ts:73` - normalizeTextList(
- `lib\chernobog\cognition\goals.ts:77` - normalizeTextList(
- `lib\chernobog\cognition\goals.ts:81` - normalizeTextList(
- `lib\chernobog\cognition\goals.ts:157` - normalizeTextList(
- `lib\chernobog\cognition\initiativeQueue.ts:54` - list():
- `lib\chernobog\command-language\parser.ts:33` - function stripMemoryPayload(message: string): string {
- `lib\chernobog\command-language\parser.ts:143` - query: stripMemoryPayload(message),
- `lib\chernobog\command-language\parser.ts:160` - query: stripMemoryPayload(message),
- `lib\chernobog\desktop\desktopEvents.ts:11` - function buildDesktopPayload(
- `lib\chernobog\desktop\desktopEvents.ts:86` - buildDesktopPayload(
- `lib\chernobog\events\schema.ts:85` - schemaVersion: CHERNOBOG_EVENT_SCHEMA_VERSION,
- `lib\chernobog\events\types.ts:17` - schemaVersion: typeof CHERNOBOG_EVENT_SCHEMA_VERSION;
- `lib\chernobog\events\types.ts:51` - metadata?: Omit<ChernobogEventMetadata, "schemaVersion">;
- `lib\chernobog\learning\experience.ts:9` - function normalizeTextList(
- `lib\chernobog\learning\experience.ts:90` - eventIds: normalizeTextList(input?.eventIds),
- `lib\chernobog\learning\experience.ts:91` - worldStateKeys: normalizeTextList(
- `lib\chernobog\learning\experience.ts:94` - cognitiveDecisionIds: normalizeTextList(
- `lib\chernobog\learning\experienceStore.ts:57` - list(): LearningExperience[] {
- `lib\chernobog\learning\experienceStore.ts:83` - const ordered = this.list();
- `lib\chernobog\learning\index.ts:19` - export * from "./lessonStore";
- `lib\chernobog\learning\learningRuntime.ts:28` - ChernobogLearnedLessonStore,
- `lib\chernobog\learning\learningRuntime.ts:29` - } from "./lessonStore";
- `lib\chernobog\learning\learningRuntime.ts:64` - new ChernobogLearnedLessonStore();
- `lib\chernobog\learning\learningRuntime.ts:66` - private readonly lessonPath: string;
- `lib\chernobog\learning\learningRuntime.ts:75` - this.lessonPath =
- `lib\chernobog\learning\learningRuntime.ts:76` - options.lessonPath ??
- `lib\chernobog\learning\learningRuntime.ts:81` - "lessons.json",
- `lib\chernobog\learning\learningRuntime.ts:91` - await this.lessons.load(
- `lib\chernobog\learning\learningRuntime.ts:92` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:171` - .list()
- `lib\chernobog\learning\learningRuntime.ts:277` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:278` - activeOnly: true,
- `lib\chernobog\learning\learningRuntime.ts:285` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:286` - activeOnly: true,
- `lib\chernobog\learning\learningRuntime.ts:293` - await this.lessons.save(
- `lib\chernobog\learning\learningRuntime.ts:294` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:303` - .list()
- `lib\chernobog\learning\learningRuntime.ts:320` - this.experiences.list(),
- `lib\chernobog\learning\learningRuntime.ts:323` - this.patterns.list(),
- `lib\chernobog\learning\learningRuntime.ts:325` - this.lessons.list(),
- `lib\chernobog\learning\learningRuntime.ts:327` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:328` - activeOnly: true,
- `lib\chernobog\learning\lessonStore.ts:4` - interface Snapshot{schemaVersion:1;savedAt:string;lessons:LearnedLesson[]}
- `lib\chernobog\learning\lessonStore.ts:7` - export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
- `lib\chernobog\learning\outcomeObservation.ts:37` - function normalizeList(
- `lib\chernobog\learning\outcomeObservation.ts:99` - normalizeList(input.evidenceEventIds),
- `lib\chernobog\learning\outcomeObservation.ts:101` - normalizeList(input.evidenceWorldStateKeys),
- `lib\chernobog\learning\patternStore.ts:18` - list(): LearningPatternCandidate[] {
- `lib\chernobog\learning\runtimeTypes.ts:25` - lessonPath?: string;
- `lib\chernobog\memory-architecture\readAdapters.ts:12` - ChernobogLearnedLessonStore,
- `lib\chernobog\memory-architecture\readAdapters.ts:13` - } from "../learning/lessonStore";
- `lib\chernobog\memory-architecture\readAdapters.ts:34` - "lessons.json",
- `lib\chernobog\memory-architecture\readAdapters.ts:46` - new ChernobogLearnedLessonStore();
- `lib\chernobog\memory-architecture\readAdapters.ts:49` - await store.load(
- `lib\chernobog\memory-architecture\readAdapters.ts:65` - .list({
- `lib\chernobog\memory-architecture\readAdapters.ts:66` - activeOnly: true,
- `lib\chernobog\memory-architecture\sourceRegistry.ts:112` - "lib/chernobog/learning/lessonStore.ts",
- `lib\chernobog\operations\backupStorageEvents.ts:18` - function buildBackupPayload(
- `lib\chernobog\operations\backupStorageEvents.ts:56` - function buildStoragePayload(
- `lib\chernobog\operations\backupStorageEvents.ts:130` - buildBackupPayload(
- `lib\chernobog\operations\backupStorageEvents.ts:287` - buildStoragePayload(
- `lib\chernobog\pipeline\payload.ts:15` - export function buildUiPayload(
- `lib\chernobog\pipeline\payload.ts:106` - export function finalizePipelinePayload(
- `lib\chernobog\pipeline\payload.ts:129` - payload: buildUiPayload(sessionId, route, reply, trace),
- `lib\chernobog\pipeline\runCommand.ts:234` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:259` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:284` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:309` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:335` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:362` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:389` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:478` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:501` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:526` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:568` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:628` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:660` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:684` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:738` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:788` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:834` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:901` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:985` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:1137` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\runtime\runtimeHealthEvents.ts:23` - function buildCommonPayload(
- `lib\chernobog\runtime\runtimeHealthEvents.ts:43` - buildCommonPayload(observation);
- `lib\chernobog\worldModel\causalHypothesis.ts:15` - function normalizeList(
- `lib\chernobog\worldModel\causalHypothesis.ts:131` - normalizeList(
- `lib\chernobog\worldModel\causalHypothesis.ts:135` - normalizeList(
- `lib\chernobog\worldModel\predictionStore.ts:52` - list():
- `lib\chernobog\worldModel\predictiveModel.ts:67` - temporal.list({
- `lib\chernobog\worldModel\temporalModel.ts:57` - list(
- `lib\chernobog\worldModel\temporalModel.ts:106` - this.list(options);
- `lib\chernobog\worldModel\temporalModel.ts:224` - this.list({
- `lib\chernobog\worldModel\temporalModel.ts:288` - this.list(),
- `lib\chernobog\worldModel\temporalObservation.ts:12` - function normalizeList(
- `lib\chernobog\worldModel\temporalObservation.ts:108` - normalizeList(
- `lib\chernobog\worldModel\temporalObservation.ts:112` - normalizeList(
- `lib\chernobog\worldModel\validation.ts:9` - function normalizeList(
- `lib\chernobog\worldModel\validation.ts:26` - normalizeList(input?.eventIds),
- `lib\chernobog\worldModel\validation.ts:28` - normalizeList(
- `lib\chernobog\worldModel\validation.ts:32` - normalizeList(
- `lib\chernobog\worldModel\validation.ts:152` - normalizeList(
- `lib\chernobog\worldModel\worldModelRuntime.ts:335` - this.predictions.list(),
- `lib\chernobog\worldState\domainProjectors.ts:33` - function objectPayload(
- `lib\chernobog\worldState\domainProjectors.ts:202` - objectPayload(event);
- `lib\chernobog\worldState\domainProjectors.ts:396` - objectPayload(event);
- `lib\chernobog\worldState\domainProjectors.ts:470` - objectPayload(event);
- `lib\chernobog\worldState\projectorRegistry.ts:66` - list(): WorldStateProjector[] {
- `lib\chernobog\worldState\projectorRegistry.ts:73` - return this.list().filter((projector) => matchesProjector(projector, event));
- `lib\chernobog\worldState\queryService.ts:102` - this.registry.list({
- `lib\chernobog\worldState\queryService.ts:196` - this.registry.list();
- `lib\chernobog\worldState\recovery.ts:108` - await store.save(snapshot);
- `lib\chernobog\worldState\recovery.ts:136` - await store.load();
- `lib\chernobog\worldState\registry.ts:210` - list(
- `lib\chernobog\worldState\registry.ts:309` - return this.list();
- `lib\chernobog\worldState\runtimeIntegration.ts:82` - await store.save(snapshot);
- `lib\chernobog\worldState\snapshotIntegrity.ts:42` - schemaVersion:
- `lib\chernobog\worldState\snapshotIntegrity.ts:61` - snapshot.schemaVersion !==
- `lib\chernobog\worldState\snapshotQuery.ts:34` - await store.load();
- `lib\chernobog\worldState\snapshotStore.ts:78` - async load(): Promise<WorldStateSnapshotLoadResult> {
- `lib\chernobog\worldState\snapshotStore.ts:117` - async save(
- `lib\chernobog\worldState\snapshotTypes.ts:6` - schemaVersion: typeof CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION;
- `lib\chernobog\worldState\types.ts:61` - schemaVersion: typeof CHERNOBOG_WORLD_STATE_SCHEMA_VERSION;
- `lib\chernobog\worldState\validation.ts:239` - schemaVersion: CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
- `lib\chernobog\worldState\validation.ts:272` - record.schemaVersion !==

## Project/session scoping in learning evidence or lessons

Pattern: `projectId|project_id|activeProjectId|sessionId|session_id|scope|scoped|workspace|repoName|project`

- `lib\chernobog\learning\lessonApplicability.ts:43` - reason: "lesson-has-no-subject-scope",
- `lib\chernobog\pipeline\domainHandlers.ts:11` - sessionId: string;
- `lib\chernobog\pipeline\domainHandlers.ts:50` - sessionId: string;
- `lib\chernobog\pipeline\domainHandlers.ts:54` - sessionId: context.sessionId,
- `lib\chernobog\pipeline\payload.ts:16` - sessionId: string,
- `lib\chernobog\pipeline\payload.ts:21` - const session = getSessionContext(sessionId);
- `lib\chernobog\pipeline\payload.ts:70` - sessionId,
- `lib\chernobog\pipeline\payload.ts:107` - sessionId: string,
- `lib\chernobog\pipeline\payload.ts:112` - const endingSession = getSessionContext(sessionId);
- `lib\chernobog\pipeline\payload.ts:126` - saveMessage("assistant", reply, route, sessionId);
- `lib\chernobog\pipeline\payload.ts:129` - payload: buildUiPayload(sessionId, route, reply, trace),
- `lib\chernobog\pipeline\runCommand.ts:63` - buildProjectGroundedSystemText,
- `lib\chernobog\pipeline\runCommand.ts:64` - resolveActiveProjectContext,
- `lib\chernobog\pipeline\runCommand.ts:65` - } from "@/lib/chernobog/project/activeProjectContext";
- `lib\chernobog\pipeline\runCommand.ts:133` - projectId?: string | null
- `lib\chernobog\pipeline\runCommand.ts:135` - if (!projectId) {
- `lib\chernobog\pipeline\runCommand.ts:150` - /\b(current|active|project|workspace|runtime|world state|evidence|known|scope|scoped)\b/i.test(
- `lib\chernobog\pipeline\runCommand.ts:162` - sessionId: string
- `lib\chernobog\pipeline\runCommand.ts:166` - const trace = createTrustTrace(userMessage, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:168` - const startingSession = getSessionContext(sessionId);
- `lib\chernobog\pipeline\runCommand.ts:171` - const activeProjectResolution = resolveActiveProjectContext({
- `lib\chernobog\pipeline\runCommand.ts:173` - sessionProjectId: startingSession.activeProjectId,
- `lib\chernobog\pipeline\runCommand.ts:177` - startingSession.activeProjectId !==
- `lib\chernobog\pipeline\runCommand.ts:178` - activeProjectResolution.projectId
- `lib\chernobog\pipeline\runCommand.ts:180` - startingSession.activeProjectId =
- `lib\chernobog\pipeline\runCommand.ts:181` - activeProjectResolution.projectId;
- `lib\chernobog\pipeline\runCommand.ts:224` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:234` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:249` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:259` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:274` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:284` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:299` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:309` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:324` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:335` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:352` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:362` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:379` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:389` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:400` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:414` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:429` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:448` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:460` - const session = getSessionContext(sessionId);
- `lib\chernobog\pipeline\runCommand.ts:474` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:478` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:497` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:501` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:506` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:523` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:526` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:548` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:554` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:568` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:585` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:628` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:647` - const recentMessages = getRecentMessages(sessionId, 12);
- `lib\chernobog\pipeline\runCommand.ts:656` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:660` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:679` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:684` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:734` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:738` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:765` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:780` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:788` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:800` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:810` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:813` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:819` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:822` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:828` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:831` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:834` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:852` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:878` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:893` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:901` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:913` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:923` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:926` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:932` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:935` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:941` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:944` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:962` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:977` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:985` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\runCommand.ts:997` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:1007` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:1010` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1016` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:1019` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1025` - sessionId
- `lib\chernobog\pipeline\runCommand.ts:1028` - reply = formatToolReply(toolResult, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1041` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1045` - sessionId,
- `lib\chernobog\pipeline\runCommand.ts:1063` - saveMessage("user", userMessage, route, sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1065` - const activeSession = getSessionContext(sessionId);
- `lib\chernobog\pipeline\runCommand.ts:1067` - const recentMessages = getRecentMessages(sessionId, 8);
- `lib\chernobog\pipeline\runCommand.ts:1071` - projectId:
- `lib\chernobog\pipeline\runCommand.ts:1072` - activeSession.activeProjectId ??
- `lib\chernobog\pipeline\runCommand.ts:1082` - activeSession.activeProjectId
- `lib\chernobog\pipeline\runCommand.ts:1098` - projectId: activeSession.activeProjectId ?? undefined,
- `lib\chernobog\pipeline\runCommand.ts:1116` - sessionSummary: buildProjectGroundedSystemText(
- `lib\chernobog\pipeline\runCommand.ts:1125` - activeSession.activeProjectId,
- `lib\chernobog\pipeline\runCommand.ts:1137` - return finalizePipelinePayload(sessionId, route, reply, trace);
- `lib\chernobog\pipeline\toolExecution.ts:31` - sessionId?: string
- `lib\chernobog\pipeline\toolExecution.ts:95` - const sessionNote = sessionId
- `lib\chernobog\pipeline\toolExecution.ts:133` - sessionId: string
- `lib\chernobog\pipeline\toolExecution.ts:135` - const session = getSessionContext(sessionId);
- `lib\chernobog\pipeline\toolExecution.ts:187` - sessionId: string,
- `lib\chernobog\pipeline\toolExecution.ts:196` - sessionId
- `lib\chernobog\pipeline\toolExecution.ts:215` - sessionId
- `lib\chernobog\pipeline\types.ts:70` - sessionId: string;
- `lib\chernobog\pipeline\worldModelContext.ts:848` - "- Do not invent World Model relationships from Project Operations or general reasoning.",
- `lib\chernobog\pipeline\worldStateContext.ts:69` - function projectRecordIsRelevant(
- `lib\chernobog\pipeline\worldStateContext.ts:71` - projectId?: string,
- `lib\chernobog\pipeline\worldStateContext.ts:73` - if (!projectId) {
- `lib\chernobog\pipeline\worldStateContext.ts:77` - const project = canonicalSegment(projectId);
- `lib\chernobog\pipeline\worldStateContext.ts:80` - key.startsWith(`project.${project}.`) ||
- `lib\chernobog\pipeline\worldStateContext.ts:81` - key.startsWith("project.git.")
- `lib\chernobog\pipeline\worldStateContext.ts:87` - projectId?: string,
- `lib\chernobog\pipeline\worldStateContext.ts:89` - if (item.record.namespace === "project") {
- `lib\chernobog\pipeline\worldStateContext.ts:90` - return projectRecordIsRelevant(
- `lib\chernobog\pipeline\worldStateContext.ts:92` - projectId,
- `lib\chernobog\pipeline\worldStateContext.ts:184` - projectId?: string;
- `lib\chernobog\pipeline\worldStateContext.ts:210` - input.projectId,
- `lib\chernobog\pipeline\worldStateContext.ts:223` - "- No relevant World State records are currently available for this project/runtime.",
- `lib\chernobog\pipeline\worldStateContext.ts:224` - "- Do not infer missing operational state from Project Operations metadata.",
- `lib\chernobog\session\followups.ts:212` - function isScopeShiftFollowUp(input: string): string | null {
- `lib\chernobog\session\followups.ts:263` - const scopeAlias = isScopeShiftFollowUp(input);
- `lib\chernobog\session\followups.ts:264` - if (scopeAlias) {
- `lib\chernobog\session\followups.ts:272` - const root = normalizeFolderAlias(scopeAlias);
- `lib\chernobog\session\store.ts:8` - session_id: string;
- `lib\chernobog\session\store.ts:13` - const DEFAULT_SESSION_ID = "local-default";
- `lib\chernobog\session\store.ts:53` - function createEmptySession(sessionId: string): SessionContext {
- `lib\chernobog\session\store.ts:55` - sessionId,
- `lib\chernobog\session\store.ts:60` - activeProjectId: null,
- `lib\chernobog\session\store.ts:64` - function sanitizeSessionId(value: string): string {
- `lib\chernobog\session\store.ts:73` - INSERT INTO session_state (session_id, state_json, updated_at)
- `lib\chernobog\session\store.ts:75` - ON CONFLICT(session_id)
- `lib\chernobog\session\store.ts:80` - ).run(session.sessionId, payload);
- `lib\chernobog\session\store.ts:82` - sessionCache.set(session.sessionId, session);
- `lib\chernobog\session\store.ts:85` - export function resolveSessionId(value?: string | null): string {
- `lib\chernobog\session\store.ts:89` - return DEFAULT_SESSION_ID;
- `lib\chernobog\session\store.ts:92` - const sanitized = sanitizeSessionId(trimmed);
- `lib\chernobog\session\store.ts:94` - return sanitized || DEFAULT_SESSION_ID;
- `lib\chernobog\session\store.ts:97` - export function getSessionContext(sessionId: string): SessionContext {
- `lib\chernobog\session\store.ts:98` - sessionId = resolveSessionId(sessionId);
- `lib\chernobog\session\store.ts:100` - const cached = sessionCache.get(sessionId);
- `lib\chernobog\session\store.ts:118` - SELECT session_id, state_json, updated_at
- `lib\chernobog\session\store.ts:120` - WHERE session_id = ?
- `lib\chernobog\session\store.ts:124` - .get(sessionId) as SessionStateRow | undefined;
- `lib\chernobog\session\store.ts:127` - const fresh = createEmptySession(sessionId);
- `lib\chernobog\session\store.ts:128` - sessionCache.set(sessionId, fresh);
- `lib\chernobog\session\store.ts:136` - ...createEmptySession(sessionId),
- `lib\chernobog\session\store.ts:138` - sessionId,
- `lib\chernobog\session\store.ts:144` - sessionCache.set(sessionId, hydrated);
- `lib\chernobog\session\store.ts:147` - const fresh = createEmptySession(sessionId);
- `lib\chernobog\session\store.ts:148` - sessionCache.set(sessionId, fresh);
- `lib\chernobog\session\store.ts:154` - session.sessionId = resolveSessionId(session.sessionId);
- `lib\chernobog\session\store.ts:175` - export function clearSessionContext(sessionId: string): void {
- `lib\chernobog\session\store.ts:176` - const resolvedSessionId = resolveSessionId(sessionId);
- `lib\chernobog\session\store.ts:178` - sessionCache.delete(resolvedSessionId);
- `lib\chernobog\session\store.ts:180` - db.prepare(`DELETE FROM session_state WHERE session_id = ?`).run(
- `lib\chernobog\session\store.ts:181` - resolvedSessionId
- `lib\chernobog\session\types.ts:9` - | "path_scope"
- `lib\chernobog\session\types.ts:64` - sessionId: string;
- `lib\chernobog\session\types.ts:79` - activeProjectId?: string | null;

## Normal conversational/model-facing learning integration

Pattern: `learned|lesson|learningContext|lessonContext|build.*Learning|active lessons|guidance|advisory|respondForRoute|sessionSummary|systemText`

- `lib\chernobog\pipeline\runCommand.ts:1` - import { respondForRoute, routeMessage } from "@/lib/chernobog/router";
- `lib\chernobog\pipeline\runCommand.ts:63` - buildProjectGroundedSystemText,
- `lib\chernobog\pipeline\runCommand.ts:1113` - reply = await respondForRoute(route, userMessage, {
- `lib\chernobog\pipeline\runCommand.ts:1116` - sessionSummary: buildProjectGroundedSystemText(
- `lib\chernobog\pipeline\runCommand.ts:1118` - [memoryContext.systemText, worldStateContext.systemText]
- `lib\chernobog\pipeline\runCommand.ts:1121` - worldModelContext.systemText,
- `lib\chernobog\pipeline\worldModelContext.ts:50` - systemText: string;
- `lib\chernobog\pipeline\worldModelContext.ts:75` - lessonKeys?: readonly string[];
- `lib\chernobog\pipeline\worldModelContext.ts:91` - if (input.lessonKeys?.length) {
- `lib\chernobog\pipeline\worldModelContext.ts:93` - `lessonKeys=${input.lessonKeys.join(",")}`,
- `lib\chernobog\pipeline\worldModelContext.ts:845` - systemText: [
- `lib\chernobog\pipeline\worldModelContext.ts:1035` - systemText: sections.join("\n"),
- `lib\chernobog\pipeline\worldModelContext.ts:1049` - systemText: [
- `lib\chernobog\pipeline\worldStateContext.ts:58` - systemText: string;
- `lib\chernobog\pipeline\worldStateContext.ts:194` - /* Live observation refresh is advisory telemetry. Existing recovered World State remains readable if a probe cannot complete. */
- `lib\chernobog\pipeline\worldStateContext.ts:221` - systemText: [
- `lib\chernobog\pipeline\worldStateContext.ts:235` - systemText: [
- `lib\chernobog\pipeline\worldStateContext.ts:256` - systemText: [
- `lib\chernobog\router.ts:26` - sessionSummary?: string;
- `lib\chernobog\router.ts:37` - sessionSummary?: string,
- `lib\chernobog\router.ts:39` - if (!sessionSummary) {
- `lib\chernobog\router.ts:44` - sessionSummary.indexOf(
- `lib\chernobog\router.ts:53` - sessionSummary.indexOf(
- `lib\chernobog\router.ts:59` - sessionSummary
- `lib\chernobog\router.ts:226` - export async function respondForRoute(
- `lib\chernobog\router.ts:250` - if (context.sessionSummary) {
- `lib\chernobog\router.ts:253` - content: `Active short-term session context:\n${context.sessionSummary}`,
- `lib\chernobog\router.ts:262` - context.sessionSummary &&
- `lib\chernobog\router.ts:281` - context.sessionSummary,
- `lib\chernobog\router.ts:311` - context.sessionSummary,
- `lib\chernobog\learning\adaptationEngine.ts:9` - matchLessonToSignal,
- `lib\chernobog\learning\adaptationEngine.ts:10` - } from "./lessonApplicability";
- `lib\chernobog\learning\adaptationEngine.ts:12` - LearnedLesson,
- `lib\chernobog\learning\adaptationEngine.ts:32` - function influenceForLesson(
- `lib\chernobog\learning\adaptationEngine.ts:33` - lesson: LearnedLesson,
- `lib\chernobog\learning\adaptationEngine.ts:38` - lesson.status !== "active" ||
- `lib\chernobog\learning\adaptationEngine.ts:39` - lesson.confidence <
- `lib\chernobog\learning\adaptationEngine.ts:40` - policy.minimumLessonConfidence
- `lib\chernobog\learning\adaptationEngine.ts:46` - matchLessonToSignal(
- `lib\chernobog\learning\adaptationEngine.ts:47` - lesson,
- `lib\chernobog\learning\adaptationEngine.ts:60` - lesson.confidence *
- `lib\chernobog\learning\adaptationEngine.ts:66` - lesson.kind === "correction-pattern" ||
- `lib\chernobog\learning\adaptationEngine.ts:67` - lesson.kind === "preference"
- `lib\chernobog\learning\adaptationEngine.ts:70` - lessonKey: lesson.key,
- `lib\chernobog\learning\adaptationEngine.ts:71` - kind: "guidance",
- `lib\chernobog\learning\adaptationEngine.ts:72` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationEngine.ts:74` - guidance: lesson.statement,
- `lib\chernobog\learning\adaptationEngine.ts:79` - lessonKey: lesson.key,
- `lib\chernobog\learning\adaptationEngine.ts:81` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationEngine.ts:86` - export function adaptAttentionWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:88` - lessons: readonly LearnedLesson[],
- `lib\chernobog\learning\adaptationEngine.ts:95` - const influences = lessons
- `lib\chernobog\learning\adaptationEngine.ts:96` - .map((lesson) =>
- `lib\chernobog\learning\adaptationEngine.ts:97` - influenceForLesson(
- `lib\chernobog\learning\adaptationEngine.ts:98` - lesson,
- `lib\chernobog\learning\adaptationEngine.ts:120` - return left.lessonKey.localeCompare(
- `lib\chernobog\learning\adaptationEngine.ts:121` - right.lessonKey,
- `lib\chernobog\learning\adaptationEngine.ts:154` - export function adaptFocusCandidateWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:156` - lessons: readonly LearnedLesson[],
- `lib\chernobog\learning\adaptationEngine.ts:162` - adaptAttentionWithLessons(
- `lib\chernobog\learning\adaptationEngine.ts:164` - lessons,
- `lib\chernobog\learning\adaptationPolicy.ts:8` - minimumLessonConfidence: 0.75,
- `lib\chernobog\learning\adaptationPolicy.ts:25` - !Number.isFinite(policy.minimumLessonConfidence) ||
- `lib\chernobog\learning\adaptationPolicy.ts:26` - policy.minimumLessonConfidence < 0 ||
- `lib\chernobog\learning\adaptationPolicy.ts:27` - policy.minimumLessonConfidence > 1
- `lib\chernobog\learning\adaptationPolicy.ts:30` - "learning adaptation minimumLessonConfidence must be between 0 and 1.",
- `lib\chernobog\learning\adaptationTypes.ts:6` - LearnedLesson,
- `lib\chernobog\learning\adaptationTypes.ts:11` - | "guidance";
- `lib\chernobog\learning\adaptationTypes.ts:14` - lessonKey: string;
- `lib\chernobog\learning\adaptationTypes.ts:18` - guidance?: string;
- `lib\chernobog\learning\adaptationTypes.ts:37` - minimumLessonConfidence: number;
- `lib\chernobog\learning\adaptationTypes.ts:40` - export interface LearningLessonMatch {
- `lib\chernobog\learning\adaptationTypes.ts:41` - lesson: LearnedLesson;
- `lib\chernobog\learning\index.ts:18` - export * from "./lessonPromotion";
- `lib\chernobog\learning\index.ts:19` - export * from "./lessonStore";
- `lib\chernobog\learning\index.ts:22` - export * from "./lessonApplicability";
- `lib\chernobog\learning\index.ts:23` - export * from "./lessonGuidance";
- `lib\chernobog\learning\learningRuntime.ts:10` - adaptAttentionWithLessons,
- `lib\chernobog\learning\learningRuntime.ts:13` - activeLessonGuidance,
- `lib\chernobog\learning\learningRuntime.ts:14` - } from "./lessonGuidance";
- `lib\chernobog\learning\learningRuntime.ts:28` - ChernobogLearnedLessonStore,
- `lib\chernobog\learning\learningRuntime.ts:29` - } from "./lessonStore";
- `lib\chernobog\learning\learningRuntime.ts:32` - revokeLearnedLesson,
- `lib\chernobog\learning\learningRuntime.ts:33` - } from "./lessonPromotion";
- `lib\chernobog\learning\learningRuntime.ts:63` - readonly lessons =
- `lib\chernobog\learning\learningRuntime.ts:64` - new ChernobogLearnedLessonStore();
- `lib\chernobog\learning\learningRuntime.ts:66` - private readonly lessonPath: string;
- `lib\chernobog\learning\learningRuntime.ts:75` - this.lessonPath =
- `lib\chernobog\learning\learningRuntime.ts:76` - options.lessonPath ??
- `lib\chernobog\learning\learningRuntime.ts:81` - "lessons.json",
- `lib\chernobog\learning\learningRuntime.ts:91` - await this.lessons.load(
- `lib\chernobog\learning\learningRuntime.ts:92` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:217` - const lesson =
- `lib\chernobog\learning\learningRuntime.ts:227` - this.lessons.upsert(
- `lib\chernobog\learning\learningRuntime.ts:228` - lesson,
- `lib\chernobog\learning\learningRuntime.ts:231` - await this.persistLessons();
- `lib\chernobog\learning\learningRuntime.ts:234` - lesson,
- `lib\chernobog\learning\learningRuntime.ts:239` - lessonKey: string,
- `lib\chernobog\learning\learningRuntime.ts:242` - const lesson =
- `lib\chernobog\learning\learningRuntime.ts:243` - this.lessons.get(
- `lib\chernobog\learning\learningRuntime.ts:244` - lessonKey,
- `lib\chernobog\learning\learningRuntime.ts:247` - if (!lesson) {
- `lib\chernobog\learning\learningRuntime.ts:249` - `learned lesson not found: ${lessonKey}`,
- `lib\chernobog\learning\learningRuntime.ts:254` - revokeLearnedLesson(
- `lib\chernobog\learning\learningRuntime.ts:255` - lesson,
- `lib\chernobog\learning\learningRuntime.ts:260` - this.lessons.upsert(
- `lib\chernobog\learning\learningRuntime.ts:264` - await this.persistLessons();
- `lib\chernobog\learning\learningRuntime.ts:275` - return adaptAttentionWithLessons(
- `lib\chernobog\learning\learningRuntime.ts:277` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:283` - guidance(): string[] {
- `lib\chernobog\learning\learningRuntime.ts:284` - return activeLessonGuidance(
- `lib\chernobog\learning\learningRuntime.ts:285` - this.lessons.list({
- `lib\chernobog\learning\learningRuntime.ts:291` - async persistLessons():
- `lib\chernobog\learning\learningRuntime.ts:293` - await this.lessons.save(
- `lib\chernobog\learning\learningRuntime.ts:294` - this.lessonPath,
- `lib\chernobog\learning\learningRuntime.ts:324` - lessons:
- `lib\chernobog\learning\learningRuntime.ts:325` - this.lessons.list(),
- `lib\chernobog\learning\learningRuntime.ts:326` - activeLessons:
- `lib\chernobog\learning\learningRuntime.ts:327` - this.lessons.list({
- `lib\chernobog\learning\lessonApplicability.ts:5` - LearningLessonMatch,
- `lib\chernobog\learning\lessonApplicability.ts:8` - LearnedLesson,
- `lib\chernobog\learning\lessonApplicability.ts:12` - lesson: LearnedLesson,
- `lib\chernobog\learning\lessonApplicability.ts:16` - lesson.evidence.subjects
- `lib\chernobog\learning\lessonApplicability.ts:23` - export function matchLessonToSignal(
- `lib\chernobog\learning\lessonApplicability.ts:24` - lesson: LearnedLesson,
- `lib\chernobog\learning\lessonApplicability.ts:26` - ): LearningLessonMatch {
- `lib\chernobog\learning\lessonApplicability.ts:27` - if (lesson.status !== "active") {
- `lib\chernobog\learning\lessonApplicability.ts:29` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:32` - reason: "lesson-revoked",
- `lib\chernobog\learning\lessonApplicability.ts:36` - const subjects = subjectCandidates(lesson);
- `lib\chernobog\learning\lessonApplicability.ts:40` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:43` - reason: "lesson-has-no-subject-scope",
- `lib\chernobog\learning\lessonApplicability.ts:49` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:62` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:80` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:88` - lesson: structuredClone(lesson),
- `lib\chernobog\learning\lessonApplicability.ts:91` - reason: "lesson-not-relevant",
- `lib\chernobog\learning\lessonGuidance.ts:2` - LearnedLesson,
- `lib\chernobog\learning\lessonGuidance.ts:5` - export function activeLessonGuidance(
- `lib\chernobog\learning\lessonGuidance.ts:6` - lessons: readonly LearnedLesson[],
- `lib\chernobog\learning\lessonGuidance.ts:8` - return lessons
- `lib\chernobog\learning\lessonGuidance.ts:10` - (lesson) =>
- `lib\chernobog\learning\lessonGuidance.ts:11` - lesson.status === "active" &&
- `lib\chernobog\learning\lessonGuidance.ts:13` - lesson.kind === "preference" ||
- `lib\chernobog\learning\lessonGuidance.ts:14` - lesson.kind === "correction-pattern"
- `lib\chernobog\learning\lessonGuidance.ts:33` - (lesson) => lesson.statement,
- `lib\chernobog\learning\lessonPromotion.ts:3` - import type { LearnedLesson, LearningPromotionContext, LearningPromotionPolicy } from "./promotionTypes";
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\lessonPromotion.ts:6` - export function revokeLearnedLesson(lesson:LearnedLesson,reason:string,now=new Date()):LearnedLesson{const r=reason.trim();if(!r)throw new Error("learning lesson revocation reason must not be empty.");return{...structuredClone(lesson),status:"revoked",revokedAt:now.toISOString(),revocationReason:r};}
- `lib\chernobog\learning\lessonStore.ts:3` - import type { LearnedLesson } from "./promotionTypes";
- `lib\chernobog\learning\lessonStore.ts:4` - interface Snapshot{schemaVersion:1;savedAt:string;lessons:LearnedLesson[]}
- `lib\chernobog\learning\lessonStore.ts:5` - const clone=(x:LearnedLesson)=>structuredClone(x);
- `lib\chernobog\learning\lessonStore.ts:6` - function validate(v:unknown):LearnedLesson{if(!v||typeof v!=="object")throw new Error("invalid learned lesson record.");const x=v as Partial<LearnedLesson>;if(typeof x.id!=="string"||typeof x.key!=="string"||typeof x.statement!=="string"||(x.status!=="active"&&x.status!=="revoked"))throw new Error("invalid learned lesson shape.");return structuredClone(x as LearnedLesson);}
- `lib\chernobog\learning\lessonStore.ts:7` - export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
- `lib\chernobog\learning\promotionGate.ts:6` - export function assessLearningPromotion(pattern:LearningPatternCandidate,context:LearningPromotionContext,policy:LearningPromotionPolicy=DEFAULT_LEARNING_PROMOTION_POLICY):LearningPromotionAssessment{validateLearningPromotionPolicy(policy);const reasons:LearningPromotionReason[]=[];let reject=false,hold=false;if(pattern.supportCount>=policy.minimumSupport)add(reasons,"support-sufficient","Pattern support meets the promotion threshold.");else{hold=true;add(reasons,"support-insufficient","Pattern does not yet have enough supporting experiences.");}if(pattern.confidence>=policy.minimumConfidence)add(reasons,"confidence-sufficient","Pattern confidence meets the promotion threshold.");else{hold=true;add(reasons,"confidence-insufficient","Pattern confidence is below the promotion threshold.");}const total=pattern.supportCount+pattern.contradictionCount;const ratio=total===0?0:pattern.contradictionCount/total;if(ratio<=policy.maximumContradictionRatio)add(reasons,"contradiction-acceptable","Contradictory evidence remains within the governance ceiling.");else{reject=true;add(reasons,"contradiction-excessive","Contradictory evidence exceeds the governance ceiling.");}if(needsApproval(pattern,policy)){if(context.approved)add(reasons,"approval-present","Explicit governance approval is present.");else{hold=true;add(reasons,"approval-required","This lesson class requires explicit governance approval.");}}if(reject)return{patternKey:pattern.key,decision:"reject",reasons};if(hold)return{patternKey:pattern.key,decision:"hold",reasons};add(reasons,"eligible-for-promotion","All promotion governance requirements are satisfied.");return{patternKey:pattern.key,decision:"promote",reasons};}
- `lib\chernobog\learning\promotionTypes.ts:3` - export type LearningLessonStatus = "active" | "revoked";
- `lib\chernobog\learning\promotionTypes.ts:10` - export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
- `lib\chernobog\learning\runtimeTypes.ts:14` - LearnedLesson,
- `lib\chernobog\learning\runtimeTypes.ts:25` - lessonPath?: string;
- `lib\chernobog\learning\runtimeTypes.ts:34` - lessons: LearnedLesson[];
- `lib\chernobog\learning\runtimeTypes.ts:35` - activeLessons: LearnedLesson[];
- `lib\chernobog\learning\runtimeTypes.ts:40` - lesson: LearnedLesson;
- `app\api\cognition\route.ts:27` - "advisory-only",
- `app\api\memory-sources\route.ts:24` - promotesLessons: false,
- `app\api\unified-memory\route.ts:24` - promotesLessons: false,

## Learning interaction with World State / World Model

Pattern: `WorldState|world state|WorldModel|world model|lessonKeys|fresh|stale|confidence|provenance|evidence`

- `lib\chernobog\learning\adaptationEngine.ts:39` - lesson.confidence <
- `lib\chernobog\learning\adaptationEngine.ts:40` - policy.minimumLessonConfidence
- `lib\chernobog\learning\adaptationEngine.ts:60` - lesson.confidence *
- `lib\chernobog\learning\adaptationEngine.ts:72` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationEngine.ts:81` - confidence: lesson.confidence,
- `lib\chernobog\learning\adaptationPolicy.ts:8` - minimumLessonConfidence: 0.75,
- `lib\chernobog\learning\adaptationPolicy.ts:25` - !Number.isFinite(policy.minimumLessonConfidence) ||
- `lib\chernobog\learning\adaptationPolicy.ts:26` - policy.minimumLessonConfidence < 0 ||
- `lib\chernobog\learning\adaptationPolicy.ts:27` - policy.minimumLessonConfidence > 1
- `lib\chernobog\learning\adaptationPolicy.ts:30` - "learning adaptation minimumLessonConfidence must be between 0 and 1.",
- `lib\chernobog\learning\adaptationTypes.ts:16` - confidence: number;
- `lib\chernobog\learning\adaptationTypes.ts:37` - minimumLessonConfidence: number;
- `lib\chernobog\learning\eligibility.ts:42` - const evidenceCount =
- `lib\chernobog\learning\eligibility.ts:43` - experience.evidence.eventIds.length +
- `lib\chernobog\learning\eligibility.ts:44` - experience.evidence.worldStateKeys.length +
- `lib\chernobog\learning\eligibility.ts:45` - experience.evidence.cognitiveDecisionIds.length;
- `lib\chernobog\learning\eligibility.ts:47` - if (evidenceCount > 0) {
- `lib\chernobog\learning\eligibility.ts:51` - "grounded-evidence",
- `lib\chernobog\learning\eligibility.ts:53` - "The experience is grounded in retained evidence.",
- `lib\chernobog\learning\eligibility.ts:57` - if (experience.confidence >= 0.7) {
- `lib\chernobog\learning\eligibility.ts:61` - "adequate-confidence",
- `lib\chernobog\learning\eligibility.ts:63` - "Evidence confidence is sufficient for candidate learning.",
- `lib\chernobog\learning\eligibility.ts:65` - } else if (experience.confidence < 0.4) {
- `lib\chernobog\learning\eligibility.ts:69` - "low-confidence",
- `lib\chernobog\learning\eligibility.ts:71` - "Low confidence dampens the learning signal.",
- `lib\chernobog\learning\evaluationTypes.ts:13` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:15` - evidenceEventIds: string[];
- `lib\chernobog\learning\evaluationTypes.ts:16` - evidenceWorldStateKeys: string[];
- `lib\chernobog\learning\evaluationTypes.ts:24` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:35` - | "conflicting-evidence"
- `lib\chernobog\learning\evaluationTypes.ts:36` - | "insufficient-outcome-confidence"
- `lib\chernobog\learning\evaluationTypes.ts:52` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:56` - confidence: number;
- `lib\chernobog\learning\evaluationTypes.ts:59` - evaluationConfidence: number;
- `lib\chernobog\learning\evaluator.ts:30` - confidence: number;
- `lib\chernobog\learning\evaluator.ts:59` - right.confidence !==
- `lib\chernobog\learning\evaluator.ts:60` - left.confidence
- `lib\chernobog\learning\evaluator.ts:63` - right.confidence -
- `lib\chernobog\learning\evaluator.ts:64` - left.confidence
- `lib\chernobog\learning\evaluator.ts:88` - confidence: 0,
- `lib\chernobog\learning\evaluator.ts:94` - confidence: winner.confidence,
- `lib\chernobog\learning\evaluator.ts:105` - confidence: number;
- `lib\chernobog\learning\evaluator.ts:117` - confidence: 0,
- `lib\chernobog\learning\evaluator.ts:130` - successWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:134` - failureWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:138` - mixedWeight += item.confidence;
- `lib\chernobog\learning\evaluator.ts:144` - item.confidence;
- `lib\chernobog\learning\evaluator.ts:146` - item.confidence;
- `lib\chernobog\learning\evaluator.ts:192` - const averageEvidenceConfidence =
- `lib\chernobog\learning\evaluator.ts:204` - const confidence =
- `lib\chernobog\learning\evaluator.ts:209` - averageEvidenceConfidence *
- `lib\chernobog\learning\evaluator.ts:227` - confidence,
- `lib\chernobog\learning\evaluator.ts:328` - "conflicting-evidence",
- `lib\chernobog\learning\evaluator.ts:329` - "Success and failure evidence conflict, so the result is not treated as certain.",
- `lib\chernobog\learning\evaluator.ts:336` - resolvedOutcome.confidence <
- `lib\chernobog\learning\evaluator.ts:341` - "insufficient-outcome-confidence",
- `lib\chernobog\learning\evaluator.ts:342` - "Outcome evidence exists but is not strong enough to be treated as highly reliable.",
- `lib\chernobog\learning\evaluator.ts:356` - const evaluationConfidence =
- `lib\chernobog\learning\evaluator.ts:358` - resolvedFeedback.confidence,
- `lib\chernobog\learning\evaluator.ts:359` - resolvedOutcome.confidence,
- `lib\chernobog\learning\evaluator.ts:385` - confidence:
- `lib\chernobog\learning\evaluator.ts:386` - resolvedOutcome.confidence,
- `lib\chernobog\learning\evaluator.ts:389` - evaluationConfidence,
- `lib\chernobog\learning\experience.ts:2` - LearningEvidence,
- `lib\chernobog\learning\experience.ts:36` - function requireConfidence(
- `lib\chernobog\learning\experience.ts:45` - "learningExperience.confidence must be between 0 and 1.",
- `lib\chernobog\learning\experience.ts:86` - function normalizeEvidence(
- `lib\chernobog\learning\experience.ts:87` - input: Partial<LearningEvidence> | undefined,
- `lib\chernobog\learning\experience.ts:88` - ): LearningEvidence {
- `lib\chernobog\learning\experience.ts:91` - worldStateKeys: normalizeTextList(
- `lib\chernobog\learning\experience.ts:92` - input?.worldStateKeys,
- `lib\chernobog\learning\experience.ts:160` - confidence: requireConfidence(
- `lib\chernobog\learning\experience.ts:161` - input.confidence ?? 0.5,
- `lib\chernobog\learning\experience.ts:165` - evidence: normalizeEvidence(input.evidence),
- `lib\chernobog\learning\feedbackObservation.ts:19` - function requireConfidence(
- `lib\chernobog\learning\feedbackObservation.ts:28` - "learning feedback confidence must be between 0 and 1.",
- `lib\chernobog\learning\feedbackObservation.ts:41` - confidence?: number;
- `lib\chernobog\learning\feedbackObservation.ts:62` - confidence:
- `lib\chernobog\learning\feedbackObservation.ts:63` - requireConfidence(
- `lib\chernobog\learning\feedbackObservation.ts:64` - input.confidence ?? 1,
- `lib\chernobog\learning\fromCognitiveCycle.ts:17` - const confidence =
- `lib\chernobog\learning\fromCognitiveCycle.ts:19` - ?.signal.assessment.confidence ??
- `lib\chernobog\learning\fromCognitiveCycle.ts:30` - confidence,
- `lib\chernobog\learning\fromCognitiveCycle.ts:37` - evidence: {
- `lib\chernobog\learning\fromCognitiveCycle.ts:38` - worldStateKeys: focusKey
- `lib\chernobog\learning\learningRuntime.ts:168` - refreshPatterns(): void {
- `lib\chernobog\learning\lessonApplicability.ts:16` - lesson.evidence.subjects
- `lib\chernobog\learning\lessonGuidance.ts:19` - left.confidence !==
- `lib\chernobog\learning\lessonGuidance.ts:20` - right.confidence
- `lib\chernobog\learning\lessonGuidance.ts:23` - right.confidence -
- `lib\chernobog\learning\lessonGuidance.ts:24` - left.confidence
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\outcomeObservation.ts:56` - confidence?: number;
- `lib\chernobog\learning\outcomeObservation.ts:58` - evidenceEventIds?: string[];
- `lib\chernobog\learning\outcomeObservation.ts:59` - evidenceWorldStateKeys?: string[];
- `lib\chernobog\learning\outcomeObservation.ts:93` - confidence: requireUnitInterval(
- `lib\chernobog\learning\outcomeObservation.ts:94` - input.confidence ?? 0.5,
- `lib\chernobog\learning\outcomeObservation.ts:95` - "learningOutcomeObservation.confidence",
- `lib\chernobog\learning\outcomeObservation.ts:98` - evidenceEventIds:
- `lib\chernobog\learning\outcomeObservation.ts:99` - normalizeList(input.evidenceEventIds),
- `lib\chernobog\learning\outcomeObservation.ts:100` - evidenceWorldStateKeys:
- `lib\chernobog\learning\outcomeObservation.ts:101` - normalizeList(input.evidenceWorldStateKeys),
- `lib\chernobog\learning\patternExtractor.ts:10` - confidence: number;
- `lib\chernobog\learning\patternExtractor.ts:35` - confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
- `lib\chernobog\learning\patternExtractor.ts:47` - confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
- `lib\chernobog\learning\patternExtractor.ts:59` - confidence: Math.max(evaluation.evaluationConfidence, feedback.confidence),
- `lib\chernobog\learning\patternExtractor.ts:72` - confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
- `lib\chernobog\learning\patternExtractor.ts:83` - confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
- `lib\chernobog\learning\patternExtractor.ts:92` - confidence: Math.max(evaluation.evaluationConfidence, outcome.confidence),
- `lib\chernobog\learning\patternExtractor.ts:123` - const averageConfidence = support.reduce((sum,item)=>sum+item.confidence,0)/support.length;
- `lib\chernobog\learning\patternExtractor.ts:124` - const confidence = Math.max(0, Math.min(1, averageConfidence * (1 - contradictionRatio)));
- `lib\chernobog\learning\patternExtractor.ts:125` - if (confidence < policy.confidenceFloor) { rejectedKeys.push(key); continue; }
- `lib\chernobog\learning\patternExtractor.ts:135` - confidence,
- `lib\chernobog\learning\patternExtractor.ts:138` - evidence: {
- `lib\chernobog\learning\patternExtractor.ts:147` - candidates.sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key));
- `lib\chernobog\learning\patternPolicy.ts:6` - confidenceFloor: 0.6,
- `lib\chernobog\learning\patternPolicy.ts:15` - ["confidenceFloor", policy.confidenceFloor],
- `lib\chernobog\learning\patternStore.ts:20` - .sort((a,b)=> b.confidence-a.confidence || b.supportCount-a.supportCount || a.key.localeCompare(b.key))
- `lib\chernobog\learning\patternTypes.ts:9` - export interface LearningPatternEvidence {
- `lib\chernobog\learning\patternTypes.ts:23` - confidence: number;
- `lib\chernobog\learning\patternTypes.ts:26` - evidence: LearningPatternEvidence;
- `lib\chernobog\learning\patternTypes.ts:33` - confidenceFloor: number;
- `lib\chernobog\learning\promotionGate.ts:6` - export function assessLearningPromotion(pattern:LearningPatternCandidate,context:LearningPromotionContext,policy:LearningPromotionPolicy=DEFAULT_LEARNING_PROMOTION_POLICY):LearningPromotionAssessment{validateLearningPromotionPolicy(policy);const reasons:LearningPromotionReason[]=[];let reject=false,hold=false;if(pattern.supportCount>=policy.minimumSupport)add(reasons,"support-sufficient","Pattern support meets the promotion threshold.");else{hold=true;add(reasons,"support-insufficient","Pattern does not yet have enough supporting experiences.");}if(pattern.confidence>=policy.minimumConfidence)add(reasons,"confidence-sufficient","Pattern confidence meets the promotion threshold.");else{hold=true;add(reasons,"confidence-insufficient","Pattern confidence is below the promotion threshold.");}const total=pattern.supportCount+pattern.contradictionCount;const ratio=total===0?0:pattern.contradictionCount/total;if(ratio<=policy.maximumContradictionRatio)add(reasons,"contradiction-acceptable","Contradictory evidence remains within the governance ceiling.");else{reject=true;add(reasons,"contradiction-excessive","Contradictory evidence exceeds the governance ceiling.");}if(needsApproval(pattern,policy)){if(context.approved)add(reasons,"approval-present","Explicit governance approval is present.");else{hold=true;add(reasons,"approval-required","This lesson class requires explicit governance approval.");}}if(reject)return{patternKey:pattern.key,decision:"reject",reasons};if(hold)return{patternKey:pattern.key,decision:"hold",reasons};add(reasons,"eligible-for-promotion","All promotion governance requirements are satisfied.");return{patternKey:pattern.key,decision:"promote",reasons};}
- `lib\chernobog\learning\promotionPolicy.ts:2` - export const DEFAULT_LEARNING_PROMOTION_POLICY:LearningPromotionPolicy={minimumSupport:3,minimumConfidence:0.75,maximumContradictionRatio:0.25,requireExplicitApprovalForPreferences:true,requireExplicitApprovalForCorrections:true};
- `lib\chernobog\learning\promotionPolicy.ts:3` - export function validateLearningPromotionPolicy(policy:LearningPromotionPolicy):void{if(!Number.isInteger(policy.minimumSupport)||policy.minimumSupport<2)throw new Error("learning promotion minimumSupport must be an integer of at least 2.");for(const [field,value] of [["minimumConfidence",policy.minimumConfidence],["maximumContradictionRatio",policy.maximumContradictionRatio]] as const){if(!Number.isFinite(value)||value<0||value>1)throw new Error(`learning promotion ${field} must be between 0 and 1.`);}}
- `lib\chernobog\learning\promotionTypes.ts:5` - export interface LearningPromotionPolicy { minimumSupport:number; minimumConfidence:number; maximumContradictionRatio:number; requireExplicitApprovalForPreferences:boolean; requireExplicitApprovalForCorrections:boolean; }
- `lib\chernobog\learning\promotionTypes.ts:7` - export type LearningPromotionReasonCode = "support-sufficient"|"support-insufficient"|"confidence-sufficient"|"confidence-insufficient"|"contradiction-acceptable"|"contradiction-excessive"|"approval-required"|"approval-present"|"eligible-for-promotion";
- `lib\chernobog\learning\promotionTypes.ts:10` - export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
- `lib\chernobog\learning\types.ts:30` - export interface LearningEvidence {
- `lib\chernobog\learning\types.ts:32` - worldStateKeys: string[];
- `lib\chernobog\learning\types.ts:42` - confidence: number;
- `lib\chernobog\learning\types.ts:45` - evidence: LearningEvidence;
- `lib\chernobog\learning\types.ts:55` - confidence?: number;
- `lib\chernobog\learning\types.ts:58` - evidence?: Partial<LearningEvidence>;
- `lib\chernobog\learning\types.ts:65` - | "grounded-evidence"
- `lib\chernobog\learning\types.ts:66` - | "adequate-confidence"
- `lib\chernobog\learning\types.ts:67` - | "low-confidence"
- `lib\chernobog\worldState\assessment.ts:1` - import { getWorldStateConfidenceBand } from "./confidence";
- `lib\chernobog\worldState\assessment.ts:2` - import { buildWorldStateFreshness } from "./freshness";
- `lib\chernobog\worldState\assessment.ts:3` - import { getWorldStateProvenanceStatus } from "./provenance";
- `lib\chernobog\worldState\assessment.ts:5` - WorldStateEvidenceAssessment,
- `lib\chernobog\worldState\assessment.ts:6` - WorldStateRecord,
- `lib\chernobog\worldState\assessment.ts:9` - export function assessWorldStateEvidence(
- `lib\chernobog\worldState\assessment.ts:10` - record: WorldStateRecord,
- `lib\chernobog\worldState\assessment.ts:12` - ): WorldStateEvidenceAssessment {
- `lib\chernobog\worldState\assessment.ts:17` - "worldState.observedAt must be a valid timestamp.",
- `lib\chernobog\worldState\assessment.ts:25` - confidence: record.confidence,
- `lib\chernobog\worldState\assessment.ts:26` - confidenceBasis: record.confidenceBasis,
- `lib\chernobog\worldState\assessment.ts:27` - confidenceBand: getWorldStateConfidenceBand(
- `lib\chernobog\worldState\assessment.ts:28` - record.confidence,
- `lib\chernobog\worldState\assessment.ts:30` - freshness: buildWorldStateFreshness(
- `lib\chernobog\worldState\assessment.ts:33` - expiresAt: record.freshness.expiresAt,
- `lib\chernobog\worldState\assessment.ts:34` - basis: record.freshness.basis,
- `lib\chernobog\worldState\assessment.ts:35` - ttlMs: record.freshness.ttlMs,
- `lib\chernobog\worldState\assessment.ts:39` - provenanceStatus: getWorldStateProvenanceStatus(
- `lib\chernobog\worldState\assessment.ts:40` - record.provenance,
- `lib\chernobog\worldState\assessment.ts:42` - eventId: record.provenance?.eventId,
- `lib\chernobog\worldState\assessment.ts:43` - eventType: record.provenance?.eventType,
- `lib\chernobog\worldState\assessment.ts:44` - projectorId: record.provenance?.projectorId,
- `lib\chernobog\worldState\assessment.ts:45` - sourceSubsystem: record.provenance?.source?.subsystem,
- `lib\chernobog\worldState\confidence.ts:2` - WorldStateConfidenceBand,
- `lib\chernobog\worldState\confidence.ts:3` - WorldStateConfidenceBasis,
- `lib\chernobog\worldState\confidence.ts:6` - export function normalizeWorldStateConfidence(
- `lib\chernobog\worldState\confidence.ts:7` - confidence: number,
- `lib\chernobog\worldState\confidence.ts:10` - !Number.isFinite(confidence) ||
- `lib\chernobog\worldState\confidence.ts:11` - confidence < 0 ||
- `lib\chernobog\worldState\confidence.ts:12` - confidence > 1
- `lib\chernobog\worldState\confidence.ts:15` - "worldState.confidence must be between 0 and 1.",
- `lib\chernobog\worldState\confidence.ts:19` - return confidence;
- `lib\chernobog\worldState\confidence.ts:22` - export function getWorldStateConfidenceBand(
- `lib\chernobog\worldState\confidence.ts:23` - confidence: number,
- `lib\chernobog\worldState\confidence.ts:24` - ): WorldStateConfidenceBand {
- `lib\chernobog\worldState\confidence.ts:25` - const normalized = normalizeWorldStateConfidence(confidence);
- `lib\chernobog\worldState\confidence.ts:38` - export function resolveWorldStateConfidenceBasis(
- `lib\chernobog\worldState\confidence.ts:39` - confidence: number | undefined,
- `lib\chernobog\worldState\confidence.ts:40` - requestedBasis: WorldStateConfidenceBasis | undefined,
- `lib\chernobog\worldState\confidence.ts:41` - ): WorldStateConfidenceBasis {
- `lib\chernobog\worldState\confidence.ts:46` - return confidence === undefined ? "default" : "record";
- `lib\chernobog\worldState\domainProjectors.ts:3` - WorldStateJsonValue,
- `lib\chernobog\worldState\domainProjectors.ts:6` - WorldStateProjection,
- `lib\chernobog\worldState\domainProjectors.ts:7` - WorldStateProjector,
- `lib\chernobog\worldState\domainProjectors.ts:10` - ChernobogWorldStateProjectionEngine,
- `lib\chernobog\worldState\domainProjectors.ts:48` - ): WorldStateJsonValue {
- `lib\chernobog\worldState\domainProjectors.ts:93` - Record<string, WorldStateJsonValue> = {};
- `lib\chernobog\worldState\domainProjectors.ts:162` - ): WorldStateJsonValue {
- `lib\chernobog\worldState\domainProjectors.ts:194` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:243` - WorldStateProjection[] = [
- `lib\chernobog\worldState\domainProjectors.ts:273` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:318` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:353` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:388` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:411` - WorldStateProjection[] = [
- `lib\chernobog\worldState\domainProjectors.ts:442` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:473` - WorldStateProjection[] = [
- `lib\chernobog\worldState\domainProjectors.ts:562` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:606` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:650` - WorldStateProjector {
- `lib\chernobog\worldState\domainProjectors.ts:686` - WorldStateProjector[] {
- `lib\chernobog\worldState\domainProjectors.ts:702` - ChernobogWorldStateProjectionEngine,
- `lib\chernobog\worldState\eventProjection.ts:2` - import { resolveWorldStateExpiry } from "./freshness";
- `lib\chernobog\worldState\eventProjection.ts:3` - import type { WorldStateProjection } from "./projectorTypes";
- `lib\chernobog\worldState\eventProjection.ts:5` - WorldStateConfidenceBasis,
- `lib\chernobog\worldState\eventProjection.ts:6` - WorldStateFreshnessBasis,
- `lib\chernobog\worldState\eventProjection.ts:7` - WorldStateRecordInput,
- `lib\chernobog\worldState\eventProjection.ts:10` - export function buildWorldStateInputFromEvent(
- `lib\chernobog\worldState\eventProjection.ts:12` - projection: WorldStateProjection,
- `lib\chernobog\worldState\eventProjection.ts:14` - ): WorldStateRecordInput {
- `lib\chernobog\worldState\eventProjection.ts:18` - let confidence: number;
- `lib\chernobog\worldState\eventProjection.ts:19` - let confidenceBasis: WorldStateConfidenceBasis;
- `lib\chernobog\worldState\eventProjection.ts:21` - if (projection.confidence !== undefined) {
- `lib\chernobog\worldState\eventProjection.ts:22` - confidence = projection.confidence;
- `lib\chernobog\worldState\eventProjection.ts:23` - confidenceBasis = "projector";
- `lib\chernobog\worldState\eventProjection.ts:25` - event.metadata.confidence !== undefined
- `lib\chernobog\worldState\eventProjection.ts:27` - confidence = event.metadata.confidence;
- `lib\chernobog\worldState\eventProjection.ts:28` - confidenceBasis = "event";
- `lib\chernobog\worldState\eventProjection.ts:30` - confidence = 1;
- `lib\chernobog\worldState\eventProjection.ts:31` - confidenceBasis = "default";
- `lib\chernobog\worldState\eventProjection.ts:35` - let freshnessBasis: WorldStateFreshnessBasis;
- `lib\chernobog\worldState\eventProjection.ts:36` - let freshnessTtlMs: number | undefined;
- `lib\chernobog\worldState\eventProjection.ts:40` - freshnessBasis = "explicit-expiry";
- `lib\chernobog\worldState\eventProjection.ts:42` - expiresAt = resolveWorldStateExpiry(
- `lib\chernobog\worldState\eventProjection.ts:46` - freshnessBasis = "ttl";
- `lib\chernobog\worldState\eventProjection.ts:47` - freshnessTtlMs = projection.ttlMs;
- `lib\chernobog\worldState\eventProjection.ts:50` - freshnessBasis = "event-expiry";
- `lib\chernobog\worldState\eventProjection.ts:52` - freshnessBasis = "none";
- `lib\chernobog\worldState\eventProjection.ts:60` - confidence,
- `lib\chernobog\worldState\eventProjection.ts:61` - confidenceBasis,
- `lib\chernobog\worldState\eventProjection.ts:63` - freshnessBasis,
- `lib\chernobog\worldState\eventProjection.ts:64` - freshnessTtlMs,
- `lib\chernobog\worldState\eventProjection.ts:65` - provenance: {
- `lib\chernobog\worldState\freshness.ts:2` - WorldStateFreshness,
- `lib\chernobog\worldState\freshness.ts:3` - WorldStateFreshnessBasis,
- `lib\chernobog\worldState\freshness.ts:4` - WorldStateFreshnessStatus,
- `lib\chernobog\worldState\freshness.ts:7` - export interface WorldStateFreshnessInput {
- `lib\chernobog\worldState\freshness.ts:10` - basis?: WorldStateFreshnessBasis;
- `lib\chernobog\worldState\freshness.ts:14` - export interface WorldStateFreshnessOptions {
- `lib\chernobog\worldState\freshness.ts:27` - export function normalizeWorldStateTtlMs(
- `lib\chernobog\worldState\freshness.ts:35` - throw new Error("worldState freshness TTL must be a finite number >= 0.");
- `lib\chernobog\worldState\freshness.ts:41` - export function resolveWorldStateExpiry(
- `lib\chernobog\worldState\freshness.ts:47` - "worldState.observedAt",

## Potential unsafe mutation or authority paths from learning

Pattern: `execute|tool|permission|grant|governance|rewrite|writeFile|saveMessage|runExecutionTask|executeFromMessage|toolGateway|openApp|shell|spawn|exec`

- `lib\chernobog\learning\fromCognitiveCycle.ts:51` - permittedToExecute:
- `lib\chernobog\learning\fromCognitiveCycle.ts:52` - cycle.action.permittedToExecute,
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\lessonStore.ts:1` - import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
- `lib\chernobog\learning\lessonStore.ts:7` - export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
- `lib\chernobog\learning\promotionGate.ts:6` - export function assessLearningPromotion(pattern:LearningPatternCandidate,context:LearningPromotionContext,policy:LearningPromotionPolicy=DEFAULT_LEARNING_PROMOTION_POLICY):LearningPromotionAssessment{validateLearningPromotionPolicy(policy);const reasons:LearningPromotionReason[]=[];let reject=false,hold=false;if(pattern.supportCount>=policy.minimumSupport)add(reasons,"support-sufficient","Pattern support meets the promotion threshold.");else{hold=true;add(reasons,"support-insufficient","Pattern does not yet have enough supporting experiences.");}if(pattern.confidence>=policy.minimumConfidence)add(reasons,"confidence-sufficient","Pattern confidence meets the promotion threshold.");else{hold=true;add(reasons,"confidence-insufficient","Pattern confidence is below the promotion threshold.");}const total=pattern.supportCount+pattern.contradictionCount;const ratio=total===0?0:pattern.contradictionCount/total;if(ratio<=policy.maximumContradictionRatio)add(reasons,"contradiction-acceptable","Contradictory evidence remains within the governance ceiling.");else{reject=true;add(reasons,"contradiction-excessive","Contradictory evidence exceeds the governance ceiling.");}if(needsApproval(pattern,policy)){if(context.approved)add(reasons,"approval-present","Explicit governance approval is present.");else{hold=true;add(reasons,"approval-required","This lesson class requires explicit governance approval.");}}if(reject)return{patternKey:pattern.key,decision:"reject",reasons};if(hold)return{patternKey:pattern.key,decision:"hold",reasons};add(reasons,"eligible-for-promotion","All promotion governance requirements are satisfied.");return{patternKey:pattern.key,decision:"promote",reasons};}
- `lib\chernobog\learning\promotionTypes.ts:4` - export type LearningGovernanceAuthority = "system-policy" | "user-approved" | "operator-approved";
- `lib\chernobog\learning\promotionTypes.ts:6` - export interface LearningPromotionContext { authority:LearningGovernanceAuthority; approved:boolean; approvedBy?:string; approvedAt?:string; }
- `lib\chernobog\learning\promotionTypes.ts:10` - export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }

## Existing 11I acceptance coverage

Pattern: `verify-chernobog-phase11-11i|Phase 11I|Learning Promotion|Pattern & Preference|Learning COMPLETE|learning.*acceptance`

- `scripts\verify-chernobog-phase11-11e-d-context-integration.ts:456` - "PASS Phase 11E-D Memory + Learning Context Integration acceptance",
- `scripts\verify-chernobog-phase11-11i-a-learning-event-model.ts:18` - "Chernobog Phase 11I-A - Learning Event Model",
- `scripts\verify-chernobog-phase11-11i-a-learning-event-model.ts:368` - "PASS Phase 11I-A Learning Event Model acceptance",
- `scripts\verify-chernobog-phase11-11i-b-outcome-feedback-evaluation.ts:16` - "Chernobog Phase 11I-B - Outcome & Feedback Evaluation",
- `scripts\verify-chernobog-phase11-11i-b-outcome-feedback-evaluation.ts:391` - "PASS Phase 11I-B Outcome & Feedback Evaluation acceptance",
- `scripts\verify-chernobog-phase11-11i-c-pattern-preference-learning.ts:39` - console.log("Chernobog Phase 11I-C - Pattern & Preference Learning");
- `scripts\verify-chernobog-phase11-11i-c-pattern-preference-learning.ts:116` - console.log("PASS Phase 11I-C Pattern & Preference Learning acceptance");
- `scripts\verify-chernobog-phase11-11i-d-learning-promotion-governance.ts:9` - async function main(){console.log("Chernobog Phase 11I-D - Learning Promotion & Governance");console.log("=======================================================");const c=pattern();const held=assessLearningPromotion(c,{authority:"system-policy",approved:false});assert.equal(held.decision,"hold");assert.ok(held.reasons.some(r=>r.code==="approval-required"));pass("correction patterns cannot promote without explicit governance approval");const ctx={authority:"user-approved" as const,approved:true,approvedBy:"user",approvedAt:"2026-08-25T20:31:00.000Z"};assert.equal(assessLearningPromotion(c,ctx).decision,"promote");pass("strong supported correction pattern becomes promotable after explicit approval");assert.equal(assessLearningPromotion(pattern({supportCount:2}),ctx).decision,"hold");pass("insufficient support remains on hold even when manually approved");assert.equal(assessLearningPromotion(pattern({confidence:0.6}),ctx).decision,"hold");pass("approval cannot override the minimum confidence floor");assert.equal(assessLearningPromotion(pattern({supportCount:4,contradictionCount:2}),ctx).decision,"reject");pass("excessive contradictory evidence causes hard rejection rather than promotion");const lesson=promoteLearningPattern(c,ctx,{now:new Date("2026-08-25T20:32:00.000Z")});assert.equal(lesson.status,"active");assert.equal(lesson.governance.authority,"user-approved");assert.equal(lesson.statement,c.statement);pass("promotion produces an auditable learned lesson with governance and source evidence");assert.throws(()=>promoteLearningPattern(pattern({confidence:0.4}),ctx));pass("lesson construction cannot bypass the promotion gate");const revoked=revokeLearnedLesson(lesson,"User preference changed.",new Date("2026-08-25T20:40:00.000Z"));assert.equal(revoked.status,"revoked");assert.equal(revoked.revocationReason,"User preference changed.");pass("learned lessons can be explicitly revoked with audit reason and timestamp");const store=new ChernobogLearnedLessonStore();store.upsert(lesson);store.upsert(revoked);assert.equal(store.size,1);assert.equal(store.list({activeOnly:true}).length,0);pass("lesson store deduplicates by stable lesson key and respects revocation state");store.upsert(lesson);const returned=store.get(lesson.key);assert.ok(returned);if(!returned)throw new Error("Expected stored lesson.");returned.statement="mutated";assert.notEqual(store.get(lesson.key)?.statement,"mutated");pass("lesson store returns defensive clones");const dir=await mkdtemp(join(tmpdir(),"chernobog-11i-d-"));const path=join(dir,"lessons.json");await store.save(path,new Date("2026-08-25T20:45:00.000Z"));assert.ok((await readFile(path,"utf8")).includes('"schemaVersion": 1'));const restored=new ChernobogLearnedLessonStore();await restored.load(path);assert.equal(restored.get(lesson.key)?.statement,lesson.statement);pass("approved lessons persist atomically and restore from versioned durable storage");const keys=Object.keys(lesson);assert.equal(keys.includes("behaviorOverride"),false);assert.equal(keys.includes("promptRewrite"),false);assert.equal(keys.includes("execute"),false);pass("11I-D can persist governed lessons without directly modifying behavior, prompts, or execution");console.log("=======================================================");console.log("PASS Phase 11I-D Learning Promotion & Governance acceptance");}
- `scripts\verify-chernobog-phase11-11i-e-adaptation-layer.ts:134` - "Chernobog Phase 11I-E - Adaptation Layer",
- `scripts\verify-chernobog-phase11-11i-e-adaptation-layer.ts:355` - "PASS Phase 11I-E Adaptation Layer acceptance",
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:30` - "Chernobog Phase 11I-F - Integration & Full Acceptance",
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:461` - "PASS Phase 11I-F Integration & Full Acceptance",
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:464` - "PASS Phase 11I Learning COMPLETE",

## Learning runtime core

File: `lib\chernobog\learning\learningRuntime.ts`
Pattern: `export class|constructor|record|pattern|lesson|save|load|promotion`

### line 10

```text
    1: import {
    2:   join,
    3: } from "node:path";
    4: 
    5: import type {
    6:   CognitiveAttentionSignal,
    7:   CognitiveRuntimeCycle,
    8: } from "../cognition";
    9: import {
>  10:   adaptAttentionWithLessons,
   11: } from "./adaptationEngine";
   12: import {
   13:   activeLessonGuidance,
   14: } from "./lessonGuidance";
   15: import {
   16:   ChernobogLearningEvaluationStore,
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
```

### line 13

```text
    1: import {
    2:   join,
    3: } from "node:path";
    4: 
    5: import type {
    6:   CognitiveAttentionSignal,
    7:   CognitiveRuntimeCycle,
    8: } from "../cognition";
    9: import {
   10:   adaptAttentionWithLessons,
   11: } from "./adaptationEngine";
   12: import {
>  13:   activeLessonGuidance,
   14: } from "./lessonGuidance";
   15: import {
   16:   ChernobogLearningEvaluationStore,
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
```

### line 14

```text
    1: import {
    2:   join,
    3: } from "node:path";
    4: 
    5: import type {
    6:   CognitiveAttentionSignal,
    7:   CognitiveRuntimeCycle,
    8: } from "../cognition";
    9: import {
   10:   adaptAttentionWithLessons,
   11: } from "./adaptationEngine";
   12: import {
   13:   activeLessonGuidance,
>  14: } from "./lessonGuidance";
   15: import {
   16:   ChernobogLearningEvaluationStore,
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
```

### line 28

```text
   14: } from "./lessonGuidance";
   15: import {
   16:   ChernobogLearningEvaluationStore,
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
>  28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
```

### line 29

```text
   15: import {
   16:   ChernobogLearningEvaluationStore,
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
>  29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
```

### line 31

```text
   17: } from "./evaluationStore";
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
>  31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
```

### line 32

```text
   18: import {
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
>  32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
```

### line 33

```text
   19:   evaluateLearningExperience,
   20: } from "./evaluator";
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
>  33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
```

### line 35

```text
   21: import {
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
>  35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
```

### line 36

```text
   22:   ChernobogLearningExperienceStore,
   23: } from "./experienceStore";
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
>  36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
```

### line 38

```text
   24: import {
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
>  38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
```

### line 39

```text
   25:   learningExperienceFromCognitiveCycle,
   26: } from "./fromCognitiveCycle";
   27: import {
   28:   ChernobogLearnedLessonStore,
   29: } from "./lessonStore";
   30: import {
   31:   promoteLearningPattern,
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
>  39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
```

### line 46

```text
   32:   revokeLearnedLesson,
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
>  46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
```

### line 47

```text
   33: } from "./lessonPromotion";
   34: import {
   35:   extractLearningPatterns,
   36: } from "./patternExtractor";
   37: import {
   38:   ChernobogLearningPatternStore,
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
>  47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
```

### line 53

```text
   39: } from "./patternStore";
   40: import type {
   41:   LearningFeedbackObservation,
   42:   LearningOutcomeObservation,
   43:   EvaluatedLearningExperience,
   44: } from "./evaluationTypes";
   45: import type {
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
>  53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
```

### line 60

```text
   46:   LearningPromotionContext,
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
>  60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
```

### line 61

```text
   47: } from "./promotionTypes";
   48: import type {
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
>  61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
```

### line 63

```text
   49:   ChernobogLearningRuntimeOptions,
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
>  63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
```

### line 64

```text
   50:   LearningRuntimeSnapshot,
   51: } from "./runtimeTypes";
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
>  64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
```

### line 66

```text
   52: 
   53: export class ChernobogLearningRuntime {
   54:   readonly experiences =
   55:     new ChernobogLearningExperienceStore();
   56: 
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
>  66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
```

### line 71

```text
   57:   readonly evaluations =
   58:     new ChernobogLearningEvaluationStore();
   59: 
   60:   readonly patterns =
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
>  71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
   81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
```

### line 75

```text
   61:     new ChernobogLearningPatternStore();
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
>  75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
   81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
   86:       (() => new Date());
   87:   }
   88: 
   89:   async initialize(): Promise<void> {
```

### line 76

```text
   62: 
   63:   readonly lessons =
   64:     new ChernobogLearnedLessonStore();
   65: 
   66:   private readonly lessonPath: string;
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
>  76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
   81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
   86:       (() => new Date());
   87:   }
   88: 
   89:   async initialize(): Promise<void> {
   90:     try {
```

### line 81

```text
   67: 
   68:   private readonly clock:
   69:     () => Date;
   70: 
   71:   constructor(
   72:     options:
   73:       ChernobogLearningRuntimeOptions = {},
   74:   ) {
   75:     this.lessonPath =
   76:       options.lessonPath ??
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
>  81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
   86:       (() => new Date());
   87:   }
   88: 
   89:   async initialize(): Promise<void> {
   90:     try {
   91:       await this.lessons.load(
   92:         this.lessonPath,
   93:       );
   94:     } catch (error) {
   95:       const code =
```

### line 91

```text
   77:       join(
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
   81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
   86:       (() => new Date());
   87:   }
   88: 
   89:   async initialize(): Promise<void> {
   90:     try {
>  91:       await this.lessons.load(
   92:         this.lessonPath,
   93:       );
   94:     } catch (error) {
   95:       const code =
   96:         (
   97:           error as NodeJS.ErrnoException
   98:         ).code;
   99: 
  100:       if (code !== "ENOENT") {
  101:         throw error;
  102:       }
  103:     }
  104:   }
  105: 
```

### line 92

```text
   78:         process.cwd(),
   79:         ".chernobog",
   80:         "learning",
   81:         "lessons.json",
   82:       );
   83: 
   84:     this.clock =
   85:       options.clock ??
   86:       (() => new Date());
   87:   }
   88: 
   89:   async initialize(): Promise<void> {
   90:     try {
   91:       await this.lessons.load(
>  92:         this.lessonPath,
   93:       );
   94:     } catch (error) {
   95:       const code =
   96:         (
   97:           error as NodeJS.ErrnoException
   98:         ).code;
   99: 
  100:       if (code !== "ENOENT") {
  101:         throw error;
  102:       }
  103:     }
  104:   }
  105: 
  106:   captureCognitiveCycle(
```

### line 168

```text
  154:     }
  155: 
  156:     return evaluateLearningExperience(
  157:       experience,
  158:       this.evaluations.outcomesFor(
  159:         experienceId,
  160:       ),
  161:       this.evaluations.feedbackFor(
  162:         experienceId,
  163:       ),
  164:       this.clock(),
  165:     );
  166:   }
  167: 
> 168:   refreshPatterns(): void {
  169:     const evaluated =
  170:       this.experiences
  171:         .list()
  172:         .map((experience) =>
  173:           this.evaluateExperience(
  174:             experience.id,
  175:           ),
  176:         )
  177:         .filter(
  178:           (
  179:             value,
  180:           ): value is EvaluatedLearningExperience =>
  181:             Boolean(value),
  182:         );
```

### line 185

```text
  171:         .list()
  172:         .map((experience) =>
  173:           this.evaluateExperience(
  174:             experience.id,
  175:           ),
  176:         )
  177:         .filter(
  178:           (
  179:             value,
  180:           ): value is EvaluatedLearningExperience =>
  181:             Boolean(value),
  182:         );
  183: 
  184:     const result =
> 185:       extractLearningPatterns(
  186:         evaluated,
  187:       );
  188: 
  189:     this.patterns.clear();
  190: 
  191:     for (
  192:       const candidate
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
```

### line 189

```text
  175:           ),
  176:         )
  177:         .filter(
  178:           (
  179:             value,
  180:           ): value is EvaluatedLearningExperience =>
  181:             Boolean(value),
  182:         );
  183: 
  184:     const result =
  185:       extractLearningPatterns(
  186:         evaluated,
  187:       );
  188: 
> 189:     this.patterns.clear();
  190: 
  191:     for (
  192:       const candidate
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
```

### line 195

```text
  181:             Boolean(value),
  182:         );
  183: 
  184:     const result =
  185:       extractLearningPatterns(
  186:         evaluated,
  187:       );
  188: 
  189:     this.patterns.clear();
  190: 
  191:     for (
  192:       const candidate
  193:       of result.candidates
  194:     ) {
> 195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
```

### line 202

```text
  188: 
  189:     this.patterns.clear();
  190: 
  191:     for (
  192:       const candidate
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
> 202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
```

### line 204

```text
  190: 
  191:     for (
  192:       const candidate
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
> 204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
```

### line 206

```text
  192:       const candidate
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
> 206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
```

### line 207

```text
  193:       of result.candidates
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
> 207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
```

### line 208

```text
  194:     ) {
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
> 208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
```

### line 211

```text
  197:       );
  198:     }
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
> 211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
```

### line 213

```text
  199:   }
  200: 
  201:   async promote(
  202:     patternKey: string,
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
> 213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
```

### line 217

```text
  203:     context:
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
> 217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
```

### line 218

```text
  204:       LearningPromotionContext,
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
> 218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
```

### line 219

```text
  205:   ) {
  206:     const pattern =
  207:       this.patterns.get(
  208:         patternKey,
  209:       );
  210: 
  211:     if (!pattern) {
  212:       throw new Error(
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
> 219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
```

### line 227

```text
  213:         `learning pattern not found: ${patternKey}`,
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
> 227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
```

### line 228

```text
  214:       );
  215:     }
  216: 
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
> 228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
```

### line 231

```text
  217:     const lesson =
  218:       promoteLearningPattern(
  219:         pattern,
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
> 231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
```

### line 234

```text
  220:         context,
  221:         {
  222:           now:
  223:             this.clock(),
  224:         },
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
> 234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
```

### line 239

```text
  225:       );
  226: 
  227:     this.lessons.upsert(
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
> 239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
```

### line 242

```text
  228:       lesson,
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
> 242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
```

### line 243

```text
  229:     );
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
> 243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
```

### line 244

```text
  230: 
  231:     await this.persistLessons();
  232: 
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
> 244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
```

### line 247

```text
  233:     return structuredClone(
  234:       lesson,
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
> 247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
  260:     this.lessons.upsert(
  261:       revoked,
```

### line 249

```text
  235:     );
  236:   }
  237: 
  238:   async revoke(
  239:     lessonKey: string,
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
> 249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
  260:     this.lessons.upsert(
  261:       revoked,
  262:     );
  263: 
```

### line 254

```text
  240:     reason: string,
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
> 254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
  260:     this.lessons.upsert(
  261:       revoked,
  262:     );
  263: 
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
```

### line 255

```text
  241:   ) {
  242:     const lesson =
  243:       this.lessons.get(
  244:         lessonKey,
  245:       );
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
> 255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
  260:     this.lessons.upsert(
  261:       revoked,
  262:     );
  263: 
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
```

### line 260

```text
  246: 
  247:     if (!lesson) {
  248:       throw new Error(
  249:         `learned lesson not found: ${lessonKey}`,
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
> 260:     this.lessons.upsert(
  261:       revoked,
  262:     );
  263: 
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
  270: 
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
```

### line 264

```text
  250:       );
  251:     }
  252: 
  253:     const revoked =
  254:       revokeLearnedLesson(
  255:         lesson,
  256:         reason,
  257:         this.clock(),
  258:       );
  259: 
  260:     this.lessons.upsert(
  261:       revoked,
  262:     );
  263: 
> 264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
  270: 
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
  275:     return adaptAttentionWithLessons(
  276:       signal,
  277:       this.lessons.list({
  278:         activeOnly: true,
```

### line 275

```text
  261:       revoked,
  262:     );
  263: 
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
  270: 
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
> 275:     return adaptAttentionWithLessons(
  276:       signal,
  277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
```

### line 277

```text
  263: 
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
  270: 
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
  275:     return adaptAttentionWithLessons(
  276:       signal,
> 277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
```

### line 284

```text
  270: 
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
  275:     return adaptAttentionWithLessons(
  276:       signal,
  277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
> 284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
  292:     Promise<void> {
  293:     await this.lessons.save(
  294:       this.lessonPath,
  295:       this.clock(),
  296:     );
  297:   }
  298: 
```

### line 285

```text
  271:   adaptSignal(
  272:     signal:
  273:       CognitiveAttentionSignal,
  274:   ) {
  275:     return adaptAttentionWithLessons(
  276:       signal,
  277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
> 285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
  292:     Promise<void> {
  293:     await this.lessons.save(
  294:       this.lessonPath,
  295:       this.clock(),
  296:     );
  297:   }
  298: 
  299:   snapshot():
```

### line 291

```text
  277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
> 291:   async persistLessons():
  292:     Promise<void> {
  293:     await this.lessons.save(
  294:       this.lessonPath,
  295:       this.clock(),
  296:     );
  297:   }
  298: 
  299:   snapshot():
  300:     LearningRuntimeSnapshot {
  301:     const evaluations =
  302:       this.experiences
  303:         .list()
  304:         .map((experience) =>
  305:           this.evaluateExperience(
```

### line 293

```text
  279:       }),
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
  292:     Promise<void> {
> 293:     await this.lessons.save(
  294:       this.lessonPath,
  295:       this.clock(),
  296:     );
  297:   }
  298: 
  299:   snapshot():
  300:     LearningRuntimeSnapshot {
  301:     const evaluations =
  302:       this.experiences
  303:         .list()
  304:         .map((experience) =>
  305:           this.evaluateExperience(
  306:             experience.id,
  307:           ),
```

### line 294

```text
  280:     );
  281:   }
  282: 
  283:   guidance(): string[] {
  284:     return activeLessonGuidance(
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
  292:     Promise<void> {
  293:     await this.lessons.save(
> 294:       this.lessonPath,
  295:       this.clock(),
  296:     );
  297:   }
  298: 
  299:   snapshot():
  300:     LearningRuntimeSnapshot {
  301:     const evaluations =
  302:       this.experiences
  303:         .list()
  304:         .map((experience) =>
  305:           this.evaluateExperience(
  306:             experience.id,
  307:           ),
  308:         )
```

### line 322

```text
  308:         )
  309:         .filter(
  310:           (
  311:             value,
  312:           ): value is EvaluatedLearningExperience =>
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
> 322:       patterns:
  323:         this.patterns.list(),
  324:       lessons:
  325:         this.lessons.list(),
  326:       activeLessons:
  327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```

### line 323

```text
  309:         .filter(
  310:           (
  311:             value,
  312:           ): value is EvaluatedLearningExperience =>
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
  322:       patterns:
> 323:         this.patterns.list(),
  324:       lessons:
  325:         this.lessons.list(),
  326:       activeLessons:
  327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```

### line 324

```text
  310:           (
  311:             value,
  312:           ): value is EvaluatedLearningExperience =>
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
  322:       patterns:
  323:         this.patterns.list(),
> 324:       lessons:
  325:         this.lessons.list(),
  326:       activeLessons:
  327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```

### line 325

```text
  311:             value,
  312:           ): value is EvaluatedLearningExperience =>
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
  322:       patterns:
  323:         this.patterns.list(),
  324:       lessons:
> 325:         this.lessons.list(),
  326:       activeLessons:
  327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```

### line 326

```text
  312:           ): value is EvaluatedLearningExperience =>
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
  322:       patterns:
  323:         this.patterns.list(),
  324:       lessons:
  325:         this.lessons.list(),
> 326:       activeLessons:
  327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```

### line 327

```text
  313:             Boolean(value),
  314:         );
  315: 
  316:     return {
  317:       generatedAt:
  318:         this.clock().toISOString(),
  319:       experiences:
  320:         this.experiences.list(),
  321:       evaluations,
  322:       patterns:
  323:         this.patterns.list(),
  324:       lessons:
  325:         this.lessons.list(),
  326:       activeLessons:
> 327:         this.lessons.list({
  328:           activeOnly: true,
  329:         }),
  330:     };
  331:   }
  332: }
```


## Experience normalization

File: `lib\chernobog\learning\experience.ts`
Pattern: `export|interface|function|experience|project|session|evidence`

### line 2

```text
    1: import type {
>   2:   LearningEvidence,
    3:   LearningExperience,
    4:   LearningExperienceInput,
    5:   LearningFeedback,
    6:   LearningOutcome,
    7: } from "./types";
    8: 
    9: function normalizeTextList(
   10:   values: readonly string[] | undefined,
   11: ): string[] {
   12:   return [
   13:     ...new Set(
   14:       (values ?? [])
```

### line 3

```text
    1: import type {
    2:   LearningEvidence,
>   3:   LearningExperience,
    4:   LearningExperienceInput,
    5:   LearningFeedback,
    6:   LearningOutcome,
    7: } from "./types";
    8: 
    9: function normalizeTextList(
   10:   values: readonly string[] | undefined,
   11: ): string[] {
   12:   return [
   13:     ...new Set(
   14:       (values ?? [])
   15:         .map((value) => value.trim())
```

### line 4

```text
    1: import type {
    2:   LearningEvidence,
    3:   LearningExperience,
>   4:   LearningExperienceInput,
    5:   LearningFeedback,
    6:   LearningOutcome,
    7: } from "./types";
    8: 
    9: function normalizeTextList(
   10:   values: readonly string[] | undefined,
   11: ): string[] {
   12:   return [
   13:     ...new Set(
   14:       (values ?? [])
   15:         .map((value) => value.trim())
   16:         .filter(Boolean),
```

### line 9

```text
    1: import type {
    2:   LearningEvidence,
    3:   LearningExperience,
    4:   LearningExperienceInput,
    5:   LearningFeedback,
    6:   LearningOutcome,
    7: } from "./types";
    8: 
>   9: function normalizeTextList(
   10:   values: readonly string[] | undefined,
   11: ): string[] {
   12:   return [
   13:     ...new Set(
   14:       (values ?? [])
   15:         .map((value) => value.trim())
   16:         .filter(Boolean),
   17:     ),
   18:   ].sort();
   19: }
   20: 
   21: function requireTimestamp(
```

### line 21

```text
    9: function normalizeTextList(
   10:   values: readonly string[] | undefined,
   11: ): string[] {
   12:   return [
   13:     ...new Set(
   14:       (values ?? [])
   15:         .map((value) => value.trim())
   16:         .filter(Boolean),
   17:     ),
   18:   ].sort();
   19: }
   20: 
>  21: function requireTimestamp(
   22:   value: string,
   23:   field: string,
   24: ): string {
   25:   const parsed = new Date(value);
   26: 
   27:   if (Number.isNaN(parsed.getTime())) {
   28:     throw new Error(
   29:       `${field} must be a valid timestamp.`,
   30:     );
   31:   }
   32: 
   33:   return parsed.toISOString();
```

### line 36

```text
   24: ): string {
   25:   const parsed = new Date(value);
   26: 
   27:   if (Number.isNaN(parsed.getTime())) {
   28:     throw new Error(
   29:       `${field} must be a valid timestamp.`,
   30:     );
   31:   }
   32: 
   33:   return parsed.toISOString();
   34: }
   35: 
>  36: function requireConfidence(
   37:   value: number,
   38: ): number {
   39:   if (
   40:     !Number.isFinite(value) ||
   41:     value < 0 ||
   42:     value > 1
   43:   ) {
   44:     throw new Error(
   45:       "learningExperience.confidence must be between 0 and 1.",
   46:     );
   47:   }
   48: 
```

### line 45

```text
   33:   return parsed.toISOString();
   34: }
   35: 
   36: function requireConfidence(
   37:   value: number,
   38: ): number {
   39:   if (
   40:     !Number.isFinite(value) ||
   41:     value < 0 ||
   42:     value > 1
   43:   ) {
   44:     throw new Error(
>  45:       "learningExperience.confidence must be between 0 and 1.",
   46:     );
   47:   }
   48: 
   49:   return value;
   50: }
   51: 
   52: function normalizeOutcome(
   53:   input: Partial<LearningOutcome> | undefined,
   54: ): LearningOutcome {
   55:   const status = input?.status ?? "unknown";
   56: 
   57:   if (
```

### line 52

```text
   40:     !Number.isFinite(value) ||
   41:     value < 0 ||
   42:     value > 1
   43:   ) {
   44:     throw new Error(
   45:       "learningExperience.confidence must be between 0 and 1.",
   46:     );
   47:   }
   48: 
   49:   return value;
   50: }
   51: 
>  52: function normalizeOutcome(
   53:   input: Partial<LearningOutcome> | undefined,
   54: ): LearningOutcome {
   55:   const status = input?.status ?? "unknown";
   56: 
   57:   if (
   58:     input?.score !== undefined &&
   59:     (
   60:       !Number.isFinite(input.score) ||
   61:       input.score < -1 ||
   62:       input.score > 1
   63:     )
   64:   ) {
```

### line 66

```text
   54: ): LearningOutcome {
   55:   const status = input?.status ?? "unknown";
   56: 
   57:   if (
   58:     input?.score !== undefined &&
   59:     (
   60:       !Number.isFinite(input.score) ||
   61:       input.score < -1 ||
   62:       input.score > 1
   63:     )
   64:   ) {
   65:     throw new Error(
>  66:       "learningExperience.outcome.score must be between -1 and 1.",
   67:     );
   68:   }
   69: 
   70:   return {
   71:     status,
   72:     score: input?.score,
   73:     detail: input?.detail?.trim() || undefined,
   74:   };
   75: }
   76: 
   77: function normalizeFeedback(
   78:   input: Partial<LearningFeedback> | undefined,
```

### line 77

```text
   65:     throw new Error(
   66:       "learningExperience.outcome.score must be between -1 and 1.",
   67:     );
   68:   }
   69: 
   70:   return {
   71:     status,
   72:     score: input?.score,
   73:     detail: input?.detail?.trim() || undefined,
   74:   };
   75: }
   76: 
>  77: function normalizeFeedback(
   78:   input: Partial<LearningFeedback> | undefined,
   79: ): LearningFeedback {
   80:   return {
   81:     kind: input?.kind ?? "none",
   82:     detail: input?.detail?.trim() || undefined,
   83:   };
   84: }
   85: 
   86: function normalizeEvidence(
   87:   input: Partial<LearningEvidence> | undefined,
   88: ): LearningEvidence {
   89:   return {
```

### line 86

```text
   74:   };
   75: }
   76: 
   77: function normalizeFeedback(
   78:   input: Partial<LearningFeedback> | undefined,
   79: ): LearningFeedback {
   80:   return {
   81:     kind: input?.kind ?? "none",
   82:     detail: input?.detail?.trim() || undefined,
   83:   };
   84: }
   85: 
>  86: function normalizeEvidence(
   87:   input: Partial<LearningEvidence> | undefined,
   88: ): LearningEvidence {
   89:   return {
   90:     eventIds: normalizeTextList(input?.eventIds),
   91:     worldStateKeys: normalizeTextList(
   92:       input?.worldStateKeys,
   93:     ),
   94:     cognitiveDecisionIds: normalizeTextList(
   95:       input?.cognitiveDecisionIds,
   96:     ),
   97:   };
   98: }
```

### line 87

```text
   75: }
   76: 
   77: function normalizeFeedback(
   78:   input: Partial<LearningFeedback> | undefined,
   79: ): LearningFeedback {
   80:   return {
   81:     kind: input?.kind ?? "none",
   82:     detail: input?.detail?.trim() || undefined,
   83:   };
   84: }
   85: 
   86: function normalizeEvidence(
>  87:   input: Partial<LearningEvidence> | undefined,
   88: ): LearningEvidence {
   89:   return {
   90:     eventIds: normalizeTextList(input?.eventIds),
   91:     worldStateKeys: normalizeTextList(
   92:       input?.worldStateKeys,
   93:     ),
   94:     cognitiveDecisionIds: normalizeTextList(
   95:       input?.cognitiveDecisionIds,
   96:     ),
   97:   };
   98: }
   99: 
```

### line 88

```text
   76: 
   77: function normalizeFeedback(
   78:   input: Partial<LearningFeedback> | undefined,
   79: ): LearningFeedback {
   80:   return {
   81:     kind: input?.kind ?? "none",
   82:     detail: input?.detail?.trim() || undefined,
   83:   };
   84: }
   85: 
   86: function normalizeEvidence(
   87:   input: Partial<LearningEvidence> | undefined,
>  88: ): LearningEvidence {
   89:   return {
   90:     eventIds: normalizeTextList(input?.eventIds),
   91:     worldStateKeys: normalizeTextList(
   92:       input?.worldStateKeys,
   93:     ),
   94:     cognitiveDecisionIds: normalizeTextList(
   95:       input?.cognitiveDecisionIds,
   96:     ),
   97:   };
   98: }
   99: 
  100: function requireJsonSafeContext(
```

### line 100

```text
   88: ): LearningEvidence {
   89:   return {
   90:     eventIds: normalizeTextList(input?.eventIds),
   91:     worldStateKeys: normalizeTextList(
   92:       input?.worldStateKeys,
   93:     ),
   94:     cognitiveDecisionIds: normalizeTextList(
   95:       input?.cognitiveDecisionIds,
   96:     ),
   97:   };
   98: }
   99: 
> 100: function requireJsonSafeContext(
  101:   context: Record<string, unknown>,
  102: ): Record<string, unknown> {
  103:   try {
  104:     const json = JSON.stringify(context);
  105: 
  106:     if (json === undefined) {
  107:       throw new Error(
  108:         "Context is not JSON serializable.",
  109:       );
  110:     }
  111: 
  112:     return JSON.parse(json) as Record<
```

### line 118

```text
  106:     if (json === undefined) {
  107:       throw new Error(
  108:         "Context is not JSON serializable.",
  109:       );
  110:     }
  111: 
  112:     return JSON.parse(json) as Record<
  113:       string,
  114:       unknown
  115:     >;
  116:   } catch {
  117:     throw new Error(
> 118:       "learningExperience.context must be JSON-safe.",
  119:     );
  120:   }
  121: }
  122: 
  123: export function createLearningExperience(
  124:   input: LearningExperienceInput,
  125:   now = new Date(),
  126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
```

### line 123

```text
  111: 
  112:     return JSON.parse(json) as Record<
  113:       string,
  114:       unknown
  115:     >;
  116:   } catch {
  117:     throw new Error(
  118:       "learningExperience.context must be JSON-safe.",
  119:     );
  120:   }
  121: }
  122: 
> 123: export function createLearningExperience(
  124:   input: LearningExperienceInput,
  125:   now = new Date(),
  126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
  131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
```

### line 124

```text
  112:     return JSON.parse(json) as Record<
  113:       string,
  114:       unknown
  115:     >;
  116:   } catch {
  117:     throw new Error(
  118:       "learningExperience.context must be JSON-safe.",
  119:     );
  120:   }
  121: }
  122: 
  123: export function createLearningExperience(
> 124:   input: LearningExperienceInput,
  125:   now = new Date(),
  126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
  131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
  136:     input.occurredAt,
```

### line 126

```text
  114:       unknown
  115:     >;
  116:   } catch {
  117:     throw new Error(
  118:       "learningExperience.context must be JSON-safe.",
  119:     );
  120:   }
  121: }
  122: 
  123: export function createLearningExperience(
  124:   input: LearningExperienceInput,
  125:   now = new Date(),
> 126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
  131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
  136:     input.occurredAt,
  137:     "learningExperience.occurredAt",
  138:   );
```

### line 131

```text
  119:     );
  120:   }
  121: }
  122: 
  123: export function createLearningExperience(
  124:   input: LearningExperienceInput,
  125:   now = new Date(),
  126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
> 131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
  136:     input.occurredAt,
  137:     "learningExperience.occurredAt",
  138:   );
  139: 
  140:   const recordedAt = requireTimestamp(
  141:     input.recordedAt ?? now.toISOString(),
  142:     "learningExperience.recordedAt",
  143:   );
```

### line 137

```text
  125:   now = new Date(),
  126: ): LearningExperience {
  127:   const id = input.id.trim();
  128: 
  129:   if (!id) {
  130:     throw new Error(
  131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
  136:     input.occurredAt,
> 137:     "learningExperience.occurredAt",
  138:   );
  139: 
  140:   const recordedAt = requireTimestamp(
  141:     input.recordedAt ?? now.toISOString(),
  142:     "learningExperience.recordedAt",
  143:   );
  144: 
  145:   if (
  146:     new Date(recordedAt).getTime() <
  147:     new Date(occurredAt).getTime()
  148:   ) {
  149:     throw new Error(
```

### line 142

```text
  130:     throw new Error(
  131:       "learningExperience.id must not be empty.",
  132:     );
  133:   }
  134: 
  135:   const occurredAt = requireTimestamp(
  136:     input.occurredAt,
  137:     "learningExperience.occurredAt",
  138:   );
  139: 
  140:   const recordedAt = requireTimestamp(
  141:     input.recordedAt ?? now.toISOString(),
> 142:     "learningExperience.recordedAt",
  143:   );
  144: 
  145:   if (
  146:     new Date(recordedAt).getTime() <
  147:     new Date(occurredAt).getTime()
  148:   ) {
  149:     throw new Error(
  150:       "learningExperience.recordedAt must not be earlier than occurredAt.",
  151:     );
  152:   }
  153: 
  154:   return {
```

### line 150

```text
  138:   );
  139: 
  140:   const recordedAt = requireTimestamp(
  141:     input.recordedAt ?? now.toISOString(),
  142:     "learningExperience.recordedAt",
  143:   );
  144: 
  145:   if (
  146:     new Date(recordedAt).getTime() <
  147:     new Date(occurredAt).getTime()
  148:   ) {
  149:     throw new Error(
> 150:       "learningExperience.recordedAt must not be earlier than occurredAt.",
  151:     );
  152:   }
  153: 
  154:   return {
  155:     id,
  156:     occurredAt,
  157:     recordedAt,
  158:     source: input.source,
  159:     subject: input.subject?.trim() || undefined,
  160:     confidence: requireConfidence(
  161:       input.confidence ?? 0.5,
  162:     ),
```

### line 165

```text
  153: 
  154:   return {
  155:     id,
  156:     occurredAt,
  157:     recordedAt,
  158:     source: input.source,
  159:     subject: input.subject?.trim() || undefined,
  160:     confidence: requireConfidence(
  161:       input.confidence ?? 0.5,
  162:     ),
  163:     outcome: normalizeOutcome(input.outcome),
  164:     feedback: normalizeFeedback(input.feedback),
> 165:     evidence: normalizeEvidence(input.evidence),
  166:     context: requireJsonSafeContext(
  167:       input.context ?? {},
  168:     ),
  169:   };
  170: }
```


## Learning promotion rules

File: `lib\chernobog\learning\lessonPromotion.ts`
Pattern: `assessLearningPromotion|promoteLearningPattern|revokeLearnedLesson|confidence|supportCount|contradictionCount`

### line 1

```text
>   1: import { assessLearningPromotion } from "./promotionGate";
    2: import type { LearningPatternCandidate } from "./patternTypes";
    3: import type { LearnedLesson, LearningPromotionContext, LearningPromotionPolicy } from "./promotionTypes";
    4: function approvedAt(c:LearningPromotionContext){if(!c.approvedAt)return undefined;const d=new Date(c.approvedAt);if(Number.isNaN(d.getTime()))throw new Error("learning promotion approvedAt must be a valid timestamp.");return d.toISOString();}
    5: export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
    6: export function revokeLearnedLesson(lesson:LearnedLesson,reason:string,now=new Date()):LearnedLesson{const r=reason.trim();if(!r)throw new Error("learning lesson revocation reason must not be empty.");return{...structuredClone(lesson),status:"revoked",revokedAt:now.toISOString(),revocationReason:r};}
```

### line 5

```text
    1: import { assessLearningPromotion } from "./promotionGate";
    2: import type { LearningPatternCandidate } from "./patternTypes";
    3: import type { LearnedLesson, LearningPromotionContext, LearningPromotionPolicy } from "./promotionTypes";
    4: function approvedAt(c:LearningPromotionContext){if(!c.approvedAt)return undefined;const d=new Date(c.approvedAt);if(Number.isNaN(d.getTime()))throw new Error("learning promotion approvedAt must be a valid timestamp.");return d.toISOString();}
>   5: export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
    6: export function revokeLearnedLesson(lesson:LearnedLesson,reason:string,now=new Date()):LearnedLesson{const r=reason.trim();if(!r)throw new Error("learning lesson revocation reason must not be empty.");return{...structuredClone(lesson),status:"revoked",revokedAt:now.toISOString(),revocationReason:r};}
```

### line 6

```text
    1: import { assessLearningPromotion } from "./promotionGate";
    2: import type { LearningPatternCandidate } from "./patternTypes";
    3: import type { LearnedLesson, LearningPromotionContext, LearningPromotionPolicy } from "./promotionTypes";
    4: function approvedAt(c:LearningPromotionContext){if(!c.approvedAt)return undefined;const d=new Date(c.approvedAt);if(Number.isNaN(d.getTime()))throw new Error("learning promotion approvedAt must be a valid timestamp.");return d.toISOString();}
    5: export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
>   6: export function revokeLearnedLesson(lesson:LearnedLesson,reason:string,now=new Date()):LearnedLesson{const r=reason.trim();if(!r)throw new Error("learning lesson revocation reason must not be empty.");return{...structuredClone(lesson),status:"revoked",revokedAt:now.toISOString(),revocationReason:r};}
```


## Learned lesson store

File: `lib\chernobog\learning\lessonStore.ts`
Pattern: `class ChernobogLearnedLessonStore|activeOnly|save|load|remove|clear`

### line 4

```text
    1: import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
    2: import { dirname } from "node:path";
    3: import type { LearnedLesson } from "./promotionTypes";
>   4: interface Snapshot{schemaVersion:1;savedAt:string;lessons:LearnedLesson[]}
    5: const clone=(x:LearnedLesson)=>structuredClone(x);
    6: function validate(v:unknown):LearnedLesson{if(!v||typeof v!=="object")throw new Error("invalid learned lesson record.");const x=v as Partial<LearnedLesson>;if(typeof x.id!=="string"||typeof x.key!=="string"||typeof x.statement!=="string"||(x.status!=="active"&&x.status!=="revoked"))throw new Error("invalid learned lesson shape.");return structuredClone(x as LearnedLesson);}
    7: export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
```

### line 7

```text
    1: import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
    2: import { dirname } from "node:path";
    3: import type { LearnedLesson } from "./promotionTypes";
    4: interface Snapshot{schemaVersion:1;savedAt:string;lessons:LearnedLesson[]}
    5: const clone=(x:LearnedLesson)=>structuredClone(x);
    6: function validate(v:unknown):LearnedLesson{if(!v||typeof v!=="object")throw new Error("invalid learned lesson record.");const x=v as Partial<LearnedLesson>;if(typeof x.id!=="string"||typeof x.key!=="string"||typeof x.statement!=="string"||(x.status!=="active"&&x.status!=="revoked"))throw new Error("invalid learned lesson shape.");return structuredClone(x as LearnedLesson);}
>   7: export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
```


## Interpretation targets

A. If no normal chat/model-facing lesson read exists:
- 11I is structurally complete but behaviorally dormant.
- Next patch should add a read-only governed Learning Context bridge.

B. If lessons are model-facing but unscoped:
- project/session scoping becomes the first correction.

C. If project scope exists but freshness precedence is absent:
- next correction should enforce World State > learned guidance for current facts.

D. If experience recording does not occur in normal runtime:
- first implementation target is an observation/experience bridge, not model-facing retrieval.

E. If learning code can directly execute tools, grant authority, or mutate governance:
- stop deep testing and harden authority boundaries before any conversational integration.

## Planned deep tests after this preflight

1. One-off correction does not promote automatically.
2. Repeated consistent correction accumulates support.
3. Contradictory corrections increase contradiction count and block/reject promotion.
4. Explicit approval is required for governed lesson promotion.
5. Approved lesson persists across restart.
6. Revoked lesson is excluded from active retrieval.
7. Project-scoped lesson cannot appear in another project.
8. Learned guidance can influence reasoning but cannot execute or authorize action.
9. Fresher World State overrides conflicting learned guidance.
10. Learned guidance is identified as learned/advisory, not current observed fact.
