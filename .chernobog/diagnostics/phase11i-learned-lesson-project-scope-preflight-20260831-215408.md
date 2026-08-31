# Chernobog Phase 11I - Learned Lesson Project Scope Preflight

Generated: 2026-08-31T21:54:08.3570418+01:00

Goal: prove whether 11I learned lessons are safely scoped before normal /command conversation is connected to the live 11H -> 11I experience loop.

Reason for this gate:
- live ingress is currently absent
- lessons are already retrievable through unified memory
- prior diagnostics suggest LearnedLesson has no explicit projectId field
- unified memory project filtering only rejects a record when record.projectId exists and mismatches
- wiring continuous learning before proving scope could reintroduce cross-project contamination

This package is read-only.

## Learned-lessons unified-memory adapter

File: `lib\chernobog\memory-architecture\readAdapters.ts`

```text
   1: import path from "node:path";
   2: 
   3: import {
   4:   getMemories,
   5:   getRecentMessages,
   6: } from "../memory";
   7: import {
   8:   getSessionContext,
   9:   resolveSessionId,
  10: } from "../session/store";
  11: import {
  12:   ChernobogLearnedLessonStore,
  13: } from "../learning/lessonStore";
  14: import {
  15:   createVaultMemoryStore,
  16: } from "../../modules/vault-brain/memoryStore";
  17: import {
  18:   createProjectMemoryProfileStore,
  19: } from "../../modules/vault-brain/projectProfileStore";
  20: import {
  21:   getV6PersonalIntelligenceSystemStatus,
  22: } from "../../modules/vault-brain/personalIntelligenceOperatingLoop";
  23: import type {
  24:   UnifiedMemoryReaderMap,
  25: } from "./readTypes";
  26: import type {
  27:   UnifiedMemoryRecord,
  28: } from "./unifiedTypes";
  29: 
  30: const DEFAULT_LESSON_PATH = path.join(
  31:   process.cwd(),
  32:   ".chernobog",
  33:   "learning",
  34:   "lessons.json",
  35: );
  36: 
  37: function cloneRecord(
  38:   record: UnifiedMemoryRecord,
  39: ): UnifiedMemoryRecord {
  40:   return structuredClone(record);
  41: }
  42: 
  43: async function readLessons():
  44:   Promise<UnifiedMemoryRecord[]> {
  45:   const store =
  46:     new ChernobogLearnedLessonStore();
  47: 
  48:   try {
  49:     await store.load(
  50:       DEFAULT_LESSON_PATH,
  51:     );
  52:   } catch (error) {
  53:     if (
  54:       (
  55:         error as NodeJS.ErrnoException
  56:       ).code === "ENOENT"
  57:     ) {
  58:       return [];
  59:     }
  60: 
  61:     throw error;
  62:   }
  63: 
  64:   return store
  65:     .list({
  66:       activeOnly: true,
  67:     })
  68:     .map((lesson) =>
  69:       cloneRecord({
  70:         id: `lesson:${lesson.id}`,
  71:         source:
  72:           "learned-lessons",
  73:         layer:
  74:           "learned",
  75:         scope:
  76:           "system",
  77:         key:
  78:           lesson.key,
  79:         content:
  80:           lesson.statement,
  81:         createdAt:
  82:           lesson.promotedAt,
  83:         confidence:
  84:           lesson.confidence,
  85:         metadata: {
  86:           kind:
  87:             lesson.kind,
  88:           supportCount:
  89:             lesson.supportCount,
  90:           contradictionCount:
  91:             lesson.contradictionCount,
  92:           governance:
  93:             lesson.governance,
  94:         },
  95:       }),
  96:     );
  97: }
  98: 
  99: export function createDefaultUnifiedMemoryReaders():
 100:   UnifiedMemoryReaderMap {
 101:   return {
 102:     "conversation-history":
 103:       (query) => {
 104:         const limit = Math.max(
 105:           1,
 106:           Math.min(
 107:             100,
 108:             query.limit ?? 20,
 109:           ),
 110:         );
 111: 
 112:         if (!query.sessionId) {
 113:           return [];
 114:         }
 115: 
 116:         return getRecentMessages(
 117:           query.sessionId,
 118:           limit,
 119:         ).map(
 120:           (message, index) =>
 121:             cloneRecord({
 122:               id:
 123:                 `conversation:${index}:${message.role}`,
 124:               source:
 125:                 "conversation-history",
 126:               layer:
 127:                 "short_term",
 128:               scope:
 129:                 "conversation",
 130:               content:
... truncated by diagnostic after 130 lines ...
```

## Learning experience types

File: `lib\chernobog\learning\types.ts`

