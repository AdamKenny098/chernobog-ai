# Chernobog Phase 11I - Live Experience Ingress Preflight

Generated: 2026-08-31T21:40:22.3871423+01:00

Purpose: prove whether ordinary live conversation enters the 11H -> 11I experience loop.

Already established:
- governed learning promotion exists
- repeated support / contradiction logic exists
- lessons persist and restore
- active lessons are retrieved as advisory guidance through 11E
- current observations and runtime state override learned guidance
- learning has no direct tool / permission / governance-mutation authority

Open question:
- does normal /command chat actually create 11H cognitive cycles that are captured by the canonical 11I runtime?

## Normal command pipeline cognition hooks

Pattern: `cognit|ChernobogCognitive|getChernobogCognitive|cycle\(|runCycle|attention|initiative|learning|captureCognitiveCycle|getChernobogLearningRuntime`

### lib\chernobog\pipeline\runCommand.ts line 145

```text
  129: };
  130: 
  131: function shouldUseAuthoritativeAssessmentContext(
  132:   userMessage: string,
  133:   projectId?: string | null
  134: ): boolean {
  135:   if (!projectId) {
  136:     return false;
  137:   }
  138: 
  139:   const normalized = userMessage
  140:     .toLowerCase()
  141:     .replace(/\s+/g, " ")
  142:     .trim();
  143: 
  144:   const asksForAssessment =
> 145:     /\b(assess|assessment|evaluate|evaluation|status|state|health|healthy|attention|facts?|inferences?|predictions?|unknowns?|recommend(?:ed|ation)?s?|actions?)\b/i.test(
  146:       normalized
  147:     );
  148: 
  149:   const asksForCurrentAuthority =
  150:     /\b(current|active|project|workspace|runtime|world state|evidence|known|scope|scoped)\b/i.test(
  151:       normalized
  152:     );
  153: 
  154:   return (
  155:     asksForAssessment &&
  156:     asksForCurrentAuthority
  157:   );
  158: }
  159: 
  160: export async function runCommandPipeline(
  161:   userMessage: string,
```


## All canonical learning runtime singleton consumers

Pattern: `getChernobogLearningRuntime\(`

- `lib\chernobog\learning\runtimeSingleton.ts:14` - export function getChernobogLearningRuntime():
- `app\api\learning\route.ts:14` - await getChernobogLearningRuntime();

## All captureCognitiveCycle call sites

Pattern: `captureCognitiveCycle\(`

