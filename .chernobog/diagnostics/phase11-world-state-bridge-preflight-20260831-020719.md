# Chernobog Phase 11 - World State Bridge Preflight

Generated: 2026-08-31T02:07:19.5815268+01:00

Purpose: determine whether 11G World State is empty at runtime or populated but disconnected from conversational intelligence.

## World State source inventory

- `lib\chernobog\worldState\assessment.ts`
- `lib\chernobog\worldState\confidence.ts`
- `lib\chernobog\worldState\domainProjectors.ts`
- `lib\chernobog\worldState\eventProjection.ts`
- `lib\chernobog\worldState\freshness.ts`
- `lib\chernobog\worldState\httpQuery.ts`
- `lib\chernobog\worldState\index.ts`
- `lib\chernobog\worldState\keys.ts`
- `lib\chernobog\worldState\projectionEngine.ts`
- `lib\chernobog\worldState\projectorRegistry.ts`
- `lib\chernobog\worldState\projectorTypes.ts`
- `lib\chernobog\worldState\provenance.ts`
- `lib\chernobog\worldState\queryService.ts`
- `lib\chernobog\worldState\queryTypes.ts`
- `lib\chernobog\worldState\recovery.ts`
- `lib\chernobog\worldState\registry.ts`
- `lib\chernobog\worldState\runtimeIntegration.ts`
- `lib\chernobog\worldState\runtimeSingleton.ts`
- `lib\chernobog\worldState\snapshotIntegrity.ts`
- `lib\chernobog\worldState\snapshotQuery.ts`
- `lib\chernobog\worldState\snapshotStore.ts`
- `lib\chernobog\worldState\snapshotTypes.ts`
- `lib\chernobog\worldState\types.ts`
- `lib\chernobog\worldState\validation.ts`

## Runtime / persisted World State candidates

- `.chernobog\diagnostics\phase11-world-state-bridge-preflight-20260831-020719.md`
  - bytes: 0
  - modified: 2026-08-31T02:07:19.5805252+01:00

## Persisted state previews

### .chernobog\diagnostics\phase11-world-state-bridge-preflight-20260831-020719.md

```text

```


## World State public exports and query entry points

Pattern: `export\s+(async\s+)?(function|class|const|type|interface)|snapshot|query|current|latest|getWorld|readWorld`

### lib\chernobog\worldState\assessment.ts line 1

```text
>   1: import { getWorldStateConfidenceBand } from "./confidence";
    2: import { buildWorldStateFreshness } from "./freshness";
    3: import { getWorldStateProvenanceStatus } from "./provenance";
    4: import type {
```

### lib\chernobog\worldState\assessment.ts line 3

```text
    1: import { getWorldStateConfidenceBand } from "./confidence";
    2: import { buildWorldStateFreshness } from "./freshness";
>   3: import { getWorldStateProvenanceStatus } from "./provenance";
    4: import type {
    5:   WorldStateEvidenceAssessment,
    6:   WorldStateRecord,
```

### lib\chernobog\worldState\assessment.ts line 9

```text
    6:   WorldStateRecord,
    7: } from "./types";
    8: 
>   9: export function assessWorldStateEvidence(
   10:   record: WorldStateRecord,
   11:   now = new Date(),
   12: ): WorldStateEvidenceAssessment {
```

### lib\chernobog\worldState\assessment.ts line 27

```text
   24:     ageMs: Math.max(0, now.getTime() - observedAtMs),
   25:     confidence: record.confidence,
   26:     confidenceBasis: record.confidenceBasis,
>  27:     confidenceBand: getWorldStateConfidenceBand(
   28:       record.confidence,
   29:     ),
   30:     freshness: buildWorldStateFreshness(
```

### lib\chernobog\worldState\assessment.ts line 39

```text
   36:       },
   37:       { now },
   38:     ),
>  39:     provenanceStatus: getWorldStateProvenanceStatus(
   40:       record.provenance,
   41:     ),
   42:     eventId: record.provenance?.eventId,
```

### lib\chernobog\worldState\confidence.ts line 6

```text
    3:   WorldStateConfidenceBasis,
    4: } from "./types";
    5: 
>   6: export function normalizeWorldStateConfidence(
    7:   confidence: number,
    8: ): number {
    9:   if (
```

### lib\chernobog\worldState\confidence.ts line 22

```text
   19:   return confidence;
   20: }
   21: 
>  22: export function getWorldStateConfidenceBand(
   23:   confidence: number,
   24: ): WorldStateConfidenceBand {
   25:   const normalized = normalizeWorldStateConfidence(confidence);
```

### lib\chernobog\worldState\confidence.ts line 38

```text
   35:   return "low";
   36: }
   37: 
>  38: export function resolveWorldStateConfidenceBasis(
   39:   confidence: number | undefined,
   40:   requestedBasis: WorldStateConfidenceBasis | undefined,
   41: ): WorldStateConfidenceBasis {
```

### lib\chernobog\worldState\domainProjectors.ts line 476

```text
  473:         WorldStateProjection[] = [
  474:           {
  475:             key:
> 476:               `project.${project}.git.snapshot`,
  477:             value:
  478:               jsonSafe(event.payload),
  479:             ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 685

```text
  682:   };
  683: }
  684: 
> 685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 700

```text
  697:   ];
  698: }
  699: 
> 700: export function registerChernobogDomainProjectors(
  701:   engine:
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
```

### lib\chernobog\worldState\eventProjection.ts line 10

```text
    7:   WorldStateRecordInput,
    8: } from "./types";
    9: 
>  10: export function buildWorldStateInputFromEvent(
   11:   event: ChernobogEvent,
   12:   projection: WorldStateProjection,
   13:   projectorId?: string,
```

### lib\chernobog\worldState\freshness.ts line 7

```text
    4:   WorldStateFreshnessStatus,
    5: } from "./types";
    6: 
>   7: export interface WorldStateFreshnessInput {
    8:   observedAt: string;
    9:   expiresAt?: string;
   10:   basis?: WorldStateFreshnessBasis;
```

### lib\chernobog\worldState\freshness.ts line 14

```text
   11:   ttlMs?: number;
   12: }
   13: 
>  14: export interface WorldStateFreshnessOptions {
   15:   now?: Date;
   16:   agingWindowMs?: number;
   17: }
```

### lib\chernobog\worldState\freshness.ts line 27

```text
   24:   return result;
   25: }
   26: 
>  27: export function normalizeWorldStateTtlMs(
   28:   ttlMs: number | undefined,
   29: ): number | undefined {
   30:   if (ttlMs === undefined) {
```

### lib\chernobog\worldState\freshness.ts line 41

```text
   38:   return ttlMs;
   39: }
   40: 
>  41: export function resolveWorldStateExpiry(
   42:   observedAt: string,
   43:   ttlMs: number,
   44: ): string {
```

### lib\chernobog\worldState\freshness.ts line 58

```text
   55:   return new Date(observedAtMs + normalizedTtl).toISOString();
   56: }
   57: 
>  58: export function determineWorldStateFreshness(
   59:   input: WorldStateFreshnessInput,
   60:   options: WorldStateFreshnessOptions = {},
   61: ): WorldStateFreshnessStatus {
```

### lib\chernobog\worldState\freshness.ts line 95

```text
   92:   return nowMs >= agingAtMs ? "aging" : "fresh";
   93: }
   94: 
>  95: export function buildWorldStateFreshness(
   96:   input: WorldStateFreshnessInput,
   97:   options: WorldStateFreshnessOptions = {},
   98: ): WorldStateFreshness {
```

### lib\chernobog\worldState\httpQuery.ts line 5

```text
    2:   WorldStateFreshnessStatus,
    3: } from "./types";
    4: import type {
>   5:   WorldStateReadQuery,
    6: } from "./queryTypes";
    7: 
    8: const VALID_FRESHNESS =
```

### lib\chernobog\worldState\httpQuery.ts line 6

```text
    3: } from "./types";
    4: import type {
    5:   WorldStateReadQuery,
>   6: } from "./queryTypes";
    7: 
    8: const VALID_FRESHNESS =
    9:   new Set<WorldStateFreshnessStatus>([
```

### lib\chernobog\worldState\httpQuery.ts line 89

```text
   86:   return parsed;
   87: }
   88: 
>  89: export function parseWorldStateReadQuery(
   90:   searchParams: URLSearchParams,
   91: ): WorldStateReadQuery {
   92:   const query: WorldStateReadQuery = {
```

### lib\chernobog\worldState\httpQuery.ts line 91

```text
   88: 
   89: export function parseWorldStateReadQuery(
   90:   searchParams: URLSearchParams,
>  91: ): WorldStateReadQuery {
   92:   const query: WorldStateReadQuery = {
   93:     key:
   94:       optionalText(
```

### lib\chernobog\worldState\httpQuery.ts line 92

```text
   89: export function parseWorldStateReadQuery(
   90:   searchParams: URLSearchParams,
   91: ): WorldStateReadQuery {
>  92:   const query: WorldStateReadQuery = {
   93:     key:
   94:       optionalText(
   95:         searchParams.get("key"),
```

### lib\chernobog\worldState\httpQuery.ts line 124

```text
  121:   };
  122: 
  123:   if (
> 124:     query.key &&
  125:     (
  126:       query.namespace ||
  127:       query.keyPrefix ||
```

### lib\chernobog\worldState\httpQuery.ts line 126

```text
  123:   if (
  124:     query.key &&
  125:     (
> 126:       query.namespace ||
  127:       query.keyPrefix ||
  128:       query.freshness?.length ||
  129:       query.minConfidence !== undefined
```

### lib\chernobog\worldState\httpQuery.ts line 127

```text
  124:     query.key &&
  125:     (
  126:       query.namespace ||
> 127:       query.keyPrefix ||
  128:       query.freshness?.length ||
  129:       query.minConfidence !== undefined
  130:     )
```

### lib\chernobog\worldState\httpQuery.ts line 128

```text
  125:     (
  126:       query.namespace ||
  127:       query.keyPrefix ||
> 128:       query.freshness?.length ||
  129:       query.minConfidence !== undefined
  130:     )
  131:   ) {
```

### lib\chernobog\worldState\httpQuery.ts line 129

```text
  126:       query.namespace ||
  127:       query.keyPrefix ||
  128:       query.freshness?.length ||
> 129:       query.minConfidence !== undefined
  130:     )
  131:   ) {
  132:     throw new Error(
```

### lib\chernobog\worldState\httpQuery.ts line 137

```text
  134:     );
  135:   }
  136: 
> 137:   return query;
  138: }
```

### lib\chernobog\worldState\index.ts line 13

```text
   10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
>  13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
```

### lib\chernobog\worldState\index.ts line 14

```text
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
>  14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
   17: export * from "./queryTypes";
```

### lib\chernobog\worldState\index.ts line 15

```text
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
>  15: export * from "./snapshotStore";
   16: export * from "./recovery";
   17: export * from "./queryTypes";
   18: export * from "./queryService";
```

### lib\chernobog\worldState\index.ts line 17

```text
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
>  17: export * from "./queryTypes";
   18: export * from "./queryService";
   19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
```

### lib\chernobog\worldState\index.ts line 18

```text
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
   17: export * from "./queryTypes";
>  18: export * from "./queryService";
   19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
   21: export * from "./domainProjectors";
```

### lib\chernobog\worldState\index.ts line 19

```text
   16: export * from "./recovery";
   17: export * from "./queryTypes";
   18: export * from "./queryService";
>  19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
   21: export * from "./domainProjectors";
   22: export * from "./runtimeIntegration";
```

### lib\chernobog\worldState\index.ts line 20

```text
   17: export * from "./queryTypes";
   18: export * from "./queryService";
   19: export * from "./httpQuery";
>  20: export * from "./snapshotQuery";
   21: export * from "./domainProjectors";
   22: export * from "./runtimeIntegration";
   23: export * from "./runtimeSingleton";
```

### lib\chernobog\worldState\keys.ts line 4

```text
    1: const WORLD_STATE_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
    2: const WORLD_STATE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;
    3: 
>   4: export const CHERNOBOG_WORLD_STATE_NAMESPACES = [
    5:   "project",
    6:   "repository",
    7:   "service",
```

### lib\chernobog\worldState\keys.ts line 17

```text
   14:   "system",
   15: ] as const;
   16: 
>  17: export type ChernobogWorldStateNamespace =
   18:   (typeof CHERNOBOG_WORLD_STATE_NAMESPACES)[number];
   19: 
   20: export function isValidWorldStateIdentifier(value: string): boolean {
```

### lib\chernobog\worldState\keys.ts line 20

```text
   17: export type ChernobogWorldStateNamespace =
   18:   (typeof CHERNOBOG_WORLD_STATE_NAMESPACES)[number];
   19: 
>  20: export function isValidWorldStateIdentifier(value: string): boolean {
   21:   return WORLD_STATE_IDENTIFIER_PATTERN.test(value);
   22: }
   23: 
```

### lib\chernobog\worldState\keys.ts line 24

```text
   21:   return WORLD_STATE_IDENTIFIER_PATTERN.test(value);
   22: }
   23: 
>  24: export function isValidWorldStateKey(value: string): boolean {
   25:   return WORLD_STATE_KEY_PATTERN.test(value);
   26: }
   27: 
```

### lib\chernobog\worldState\keys.ts line 28

```text
   25:   return WORLD_STATE_KEY_PATTERN.test(value);
   26: }
   27: 
>  28: export function getWorldStateNamespace(key: string): string {
   29:   const separator = key.indexOf(".");
   30:   if (separator <= 0) {
   31:     throw new Error(
```

### lib\chernobog\worldState\keys.ts line 38

```text
   35:   return key.slice(0, separator);
   36: }
   37: 
>  38: export function createWorldStateKey(
   39:   namespace: string,
   40:   ...segments: string[]
   41: ): string {
```

### lib\chernobog\worldState\projectionEngine.ts line 38

```text
   35:   return [output as WorldStateProjection];
   36: }
   37: 
>  38: export interface ChernobogWorldStateProjectionEngineOptions {
   39:   worldState?: ChernobogWorldStateRegistry;
   40:   projectors?: ChernobogWorldStateProjectorRegistry;
   41: }
```

### lib\chernobog\worldState\projectionEngine.ts line 43

```text
   40:   projectors?: ChernobogWorldStateProjectorRegistry;
   41: }
   42: 
>  43: export class ChernobogWorldStateProjectionEngine {
   44:   readonly worldState: ChernobogWorldStateRegistry;
   45:   readonly projectors: ChernobogWorldStateProjectorRegistry;
   46: 
```

### lib\chernobog\worldState\projectorRegistry.ts line 34

```text
   31:   return false;
   32: }
   33: 
>  34: export class ChernobogWorldStateProjectorRegistry {
   35:   private readonly projectors = new Map<string, WorldStateProjector>();
   36: 
   37:   register(projector: WorldStateProjector): () => void {
```

### lib\chernobog\worldState\projectorTypes.ts line 7

```text
    4:   WorldStateRecordInput,
    5: } from "./types";
    6: 
>   7: export interface WorldStateProjection<
    8:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
    9: > extends Omit<
   10:     WorldStateRecordInput<TValue>,
```

### lib\chernobog\worldState\projectorTypes.ts line 25

```text
   22:   ttlMs?: number;
   23: }
   24: 
>  25: export interface WorldStateProjector {
   26:   id: string;
   27:   eventTypes?: readonly string[];
   28:   eventTypePrefixes?: readonly string[];
```

### lib\chernobog\worldState\projectorTypes.ts line 37

```text
   34:     | undefined;
   35: }
   36: 
>  37: export interface WorldStateProjectionResult {
   38:   eventId: string;
   39:   eventType: string;
   40:   matchedProjectors: number;
```

### lib\chernobog\worldState\provenance.ts line 10

```text
    7:   return Boolean(value?.trim());
    8: }
    9: 
>  10: export function getWorldStateProvenanceStatus(
   11:   provenance: WorldStateProvenance | undefined,
   12: ): WorldStateProvenanceStatus {
   13:   if (!provenance) {
```

### lib\chernobog\worldState\queryService.ts line 11

```text
    8:   WorldStateDiagnostics,
    9:   WorldStateExplanation,
   10:   WorldStateReadItem,
>  11:   WorldStateReadQuery,
   12:   WorldStateReadResult,
   13: } from "./queryTypes";
   14: import type {
```

### lib\chernobog\worldState\queryService.ts line 13

```text
   10:   WorldStateReadItem,
   11:   WorldStateReadQuery,
   12:   WorldStateReadResult,
>  13: } from "./queryTypes";
   14: import type {
   15:   WorldStateFreshnessStatus,
   16: } from "./types";
```

### lib\chernobog\worldState\queryService.ts line 34

```text
   31:     }));
   32: }
   33: 
>  34: function validateKeyQuery(
   35:   query: WorldStateReadQuery,
   36: ): void {
   37:   if (
```

### lib\chernobog\worldState\queryService.ts line 35

```text
   32: }
   33: 
   34: function validateKeyQuery(
>  35:   query: WorldStateReadQuery,
   36: ): void {
   37:   if (
   38:     query.key &&
```

### lib\chernobog\worldState\queryService.ts line 38

```text
   35:   query: WorldStateReadQuery,
   36: ): void {
   37:   if (
>  38:     query.key &&
   39:     (
   40:       query.namespace ||
   41:       query.keyPrefix ||
```

### lib\chernobog\worldState\queryService.ts line 40

```text
   37:   if (
   38:     query.key &&
   39:     (
>  40:       query.namespace ||
   41:       query.keyPrefix ||
   42:       query.freshness?.length ||
   43:       query.minConfidence !== undefined
```

### lib\chernobog\worldState\queryService.ts line 41

```text
   38:     query.key &&
   39:     (
   40:       query.namespace ||
>  41:       query.keyPrefix ||
   42:       query.freshness?.length ||
   43:       query.minConfidence !== undefined
   44:     )
```

### lib\chernobog\worldState\queryService.ts line 42

```text
   39:     (
   40:       query.namespace ||
   41:       query.keyPrefix ||
>  42:       query.freshness?.length ||
   43:       query.minConfidence !== undefined
   44:     )
   45:   ) {
```

### lib\chernobog\worldState\queryService.ts line 43

```text
   40:       query.namespace ||
   41:       query.keyPrefix ||
   42:       query.freshness?.length ||
>  43:       query.minConfidence !== undefined
   44:     )
   45:   ) {
   46:     throw new Error(
```

### lib\chernobog\worldState\queryService.ts line 47

```text
   44:     )
   45:   ) {
   46:     throw new Error(
>  47:       "worldState read query key cannot be combined with filters.",
   48:     );
   49:   }
   50: }
```

### lib\chernobog\worldState\queryService.ts line 52

```text
   49:   }
   50: }
   51: 
>  52: export class ChernobogWorldStateQueryService {
   53:   private readonly registry:
   54:     ChernobogWorldStateRegistry;
   55: 
```

### lib\chernobog\worldState\queryService.ts line 67

```text
   64:   }
   65: 
   66:   read(
>  67:     query: WorldStateReadQuery = {},
   68:     source: WorldStateReadResult["source"] = "registry",
   69:   ): WorldStateReadResult {
   70:     validateKeyQuery(query);
```

### lib\chernobog\worldState\queryService.ts line 70

```text
   67:     query: WorldStateReadQuery = {},
   68:     source: WorldStateReadResult["source"] = "registry",
   69:   ): WorldStateReadResult {
>  70:     validateKeyQuery(query);
   71: 
   72:     const now = this.clock();
   73: 
```

### lib\chernobog\worldState\queryService.ts line 74

```text
   71: 
   72:     const now = this.clock();
   73: 
>  74:     if (query.key) {
   75:       const record =
   76:         this.registry.get(query.key);
   77: 
```

### lib\chernobog\worldState\queryService.ts line 76

```text
   73: 
   74:     if (query.key) {
   75:       const record =
>  76:         this.registry.get(query.key);
   77: 
   78:       const items: WorldStateReadItem[] =
   79:         record
```

### lib\chernobog\worldState\queryService.ts line 104

```text
  101:     const records =
  102:       this.registry.list({
  103:         namespace:
> 104:           query.namespace,
  105:         keyPrefix:
  106:           query.keyPrefix,
  107:         freshness:
```

### lib\chernobog\worldState\queryService.ts line 106

```text
  103:         namespace:
  104:           query.namespace,
  105:         keyPrefix:
> 106:           query.keyPrefix,
  107:         freshness:
  108:           query.freshness,
  109:         minConfidence:
```

### lib\chernobog\worldState\queryService.ts line 108

```text
  105:         keyPrefix:
  106:           query.keyPrefix,
  107:         freshness:
> 108:           query.freshness,
  109:         minConfidence:
  110:           query.minConfidence,
  111:       });
```

### lib\chernobog\worldState\queryService.ts line 110

```text
  107:         freshness:
  108:           query.freshness,
  109:         minConfidence:
> 110:           query.minConfidence,
  111:       });
  112: 
  113:     const items =
```

### lib\chernobog\worldState\queryService.ts line 146

```text
  143:         key,
  144:         found: false,
  145:         evidence: [
> 146:           "No current World State record exists for this key.",
  147:         ],
  148:       };
  149:     }
```

### lib\chernobog\worldState\queryTypes.ts line 7

```text
    4:   WorldStateRecord,
    5: } from "./types";
    6: 
>   7: export interface WorldStateReadQuery {
    8:   key?: string;
    9:   namespace?: string;
   10:   keyPrefix?: string;
```

### lib\chernobog\worldState\queryTypes.ts line 15

```text
   12:   minConfidence?: number;
   13: }
   14: 
>  15: export interface WorldStateReadItem {
   16:   record: WorldStateRecord;
   17:   assessment: WorldStateEvidenceAssessment;
   18: }
```

### lib\chernobog\worldState\queryTypes.ts line 20

```text
   17:   assessment: WorldStateEvidenceAssessment;
   18: }
   19: 
>  20: export interface WorldStateReadResult {
   21:   generatedAt: string;
   22:   source: "registry" | "snapshot";
   23:   count: number;
```

### lib\chernobog\worldState\queryTypes.ts line 22

```text
   19: 
   20: export interface WorldStateReadResult {
   21:   generatedAt: string;
>  22:   source: "registry" | "snapshot";
   23:   count: number;
   24:   items: WorldStateReadItem[];
   25: }
```

### lib\chernobog\worldState\queryTypes.ts line 27

```text
   24:   items: WorldStateReadItem[];
   25: }
   26: 
>  27: export interface WorldStateNamespaceDiagnostic {
   28:   namespace: string;
   29:   records: number;
   30: }
```

### lib\chernobog\worldState\queryTypes.ts line 32

```text
   29:   records: number;
   30: }
   31: 
>  32: export interface WorldStateFreshnessDiagnostic {
   33:   status: WorldStateFreshnessStatus;
   34:   records: number;
   35: }
```

### lib\chernobog\worldState\queryTypes.ts line 37

```text
   34:   records: number;
   35: }
   36: 
>  37: export interface WorldStateConfidenceDiagnostic {
   38:   band: "high" | "medium" | "low";
   39:   records: number;
   40: }
```

### lib\chernobog\worldState\queryTypes.ts line 42

```text
   39:   records: number;
   40: }
   41: 
>  42: export interface WorldStateProvenanceDiagnostic {
   43:   status: "complete" | "partial" | "absent";
   44:   records: number;
   45: }
```

### lib\chernobog\worldState\queryTypes.ts line 47

```text
   44:   records: number;
   45: }
   46: 
>  47: export interface WorldStateDiagnostics {
   48:   generatedAt: string;
   49:   totalRecords: number;
   50:   namespaces: WorldStateNamespaceDiagnostic[];
```

### lib\chernobog\worldState\queryTypes.ts line 56

```text
   53:   provenance: WorldStateProvenanceDiagnostic[];
   54: }
   55: 
>  56: export interface WorldStateExplanation {
   57:   generatedAt: string;
   58:   key: string;
   59:   found: boolean;
```

### lib\chernobog\worldState\queryTypes.ts line 65

```text
   62:   evidence: string[];
   63: }
   64: 
>  65: export type PersistedWorldStateReadResult =
   66:   | {
   67:       status: "missing";
   68:       generatedAt: string;
```

### lib\chernobog\worldState\queryTypes.ts line 69

```text
   66:   | {
   67:       status: "missing";
   68:       generatedAt: string;
>  69:       snapshotPath: string;
   70:     }
   71:   | {
   72:       status: "loaded";
```

### lib\chernobog\worldState\queryTypes.ts line 74

```text
   71:   | {
   72:       status: "loaded";
   73:       generatedAt: string;
>  74:       snapshotPath: string;
   75:       snapshotCreatedAt: string;
   76:       result: WorldStateReadResult;
   77:       diagnostics: WorldStateDiagnostics;
```

### lib\chernobog\worldState\queryTypes.ts line 75

```text
   72:       status: "loaded";
   73:       generatedAt: string;
   74:       snapshotPath: string;
>  75:       snapshotCreatedAt: string;
   76:       result: WorldStateReadResult;
   77:       diagnostics: WorldStateDiagnostics;
   78:     };
```

### lib\chernobog\worldState\recovery.ts line 9

```text
    6:   ChernobogEventBus,
    7: } from "../events/eventBus";
    8: import {
>   9:   buildWorldStateSnapshot,
   10: } from "./snapshotIntegrity";
   11: import {
   12:   JsonWorldStateSnapshotStore,
```

### lib\chernobog\worldState\recovery.ts line 10

```text
    7: } from "../events/eventBus";
    8: import {
    9:   buildWorldStateSnapshot,
>  10: } from "./snapshotIntegrity";
   11: import {
   12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
```

### lib\chernobog\worldState\recovery.ts line 12

```text
    9:   buildWorldStateSnapshot,
   10: } from "./snapshotIntegrity";
   11: import {
>  12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
   14: } from "./snapshotStore";
   15: import type {
```

### lib\chernobog\worldState\recovery.ts line 13

```text
   10: } from "./snapshotIntegrity";
   11: import {
   12:   JsonWorldStateSnapshotStore,
>  13:   WorldStateSnapshotCorruptionError,
   14: } from "./snapshotStore";
   15: import type {
   16:   WorldStateRecoveryResult,
```

### lib\chernobog\worldState\recovery.ts line 14

```text
   11: import {
   12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
>  14: } from "./snapshotStore";
   15: import type {
   16:   WorldStateRecoveryResult,
   17: } from "./snapshotTypes";
```

### lib\chernobog\worldState\recovery.ts line 17

```text
   14: } from "./snapshotStore";
   15: import type {
   16:   WorldStateRecoveryResult,
>  17: } from "./snapshotTypes";
   18: import {
   19:   ChernobogWorldStateProjectionEngine,
   20: } from "./projectionEngine";
```

### lib\chernobog\worldState\recovery.ts line 22

```text
   19:   ChernobogWorldStateProjectionEngine,
   20: } from "./projectionEngine";
   21: 
>  22: export interface RecoverWorldStateOptions {
   23:   engine: ChernobogWorldStateProjectionEngine;
   24:   eventBus: Pick<
   25:     ChernobogEventBus,
```

### lib\chernobog\worldState\recovery.ts line 28

```text
   25:     ChernobogEventBus,
   26:     "replay"
   27:   >;
>  28:   store?: JsonWorldStateSnapshotStore;
   29:   now?: () => Date;
   30: }
   31: 
```

### lib\chernobog\worldState\recovery.ts line 48

```text
   45:   return result;
   46: }
   47: 
>  48: async function replayAfterSnapshot(
   49:   engine: ChernobogWorldStateProjectionEngine,
   50:   eventBus: Pick<
   51:     ChernobogEventBus,
```

### lib\chernobog\worldState\recovery.ts line 54

```text
   51:     ChernobogEventBus,
   52:     "replay"
   53:   >,
>  54:   snapshotCreatedAt: string,
   55: ): Promise<{
   56:   replayedEvents: number;
   57:   failedEvents: number;
```

### lib\chernobog\worldState\recovery.ts line 62

```text
   59: }> {
   60:   const cutoffMs =
   61:     timestampMs(
>  62:       snapshotCreatedAt,
   63:       "worldState.snapshot.createdAt",
   64:     );
   65: 
```

### lib\chernobog\worldState\recovery.ts line 63

```text
   60:   const cutoffMs =
   61:     timestampMs(
   62:       snapshotCreatedAt,
>  63:       "worldState.snapshot.createdAt",
   64:     );
   65: 
   66:   let catchUpEvents = 0;
```

### lib\chernobog\worldState\recovery.ts line 97

```text
   94:   };
   95: }
   96: 
>  97: async function persistCurrentState(
   98:   engine: ChernobogWorldStateProjectionEngine,
   99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
```

### lib\chernobog\worldState\recovery.ts line 99

```text
   96: 
   97: async function persistCurrentState(
   98:   engine: ChernobogWorldStateProjectionEngine,
>  99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
  101: ): Promise<void> {
  102:   const snapshot =
```

### lib\chernobog\worldState\recovery.ts line 102

```text
   99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
  101: ): Promise<void> {
> 102:   const snapshot =
  103:     buildWorldStateSnapshot(
  104:       engine.worldState.snapshot(),
  105:       now,
```

### lib\chernobog\worldState\recovery.ts line 103

```text
  100:   now: Date,
  101: ): Promise<void> {
  102:   const snapshot =
> 103:     buildWorldStateSnapshot(
  104:       engine.worldState.snapshot(),
  105:       now,
  106:     );
```

### lib\chernobog\worldState\recovery.ts line 104

```text
  101: ): Promise<void> {
  102:   const snapshot =
  103:     buildWorldStateSnapshot(
> 104:       engine.worldState.snapshot(),
  105:       now,
  106:     );
  107: 
```

### lib\chernobog\worldState\recovery.ts line 108

```text
  105:       now,
  106:     );
  107: 
> 108:   await store.save(snapshot);
  109: }
  110: 
  111: export async function recoverWorldState(
```

### lib\chernobog\worldState\recovery.ts line 111

```text
  108:   await store.save(snapshot);
  109: }
  110: 
> 111: export async function recoverWorldState(
  112:   options: RecoverWorldStateOptions,
  113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
```

### lib\chernobog\worldState\recovery.ts line 116

```text
  113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
  115:     options.store ??
> 116:     new JsonWorldStateSnapshotStore();
  117: 
  118:   const clock =
  119:     options.now ??
```

### lib\chernobog\worldState\recovery.ts line 125

```text
  122:   let loaded:
  123:     | Awaited<
  124:         ReturnType<
> 125:           JsonWorldStateSnapshotStore["load"]
  126:         >
  127:       >
  128:     | undefined;
```

### lib\chernobog\worldState\recovery.ts line 141

```text
  138:     if (
  139:       !(
  140:         error instanceof
> 141:         WorldStateSnapshotCorruptionError
  142:       )
  143:     ) {
  144:       throw error;
```

### lib\chernobog\worldState\recovery.ts line 148

```text
  145:     }
  146: 
  147:     quarantinedPath =
> 148:       await store.quarantineCorruptSnapshot(
  149:         clock(),
  150:       );
  151:   }
```

### lib\chernobog\worldState\recovery.ts line 157

```text
  154:     loaded?.status === "loaded"
  155:   ) {
  156:     options.engine.worldState.replace(
> 157:       loaded.snapshot.records,
  158:     );
  159: 
  160:     const catchUp =
```

### lib\chernobog\worldState\recovery.ts line 161

```text
  158:     );
  159: 
  160:     const catchUp =
> 161:       await replayAfterSnapshot(
  162:         options.engine,
  163:         options.eventBus,
  164:         loaded.snapshot.createdAt,
```

### lib\chernobog\worldState\recovery.ts line 164

```text
  161:       await replayAfterSnapshot(
  162:         options.engine,
  163:         options.eventBus,
> 164:         loaded.snapshot.createdAt,
  165:       );
  166: 
  167:     if (
```

### lib\chernobog\worldState\recovery.ts line 175

```text
  172:       );
  173:     }
  174: 
> 175:     await persistCurrentState(
  176:       options.engine,
  177:       store,
  178:       clock(),
```

### lib\chernobog\worldState\recovery.ts line 184

```text
  181:     return {
  182:       mode:
  183:         catchUp.catchUpEvents > 0
> 184:           ? "snapshot-caught-up"
  185:           : "snapshot-restored",
  186:       restoredRecords:
  187:         loaded.snapshot.recordCount,
```

### lib\chernobog\worldState\recovery.ts line 185

```text
  182:       mode:
  183:         catchUp.catchUpEvents > 0
  184:           ? "snapshot-caught-up"
> 185:           : "snapshot-restored",
  186:       restoredRecords:
  187:         loaded.snapshot.recordCount,
  188:       replayedEvents:
```

### lib\chernobog\worldState\recovery.ts line 187

```text
  184:           ? "snapshot-caught-up"
  185:           : "snapshot-restored",
  186:       restoredRecords:
> 187:         loaded.snapshot.recordCount,
  188:       replayedEvents:
  189:         catchUp.replayedEvents,
  190:       catchUpEvents:
```

### lib\chernobog\worldState\recovery.ts line 194

```text
  191:         catchUp.catchUpEvents,
  192:       stateRecords:
  193:         options.engine.worldState.size,
> 194:       persistedSnapshotPath:
  195:         store.filePath,
  196:     };
  197:   }
```

### lib\chernobog\worldState\recovery.ts line 213

```text
  210:     );
  211:   }
  212: 
> 213:   await persistCurrentState(
  214:     options.engine,
  215:     store,
  216:     clock(),
```

### lib\chernobog\worldState\recovery.ts line 222

```text
  219:   return {
  220:     mode:
  221:       quarantinedPath
> 222:         ? "corrupt-snapshot-rebuilt"
  223:         : "history-rebuilt",
  224:     restoredRecords: 0,
  225:     replayedEvents:
```

### lib\chernobog\worldState\recovery.ts line 231

```text
  228:     stateRecords:
  229:       rebuilt.stateRecords,
  230:     quarantinedPath,
> 231:     persistedSnapshotPath:
  232:       store.filePath,
  233:   };
  234: }
```

### lib\chernobog\worldState\registry.ts line 8

```text
    5: } from "./validation";
    6: import type {
    7:   WorldStateJsonValue,
>   8:   WorldStateQuery,
    9:   WorldStateRecord,
   10:   WorldStateRecordInput,
   11:   WorldStateUpsertResult,
```

### lib\chernobog\worldState\registry.ts line 37

```text
   34:   return a === b ? 0 : a < b ? -1 : 1;
   35: }
   36: 
>  37: export function compareWorldStateRecency(
   38:   left: WorldStateRecord,
   39:   right: WorldStateRecord,
   40: ): number {
```

### lib\chernobog\worldState\registry.ts line 71

```text
   68:   return structuredClone(record);
   69: }
   70: 
>  71: export class ChernobogWorldStateRegistry {
   72:   private readonly records =
   73:     new Map<string, WorldStateRecord>();
   74: 
```

### lib\chernobog\worldState\registry.ts line 179

```text
  176: 
  177:       if (next.has(record.key)) {
  178:         throw new Error(
> 179:           `worldState snapshot contains duplicate key "${record.key}".`,
  180:         );
  181:       }
  182: 
```

### lib\chernobog\worldState\registry.ts line 211

```text
  208:   }
  209: 
  210:   list(
> 211:     query: WorldStateQuery = {},
  212:   ): WorldStateRecord[] {
  213:     const now = this.clock();
  214: 
```

### lib\chernobog\worldState\registry.ts line 216

```text
  213:     const now = this.clock();
  214: 
  215:     if (
> 216:       query.minConfidence !== undefined &&
  217:       (
  218:         !Number.isFinite(query.minConfidence) ||
  219:         query.minConfidence < 0 ||
```

### lib\chernobog\worldState\registry.ts line 218

```text
  215:     if (
  216:       query.minConfidence !== undefined &&
  217:       (
> 218:         !Number.isFinite(query.minConfidence) ||
  219:         query.minConfidence < 0 ||
  220:         query.minConfidence > 1
  221:       )
```

### lib\chernobog\worldState\registry.ts line 219

```text
  216:       query.minConfidence !== undefined &&
  217:       (
  218:         !Number.isFinite(query.minConfidence) ||
> 219:         query.minConfidence < 0 ||
  220:         query.minConfidence > 1
  221:       )
  222:     ) {
```

### lib\chernobog\worldState\registry.ts line 220

```text
  217:       (
  218:         !Number.isFinite(query.minConfidence) ||
  219:         query.minConfidence < 0 ||
> 220:         query.minConfidence > 1
  221:       )
  222:     ) {
  223:       throw new Error(
```

### lib\chernobog\worldState\registry.ts line 224

```text
  221:       )
  222:     ) {
  223:       throw new Error(
> 224:         "worldState query minConfidence must be between 0 and 1.",
  225:       );
  226:     }
  227: 
```

### lib\chernobog\worldState\registry.ts line 231

```text
  228:     return [...this.records.values()]
  229:       .filter((record) => {
  230:         if (
> 231:           query.namespace &&
  232:           record.namespace !== query.namespace
  233:         ) {
  234:           return false;
```

### lib\chernobog\worldState\registry.ts line 232

```text
  229:       .filter((record) => {
  230:         if (
  231:           query.namespace &&
> 232:           record.namespace !== query.namespace
  233:         ) {
  234:           return false;
  235:         }
```

### lib\chernobog\worldState\registry.ts line 238

```text
  235:         }
  236: 
  237:         if (
> 238:           query.keyPrefix &&
  239:           !record.key.startsWith(
  240:             query.keyPrefix,
  241:           )
```

### lib\chernobog\worldState\registry.ts line 240

```text
  237:         if (
  238:           query.keyPrefix &&
  239:           !record.key.startsWith(
> 240:             query.keyPrefix,
  241:           )
  242:         ) {
  243:           return false;
```

### lib\chernobog\worldState\registry.ts line 247

```text
  244:         }
  245: 
  246:         if (
> 247:           query.minConfidence !== undefined &&
  248:           record.confidence <
  249:             query.minConfidence
  250:         ) {
```

### lib\chernobog\worldState\registry.ts line 249

```text
  246:         if (
  247:           query.minConfidence !== undefined &&
  248:           record.confidence <
> 249:             query.minConfidence
  250:         ) {
  251:           return false;
  252:         }
```

### lib\chernobog\worldState\registry.ts line 254

```text
  251:           return false;
  252:         }
  253: 
> 254:         if (query.freshness?.length) {
  255:           const freshness =
  256:             buildWorldStateFreshness(
  257:               {
```

### lib\chernobog\worldState\registry.ts line 272

```text
  269:             );
  270: 
  271:           if (
> 272:             !query.freshness.includes(
  273:               freshness.status,
  274:             )
  275:           ) {
```

### lib\chernobog\worldState\registry.ts line 308

```text
  305:       });
  306:   }
  307: 
> 308:   snapshot(): WorldStateRecord[] {
  309:     return this.list();
  310:   }
  311: }
```

### lib\chernobog\worldState\runtimeIntegration.ts line 5

```text
    2:   ChernobogEventBus,
    3: } from "../events/eventBus";
    4: import {
>   5:   buildWorldStateSnapshot,
    6: } from "./snapshotIntegrity";
    7: import {
    8:   JsonWorldStateSnapshotStore,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 6

```text
    3: } from "../events/eventBus";
    4: import {
    5:   buildWorldStateSnapshot,
>   6: } from "./snapshotIntegrity";
    7: import {
    8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 8

```text
    5:   buildWorldStateSnapshot,
    6: } from "./snapshotIntegrity";
    7: import {
>   8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import {
   11:   recoverWorldState,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 9

```text
    6: } from "./snapshotIntegrity";
    7: import {
    8:   JsonWorldStateSnapshotStore,
>   9: } from "./snapshotStore";
   10: import {
   11:   recoverWorldState,
   12: } from "./recovery";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 21

```text
   18: } from "./domainProjectors";
   19: import type {
   20:   WorldStateRecoveryResult,
>  21: } from "./snapshotTypes";
   22: 
   23: export interface StartChernobogWorldStateRuntimeOptions {
   24:   eventBus: Pick<
```

### lib\chernobog\worldState\runtimeIntegration.ts line 23

```text
   20:   WorldStateRecoveryResult,
   21: } from "./snapshotTypes";
   22: 
>  23: export interface StartChernobogWorldStateRuntimeOptions {
   24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "subscribe" | "replay"
```

### lib\chernobog\worldState\runtimeIntegration.ts line 31

```text
   28:   engine?:
   29:     ChernobogWorldStateProjectionEngine;
   30:   store?:
>  31:     JsonWorldStateSnapshotStore;
   32:   clock?: () => Date;
   33: }
   34: 
```

### lib\chernobog\worldState\runtimeIntegration.ts line 35

```text
   32:   clock?: () => Date;
   33: }
   34: 
>  35: export interface ChernobogWorldStateRuntime {
   36:   engine:
   37:     ChernobogWorldStateProjectionEngine;
   38:   store:
```

### lib\chernobog\worldState\runtimeIntegration.ts line 39

```text
   36:   engine:
   37:     ChernobogWorldStateProjectionEngine;
   38:   store:
>  39:     JsonWorldStateSnapshotStore;
   40:   recovery:
   41:     WorldStateRecoveryResult;
   42:   flush(): Promise<void>;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 46

```text
   43:   stop(): Promise<void>;
   44: }
   45: 
>  46: export async function startChernobogWorldStateRuntime(
   47:   options:
   48:     StartChernobogWorldStateRuntimeOptions,
   49: ): Promise<ChernobogWorldStateRuntime> {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 60

```text
   57: 
   58:   const store =
   59:     options.store ??
>  60:     new JsonWorldStateSnapshotStore();
   61: 
   62:   const unregisterProjectors =
   63:     registerChernobogDomainProjectors(
```

### lib\chernobog\worldState\runtimeIntegration.ts line 76

```text
   73:       persistenceChain =
   74:         persistenceChain.then(
   75:           async () => {
>  76:             const snapshot =
   77:               buildWorldStateSnapshot(
   78:                 engine.worldState.snapshot(),
   79:                 clock(),
```

### lib\chernobog\worldState\runtimeIntegration.ts line 77

```text
   74:         persistenceChain.then(
   75:           async () => {
   76:             const snapshot =
>  77:               buildWorldStateSnapshot(
   78:                 engine.worldState.snapshot(),
   79:                 clock(),
   80:               );
```

### lib\chernobog\worldState\runtimeIntegration.ts line 78

```text
   75:           async () => {
   76:             const snapshot =
   77:               buildWorldStateSnapshot(
>  78:                 engine.worldState.snapshot(),
   79:                 clock(),
   80:               );
   81: 
```

### lib\chernobog\worldState\runtimeIntegration.ts line 82

```text
   79:                 clock(),
   80:               );
   81: 
>  82:             await store.save(snapshot);
   83:           },
   84:         );
   85: 
```

### lib\chernobog\worldState\runtimeSingleton.ts line 18

```text
   15: const worldStateGlobals =
   16:   globalThis as WorldStateRuntimeGlobals;
   17: 
>  18: export function getChernobogWorldStateRuntime():
   19:   Promise<ChernobogWorldStateRuntime> {
   20:   if (
   21:     !worldStateGlobals
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 7

```text
    4:   assertWorldStateRecord,
    5: } from "./validation";
    6: import {
>   7:   CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
    8:   type WorldStateSnapshot,
    9: } from "./snapshotTypes";
   10: import type { WorldStateRecord } from "./types";
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 8

```text
    5: } from "./validation";
    6: import {
    7:   CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
>   8:   type WorldStateSnapshot,
    9: } from "./snapshotTypes";
   10: import type { WorldStateRecord } from "./types";
   11: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 9

```text
    6: import {
    7:   CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
    8:   type WorldStateSnapshot,
>   9: } from "./snapshotTypes";
   10: import type { WorldStateRecord } from "./types";
   11: 
   12: function requireIsoTimestamp(
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 23

```text
   20:   return parsed.toISOString();
   21: }
   22: 
>  23: export function hashWorldStateRecords(
   24:   records: readonly WorldStateRecord[],
   25: ): string {
   26:   return createHash("sha256")
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 31

```text
   28:     .digest("hex");
   29: }
   30: 
>  31: export function buildWorldStateSnapshot(
   32:   records: readonly WorldStateRecord[],
   33:   now = new Date(),
   34: ): WorldStateSnapshot {
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 34

```text
   31: export function buildWorldStateSnapshot(
   32:   records: readonly WorldStateRecord[],
   33:   now = new Date(),
>  34: ): WorldStateSnapshot {
   35:   const cloned = structuredClone(records) as WorldStateRecord[];
   36: 
   37:   for (const record of cloned) {
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 43

```text
   40: 
   41:   return {
   42:     schemaVersion:
>  43:       CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
   44:     createdAt: now.toISOString(),
   45:     recordCount: cloned.length,
   46:     recordsSha256: hashWorldStateRecords(cloned),
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 51

```text
   48:   };
   49: }
   50: 
>  51: export function assertWorldStateSnapshot(
   52:   value: unknown,
   53: ): asserts value is WorldStateSnapshot {
   54:   if (!value || typeof value !== "object") {
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 53

```text
   50: 
   51: export function assertWorldStateSnapshot(
   52:   value: unknown,
>  53: ): asserts value is WorldStateSnapshot {
   54:   if (!value || typeof value !== "object") {
   55:     throw new Error("worldState snapshot must be an object.");
   56:   }
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 55

```text
   52:   value: unknown,
   53: ): asserts value is WorldStateSnapshot {
   54:   if (!value || typeof value !== "object") {
>  55:     throw new Error("worldState snapshot must be an object.");
   56:   }
   57: 
   58:   const snapshot = value as Partial<WorldStateSnapshot>;
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 58

```text
   55:     throw new Error("worldState snapshot must be an object.");
   56:   }
   57: 
>  58:   const snapshot = value as Partial<WorldStateSnapshot>;
   59: 
   60:   if (
   61:     snapshot.schemaVersion !==
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 61

```text
   58:   const snapshot = value as Partial<WorldStateSnapshot>;
   59: 
   60:   if (
>  61:     snapshot.schemaVersion !==
   62:     CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION
   63:   ) {
   64:     throw new Error(
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 62

```text
   59: 
   60:   if (
   61:     snapshot.schemaVersion !==
>  62:     CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION
   63:   ) {
   64:     throw new Error(
   65:       "worldState snapshot has an unsupported schema version.",
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 65

```text
   62:     CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION
   63:   ) {
   64:     throw new Error(
>  65:       "worldState snapshot has an unsupported schema version.",
   66:     );
   67:   }
   68: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 70

```text
   67:   }
   68: 
   69:   const createdAt = requireIsoTimestamp(
>  70:     String(snapshot.createdAt ?? ""),
   71:     "worldState.snapshot.createdAt",
   72:   );
   73: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 71

```text
   68: 
   69:   const createdAt = requireIsoTimestamp(
   70:     String(snapshot.createdAt ?? ""),
>  71:     "worldState.snapshot.createdAt",
   72:   );
   73: 
   74:   if (!Array.isArray(snapshot.records)) {
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 74

```text
   71:     "worldState.snapshot.createdAt",
   72:   );
   73: 
>  74:   if (!Array.isArray(snapshot.records)) {
   75:     throw new Error(
   76:       "worldState snapshot records must be an array.",
   77:     );
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 76

```text
   73: 
   74:   if (!Array.isArray(snapshot.records)) {
   75:     throw new Error(
>  76:       "worldState snapshot records must be an array.",
   77:     );
   78:   }
   79: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 80

```text
   77:     );
   78:   }
   79: 
>  80:   const recordCount = snapshot.recordCount;
   81: 
   82:   if (
   83:     typeof recordCount !== "number" ||
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 86

```text
   83:     typeof recordCount !== "number" ||
   84:     !Number.isInteger(recordCount) ||
   85:     recordCount < 0 ||
>  86:     recordCount !== snapshot.records.length
   87:   ) {
   88:     throw new Error(
   89:       "worldState snapshot recordCount does not match records.",
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 89

```text
   86:     recordCount !== snapshot.records.length
   87:   ) {
   88:     throw new Error(
>  89:       "worldState snapshot recordCount does not match records.",
   90:     );
   91:   }
   92: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 94

```text
   91:   }
   92: 
   93:   if (
>  94:     typeof snapshot.recordsSha256 !== "string" ||
   95:     !/^[a-f0-9]{64}$/.test(snapshot.recordsSha256)
   96:   ) {
   97:     throw new Error(
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 95

```text
   92: 
   93:   if (
   94:     typeof snapshot.recordsSha256 !== "string" ||
>  95:     !/^[a-f0-9]{64}$/.test(snapshot.recordsSha256)
   96:   ) {
   97:     throw new Error(
   98:       "worldState snapshot recordsSha256 must be a SHA-256 digest.",
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 98

```text
   95:     !/^[a-f0-9]{64}$/.test(snapshot.recordsSha256)
   96:   ) {
   97:     throw new Error(
>  98:       "worldState snapshot recordsSha256 must be a SHA-256 digest.",
   99:     );
  100:   }
  101: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 102

```text
   99:     );
  100:   }
  101: 
> 102:   for (const record of snapshot.records) {
  103:     assertWorldStateRecord(record);
  104:   }
  105: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 107

```text
  104:   }
  105: 
  106:   const actualDigest = hashWorldStateRecords(
> 107:     snapshot.records,
  108:   );
  109: 
  110:   if (actualDigest !== snapshot.recordsSha256) {
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 110

```text
  107:     snapshot.records,
  108:   );
  109: 
> 110:   if (actualDigest !== snapshot.recordsSha256) {
  111:     throw new Error(
  112:       "worldState snapshot integrity digest does not match records.",
  113:     );
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 112

```text
  109: 
  110:   if (actualDigest !== snapshot.recordsSha256) {
  111:     throw new Error(
> 112:       "worldState snapshot integrity digest does not match records.",
  113:     );
  114:   }
  115: 
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 116

```text
  113:     );
  114:   }
  115: 
> 116:   snapshot.createdAt = createdAt;
  117: }
  118: 
```

### lib\chernobog\worldState\snapshotQuery.ts line 2

```text
    1: import {
>   2:   ChernobogWorldStateQueryService,
    3: } from "./queryService";
    4: import {
    5:   ChernobogWorldStateRegistry,
```

### lib\chernobog\worldState\snapshotQuery.ts line 3

```text
    1: import {
    2:   ChernobogWorldStateQueryService,
>   3: } from "./queryService";
    4: import {
    5:   ChernobogWorldStateRegistry,
    6: } from "./registry";
```

### lib\chernobog\worldState\snapshotQuery.ts line 8

```text
    5:   ChernobogWorldStateRegistry,
    6: } from "./registry";
    7: import {
>   8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import type {
   11:   PersistedWorldStateReadResult,
```

### lib\chernobog\worldState\snapshotQuery.ts line 9

```text
    6: } from "./registry";
    7: import {
    8:   JsonWorldStateSnapshotStore,
>   9: } from "./snapshotStore";
   10: import type {
   11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
```

### lib\chernobog\worldState\snapshotQuery.ts line 12

```text
    9: } from "./snapshotStore";
   10: import type {
   11:   PersistedWorldStateReadResult,
>  12:   WorldStateReadQuery,
   13: } from "./queryTypes";
   14: 
   15: export interface QueryPersistedWorldStateOptions {
```

### lib\chernobog\worldState\snapshotQuery.ts line 13

```text
   10: import type {
   11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
>  13: } from "./queryTypes";
   14: 
   15: export interface QueryPersistedWorldStateOptions {
   16:   query?: WorldStateReadQuery;
```

### lib\chernobog\worldState\snapshotQuery.ts line 15

```text
   12:   WorldStateReadQuery,
   13: } from "./queryTypes";
   14: 
>  15: export interface QueryPersistedWorldStateOptions {
   16:   query?: WorldStateReadQuery;
   17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
```

### lib\chernobog\worldState\snapshotQuery.ts line 16

```text
   13: } from "./queryTypes";
   14: 
   15: export interface QueryPersistedWorldStateOptions {
>  16:   query?: WorldStateReadQuery;
   17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
   19: }
```

### lib\chernobog\worldState\snapshotQuery.ts line 17

```text
   14: 
   15: export interface QueryPersistedWorldStateOptions {
   16:   query?: WorldStateReadQuery;
>  17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
   19: }
   20: 
```

### lib\chernobog\worldState\snapshotQuery.ts line 21

```text
   18:   now?: () => Date;
   19: }
   20: 
>  21: export async function queryPersistedWorldState(
   22:   options:
   23:     QueryPersistedWorldStateOptions = {},
   24: ): Promise<PersistedWorldStateReadResult> {
```

### lib\chernobog\worldState\snapshotQuery.ts line 23

```text
   20: 
   21: export async function queryPersistedWorldState(
   22:   options:
>  23:     QueryPersistedWorldStateOptions = {},
   24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
   26:     options.store ??
```

### lib\chernobog\worldState\snapshotQuery.ts line 27

```text
   24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
   26:     options.store ??
>  27:     new JsonWorldStateSnapshotStore();
   28: 
   29:   const clock =
   30:     options.now ??
```

### lib\chernobog\worldState\snapshotQuery.ts line 43

```text
   40:       status: "missing",
   41:       generatedAt:
   42:         clock().toISOString(),
>  43:       snapshotPath:
   44:         store.filePath,
   45:     };
   46:   }
```

### lib\chernobog\worldState\snapshotQuery.ts line 54

```text
   51:     );
   52: 
   53:   registry.replace(
>  54:     loaded.snapshot.records,
   55:   );
   56: 
   57:   const service =
```

### lib\chernobog\worldState\snapshotQuery.ts line 58

```text
   55:   );
   56: 
   57:   const service =
>  58:     new ChernobogWorldStateQueryService(
   59:       registry,
   60:       clock,
   61:     );
```

### lib\chernobog\worldState\snapshotQuery.ts line 67

```text
   64:     status: "loaded",
   65:     generatedAt:
   66:       clock().toISOString(),
>  67:     snapshotPath:
   68:       store.filePath,
   69:     snapshotCreatedAt:
   70:       loaded.snapshot.createdAt,
```

### lib\chernobog\worldState\snapshotQuery.ts line 69

```text
   66:       clock().toISOString(),
   67:     snapshotPath:
   68:       store.filePath,
>  69:     snapshotCreatedAt:
   70:       loaded.snapshot.createdAt,
   71:     result:
   72:       service.read(
```

### lib\chernobog\worldState\snapshotQuery.ts line 70

```text
   67:     snapshotPath:
   68:       store.filePath,
   69:     snapshotCreatedAt:
>  70:       loaded.snapshot.createdAt,
   71:     result:
   72:       service.read(
   73:         options.query,
```

### lib\chernobog\worldState\snapshotQuery.ts line 73

```text
   70:       loaded.snapshot.createdAt,
   71:     result:
   72:       service.read(
>  73:         options.query,
   74:         "snapshot",
   75:       ),
   76:     diagnostics:
```

### lib\chernobog\worldState\snapshotQuery.ts line 74

```text
   71:     result:
   72:       service.read(
   73:         options.query,
>  74:         "snapshot",
   75:       ),
   76:     diagnostics:
   77:       service.diagnostics(),
```

### lib\chernobog\worldState\snapshotStore.ts line 10

```text
    7: import path from "node:path";
    8: 
    9: import {
>  10:   assertWorldStateSnapshot,
   11: } from "./snapshotIntegrity";
   12: import type {
   13:   WorldStateSnapshot,
```

### lib\chernobog\worldState\snapshotStore.ts line 11

```text
    8: 
    9: import {
   10:   assertWorldStateSnapshot,
>  11: } from "./snapshotIntegrity";
   12: import type {
   13:   WorldStateSnapshot,
   14:   WorldStateSnapshotLoadResult,
```

### lib\chernobog\worldState\snapshotStore.ts line 13

```text
   10:   assertWorldStateSnapshot,
   11: } from "./snapshotIntegrity";
   12: import type {
>  13:   WorldStateSnapshot,
   14:   WorldStateSnapshotLoadResult,
   15: } from "./snapshotTypes";
   16: 
```

### lib\chernobog\worldState\snapshotStore.ts line 14

```text
   11: } from "./snapshotIntegrity";
   12: import type {
   13:   WorldStateSnapshot,
>  14:   WorldStateSnapshotLoadResult,
   15: } from "./snapshotTypes";
   16: 
   17: export class WorldStateSnapshotCorruptionError extends Error {
```

### lib\chernobog\worldState\snapshotStore.ts line 15

```text
   12: import type {
   13:   WorldStateSnapshot,
   14:   WorldStateSnapshotLoadResult,
>  15: } from "./snapshotTypes";
   16: 
   17: export class WorldStateSnapshotCorruptionError extends Error {
   18:   readonly originalCause?: unknown;
```

### lib\chernobog\worldState\snapshotStore.ts line 17

```text
   14:   WorldStateSnapshotLoadResult,
   15: } from "./snapshotTypes";
   16: 
>  17: export class WorldStateSnapshotCorruptionError extends Error {
   18:   readonly originalCause?: unknown;
   19: 
   20:   constructor(
```

### lib\chernobog\worldState\snapshotStore.ts line 25

```text
   22:     originalCause?: unknown,
   23:   ) {
   24:     super(message);
>  25:     this.name = "WorldStateSnapshotCorruptionError";
   26:     this.originalCause = originalCause;
   27:   }
   28: }
```

### lib\chernobog\worldState\snapshotStore.ts line 30

```text
   27:   }
   28: }
   29: 
>  30: export interface JsonWorldStateSnapshotStoreOptions {
   31:   filePath?: string;
   32:   quarantineDirectory?: string;
   33: }
```

### lib\chernobog\worldState\snapshotStore.ts line 35

```text
   32:   quarantineDirectory?: string;
   33: }
   34: 
>  35: function defaultSnapshotPath(): string {
   36:   return path.join(
   37:     process.cwd(),
   38:     "data",
```

### lib\chernobog\worldState\snapshotStore.ts line 41

```text
   38:     "data",
   39:     "chernobog",
   40:     "world-state",
>  41:     "current.json",
   42:   );
   43: }
   44: 
```

### lib\chernobog\worldState\snapshotStore.ts line 60

```text
   57:     .replace(/[:.]/g, "-");
   58: }
   59: 
>  60: export class JsonWorldStateSnapshotStore {
   61:   readonly filePath: string;
   62:   readonly quarantineDirectory: string;
   63: 
```

### lib\chernobog\worldState\snapshotStore.ts line 65

```text
   62:   readonly quarantineDirectory: string;
   63: 
   64:   constructor(
>  65:     options: JsonWorldStateSnapshotStoreOptions = {},
   66:   ) {
   67:     this.filePath =
   68:       options.filePath ?? defaultSnapshotPath();
```

### lib\chernobog\worldState\snapshotStore.ts line 68

```text
   65:     options: JsonWorldStateSnapshotStoreOptions = {},
   66:   ) {
   67:     this.filePath =
>  68:       options.filePath ?? defaultSnapshotPath();
   69: 
   70:     this.quarantineDirectory =
   71:       options.quarantineDirectory ??
```

### lib\chernobog\worldState\snapshotStore.ts line 78

```text
   75:       );
   76:   }
   77: 
>  78:   async load(): Promise<WorldStateSnapshotLoadResult> {
   79:     let raw: string;
   80: 
   81:     try {
```

### lib\chernobog\worldState\snapshotStore.ts line 99

```text
   96: 
   97:     try {
   98:       parsed = JSON.parse(raw);
>  99:       assertWorldStateSnapshot(parsed);
  100:     } catch (error) {
  101:       throw new WorldStateSnapshotCorruptionError(
  102:         `World State snapshot is corrupt: ${
```

### lib\chernobog\worldState\snapshotStore.ts line 101

```text
   98:       parsed = JSON.parse(raw);
   99:       assertWorldStateSnapshot(parsed);
  100:     } catch (error) {
> 101:       throw new WorldStateSnapshotCorruptionError(
  102:         `World State snapshot is corrupt: ${
  103:           error instanceof Error
  104:             ? error.message
```

### lib\chernobog\worldState\snapshotStore.ts line 102

```text
   99:       assertWorldStateSnapshot(parsed);
  100:     } catch (error) {
  101:       throw new WorldStateSnapshotCorruptionError(
> 102:         `World State snapshot is corrupt: ${
  103:           error instanceof Error
  104:             ? error.message
  105:             : String(error)
```

### lib\chernobog\worldState\snapshotStore.ts line 113

```text
  110: 
  111:     return {
  112:       status: "loaded",
> 113:       snapshot: parsed,
  114:     };
  115:   }
  116: 
```

### lib\chernobog\worldState\snapshotStore.ts line 118

```text
  115:   }
  116: 
  117:   async save(
> 118:     snapshot: WorldStateSnapshot,
  119:   ): Promise<void> {
  120:     assertWorldStateSnapshot(snapshot);
  121: 
```

### lib\chernobog\worldState\snapshotStore.ts line 120

```text
  117:   async save(
  118:     snapshot: WorldStateSnapshot,
  119:   ): Promise<void> {
> 120:     assertWorldStateSnapshot(snapshot);
  121: 
  122:     const directory =
  123:       path.dirname(this.filePath);
```

### lib\chernobog\worldState\snapshotStore.ts line 133

```text
  130:       `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
  131: 
  132:     const body =
> 133:       `${JSON.stringify(snapshot, null, 2)}\n`;
  134: 
  135:     try {
  136:       await writeFile(
```

### lib\chernobog\worldState\snapshotStore.ts line 166

```text
  163:     }
  164:   }
  165: 
> 166:   async quarantineCorruptSnapshot(
  167:     now = new Date(),
  168:   ): Promise<string | undefined> {
  169:     await mkdir(
```

### lib\chernobog\worldState\snapshotTypes.ts line 3

```text
    1: import type { WorldStateRecord } from "./types";
    2: 
>   3: export const CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION = 1 as const;
    4: 
    5: export interface WorldStateSnapshot {
    6:   schemaVersion: typeof CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION;
```

### lib\chernobog\worldState\snapshotTypes.ts line 5

```text
    2: 
    3: export const CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION = 1 as const;
    4: 
>   5: export interface WorldStateSnapshot {
    6:   schemaVersion: typeof CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION;
    7:   createdAt: string;
    8:   recordCount: number;
```

### lib\chernobog\worldState\snapshotTypes.ts line 6

```text
    3: export const CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION = 1 as const;
    4: 
    5: export interface WorldStateSnapshot {
>   6:   schemaVersion: typeof CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION;
    7:   createdAt: string;
    8:   recordCount: number;
    9:   recordsSha256: string;
```

### lib\chernobog\worldState\snapshotTypes.ts line 13

```text
   10:   records: WorldStateRecord[];
   11: }
   12: 
>  13: export type WorldStateSnapshotLoadResult =
   14:   | {
   15:       status: "missing";
   16:     }
```

### lib\chernobog\worldState\snapshotTypes.ts line 19

```text
   16:     }
   17:   | {
   18:       status: "loaded";
>  19:       snapshot: WorldStateSnapshot;
   20:     };
   21: 
   22: export type WorldStateRecoveryMode =
```

### lib\chernobog\worldState\snapshotTypes.ts line 22

```text
   19:       snapshot: WorldStateSnapshot;
   20:     };
   21: 
>  22: export type WorldStateRecoveryMode =
   23:   | "snapshot-restored"
   24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
```

### lib\chernobog\worldState\snapshotTypes.ts line 23

```text
   20:     };
   21: 
   22: export type WorldStateRecoveryMode =
>  23:   | "snapshot-restored"
   24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
```

### lib\chernobog\worldState\snapshotTypes.ts line 24

```text
   21: 
   22: export type WorldStateRecoveryMode =
   23:   | "snapshot-restored"
>  24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
   27: 
```

### lib\chernobog\worldState\snapshotTypes.ts line 26

```text
   23:   | "snapshot-restored"
   24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
>  26:   | "corrupt-snapshot-rebuilt";
   27: 
   28: export interface WorldStateRecoveryResult {
   29:   mode: WorldStateRecoveryMode;
```

### lib\chernobog\worldState\snapshotTypes.ts line 28

```text
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
   27: 
>  28: export interface WorldStateRecoveryResult {
   29:   mode: WorldStateRecoveryMode;
   30:   restoredRecords: number;
   31:   replayedEvents: number;
```

### lib\chernobog\worldState\snapshotTypes.ts line 35

```text
   32:   catchUpEvents: number;
   33:   stateRecords: number;
   34:   quarantinedPath?: string;
>  35:   persistedSnapshotPath: string;
   36: }
```

### lib\chernobog\worldState\types.ts line 3

```text
    1: import type { ChernobogEventSource } from "../events/types";
    2: 
>   3: export const CHERNOBOG_WORLD_STATE_SCHEMA_VERSION = 1 as const;
    4: 
    5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
```

### lib\chernobog\worldState\types.ts line 5

```text
    2: 
    3: export const CHERNOBOG_WORLD_STATE_SCHEMA_VERSION = 1 as const;
    4: 
>   5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
    7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
```

### lib\chernobog\worldState\types.ts line 7

```text
    4: 
    5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
>   7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
    9:   | WorldStateJsonValue[]
   10:   | { [key: string]: WorldStateJsonValue };
```

### lib\chernobog\worldState\types.ts line 12

```text
    9:   | WorldStateJsonValue[]
   10:   | { [key: string]: WorldStateJsonValue };
   11: 
>  12: export type WorldStateFreshnessStatus =
   13:   | "fresh"
   14:   | "aging"
   15:   | "stale"
```

### lib\chernobog\worldState\types.ts line 18

```text
   15:   | "stale"
   16:   | "unknown";
   17: 
>  18: export type WorldStateFreshnessBasis =
   19:   | "explicit-expiry"
   20:   | "event-expiry"
   21:   | "ttl"
```

### lib\chernobog\worldState\types.ts line 24

```text
   21:   | "ttl"
   22:   | "none";
   23: 
>  24: export interface WorldStateFreshness {
   25:   status: WorldStateFreshnessStatus;
   26:   basis: WorldStateFreshnessBasis;
   27:   expiresAt?: string;
```

### lib\chernobog\worldState\types.ts line 32

```text
   29:   evaluatedAt: string;
   30: }
   31: 
>  32: export type WorldStateConfidenceBasis =
   33:   | "projector"
   34:   | "event"
   35:   | "record"
```

### lib\chernobog\worldState\types.ts line 38

```text
   35:   | "record"
   36:   | "default";
   37: 
>  38: export type WorldStateConfidenceBand = "high" | "medium" | "low";
   39: 
   40: export type WorldStateProvenanceStatus =
   41:   | "complete"
```

### lib\chernobog\worldState\types.ts line 40

```text
   37: 
   38: export type WorldStateConfidenceBand = "high" | "medium" | "low";
   39: 
>  40: export type WorldStateProvenanceStatus =
   41:   | "complete"
   42:   | "partial"
   43:   | "absent";
```

### lib\chernobog\worldState\types.ts line 45

```text
   42:   | "partial"
   43:   | "absent";
   44: 
>  45: export interface WorldStateProvenance {
   46:   eventId?: string;
   47:   eventType?: string;
   48:   eventOccurredAt?: string;
```

### lib\chernobog\worldState\types.ts line 58

```text
   55:   source?: ChernobogEventSource;
   56: }
   57: 
>  58: export interface WorldStateRecord<
   59:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   60: > {
   61:   schemaVersion: typeof CHERNOBOG_WORLD_STATE_SCHEMA_VERSION;
```

### lib\chernobog\worldState\types.ts line 73

```text
   70:   provenance?: WorldStateProvenance;
   71: }
   72: 
>  73: export interface WorldStateRecordInput<
   74:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   75: > {
   76:   key: string;
```

### lib\chernobog\worldState\types.ts line 89

```text
   86:   provenance?: WorldStateProvenance;
   87: }
   88: 
>  89: export interface WorldStateQuery {
   90:   namespace?: string;
   91:   keyPrefix?: string;
   92:   freshness?: WorldStateFreshnessStatus[];
```

### lib\chernobog\worldState\types.ts line 96

```text
   93:   minConfidence?: number;
   94: }
   95: 
>  96: export interface WorldStateUpsertResult<
   97:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   98: > {
   99:   record: WorldStateRecord<TValue>;
```

### lib\chernobog\worldState\types.ts line 104

```text
  101:   reason: "created" | "updated" | "older-observation" | "same-observation";
  102: }
  103: 
> 104: export interface WorldStateEvidenceAssessment {
  105:   key: string;
  106:   observedAt: string;
  107:   ageMs: number;
```

### lib\chernobog\worldState\validation.ts line 2

```text
    1: import {
>   2:   getWorldStateNamespace,
    3:   isValidWorldStateIdentifier,
    4:   isValidWorldStateKey,
    5: } from "./keys";
```

### lib\chernobog\worldState\validation.ts line 163

```text
  160:   };
  161: }
  162: 
> 163: export function createWorldStateRecord<
  164:   TValue extends WorldStateJsonValue,
  165: >(
  166:   input: WorldStateRecordInput<TValue>,
```

### lib\chernobog\worldState\validation.ts line 177

```text
  174:     );
  175:   }
  176: 
> 177:   const derivedNamespace = getWorldStateNamespace(key);
  178:   const namespace =
  179:     input.namespace?.trim() || derivedNamespace;
  180: 
```

### lib\chernobog\worldState\validation.ts line 260

```text
  257:   };
  258: }
  259: 
> 260: export function assertWorldStateRecord(
  261:   value: unknown,
  262: ): asserts value is WorldStateRecord {
  263:   if (!value || typeof value !== "object") {
```


## World State persistence and recovery paths

Pattern: `snapshotStore|persist|recover|writeFile|readFile|json|storage|path\.join|process\.cwd`

### lib\chernobog\worldState\domainProjectors.ts line 3

```text
    1: import type { ChernobogEvent } from "../events/types";
    2: import type {
>   3:   WorldStateJsonValue,
    4: } from "./types";
    5: import type {
    6:   WorldStateProjection,
    7:   WorldStateProjector,
```

### lib\chernobog\worldState\domainProjectors.ts line 16

```text
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
   15:   "backup",
>  16:   "storage",
   17:   "execution",
   18: ]);
   19: 
   20: function canonicalSegment(
```

### lib\chernobog\worldState\domainProjectors.ts line 45

```text
   41:     ? event.payload as Record<string, unknown>
   42:     : {};
   43: }
   44: 
>  45: function jsonSafe(
   46:   value: unknown,
   47:   seen = new WeakSet<object>(),
   48: ): WorldStateJsonValue {
   49:   if (
```

### lib\chernobog\worldState\domainProjectors.ts line 48

```text
   44: 
   45: function jsonSafe(
   46:   value: unknown,
   47:   seen = new WeakSet<object>(),
>  48: ): WorldStateJsonValue {
   49:   if (
   50:     value === null ||
   51:     typeof value === "string" ||
   52:     typeof value === "boolean"
```

### lib\chernobog\worldState\domainProjectors.ts line 81

```text
   77:   }
   78: 
   79:   if (Array.isArray(value)) {
   80:     return value.map((entry) =>
>  81:       jsonSafe(entry, seen),
   82:     );
   83:   }
   84: 
   85:   if (typeof value === "object") {
```

### lib\chernobog\worldState\domainProjectors.ts line 93

```text
   89: 
   90:     seen.add(value);
   91: 
   92:     const result:
>  93:       Record<string, WorldStateJsonValue> = {};
   94: 
   95:     for (const [key, entry] of Object.entries(value)) {
   96:       result[key] = jsonSafe(
   97:         entry,
```

### lib\chernobog\worldState\domainProjectors.ts line 96

```text
   92:     const result:
   93:       Record<string, WorldStateJsonValue> = {};
   94: 
   95:     for (const [key, entry] of Object.entries(value)) {
>  96:       result[key] = jsonSafe(
   97:         entry,
   98:         seen,
   99:       );
  100:     }
```

### lib\chernobog\worldState\domainProjectors.ts line 162

```text
  158: }
  159: 
  160: function commonObservation(
  161:   event: ChernobogEvent,
> 162: ): WorldStateJsonValue {
  163:   return {
  164:     eventType:
  165:       event.type,
  166:     severity:
```

### lib\chernobog\worldState\domainProjectors.ts line 173

```text
  169:       event.subject ?? null,
  170:     scope:
  171:       event.scope ?? null,
  172:     payload:
> 173:       jsonSafe(event.payload),
  174:   };
  175: }
  176: 
  177: function statusFromServiceEvent(
```

### lib\chernobog\worldState\domainProjectors.ts line 182

```text
  178:   type: string,
  179: ): string | undefined {
  180:   switch (type) {
  181:     case "service.healthy":
> 182:     case "service.recovered":
  183:       return "healthy";
  184:     case "service.degraded":
  185:       return "degraded";
  186:     case "service.failed":
```

### lib\chernobog\worldState\domainProjectors.ts line 248

```text
  244:           {
  245:             key:
  246:               `${base}.observation`,
  247:             value:
> 248:               jsonSafe(event.payload),
  249:             observedAt,
  250:             ttlMs:
  251:               300_000,
  252:           },
```

### lib\chernobog\worldState\domainProjectors.ts line 280

```text
  276:     eventTypes: [
  277:       "service.healthy",
  278:       "service.degraded",
  279:       "service.failed",
> 280:       "service.recovered",
  281:     ],
  282:     project(event) {
  283:       const status =
  284:         statusFromServiceEvent(
```

### lib\chernobog\worldState\domainProjectors.ts line 308

```text
  304:         {
  305:           key:
  306:             `service.${service}.observation`,
  307:           value:
> 308:             jsonSafe(event.payload),
  309:           ttlMs:
  310:             300_000,
  311:         },
  312:       ];
```

### lib\chernobog\worldState\domainProjectors.ts line 343

```text
  339:         {
  340:           key:
  341:             `runtime.node.${node}.observation`,
  342:           value:
> 343:             jsonSafe(event.payload),
  344:           ttlMs:
  345:             300_000,
  346:         },
  347:       ];
```

### lib\chernobog\worldState\domainProjectors.ts line 378

```text
  374:         {
  375:           key:
  376:             `model.${model}.observation`,
  377:           value:
> 378:             jsonSafe(event.payload),
  379:           ttlMs:
  380:             300_000,
  381:         },
  382:       ];
```

### lib\chernobog\worldState\domainProjectors.ts line 416

```text
  412:           {
  413:             key:
  414:               `model.role.${role}.assignment`,
  415:             value:
> 416:               jsonSafe(event.payload),
  417:             ttlMs:
  418:               300_000,
  419:           },
  420:         ];
```

### lib\chernobog\worldState\domainProjectors.ts line 478

```text
  474:           {
  475:             key:
  476:               `project.${project}.git.snapshot`,
  477:             value:
> 478:               jsonSafe(event.payload),
  479:             ttlMs:
  480:               300_000,
  481:           },
  482:           {
```

### lib\chernobog\worldState\domainProjectors.ts line 596

```text
  592:         {
  593:           key:
  594:             `project.validation.${validation}.result`,
  595:           value:
> 596:             jsonSafe(event.payload),
  597:           ttlMs:
  598:             900_000,
  599:         },
  600:       ];
```

### lib\chernobog\worldState\domainProjectors.ts line 640

```text
  636:         {
  637:           key:
  638:             `execution.tool.${tool}.last-result`,
  639:           value:
> 640:             jsonSafe(event.payload),
  641:           ttlMs:
  642:             300_000,
  643:         },
  644:       ];
```

### lib\chernobog\worldState\index.ts line 15

```text
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
>  15: export * from "./snapshotStore";
   16: export * from "./recovery";
   17: export * from "./queryTypes";
   18: export * from "./queryService";
   19: export * from "./httpQuery";
```

### lib\chernobog\worldState\index.ts line 16

```text
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
>  16: export * from "./recovery";
   17: export * from "./queryTypes";
   18: export * from "./queryService";
   19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
```

### lib\chernobog\worldState\keys.ts line 11

```text
    7:   "service",
    8:   "runtime",
    9:   "model",
   10:   "backup",
>  11:   "storage",
   12:   "desktop",
   13:   "execution",
   14:   "system",
   15: ] as const;
```

### lib\chernobog\worldState\projectorTypes.ts line 3

```text
    1: import type { ChernobogEvent } from "../events/types";
    2: import type {
>   3:   WorldStateJsonValue,
    4:   WorldStateRecordInput,
    5: } from "./types";
    6: 
    7: export interface WorldStateProjection<
```

### lib\chernobog\worldState\projectorTypes.ts line 8

```text
    4:   WorldStateRecordInput,
    5: } from "./types";
    6: 
    7: export interface WorldStateProjection<
>   8:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
    9: > extends Omit<
   10:     WorldStateRecordInput<TValue>,
   11:     | "observedAt"
   12:     | "confidence"
```

### lib\chernobog\worldState\queryTypes.ts line 65

```text
   61:   assessment?: WorldStateEvidenceAssessment;
   62:   evidence: string[];
   63: }
   64: 
>  65: export type PersistedWorldStateReadResult =
   66:   | {
   67:       status: "missing";
   68:       generatedAt: string;
   69:       snapshotPath: string;
```

### lib\chernobog\worldState\recovery.ts line 12

```text
    8: import {
    9:   buildWorldStateSnapshot,
   10: } from "./snapshotIntegrity";
   11: import {
>  12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
   14: } from "./snapshotStore";
   15: import type {
   16:   WorldStateRecoveryResult,
```

### lib\chernobog\worldState\recovery.ts line 14

```text
   10: } from "./snapshotIntegrity";
   11: import {
   12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
>  14: } from "./snapshotStore";
   15: import type {
   16:   WorldStateRecoveryResult,
   17: } from "./snapshotTypes";
   18: import {
```

### lib\chernobog\worldState\recovery.ts line 16

```text
   12:   JsonWorldStateSnapshotStore,
   13:   WorldStateSnapshotCorruptionError,
   14: } from "./snapshotStore";
   15: import type {
>  16:   WorldStateRecoveryResult,
   17: } from "./snapshotTypes";
   18: import {
   19:   ChernobogWorldStateProjectionEngine,
   20: } from "./projectionEngine";
```

### lib\chernobog\worldState\recovery.ts line 22

```text
   18: import {
   19:   ChernobogWorldStateProjectionEngine,
   20: } from "./projectionEngine";
   21: 
>  22: export interface RecoverWorldStateOptions {
   23:   engine: ChernobogWorldStateProjectionEngine;
   24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "replay"
```

### lib\chernobog\worldState\recovery.ts line 28

```text
   24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "replay"
   27:   >;
>  28:   store?: JsonWorldStateSnapshotStore;
   29:   now?: () => Date;
   30: }
   31: 
   32: function timestampMs(
```

### lib\chernobog\worldState\recovery.ts line 97

```text
   93:     catchUpEvents,
   94:   };
   95: }
   96: 
>  97: async function persistCurrentState(
   98:   engine: ChernobogWorldStateProjectionEngine,
   99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
  101: ): Promise<void> {
```

### lib\chernobog\worldState\recovery.ts line 99

```text
   95: }
   96: 
   97: async function persistCurrentState(
   98:   engine: ChernobogWorldStateProjectionEngine,
>  99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
  101: ): Promise<void> {
  102:   const snapshot =
  103:     buildWorldStateSnapshot(
```

### lib\chernobog\worldState\recovery.ts line 111

```text
  107: 
  108:   await store.save(snapshot);
  109: }
  110: 
> 111: export async function recoverWorldState(
  112:   options: RecoverWorldStateOptions,
  113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
  115:     options.store ??
```

### lib\chernobog\worldState\recovery.ts line 112

```text
  108:   await store.save(snapshot);
  109: }
  110: 
  111: export async function recoverWorldState(
> 112:   options: RecoverWorldStateOptions,
  113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
  115:     options.store ??
  116:     new JsonWorldStateSnapshotStore();
```

### lib\chernobog\worldState\recovery.ts line 113

```text
  109: }
  110: 
  111: export async function recoverWorldState(
  112:   options: RecoverWorldStateOptions,
> 113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
  115:     options.store ??
  116:     new JsonWorldStateSnapshotStore();
  117: 
```

### lib\chernobog\worldState\recovery.ts line 116

```text
  112:   options: RecoverWorldStateOptions,
  113: ): Promise<WorldStateRecoveryResult> {
  114:   const store =
  115:     options.store ??
> 116:     new JsonWorldStateSnapshotStore();
  117: 
  118:   const clock =
  119:     options.now ??
  120:     (() => new Date());
```

### lib\chernobog\worldState\recovery.ts line 125

```text
  121: 
  122:   let loaded:
  123:     | Awaited<
  124:         ReturnType<
> 125:           JsonWorldStateSnapshotStore["load"]
  126:         >
  127:       >
  128:     | undefined;
  129: 
```

### lib\chernobog\worldState\recovery.ts line 171

```text
  167:     if (
  168:       catchUp.failedEvents > 0
  169:     ) {
  170:       throw new Error(
> 171:         "World State catch-up replay failed; refusing to persist partial state.",
  172:       );
  173:     }
  174: 
  175:     await persistCurrentState(
```

### lib\chernobog\worldState\recovery.ts line 175

```text
  171:         "World State catch-up replay failed; refusing to persist partial state.",
  172:       );
  173:     }
  174: 
> 175:     await persistCurrentState(
  176:       options.engine,
  177:       store,
  178:       clock(),
  179:     );
```

### lib\chernobog\worldState\recovery.ts line 194

```text
  190:       catchUpEvents:
  191:         catchUp.catchUpEvents,
  192:       stateRecords:
  193:         options.engine.worldState.size,
> 194:       persistedSnapshotPath:
  195:         store.filePath,
  196:     };
  197:   }
  198: 
```

### lib\chernobog\worldState\recovery.ts line 209

```text
  205:   if (
  206:     rebuilt.failedEvents > 0
  207:   ) {
  208:     throw new Error(
> 209:       "World State history replay failed; refusing to persist partial state.",
  210:     );
  211:   }
  212: 
  213:   await persistCurrentState(
```

### lib\chernobog\worldState\recovery.ts line 213

```text
  209:       "World State history replay failed; refusing to persist partial state.",
  210:     );
  211:   }
  212: 
> 213:   await persistCurrentState(
  214:     options.engine,
  215:     store,
  216:     clock(),
  217:   );
```

### lib\chernobog\worldState\recovery.ts line 231

```text
  227:     catchUpEvents: 0,
  228:     stateRecords:
  229:       rebuilt.stateRecords,
  230:     quarantinedPath,
> 231:     persistedSnapshotPath:
  232:       store.filePath,
  233:   };
  234: }
```

### lib\chernobog\worldState\registry.ts line 7

```text
    3:   assertWorldStateRecord,
    4:   createWorldStateRecord,
    5: } from "./validation";
    6: import type {
>   7:   WorldStateJsonValue,
    8:   WorldStateQuery,
    9:   WorldStateRecord,
   10:   WorldStateRecordInput,
   11:   WorldStateUpsertResult,
```

### lib\chernobog\worldState\registry.ts line 64

```text
   60:   );
   61: }
   62: 
   63: function cloneRecord<
>  64:   TValue extends WorldStateJsonValue,
   65: >(
   66:   record: WorldStateRecord<TValue>,
   67: ): WorldStateRecord<TValue> {
   68:   return structuredClone(record);
```

### lib\chernobog\worldState\registry.ts line 89

```text
   85:   }
   86: 
   87:   get<
   88:     TValue extends
>  89:       WorldStateJsonValue = WorldStateJsonValue,
   90:   >(
   91:     key: string,
   92:   ): WorldStateRecord<TValue> | undefined {
   93:     const record = this.records.get(key);
```

### lib\chernobog\worldState\registry.ts line 107

```text
  103:     return this.records.has(key);
  104:   }
  105: 
  106:   upsert<
> 107:     TValue extends WorldStateJsonValue,
  108:   >(
  109:     input: WorldStateRecordInput<TValue>,
  110:   ): WorldStateUpsertResult<TValue> {
  111:     const now = this.clock();
```

### lib\chernobog\worldState\runtimeIntegration.ts line 8

```text
    4: import {
    5:   buildWorldStateSnapshot,
    6: } from "./snapshotIntegrity";
    7: import {
>   8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import {
   11:   recoverWorldState,
   12: } from "./recovery";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 9

```text
    5:   buildWorldStateSnapshot,
    6: } from "./snapshotIntegrity";
    7: import {
    8:   JsonWorldStateSnapshotStore,
>   9: } from "./snapshotStore";
   10: import {
   11:   recoverWorldState,
   12: } from "./recovery";
   13: import {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 11

```text
    7: import {
    8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import {
>  11:   recoverWorldState,
   12: } from "./recovery";
   13: import {
   14:   ChernobogWorldStateProjectionEngine,
   15: } from "./projectionEngine";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 12

```text
    8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import {
   11:   recoverWorldState,
>  12: } from "./recovery";
   13: import {
   14:   ChernobogWorldStateProjectionEngine,
   15: } from "./projectionEngine";
   16: import {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 20

```text
   16: import {
   17:   registerChernobogDomainProjectors,
   18: } from "./domainProjectors";
   19: import type {
>  20:   WorldStateRecoveryResult,
   21: } from "./snapshotTypes";
   22: 
   23: export interface StartChernobogWorldStateRuntimeOptions {
   24:   eventBus: Pick<
```

### lib\chernobog\worldState\runtimeIntegration.ts line 31

```text
   27:   >;
   28:   engine?:
   29:     ChernobogWorldStateProjectionEngine;
   30:   store?:
>  31:     JsonWorldStateSnapshotStore;
   32:   clock?: () => Date;
   33: }
   34: 
   35: export interface ChernobogWorldStateRuntime {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 39

```text
   35: export interface ChernobogWorldStateRuntime {
   36:   engine:
   37:     ChernobogWorldStateProjectionEngine;
   38:   store:
>  39:     JsonWorldStateSnapshotStore;
   40:   recovery:
   41:     WorldStateRecoveryResult;
   42:   flush(): Promise<void>;
   43:   stop(): Promise<void>;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 40

```text
   36:   engine:
   37:     ChernobogWorldStateProjectionEngine;
   38:   store:
   39:     JsonWorldStateSnapshotStore;
>  40:   recovery:
   41:     WorldStateRecoveryResult;
   42:   flush(): Promise<void>;
   43:   stop(): Promise<void>;
   44: }
```

### lib\chernobog\worldState\runtimeIntegration.ts line 41

```text
   37:     ChernobogWorldStateProjectionEngine;
   38:   store:
   39:     JsonWorldStateSnapshotStore;
   40:   recovery:
>  41:     WorldStateRecoveryResult;
   42:   flush(): Promise<void>;
   43:   stop(): Promise<void>;
   44: }
   45: 
```

### lib\chernobog\worldState\runtimeIntegration.ts line 60

```text
   56:     new ChernobogWorldStateProjectionEngine();
   57: 
   58:   const store =
   59:     options.store ??
>  60:     new JsonWorldStateSnapshotStore();
   61: 
   62:   const unregisterProjectors =
   63:     registerChernobogDomainProjectors(
   64:       engine,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 67

```text
   63:     registerChernobogDomainProjectors(
   64:       engine,
   65:     );
   66: 
>  67:   let persistenceChain:
   68:     Promise<void> =
   69:       Promise.resolve();
   70: 
   71:   const persist =
```

### lib\chernobog\worldState\runtimeIntegration.ts line 71

```text
   67:   let persistenceChain:
   68:     Promise<void> =
   69:       Promise.resolve();
   70: 
>  71:   const persist =
   72:     (): Promise<void> => {
   73:       persistenceChain =
   74:         persistenceChain.then(
   75:           async () => {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 73

```text
   69:       Promise.resolve();
   70: 
   71:   const persist =
   72:     (): Promise<void> => {
>  73:       persistenceChain =
   74:         persistenceChain.then(
   75:           async () => {
   76:             const snapshot =
   77:               buildWorldStateSnapshot(
```

### lib\chernobog\worldState\runtimeIntegration.ts line 74

```text
   70: 
   71:   const persist =
   72:     (): Promise<void> => {
   73:       persistenceChain =
>  74:         persistenceChain.then(
   75:           async () => {
   76:             const snapshot =
   77:               buildWorldStateSnapshot(
   78:                 engine.worldState.snapshot(),
```

### lib\chernobog\worldState\runtimeIntegration.ts line 86

```text
   82:             await store.save(snapshot);
   83:           },
   84:         );
   85: 
>  86:       return persistenceChain;
   87:     };
   88: 
   89:   let recovery:
   90:     WorldStateRecoveryResult;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 89

```text
   85: 
   86:       return persistenceChain;
   87:     };
   88: 
>  89:   let recovery:
   90:     WorldStateRecoveryResult;
   91: 
   92:   try {
   93:     recovery =
```

### lib\chernobog\worldState\runtimeIntegration.ts line 90

```text
   86:       return persistenceChain;
   87:     };
   88: 
   89:   let recovery:
>  90:     WorldStateRecoveryResult;
   91: 
   92:   try {
   93:     recovery =
   94:       await recoverWorldState({
```

### lib\chernobog\worldState\runtimeIntegration.ts line 93

```text
   89:   let recovery:
   90:     WorldStateRecoveryResult;
   91: 
   92:   try {
>  93:     recovery =
   94:       await recoverWorldState({
   95:         engine,
   96:         eventBus:
   97:           options.eventBus,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 94

```text
   90:     WorldStateRecoveryResult;
   91: 
   92:   try {
   93:     recovery =
>  94:       await recoverWorldState({
   95:         engine,
   96:         eventBus:
   97:           options.eventBus,
   98:         store,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 118

```text
  114:           return;
  115:         }
  116: 
  117:         engine.process(event);
> 118:         await persist();
  119:       },
  120:     );
  121: 
  122:   return {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 125

```text
  121: 
  122:   return {
  123:     engine,
  124:     store,
> 125:     recovery,
  126: 
  127:     async flush() {
  128:       await persistenceChain;
  129:     },
```

### lib\chernobog\worldState\runtimeIntegration.ts line 128

```text
  124:     store,
  125:     recovery,
  126: 
  127:     async flush() {
> 128:       await persistenceChain;
  129:     },
  130: 
  131:     async stop() {
  132:       if (stopped) {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 133

```text
  129:     },
  130: 
  131:     async stop() {
  132:       if (stopped) {
> 133:         await persistenceChain;
  134:         return;
  135:       }
  136: 
  137:       stopped = true;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 140

```text
  136: 
  137:       stopped = true;
  138:       unsubscribe();
  139:       unregisterProjectors();
> 140:       await persistenceChain;
  141:     },
  142:   };
  143: }
```

### lib\chernobog\worldState\snapshotIntegrity.ts line 27

```text
   23: export function hashWorldStateRecords(
   24:   records: readonly WorldStateRecord[],
   25: ): string {
   26:   return createHash("sha256")
>  27:     .update(JSON.stringify(records))
   28:     .digest("hex");
   29: }
   30: 
   31: export function buildWorldStateSnapshot(
```

### lib\chernobog\worldState\snapshotQuery.ts line 8

```text
    4: import {
    5:   ChernobogWorldStateRegistry,
    6: } from "./registry";
    7: import {
>   8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import type {
   11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
```

### lib\chernobog\worldState\snapshotQuery.ts line 9

```text
    5:   ChernobogWorldStateRegistry,
    6: } from "./registry";
    7: import {
    8:   JsonWorldStateSnapshotStore,
>   9: } from "./snapshotStore";
   10: import type {
   11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
   13: } from "./queryTypes";
```

### lib\chernobog\worldState\snapshotQuery.ts line 11

```text
    7: import {
    8:   JsonWorldStateSnapshotStore,
    9: } from "./snapshotStore";
   10: import type {
>  11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
   13: } from "./queryTypes";
   14: 
   15: export interface QueryPersistedWorldStateOptions {
```

### lib\chernobog\worldState\snapshotQuery.ts line 15

```text
   11:   PersistedWorldStateReadResult,
   12:   WorldStateReadQuery,
   13: } from "./queryTypes";
   14: 
>  15: export interface QueryPersistedWorldStateOptions {
   16:   query?: WorldStateReadQuery;
   17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
   19: }
```

### lib\chernobog\worldState\snapshotQuery.ts line 17

```text
   13: } from "./queryTypes";
   14: 
   15: export interface QueryPersistedWorldStateOptions {
   16:   query?: WorldStateReadQuery;
>  17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
   19: }
   20: 
   21: export async function queryPersistedWorldState(
```

### lib\chernobog\worldState\snapshotQuery.ts line 21

```text
   17:   store?: JsonWorldStateSnapshotStore;
   18:   now?: () => Date;
   19: }
   20: 
>  21: export async function queryPersistedWorldState(
   22:   options:
   23:     QueryPersistedWorldStateOptions = {},
   24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
```

### lib\chernobog\worldState\snapshotQuery.ts line 23

```text
   19: }
   20: 
   21: export async function queryPersistedWorldState(
   22:   options:
>  23:     QueryPersistedWorldStateOptions = {},
   24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
   26:     options.store ??
   27:     new JsonWorldStateSnapshotStore();
```

### lib\chernobog\worldState\snapshotQuery.ts line 24

```text
   20: 
   21: export async function queryPersistedWorldState(
   22:   options:
   23:     QueryPersistedWorldStateOptions = {},
>  24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
   26:     options.store ??
   27:     new JsonWorldStateSnapshotStore();
   28: 
```

### lib\chernobog\worldState\snapshotQuery.ts line 27

```text
   23:     QueryPersistedWorldStateOptions = {},
   24: ): Promise<PersistedWorldStateReadResult> {
   25:   const store =
   26:     options.store ??
>  27:     new JsonWorldStateSnapshotStore();
   28: 
   29:   const clock =
   30:     options.now ??
   31:     (() => new Date());
```

### lib\chernobog\worldState\snapshotStore.ts line 3

```text
    1: import {
    2:   mkdir,
>   3:   readFile,
    4:   rename,
    5:   writeFile,
    6: } from "node:fs/promises";
    7: import path from "node:path";
```

### lib\chernobog\worldState\snapshotStore.ts line 5

```text
    1: import {
    2:   mkdir,
    3:   readFile,
    4:   rename,
>   5:   writeFile,
    6: } from "node:fs/promises";
    7: import path from "node:path";
    8: 
    9: import {
```

### lib\chernobog\worldState\snapshotStore.ts line 30

```text
   26:     this.originalCause = originalCause;
   27:   }
   28: }
   29: 
>  30: export interface JsonWorldStateSnapshotStoreOptions {
   31:   filePath?: string;
   32:   quarantineDirectory?: string;
   33: }
   34: 
```

### lib\chernobog\worldState\snapshotStore.ts line 36

```text
   32:   quarantineDirectory?: string;
   33: }
   34: 
   35: function defaultSnapshotPath(): string {
>  36:   return path.join(
   37:     process.cwd(),
   38:     "data",
   39:     "chernobog",
   40:     "world-state",
```

### lib\chernobog\worldState\snapshotStore.ts line 37

```text
   33: }
   34: 
   35: function defaultSnapshotPath(): string {
   36:   return path.join(
>  37:     process.cwd(),
   38:     "data",
   39:     "chernobog",
   40:     "world-state",
   41:     "current.json",
```

### lib\chernobog\worldState\snapshotStore.ts line 41

```text
   37:     process.cwd(),
   38:     "data",
   39:     "chernobog",
   40:     "world-state",
>  41:     "current.json",
   42:   );
   43: }
   44: 
   45: function isMissingFileError(error: unknown): boolean {
```

### lib\chernobog\worldState\snapshotStore.ts line 60

```text
   56:     .toISOString()
   57:     .replace(/[:.]/g, "-");
   58: }
   59: 
>  60: export class JsonWorldStateSnapshotStore {
   61:   readonly filePath: string;
   62:   readonly quarantineDirectory: string;
   63: 
   64:   constructor(
```

### lib\chernobog\worldState\snapshotStore.ts line 65

```text
   61:   readonly filePath: string;
   62:   readonly quarantineDirectory: string;
   63: 
   64:   constructor(
>  65:     options: JsonWorldStateSnapshotStoreOptions = {},
   66:   ) {
   67:     this.filePath =
   68:       options.filePath ?? defaultSnapshotPath();
   69: 
```

### lib\chernobog\worldState\snapshotStore.ts line 72

```text
   68:       options.filePath ?? defaultSnapshotPath();
   69: 
   70:     this.quarantineDirectory =
   71:       options.quarantineDirectory ??
>  72:       path.join(
   73:         path.dirname(this.filePath),
   74:         "quarantine",
   75:       );
   76:   }
```

### lib\chernobog\worldState\snapshotStore.ts line 82

```text
   78:   async load(): Promise<WorldStateSnapshotLoadResult> {
   79:     let raw: string;
   80: 
   81:     try {
>  82:       raw = await readFile(
   83:         this.filePath,
   84:         "utf8",
   85:       );
   86:     } catch (error) {
```

### lib\chernobog\worldState\snapshotStore.ts line 98

```text
   94: 
   95:     let parsed: unknown;
   96: 
   97:     try {
>  98:       parsed = JSON.parse(raw);
   99:       assertWorldStateSnapshot(parsed);
  100:     } catch (error) {
  101:       throw new WorldStateSnapshotCorruptionError(
  102:         `World State snapshot is corrupt: ${
```

### lib\chernobog\worldState\snapshotStore.ts line 133

```text
  129:     const temporaryPath =
  130:       `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
  131: 
  132:     const body =
> 133:       `${JSON.stringify(snapshot, null, 2)}\n`;
  134: 
  135:     try {
  136:       await writeFile(
  137:         temporaryPath,
```

### lib\chernobog\worldState\snapshotStore.ts line 136

```text
  132:     const body =
  133:       `${JSON.stringify(snapshot, null, 2)}\n`;
  134: 
  135:     try {
> 136:       await writeFile(
  137:         temporaryPath,
  138:         body,
  139:         "utf8",
  140:       );
```

### lib\chernobog\worldState\snapshotStore.ts line 176

```text
  172:         recursive: true,
  173:       },
  174:     );
  175: 
> 176:     const target = path.join(
  177:       this.quarantineDirectory,
  178:       `world-state-corrupt-${safeTimestamp(now)}.json`,
  179:     );
  180: 
```

### lib\chernobog\worldState\snapshotStore.ts line 178

```text
  174:     );
  175: 
  176:     const target = path.join(
  177:       this.quarantineDirectory,
> 178:       `world-state-corrupt-${safeTimestamp(now)}.json`,
  179:     );
  180: 
  181:     try {
  182:       await rename(
```

### lib\chernobog\worldState\snapshotTypes.ts line 22

```text
   18:       status: "loaded";
   19:       snapshot: WorldStateSnapshot;
   20:     };
   21: 
>  22: export type WorldStateRecoveryMode =
   23:   | "snapshot-restored"
   24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
```

### lib\chernobog\worldState\snapshotTypes.ts line 28

```text
   24:   | "snapshot-caught-up"
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
   27: 
>  28: export interface WorldStateRecoveryResult {
   29:   mode: WorldStateRecoveryMode;
   30:   restoredRecords: number;
   31:   replayedEvents: number;
   32:   catchUpEvents: number;
```

### lib\chernobog\worldState\snapshotTypes.ts line 29

```text
   25:   | "history-rebuilt"
   26:   | "corrupt-snapshot-rebuilt";
   27: 
   28: export interface WorldStateRecoveryResult {
>  29:   mode: WorldStateRecoveryMode;
   30:   restoredRecords: number;
   31:   replayedEvents: number;
   32:   catchUpEvents: number;
   33:   stateRecords: number;
```

### lib\chernobog\worldState\snapshotTypes.ts line 35

```text
   31:   replayedEvents: number;
   32:   catchUpEvents: number;
   33:   stateRecords: number;
   34:   quarantinedPath?: string;
>  35:   persistedSnapshotPath: string;
   36: }
```

### lib\chernobog\worldState\types.ts line 5

```text
    1: import type { ChernobogEventSource } from "../events/types";
    2: 
    3: export const CHERNOBOG_WORLD_STATE_SCHEMA_VERSION = 1 as const;
    4: 
>   5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
    7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
    9:   | WorldStateJsonValue[]
```

### lib\chernobog\worldState\types.ts line 7

```text
    3: export const CHERNOBOG_WORLD_STATE_SCHEMA_VERSION = 1 as const;
    4: 
    5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
>   7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
    9:   | WorldStateJsonValue[]
   10:   | { [key: string]: WorldStateJsonValue };
   11: 
```

### lib\chernobog\worldState\types.ts line 8

```text
    4: 
    5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
    7: export type WorldStateJsonValue =
>   8:   | WorldStateJsonPrimitive
    9:   | WorldStateJsonValue[]
   10:   | { [key: string]: WorldStateJsonValue };
   11: 
   12: export type WorldStateFreshnessStatus =
```

### lib\chernobog\worldState\types.ts line 9

```text
    5: export type WorldStateJsonPrimitive = string | number | boolean | null;
    6: 
    7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
>   9:   | WorldStateJsonValue[]
   10:   | { [key: string]: WorldStateJsonValue };
   11: 
   12: export type WorldStateFreshnessStatus =
   13:   | "fresh"
```

### lib\chernobog\worldState\types.ts line 10

```text
    6: 
    7: export type WorldStateJsonValue =
    8:   | WorldStateJsonPrimitive
    9:   | WorldStateJsonValue[]
>  10:   | { [key: string]: WorldStateJsonValue };
   11: 
   12: export type WorldStateFreshnessStatus =
   13:   | "fresh"
   14:   | "aging"
```

### lib\chernobog\worldState\types.ts line 59

```text
   55:   source?: ChernobogEventSource;
   56: }
   57: 
   58: export interface WorldStateRecord<
>  59:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   60: > {
   61:   schemaVersion: typeof CHERNOBOG_WORLD_STATE_SCHEMA_VERSION;
   62:   key: string;
   63:   namespace: string;
```

### lib\chernobog\worldState\types.ts line 74

```text
   70:   provenance?: WorldStateProvenance;
   71: }
   72: 
   73: export interface WorldStateRecordInput<
>  74:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   75: > {
   76:   key: string;
   77:   namespace?: string;
   78:   value: TValue;
```

### lib\chernobog\worldState\types.ts line 97

```text
   93:   minConfidence?: number;
   94: }
   95: 
   96: export interface WorldStateUpsertResult<
>  97:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
   98: > {
   99:   record: WorldStateRecord<TValue>;
  100:   applied: boolean;
  101:   reason: "created" | "updated" | "older-observation" | "same-observation";
```

### lib\chernobog\worldState\validation.ts line 16

```text
   12:   resolveWorldStateConfidenceBasis,
   13: } from "./confidence";
   14: import {
   15:   CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
>  16:   type WorldStateJsonValue,
   17:   type WorldStateProvenance,
   18:   type WorldStateRecord,
   19:   type WorldStateRecordInput,
   20: } from "./types";
```

### lib\chernobog\worldState\validation.ts line 40

```text
   36:   const normalized = value?.trim();
   37:   return normalized ? normalized : undefined;
   38: }
   39: 
>  40: function assertJsonSafeValue(
   41:   value: unknown,
   42:   path = "worldState.value",
   43: ): asserts value is WorldStateJsonValue {
   44:   if (
```

### lib\chernobog\worldState\validation.ts line 43

```text
   39: 
   40: function assertJsonSafeValue(
   41:   value: unknown,
   42:   path = "worldState.value",
>  43: ): asserts value is WorldStateJsonValue {
   44:   if (
   45:     value === null ||
   46:     typeof value === "string" ||
   47:     typeof value === "boolean"
```

### lib\chernobog\worldState\validation.ts line 61

```text
   57:   }
   58: 
   59:   if (Array.isArray(value)) {
   60:     value.forEach((entry, index) =>
>  61:       assertJsonSafeValue(entry, `${path}[${index}]`),
   62:     );
   63:     return;
   64:   }
   65: 
```

### lib\chernobog\worldState\validation.ts line 68

```text
   64:   }
   65: 
   66:   if (typeof value === "object") {
   67:     for (const [key, entry] of Object.entries(value)) {
>  68:       assertJsonSafeValue(entry, `${path}.${key}`);
   69:     }
   70:     return;
   71:   }
   72: 
```

### lib\chernobog\worldState\validation.ts line 73

```text
   69:     }
   70:     return;
   71:   }
   72: 
>  73:   throw new Error(`${path} must be JSON-safe.`);
   74: }
   75: 
   76: function cloneJsonValue<
   77:   TValue extends WorldStateJsonValue,
```

### lib\chernobog\worldState\validation.ts line 76

```text
   72: 
   73:   throw new Error(`${path} must be JSON-safe.`);
   74: }
   75: 
>  76: function cloneJsonValue<
   77:   TValue extends WorldStateJsonValue,
   78: >(
   79:   value: TValue,
   80: ): TValue {
```

### lib\chernobog\worldState\validation.ts line 77

```text
   73:   throw new Error(`${path} must be JSON-safe.`);
   74: }
   75: 
   76: function cloneJsonValue<
>  77:   TValue extends WorldStateJsonValue,
   78: >(
   79:   value: TValue,
   80: ): TValue {
   81:   assertJsonSafeValue(value);
```

### lib\chernobog\worldState\validation.ts line 81

```text
   77:   TValue extends WorldStateJsonValue,
   78: >(
   79:   value: TValue,
   80: ): TValue {
>  81:   assertJsonSafeValue(value);
   82:   return structuredClone(value);
   83: }
   84: 
   85: function normalizeProvenance(
```

### lib\chernobog\worldState\validation.ts line 164

```text
  160:   };
  161: }
  162: 
  163: export function createWorldStateRecord<
> 164:   TValue extends WorldStateJsonValue,
  165: >(
  166:   input: WorldStateRecordInput<TValue>,
  167:   now = new Date(),
  168: ): WorldStateRecord<TValue> {
```

### lib\chernobog\worldState\validation.ts line 242

```text
  238:   return {
  239:     schemaVersion: CHERNOBOG_WORLD_STATE_SCHEMA_VERSION,
  240:     key,
  241:     namespace,
> 242:     value: cloneJsonValue(input.value),
  243:     observedAt,
  244:     updatedAt,
  245:     confidence,
  246:     confidenceBasis,
```

### lib\chernobog\worldState\validation.ts line 284

```text
  280:   createWorldStateRecord(
  281:     {
  282:       key: String(record.key ?? ""),
  283:       namespace: record.namespace,
> 284:       value: record.value as WorldStateJsonValue,
  285:       observedAt: String(record.observedAt ?? ""),
  286:       updatedAt: String(record.updatedAt ?? ""),
  287:       confidence: record.confidence,
  288:       confidenceBasis: record.confidenceBasis,
```


## World State runtime publishers / projection inputs

Pattern: `publish|project|observe|observation|eventBus|event spine|health|desktop|backup|storage|service`

### lib\chernobog\worldState\assessment.ts line 13

```text
   10:   record: WorldStateRecord,
   11:   now = new Date(),
   12: ): WorldStateEvidenceAssessment {
>  13:   const observedAtMs = new Date(record.observedAt).getTime();
   14: 
   15:   if (Number.isNaN(observedAtMs)) {
   16:     throw new Error(
```

### lib\chernobog\worldState\assessment.ts line 15

```text
   12: ): WorldStateEvidenceAssessment {
   13:   const observedAtMs = new Date(record.observedAt).getTime();
   14: 
>  15:   if (Number.isNaN(observedAtMs)) {
   16:     throw new Error(
   17:       "worldState.observedAt must be a valid timestamp.",
   18:     );
```

### lib\chernobog\worldState\assessment.ts line 17

```text
   14: 
   15:   if (Number.isNaN(observedAtMs)) {
   16:     throw new Error(
>  17:       "worldState.observedAt must be a valid timestamp.",
   18:     );
   19:   }
   20: 
```

### lib\chernobog\worldState\assessment.ts line 23

```text
   20: 
   21:   return {
   22:     key: record.key,
>  23:     observedAt: record.observedAt,
   24:     ageMs: Math.max(0, now.getTime() - observedAtMs),
   25:     confidence: record.confidence,
   26:     confidenceBasis: record.confidenceBasis,
```

### lib\chernobog\worldState\assessment.ts line 24

```text
   21:   return {
   22:     key: record.key,
   23:     observedAt: record.observedAt,
>  24:     ageMs: Math.max(0, now.getTime() - observedAtMs),
   25:     confidence: record.confidence,
   26:     confidenceBasis: record.confidenceBasis,
   27:     confidenceBand: getWorldStateConfidenceBand(
```

### lib\chernobog\worldState\assessment.ts line 32

```text
   29:     ),
   30:     freshness: buildWorldStateFreshness(
   31:       {
>  32:         observedAt: record.observedAt,
   33:         expiresAt: record.freshness.expiresAt,
   34:         basis: record.freshness.basis,
   35:         ttlMs: record.freshness.ttlMs,
```

### lib\chernobog\worldState\assessment.ts line 44

```text
   41:     ),
   42:     eventId: record.provenance?.eventId,
   43:     eventType: record.provenance?.eventType,
>  44:     projectorId: record.provenance?.projectorId,
   45:     sourceSubsystem: record.provenance?.source?.subsystem,
   46:   };
   47: }
```

### lib\chernobog\worldState\domainProjectors.ts line 6

```text
    3:   WorldStateJsonValue,
    4: } from "./types";
    5: import type {
>   6:   WorldStateProjection,
    7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
```

### lib\chernobog\worldState\domainProjectors.ts line 7

```text
    4: } from "./types";
    5: import type {
    6:   WorldStateProjection,
>   7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
```

### lib\chernobog\worldState\domainProjectors.ts line 8

```text
    5: import type {
    6:   WorldStateProjection,
    7:   WorldStateProjector,
>   8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
   11: } from "./projectionEngine";
```

### lib\chernobog\worldState\domainProjectors.ts line 10

```text
    7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
>  10:   ChernobogWorldStateProjectionEngine,
   11: } from "./projectionEngine";
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
```

### lib\chernobog\worldState\domainProjectors.ts line 11

```text
    8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
>  11: } from "./projectionEngine";
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
```

### lib\chernobog\worldState\domainProjectors.ts line 14

```text
   11: } from "./projectionEngine";
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
>  14:   "desktop",
   15:   "backup",
   16:   "storage",
   17:   "execution",
```

### lib\chernobog\worldState\domainProjectors.ts line 15

```text
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
>  15:   "backup",
   16:   "storage",
   17:   "execution",
   18: ]);
```

### lib\chernobog\worldState\domainProjectors.ts line 16

```text
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
   15:   "backup",
>  16:   "storage",
   17:   "execution",
   18: ]);
   19: 
```

### lib\chernobog\worldState\domainProjectors.ts line 160

```text
  157:   return undefined;
  158: }
  159: 
> 160: function commonObservation(
  161:   event: ChernobogEvent,
  162: ): WorldStateJsonValue {
  163:   return {
```

### lib\chernobog\worldState\domainProjectors.ts line 177

```text
  174:   };
  175: }
  176: 
> 177: function statusFromServiceEvent(
  178:   type: string,
  179: ): string | undefined {
  180:   switch (type) {
```

### lib\chernobog\worldState\domainProjectors.ts line 181

```text
  178:   type: string,
  179: ): string | undefined {
  180:   switch (type) {
> 181:     case "service.healthy":
  182:     case "service.recovered":
  183:       return "healthy";
  184:     case "service.degraded":
```

### lib\chernobog\worldState\domainProjectors.ts line 182

```text
  179: ): string | undefined {
  180:   switch (type) {
  181:     case "service.healthy":
> 182:     case "service.recovered":
  183:       return "healthy";
  184:     case "service.degraded":
  185:       return "degraded";
```

### lib\chernobog\worldState\domainProjectors.ts line 183

```text
  180:   switch (type) {
  181:     case "service.healthy":
  182:     case "service.recovered":
> 183:       return "healthy";
  184:     case "service.degraded":
  185:       return "degraded";
  186:     case "service.failed":
```

### lib\chernobog\worldState\domainProjectors.ts line 184

```text
  181:     case "service.healthy":
  182:     case "service.recovered":
  183:       return "healthy";
> 184:     case "service.degraded":
  185:       return "degraded";
  186:     case "service.failed":
  187:       return "failed";
```

### lib\chernobog\worldState\domainProjectors.ts line 186

```text
  183:       return "healthy";
  184:     case "service.degraded":
  185:       return "degraded";
> 186:     case "service.failed":
  187:       return "failed";
  188:     default:
  189:       return undefined;
```

### lib\chernobog\worldState\domainProjectors.ts line 193

```text
  190:   }
  191: }
  192: 
> 193: function runtimeObservationProjector():
  194:   WorldStateProjector {
  195:   return {
  196:     id: "domain-runtime-health-observation",
```

### lib\chernobog\worldState\domainProjectors.ts line 194

```text
  191: }
  192: 
  193: function runtimeObservationProjector():
> 194:   WorldStateProjector {
  195:   return {
  196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 196

```text
  193: function runtimeObservationProjector():
  194:   WorldStateProjector {
  195:   return {
> 196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
  198:       "runtime.health_observed",
  199:     ],
```

### lib\chernobog\worldState\domainProjectors.ts line 198

```text
  195:   return {
  196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
> 198:       "runtime.health_observed",
  199:     ],
  200:     project(event) {
  201:       const payload =
```

### lib\chernobog\worldState\domainProjectors.ts line 200

```text
  197:     eventTypes: [
  198:       "runtime.health_observed",
  199:     ],
> 200:     project(event) {
  201:       const payload =
  202:         objectPayload(event);
  203: 
```

### lib\chernobog\worldState\domainProjectors.ts line 221

```text
  218:           ? payload.status
  219:           : undefined;
  220: 
> 221:       const observedAt =
  222:         typeof payload.observedAt ===
  223:           "string"
  224:           ? payload.observedAt
```

### lib\chernobog\worldState\domainProjectors.ts line 222

```text
  219:           : undefined;
  220: 
  221:       const observedAt =
> 222:         typeof payload.observedAt ===
  223:           "string"
  224:           ? payload.observedAt
  225:           : undefined;
```

### lib\chernobog\worldState\domainProjectors.ts line 224

```text
  221:       const observedAt =
  222:         typeof payload.observedAt ===
  223:           "string"
> 224:           ? payload.observedAt
  225:           : undefined;
  226: 
  227:       let base: string;
```

### lib\chernobog\worldState\domainProjectors.ts line 229

```text
  226: 
  227:       let base: string;
  228: 
> 229:       if (kind === "service") {
  230:         base =
  231:           `service.${id}`;
  232:       } else if (
```

### lib\chernobog\worldState\domainProjectors.ts line 231

```text
  228: 
  229:       if (kind === "service") {
  230:         base =
> 231:           `service.${id}`;
  232:       } else if (
  233:         kind === "runtime-node"
  234:       ) {
```

### lib\chernobog\worldState\domainProjectors.ts line 242

```text
  239:           `model.${id}`;
  240:       }
  241: 
> 242:       const projections:
  243:         WorldStateProjection[] = [
  244:           {
  245:             key:
```

### lib\chernobog\worldState\domainProjectors.ts line 243

```text
  240:       }
  241: 
  242:       const projections:
> 243:         WorldStateProjection[] = [
  244:           {
  245:             key:
  246:               `${base}.observation`,
```

### lib\chernobog\worldState\domainProjectors.ts line 246

```text
  243:         WorldStateProjection[] = [
  244:           {
  245:             key:
> 246:               `${base}.observation`,
  247:             value:
  248:               jsonSafe(event.payload),
  249:             observedAt,
```

### lib\chernobog\worldState\domainProjectors.ts line 249

```text
  246:               `${base}.observation`,
  247:             value:
  248:               jsonSafe(event.payload),
> 249:             observedAt,
  250:             ttlMs:
  251:               300_000,
  252:           },
```

### lib\chernobog\worldState\domainProjectors.ts line 256

```text
  253:         ];
  254: 
  255:       if (status) {
> 256:         projections.push({
  257:           key:
  258:             `${base}.health`,
  259:           value:
```

### lib\chernobog\worldState\domainProjectors.ts line 258

```text
  255:       if (status) {
  256:         projections.push({
  257:           key:
> 258:             `${base}.health`,
  259:           value:
  260:             status,
  261:           observedAt,
```

### lib\chernobog\worldState\domainProjectors.ts line 261

```text
  258:             `${base}.health`,
  259:           value:
  260:             status,
> 261:           observedAt,
  262:           ttlMs:
  263:             300_000,
  264:         });
```

### lib\chernobog\worldState\domainProjectors.ts line 267

```text
  264:         });
  265:       }
  266: 
> 267:       return projections;
  268:     },
  269:   };
  270: }
```

### lib\chernobog\worldState\domainProjectors.ts line 272

```text
  269:   };
  270: }
  271: 
> 272: function serviceHealthProjector():
  273:   WorldStateProjector {
  274:   return {
  275:     id: "domain-service-health",
```

### lib\chernobog\worldState\domainProjectors.ts line 273

```text
  270: }
  271: 
  272: function serviceHealthProjector():
> 273:   WorldStateProjector {
  274:   return {
  275:     id: "domain-service-health",
  276:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 275

```text
  272: function serviceHealthProjector():
  273:   WorldStateProjector {
  274:   return {
> 275:     id: "domain-service-health",
  276:     eventTypes: [
  277:       "service.healthy",
  278:       "service.degraded",
```

### lib\chernobog\worldState\domainProjectors.ts line 277

```text
  274:   return {
  275:     id: "domain-service-health",
  276:     eventTypes: [
> 277:       "service.healthy",
  278:       "service.degraded",
  279:       "service.failed",
  280:       "service.recovered",
```

### lib\chernobog\worldState\domainProjectors.ts line 278

```text
  275:     id: "domain-service-health",
  276:     eventTypes: [
  277:       "service.healthy",
> 278:       "service.degraded",
  279:       "service.failed",
  280:       "service.recovered",
  281:     ],
```

### lib\chernobog\worldState\domainProjectors.ts line 279

```text
  276:     eventTypes: [
  277:       "service.healthy",
  278:       "service.degraded",
> 279:       "service.failed",
  280:       "service.recovered",
  281:     ],
  282:     project(event) {
```

### lib\chernobog\worldState\domainProjectors.ts line 280

```text
  277:       "service.healthy",
  278:       "service.degraded",
  279:       "service.failed",
> 280:       "service.recovered",
  281:     ],
  282:     project(event) {
  283:       const status =
```

### lib\chernobog\worldState\domainProjectors.ts line 282

```text
  279:       "service.failed",
  280:       "service.recovered",
  281:     ],
> 282:     project(event) {
  283:       const status =
  284:         statusFromServiceEvent(
  285:           event.type,
```

### lib\chernobog\worldState\domainProjectors.ts line 284

```text
  281:     ],
  282:     project(event) {
  283:       const status =
> 284:         statusFromServiceEvent(
  285:           event.type,
  286:         );
  287: 
```

### lib\chernobog\worldState\domainProjectors.ts line 292

```text
  289:         return undefined;
  290:       }
  291: 
> 292:       const service =
  293:         subjectSegment(event);
  294: 
  295:       return [
```

### lib\chernobog\worldState\domainProjectors.ts line 298

```text
  295:       return [
  296:         {
  297:           key:
> 298:             `service.${service}.health`,
  299:           value:
  300:             status,
  301:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 306

```text
  303:         },
  304:         {
  305:           key:
> 306:             `service.${service}.observation`,
  307:           value:
  308:             jsonSafe(event.payload),
  309:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 317

```text
  314:   };
  315: }
  316: 
> 317: function runtimeNodeProjector():
  318:   WorldStateProjector {
  319:   return {
  320:     id: "domain-runtime-node-availability",
```

### lib\chernobog\worldState\domainProjectors.ts line 318

```text
  315: }
  316: 
  317: function runtimeNodeProjector():
> 318:   WorldStateProjector {
  319:   return {
  320:     id: "domain-runtime-node-availability",
  321:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 325

```text
  322:       "runtime.node_online",
  323:       "runtime.node_offline",
  324:     ],
> 325:     project(event) {
  326:       const node =
  327:         subjectSegment(event);
  328: 
```

### lib\chernobog\worldState\domainProjectors.ts line 341

```text
  338:         },
  339:         {
  340:           key:
> 341:             `runtime.node.${node}.observation`,
  342:           value:
  343:             jsonSafe(event.payload),
  344:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 352

```text
  349:   };
  350: }
  351: 
> 352: function modelProviderProjector():
  353:   WorldStateProjector {
  354:   return {
  355:     id: "domain-model-provider-availability",
```

### lib\chernobog\worldState\domainProjectors.ts line 353

```text
  350: }
  351: 
  352: function modelProviderProjector():
> 353:   WorldStateProjector {
  354:   return {
  355:     id: "domain-model-provider-availability",
  356:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 360

```text
  357:       "runtime.model_available",
  358:       "runtime.model_unavailable",
  359:     ],
> 360:     project(event) {
  361:       const model =
  362:         subjectSegment(event);
  363: 
```

### lib\chernobog\worldState\domainProjectors.ts line 376

```text
  373:         },
  374:         {
  375:           key:
> 376:             `model.${model}.observation`,
  377:           value:
  378:             jsonSafe(event.payload),
  379:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 387

```text
  384:   };
  385: }
  386: 
> 387: function modelRoleProjector():
  388:   WorldStateProjector {
  389:   return {
  390:     id: "domain-model-role-assignment",
```

### lib\chernobog\worldState\domainProjectors.ts line 388

```text
  385: }
  386: 
  387: function modelRoleProjector():
> 388:   WorldStateProjector {
  389:   return {
  390:     id: "domain-model-role-assignment",
  391:     eventTypePrefixes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 394

```text
  391:     eventTypePrefixes: [
  392:       "runtime.model",
  393:     ],
> 394:     project(event) {
  395:       const payload =
  396:         objectPayload(event);
  397: 
```

### lib\chernobog\worldState\domainProjectors.ts line 410

```text
  407:           payload.role,
  408:         );
  409: 
> 410:       const projections:
  411:         WorldStateProjection[] = [
  412:           {
  413:             key:
```

### lib\chernobog\worldState\domainProjectors.ts line 411

```text
  408:         );
  409: 
  410:       const projections:
> 411:         WorldStateProjection[] = [
  412:           {
  413:             key:
  414:               `model.role.${role}.assignment`,
```

### lib\chernobog\worldState\domainProjectors.ts line 426

```text
  423:         typeof payload.available ===
  424:         "boolean"
  425:       ) {
> 426:         projections.push({
  427:           key:
  428:             `model.role.${role}.available`,
  429:           value:
```

### lib\chernobog\worldState\domainProjectors.ts line 436

```text
  433:         });
  434:       }
  435: 
> 436:       return projections;
  437:     },
  438:   };
  439: }
```

### lib\chernobog\worldState\domainProjectors.ts line 441

```text
  438:   };
  439: }
  440: 
> 441: function projectGitProjector():
  442:   WorldStateProjector {
  443:   return {
  444:     id: "domain-project-git",
```

### lib\chernobog\worldState\domainProjectors.ts line 442

```text
  439: }
  440: 
  441: function projectGitProjector():
> 442:   WorldStateProjector {
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 444

```text
  441: function projectGitProjector():
  442:   WorldStateProjector {
  443:   return {
> 444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
  447:       "project.git_observed",
```

### lib\chernobog\worldState\domainProjectors.ts line 446

```text
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
> 446:       "project.git_unavailable",
  447:       "project.git_observed",
  448:       "project.git_dirty",
  449:       "project.git_clean",
```

### lib\chernobog\worldState\domainProjectors.ts line 447

```text
  444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
> 447:       "project.git_observed",
  448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
```

### lib\chernobog\worldState\domainProjectors.ts line 448

```text
  445:     eventTypes: [
  446:       "project.git_unavailable",
  447:       "project.git_observed",
> 448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
  451:     project(event) {
```

### lib\chernobog\worldState\domainProjectors.ts line 449

```text
  446:       "project.git_unavailable",
  447:       "project.git_observed",
  448:       "project.git_dirty",
> 449:       "project.git_clean",
  450:     ],
  451:     project(event) {
  452:       if (
```

### lib\chernobog\worldState\domainProjectors.ts line 451

```text
  448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
> 451:     project(event) {
  452:       if (
  453:         event.type ===
  454:         "project.git_unavailable"
```

### lib\chernobog\worldState\domainProjectors.ts line 454

```text
  451:     project(event) {
  452:       if (
  453:         event.type ===
> 454:         "project.git_unavailable"
  455:       ) {
  456:         return {
  457:           key:
```

### lib\chernobog\worldState\domainProjectors.ts line 458

```text
  455:       ) {
  456:         return {
  457:           key:
> 458:             "project.git.available",
  459:           value:
  460:             false,
  461:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 466

```text
  463:         };
  464:       }
  465: 
> 466:       const project =
  467:         subjectSegment(event);
  468: 
  469:       const payload =
```

### lib\chernobog\worldState\domainProjectors.ts line 472

```text
  469:       const payload =
  470:         objectPayload(event);
  471: 
> 472:       const projections:
  473:         WorldStateProjection[] = [
  474:           {
  475:             key:
```

### lib\chernobog\worldState\domainProjectors.ts line 473

```text
  470:         objectPayload(event);
  471: 
  472:       const projections:
> 473:         WorldStateProjection[] = [
  474:           {
  475:             key:
  476:               `project.${project}.git.snapshot`,
```

### lib\chernobog\worldState\domainProjectors.ts line 476

```text
  473:         WorldStateProjection[] = [
  474:           {
  475:             key:
> 476:               `project.${project}.git.snapshot`,
  477:             value:
  478:               jsonSafe(event.payload),
  479:             ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 484

```text
  481:           },
  482:           {
  483:             key:
> 484:               `project.${project}.git.available`,
  485:             value:
  486:               true,
  487:             ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 503

```text
  500:           payload.dirty;
  501:       } else if (
  502:         event.type ===
> 503:         "project.git_dirty"
  504:       ) {
  505:         dirty = true;
  506:       } else if (
```

### lib\chernobog\worldState\domainProjectors.ts line 508

```text
  505:         dirty = true;
  506:       } else if (
  507:         event.type ===
> 508:         "project.git_clean"
  509:       ) {
  510:         dirty = false;
  511:       }
```

### lib\chernobog\worldState\domainProjectors.ts line 516

```text
  513:       if (
  514:         dirty !== undefined
  515:       ) {
> 516:         projections.push({
  517:           key:
  518:             `project.${project}.git.dirty`,
  519:           value:
```

### lib\chernobog\worldState\domainProjectors.ts line 518

```text
  515:       ) {
  516:         projections.push({
  517:           key:
> 518:             `project.${project}.git.dirty`,
  519:           value:
  520:             dirty,
  521:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 531

```text
  528:         "string" &&
  529:         payload.branch.trim()
  530:       ) {
> 531:         projections.push({
  532:           key:
  533:             `project.${project}.git.branch`,
  534:           value:
```

### lib\chernobog\worldState\domainProjectors.ts line 533

```text
  530:       ) {
  531:         projections.push({
  532:           key:
> 533:             `project.${project}.git.branch`,
  534:           value:
  535:             payload.branch,
  536:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 546

```text
  543:         "string" &&
  544:         payload.head.trim()
  545:       ) {
> 546:         projections.push({
  547:           key:
  548:             `project.${project}.git.head`,
  549:           value:
```

### lib\chernobog\worldState\domainProjectors.ts line 548

```text
  545:       ) {
  546:         projections.push({
  547:           key:
> 548:             `project.${project}.git.head`,
  549:           value:
  550:             payload.head,
  551:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 556

```text
  553:         });
  554:       }
  555: 
> 556:       return projections;
  557:     },
  558:   };
  559: }
```

### lib\chernobog\worldState\domainProjectors.ts line 561

```text
  558:   };
  559: }
  560: 
> 561: function projectValidationProjector():
  562:   WorldStateProjector {
  563:   return {
  564:     id: "domain-project-validation",
```

### lib\chernobog\worldState\domainProjectors.ts line 562

```text
  559: }
  560: 
  561: function projectValidationProjector():
> 562:   WorldStateProjector {
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 564

```text
  561: function projectValidationProjector():
  562:   WorldStateProjector {
  563:   return {
> 564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
  567:       "project.validation_completed",
```

### lib\chernobog\worldState\domainProjectors.ts line 566

```text
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
> 566:       "project.validation_started",
  567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
```

### lib\chernobog\worldState\domainProjectors.ts line 567

```text
  564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
> 567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
  570:     project(event) {
```

### lib\chernobog\worldState\domainProjectors.ts line 568

```text
  565:     eventTypes: [
  566:       "project.validation_started",
  567:       "project.validation_completed",
> 568:       "project.validation_failed",
  569:     ],
  570:     project(event) {
  571:       const validation =
```

### lib\chernobog\worldState\domainProjectors.ts line 570

```text
  567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
> 570:     project(event) {
  571:       const validation =
  572:         subjectSegment(event);
  573: 
```

### lib\chernobog\worldState\domainProjectors.ts line 576

```text
  573: 
  574:       const status =
  575:         event.type ===
> 576:         "project.validation_started"
  577:           ? "running"
  578:           : event.type ===
  579:             "project.validation_completed"
```

### lib\chernobog\worldState\domainProjectors.ts line 579

```text
  576:         "project.validation_started"
  577:           ? "running"
  578:           : event.type ===
> 579:             "project.validation_completed"
  580:             ? "passed"
  581:             : "failed";
  582: 
```

### lib\chernobog\worldState\domainProjectors.ts line 586

```text
  583:       return [
  584:         {
  585:           key:
> 586:             `project.validation.${validation}.status`,
  587:           value:
  588:             status,
  589:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 594

```text
  591:         },
  592:         {
  593:           key:
> 594:             `project.validation.${validation}.result`,
  595:           value:
  596:             jsonSafe(event.payload),
  597:           ttlMs:
```

### lib\chernobog\worldState\domainProjectors.ts line 605

```text
  602:   };
  603: }
  604: 
> 605: function toolLifecycleProjector():
  606:   WorldStateProjector {
  607:   return {
  608:     id: "domain-tool-lifecycle",
```

### lib\chernobog\worldState\domainProjectors.ts line 606

```text
  603: }
  604: 
  605: function toolLifecycleProjector():
> 606:   WorldStateProjector {
  607:   return {
  608:     id: "domain-tool-lifecycle",
  609:     eventTypes: [
```

### lib\chernobog\worldState\domainProjectors.ts line 614

```text
  611:       "tool.completed",
  612:       "tool.failed",
  613:     ],
> 614:     project(event) {
  615:       const tool =
  616:         subjectSegment(event);
  617: 
```

### lib\chernobog\worldState\domainProjectors.ts line 649

```text
  646:   };
  647: }
  648: 
> 649: function genericFactDomainProjector():
  650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
```

### lib\chernobog\worldState\domainProjectors.ts line 650

```text
  647: }
  648: 
  649: function genericFactDomainProjector():
> 650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
  653:     project(event) {
```

### lib\chernobog\worldState\domainProjectors.ts line 653

```text
  650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
> 653:     project(event) {
  654:       const domain =
  655:         eventDomain(event);
  656: 
```

### lib\chernobog\worldState\domainProjectors.ts line 670

```text
  667:             .split(".")
  668:             .slice(1)
  669:             .join("-"),
> 670:           "observation",
  671:         );
  672: 
  673:       return {
```

### lib\chernobog\worldState\domainProjectors.ts line 677

```text
  674:         key:
  675:           `${domain}.${subject}.${typeSuffix}`,
  676:         value:
> 677:           commonObservation(event),
  678:         ttlMs:
  679:           300_000,
  680:       };
```

### lib\chernobog\worldState\domainProjectors.ts line 685

```text
  682:   };
  683: }
  684: 
> 685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 686

```text
  683: }
  684: 
  685: export function createChernobogDomainProjectors():
> 686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 688

```text
  685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
> 688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 689

```text
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
> 689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 690

```text
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
> 690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 691

```text
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
> 691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 692

```text
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
> 692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 693

```text
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
> 693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
```

### lib\chernobog\worldState\domainProjectors.ts line 694

```text
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
> 694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
  697:   ];
```

### lib\chernobog\worldState\domainProjectors.ts line 695

```text
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
> 695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
  697:   ];
  698: }
```

### lib\chernobog\worldState\domainProjectors.ts line 696

```text
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
> 696:     genericFactDomainProjector(),
  697:   ];
  698: }
  699: 
```

### lib\chernobog\worldState\domainProjectors.ts line 700

```text
  697:   ];
  698: }
  699: 
> 700: export function registerChernobogDomainProjectors(
  701:   engine:
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
```

### lib\chernobog\worldState\domainProjectors.ts line 702

```text
  699: 
  700: export function registerChernobogDomainProjectors(
  701:   engine:
> 702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
  705:     createChernobogDomainProjectors()
```

### lib\chernobog\worldState\domainProjectors.ts line 705

```text
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
> 705:     createChernobogDomainProjectors()
  706:       .map((projector) =>
  707:         engine.register(projector),
  708:       );
```

### lib\chernobog\worldState\domainProjectors.ts line 706

```text
  703: ): () => void {
  704:   const detach =
  705:     createChernobogDomainProjectors()
> 706:       .map((projector) =>
  707:         engine.register(projector),
  708:       );
  709: 
```

### lib\chernobog\worldState\domainProjectors.ts line 707

```text
  704:   const detach =
  705:     createChernobogDomainProjectors()
  706:       .map((projector) =>
> 707:         engine.register(projector),
  708:       );
  709: 
  710:   return () => {
```

### lib\chernobog\worldState\eventProjection.ts line 3

```text
    1: import type { ChernobogEvent } from "../events/types";
    2: import { resolveWorldStateExpiry } from "./freshness";
>   3: import type { WorldStateProjection } from "./projectorTypes";
    4: import type {
    5:   WorldStateConfidenceBasis,
    6:   WorldStateFreshnessBasis,
```

### lib\chernobog\worldState\eventProjection.ts line 12

```text
    9: 
   10: export function buildWorldStateInputFromEvent(
   11:   event: ChernobogEvent,
>  12:   projection: WorldStateProjection,
   13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
```

### lib\chernobog\worldState\eventProjection.ts line 13

```text
   10: export function buildWorldStateInputFromEvent(
   11:   event: ChernobogEvent,
   12:   projection: WorldStateProjection,
>  13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
   16:     projection.observedAt ?? event.occurredAt;
```

### lib\chernobog\worldState\eventProjection.ts line 15

```text
   12:   projection: WorldStateProjection,
   13:   projectorId?: string,
   14: ): WorldStateRecordInput {
>  15:   const observedAt =
   16:     projection.observedAt ?? event.occurredAt;
   17: 
   18:   let confidence: number;
```

### lib\chernobog\worldState\eventProjection.ts line 16

```text
   13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
>  16:     projection.observedAt ?? event.occurredAt;
   17: 
   18:   let confidence: number;
   19:   let confidenceBasis: WorldStateConfidenceBasis;
```

### lib\chernobog\worldState\eventProjection.ts line 21

```text
   18:   let confidence: number;
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
>  21:   if (projection.confidence !== undefined) {
   22:     confidence = projection.confidence;
   23:     confidenceBasis = "projector";
   24:   } else if (
```

### lib\chernobog\worldState\eventProjection.ts line 22

```text
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
   21:   if (projection.confidence !== undefined) {
>  22:     confidence = projection.confidence;
   23:     confidenceBasis = "projector";
   24:   } else if (
   25:     event.metadata.confidence !== undefined
```

### lib\chernobog\worldState\eventProjection.ts line 23

```text
   20: 
   21:   if (projection.confidence !== undefined) {
   22:     confidence = projection.confidence;
>  23:     confidenceBasis = "projector";
   24:   } else if (
   25:     event.metadata.confidence !== undefined
   26:   ) {
```

### lib\chernobog\worldState\eventProjection.ts line 38

```text
   35:   let freshnessBasis: WorldStateFreshnessBasis;
   36:   let freshnessTtlMs: number | undefined;
   37: 
>  38:   if (projection.expiresAt) {
   39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
```

### lib\chernobog\worldState\eventProjection.ts line 39

```text
   36:   let freshnessTtlMs: number | undefined;
   37: 
   38:   if (projection.expiresAt) {
>  39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
```

### lib\chernobog\worldState\eventProjection.ts line 41

```text
   38:   if (projection.expiresAt) {
   39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
>  41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
   43:       observedAt,
   44:       projection.ttlMs,
```

### lib\chernobog\worldState\eventProjection.ts line 43

```text
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
>  43:       observedAt,
   44:       projection.ttlMs,
   45:     );
   46:     freshnessBasis = "ttl";
```

### lib\chernobog\worldState\eventProjection.ts line 44

```text
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
   43:       observedAt,
>  44:       projection.ttlMs,
   45:     );
   46:     freshnessBasis = "ttl";
   47:     freshnessTtlMs = projection.ttlMs;
```

### lib\chernobog\worldState\eventProjection.ts line 47

```text
   44:       projection.ttlMs,
   45:     );
   46:     freshnessBasis = "ttl";
>  47:     freshnessTtlMs = projection.ttlMs;
   48:   } else if (event.metadata.expiresAt) {
   49:     expiresAt = event.metadata.expiresAt;
   50:     freshnessBasis = "event-expiry";
```

### lib\chernobog\worldState\eventProjection.ts line 56

```text
   53:   }
   54: 
   55:   return {
>  56:     key: projection.key,
   57:     namespace: projection.namespace,
   58:     value: projection.value,
   59:     observedAt,
```

### lib\chernobog\worldState\eventProjection.ts line 57

```text
   54: 
   55:   return {
   56:     key: projection.key,
>  57:     namespace: projection.namespace,
   58:     value: projection.value,
   59:     observedAt,
   60:     confidence,
```

### lib\chernobog\worldState\eventProjection.ts line 58

```text
   55:   return {
   56:     key: projection.key,
   57:     namespace: projection.namespace,
>  58:     value: projection.value,
   59:     observedAt,
   60:     confidence,
   61:     confidenceBasis,
```

### lib\chernobog\worldState\eventProjection.ts line 59

```text
   56:     key: projection.key,
   57:     namespace: projection.namespace,
   58:     value: projection.value,
>  59:     observedAt,
   60:     confidence,
   61:     confidenceBasis,
   62:     expiresAt,
```

### lib\chernobog\worldState\eventProjection.ts line 70

```text
   67:       eventType: event.type,
   68:       eventOccurredAt: event.occurredAt,
   69:       eventReceivedAt: event.receivedAt,
>  70:       projectorId,
   71:       correlationId: event.correlationId,
   72:       causationId: event.causationId,
   73:       subject: event.subject,
```

### lib\chernobog\worldState\freshness.ts line 8

```text
    5: } from "./types";
    6: 
    7: export interface WorldStateFreshnessInput {
>   8:   observedAt: string;
    9:   expiresAt?: string;
   10:   basis?: WorldStateFreshnessBasis;
   11:   ttlMs?: number;
```

### lib\chernobog\worldState\freshness.ts line 42

```text
   39: }
   40: 
   41: export function resolveWorldStateExpiry(
>  42:   observedAt: string,
   43:   ttlMs: number,
   44: ): string {
   45:   const observedAtMs = timestampMs(
```

### lib\chernobog\worldState\freshness.ts line 45

```text
   42:   observedAt: string,
   43:   ttlMs: number,
   44: ): string {
>  45:   const observedAtMs = timestampMs(
   46:     observedAt,
   47:     "worldState.observedAt",
   48:   );
```

### lib\chernobog\worldState\freshness.ts line 46

```text
   43:   ttlMs: number,
   44: ): string {
   45:   const observedAtMs = timestampMs(
>  46:     observedAt,
   47:     "worldState.observedAt",
   48:   );
   49:   const normalizedTtl = normalizeWorldStateTtlMs(ttlMs);
```

### lib\chernobog\worldState\freshness.ts line 47

```text
   44: ): string {
   45:   const observedAtMs = timestampMs(
   46:     observedAt,
>  47:     "worldState.observedAt",
   48:   );
   49:   const normalizedTtl = normalizeWorldStateTtlMs(ttlMs);
   50: 
```

### lib\chernobog\worldState\freshness.ts line 55

```text
   52:     throw new Error("worldState freshness TTL is required.");
   53:   }
   54: 
>  55:   return new Date(observedAtMs + normalizedTtl).toISOString();
   56: }
   57: 
   58: export function determineWorldStateFreshness(
```

### lib\chernobog\worldState\freshness.ts line 68

```text
   65: 
   66:   const now = options.now ?? new Date();
   67:   const nowMs = now.getTime();
>  68:   const observedAtMs = timestampMs(
   69:     input.observedAt,
   70:     "worldState.observedAt",
   71:   );
```

### lib\chernobog\worldState\freshness.ts line 69

```text
   66:   const now = options.now ?? new Date();
   67:   const nowMs = now.getTime();
   68:   const observedAtMs = timestampMs(
>  69:     input.observedAt,
   70:     "worldState.observedAt",
   71:   );
   72:   const expiresAtMs = timestampMs(
```

### lib\chernobog\worldState\freshness.ts line 70

```text
   67:   const nowMs = now.getTime();
   68:   const observedAtMs = timestampMs(
   69:     input.observedAt,
>  70:     "worldState.observedAt",
   71:   );
   72:   const expiresAtMs = timestampMs(
   73:     input.expiresAt,
```

### lib\chernobog\worldState\freshness.ts line 76

```text
   73:     input.expiresAt,
   74:     "worldState.expiresAt",
   75:   );
>  76:   const lifetimeMs = Math.max(0, expiresAtMs - observedAtMs);
   77: 
   78:   if (nowMs >= expiresAtMs) {
   79:     return "stale";
```

### lib\chernobog\worldState\freshness.ts line 123

```text
  120:   return {
  121:     status: determineWorldStateFreshness(
  122:       {
> 123:         observedAt: input.observedAt,
  124:         expiresAt,
  125:       },
  126:       {
```

### lib\chernobog\worldState\index.ts line 9

```text
    6: export * from "./assessment";
    7: export * from "./validation";
    8: export * from "./registry";
>   9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
```

### lib\chernobog\worldState\index.ts line 10

```text
    7: export * from "./validation";
    8: export * from "./registry";
    9: export * from "./projectorTypes";
>  10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
```

### lib\chernobog\worldState\index.ts line 11

```text
    8: export * from "./registry";
    9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
>  11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
```

### lib\chernobog\worldState\index.ts line 12

```text
    9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
>  12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
```

### lib\chernobog\worldState\index.ts line 18

```text
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
   17: export * from "./queryTypes";
>  18: export * from "./queryService";
   19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
   21: export * from "./domainProjectors";
```

### lib\chernobog\worldState\index.ts line 21

```text
   18: export * from "./queryService";
   19: export * from "./httpQuery";
   20: export * from "./snapshotQuery";
>  21: export * from "./domainProjectors";
   22: export * from "./runtimeIntegration";
   23: export * from "./runtimeSingleton";
```

### lib\chernobog\worldState\keys.ts line 5

```text
    2: const WORLD_STATE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;
    3: 
    4: export const CHERNOBOG_WORLD_STATE_NAMESPACES = [
>   5:   "project",
    6:   "repository",
    7:   "service",
    8:   "runtime",
```

### lib\chernobog\worldState\keys.ts line 7

```text
    4: export const CHERNOBOG_WORLD_STATE_NAMESPACES = [
    5:   "project",
    6:   "repository",
>   7:   "service",
    8:   "runtime",
    9:   "model",
   10:   "backup",
```

### lib\chernobog\worldState\keys.ts line 10

```text
    7:   "service",
    8:   "runtime",
    9:   "model",
>  10:   "backup",
   11:   "storage",
   12:   "desktop",
   13:   "execution",
```

### lib\chernobog\worldState\keys.ts line 11

```text
    8:   "runtime",
    9:   "model",
   10:   "backup",
>  11:   "storage",
   12:   "desktop",
   13:   "execution",
   14:   "system",
```

### lib\chernobog\worldState\keys.ts line 12

```text
    9:   "model",
   10:   "backup",
   11:   "storage",
>  12:   "desktop",
   13:   "execution",
   14:   "system",
   15: ] as const;
```

### lib\chernobog\worldState\keys.ts line 32

```text
   29:   const separator = key.indexOf(".");
   30:   if (separator <= 0) {
   31:     throw new Error(
>  32:       "worldState.key must be a lowercase namespaced identifier such as service.ollama.health.",
   33:     );
   34:   }
   35:   return key.slice(0, separator);
```

### lib\chernobog\worldState\projectionEngine.ts line 5

```text
    2:   ChernobogEvent,
    3:   ChernobogEventHandler,
    4: } from "../events/types";
>   5: import type { ChernobogEventBus } from "../events/eventBus";
    6: import {
    7:   buildWorldStateInputFromEvent,
    8: } from "./eventProjection";
```

### lib\chernobog\worldState\projectionEngine.ts line 8

```text
    5: import type { ChernobogEventBus } from "../events/eventBus";
    6: import {
    7:   buildWorldStateInputFromEvent,
>   8: } from "./eventProjection";
    9: import {
   10:   ChernobogWorldStateProjectorRegistry,
   11: } from "./projectorRegistry";
```

### lib\chernobog\worldState\projectionEngine.ts line 10

```text
    7:   buildWorldStateInputFromEvent,
    8: } from "./eventProjection";
    9: import {
>  10:   ChernobogWorldStateProjectorRegistry,
   11: } from "./projectorRegistry";
   12: import type {
   13:   WorldStateProjection,
```

### lib\chernobog\worldState\projectionEngine.ts line 11

```text
    8: } from "./eventProjection";
    9: import {
   10:   ChernobogWorldStateProjectorRegistry,
>  11: } from "./projectorRegistry";
   12: import type {
   13:   WorldStateProjection,
   14:   WorldStateProjectionResult,
```

### lib\chernobog\worldState\projectionEngine.ts line 13

```text
   10:   ChernobogWorldStateProjectorRegistry,
   11: } from "./projectorRegistry";
   12: import type {
>  13:   WorldStateProjection,
   14:   WorldStateProjectionResult,
   15:   WorldStateProjector,
   16: } from "./projectorTypes";
```

### lib\chernobog\worldState\projectionEngine.ts line 14

```text
   11: } from "./projectorRegistry";
   12: import type {
   13:   WorldStateProjection,
>  14:   WorldStateProjectionResult,
   15:   WorldStateProjector,
   16: } from "./projectorTypes";
   17: import {
```

### lib\chernobog\worldState\projectionEngine.ts line 15

```text
   12: import type {
   13:   WorldStateProjection,
   14:   WorldStateProjectionResult,
>  15:   WorldStateProjector,
   16: } from "./projectorTypes";
   17: import {
   18:   ChernobogWorldStateRegistry,
```

### lib\chernobog\worldState\projectionEngine.ts line 16

```text
   13:   WorldStateProjection,
   14:   WorldStateProjectionResult,
   15:   WorldStateProjector,
>  16: } from "./projectorTypes";
   17: import {
   18:   ChernobogWorldStateRegistry,
   19: } from "./registry";
```

### lib\chernobog\worldState\projectionEngine.ts line 21

```text
   18:   ChernobogWorldStateRegistry,
   19: } from "./registry";
   20: 
>  21: function normalizeProjectionOutput(
   22:   output:
   23:     | WorldStateProjection
   24:     | readonly WorldStateProjection[]
```

### lib\chernobog\worldState\projectionEngine.ts line 23

```text
   20: 
   21: function normalizeProjectionOutput(
   22:   output:
>  23:     | WorldStateProjection
   24:     | readonly WorldStateProjection[]
   25:     | undefined,
   26: ): readonly WorldStateProjection[] {
```

### lib\chernobog\worldState\projectionEngine.ts line 24

```text
   21: function normalizeProjectionOutput(
   22:   output:
   23:     | WorldStateProjection
>  24:     | readonly WorldStateProjection[]
   25:     | undefined,
   26: ): readonly WorldStateProjection[] {
   27:   if (!output) {
```

### lib\chernobog\worldState\projectionEngine.ts line 26

```text
   23:     | WorldStateProjection
   24:     | readonly WorldStateProjection[]
   25:     | undefined,
>  26: ): readonly WorldStateProjection[] {
   27:   if (!output) {
   28:     return [];
   29:   }
```

### lib\chernobog\worldState\projectionEngine.ts line 32

```text
   29:   }
   30: 
   31:   if (Array.isArray(output)) {
>  32:     return output as readonly WorldStateProjection[];
   33:   }
   34: 
   35:   return [output as WorldStateProjection];
```

### lib\chernobog\worldState\projectionEngine.ts line 35

```text
   32:     return output as readonly WorldStateProjection[];
   33:   }
   34: 
>  35:   return [output as WorldStateProjection];
   36: }
   37: 
   38: export interface ChernobogWorldStateProjectionEngineOptions {
```

### lib\chernobog\worldState\projectionEngine.ts line 38

```text
   35:   return [output as WorldStateProjection];
   36: }
   37: 
>  38: export interface ChernobogWorldStateProjectionEngineOptions {
   39:   worldState?: ChernobogWorldStateRegistry;
   40:   projectors?: ChernobogWorldStateProjectorRegistry;
   41: }
```

### lib\chernobog\worldState\projectionEngine.ts line 40

```text
   37: 
   38: export interface ChernobogWorldStateProjectionEngineOptions {
   39:   worldState?: ChernobogWorldStateRegistry;
>  40:   projectors?: ChernobogWorldStateProjectorRegistry;
   41: }
   42: 
   43: export class ChernobogWorldStateProjectionEngine {
```

### lib\chernobog\worldState\projectionEngine.ts line 43

```text
   40:   projectors?: ChernobogWorldStateProjectorRegistry;
   41: }
   42: 
>  43: export class ChernobogWorldStateProjectionEngine {
   44:   readonly worldState: ChernobogWorldStateRegistry;
   45:   readonly projectors: ChernobogWorldStateProjectorRegistry;
   46: 
```

### lib\chernobog\worldState\projectionEngine.ts line 45

```text
   42: 
   43: export class ChernobogWorldStateProjectionEngine {
   44:   readonly worldState: ChernobogWorldStateRegistry;
>  45:   readonly projectors: ChernobogWorldStateProjectorRegistry;
   46: 
   47:   constructor(
   48:     options:
```

### lib\chernobog\worldState\projectionEngine.ts line 49

```text
   46: 
   47:   constructor(
   48:     options:
>  49:       ChernobogWorldStateProjectionEngineOptions = {},
   50:   ) {
   51:     this.worldState =
   52:       options.worldState ??
```

### lib\chernobog\worldState\projectionEngine.ts line 55

```text
   52:       options.worldState ??
   53:       new ChernobogWorldStateRegistry();
   54: 
>  55:     this.projectors =
   56:       options.projectors ??
   57:       new ChernobogWorldStateProjectorRegistry();
   58:   }
```

### lib\chernobog\worldState\projectionEngine.ts line 56

```text
   53:       new ChernobogWorldStateRegistry();
   54: 
   55:     this.projectors =
>  56:       options.projectors ??
   57:       new ChernobogWorldStateProjectorRegistry();
   58:   }
   59: 
```

### lib\chernobog\worldState\projectionEngine.ts line 57

```text
   54: 
   55:     this.projectors =
   56:       options.projectors ??
>  57:       new ChernobogWorldStateProjectorRegistry();
   58:   }
   59: 
   60:   register(
```

### lib\chernobog\worldState\projectionEngine.ts line 61

```text
   58:   }
   59: 
   60:   register(
>  61:     projector: WorldStateProjector,
   62:   ): () => void {
   63:     return this.projectors.register(projector);
   64:   }
```

### lib\chernobog\worldState\projectionEngine.ts line 63

```text
   60:   register(
   61:     projector: WorldStateProjector,
   62:   ): () => void {
>  63:     return this.projectors.register(projector);
   64:   }
   65: 
   66:   process(
```

### lib\chernobog\worldState\projectionEngine.ts line 68

```text
   65: 
   66:   process(
   67:     event: ChernobogEvent,
>  68:   ): WorldStateProjectionResult {
   69:     const matching =
   70:       this.projectors.matching(event);
   71: 
```

### lib\chernobog\worldState\projectionEngine.ts line 70

```text
   67:     event: ChernobogEvent,
   68:   ): WorldStateProjectionResult {
   69:     const matching =
>  70:       this.projectors.matching(event);
   71: 
   72:     let emittedProjections = 0;
   73:     let appliedProjections = 0;
```

### lib\chernobog\worldState\projectionEngine.ts line 72

```text
   69:     const matching =
   70:       this.projectors.matching(event);
   71: 
>  72:     let emittedProjections = 0;
   73:     let appliedProjections = 0;
   74:     let ignoredProjections = 0;
   75: 
```

### lib\chernobog\worldState\projectionEngine.ts line 73

```text
   70:       this.projectors.matching(event);
   71: 
   72:     let emittedProjections = 0;
>  73:     let appliedProjections = 0;
   74:     let ignoredProjections = 0;
   75: 
   76:     for (const projector of matching) {
```

### lib\chernobog\worldState\projectionEngine.ts line 74

```text
   71: 
   72:     let emittedProjections = 0;
   73:     let appliedProjections = 0;
>  74:     let ignoredProjections = 0;
   75: 
   76:     for (const projector of matching) {
   77:       const projections =
```

### lib\chernobog\worldState\projectionEngine.ts line 76

```text
   73:     let appliedProjections = 0;
   74:     let ignoredProjections = 0;
   75: 
>  76:     for (const projector of matching) {
   77:       const projections =
   78:         normalizeProjectionOutput(
   79:           projector.project(event),
```

### lib\chernobog\worldState\projectionEngine.ts line 77

```text
   74:     let ignoredProjections = 0;
   75: 
   76:     for (const projector of matching) {
>  77:       const projections =
   78:         normalizeProjectionOutput(
   79:           projector.project(event),
   80:         );
```

### lib\chernobog\worldState\projectionEngine.ts line 78

```text
   75: 
   76:     for (const projector of matching) {
   77:       const projections =
>  78:         normalizeProjectionOutput(
   79:           projector.project(event),
   80:         );
   81: 
```

### lib\chernobog\worldState\projectionEngine.ts line 79

```text
   76:     for (const projector of matching) {
   77:       const projections =
   78:         normalizeProjectionOutput(
>  79:           projector.project(event),
   80:         );
   81: 
   82:       emittedProjections +=
```

### lib\chernobog\worldState\projectionEngine.ts line 82

```text
   79:           projector.project(event),
   80:         );
   81: 
>  82:       emittedProjections +=
   83:         projections.length;
   84: 
   85:       for (const projection of projections) {
```

### lib\chernobog\worldState\projectionEngine.ts line 83

```text
   80:         );
   81: 
   82:       emittedProjections +=
>  83:         projections.length;
   84: 
   85:       for (const projection of projections) {
   86:         const input =
```

### lib\chernobog\worldState\projectionEngine.ts line 85

```text
   82:       emittedProjections +=
   83:         projections.length;
   84: 
>  85:       for (const projection of projections) {
   86:         const input =
   87:           buildWorldStateInputFromEvent(
   88:             event,
```

### lib\chernobog\worldState\projectionEngine.ts line 89

```text
   86:         const input =
   87:           buildWorldStateInputFromEvent(
   88:             event,
>  89:             projection,
   90:             projector.id,
   91:           );
   92: 
```

### lib\chernobog\worldState\projectionEngine.ts line 90

```text
   87:           buildWorldStateInputFromEvent(
   88:             event,
   89:             projection,
>  90:             projector.id,
   91:           );
   92: 
   93:         const result =
```

### lib\chernobog\worldState\projectionEngine.ts line 97

```text
   94:           this.worldState.upsert(input);
   95: 
   96:         if (result.applied) {
>  97:           appliedProjections += 1;
   98:         } else {
   99:           ignoredProjections += 1;
  100:         }
```

### lib\chernobog\worldState\projectionEngine.ts line 99

```text
   96:         if (result.applied) {
   97:           appliedProjections += 1;
   98:         } else {
>  99:           ignoredProjections += 1;
  100:         }
  101:       }
  102:     }
```

### lib\chernobog\worldState\projectionEngine.ts line 107

```text
  104:     return {
  105:       eventId: event.id,
  106:       eventType: event.type,
> 107:       matchedProjectors:
  108:         matching.length,
  109:       emittedProjections,
  110:       appliedProjections,
```

### lib\chernobog\worldState\projectionEngine.ts line 109

```text
  106:       eventType: event.type,
  107:       matchedProjectors:
  108:         matching.length,
> 109:       emittedProjections,
  110:       appliedProjections,
  111:       ignoredProjections,
  112:       projectorIds: matching.map(
```

### lib\chernobog\worldState\projectionEngine.ts line 110

```text
  107:       matchedProjectors:
  108:         matching.length,
  109:       emittedProjections,
> 110:       appliedProjections,
  111:       ignoredProjections,
  112:       projectorIds: matching.map(
  113:         (projector) => projector.id,
```

### lib\chernobog\worldState\projectionEngine.ts line 111

```text
  108:         matching.length,
  109:       emittedProjections,
  110:       appliedProjections,
> 111:       ignoredProjections,
  112:       projectorIds: matching.map(
  113:         (projector) => projector.id,
  114:       ),
```

### lib\chernobog\worldState\projectionEngine.ts line 112

```text
  109:       emittedProjections,
  110:       appliedProjections,
  111:       ignoredProjections,
> 112:       projectorIds: matching.map(
  113:         (projector) => projector.id,
  114:       ),
  115:     };
```

### lib\chernobog\worldState\projectionEngine.ts line 113

```text
  110:       appliedProjections,
  111:       ignoredProjections,
  112:       projectorIds: matching.map(
> 113:         (projector) => projector.id,
  114:       ),
  115:     };
  116:   }
```

### lib\chernobog\worldState\projectionEngine.ts line 125

```text
  122:   }
  123: 
  124:   attach(
> 125:     eventBus: Pick<
  126:       ChernobogEventBus,
  127:       "subscribe"
  128:     >,
```

### lib\chernobog\worldState\projectionEngine.ts line 126

```text
  123: 
  124:   attach(
  125:     eventBus: Pick<
> 126:       ChernobogEventBus,
  127:       "subscribe"
  128:     >,
  129:   ): () => void {
```

### lib\chernobog\worldState\projectionEngine.ts line 130

```text
  127:       "subscribe"
  128:     >,
  129:   ): () => void {
> 130:     return eventBus.subscribe(
  131:       {},
  132:       this.createEventHandler(),
  133:     );
```

### lib\chernobog\worldState\projectionEngine.ts line 137

```text
  134:   }
  135: 
  136:   async rebuildFromEventHistory(
> 137:     eventBus: Pick<
  138:       ChernobogEventBus,
  139:       "replay"
  140:     >,
```

### lib\chernobog\worldState\projectionEngine.ts line 138

```text
  135: 
  136:   async rebuildFromEventHistory(
  137:     eventBus: Pick<
> 138:       ChernobogEventBus,
  139:       "replay"
  140:     >,
  141:   ): Promise<{
```

### lib\chernobog\worldState\projectionEngine.ts line 149

```text
  146:     this.worldState.clear();
  147: 
  148:     const replay =
> 149:       await eventBus.replay(
  150:         (event) => {
  151:           this.process(event);
  152:         },
```

### lib\chernobog\worldState\projectorRegistry.ts line 2

```text
    1: import type { ChernobogEvent } from "../events/types";
>   2: import type { WorldStateProjector } from "./projectorTypes";
    3: 
    4: function normalizeProjectorId(value: string): string {
    5:   const id = value.trim();
```

### lib\chernobog\worldState\projectorRegistry.ts line 4

```text
    1: import type { ChernobogEvent } from "../events/types";
    2: import type { WorldStateProjector } from "./projectorTypes";
    3: 
>   4: function normalizeProjectorId(value: string): string {
    5:   const id = value.trim();
    6:   if (!id) {
    7:     throw new Error("worldState projector id must not be empty.");
```

### lib\chernobog\worldState\projectorRegistry.ts line 7

```text
    4: function normalizeProjectorId(value: string): string {
    5:   const id = value.trim();
    6:   if (!id) {
>   7:     throw new Error("worldState projector id must not be empty.");
    8:   }
    9:   return id;
   10: }
```

### lib\chernobog\worldState\projectorRegistry.ts line 12

```text
    9:   return id;
   10: }
   11: 
>  12: function matchesProjector(
   13:   projector: WorldStateProjector,
   14:   event: ChernobogEvent,
   15: ): boolean {
```

### lib\chernobog\worldState\projectorRegistry.ts line 13

```text
   10: }
   11: 
   12: function matchesProjector(
>  13:   projector: WorldStateProjector,
   14:   event: ChernobogEvent,
   15: ): boolean {
   16:   const exact = projector.eventTypes;
```

### lib\chernobog\worldState\projectorRegistry.ts line 16

```text
   13:   projector: WorldStateProjector,
   14:   event: ChernobogEvent,
   15: ): boolean {
>  16:   const exact = projector.eventTypes;
   17:   const prefixes = projector.eventTypePrefixes;
   18: 
   19:   if ((!exact || exact.length === 0) && (!prefixes || prefixes.length === 0)) {
```

### lib\chernobog\worldState\projectorRegistry.ts line 17

```text
   14:   event: ChernobogEvent,
   15: ): boolean {
   16:   const exact = projector.eventTypes;
>  17:   const prefixes = projector.eventTypePrefixes;
   18: 
   19:   if ((!exact || exact.length === 0) && (!prefixes || prefixes.length === 0)) {
   20:     return true;
```

### lib\chernobog\worldState\projectorRegistry.ts line 34

```text
   31:   return false;
   32: }
   33: 
>  34: export class ChernobogWorldStateProjectorRegistry {
   35:   private readonly projectors = new Map<string, WorldStateProjector>();
   36: 
   37:   register(projector: WorldStateProjector): () => void {
```

### lib\chernobog\worldState\projectorRegistry.ts line 35

```text
   32: }
   33: 
   34: export class ChernobogWorldStateProjectorRegistry {
>  35:   private readonly projectors = new Map<string, WorldStateProjector>();
   36: 
   37:   register(projector: WorldStateProjector): () => void {
   38:     const id = normalizeProjectorId(projector.id);
```

### lib\chernobog\worldState\projectorRegistry.ts line 37

```text
   34: export class ChernobogWorldStateProjectorRegistry {
   35:   private readonly projectors = new Map<string, WorldStateProjector>();
   36: 
>  37:   register(projector: WorldStateProjector): () => void {
   38:     const id = normalizeProjectorId(projector.id);
   39: 
   40:     if (this.projectors.has(id)) {
```

### lib\chernobog\worldState\projectorRegistry.ts line 38

```text
   35:   private readonly projectors = new Map<string, WorldStateProjector>();
   36: 
   37:   register(projector: WorldStateProjector): () => void {
>  38:     const id = normalizeProjectorId(projector.id);
   39: 
   40:     if (this.projectors.has(id)) {
   41:       throw new Error(`worldState projector "${id}" is already registered.`);
```

### lib\chernobog\worldState\projectorRegistry.ts line 40

```text
   37:   register(projector: WorldStateProjector): () => void {
   38:     const id = normalizeProjectorId(projector.id);
   39: 
>  40:     if (this.projectors.has(id)) {
   41:       throw new Error(`worldState projector "${id}" is already registered.`);
   42:     }
   43: 
```

### lib\chernobog\worldState\projectorRegistry.ts line 41

```text
   38:     const id = normalizeProjectorId(projector.id);
   39: 
   40:     if (this.projectors.has(id)) {
>  41:       throw new Error(`worldState projector "${id}" is already registered.`);
   42:     }
   43: 
   44:     const stored: WorldStateProjector = {
```

### lib\chernobog\worldState\projectorRegistry.ts line 44

```text
   41:       throw new Error(`worldState projector "${id}" is already registered.`);
   42:     }
   43: 
>  44:     const stored: WorldStateProjector = {
   45:       ...projector,
   46:       id,
   47:       eventTypes: projector.eventTypes
```

### lib\chernobog\worldState\projectorRegistry.ts line 45

```text
   42:     }
   43: 
   44:     const stored: WorldStateProjector = {
>  45:       ...projector,
   46:       id,
   47:       eventTypes: projector.eventTypes
   48:         ? [...projector.eventTypes]
```

### lib\chernobog\worldState\projectorRegistry.ts line 47

```text
   44:     const stored: WorldStateProjector = {
   45:       ...projector,
   46:       id,
>  47:       eventTypes: projector.eventTypes
   48:         ? [...projector.eventTypes]
   49:         : undefined,
   50:       eventTypePrefixes: projector.eventTypePrefixes
```

### lib\chernobog\worldState\projectorRegistry.ts line 48

```text
   45:       ...projector,
   46:       id,
   47:       eventTypes: projector.eventTypes
>  48:         ? [...projector.eventTypes]
   49:         : undefined,
   50:       eventTypePrefixes: projector.eventTypePrefixes
   51:         ? [...projector.eventTypePrefixes]
```

### lib\chernobog\worldState\projectorRegistry.ts line 50

```text
   47:       eventTypes: projector.eventTypes
   48:         ? [...projector.eventTypes]
   49:         : undefined,
>  50:       eventTypePrefixes: projector.eventTypePrefixes
   51:         ? [...projector.eventTypePrefixes]
   52:         : undefined,
   53:     };
```

### lib\chernobog\worldState\projectorRegistry.ts line 51

```text
   48:         ? [...projector.eventTypes]
   49:         : undefined,
   50:       eventTypePrefixes: projector.eventTypePrefixes
>  51:         ? [...projector.eventTypePrefixes]
   52:         : undefined,
   53:     };
   54: 
```

### lib\chernobog\worldState\projectorRegistry.ts line 55

```text
   52:         : undefined,
   53:     };
   54: 
>  55:     this.projectors.set(id, stored);
   56: 
   57:     return () => {
   58:       this.projectors.delete(id);
```

### lib\chernobog\worldState\projectorRegistry.ts line 58

```text
   55:     this.projectors.set(id, stored);
   56: 
   57:     return () => {
>  58:       this.projectors.delete(id);
   59:     };
   60:   }
   61: 
```

### lib\chernobog\worldState\projectorRegistry.ts line 63

```text
   60:   }
   61: 
   62:   get size(): number {
>  63:     return this.projectors.size;
   64:   }
   65: 
   66:   list(): WorldStateProjector[] {
```

### lib\chernobog\worldState\projectorRegistry.ts line 66

```text
   63:     return this.projectors.size;
   64:   }
   65: 
>  66:   list(): WorldStateProjector[] {
   67:     return [...this.projectors.values()].sort((left, right) =>
   68:       left.id.localeCompare(right.id),
   69:     );
```

### lib\chernobog\worldState\projectorRegistry.ts line 67

```text
   64:   }
   65: 
   66:   list(): WorldStateProjector[] {
>  67:     return [...this.projectors.values()].sort((left, right) =>
   68:       left.id.localeCompare(right.id),
   69:     );
   70:   }
```

### lib\chernobog\worldState\projectorRegistry.ts line 72

```text
   69:     );
   70:   }
   71: 
>  72:   matching(event: ChernobogEvent): WorldStateProjector[] {
   73:     return this.list().filter((projector) => matchesProjector(projector, event));
   74:   }
   75: 
```

### lib\chernobog\worldState\projectorRegistry.ts line 73

```text
   70:   }
   71: 
   72:   matching(event: ChernobogEvent): WorldStateProjector[] {
>  73:     return this.list().filter((projector) => matchesProjector(projector, event));
   74:   }
   75: 
   76:   clear(): void {
```

### lib\chernobog\worldState\projectorRegistry.ts line 77

```text
   74:   }
   75: 
   76:   clear(): void {
>  77:     this.projectors.clear();
   78:   }
   79: }
```

### lib\chernobog\worldState\projectorTypes.ts line 7

```text
    4:   WorldStateRecordInput,
    5: } from "./types";
    6: 
>   7: export interface WorldStateProjection<
    8:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
    9: > extends Omit<
   10:     WorldStateRecordInput<TValue>,
```

### lib\chernobog\worldState\projectorTypes.ts line 11

```text
    8:   TValue extends WorldStateJsonValue = WorldStateJsonValue,
    9: > extends Omit<
   10:     WorldStateRecordInput<TValue>,
>  11:     | "observedAt"
   12:     | "confidence"
   13:     | "confidenceBasis"
   14:     | "expiresAt"
```

### lib\chernobog\worldState\projectorTypes.ts line 19

```text
   16:     | "freshnessTtlMs"
   17:     | "provenance"
   18:   > {
>  19:   observedAt?: string;
   20:   confidence?: number;
   21:   expiresAt?: string;
   22:   ttlMs?: number;
```

### lib\chernobog\worldState\projectorTypes.ts line 25

```text
   22:   ttlMs?: number;
   23: }
   24: 
>  25: export interface WorldStateProjector {
   26:   id: string;
   27:   eventTypes?: readonly string[];
   28:   eventTypePrefixes?: readonly string[];
```

### lib\chernobog\worldState\projectorTypes.ts line 29

```text
   26:   id: string;
   27:   eventTypes?: readonly string[];
   28:   eventTypePrefixes?: readonly string[];
>  29:   project(
   30:     event: ChernobogEvent,
   31:   ):
   32:     | WorldStateProjection
```

### lib\chernobog\worldState\projectorTypes.ts line 32

```text
   29:   project(
   30:     event: ChernobogEvent,
   31:   ):
>  32:     | WorldStateProjection
   33:     | readonly WorldStateProjection[]
   34:     | undefined;
   35: }
```

### lib\chernobog\worldState\projectorTypes.ts line 33

```text
   30:     event: ChernobogEvent,
   31:   ):
   32:     | WorldStateProjection
>  33:     | readonly WorldStateProjection[]
   34:     | undefined;
   35: }
   36: 
```

### lib\chernobog\worldState\projectorTypes.ts line 37

```text
   34:     | undefined;
   35: }
   36: 
>  37: export interface WorldStateProjectionResult {
   38:   eventId: string;
   39:   eventType: string;
   40:   matchedProjectors: number;
```

### lib\chernobog\worldState\projectorTypes.ts line 40

```text
   37: export interface WorldStateProjectionResult {
   38:   eventId: string;
   39:   eventType: string;
>  40:   matchedProjectors: number;
   41:   emittedProjections: number;
   42:   appliedProjections: number;
   43:   ignoredProjections: number;
```

### lib\chernobog\worldState\projectorTypes.ts line 41

```text
   38:   eventId: string;
   39:   eventType: string;
   40:   matchedProjectors: number;
>  41:   emittedProjections: number;
   42:   appliedProjections: number;
   43:   ignoredProjections: number;
   44:   projectorIds: string[];
```

### lib\chernobog\worldState\projectorTypes.ts line 42

```text
   39:   eventType: string;
   40:   matchedProjectors: number;
   41:   emittedProjections: number;
>  42:   appliedProjections: number;
   43:   ignoredProjections: number;
   44:   projectorIds: string[];
   45: }
```

### lib\chernobog\worldState\projectorTypes.ts line 43

```text
   40:   matchedProjectors: number;
   41:   emittedProjections: number;
   42:   appliedProjections: number;
>  43:   ignoredProjections: number;
   44:   projectorIds: string[];
   45: }
```

### lib\chernobog\worldState\projectorTypes.ts line 44

```text
   41:   emittedProjections: number;
   42:   appliedProjections: number;
   43:   ignoredProjections: number;
>  44:   projectorIds: string[];
   45: }
```

### lib\chernobog\worldState\provenance.ts line 20

```text
   17:   const hasAny =
   18:     hasText(provenance.eventId) ||
   19:     hasText(provenance.eventType) ||
>  20:     hasText(provenance.projectorId) ||
   21:     hasText(provenance.correlationId) ||
   22:     hasText(provenance.causationId) ||
   23:     hasText(provenance.subject) ||
```

### lib\chernobog\worldState\provenance.ts line 34

```text
   31:   const complete =
   32:     hasText(provenance.eventId) &&
   33:     hasText(provenance.eventType) &&
>  34:     hasText(provenance.projectorId) &&
   35:     hasText(provenance.source?.subsystem);
   36: 
   37:   return complete ? "complete" : "partial";
```

### lib\chernobog\worldState\queryService.ts line 52

```text
   49:   }
   50: }
   51: 
>  52: export class ChernobogWorldStateQueryService {
   53:   private readonly registry:
   54:     ChernobogWorldStateRegistry;
   55: 
```

### lib\chernobog\worldState\queryService.ts line 158

```text
  155:       );
  156: 
  157:     const evidence = [
> 158:       `Observed at ${record.observedAt}.`,
  159:       `Confidence ${record.confidence.toFixed(2)} (${assessment.confidenceBand}, basis: ${record.confidenceBasis}).`,
  160:       `Freshness ${assessment.freshness.status} (basis: ${assessment.freshness.basis}).`,
  161:       `Provenance ${assessment.provenanceStatus}.`,
```

### lib\chernobog\worldState\queryService.ts line 170

```text
  167:       );
  168:     }
  169: 
> 170:     if (assessment.projectorId) {
  171:       evidence.push(
  172:         `Projector: ${assessment.projectorId}.`,
  173:       );
```

### lib\chernobog\worldState\queryService.ts line 172

```text
  169: 
  170:     if (assessment.projectorId) {
  171:       evidence.push(
> 172:         `Projector: ${assessment.projectorId}.`,
  173:       );
  174:     }
  175: 
```

### lib\chernobog\worldState\recovery.ts line 6

```text
    3:   ChernobogEventHandler,
    4: } from "../events/types";
    5: import type {
>   6:   ChernobogEventBus,
    7: } from "../events/eventBus";
    8: import {
    9:   buildWorldStateSnapshot,
```

### lib\chernobog\worldState\recovery.ts line 7

```text
    4: } from "../events/types";
    5: import type {
    6:   ChernobogEventBus,
>   7: } from "../events/eventBus";
    8: import {
    9:   buildWorldStateSnapshot,
   10: } from "./snapshotIntegrity";
```

### lib\chernobog\worldState\recovery.ts line 19

```text
   16:   WorldStateRecoveryResult,
   17: } from "./snapshotTypes";
   18: import {
>  19:   ChernobogWorldStateProjectionEngine,
   20: } from "./projectionEngine";
   21: 
   22: export interface RecoverWorldStateOptions {
```

### lib\chernobog\worldState\recovery.ts line 20

```text
   17: } from "./snapshotTypes";
   18: import {
   19:   ChernobogWorldStateProjectionEngine,
>  20: } from "./projectionEngine";
   21: 
   22: export interface RecoverWorldStateOptions {
   23:   engine: ChernobogWorldStateProjectionEngine;
```

### lib\chernobog\worldState\recovery.ts line 23

```text
   20: } from "./projectionEngine";
   21: 
   22: export interface RecoverWorldStateOptions {
>  23:   engine: ChernobogWorldStateProjectionEngine;
   24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "replay"
```

### lib\chernobog\worldState\recovery.ts line 24

```text
   21: 
   22: export interface RecoverWorldStateOptions {
   23:   engine: ChernobogWorldStateProjectionEngine;
>  24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "replay"
   27:   >;
```

### lib\chernobog\worldState\recovery.ts line 25

```text
   22: export interface RecoverWorldStateOptions {
   23:   engine: ChernobogWorldStateProjectionEngine;
   24:   eventBus: Pick<
>  25:     ChernobogEventBus,
   26:     "replay"
   27:   >;
   28:   store?: JsonWorldStateSnapshotStore;
```

### lib\chernobog\worldState\recovery.ts line 49

```text
   46: }
   47: 
   48: async function replayAfterSnapshot(
>  49:   engine: ChernobogWorldStateProjectionEngine,
   50:   eventBus: Pick<
   51:     ChernobogEventBus,
   52:     "replay"
```

### lib\chernobog\worldState\recovery.ts line 50

```text
   47: 
   48: async function replayAfterSnapshot(
   49:   engine: ChernobogWorldStateProjectionEngine,
>  50:   eventBus: Pick<
   51:     ChernobogEventBus,
   52:     "replay"
   53:   >,
```

### lib\chernobog\worldState\recovery.ts line 51

```text
   48: async function replayAfterSnapshot(
   49:   engine: ChernobogWorldStateProjectionEngine,
   50:   eventBus: Pick<
>  51:     ChernobogEventBus,
   52:     "replay"
   53:   >,
   54:   snapshotCreatedAt: string,
```

### lib\chernobog\worldState\recovery.ts line 69

```text
   66:   let catchUpEvents = 0;
   67: 
   68:   const result =
>  69:     await eventBus.replay(
   70:       ((event: ChernobogEvent) => {
   71:         const receivedAtMs =
   72:           timestampMs(
```

### lib\chernobog\worldState\recovery.ts line 98

```text
   95: }
   96: 
   97: async function persistCurrentState(
>  98:   engine: ChernobogWorldStateProjectionEngine,
   99:   store: JsonWorldStateSnapshotStore,
  100:   now: Date,
  101: ): Promise<void> {
```

### lib\chernobog\worldState\recovery.ts line 163

```text
  160:     const catchUp =
  161:       await replayAfterSnapshot(
  162:         options.engine,
> 163:         options.eventBus,
  164:         loaded.snapshot.createdAt,
  165:       );
  166: 
```

### lib\chernobog\worldState\recovery.ts line 202

```text
  199:   const rebuilt =
  200:     await options.engine
  201:       .rebuildFromEventHistory(
> 202:         options.eventBus,
  203:       );
  204: 
  205:   if (
```

### lib\chernobog\worldState\registry.ts line 41

```text
   38:   left: WorldStateRecord,
   39:   right: WorldStateRecord,
   40: ): number {
>  41:   const observed = compareIso(
   42:     left.observedAt,
   43:     right.observedAt,
   44:   );
```

### lib\chernobog\worldState\registry.ts line 42

```text
   39:   right: WorldStateRecord,
   40: ): number {
   41:   const observed = compareIso(
>  42:     left.observedAt,
   43:     right.observedAt,
   44:   );
   45:   if (observed !== 0) {
```

### lib\chernobog\worldState\registry.ts line 43

```text
   40: ): number {
   41:   const observed = compareIso(
   42:     left.observedAt,
>  43:     right.observedAt,
   44:   );
   45:   if (observed !== 0) {
   46:     return observed;
```

### lib\chernobog\worldState\registry.ts line 45

```text
   42:     left.observedAt,
   43:     right.observedAt,
   44:   );
>  45:   if (observed !== 0) {
   46:     return observed;
   47:   }
   48: 
```

### lib\chernobog\worldState\registry.ts line 46

```text
   43:     right.observedAt,
   44:   );
   45:   if (observed !== 0) {
>  46:     return observed;
   47:   }
   48: 
   49:   const received = compareIso(
```

### lib\chernobog\worldState\registry.ts line 142

```text
  139:           existing,
  140:         ) as WorldStateRecord<TValue>,
  141:         applied: false,
> 142:         reason: "older-observation",
  143:       };
  144:     }
  145: 
```

### lib\chernobog\worldState\registry.ts line 152

```text
  149:           existing,
  150:         ) as WorldStateRecord<TValue>,
  151:         applied: false,
> 152:         reason: "same-observation",
  153:       };
  154:     }
  155: 
```

### lib\chernobog\worldState\registry.ts line 258

```text
  255:           const freshness =
  256:             buildWorldStateFreshness(
  257:               {
> 258:                 observedAt:
  259:                   record.observedAt,
  260:                 expiresAt:
  261:                   record.freshness
```

### lib\chernobog\worldState\registry.ts line 259

```text
  256:             buildWorldStateFreshness(
  257:               {
  258:                 observedAt:
> 259:                   record.observedAt,
  260:                 expiresAt:
  261:                   record.freshness
  262:                     .expiresAt,
```

### lib\chernobog\worldState\registry.ts line 291

```text
  288:         cloned.freshness =
  289:           buildWorldStateFreshness(
  290:             {
> 291:               observedAt:
  292:                 cloned.observedAt,
  293:               expiresAt:
  294:                 cloned.freshness
```

### lib\chernobog\worldState\registry.ts line 292

```text
  289:           buildWorldStateFreshness(
  290:             {
  291:               observedAt:
> 292:                 cloned.observedAt,
  293:               expiresAt:
  294:                 cloned.freshness
  295:                   .expiresAt,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 2

```text
    1: import type {
>   2:   ChernobogEventBus,
    3: } from "../events/eventBus";
    4: import {
    5:   buildWorldStateSnapshot,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 3

```text
    1: import type {
    2:   ChernobogEventBus,
>   3: } from "../events/eventBus";
    4: import {
    5:   buildWorldStateSnapshot,
    6: } from "./snapshotIntegrity";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 14

```text
   11:   recoverWorldState,
   12: } from "./recovery";
   13: import {
>  14:   ChernobogWorldStateProjectionEngine,
   15: } from "./projectionEngine";
   16: import {
   17:   registerChernobogDomainProjectors,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 15

```text
   12: } from "./recovery";
   13: import {
   14:   ChernobogWorldStateProjectionEngine,
>  15: } from "./projectionEngine";
   16: import {
   17:   registerChernobogDomainProjectors,
   18: } from "./domainProjectors";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 17

```text
   14:   ChernobogWorldStateProjectionEngine,
   15: } from "./projectionEngine";
   16: import {
>  17:   registerChernobogDomainProjectors,
   18: } from "./domainProjectors";
   19: import type {
   20:   WorldStateRecoveryResult,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 18

```text
   15: } from "./projectionEngine";
   16: import {
   17:   registerChernobogDomainProjectors,
>  18: } from "./domainProjectors";
   19: import type {
   20:   WorldStateRecoveryResult,
   21: } from "./snapshotTypes";
```

### lib\chernobog\worldState\runtimeIntegration.ts line 24

```text
   21: } from "./snapshotTypes";
   22: 
   23: export interface StartChernobogWorldStateRuntimeOptions {
>  24:   eventBus: Pick<
   25:     ChernobogEventBus,
   26:     "subscribe" | "replay"
   27:   >;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 25

```text
   22: 
   23: export interface StartChernobogWorldStateRuntimeOptions {
   24:   eventBus: Pick<
>  25:     ChernobogEventBus,
   26:     "subscribe" | "replay"
   27:   >;
   28:   engine?:
```

### lib\chernobog\worldState\runtimeIntegration.ts line 29

```text
   26:     "subscribe" | "replay"
   27:   >;
   28:   engine?:
>  29:     ChernobogWorldStateProjectionEngine;
   30:   store?:
   31:     JsonWorldStateSnapshotStore;
   32:   clock?: () => Date;
```

### lib\chernobog\worldState\runtimeIntegration.ts line 37

```text
   34: 
   35: export interface ChernobogWorldStateRuntime {
   36:   engine:
>  37:     ChernobogWorldStateProjectionEngine;
   38:   store:
   39:     JsonWorldStateSnapshotStore;
   40:   recovery:
```

### lib\chernobog\worldState\runtimeIntegration.ts line 56

```text
   53: 
   54:   const engine =
   55:     options.engine ??
>  56:     new ChernobogWorldStateProjectionEngine();
   57: 
   58:   const store =
   59:     options.store ??
```

### lib\chernobog\worldState\runtimeIntegration.ts line 62

```text
   59:     options.store ??
   60:     new JsonWorldStateSnapshotStore();
   61: 
>  62:   const unregisterProjectors =
   63:     registerChernobogDomainProjectors(
   64:       engine,
   65:     );
```

### lib\chernobog\worldState\runtimeIntegration.ts line 63

```text
   60:     new JsonWorldStateSnapshotStore();
   61: 
   62:   const unregisterProjectors =
>  63:     registerChernobogDomainProjectors(
   64:       engine,
   65:     );
   66: 
```

### lib\chernobog\worldState\runtimeIntegration.ts line 96

```text
   93:     recovery =
   94:       await recoverWorldState({
   95:         engine,
>  96:         eventBus:
   97:           options.eventBus,
   98:         store,
   99:         now:
```

### lib\chernobog\worldState\runtimeIntegration.ts line 97

```text
   94:       await recoverWorldState({
   95:         engine,
   96:         eventBus:
>  97:           options.eventBus,
   98:         store,
   99:         now:
  100:           clock,
```

### lib\chernobog\worldState\runtimeIntegration.ts line 103

```text
  100:           clock,
  101:       });
  102:   } catch (error) {
> 103:     unregisterProjectors();
  104:     throw error;
  105:   }
  106: 
```

### lib\chernobog\worldState\runtimeIntegration.ts line 110

```text
  107:   let stopped = false;
  108: 
  109:   const unsubscribe =
> 110:     options.eventBus.subscribe(
  111:       {},
  112:       async (event) => {
  113:         if (stopped) {
```

### lib\chernobog\worldState\runtimeIntegration.ts line 139

```text
  136: 
  137:       stopped = true;
  138:       unsubscribe();
> 139:       unregisterProjectors();
  140:       await persistenceChain;
  141:     },
  142:   };
```

### lib\chernobog\worldState\runtimeSingleton.ts line 2

```text
    1: import {
>   2:   getChernobogEventBus,
    3: } from "../events";
    4: import {
    5:   startChernobogWorldStateRuntime,
```

### lib\chernobog\worldState\runtimeSingleton.ts line 24

```text
   21:     !worldStateGlobals
   22:       .__chernobogWorldStateRuntimePromise
   23:   ) {
>  24:     const eventBus =
   25:       getChernobogEventBus();
   26: 
   27:     const startup =
```

### lib\chernobog\worldState\runtimeSingleton.ts line 25

```text
   22:       .__chernobogWorldStateRuntimePromise
   23:   ) {
   24:     const eventBus =
>  25:       getChernobogEventBus();
   26: 
   27:     const startup =
   28:       startChernobogWorldStateRuntime({
```

### lib\chernobog\worldState\runtimeSingleton.ts line 29

```text
   26: 
   27:     const startup =
   28:       startChernobogWorldStateRuntime({
>  29:         eventBus,
   30:       }).catch((error) => {
   31:         delete worldStateGlobals
   32:           .__chernobogWorldStateRuntimePromise;
```

### lib\chernobog\worldState\snapshotQuery.ts line 2

```text
    1: import {
>   2:   ChernobogWorldStateQueryService,
    3: } from "./queryService";
    4: import {
    5:   ChernobogWorldStateRegistry,
```

### lib\chernobog\worldState\snapshotQuery.ts line 3

```text
    1: import {
    2:   ChernobogWorldStateQueryService,
>   3: } from "./queryService";
    4: import {
    5:   ChernobogWorldStateRegistry,
    6: } from "./registry";
```

### lib\chernobog\worldState\snapshotQuery.ts line 57

```text
   54:     loaded.snapshot.records,
   55:   );
   56: 
>  57:   const service =
   58:     new ChernobogWorldStateQueryService(
   59:       registry,
   60:       clock,
```

### lib\chernobog\worldState\snapshotQuery.ts line 58

```text
   55:   );
   56: 
   57:   const service =
>  58:     new ChernobogWorldStateQueryService(
   59:       registry,
   60:       clock,
   61:     );
```

### lib\chernobog\worldState\snapshotQuery.ts line 72

```text
   69:     snapshotCreatedAt:
   70:       loaded.snapshot.createdAt,
   71:     result:
>  72:       service.read(
   73:         options.query,
   74:         "snapshot",
   75:       ),
```

### lib\chernobog\worldState\snapshotQuery.ts line 77

```text
   74:         "snapshot",
   75:       ),
   76:     diagnostics:
>  77:       service.diagnostics(),
   78:   };
   79: }
```

### lib\chernobog\worldState\types.ts line 33

```text
   30: }
   31: 
   32: export type WorldStateConfidenceBasis =
>  33:   | "projector"
   34:   | "event"
   35:   | "record"
   36:   | "default";
```

### lib\chernobog\worldState\types.ts line 50

```text
   47:   eventType?: string;
   48:   eventOccurredAt?: string;
   49:   eventReceivedAt?: string;
>  50:   projectorId?: string;
   51:   correlationId?: string;
   52:   causationId?: string;
   53:   subject?: string;
```

### lib\chernobog\worldState\types.ts line 65

```text
   62:   key: string;
   63:   namespace: string;
   64:   value: TValue;
>  65:   observedAt: string;
   66:   updatedAt: string;
   67:   confidence: number;
   68:   confidenceBasis: WorldStateConfidenceBasis;
```

### lib\chernobog\worldState\types.ts line 79

```text
   76:   key: string;
   77:   namespace?: string;
   78:   value: TValue;
>  79:   observedAt?: string;
   80:   updatedAt?: string;
   81:   confidence?: number;
   82:   confidenceBasis?: WorldStateConfidenceBasis;
```

### lib\chernobog\worldState\types.ts line 101

```text
   98: > {
   99:   record: WorldStateRecord<TValue>;
  100:   applied: boolean;
> 101:   reason: "created" | "updated" | "older-observation" | "same-observation";
  102: }
  103: 
  104: export interface WorldStateEvidenceAssessment {
```

### lib\chernobog\worldState\types.ts line 106

```text
  103: 
  104: export interface WorldStateEvidenceAssessment {
  105:   key: string;
> 106:   observedAt: string;
  107:   ageMs: number;
  108:   confidence: number;
  109:   confidenceBasis: WorldStateConfidenceBasis;
```

### lib\chernobog\worldState\types.ts line 115

```text
  112:   provenanceStatus: WorldStateProvenanceStatus;
  113:   eventId?: string;
  114:   eventType?: string;
> 115:   projectorId?: string;
  116:   sourceSubsystem?: string;
  117: }
```

### lib\chernobog\worldState\validation.ts line 94

```text
   91: 
   92:   const eventId = normalizeOptional(provenance.eventId);
   93:   const eventType = normalizeOptional(provenance.eventType);
>  94:   const projectorId = normalizeOptional(provenance.projectorId);
   95:   const correlationId = normalizeOptional(
   96:     provenance.correlationId,
   97:   );
```

### lib\chernobog\worldState\validation.ts line 137

```text
  134:   if (
  135:     !eventId &&
  136:     !eventType &&
> 137:     !projectorId &&
  138:     !correlationId &&
  139:     !causationId &&
  140:     !subject &&
```

### lib\chernobog\worldState\validation.ts line 154

```text
  151:     eventType,
  152:     eventOccurredAt,
  153:     eventReceivedAt,
> 154:     projectorId,
  155:     correlationId,
  156:     causationId,
  157:     subject,
```

### lib\chernobog\worldState\validation.ts line 173

```text
  170: 
  171:   if (!isValidWorldStateKey(key)) {
  172:     throw new Error(
> 173:       "worldState.key must be a lowercase namespaced identifier such as service.ollama.health.",
  174:     );
  175:   }
  176: 
```

### lib\chernobog\worldState\validation.ts line 203

```text
  200:       input.confidenceBasis,
  201:     );
  202: 
> 203:   const observedAt = input.observedAt
  204:     ? requireIsoTimestamp(
  205:         input.observedAt,
  206:         "worldState.observedAt",
```

### lib\chernobog\worldState\validation.ts line 205

```text
  202: 
  203:   const observedAt = input.observedAt
  204:     ? requireIsoTimestamp(
> 205:         input.observedAt,
  206:         "worldState.observedAt",
  207:       )
  208:     : now.toISOString();
```

### lib\chernobog\worldState\validation.ts line 206

```text
  203:   const observedAt = input.observedAt
  204:     ? requireIsoTimestamp(
  205:         input.observedAt,
> 206:         "worldState.observedAt",
  207:       )
  208:     : now.toISOString();
  209: 
```

### lib\chernobog\worldState\validation.ts line 231

```text
  228:   if (
  229:     expiresAt &&
  230:     new Date(expiresAt).getTime() <
> 231:       new Date(observedAt).getTime()
  232:   ) {
  233:     throw new Error(
  234:       "worldState.expiresAt must not be earlier than worldState.observedAt.",
```

### lib\chernobog\worldState\validation.ts line 234

```text
  231:       new Date(observedAt).getTime()
  232:   ) {
  233:     throw new Error(
> 234:       "worldState.expiresAt must not be earlier than worldState.observedAt.",
  235:     );
  236:   }
  237: 
```

### lib\chernobog\worldState\validation.ts line 243

```text
  240:     key,
  241:     namespace,
  242:     value: cloneJsonValue(input.value),
> 243:     observedAt,
  244:     updatedAt,
  245:     confidence,
  246:     confidenceBasis,
```

### lib\chernobog\worldState\validation.ts line 249

```text
  246:     confidenceBasis,
  247:     freshness: buildWorldStateFreshness(
  248:       {
> 249:         observedAt,
  250:         expiresAt,
  251:         basis: input.freshnessBasis,
  252:         ttlMs: freshnessTtlMs,
```

### lib\chernobog\worldState\validation.ts line 285

```text
  282:       key: String(record.key ?? ""),
  283:       namespace: record.namespace,
  284:       value: record.value as WorldStateJsonValue,
> 285:       observedAt: String(record.observedAt ?? ""),
  286:       updatedAt: String(record.updatedAt ?? ""),
  287:       confidence: record.confidence,
  288:       confidenceBasis: record.confidenceBasis,
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 1

```text
>   1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ModelAvailabilitySnapshot,
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 8

```text
    5:   ModelRoleAvailability,
    6: } from "./modelAvailability";
    7: 
>   8: async function publishModelRoleAvailability(
    9:   entry: ModelRoleAvailability,
   10:   providerId: string,
   11:   nodeId?: string
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 18

```text
   15:       ? "runtime.model_role_available"
   16:       : "runtime.model_role_unavailable";
   17: 
>  18:   await publishChernobogEventSafely({
   19:     type,
   20: 
   21:     source: {
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 22

```text
   19:     type,
   20: 
   21:     source: {
>  22:       subsystem: "runtime-health",
   23:       nodeId,
   24:     },
   25: 
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 81

```text
   78:   });
   79: }
   80: 
>  81: export async function publishModelAvailabilitySnapshot(
   82:   snapshot: ModelAvailabilitySnapshot,
   83:   options: {
   84:     providerId?: string;
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 96

```text
   93:     const entry of
   94:     snapshot.roles
   95:   ) {
>  96:     await publishModelRoleAvailability(
   97:       entry,
   98:       providerId,
   99:       options.nodeId
```

### lib\chernobog\runtime\ollamaHealth.ts line 11

```text
    8:   } from "./modelAvailability";
    9:   
   10:   import {
>  11:     publishModelAvailabilitySnapshot,
   12:   } from "./modelAvailabilityEvents";
   13:   
   14:   import type {
```

### lib\chernobog\runtime\ollamaHealth.ts line 15

```text
   12:   } from "./modelAvailabilityEvents";
   13:   
   14:   import type {
>  15:     ChernobogHealthStatus,
   16:     ChernobogRuntimeObservation,
   17:   } from "./runtimeHealth";
   18:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 16

```text
   13:   
   14:   import type {
   15:     ChernobogHealthStatus,
>  16:     ChernobogRuntimeObservation,
   17:   } from "./runtimeHealth";
   18:   
   19:   import {
```

### lib\chernobog\runtime\ollamaHealth.ts line 17

```text
   14:   import type {
   15:     ChernobogHealthStatus,
   16:     ChernobogRuntimeObservation,
>  17:   } from "./runtimeHealth";
   18:   
   19:   import {
   20:     createRuntimeObservation,
```

### lib\chernobog\runtime\ollamaHealth.ts line 20

```text
   17:   } from "./runtimeHealth";
   18:   
   19:   import {
>  20:     createRuntimeObservation,
   21:   } from "./runtimeHealth";
   22:   
   23:   import {
```

### lib\chernobog\runtime\ollamaHealth.ts line 21

```text
   18:   
   19:   import {
   20:     createRuntimeObservation,
>  21:   } from "./runtimeHealth";
   22:   
   23:   import {
   24:     publishRuntimeHealthObservation,
```

### lib\chernobog\runtime\ollamaHealth.ts line 24

```text
   21:   } from "./runtimeHealth";
   22:   
   23:   import {
>  24:     publishRuntimeHealthObservation,
   25:   } from "./runtimeHealthEvents";
   26: 
   27:   interface OllamaTagsModel {
```

### lib\chernobog\runtime\ollamaHealth.ts line 25

```text
   22:   
   23:   import {
   24:     publishRuntimeHealthObservation,
>  25:   } from "./runtimeHealthEvents";
   26: 
   27:   interface OllamaTagsModel {
   28:     name?: unknown;
```

### lib\chernobog\runtime\ollamaHealth.ts line 36

```text
   33:     models?: unknown;
   34:   }
   35:   
>  36:   export interface OllamaHealthProbeOptions {
   37:     timeoutMs?: number;
   38:   
   39:     nodeId?: string;
```

### lib\chernobog\runtime\ollamaHealth.ts line 44

```text
   41:     platform?: string;
   42:   }
   43:   
>  44:   export interface OllamaHealthResult {
   45:     observation:
   46:       ChernobogRuntimeObservation;
   47:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 45

```text
   42:   }
   43:   
   44:   export interface OllamaHealthResult {
>  45:     observation:
   46:       ChernobogRuntimeObservation;
   47:   
   48:     installedModels:
```

### lib\chernobog\runtime\ollamaHealth.ts line 46

```text
   43:   
   44:   export interface OllamaHealthResult {
   45:     observation:
>  46:       ChernobogRuntimeObservation;
   47:   
   48:     installedModels:
   49:       string[];
```

### lib\chernobog\runtime\ollamaHealth.ts line 52

```text
   49:       string[];
   50:   }
   51: 
>  52:   export interface PublishedOllamaHealthResult
   53:   extends OllamaHealthResult {
   54:   modelAvailability:
   55:     ModelAvailabilitySnapshot;
```

### lib\chernobog\runtime\ollamaHealth.ts line 53

```text
   50:   }
   51: 
   52:   export interface PublishedOllamaHealthResult
>  53:   extends OllamaHealthResult {
   54:   modelAvailability:
   55:     ModelAvailabilitySnapshot;
   56: }
```

### lib\chernobog\runtime\ollamaHealth.ts line 58

```text
   55:     ModelAvailabilitySnapshot;
   56: }
   57:   
>  58:   export interface ObserveAndPublishOllamaHealthOptions
   59:     extends OllamaHealthProbeOptions {
   60:     previousStatus?:
   61:       ChernobogHealthStatus;
```

### lib\chernobog\runtime\ollamaHealth.ts line 59

```text
   56: }
   57:   
   58:   export interface ObserveAndPublishOllamaHealthOptions
>  59:     extends OllamaHealthProbeOptions {
   60:     previousStatus?:
   61:       ChernobogHealthStatus;
   62:   }
```

### lib\chernobog\runtime\ollamaHealth.ts line 61

```text
   58:   export interface ObserveAndPublishOllamaHealthOptions
   59:     extends OllamaHealthProbeOptions {
   60:     previousStatus?:
>  61:       ChernobogHealthStatus;
   62:   }
   63:   
   64:   function extractInstalledModels(
```

### lib\chernobog\runtime\ollamaHealth.ts line 121

```text
  118:     ].sort();
  119:   }
  120:   
> 121:   function failedObservation(
  122:     args: {
  123:       nodeId?: string;
  124:       platform?: string;
```

### lib\chernobog\runtime\ollamaHealth.ts line 132

```text
  129:         string | number | boolean | null
  130:       >;
  131:     }
> 132:   ): ChernobogRuntimeObservation {
  133:     return createRuntimeObservation({
  134:       id: "ollama",
  135:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 133

```text
  130:       >;
  131:     }
  132:   ): ChernobogRuntimeObservation {
> 133:     return createRuntimeObservation({
  134:       id: "ollama",
  135:   
  136:       kind: "model-provider",
```

### lib\chernobog\runtime\ollamaHealth.ts line 159

```text
  156:     });
  157:   }
  158:   
> 159:   export async function probeOllamaHealth(
  160:     options:
  161:       OllamaHealthProbeOptions = {}
  162:   ): Promise<OllamaHealthResult> {
```

### lib\chernobog\runtime\ollamaHealth.ts line 161

```text
  158:   
  159:   export async function probeOllamaHealth(
  160:     options:
> 161:       OllamaHealthProbeOptions = {}
  162:   ): Promise<OllamaHealthResult> {
  163:     const timeoutMs =
  164:       options.timeoutMs ??
```

### lib\chernobog\runtime\ollamaHealth.ts line 162

```text
  159:   export async function probeOllamaHealth(
  160:     options:
  161:       OllamaHealthProbeOptions = {}
> 162:   ): Promise<OllamaHealthResult> {
  163:     const timeoutMs =
  164:       options.timeoutMs ??
  165:       3_000;
```

### lib\chernobog\runtime\ollamaHealth.ts line 204

```text
  201:   
  202:       if (!response.ok) {
  203:         return {
> 204:           observation:
  205:             failedObservation({
  206:               nodeId:
  207:                 options.nodeId,
```

### lib\chernobog\runtime\ollamaHealth.ts line 205

```text
  202:       if (!response.ok) {
  203:         return {
  204:           observation:
> 205:             failedObservation({
  206:               nodeId:
  207:                 options.nodeId,
  208:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 237

```text
  234:             OllamaTagsResponse;
  235:       } catch {
  236:         return {
> 237:           observation:
  238:             failedObservation({
  239:               nodeId:
  240:                 options.nodeId,
```

### lib\chernobog\runtime\ollamaHealth.ts line 238

```text
  235:       } catch {
  236:         return {
  237:           observation:
> 238:             failedObservation({
  239:               nodeId:
  240:                 options.nodeId,
  241:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 262

```text
  259:         );
  260:   
  261:       return {
> 262:         observation:
  263:           createRuntimeObservation({
  264:             id: "ollama",
  265:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 263

```text
  260:   
  261:       return {
  262:         observation:
> 263:           createRuntimeObservation({
  264:             id: "ollama",
  265:   
  266:             kind:
```

### lib\chernobog\runtime\ollamaHealth.ts line 270

```text
  267:               "model-provider",
  268:   
  269:             status:
> 270:               "healthy",
  271:   
  272:             nodeId:
  273:               options.nodeId,
```

### lib\chernobog\runtime\ollamaHealth.ts line 305

```text
  302:           "AbortError";
  303:   
  304:       return {
> 305:         observation:
  306:           failedObservation({
  307:             nodeId:
  308:               options.nodeId,
```

### lib\chernobog\runtime\ollamaHealth.ts line 306

```text
  303:   
  304:       return {
  305:         observation:
> 306:           failedObservation({
  307:             nodeId:
  308:               options.nodeId,
  309:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 317

```text
  314:             latencyMs,
  315:   
  316:             message: aborted
> 317:               ? `Ollama health probe timed out after ${timeoutMs}ms`
  318:               : "Ollama health probe failed",
  319:   
  320:             metadata: {
```

### lib\chernobog\runtime\ollamaHealth.ts line 318

```text
  315:   
  316:             message: aborted
  317:               ? `Ollama health probe timed out after ${timeoutMs}ms`
> 318:               : "Ollama health probe failed",
  319:   
  320:             metadata: {
  321:               timeout:
```

### lib\chernobog\runtime\ollamaHealth.ts line 335

```text
  332:     }
  333:   }
  334: 
> 335:   export async function observeAndPublishOllamaHealth(
  336:     options:
  337:       ObserveAndPublishOllamaHealthOptions = {}
  338:   ): Promise<PublishedOllamaHealthResult> {
```

### lib\chernobog\runtime\ollamaHealth.ts line 337

```text
  334: 
  335:   export async function observeAndPublishOllamaHealth(
  336:     options:
> 337:       ObserveAndPublishOllamaHealthOptions = {}
  338:   ): Promise<PublishedOllamaHealthResult> {
  339:     const result =
  340:       await probeOllamaHealth(
```

### lib\chernobog\runtime\ollamaHealth.ts line 338

```text
  335:   export async function observeAndPublishOllamaHealth(
  336:     options:
  337:       ObserveAndPublishOllamaHealthOptions = {}
> 338:   ): Promise<PublishedOllamaHealthResult> {
  339:     const result =
  340:       await probeOllamaHealth(
  341:         options
```

### lib\chernobog\runtime\ollamaHealth.ts line 340

```text
  337:       ObserveAndPublishOllamaHealthOptions = {}
  338:   ): Promise<PublishedOllamaHealthResult> {
  339:     const result =
> 340:       await probeOllamaHealth(
  341:         options
  342:       );
  343:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 344

```text
  341:         options
  342:       );
  343:   
> 344:     await publishRuntimeHealthObservation(
  345:       result.observation,
  346:       {
  347:         previousStatus:
```

### lib\chernobog\runtime\ollamaHealth.ts line 345

```text
  342:       );
  343:   
  344:     await publishRuntimeHealthObservation(
> 345:       result.observation,
  346:       {
  347:         previousStatus:
  348:           options.previousStatus,
```

### lib\chernobog\runtime\ollamaHealth.ts line 357

```text
  354:         result.installedModels
  355:       );
  356:   
> 357:     await publishModelAvailabilitySnapshot(
  358:       modelAvailability,
  359:       {
  360:         providerId:
```

### lib\chernobog\runtime\ollamaHealth.ts line 361

```text
  358:       modelAvailability,
  359:       {
  360:         providerId:
> 361:           result.observation.id,
  362:   
  363:         nodeId:
  364:           result.observation.nodeId,
```

### lib\chernobog\runtime\ollamaHealth.ts line 364

```text
  361:           result.observation.id,
  362:   
  363:         nodeId:
> 364:           result.observation.nodeId,
  365:       }
  366:     );
  367:   
```

### lib\chernobog\runtime\runtimeHealth.ts line 1

```text
>   1: export const CHERNOBOG_HEALTH_STATUSES = [
    2:     "healthy",
    3:     "degraded",
    4:     "failed",
```

### lib\chernobog\runtime\runtimeHealth.ts line 2

```text
    1: export const CHERNOBOG_HEALTH_STATUSES = [
>   2:     "healthy",
    3:     "degraded",
    4:     "failed",
    5:     "unknown",
```

### lib\chernobog\runtime\runtimeHealth.ts line 8

```text
    5:     "unknown",
    6:   ] as const;
    7:   
>   8:   export type ChernobogHealthStatus =
    9:     (typeof CHERNOBOG_HEALTH_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_RUNTIME_KINDS = [
```

### lib\chernobog\runtime\runtimeHealth.ts line 9

```text
    6:   ] as const;
    7:   
    8:   export type ChernobogHealthStatus =
>   9:     (typeof CHERNOBOG_HEALTH_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_RUNTIME_KINDS = [
   12:     "service",
```

### lib\chernobog\runtime\runtimeHealth.ts line 12

```text
    9:     (typeof CHERNOBOG_HEALTH_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_RUNTIME_KINDS = [
>  12:     "service",
   13:     "runtime-node",
   14:     "model-provider",
   15:   ] as const;
```

### lib\chernobog\runtime\runtimeHealth.ts line 20

```text
   17:   export type ChernobogRuntimeKind =
   18:     (typeof CHERNOBOG_RUNTIME_KINDS)[number];
   19:   
>  20:   export interface ChernobogRuntimeObservation {
   21:     id: string;
   22:   
   23:     kind: ChernobogRuntimeKind;
```

### lib\chernobog\runtime\runtimeHealth.ts line 25

```text
   22:   
   23:     kind: ChernobogRuntimeKind;
   24:   
>  25:     status: ChernobogHealthStatus;
   26:   
   27:     observedAt: string;
   28:   
```

### lib\chernobog\runtime\runtimeHealth.ts line 27

```text
   24:   
   25:     status: ChernobogHealthStatus;
   26:   
>  27:     observedAt: string;
   28:   
   29:     nodeId?: string;
   30:   
```

### lib\chernobog\runtime\runtimeHealth.ts line 45

```text
   42:     >;
   43:   }
   44:   
>  45:   export function createRuntimeObservation(
   46:     input: Omit<
   47:       ChernobogRuntimeObservation,
   48:       "observedAt"
```

### lib\chernobog\runtime\runtimeHealth.ts line 47

```text
   44:   
   45:   export function createRuntimeObservation(
   46:     input: Omit<
>  47:       ChernobogRuntimeObservation,
   48:       "observedAt"
   49:     > & {
   50:       observedAt?: string;
```

### lib\chernobog\runtime\runtimeHealth.ts line 48

```text
   45:   export function createRuntimeObservation(
   46:     input: Omit<
   47:       ChernobogRuntimeObservation,
>  48:       "observedAt"
   49:     > & {
   50:       observedAt?: string;
   51:     }
```

### lib\chernobog\runtime\runtimeHealth.ts line 50

```text
   47:       ChernobogRuntimeObservation,
   48:       "observedAt"
   49:     > & {
>  50:       observedAt?: string;
   51:     }
   52:   ): ChernobogRuntimeObservation {
   53:     return {
```

### lib\chernobog\runtime\runtimeHealth.ts line 52

```text
   49:     > & {
   50:       observedAt?: string;
   51:     }
>  52:   ): ChernobogRuntimeObservation {
   53:     return {
   54:       ...input,
   55:       observedAt:
```

### lib\chernobog\runtime\runtimeHealth.ts line 55

```text
   52:   ): ChernobogRuntimeObservation {
   53:     return {
   54:       ...input,
>  55:       observedAt:
   56:         input.observedAt ??
   57:         new Date().toISOString(),
   58:     };
```

### lib\chernobog\runtime\runtimeHealth.ts line 56

```text
   53:     return {
   54:       ...input,
   55:       observedAt:
>  56:         input.observedAt ??
   57:         new Date().toISOString(),
   58:     };
   59:   }
```

### lib\chernobog\runtime\runtimeHealth.ts line 61

```text
   58:     };
   59:   }
   60:   
>  61:   export function isHealthyRuntimeObservation(
   62:     observation: ChernobogRuntimeObservation
   63:   ): boolean {
   64:     return observation.status === "healthy";
```

### lib\chernobog\runtime\runtimeHealth.ts line 62

```text
   59:   }
   60:   
   61:   export function isHealthyRuntimeObservation(
>  62:     observation: ChernobogRuntimeObservation
   63:   ): boolean {
   64:     return observation.status === "healthy";
   65:   }
```

### lib\chernobog\runtime\runtimeHealth.ts line 64

```text
   61:   export function isHealthyRuntimeObservation(
   62:     observation: ChernobogRuntimeObservation
   63:   ): boolean {
>  64:     return observation.status === "healthy";
   65:   }
   66:   
   67:   export function isUnavailableRuntimeObservation(
```

### lib\chernobog\runtime\runtimeHealth.ts line 67

```text
   64:     return observation.status === "healthy";
   65:   }
   66:   
>  67:   export function isUnavailableRuntimeObservation(
   68:     observation: ChernobogRuntimeObservation
   69:   ): boolean {
   70:     return (
```

### lib\chernobog\runtime\runtimeHealth.ts line 68

```text
   65:   }
   66:   
   67:   export function isUnavailableRuntimeObservation(
>  68:     observation: ChernobogRuntimeObservation
   69:   ): boolean {
   70:     return (
   71:       observation.status === "failed" ||
```

### lib\chernobog\runtime\runtimeHealth.ts line 71

```text
   68:     observation: ChernobogRuntimeObservation
   69:   ): boolean {
   70:     return (
>  71:       observation.status === "failed" ||
   72:       observation.status === "unknown"
   73:     );
   74:   }
```

### lib\chernobog\runtime\runtimeHealth.ts line 72

```text
   69:   ): boolean {
   70:     return (
   71:       observation.status === "failed" ||
>  72:       observation.status === "unknown"
   73:     );
   74:   }
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 1

```text
>   1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ChernobogHealthStatus,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 4

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
>   4:   ChernobogHealthStatus,
    5:   ChernobogRuntimeObservation,
    6: } from "./runtimeHealth";
    7: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 5

```text
    2: 
    3: import type {
    4:   ChernobogHealthStatus,
>   5:   ChernobogRuntimeObservation,
    6: } from "./runtimeHealth";
    7: 
    8: export interface PublishRuntimeHealthOptions {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 6

```text
    3: import type {
    4:   ChernobogHealthStatus,
    5:   ChernobogRuntimeObservation,
>   6: } from "./runtimeHealth";
    7: 
    8: export interface PublishRuntimeHealthOptions {
    9:   previousStatus?: ChernobogHealthStatus;
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 8

```text
    5:   ChernobogRuntimeObservation,
    6: } from "./runtimeHealth";
    7: 
>   8: export interface PublishRuntimeHealthOptions {
    9:   previousStatus?: ChernobogHealthStatus;
   10: }
   11: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 9

```text
    6: } from "./runtimeHealth";
    7: 
    8: export interface PublishRuntimeHealthOptions {
>   9:   previousStatus?: ChernobogHealthStatus;
   10: }
   11: 
   12: function recovered(
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 13

```text
   10: }
   11: 
   12: function recovered(
>  13:   previousStatus: ChernobogHealthStatus | undefined,
   14:   currentStatus: ChernobogHealthStatus
   15: ): boolean {
   16:   return (
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 14

```text
   11: 
   12: function recovered(
   13:   previousStatus: ChernobogHealthStatus | undefined,
>  14:   currentStatus: ChernobogHealthStatus
   15: ): boolean {
   16:   return (
   17:     currentStatus === "healthy" &&
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 17

```text
   14:   currentStatus: ChernobogHealthStatus
   15: ): boolean {
   16:   return (
>  17:     currentStatus === "healthy" &&
   18:     previousStatus !== undefined &&
   19:     previousStatus !== "healthy"
   20:   );
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 19

```text
   16:   return (
   17:     currentStatus === "healthy" &&
   18:     previousStatus !== undefined &&
>  19:     previousStatus !== "healthy"
   20:   );
   21: }
   22: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 24

```text
   21: }
   22: 
   23: function buildCommonPayload(
>  24:   observation: ChernobogRuntimeObservation
   25: ) {
   26:   return {
   27:     id: observation.id,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 27

```text
   24:   observation: ChernobogRuntimeObservation
   25: ) {
   26:   return {
>  27:     id: observation.id,
   28:     kind: observation.kind,
   29:     status: observation.status,
   30:     nodeId: observation.nodeId,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 28

```text
   25: ) {
   26:   return {
   27:     id: observation.id,
>  28:     kind: observation.kind,
   29:     status: observation.status,
   30:     nodeId: observation.nodeId,
   31:     platform: observation.platform,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 29

```text
   26:   return {
   27:     id: observation.id,
   28:     kind: observation.kind,
>  29:     status: observation.status,
   30:     nodeId: observation.nodeId,
   31:     platform: observation.platform,
   32:     latencyMs: observation.latencyMs,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 30

```text
   27:     id: observation.id,
   28:     kind: observation.kind,
   29:     status: observation.status,
>  30:     nodeId: observation.nodeId,
   31:     platform: observation.platform,
   32:     latencyMs: observation.latencyMs,
   33:     capabilities: observation.capabilities,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 31

```text
   28:     kind: observation.kind,
   29:     status: observation.status,
   30:     nodeId: observation.nodeId,
>  31:     platform: observation.platform,
   32:     latencyMs: observation.latencyMs,
   33:     capabilities: observation.capabilities,
   34:     observedAt: observation.observedAt,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 32

```text
   29:     status: observation.status,
   30:     nodeId: observation.nodeId,
   31:     platform: observation.platform,
>  32:     latencyMs: observation.latencyMs,
   33:     capabilities: observation.capabilities,
   34:     observedAt: observation.observedAt,
   35:   };
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 33

```text
   30:     nodeId: observation.nodeId,
   31:     platform: observation.platform,
   32:     latencyMs: observation.latencyMs,
>  33:     capabilities: observation.capabilities,
   34:     observedAt: observation.observedAt,
   35:   };
   36: }
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 34

```text
   31:     platform: observation.platform,
   32:     latencyMs: observation.latencyMs,
   33:     capabilities: observation.capabilities,
>  34:     observedAt: observation.observedAt,
   35:   };
   36: }
   37: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 38

```text
   35:   };
   36: }
   37: 
>  38: export async function publishRuntimeHealthObservation(
   39:   observation: ChernobogRuntimeObservation,
   40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 39

```text
   36: }
   37: 
   38: export async function publishRuntimeHealthObservation(
>  39:   observation: ChernobogRuntimeObservation,
   40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 40

```text
   37: 
   38: export async function publishRuntimeHealthObservation(
   39:   observation: ChernobogRuntimeObservation,
>  40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
   43:     buildCommonPayload(observation);
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 43

```text
   40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
>  43:     buildCommonPayload(observation);
   44: 
   45:   await publishChernobogEventSafely({
   46:     type: "runtime.health_observed",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 45

```text
   42:   const payload =
   43:     buildCommonPayload(observation);
   44: 
>  45:   await publishChernobogEventSafely({
   46:     type: "runtime.health_observed",
   47: 
   48:     source: {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 46

```text
   43:     buildCommonPayload(observation);
   44: 
   45:   await publishChernobogEventSafely({
>  46:     type: "runtime.health_observed",
   47: 
   48:     source: {
   49:       subsystem: "runtime-health",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 49

```text
   46:     type: "runtime.health_observed",
   47: 
   48:     source: {
>  49:       subsystem: "runtime-health",
   50:       nodeId: observation.nodeId,
   51:     },
   52: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 50

```text
   47: 
   48:     source: {
   49:       subsystem: "runtime-health",
>  50:       nodeId: observation.nodeId,
   51:     },
   52: 
   53:     severity: "debug",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 55

```text
   52: 
   53:     severity: "debug",
   54: 
>  55:     subject: observation.id,
   56: 
   57:     scope: observation.nodeId
   58:       ? `node:${observation.nodeId}`
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 57

```text
   54: 
   55:     subject: observation.id,
   56: 
>  57:     scope: observation.nodeId
   58:       ? `node:${observation.nodeId}`
   59:       : "runtime",
   60: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 58

```text
   55:     subject: observation.id,
   56: 
   57:     scope: observation.nodeId
>  58:       ? `node:${observation.nodeId}`
   59:       : "runtime",
   60: 
   61:     payload,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 64

```text
   61:     payload,
   62: 
   63:     dedupeKey: [
>  64:       "runtime.health_observed",
   65:       observation.kind,
   66:       observation.id,
   67:       observation.status,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 65

```text
   62: 
   63:     dedupeKey: [
   64:       "runtime.health_observed",
>  65:       observation.kind,
   66:       observation.id,
   67:       observation.status,
   68:       observation.nodeId ?? "local",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 66

```text
   63:     dedupeKey: [
   64:       "runtime.health_observed",
   65:       observation.kind,
>  66:       observation.id,
   67:       observation.status,
   68:       observation.nodeId ?? "local",
   69:     ].join(":"),
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 67

```text
   64:       "runtime.health_observed",
   65:       observation.kind,
   66:       observation.id,
>  67:       observation.status,
   68:       observation.nodeId ?? "local",
   69:     ].join(":"),
   70: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 68

```text
   65:       observation.kind,
   66:       observation.id,
   67:       observation.status,
>  68:       observation.nodeId ?? "local",
   69:     ].join(":"),
   70: 
   71:     metadata: {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 74

```text
   71:     metadata: {
   72:       tags: [
   73:         "runtime",
>  74:         "health",
   75:         observation.kind,
   76:         observation.status,
   77:       ],
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 75

```text
   72:       tags: [
   73:         "runtime",
   74:         "health",
>  75:         observation.kind,
   76:         observation.status,
   77:       ],
   78:     },
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 76

```text
   73:         "runtime",
   74:         "health",
   75:         observation.kind,
>  76:         observation.status,
   77:       ],
   78:     },
   79:   });
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 81

```text
   78:     },
   79:   });
   80: 
>  81:   if (observation.kind === "service") {
   82:     if (
   83:       recovered(
   84:         options.previousStatus,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 85

```text
   82:     if (
   83:       recovered(
   84:         options.previousStatus,
>  85:         observation.status
   86:       )
   87:     ) {
   88:       await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 88

```text
   85:         observation.status
   86:       )
   87:     ) {
>  88:       await publishChernobogEventSafely({
   89:         type: "service.recovered",
   90: 
   91:         source: {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 89

```text
   86:       )
   87:     ) {
   88:       await publishChernobogEventSafely({
>  89:         type: "service.recovered",
   90: 
   91:         source: {
   92:           subsystem: "runtime-health",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 92

```text
   89:         type: "service.recovered",
   90: 
   91:         source: {
>  92:           subsystem: "runtime-health",
   93:           nodeId: observation.nodeId,
   94:         },
   95: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 93

```text
   90: 
   91:         source: {
   92:           subsystem: "runtime-health",
>  93:           nodeId: observation.nodeId,
   94:         },
   95: 
   96:         severity: "info",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 98

```text
   95: 
   96:         severity: "info",
   97: 
>  98:         subject: observation.id,
   99: 
  100:         payload: {
  101:           ...payload,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 107

```text
  104:         },
  105: 
  106:         dedupeKey:
> 107:           `service.recovered:${observation.id}:${observation.nodeId ?? "local"}`,
  108: 
  109:         metadata: {
  110:           tags: [
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 111

```text
  108: 
  109:         metadata: {
  110:           tags: [
> 111:             "service",
  112:             "health",
  113:             "recovered",
  114:           ],
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 112

```text
  109:         metadata: {
  110:           tags: [
  111:             "service",
> 112:             "health",
  113:             "recovered",
  114:           ],
  115:         },
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 120

```text
  117:     }
  118: 
  119:     const type =
> 120:       observation.status === "healthy"
  121:         ? "service.healthy"
  122:         : observation.status === "degraded"
  123:           ? "service.degraded"
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 121

```text
  118: 
  119:     const type =
  120:       observation.status === "healthy"
> 121:         ? "service.healthy"
  122:         : observation.status === "degraded"
  123:           ? "service.degraded"
  124:           : "service.failed";
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 122

```text
  119:     const type =
  120:       observation.status === "healthy"
  121:         ? "service.healthy"
> 122:         : observation.status === "degraded"
  123:           ? "service.degraded"
  124:           : "service.failed";
  125: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 123

```text
  120:       observation.status === "healthy"
  121:         ? "service.healthy"
  122:         : observation.status === "degraded"
> 123:           ? "service.degraded"
  124:           : "service.failed";
  125: 
  126:     await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 124

```text
  121:         ? "service.healthy"
  122:         : observation.status === "degraded"
  123:           ? "service.degraded"
> 124:           : "service.failed";
  125: 
  126:     await publishChernobogEventSafely({
  127:       type,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 126

```text
  123:           ? "service.degraded"
  124:           : "service.failed";
  125: 
> 126:     await publishChernobogEventSafely({
  127:       type,
  128: 
  129:       source: {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 130

```text
  127:       type,
  128: 
  129:       source: {
> 130:         subsystem: "runtime-health",
  131:         nodeId: observation.nodeId,
  132:       },
  133: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 131

```text
  128: 
  129:       source: {
  130:         subsystem: "runtime-health",
> 131:         nodeId: observation.nodeId,
  132:       },
  133: 
  134:       severity:
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 135

```text
  132:       },
  133: 
  134:       severity:
> 135:         observation.status === "healthy"
  136:           ? "info"
  137:           : observation.status === "degraded"
  138:             ? "notice"
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 137

```text
  134:       severity:
  135:         observation.status === "healthy"
  136:           ? "info"
> 137:           : observation.status === "degraded"
  138:             ? "notice"
  139:             : "warning",
  140: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 141

```text
  138:             ? "notice"
  139:             : "warning",
  140: 
> 141:       subject: observation.id,
  142: 
  143:       payload,
  144: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 146

```text
  143:       payload,
  144: 
  145:       dedupeKey:
> 146:         `${type}:${observation.id}:${observation.nodeId ?? "local"}`,
  147: 
  148:       metadata: {
  149:         tags: [
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 150

```text
  147: 
  148:       metadata: {
  149:         tags: [
> 150:           "service",
  151:           "health",
  152:           observation.status,
  153:         ],
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 151

```text
  148:       metadata: {
  149:         tags: [
  150:           "service",
> 151:           "health",
  152:           observation.status,
  153:         ],
  154:       },
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 152

```text
  149:         tags: [
  150:           "service",
  151:           "health",
> 152:           observation.status,
  153:         ],
  154:       },
  155:     });
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 161

```text
  158:   }
  159: 
  160:   if (
> 161:     observation.kind === "runtime-node"
  162:   ) {
  163:     const online =
  164:       observation.status === "healthy" ||
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 164

```text
  161:     observation.kind === "runtime-node"
  162:   ) {
  163:     const online =
> 164:       observation.status === "healthy" ||
  165:       observation.status === "degraded";
  166: 
  167:     await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 165

```text
  162:   ) {
  163:     const online =
  164:       observation.status === "healthy" ||
> 165:       observation.status === "degraded";
  166: 
  167:     await publishChernobogEventSafely({
  168:       type: online
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 167

```text
  164:       observation.status === "healthy" ||
  165:       observation.status === "degraded";
  166: 
> 167:     await publishChernobogEventSafely({
  168:       type: online
  169:         ? "runtime.node_online"
  170:         : "runtime.node_offline",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 173

```text
  170:         : "runtime.node_offline",
  171: 
  172:       source: {
> 173:         subsystem: "runtime-health",
  174:         nodeId: observation.nodeId,
  175:       },
  176: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 174

```text
  171: 
  172:       source: {
  173:         subsystem: "runtime-health",
> 174:         nodeId: observation.nodeId,
  175:       },
  176: 
  177:       severity: online
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 181

```text
  178:         ? "info"
  179:         : "warning",
  180: 
> 181:       subject: observation.id,
  182: 
  183:       payload,
  184: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 189

```text
  186:         online
  187:           ? "runtime.node_online"
  188:           : "runtime.node_offline",
> 189:         observation.id,
  190:         observation.nodeId ?? "local",
  191:       ].join(":"),
  192: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 190

```text
  187:           ? "runtime.node_online"
  188:           : "runtime.node_offline",
  189:         observation.id,
> 190:         observation.nodeId ?? "local",
  191:       ].join(":"),
  192: 
  193:       metadata: {
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 206

```text
  203:   }
  204: 
  205:   const available =
> 206:     observation.status === "healthy" ||
  207:     observation.status === "degraded";
  208: 
  209:   await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 207

```text
  204: 
  205:   const available =
  206:     observation.status === "healthy" ||
> 207:     observation.status === "degraded";
  208: 
  209:   await publishChernobogEventSafely({
  210:     type: available
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 209

```text
  206:     observation.status === "healthy" ||
  207:     observation.status === "degraded";
  208: 
> 209:   await publishChernobogEventSafely({
  210:     type: available
  211:       ? "runtime.model_available"
  212:       : "runtime.model_unavailable",
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 215

```text
  212:       : "runtime.model_unavailable",
  213: 
  214:     source: {
> 215:       subsystem: "runtime-health",
  216:       nodeId: observation.nodeId,
  217:     },
  218: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 216

```text
  213: 
  214:     source: {
  215:       subsystem: "runtime-health",
> 216:       nodeId: observation.nodeId,
  217:     },
  218: 
  219:     severity: available
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 223

```text
  220:       ? "info"
  221:       : "warning",
  222: 
> 223:     subject: observation.id,
  224: 
  225:     payload,
  226: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 231

```text
  228:       available
  229:         ? "runtime.model_available"
  230:         : "runtime.model_unavailable",
> 231:       observation.id,
  232:       observation.nodeId ?? "local",
  233:     ].join(":"),
  234: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 232

```text
  229:         ? "runtime.model_available"
  230:         : "runtime.model_unavailable",
  231:       observation.id,
> 232:       observation.nodeId ?? "local",
  233:     ].join(":"),
  234: 
  235:     metadata: {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 2

```text
    1: import type {
>   2:     ChernobogHealthStatus,
    3:     ChernobogRuntimeObservation,
    4:   } from "./runtimeHealth";
    5:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 3

```text
    1: import type {
    2:     ChernobogHealthStatus,
>   3:     ChernobogRuntimeObservation,
    4:   } from "./runtimeHealth";
    5:   
    6:   import {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 4

```text
    1: import type {
    2:     ChernobogHealthStatus,
    3:     ChernobogRuntimeObservation,
>   4:   } from "./runtimeHealth";
    5:   
    6:   import {
    7:     createRuntimeObservation,
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 7

```text
    4:   } from "./runtimeHealth";
    5:   
    6:   import {
>   7:     createRuntimeObservation,
    8:   } from "./runtimeHealth";
    9:   
   10:   import {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 8

```text
    5:   
    6:   import {
    7:     createRuntimeObservation,
>   8:   } from "./runtimeHealth";
    9:   
   10:   import {
   11:     publishRuntimeHealthObservation,
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 11

```text
    8:   } from "./runtimeHealth";
    9:   
   10:   import {
>  11:     publishRuntimeHealthObservation,
   12:   } from "./runtimeHealthEvents";
   13:   
   14:   export interface RuntimeHealthReportOptions {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 12

```text
    9:   
   10:   import {
   11:     publishRuntimeHealthObservation,
>  12:   } from "./runtimeHealthEvents";
   13:   
   14:   export interface RuntimeHealthReportOptions {
   15:     previousStatus?: ChernobogHealthStatus;
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 14

```text
   11:     publishRuntimeHealthObservation,
   12:   } from "./runtimeHealthEvents";
   13:   
>  14:   export interface RuntimeHealthReportOptions {
   15:     previousStatus?: ChernobogHealthStatus;
   16:   }
   17:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 15

```text
   12:   } from "./runtimeHealthEvents";
   13:   
   14:   export interface RuntimeHealthReportOptions {
>  15:     previousStatus?: ChernobogHealthStatus;
   16:   }
   17:   
   18:   export interface ServiceHealthReport {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 18

```text
   15:     previousStatus?: ChernobogHealthStatus;
   16:   }
   17:   
>  18:   export interface ServiceHealthReport {
   19:     id: string;
   20:   
   21:     status: ChernobogHealthStatus;
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 21

```text
   18:   export interface ServiceHealthReport {
   19:     id: string;
   20:   
>  21:     status: ChernobogHealthStatus;
   22:   
   23:     nodeId?: string;
   24:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 38

```text
   35:       string | number | boolean | null
   36:     >;
   37:   
>  38:     observedAt?: string;
   39:   }
   40:   
   41:   export interface RuntimeNodeHealthReport {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 41

```text
   38:     observedAt?: string;
   39:   }
   40:   
>  41:   export interface RuntimeNodeHealthReport {
   42:     id: string;
   43:   
   44:     status: ChernobogHealthStatus;
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 44

```text
   41:   export interface RuntimeNodeHealthReport {
   42:     id: string;
   43:   
>  44:     status: ChernobogHealthStatus;
   45:   
   46:     nodeId?: string;
   47:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 61

```text
   58:       string | number | boolean | null
   59:     >;
   60:   
>  61:     observedAt?: string;
   62:   }
   63:   
   64:   function buildObservation(
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 64

```text
   61:     observedAt?: string;
   62:   }
   63:   
>  64:   function buildObservation(
   65:     kind:
   66:       | "service"
   67:       | "runtime-node",
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 66

```text
   63:   
   64:   function buildObservation(
   65:     kind:
>  66:       | "service"
   67:       | "runtime-node",
   68:     report:
   69:       | ServiceHealthReport
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 69

```text
   66:       | "service"
   67:       | "runtime-node",
   68:     report:
>  69:       | ServiceHealthReport
   70:       | RuntimeNodeHealthReport
   71:   ): ChernobogRuntimeObservation {
   72:     return createRuntimeObservation({
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 70

```text
   67:       | "runtime-node",
   68:     report:
   69:       | ServiceHealthReport
>  70:       | RuntimeNodeHealthReport
   71:   ): ChernobogRuntimeObservation {
   72:     return createRuntimeObservation({
   73:       id:
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 71

```text
   68:     report:
   69:       | ServiceHealthReport
   70:       | RuntimeNodeHealthReport
>  71:   ): ChernobogRuntimeObservation {
   72:     return createRuntimeObservation({
   73:       id:
   74:         report.id,
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 72

```text
   69:       | ServiceHealthReport
   70:       | RuntimeNodeHealthReport
   71:   ): ChernobogRuntimeObservation {
>  72:     return createRuntimeObservation({
   73:       id:
   74:         report.id,
   75:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 99

```text
   96:       metadata:
   97:         report.metadata,
   98:   
>  99:       observedAt:
  100:         report.observedAt,
  101:     });
  102:   }
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 100

```text
   97:         report.metadata,
   98:   
   99:       observedAt:
> 100:         report.observedAt,
  101:     });
  102:   }
  103:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 104

```text
  101:     });
  102:   }
  103:   
> 104:   export async function reportServiceHealth(
  105:     report: ServiceHealthReport,
  106:     options:
  107:       RuntimeHealthReportOptions = {}
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 105

```text
  102:   }
  103:   
  104:   export async function reportServiceHealth(
> 105:     report: ServiceHealthReport,
  106:     options:
  107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 107

```text
  104:   export async function reportServiceHealth(
  105:     report: ServiceHealthReport,
  106:     options:
> 107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
  110:       buildObservation(
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 108

```text
  105:     report: ServiceHealthReport,
  106:     options:
  107:       RuntimeHealthReportOptions = {}
> 108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
  110:       buildObservation(
  111:         "service",
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 109

```text
  106:     options:
  107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
> 109:     const observation =
  110:       buildObservation(
  111:         "service",
  112:         report
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 110

```text
  107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
> 110:       buildObservation(
  111:         "service",
  112:         report
  113:       );
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 111

```text
  108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
  110:       buildObservation(
> 111:         "service",
  112:         report
  113:       );
  114:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 115

```text
  112:         report
  113:       );
  114:   
> 115:     await publishRuntimeHealthObservation(
  116:       observation,
  117:       {
  118:         previousStatus:
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 116

```text
  113:       );
  114:   
  115:     await publishRuntimeHealthObservation(
> 116:       observation,
  117:       {
  118:         previousStatus:
  119:           options.previousStatus,
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 123

```text
  120:       }
  121:     );
  122:   
> 123:     return observation;
  124:   }
  125:   
  126:   export async function reportRuntimeNodeHealth(
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 126

```text
  123:     return observation;
  124:   }
  125:   
> 126:   export async function reportRuntimeNodeHealth(
  127:     report: RuntimeNodeHealthReport,
  128:     options:
  129:       RuntimeHealthReportOptions = {}
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 127

```text
  124:   }
  125:   
  126:   export async function reportRuntimeNodeHealth(
> 127:     report: RuntimeNodeHealthReport,
  128:     options:
  129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 129

```text
  126:   export async function reportRuntimeNodeHealth(
  127:     report: RuntimeNodeHealthReport,
  128:     options:
> 129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
  131:     const observation =
  132:       buildObservation(
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 130

```text
  127:     report: RuntimeNodeHealthReport,
  128:     options:
  129:       RuntimeHealthReportOptions = {}
> 130:   ): Promise<ChernobogRuntimeObservation> {
  131:     const observation =
  132:       buildObservation(
  133:         "runtime-node",
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 131

```text
  128:     options:
  129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
> 131:     const observation =
  132:       buildObservation(
  133:         "runtime-node",
  134:         report
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 132

```text
  129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
  131:     const observation =
> 132:       buildObservation(
  133:         "runtime-node",
  134:         report
  135:       );
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 137

```text
  134:         report
  135:       );
  136:   
> 137:     await publishRuntimeHealthObservation(
  138:       observation,
  139:       {
  140:         previousStatus:
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 138

```text
  135:       );
  136:   
  137:     await publishRuntimeHealthObservation(
> 138:       observation,
  139:       {
  140:         previousStatus:
  141:           options.previousStatus,
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 145

```text
  142:       }
  143:     );
  144:   
> 145:     return observation;
  146:   }
```

### lib\chernobog\operations\backupStorageEvents.ts line 1

```text
>   1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ChernobogBackupObservation,
```

### lib\chernobog\operations\backupStorageEvents.ts line 4

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
>   4:   ChernobogBackupObservation,
    5:   ChernobogBackupStatus,
    6:   ChernobogStorageObservation,
    7:   ChernobogStorageStatus,
```

### lib\chernobog\operations\backupStorageEvents.ts line 5

```text
    2: 
    3: import type {
    4:   ChernobogBackupObservation,
>   5:   ChernobogBackupStatus,
    6:   ChernobogStorageObservation,
    7:   ChernobogStorageStatus,
    8: } from "./backupStorageObservation";
```

### lib\chernobog\operations\backupStorageEvents.ts line 6

```text
    3: import type {
    4:   ChernobogBackupObservation,
    5:   ChernobogBackupStatus,
>   6:   ChernobogStorageObservation,
    7:   ChernobogStorageStatus,
    8: } from "./backupStorageObservation";
    9: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 7

```text
    4:   ChernobogBackupObservation,
    5:   ChernobogBackupStatus,
    6:   ChernobogStorageObservation,
>   7:   ChernobogStorageStatus,
    8: } from "./backupStorageObservation";
    9: 
   10: export interface PublishBackupObservationOptions {
```

### lib\chernobog\operations\backupStorageEvents.ts line 8

```text
    5:   ChernobogBackupStatus,
    6:   ChernobogStorageObservation,
    7:   ChernobogStorageStatus,
>   8: } from "./backupStorageObservation";
    9: 
   10: export interface PublishBackupObservationOptions {
   11:   previousStatus?: ChernobogBackupStatus;
```

### lib\chernobog\operations\backupStorageEvents.ts line 10

```text
    7:   ChernobogStorageStatus,
    8: } from "./backupStorageObservation";
    9: 
>  10: export interface PublishBackupObservationOptions {
   11:   previousStatus?: ChernobogBackupStatus;
   12: }
   13: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 11

```text
    8: } from "./backupStorageObservation";
    9: 
   10: export interface PublishBackupObservationOptions {
>  11:   previousStatus?: ChernobogBackupStatus;
   12: }
   13: 
   14: export interface PublishStorageObservationOptions {
```

### lib\chernobog\operations\backupStorageEvents.ts line 14

```text
   11:   previousStatus?: ChernobogBackupStatus;
   12: }
   13: 
>  14: export interface PublishStorageObservationOptions {
   15:   previousStatus?: ChernobogStorageStatus;
   16: }
   17: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 15

```text
   12: }
   13: 
   14: export interface PublishStorageObservationOptions {
>  15:   previousStatus?: ChernobogStorageStatus;
   16: }
   17: 
   18: function buildBackupPayload(
```

### lib\chernobog\operations\backupStorageEvents.ts line 18

```text
   15:   previousStatus?: ChernobogStorageStatus;
   16: }
   17: 
>  18: function buildBackupPayload(
   19:   observation: ChernobogBackupObservation
   20: ) {
   21:   return {
```

### lib\chernobog\operations\backupStorageEvents.ts line 19

```text
   16: }
   17: 
   18: function buildBackupPayload(
>  19:   observation: ChernobogBackupObservation
   20: ) {
   21:   return {
   22:     id: observation.id,
```

### lib\chernobog\operations\backupStorageEvents.ts line 22

```text
   19:   observation: ChernobogBackupObservation
   20: ) {
   21:   return {
>  22:     id: observation.id,
   23: 
   24:     status:
   25:       observation.status,
```

### lib\chernobog\operations\backupStorageEvents.ts line 25

```text
   22:     id: observation.id,
   23: 
   24:     status:
>  25:       observation.status,
   26: 
   27:     nodeId:
   28:       observation.nodeId,
```

### lib\chernobog\operations\backupStorageEvents.ts line 28

```text
   25:       observation.status,
   26: 
   27:     nodeId:
>  28:       observation.nodeId,
   29: 
   30:     destinationId:
   31:       observation.destinationId,
```

### lib\chernobog\operations\backupStorageEvents.ts line 31

```text
   28:       observation.nodeId,
   29: 
   30:     destinationId:
>  31:       observation.destinationId,
   32: 
   33:     startedAt:
   34:       observation.startedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 34

```text
   31:       observation.destinationId,
   32: 
   33:     startedAt:
>  34:       observation.startedAt,
   35: 
   36:     completedAt:
   37:       observation.completedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 37

```text
   34:       observation.startedAt,
   35: 
   36:     completedAt:
>  37:       observation.completedAt,
   38: 
   39:     durationMs:
   40:       observation.durationMs,
```

### lib\chernobog\operations\backupStorageEvents.ts line 40

```text
   37:       observation.completedAt,
   38: 
   39:     durationMs:
>  40:       observation.durationMs,
   41: 
   42:     bytesProcessed:
   43:       observation.bytesProcessed,
```

### lib\chernobog\operations\backupStorageEvents.ts line 43

```text
   40:       observation.durationMs,
   41: 
   42:     bytesProcessed:
>  43:       observation.bytesProcessed,
   44: 
   45:     filesProcessed:
   46:       observation.filesProcessed,
```

### lib\chernobog\operations\backupStorageEvents.ts line 46

```text
   43:       observation.bytesProcessed,
   44: 
   45:     filesProcessed:
>  46:       observation.filesProcessed,
   47: 
   48:     snapshotId:
   49:       observation.snapshotId,
```

### lib\chernobog\operations\backupStorageEvents.ts line 49

```text
   46:       observation.filesProcessed,
   47: 
   48:     snapshotId:
>  49:       observation.snapshotId,
   50: 
   51:     observedAt:
   52:       observation.observedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 51

```text
   48:     snapshotId:
   49:       observation.snapshotId,
   50: 
>  51:     observedAt:
   52:       observation.observedAt,
   53:   };
   54: }
```

### lib\chernobog\operations\backupStorageEvents.ts line 52

```text
   49:       observation.snapshotId,
   50: 
   51:     observedAt:
>  52:       observation.observedAt,
   53:   };
   54: }
   55: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 56

```text
   53:   };
   54: }
   55: 
>  56: function buildStoragePayload(
   57:   observation: ChernobogStorageObservation
   58: ) {
   59:   return {
```

### lib\chernobog\operations\backupStorageEvents.ts line 57

```text
   54: }
   55: 
   56: function buildStoragePayload(
>  57:   observation: ChernobogStorageObservation
   58: ) {
   59:   return {
   60:     id:
```

### lib\chernobog\operations\backupStorageEvents.ts line 61

```text
   58: ) {
   59:   return {
   60:     id:
>  61:       observation.id,
   62: 
   63:     status:
   64:       observation.status,
```

### lib\chernobog\operations\backupStorageEvents.ts line 64

```text
   61:       observation.id,
   62: 
   63:     status:
>  64:       observation.status,
   65: 
   66:     nodeId:
   67:       observation.nodeId,
```

### lib\chernobog\operations\backupStorageEvents.ts line 67

```text
   64:       observation.status,
   65: 
   66:     nodeId:
>  67:       observation.nodeId,
   68: 
   69:     capacityBytes:
   70:       observation.capacityBytes,
```

### lib\chernobog\operations\backupStorageEvents.ts line 70

```text
   67:       observation.nodeId,
   68: 
   69:     capacityBytes:
>  70:       observation.capacityBytes,
   71: 
   72:     usedBytes:
   73:       observation.usedBytes,
```

### lib\chernobog\operations\backupStorageEvents.ts line 73

```text
   70:       observation.capacityBytes,
   71: 
   72:     usedBytes:
>  73:       observation.usedBytes,
   74: 
   75:     freeBytes:
   76:       observation.freeBytes,
```

### lib\chernobog\operations\backupStorageEvents.ts line 76

```text
   73:       observation.usedBytes,
   74: 
   75:     freeBytes:
>  76:       observation.freeBytes,
   77: 
   78:     usagePercent:
   79:       observation.usagePercent,
```

### lib\chernobog\operations\backupStorageEvents.ts line 79

```text
   76:       observation.freeBytes,
   77: 
   78:     usagePercent:
>  79:       observation.usagePercent,
   80: 
   81:     mounted:
   82:       observation.mounted,
```

### lib\chernobog\operations\backupStorageEvents.ts line 82

```text
   79:       observation.usagePercent,
   80: 
   81:     mounted:
>  82:       observation.mounted,
   83: 
   84:     writable:
   85:       observation.writable,
```

### lib\chernobog\operations\backupStorageEvents.ts line 85

```text
   82:       observation.mounted,
   83: 
   84:     writable:
>  85:       observation.writable,
   86: 
   87:     observedAt:
   88:       observation.observedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 87

```text
   84:     writable:
   85:       observation.writable,
   86: 
>  87:     observedAt:
   88:       observation.observedAt,
   89:   };
   90: }
```

### lib\chernobog\operations\backupStorageEvents.ts line 88

```text
   85:       observation.writable,
   86: 
   87:     observedAt:
>  88:       observation.observedAt,
   89:   };
   90: }
   91: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 92

```text
   89:   };
   90: }
   91: 
>  92: function backupRecovered(
   93:   previousStatus:
   94:     | ChernobogBackupStatus
   95:     | undefined,
```

### lib\chernobog\operations\backupStorageEvents.ts line 94

```text
   91: 
   92: function backupRecovered(
   93:   previousStatus:
>  94:     | ChernobogBackupStatus
   95:     | undefined,
   96:   currentStatus:
   97:     ChernobogBackupStatus
```

### lib\chernobog\operations\backupStorageEvents.ts line 97

```text
   94:     | ChernobogBackupStatus
   95:     | undefined,
   96:   currentStatus:
>  97:     ChernobogBackupStatus
   98: ): boolean {
   99:   return (
  100:     currentStatus === "succeeded" &&
```

### lib\chernobog\operations\backupStorageEvents.ts line 109

```text
  106:   );
  107: }
  108: 
> 109: function storageRecovered(
  110:   previousStatus:
  111:     | ChernobogStorageStatus
  112:     | undefined,
```

### lib\chernobog\operations\backupStorageEvents.ts line 111

```text
  108: 
  109: function storageRecovered(
  110:   previousStatus:
> 111:     | ChernobogStorageStatus
  112:     | undefined,
  113:   currentStatus:
  114:     ChernobogStorageStatus
```

### lib\chernobog\operations\backupStorageEvents.ts line 114

```text
  111:     | ChernobogStorageStatus
  112:     | undefined,
  113:   currentStatus:
> 114:     ChernobogStorageStatus
  115: ): boolean {
  116:   return (
  117:     currentStatus === "healthy" &&
```

### lib\chernobog\operations\backupStorageEvents.ts line 117

```text
  114:     ChernobogStorageStatus
  115: ): boolean {
  116:   return (
> 117:     currentStatus === "healthy" &&
  118:     previousStatus !== undefined &&
  119:     previousStatus !== "healthy"
  120:   );
```

### lib\chernobog\operations\backupStorageEvents.ts line 119

```text
  116:   return (
  117:     currentStatus === "healthy" &&
  118:     previousStatus !== undefined &&
> 119:     previousStatus !== "healthy"
  120:   );
  121: }
  122: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 123

```text
  120:   );
  121: }
  122: 
> 123: export async function publishBackupObservation(
  124:   observation:
  125:     ChernobogBackupObservation,
  126:   options:
```

### lib\chernobog\operations\backupStorageEvents.ts line 124

```text
  121: }
  122: 
  123: export async function publishBackupObservation(
> 124:   observation:
  125:     ChernobogBackupObservation,
  126:   options:
  127:     PublishBackupObservationOptions = {}
```

### lib\chernobog\operations\backupStorageEvents.ts line 125

```text
  122: 
  123: export async function publishBackupObservation(
  124:   observation:
> 125:     ChernobogBackupObservation,
  126:   options:
  127:     PublishBackupObservationOptions = {}
  128: ): Promise<void> {
```

### lib\chernobog\operations\backupStorageEvents.ts line 127

```text
  124:   observation:
  125:     ChernobogBackupObservation,
  126:   options:
> 127:     PublishBackupObservationOptions = {}
  128: ): Promise<void> {
  129:   const payload =
  130:     buildBackupPayload(
```

### lib\chernobog\operations\backupStorageEvents.ts line 130

```text
  127:     PublishBackupObservationOptions = {}
  128: ): Promise<void> {
  129:   const payload =
> 130:     buildBackupPayload(
  131:       observation
  132:     );
  133: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 131

```text
  128: ): Promise<void> {
  129:   const payload =
  130:     buildBackupPayload(
> 131:       observation
  132:     );
  133: 
  134:   /*
```

### lib\chernobog\operations\backupStorageEvents.ts line 135

```text
  132:     );
  133: 
  134:   /*
> 135:    * Neutral observation.
  136:    */
  137:   await publishChernobogEventSafely({
  138:     type:
```

### lib\chernobog\operations\backupStorageEvents.ts line 137

```text
  134:   /*
  135:    * Neutral observation.
  136:    */
> 137:   await publishChernobogEventSafely({
  138:     type:
  139:       "backup.observed",
  140: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 139

```text
  136:    */
  137:   await publishChernobogEventSafely({
  138:     type:
> 139:       "backup.observed",
  140: 
  141:     source: {
  142:       subsystem:
```

### lib\chernobog\operations\backupStorageEvents.ts line 143

```text
  140: 
  141:     source: {
  142:       subsystem:
> 143:         "backup-storage",
  144:       nodeId:
  145:         observation.nodeId,
  146:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 145

```text
  142:       subsystem:
  143:         "backup-storage",
  144:       nodeId:
> 145:         observation.nodeId,
  146:     },
  147: 
  148:     severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 152

```text
  149:       "debug",
  150: 
  151:     subject:
> 152:       observation.id,
  153: 
  154:     scope:
  155:       observation.nodeId
```

### lib\chernobog\operations\backupStorageEvents.ts line 155

```text
  152:       observation.id,
  153: 
  154:     scope:
> 155:       observation.nodeId
  156:         ? `node:${observation.nodeId}`
  157:         : "backup",
  158: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 156

```text
  153: 
  154:     scope:
  155:       observation.nodeId
> 156:         ? `node:${observation.nodeId}`
  157:         : "backup",
  158: 
  159:     payload,
```

### lib\chernobog\operations\backupStorageEvents.ts line 157

```text
  154:     scope:
  155:       observation.nodeId
  156:         ? `node:${observation.nodeId}`
> 157:         : "backup",
  158: 
  159:     payload,
  160: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 162

```text
  159:     payload,
  160: 
  161:     dedupeKey: [
> 162:       "backup.observed",
  163:       observation.id,
  164:       observation.nodeId ??
  165:         "local",
```

### lib\chernobog\operations\backupStorageEvents.ts line 163

```text
  160: 
  161:     dedupeKey: [
  162:       "backup.observed",
> 163:       observation.id,
  164:       observation.nodeId ??
  165:         "local",
  166:       observation.status,
```

### lib\chernobog\operations\backupStorageEvents.ts line 164

```text
  161:     dedupeKey: [
  162:       "backup.observed",
  163:       observation.id,
> 164:       observation.nodeId ??
  165:         "local",
  166:       observation.status,
  167:       observation.snapshotId ??
```

### lib\chernobog\operations\backupStorageEvents.ts line 166

```text
  163:       observation.id,
  164:       observation.nodeId ??
  165:         "local",
> 166:       observation.status,
  167:       observation.snapshotId ??
  168:         "no-snapshot",
  169:     ].join(":"),
```

### lib\chernobog\operations\backupStorageEvents.ts line 167

```text
  164:       observation.nodeId ??
  165:         "local",
  166:       observation.status,
> 167:       observation.snapshotId ??
  168:         "no-snapshot",
  169:     ].join(":"),
  170: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 173

```text
  170: 
  171:     metadata: {
  172:       tags: [
> 173:         "backup",
  174:         observation.status,
  175:       ],
  176:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 174

```text
  171:     metadata: {
  172:       tags: [
  173:         "backup",
> 174:         observation.status,
  175:       ],
  176:     },
  177:   });
```

### lib\chernobog\operations\backupStorageEvents.ts line 181

```text
  178: 
  179:   /*
  180:    * Recovery is a transition, not merely
> 181:    * another successful backup.
  182:    */
  183:   if (
  184:     backupRecovered(
```

### lib\chernobog\operations\backupStorageEvents.ts line 184

```text
  181:    * another successful backup.
  182:    */
  183:   if (
> 184:     backupRecovered(
  185:       options.previousStatus,
  186:       observation.status
  187:     )
```

### lib\chernobog\operations\backupStorageEvents.ts line 186

```text
  183:   if (
  184:     backupRecovered(
  185:       options.previousStatus,
> 186:       observation.status
  187:     )
  188:   ) {
  189:     await publishChernobogEventSafely({
```

### lib\chernobog\operations\backupStorageEvents.ts line 189

```text
  186:       observation.status
  187:     )
  188:   ) {
> 189:     await publishChernobogEventSafely({
  190:       type:
  191:         "backup.recovered",
  192: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 191

```text
  188:   ) {
  189:     await publishChernobogEventSafely({
  190:       type:
> 191:         "backup.recovered",
  192: 
  193:       source: {
  194:         subsystem:
```

### lib\chernobog\operations\backupStorageEvents.ts line 195

```text
  192: 
  193:       source: {
  194:         subsystem:
> 195:           "backup-storage",
  196:         nodeId:
  197:           observation.nodeId,
  198:       },
```

### lib\chernobog\operations\backupStorageEvents.ts line 197

```text
  194:         subsystem:
  195:           "backup-storage",
  196:         nodeId:
> 197:           observation.nodeId,
  198:       },
  199: 
  200:       severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 204

```text
  201:         "info",
  202: 
  203:       subject:
> 204:         observation.id,
  205: 
  206:       payload: {
  207:         ...payload,
```

### lib\chernobog\operations\backupStorageEvents.ts line 214

```text
  211:       },
  212: 
  213:       dedupeKey: [
> 214:         "backup.recovered",
  215:         observation.id,
  216:         observation.nodeId ??
  217:           "local",
```

### lib\chernobog\operations\backupStorageEvents.ts line 215

```text
  212: 
  213:       dedupeKey: [
  214:         "backup.recovered",
> 215:         observation.id,
  216:         observation.nodeId ??
  217:           "local",
  218:         observation.snapshotId ??
```

### lib\chernobog\operations\backupStorageEvents.ts line 216

```text
  213:       dedupeKey: [
  214:         "backup.recovered",
  215:         observation.id,
> 216:         observation.nodeId ??
  217:           "local",
  218:         observation.snapshotId ??
  219:           observation.observedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 218

```text
  215:         observation.id,
  216:         observation.nodeId ??
  217:           "local",
> 218:         observation.snapshotId ??
  219:           observation.observedAt,
  220:       ].join(":"),
  221: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 219

```text
  216:         observation.nodeId ??
  217:           "local",
  218:         observation.snapshotId ??
> 219:           observation.observedAt,
  220:       ].join(":"),
  221: 
  222:       metadata: {
```

### lib\chernobog\operations\backupStorageEvents.ts line 224

```text
  221: 
  222:       metadata: {
  223:         tags: [
> 224:           "backup",
  225:           "recovered",
  226:         ],
  227:       },
```

### lib\chernobog\operations\backupStorageEvents.ts line 232

```text
  229:   }
  230: 
  231:   const type =
> 232:     observation.status === "running"
  233:       ? "backup.running"
  234:       : observation.status === "succeeded"
  235:         ? "backup.completed"
```

### lib\chernobog\operations\backupStorageEvents.ts line 233

```text
  230: 
  231:   const type =
  232:     observation.status === "running"
> 233:       ? "backup.running"
  234:       : observation.status === "succeeded"
  235:         ? "backup.completed"
  236:         : observation.status === "failed"
```

### lib\chernobog\operations\backupStorageEvents.ts line 234

```text
  231:   const type =
  232:     observation.status === "running"
  233:       ? "backup.running"
> 234:       : observation.status === "succeeded"
  235:         ? "backup.completed"
  236:         : observation.status === "failed"
  237:           ? "backup.failed"
```

### lib\chernobog\operations\backupStorageEvents.ts line 235

```text
  232:     observation.status === "running"
  233:       ? "backup.running"
  234:       : observation.status === "succeeded"
> 235:         ? "backup.completed"
  236:         : observation.status === "failed"
  237:           ? "backup.failed"
  238:           : "backup.unknown";
```

### lib\chernobog\operations\backupStorageEvents.ts line 236

```text
  233:       ? "backup.running"
  234:       : observation.status === "succeeded"
  235:         ? "backup.completed"
> 236:         : observation.status === "failed"
  237:           ? "backup.failed"
  238:           : "backup.unknown";
  239: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 237

```text
  234:       : observation.status === "succeeded"
  235:         ? "backup.completed"
  236:         : observation.status === "failed"
> 237:           ? "backup.failed"
  238:           : "backup.unknown";
  239: 
  240:   await publishChernobogEventSafely({
```

### lib\chernobog\operations\backupStorageEvents.ts line 238

```text
  235:         ? "backup.completed"
  236:         : observation.status === "failed"
  237:           ? "backup.failed"
> 238:           : "backup.unknown";
  239: 
  240:   await publishChernobogEventSafely({
  241:     type,
```

### lib\chernobog\operations\backupStorageEvents.ts line 240

```text
  237:           ? "backup.failed"
  238:           : "backup.unknown";
  239: 
> 240:   await publishChernobogEventSafely({
  241:     type,
  242: 
  243:     source: {
```

### lib\chernobog\operations\backupStorageEvents.ts line 245

```text
  242: 
  243:     source: {
  244:       subsystem:
> 245:         "backup-storage",
  246:       nodeId:
  247:         observation.nodeId,
  248:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 247

```text
  244:       subsystem:
  245:         "backup-storage",
  246:       nodeId:
> 247:         observation.nodeId,
  248:     },
  249: 
  250:     severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 251

```text
  248:     },
  249: 
  250:     severity:
> 251:       observation.status === "failed"
  252:         ? "warning"
  253:         : observation.status === "unknown"
  254:           ? "notice"
```

### lib\chernobog\operations\backupStorageEvents.ts line 253

```text
  250:     severity:
  251:       observation.status === "failed"
  252:         ? "warning"
> 253:         : observation.status === "unknown"
  254:           ? "notice"
  255:           : "info",
  256: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 258

```text
  255:           : "info",
  256: 
  257:     subject:
> 258:       observation.id,
  259: 
  260:     payload,
  261: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 264

```text
  261: 
  262:     dedupeKey: [
  263:       type,
> 264:       observation.id,
  265:       observation.nodeId ??
  266:         "local",
  267:       observation.snapshotId ??
```

### lib\chernobog\operations\backupStorageEvents.ts line 265

```text
  262:     dedupeKey: [
  263:       type,
  264:       observation.id,
> 265:       observation.nodeId ??
  266:         "local",
  267:       observation.snapshotId ??
  268:         observation.observedAt,
```

### lib\chernobog\operations\backupStorageEvents.ts line 267

```text
  264:       observation.id,
  265:       observation.nodeId ??
  266:         "local",
> 267:       observation.snapshotId ??
  268:         observation.observedAt,
  269:     ].join(":"),
  270: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 268

```text
  265:       observation.nodeId ??
  266:         "local",
  267:       observation.snapshotId ??
> 268:         observation.observedAt,
  269:     ].join(":"),
  270: 
  271:     metadata: {
```

### lib\chernobog\operations\backupStorageEvents.ts line 273

```text
  270: 
  271:     metadata: {
  272:       tags: [
> 273:         "backup",
  274:         observation.status,
  275:       ],
  276:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 274

```text
  271:     metadata: {
  272:       tags: [
  273:         "backup",
> 274:         observation.status,
  275:       ],
  276:     },
  277:   });
```

### lib\chernobog\operations\backupStorageEvents.ts line 280

```text
  277:   });
  278: }
  279: 
> 280: export async function publishStorageObservation(
  281:   observation:
  282:     ChernobogStorageObservation,
  283:   options:
```

### lib\chernobog\operations\backupStorageEvents.ts line 281

```text
  278: }
  279: 
  280: export async function publishStorageObservation(
> 281:   observation:
  282:     ChernobogStorageObservation,
  283:   options:
  284:     PublishStorageObservationOptions = {}
```

### lib\chernobog\operations\backupStorageEvents.ts line 282

```text
  279: 
  280: export async function publishStorageObservation(
  281:   observation:
> 282:     ChernobogStorageObservation,
  283:   options:
  284:     PublishStorageObservationOptions = {}
  285: ): Promise<void> {
```

### lib\chernobog\operations\backupStorageEvents.ts line 284

```text
  281:   observation:
  282:     ChernobogStorageObservation,
  283:   options:
> 284:     PublishStorageObservationOptions = {}
  285: ): Promise<void> {
  286:   const payload =
  287:     buildStoragePayload(
```

### lib\chernobog\operations\backupStorageEvents.ts line 287

```text
  284:     PublishStorageObservationOptions = {}
  285: ): Promise<void> {
  286:   const payload =
> 287:     buildStoragePayload(
  288:       observation
  289:     );
  290: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 288

```text
  285: ): Promise<void> {
  286:   const payload =
  287:     buildStoragePayload(
> 288:       observation
  289:     );
  290: 
  291:   /*
```

### lib\chernobog\operations\backupStorageEvents.ts line 292

```text
  289:     );
  290: 
  291:   /*
> 292:    * Neutral storage observation.
  293:    */
  294:   await publishChernobogEventSafely({
  295:     type:
```

### lib\chernobog\operations\backupStorageEvents.ts line 294

```text
  291:   /*
  292:    * Neutral storage observation.
  293:    */
> 294:   await publishChernobogEventSafely({
  295:     type:
  296:       "storage.observed",
  297: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 296

```text
  293:    */
  294:   await publishChernobogEventSafely({
  295:     type:
> 296:       "storage.observed",
  297: 
  298:     source: {
  299:       subsystem:
```

### lib\chernobog\operations\backupStorageEvents.ts line 300

```text
  297: 
  298:     source: {
  299:       subsystem:
> 300:         "backup-storage",
  301:       nodeId:
  302:         observation.nodeId,
  303:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 302

```text
  299:       subsystem:
  300:         "backup-storage",
  301:       nodeId:
> 302:         observation.nodeId,
  303:     },
  304: 
  305:     severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 309

```text
  306:       "debug",
  307: 
  308:     subject:
> 309:       observation.id,
  310: 
  311:     scope:
  312:       observation.nodeId
```

### lib\chernobog\operations\backupStorageEvents.ts line 312

```text
  309:       observation.id,
  310: 
  311:     scope:
> 312:       observation.nodeId
  313:         ? `node:${observation.nodeId}`
  314:         : "storage",
  315: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 313

```text
  310: 
  311:     scope:
  312:       observation.nodeId
> 313:         ? `node:${observation.nodeId}`
  314:         : "storage",
  315: 
  316:     payload,
```

### lib\chernobog\operations\backupStorageEvents.ts line 314

```text
  311:     scope:
  312:       observation.nodeId
  313:         ? `node:${observation.nodeId}`
> 314:         : "storage",
  315: 
  316:     payload,
  317: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 319

```text
  316:     payload,
  317: 
  318:     dedupeKey: [
> 319:       "storage.observed",
  320:       observation.id,
  321:       observation.nodeId ??
  322:         "local",
```

### lib\chernobog\operations\backupStorageEvents.ts line 320

```text
  317: 
  318:     dedupeKey: [
  319:       "storage.observed",
> 320:       observation.id,
  321:       observation.nodeId ??
  322:         "local",
  323:       observation.status,
```

### lib\chernobog\operations\backupStorageEvents.ts line 321

```text
  318:     dedupeKey: [
  319:       "storage.observed",
  320:       observation.id,
> 321:       observation.nodeId ??
  322:         "local",
  323:       observation.status,
  324:     ].join(":"),
```

### lib\chernobog\operations\backupStorageEvents.ts line 323

```text
  320:       observation.id,
  321:       observation.nodeId ??
  322:         "local",
> 323:       observation.status,
  324:     ].join(":"),
  325: 
  326:     metadata: {
```

### lib\chernobog\operations\backupStorageEvents.ts line 328

```text
  325: 
  326:     metadata: {
  327:       tags: [
> 328:         "storage",
  329:         observation.status,
  330:       ],
  331:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 329

```text
  326:     metadata: {
  327:       tags: [
  328:         "storage",
> 329:         observation.status,
  330:       ],
  331:     },
  332:   });
```

### lib\chernobog\operations\backupStorageEvents.ts line 335

```text
  332:   });
  333: 
  334:   /*
> 335:    * A return to healthy is significant
  336:    * enough to receive its own transition
  337:    * event.
  338:    */
```

### lib\chernobog\operations\backupStorageEvents.ts line 340

```text
  337:    * event.
  338:    */
  339:   if (
> 340:     storageRecovered(
  341:       options.previousStatus,
  342:       observation.status
  343:     )
```

### lib\chernobog\operations\backupStorageEvents.ts line 342

```text
  339:   if (
  340:     storageRecovered(
  341:       options.previousStatus,
> 342:       observation.status
  343:     )
  344:   ) {
  345:     await publishChernobogEventSafely({
```

### lib\chernobog\operations\backupStorageEvents.ts line 345

```text
  342:       observation.status
  343:     )
  344:   ) {
> 345:     await publishChernobogEventSafely({
  346:       type:
  347:         "storage.recovered",
  348: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 347

```text
  344:   ) {
  345:     await publishChernobogEventSafely({
  346:       type:
> 347:         "storage.recovered",
  348: 
  349:       source: {
  350:         subsystem:
```

### lib\chernobog\operations\backupStorageEvents.ts line 351

```text
  348: 
  349:       source: {
  350:         subsystem:
> 351:           "backup-storage",
  352:         nodeId:
  353:           observation.nodeId,
  354:       },
```

### lib\chernobog\operations\backupStorageEvents.ts line 353

```text
  350:         subsystem:
  351:           "backup-storage",
  352:         nodeId:
> 353:           observation.nodeId,
  354:       },
  355: 
  356:       severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 360

```text
  357:         "info",
  358: 
  359:       subject:
> 360:         observation.id,
  361: 
  362:       payload: {
  363:         ...payload,
```

### lib\chernobog\operations\backupStorageEvents.ts line 370

```text
  367:       },
  368: 
  369:       dedupeKey: [
> 370:         "storage.recovered",
  371:         observation.id,
  372:         observation.nodeId ??
  373:           "local",
```

### lib\chernobog\operations\backupStorageEvents.ts line 371

```text
  368: 
  369:       dedupeKey: [
  370:         "storage.recovered",
> 371:         observation.id,
  372:         observation.nodeId ??
  373:           "local",
  374:       ].join(":"),
```

### lib\chernobog\operations\backupStorageEvents.ts line 372

```text
  369:       dedupeKey: [
  370:         "storage.recovered",
  371:         observation.id,
> 372:         observation.nodeId ??
  373:           "local",
  374:       ].join(":"),
  375: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 378

```text
  375: 
  376:       metadata: {
  377:         tags: [
> 378:           "storage",
  379:           "recovered",
  380:         ],
  381:       },
```

### lib\chernobog\operations\backupStorageEvents.ts line 386

```text
  383:   }
  384: 
  385:   const type =
> 386:     observation.status === "healthy"
  387:       ? "storage.healthy"
  388:       : observation.status === "degraded"
  389:         ? "storage.degraded"
```

### lib\chernobog\operations\backupStorageEvents.ts line 387

```text
  384: 
  385:   const type =
  386:     observation.status === "healthy"
> 387:       ? "storage.healthy"
  388:       : observation.status === "degraded"
  389:         ? "storage.degraded"
  390:         : observation.status === "critical"
```

### lib\chernobog\operations\backupStorageEvents.ts line 388

```text
  385:   const type =
  386:     observation.status === "healthy"
  387:       ? "storage.healthy"
> 388:       : observation.status === "degraded"
  389:         ? "storage.degraded"
  390:         : observation.status === "critical"
  391:           ? "storage.critical"
```

### lib\chernobog\operations\backupStorageEvents.ts line 389

```text
  386:     observation.status === "healthy"
  387:       ? "storage.healthy"
  388:       : observation.status === "degraded"
> 389:         ? "storage.degraded"
  390:         : observation.status === "critical"
  391:           ? "storage.critical"
  392:           : observation.status === "unavailable"
```

### lib\chernobog\operations\backupStorageEvents.ts line 390

```text
  387:       ? "storage.healthy"
  388:       : observation.status === "degraded"
  389:         ? "storage.degraded"
> 390:         : observation.status === "critical"
  391:           ? "storage.critical"
  392:           : observation.status === "unavailable"
  393:             ? "storage.unavailable"
```

### lib\chernobog\operations\backupStorageEvents.ts line 391

```text
  388:       : observation.status === "degraded"
  389:         ? "storage.degraded"
  390:         : observation.status === "critical"
> 391:           ? "storage.critical"
  392:           : observation.status === "unavailable"
  393:             ? "storage.unavailable"
  394:             : "storage.unknown";
```

### lib\chernobog\operations\backupStorageEvents.ts line 392

```text
  389:         ? "storage.degraded"
  390:         : observation.status === "critical"
  391:           ? "storage.critical"
> 392:           : observation.status === "unavailable"
  393:             ? "storage.unavailable"
  394:             : "storage.unknown";
  395: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 393

```text
  390:         : observation.status === "critical"
  391:           ? "storage.critical"
  392:           : observation.status === "unavailable"
> 393:             ? "storage.unavailable"
  394:             : "storage.unknown";
  395: 
  396:   await publishChernobogEventSafely({
```

### lib\chernobog\operations\backupStorageEvents.ts line 394

```text
  391:           ? "storage.critical"
  392:           : observation.status === "unavailable"
  393:             ? "storage.unavailable"
> 394:             : "storage.unknown";
  395: 
  396:   await publishChernobogEventSafely({
  397:     type,
```

### lib\chernobog\operations\backupStorageEvents.ts line 396

```text
  393:             ? "storage.unavailable"
  394:             : "storage.unknown";
  395: 
> 396:   await publishChernobogEventSafely({
  397:     type,
  398: 
  399:     source: {
```

### lib\chernobog\operations\backupStorageEvents.ts line 401

```text
  398: 
  399:     source: {
  400:       subsystem:
> 401:         "backup-storage",
  402:       nodeId:
  403:         observation.nodeId,
  404:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 403

```text
  400:       subsystem:
  401:         "backup-storage",
  402:       nodeId:
> 403:         observation.nodeId,
  404:     },
  405: 
  406:     severity:
```

### lib\chernobog\operations\backupStorageEvents.ts line 407

```text
  404:     },
  405: 
  406:     severity:
> 407:       observation.status === "critical" ||
  408:       observation.status === "unavailable"
  409:         ? "warning"
  410:         : observation.status === "degraded" ||
```

### lib\chernobog\operations\backupStorageEvents.ts line 408

```text
  405: 
  406:     severity:
  407:       observation.status === "critical" ||
> 408:       observation.status === "unavailable"
  409:         ? "warning"
  410:         : observation.status === "degraded" ||
  411:             observation.status === "unknown"
```

### lib\chernobog\operations\backupStorageEvents.ts line 410

```text
  407:       observation.status === "critical" ||
  408:       observation.status === "unavailable"
  409:         ? "warning"
> 410:         : observation.status === "degraded" ||
  411:             observation.status === "unknown"
  412:           ? "notice"
  413:           : "info",
```

### lib\chernobog\operations\backupStorageEvents.ts line 411

```text
  408:       observation.status === "unavailable"
  409:         ? "warning"
  410:         : observation.status === "degraded" ||
> 411:             observation.status === "unknown"
  412:           ? "notice"
  413:           : "info",
  414: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 416

```text
  413:           : "info",
  414: 
  415:     subject:
> 416:       observation.id,
  417: 
  418:     payload,
  419: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 422

```text
  419: 
  420:     dedupeKey: [
  421:       type,
> 422:       observation.id,
  423:       observation.nodeId ??
  424:         "local",
  425:     ].join(":"),
```

### lib\chernobog\operations\backupStorageEvents.ts line 423

```text
  420:     dedupeKey: [
  421:       type,
  422:       observation.id,
> 423:       observation.nodeId ??
  424:         "local",
  425:     ].join(":"),
  426: 
```

### lib\chernobog\operations\backupStorageEvents.ts line 429

```text
  426: 
  427:     metadata: {
  428:       tags: [
> 429:         "storage",
  430:         observation.status,
  431:       ],
  432:     },
```

### lib\chernobog\operations\backupStorageEvents.ts line 430

```text
  427:     metadata: {
  428:       tags: [
  429:         "storage",
> 430:         observation.status,
  431:       ],
  432:     },
  433:   });
```

### lib\chernobog\operations\backupStorageObservation.ts line 1

```text
>   1: export const CHERNOBOG_BACKUP_STATUSES = [
    2:     "running",
    3:     "succeeded",
    4:     "failed",
```

### lib\chernobog\operations\backupStorageObservation.ts line 8

```text
    5:     "unknown",
    6:   ] as const;
    7:   
>   8:   export type ChernobogBackupStatus =
    9:     (typeof CHERNOBOG_BACKUP_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_STORAGE_STATUSES = [
```

### lib\chernobog\operations\backupStorageObservation.ts line 9

```text
    6:   ] as const;
    7:   
    8:   export type ChernobogBackupStatus =
>   9:     (typeof CHERNOBOG_BACKUP_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_STORAGE_STATUSES = [
   12:     "healthy",
```

### lib\chernobog\operations\backupStorageObservation.ts line 11

```text
    8:   export type ChernobogBackupStatus =
    9:     (typeof CHERNOBOG_BACKUP_STATUSES)[number];
   10:   
>  11:   export const CHERNOBOG_STORAGE_STATUSES = [
   12:     "healthy",
   13:     "degraded",
   14:     "critical",
```

### lib\chernobog\operations\backupStorageObservation.ts line 12

```text
    9:     (typeof CHERNOBOG_BACKUP_STATUSES)[number];
   10:   
   11:   export const CHERNOBOG_STORAGE_STATUSES = [
>  12:     "healthy",
   13:     "degraded",
   14:     "critical",
   15:     "unavailable",
```

### lib\chernobog\operations\backupStorageObservation.ts line 19

```text
   16:     "unknown",
   17:   ] as const;
   18:   
>  19:   export type ChernobogStorageStatus =
   20:     (typeof CHERNOBOG_STORAGE_STATUSES)[number];
   21:   
   22:   export interface ChernobogBackupObservation {
```

### lib\chernobog\operations\backupStorageObservation.ts line 20

```text
   17:   ] as const;
   18:   
   19:   export type ChernobogStorageStatus =
>  20:     (typeof CHERNOBOG_STORAGE_STATUSES)[number];
   21:   
   22:   export interface ChernobogBackupObservation {
   23:     id: string;
```

### lib\chernobog\operations\backupStorageObservation.ts line 22

```text
   19:   export type ChernobogStorageStatus =
   20:     (typeof CHERNOBOG_STORAGE_STATUSES)[number];
   21:   
>  22:   export interface ChernobogBackupObservation {
   23:     id: string;
   24:   
   25:     status: ChernobogBackupStatus;
```

### lib\chernobog\operations\backupStorageObservation.ts line 25

```text
   22:   export interface ChernobogBackupObservation {
   23:     id: string;
   24:   
>  25:     status: ChernobogBackupStatus;
   26:   
   27:     observedAt: string;
   28:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 27

```text
   24:   
   25:     status: ChernobogBackupStatus;
   26:   
>  27:     observedAt: string;
   28:   
   29:     nodeId?: string;
   30:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 53

```text
   50:     >;
   51:   }
   52:   
>  53:   export interface ChernobogStorageObservation {
   54:     id: string;
   55:   
   56:     status: ChernobogStorageStatus;
```

### lib\chernobog\operations\backupStorageObservation.ts line 56

```text
   53:   export interface ChernobogStorageObservation {
   54:     id: string;
   55:   
>  56:     status: ChernobogStorageStatus;
   57:   
   58:     observedAt: string;
   59:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 58

```text
   55:   
   56:     status: ChernobogStorageStatus;
   57:   
>  58:     observedAt: string;
   59:   
   60:     nodeId?: string;
   61:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 82

```text
   79:     >;
   80:   }
   81:   
>  82:   export function createBackupObservation(
   83:     input: Omit<
   84:       ChernobogBackupObservation,
   85:       "observedAt"
```

### lib\chernobog\operations\backupStorageObservation.ts line 84

```text
   81:   
   82:   export function createBackupObservation(
   83:     input: Omit<
>  84:       ChernobogBackupObservation,
   85:       "observedAt"
   86:     > & {
   87:       observedAt?: string;
```

### lib\chernobog\operations\backupStorageObservation.ts line 85

```text
   82:   export function createBackupObservation(
   83:     input: Omit<
   84:       ChernobogBackupObservation,
>  85:       "observedAt"
   86:     > & {
   87:       observedAt?: string;
   88:     }
```

### lib\chernobog\operations\backupStorageObservation.ts line 87

```text
   84:       ChernobogBackupObservation,
   85:       "observedAt"
   86:     > & {
>  87:       observedAt?: string;
   88:     }
   89:   ): ChernobogBackupObservation {
   90:     return {
```

### lib\chernobog\operations\backupStorageObservation.ts line 89

```text
   86:     > & {
   87:       observedAt?: string;
   88:     }
>  89:   ): ChernobogBackupObservation {
   90:     return {
   91:       ...input,
   92:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 93

```text
   90:     return {
   91:       ...input,
   92:   
>  93:       observedAt:
   94:         input.observedAt ??
   95:         new Date().toISOString(),
   96:     };
```

### lib\chernobog\operations\backupStorageObservation.ts line 94

```text
   91:       ...input,
   92:   
   93:       observedAt:
>  94:         input.observedAt ??
   95:         new Date().toISOString(),
   96:     };
   97:   }
```

### lib\chernobog\operations\backupStorageObservation.ts line 99

```text
   96:     };
   97:   }
   98:   
>  99:   export function createStorageObservation(
  100:     input: Omit<
  101:       ChernobogStorageObservation,
  102:       "observedAt"
```

### lib\chernobog\operations\backupStorageObservation.ts line 101

```text
   98:   
   99:   export function createStorageObservation(
  100:     input: Omit<
> 101:       ChernobogStorageObservation,
  102:       "observedAt"
  103:     > & {
  104:       observedAt?: string;
```

### lib\chernobog\operations\backupStorageObservation.ts line 102

```text
   99:   export function createStorageObservation(
  100:     input: Omit<
  101:       ChernobogStorageObservation,
> 102:       "observedAt"
  103:     > & {
  104:       observedAt?: string;
  105:     }
```

### lib\chernobog\operations\backupStorageObservation.ts line 104

```text
  101:       ChernobogStorageObservation,
  102:       "observedAt"
  103:     > & {
> 104:       observedAt?: string;
  105:     }
  106:   ): ChernobogStorageObservation {
  107:     return {
```

### lib\chernobog\operations\backupStorageObservation.ts line 106

```text
  103:     > & {
  104:       observedAt?: string;
  105:     }
> 106:   ): ChernobogStorageObservation {
  107:     return {
  108:       ...input,
  109:   
```

### lib\chernobog\operations\backupStorageObservation.ts line 110

```text
  107:     return {
  108:       ...input,
  109:   
> 110:       observedAt:
  111:         input.observedAt ??
  112:         new Date().toISOString(),
  113:     };
```

### lib\chernobog\operations\backupStorageObservation.ts line 111

```text
  108:       ...input,
  109:   
  110:       observedAt:
> 111:         input.observedAt ??
  112:         new Date().toISOString(),
  113:     };
  114:   }
```

### lib\chernobog\operations\backupStorageReporters.ts line 2

```text
    1: import type {
>   2:     ChernobogBackupObservation,
    3:     ChernobogBackupStatus,
    4:     ChernobogStorageObservation,
    5:     ChernobogStorageStatus,
```

### lib\chernobog\operations\backupStorageReporters.ts line 3

```text
    1: import type {
    2:     ChernobogBackupObservation,
>   3:     ChernobogBackupStatus,
    4:     ChernobogStorageObservation,
    5:     ChernobogStorageStatus,
    6:   } from "./backupStorageObservation";
```

### lib\chernobog\operations\backupStorageReporters.ts line 4

```text
    1: import type {
    2:     ChernobogBackupObservation,
    3:     ChernobogBackupStatus,
>   4:     ChernobogStorageObservation,
    5:     ChernobogStorageStatus,
    6:   } from "./backupStorageObservation";
    7:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 5

```text
    2:     ChernobogBackupObservation,
    3:     ChernobogBackupStatus,
    4:     ChernobogStorageObservation,
>   5:     ChernobogStorageStatus,
    6:   } from "./backupStorageObservation";
    7:   
    8:   import {
```

### lib\chernobog\operations\backupStorageReporters.ts line 6

```text
    3:     ChernobogBackupStatus,
    4:     ChernobogStorageObservation,
    5:     ChernobogStorageStatus,
>   6:   } from "./backupStorageObservation";
    7:   
    8:   import {
    9:     createBackupObservation,
```

### lib\chernobog\operations\backupStorageReporters.ts line 9

```text
    6:   } from "./backupStorageObservation";
    7:   
    8:   import {
>   9:     createBackupObservation,
   10:     createStorageObservation,
   11:   } from "./backupStorageObservation";
   12:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 10

```text
    7:   
    8:   import {
    9:     createBackupObservation,
>  10:     createStorageObservation,
   11:   } from "./backupStorageObservation";
   12:   
   13:   import {
```

### lib\chernobog\operations\backupStorageReporters.ts line 11

```text
    8:   import {
    9:     createBackupObservation,
   10:     createStorageObservation,
>  11:   } from "./backupStorageObservation";
   12:   
   13:   import {
   14:     publishBackupObservation,
```

### lib\chernobog\operations\backupStorageReporters.ts line 14

```text
   11:   } from "./backupStorageObservation";
   12:   
   13:   import {
>  14:     publishBackupObservation,
   15:     publishStorageObservation,
   16:   } from "./backupStorageEvents";
   17:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 15

```text
   12:   
   13:   import {
   14:     publishBackupObservation,
>  15:     publishStorageObservation,
   16:   } from "./backupStorageEvents";
   17:   
   18:   export interface BackupReport {
```

### lib\chernobog\operations\backupStorageReporters.ts line 16

```text
   13:   import {
   14:     publishBackupObservation,
   15:     publishStorageObservation,
>  16:   } from "./backupStorageEvents";
   17:   
   18:   export interface BackupReport {
   19:     id: string;
```

### lib\chernobog\operations\backupStorageReporters.ts line 18

```text
   15:     publishStorageObservation,
   16:   } from "./backupStorageEvents";
   17:   
>  18:   export interface BackupReport {
   19:     id: string;
   20:   
   21:     status: ChernobogBackupStatus;
```

### lib\chernobog\operations\backupStorageReporters.ts line 21

```text
   18:   export interface BackupReport {
   19:     id: string;
   20:   
>  21:     status: ChernobogBackupStatus;
   22:   
   23:     nodeId?: string;
   24:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 46

```text
   43:       string | number | boolean | null
   44:     >;
   45:   
>  46:     observedAt?: string;
   47:   }
   48:   
   49:   export interface StorageReport {
```

### lib\chernobog\operations\backupStorageReporters.ts line 49

```text
   46:     observedAt?: string;
   47:   }
   48:   
>  49:   export interface StorageReport {
   50:     id: string;
   51:   
   52:     status: ChernobogStorageStatus;
```

### lib\chernobog\operations\backupStorageReporters.ts line 52

```text
   49:   export interface StorageReport {
   50:     id: string;
   51:   
>  52:     status: ChernobogStorageStatus;
   53:   
   54:     nodeId?: string;
   55:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 75

```text
   72:       string | number | boolean | null
   73:     >;
   74:   
>  75:     observedAt?: string;
   76:   }
   77:   
   78:   export interface BackupReportOptions {
```

### lib\chernobog\operations\backupStorageReporters.ts line 78

```text
   75:     observedAt?: string;
   76:   }
   77:   
>  78:   export interface BackupReportOptions {
   79:     previousStatus?: ChernobogBackupStatus;
   80:   }
   81:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 79

```text
   76:   }
   77:   
   78:   export interface BackupReportOptions {
>  79:     previousStatus?: ChernobogBackupStatus;
   80:   }
   81:   
   82:   export interface StorageReportOptions {
```

### lib\chernobog\operations\backupStorageReporters.ts line 82

```text
   79:     previousStatus?: ChernobogBackupStatus;
   80:   }
   81:   
>  82:   export interface StorageReportOptions {
   83:     previousStatus?: ChernobogStorageStatus;
   84:   }
   85:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 83

```text
   80:   }
   81:   
   82:   export interface StorageReportOptions {
>  83:     previousStatus?: ChernobogStorageStatus;
   84:   }
   85:   
   86:   export async function reportBackupState(
```

### lib\chernobog\operations\backupStorageReporters.ts line 86

```text
   83:     previousStatus?: ChernobogStorageStatus;
   84:   }
   85:   
>  86:   export async function reportBackupState(
   87:     report: BackupReport,
   88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
```

### lib\chernobog\operations\backupStorageReporters.ts line 87

```text
   84:   }
   85:   
   86:   export async function reportBackupState(
>  87:     report: BackupReport,
   88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
   90:     const observation =
```

### lib\chernobog\operations\backupStorageReporters.ts line 88

```text
   85:   
   86:   export async function reportBackupState(
   87:     report: BackupReport,
>  88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
   90:     const observation =
   91:       createBackupObservation({
```

### lib\chernobog\operations\backupStorageReporters.ts line 89

```text
   86:   export async function reportBackupState(
   87:     report: BackupReport,
   88:     options: BackupReportOptions = {}
>  89:   ): Promise<ChernobogBackupObservation> {
   90:     const observation =
   91:       createBackupObservation({
   92:         id: report.id,
```

### lib\chernobog\operations\backupStorageReporters.ts line 90

```text
   87:     report: BackupReport,
   88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
>  90:     const observation =
   91:       createBackupObservation({
   92:         id: report.id,
   93:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 91

```text
   88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
   90:     const observation =
>  91:       createBackupObservation({
   92:         id: report.id,
   93:   
   94:         status: report.status,
```

### lib\chernobog\operations\backupStorageReporters.ts line 125

```text
  122:         metadata:
  123:           report.metadata,
  124:   
> 125:         observedAt:
  126:           report.observedAt,
  127:       });
  128:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 126

```text
  123:           report.metadata,
  124:   
  125:         observedAt:
> 126:           report.observedAt,
  127:       });
  128:   
  129:     await publishBackupObservation(
```

### lib\chernobog\operations\backupStorageReporters.ts line 129

```text
  126:           report.observedAt,
  127:       });
  128:   
> 129:     await publishBackupObservation(
  130:       observation,
  131:       {
  132:         previousStatus:
```

### lib\chernobog\operations\backupStorageReporters.ts line 130

```text
  127:       });
  128:   
  129:     await publishBackupObservation(
> 130:       observation,
  131:       {
  132:         previousStatus:
  133:           options.previousStatus,
```

### lib\chernobog\operations\backupStorageReporters.ts line 137

```text
  134:       }
  135:     );
  136:   
> 137:     return observation;
  138:   }
  139:   
  140:   export async function reportStorageState(
```

### lib\chernobog\operations\backupStorageReporters.ts line 140

```text
  137:     return observation;
  138:   }
  139:   
> 140:   export async function reportStorageState(
  141:     report: StorageReport,
  142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
```

### lib\chernobog\operations\backupStorageReporters.ts line 141

```text
  138:   }
  139:   
  140:   export async function reportStorageState(
> 141:     report: StorageReport,
  142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
  144:     const observation =
```

### lib\chernobog\operations\backupStorageReporters.ts line 142

```text
  139:   
  140:   export async function reportStorageState(
  141:     report: StorageReport,
> 142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
  144:     const observation =
  145:       createStorageObservation({
```

### lib\chernobog\operations\backupStorageReporters.ts line 143

```text
  140:   export async function reportStorageState(
  141:     report: StorageReport,
  142:     options: StorageReportOptions = {}
> 143:   ): Promise<ChernobogStorageObservation> {
  144:     const observation =
  145:       createStorageObservation({
  146:         id:
```

### lib\chernobog\operations\backupStorageReporters.ts line 144

```text
  141:     report: StorageReport,
  142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
> 144:     const observation =
  145:       createStorageObservation({
  146:         id:
  147:           report.id,
```

### lib\chernobog\operations\backupStorageReporters.ts line 145

```text
  142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
  144:     const observation =
> 145:       createStorageObservation({
  146:         id:
  147:           report.id,
  148:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 179

```text
  176:         metadata:
  177:           report.metadata,
  178:   
> 179:         observedAt:
  180:           report.observedAt,
  181:       });
  182:   
```

### lib\chernobog\operations\backupStorageReporters.ts line 180

```text
  177:           report.metadata,
  178:   
  179:         observedAt:
> 180:           report.observedAt,
  181:       });
  182:   
  183:     await publishStorageObservation(
```

### lib\chernobog\operations\backupStorageReporters.ts line 183

```text
  180:           report.observedAt,
  181:       });
  182:   
> 183:     await publishStorageObservation(
  184:       observation,
  185:       {
  186:         previousStatus:
```

### lib\chernobog\operations\backupStorageReporters.ts line 184

```text
  181:       });
  182:   
  183:     await publishStorageObservation(
> 184:       observation,
  185:       {
  186:         previousStatus:
  187:           options.previousStatus,
```

### lib\chernobog\operations\backupStorageReporters.ts line 191

```text
  188:       }
  189:     );
  190:   
> 191:     return observation;
  192:   }
```

### lib\chernobog\desktop\desktopEvents.ts line 1

```text
>   1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ChernobogDesktopObservation,
```

### lib\chernobog\desktop\desktopEvents.ts line 4

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
>   4:   ChernobogDesktopObservation,
    5: } from "./desktopObservation";
    6: 
    7: export interface PublishDesktopObservationOptions {
```

### lib\chernobog\desktop\desktopEvents.ts line 5

```text
    2: 
    3: import type {
    4:   ChernobogDesktopObservation,
>   5: } from "./desktopObservation";
    6: 
    7: export interface PublishDesktopObservationOptions {
    8:   previousObservation?: ChernobogDesktopObservation;
```

### lib\chernobog\desktop\desktopEvents.ts line 7

```text
    4:   ChernobogDesktopObservation,
    5: } from "./desktopObservation";
    6: 
>   7: export interface PublishDesktopObservationOptions {
    8:   previousObservation?: ChernobogDesktopObservation;
    9: }
   10: 
```

### lib\chernobog\desktop\desktopEvents.ts line 8

```text
    5: } from "./desktopObservation";
    6: 
    7: export interface PublishDesktopObservationOptions {
>   8:   previousObservation?: ChernobogDesktopObservation;
    9: }
   10: 
   11: function buildDesktopPayload(
```

### lib\chernobog\desktop\desktopEvents.ts line 11

```text
    8:   previousObservation?: ChernobogDesktopObservation;
    9: }
   10: 
>  11: function buildDesktopPayload(
   12:   observation: ChernobogDesktopObservation
   13: ) {
   14:   return {
```

### lib\chernobog\desktop\desktopEvents.ts line 12

```text
    9: }
   10: 
   11: function buildDesktopPayload(
>  12:   observation: ChernobogDesktopObservation
   13: ) {
   14:   return {
   15:     nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 16

```text
   13: ) {
   14:   return {
   15:     nodeId:
>  16:       observation.nodeId,
   17: 
   18:     platform:
   19:       observation.platform,
```

### lib\chernobog\desktop\desktopEvents.ts line 19

```text
   16:       observation.nodeId,
   17: 
   18:     platform:
>  19:       observation.platform,
   20: 
   21:     presence:
   22:       observation.presence,
```

### lib\chernobog\desktop\desktopEvents.ts line 22

```text
   19:       observation.platform,
   20: 
   21:     presence:
>  22:       observation.presence,
   23: 
   24:     activity:
   25:       observation.activity,
```

### lib\chernobog\desktop\desktopEvents.ts line 25

```text
   22:       observation.presence,
   23: 
   24:     activity:
>  25:       observation.activity,
   26: 
   27:     idleSeconds:
   28:       observation.idleSeconds,
```

### lib\chernobog\desktop\desktopEvents.ts line 28

```text
   25:       observation.activity,
   26: 
   27:     idleSeconds:
>  28:       observation.idleSeconds,
   29: 
   30:     foregroundApplication:
   31:       observation.foregroundApplication,
```

### lib\chernobog\desktop\desktopEvents.ts line 31

```text
   28:       observation.idleSeconds,
   29: 
   30:     foregroundApplication:
>  31:       observation.foregroundApplication,
   32: 
   33:     workspace:
   34:       observation.workspace,
```

### lib\chernobog\desktop\desktopEvents.ts line 34

```text
   31:       observation.foregroundApplication,
   32: 
   33:     workspace:
>  34:       observation.workspace,
   35: 
   36:     screen:
   37:       observation.screen,
```

### lib\chernobog\desktop\desktopEvents.ts line 37

```text
   34:       observation.workspace,
   35: 
   36:     screen:
>  37:       observation.screen,
   38: 
   39:     observedAt:
   40:       observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 39

```text
   36:     screen:
   37:       observation.screen,
   38: 
>  39:     observedAt:
   40:       observation.observedAt,
   41:   };
   42: }
```

### lib\chernobog\desktop\desktopEvents.ts line 40

```text
   37:       observation.screen,
   38: 
   39:     observedAt:
>  40:       observation.observedAt,
   41:   };
   42: }
   43: 
```

### lib\chernobog\desktop\desktopEvents.ts line 45

```text
   42: }
   43: 
   44: function applicationKey(
>  45:   observation:
   46:     ChernobogDesktopObservation
   47: ): string {
   48:   const application =
```

### lib\chernobog\desktop\desktopEvents.ts line 46

```text
   43: 
   44: function applicationKey(
   45:   observation:
>  46:     ChernobogDesktopObservation
   47: ): string {
   48:   const application =
   49:     observation.foregroundApplication;
```

### lib\chernobog\desktop\desktopEvents.ts line 49

```text
   46:     ChernobogDesktopObservation
   47: ): string {
   48:   const application =
>  49:     observation.foregroundApplication;
   50: 
   51:   if (!application) {
   52:     return "none";
```

### lib\chernobog\desktop\desktopEvents.ts line 62

```text
   59: }
   60: 
   61: function workspaceKey(
>  62:   observation:
   63:     ChernobogDesktopObservation
   64: ): string {
   65:   const workspace =
```

### lib\chernobog\desktop\desktopEvents.ts line 63

```text
   60: 
   61: function workspaceKey(
   62:   observation:
>  63:     ChernobogDesktopObservation
   64: ): string {
   65:   const workspace =
   66:     observation.workspace;
```

### lib\chernobog\desktop\desktopEvents.ts line 66

```text
   63:     ChernobogDesktopObservation
   64: ): string {
   65:   const workspace =
>  66:     observation.workspace;
   67: 
   68:   if (!workspace) {
   69:     return "none";
```

### lib\chernobog\desktop\desktopEvents.ts line 74

```text
   71: 
   72:   return [
   73:     workspace.id ?? "",
>  74:     workspace.projectId ?? "",
   75:     workspace.kind ?? "",
   76:   ].join(":");
   77: }
```

### lib\chernobog\desktop\desktopEvents.ts line 79

```text
   76:   ].join(":");
   77: }
   78: 
>  79: export async function publishDesktopObservation(
   80:   observation:
   81:     ChernobogDesktopObservation,
   82:   options:
```

### lib\chernobog\desktop\desktopEvents.ts line 80

```text
   77: }
   78: 
   79: export async function publishDesktopObservation(
>  80:   observation:
   81:     ChernobogDesktopObservation,
   82:   options:
   83:     PublishDesktopObservationOptions = {}
```

### lib\chernobog\desktop\desktopEvents.ts line 81

```text
   78: 
   79: export async function publishDesktopObservation(
   80:   observation:
>  81:     ChernobogDesktopObservation,
   82:   options:
   83:     PublishDesktopObservationOptions = {}
   84: ): Promise<void> {
```

### lib\chernobog\desktop\desktopEvents.ts line 83

```text
   80:   observation:
   81:     ChernobogDesktopObservation,
   82:   options:
>  83:     PublishDesktopObservationOptions = {}
   84: ): Promise<void> {
   85:   const payload =
   86:     buildDesktopPayload(
```

### lib\chernobog\desktop\desktopEvents.ts line 86

```text
   83:     PublishDesktopObservationOptions = {}
   84: ): Promise<void> {
   85:   const payload =
>  86:     buildDesktopPayload(
   87:       observation
   88:     );
   89: 
```

### lib\chernobog\desktop\desktopEvents.ts line 87

```text
   84: ): Promise<void> {
   85:   const payload =
   86:     buildDesktopPayload(
>  87:       observation
   88:     );
   89: 
   90:   const previous =
```

### lib\chernobog\desktop\desktopEvents.ts line 91

```text
   88:     );
   89: 
   90:   const previous =
>  91:     options.previousObservation;
   92: 
   93:   /*
   94:    * Every desktop report first becomes
```

### lib\chernobog\desktop\desktopEvents.ts line 94

```text
   91:     options.previousObservation;
   92: 
   93:   /*
>  94:    * Every desktop report first becomes
   95:    * one neutral observation.
   96:    */
   97:   await publishChernobogEventSafely({
```

### lib\chernobog\desktop\desktopEvents.ts line 95

```text
   92: 
   93:   /*
   94:    * Every desktop report first becomes
>  95:    * one neutral observation.
   96:    */
   97:   await publishChernobogEventSafely({
   98:     type:
```

### lib\chernobog\desktop\desktopEvents.ts line 97

```text
   94:    * Every desktop report first becomes
   95:    * one neutral observation.
   96:    */
>  97:   await publishChernobogEventSafely({
   98:     type:
   99:       "desktop.observed",
  100: 
```

### lib\chernobog\desktop\desktopEvents.ts line 99

```text
   96:    */
   97:   await publishChernobogEventSafely({
   98:     type:
>  99:       "desktop.observed",
  100: 
  101:     source: {
  102:       subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 103

```text
  100: 
  101:     source: {
  102:       subsystem:
> 103:         "desktop-observation",
  104: 
  105:       nodeId:
  106:         observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 106

```text
  103:         "desktop-observation",
  104: 
  105:       nodeId:
> 106:         observation.nodeId,
  107:     },
  108: 
  109:     severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 113

```text
  110:       "debug",
  111: 
  112:     subject:
> 113:       observation.nodeId,
  114: 
  115:     scope:
  116:       `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 116

```text
  113:       observation.nodeId,
  114: 
  115:     scope:
> 116:       `node:${observation.nodeId}`,
  117: 
  118:     payload,
  119: 
```

### lib\chernobog\desktop\desktopEvents.ts line 121

```text
  118:     payload,
  119: 
  120:     dedupeKey: [
> 121:       "desktop.observed",
  122:       observation.nodeId,
  123:       observation.presence,
  124:       observation.activity,
```

### lib\chernobog\desktop\desktopEvents.ts line 122

```text
  119: 
  120:     dedupeKey: [
  121:       "desktop.observed",
> 122:       observation.nodeId,
  123:       observation.presence,
  124:       observation.activity,
  125:       applicationKey(
```

### lib\chernobog\desktop\desktopEvents.ts line 123

```text
  120:     dedupeKey: [
  121:       "desktop.observed",
  122:       observation.nodeId,
> 123:       observation.presence,
  124:       observation.activity,
  125:       applicationKey(
  126:         observation
```

### lib\chernobog\desktop\desktopEvents.ts line 124

```text
  121:       "desktop.observed",
  122:       observation.nodeId,
  123:       observation.presence,
> 124:       observation.activity,
  125:       applicationKey(
  126:         observation
  127:       ),
```

### lib\chernobog\desktop\desktopEvents.ts line 126

```text
  123:       observation.presence,
  124:       observation.activity,
  125:       applicationKey(
> 126:         observation
  127:       ),
  128:       workspaceKey(
  129:         observation
```

### lib\chernobog\desktop\desktopEvents.ts line 129

```text
  126:         observation
  127:       ),
  128:       workspaceKey(
> 129:         observation
  130:       ),
  131:       observation.screen?.status ??
  132:         "no-screen-state",
```

### lib\chernobog\desktop\desktopEvents.ts line 131

```text
  128:       workspaceKey(
  129:         observation
  130:       ),
> 131:       observation.screen?.status ??
  132:         "no-screen-state",
  133:     ].join(":"),
  134: 
```

### lib\chernobog\desktop\desktopEvents.ts line 137

```text
  134: 
  135:     metadata: {
  136:       tags: [
> 137:         "desktop",
  138:         "observation",
  139:       ],
  140:     },
```

### lib\chernobog\desktop\desktopEvents.ts line 138

```text
  135:     metadata: {
  136:       tags: [
  137:         "desktop",
> 138:         "observation",
  139:       ],
  140:     },
  141:   });
```

### lib\chernobog\desktop\desktopEvents.ts line 147

```text
  144:    * USER PRESENCE
  145:    */
  146:   if (
> 147:     observation.presence ===
  148:     "present"
  149:   ) {
  150:     await publishChernobogEventSafely({
```

### lib\chernobog\desktop\desktopEvents.ts line 150

```text
  147:     observation.presence ===
  148:     "present"
  149:   ) {
> 150:     await publishChernobogEventSafely({
  151:       type:
  152:         "desktop.user_present",
  153: 
```

### lib\chernobog\desktop\desktopEvents.ts line 152

```text
  149:   ) {
  150:     await publishChernobogEventSafely({
  151:       type:
> 152:         "desktop.user_present",
  153: 
  154:       source: {
  155:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 156

```text
  153: 
  154:       source: {
  155:         subsystem:
> 156:           "desktop-observation",
  157: 
  158:         nodeId:
  159:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 159

```text
  156:           "desktop-observation",
  157: 
  158:         nodeId:
> 159:           observation.nodeId,
  160:       },
  161: 
  162:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 166

```text
  163:         "info",
  164: 
  165:       subject:
> 166:         observation.nodeId,
  167: 
  168:       scope:
  169:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 169

```text
  166:         observation.nodeId,
  167: 
  168:       scope:
> 169:         `node:${observation.nodeId}`,
  170: 
  171:       payload: {
  172:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 173

```text
  170: 
  171:       payload: {
  172:         nodeId:
> 173:           observation.nodeId,
  174: 
  175:         presence:
  176:           observation.presence,
```

### lib\chernobog\desktop\desktopEvents.ts line 176

```text
  173:           observation.nodeId,
  174: 
  175:         presence:
> 176:           observation.presence,
  177: 
  178:         observedAt:
  179:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 178

```text
  175:         presence:
  176:           observation.presence,
  177: 
> 178:         observedAt:
  179:           observation.observedAt,
  180:       },
  181: 
```

### lib\chernobog\desktop\desktopEvents.ts line 179

```text
  176:           observation.presence,
  177: 
  178:         observedAt:
> 179:           observation.observedAt,
  180:       },
  181: 
  182:       dedupeKey:
```

### lib\chernobog\desktop\desktopEvents.ts line 183

```text
  180:       },
  181: 
  182:       dedupeKey:
> 183:         `desktop.user_present:${observation.nodeId}`,
  184: 
  185:       metadata: {
  186:         tags: [
```

### lib\chernobog\desktop\desktopEvents.ts line 187

```text
  184: 
  185:       metadata: {
  186:         tags: [
> 187:           "desktop",
  188:           "presence",
  189:           "present",
  190:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 196

```text
  193:   }
  194: 
  195:   if (
> 196:     observation.presence ===
  197:     "absent"
  198:   ) {
  199:     await publishChernobogEventSafely({
```

### lib\chernobog\desktop\desktopEvents.ts line 199

```text
  196:     observation.presence ===
  197:     "absent"
  198:   ) {
> 199:     await publishChernobogEventSafely({
  200:       type:
  201:         "desktop.user_absent",
  202: 
```

### lib\chernobog\desktop\desktopEvents.ts line 201

```text
  198:   ) {
  199:     await publishChernobogEventSafely({
  200:       type:
> 201:         "desktop.user_absent",
  202: 
  203:       source: {
  204:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 205

```text
  202: 
  203:       source: {
  204:         subsystem:
> 205:           "desktop-observation",
  206: 
  207:         nodeId:
  208:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 208

```text
  205:           "desktop-observation",
  206: 
  207:         nodeId:
> 208:           observation.nodeId,
  209:       },
  210: 
  211:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 215

```text
  212:         "info",
  213: 
  214:       subject:
> 215:         observation.nodeId,
  216: 
  217:       scope:
  218:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 218

```text
  215:         observation.nodeId,
  216: 
  217:       scope:
> 218:         `node:${observation.nodeId}`,
  219: 
  220:       payload: {
  221:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 222

```text
  219: 
  220:       payload: {
  221:         nodeId:
> 222:           observation.nodeId,
  223: 
  224:         presence:
  225:           observation.presence,
```

### lib\chernobog\desktop\desktopEvents.ts line 225

```text
  222:           observation.nodeId,
  223: 
  224:         presence:
> 225:           observation.presence,
  226: 
  227:         observedAt:
  228:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 227

```text
  224:         presence:
  225:           observation.presence,
  226: 
> 227:         observedAt:
  228:           observation.observedAt,
  229:       },
  230: 
```

### lib\chernobog\desktop\desktopEvents.ts line 228

```text
  225:           observation.presence,
  226: 
  227:         observedAt:
> 228:           observation.observedAt,
  229:       },
  230: 
  231:       dedupeKey:
```

### lib\chernobog\desktop\desktopEvents.ts line 232

```text
  229:       },
  230: 
  231:       dedupeKey:
> 232:         `desktop.user_absent:${observation.nodeId}`,
  233: 
  234:       metadata: {
  235:         tags: [
```

### lib\chernobog\desktop\desktopEvents.ts line 236

```text
  233: 
  234:       metadata: {
  235:         tags: [
> 236:           "desktop",
  237:           "presence",
  238:           "absent",
  239:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 248

```text
  245:    * USER ACTIVITY
  246:    */
  247:   const activityType =
> 248:     observation.activity === "active"
  249:       ? "desktop.user_active"
  250:       : observation.activity === "idle"
  251:         ? "desktop.user_idle"
```

### lib\chernobog\desktop\desktopEvents.ts line 249

```text
  246:    */
  247:   const activityType =
  248:     observation.activity === "active"
> 249:       ? "desktop.user_active"
  250:       : observation.activity === "idle"
  251:         ? "desktop.user_idle"
  252:         : observation.activity === "locked"
```

### lib\chernobog\desktop\desktopEvents.ts line 250

```text
  247:   const activityType =
  248:     observation.activity === "active"
  249:       ? "desktop.user_active"
> 250:       : observation.activity === "idle"
  251:         ? "desktop.user_idle"
  252:         : observation.activity === "locked"
  253:           ? "desktop.session_locked"
```

### lib\chernobog\desktop\desktopEvents.ts line 251

```text
  248:     observation.activity === "active"
  249:       ? "desktop.user_active"
  250:       : observation.activity === "idle"
> 251:         ? "desktop.user_idle"
  252:         : observation.activity === "locked"
  253:           ? "desktop.session_locked"
  254:           : undefined;
```

### lib\chernobog\desktop\desktopEvents.ts line 252

```text
  249:       ? "desktop.user_active"
  250:       : observation.activity === "idle"
  251:         ? "desktop.user_idle"
> 252:         : observation.activity === "locked"
  253:           ? "desktop.session_locked"
  254:           : undefined;
  255: 
```

### lib\chernobog\desktop\desktopEvents.ts line 253

```text
  250:       : observation.activity === "idle"
  251:         ? "desktop.user_idle"
  252:         : observation.activity === "locked"
> 253:           ? "desktop.session_locked"
  254:           : undefined;
  255: 
  256:   if (activityType) {
```

### lib\chernobog\desktop\desktopEvents.ts line 257

```text
  254:           : undefined;
  255: 
  256:   if (activityType) {
> 257:     await publishChernobogEventSafely({
  258:       type:
  259:         activityType,
  260: 
```

### lib\chernobog\desktop\desktopEvents.ts line 263

```text
  260: 
  261:       source: {
  262:         subsystem:
> 263:           "desktop-observation",
  264: 
  265:         nodeId:
  266:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 266

```text
  263:           "desktop-observation",
  264: 
  265:         nodeId:
> 266:           observation.nodeId,
  267:       },
  268: 
  269:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 270

```text
  267:       },
  268: 
  269:       severity:
> 270:         observation.activity ===
  271:         "locked"
  272:           ? "notice"
  273:           : "info",
```

### lib\chernobog\desktop\desktopEvents.ts line 276

```text
  273:           : "info",
  274: 
  275:       subject:
> 276:         observation.nodeId,
  277: 
  278:       scope:
  279:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 279

```text
  276:         observation.nodeId,
  277: 
  278:       scope:
> 279:         `node:${observation.nodeId}`,
  280: 
  281:       payload: {
  282:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 283

```text
  280: 
  281:       payload: {
  282:         nodeId:
> 283:           observation.nodeId,
  284: 
  285:         activity:
  286:           observation.activity,
```

### lib\chernobog\desktop\desktopEvents.ts line 286

```text
  283:           observation.nodeId,
  284: 
  285:         activity:
> 286:           observation.activity,
  287: 
  288:         idleSeconds:
  289:           observation.idleSeconds,
```

### lib\chernobog\desktop\desktopEvents.ts line 289

```text
  286:           observation.activity,
  287: 
  288:         idleSeconds:
> 289:           observation.idleSeconds,
  290: 
  291:         observedAt:
  292:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 291

```text
  288:         idleSeconds:
  289:           observation.idleSeconds,
  290: 
> 291:         observedAt:
  292:           observation.observedAt,
  293:       },
  294: 
```

### lib\chernobog\desktop\desktopEvents.ts line 292

```text
  289:           observation.idleSeconds,
  290: 
  291:         observedAt:
> 292:           observation.observedAt,
  293:       },
  294: 
  295:       dedupeKey:
```

### lib\chernobog\desktop\desktopEvents.ts line 296

```text
  293:       },
  294: 
  295:       dedupeKey:
> 296:         `${activityType}:${observation.nodeId}`,
  297: 
  298:       metadata: {
  299:         tags: [
```

### lib\chernobog\desktop\desktopEvents.ts line 300

```text
  297: 
  298:       metadata: {
  299:         tags: [
> 300:           "desktop",
  301:           "activity",
  302:           observation.activity,
  303:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 302

```text
  299:         tags: [
  300:           "desktop",
  301:           "activity",
> 302:           observation.activity,
  303:         ],
  304:       },
  305:     });
```

### lib\chernobog\desktop\desktopEvents.ts line 312

```text
  309:    * SCREEN CAPABILITY
  310:    */
  311:   if (
> 312:     observation.screen?.status ===
  313:     "available"
  314:   ) {
  315:     await publishChernobogEventSafely({
```

### lib\chernobog\desktop\desktopEvents.ts line 315

```text
  312:     observation.screen?.status ===
  313:     "available"
  314:   ) {
> 315:     await publishChernobogEventSafely({
  316:       type:
  317:         "desktop.screen_available",
  318: 
```

### lib\chernobog\desktop\desktopEvents.ts line 317

```text
  314:   ) {
  315:     await publishChernobogEventSafely({
  316:       type:
> 317:         "desktop.screen_available",
  318: 
  319:       source: {
  320:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 321

```text
  318: 
  319:       source: {
  320:         subsystem:
> 321:           "desktop-observation",
  322: 
  323:         nodeId:
  324:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 324

```text
  321:           "desktop-observation",
  322: 
  323:         nodeId:
> 324:           observation.nodeId,
  325:       },
  326: 
  327:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 331

```text
  328:         "info",
  329: 
  330:       subject:
> 331:         observation.nodeId,
  332: 
  333:       scope:
  334:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 334

```text
  331:         observation.nodeId,
  332: 
  333:       scope:
> 334:         `node:${observation.nodeId}`,
  335: 
  336:       payload: {
  337:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 338

```text
  335: 
  336:       payload: {
  337:         nodeId:
> 338:           observation.nodeId,
  339: 
  340:         status:
  341:           observation.screen.status,
```

### lib\chernobog\desktop\desktopEvents.ts line 341

```text
  338:           observation.nodeId,
  339: 
  340:         status:
> 341:           observation.screen.status,
  342: 
  343:         monitorCount:
  344:           observation.screen.monitorCount,
```

### lib\chernobog\desktop\desktopEvents.ts line 344

```text
  341:           observation.screen.status,
  342: 
  343:         monitorCount:
> 344:           observation.screen.monitorCount,
  345: 
  346:         observedAt:
  347:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 346

```text
  343:         monitorCount:
  344:           observation.screen.monitorCount,
  345: 
> 346:         observedAt:
  347:           observation.observedAt,
  348:       },
  349: 
```

### lib\chernobog\desktop\desktopEvents.ts line 347

```text
  344:           observation.screen.monitorCount,
  345: 
  346:         observedAt:
> 347:           observation.observedAt,
  348:       },
  349: 
  350:       dedupeKey:
```

### lib\chernobog\desktop\desktopEvents.ts line 351

```text
  348:       },
  349: 
  350:       dedupeKey:
> 351:         `desktop.screen_available:${observation.nodeId}:${observation.screen.monitorCount ?? "unknown"}`,
  352: 
  353:       metadata: {
  354:         tags: [
```

### lib\chernobog\desktop\desktopEvents.ts line 355

```text
  352: 
  353:       metadata: {
  354:         tags: [
> 355:           "desktop",
  356:           "screen",
  357:           "available",
  358:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 364

```text
  361:   }
  362: 
  363:   if (
> 364:     observation.screen?.status ===
  365:     "unavailable"
  366:   ) {
  367:     await publishChernobogEventSafely({
```

### lib\chernobog\desktop\desktopEvents.ts line 367

```text
  364:     observation.screen?.status ===
  365:     "unavailable"
  366:   ) {
> 367:     await publishChernobogEventSafely({
  368:       type:
  369:         "desktop.screen_unavailable",
  370: 
```

### lib\chernobog\desktop\desktopEvents.ts line 369

```text
  366:   ) {
  367:     await publishChernobogEventSafely({
  368:       type:
> 369:         "desktop.screen_unavailable",
  370: 
  371:       source: {
  372:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 373

```text
  370: 
  371:       source: {
  372:         subsystem:
> 373:           "desktop-observation",
  374: 
  375:         nodeId:
  376:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 376

```text
  373:           "desktop-observation",
  374: 
  375:         nodeId:
> 376:           observation.nodeId,
  377:       },
  378: 
  379:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 383

```text
  380:         "warning",
  381: 
  382:       subject:
> 383:         observation.nodeId,
  384: 
  385:       scope:
  386:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 386

```text
  383:         observation.nodeId,
  384: 
  385:       scope:
> 386:         `node:${observation.nodeId}`,
  387: 
  388:       payload: {
  389:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 390

```text
  387: 
  388:       payload: {
  389:         nodeId:
> 390:           observation.nodeId,
  391: 
  392:         status:
  393:           observation.screen.status,
```

### lib\chernobog\desktop\desktopEvents.ts line 393

```text
  390:           observation.nodeId,
  391: 
  392:         status:
> 393:           observation.screen.status,
  394: 
  395:         observedAt:
  396:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 395

```text
  392:         status:
  393:           observation.screen.status,
  394: 
> 395:         observedAt:
  396:           observation.observedAt,
  397:       },
  398: 
```

### lib\chernobog\desktop\desktopEvents.ts line 396

```text
  393:           observation.screen.status,
  394: 
  395:         observedAt:
> 396:           observation.observedAt,
  397:       },
  398: 
  399:       dedupeKey:
```

### lib\chernobog\desktop\desktopEvents.ts line 400

```text
  397:       },
  398: 
  399:       dedupeKey:
> 400:         `desktop.screen_unavailable:${observation.nodeId}`,
  401: 
  402:       metadata: {
  403:         tags: [
```

### lib\chernobog\desktop\desktopEvents.ts line 404

```text
  401: 
  402:       metadata: {
  403:         tags: [
> 404:           "desktop",
  405:           "screen",
  406:           "unavailable",
  407:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 417

```text
  414:    * transitions rather than generic
  415:    * current-state announcements.
  416:    *
> 417:    * The first desktop observation is enough
  418:    * to establish initial state through
  419:    * desktop.observed.
  420:    */
```

### lib\chernobog\desktop\desktopEvents.ts line 419

```text
  416:    *
  417:    * The first desktop observation is enough
  418:    * to establish initial state through
> 419:    * desktop.observed.
  420:    */
  421:   if (
  422:     previous &&
```

### lib\chernobog\desktop\desktopEvents.ts line 424

```text
  421:   if (
  422:     previous &&
  423:     applicationKey(previous) !==
> 424:       applicationKey(observation)
  425:   ) {
  426:     await publishChernobogEventSafely({
  427:       type:
```

### lib\chernobog\desktop\desktopEvents.ts line 426

```text
  423:     applicationKey(previous) !==
  424:       applicationKey(observation)
  425:   ) {
> 426:     await publishChernobogEventSafely({
  427:       type:
  428:         "desktop.application_changed",
  429: 
```

### lib\chernobog\desktop\desktopEvents.ts line 428

```text
  425:   ) {
  426:     await publishChernobogEventSafely({
  427:       type:
> 428:         "desktop.application_changed",
  429: 
  430:       source: {
  431:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 432

```text
  429: 
  430:       source: {
  431:         subsystem:
> 432:           "desktop-observation",
  433: 
  434:         nodeId:
  435:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 435

```text
  432:           "desktop-observation",
  433: 
  434:         nodeId:
> 435:           observation.nodeId,
  436:       },
  437: 
  438:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 442

```text
  439:         "info",
  440: 
  441:       subject:
> 442:         observation.nodeId,
  443: 
  444:       scope:
  445:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 445

```text
  442:         observation.nodeId,
  443: 
  444:       scope:
> 445:         `node:${observation.nodeId}`,
  446: 
  447:       payload: {
  448:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 449

```text
  446: 
  447:       payload: {
  448:         nodeId:
> 449:           observation.nodeId,
  450: 
  451:         previousApplication:
  452:           previous.foregroundApplication,
```

### lib\chernobog\desktop\desktopEvents.ts line 455

```text
  452:           previous.foregroundApplication,
  453: 
  454:         currentApplication:
> 455:           observation.foregroundApplication,
  456: 
  457:         observedAt:
  458:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 457

```text
  454:         currentApplication:
  455:           observation.foregroundApplication,
  456: 
> 457:         observedAt:
  458:           observation.observedAt,
  459:       },
  460: 
```

### lib\chernobog\desktop\desktopEvents.ts line 458

```text
  455:           observation.foregroundApplication,
  456: 
  457:         observedAt:
> 458:           observation.observedAt,
  459:       },
  460: 
  461:       dedupeKey: [
```

### lib\chernobog\desktop\desktopEvents.ts line 462

```text
  459:       },
  460: 
  461:       dedupeKey: [
> 462:         "desktop.application_changed",
  463:         observation.nodeId,
  464:         applicationKey(previous),
  465:         applicationKey(observation),
```

### lib\chernobog\desktop\desktopEvents.ts line 463

```text
  460: 
  461:       dedupeKey: [
  462:         "desktop.application_changed",
> 463:         observation.nodeId,
  464:         applicationKey(previous),
  465:         applicationKey(observation),
  466:       ].join(":"),
```

### lib\chernobog\desktop\desktopEvents.ts line 465

```text
  462:         "desktop.application_changed",
  463:         observation.nodeId,
  464:         applicationKey(previous),
> 465:         applicationKey(observation),
  466:       ].join(":"),
  467: 
  468:       metadata: {
```

### lib\chernobog\desktop\desktopEvents.ts line 470

```text
  467: 
  468:       metadata: {
  469:         tags: [
> 470:           "desktop",
  471:           "application",
  472:           "changed",
  473:         ],
```

### lib\chernobog\desktop\desktopEvents.ts line 481

```text
  478:   if (
  479:     previous &&
  480:     workspaceKey(previous) !==
> 481:       workspaceKey(observation)
  482:   ) {
  483:     await publishChernobogEventSafely({
  484:       type:
```

### lib\chernobog\desktop\desktopEvents.ts line 483

```text
  480:     workspaceKey(previous) !==
  481:       workspaceKey(observation)
  482:   ) {
> 483:     await publishChernobogEventSafely({
  484:       type:
  485:         "desktop.workspace_changed",
  486: 
```

### lib\chernobog\desktop\desktopEvents.ts line 485

```text
  482:   ) {
  483:     await publishChernobogEventSafely({
  484:       type:
> 485:         "desktop.workspace_changed",
  486: 
  487:       source: {
  488:         subsystem:
```

### lib\chernobog\desktop\desktopEvents.ts line 489

```text
  486: 
  487:       source: {
  488:         subsystem:
> 489:           "desktop-observation",
  490: 
  491:         nodeId:
  492:           observation.nodeId,
```

### lib\chernobog\desktop\desktopEvents.ts line 492

```text
  489:           "desktop-observation",
  490: 
  491:         nodeId:
> 492:           observation.nodeId,
  493:       },
  494: 
  495:       severity:
```

### lib\chernobog\desktop\desktopEvents.ts line 499

```text
  496:         "info",
  497: 
  498:       subject:
> 499:         observation.nodeId,
  500: 
  501:       scope:
  502:         `node:${observation.nodeId}`,
```

### lib\chernobog\desktop\desktopEvents.ts line 502

```text
  499:         observation.nodeId,
  500: 
  501:       scope:
> 502:         `node:${observation.nodeId}`,
  503: 
  504:       payload: {
  505:         nodeId:
```

### lib\chernobog\desktop\desktopEvents.ts line 506

```text
  503: 
  504:       payload: {
  505:         nodeId:
> 506:           observation.nodeId,
  507: 
  508:         previousWorkspace:
  509:           previous.workspace,
```

### lib\chernobog\desktop\desktopEvents.ts line 512

```text
  509:           previous.workspace,
  510: 
  511:         currentWorkspace:
> 512:           observation.workspace,
  513: 
  514:         observedAt:
  515:           observation.observedAt,
```

### lib\chernobog\desktop\desktopEvents.ts line 514

```text
  511:         currentWorkspace:
  512:           observation.workspace,
  513: 
> 514:         observedAt:
  515:           observation.observedAt,
  516:       },
  517: 
```

### lib\chernobog\desktop\desktopEvents.ts line 515

```text
  512:           observation.workspace,
  513: 
  514:         observedAt:
> 515:           observation.observedAt,
  516:       },
  517: 
  518:       dedupeKey: [
```

### lib\chernobog\desktop\desktopEvents.ts line 519

```text
  516:       },
  517: 
  518:       dedupeKey: [
> 519:         "desktop.workspace_changed",
  520:         observation.nodeId,
  521:         workspaceKey(previous),
  522:         workspaceKey(observation),
```

### lib\chernobog\desktop\desktopEvents.ts line 520

```text
  517: 
  518:       dedupeKey: [
  519:         "desktop.workspace_changed",
> 520:         observation.nodeId,
  521:         workspaceKey(previous),
  522:         workspaceKey(observation),
  523:       ].join(":"),
```

### lib\chernobog\desktop\desktopEvents.ts line 522

```text
  519:         "desktop.workspace_changed",
  520:         observation.nodeId,
  521:         workspaceKey(previous),
> 522:         workspaceKey(observation),
  523:       ].join(":"),
  524: 
  525:       metadata: {
```

### lib\chernobog\desktop\desktopEvents.ts line 527

```text
  524: 
  525:       metadata: {
  526:         tags: [
> 527:           "desktop",
  528:           "workspace",
  529:           "changed",
  530:         ],
```

### lib\chernobog\desktop\desktopObservation.ts line 1

```text
>   1: export const CHERNOBOG_DESKTOP_PRESENCE_STATES = [
    2:     "present",
    3:     "absent",
    4:     "unknown",
```

### lib\chernobog\desktop\desktopObservation.ts line 7

```text
    4:     "unknown",
    5:   ] as const;
    6:   
>   7:   export type ChernobogDesktopPresenceState =
    8:     (typeof CHERNOBOG_DESKTOP_PRESENCE_STATES)[number];
    9:   
   10:   export const CHERNOBOG_DESKTOP_ACTIVITY_STATES = [
```

### lib\chernobog\desktop\desktopObservation.ts line 8

```text
    5:   ] as const;
    6:   
    7:   export type ChernobogDesktopPresenceState =
>   8:     (typeof CHERNOBOG_DESKTOP_PRESENCE_STATES)[number];
    9:   
   10:   export const CHERNOBOG_DESKTOP_ACTIVITY_STATES = [
   11:     "active",
```

### lib\chernobog\desktop\desktopObservation.ts line 10

```text
    7:   export type ChernobogDesktopPresenceState =
    8:     (typeof CHERNOBOG_DESKTOP_PRESENCE_STATES)[number];
    9:   
>  10:   export const CHERNOBOG_DESKTOP_ACTIVITY_STATES = [
   11:     "active",
   12:     "idle",
   13:     "locked",
```

### lib\chernobog\desktop\desktopObservation.ts line 17

```text
   14:     "unknown",
   15:   ] as const;
   16:   
>  17:   export type ChernobogDesktopActivityState =
   18:     (typeof CHERNOBOG_DESKTOP_ACTIVITY_STATES)[number];
   19:   
   20:   export const CHERNOBOG_SCREEN_STATES = [
```

### lib\chernobog\desktop\desktopObservation.ts line 18

```text
   15:   ] as const;
   16:   
   17:   export type ChernobogDesktopActivityState =
>  18:     (typeof CHERNOBOG_DESKTOP_ACTIVITY_STATES)[number];
   19:   
   20:   export const CHERNOBOG_SCREEN_STATES = [
   21:     "available",
```

### lib\chernobog\desktop\desktopObservation.ts line 29

```text
   26:   export type ChernobogScreenState =
   27:     (typeof CHERNOBOG_SCREEN_STATES)[number];
   28:   
>  29:   export interface ChernobogDesktopApplicationState {
   30:     id?: string;
   31:   
   32:     name?: string;
```

### lib\chernobog\desktop\desktopObservation.ts line 35

```text
   32:     name?: string;
   33:   }
   34:   
>  35:   export interface ChernobogDesktopWorkspaceState {
   36:     id?: string;
   37:   
   38:     projectId?: string;
```

### lib\chernobog\desktop\desktopObservation.ts line 38

```text
   35:   export interface ChernobogDesktopWorkspaceState {
   36:     id?: string;
   37:   
>  38:     projectId?: string;
   39:   
   40:     kind?:
   41:       | "project"
```

### lib\chernobog\desktop\desktopObservation.ts line 41

```text
   38:     projectId?: string;
   39:   
   40:     kind?:
>  41:       | "project"
   42:       | "folder"
   43:       | "application"
   44:       | "unknown";
```

### lib\chernobog\desktop\desktopObservation.ts line 47

```text
   44:       | "unknown";
   45:   }
   46:   
>  47:   export interface ChernobogDesktopScreenState {
   48:     status: ChernobogScreenState;
   49:   
   50:     monitorCount?: number;
```

### lib\chernobog\desktop\desktopObservation.ts line 53

```text
   50:     monitorCount?: number;
   51:   }
   52:   
>  53:   export interface ChernobogDesktopObservation {
   54:     nodeId: string;
   55:   
   56:     observedAt: string;
```

### lib\chernobog\desktop\desktopObservation.ts line 56

```text
   53:   export interface ChernobogDesktopObservation {
   54:     nodeId: string;
   55:   
>  56:     observedAt: string;
   57:   
   58:     platform?: string;
   59:   
```

### lib\chernobog\desktop\desktopObservation.ts line 61

```text
   58:     platform?: string;
   59:   
   60:     presence:
>  61:       ChernobogDesktopPresenceState;
   62:   
   63:     activity:
   64:       ChernobogDesktopActivityState;
```

### lib\chernobog\desktop\desktopObservation.ts line 64

```text
   61:       ChernobogDesktopPresenceState;
   62:   
   63:     activity:
>  64:       ChernobogDesktopActivityState;
   65:   
   66:     idleSeconds?: number;
   67:   
```

### lib\chernobog\desktop\desktopObservation.ts line 69

```text
   66:     idleSeconds?: number;
   67:   
   68:     foregroundApplication?:
>  69:       ChernobogDesktopApplicationState;
   70:   
   71:     workspace?:
   72:       ChernobogDesktopWorkspaceState;
```

### lib\chernobog\desktop\desktopObservation.ts line 72

```text
   69:       ChernobogDesktopApplicationState;
   70:   
   71:     workspace?:
>  72:       ChernobogDesktopWorkspaceState;
   73:   
   74:     screen?:
   75:       ChernobogDesktopScreenState;
```

### lib\chernobog\desktop\desktopObservation.ts line 75

```text
   72:       ChernobogDesktopWorkspaceState;
   73:   
   74:     screen?:
>  75:       ChernobogDesktopScreenState;
   76:   
   77:     message?: string;
   78:   
```

### lib\chernobog\desktop\desktopObservation.ts line 85

```text
   82:     >;
   83:   }
   84:   
>  85:   export function createDesktopObservation(
   86:     input: Omit<
   87:       ChernobogDesktopObservation,
   88:       "observedAt"
```

### lib\chernobog\desktop\desktopObservation.ts line 87

```text
   84:   
   85:   export function createDesktopObservation(
   86:     input: Omit<
>  87:       ChernobogDesktopObservation,
   88:       "observedAt"
   89:     > & {
   90:       observedAt?: string;
```

### lib\chernobog\desktop\desktopObservation.ts line 88

```text
   85:   export function createDesktopObservation(
   86:     input: Omit<
   87:       ChernobogDesktopObservation,
>  88:       "observedAt"
   89:     > & {
   90:       observedAt?: string;
   91:     }
```

### lib\chernobog\desktop\desktopObservation.ts line 90

```text
   87:       ChernobogDesktopObservation,
   88:       "observedAt"
   89:     > & {
>  90:       observedAt?: string;
   91:     }
   92:   ): ChernobogDesktopObservation {
   93:     return {
```

### lib\chernobog\desktop\desktopObservation.ts line 92

```text
   89:     > & {
   90:       observedAt?: string;
   91:     }
>  92:   ): ChernobogDesktopObservation {
   93:     return {
   94:       ...input,
   95:   
```

### lib\chernobog\desktop\desktopObservation.ts line 96

```text
   93:     return {
   94:       ...input,
   95:   
>  96:       observedAt:
   97:         input.observedAt ??
   98:         new Date().toISOString(),
   99:     };
```

### lib\chernobog\desktop\desktopObservation.ts line 97

```text
   94:       ...input,
   95:   
   96:       observedAt:
>  97:         input.observedAt ??
   98:         new Date().toISOString(),
   99:     };
  100:   }
```

### lib\chernobog\desktop\desktopReporter.ts line 2

```text
    1: import type {
>   2:     ChernobogDesktopActivityState,
    3:     ChernobogDesktopApplicationState,
    4:     ChernobogDesktopObservation,
    5:     ChernobogDesktopPresenceState,
```

### lib\chernobog\desktop\desktopReporter.ts line 3

```text
    1: import type {
    2:     ChernobogDesktopActivityState,
>   3:     ChernobogDesktopApplicationState,
    4:     ChernobogDesktopObservation,
    5:     ChernobogDesktopPresenceState,
    6:     ChernobogDesktopScreenState,
```

### lib\chernobog\desktop\desktopReporter.ts line 4

```text
    1: import type {
    2:     ChernobogDesktopActivityState,
    3:     ChernobogDesktopApplicationState,
>   4:     ChernobogDesktopObservation,
    5:     ChernobogDesktopPresenceState,
    6:     ChernobogDesktopScreenState,
    7:     ChernobogDesktopWorkspaceState,
```

### lib\chernobog\desktop\desktopReporter.ts line 5

```text
    2:     ChernobogDesktopActivityState,
    3:     ChernobogDesktopApplicationState,
    4:     ChernobogDesktopObservation,
>   5:     ChernobogDesktopPresenceState,
    6:     ChernobogDesktopScreenState,
    7:     ChernobogDesktopWorkspaceState,
    8:   } from "./desktopObservation";
```

### lib\chernobog\desktop\desktopReporter.ts line 6

```text
    3:     ChernobogDesktopApplicationState,
    4:     ChernobogDesktopObservation,
    5:     ChernobogDesktopPresenceState,
>   6:     ChernobogDesktopScreenState,
    7:     ChernobogDesktopWorkspaceState,
    8:   } from "./desktopObservation";
    9:   
```

### lib\chernobog\desktop\desktopReporter.ts line 7

```text
    4:     ChernobogDesktopObservation,
    5:     ChernobogDesktopPresenceState,
    6:     ChernobogDesktopScreenState,
>   7:     ChernobogDesktopWorkspaceState,
    8:   } from "./desktopObservation";
    9:   
   10:   import {
```

### lib\chernobog\desktop\desktopReporter.ts line 8

```text
    5:     ChernobogDesktopPresenceState,
    6:     ChernobogDesktopScreenState,
    7:     ChernobogDesktopWorkspaceState,
>   8:   } from "./desktopObservation";
    9:   
   10:   import {
   11:     createDesktopObservation,
```

### lib\chernobog\desktop\desktopReporter.ts line 11

```text
    8:   } from "./desktopObservation";
    9:   
   10:   import {
>  11:     createDesktopObservation,
   12:   } from "./desktopObservation";
   13:   
   14:   import {
```

### lib\chernobog\desktop\desktopReporter.ts line 12

```text
    9:   
   10:   import {
   11:     createDesktopObservation,
>  12:   } from "./desktopObservation";
   13:   
   14:   import {
   15:     publishDesktopObservation,
```

### lib\chernobog\desktop\desktopReporter.ts line 15

```text
   12:   } from "./desktopObservation";
   13:   
   14:   import {
>  15:     publishDesktopObservation,
   16:   } from "./desktopEvents";
   17:   
   18:   export interface DesktopStateReport {
```

### lib\chernobog\desktop\desktopReporter.ts line 16

```text
   13:   
   14:   import {
   15:     publishDesktopObservation,
>  16:   } from "./desktopEvents";
   17:   
   18:   export interface DesktopStateReport {
   19:     nodeId: string;
```

### lib\chernobog\desktop\desktopReporter.ts line 18

```text
   15:     publishDesktopObservation,
   16:   } from "./desktopEvents";
   17:   
>  18:   export interface DesktopStateReport {
   19:     nodeId: string;
   20:   
   21:     platform?: string;
```

### lib\chernobog\desktop\desktopReporter.ts line 24

```text
   21:     platform?: string;
   22:   
   23:     presence:
>  24:       ChernobogDesktopPresenceState;
   25:   
   26:     activity:
   27:       ChernobogDesktopActivityState;
```

### lib\chernobog\desktop\desktopReporter.ts line 27

```text
   24:       ChernobogDesktopPresenceState;
   25:   
   26:     activity:
>  27:       ChernobogDesktopActivityState;
   28:   
   29:     idleSeconds?: number;
   30:   
```

### lib\chernobog\desktop\desktopReporter.ts line 32

```text
   29:     idleSeconds?: number;
   30:   
   31:     foregroundApplication?:
>  32:       ChernobogDesktopApplicationState;
   33:   
   34:     workspace?:
   35:       ChernobogDesktopWorkspaceState;
```

### lib\chernobog\desktop\desktopReporter.ts line 35

```text
   32:       ChernobogDesktopApplicationState;
   33:   
   34:     workspace?:
>  35:       ChernobogDesktopWorkspaceState;
   36:   
   37:     screen?:
   38:       ChernobogDesktopScreenState;
```

### lib\chernobog\desktop\desktopReporter.ts line 38

```text
   35:       ChernobogDesktopWorkspaceState;
   36:   
   37:     screen?:
>  38:       ChernobogDesktopScreenState;
   39:   
   40:     message?: string;
   41:   
```

### lib\chernobog\desktop\desktopReporter.ts line 47

```text
   44:       string | number | boolean | null
   45:     >;
   46:   
>  47:     observedAt?: string;
   48:   }
   49:   
   50:   export interface ReportDesktopStateOptions {
```

### lib\chernobog\desktop\desktopReporter.ts line 50

```text
   47:     observedAt?: string;
   48:   }
   49:   
>  50:   export interface ReportDesktopStateOptions {
   51:     previousObservation?:
   52:       ChernobogDesktopObservation;
   53:   
```

### lib\chernobog\desktop\desktopReporter.ts line 51

```text
   48:   }
   49:   
   50:   export interface ReportDesktopStateOptions {
>  51:     previousObservation?:
   52:       ChernobogDesktopObservation;
   53:   
   54:     rememberObservation?: boolean;
```

### lib\chernobog\desktop\desktopReporter.ts line 52

```text
   49:   
   50:   export interface ReportDesktopStateOptions {
   51:     previousObservation?:
>  52:       ChernobogDesktopObservation;
   53:   
   54:     rememberObservation?: boolean;
   55:   }
```

### lib\chernobog\desktop\desktopReporter.ts line 54

```text
   51:     previousObservation?:
   52:       ChernobogDesktopObservation;
   53:   
>  54:     rememberObservation?: boolean;
   55:   }
   56:   
   57:   const lastObservationByNode =
```

### lib\chernobog\desktop\desktopReporter.ts line 57

```text
   54:     rememberObservation?: boolean;
   55:   }
   56:   
>  57:   const lastObservationByNode =
   58:     new Map<
   59:       string,
   60:       ChernobogDesktopObservation
```

### lib\chernobog\desktop\desktopReporter.ts line 60

```text
   57:   const lastObservationByNode =
   58:     new Map<
   59:       string,
>  60:       ChernobogDesktopObservation
   61:     >();
   62:   
   63:   function cloneObservation(
```

### lib\chernobog\desktop\desktopReporter.ts line 63

```text
   60:       ChernobogDesktopObservation
   61:     >();
   62:   
>  63:   function cloneObservation(
   64:     observation:
   65:       ChernobogDesktopObservation
   66:   ): ChernobogDesktopObservation {
```

### lib\chernobog\desktop\desktopReporter.ts line 64

```text
   61:     >();
   62:   
   63:   function cloneObservation(
>  64:     observation:
   65:       ChernobogDesktopObservation
   66:   ): ChernobogDesktopObservation {
   67:     return {
```

### lib\chernobog\desktop\desktopReporter.ts line 65

```text
   62:   
   63:   function cloneObservation(
   64:     observation:
>  65:       ChernobogDesktopObservation
   66:   ): ChernobogDesktopObservation {
   67:     return {
   68:       ...observation,
```

### lib\chernobog\desktop\desktopReporter.ts line 66

```text
   63:   function cloneObservation(
   64:     observation:
   65:       ChernobogDesktopObservation
>  66:   ): ChernobogDesktopObservation {
   67:     return {
   68:       ...observation,
   69:   
```

### lib\chernobog\desktop\desktopReporter.ts line 68

```text
   65:       ChernobogDesktopObservation
   66:   ): ChernobogDesktopObservation {
   67:     return {
>  68:       ...observation,
   69:   
   70:       foregroundApplication:
   71:         observation
```

### lib\chernobog\desktop\desktopReporter.ts line 71

```text
   68:       ...observation,
   69:   
   70:       foregroundApplication:
>  71:         observation
   72:           .foregroundApplication
   73:           ? {
   74:               ...observation
```

### lib\chernobog\desktop\desktopReporter.ts line 74

```text
   71:         observation
   72:           .foregroundApplication
   73:           ? {
>  74:               ...observation
   75:                 .foregroundApplication,
   76:             }
   77:           : undefined,
```

### lib\chernobog\desktop\desktopReporter.ts line 80

```text
   77:           : undefined,
   78:   
   79:       workspace:
>  80:         observation.workspace
   81:           ? {
   82:               ...observation.workspace,
   83:             }
```

### lib\chernobog\desktop\desktopReporter.ts line 82

```text
   79:       workspace:
   80:         observation.workspace
   81:           ? {
>  82:               ...observation.workspace,
   83:             }
   84:           : undefined,
   85:   
```

### lib\chernobog\desktop\desktopReporter.ts line 87

```text
   84:           : undefined,
   85:   
   86:       screen:
>  87:         observation.screen
   88:           ? {
   89:               ...observation.screen,
   90:             }
```

### lib\chernobog\desktop\desktopReporter.ts line 89

```text
   86:       screen:
   87:         observation.screen
   88:           ? {
>  89:               ...observation.screen,
   90:             }
   91:           : undefined,
   92:   
```

### lib\chernobog\desktop\desktopReporter.ts line 94

```text
   91:           : undefined,
   92:   
   93:       metadata:
>  94:         observation.metadata
   95:           ? {
   96:               ...observation.metadata,
   97:             }
```

### lib\chernobog\desktop\desktopReporter.ts line 96

```text
   93:       metadata:
   94:         observation.metadata
   95:           ? {
>  96:               ...observation.metadata,
   97:             }
   98:           : undefined,
   99:     };
```

### lib\chernobog\desktop\desktopReporter.ts line 102

```text
   99:     };
  100:   }
  101:   
> 102:   export function getLastDesktopObservation(
  103:     nodeId: string
  104:   ):
  105:     | ChernobogDesktopObservation
```

### lib\chernobog\desktop\desktopReporter.ts line 105

```text
  102:   export function getLastDesktopObservation(
  103:     nodeId: string
  104:   ):
> 105:     | ChernobogDesktopObservation
  106:     | undefined {
  107:     const observation =
  108:       lastObservationByNode.get(
```

### lib\chernobog\desktop\desktopReporter.ts line 107

```text
  104:   ):
  105:     | ChernobogDesktopObservation
  106:     | undefined {
> 107:     const observation =
  108:       lastObservationByNode.get(
  109:         nodeId
  110:       );
```

### lib\chernobog\desktop\desktopReporter.ts line 108

```text
  105:     | ChernobogDesktopObservation
  106:     | undefined {
  107:     const observation =
> 108:       lastObservationByNode.get(
  109:         nodeId
  110:       );
  111:   
```

### lib\chernobog\desktop\desktopReporter.ts line 112

```text
  109:         nodeId
  110:       );
  111:   
> 112:     return observation
  113:       ? cloneObservation(
  114:           observation
  115:         )
```

### lib\chernobog\desktop\desktopReporter.ts line 113

```text
  110:       );
  111:   
  112:     return observation
> 113:       ? cloneObservation(
  114:           observation
  115:         )
  116:       : undefined;
```

### lib\chernobog\desktop\desktopReporter.ts line 114

```text
  111:   
  112:     return observation
  113:       ? cloneObservation(
> 114:           observation
  115:         )
  116:       : undefined;
  117:   }
```

### lib\chernobog\desktop\desktopReporter.ts line 119

```text
  116:       : undefined;
  117:   }
  118:   
> 119:   export function clearDesktopObservationState(
  120:     nodeId?: string
  121:   ): void {
  122:     if (nodeId) {
```

### lib\chernobog\desktop\desktopReporter.ts line 123

```text
  120:     nodeId?: string
  121:   ): void {
  122:     if (nodeId) {
> 123:       lastObservationByNode.delete(
  124:         nodeId
  125:       );
  126:   
```

### lib\chernobog\desktop\desktopReporter.ts line 130

```text
  127:       return;
  128:     }
  129:   
> 130:     lastObservationByNode.clear();
  131:   }
  132:   
  133:   export async function reportDesktopState(
```

### lib\chernobog\desktop\desktopReporter.ts line 133

```text
  130:     lastObservationByNode.clear();
  131:   }
  132:   
> 133:   export async function reportDesktopState(
  134:     report: DesktopStateReport,
  135:     options:
  136:       ReportDesktopStateOptions = {}
```

### lib\chernobog\desktop\desktopReporter.ts line 134

```text
  131:   }
  132:   
  133:   export async function reportDesktopState(
> 134:     report: DesktopStateReport,
  135:     options:
  136:       ReportDesktopStateOptions = {}
  137:   ): Promise<ChernobogDesktopObservation> {
```

### lib\chernobog\desktop\desktopReporter.ts line 136

```text
  133:   export async function reportDesktopState(
  134:     report: DesktopStateReport,
  135:     options:
> 136:       ReportDesktopStateOptions = {}
  137:   ): Promise<ChernobogDesktopObservation> {
  138:     const observation =
  139:       createDesktopObservation({
```

### lib\chernobog\desktop\desktopReporter.ts line 137

```text
  134:     report: DesktopStateReport,
  135:     options:
  136:       ReportDesktopStateOptions = {}
> 137:   ): Promise<ChernobogDesktopObservation> {
  138:     const observation =
  139:       createDesktopObservation({
  140:         nodeId:
```

### lib\chernobog\desktop\desktopReporter.ts line 138

```text
  135:     options:
  136:       ReportDesktopStateOptions = {}
  137:   ): Promise<ChernobogDesktopObservation> {
> 138:     const observation =
  139:       createDesktopObservation({
  140:         nodeId:
  141:           report.nodeId,
```

### lib\chernobog\desktop\desktopReporter.ts line 139

```text
  136:       ReportDesktopStateOptions = {}
  137:   ): Promise<ChernobogDesktopObservation> {
  138:     const observation =
> 139:       createDesktopObservation({
  140:         nodeId:
  141:           report.nodeId,
  142:   
```

### lib\chernobog\desktop\desktopReporter.ts line 170

```text
  167:         metadata:
  168:           report.metadata,
  169:   
> 170:         observedAt:
  171:           report.observedAt,
  172:       });
  173:   
```

### lib\chernobog\desktop\desktopReporter.ts line 171

```text
  168:           report.metadata,
  169:   
  170:         observedAt:
> 171:           report.observedAt,
  172:       });
  173:   
  174:     const previousObservation =
```

### lib\chernobog\desktop\desktopReporter.ts line 174

```text
  171:           report.observedAt,
  172:       });
  173:   
> 174:     const previousObservation =
  175:       options.previousObservation ??
  176:       getLastDesktopObservation(
  177:         report.nodeId
```

### lib\chernobog\desktop\desktopReporter.ts line 175

```text
  172:       });
  173:   
  174:     const previousObservation =
> 175:       options.previousObservation ??
  176:       getLastDesktopObservation(
  177:         report.nodeId
  178:       );
```

### lib\chernobog\desktop\desktopReporter.ts line 176

```text
  173:   
  174:     const previousObservation =
  175:       options.previousObservation ??
> 176:       getLastDesktopObservation(
  177:         report.nodeId
  178:       );
  179:   
```

### lib\chernobog\desktop\desktopReporter.ts line 180

```text
  177:         report.nodeId
  178:       );
  179:   
> 180:     await publishDesktopObservation(
  181:       observation,
  182:       {
  183:         previousObservation,
```

### lib\chernobog\desktop\desktopReporter.ts line 181

```text
  178:       );
  179:   
  180:     await publishDesktopObservation(
> 181:       observation,
  182:       {
  183:         previousObservation,
  184:       }
```

### lib\chernobog\desktop\desktopReporter.ts line 183

```text
  180:     await publishDesktopObservation(
  181:       observation,
  182:       {
> 183:         previousObservation,
  184:       }
  185:     );
  186:   
```

### lib\chernobog\desktop\desktopReporter.ts line 188

```text
  185:     );
  186:   
  187:     if (
> 188:       options.rememberObservation !==
  189:       false
  190:     ) {
  191:       lastObservationByNode.set(
```

### lib\chernobog\desktop\desktopReporter.ts line 191

```text
  188:       options.rememberObservation !==
  189:       false
  190:     ) {
> 191:       lastObservationByNode.set(
  192:         report.nodeId,
  193:         cloneObservation(
  194:           observation
```

### lib\chernobog\desktop\desktopReporter.ts line 193

```text
  190:     ) {
  191:       lastObservationByNode.set(
  192:         report.nodeId,
> 193:         cloneObservation(
  194:           observation
  195:         )
  196:       );
```

### lib\chernobog\desktop\desktopReporter.ts line 194

```text
  191:       lastObservationByNode.set(
  192:         report.nodeId,
  193:         cloneObservation(
> 194:           observation
  195:         )
  196:       );
  197:     }
```

### lib\chernobog\desktop\desktopReporter.ts line 199

```text
  196:       );
  197:     }
  198:   
> 199:     return observation;
  200:   }
```

### lib\chernobog\events\corruption.ts line 131

```text
  128:        * corruption handling.
  129:        *
  130:        * Event schema validation remains the
> 131:        * responsibility of the Event Spine's
  132:        * canonical event schema.
  133:        */
  134:       events.push(
```

### lib\chernobog\events\eventBus.ts line 7

```text
    4:   ChernobogEvent,
    5:   ChernobogEventHandler,
    6:   ChernobogEventInput,
>   7:   ChernobogEventPublishResult,
    8:   ChernobogEventQuery,
    9:   ChernobogEventSubscriptionFilter,
   10: } from "./types";
```

### lib\chernobog\events\eventBus.ts line 39

```text
   36:   handler: ChernobogEventHandler;
   37: }
   38: 
>  39: export interface ChernobogEventBusOptions {
   40:   store: ChernobogEventStore;
   41:   dedupeWindowMs?: number;
   42:   clock?: () => Date;
```

### lib\chernobog\events\eventBus.ts line 74

```text
   71:   return error instanceof Error ? error.message : String(error);
   72: }
   73: 
>  74: export class ChernobogEventBus {
   75:   private readonly store: ChernobogEventStore;
   76:   private readonly dedupeWindowMs: number;
   77:   private readonly clock: () => Date;
```

### lib\chernobog\events\eventBus.ts line 82

```text
   79:   private readonly recentDedupe = new Map<string, number>();
   80:   private nextSubscriptionId = 1;
   81: 
>  82:   constructor(options: ChernobogEventBusOptions) {
   83:     this.store = options.store;
   84:     this.dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 30_000);
   85:     this.clock = options.clock ?? (() => new Date());
```

### lib\chernobog\events\eventBus.ts line 99

```text
   96:     };
   97:   }
   98: 
>  99:   async publish<TPayload>(
  100:     input: ChernobogEventInput<TPayload>,
  101:   ): Promise<ChernobogEventPublishResult> {
  102:     const now = this.clock();
```

### lib\chernobog\events\eventBus.ts line 101

```text
   98: 
   99:   async publish<TPayload>(
  100:     input: ChernobogEventInput<TPayload>,
> 101:   ): Promise<ChernobogEventPublishResult> {
  102:     const now = this.clock();
  103:     const nowMs = now.getTime();
  104:     const event = createChernobogEvent(input, now);
```

### lib\chernobog\events\eventContext.ts line 1

```text
>   1: import { AsyncLocalStorage } from "node:async_hooks";
    2: 
    3: export interface ChernobogEventContext {
    4:   correlationId?: string;
```

### lib\chernobog\events\eventContext.ts line 11

```text
    8:   tags?: string[];
    9: }
   10: 
>  11: const eventContextStorage = new AsyncLocalStorage<ChernobogEventContext>();
   12: 
   13: export function getChernobogEventContext():
   14:   | ChernobogEventContext
```

### lib\chernobog\events\eventContext.ts line 16

```text
   13: export function getChernobogEventContext():
   14:   | ChernobogEventContext
   15:   | undefined {
>  16:   return eventContextStorage.getStore();
   17: }
   18: 
   19: export function runWithChernobogEventContext<T>(
```

### lib\chernobog\events\eventContext.ts line 23

```text
   20:   context: ChernobogEventContext,
   21:   callback: () => T
   22: ): T {
>  23:   const parent = eventContextStorage.getStore();
   24: 
   25:   const tags = [
   26:     ...new Set([
```

### lib\chernobog\events\eventContext.ts line 32

```text
   29:     ]),
   30:   ];
   31: 
>  32:   return eventContextStorage.run(
   33:     {
   34:       ...parent,
   35:       ...context,
```

### lib\chernobog\events\index.ts line 1

```text
>   1: import { ChernobogEventBus } from "./eventBus";
    2: import { JsonlChernobogEventStore } from "./store";
    3: 
    4: 
```

### lib\chernobog\events\index.ts line 6

```text
    3: 
    4: 
    5: const eventGlobals = globalThis as typeof globalThis & {
>   6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
    9: export function getChernobogEventBus(): ChernobogEventBus {
```

### lib\chernobog\events\index.ts line 9

```text
    6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
>   9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
   11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
```

### lib\chernobog\events\index.ts line 10

```text
    7: };
    8: 
    9: export function getChernobogEventBus(): ChernobogEventBus {
>  10:   if (!eventGlobals.__chernobogEventBus) {
   11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
   13:     });
```

### lib\chernobog\events\index.ts line 11

```text
    8: 
    9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
>  11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
   13:     });
   14:   }
```

### lib\chernobog\events\index.ts line 16

```text
   13:     });
   14:   }
   15: 
>  16:   return eventGlobals.__chernobogEventBus;
   17: }
   18: 
   19: export * from "./eventBus";
```

### lib\chernobog\events\index.ts line 19

```text
   16:   return eventGlobals.__chernobogEventBus;
   17: }
   18: 
>  19: export * from "./eventBus";
   20: export * from "./schema";
   21: export * from "./store";
   22: export * from "./types";
```

### lib\chernobog\events\index.ts line 24

```text
   21: export * from "./store";
   22: export * from "./types";
   23: export * from "./eventContext";
>  24: export * from "./publishers";
   25: export * from "./retention";
   26: export * from "./replay";
   27: export * from "./diagnostics";
```

### lib\chernobog\events\publishers.ts line 1

```text
>   1: import { getChernobogEventBus } from "./index";
    2: import { getChernobogEventContext } from "./eventContext";
    3: import {
    4:   ChernobogEventInput,
```

### lib\chernobog\events\publishers.ts line 5

```text
    2: import { getChernobogEventContext } from "./eventContext";
    3: import {
    4:   ChernobogEventInput,
>   5:   ChernobogEventPublishResult,
    6: } from "./types";
    7: 
    8: export interface ChernobogEventPublisher {
```

### lib\chernobog\events\publishers.ts line 8

```text
    5:   ChernobogEventPublishResult,
    6: } from "./types";
    7: 
>   8: export interface ChernobogEventPublisher {
    9:   publish(
   10:     input: ChernobogEventInput<unknown>
   11:   ): Promise<ChernobogEventPublishResult>;
```

### lib\chernobog\events\publishers.ts line 9

```text
    6: } from "./types";
    7: 
    8: export interface ChernobogEventPublisher {
>   9:   publish(
   10:     input: ChernobogEventInput<unknown>
   11:   ): Promise<ChernobogEventPublishResult>;
   12: }
```

### lib\chernobog\events\publishers.ts line 11

```text
    8: export interface ChernobogEventPublisher {
    9:   publish(
   10:     input: ChernobogEventInput<unknown>
>  11:   ): Promise<ChernobogEventPublishResult>;
   12: }
   13: 
   14: function mergeTags(
```

### lib\chernobog\events\publishers.ts line 28

```text
   25:   return tags.length > 0 ? tags : undefined;
   26: }
   27: 
>  28: export async function publishChernobogEventSafely<TPayload>(
   29:   input: ChernobogEventInput<TPayload>,
   30:   publisher?: ChernobogEventPublisher
   31: ): Promise<ChernobogEventPublishResult | null> {
```

### lib\chernobog\events\publishers.ts line 30

```text
   27: 
   28: export async function publishChernobogEventSafely<TPayload>(
   29:   input: ChernobogEventInput<TPayload>,
>  30:   publisher?: ChernobogEventPublisher
   31: ): Promise<ChernobogEventPublishResult | null> {
   32:   const context = getChernobogEventContext();
   33: 
```

### lib\chernobog\events\publishers.ts line 31

```text
   28: export async function publishChernobogEventSafely<TPayload>(
   29:   input: ChernobogEventInput<TPayload>,
   30:   publisher?: ChernobogEventPublisher
>  31: ): Promise<ChernobogEventPublishResult | null> {
   32:   const context = getChernobogEventContext();
   33: 
   34:   const enrichedInput: ChernobogEventInput<unknown> = {
```

### lib\chernobog\events\publishers.ts line 65

```text
   62: 
   63:   try {
   64:     return await (
>  65:       publisher ??
   66:       getChernobogEventBus()
   67:     ).publish(enrichedInput);
   68:   } catch {
```

### lib\chernobog\events\publishers.ts line 66

```text
   63:   try {
   64:     return await (
   65:       publisher ??
>  66:       getChernobogEventBus()
   67:     ).publish(enrichedInput);
   68:   } catch {
   69:     /*
```

### lib\chernobog\events\publishers.ts line 67

```text
   64:     return await (
   65:       publisher ??
   66:       getChernobogEventBus()
>  67:     ).publish(enrichedInput);
   68:   } catch {
   69:     /*
   70:      * Telemetry is observational infrastructure.
```

### lib\chernobog\events\publishers.ts line 70

```text
   67:     ).publish(enrichedInput);
   68:   } catch {
   69:     /*
>  70:      * Telemetry is observational infrastructure.
   71:      *
   72:      * An event-store failure must never make the
   73:      * operation being observed fail as well.
```

### lib\chernobog\events\publishers.ts line 73

```text
   70:      * Telemetry is observational infrastructure.
   71:      *
   72:      * An event-store failure must never make the
>  73:      * operation being observed fail as well.
   74:      */
   75:     return null;
   76:   }
```

### lib\chernobog\events\schema.ts line 48

```text
   45:   const type = requireNonEmpty(input.type, "event.type");
   46:   if (!EVENT_TYPE_PATTERN.test(type)) {
   47:     throw new Error(
>  48:       "event.type must be a lowercase namespaced identifier such as project.test_failed.",
   49:     );
   50:   }
   51: 
```

### lib\chernobog\events\store.ts line 457

```text
  454:           );
  455: 
  456:         /*
> 457:          * Healthy log: nothing to repair.
  458:          */
  459:         if (
  460:           scan.corruptLines ===
```

### lib\chernobog\events\types.ts line 75

```text
   72:   event: ChernobogEvent,
   73: ) => void | Promise<void>;
   74: 
>  75: export interface ChernobogEventPublishResult {
   76:   event: ChernobogEvent;
   77:   deduplicated: boolean;
   78:   delivered: number;
```


## Conversational pipeline references to World State

Pattern: `worldState|World State|world state|snapshot|worldModel|World Model`

### lib\chernobog\pipeline\runCommand.ts line 51

```text
   46:   createTrustTrace,
   47:   setTraceRoute,
   48:   setTraceTool,
   49: } from "@/lib/chernobog/trust/trace";
   50: 
>  51: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   52: import {
   53:   buildContinuityReply,
   54:   detectContinuityQuery,
   55: } from "@/lib/chernobog/session/continuity";
   56: 
```

### lib\chernobog\pipeline\runCommand.ts line 148

```text
  143:     /\b(assess|assessment|evaluate|evaluation|status|state|health|healthy|attention|facts?|inferences?|predictions?|unknowns?|recommend(?:ed|ation)?s?|actions?)\b/i.test(
  144:       normalized
  145:     );
  146: 
  147:   const asksForCurrentAuthority =
> 148:     /\b(current|active|project|workspace|runtime|world state|evidence|known|scope|scoped)\b/i.test(
  149:       normalized
  150:     );
  151: 
  152:   return (
  153:     asksForAssessment &&
```

### lib\chernobog\pipeline\runCommand.ts line 185

```text
  180:     saveSessionContext(startingSession);
  181:   }
  182:   addTraceStep(
  183:     trace,
  184:     "workflow_update",
> 185:     "Workflow snapshot before command",
  186:     undefined,
  187:     buildWorkflowSnapshot(startingSession)
  188:   );
  189: 
  190:   const unifiedCommand = parseUnifiedCommand(userMessage);
```

### lib\chernobog\pipeline\runCommand.ts line 187

```text
  182:   addTraceStep(
  183:     trace,
  184:     "workflow_update",
  185:     "Workflow snapshot before command",
  186:     undefined,
> 187:     buildWorkflowSnapshot(startingSession)
  188:   );
  189: 
  190:   const unifiedCommand = parseUnifiedCommand(userMessage);
  191: 
  192:   addTraceStep(
```

### lib\chernobog\memory-architecture\contextBuilder.ts line 3

```text
    1: import type { OllamaMessage } from "@/lib/chernobog/router";
    2: import {
>   3:   buildWorkingMemorySnapshot,
    4:   formatWorkingMemory,
    5: } from "./workingMemory";
    6: import { selectRelevantLongTermMemories } from "./relevance";
    7: import type {
    8:   BuildMemoryContextInput,
```

### lib\chernobog\memory-architecture\contextBuilder.ts line 42

```text
   37: }
   38: 
   39: export function buildMemoryContext(
   40:   input: BuildMemoryContextInput
   41: ): BuiltMemoryContext {
>  42:   const workingSnapshot = buildWorkingMemorySnapshot(input.session);
   43: 
   44:   const shortTerm = buildBlock(
   45:     "short_term",
   46:     "Short-term memory",
   47:     formatRecentMessages(input.recentMessages)
```

### lib\chernobog\memory-architecture\contextBuilder.ts line 53

```text
   48:   );
   49: 
   50:   const working = buildBlock(
   51:     "working",
   52:     "Working memory",
>  53:     formatWorkingMemory(workingSnapshot)
   54:   );
   55: 
   56:   const relevantLongTermMemories = selectRelevantLongTermMemories(
   57:     input.persistedMemories,
   58:     input.userMessage ?? "",
```

### lib\chernobog\memory-architecture\sourceRegistry.ts line 5

```text
    1: import type {
    2:   UnifiedMemoryLayer,
    3:   UnifiedMemorySourceDescriptor,
    4:   UnifiedMemorySourceId,
>   5:   UnifiedMemorySourceSnapshot,
    6: } from "./unifiedTypes";
    7: 
    8: const SOURCES: readonly UnifiedMemorySourceDescriptor[] = [
    9:   {
   10:     id: "conversation-history",
```

### lib\chernobog\memory-architecture\sourceRegistry.ts line 149

```text
  144:       (a, b) =>
  145:         a.id.localeCompare(b.id),
  146:     );
  147: }
  148: 
> 149: export function getUnifiedMemorySourceSnapshot():
  150:   UnifiedMemorySourceSnapshot {
  151:   const sources =
  152:     listUnifiedMemorySources();
  153: 
  154:   const layers =
```

### lib\chernobog\memory-architecture\sourceRegistry.ts line 150

```text
  145:         a.id.localeCompare(b.id),
  146:     );
  147: }
  148: 
  149: export function getUnifiedMemorySourceSnapshot():
> 150:   UnifiedMemorySourceSnapshot {
  151:   const sources =
  152:     listUnifiedMemorySources();
  153: 
  154:   const layers =
  155:     [...new Set(
```

### lib\chernobog\memory-architecture\status.ts line 2

```text
    1: import {
>   2:   getUnifiedMemorySourceSnapshot,
    3: } from "./sourceRegistry";
    4: import {
    5:   listUnifiedMemoryWritePolicies,
    6: } from "./writePolicy";
    7: import type {
```

### lib\chernobog\memory-architecture\status.ts line 88

```text
   83: export function getUnifiedMemoryArchitectureStatus(
   84:   options: {
   85:     clock?: () => Date;
   86:   } = {},
   87: ): UnifiedMemoryArchitectureStatus {
>  88:   const sourceSnapshot =
   89:     getUnifiedMemorySourceSnapshot();
   90: 
   91:   const writePolicies =
   92:     listUnifiedMemoryWritePolicies();
   93: 
```

### lib\chernobog\memory-architecture\status.ts line 89

```text
   84:   options: {
   85:     clock?: () => Date;
   86:   } = {},
   87: ): UnifiedMemoryArchitectureStatus {
   88:   const sourceSnapshot =
>  89:     getUnifiedMemorySourceSnapshot();
   90: 
   91:   const writePolicies =
   92:     listUnifiedMemoryWritePolicies();
   93: 
   94:   const sourceIds =
```

### lib\chernobog\memory-architecture\status.ts line 95

```text
   90: 
   91:   const writePolicies =
   92:     listUnifiedMemoryWritePolicies();
   93: 
   94:   const sourceIds =
>  95:     sourceSnapshot.sources
   96:       .map(
   97:         (source) =>
   98:           source.id,
   99:       )
  100:       .sort();
```

### lib\chernobog\memory-architecture\status.ts line 136

```text
  131:       "working",
  132:       "long_term",
  133:       "learned",
  134:     ].every(
  135:       (layer) =>
> 136:         sourceSnapshot.layers.includes(
  137:           layer as never,
  138:         ),
  139:     );
  140: 
  141:   const ready =
```

### lib\chernobog\memory-architecture\status.ts line 142

```text
  137:           layer as never,
  138:         ),
  139:     );
  140: 
  141:   const ready =
> 142:     sourceSnapshot.sourceCount ===
  143:       7 &&
  144:     policyCoverageOk &&
  145:     policySemanticsOk &&
  146:     layersOk;
  147: 
```

### lib\chernobog\memory-architecture\status.ts line 179

```text
  174:       (
  175:         options.clock ??
  176:         (() => new Date())
  177:       )().toISOString(),
  178:     sourceCount:
> 179:       sourceSnapshot.sourceCount,
  180:     sources:
  181:       sourceIds,
  182:     layers:
  183:       [...sourceSnapshot.layers],
  184:     writePolicies:
```

### lib\chernobog\memory-architecture\status.ts line 183

```text
  178:     sourceCount:
  179:       sourceSnapshot.sourceCount,
  180:     sources:
  181:       sourceIds,
  182:     layers:
> 183:       [...sourceSnapshot.layers],
  184:     writePolicies:
  185:       writePolicies.map(
  186:         (policy) => ({
  187:           source:
  188:             policy.source,
```

### lib\chernobog\memory-architecture\types.ts line 12

```text
    7:   layer: MemoryLayer;
    8:   title: string;
    9:   lines: string[];
   10: };
   11: 
>  12: export type WorkingMemorySnapshot = {
   13:   sessionId: string;
   14:   lastRoute: string | null;
   15:   lastTool: string | null;
   16:   activePlan: {
   17:     id: string;
```

### lib\chernobog\memory-architecture\unifiedTypes.ts line 62

```text
   57:     | "project-memory"
   58:     | "personal-intelligence"
   59:     | "governed-learning";
   60: }
   61: 
>  62: export interface UnifiedMemorySourceSnapshot {
   63:   sourceCount: number;
   64:   sources: UnifiedMemorySourceDescriptor[];
   65:   layers: UnifiedMemoryLayer[];
   66:   persistentSourceCount: number;
   67:   writableSourceCount: number;
```

### lib\chernobog\memory-architecture\workingMemory.ts line 2

```text
    1: import type { SessionContext } from "@/lib/chernobog/session/types";
>   2: import type { WorkingMemorySnapshot } from "./types";
    3: 
    4: function getActivePlanSnapshot(session: SessionContext): WorkingMemorySnapshot["activePlan"] {
    5:   if (!session.activePlan) {
    6:     return null;
    7:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 4

```text
    1: import type { SessionContext } from "@/lib/chernobog/session/types";
    2: import type { WorkingMemorySnapshot } from "./types";
    3: 
>   4: function getActivePlanSnapshot(session: SessionContext): WorkingMemorySnapshot["activePlan"] {
    5:   if (!session.activePlan) {
    6:     return null;
    7:   }
    8: 
    9:   return {
```

### lib\chernobog\memory-architecture\workingMemory.ts line 20

```text
   15:       session.activePlan.steps.find((step) => step.status === "active")?.title ??
   16:       null,
   17:   };
   18: }
   19: 
>  20: export function buildWorkingMemorySnapshot(
   21:   session: SessionContext
   22: ): WorkingMemorySnapshot {
   23:   const workflow = session.workflow;
   24: 
   25:   const selectedCandidate =
```

### lib\chernobog\memory-architecture\workingMemory.ts line 22

```text
   17:   };
   18: }
   19: 
   20: export function buildWorkingMemorySnapshot(
   21:   session: SessionContext
>  22: ): WorkingMemorySnapshot {
   23:   const workflow = session.workflow;
   24: 
   25:   const selectedCandidate =
   26:     workflow.kind === "file"
   27:       ? workflow.candidates.find(
```

### lib\chernobog\memory-architecture\workingMemory.ts line 43

```text
   38: 
   39:   return {
   40:     sessionId: session.sessionId,
   41:     lastRoute: session.lastRoute ?? null,
   42:     lastTool: session.lastTool?.name ?? null,
>  43:     activePlan: getActivePlanSnapshot(session),
   44:     fileContext: {
   45:       lastSearchQuery:
   46:         workflow.kind === "file"
   47:           ? workflow.query ?? session.fileContext?.lastSearch?.query ?? null
   48:           : session.fileContext?.lastSearch?.query ?? null,
```

### lib\chernobog\memory-architecture\workingMemory.ts line 70

```text
   65:         workflow.kind === "file" ? workflow.candidates.length : 0,
   66:     },
   67:   };
   68: }
   69: 
>  70: export function formatWorkingMemory(snapshot: WorkingMemorySnapshot): string[] {
   71:   const lines: string[] = [];
   72: 
   73:   lines.push(`Session: ${snapshot.sessionId}`);
   74: 
   75:   if (snapshot.lastRoute) {
```

### lib\chernobog\memory-architecture\workingMemory.ts line 73

```text
   68: }
   69: 
   70: export function formatWorkingMemory(snapshot: WorkingMemorySnapshot): string[] {
   71:   const lines: string[] = [];
   72: 
>  73:   lines.push(`Session: ${snapshot.sessionId}`);
   74: 
   75:   if (snapshot.lastRoute) {
   76:     lines.push(`Last route: ${snapshot.lastRoute}`);
   77:   }
   78: 
```

### lib\chernobog\memory-architecture\workingMemory.ts line 75

```text
   70: export function formatWorkingMemory(snapshot: WorkingMemorySnapshot): string[] {
   71:   const lines: string[] = [];
   72: 
   73:   lines.push(`Session: ${snapshot.sessionId}`);
   74: 
>  75:   if (snapshot.lastRoute) {
   76:     lines.push(`Last route: ${snapshot.lastRoute}`);
   77:   }
   78: 
   79:   if (snapshot.lastTool) {
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 76

```text
   71:   const lines: string[] = [];
   72: 
   73:   lines.push(`Session: ${snapshot.sessionId}`);
   74: 
   75:   if (snapshot.lastRoute) {
>  76:     lines.push(`Last route: ${snapshot.lastRoute}`);
   77:   }
   78: 
   79:   if (snapshot.lastTool) {
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 79

```text
   74: 
   75:   if (snapshot.lastRoute) {
   76:     lines.push(`Last route: ${snapshot.lastRoute}`);
   77:   }
   78: 
>  79:   if (snapshot.lastTool) {
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
   82: 
   83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 80

```text
   75:   if (snapshot.lastRoute) {
   76:     lines.push(`Last route: ${snapshot.lastRoute}`);
   77:   }
   78: 
   79:   if (snapshot.lastTool) {
>  80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
   82: 
   83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
   85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 83

```text
   78: 
   79:   if (snapshot.lastTool) {
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
   82: 
>  83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
   85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
   86:     lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
   87:     lines.push(
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
```

### lib\chernobog\memory-architecture\workingMemory.ts line 84

```text
   79:   if (snapshot.lastTool) {
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
   82: 
   83:   if (snapshot.activePlan) {
>  84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
   85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
   86:     lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
   87:     lines.push(
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
```

### lib\chernobog\memory-architecture\workingMemory.ts line 85

```text
   80:     lines.push(`Last tool: ${snapshot.lastTool}`);
   81:   }
   82: 
   83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
>  85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
   86:     lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
   87:     lines.push(
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
   90:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 86

```text
   81:   }
   82: 
   83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
   85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
>  86:     lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
   87:     lines.push(
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
   90:   }
   91: 
```

### lib\chernobog\memory-architecture\workingMemory.ts line 88

```text
   83:   if (snapshot.activePlan) {
   84:     lines.push(`Active plan: ${snapshot.activePlan.title}`);
   85:     lines.push(`Plan status: ${snapshot.activePlan.status}`);
   86:     lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
   87:     lines.push(
>  88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
   90:   }
   91: 
   92:   if (snapshot.fileContext.lastSearchQuery) {
   93:     lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 92

```text
   87:     lines.push(
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
   90:   }
   91: 
>  92:   if (snapshot.fileContext.lastSearchQuery) {
   93:     lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
   94:   }
   95: 
   96:   if (snapshot.fileContext.lastSearchRoot) {
   97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 93

```text
   88:       `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
   89:     );
   90:   }
   91: 
   92:   if (snapshot.fileContext.lastSearchQuery) {
>  93:     lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
   94:   }
   95: 
   96:   if (snapshot.fileContext.lastSearchRoot) {
   97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
   98:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 96

```text
   91: 
   92:   if (snapshot.fileContext.lastSearchQuery) {
   93:     lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
   94:   }
   95: 
>  96:   if (snapshot.fileContext.lastSearchRoot) {
   97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
   98:   }
   99: 
  100:   if (snapshot.fileContext.lastSelectedFile) {
  101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 97

```text
   92:   if (snapshot.fileContext.lastSearchQuery) {
   93:     lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
   94:   }
   95: 
   96:   if (snapshot.fileContext.lastSearchRoot) {
>  97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
   98:   }
   99: 
  100:   if (snapshot.fileContext.lastSelectedFile) {
  101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  102:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 100

```text
   95: 
   96:   if (snapshot.fileContext.lastSearchRoot) {
   97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
   98:   }
   99: 
> 100:   if (snapshot.fileContext.lastSelectedFile) {
  101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  102:   }
  103: 
  104:   if (snapshot.fileContext.lastReadFile) {
  105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 101

```text
   96:   if (snapshot.fileContext.lastSearchRoot) {
   97:     lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
   98:   }
   99: 
  100:   if (snapshot.fileContext.lastSelectedFile) {
> 101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  102:   }
  103: 
  104:   if (snapshot.fileContext.lastReadFile) {
  105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  106:   }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 104

```text
   99: 
  100:   if (snapshot.fileContext.lastSelectedFile) {
  101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  102:   }
  103: 
> 104:   if (snapshot.fileContext.lastReadFile) {
  105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  106:   }
  107: 
  108:   lines.push(`Workflow: ${snapshot.fileContext.workflowKind}/${snapshot.fileContext.workflowStep}`);
  109:   lines.push(`Workflow candidates: ${snapshot.fileContext.workflowCandidateCount}`);
```

### lib\chernobog\memory-architecture\workingMemory.ts line 105

```text
  100:   if (snapshot.fileContext.lastSelectedFile) {
  101:     lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  102:   }
  103: 
  104:   if (snapshot.fileContext.lastReadFile) {
> 105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  106:   }
  107: 
  108:   lines.push(`Workflow: ${snapshot.fileContext.workflowKind}/${snapshot.fileContext.workflowStep}`);
  109:   lines.push(`Workflow candidates: ${snapshot.fileContext.workflowCandidateCount}`);
  110: 
```

### lib\chernobog\memory-architecture\workingMemory.ts line 108

```text
  103: 
  104:   if (snapshot.fileContext.lastReadFile) {
  105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  106:   }
  107: 
> 108:   lines.push(`Workflow: ${snapshot.fileContext.workflowKind}/${snapshot.fileContext.workflowStep}`);
  109:   lines.push(`Workflow candidates: ${snapshot.fileContext.workflowCandidateCount}`);
  110: 
  111:   return lines;
  112: }
```

### lib\chernobog\memory-architecture\workingMemory.ts line 109

```text
  104:   if (snapshot.fileContext.lastReadFile) {
  105:     lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  106:   }
  107: 
  108:   lines.push(`Workflow: ${snapshot.fileContext.workflowKind}/${snapshot.fileContext.workflowStep}`);
> 109:   lines.push(`Workflow candidates: ${snapshot.fileContext.workflowCandidateCount}`);
  110: 
  111:   return lines;
  112: }
```

### lib\chernobog\project\activeProjectContext.ts line 3

```text
    1: import {
    2:   getAllProjects,
>   3:   getDashboardSnapshot,
    4:   getProjectBySlug,
    5:   type Project,
    6: } from "@/lib/modules/project-operations";
    7: 
    8: export type ActiveProjectResolutionSource =
```

### lib\chernobog\project\activeProjectContext.ts line 122

```text
  117:     }
  118:   }
  119: 
  120:   if (asksForCurrentProject(input.userMessage)) {
  121:     const commandFocus =
> 122:       getDashboardSnapshot().commandFocus;
  123: 
  124:     if (commandFocus && !commandFocus.archived) {
  125:       return {
  126:         project: commandFocus,
  127:         projectId: commandFocus.slug,
```


## World Model runtime input from World State

Pattern: `worldState|WorldState|snapshot|project|predict|runtime`

### lib\chernobog\worldModel\causalHypothesis.ts line 76

```text
   72:     effectObservedAt: string;
   73:     confidence?: number;
   74:     supporting?: boolean;
   75:     evidenceEventIds?: string[];
>  76:     evidenceWorldStateKeys?: string[];
   77:   },
   78: ): WorldModelCausalObservation {
   79:   const id =
   80:     input.id.trim();
```

### lib\chernobog\worldModel\causalHypothesis.ts line 134

```text
  130:     evidenceEventIds:
  131:       normalizeList(
  132:         input.evidenceEventIds,
  133:       ),
> 134:     evidenceWorldStateKeys:
  135:       normalizeList(
  136:         input.evidenceWorldStateKeys,
  137:       ),
  138:   };
```

### lib\chernobog\worldModel\causalHypothesis.ts line 136

```text
  132:         input.evidenceEventIds,
  133:       ),
  134:     evidenceWorldStateKeys:
  135:       normalizeList(
> 136:         input.evidenceWorldStateKeys,
  137:       ),
  138:   };
  139: }
  140: 
```

### lib\chernobog\worldModel\causalTypes.ts line 35

```text
   31:   effectObservedAt: string;
   32:   confidence: number;
   33:   supporting: boolean;
   34:   evidenceEventIds: string[];
>  35:   evidenceWorldStateKeys: string[];
   36: }
   37: 
   38: export interface WorldModelCausalHypothesis {
   39:   id: string;
```

### lib\chernobog\worldModel\graph.ts line 7

```text
    3:   WorldModelEntityInput,
    4:   WorldModelNeighbor,
    5:   WorldModelRelationship,
    6:   WorldModelRelationshipInput,
>   7:   WorldModelSnapshot,
    8: } from "./types";
    9: import {
   10:   buildWorldModelEntity,
   11:   buildWorldModelRelationship,
```

### lib\chernobog\worldModel\graph.ts line 297

```text
  293:       },
  294:     );
  295:   }
  296: 
> 297:   snapshot():
  298:     WorldModelSnapshot {
  299:     return {
  300:       entities:
  301:         this.listEntities(),
```

### lib\chernobog\worldModel\graph.ts line 298

```text
  294:     );
  295:   }
  296: 
  297:   snapshot():
> 298:     WorldModelSnapshot {
  299:     return {
  300:       entities:
  301:         this.listEntities(),
  302:       relationships:
```

### lib\chernobog\worldModel\index.ts line 4

```text
    1: export * from "./types";
    2: export * from "./validation";
    3: export * from "./graph";
>   4: export * from "./worldStateGrounding";
    5: export * from "./projectionTypes";
    6: export * from "./relationshipGrounding";
    7: export * from "./projector";
    8: export * from "./causalTypes";
```

### lib\chernobog\worldModel\index.ts line 5

```text
    1: export * from "./types";
    2: export * from "./validation";
    3: export * from "./graph";
    4: export * from "./worldStateGrounding";
>   5: export * from "./projectionTypes";
    6: export * from "./relationshipGrounding";
    7: export * from "./projector";
    8: export * from "./causalTypes";
    9: export * from "./dependencyModel";
```

### lib\chernobog\worldModel\index.ts line 7

```text
    3: export * from "./graph";
    4: export * from "./worldStateGrounding";
    5: export * from "./projectionTypes";
    6: export * from "./relationshipGrounding";
>   7: export * from "./projector";
    8: export * from "./causalTypes";
    9: export * from "./dependencyModel";
   10: export * from "./causalHypothesis";
   11: export * from "./temporalTypes";
```

### lib\chernobog\worldModel\index.ts line 14

```text
   10: export * from "./causalHypothesis";
   11: export * from "./temporalTypes";
   12: export * from "./temporalObservation";
   13: export * from "./temporalModel";
>  14: export * from "./predictionTypes";
   15: export * from "./predictionPolicy";
   16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
```

### lib\chernobog\worldModel\index.ts line 15

```text
   11: export * from "./temporalTypes";
   12: export * from "./temporalObservation";
   13: export * from "./temporalModel";
   14: export * from "./predictionTypes";
>  15: export * from "./predictionPolicy";
   16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
```

### lib\chernobog\worldModel\index.ts line 16

```text
   12: export * from "./temporalObservation";
   13: export * from "./temporalModel";
   14: export * from "./predictionTypes";
   15: export * from "./predictionPolicy";
>  16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
   20: export * from "./runtimeIntegration";
```

### lib\chernobog\worldModel\index.ts line 17

```text
   13: export * from "./temporalModel";
   14: export * from "./predictionTypes";
   15: export * from "./predictionPolicy";
   16: export * from "./predictiveModel";
>  17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
   20: export * from "./runtimeIntegration";
   21: export * from "./runtimeSingleton";
```

### lib\chernobog\worldModel\index.ts line 18

```text
   14: export * from "./predictionTypes";
   15: export * from "./predictionPolicy";
   16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
>  18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
   20: export * from "./runtimeIntegration";
   21: export * from "./runtimeSingleton";
```

### lib\chernobog\worldModel\index.ts line 19

```text
   15: export * from "./predictionPolicy";
   16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
>  19: export * from "./worldModelRuntime";
   20: export * from "./runtimeIntegration";
   21: export * from "./runtimeSingleton";
```

### lib\chernobog\worldModel\index.ts line 20

```text
   16: export * from "./predictiveModel";
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
>  20: export * from "./runtimeIntegration";
   21: export * from "./runtimeSingleton";
```

### lib\chernobog\worldModel\index.ts line 21

```text
   17: export * from "./predictionStore";
   18: export * from "./runtimeTypes";
   19: export * from "./worldModelRuntime";
   20: export * from "./runtimeIntegration";
>  21: export * from "./runtimeSingleton";
```

### lib\chernobog\worldModel\predictionPolicy.ts line 1

```text
>   1: export interface WorldModelPredictionPolicy {
    2:   minimumTransitions: number;
    3:   moderateTransitions: number;
    4:   strongTransitions: number;
    5:   minimumWinningProbability: number;
```

### lib\chernobog\worldModel\predictionPolicy.ts line 8

```text
    4:   strongTransitions: number;
    5:   minimumWinningProbability: number;
    6: }
    7: 
>   8: export const DEFAULT_WORLD_MODEL_PREDICTION_POLICY:
    9:   WorldModelPredictionPolicy = {
   10:     minimumTransitions: 2,
   11:     moderateTransitions: 4,
   12:     strongTransitions: 6,
```

### lib\chernobog\worldModel\predictionPolicy.ts line 9

```text
    5:   minimumWinningProbability: number;
    6: }
    7: 
    8: export const DEFAULT_WORLD_MODEL_PREDICTION_POLICY:
>   9:   WorldModelPredictionPolicy = {
   10:     minimumTransitions: 2,
   11:     moderateTransitions: 4,
   12:     strongTransitions: 6,
   13:     minimumWinningProbability: 0.55,
```

### lib\chernobog\worldModel\predictionPolicy.ts line 16

```text
   12:     strongTransitions: 6,
   13:     minimumWinningProbability: 0.55,
   14:   };
   15: 
>  16: export function validateWorldModelPredictionPolicy(
   17:   policy: WorldModelPredictionPolicy,
   18: ): void {
   19:   for (const [field, value] of [
   20:     ["minimumTransitions", policy.minimumTransitions],
```

### lib\chernobog\worldModel\predictionPolicy.ts line 17

```text
   13:     minimumWinningProbability: 0.55,
   14:   };
   15: 
   16: export function validateWorldModelPredictionPolicy(
>  17:   policy: WorldModelPredictionPolicy,
   18: ): void {
   19:   for (const [field, value] of [
   20:     ["minimumTransitions", policy.minimumTransitions],
   21:     ["moderateTransitions", policy.moderateTransitions],
```

### lib\chernobog\worldModel\predictionPolicy.ts line 29

```text
   25:       !Number.isInteger(value) ||
   26:       value < 1
   27:     ) {
   28:       throw new Error(
>  29:         `world model prediction ${field} must be an integer of at least 1.`,
   30:       );
   31:     }
   32:   }
   33: 
```

### lib\chernobog\worldModel\predictionPolicy.ts line 41

```text
   37:     policy.strongTransitions <
   38:       policy.moderateTransitions
   39:   ) {
   40:     throw new Error(
>  41:       "world model prediction transition thresholds must be nondecreasing.",
   42:     );
   43:   }
   44: 
   45:   if (
```

### lib\chernobog\worldModel\predictionPolicy.ts line 53

```text
   49:     policy.minimumWinningProbability < 0 ||
   50:     policy.minimumWinningProbability > 1
   51:   ) {
   52:     throw new Error(
>  53:       "world model prediction minimumWinningProbability must be between 0 and 1.",
   54:     );
   55:   }
   56: }
```

### lib\chernobog\worldModel\predictionStore.ts line 2

```text
    1: import type {
>   2:   WorldModelStatePrediction,
    3: } from "./predictionTypes";
    4: 
    5: function clonePrediction(
    6:   prediction:
```

### lib\chernobog\worldModel\predictionStore.ts line 3

```text
    1: import type {
    2:   WorldModelStatePrediction,
>   3: } from "./predictionTypes";
    4: 
    5: function clonePrediction(
    6:   prediction:
    7:     WorldModelStatePrediction,
```

### lib\chernobog\worldModel\predictionStore.ts line 5

```text
    1: import type {
    2:   WorldModelStatePrediction,
    3: } from "./predictionTypes";
    4: 
>   5: function clonePrediction(
    6:   prediction:
    7:     WorldModelStatePrediction,
    8: ): WorldModelStatePrediction {
    9:   return structuredClone(
```

### lib\chernobog\worldModel\predictionStore.ts line 6

```text
    2:   WorldModelStatePrediction,
    3: } from "./predictionTypes";
    4: 
    5: function clonePrediction(
>   6:   prediction:
    7:     WorldModelStatePrediction,
    8: ): WorldModelStatePrediction {
    9:   return structuredClone(
   10:     prediction,
```

### lib\chernobog\worldModel\predictionStore.ts line 7

```text
    3: } from "./predictionTypes";
    4: 
    5: function clonePrediction(
    6:   prediction:
>   7:     WorldModelStatePrediction,
    8: ): WorldModelStatePrediction {
    9:   return structuredClone(
   10:     prediction,
   11:   );
```

### lib\chernobog\worldModel\predictionStore.ts line 8

```text
    4: 
    5: function clonePrediction(
    6:   prediction:
    7:     WorldModelStatePrediction,
>   8: ): WorldModelStatePrediction {
    9:   return structuredClone(
   10:     prediction,
   11:   );
   12: }
```

### lib\chernobog\worldModel\predictionStore.ts line 10

```text
    6:   prediction:
    7:     WorldModelStatePrediction,
    8: ): WorldModelStatePrediction {
    9:   return structuredClone(
>  10:     prediction,
   11:   );
   12: }
   13: 
   14: export class ChernobogWorldModelPredictionStore {
```

### lib\chernobog\worldModel\predictionStore.ts line 14

```text
   10:     prediction,
   11:   );
   12: }
   13: 
>  14: export class ChernobogWorldModelPredictionStore {
   15:   private readonly predictions =
   16:     new Map<
   17:       string,
   18:       WorldModelStatePrediction
```

### lib\chernobog\worldModel\predictionStore.ts line 15

```text
   11:   );
   12: }
   13: 
   14: export class ChernobogWorldModelPredictionStore {
>  15:   private readonly predictions =
   16:     new Map<
   17:       string,
   18:       WorldModelStatePrediction
   19:     >();
```

### lib\chernobog\worldModel\predictionStore.ts line 18

```text
   14: export class ChernobogWorldModelPredictionStore {
   15:   private readonly predictions =
   16:     new Map<
   17:       string,
>  18:       WorldModelStatePrediction
   19:     >();
   20: 
   21:   upsert(
   22:     prediction:
```

### lib\chernobog\worldModel\predictionStore.ts line 22

```text
   18:       WorldModelStatePrediction
   19:     >();
   20: 
   21:   upsert(
>  22:     prediction:
   23:       WorldModelStatePrediction,
   24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
   26:       prediction.id,
```

### lib\chernobog\worldModel\predictionStore.ts line 23

```text
   19:     >();
   20: 
   21:   upsert(
   22:     prediction:
>  23:       WorldModelStatePrediction,
   24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
   26:       prediction.id,
   27:       clonePrediction(
```

### lib\chernobog\worldModel\predictionStore.ts line 24

```text
   20: 
   21:   upsert(
   22:     prediction:
   23:       WorldModelStatePrediction,
>  24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
   26:       prediction.id,
   27:       clonePrediction(
   28:         prediction,
```

### lib\chernobog\worldModel\predictionStore.ts line 25

```text
   21:   upsert(
   22:     prediction:
   23:       WorldModelStatePrediction,
   24:   ): WorldModelStatePrediction {
>  25:     this.predictions.set(
   26:       prediction.id,
   27:       clonePrediction(
   28:         prediction,
   29:       ),
```

### lib\chernobog\worldModel\predictionStore.ts line 26

```text
   22:     prediction:
   23:       WorldModelStatePrediction,
   24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
>  26:       prediction.id,
   27:       clonePrediction(
   28:         prediction,
   29:       ),
   30:     );
```

### lib\chernobog\worldModel\predictionStore.ts line 27

```text
   23:       WorldModelStatePrediction,
   24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
   26:       prediction.id,
>  27:       clonePrediction(
   28:         prediction,
   29:       ),
   30:     );
   31: 
```

### lib\chernobog\worldModel\predictionStore.ts line 28

```text
   24:   ): WorldModelStatePrediction {
   25:     this.predictions.set(
   26:       prediction.id,
   27:       clonePrediction(
>  28:         prediction,
   29:       ),
   30:     );
   31: 
   32:     return clonePrediction(
```

### lib\chernobog\worldModel\predictionStore.ts line 32

```text
   28:         prediction,
   29:       ),
   30:     );
   31: 
>  32:     return clonePrediction(
   33:       prediction,
   34:     );
   35:   }
   36: 
```

### lib\chernobog\worldModel\predictionStore.ts line 33

```text
   29:       ),
   30:     );
   31: 
   32:     return clonePrediction(
>  33:       prediction,
   34:     );
   35:   }
   36: 
   37:   get(
```

### lib\chernobog\worldModel\predictionStore.ts line 40

```text
   36: 
   37:   get(
   38:     id: string,
   39:   ):
>  40:     | WorldModelStatePrediction
   41:     | undefined {
   42:     const prediction =
   43:       this.predictions.get(id);
   44: 
```

### lib\chernobog\worldModel\predictionStore.ts line 42

```text
   38:     id: string,
   39:   ):
   40:     | WorldModelStatePrediction
   41:     | undefined {
>  42:     const prediction =
   43:       this.predictions.get(id);
   44: 
   45:     return prediction
   46:       ? clonePrediction(
```

### lib\chernobog\worldModel\predictionStore.ts line 43

```text
   39:   ):
   40:     | WorldModelStatePrediction
   41:     | undefined {
   42:     const prediction =
>  43:       this.predictions.get(id);
   44: 
   45:     return prediction
   46:       ? clonePrediction(
   47:           prediction,
```

### lib\chernobog\worldModel\predictionStore.ts line 45

```text
   41:     | undefined {
   42:     const prediction =
   43:       this.predictions.get(id);
   44: 
>  45:     return prediction
   46:       ? clonePrediction(
   47:           prediction,
   48:         )
   49:       : undefined;
```

### lib\chernobog\worldModel\predictionStore.ts line 46

```text
   42:     const prediction =
   43:       this.predictions.get(id);
   44: 
   45:     return prediction
>  46:       ? clonePrediction(
   47:           prediction,
   48:         )
   49:       : undefined;
   50:   }
```

### lib\chernobog\worldModel\predictionStore.ts line 47

```text
   43:       this.predictions.get(id);
   44: 
   45:     return prediction
   46:       ? clonePrediction(
>  47:           prediction,
   48:         )
   49:       : undefined;
   50:   }
   51: 
```

### lib\chernobog\worldModel\predictionStore.ts line 53

```text
   49:       : undefined;
   50:   }
   51: 
   52:   list():
>  53:     WorldModelStatePrediction[] {
   54:     return [
   55:       ...this.predictions.values(),
   56:     ]
   57:       .sort(
```

### lib\chernobog\worldModel\predictionStore.ts line 55

```text
   51: 
   52:   list():
   53:     WorldModelStatePrediction[] {
   54:     return [
>  55:       ...this.predictions.values(),
   56:     ]
   57:       .sort(
   58:         (left, right) =>
   59:           left.generatedAt.localeCompare(
```

### lib\chernobog\worldModel\predictionStore.ts line 67

```text
   63:             right.id,
   64:           ),
   65:       )
   66:       .map(
>  67:         clonePrediction,
   68:       );
   69:   }
   70: 
   71:   clear(): void {
```

### lib\chernobog\worldModel\predictionStore.ts line 72

```text
   68:       );
   69:   }
   70: 
   71:   clear(): void {
>  72:     this.predictions.clear();
   73:   }
   74: }
```

### lib\chernobog\worldModel\predictionTypes.ts line 2

```text
    1: import type {
>   2:   WorldStateJsonValue,
    3: } from "../worldState";
    4: 
    5: export type WorldModelPredictionStatus =
    6:   | "insufficient"
```

### lib\chernobog\worldModel\predictionTypes.ts line 3

```text
    1: import type {
    2:   WorldStateJsonValue,
>   3: } from "../worldState";
    4: 
    5: export type WorldModelPredictionStatus =
    6:   | "insufficient"
    7:   | "weak"
```

### lib\chernobog\worldModel\predictionTypes.ts line 5

```text
    1: import type {
    2:   WorldStateJsonValue,
    3: } from "../worldState";
    4: 
>   5: export type WorldModelPredictionStatus =
    6:   | "insufficient"
    7:   | "weak"
    8:   | "moderate"
    9:   | "strong";
```

### lib\chernobog\worldModel\predictionTypes.ts line 12

```text
    8:   | "moderate"
    9:   | "strong";
   10: 
   11: export interface WorldModelNextStateCandidate {
>  12:   value: WorldStateJsonValue;
   13:   transitionCount: number;
   14:   probability: number;
   15:   averageDwellMs?: number;
   16: }
```

### lib\chernobog\worldModel\predictionTypes.ts line 18

```text
   14:   probability: number;
   15:   averageDwellMs?: number;
   16: }
   17: 
>  18: export interface WorldModelStatePrediction {
   19:   id: string;
   20:   entityId: string;
   21:   stateKey: string;
   22:   currentValue: WorldStateJsonValue;
```

### lib\chernobog\worldModel\predictionTypes.ts line 22

```text
   18: export interface WorldModelStatePrediction {
   19:   id: string;
   20:   entityId: string;
   21:   stateKey: string;
>  22:   currentValue: WorldStateJsonValue;
   23:   status: WorldModelPredictionStatus;
   24:   confidence: number;
   25:   sampleCount: number;
   26:   generatedAt: string;
```

### lib\chernobog\worldModel\predictionTypes.ts line 23

```text
   19:   id: string;
   20:   entityId: string;
   21:   stateKey: string;
   22:   currentValue: WorldStateJsonValue;
>  23:   status: WorldModelPredictionStatus;
   24:   confidence: number;
   25:   sampleCount: number;
   26:   generatedAt: string;
   27:   candidates: WorldModelNextStateCandidate[];
```

### lib\chernobog\worldModel\predictionTypes.ts line 28

```text
   24:   confidence: number;
   25:   sampleCount: number;
   26:   generatedAt: string;
   27:   candidates: WorldModelNextStateCandidate[];
>  28:   predictedNextValue?: WorldStateJsonValue;
   29:   predictedProbability?: number;
   30:   expectedTransitionAfterMs?: number;
   31:   evidenceTransitionIds: string[];
   32: }
```

### lib\chernobog\worldModel\predictionTypes.ts line 29

```text
   25:   sampleCount: number;
   26:   generatedAt: string;
   27:   candidates: WorldModelNextStateCandidate[];
   28:   predictedNextValue?: WorldStateJsonValue;
>  29:   predictedProbability?: number;
   30:   expectedTransitionAfterMs?: number;
   31:   evidenceTransitionIds: string[];
   32: }
```

### lib\chernobog\worldModel\predictiveModel.ts line 2

```text
    1: import type {
>   2:   WorldStateJsonValue,
    3: } from "../worldState";
    4: import type {
    5:   ChernobogWorldModelTemporalModel,
    6: } from "./temporalModel";
```

### lib\chernobog\worldModel\predictiveModel.ts line 3

```text
    1: import type {
    2:   WorldStateJsonValue,
>   3: } from "../worldState";
    4: import type {
    5:   ChernobogWorldModelTemporalModel,
    6: } from "./temporalModel";
    7: import type {
```

### lib\chernobog\worldModel\predictiveModel.ts line 9

```text
    5:   ChernobogWorldModelTemporalModel,
    6: } from "./temporalModel";
    7: import type {
    8:   WorldModelNextStateCandidate,
>   9:   WorldModelStatePrediction,
   10: } from "./predictionTypes";
   11: import {
   12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
   13:   validateWorldModelPredictionPolicy,
```

### lib\chernobog\worldModel\predictiveModel.ts line 10

```text
    6: } from "./temporalModel";
    7: import type {
    8:   WorldModelNextStateCandidate,
    9:   WorldModelStatePrediction,
>  10: } from "./predictionTypes";
   11: import {
   12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
   13:   validateWorldModelPredictionPolicy,
   14: } from "./predictionPolicy";
```

### lib\chernobog\worldModel\predictiveModel.ts line 12

```text
    8:   WorldModelNextStateCandidate,
    9:   WorldModelStatePrediction,
   10: } from "./predictionTypes";
   11: import {
>  12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
   13:   validateWorldModelPredictionPolicy,
   14: } from "./predictionPolicy";
   15: import type {
   16:   WorldModelPredictionPolicy,
```

### lib\chernobog\worldModel\predictiveModel.ts line 13

```text
    9:   WorldModelStatePrediction,
   10: } from "./predictionTypes";
   11: import {
   12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
>  13:   validateWorldModelPredictionPolicy,
   14: } from "./predictionPolicy";
   15: import type {
   16:   WorldModelPredictionPolicy,
   17: } from "./predictionPolicy";
```

### lib\chernobog\worldModel\predictiveModel.ts line 14

```text
   10: } from "./predictionTypes";
   11: import {
   12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
   13:   validateWorldModelPredictionPolicy,
>  14: } from "./predictionPolicy";
   15: import type {
   16:   WorldModelPredictionPolicy,
   17: } from "./predictionPolicy";
   18: import {
```

### lib\chernobog\worldModel\predictiveModel.ts line 16

```text
   12:   DEFAULT_WORLD_MODEL_PREDICTION_POLICY,
   13:   validateWorldModelPredictionPolicy,
   14: } from "./predictionPolicy";
   15: import type {
>  16:   WorldModelPredictionPolicy,
   17: } from "./predictionPolicy";
   18: import {
   19:   normalizeWorldModelEntityId,
   20: } from "./validation";
```

### lib\chernobog\worldModel\predictiveModel.ts line 17

```text
   13:   validateWorldModelPredictionPolicy,
   14: } from "./predictionPolicy";
   15: import type {
   16:   WorldModelPredictionPolicy,
>  17: } from "./predictionPolicy";
   18: import {
   19:   normalizeWorldModelEntityId,
   20: } from "./validation";
   21: 
```

### lib\chernobog\worldModel\predictiveModel.ts line 23

```text
   19:   normalizeWorldModelEntityId,
   20: } from "./validation";
   21: 
   22: function valueKey(
>  23:   value: WorldStateJsonValue,
   24: ): string {
   25:   return JSON.stringify(value);
   26: }
   27: 
```

### lib\chernobog\worldModel\predictiveModel.ts line 29

```text
   25:   return JSON.stringify(value);
   26: }
   27: 
   28: function cloneValue(
>  29:   value: WorldStateJsonValue,
   30: ): WorldStateJsonValue {
   31:   return structuredClone(value);
   32: }
   33: 
```

### lib\chernobog\worldModel\predictiveModel.ts line 30

```text
   26: }
   27: 
   28: function cloneValue(
   29:   value: WorldStateJsonValue,
>  30: ): WorldStateJsonValue {
   31:   return structuredClone(value);
   32: }
   33: 
   34: export function predictNextWorldModelState(
```

### lib\chernobog\worldModel\predictiveModel.ts line 34

```text
   30: ): WorldStateJsonValue {
   31:   return structuredClone(value);
   32: }
   33: 
>  34: export function predictNextWorldModelState(
   35:   temporal:
   36:     ChernobogWorldModelTemporalModel,
   37:   entityId: string,
   38:   stateKey: string,
```

### lib\chernobog\worldModel\predictiveModel.ts line 41

```text
   37:   entityId: string,
   38:   stateKey: string,
   39:   options: {
   40:     now?: Date;
>  41:     policy?: WorldModelPredictionPolicy;
   42:   } = {},
   43: ): WorldModelStatePrediction | undefined {
   44:   const normalizedEntityId =
   45:     normalizeWorldModelEntityId(
```

### lib\chernobog\worldModel\predictiveModel.ts line 43

```text
   39:   options: {
   40:     now?: Date;
   41:     policy?: WorldModelPredictionPolicy;
   42:   } = {},
>  43: ): WorldModelStatePrediction | undefined {
   44:   const normalizedEntityId =
   45:     normalizeWorldModelEntityId(
   46:       entityId,
   47:     );
```

### lib\chernobog\worldModel\predictiveModel.ts line 54

```text
   50:     stateKey.trim().toLowerCase();
   51: 
   52:   if (!normalizedStateKey) {
   53:     throw new Error(
>  54:       "world model prediction stateKey must not be empty.",
   55:     );
   56:   }
   57: 
   58:   const policy =
```

### lib\chernobog\worldModel\predictiveModel.ts line 60

```text
   56:   }
   57: 
   58:   const policy =
   59:     options.policy ??
>  60:     DEFAULT_WORLD_MODEL_PREDICTION_POLICY;
   61: 
   62:   validateWorldModelPredictionPolicy(
   63:     policy,
   64:   );
```

### lib\chernobog\worldModel\predictiveModel.ts line 62

```text
   58:   const policy =
   59:     options.policy ??
   60:     DEFAULT_WORLD_MODEL_PREDICTION_POLICY;
   61: 
>  62:   validateWorldModelPredictionPolicy(
   63:     policy,
   64:   );
   65: 
   66:   const observations =
```

### lib\chernobog\worldModel\predictiveModel.ts line 109

```text
  105:   const groups =
  106:     new Map<
  107:       string,
  108:       {
> 109:         value: WorldStateJsonValue;
  110:         transitions:
  111:           typeof relevant;
  112:       }
  113:     >();
```

### lib\chernobog\worldModel\predictiveModel.ts line 226

```text
  222:         )
  223:       : 0;
  224: 
  225:   let status:
> 226:     WorldModelStatePrediction["status"] =
  227:       "insufficient";
  228: 
  229:   if (
  230:     sampleCount >=
```

### lib\chernobog\worldModel\predictiveModel.ts line 253

```text
  249:       status = "weak";
  250:     }
  251:   }
  252: 
> 253:   const canPredict =
  254:     status !== "insufficient" &&
  255:     Boolean(winner);
  256: 
  257:   return {
```

### lib\chernobog\worldModel\predictiveModel.ts line 259

```text
  255:     Boolean(winner);
  256: 
  257:   return {
  258:     id:
> 259:       `prediction:${normalizedEntityId}:${normalizedStateKey}:${latest.observedAt}`,
  260:     entityId:
  261:       normalizedEntityId,
  262:     stateKey:
  263:       normalizedStateKey,
```

### lib\chernobog\worldModel\predictiveModel.ts line 283

```text
  279:           structuredClone(
  280:             candidate,
  281:           ),
  282:       ),
> 283:     predictedNextValue:
  284:       canPredict && winner
  285:         ? cloneValue(
  286:             winner.value,
  287:           )
```

### lib\chernobog\worldModel\predictiveModel.ts line 284

```text
  280:             candidate,
  281:           ),
  282:       ),
  283:     predictedNextValue:
> 284:       canPredict && winner
  285:         ? cloneValue(
  286:             winner.value,
  287:           )
  288:         : undefined,
```

### lib\chernobog\worldModel\predictiveModel.ts line 289

```text
  285:         ? cloneValue(
  286:             winner.value,
  287:           )
  288:         : undefined,
> 289:     predictedProbability:
  290:       canPredict && winner
  291:         ? winner.probability
  292:         : undefined,
  293:     expectedTransitionAfterMs:
```

### lib\chernobog\worldModel\predictiveModel.ts line 290

```text
  286:             winner.value,
  287:           )
  288:         : undefined,
  289:     predictedProbability:
> 290:       canPredict && winner
  291:         ? winner.probability
  292:         : undefined,
  293:     expectedTransitionAfterMs:
  294:       canPredict && winner
```

### lib\chernobog\worldModel\predictiveModel.ts line 294

```text
  290:       canPredict && winner
  291:         ? winner.probability
  292:         : undefined,
  293:     expectedTransitionAfterMs:
> 294:       canPredict && winner
  295:         ? winner.averageDwellMs
  296:         : undefined,
  297:     evidenceTransitionIds:
  298:       relevant
```

### lib\chernobog\worldModel\projectionTypes.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelEntityInput,
    6:   WorldModelRelationshipInput,
```

### lib\chernobog\worldModel\projectionTypes.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3: } from "../worldState";
    4: import type {
    5:   WorldModelEntityInput,
    6:   WorldModelRelationshipInput,
    7: } from "./types";
```

### lib\chernobog\worldModel\projectionTypes.ts line 9

```text
    5:   WorldModelEntityInput,
    6:   WorldModelRelationshipInput,
    7: } from "./types";
    8: 
>   9: export interface WorldModelProjection {
   10:   sourceKey: string;
   11:   entities: WorldModelEntityInput[];
   12:   relationships: WorldModelRelationshipInput[];
   13: }
```

### lib\chernobog\worldModel\projectionTypes.ts line 15

```text
   11:   entities: WorldModelEntityInput[];
   12:   relationships: WorldModelRelationshipInput[];
   13: }
   14: 
>  15: export interface WorldModelProjectionResult {
   16:   projectedRecords: number;
   17:   entityWrites: number;
   18:   relationshipWrites: number;
   19:   skippedRelationships: number;
```

### lib\chernobog\worldModel\projectionTypes.ts line 16

```text
   12:   relationships: WorldModelRelationshipInput[];
   13: }
   14: 
   15: export interface WorldModelProjectionResult {
>  16:   projectedRecords: number;
   17:   entityWrites: number;
   18:   relationshipWrites: number;
   19:   skippedRelationships: number;
   20: }
```

### lib\chernobog\worldModel\projectionTypes.ts line 24

```text
   20: }
   21: 
   22: export type WorldModelRelationshipGrounder =
   23:   (
>  24:     record: WorldStateRecord,
   25:   ) => WorldModelProjection;
```

### lib\chernobog\worldModel\projectionTypes.ts line 25

```text
   21: 
   22: export type WorldModelRelationshipGrounder =
   23:   (
   24:     record: WorldStateRecord,
>  25:   ) => WorldModelProjection;
```

### lib\chernobog\worldModel\projector.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3: } from "../worldState";
    4: import {
    5:   ChernobogWorldModelGraph,
    6: } from "./graph";
```

### lib\chernobog\worldModel\projector.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3: } from "../worldState";
    4: import {
    5:   ChernobogWorldModelGraph,
    6: } from "./graph";
    7: import {
```

### lib\chernobog\worldModel\projector.ts line 8

```text
    4: import {
    5:   ChernobogWorldModelGraph,
    6: } from "./graph";
    7: import {
>   8:   groundWorldStateRelationship,
    9: } from "./relationshipGrounding";
   10: import type {
   11:   WorldModelProjectionResult,
   12:   WorldModelRelationshipGrounder,
```

### lib\chernobog\worldModel\projector.ts line 11

```text
    7: import {
    8:   groundWorldStateRelationship,
    9: } from "./relationshipGrounding";
   10: import type {
>  11:   WorldModelProjectionResult,
   12:   WorldModelRelationshipGrounder,
   13: } from "./projectionTypes";
   14: 
   15: export class ChernobogWorldModelProjector {
```

### lib\chernobog\worldModel\projector.ts line 13

```text
    9: } from "./relationshipGrounding";
   10: import type {
   11:   WorldModelProjectionResult,
   12:   WorldModelRelationshipGrounder,
>  13: } from "./projectionTypes";
   14: 
   15: export class ChernobogWorldModelProjector {
   16:   readonly graph:
   17:     ChernobogWorldModelGraph;
```

### lib\chernobog\worldModel\projector.ts line 15

```text
   11:   WorldModelProjectionResult,
   12:   WorldModelRelationshipGrounder,
   13: } from "./projectionTypes";
   14: 
>  15: export class ChernobogWorldModelProjector {
   16:   readonly graph:
   17:     ChernobogWorldModelGraph;
   18: 
   19:   private readonly ground:
```

### lib\chernobog\worldModel\projector.ts line 36

```text
   32:       new ChernobogWorldModelGraph();
   33: 
   34:     this.ground =
   35:       options.ground ??
>  36:       groundWorldStateRelationship;
   37:   }
   38: 
   39:   project(
   40:     records:
```

### lib\chernobog\worldModel\projector.ts line 39

```text
   35:       options.ground ??
   36:       groundWorldStateRelationship;
   37:   }
   38: 
>  39:   project(
   40:     records:
   41:       readonly WorldStateRecord[],
   42:   ): WorldModelProjectionResult {
   43:     let entityWrites = 0;
```

### lib\chernobog\worldModel\projector.ts line 41

```text
   37:   }
   38: 
   39:   project(
   40:     records:
>  41:       readonly WorldStateRecord[],
   42:   ): WorldModelProjectionResult {
   43:     let entityWrites = 0;
   44:     let relationshipWrites = 0;
   45:     let skippedRelationships = 0;
```

### lib\chernobog\worldModel\projector.ts line 42

```text
   38: 
   39:   project(
   40:     records:
   41:       readonly WorldStateRecord[],
>  42:   ): WorldModelProjectionResult {
   43:     let entityWrites = 0;
   44:     let relationshipWrites = 0;
   45:     let skippedRelationships = 0;
   46: 
```

### lib\chernobog\worldModel\projector.ts line 47

```text
   43:     let entityWrites = 0;
   44:     let relationshipWrites = 0;
   45:     let skippedRelationships = 0;
   46: 
>  47:     const projections =
   48:       [...records]
   49:         .sort(
   50:           (left, right) =>
   51:             left.key.localeCompare(
```

### lib\chernobog\worldModel\projector.ts line 60

```text
   56:           this.ground(record),
   57:         );
   58: 
   59:     for (
>  60:       const projection
   61:       of projections
   62:     ) {
   63:       const entities =
   64:         projection.entities
```

### lib\chernobog\worldModel\projector.ts line 61

```text
   57:         );
   58: 
   59:     for (
   60:       const projection
>  61:       of projections
   62:     ) {
   63:       const entities =
   64:         projection.entities
   65:           .slice()
```

### lib\chernobog\worldModel\projector.ts line 64

```text
   60:       const projection
   61:       of projections
   62:     ) {
   63:       const entities =
>  64:         projection.entities
   65:           .slice()
   66:           .sort(
   67:             (left, right) =>
   68:               left.id.localeCompare(
```

### lib\chernobog\worldModel\projector.ts line 86

```text
   82:       }
   83:     }
   84: 
   85:     for (
>  86:       const projection
   87:       of projections
   88:     ) {
   89:       const relationships =
   90:         projection.relationships
```

### lib\chernobog\worldModel\projector.ts line 87

```text
   83:     }
   84: 
   85:     for (
   86:       const projection
>  87:       of projections
   88:     ) {
   89:       const relationships =
   90:         projection.relationships
   91:           .slice()
```

### lib\chernobog\worldModel\projector.ts line 90

```text
   86:       const projection
   87:       of projections
   88:     ) {
   89:       const relationships =
>  90:         projection.relationships
   91:           .slice()
   92:           .sort(
   93:             (left, right) => {
   94:               const leftKey =
```

### lib\chernobog\worldModel\projector.ts line 131

```text
  127:       }
  128:     }
  129: 
  130:     return {
> 131:       projectedRecords:
  132:         projections.length,
  133:       entityWrites,
  134:       relationshipWrites,
  135:       skippedRelationships,
```

### lib\chernobog\worldModel\projector.ts line 132

```text
  128:     }
  129: 
  130:     return {
  131:       projectedRecords:
> 132:         projections.length,
  133:       entityWrites,
  134:       relationshipWrites,
  135:       skippedRelationships,
  136:     };
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelProjection,
    6: } from "./projectionTypes";
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3: } from "../worldState";
    4: import type {
    5:   WorldModelProjection,
    6: } from "./projectionTypes";
    7: import type {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 5

```text
    1: import type {
    2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
>   5:   WorldModelProjection,
    6: } from "./projectionTypes";
    7: import type {
    8:   WorldModelEntityInput,
    9:   WorldModelEntityKind,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 6

```text
    2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelProjection,
>   6: } from "./projectionTypes";
    7: import type {
    8:   WorldModelEntityInput,
    9:   WorldModelEntityKind,
   10:   WorldModelRelationshipInput,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 13

```text
    9:   WorldModelEntityKind,
   10:   WorldModelRelationshipInput,
   11: } from "./types";
   12: import {
>  13:   worldModelEntityFromWorldState,
   14: } from "./worldStateGrounding";
   15: 
   16: function evidenceFor(
   17:   record: WorldStateRecord,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 14

```text
   10:   WorldModelRelationshipInput,
   11: } from "./types";
   12: import {
   13:   worldModelEntityFromWorldState,
>  14: } from "./worldStateGrounding";
   15: 
   16: function evidenceFor(
   17:   record: WorldStateRecord,
   18: ) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 17

```text
   13:   worldModelEntityFromWorldState,
   14: } from "./worldStateGrounding";
   15: 
   16: function evidenceFor(
>  17:   record: WorldStateRecord,
   18: ) {
   19:   return {
   20:     worldStateKeys: [
   21:       record.key,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 20

```text
   16: function evidenceFor(
   17:   record: WorldStateRecord,
   18: ) {
   19:   return {
>  20:     worldStateKeys: [
   21:       record.key,
   22:     ],
   23:     eventIds:
   24:       record.provenance?.eventId
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 36

```text
   32: function canonicalEntity(
   33:   id: string,
   34:   kind: WorldModelEntityKind,
   35:   label: string,
>  36:   record: WorldStateRecord,
   37: ): WorldModelEntityInput {
   38:   return {
   39:     id,
   40:     kind,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 55

```text
   51: function relationship(
   52:   type: string,
   53:   fromEntityId: string,
   54:   toEntityId: string,
>  55:   record: WorldStateRecord,
   56: ): WorldModelRelationshipInput {
   57:   return {
   58:     type,
   59:     fromEntityId,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 82

```text
   78:     )
   79:     .filter(Boolean);
   80: }
   81: 
>  82: function serviceProjection(
   83:   record: WorldStateRecord,
   84:   parts: string[],
   85: ): WorldModelProjection {
   86:   const serviceName =
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 83

```text
   79:     .filter(Boolean);
   80: }
   81: 
   82: function serviceProjection(
>  83:   record: WorldStateRecord,
   84:   parts: string[],
   85: ): WorldModelProjection {
   86:   const serviceName =
   87:     parts[1];
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 85

```text
   81: 
   82: function serviceProjection(
   83:   record: WorldStateRecord,
   84:   parts: string[],
>  85: ): WorldModelProjection {
   86:   const serviceName =
   87:     parts[1];
   88: 
   89:   if (!serviceName) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 93

```text
   89:   if (!serviceName) {
   90:     return {
   91:       sourceKey: record.key,
   92:       entities: [
>  93:         worldModelEntityFromWorldState(
   94:           record,
   95:         ),
   96:       ],
   97:       relationships: [],
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 116

```text
  112:         "service",
  113:         serviceName,
  114:         record,
  115:       ),
> 116:       worldModelEntityFromWorldState(
  117:         record,
  118:       ),
  119:     ],
  120:     relationships: [
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 131

```text
  127:     ],
  128:   };
  129: }
  130: 
> 131: function projectProjection(
  132:   record: WorldStateRecord,
  133:   parts: string[],
  134: ): WorldModelProjection {
  135:   const projectName =
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 132

```text
  128:   };
  129: }
  130: 
  131: function projectProjection(
> 132:   record: WorldStateRecord,
  133:   parts: string[],
  134: ): WorldModelProjection {
  135:   const projectName =
  136:     parts[1];
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 134

```text
  130: 
  131: function projectProjection(
  132:   record: WorldStateRecord,
  133:   parts: string[],
> 134: ): WorldModelProjection {
  135:   const projectName =
  136:     parts[1];
  137: 
  138:   if (!projectName) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 135

```text
  131: function projectProjection(
  132:   record: WorldStateRecord,
  133:   parts: string[],
  134: ): WorldModelProjection {
> 135:   const projectName =
  136:     parts[1];
  137: 
  138:   if (!projectName) {
  139:     return {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 138

```text
  134: ): WorldModelProjection {
  135:   const projectName =
  136:     parts[1];
  137: 
> 138:   if (!projectName) {
  139:     return {
  140:       sourceKey: record.key,
  141:       entities: [
  142:         worldModelEntityFromWorldState(
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 142

```text
  138:   if (!projectName) {
  139:     return {
  140:       sourceKey: record.key,
  141:       entities: [
> 142:         worldModelEntityFromWorldState(
  143:           record,
  144:         ),
  145:       ],
  146:       relationships: [],
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 150

```text
  146:       relationships: [],
  147:     };
  148:   }
  149: 
> 150:   const projectId =
  151:     `project:${projectName}`;
  152: 
  153:   const factId =
  154:     `world-state:${record.key}`;
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 151

```text
  147:     };
  148:   }
  149: 
  150:   const projectId =
> 151:     `project:${projectName}`;
  152: 
  153:   const factId =
  154:     `world-state:${record.key}`;
  155: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 159

```text
  155: 
  156:   const entities:
  157:     WorldModelEntityInput[] = [
  158:       canonicalEntity(
> 159:         projectId,
  160:         "project",
  161:         projectName,
  162:         record,
  163:       ),
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 160

```text
  156:   const entities:
  157:     WorldModelEntityInput[] = [
  158:       canonicalEntity(
  159:         projectId,
> 160:         "project",
  161:         projectName,
  162:         record,
  163:       ),
  164:       worldModelEntityFromWorldState(
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 161

```text
  157:     WorldModelEntityInput[] = [
  158:       canonicalEntity(
  159:         projectId,
  160:         "project",
> 161:         projectName,
  162:         record,
  163:       ),
  164:       worldModelEntityFromWorldState(
  165:         record,
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 164

```text
  160:         "project",
  161:         projectName,
  162:         record,
  163:       ),
> 164:       worldModelEntityFromWorldState(
  165:         record,
  166:       ),
  167:     ];
  168: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 173

```text
  169:   const relationships:
  170:     WorldModelRelationshipInput[] = [
  171:       relationship(
  172:         "has-state",
> 173:         projectId,
  174:         factId,
  175:         record,
  176:       ),
  177:     ];
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 210

```text
  206: 
  207:     relationships.push(
  208:       relationship(
  209:         "uses-repository",
> 210:         projectId,
  211:         repositoryId,
  212:         record,
  213:       ),
  214:     );
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 224

```text
  220:     relationships,
  221:   };
  222: }
  223: 
> 224: function repositoryProjection(
  225:   record: WorldStateRecord,
  226:   parts: string[],
  227: ): WorldModelProjection {
  228:   const repositoryName =
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 225

```text
  221:   };
  222: }
  223: 
  224: function repositoryProjection(
> 225:   record: WorldStateRecord,
  226:   parts: string[],
  227: ): WorldModelProjection {
  228:   const repositoryName =
  229:     parts[1];
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 227

```text
  223: 
  224: function repositoryProjection(
  225:   record: WorldStateRecord,
  226:   parts: string[],
> 227: ): WorldModelProjection {
  228:   const repositoryName =
  229:     parts[1];
  230: 
  231:   if (!repositoryName) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 235

```text
  231:   if (!repositoryName) {
  232:     return {
  233:       sourceKey: record.key,
  234:       entities: [
> 235:         worldModelEntityFromWorldState(
  236:           record,
  237:         ),
  238:       ],
  239:       relationships: [],
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 258

```text
  254:         "repository",
  255:         repositoryName,
  256:         record,
  257:       ),
> 258:       worldModelEntityFromWorldState(
  259:         record,
  260:       ),
  261:     ],
  262:     relationships: [
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 273

```text
  269:     ],
  270:   };
  271: }
  272: 
> 273: function modelProjection(
  274:   record: WorldStateRecord,
  275:   parts: string[],
  276: ): WorldModelProjection {
  277:   const modelName =
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 274

```text
  270:   };
  271: }
  272: 
  273: function modelProjection(
> 274:   record: WorldStateRecord,
  275:   parts: string[],
  276: ): WorldModelProjection {
  277:   const modelName =
  278:     parts[1];
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 276

```text
  272: 
  273: function modelProjection(
  274:   record: WorldStateRecord,
  275:   parts: string[],
> 276: ): WorldModelProjection {
  277:   const modelName =
  278:     parts[1];
  279: 
  280:   if (!modelName) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 284

```text
  280:   if (!modelName) {
  281:     return {
  282:       sourceKey: record.key,
  283:       entities: [
> 284:         worldModelEntityFromWorldState(
  285:           record,
  286:         ),
  287:       ],
  288:       relationships: [],
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 307

```text
  303:         "model",
  304:         modelName,
  305:         record,
  306:       ),
> 307:       worldModelEntityFromWorldState(
  308:         record,
  309:       ),
  310:     ],
  311:     relationships: [
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 322

```text
  318:     ],
  319:   };
  320: }
  321: 
> 322: function infrastructureProjection(
  323:   record: WorldStateRecord,
  324:   parts: string[],
  325:   kind:
  326:     "storage" |
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 323

```text
  319:   };
  320: }
  321: 
  322: function infrastructureProjection(
> 323:   record: WorldStateRecord,
  324:   parts: string[],
  325:   kind:
  326:     "storage" |
  327:     "backup",
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 328

```text
  324:   parts: string[],
  325:   kind:
  326:     "storage" |
  327:     "backup",
> 328: ): WorldModelProjection {
  329:   const name =
  330:     parts[1];
  331: 
  332:   if (!name) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 336

```text
  332:   if (!name) {
  333:     return {
  334:       sourceKey: record.key,
  335:       entities: [
> 336:         worldModelEntityFromWorldState(
  337:           record,
  338:         ),
  339:       ],
  340:       relationships: [],
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 359

```text
  355:         kind,
  356:         name,
  357:         record,
  358:       ),
> 359:       worldModelEntityFromWorldState(
  360:         record,
  361:       ),
  362:     ],
  363:     relationships: [
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 374

```text
  370:     ],
  371:   };
  372: }
  373: 
> 374: export function groundWorldStateRelationship(
  375:   record: WorldStateRecord,
  376: ): WorldModelProjection {
  377:   const parts =
  378:     tokenize(record.key);
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 375

```text
  371:   };
  372: }
  373: 
  374: export function groundWorldStateRelationship(
> 375:   record: WorldStateRecord,
  376: ): WorldModelProjection {
  377:   const parts =
  378:     tokenize(record.key);
  379: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 376

```text
  372: }
  373: 
  374: export function groundWorldStateRelationship(
  375:   record: WorldStateRecord,
> 376: ): WorldModelProjection {
  377:   const parts =
  378:     tokenize(record.key);
  379: 
  380:   switch (record.namespace) {
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 382

```text
  378:     tokenize(record.key);
  379: 
  380:   switch (record.namespace) {
  381:     case "service":
> 382:       return serviceProjection(
  383:         record,
  384:         parts,
  385:       );
  386: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 387

```text
  383:         record,
  384:         parts,
  385:       );
  386: 
> 387:     case "project":
  388:       return projectProjection(
  389:         record,
  390:         parts,
  391:       );
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 388

```text
  384:         parts,
  385:       );
  386: 
  387:     case "project":
> 388:       return projectProjection(
  389:         record,
  390:         parts,
  391:       );
  392: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 394

```text
  390:         parts,
  391:       );
  392: 
  393:     case "repository":
> 394:       return repositoryProjection(
  395:         record,
  396:         parts,
  397:       );
  398: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 400

```text
  396:         parts,
  397:       );
  398: 
  399:     case "model":
> 400:       return modelProjection(
  401:         record,
  402:         parts,
  403:       );
  404: 
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 406

```text
  402:         parts,
  403:       );
  404: 
  405:     case "storage":
> 406:       return infrastructureProjection(
  407:         record,
  408:         parts,
  409:         "storage",
  410:       );
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 413

```text
  409:         "storage",
  410:       );
  411: 
  412:     case "backup":
> 413:       return infrastructureProjection(
  414:         record,
  415:         parts,
  416:         "backup",
  417:       );
```

### lib\chernobog\worldModel\relationshipGrounding.ts line 424

```text
  420:       return {
  421:         sourceKey:
  422:           record.key,
  423:         entities: [
> 424:           worldModelEntityFromWorldState(
  425:             record,
  426:           ),
  427:         ],
  428:         relationships: [],
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 2

```text
    1: import type {
>   2:   ChernobogWorldModelProductionRuntime,
    3:   StartChernobogWorldModelRuntimeOptions,
    4: } from "./runtimeTypes";
    5: import {
    6:   ChernobogWorldModelRuntime,
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 3

```text
    1: import type {
    2:   ChernobogWorldModelProductionRuntime,
>   3:   StartChernobogWorldModelRuntimeOptions,
    4: } from "./runtimeTypes";
    5: import {
    6:   ChernobogWorldModelRuntime,
    7: } from "./worldModelRuntime";
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 4

```text
    1: import type {
    2:   ChernobogWorldModelProductionRuntime,
    3:   StartChernobogWorldModelRuntimeOptions,
>   4: } from "./runtimeTypes";
    5: import {
    6:   ChernobogWorldModelRuntime,
    7: } from "./worldModelRuntime";
    8: 
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 6

```text
    2:   ChernobogWorldModelProductionRuntime,
    3:   StartChernobogWorldModelRuntimeOptions,
    4: } from "./runtimeTypes";
    5: import {
>   6:   ChernobogWorldModelRuntime,
    7: } from "./worldModelRuntime";
    8: 
    9: export function startChernobogWorldModelRuntime(
   10:   options:
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 7

```text
    3:   StartChernobogWorldModelRuntimeOptions,
    4: } from "./runtimeTypes";
    5: import {
    6:   ChernobogWorldModelRuntime,
>   7: } from "./worldModelRuntime";
    8: 
    9: export function startChernobogWorldModelRuntime(
   10:   options:
   11:     StartChernobogWorldModelRuntimeOptions,
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 9

```text
    5: import {
    6:   ChernobogWorldModelRuntime,
    7: } from "./worldModelRuntime";
    8: 
>   9: export function startChernobogWorldModelRuntime(
   10:   options:
   11:     StartChernobogWorldModelRuntimeOptions,
   12: ): ChernobogWorldModelProductionRuntime {
   13:   const model =
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 11

```text
    7: } from "./worldModelRuntime";
    8: 
    9: export function startChernobogWorldModelRuntime(
   10:   options:
>  11:     StartChernobogWorldModelRuntimeOptions,
   12: ): ChernobogWorldModelProductionRuntime {
   13:   const model =
   14:     options.model ??
   15:     new ChernobogWorldModelRuntime();
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 12

```text
    8: 
    9: export function startChernobogWorldModelRuntime(
   10:   options:
   11:     StartChernobogWorldModelRuntimeOptions,
>  12: ): ChernobogWorldModelProductionRuntime {
   13:   const model =
   14:     options.model ??
   15:     new ChernobogWorldModelRuntime();
   16: 
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 15

```text
   11:     StartChernobogWorldModelRuntimeOptions,
   12: ): ChernobogWorldModelProductionRuntime {
   13:   const model =
   14:     options.model ??
>  15:     new ChernobogWorldModelRuntime();
   16: 
   17:   let stopped = false;
   18: 
   19:   const ingestCurrentWorldState =
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 19

```text
   15:     new ChernobogWorldModelRuntime();
   16: 
   17:   let stopped = false;
   18: 
>  19:   const ingestCurrentWorldState =
   20:     () =>
   21:       model.ingestWorldState(
   22:         options.worldStateRuntime
   23:           .engine
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 21

```text
   17:   let stopped = false;
   18: 
   19:   const ingestCurrentWorldState =
   20:     () =>
>  21:       model.ingestWorldState(
   22:         options.worldStateRuntime
   23:           .engine
   24:           .worldState
   25:           .snapshot(),
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 22

```text
   18: 
   19:   const ingestCurrentWorldState =
   20:     () =>
   21:       model.ingestWorldState(
>  22:         options.worldStateRuntime
   23:           .engine
   24:           .worldState
   25:           .snapshot(),
   26:       );
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 24

```text
   20:     () =>
   21:       model.ingestWorldState(
   22:         options.worldStateRuntime
   23:           .engine
>  24:           .worldState
   25:           .snapshot(),
   26:       );
   27: 
   28:   ingestCurrentWorldState();
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 25

```text
   21:       model.ingestWorldState(
   22:         options.worldStateRuntime
   23:           .engine
   24:           .worldState
>  25:           .snapshot(),
   26:       );
   27: 
   28:   ingestCurrentWorldState();
   29: 
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 28

```text
   24:           .worldState
   25:           .snapshot(),
   26:       );
   27: 
>  28:   ingestCurrentWorldState();
   29: 
   30:   const unsubscribe =
   31:     options.eventBus.subscribe(
   32:       {},
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 39

```text
   35:           return;
   36:         }
   37: 
   38:         /*
>  39:          * The 11G runtime is started before this subscription.
   40:          * Its Event Spine subscriber updates the canonical registry
   41:          * synchronously before its persistence await, so this
   42:          * subscriber reads the newly projected current state.
   43:          */
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 42

```text
   38:         /*
   39:          * The 11G runtime is started before this subscription.
   40:          * Its Event Spine subscriber updates the canonical registry
   41:          * synchronously before its persistence await, so this
>  42:          * subscriber reads the newly projected current state.
   43:          */
   44:         ingestCurrentWorldState();
   45:       },
   46:     );
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 44

```text
   40:          * Its Event Spine subscriber updates the canonical registry
   41:          * synchronously before its persistence await, so this
   42:          * subscriber reads the newly projected current state.
   43:          */
>  44:         ingestCurrentWorldState();
   45:       },
   46:     );
   47: 
   48:   return {
```

### lib\chernobog\worldModel\runtimeIntegration.ts line 50

```text
   46:     );
   47: 
   48:   return {
   49:     model,
>  50:     ingestCurrentWorldState,
   51: 
   52:     stop() {
   53:       if (stopped) {
   54:         return;
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 5

```text
    1: import {
    2:   getChernobogEventBus,
    3: } from "../events";
    4: import {
>   5:   getChernobogWorldStateRuntime,
    6: } from "../worldState";
    7: import {
    8:   startChernobogWorldModelRuntime,
    9: } from "./runtimeIntegration";
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 6

```text
    2:   getChernobogEventBus,
    3: } from "../events";
    4: import {
    5:   getChernobogWorldStateRuntime,
>   6: } from "../worldState";
    7: import {
    8:   startChernobogWorldModelRuntime,
    9: } from "./runtimeIntegration";
   10: import type {
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 8

```text
    4: import {
    5:   getChernobogWorldStateRuntime,
    6: } from "../worldState";
    7: import {
>   8:   startChernobogWorldModelRuntime,
    9: } from "./runtimeIntegration";
   10: import type {
   11:   ChernobogWorldModelProductionRuntime,
   12: } from "./runtimeTypes";
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 9

```text
    5:   getChernobogWorldStateRuntime,
    6: } from "../worldState";
    7: import {
    8:   startChernobogWorldModelRuntime,
>   9: } from "./runtimeIntegration";
   10: import type {
   11:   ChernobogWorldModelProductionRuntime,
   12: } from "./runtimeTypes";
   13: 
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 11

```text
    7: import {
    8:   startChernobogWorldModelRuntime,
    9: } from "./runtimeIntegration";
   10: import type {
>  11:   ChernobogWorldModelProductionRuntime,
   12: } from "./runtimeTypes";
   13: 
   14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 12

```text
    8:   startChernobogWorldModelRuntime,
    9: } from "./runtimeIntegration";
   10: import type {
   11:   ChernobogWorldModelProductionRuntime,
>  12: } from "./runtimeTypes";
   13: 
   14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
   16:     __chernobogWorldModelRuntimePromise?:
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 14

```text
   10: import type {
   11:   ChernobogWorldModelProductionRuntime,
   12: } from "./runtimeTypes";
   13: 
>  14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
   16:     __chernobogWorldModelRuntimePromise?:
   17:       Promise<ChernobogWorldModelProductionRuntime>;
   18:   };
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 16

```text
   12: } from "./runtimeTypes";
   13: 
   14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
>  16:     __chernobogWorldModelRuntimePromise?:
   17:       Promise<ChernobogWorldModelProductionRuntime>;
   18:   };
   19: 
   20: const worldModelGlobals =
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 17

```text
   13: 
   14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
   16:     __chernobogWorldModelRuntimePromise?:
>  17:       Promise<ChernobogWorldModelProductionRuntime>;
   18:   };
   19: 
   20: const worldModelGlobals =
   21:   globalThis as WorldModelRuntimeGlobals;
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 21

```text
   17:       Promise<ChernobogWorldModelProductionRuntime>;
   18:   };
   19: 
   20: const worldModelGlobals =
>  21:   globalThis as WorldModelRuntimeGlobals;
   22: 
   23: export function getChernobogWorldModelRuntime():
   24:   Promise<ChernobogWorldModelProductionRuntime> {
   25:   if (
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 23

```text
   19: 
   20: const worldModelGlobals =
   21:   globalThis as WorldModelRuntimeGlobals;
   22: 
>  23: export function getChernobogWorldModelRuntime():
   24:   Promise<ChernobogWorldModelProductionRuntime> {
   25:   if (
   26:     !worldModelGlobals
   27:       .__chernobogWorldModelRuntimePromise
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 24

```text
   20: const worldModelGlobals =
   21:   globalThis as WorldModelRuntimeGlobals;
   22: 
   23: export function getChernobogWorldModelRuntime():
>  24:   Promise<ChernobogWorldModelProductionRuntime> {
   25:   if (
   26:     !worldModelGlobals
   27:       .__chernobogWorldModelRuntimePromise
   28:   ) {
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 27

```text
   23: export function getChernobogWorldModelRuntime():
   24:   Promise<ChernobogWorldModelProductionRuntime> {
   25:   if (
   26:     !worldModelGlobals
>  27:       .__chernobogWorldModelRuntimePromise
   28:   ) {
   29:     const startup =
   30:       getChernobogWorldStateRuntime()
   31:         .then(
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 30

```text
   26:     !worldModelGlobals
   27:       .__chernobogWorldModelRuntimePromise
   28:   ) {
   29:     const startup =
>  30:       getChernobogWorldStateRuntime()
   31:         .then(
   32:           (worldStateRuntime) =>
   33:             startChernobogWorldModelRuntime({
   34:               worldStateRuntime,
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 32

```text
   28:   ) {
   29:     const startup =
   30:       getChernobogWorldStateRuntime()
   31:         .then(
>  32:           (worldStateRuntime) =>
   33:             startChernobogWorldModelRuntime({
   34:               worldStateRuntime,
   35:               eventBus:
   36:                 getChernobogEventBus(),
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 33

```text
   29:     const startup =
   30:       getChernobogWorldStateRuntime()
   31:         .then(
   32:           (worldStateRuntime) =>
>  33:             startChernobogWorldModelRuntime({
   34:               worldStateRuntime,
   35:               eventBus:
   36:                 getChernobogEventBus(),
   37:             }),
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 34

```text
   30:       getChernobogWorldStateRuntime()
   31:         .then(
   32:           (worldStateRuntime) =>
   33:             startChernobogWorldModelRuntime({
>  34:               worldStateRuntime,
   35:               eventBus:
   36:                 getChernobogEventBus(),
   37:             }),
   38:         )
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 41

```text
   37:             }),
   38:         )
   39:         .catch((error) => {
   40:           delete worldModelGlobals
>  41:             .__chernobogWorldModelRuntimePromise;
   42: 
   43:           throw error;
   44:         });
   45: 
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 47

```text
   43:           throw error;
   44:         });
   45: 
   46:     worldModelGlobals
>  47:       .__chernobogWorldModelRuntimePromise =
   48:       startup;
   49:   }
   50: 
   51:   return worldModelGlobals
```

### lib\chernobog\worldModel\runtimeSingleton.ts line 52

```text
   48:       startup;
   49:   }
   50: 
   51:   return worldModelGlobals
>  52:     .__chernobogWorldModelRuntimePromise;
   53: }
```

### lib\chernobog\worldModel\runtimeTypes.ts line 5

```text
    1: import type {
    2:   ChernobogEventBus,
    3: } from "../events/eventBus";
    4: import type {
>   5:   ChernobogWorldStateRuntime,
    6:   WorldStateRecord,
    7: } from "../worldState";
    8: import type {
    9:   WorldModelCausalHypothesis,
```

### lib\chernobog\worldModel\runtimeTypes.ts line 6

```text
    2:   ChernobogEventBus,
    3: } from "../events/eventBus";
    4: import type {
    5:   ChernobogWorldStateRuntime,
>   6:   WorldStateRecord,
    7: } from "../worldState";
    8: import type {
    9:   WorldModelCausalHypothesis,
   10:   WorldModelCausalObservation,
```

### lib\chernobog\worldModel\runtimeTypes.ts line 7

```text
    3: } from "../events/eventBus";
    4: import type {
    5:   ChernobogWorldStateRuntime,
    6:   WorldStateRecord,
>   7: } from "../worldState";
    8: import type {
    9:   WorldModelCausalHypothesis,
   10:   WorldModelCausalObservation,
   11:   WorldModelImpactAssessment,
```

### lib\chernobog\worldModel\runtimeTypes.ts line 14

```text
   10:   WorldModelCausalObservation,
   11:   WorldModelImpactAssessment,
   12: } from "./causalTypes";
   13: import type {
>  14:   WorldModelStatePrediction,
   15: } from "./predictionTypes";
   16: import type {
   17:   WorldModelTemporalSnapshot,
   18: } from "./temporalTypes";
```

### lib\chernobog\worldModel\runtimeTypes.ts line 15

```text
   11:   WorldModelImpactAssessment,
   12: } from "./causalTypes";
   13: import type {
   14:   WorldModelStatePrediction,
>  15: } from "./predictionTypes";
   16: import type {
   17:   WorldModelTemporalSnapshot,
   18: } from "./temporalTypes";
   19: import type {
```

### lib\chernobog\worldModel\runtimeTypes.ts line 17

```text
   13: import type {
   14:   WorldModelStatePrediction,
   15: } from "./predictionTypes";
   16: import type {
>  17:   WorldModelTemporalSnapshot,
   18: } from "./temporalTypes";
   19: import type {
   20:   WorldModelSnapshot,
   21: } from "./types";
```

### lib\chernobog\worldModel\runtimeTypes.ts line 20

```text
   16: import type {
   17:   WorldModelTemporalSnapshot,
   18: } from "./temporalTypes";
   19: import type {
>  20:   WorldModelSnapshot,
   21: } from "./types";
   22: 
   23: export interface WorldModelRuntimeIngestResult {
   24:   records: number;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 23

```text
   19: import type {
   20:   WorldModelSnapshot,
   21: } from "./types";
   22: 
>  23: export interface WorldModelRuntimeIngestResult {
   24:   records: number;
   25:   entityWrites: number;
   26:   relationshipWrites: number;
   27:   skippedRelationships: number;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 29

```text
   25:   entityWrites: number;
   26:   relationshipWrites: number;
   27:   skippedRelationships: number;
   28:   temporalWrites: number;
>  29:   predictionWrites: number;
   30: }
   31: 
   32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 32

```text
   28:   temporalWrites: number;
   29:   predictionWrites: number;
   30: }
   31: 
>  32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
   34:   graph: WorldModelSnapshot;
   35:   temporal: WorldModelTemporalSnapshot;
   36:   predictions: WorldModelStatePrediction[];
```

### lib\chernobog\worldModel\runtimeTypes.ts line 34

```text
   30: }
   31: 
   32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
>  34:   graph: WorldModelSnapshot;
   35:   temporal: WorldModelTemporalSnapshot;
   36:   predictions: WorldModelStatePrediction[];
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
```

### lib\chernobog\worldModel\runtimeTypes.ts line 35

```text
   31: 
   32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
   34:   graph: WorldModelSnapshot;
>  35:   temporal: WorldModelTemporalSnapshot;
   36:   predictions: WorldModelStatePrediction[];
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
   39: }
```

### lib\chernobog\worldModel\runtimeTypes.ts line 36

```text
   32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
   34:   graph: WorldModelSnapshot;
   35:   temporal: WorldModelTemporalSnapshot;
>  36:   predictions: WorldModelStatePrediction[];
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
   39: }
   40: 
```

### lib\chernobog\worldModel\runtimeTypes.ts line 41

```text
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
   39: }
   40: 
>  41: export interface ChernobogWorldModelRuntimeOptions {
   42:   clock?: () => Date;
   43: }
   44: 
   45: export interface StartChernobogWorldModelRuntimeOptions {
```

### lib\chernobog\worldModel\runtimeTypes.ts line 45

```text
   41: export interface ChernobogWorldModelRuntimeOptions {
   42:   clock?: () => Date;
   43: }
   44: 
>  45: export interface StartChernobogWorldModelRuntimeOptions {
   46:   worldStateRuntime: Pick<
   47:     ChernobogWorldStateRuntime,
   48:     "engine"
   49:   >;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 46

```text
   42:   clock?: () => Date;
   43: }
   44: 
   45: export interface StartChernobogWorldModelRuntimeOptions {
>  46:   worldStateRuntime: Pick<
   47:     ChernobogWorldStateRuntime,
   48:     "engine"
   49:   >;
   50:   eventBus: Pick<
```

### lib\chernobog\worldModel\runtimeTypes.ts line 47

```text
   43: }
   44: 
   45: export interface StartChernobogWorldModelRuntimeOptions {
   46:   worldStateRuntime: Pick<
>  47:     ChernobogWorldStateRuntime,
   48:     "engine"
   49:   >;
   50:   eventBus: Pick<
   51:     ChernobogEventBus,
```

### lib\chernobog\worldModel\runtimeTypes.ts line 54

```text
   50:   eventBus: Pick<
   51:     ChernobogEventBus,
   52:     "subscribe"
   53:   >;
>  54:   model?: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   55: }
   56: 
   57: export interface ChernobogWorldModelProductionRuntime {
   58:   model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 57

```text
   53:   >;
   54:   model?: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   55: }
   56: 
>  57: export interface ChernobogWorldModelProductionRuntime {
   58:   model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   59:   ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
   60:   stop(): void;
   61: }
```

### lib\chernobog\worldModel\runtimeTypes.ts line 58

```text
   54:   model?: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   55: }
   56: 
   57: export interface ChernobogWorldModelProductionRuntime {
>  58:   model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   59:   ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
   60:   stop(): void;
   61: }
   62: 
```

### lib\chernobog\worldModel\runtimeTypes.ts line 59

```text
   55: }
   56: 
   57: export interface ChernobogWorldModelProductionRuntime {
   58:   model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
>  59:   ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
   60:   stop(): void;
   61: }
   62: 
   63: export type WorldModelWorldStateReader =
```

### lib\chernobog\worldModel\runtimeTypes.ts line 63

```text
   59:   ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
   60:   stop(): void;
   61: }
   62: 
>  63: export type WorldModelWorldStateReader =
   64:   () => WorldStateRecord[];
   65: 
   66: export interface WorldModelRuntimeImpactResult {
   67:   assessment: WorldModelImpactAssessment;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 64

```text
   60:   stop(): void;
   61: }
   62: 
   63: export type WorldModelWorldStateReader =
>  64:   () => WorldStateRecord[];
   65: 
   66: export interface WorldModelRuntimeImpactResult {
   67:   assessment: WorldModelImpactAssessment;
   68: }
```

### lib\chernobog\worldModel\runtimeTypes.ts line 66

```text
   62: 
   63: export type WorldModelWorldStateReader =
   64:   () => WorldStateRecord[];
   65: 
>  66: export interface WorldModelRuntimeImpactResult {
   67:   assessment: WorldModelImpactAssessment;
   68: }
```

### lib\chernobog\worldModel\temporalModel.ts line 4

```text
    1: import type {
    2:   WorldModelStateTransition,
    3:   WorldModelTemporalObservation,
>   4:   WorldModelTemporalSnapshot,
    5:   WorldModelTransitionSummary,
    6: } from "./temporalTypes";
    7: import {
    8:   normalizeWorldModelEntityId,
```

### lib\chernobog\worldModel\temporalModel.ts line 284

```text
  280:       averageDwellMs,
  281:     };
  282:   }
  283: 
> 284:   snapshot():
  285:     WorldModelTemporalSnapshot {
  286:     return {
  287:       observations:
  288:         this.list(),
```

### lib\chernobog\worldModel\temporalModel.ts line 285

```text
  281:     };
  282:   }
  283: 
  284:   snapshot():
> 285:     WorldModelTemporalSnapshot {
  286:     return {
  287:       observations:
  288:         this.list(),
  289:       transitions:
```

### lib\chernobog\worldModel\temporalObservation.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3:   WorldStateJsonValue,
    4: } from "../worldState";
    5: import type {
    6:   WorldModelTemporalObservation,
```

### lib\chernobog\worldModel\temporalObservation.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3:   WorldStateJsonValue,
    4: } from "../worldState";
    5: import type {
    6:   WorldModelTemporalObservation,
    7: } from "./temporalTypes";
```

### lib\chernobog\worldModel\temporalObservation.ts line 4

```text
    1: import type {
    2:   WorldStateRecord,
    3:   WorldStateJsonValue,
>   4: } from "../worldState";
    5: import type {
    6:   WorldModelTemporalObservation,
    7: } from "./temporalTypes";
    8: import {
```

### lib\chernobog\worldModel\temporalObservation.ts line 56

```text
   52:   return value;
   53: }
   54: 
   55: function cloneJsonValue(
>  56:   value: WorldStateJsonValue,
   57: ): WorldStateJsonValue {
   58:   return structuredClone(value);
   59: }
   60: 
```

### lib\chernobog\worldModel\temporalObservation.ts line 57

```text
   53: }
   54: 
   55: function cloneJsonValue(
   56:   value: WorldStateJsonValue,
>  57: ): WorldStateJsonValue {
   58:   return structuredClone(value);
   59: }
   60: 
   61: export function createWorldModelTemporalObservation(
```

### lib\chernobog\worldModel\temporalObservation.ts line 66

```text
   62:   input: {
   63:     id: string;
   64:     entityId: string;
   65:     stateKey: string;
>  66:     value: WorldStateJsonValue;
   67:     observedAt: string;
   68:     confidence?: number;
   69:     evidenceEventIds?: string[];
   70:     evidenceWorldStateKeys?: string[];
```

### lib\chernobog\worldModel\temporalObservation.ts line 70

```text
   66:     value: WorldStateJsonValue;
   67:     observedAt: string;
   68:     confidence?: number;
   69:     evidenceEventIds?: string[];
>  70:     evidenceWorldStateKeys?: string[];
   71:   },
   72: ): WorldModelTemporalObservation {
   73:   const id = input.id.trim();
   74:   const stateKey =
```

### lib\chernobog\worldModel\temporalObservation.ts line 111

```text
  107:     evidenceEventIds:
  108:       normalizeList(
  109:         input.evidenceEventIds,
  110:       ),
> 111:     evidenceWorldStateKeys:
  112:       normalizeList(
  113:         input.evidenceWorldStateKeys,
  114:       ),
  115:   };
```

### lib\chernobog\worldModel\temporalObservation.ts line 113

```text
  109:         input.evidenceEventIds,
  110:       ),
  111:     evidenceWorldStateKeys:
  112:       normalizeList(
> 113:         input.evidenceWorldStateKeys,
  114:       ),
  115:   };
  116: }
  117: 
```

### lib\chernobog\worldModel\temporalObservation.ts line 118

```text
  114:       ),
  115:   };
  116: }
  117: 
> 118: export function temporalObservationFromWorldState(
  119:   entityId: string,
  120:   record: WorldStateRecord,
  121: ): WorldModelTemporalObservation {
  122:   return createWorldModelTemporalObservation({
```

### lib\chernobog\worldModel\temporalObservation.ts line 120

```text
  116: }
  117: 
  118: export function temporalObservationFromWorldState(
  119:   entityId: string,
> 120:   record: WorldStateRecord,
  121: ): WorldModelTemporalObservation {
  122:   return createWorldModelTemporalObservation({
  123:     id:
  124:       `temporal:${entityId}:${record.key}:${record.observedAt}`,
```

### lib\chernobog\worldModel\temporalObservation.ts line 140

```text
  136:         ? [
  137:             record.provenance.eventId,
  138:           ]
  139:         : [],
> 140:     evidenceWorldStateKeys: [
  141:       record.key,
  142:     ],
  143:   });
  144: }
```

### lib\chernobog\worldModel\temporalTypes.ts line 2

```text
    1: import type {
>   2:   WorldStateJsonValue,
    3: } from "../worldState";
    4: 
    5: export interface WorldModelTemporalObservation {
    6:   id: string;
```

### lib\chernobog\worldModel\temporalTypes.ts line 3

```text
    1: import type {
    2:   WorldStateJsonValue,
>   3: } from "../worldState";
    4: 
    5: export interface WorldModelTemporalObservation {
    6:   id: string;
    7:   entityId: string;
```

### lib\chernobog\worldModel\temporalTypes.ts line 9

```text
    5: export interface WorldModelTemporalObservation {
    6:   id: string;
    7:   entityId: string;
    8:   stateKey: string;
>   9:   value: WorldStateJsonValue;
   10:   observedAt: string;
   11:   confidence: number;
   12:   evidenceEventIds: string[];
   13:   evidenceWorldStateKeys: string[];
```

### lib\chernobog\worldModel\temporalTypes.ts line 13

```text
    9:   value: WorldStateJsonValue;
   10:   observedAt: string;
   11:   confidence: number;
   12:   evidenceEventIds: string[];
>  13:   evidenceWorldStateKeys: string[];
   14: }
   15: 
   16: export interface WorldModelStateTransition {
   17:   id: string;
```

### lib\chernobog\worldModel\temporalTypes.ts line 20

```text
   16: export interface WorldModelStateTransition {
   17:   id: string;
   18:   entityId: string;
   19:   stateKey: string;
>  20:   fromValue: WorldStateJsonValue;
   21:   toValue: WorldStateJsonValue;
   22:   fromObservedAt: string;
   23:   toObservedAt: string;
   24:   durationMs: number;
```

### lib\chernobog\worldModel\temporalTypes.ts line 21

```text
   17:   id: string;
   18:   entityId: string;
   19:   stateKey: string;
   20:   fromValue: WorldStateJsonValue;
>  21:   toValue: WorldStateJsonValue;
   22:   fromObservedAt: string;
   23:   toObservedAt: string;
   24:   durationMs: number;
   25:   confidence: number;
```

### lib\chernobog\worldModel\temporalTypes.ts line 36

```text
   32:   transitionCount: number;
   33:   distinctStateCount: number;
   34:   firstObservedAt?: string;
   35:   lastObservedAt?: string;
>  36:   latestValue?: WorldStateJsonValue;
   37:   averageDwellMs?: number;
   38: }
   39: 
   40: export interface WorldModelTemporalSnapshot {
```

### lib\chernobog\worldModel\temporalTypes.ts line 40

```text
   36:   latestValue?: WorldStateJsonValue;
   37:   averageDwellMs?: number;
   38: }
   39: 
>  40: export interface WorldModelTemporalSnapshot {
   41:   observations: WorldModelTemporalObservation[];
   42:   transitions: WorldModelStateTransition[];
   43: }
```

### lib\chernobog\worldModel\types.ts line 5

```text
    1: export type WorldModelEntityKind =
    2:   | "user"
    3:   | "system"
    4:   | "service"
>   5:   | "project"
    6:   | "repository"
    7:   | "model"
    8:   | "storage"
    9:   | "backup"
```

### lib\chernobog\worldModel\types.ts line 16

```text
   12:   | "unknown";
   13: 
   14: export interface WorldModelEvidence {
   15:   eventIds: string[];
>  16:   worldStateKeys: string[];
   17:   lessonKeys: string[];
   18: }
   19: 
   20: export interface WorldModelEntity {
```

### lib\chernobog\worldModel\types.ts line 71

```text
   67:   relationship: WorldModelRelationship;
   68:   direction: "outgoing" | "incoming" | "undirected";
   69: }
   70: 
>  71: export interface WorldModelSnapshot {
   72:   entities: WorldModelEntity[];
   73:   relationships: WorldModelRelationship[];
   74: }
```

### lib\chernobog\worldModel\validation.ts line 27

```text
   23: ): WorldModelEvidence {
   24:   return {
   25:     eventIds:
   26:       normalizeList(input?.eventIds),
>  27:     worldStateKeys:
   28:       normalizeList(
   29:         input?.worldStateKeys,
   30:       ),
   31:     lessonKeys:
```

### lib\chernobog\worldModel\validation.ts line 29

```text
   25:     eventIds:
   26:       normalizeList(input?.eventIds),
   27:     worldStateKeys:
   28:       normalizeList(
>  29:         input?.worldStateKeys,
   30:       ),
   31:     lessonKeys:
   32:       normalizeList(
   33:         input?.lessonKeys,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelCausalHypothesis,
    6:   WorldModelCausalObservation,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3: } from "../worldState";
    4: import type {
    5:   WorldModelCausalHypothesis,
    6:   WorldModelCausalObservation,
    7:   WorldModelImpactAssessment,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 19

```text
   15: import {
   16:   ChernobogWorldModelGraph,
   17: } from "./graph";
   18: import {
>  19:   ChernobogWorldModelPredictionStore,
   20: } from "./predictionStore";
   21: import {
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 20

```text
   16:   ChernobogWorldModelGraph,
   17: } from "./graph";
   18: import {
   19:   ChernobogWorldModelPredictionStore,
>  20: } from "./predictionStore";
   21: import {
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 22

```text
   18: import {
   19:   ChernobogWorldModelPredictionStore,
   20: } from "./predictionStore";
   21: import {
>  22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 23

```text
   19:   ChernobogWorldModelPredictionStore,
   20: } from "./predictionStore";
   21: import {
   22:   predictNextWorldModelState,
>  23: } from "./predictiveModel";
   24: import {
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 25

```text
   21: import {
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
>  25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 26

```text
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
   25:   ChernobogWorldModelProjector,
>  26: } from "./projector";
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
   30:   WorldModelRuntimeSnapshot,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 28

```text
   24: import {
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
>  28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
   30:   WorldModelRuntimeSnapshot,
   31: } from "./runtimeTypes";
   32: import {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 29

```text
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
>  29:   WorldModelRuntimeIngestResult,
   30:   WorldModelRuntimeSnapshot,
   31: } from "./runtimeTypes";
   32: import {
   33:   ChernobogWorldModelTemporalModel,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 30

```text
   26: } from "./projector";
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
>  30:   WorldModelRuntimeSnapshot,
   31: } from "./runtimeTypes";
   32: import {
   33:   ChernobogWorldModelTemporalModel,
   34: } from "./temporalModel";
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 31

```text
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
   30:   WorldModelRuntimeSnapshot,
>  31: } from "./runtimeTypes";
   32: import {
   33:   ChernobogWorldModelTemporalModel,
   34: } from "./temporalModel";
   35: import {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 36

```text
   32: import {
   33:   ChernobogWorldModelTemporalModel,
   34: } from "./temporalModel";
   35: import {
>  36:   temporalObservationFromWorldState,
   37: } from "./temporalObservation";
   38: import type {
   39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 39

```text
   35: import {
   36:   temporalObservationFromWorldState,
   37: } from "./temporalObservation";
   38: import type {
>  39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
   41: 
   42: function canonicalEntityIdForWorldState(
   43:   record: WorldStateRecord,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 40

```text
   36:   temporalObservationFromWorldState,
   37: } from "./temporalObservation";
   38: import type {
   39:   WorldModelStatePrediction,
>  40: } from "./predictionTypes";
   41: 
   42: function canonicalEntityIdForWorldState(
   43:   record: WorldStateRecord,
   44: ): string {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 42

```text
   38: import type {
   39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
   41: 
>  42: function canonicalEntityIdForWorldState(
   43:   record: WorldStateRecord,
   44: ): string {
   45:   const parts =
   46:     record.key
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 43

```text
   39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
   41: 
   42: function canonicalEntityIdForWorldState(
>  43:   record: WorldStateRecord,
   44: ): string {
   45:   const parts =
   46:     record.key
   47:       .split(".")
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 61

```text
   57:       return name
   58:         ? `service:${name}`
   59:         : `world-state:${record.key}`;
   60: 
>  61:     case "project":
   62:       return name
   63:         ? `project:${name}`
   64:         : `world-state:${record.key}`;
   65: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 63

```text
   59:         : `world-state:${record.key}`;
   60: 
   61:     case "project":
   62:       return name
>  63:         ? `project:${name}`
   64:         : `world-state:${record.key}`;
   65: 
   66:     case "repository":
   67:       return name
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 108

```text
  104:     )
  105:   );
  106: }
  107: 
> 108: export class ChernobogWorldModelRuntime {
  109:   readonly graph:
  110:     ChernobogWorldModelGraph;
  111: 
  112:   readonly projector:
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 112

```text
  108: export class ChernobogWorldModelRuntime {
  109:   readonly graph:
  110:     ChernobogWorldModelGraph;
  111: 
> 112:   readonly projector:
  113:     ChernobogWorldModelProjector;
  114: 
  115:   readonly temporal =
  116:     new ChernobogWorldModelTemporalModel();
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 113

```text
  109:   readonly graph:
  110:     ChernobogWorldModelGraph;
  111: 
  112:   readonly projector:
> 113:     ChernobogWorldModelProjector;
  114: 
  115:   readonly temporal =
  116:     new ChernobogWorldModelTemporalModel();
  117: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 118

```text
  114: 
  115:   readonly temporal =
  116:     new ChernobogWorldModelTemporalModel();
  117: 
> 118:   readonly predictions =
  119:     new ChernobogWorldModelPredictionStore();
  120: 
  121:   private readonly causalObservations =
  122:     new Map<
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 119

```text
  115:   readonly temporal =
  116:     new ChernobogWorldModelTemporalModel();
  117: 
  118:   readonly predictions =
> 119:     new ChernobogWorldModelPredictionStore();
  120: 
  121:   private readonly causalObservations =
  122:     new Map<
  123:       string,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 138

```text
  134:     () => Date;
  135: 
  136:   constructor(
  137:     options:
> 138:       ChernobogWorldModelRuntimeOptions = {},
  139:   ) {
  140:     this.graph =
  141:       new ChernobogWorldModelGraph();
  142: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 143

```text
  139:   ) {
  140:     this.graph =
  141:       new ChernobogWorldModelGraph();
  142: 
> 143:     this.projector =
  144:       new ChernobogWorldModelProjector({
  145:         graph:
  146:           this.graph,
  147:       });
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 144

```text
  140:     this.graph =
  141:       new ChernobogWorldModelGraph();
  142: 
  143:     this.projector =
> 144:       new ChernobogWorldModelProjector({
  145:         graph:
  146:           this.graph,
  147:       });
  148: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 154

```text
  150:       options.clock ??
  151:       (() => new Date());
  152:   }
  153: 
> 154:   ingestWorldState(
  155:     records:
  156:       readonly WorldStateRecord[],
  157:   ): WorldModelRuntimeIngestResult {
  158:     const projection =
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 156

```text
  152:   }
  153: 
  154:   ingestWorldState(
  155:     records:
> 156:       readonly WorldStateRecord[],
  157:   ): WorldModelRuntimeIngestResult {
  158:     const projection =
  159:       this.projector.project(
  160:         records,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 157

```text
  153: 
  154:   ingestWorldState(
  155:     records:
  156:       readonly WorldStateRecord[],
> 157:   ): WorldModelRuntimeIngestResult {
  158:     const projection =
  159:       this.projector.project(
  160:         records,
  161:       );
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 158

```text
  154:   ingestWorldState(
  155:     records:
  156:       readonly WorldStateRecord[],
  157:   ): WorldModelRuntimeIngestResult {
> 158:     const projection =
  159:       this.projector.project(
  160:         records,
  161:       );
  162: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 159

```text
  155:     records:
  156:       readonly WorldStateRecord[],
  157:   ): WorldModelRuntimeIngestResult {
  158:     const projection =
> 159:       this.projector.project(
  160:         records,
  161:       );
  162: 
  163:     let temporalWrites = 0;
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 164

```text
  160:         records,
  161:       );
  162: 
  163:     let temporalWrites = 0;
> 164:     let predictionWrites = 0;
  165: 
  166:     const ordered =
  167:       [...records].sort(
  168:         (left, right) =>
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 182

```text
  178:       const record
  179:       of ordered
  180:     ) {
  181:       const entityId =
> 182:         canonicalEntityIdForWorldState(
  183:           record,
  184:         );
  185: 
  186:       const observation =
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 187

```text
  183:           record,
  184:         );
  185: 
  186:       const observation =
> 187:         temporalObservationFromWorldState(
  188:           entityId,
  189:           record,
  190:         );
  191: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 198

```text
  194:       );
  195: 
  196:       temporalWrites += 1;
  197: 
> 198:       const prediction =
  199:         predictNextWorldModelState(
  200:           this.temporal,
  201:           entityId,
  202:           record.key,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 199

```text
  195: 
  196:       temporalWrites += 1;
  197: 
  198:       const prediction =
> 199:         predictNextWorldModelState(
  200:           this.temporal,
  201:           entityId,
  202:           record.key,
  203:           {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 209

```text
  205:               this.clock(),
  206:           },
  207:         );
  208: 
> 209:       if (prediction) {
  210:         this.predictions.upsert(
  211:           prediction,
  212:         );
  213: 
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 210

```text
  206:           },
  207:         );
  208: 
  209:       if (prediction) {
> 210:         this.predictions.upsert(
  211:           prediction,
  212:         );
  213: 
  214:         predictionWrites += 1;
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 211

```text
  207:         );
  208: 
  209:       if (prediction) {
  210:         this.predictions.upsert(
> 211:           prediction,
  212:         );
  213: 
  214:         predictionWrites += 1;
  215:       }
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 214

```text
  210:         this.predictions.upsert(
  211:           prediction,
  212:         );
  213: 
> 214:         predictionWrites += 1;
  215:       }
  216:     }
  217: 
  218:     return {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 222

```text
  218:     return {
  219:       records:
  220:         ordered.length,
  221:       entityWrites:
> 222:         projection.entityWrites,
  223:       relationshipWrites:
  224:         projection.relationshipWrites,
  225:       skippedRelationships:
  226:         projection.skippedRelationships,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 224

```text
  220:         ordered.length,
  221:       entityWrites:
  222:         projection.entityWrites,
  223:       relationshipWrites:
> 224:         projection.relationshipWrites,
  225:       skippedRelationships:
  226:         projection.skippedRelationships,
  227:       temporalWrites,
  228:       predictionWrites,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 226

```text
  222:         projection.entityWrites,
  223:       relationshipWrites:
  224:         projection.relationshipWrites,
  225:       skippedRelationships:
> 226:         projection.skippedRelationships,
  227:       temporalWrites,
  228:       predictionWrites,
  229:     };
  230:   }
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 228

```text
  224:         projection.relationshipWrites,
  225:       skippedRelationships:
  226:         projection.skippedRelationships,
  227:       temporalWrites,
> 228:       predictionWrites,
  229:     };
  230:   }
  231: 
  232:   addCausalObservation(
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 297

```text
  293:       sourceEntityId,
  294:     );
  295:   }
  296: 
> 297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
  300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 300

```text
  296: 
  297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
> 300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
  302:       predictNextWorldModelState(
  303:         this.temporal,
  304:         entityId,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 302

```text
  298:     entityId: string,
  299:     stateKey: string,
  300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
> 302:       predictNextWorldModelState(
  303:         this.temporal,
  304:         entityId,
  305:         stateKey,
  306:         {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 316

```text
  312:     if (!latest) {
  313:       return undefined;
  314:     }
  315: 
> 316:     this.predictions.upsert(
  317:       latest,
  318:     );
  319: 
  320:     return structuredClone(
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 325

```text
  321:       latest,
  322:     );
  323:   }
  324: 
> 325:   snapshot():
  326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 326

```text
  322:     );
  323:   }
  324: 
  325:   snapshot():
> 326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 331

```text
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
> 331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 333

```text
  329:         this.clock().toISOString(),
  330:       graph:
  331:         this.graph.snapshot(),
  332:       temporal:
> 333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 334

```text
  330:       graph:
  331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
> 334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
  338:       causalHypotheses: [
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 335

```text
  331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
  334:       predictions:
> 335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
  338:       causalHypotheses: [
  339:         ...this.causalHypotheses.values(),
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 2

```text
    1: import type {
>   2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelEntityInput,
    6: } from "./types";
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 3

```text
    1: import type {
    2:   WorldStateRecord,
>   3: } from "../worldState";
    4: import type {
    5:   WorldModelEntityInput,
    6: } from "./types";
    7: 
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 14

```text
   10: ): WorldModelEntityInput["kind"] {
   11:   switch (namespace) {
   12:     case "service":
   13:       return "service";
>  14:     case "project":
   15:       return "project";
   16:     case "model":
   17:       return "model";
   18:     case "storage":
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 15

```text
   11:   switch (namespace) {
   12:     case "service":
   13:       return "service";
   14:     case "project":
>  15:       return "project";
   16:     case "model":
   17:       return "model";
   18:     case "storage":
   19:       return "storage";
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 26

```text
   22:     case "repository":
   23:       return "repository";
   24:     case "desktop":
   25:       return "application";
>  26:     case "runtime":
   27:     case "system":
   28:       return "system";
   29:     default:
   30:       return "fact";
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 34

```text
   30:       return "fact";
   31:   }
   32: }
   33: 
>  34: export function worldModelEntityFromWorldState(
   35:   record: WorldStateRecord,
   36: ): WorldModelEntityInput {
   37:   return {
   38:     id:
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 35

```text
   31:   }
   32: }
   33: 
   34: export function worldModelEntityFromWorldState(
>  35:   record: WorldStateRecord,
   36: ): WorldModelEntityInput {
   37:   return {
   38:     id:
   39:       `world-state:${record.key}`,
```

### lib\chernobog\worldModel\worldStateGrounding.ts line 61

```text
   57:           record.freshness,
   58:         ),
   59:     },
   60:     evidence: {
>  61:       worldStateKeys: [
   62:         record.key,
   63:       ],
   64:       eventIds:
   65:         record.provenance?.eventId
```


## API / debug routes exposing World State

Pattern: `worldState|World State|world state|snapshot|worldModel|World Model`

### app\api\chernobog-inc\missions\route.ts line 4

```text
    1: import { NextRequest, NextResponse } from "next/server";
    2: import {
    3:   createChernobogMission,
>   4:   getChernobogMissionStoreSnapshot,
    5:   readChernobogMissions,
    6: } from "@/lib/modules/vault-brain/chernobogMissionStore";
    7: import { CreateChernobogMissionInput } from "@/lib/modules/vault-brain/chernobogMissionTypes";
    8: 
```

### app\api\chernobog-inc\missions\route.ts line 31

```text
   27:       sourceRef: body.sourceRef,
   28:     });
   29:     return NextResponse.json({ ok: true, mission });
   30:   } catch (error) {
>  31:     const snapshot = await getChernobogMissionStoreSnapshot();
   32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: error instanceof Error ? error.message : "Unknown mission creation error.",
```

### app\api\chernobog-inc\missions\route.ts line 36

```text
   32:     return NextResponse.json(
   33:       {
   34:         ok: false,
   35:         error: error instanceof Error ? error.message : "Unknown mission creation error.",
>  36:         snapshot,
   37:       },
   38:       { status: 400 }
   39:     );
   40:   }
```

### app\api\cognition\route.ts line 22

```text
   18: 
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
>  22:       snapshot:
   23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
```

### app\api\cognition\route.ts line 23

```text
   19:     return NextResponse.json({
   20:       ok: true,
   21:       cycle,
   22:       snapshot:
>  23:         cognition.snapshot(),
   24:       executionBoundary: {
   25:         executesTools: false,
   26:         defaultGovernance:
   27:           "advisory-only",
```

### app\api\discovery\itch\taxonomy\route.ts line 25

```text
   21:     bootstrapItchDiscovery(database);
   22:     const repository = new ItchAdultTaxonomyRepository(database);
   23:     const url = new URL(request.url);
   24:     const status = optionalString(url.searchParams.get("uncategorisedStatus"), "uncategorisedStatus");
>  25:     const snapshot = repository.getSnapshot();
   26:     return NextResponse.json({
   27:       ...snapshot,
   28:       uncategorised: status === "pending" || status === "mapped" || status === "ignored"
   29:         ? repository.listUncategorised(status)
```

### app\api\discovery\itch\taxonomy\route.ts line 27

```text
   23:     const url = new URL(request.url);
   24:     const status = optionalString(url.searchParams.get("uncategorisedStatus"), "uncategorisedStatus");
   25:     const snapshot = repository.getSnapshot();
   26:     return NextResponse.json({
>  27:       ...snapshot,
   28:       uncategorised: status === "pending" || status === "mapped" || status === "ignored"
   29:         ? repository.listUncategorised(status)
   30:         : snapshot.uncategorised,
   31:     });
```

### app\api\discovery\itch\taxonomy\route.ts line 30

```text
   26:     return NextResponse.json({
   27:       ...snapshot,
   28:       uncategorised: status === "pending" || status === "mapped" || status === "ignored"
   29:         ? repository.listUncategorised(status)
>  30:         : snapshot.uncategorised,
   31:     });
   32:   } catch (error) {
   33:     const failure = toItchApiFailure(error);
   34:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
```

### app\api\learning\route.ts line 18

```text
   14:       await getChernobogLearningRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
>  18:       snapshot:
   19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
```

### app\api\learning\route.ts line 19

```text
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
>  19:         learning.snapshot(),
   20:       boundaries: {
   21:         readOnlyEndpoint: true,
   22:         acceptsTrainingWrites: false,
   23:         rewritesPrompts: false,
```

### app\api\memory-sources\route.ts line 6

```text
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
>   6:   getUnifiedMemorySourceSnapshot,
    7: } from "@/lib/chernobog/memory-architecture";
    8: 
    9: export const runtime = "nodejs";
   10: 
```

### app\api\memory-sources\route.ts line 14

```text
   10: 
   11: export async function GET() {
   12:   try {
   13:     const memory =
>  14:       getUnifiedMemorySourceSnapshot();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       memory,
```

### app\api\tool-catalog\route.ts line 6

```text
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
>   6:   getToolCatalogSnapshot,
    7: } from "@/lib/chernobog/execution";
    8: 
    9: export const runtime = "nodejs";
   10: 
```

### app\api\tool-catalog\route.ts line 14

```text
   10: 
   11: export async function GET() {
   12:   try {
   13:     const catalog =
>  14:       getToolCatalogSnapshot();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       catalog,
```

### app\api\world-model\route.ts line 6

```text
    2:   NextResponse,
    3: } from "next/server";
    4: 
    5: import {
>   6:   getChernobogWorldModelRuntime,
    7: } from "@/lib/chernobog/worldModel";
    8: 
    9: export const runtime = "nodejs";
   10: 
```

### app\api\world-model\route.ts line 7

```text
    3: } from "next/server";
    4: 
    5: import {
    6:   getChernobogWorldModelRuntime,
>   7: } from "@/lib/chernobog/worldModel";
    8: 
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
```

### app\api\world-model\route.ts line 13

```text
    9: export const runtime = "nodejs";
   10: 
   11: export async function GET() {
   12:   try {
>  13:     const worldModel =
   14:       await getChernobogWorldModelRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
```

### app\api\world-model\route.ts line 14

```text
   10: 
   11: export async function GET() {
   12:   try {
   13:     const worldModel =
>  14:       await getChernobogWorldModelRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
```

### app\api\world-model\route.ts line 18

```text
   14:       await getChernobogWorldModelRuntime();
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
>  18:       snapshot:
   19:         worldModel.model.snapshot(),
   20:       boundaries: {
   21:         sourceOfTruth:
   22:           "11G World State",
```

### app\api\world-model\route.ts line 19

```text
   15: 
   16:     return NextResponse.json({
   17:       ok: true,
   18:       snapshot:
>  19:         worldModel.model.snapshot(),
   20:       boundaries: {
   21:         sourceOfTruth:
   22:           "11G World State",
   23:         readOnlyEndpoint: true,
```

### app\api\world-model\route.ts line 22

```text
   18:       snapshot:
   19:         worldModel.model.snapshot(),
   20:       boundaries: {
   21:         sourceOfTruth:
>  22:           "11G World State",
   23:         readOnlyEndpoint: true,
   24:         predictionsAreFacts: false,
   25:         causalHypothesesAreFacts: false,
   26:         executesActions: false,
```

### app\api\world-state\route.ts line 7

```text
    3:   NextResponse,
    4: } from "next/server";
    5: 
    6: import {
>   7:   WorldStateSnapshotCorruptionError,
    8:   getChernobogWorldStateRuntime,
    9:   parseWorldStateReadQuery,
   10:   queryPersistedWorldState,
   11: } from "@/lib/chernobog/worldState";
```

### app\api\world-state\route.ts line 8

```text
    4: } from "next/server";
    5: 
    6: import {
    7:   WorldStateSnapshotCorruptionError,
>   8:   getChernobogWorldStateRuntime,
    9:   parseWorldStateReadQuery,
   10:   queryPersistedWorldState,
   11: } from "@/lib/chernobog/worldState";
   12: 
```

### app\api\world-state\route.ts line 9

```text
    5: 
    6: import {
    7:   WorldStateSnapshotCorruptionError,
    8:   getChernobogWorldStateRuntime,
>   9:   parseWorldStateReadQuery,
   10:   queryPersistedWorldState,
   11: } from "@/lib/chernobog/worldState";
   12: 
   13: export const runtime = "nodejs";
```

### app\api\world-state\route.ts line 10

```text
    6: import {
    7:   WorldStateSnapshotCorruptionError,
    8:   getChernobogWorldStateRuntime,
    9:   parseWorldStateReadQuery,
>  10:   queryPersistedWorldState,
   11: } from "@/lib/chernobog/worldState";
   12: 
   13: export const runtime = "nodejs";
   14: 
```

### app\api\world-state\route.ts line 11

```text
    7:   WorldStateSnapshotCorruptionError,
    8:   getChernobogWorldStateRuntime,
    9:   parseWorldStateReadQuery,
   10:   queryPersistedWorldState,
>  11: } from "@/lib/chernobog/worldState";
   12: 
   13: export const runtime = "nodejs";
   14: 
   15: export async function GET(
```

### app\api\world-state\route.ts line 20

```text
   16:   request: NextRequest,
   17: ) {
   18:   try {
   19:     const query =
>  20:       parseWorldStateReadQuery(
   21:         request.nextUrl.searchParams,
   22:       );
   23: 
   24:     await getChernobogWorldStateRuntime();
```

### app\api\world-state\route.ts line 24

```text
   20:       parseWorldStateReadQuery(
   21:         request.nextUrl.searchParams,
   22:       );
   23: 
>  24:     await getChernobogWorldStateRuntime();
   25: 
   26:     const result =
   27:       await queryPersistedWorldState({
   28:         query,
```

### app\api\world-state\route.ts line 27

```text
   23: 
   24:     await getChernobogWorldStateRuntime();
   25: 
   26:     const result =
>  27:       await queryPersistedWorldState({
   28:         query,
   29:       });
   30: 
   31:     if (
```

### app\api\world-state\route.ts line 39

```text
   35:         {
   36:           ok: true,
   37:           status: "missing",
   38:           message:
>  39:             "No persisted World State snapshot exists yet.",
   40:           generatedAt:
   41:             result.generatedAt,
   42:           snapshotPath:
   43:             result.snapshotPath,
```

### app\api\world-state\route.ts line 42

```text
   38:           message:
   39:             "No persisted World State snapshot exists yet.",
   40:           generatedAt:
   41:             result.generatedAt,
>  42:           snapshotPath:
   43:             result.snapshotPath,
   44:           count: 0,
   45:           items: [],
   46:         },
```

### app\api\world-state\route.ts line 43

```text
   39:             "No persisted World State snapshot exists yet.",
   40:           generatedAt:
   41:             result.generatedAt,
   42:           snapshotPath:
>  43:             result.snapshotPath,
   44:           count: 0,
   45:           items: [],
   46:         },
   47:         {
```

### app\api\world-state\route.ts line 58

```text
   54:       ok: true,
   55:       status: "loaded",
   56:       generatedAt:
   57:         result.generatedAt,
>  58:       snapshotCreatedAt:
   59:         result.snapshotCreatedAt,
   60:       snapshotPath:
   61:         result.snapshotPath,
   62:       query,
```

### app\api\world-state\route.ts line 59

```text
   55:       status: "loaded",
   56:       generatedAt:
   57:         result.generatedAt,
   58:       snapshotCreatedAt:
>  59:         result.snapshotCreatedAt,
   60:       snapshotPath:
   61:         result.snapshotPath,
   62:       query,
   63:       result:
```

### app\api\world-state\route.ts line 60

```text
   56:       generatedAt:
   57:         result.generatedAt,
   58:       snapshotCreatedAt:
   59:         result.snapshotCreatedAt,
>  60:       snapshotPath:
   61:         result.snapshotPath,
   62:       query,
   63:       result:
   64:         result.result,
```

### app\api\world-state\route.ts line 61

```text
   57:         result.generatedAt,
   58:       snapshotCreatedAt:
   59:         result.snapshotCreatedAt,
   60:       snapshotPath:
>  61:         result.snapshotPath,
   62:       query,
   63:       result:
   64:         result.result,
   65:       diagnostics:
```

### app\api\world-state\route.ts line 71

```text
   67:     });
   68:   } catch (error) {
   69:     if (
   70:       error instanceof
>  71:       WorldStateSnapshotCorruptionError
   72:     ) {
   73:       return NextResponse.json(
   74:         {
   75:           ok: false,
```

### app\api\world-state\route.ts line 77

```text
   73:       return NextResponse.json(
   74:         {
   75:           ok: false,
   76:           error:
>  77:             "world_state_snapshot_corrupt",
   78:           message:
   79:             error.message,
   80:         },
   81:         {
```


## Existing 11G / World State verifier inventory

- `scripts\verify-chernobog-phase11-11g-a-world-state-foundation.ts`
- `scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts`
- `scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts`
- `scripts\verify-chernobog-phase11-11g-d-persistence-recovery.ts`
- `scripts\verify-chernobog-phase11-11g-e-state-query-layer.ts`
- `scripts\verify-chernobog-phase11-11g-f-full-integration.ts`

## Interpretation guide

- Persisted snapshots/entities with meaningful runtime observations + no pipeline references => 11G is populated but not bridged into conversational intelligence.
- No meaningful persisted/runtime observations despite publishers existing => 11G runtime population is the bottleneck.
- Pipeline references exist but query results are absent => query/scoping/freshness integration is the likely bottleneck.
- World Model depends on World State but World State is empty => fix 11G population/bridge before judging 11J reasoning.