```text
   1: export type LearningExperienceSource =
   2:   | "cognitive-cycle"
   3:   | "user-feedback"
   4:   | "action-outcome"
   5:   | "system-observation";
   6: 
   7: export type LearningOutcomeStatus =
   8:   | "success"
   9:   | "failure"
  10:   | "mixed"
  11:   | "unknown";
  12: 
  13: export type LearningFeedbackKind =
  14:   | "none"
  15:   | "explicit-positive"
  16:   | "explicit-negative"
  17:   | "correction";
  18: 
  19: export interface LearningOutcome {
  20:   status: LearningOutcomeStatus;
  21:   score?: number;
  22:   detail?: string;
  23: }
  24: 
  25: export interface LearningFeedback {
  26:   kind: LearningFeedbackKind;
  27:   detail?: string;
  28: }
  29: 
  30: export interface LearningEvidence {
  31:   eventIds: string[];
  32:   worldStateKeys: string[];
  33:   cognitiveDecisionIds: string[];
  34: }
  35: 
  36: export interface LearningExperience {
  37:   id: string;
  38:   occurredAt: string;
  39:   recordedAt: string;
  40:   source: LearningExperienceSource;
  41:   subject?: string;
  42:   confidence: number;
  43:   outcome: LearningOutcome;
  44:   feedback: LearningFeedback;
  45:   evidence: LearningEvidence;
  46:   context: Record<string, unknown>;
  47: }
  48: 
  49: export interface LearningExperienceInput {
  50:   id: string;
  51:   occurredAt: string;
  52:   recordedAt?: string;
  53:   source: LearningExperienceSource;
  54:   subject?: string;
  55:   confidence?: number;
  56:   outcome?: Partial<LearningOutcome>;
  57:   feedback?: Partial<LearningFeedback>;
  58:   evidence?: Partial<LearningEvidence>;
  59:   context?: Record<string, unknown>;
  60: }
  61: 
  62: export type LearningEligibilityReasonCode =
  63:   | "explicit-feedback"
  64:   | "known-outcome"
  65:   | "grounded-evidence"
  66:   | "adequate-confidence"
  67:   | "low-confidence"
  68:   | "insufficient-signal";
  69: 
  70: export interface LearningEligibilityReason {
  71:   code: LearningEligibilityReasonCode;
  72:   weight: number;
  73:   detail: string;
  74: }
  75: 
  76: export interface LearningEligibilityAssessment {
  77:   experienceId: string;
  78:   eligible: boolean;
  79:   score: number;
  80:   reasons: LearningEligibilityReason[];
  81: }
```

## Learning pattern types and evidence

File: `lib\chernobog\learning\patternTypes.ts`

```text
   1: import type { EvaluatedLearningExperience } from "./evaluationTypes";
   2: 
   3: export type LearningPatternKind =
   4:   | "preference"
   5:   | "success-pattern"
   6:   | "failure-pattern"
   7:   | "correction-pattern";
   8: 
   9: export interface LearningPatternEvidence {
  10:   experienceIds: string[];
  11:   subjects: string[];
  12:   feedbackKinds: string[];
  13:   outcomeStatuses: string[];
  14: }
  15: 
  16: export interface LearningPatternCandidate {
  17:   id: string;
  18:   key: string;
  19:   kind: LearningPatternKind;
  20:   statement: string;
  21:   supportCount: number;
  22:   contradictionCount: number;
  23:   confidence: number;
  24:   firstObservedAt: string;
  25:   lastObservedAt: string;
  26:   evidence: LearningPatternEvidence;
  27:   sourceEvaluations: EvaluatedLearningExperience[];
  28: }
  29: 
  30: export interface LearningPatternPolicy {
  31:   minimumSupport: number;
  32:   maximumContradictionRatio: number;
  33:   confidenceFloor: number;
  34: }
  35: 
  36: export interface LearningPatternExtractionResult {
  37:   candidates: LearningPatternCandidate[];
  38:   rejectedKeys: string[];
  39: }
```

## Promotion and LearnedLesson types

File: `lib\chernobog\learning\promotionTypes.ts`

```text
   1: import type { LearningPatternCandidate } from "./patternTypes";
   2: export type LearningPromotionDecision = "promote" | "hold" | "reject";
   3: export type LearningLessonStatus = "active" | "revoked";
   4: export type LearningGovernanceAuthority = "system-policy" | "user-approved" | "operator-approved";
   5: export interface LearningPromotionPolicy { minimumSupport:number; minimumConfidence:number; maximumContradictionRatio:number; requireExplicitApprovalForPreferences:boolean; requireExplicitApprovalForCorrections:boolean; }
   6: export interface LearningPromotionContext { authority:LearningGovernanceAuthority; approved:boolean; approvedBy?:string; approvedAt?:string; }
   7: export type LearningPromotionReasonCode = "support-sufficient"|"support-insufficient"|"confidence-sufficient"|"confidence-insufficient"|"contradiction-acceptable"|"contradiction-excessive"|"approval-required"|"approval-present"|"eligible-for-promotion";
   8: export interface LearningPromotionReason { code:LearningPromotionReasonCode; detail:string; }
   9: export interface LearningPromotionAssessment { patternKey:string; decision:LearningPromotionDecision; reasons:LearningPromotionReason[]; }
  10: export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
```

## Cognitive-cycle to learning-experience conversion

File: `lib\chernobog\learning\fromCognitiveCycle.ts`