- `lib\chernobog\learning\learningRuntime.ts:106` - captureCognitiveCycle(
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:135` - learning.captureCognitiveCycle(
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:378` - emptyRuntime.captureCognitiveCycle(

## All learningExperienceFromCognitiveCycle call sites

Pattern: `learningExperienceFromCognitiveCycle\(`

- `lib\chernobog\learning\fromCognitiveCycle.ts:11` - export function learningExperienceFromCognitiveCycle(
- `lib\chernobog\learning\learningRuntime.ts:110` - learningExperienceFromCognitiveCycle(
- `scripts\verify-chernobog-phase11-11i-a-learning-event-model.ts:263` - learningExperienceFromCognitiveCycle(

## Cognitive runtime singleton and production consumers

Pattern: `getChernobogCognitiveRuntime|ChernobogCognitiveRuntime|cognitiveRuntime|runCycle|runCognitive|evaluateCycle|captureCycle`

- `lib\chernobog\cognition\cognitiveRuntime.ts:32` - ChernobogCognitiveRuntimeOptions,
- `lib\chernobog\cognition\cognitiveRuntime.ts:33` - CognitiveRuntimeCycle,
- `lib\chernobog\cognition\cognitiveRuntime.ts:34` - CognitiveRuntimeSnapshot,
- `lib\chernobog\cognition\cognitiveRuntime.ts:50` - export class ChernobogCognitiveRuntime {
- `lib\chernobog\cognition\cognitiveRuntime.ts:70` - ChernobogCognitiveRuntimeOptions;
- `lib\chernobog\cognition\cognitiveRuntime.ts:79` - CognitiveRuntimeCycle;
- `lib\chernobog\cognition\cognitiveRuntime.ts:83` - ChernobogCognitiveRuntimeOptions,
- `lib\chernobog\cognition\cognitiveRuntime.ts:107` - Promise<CognitiveRuntimeCycle> {
- `lib\chernobog\cognition\cognitiveRuntime.ts:201` - CognitiveRuntimeCycle = {
- `lib\chernobog\cognition\cognitiveRuntime.ts:222` - CognitiveRuntimeSnapshot {
- `lib\chernobog\cognition\index.ts:25` - export * from "./cognitiveRuntime";
- `lib\chernobog\cognition\runtimeSingleton.ts:5` - ChernobogCognitiveRuntime,
- `lib\chernobog\cognition\runtimeSingleton.ts:6` - } from "./cognitiveRuntime";
- `lib\chernobog\cognition\runtimeSingleton.ts:8` - type CognitiveRuntimeGlobals =
- `lib\chernobog\cognition\runtimeSingleton.ts:10` - __chernobogCognitiveRuntimePromise?:
- `lib\chernobog\cognition\runtimeSingleton.ts:11` - Promise<ChernobogCognitiveRuntime>;
- `lib\chernobog\cognition\runtimeSingleton.ts:15` - globalThis as CognitiveRuntimeGlobals;
- `lib\chernobog\cognition\runtimeSingleton.ts:17` - export function getChernobogCognitiveRuntime():
- `lib\chernobog\cognition\runtimeSingleton.ts:18` - Promise<ChernobogCognitiveRuntime> {
- `lib\chernobog\cognition\runtimeSingleton.ts:21` - .__chernobogCognitiveRuntimePromise
- `lib\chernobog\cognition\runtimeSingleton.ts:27` - new ChernobogCognitiveRuntime({
- `lib\chernobog\cognition\runtimeSingleton.ts:38` - .__chernobogCognitiveRuntimePromise;
- `lib\chernobog\cognition\runtimeSingleton.ts:43` - .__chernobogCognitiveRuntimePromise =
- `lib\chernobog\cognition\runtimeSingleton.ts:48` - .__chernobogCognitiveRuntimePromise;
- `lib\chernobog\cognition\runtimeTypes.ts:46` - export interface ChernobogCognitiveRuntimeOptions {
- `lib\chernobog\cognition\runtimeTypes.ts:60` - export interface CognitiveRuntimeCycle {
- `lib\chernobog\cognition\runtimeTypes.ts:69` - export interface CognitiveRuntimeSnapshot {
- `lib\chernobog\cognition\runtimeTypes.ts:88` - CognitiveRuntimeCycle;
- `lib\chernobog\learning\fromCognitiveCycle.ts:2` - CognitiveRuntimeCycle,
- `lib\chernobog\learning\fromCognitiveCycle.ts:12` - cycle: CognitiveRuntimeCycle,
- `lib\chernobog\learning\learningRuntime.ts:7` - CognitiveRuntimeCycle,
- `lib\chernobog\learning\learningRuntime.ts:107` - cycle: CognitiveRuntimeCycle,
- `lib\chernobog\learning\runtimeTypes.ts:3` - CognitiveRuntimeCycle,
- `lib\chernobog\learning\runtimeTypes.ts:50` - cycle: CognitiveRuntimeCycle;
- `app\api\cognition\route.ts:6` - getChernobogCognitiveRuntime,
- `app\api\cognition\route.ts:14` - await getChernobogCognitiveRuntime();

## Cognition API live route

Pattern: `GET|POST|getChernobog|cycle|learning|adapt|attention|worldState`

### app\api\cognition\route.ts line 6

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
>   6:   getChernobogCognitiveRuntime,
    7: } from "@/lib/chernobog/cognition";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const cognition =
   14:       await getChernobogCognitiveRuntime();
   15: 
   16:     const cycle =
   17:       await cognition.evaluate();
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
```

### app\api\cognition\route.ts line 11

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogCognitiveRuntime,
    7: } from "@/lib/chernobog/cognition";
    8: 
    9: export const runtime = "nodejs";
   10: 
>  11: export async function GET() {
   12:   try {
   13:     const cognition =
   14:       await getChernobogCognitiveRuntime();
   15: 
   16:     const cycle =
   17:       await cognition.evaluate();
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
   28:       },
   29:     });
```

### app\api\cognition\route.ts line 14

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogCognitiveRuntime,
    7: } from "@/lib/chernobog/cognition";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const cognition =
>  14:       await getChernobogCognitiveRuntime();
   15: 
   16:     const cycle =
   17:       await cognition.evaluate();
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
   28:       },
   29:     });
   30:   } catch (error) {
   31:     return NextResponse.json(
   32:       {
```

### app\api\cognition\route.ts line 16

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogCognitiveRuntime,
    7: } from "@/lib/chernobog/cognition";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const cognition =
   14:       await getChernobogCognitiveRuntime();
   15: 
>  16:     const cycle =
   17:       await cognition.evaluate();
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
   28:       },
   29:     });
   30:   } catch (error) {
   31:     return NextResponse.json(
   32:       {
   33:         ok: false,
   34:         error:
```

### app\api\cognition\route.ts line 21

```text
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogCognitiveRuntime,
    7: } from "@/lib/chernobog/cognition";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const cognition =
   14:       await getChernobogCognitiveRuntime();
   15: 
   16:     const cycle =
   17:       await cognition.evaluate();
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
>  21:       cycle,
   22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
   28:       },
   29:     });
   30:   } catch (error) {
   31:     return NextResponse.json(
   32:       {
   33:         ok: false,
   34:         error:
   35:           "cognitive_runtime_failed",
   36:         message:
   37:           error instanceof Error
   38:             ? error.message
   39:             : String(error),
```


## Learning API live route

Pattern: `GET|POST|getChernobogLearningRuntime|snapshot|promote|feedback|outcome|capture|revoke`

### app\api\learning\route.ts line 6

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
>   6:   getChernobogLearningRuntime,
    7: } from "@/lib/chernobog/learning";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const learning =
   14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
   19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
   24:         rewritesCode: false,
```

### app\api\learning\route.ts line 11

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogLearningRuntime,
    7: } from "@/lib/chernobog/learning";
    8: 
    9: export const runtime = "nodejs";
   10: 
>  11: export async function GET() {
   12:   try {
   13:     const learning =
   14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
   19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
   24:         rewritesCode: false,
   25:         grantsExecutionPermission: false,
   26:       },
   27:     });
   28:   } catch (error) {
   29:     return NextResponse.json(
```

### app\api\learning\route.ts line 14

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogLearningRuntime,
    7: } from "@/lib/chernobog/learning";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const learning =
>  14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
   19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
   24:         rewritesCode: false,
   25:         grantsExecutionPermission: false,
   26:       },
   27:     });
   28:   } catch (error) {
   29:     return NextResponse.json(
   30:       {
   31:         ok: false,
   32:         error:
```

### app\api\learning\route.ts line 18

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogLearningRuntime,
    7: } from "@/lib/chernobog/learning";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const learning =
   14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
>  18:       snapshot:
   19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
   24:         rewritesCode: false,
   25:         grantsExecutionPermission: false,
   26:       },
   27:     });
   28:   } catch (error) {
   29:     return NextResponse.json(
   30:       {
   31:         ok: false,
   32:         error:
   33:           "learning_runtime_failed",
   34:         message:
   35:           error instanceof Error
   36:             ? error.message
```

### app\api\learning\route.ts line 19

```text
    1: import {
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogLearningRuntime,
    7: } from "@/lib/chernobog/learning";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
   13:     const learning =
   14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
>  19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
   24:         rewritesCode: false,
   25:         grantsExecutionPermission: false,
   26:       },
   27:     });
   28:   } catch (error) {
   29:     return NextResponse.json(
   30:       {
   31:         ok: false,
   32:         error:
   33:           "learning_runtime_failed",
   34:         message:
   35:           error instanceof Error
   36:             ? error.message
   37:             : String(error),
```


## Explicit feedback/correction ingestion paths

Pattern: `recordFeedback|feedbackObservation|createLearningFeedbackObservation|correction|explicit-correction|feedbackFor|LearningRuntimeFeedbackInput`

- `lib\chernobog\learning\adaptationEngine.ts:66` - lesson.kind === "correction-pattern" ||
- `lib\chernobog\learning\eligibility.ts:28` - "Explicit user feedback or correction is a strong learning signal.",
- `lib\chernobog\learning\evaluationStore.ts:2` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluationStore.ts:20` - LearningFeedbackObservation
- `lib\chernobog\learning\evaluationStore.ts:35` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluationStore.ts:63` - feedbackFor(
- `lib\chernobog\learning\evaluationStore.ts:65` - ): LearningFeedbackObservation[] {
- `lib\chernobog\learning\evaluationTypes.ts:19` - export interface LearningFeedbackObservation {
- `lib\chernobog\learning\evaluationTypes.ts:29` - | "explicit-correction"
- `lib\chernobog\learning\evaluationTypes.ts:48` - feedbackObservations: LearningFeedbackObservation[];
- `lib\chernobog\learning\evaluator.ts:4` - LearningFeedbackObservation,
- `lib\chernobog\learning\evaluator.ts:27` - readonly LearningFeedbackObservation[],
- `lib\chernobog\learning\evaluator.ts:39` - case "correction":
- `lib\chernobog\learning\evaluator.ts:236` - feedbackObservations:
- `lib\chernobog\learning\evaluator.ts:237` - readonly LearningFeedbackObservation[],
- `lib\chernobog\learning\evaluator.ts:250` - feedbackObservations
- `lib\chernobog\learning\evaluator.ts:269` - "correction"
- `lib\chernobog\learning\evaluator.ts:273` - "explicit-correction",
- `lib\chernobog\learning\evaluator.ts:274` - "Explicit correction takes precedence as the strongest feedback signal.",
- `lib\chernobog\learning\evaluator.ts:373` - feedbackObservations:
- `lib\chernobog\learning\feedbackObservation.ts:2` - LearningFeedbackObservation,
- `lib\chernobog\learning\feedbackObservation.ts:35` - export function createLearningFeedbackObservation(
- `lib\chernobog\learning\feedbackObservation.ts:40` - kind: LearningFeedbackObservation["kind"];
- `lib\chernobog\learning\feedbackObservation.ts:44` - ): LearningFeedbackObservation {
- `lib\chernobog\learning\index.ts:8` - export * from "./feedbackObservation";
- `lib\chernobog\learning\learningRuntime.ts:41` - LearningFeedbackObservation,
- `lib\chernobog\learning\learningRuntime.ts:135` - LearningFeedbackObservation,
- `lib\chernobog\learning\learningRuntime.ts:161` - this.evaluations.feedbackFor(
- `lib\chernobog\learning\lessonGuidance.ts:14` - lesson.kind === "correction-pattern"
- `lib\chernobog\learning\patternExtractor.ts:29` - if (feedback.kind === "correction" && feedback.detail) {
- `lib\chernobog\learning\patternExtractor.ts:31` - key: `correction:${subjectKey}:${normalizeKey(feedback.detail)}`,
- `lib\chernobog\learning\patternExtractor.ts:32` - kind: "correction-pattern",
- `lib\chernobog\learning\patternTypes.ts:7` - | "correction-pattern";
- `lib\chernobog\learning\promotionGate.ts:5` - function needsApproval(p:LearningPatternCandidate,policy:LearningPromotionPolicy){return (p.kind==="preference"&&policy.requireExplicitApprovalForPreferences)||(p.kind==="correction-pattern"&&policy.requireExplicitApprovalForCorrections);}
- `lib\chernobog\learning\promotionPolicy.ts:2` - export const DEFAULT_LEARNING_PROMOTION_POLICY:LearningPromotionPolicy={minimumSupport:3,minimumConfidence:0.75,maximumContradictionRatio:0.25,requireExplicitApprovalForPreferences:true,requireExplicitApprovalForCorrections:true};
- `lib\chernobog\learning\promotionTypes.ts:5` - export interface LearningPromotionPolicy { minimumSupport:number; minimumConfidence:number; maximumContradictionRatio:number; requireExplicitApprovalForPreferences:boolean; requireExplicitApprovalForCorrections:boolean; }
- `lib\chernobog\learning\runtimeTypes.ts:7` - LearningFeedbackObservation,
- `lib\chernobog\learning\runtimeTypes.ts:58` - export interface LearningRuntimeFeedbackInput {
- `lib\chernobog\learning\runtimeTypes.ts:59` - observation: LearningFeedbackObservation;
- `lib\chernobog\learning\types.ts:17` - | "correction";

## Outcome ingestion paths

Pattern: `recordOutcome|outcomeObservation|createLearningOutcomeObservation|outcomesFor|LearningRuntimeOutcomeInput`

- `lib\chernobog\learning\evaluationStore.ts:3` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluationStore.ts:14` - LearningOutcomeObservation
- `lib\chernobog\learning\evaluationStore.ts:25` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluationStore.ts:43` - outcomesFor(
- `lib\chernobog\learning\evaluationStore.ts:45` - ): LearningOutcomeObservation[] {
- `lib\chernobog\learning\evaluationTypes.ts:7` - export interface LearningOutcomeObservation {
- `lib\chernobog\learning\evaluationTypes.ts:47` - outcomeObservations: LearningOutcomeObservation[];
- `lib\chernobog\learning\evaluator.ts:5` - LearningOutcomeObservation,
- `lib\chernobog\learning\evaluator.ts:101` - readonly LearningOutcomeObservation[],
- `lib\chernobog\learning\evaluator.ts:234` - outcomeObservations:
- `lib\chernobog\learning\evaluator.ts:235` - readonly LearningOutcomeObservation[],
- `lib\chernobog\learning\evaluator.ts:241` - outcomeObservations
- `lib\chernobog\learning\evaluator.ts:366` - outcomeObservations:
- `lib\chernobog\learning\index.ts:7` - export * from "./outcomeObservation";
- `lib\chernobog\learning\learningRuntime.ts:42` - LearningOutcomeObservation,
- `lib\chernobog\learning\learningRuntime.ts:126` - LearningOutcomeObservation,
- `lib\chernobog\learning\learningRuntime.ts:158` - this.evaluations.outcomesFor(
- `lib\chernobog\learning\outcomeObservation.ts:2` - LearningOutcomeObservation,
- `lib\chernobog\learning\outcomeObservation.ts:49` - export function createLearningOutcomeObservation(
- `lib\chernobog\learning\outcomeObservation.ts:54` - status: LearningOutcomeObservation["status"];
- `lib\chernobog\learning\outcomeObservation.ts:61` - ): LearningOutcomeObservation {
- `lib\chernobog\learning\outcomeObservation.ts:89` - "learningOutcomeObservation.observedAt",
- `lib\chernobog\learning\outcomeObservation.ts:95` - "learningOutcomeObservation.confidence",
- `lib\chernobog\learning\runtimeTypes.ts:8` - LearningOutcomeObservation,
- `lib\chernobog\learning\runtimeTypes.ts:54` - export interface LearningRuntimeOutcomeInput {
- `lib\chernobog\learning\runtimeTypes.ts:55` - observation: LearningOutcomeObservation;

## Conversation correction detection outside 11I

Pattern: `\bcorrection\b|user feedback|feedback|No,|actually|instead|prefer|preference`

- `lib\chernobog\pipeline\toolExecution.ts:96` - ? `\nYou can now say things like "read the first one", "open the first one", or "search Documents instead".`
- `lib\chernobog\pipeline\worldModelContext.ts:881` - "- CONSEQUENCE CONTRACT: prefer the precomputed World Model impact assessments below. Do not replace a non-empty impact assessment with 'no dependency path'.",
- `lib\chernobog\pipeline\worldModelContext.ts:885` - "- IMPACT CONTRACT: when an impact assessment for model:ollama is non-empty, report those downstream dependents instead of saying no dependency path exists.",
- `lib\chernobog\memory-architecture\contextBuilder.ts:72` - "Use long-term memory for durable user facts and preferences.",
- `lib\chernobog\session\followups.ts:214` - /\b(?:search|look in|search in|check)\s+(documents|document|desktop|downloads|download)(?:\s+instead|\s+only)?\b/i

## Experience/pattern durability

Pattern: `experiencePath|patterns\.json|experience.*save|experience.*load|pattern.*save|pattern.*load|persistExperience|persistPattern|new ChernobogLearningExperienceStore|new ChernobogLearningPatternStore`

- `lib\chernobog\learning\learningRuntime.ts:55` - new ChernobogLearningExperienceStore();
- `lib\chernobog\learning\learningRuntime.ts:61` - new ChernobogLearningPatternStore();

## Current durable lesson snapshot

- file exists: no
- no durable promoted lessons currently stored

## Interpretation

A. captureCognitiveCycle only appears in tests or app/api/cognition:
- normal chat is not feeding the learning loop
- next implementation should bridge normal live cognition into canonical 11I capture

B. normal chat runs cognition but never calls captureCognitiveCycle:
- add a narrow post-cycle capture hook

C. capture exists, but feedback/corrections are not linked to experience IDs:
- add explicit correction/outcome association rather than creating parallel memory

D. experiences/patterns are memory-only:
- restart persistence applies only to promoted lessons; deep tests must account for that
- do not assume pre-promotion evidence survives restart unless source code proves it

E. normal chat already feeds 11I correctly:
- next test should become a controlled three-support correction experiment with no promotion until explicit approval
