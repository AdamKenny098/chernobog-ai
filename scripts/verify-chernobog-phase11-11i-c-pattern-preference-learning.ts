import assert from "node:assert/strict";
import {
  ChernobogLearningPatternStore,
  createLearningExperience,
  createLearningFeedbackObservation,
  createLearningOutcomeObservation,
  evaluateLearningExperience,
  extractLearningPatterns,
} from "../lib/chernobog/learning";

function pass(message: string): void { console.log(`PASS ${message}`); }
function evaluated(id: string, subject: string, options: {
  outcome?: "success" | "failure";
  feedback?: "explicit-positive" | "explicit-negative" | "correction";
  detail?: string;
  confidence?: number;
  evaluatedAt?: string;
}) {
  const confidence = options.confidence ?? 0.95;
  const experience = createLearningExperience({
    id,
    occurredAt: "2026-08-25T20:20:00.000Z",
    source: "cognitive-cycle",
    subject,
    confidence,
  }, new Date("2026-08-25T20:20:01.000Z"));
  const outcomes = options.outcome ? [createLearningOutcomeObservation({
    id: `${id}:outcome`, experienceId: id, observedAt: "2026-08-25T20:20:30.000Z",
    status: options.outcome, confidence,
  })] : [];
  const feedback = options.feedback ? [createLearningFeedbackObservation({
    id: `${id}:feedback`, experienceId: id, observedAt: "2026-08-25T20:20:40.000Z",
    kind: options.feedback, confidence, detail: options.detail,
  })] : [];
  return evaluateLearningExperience(experience, outcomes, feedback,
    new Date(options.evaluatedAt ?? "2026-08-25T20:21:00.000Z"));
}

console.log("Chernobog Phase 11I-C - Pattern & Preference Learning");
console.log("======================================================");

const successA = evaluated("exp:diagnose:1", "runtime.diagnose-first", {
  outcome: "success", feedback: "explicit-positive", evaluatedAt: "2026-08-25T20:21:00.000Z",
});
const successB = evaluated("exp:diagnose:2", "runtime.diagnose-first", {
  outcome: "success", feedback: "explicit-positive", evaluatedAt: "2026-08-25T20:22:00.000Z",
});
const repeated = extractLearningPatterns([successA, successB]);
assert.ok(repeated.candidates.some((c)=>c.kind==="success-pattern" && c.supportCount===2));
assert.ok(repeated.candidates.some((c)=>c.kind==="preference" && c.supportCount===2));
pass("repeated successful and positively-rated experiences create pattern candidates");

const single = extractLearningPatterns([successA]);
assert.equal(single.candidates.length, 0);
assert.ok(single.rejectedKeys.length > 0);
pass("single experiences are insufficient for pattern promotion candidates");

const contradiction = evaluated("exp:diagnose:3", "runtime.diagnose-first", {
  outcome: "failure", feedback: "explicit-negative", evaluatedAt: "2026-08-25T20:23:00.000Z",
});
const conflicted = extractLearningPatterns([successA, successB, contradiction], {
  minimumSupport: 2, maximumContradictionRatio: 0.2, confidenceFloor: 0.6,
});
assert.equal(conflicted.candidates.some((c)=>c.key==="success:runtime.diagnose-first"), false);
pass("excessive contradictory evidence blocks a candidate instead of forcing a pattern");

const correctionA = evaluated("exp:repair-order:1", "runtime.repair-sequence", {
  feedback: "correction", detail: "Diagnose first, explain second, repair third.", evaluatedAt: "2026-08-25T20:24:00.000Z",
});
const correctionB = evaluated("exp:repair-order:2", "runtime.repair-sequence", {
  feedback: "correction", detail: "Diagnose first, explain second, repair third.", evaluatedAt: "2026-08-25T20:25:00.000Z",
});
const corrections = extractLearningPatterns([correctionA, correctionB]);
const correctionPattern = corrections.candidates.find((c)=>c.kind==="correction-pattern");
assert.ok(correctionPattern);
assert.equal(correctionPattern?.statement, "Diagnose first, explain second, repair third.");
assert.equal(correctionPattern?.supportCount, 2);
pass("repeated explicit corrections become high-value correction pattern candidates");

const weakA = evaluated("exp:weak:1", "desktop.focus", { outcome: "success", confidence: 0.45, evaluatedAt: "2026-08-25T20:26:00.000Z" });
const weakB = evaluated("exp:weak:2", "desktop.focus", { outcome: "success", confidence: 0.45, evaluatedAt: "2026-08-25T20:27:00.000Z" });
const weak = extractLearningPatterns([weakA, weakB], {
  minimumSupport: 2, maximumContradictionRatio: 0.34, confidenceFloor: 0.6,
});
assert.equal(weak.candidates.length, 0);
pass("repetition alone cannot overcome a low-confidence evidence floor");

const deterministic = extractLearningPatterns([successB, successA]);
assert.deepEqual(deterministic.candidates.map((c)=>c.key), repeated.candidates.map((c)=>c.key));
pass("pattern extraction is deterministic regardless of evaluation input order");

const candidate = repeated.candidates[0];
assert.ok(candidate);
if (!candidate) throw new Error("Expected pattern candidate.");
assert.equal(candidate.firstObservedAt <= candidate.lastObservedAt, true);
assert.ok(candidate.evidence.experienceIds.length >= 2);
pass("pattern candidates retain temporal range and source experience evidence");

const store = new ChernobogLearningPatternStore();
for (const item of repeated.candidates) store.upsert(item);
assert.equal(store.size, repeated.candidates.length);
pass("pattern store maintains deduplicated candidates by stable pattern key");
const stored = store.get(candidate.key);
assert.ok(stored);
if (!stored) throw new Error("Expected stored pattern.");
stored.statement = "mutated outside store";
assert.notEqual(store.get(candidate.key)?.statement, "mutated outside store");
pass("pattern store returns defensive clones");

const keys = Object.keys(candidate);
assert.equal(keys.includes("promoted"), false);
assert.equal(keys.includes("memoryWrite"), false);
assert.equal(keys.includes("behaviorOverride"), false);
pass("11I-C produces candidate patterns without durable promotion or behavior modification");
console.log("======================================================");
console.log("PASS Phase 11I-C Pattern & Preference Learning acceptance");