```text
   1: import type {
   2:   CognitiveRuntimeCycle,
   3: } from "../cognition";
   4: import {
   5:   createLearningExperience,
   6: } from "./experience";
   7: import type {
   8:   LearningExperience,
   9: } from "./types";
  10: 
  11: export function learningExperienceFromCognitiveCycle(
  12:   cycle: CognitiveRuntimeCycle,
  13:   recordedAt = new Date(cycle.generatedAt),
  14: ): LearningExperience {
  15:   const focusKey = cycle.focus.currentKey;
  16: 
  17:   const confidence =
  18:     cycle.focus.selected
  19:       ?.signal.assessment.confidence ??
  20:     0.5;
  21: 
  22:   return createLearningExperience(
  23:     {
  24:       id:
  25:         `cognitive-cycle:${cycle.cycle}:${cycle.generatedAt}`,
  26:       occurredAt: cycle.generatedAt,
  27:       recordedAt: recordedAt.toISOString(),
  28:       source: "cognitive-cycle",
  29:       subject: focusKey,
  30:       confidence,
  31:       outcome: {
  32:         status: "unknown",
  33:       },
  34:       feedback: {
  35:         kind: "none",
  36:       },
  37:       evidence: {
  38:         worldStateKeys: focusKey
  39:           ? [focusKey]
  40:           : [],
  41:         cognitiveDecisionIds: [
  42:           cycle.action.id,
  43:         ],
  44:       },
  45:       context: {
  46:         cycle: cycle.cycle,
  47:         focusKey,
  48:         responseMode: cycle.action.mode,
  49:         requestedMode:
  50:           cycle.action.requestedMode,
  51:         permittedToExecute:
  52:           cycle.action.permittedToExecute,
  53:         initiativeDisposition:
  54:           cycle.initiative.disposition,
  55:         observedRecords:
  56:           cycle.observedRecords,
  57:       },
  58:     },
  59:     recordedAt,
  60:   );
  61: }
```

## Learning runtime capture, feedback, outcome, promotion and guidance methods

Pattern: `captureCognitiveCycle|recordOutcome|recordFeedback|refreshPatterns|promote\(|guidance\(|adaptSignal\(`

### lib\chernobog\learning\learningRuntime.ts line 106

```text
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
> 106:   captureCognitiveCycle(
  107:     cycle: CognitiveRuntimeCycle,
  108:   ) {
  109:     const experience =
  110:       learningExperienceFromCognitiveCycle(
  111:         cycle,
  112:         this.clock(),
  113:       );
  114: 
  115:     this.experiences.upsert(
  116:       experience,
  117:     );
  118: 
  119:     return structuredClone(
  120:       experience,
  121:     );
  122:   }
  123: 
  124:   addOutcome(
  125:     observation:
  126:       LearningOutcomeObservation,
```

### lib\chernobog\learning\learningRuntime.ts line 168

```text
  148:       this.experiences.get(
  149:         experienceId,
  150:       );
  151: 
  152:     if (!experience) {
  153:       return undefined;
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
  183: 
  184:     const result =
  185:       extractLearningPatterns(
  186:         evaluated,
  187:       );
  188: 
```

### lib\chernobog\learning\learningRuntime.ts line 201

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
  195:       this.patterns.upsert(
  196:         candidate,
  197:       );
  198:     }
  199:   }
  200: 
> 201:   async promote(
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

### lib\chernobog\learning\learningRuntime.ts line 271

```text
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
  264:     await this.persistLessons();
  265: 
  266:     return structuredClone(
  267:       revoked,
  268:     );
  269:   }
  270: 
> 271:   adaptSignal(
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
  285:       this.lessons.list({
  286:         activeOnly: true,
  287:       }),
  288:     );
  289:   }
  290: 
  291:   async persistLessons():
```

### lib\chernobog\learning\learningRuntime.ts line 283

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
  277:       this.lessons.list({
  278:         activeOnly: true,
  279:       }),
  280:     );
  281:   }
  282: 
> 283:   guidance(): string[] {
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
```

### lib\chernobog\learning\learningRuntime.ts line 284

```text
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
  299:   snapshot():
  300:     LearningRuntimeSnapshot {
  301:     const evaluations =
  302:       this.experiences
  303:         .list()
  304:         .map((experience) =>
```


## Unified memory project filtering semantics

Pattern: `query\.projectId|record\.projectId|scope|sessionId`

### lib\chernobog\memory-architecture\unifiedReader.ts line 55

```text
   37: ): UnifiedMemorySourceId[] {
   38:   const available = listUnifiedMemorySources()
   39:     .filter((source) => source.readable)
   40:     .map((source) => source.id);
   41: 
   42:   if (!sources?.length) {
   43:     return available;
   44:   }
   45: 
   46:   const allowed = new Set(available);
   47: 
   48:   return [
   49:     ...new Set(
   50:       sources.filter((source) => allowed.has(source)),
   51:     ),
   52:   ].sort();
   53: }
   54: 
>  55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 60

```text
   42:   if (!sources?.length) {
   43:     return available;
   44:   }
   45: 
   46:   const allowed = new Set(available);
   47: 
   48:   return [
   49:     ...new Set(
   50:       sources.filter((source) => allowed.has(source)),
   51:     ),
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
>  60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 61

```text
   43:     return available;
   44:   }
   45: 
   46:   const allowed = new Set(available);
   47: 
   48:   return [
   49:     ...new Set(
   50:       sources.filter((source) => allowed.has(source)),
   51:     ),
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
>  61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 62

```text
   44:   }
   45: 
   46:   const allowed = new Set(available);
   47: 
   48:   return [
   49:     ...new Set(
   50:       sources.filter((source) => allowed.has(source)),
   51:     ),
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
>  62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 68

```text
   50:       sources.filter((source) => allowed.has(source)),
   51:     ),
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
>  68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 69

```text
   51:     ),
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
>  69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 70

```text
   52:   ].sort();
   53: }
   54: 
   55: function matchesScope(
   56:   record: UnifiedMemoryRecord,
   57:   query: UnifiedMemoryReadQuery,
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
>  70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 76

```text
   58: ): boolean {
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
>  76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 77

```text
   59:   if (
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
>  77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
   95:   query: UnifiedMemoryReadQuery = {},
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 78

```text
   60:     query.sessionId &&
   61:     record.scope === "session" &&
   62:     (!record.sessionId || record.sessionId !== query.sessionId)
   63:   ) {
   64:     return false;
   65:   }
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
>  78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
   95:   query: UnifiedMemoryReadQuery = {},
   96:   readers: UnifiedMemoryReaderMap =
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 84

```text
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
>  84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
   95:   query: UnifiedMemoryReadQuery = {},
   96:   readers: UnifiedMemoryReaderMap =
   97:     createDefaultUnifiedMemoryReaders(),
   98: ): Promise<UnifiedMemoryReadResult> {
   99:   const normalizedQuery: UnifiedMemoryReadQuery = {
  100:     ...query,
  101:     text: query.text?.trim() || undefined,
  102:     limit: normalizeLimit(query.limit),
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 85

```text
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
>  85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
   95:   query: UnifiedMemoryReadQuery = {},
   96:   readers: UnifiedMemoryReaderMap =
   97:     createDefaultUnifiedMemoryReaders(),
   98: ): Promise<UnifiedMemoryReadResult> {
   99:   const normalizedQuery: UnifiedMemoryReadQuery = {
  100:     ...query,
  101:     text: query.text?.trim() || undefined,
  102:     limit: normalizeLimit(query.limit),
  103:   };
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 86

```text
   68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
   75:   if (
   76:     query.sessionId &&
   77:     record.sessionId &&
   78:     record.sessionId !== query.sessionId
   79:   ) {
   80:     return false;
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
>  86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
   91:   return true;
   92: }
   93: 
   94: export async function readUnifiedMemory(
   95:   query: UnifiedMemoryReadQuery = {},
   96:   readers: UnifiedMemoryReaderMap =
   97:     createDefaultUnifiedMemoryReaders(),
   98: ): Promise<UnifiedMemoryReadResult> {
   99:   const normalizedQuery: UnifiedMemoryReadQuery = {
  100:     ...query,
  101:     text: query.text?.trim() || undefined,
  102:     limit: normalizeLimit(query.limit),
  103:   };
  104: 
```

### lib\chernobog\memory-architecture\unifiedReader.ts line 130

```text
  112:     const reader = readers[source];
  113: 
  114:     if (!reader) {
  115:       sourceResults.push({
  116:         source,
  117:         records: [],
  118:         error:
  119:           "No unified reader is registered for this source.",
  120:       });
  121:       continue;
  122:     }
  123: 
  124:     try {
  125:       const records = (
  126:         await reader(normalizedQuery)
  127:       )
  128:         .filter((record) => record.source === source)
  129:         .filter((record) =>
> 130:           matchesScope(record, normalizedQuery),
  131:         );
  132: 
  133:       sourceResults.push({
  134:         source,
  135:         records: records.map((record) =>
  136:           structuredClone(record),
  137:         ),
  138:       });
  139:     } catch (error) {
  140:       sourceResults.push({
  141:         source,
  142:         records: [],
  143:         error:
  144:           error instanceof Error
  145:             ? error.message
  146:             : String(error),
  147:       });
  148:     }
```


## Unified learned retrieval query semantics

Pattern: `learnedQuery|learned-lessons|projectId|Learned guidance|advisory behavior guidance`

### lib\chernobog\memory-architecture\contextIntegration.ts line 24

```text
    6: } from "./unifiedReader";
    7: import type {
    8:   UnifiedMemoryReaderMap,
    9:   UnifiedMemoryReadResult,
   10: } from "./readTypes";
   11: import type {
   12:   UnifiedMemoryRecord,
   13:   UnifiedMemorySourceId,
   14: } from "./unifiedTypes";
   15: import type {
   16:   BuildMemoryContextInput,
   17:   BuiltMemoryContext,
   18: } from "./types";
   19: 
   20: const DEFAULT_CONTEXT_SOURCES:
   21:   UnifiedMemorySourceId[] = [
   22:     "vault-structured-memory",
   23:     "project-memory-profile",
>  24:     "learned-lessons",
   25:   ];
   26: 
   27: export interface BuildUnifiedMemoryContextInput
   28:   extends BuildMemoryContextInput {
   29:   projectId?: string;
   30:   retrievalLimit?: number;
   31:   sources?: UnifiedMemorySourceId[];
   32: }
   33: 
   34: export interface UnifiedLearnedContextBlock {
   35:   layer: "learned";
   36:   title: "Learned guidance";
   37:   lines: string[];
   38: }
   39: 
   40: export interface BuiltUnifiedMemoryContext
   41:   extends BuiltMemoryContext {
   42:   learned:
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 29

```text
   11: import type {
   12:   UnifiedMemoryRecord,
   13:   UnifiedMemorySourceId,
   14: } from "./unifiedTypes";
   15: import type {
   16:   BuildMemoryContextInput,
   17:   BuiltMemoryContext,
   18: } from "./types";
   19: 
   20: const DEFAULT_CONTEXT_SOURCES:
   21:   UnifiedMemorySourceId[] = [
   22:     "vault-structured-memory",
   23:     "project-memory-profile",
   24:     "learned-lessons",
   25:   ];
   26: 
   27: export interface BuildUnifiedMemoryContextInput
   28:   extends BuildMemoryContextInput {
>  29:   projectId?: string;
   30:   retrievalLimit?: number;
   31:   sources?: UnifiedMemorySourceId[];
   32: }
   33: 
   34: export interface UnifiedLearnedContextBlock {
   35:   layer: "learned";
   36:   title: "Learned guidance";
   37:   lines: string[];
   38: }
   39: 
   40: export interface BuiltUnifiedMemoryContext
   41:   extends BuiltMemoryContext {
   42:   learned:
   43:     UnifiedLearnedContextBlock;
   44:   retrieval:
   45:     UnifiedMemoryReadResult;
   46: }
   47: 
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 36

```text
   18: } from "./types";
   19: 
   20: const DEFAULT_CONTEXT_SOURCES:
   21:   UnifiedMemorySourceId[] = [
   22:     "vault-structured-memory",
   23:     "project-memory-profile",
   24:     "learned-lessons",
   25:   ];
   26: 
   27: export interface BuildUnifiedMemoryContextInput
   28:   extends BuildMemoryContextInput {
   29:   projectId?: string;
   30:   retrievalLimit?: number;
   31:   sources?: UnifiedMemorySourceId[];
   32: }
   33: 
   34: export interface UnifiedLearnedContextBlock {
   35:   layer: "learned";
>  36:   title: "Learned guidance";
   37:   lines: string[];
   38: }
   39: 
   40: export interface BuiltUnifiedMemoryContext
   41:   extends BuiltMemoryContext {
   42:   learned:
   43:     UnifiedLearnedContextBlock;
   44:   retrieval:
   45:     UnifiedMemoryReadResult;
   46: }
   47: 
   48: function normalizeLimit(
   49:   value?: number,
   50: ): number {
   51:   if (
   52:     typeof value !== "number" ||
   53:     !Number.isFinite(value)
   54:   ) {
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 98

```text
   80:     if (
   81:       !normalized ||
   82:       seen.has(normalized)
   83:     ) {
   84:       continue;
   85:     }
   86: 
   87:     seen.add(normalized);
   88:     output.push(normalized);
   89:   }
   90: 
   91:   return output;
   92: }
   93: 
   94: function formatRetrievedRecord(
   95:   record: UnifiedMemoryRecord,
   96: ): string {
   97:   const project =
>  98:     record.projectId
   99:       ? ` project=${record.projectId}`
  100:       : "";
  101: 
  102:   const confidence =
  103:     typeof record.confidence ===
  104:       "number"
  105:       ? ` confidence=${record.confidence.toFixed(2)}`
  106:       : "";
  107: 
  108:   return `[${record.source}${project}${confidence}] ${record.content}`;
  109: }
  110: 
  111: function blockToText(
  112:   title: string,
  113:   lines: string[],
  114: ): string {
  115:   if (lines.length === 0) {
  116:     return `${title}:\n- none`;
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 99

```text
   81:       !normalized ||
   82:       seen.has(normalized)
   83:     ) {
   84:       continue;
   85:     }
   86: 
   87:     seen.add(normalized);
   88:     output.push(normalized);
   89:   }
   90: 
   91:   return output;
   92: }
   93: 
   94: function formatRetrievedRecord(
   95:   record: UnifiedMemoryRecord,
   96: ): string {
   97:   const project =
   98:     record.projectId
>  99:       ? ` project=${record.projectId}`
  100:       : "";
  101: 
  102:   const confidence =
  103:     typeof record.confidence ===
  104:       "number"
  105:       ? ` confidence=${record.confidence.toFixed(2)}`
  106:       : "";
  107: 
  108:   return `[${record.source}${project}${confidence}] ${record.content}`;
  109: }
  110: 
  111: function blockToText(
  112:   title: string,
  113:   lines: string[],
  114: ): string {
  115:   if (lines.length === 0) {
  116:     return `${title}:\n- none`;
  117:   }
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 154

```text
  136:     "Never invent memories that are not present in these blocks.",
  137:     "",
  138:     blockToText("Short-term memory", legacy.shortTerm.lines),
  139:     "",
  140:     blockToText("Working memory", legacy.working.lines),
  141:   ].join("\\n");
  142: 
  143:   const retrievalLimit =
  144:     normalizeLimit(
  145:       input.retrievalLimit,
  146:     );
  147: 
  148:   const requestedSources =
  149:     input.sources ??
  150:     DEFAULT_CONTEXT_SOURCES;
  151: 
  152:   const learnedRequested =
  153:     requestedSources.includes(
> 154:       "learned-lessons",
  155:     );
  156: 
  157:   const contextualSources =
  158:     requestedSources.filter(
  159:       (source) =>
  160:         source !==
  161:         "learned-lessons",
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 161

```text
  143:   const retrievalLimit =
  144:     normalizeLimit(
  145:       input.retrievalLimit,
  146:     );
  147: 
  148:   const requestedSources =
  149:     input.sources ??
  150:     DEFAULT_CONTEXT_SOURCES;
  151: 
  152:   const learnedRequested =
  153:     requestedSources.includes(
  154:       "learned-lessons",
  155:     );
  156: 
  157:   const contextualSources =
  158:     requestedSources.filter(
  159:       (source) =>
  160:         source !==
> 161:         "learned-lessons",
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 169

```text
  151: 
  152:   const learnedRequested =
  153:     requestedSources.includes(
  154:       "learned-lessons",
  155:     );
  156: 
  157:   const contextualSources =
  158:     requestedSources.filter(
  159:       (source) =>
  160:         source !==
  161:         "learned-lessons",
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
> 169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 170

```text
  152:   const learnedRequested =
  153:     requestedSources.includes(
  154:       "learned-lessons",
  155:     );
  156: 
  157:   const contextualSources =
  158:     requestedSources.filter(
  159:       (source) =>
  160:         source !==
  161:         "learned-lessons",
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
> 170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
  188:       [
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 177

```text
  159:       (source) =>
  160:         source !==
  161:         "learned-lessons",
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
> 177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
  188:       [
  189:         "learned-lessons",
  190:       ] as UnifiedMemorySourceId[],
  191:   };
  192: 
  193:   const emptyResult = (
  194:     query:
  195:       UnifiedMemoryReadResult["query"],
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 180

```text
  162:     );
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
> 180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
  188:       [
  189:         "learned-lessons",
  190:       ] as UnifiedMemorySourceId[],
  191:   };
  192: 
  193:   const emptyResult = (
  194:     query:
  195:       UnifiedMemoryReadResult["query"],
  196:   ): UnifiedMemoryReadResult => ({
  197:     query:
  198:       structuredClone(
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 181

```text
  163: 
  164:   const contextualQuery = {
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
> 181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
  188:       [
  189:         "learned-lessons",
  190:       ] as UnifiedMemorySourceId[],
  191:   };
  192: 
  193:   const emptyResult = (
  194:     query:
  195:       UnifiedMemoryReadResult["query"],
  196:   ): UnifiedMemoryReadResult => ({
  197:     query:
  198:       structuredClone(
  199:         query,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 189

```text
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
  175:   };
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
  186:       ),
  187:     sources:
  188:       [
> 189:         "learned-lessons",
  190:       ] as UnifiedMemorySourceId[],
  191:   };
  192: 
  193:   const emptyResult = (
  194:     query:
  195:       UnifiedMemoryReadResult["query"],
  196:   ): UnifiedMemoryReadResult => ({
  197:     query:
  198:       structuredClone(
  199:         query,
  200:       ),
  201:     records: [],
  202:     sourcesQueried: [],
  203:     sourceResults: [],
  204:     sourceErrors: [],
  205:   });
  206: 
  207:   const contextualRetrieval =
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 221

```text
  203:     sourceResults: [],
  204:     sourceErrors: [],
  205:   });
  206: 
  207:   const contextualRetrieval =
  208:     contextualSources.length >
  209:       0
  210:       ? await readUnifiedMemory(
  211:           contextualQuery,
  212:           readers,
  213:         )
  214:       : emptyResult(
  215:           contextualQuery,
  216:         );
  217: 
  218:   const learnedRetrieval =
  219:     learnedRequested
  220:       ? await readUnifiedMemory(
> 221:           learnedQuery,
  222:           readers,
  223:         )
  224:       : emptyResult(
  225:           learnedQuery,
  226:         );
  227: 
  228:   const retrieval:
  229:     UnifiedMemoryReadResult = {
  230:       query: {
  231:         text:
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
  235:         projectId:
  236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 225

```text
  207:   const contextualRetrieval =
  208:     contextualSources.length >
  209:       0
  210:       ? await readUnifiedMemory(
  211:           contextualQuery,
  212:           readers,
  213:         )
  214:       : emptyResult(
  215:           contextualQuery,
  216:         );
  217: 
  218:   const learnedRetrieval =
  219:     learnedRequested
  220:       ? await readUnifiedMemory(
  221:           learnedQuery,
  222:           readers,
  223:         )
  224:       : emptyResult(
> 225:           learnedQuery,
  226:         );
  227: 
  228:   const retrieval:
  229:     UnifiedMemoryReadResult = {
  230:       query: {
  231:         text:
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
  235:         projectId:
  236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
  240:           [...requestedSources],
  241:       },
  242:       records: [
  243:         ...contextualRetrieval.records,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 235

```text
  217: 
  218:   const learnedRetrieval =
  219:     learnedRequested
  220:       ? await readUnifiedMemory(
  221:           learnedQuery,
  222:           readers,
  223:         )
  224:       : emptyResult(
  225:           learnedQuery,
  226:         );
  227: 
  228:   const retrieval:
  229:     UnifiedMemoryReadResult = {
  230:       query: {
  231:         text:
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
> 235:         projectId:
  236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
  240:           [...requestedSources],
  241:       },
  242:       records: [
  243:         ...contextualRetrieval.records,
  244:         ...learnedRetrieval.records,
  245:       ].map(
  246:         (record) =>
  247:           structuredClone(
  248:             record,
  249:           ),
  250:       ),
  251:       sourcesQueried: [
  252:         ...new Set([
  253:           ...contextualRetrieval
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 236

```text
  218:   const learnedRetrieval =
  219:     learnedRequested
  220:       ? await readUnifiedMemory(
  221:           learnedQuery,
  222:           readers,
  223:         )
  224:       : emptyResult(
  225:           learnedQuery,
  226:         );
  227: 
  228:   const retrieval:
  229:     UnifiedMemoryReadResult = {
  230:       query: {
  231:         text:
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
  235:         projectId:
> 236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
  240:           [...requestedSources],
  241:       },
  242:       records: [
  243:         ...contextualRetrieval.records,
  244:         ...learnedRetrieval.records,
  245:       ].map(
  246:         (record) =>
  247:           structuredClone(
  248:             record,
  249:           ),
  250:       ),
  251:       sourcesQueried: [
  252:         ...new Set([
  253:           ...contextualRetrieval
  254:             .sourcesQueried,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 303

```text
  285:             structuredClone(
  286:               error,
  287:             ),
  288:         )
  289:         .sort(
  290:           (a, b) =>
  291:             a.source.localeCompare(
  292:               b.source,
  293:             ),
  294:         ),
  295:     };
  296: 
  297:   const learnedLines =
  298:     dedupeLines(
  299:       retrieval.records
  300:         .filter(
  301:           (record) =>
  302:             record.source ===
> 303:               "learned-lessons" ||
  304:             record.layer ===
  305:               "learned",
  306:         )
  307:         .map(
  308:           (record) =>
  309:             formatRetrievedRecord(
  310:               record,
  311:             ),
  312:         ),
  313:     );
  314: 
  315:   const supplementalLongTermLines =
  316:     dedupeLines(
  317:       retrieval.records
  318:         .filter(
  319:           (record) =>
  320:             record.source !==
  321:               "learned-lessons" &&
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 321

```text
  303:               "learned-lessons" ||
  304:             record.layer ===
  305:               "learned",
  306:         )
  307:         .map(
  308:           (record) =>
  309:             formatRetrievedRecord(
  310:               record,
  311:             ),
  312:         ),
  313:     );
  314: 
  315:   const supplementalLongTermLines =
  316:     dedupeLines(
  317:       retrieval.records
  318:         .filter(
  319:           (record) =>
  320:             record.source !==
> 321:               "learned-lessons" &&
  322:             record.layer !==
  323:               "learned",
  324:         )
  325:         .map(
  326:           (record) =>
  327:             formatRetrievedRecord(
  328:               record,
  329:             ),
  330:         ),
  331:     );
  332: 
  333:   const longTerm = {
  334:     ...legacy.longTerm,
  335:     lines:
  336:       dedupeLines([
  337:         ...legacy.longTerm.lines,
  338:         ...supplementalLongTermLines,
  339:       ]),
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 346

```text
  328:               record,
  329:             ),
  330:         ),
  331:     );
  332: 
  333:   const longTerm = {
  334:     ...legacy.longTerm,
  335:     lines:
  336:       dedupeLines([
  337:         ...legacy.longTerm.lines,
  338:         ...supplementalLongTermLines,
  339:       ]),
  340:   };
  341: 
  342:   const learned:
  343:     UnifiedLearnedContextBlock = {
  344:       layer: "learned",
  345:       title:
> 346:         "Learned guidance",
  347:       lines:
  348:         learnedLines,
  349:     };
  350: 
  351:   const retrievalWarnings =
  352:     retrieval.sourceErrors.map(
  353:       (item) =>
  354:         `${item.source}: ${item.error}`,
  355:     );
  356: 
  357:   const systemText = [
  358:     legacyCoreSystemText,
  359:     "",
  360:     "Additional unified memory rules:",
  361:     "Use retrieved approved/project memory only when relevant to the current request.",
  362:     "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
  363:     "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
  364:     "Do not infer missing memories from source names or metadata.",
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 362

```text
  344:       layer: "learned",
  345:       title:
  346:         "Learned guidance",
  347:       lines:
  348:         learnedLines,
  349:     };
  350: 
  351:   const retrievalWarnings =
  352:     retrieval.sourceErrors.map(
  353:       (item) =>
  354:         `${item.source}: ${item.error}`,
  355:     );
  356: 
  357:   const systemText = [
  358:     legacyCoreSystemText,
  359:     "",
  360:     "Additional unified memory rules:",
  361:     "Use retrieved approved/project memory only when relevant to the current request.",
> 362:     "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
  363:     "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
  364:     "Do not infer missing memories from source names or metadata.",
  365:     "",
  366:     blockToText(
  367:       "Supplemental retrieved long-term memory",
  368:       supplementalLongTermLines,
  369:     ),
  370:     "",
  371:     blockToText(
  372:       "Learned guidance",
  373:       learned.lines,
  374:     ),
  375:     ...(retrievalWarnings.length > 0
  376:       ? [
  377:           "",
  378:           blockToText(
  379:             "Memory retrieval warnings",
  380:             retrievalWarnings,
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 363

```text
  345:       title:
  346:         "Learned guidance",
  347:       lines:
  348:         learnedLines,
  349:     };
  350: 
  351:   const retrievalWarnings =
  352:     retrieval.sourceErrors.map(
  353:       (item) =>
  354:         `${item.source}: ${item.error}`,
  355:     );
  356: 
  357:   const systemText = [
  358:     legacyCoreSystemText,
  359:     "",
  360:     "Additional unified memory rules:",
  361:     "Use retrieved approved/project memory only when relevant to the current request.",
  362:     "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
> 363:     "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
  364:     "Do not infer missing memories from source names or metadata.",
  365:     "",
  366:     blockToText(
  367:       "Supplemental retrieved long-term memory",
  368:       supplementalLongTermLines,
  369:     ),
  370:     "",
  371:     blockToText(
  372:       "Learned guidance",
  373:       learned.lines,
  374:     ),
  375:     ...(retrievalWarnings.length > 0
  376:       ? [
  377:           "",
  378:           blockToText(
  379:             "Memory retrieval warnings",
  380:             retrievalWarnings,
  381:           ),
```

### lib\chernobog\memory-architecture\contextIntegration.ts line 372

```text
  354:         `${item.source}: ${item.error}`,
  355:     );
  356: 
  357:   const systemText = [
  358:     legacyCoreSystemText,
  359:     "",
  360:     "Additional unified memory rules:",
  361:     "Use retrieved approved/project memory only when relevant to the current request.",
  362:     "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
  363:     "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
  364:     "Do not infer missing memories from source names or metadata.",
  365:     "",
  366:     blockToText(
  367:       "Supplemental retrieved long-term memory",
  368:       supplementalLongTermLines,
  369:     ),
  370:     "",
  371:     blockToText(
> 372:       "Learned guidance",
  373:       learned.lines,
  374:     ),
  375:     ...(retrievalWarnings.length > 0
  376:       ? [
  377:           "",
  378:           blockToText(
  379:             "Memory retrieval warnings",
  380:             retrievalWarnings,
  381:           ),
  382:         ]
  383:       : []),
  384:   ].join("\n");
  385: 
  386:   return {
  387:     shortTerm:
  388:       structuredClone(
  389:         legacy.shortTerm,
  390:       ),
```


## Existing project-scoped learned-lesson tests

Pattern: `learned-lessons.*projectId|projectId.*learned-lessons|learned.*project.*scope|project.*scope.*lesson|cross-project.*lesson|lesson.*cross-project|project-scoped.*lesson`

_No matches._

## Any projectId carried through 11I source

Pattern: `projectId|project_id|projectSlug|workspaceId|scope`

- `lib\chernobog\learning\lessonApplicability.ts:43` - reason: "lesson-has-no-subject-scope",

## Any sessionId carried through 11I source

Pattern: `sessionId|session_id`

_No matches._

## Lesson-to-unified-record mapping elsewhere

Pattern: `source:\s*"learned-lessons"|lesson\.evidence|lesson\.sourcePattern|lesson\.key|scope:\s*"learned"|projectId:`

- `lib\chernobog\memory-architecture\contextIntegration.ts:169` - projectId:
- `lib\chernobog\memory-architecture\contextIntegration.ts:180` - projectId:
- `lib\chernobog\memory-architecture\contextIntegration.ts:235` - projectId:
- `lib\chernobog\memory-architecture\readAdapters.ts:78` - lesson.key,
- `lib\chernobog\memory-architecture\readAdapters.ts:221` - projectId:
- `lib\chernobog\memory-architecture\readAdapters.ts:239` - projectId:
- `lib\chernobog\memory-architecture\readAdapters.ts:293` - projectId:
- `lib\chernobog\memory-architecture\readAdapters.ts:308` - projectId:
- `lib\chernobog\memory-architecture\readAdapters.ts:340` - projectId:
- `lib\chernobog\memory-architecture\writeAdapters.ts:145` - projectId:
- `lib\chernobog\memory-architecture\writeAdapters.ts:164` - projectId: entry.projectId,
- `lib\chernobog\memory-architecture\writeAdapters.ts:190` - projectId: profile.projectId,
- `lib\chernobog\memory-architecture\writeAdapters.ts:206` - projectId: version.projectId,
- `lib\chernobog\memory-architecture\writePolicy.ts:46` - source: "learned-lessons",
- `lib\chernobog\memory-architecture\writeTypes.ts:79` - source: "learned-lessons";
- `lib\chernobog\learning\adaptationEngine.ts:70` - lessonKey: lesson.key,
- `lib\chernobog\learning\adaptationEngine.ts:79` - lessonKey: lesson.key,
- `lib\chernobog\learning\lessonApplicability.ts:16` - lesson.evidence.subjects

## Existing persisted lesson compatibility surface

- file exists: no
- no persisted lesson migration burden currently exists

## Decision matrix

SAFE A:
- learned adapter derives an explicit projectId from canonical lesson/evidence scope
- unified reader rejects mismatched project lessons
- existing tests prove cross-project exclusion
- proceed to live cognition -> learning ingress

UNSAFE B:
- LearnedLesson/evidence has no project scope and adapter emits projectId undefined
- unified reader therefore treats learned guidance as globally eligible
- harden project scope before live ingress

MIXED C:
- some lessons are intentionally global preferences while project lessons are also needed
- add an explicit lesson scope model such as global/project plus optional projectId
- never use absence of projectId as an accidental wildcard

COMPATIBILITY:
- if legacy lessons exist, any hardening patch must load them safely
- legacy unscoped lessons should default to an explicit conservative scope, not silently become project-global facts

## Required next implementation if UNSAFE B/MIXED C

1. Add explicit lesson scope metadata.
2. Carry project scope from live capture/evidence into pattern and promoted lesson.
3. Emit projectId on learned unified-memory records when scoped.
4. Define explicit global lesson behavior rather than implicit unscoped wildcarding.
5. Add cross-project retrieval acceptance tests.
6. Preserve advisory-only status and all existing promotion governance.
7. Only then connect normal /command cognition to 11I capture.
