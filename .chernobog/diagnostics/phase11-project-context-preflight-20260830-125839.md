# Chernobog Phase 11 - Active Project Context Propagation Preflight

Generated: 2026-08-30T12:58:39.7715615+01:00

Repository: `C:\Users\adamt\Documents\chernobog-ai`

Purpose: map the existing local project identity path before modifying production code.

Invariant: reuse existing Project Operations identity; do not create a parallel project registry.

## Git state

```text
?? .chernobog/diagnostics/
```

## Core session and pipeline types

### `lib\chernobog\session\types.ts`

```text
   1: import type { WorkflowState } from "@/lib/chernobog/pipeline/types";
   2: import type { ActivePlan } from "@/lib/chernobog/planner/types";
   3: 
   4: 
   5: export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";
   6: 
   7: export type PendingDisambiguationKind =
   8:   | "file_selection"
   9:   | "path_scope"
  10:   | "generic_selection";
  11: 
  12: export type FileSearchResultRef = {
  13:   index: number;
  14:   path: string;
  15:   name: string;
  16:   extension?: string;
  17:   parentDir: string;
  18: };
  19: 
  20: export type FileSearchContext = {
  21:   query: string;
  22:   root?: string;
  23:   normalizedRoot?: string;
  24:   results: FileSearchResultRef[];
  25:   offset: number;
  26:   pageSize: number;
  27:   timestamp: string;
  28: };
  29: 
  30: export type FileSelectionContext = {
  31:   source: "search_result" | "explicit_path" | "recent_read";
  32:   path: string;
  33:   index?: number;
  34:   timestamp: string;
  35: };
  36: 
  37: export type FileReadContext = {
  38:   path: string;
  39:   preview?: string;
  40:   timestamp: string;
  41: };
  42: 
  43: export type FileContext = {
  44:   lastSearch?: FileSearchContext | null;
  45:   lastSelected?: FileSelectionContext | null;
  46:   lastRead?: FileReadContext | null;
  47: };
  48: 
  49: export type PendingDisambiguationOption = {
  50:   id: string;
  51:   label: string;
  52:   value: string;
  53:   meta?: Record<string, unknown>;
  54: };
  55: 
  56: export type PendingDisambiguation = {
  57:   kind: PendingDisambiguationKind;
  58:   prompt: string;
  59:   options: PendingDisambiguationOption[];
  60:   createdAt: string;
  61: };
  62: 
  63: export type SessionContext = {
  64:   sessionId: string;
  65:   lastUpdatedAt: string;
  66:   lastRoute?: RouteName;
  67:   lastTool?: {
  68:     name: string;
  69:     input?: unknown;
  70:   } | null;
  71:   lastToolResult?: {
  72:     summary?: string;
  73:     ok?: boolean;
  74:   } | null;
  75:   pendingDisambiguation?: PendingDisambiguation | null;
  76:   fileContext?: FileContext | null;
  77:   workflow: WorkflowState;
  78:   activePlan?: ActivePlan | null;
  79: };
  80: 
  81: export type FollowUpResolution =
  82:   | { kind: "none" }
  83:   | {
  84:       kind: "resolved_tool_action";
  85:       tool:
  86:         | "find_files"
  87:         | "read_text_file"
  88:         | "open_file"
  89:         | "open_folder"
  90:         | "open_app"
  91:         | "open_url"
  92:         | "list_files"
  93:         | "get_time";
  94:       input: Record<string, unknown>;
  95:     }
  96:   | {
  97:       kind: "needs_disambiguation";
  98:       message: string;
  99:       pending: PendingDisambiguation;
 100:     };
 101: 
 102: export function createDefaultWorkflow(): WorkflowState {
 103:   return { kind: "none" };
 104: }
```

### `lib\chernobog\session\store.ts`

```text
   1: import db from "@/lib/chernobog/db";
   2: import type { WorkflowState } from "@/lib/chernobog/pipeline/types";
   3: import { createDefaultWorkflow, type SessionContext } from "./types";
   4: 
   5: const sessionCache = new Map<string, SessionContext>();
   6: 
   7: type SessionStateRow = {
   8:   session_id: string;
   9:   state_json: string;
  10:   updated_at: string;
  11: };
  12: 
  13: const DEFAULT_SESSION_ID = "local-default";
  14: const PENDING_DISAMBIGUATION_TTL_MS = 30 * 60 * 1000;
  15: const FILE_WORKFLOW_TTL_MS = 24 * 60 * 60 * 1000;
  16: 
  17: function nowIso() {
  18:   return new Date().toISOString();
  19: }
  20: 
  21: function ageMs(value?: string | null): number {
  22:   if (!value) return Number.POSITIVE_INFINITY;
  23: 
  24:   const timestamp = new Date(value).getTime();
  25: 
  26:   if (Number.isNaN(timestamp)) {
  27:     return Number.POSITIVE_INFINITY;
  28:   }
  29: 
  30:   return Date.now() - timestamp;
  31: }
  32: 
  33: function cleanupStaleSessionState(session: SessionContext): SessionContext {
  34:   const sessionAge = ageMs(session.lastUpdatedAt);
  35: 
  36:   if (
  37:     session.pendingDisambiguation &&
  38:     sessionAge > PENDING_DISAMBIGUATION_TTL_MS
  39:   ) {
  40:     session.pendingDisambiguation = null;
  41:   }
  42: 
  43:   if (
  44:     session.workflow?.kind === "file" &&
  45:     sessionAge > FILE_WORKFLOW_TTL_MS
  46:   ) {
  47:     session.workflow = createDefaultWorkflow();
  48:   }
  49: 
  50:   return session;
  51: }
  52: 
  53: function createEmptySession(sessionId: string): SessionContext {
  54:   return {
  55:     sessionId,
  56:     lastUpdatedAt: nowIso(),
  57:     pendingDisambiguation: null,
  58:     workflow: createDefaultWorkflow(),
  59:     activePlan: null,
  60:   };
  61: }
  62: 
  63: function sanitizeSessionId(value: string): string {
  64:   return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  65: }
  66: 
  67: function persistSessionState(session: SessionContext): void {
  68:   const payload = JSON.stringify(session);
  69: 
  70:   db.prepare(
  71:     `
  72:     INSERT INTO session_state (session_id, state_json, updated_at)
  73:     VALUES (?, ?, CURRENT_TIMESTAMP)
  74:     ON CONFLICT(session_id)
  75:     DO UPDATE SET
  76:       state_json = excluded.state_json,
  77:       updated_at = CURRENT_TIMESTAMP
  78:     `
  79:   ).run(session.sessionId, payload);
  80: 
  81:   sessionCache.set(session.sessionId, session);
  82: }
  83: 
  84: export function resolveSessionId(value?: string | null): string {
  85:   const trimmed = String(value ?? "").trim();
  86: 
  87:   if (!trimmed) {
  88:     return DEFAULT_SESSION_ID;
  89:   }
  90: 
  91:   const sanitized = sanitizeSessionId(trimmed);
  92: 
  93:   return sanitized || DEFAULT_SESSION_ID;
  94: }
  95: 
  96: export function getSessionContext(sessionId: string): SessionContext {
  97:   sessionId = resolveSessionId(sessionId);
  98: 
  99:   const cached = sessionCache.get(sessionId);
 100: 
 101:   if (cached) {
 102:     if (!cached.workflow) {
 103:       cached.workflow = createDefaultWorkflow();
 104:     }
 105:   
 106:     if (!cached.lastUpdatedAt) {
 107:       cached.lastUpdatedAt = nowIso();
 108:     }
 109:   
 110:     cleanupStaleSessionState(cached);
 111:     return cached;
 112:   }
 113: 
 114:   const row = db
 115:     .prepare(
 116:       `
 117:       SELECT session_id, state_json, updated_at
 118:       FROM session_state
 119:       WHERE session_id = ?
 120:       LIMIT 1
 121:       `
 122:     )
 123:     .get(sessionId) as SessionStateRow | undefined;
 124: 
 125:   if (!row) {
 126:     const fresh = createEmptySession(sessionId);
 127:     sessionCache.set(sessionId, fresh);
 128:     return fresh;
 129:   }
 130: 
 131:   try {
 132:     const parsed = JSON.parse(row.state_json) as Partial<SessionContext>;
 133: 
 134:     const hydrated: SessionContext = {
 135:       ...createEmptySession(sessionId),
 136:       ...parsed,
 137:       sessionId,
 138:       lastUpdatedAt: parsed.lastUpdatedAt ?? row.updated_at ?? nowIso(),
 139:       workflow: parsed.workflow ?? createDefaultWorkflow(),
 140:     };
 141: 
 142:     cleanupStaleSessionState(hydrated);
 143:     sessionCache.set(sessionId, hydrated);
 144:     return hydrated;
 145:   } catch {
 146:     const fresh = createEmptySession(sessionId);
 147:     sessionCache.set(sessionId, fresh);
 148:     return fresh;
 149:   }
 150: }
 151: 
 152: export function saveSessionContext(session: SessionContext): void {
 153:   session.sessionId = resolveSessionId(session.sessionId);
 154:   session.lastUpdatedAt = nowIso();
 155: 
 156:   if (!session.workflow) {
 157:     session.workflow = createDefaultWorkflow();
 158:   }
 159: 
 160:   persistSessionState(session);
 161: }
 162: 
 163: export function clearPendingDisambiguation(session: SessionContext): void {
 164:   session.pendingDisambiguation = null;
 165: }
 166: 
 167: export function setPendingDisambiguation(
 168:   session: SessionContext,
 169:   pending: SessionContext["pendingDisambiguation"]
 170: ): void {
 171:   session.pendingDisambiguation = pending ?? null;
 172: }
 173: 
 174: export function clearSessionContext(sessionId: string): void {
 175:   const resolvedSessionId = resolveSessionId(sessionId);
 176: 
 177:   sessionCache.delete(resolvedSessionId);
 178: 
 179:   db.prepare(`DELETE FROM session_state WHERE session_id = ?`).run(
 180:     resolvedSessionId
 181:   );
 182: }
 183: 
 184: export function clearWorkflow(session: SessionContext): void {
 185:   session.workflow = { kind: "none" };
 186: }
 187: 
 188: export function setWorkflow(
 189:   session: SessionContext,
 190:   workflow: WorkflowState
 191: ): void {
 192:   session.workflow = workflow;
 193: }
```

### `lib\chernobog\pipeline\payload.ts`

```text
   1: import { saveMessage } from "@/lib/chernobog/memory";
   2: import { getSessionContext } from "@/lib/chernobog/session/store";
   3: import type { RouteName } from "@/lib/chernobog/session/types";
   4: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   5: import { saveTrustTrace } from "@/lib/chernobog/trust/store";
   6: import {
   7:   addTraceStep,
   8:   finishTrace,
   9:   printTraceInDev,
  10:   summarizeTrace,
  11: } from "@/lib/chernobog/trust/trace";
  12: import type { TrustTrace } from "@/lib/chernobog/trust/types";
  13: import type { ChatUiPayload, CommandPipelineResult } from "./types";
  14: 
  15: export function buildUiPayload(
  16:   sessionId: string,
  17:   route: RouteName,
  18:   reply: string,
  19:   trace?: TrustTrace
  20: ): ChatUiPayload {
  21:   const session = getSessionContext(sessionId);
  22:   const workflow = session.workflow;
  23: 
  24:   const activePlan = session.activePlan
  25:     ? {
  26:         id: session.activePlan.id,
  27:         title: session.activePlan.title,
  28:         status: session.activePlan.status,
  29:         stepCount: session.activePlan.steps.length,
  30:         activeStep:
  31:           session.activePlan.steps.find((step) => step.status === "active")
  32:             ?.title ?? null,
  33:       }
  34:     : null;
  35: 
  36:   const selectedCandidate =
  37:     workflow.kind === "file"
  38:       ? workflow.candidates.find(
  39:           (candidate) => candidate.id === workflow.selectedCandidateId
  40:         )
  41:       : null;
  42: 
  43:   const readCandidate =
  44:     workflow.kind === "file"
  45:       ? workflow.candidates.find(
  46:           (candidate) => candidate.id === workflow.readCandidateId
  47:         )
  48:       : null;
  49: 
  50:   const debugTrace = trace
  51:     ? {
  52:         id: trace.id,
  53:         route: trace.route,
  54:         tool: trace.tool,
  55:         success: trace.success,
  56:         failureCategory: trace.failureCategory,
  57:         summary: summarizeTrace(trace),
  58:         steps: trace.steps.map((step) => ({
  59:           type: step.type,
  60:           label: step.label,
  61:           detail: step.detail,
  62:           timestamp: step.timestamp,
  63:         })),
  64:       }
  65:     : undefined;
  66: 
  67:   return {
  68:     route,
  69:     reply: reply || "No response returned.",
  70:     sessionId,
  71:     tool: session.lastTool?.name ?? "none",
  72:     toolSummary: session.lastToolResult?.summary ?? "No tool activity yet",
  73:     searchQuery:
  74:       workflow.kind === "file"
  75:         ? workflow.query ?? "none"
  76:         : session.fileContext?.lastSearch?.query ?? "none",
  77:     searchRoot:
  78:       workflow.kind === "file"
  79:         ? workflow.root ?? "none"
  80:         : session.fileContext?.lastSearch?.normalizedRoot ??
  81:           session.fileContext?.lastSearch?.root ??
  82:           "none",
  83:     selectedFile:
  84:       selectedCandidate?.path ??
  85:       session.fileContext?.lastSelected?.path ??
  86:       "none",
  87:     readFile:
  88:       readCandidate?.path ??
  89:       session.fileContext?.lastRead?.path ??
  90:       "none",
  91:     pendingState:
  92:       workflow.kind === "file" && workflow.awaitingDisambiguation
  93:         ? "awaiting_file_selection"
  94:         : session.pendingDisambiguation
  95:           ? "awaiting_file_selection"
  96:           : "none",
  97:     workflowKind: workflow.kind,
  98:     workflowStep: workflow.kind === "file" ? workflow.step : "none",
  99:     workflowCandidateCount:
 100:       workflow.kind === "file" ? workflow.candidates.length : 0,
 101:     activePlan,
 102:     debugTrace,
 103:   };
 104: }
 105: 
 106: export function finalizePipelinePayload(
 107:   sessionId: string,
 108:   route: RouteName,
 109:   reply: string,
 110:   trace: TrustTrace
 111: ): CommandPipelineResult {
 112:   const endingSession = getSessionContext(sessionId);
 113: 
 114:   addTraceStep(
 115:     trace,
 116:     "workflow_update",
 117:     "Workflow snapshot after command",
 118:     undefined,
 119:     buildWorkflowSnapshot(endingSession)
 120:   );
 121: 
 122:   finishTrace(trace, route, endingSession.lastTool?.name ?? "none");
 123:   saveTrustTrace(trace);
 124:   printTraceInDev(trace);
 125: 
 126:   saveMessage("assistant", reply, route, sessionId);
 127: 
 128:   return {
 129:     payload: buildUiPayload(sessionId, route, reply, trace),
 130:   };
 131: }
```


## runCommand entry points and project/session context

Pattern: `export\s+(async\s+)?function\s+runCommand|sessionId|projectId|activeProject|buildUnifiedMemoryContext|getSessionContext|getRecentMessages`

### `lib\chernobog\pipeline\runCommand.ts` line 8

```text
    4:   deleteMemory,
    5:   extractForgetFact,
    6:   extractMemoryFact,
    7:   getMemories,
>   8:   getRecentMessages,
    9:   isForgetRequest,
   10:   isRecallRequest,
   11:   isRememberRequest,
   12:   isWipeMemoriesRequest,
```

### `lib\chernobog\pipeline\runCommand.ts` line 25

```text
   21:   openAppCallLooksLikeFileRequest,
   22: } from "@/lib/chernobog/tools/normalize";
   23: 
   24: import {
>  25:   getSessionContext,
   26:   saveSessionContext,
   27: } from "@/lib/chernobog/session/store";
   28: 
   29: import {
```

### `lib\chernobog\pipeline\runCommand.ts` line 59

```text
   55: } from "@/lib/chernobog/session/continuity";
   56: 
   57: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   58: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
>  59: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   60: import {
   61:   buildExecutionDiagnostics,
   62:   executeFromMessage,
   63:   type ExecutionState,
```

### `lib\chernobog\pipeline\runCommand.ts` line 121

```text
  117:   isYouTubeIngestCommand,
  118: } from "@/lib/modules/youtube-ingest";
  119: 
  120: 
> 121: type SessionWithExecutionState = ReturnType<typeof getSessionContext> & {
  122:   executionState?: ExecutionState;
  123: };
  124: 
  125: export async function runCommandPipeline(
```

### `lib\chernobog\pipeline\runCommand.ts` line 125

```text
  121: type SessionWithExecutionState = ReturnType<typeof getSessionContext> & {
  122:   executionState?: ExecutionState;
  123: };
  124: 
> 125: export async function runCommandPipeline(
  126:   userMessage: string,
  127:   sessionId: string
  128: ): Promise<CommandPipelineResult> {
  129:   let route: RouteName = "chat";
```

### `lib\chernobog\pipeline\runCommand.ts` line 127

```text
  123: };
  124: 
  125: export async function runCommandPipeline(
  126:   userMessage: string,
> 127:   sessionId: string
  128: ): Promise<CommandPipelineResult> {
  129:   let route: RouteName = "chat";
  130:   let reply = "";
  131:   const trace = createTrustTrace(userMessage, sessionId);
```

### `lib\chernobog\pipeline\runCommand.ts` line 131

```text
  127:   sessionId: string
  128: ): Promise<CommandPipelineResult> {
  129:   let route: RouteName = "chat";
  130:   let reply = "";
> 131:   const trace = createTrustTrace(userMessage, sessionId);
  132: 
  133:   const startingSession = getSessionContext(sessionId);
  134: 
  135:   addTraceStep(
```

### `lib\chernobog\pipeline\runCommand.ts` line 133

```text
  129:   let route: RouteName = "chat";
  130:   let reply = "";
  131:   const trace = createTrustTrace(userMessage, sessionId);
  132: 
> 133:   const startingSession = getSessionContext(sessionId);
  134: 
  135:   addTraceStep(
  136:     trace,
  137:     "workflow_update",
```

### `lib\chernobog\pipeline\runCommand.ts` line 175

```text
  171:       "vault-brain",
  172:       { userMessage }
  173:     );
  174: 
> 175:     saveMessage("user", userMessage, route, sessionId);
  176: 
  177:     const vaultBrainResult = await executeVaultBrainCommand(userMessage);
  178: 
  179:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 185

```text
  181:       "",
  182:       vaultBrainResult.message,
  183:     ].join("\n");
  184: 
> 185:     return finalizePipelinePayload(sessionId, route, reply, trace);
  186:   }
  187: 
  188:   if (isContentReviewCommand(userMessage)) {
  189:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 200

```text
  196:       "content-review",
  197:       { userMessage }
  198:     );
  199: 
> 200:     saveMessage("user", userMessage, route, sessionId);
  201: 
  202:     const contentReviewResult = await executeContentReviewCommand(userMessage);
  203: 
  204:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 210

```text
  206:       "",
  207:       contentReviewResult.message,
  208:     ].join("\n");
  209: 
> 210:     return finalizePipelinePayload(sessionId, route, reply, trace);
  211:   }
  212: 
  213:   if (isContentIngestCommand(userMessage)) {
  214:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 225

```text
  221:       "content-ingest",
  222:       { userMessage }
  223:     );
  224: 
> 225:     saveMessage("user", userMessage, route, sessionId);
  226: 
  227:     const contentIngestResult = await executeContentIngestCommand(userMessage);
  228: 
  229:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 235

```text
  231:       "",
  232:       contentIngestResult.message,
  233:     ].join("\n");
  234: 
> 235:     return finalizePipelinePayload(sessionId, route, reply, trace);
  236:   }
  237: 
  238:   if (isYouTubeIngestCommand(userMessage)) {
  239:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 250

```text
  246:       "youtube-playlist-ingest",
  247:       { userMessage }
  248:     );
  249: 
> 250:     saveMessage("user", userMessage, route, sessionId);
  251: 
  252:     const youtubeIngestResult = await executeYouTubeIngestCommand(userMessage);
  253: 
  254:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 260

```text
  256:       "",
  257:       youtubeIngestResult.message,
  258:     ].join("\n");
  259: 
> 260:     return finalizePipelinePayload(sessionId, route, reply, trace);
  261:   }
  262: 
  263:   if (isSavedContentReliabilityCommand(userMessage)) {
  264:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 275

```text
  271:       "saved-content-reliability",
  272:       { userMessage }
  273:     );
  274: 
> 275:     saveMessage("user", userMessage, route, sessionId);
  276: 
  277:     const reliabilityResult =
  278:       await executeSavedContentReliabilityCommand(userMessage);
  279: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 286

```text
  282:       "",
  283:       reliabilityResult.message,
  284:     ].join("\n");
  285: 
> 286:     return finalizePipelinePayload(sessionId, route, reply, trace);
  287:   }
  288: 
  289:   if (isYouTubeOAuthCommand(userMessage)) {
  290:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 303

```text
  299:         userMessage,
  300:       }
  301:     );
  302: 
> 303:     saveMessage("user", userMessage, route, sessionId);
  304: 
  305:     const youtubeOAuthResult = await executeYouTubeOAuthCommand(userMessage);
  306: 
  307:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 313

```text
  309:       "",
  310:       youtubeOAuthResult.message,
  311:     ].join("\n");
  312: 
> 313:     return finalizePipelinePayload(sessionId, route, reply, trace);
  314:   }
  315: 
  316:   if (isSavedContentCommand(userMessage)) {
  317:     route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 330

```text
  326:         userMessage,
  327:       }
  328:     );
  329: 
> 330:     saveMessage("user", userMessage, route, sessionId);
  331: 
  332:     const savedContentResult = await executeSavedContentCommand(userMessage);
  333: 
  334:     reply = [
```

### `lib\chernobog\pipeline\runCommand.ts` line 340

```text
  336:       "",
  337:       savedContentResult.message,
  338:     ].join("\n");
  339: 
> 340:     return finalizePipelinePayload(sessionId, route, reply, trace);
  341:   }
  342: 
  343:   
  344: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 351

```text
  347:     setTraceRoute(trace, route);
  348: 
  349:     addTraceStep(trace, "memory_route", "Memory wipe request detected");
  350: 
> 351:     saveMessage("user", userMessage, route, sessionId);
  352: 
  353:     const deletedCount = clearAllMemories();
  354: 
  355:     reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 365

```text
  361:     setTraceRoute(trace, route);
  362: 
  363:     addTraceStep(trace, "memory_route", "Memory forget request detected");
  364: 
> 365:     saveMessage("user", userMessage, route, sessionId);
  366: 
  367:     const fact = extractForgetFact(userMessage);
  368: 
  369:     reply = !fact
```

### `lib\chernobog\pipeline\runCommand.ts` line 380

```text
  376:     setTraceRoute(trace, route);
  377: 
  378:     addTraceStep(trace, "memory_route", "Memory remember request detected");
  379: 
> 380:     saveMessage("user", userMessage, route, sessionId);
  381: 
  382:     const fact = extractMemoryFact(userMessage);
  383: 
  384:     if (!fact) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 399

```text
  395:     setTraceRoute(trace, route);
  396: 
  397:     addTraceStep(trace, "memory_route", "Memory recall request detected");
  398: 
> 399:     saveMessage("user", userMessage, route, sessionId);
  400: 
  401:     const memories = getMemories(50);
  402: 
  403:     reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 411

```text
  407:             "Persisted memories:",
  408:             ...memories.map((memory, index) => `${index + 1}. ${memory}`),
  409:           ].join("\n");
  410:   } else {
> 411:     const session = getSessionContext(sessionId);
  412:     const continuityQuery = detectContinuityQuery(userMessage);
  413: 
  414:     if (continuityQuery !== "none") {
  415:       route = "tools";
```

### `lib\chernobog\pipeline\runCommand.ts` line 425

```text
  421:         "Continuity query resolved from persisted session state",
  422:         continuityQuery
  423:       );
  424: 
> 425:       saveMessage("user", userMessage, route, sessionId);
  426: 
  427:       reply = buildContinuityReply(continuityQuery, session);
  428: 
  429:       return finalizePipelinePayload(sessionId, route, reply, trace);
```

### `lib\chernobog\pipeline\runCommand.ts` line 429

```text
  425:       saveMessage("user", userMessage, route, sessionId);
  426: 
  427:       reply = buildContinuityReply(continuityQuery, session);
  428: 
> 429:       return finalizePipelinePayload(sessionId, route, reply, trace);
  430:     }
  431: 
  432:     if (
  433:       unifiedCommand.domain === "context" &&
```

### `lib\chernobog\pipeline\runCommand.ts` line 448

```text
  444:         "command_help",
  445:         unifiedCommand
  446:       );
  447:     
> 448:       saveMessage("user", userMessage, route, sessionId);
  449:     
  450:       reply = formatCommandLanguageHelp();
  451:     
  452:       return finalizePipelinePayload(sessionId, route, reply, trace);
```

### `lib\chernobog\pipeline\runCommand.ts` line 452

```text
  448:       saveMessage("user", userMessage, route, sessionId);
  449:     
  450:       reply = formatCommandLanguageHelp();
  451:     
> 452:       return finalizePipelinePayload(sessionId, route, reply, trace);
  453:     }
  454: 
  455:     const moduleFollowUp = await tryHandleModuleFollowUp({
  456:       userMessage,
```

### `lib\chernobog\pipeline\runCommand.ts` line 457

```text
  453:     }
  454: 
  455:     const moduleFollowUp = await tryHandleModuleFollowUp({
  456:       userMessage,
> 457:       sessionId,
  458:     });
  459:     
  460:     if (moduleFollowUp) {
  461:       addTraceStep(
```

### `lib\chernobog\pipeline\runCommand.ts` line 474

```text
  470:       );
  471:     
  472:       route = moduleFollowUp.route;
  473:       setTraceRoute(trace, route);
> 474:       saveMessage("user", userMessage, route, sessionId);
  475:       reply = moduleFollowUp.reply;
  476:     
  477:       return finalizePipelinePayload(sessionId, route, reply, trace);
  478:     }
```

### `lib\chernobog\pipeline\runCommand.ts` line 477

```text
  473:       setTraceRoute(trace, route);
  474:       saveMessage("user", userMessage, route, sessionId);
  475:       reply = moduleFollowUp.reply;
  476:     
> 477:       return finalizePipelinePayload(sessionId, route, reply, trace);
  478:     }
  479: 
  480:     const domainHandler = getDomainHandler(unifiedCommand.domain);
  481: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 499

```text
  495:       );
  496:     
  497:       const moduleResult = await domainHandler({
  498:         userMessage,
> 499:         sessionId,
  500:         command: unifiedCommand,
  501:       });
  502:     
  503:       route = moduleResult.route;
```

### `lib\chernobog\pipeline\runCommand.ts` line 505

```text
  501:       });
  502:     
  503:       route = moduleResult.route;
  504:       setTraceRoute(trace, route);
> 505:       saveMessage("user", userMessage, route, sessionId);
  506:       reply = moduleResult.reply;
  507:     
  508:       addTraceStep(
  509:         trace,
```

### `lib\chernobog\pipeline\runCommand.ts` line 519

```text
  515:           moduleId: moduleResult.moduleId,
  516:         }
  517:       );
  518:     
> 519:       return finalizePipelinePayload(sessionId, route, reply, trace);
  520:     }
  521: 
  522:     const unifiedMemoryAction = unifiedToMemoryAction(unifiedCommand);
  523: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 536

```text
  532:     unifiedMemoryAction.kind,
  533:     unifiedMemoryAction
  534:   );
  535: 
> 536:   saveMessage("user", userMessage, route, sessionId);
  537: 
  538:   if (unifiedMemoryAction.kind === "wipe") {
  539:     const deletedCount = clearAllMemories();
  540: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 579

```text
  575:             ...memories.map((memory, index) => `${index + 1}. ${memory}`),
  576:           ].join("\n");
  577:   }
  578: 
> 579:   return finalizePipelinePayload(sessionId, route, reply, trace);
  580: }
  581: 
  582:     const memoryArchitectureCommand =
  583:   unifiedToMemoryArchitectureCommand(unifiedCommand) ??
```

### `lib\chernobog\pipeline\runCommand.ts` line 598

```text
  594:         memoryArchitectureCommand
  595:       );
  596: 
  597:       const storedMemories = getMemories(50);
> 598:       const recentMessages = getRecentMessages(sessionId, 12);
  599: 
  600:       const memoryReply = runMemoryArchitectureCommand(memoryArchitectureCommand, {
  601:         session,
  602:         persistedMemories: storedMemories,
```

### `lib\chernobog\pipeline\runCommand.ts` line 607

```text
  603:         recentMessages,
  604:         userMessage,
  605:       });
  606: 
> 607:       saveMessage("user", userMessage, route, sessionId);
  608: 
  609:       reply = memoryReply ?? "No memory architecture response was produced.";
  610: 
  611:       return finalizePipelinePayload(sessionId, route, reply, trace);
```

### `lib\chernobog\pipeline\runCommand.ts` line 611

```text
  607:       saveMessage("user", userMessage, route, sessionId);
  608: 
  609:       reply = memoryReply ?? "No memory architecture response was produced.";
  610: 
> 611:       return finalizePipelinePayload(sessionId, route, reply, trace);
  612:     }
  613: 
  614:     const plannerCommand =
  615:   unifiedToPlannerCommand(unifiedCommand) ?? parsePlannerCommand(userMessage);
```

### `lib\chernobog\pipeline\runCommand.ts` line 630

```text
  626:         plannerCommand.kind,
  627:         plannerCommand
  628:       );
  629: 
> 630:       saveMessage("user", userMessage, route, sessionId);
  631:       saveSessionContext(session);
  632: 
  633:       reply = plannerReply;
  634: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 635

```text
  631:       saveSessionContext(session);
  632: 
  633:       reply = plannerReply;
  634: 
> 635:       return finalizePipelinePayload(sessionId, route, reply, trace);
  636:     }
  637: 
  638:     addTraceStep(
  639:       trace,
```

### `lib\chernobog\pipeline\runCommand.ts` line 685

```text
  681:           })),
  682:         }
  683:       );
  684: 
> 685:       saveMessage("user", userMessage, route, sessionId);
  686: 
  687:       reply = execution.response;
  688: 
  689:       return finalizePipelinePayload(sessionId, route, reply, trace);
```

### `lib\chernobog\pipeline\runCommand.ts` line 689

```text
  685:       saveMessage("user", userMessage, route, sessionId);
  686: 
  687:       reply = execution.response;
  688: 
> 689:       return finalizePipelinePayload(sessionId, route, reply, trace);
  690:     }
  691: 
  692:     addTraceStep(
  693:       trace,
```

### `lib\chernobog\pipeline\runCommand.ts` line 716

```text
  712:           toolCall: unifiedToolCall,
  713:         }
  714:       );
  715: 
> 716:       saveMessage("user", userMessage, route, sessionId);
  717: 
  718:       const normalizedToolCall = normalizeToolCall(unifiedToolCall);
  719: 
  720:       if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 731

```text
  727:         );
  728: 
  729:         const fallbackReply = await tryFileSearchFallback(
  730:           userMessage,
> 731:           sessionId,
  732:           "open_file"
  733:         );
  734: 
  735:         reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 739

```text
  735:         reply =
  736:           fallbackReply ??
  737:           "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  738: 
> 739:         return finalizePipelinePayload(sessionId, route, reply, trace);
  740:       }
  741: 
  742:       if (
  743:         normalizedToolCall.tool === "read_text_file" ||
```

### `lib\chernobog\pipeline\runCommand.ts` line 751

```text
  747: 
  748:         if (!looksLikeExplicitFilePath(fileInput.path)) {
  749:           const fallbackReply = await tryFileSearchFallback(
  750:             fileInput.path,
> 751:             sessionId,
  752:             normalizedToolCall.tool
  753:           );
  754: 
  755:           if (fallbackReply) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 761

```text
  757:           } else {
  758:             const toolResult = await executeAndTrackTool(
  759:               normalizedToolCall.tool,
  760:               normalizedToolCall.input,
> 761:               sessionId
  762:             );
  763: 
  764:             reply = formatToolReply(toolResult, sessionId);
  765:           }
```

### `lib\chernobog\pipeline\runCommand.ts` line 764

```text
  760:               normalizedToolCall.input,
  761:               sessionId
  762:             );
  763: 
> 764:             reply = formatToolReply(toolResult, sessionId);
  765:           }
  766:         } else {
  767:           const toolResult = await executeAndTrackTool(
  768:             normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 770

```text
  766:         } else {
  767:           const toolResult = await executeAndTrackTool(
  768:             normalizedToolCall.tool,
  769:             normalizedToolCall.input,
> 770:             sessionId
  771:           );
  772: 
  773:           reply = formatToolReply(toolResult, sessionId);
  774:         }
```

### `lib\chernobog\pipeline\runCommand.ts` line 773

```text
  769:             normalizedToolCall.input,
  770:             sessionId
  771:           );
  772: 
> 773:           reply = formatToolReply(toolResult, sessionId);
  774:         }
  775:       } else {
  776:         const toolResult = await executeAndTrackTool(
  777:           normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 779

```text
  775:       } else {
  776:         const toolResult = await executeAndTrackTool(
  777:           normalizedToolCall.tool,
  778:           normalizedToolCall.input,
> 779:           sessionId
  780:         );
  781: 
  782:         reply = formatToolReply(toolResult, sessionId);
  783:       }
```

### `lib\chernobog\pipeline\runCommand.ts` line 782

```text
  778:           normalizedToolCall.input,
  779:           sessionId
  780:         );
  781: 
> 782:         reply = formatToolReply(toolResult, sessionId);
  783:       }
  784: 
  785:       return finalizePipelinePayload(sessionId, route, reply, trace);
  786:     }
```

### `lib\chernobog\pipeline\runCommand.ts` line 785

```text
  781: 
  782:         reply = formatToolReply(toolResult, sessionId);
  783:       }
  784: 
> 785:       return finalizePipelinePayload(sessionId, route, reply, trace);
  786:     }
  787: 
  788:       addTraceStep(trace, "orchestration", "Checking V4.4 orchestration layer");
  789: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 803

```text
  799:           "V4.4 orchestration handled the message",
  800:           orchestration.reply
  801:         );
  802: 
> 803:         saveMessage("user", userMessage, route, sessionId);
  804: 
  805:         reply = orchestration.reply;
  806:         saveSessionContext(session);
  807:       } else {
```

### `lib\chernobog\pipeline\runCommand.ts` line 829

```text
  825:             parsedToolCommand.tool,
  826:             parsedToolCommand.input
  827:           );
  828: 
> 829:           saveMessage("user", userMessage, route, sessionId);
  830: 
  831:           const normalizedToolCall = normalizeToolCall(parsedToolCommand);
  832: 
  833:           if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 844

```text
  840:             );
  841: 
  842:             const fallbackReply = await tryFileSearchFallback(
  843:               userMessage,
> 844:               sessionId,
  845:               "open_file"
  846:             );
  847: 
  848:             reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 852

```text
  848:             reply =
  849:               fallbackReply ??
  850:               "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  851: 
> 852:             return finalizePipelinePayload(sessionId, route, reply, trace);
  853:           }
  854: 
  855:           if (
  856:             normalizedToolCall.tool === "read_text_file" ||
```

### `lib\chernobog\pipeline\runCommand.ts` line 864

```text
  860: 
  861:             if (!looksLikeExplicitFilePath(fileInput.path)) {
  862:               const fallbackReply = await tryFileSearchFallback(
  863:                 fileInput.path,
> 864:                 sessionId,
  865:                 normalizedToolCall.tool
  866:               );
  867: 
  868:               if (fallbackReply) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 874

```text
  870:               } else {
  871:                 const toolResult = await executeAndTrackTool(
  872:                   normalizedToolCall.tool,
  873:                   normalizedToolCall.input,
> 874:                   sessionId
  875:                 );
  876: 
  877:                 reply = formatToolReply(toolResult, sessionId);
  878:               }
```

### `lib\chernobog\pipeline\runCommand.ts` line 877

```text
  873:                   normalizedToolCall.input,
  874:                   sessionId
  875:                 );
  876: 
> 877:                 reply = formatToolReply(toolResult, sessionId);
  878:               }
  879:             } else {
  880:               const toolResult = await executeAndTrackTool(
  881:                 normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 883

```text
  879:             } else {
  880:               const toolResult = await executeAndTrackTool(
  881:                 normalizedToolCall.tool,
  882:                 normalizedToolCall.input,
> 883:                 sessionId
  884:               );
  885: 
  886:               reply = formatToolReply(toolResult, sessionId);
  887:             }
```

### `lib\chernobog\pipeline\runCommand.ts` line 886

```text
  882:                 normalizedToolCall.input,
  883:                 sessionId
  884:               );
  885: 
> 886:               reply = formatToolReply(toolResult, sessionId);
  887:             }
  888:           } else {
  889:             const toolResult = await executeAndTrackTool(
  890:               normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 892

```text
  888:           } else {
  889:             const toolResult = await executeAndTrackTool(
  890:               normalizedToolCall.tool,
  891:               normalizedToolCall.input,
> 892:               sessionId
  893:             );
  894: 
  895:             reply = formatToolReply(toolResult, sessionId);
  896:           }
```

### `lib\chernobog\pipeline\runCommand.ts` line 895

```text
  891:               normalizedToolCall.input,
  892:               sessionId
  893:             );
  894: 
> 895:             reply = formatToolReply(toolResult, sessionId);
  896:           }
  897:         } else {
  898:           const toolIntent = await classifyToolIntent(userMessage);
  899: 
```

### `lib\chernobog\pipeline\runCommand.ts` line 913

```text
  909:             route = "tools";
  910:             setTraceRoute(trace, route);
  911:             setTraceTool(trace, toolIntent.tool);
  912: 
> 913:             saveMessage("user", userMessage, route, sessionId);
  914: 
  915:             const normalizedToolCall = normalizeToolCall(toolIntent);
  916: 
  917:             if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 928

```text
  924:               );
  925: 
  926:               const fallbackReply = await tryFileSearchFallback(
  927:                 userMessage,
> 928:                 sessionId,
  929:                 "open_file"
  930:               );
  931: 
  932:               reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 936

```text
  932:               reply =
  933:                 fallbackReply ??
  934:                 "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  935: 
> 936:               return finalizePipelinePayload(sessionId, route, reply, trace);
  937:             }
  938: 
  939:             if (
  940:               normalizedToolCall.tool === "read_text_file" ||
```

### `lib\chernobog\pipeline\runCommand.ts` line 948

```text
  944: 
  945:               if (!looksLikeExplicitFilePath(fileInput.path)) {
  946:                 const fallbackReply = await tryFileSearchFallback(
  947:                   fileInput.path,
> 948:                   sessionId,
  949:                   normalizedToolCall.tool
  950:                 );
  951: 
  952:                 if (fallbackReply) {
```

### `lib\chernobog\pipeline\runCommand.ts` line 958

```text
  954:                 } else {
  955:                   const toolResult = await executeAndTrackTool(
  956:                     normalizedToolCall.tool,
  957:                     normalizedToolCall.input,
> 958:                     sessionId
  959:                   );
  960: 
  961:                   reply = formatToolReply(toolResult, sessionId);
  962:                 }
```

### `lib\chernobog\pipeline\runCommand.ts` line 961

```text
  957:                     normalizedToolCall.input,
  958:                     sessionId
  959:                   );
  960: 
> 961:                   reply = formatToolReply(toolResult, sessionId);
  962:                 }
  963:               } else {
  964:                 const toolResult = await executeAndTrackTool(
  965:                   normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 967

```text
  963:               } else {
  964:                 const toolResult = await executeAndTrackTool(
  965:                   normalizedToolCall.tool,
  966:                   normalizedToolCall.input,
> 967:                   sessionId
  968:                 );
  969: 
  970:                 reply = formatToolReply(toolResult, sessionId);
  971:               }
```

### `lib\chernobog\pipeline\runCommand.ts` line 970

```text
  966:                   normalizedToolCall.input,
  967:                   sessionId
  968:                 );
  969: 
> 970:                 reply = formatToolReply(toolResult, sessionId);
  971:               }
  972:             } else {
  973:               const toolResult = await executeAndTrackTool(
  974:                 normalizedToolCall.tool,
```

### `lib\chernobog\pipeline\runCommand.ts` line 976

```text
  972:             } else {
  973:               const toolResult = await executeAndTrackTool(
  974:                 normalizedToolCall.tool,
  975:                 normalizedToolCall.input,
> 976:                 sessionId
  977:               );
  978: 
  979:               reply = formatToolReply(toolResult, sessionId);
  980:             }
```

### `lib\chernobog\pipeline\runCommand.ts` line 979

```text
  975:                 normalizedToolCall.input,
  976:                 sessionId
  977:               );
  978: 
> 979:               reply = formatToolReply(toolResult, sessionId);
  980:             }
  981:           } else if (looksLikeVagueFileRequest(userMessage)) {
  982:             route = "tools";
  983:             setTraceRoute(trace, route);
```

### `lib\chernobog\pipeline\runCommand.ts` line 992

```text
  988:               "Vague file request fallback triggered",
  989:               userMessage
  990:             );
  991: 
> 992:             saveMessage("user", userMessage, route, sessionId);
  993: 
  994:             const fallbackReply = await tryFileSearchFallback(
  995:               userMessage,
  996:               sessionId,
```

### `lib\chernobog\pipeline\runCommand.ts` line 996

```text
  992:             saveMessage("user", userMessage, route, sessionId);
  993: 
  994:             const fallbackReply = await tryFileSearchFallback(
  995:               userMessage,
> 996:               sessionId,
  997:               /\bopen\b/i.test(userMessage) ? "open_file" : "read_text_file"
  998:             );
  999: 
 1000:             reply =
```

### `lib\chernobog\pipeline\runCommand.ts` line 1014

```text
 1010:               "Falling back to normal message router",
 1011:               route
 1012:             );
 1013: 
>1014:             saveMessage("user", userMessage, route, sessionId);
 1015: 
 1016:             const activeSession = getSessionContext(sessionId);
 1017:             const storedMemories = getMemories(12);
 1018:             const recentMessages = getRecentMessages(sessionId, 8);
```

### `lib\chernobog\pipeline\runCommand.ts` line 1016

```text
 1012:             );
 1013: 
 1014:             saveMessage("user", userMessage, route, sessionId);
 1015: 
>1016:             const activeSession = getSessionContext(sessionId);
 1017:             const storedMemories = getMemories(12);
 1018:             const recentMessages = getRecentMessages(sessionId, 8);
 1019: 
 1020:             const memoryContext = await buildUnifiedMemoryContext({
```

### `lib\chernobog\pipeline\runCommand.ts` line 1018

```text
 1014:             saveMessage("user", userMessage, route, sessionId);
 1015: 
 1016:             const activeSession = getSessionContext(sessionId);
 1017:             const storedMemories = getMemories(12);
>1018:             const recentMessages = getRecentMessages(sessionId, 8);
 1019: 
 1020:             const memoryContext = await buildUnifiedMemoryContext({
 1021:               session: activeSession,
 1022:               persistedMemories: storedMemories,
```

### `lib\chernobog\pipeline\runCommand.ts` line 1020

```text
 1016:             const activeSession = getSessionContext(sessionId);
 1017:             const storedMemories = getMemories(12);
 1018:             const recentMessages = getRecentMessages(sessionId, 8);
 1019: 
>1020:             const memoryContext = await buildUnifiedMemoryContext({
 1021:               session: activeSession,
 1022:               persistedMemories: storedMemories,
 1023:               recentMessages,
 1024:               userMessage,
```

### `lib\chernobog\pipeline\runCommand.ts` line 1053

```text
 1049:       }
 1050:     
 1051:   }
 1052: 
>1053:   return finalizePipelinePayload(sessionId, route, reply, trace);
 1054: }
```


## All runCommand callers

Pattern: `runCommand\s*\(`

_No matches._


## Incoming command payload fields

Pattern: `sessionId|projectId|projectSlug|workspaceSlug|activeProject|request\.json|NextRequest`

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 23

```text
   19: };
   20: 
   21: type CharacterBriefRouteContext = {
   22:   params: Promise<{
>  23:     projectId: string;
   24:   }>;
   25: };
   26: 
   27: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 27

```text
   23:     projectId: string;
   24:   }>;
   25: };
   26: 
>  27: async function readProjectId(
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
   30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 30

```text
   26: 
   27: async function readProjectId(
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
>  30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
   32: }
   33: 
   34: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 31

```text
   27: async function readProjectId(
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
   30:   const { projectId } = await context.params;
>  31:   return decodeURIComponent(projectId);
   32: }
   33: 
   34: function notFound(projectId: string) {
   35:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 34

```text
   30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
   32: }
   33: 
>  34: function notFound(projectId: string) {
   35:   return NextResponse.json(
   36:     {
   37:       ok: false,
   38:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 38

```text
   34: function notFound(projectId: string) {
   35:   return NextResponse.json(
   36:     {
   37:       ok: false,
>  38:       error: `Character Forge project not found: ${projectId}.`,
   39:     },
   40:     { status: 404, headers: NO_STORE_HEADERS }
   41:   );
   42: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 81

```text
   77:   _request: Request,
   78:   context: CharacterBriefRouteContext
   79: ) {
   80:   try {
>  81:     const projectId = await readProjectId(context);
   82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 82

```text
   78:   context: CharacterBriefRouteContext
   79: ) {
   80:   try {
   81:     const projectId = await readProjectId(context);
>  82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 85

```text
   81:     const projectId = await readProjectId(context);
   82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
>  85:       return notFound(projectId);
   86:     }
   87: 
   88:     return NextResponse.json(
   89:       {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 114

```text
  110:   request: Request,
  111:   context: CharacterBriefRouteContext
  112: ) {
  113:   try {
> 114:     const projectId = await readProjectId(context);
  115:     const body = (await request.json()) as unknown;
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 115

```text
  111:   context: CharacterBriefRouteContext
  112: ) {
  113:   try {
  114:     const projectId = await readProjectId(context);
> 115:     const body = (await request.json()) as unknown;
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 117

```text
  113:   try {
  114:     const projectId = await readProjectId(context);
  115:     const body = (await request.json()) as unknown;
  116:     const brief = parseCharacterBriefUpdateRequest(body);
> 117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
  120:       return notFound(projectId);
  121:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 120

```text
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
> 120:       return notFound(projectId);
  121:     }
  122: 
  123:     return NextResponse.json(
  124:       {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 156

```text
  152:   request: Request,
  153:   context: CharacterBriefRouteContext
  154: ) {
  155:   try {
> 156:     const projectId = await readProjectId(context);
  157:     const body = (await request.json()) as unknown;
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 157

```text
  153:   context: CharacterBriefRouteContext
  154: ) {
  155:   try {
  156:     const projectId = await readProjectId(context);
> 157:     const body = (await request.json()) as unknown;
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 161

```text
  157:     const body = (await request.json()) as unknown;
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
> 161:         ? await approveCharacterProjectBrief(projectId, input.brief)
  162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
  165:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 162

```text
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
> 162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
  165:       return notFound(projectId);
  166:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 165

```text
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
  162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
> 165:       return notFound(projectId);
  166:     }
  167: 
  168:     return NextResponse.json(
  169:       {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 25

```text
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
>  25:     const projectId = decodeURIComponent((await context.params).projectId);
   26:     const project = await readCharacterProject(projectId);
   27:     const pose = project?.canonicalPose ?? null;
   28:     const visible = Boolean(
   29:       project &&
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const projectId = decodeURIComponent((await context.params).projectId);
>  26:     const project = await readCharacterProject(projectId);
   27:     const pose = project?.canonicalPose ?? null;
   28:     const visible = Boolean(
   29:       project &&
   30:         [
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 46

```text
   42:       return notFound();
   43:     }
   44: 
   45:     const bytes = await readCharacterCanonicalPoseImage({
>  46:       projectId,
   47:       imagePath: pose.imagePath,
   48:     });
   49: 
   50:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 23

```text
   19: 
   20: const HEADERS = { "Cache-Control": "no-store" };
   21: 
   22: type RouteContext = {
>  23:   params: Promise<{ projectId: string }>;
   24: };
   25: 
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 26

```text
   22: type RouteContext = {
   23:   params: Promise<{ projectId: string }>;
   24: };
   25: 
>  26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
   30: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 27

```text
   23:   params: Promise<{ projectId: string }>;
   24: };
   25: 
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
>  27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
   30: function notFound(projectId: string) {
   31:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 30

```text
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
>  30: function notFound(projectId: string) {
   31:   return NextResponse.json(
   32:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   33:     { status: 404, headers: HEADERS },
   34:   );
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 32

```text
   28: }
   29: 
   30: function notFound(projectId: string) {
   31:   return NextResponse.json(
>  32:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   33:     { status: 404, headers: HEADERS },
   34:   );
   35: }
   36: 
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 78

```text
   74: }
   75: 
   76: export async function GET(_request: Request, context: RouteContext) {
   77:   try {
>  78:     const projectId = await projectIdFrom(context);
   79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
   82:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 79

```text
   75: 
   76: export async function GET(_request: Request, context: RouteContext) {
   77:   try {
   78:     const projectId = await projectIdFrom(context);
>  79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
   82:       return notFound(projectId);
   83:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 82

```text
   78:     const projectId = await projectIdFrom(context);
   79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
>  82:       return notFound(projectId);
   83:     }
   84: 
   85:     const provider = await getCharacterCanonicalPoseProviderStatus();
   86:     return NextResponse.json({ ok: true, provider }, { headers: HEADERS });
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 94

```text
   90: }
   91: 
   92: export async function POST(request: Request, context: RouteContext) {
   93:   try {
>  94:     const projectId = await projectIdFrom(context);
   95:     parseCharacterCanonicalPoseGenerateRequest(
   96:       (await request.json()) as unknown,
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 96

```text
   92: export async function POST(request: Request, context: RouteContext) {
   93:   try {
   94:     const projectId = await projectIdFrom(context);
   95:     parseCharacterCanonicalPoseGenerateRequest(
>  96:       (await request.json()) as unknown,
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 98

```text
   94:     const projectId = await projectIdFrom(context);
   95:     parseCharacterCanonicalPoseGenerateRequest(
   96:       (await request.json()) as unknown,
   97:     );
>  98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
  101:       return notFound(projectId);
  102:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 101

```text
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
> 101:       return notFound(projectId);
  102:     }
  103: 
  104:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  105:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 112

```text
  108: }
  109: 
  110: export async function PATCH(request: Request, context: RouteContext) {
  111:   try {
> 112:     const projectId = await projectIdFrom(context);
  113:     const input = parseCharacterCanonicalPoseActionRequest(
  114:       (await request.json()) as unknown,
  115:     );
  116:     const project =
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 114

```text
  110: export async function PATCH(request: Request, context: RouteContext) {
  111:   try {
  112:     const projectId = await projectIdFrom(context);
  113:     const input = parseCharacterCanonicalPoseActionRequest(
> 114:       (await request.json()) as unknown,
  115:     );
  116:     const project =
  117:       input.action === "approve"
  118:         ? await approveCharacterCanonicalPose(projectId)
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 118

```text
  114:       (await request.json()) as unknown,
  115:     );
  116:     const project =
  117:       input.action === "approve"
> 118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
  120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 120

```text
  116:     const project =
  117:       input.action === "approve"
  118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
> 120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
  124:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 121

```text
  117:       input.action === "approve"
  118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
  120:           ? await rejectCharacterCanonicalPose(projectId)
> 121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
  124:       return notFound(projectId);
  125:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 124

```text
  120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
> 124:       return notFound(projectId);
  125:     }
  126: 
  127:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  128:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 14

```text
   10: export const dynamic = "force-dynamic";
   11: 
   12: type CharacterConceptImageRouteContext = {
   13:   params: Promise<{
>  14:     projectId: string;
   15:     conceptId: string;
   16:   }>;
   17: };
   18: 
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 35

```text
   31:   context: CharacterConceptImageRouteContext
   32: ) {
   33:   try {
   34:     const params = await context.params;
>  35:     const projectId = decodeURIComponent(params.projectId);
   36:     const conceptId = decodeURIComponent(params.conceptId);
   37:     const project = await readCharacterProject(projectId);
   38: 
   39:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 37

```text
   33:   try {
   34:     const params = await context.params;
   35:     const projectId = decodeURIComponent(params.projectId);
   36:     const conceptId = decodeURIComponent(params.conceptId);
>  37:     const project = await readCharacterProject(projectId);
   38: 
   39:     if (!project) {
   40:       return imageNotFound();
   41:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 52

```text
   48:       return imageNotFound();
   49:     }
   50: 
   51:     const bytes = await readCharacterConceptImage({
>  52:       projectId,
   53:       conceptId,
   54:       imagePath: concept.imagePath,
   55:     });
   56: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 26

```text
   22: };
   23: 
   24: type CharacterConceptRouteContext = {
   25:   params: Promise<{
>  26:     projectId: string;
   27:   }>;
   28: };
   29: 
   30: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 30

```text
   26:     projectId: string;
   27:   }>;
   28: };
   29: 
>  30: async function readProjectId(
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
   33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 33

```text
   29: 
   30: async function readProjectId(
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
>  33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
   35: }
   36: 
   37: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 34

```text
   30: async function readProjectId(
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
   33:   const { projectId } = await context.params;
>  34:   return decodeURIComponent(projectId);
   35: }
   36: 
   37: function notFound(projectId: string) {
   38:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 37

```text
   33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
   35: }
   36: 
>  37: function notFound(projectId: string) {
   38:   return NextResponse.json(
   39:     {
   40:       ok: false,
   41:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 41

```text
   37: function notFound(projectId: string) {
   38:   return NextResponse.json(
   39:     {
   40:       ok: false,
>  41:       error: `Character Forge project not found: ${projectId}.`,
   42:     },
   43:     { status: 404, headers: NO_STORE_HEADERS }
   44:   );
   45: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 94

```text
   90:   _request: Request,
   91:   context: CharacterConceptRouteContext
   92: ) {
   93:   try {
>  94:     const projectId = await readProjectId(context);
   95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
   98:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 95

```text
   91:   context: CharacterConceptRouteContext
   92: ) {
   93:   try {
   94:     const projectId = await readProjectId(context);
>  95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
   98:       return notFound(projectId);
   99:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 98

```text
   94:     const projectId = await readProjectId(context);
   95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
>  98:       return notFound(projectId);
   99:     }
  100: 
  101:     const provider = await getCharacterConceptProviderStatus();
  102: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 124

```text
  120:   _request: Request,
  121:   context: CharacterConceptRouteContext
  122: ) {
  123:   try {
> 124:     const projectId = await readProjectId(context);
  125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
  128:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 125

```text
  121:   context: CharacterConceptRouteContext
  122: ) {
  123:   try {
  124:     const projectId = await readProjectId(context);
> 125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
  128:       return notFound(projectId);
  129:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 128

```text
  124:     const projectId = await readProjectId(context);
  125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
> 128:       return notFound(projectId);
  129:     }
  130: 
  131:     return NextResponse.json(
  132:       {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 161

```text
  157:   request: Request,
  158:   context: CharacterConceptRouteContext
  159: ) {
  160:   try {
> 161:     const projectId = await readProjectId(context);
  162:     const body = (await request.json()) as unknown;
  163:     const input = parseCharacterConceptActionRequest(body);
  164:     let project;
  165: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 162

```text
  158:   context: CharacterConceptRouteContext
  159: ) {
  160:   try {
  161:     const projectId = await readProjectId(context);
> 162:     const body = (await request.json()) as unknown;
  163:     const input = parseCharacterConceptActionRequest(body);
  164:     let project;
  165: 
  166:     switch (input.action) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 169

```text
  165: 
  166:     switch (input.action) {
  167:       case "select":
  168:         project = await selectCharacterProjectConcept(
> 169:           projectId,
  170:           input.conceptId
  171:         );
  172:         break;
  173:       case "clear-selection":
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 174

```text
  170:           input.conceptId
  171:         );
  172:         break;
  173:       case "clear-selection":
> 174:         project = await clearCharacterProjectConceptSelection(projectId);
  175:         break;
  176:       case "approve":
  177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 177

```text
  173:       case "clear-selection":
  174:         project = await clearCharacterProjectConceptSelection(projectId);
  175:         break;
  176:       case "approve":
> 177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
  179:       case "reset-generation":
  180:         project = await resetInterruptedCharacterConceptGeneration(projectId);
  181:         break;
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 180

```text
  176:       case "approve":
  177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
  179:       case "reset-generation":
> 180:         project = await resetInterruptedCharacterConceptGeneration(projectId);
  181:         break;
  182:     }
  183: 
  184:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 185

```text
  181:         break;
  182:     }
  183: 
  184:     if (!project) {
> 185:       return notFound(projectId);
  186:     }
  187: 
  188:     return NextResponse.json(
  189:       {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 25

```text
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
>  25:     const projectId = decodeURIComponent((await context.params).projectId);
   26:     const project = await readCharacterProject(projectId);
   27:     const anchor = project?.identityAnchor ?? null;
   28: 
   29:     if (!project || !anchor || !anchor.imagePath) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const projectId = decodeURIComponent((await context.params).projectId);
>  26:     const project = await readCharacterProject(projectId);
   27:     const anchor = project?.identityAnchor ?? null;
   28: 
   29:     if (!project || !anchor || !anchor.imagePath) {
   30:       return notFound();
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 34

```text
   30:       return notFound();
   31:     }
   32: 
   33:     const bytes = await readCharacterIdentityAnchorImage({
>  34:       projectId,
   35:       imagePath: anchor.imagePath,
   36:     });
   37: 
   38:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 26

```text
   22:   "image/webp",
   23: ]);
   24: 
   25: type RouteContext = {
>  26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 29

```text
   25: type RouteContext = {
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
>  29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 30

```text
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
>  30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 33

```text
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
>  33: function notFound(projectId: string) {
   34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS }
   37:   );
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 35

```text
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
>  35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS }
   37:   );
   38: }
   39: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 74

```text
   70: }
   71: 
   72: export async function POST(request: Request, context: RouteContext) {
   73:   try {
>  74:     const projectId = await projectIdFrom(context);
   75:     const formData = await request.formData();
   76:     const image = formData.get("image");
   77:     const metadataValue = formData.get("metadata");
   78: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 104

```text
  100:       );
  101:     }
  102: 
  103:     const metadata = parseCharacterIdentityAnchorMetadata(metadataValue);
> 104:     const project = await saveCharacterIdentityAnchor(projectId, {
  105:       bytes: new Uint8Array(await image.arrayBuffer()),
  106:       mimeType: image.type as "image/png" | "image/jpeg" | "image/webp",
  107:       width: metadata.width,
  108:       height: metadata.height,
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 113

```text
  109:       crop: metadata.crop,
  110:     });
  111: 
  112:     if (!project) {
> 113:       return notFound(projectId);
  114:     }
  115: 
  116:     return NextResponse.json(
  117:       { ok: true, project },
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 127

```text
  123: }
  124: 
  125: export async function PATCH(request: Request, context: RouteContext) {
  126:   try {
> 127:     const projectId = await projectIdFrom(context);
  128:     const input = parseCharacterIdentityAnchorActionRequest(
  129:       (await request.json()) as unknown
  130:     );
  131:     const project =
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 129

```text
  125: export async function PATCH(request: Request, context: RouteContext) {
  126:   try {
  127:     const projectId = await projectIdFrom(context);
  128:     const input = parseCharacterIdentityAnchorActionRequest(
> 129:       (await request.json()) as unknown
  130:     );
  131:     const project =
  132:       input.action === "approve"
  133:         ? await approveCharacterIdentityAnchor(projectId)
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 133

```text
  129:       (await request.json()) as unknown
  130:     );
  131:     const project =
  132:       input.action === "approve"
> 133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
  135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 135

```text
  131:     const project =
  132:       input.action === "approve"
  133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
> 135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
  139:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 136

```text
  132:       input.action === "approve"
  133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
  135:           ? await clearCharacterIdentityAnchor(projectId)
> 136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
  139:       return notFound(projectId);
  140:     }
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 139

```text
  135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
> 139:       return notFound(projectId);
  140:     }
  141: 
  142:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  143:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 22

```text
   18:   "exported",
   19: ]);
   20: 
   21: type RouteContext = {
>  22:   params: Promise<{ projectId: string }>;
   23: };
   24: 
   25: function notFound() {
   26:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 34

```text
   30: }
   31: 
   32: export async function GET(_request: Request, context: RouteContext) {
   33:   try {
>  34:     const projectId = decodeURIComponent((await context.params).projectId);
   35:     const project = await readCharacterProject(projectId);
   36:     const asset = project?.modelAsset ?? null;
   37: 
   38:     if (!project || !asset || !MODEL_VISIBLE_STATUSES.has(project.status)) {
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 35

```text
   31: 
   32: export async function GET(_request: Request, context: RouteContext) {
   33:   try {
   34:     const projectId = decodeURIComponent((await context.params).projectId);
>  35:     const project = await readCharacterProject(projectId);
   36:     const asset = project?.modelAsset ?? null;
   37: 
   38:     if (!project || !asset || !MODEL_VISIBLE_STATUSES.has(project.status)) {
   39:       return notFound();
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 43

```text
   39:       return notFound();
   40:     }
   41: 
   42:     const bytes = await readCharacterModelGlb({
>  43:       projectId,
   44:       filePath: asset.filePath,
   45:     });
   46: 
   47:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 26

```text
   22: 
   23: const HEADERS = { "Cache-Control": "no-store" };
   24: 
   25: type RouteContext = {
>  26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 29

```text
   25: type RouteContext = {
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
>  29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 30

```text
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
>  30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 33

```text
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
>  33: function notFound(projectId: string) {
   34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS },
   37:   );
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 35

```text
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
>  35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS },
   37:   );
   38: }
   39: 
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 81

```text
   77: }
   78: 
   79: export async function GET(_request: Request, context: RouteContext) {
   80:   try {
>  81:     const projectId = await projectIdFrom(context);
   82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 82

```text
   78: 
   79: export async function GET(_request: Request, context: RouteContext) {
   80:   try {
   81:     const projectId = await projectIdFrom(context);
>  82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 85

```text
   81:     const projectId = await projectIdFrom(context);
   82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
>  85:       return notFound(projectId);
   86:     }
   87: 
   88:     return NextResponse.json(
   89:       { ok: true, project: result.project, provider: result.provider },
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 99

```text
   95: }
   96: 
   97: export async function POST(request: Request, context: RouteContext) {
   98:   try {
>  99:     const projectId = await projectIdFrom(context);
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 100

```text
   96: 
   97: export async function POST(request: Request, context: RouteContext) {
   98:   try {
   99:     const projectId = await projectIdFrom(context);
> 100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
  104:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 101

```text
   97: export async function POST(request: Request, context: RouteContext) {
   98:   try {
   99:     const projectId = await projectIdFrom(context);
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
> 101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
  104:       return notFound(projectId);
  105:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 104

```text
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
> 104:       return notFound(projectId);
  105:     }
  106: 
  107:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  108:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 115

```text
  111: }
  112: 
  113: export async function PATCH(request: Request, context: RouteContext) {
  114:   try {
> 115:     const projectId = await projectIdFrom(context);
  116:     const input = parseCharacterModelActionRequest(
  117:       (await request.json()) as unknown,
  118:     );
  119:     const project =
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 117

```text
  113: export async function PATCH(request: Request, context: RouteContext) {
  114:   try {
  115:     const projectId = await projectIdFrom(context);
  116:     const input = parseCharacterModelActionRequest(
> 117:       (await request.json()) as unknown,
  118:     );
  119:     const project =
  120:       input.action === "approve"
  121:         ? await approveCharacterModel(projectId)
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 121

```text
  117:       (await request.json()) as unknown,
  118:     );
  119:     const project =
  120:       input.action === "approve"
> 121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
  123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 123

```text
  119:     const project =
  120:       input.action === "approve"
  121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
> 123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
  127:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 124

```text
  120:       input.action === "approve"
  121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
  123:           ? await rejectCharacterModel(projectId)
> 124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
  127:       return notFound(projectId);
  128:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 127

```text
  123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
> 127:       return notFound(projectId);
  128:     }
  129: 
  130:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  131:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string; viewId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const params = await context.params;
>  26:     const projectId = decodeURIComponent(params.projectId);
   27:     const viewId = decodeURIComponent(params.viewId);
   28:     const project = await readCharacterProject(projectId);
   29:     const view = project?.referenceSheet?.views.find(
   30:       (candidate) => candidate.id === viewId
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 28

```text
   24:   try {
   25:     const params = await context.params;
   26:     const projectId = decodeURIComponent(params.projectId);
   27:     const viewId = decodeURIComponent(params.viewId);
>  28:     const project = await readCharacterProject(projectId);
   29:     const view = project?.referenceSheet?.views.find(
   30:       (candidate) => candidate.id === viewId
   31:     );
   32: 
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 38

```text
   34:       return notFound();
   35:     }
   36: 
   37:     const bytes = await readCharacterReferenceImage({
>  38:       projectId,
   39:       viewId,
   40:       imagePath: view.imagePath,
   41:     });
   42: 
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 20

```text
   16: };
   17: 
   18: type CharacterProjectRouteContext = {
   19:   params: Promise<{
>  20:     projectId: string;
   21:   }>;
   22: };
   23: 
   24: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 24

```text
   20:     projectId: string;
   21:   }>;
   22: };
   23: 
>  24: async function readProjectId(
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
   27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 27

```text
   23: 
   24: async function readProjectId(
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
>  27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
   29: }
   30: 
   31: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 28

```text
   24: async function readProjectId(
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
   27:   const { projectId } = await context.params;
>  28:   return decodeURIComponent(projectId);
   29: }
   30: 
   31: function notFound(projectId: string) {
   32:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 31

```text
   27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
   29: }
   30: 
>  31: function notFound(projectId: string) {
   32:   return NextResponse.json(
   33:     {
   34:       ok: false,
   35:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 35

```text
   31: function notFound(projectId: string) {
   32:   return NextResponse.json(
   33:     {
   34:       ok: false,
>  35:       error: `Character Forge project not found: ${projectId}.`,
   36:     },
   37:     { status: 404, headers: NO_STORE_HEADERS }
   38:   );
   39: }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 46

```text
   42:   _request: Request,
   43:   context: CharacterProjectRouteContext
   44: ) {
   45:   try {
>  46:     const projectId = await readProjectId(context);
   47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
   50:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 47

```text
   43:   context: CharacterProjectRouteContext
   44: ) {
   45:   try {
   46:     const projectId = await readProjectId(context);
>  47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
   50:       return notFound(projectId);
   51:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 50

```text
   46:     const projectId = await readProjectId(context);
   47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
>  50:       return notFound(projectId);
   51:     }
   52: 
   53:     return NextResponse.json(
   54:       {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 88

```text
   84:   request: Request,
   85:   context: CharacterProjectRouteContext
   86: ) {
   87:   try {
>  88:     const projectId = await readProjectId(context);
   89:     const body = (await request.json()) as unknown;
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 89

```text
   85:   context: CharacterProjectRouteContext
   86: ) {
   87:   try {
   88:     const projectId = await readProjectId(context);
>  89:     const body = (await request.json()) as unknown;
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 91

```text
   87:   try {
   88:     const projectId = await readProjectId(context);
   89:     const body = (await request.json()) as unknown;
   90:     const input = parseUpdateCharacterProjectRequest(body);
>  91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
   94:       return notFound(projectId);
   95:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 94

```text
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
>  94:       return notFound(projectId);
   95:     }
   96: 
   97:     return NextResponse.json(
   98:       {
```


## Unified memory context

### `lib\chernobog\memory-architecture\contextIntegration.ts`

```text
   1: import {
   2:   buildMemoryContext,
   3: } from "./contextBuilder";
   4: import {
   5:   readUnifiedMemory,
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
  48: function normalizeLimit(
  49:   value?: number,
  50: ): number {
  51:   if (
  52:     typeof value !== "number" ||
  53:     !Number.isFinite(value)
  54:   ) {
  55:     return 12;
  56:   }
  57: 
  58:   return Math.max(
  59:     1,
  60:     Math.min(
  61:       40,
  62:       Math.trunc(value),
  63:     ),
  64:   );
  65: }
  66: 
  67: function dedupeLines(
  68:   lines: string[],
  69: ): string[] {
  70:   const seen =
  71:     new Set<string>();
  72: 
  73:   const output:
  74:     string[] = [];
  75: 
  76:   for (const line of lines) {
  77:     const normalized =
  78:       line.trim();
  79: 
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
  98:     record.projectId
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
 117:   }
 118: 
 119:   return `${title}:\n${lines
 120:     .map((line) => `- ${line}`)
 121:     .join("\n")}`;
 122: }
 123: 
 124: export async function buildUnifiedMemoryContext(
 125:   input:
 126:     BuildUnifiedMemoryContextInput,
 127:   readers?: UnifiedMemoryReaderMap,
 128: ): Promise<BuiltUnifiedMemoryContext> {
 129:   const legacy =
 130:     buildMemoryContext(input);
 131:   const legacyCoreSystemText = [
 132:     "Chernobog memory context is layered.",
 133:     "Use short-term memory for recent conversation flow.",
 134:     "Use working memory for the active session, files, workflows, and plans.",
 135:     "Long-term memory is supplied only by the unified retrieval path below.",
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
 200:       ),
 201:     records: [],
 202:     sourcesQueried: [],
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
 254:             .sourcesQueried,
 255:           ...learnedRetrieval
 256:             .sourcesQueried,
 257:         ]),
 258:       ].sort(),
 259:       sourceResults: [
 260:         ...contextualRetrieval
 261:           .sourceResults,
 262:         ...learnedRetrieval
 263:           .sourceResults,
 264:       ]
 265:         .map(
 266:           (result) =>
 267:             structuredClone(
 268:               result,
 269:             ),
 270:         )
 271:         .sort(
 272:           (a, b) =>
 273:             a.source.localeCompare(
 274:               b.source,
 275:             ),
 276:         ),
 277:       sourceErrors: [
 278:         ...contextualRetrieval
 279:           .sourceErrors,
 280:         ...learnedRetrieval
 281:           .sourceErrors,
 282:       ]
 283:         .map(
 284:           (error) =>
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
 321:               "learned-lessons" &&
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
 340:   };
... truncated at 340 of 403 lines ...
```

### `lib\chernobog\memory-architecture\unifiedTypes.ts`

```text
   1: export type UnifiedMemoryLayer =
   2:   | "short_term"
   3:   | "working"
   4:   | "long_term"
   5:   | "learned";
   6: 
   7: export type UnifiedMemoryDurability =
   8:   | "ephemeral"
   9:   | "session"
  10:   | "persistent";
  11: 
  12: export type UnifiedMemoryScope =
  13:   | "conversation"
  14:   | "session"
  15:   | "user"
  16:   | "project"
  17:   | "system";
  18: 
  19: export type UnifiedMemorySourceId =
  20:   | "conversation-history"
  21:   | "session-state"
  22:   | "durable-facts"
  23:   | "vault-structured-memory"
  24:   | "project-memory-profile"
  25:   | "personal-intelligence"
  26:   | "learned-lessons";
  27: 
  28: export interface UnifiedMemoryRecord {
  29:   id: string;
  30:   source: UnifiedMemorySourceId;
  31:   layer: UnifiedMemoryLayer;
  32:   scope: UnifiedMemoryScope;
  33:   content: string;
  34:   key?: string;
  35:   sessionId?: string;
  36:   projectId?: string;
  37:   createdAt?: string;
  38:   updatedAt?: string;
  39:   confidence?: number;
  40:   metadata?: Record<string, unknown>;
  41: }
  42: 
  43: export interface UnifiedMemorySourceDescriptor {
  44:   id: UnifiedMemorySourceId;
  45:   label: string;
  46:   layer: UnifiedMemoryLayer;
  47:   durability: UnifiedMemoryDurability;
  48:   scopes: UnifiedMemoryScope[];
  49:   readable: boolean;
  50:   writable: boolean;
  51:   authorities: string[];
  52:   role:
  53:     | "conversation-history"
  54:     | "working-state"
  55:     | "durable-fact-store"
  56:     | "structured-vault-memory"
  57:     | "project-memory"
  58:     | "personal-intelligence"
  59:     | "governed-learning";
  60: }
  61: 
  62: export interface UnifiedMemorySourceSnapshot {
  63:   sourceCount: number;
  64:   sources: UnifiedMemorySourceDescriptor[];
  65:   layers: UnifiedMemoryLayer[];
  66:   persistentSourceCount: number;
  67:   writableSourceCount: number;
  68:   authorities: string[];
  69: }
```


## Project memory adapters and scope handling

Pattern: `project-memory-profile|projectId|scope:\s*"project"|query\.projectId|getProject|project memory`

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 23

```text
   18: } from "./types";
   19: 
   20: const DEFAULT_CONTEXT_SOURCES:
   21:   UnifiedMemorySourceId[] = [
   22:     "vault-structured-memory",
>  23:     "project-memory-profile",
   24:     "learned-lessons",
   25:   ];
   26: 
   27: export interface BuildUnifiedMemoryContextInput
   28:   extends BuildMemoryContextInput {
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 29

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 98

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 99

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 169

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 170

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 180

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 181

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 235

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 236

```text
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
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 361

```text
  356: 
  357:   const systemText = [
  358:     legacyCoreSystemText,
  359:     "",
  360:     "Additional unified memory rules:",
> 361:     "Use retrieved approved/project memory only when relevant to the current request.",
  362:     "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
  363:     "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
  364:     "Do not infer missing memories from source names or metadata.",
  365:     "",
  366:     blockToText(
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 221

```text
  216:             statuses: [
  217:               "approved",
  218:             ],
  219:             text:
  220:               query.text,
> 221:             projectId:
  222:               query.projectId,
  223:             limit:
  224:               query.limit,
  225:           });
  226: 
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 222

```text
  217:               "approved",
  218:             ],
  219:             text:
  220:               query.text,
  221:             projectId:
> 222:               query.projectId,
  223:             limit:
  224:               query.limit,
  225:           });
  226: 
  227:         return entries.map((entry) =>
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 236

```text
  231:             source:
  232:               "vault-structured-memory",
  233:             layer:
  234:               "long_term",
  235:             scope:
> 236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
  239:             projectId:
  240:               entry.projectId,
  241:             content:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 239

```text
  234:               "long_term",
  235:             scope:
  236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
> 239:             projectId:
  240:               entry.projectId,
  241:             content:
  242:               [
  243:                 entry.title,
  244:                 entry.body,
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 240

```text
  235:             scope:
  236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
  239:             projectId:
> 240:               entry.projectId,
  241:             content:
  242:               [
  243:                 entry.title,
  244:                 entry.body,
  245:               ]
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 272

```text
  267:             },
  268:           }),
  269:         );
  270:       },
  271: 
> 272:     "project-memory-profile":
  273:       async (query) => {
  274:         const store =
  275:           createProjectMemoryProfileStore();
  276: 
  277:         const selectedProfile =
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 278

```text
  273:       async (query) => {
  274:         const store =
  275:           createProjectMemoryProfileStore();
  276: 
  277:         const selectedProfile =
> 278:           query.projectId
  279:             ? await store.getProfile(
  280:                 query.projectId,
  281:               )
  282:             : undefined;
  283: 
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 280

```text
  275:           createProjectMemoryProfileStore();
  276: 
  277:         const selectedProfile =
  278:           query.projectId
  279:             ? await store.getProfile(
> 280:                 query.projectId,
  281:               )
  282:             : undefined;
  283: 
  284:         const profiles =
  285:           query.projectId
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 285

```text
  280:                 query.projectId,
  281:               )
  282:             : undefined;
  283: 
  284:         const profiles =
> 285:           query.projectId
  286:             ? selectedProfile
  287:               ? [selectedProfile]
  288:               : []
  289:             : await store.listProfiles();
  290: 
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 293

```text
  288:               : []
  289:             : await store.listProfiles();
  290: 
  291:         const versions =
  292:           await store.listVersions({
> 293:             projectId:
  294:               query.projectId,
  295:           });
  296: 
  297:         return [
  298:           ...profiles.map((profile) =>
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 294

```text
  289:             : await store.listProfiles();
  290: 
  291:         const versions =
  292:           await store.listVersions({
  293:             projectId:
> 294:               query.projectId,
  295:           });
  296: 
  297:         return [
  298:           ...profiles.map((profile) =>
  299:             cloneRecord({
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 301

```text
  296: 
  297:         return [
  298:           ...profiles.map((profile) =>
  299:             cloneRecord({
  300:               id:
> 301:                 `project:${profile.projectId}`,
  302:               source:
  303:                 "project-memory-profile",
  304:               layer:
  305:                 "long_term",
  306:               scope:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 303

```text
  298:           ...profiles.map((profile) =>
  299:             cloneRecord({
  300:               id:
  301:                 `project:${profile.projectId}`,
  302:               source:
> 303:                 "project-memory-profile",
  304:               layer:
  305:                 "long_term",
  306:               scope:
  307:                 "project",
  308:               projectId:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 308

```text
  303:                 "project-memory-profile",
  304:               layer:
  305:                 "long_term",
  306:               scope:
  307:                 "project",
> 308:               projectId:
  309:                 profile.projectId,
  310:               key:
  311:                 profile.projectId,
  312:               content:
  313:                 JSON.stringify(
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 309

```text
  304:               layer:
  305:                 "long_term",
  306:               scope:
  307:                 "project",
  308:               projectId:
> 309:                 profile.projectId,
  310:               key:
  311:                 profile.projectId,
  312:               content:
  313:                 JSON.stringify(
  314:                   profile,
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 311

```text
  306:               scope:
  307:                 "project",
  308:               projectId:
  309:                 profile.projectId,
  310:               key:
> 311:                 profile.projectId,
  312:               content:
  313:                 JSON.stringify(
  314:                   profile,
  315:                 ),
  316:               createdAt:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 335

```text
  330:           ...versions.map((version) =>
  331:             cloneRecord({
  332:               id:
  333:                 `project-version:${version.id}`,
  334:               source:
> 335:                 "project-memory-profile",
  336:               layer:
  337:                 "long_term",
  338:               scope:
  339:                 "project",
  340:               projectId:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 340

```text
  335:                 "project-memory-profile",
  336:               layer:
  337:                 "long_term",
  338:               scope:
  339:                 "project",
> 340:               projectId:
  341:                 version.projectId,
  342:               key:
  343:                 version.version,
  344:               content:
  345:                 JSON.stringify(
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 341

```text
  336:               layer:
  337:                 "long_term",
  338:               scope:
  339:                 "project",
  340:               projectId:
> 341:                 version.projectId,
  342:               key:
  343:                 version.version,
  344:               content:
  345:                 JSON.stringify(
  346:                   version,
```

### `lib\chernobog\memory-architecture\readRelevance.ts` line 49

```text
   44:   }
   45: 
   46:   const haystack = [
   47:     record.content,
   48:     record.key ?? "",
>  49:     record.projectId ?? "",
   50:     record.source,
   51:     record.layer,
   52:     record.scope,
   53:     JSON.stringify(record.metadata ?? {}),
   54:   ]
```

### `lib\chernobog\memory-architecture\readTypes.ts` line 10

```text
    5: 
    6: export interface UnifiedMemoryReadQuery {
    7:   text?: string;
    8:   sources?: UnifiedMemorySourceId[];
    9:   sessionId?: string;
>  10:   projectId?: string;
   11:   limit?: number;
   12: }
   13: 
   14: export interface UnifiedMemorySourceReadResult {
   15:   source: UnifiedMemorySourceId;
```

### `lib\chernobog\memory-architecture\sourceRegistry.ts` line 72

```text
   67:       "lib/modules/vault-brain/structuredRecall.ts",
   68:     ],
   69:     role: "structured-vault-memory",
   70:   },
   71:   {
>  72:     id: "project-memory-profile",
   73:     label: "Project memory profile",
   74:     layer: "long_term",
   75:     durability: "persistent",
   76:     scopes: ["project"],
   77:     readable: true,
```

### `lib\chernobog\memory-architecture\sourceRegistry.ts` line 73

```text
   68:     ],
   69:     role: "structured-vault-memory",
   70:   },
   71:   {
   72:     id: "project-memory-profile",
>  73:     label: "Project memory profile",
   74:     layer: "long_term",
   75:     durability: "persistent",
   76:     scopes: ["project"],
   77:     readable: true,
   78:     writable: true,
```

### `lib\chernobog\memory-architecture\status.ts` line 75

```text
   70:     "direct",
   71:   "durable-facts":
   72:     "direct",
   73:   "vault-structured-memory":
   74:     "staged-raw",
>  75:   "project-memory-profile":
   76:     "direct",
   77:   "personal-intelligence":
   78:     "domain-owned",
   79:   "learned-lessons":
   80:     "governed-only",
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 68

```text
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
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 70

```text
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
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 84

```text
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
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 85

```text
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
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 86

```text
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
```

### `lib\chernobog\memory-architecture\unifiedTypes.ts` line 24

```text
   19: export type UnifiedMemorySourceId =
   20:   | "conversation-history"
   21:   | "session-state"
   22:   | "durable-facts"
   23:   | "vault-structured-memory"
>  24:   | "project-memory-profile"
   25:   | "personal-intelligence"
   26:   | "learned-lessons";
   27: 
   28: export interface UnifiedMemoryRecord {
   29:   id: string;
```

### `lib\chernobog\memory-architecture\unifiedTypes.ts` line 36

```text
   31:   layer: UnifiedMemoryLayer;
   32:   scope: UnifiedMemoryScope;
   33:   content: string;
   34:   key?: string;
   35:   sessionId?: string;
>  36:   projectId?: string;
   37:   createdAt?: string;
   38:   updatedAt?: string;
   39:   confidence?: number;
   40:   metadata?: Record<string, unknown>;
   41: }
```

### `lib\chernobog\memory-architecture\unifiedWriter.ts` line 51

```text
   46:       return writeDurableFactMemory(request);
   47: 
   48:     case "vault-structured-memory":
   49:       return writeVaultRawMemory(request);
   50: 
>  51:     case "project-memory-profile":
   52:       return writeProjectMemory(request);
   53: 
   54:     case "personal-intelligence":
   55:     case "learned-lessons":
   56:       return {
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 145

```text
  140:       request.title?.trim() ||
  141:       content.slice(0, 96),
  142:     body: content,
  143:     source:
  144:       request.sourceKind ?? "manual",
> 145:     projectId:
  146:       request.projectId,
  147:     version:
  148:       request.version,
  149:     tags:
  150:       request.tags,
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 146

```text
  141:       content.slice(0, 96),
  142:     body: content,
  143:     source:
  144:       request.sourceKind ?? "manual",
  145:     projectId:
> 146:       request.projectId,
  147:     version:
  148:       request.version,
  149:     tags:
  150:       request.tags,
  151:     confidence:
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 164

```text
  159:     status: "staged",
  160:     id: entry.id,
  161:     metadata: {
  162:       vaultStatus: entry.status,
  163:       memoryType: entry.memoryType,
> 164:       projectId: entry.projectId,
  165:       reviewRequired: true,
  166:     },
  167:   };
  168: }
  169: 
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 173

```text
  168: }
  169: 
  170: export async function writeProjectMemory(
  171:   request: Extract<
  172:     UnifiedMemoryWriteRequest,
> 173:     { source: "project-memory-profile" }
  174:   >,
  175: ): Promise<UnifiedMemoryWriteResult> {
  176:   const store =
  177:     createProjectMemoryProfileStore();
  178: 
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 187

```text
  182:     );
  183: 
  184:     return {
  185:       source: request.source,
  186:       status: "written",
> 187:       id: `project:${profile.projectId}`,
  188:       metadata: {
  189:         kind: "project",
  190:         projectId: profile.projectId,
  191:         status: profile.status,
  192:       },
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 190

```text
  185:       source: request.source,
  186:       status: "written",
  187:       id: `project:${profile.projectId}`,
  188:       metadata: {
  189:         kind: "project",
> 190:         projectId: profile.projectId,
  191:         status: profile.status,
  192:       },
  193:     };
  194:   }
  195: 
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 206

```text
  201:     source: request.source,
  202:     status: "written",
  203:     id: `project-version:${version.id}`,
  204:     metadata: {
  205:       kind: "version",
> 206:       projectId: version.projectId,
  207:       version: version.version,
  208:       status: version.status,
  209:     },
  210:   };
  211: }
```

### `lib\chernobog\memory-architecture\writePolicy.ts` line 34

```text
   29:     policy: "staged-raw",
   30:     authority: "lib/modules/vault-brain/memoryStore.ts#createRawEntry",
   31:     reason: "Unified writes may enter the Vault review pipeline only as raw memory and cannot become approved truth automatically.",
   32:   },
   33:   {
>  34:     source: "project-memory-profile",
   35:     policy: "direct",
   36:     authority: "lib/modules/vault-brain/projectProfileStore.ts#upsertProfile/upsertVersion",
   37:     reason: "Project and version profiles retain their existing audited domain store.",
   38:   },
   39:   {
```

### `lib\chernobog\memory-architecture\writeTypes.ts` line 57

```text
   52:     }
   53:   | {
   54:       source: "vault-structured-memory";
   55:       title?: string;
   56:       content: string;
>  57:       projectId?: string;
   58:       version?: string;
   59:       sourceKind?: VaultMemorySource;
   60:       tags?: string[];
   61:       confidence?: number;
   62:       sourceRef?: VaultSourceRef;
```

### `lib\chernobog\memory-architecture\writeTypes.ts` line 65

```text
   60:       tags?: string[];
   61:       confidence?: number;
   62:       sourceRef?: VaultSourceRef;
   63:     }
   64:   | {
>  65:       source: "project-memory-profile";
   66:       kind: "project";
   67:       input: ProjectMemoryProfileInput;
   68:     }
   69:   | {
   70:       source: "project-memory-profile";
```

### `lib\chernobog\memory-architecture\writeTypes.ts` line 70

```text
   65:       source: "project-memory-profile";
   66:       kind: "project";
   67:       input: ProjectMemoryProfileInput;
   68:     }
   69:   | {
>  70:       source: "project-memory-profile";
   71:       kind: "version";
   72:       input: VersionMemoryProfileInput;
   73:     }
   74:   | {
   75:       source: "personal-intelligence";
```


## Project Operations canonical identity

### `lib\modules\project-operations\index.ts`

```text
   1: export * from "./commands/executeProjectOperationsCommand";
   2: export * from "./commands/parseProjectOperationsCommand";
   3: export * from "./module";
   4: export * from "./repository";
   5: export * from "./service";
   6: export * from "./types";
```

### `lib\modules\project-operations\types.ts`

```text
   1: export type ProjectStatus =
   2:   | "Active"
   3:   | "Planning"
   4:   | "Blocked"
   5:   | "Polish"
   6:   | "Archived";
   7: 
   8: export type RepoHealth = "Healthy" | "Watch" | "Needs Attention";
   9: 
  10: export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
  11: 
  12: export type TaskColumnId = "backlog" | "next" | "doing" | "done";
  13: 
  14: export type ActivityType = "project" | "task" | "note" | "link" | "system";
  15: 
  16: export type ProjectActivityEntry = {
  17:   id: string;
  18:   type: ActivityType;
  19:   summary: string;
  20:   detail?: string;
  21:   createdAt: string;
  22: };
  23: 
  24: export type ProjectTaskCard = {
  25:   id: string;
  26:   title: string;
  27:   description: string;
  28:   priority: TaskPriority;
  29:   due: string;
  30:   urgent: boolean;
  31:   column: TaskColumnId;
  32:   archived: boolean;
  33:   createdAt: string;
  34:   updatedAt: string;
  35: };
  36: 
  37: export type ProjectBoard = {
  38:   id: string;
  39:   name: string;
  40:   description: string;
  41:   cards: ProjectTaskCard[];
  42: };
  43: 
  44: export type ProjectNote = {
  45:   id: string;
  46:   title: string;
  47:   content: string;
  48:   pinned: boolean;
  49:   archived: boolean;
  50:   createdAt: string;
  51:   updatedAt: string;
  52: };
  53: 
  54: export type ProjectLink = {
  55:   id: string;
  56:   label: string;
  57:   url: string;
  58:   type: string;
  59:   createdAt: string;
  60: };
  61: 
  62: export type Project = {
  63:   id: string;
  64:   name: string;
  65:   slug: string;
  66:   summary: string;
  67:   status: ProjectStatus;
  68:   repoHealth: RepoHealth;
  69:   repoName: string;
  70:   repoPath?: string;
  71:   focus: string;
  72:   nextAction: string;
  73:   blockers: string[];
  74:   archived: boolean;
  75:   createdAt: string;
  76:   updatedAt: string;
  77:   boards: ProjectBoard[];
  78:   notes: ProjectNote[];
  79:   links: ProjectLink[];
  80:   activity: ProjectActivityEntry[];
  81: };
  82: 
  83: export type ProjectStats = {
  84:   boardCount: number;
  85:   noteCount: number;
  86:   urgentCount: number;
  87:   doingCount: number;
  88:   totalCards: number;
  89:   doneCount: number;
  90:   progress: number;
  91:   blocked: boolean;
  92: };
  93: 
  94: export type ProjectTaskResult = {
  95:   project: Project;
  96:   board: ProjectBoard;
  97:   card: ProjectTaskCard;
  98: };
  99: 
 100: export type ProjectNoteResult = {
 101:   project: Project;
 102:   note: ProjectNote;
 103: };
 104: 
 105: export type RecentActivityResult = {
 106:   project: Project;
 107:   entry: ProjectActivityEntry;
 108: };
 109: 
 110: export type ProjectDashboardSnapshot = {
 111:   projects: Project[];
 112:   commandFocus?: Project;
 113:   urgentTasks: ProjectTaskResult[];
 114:   nextTasks: ProjectTaskResult[];
 115:   doingTasks: ProjectTaskResult[];
 116:   repoWatch: Project[];
 117:   blockedProjects: Project[];
 118:   staleProjects: Project[];
 119:   recentActivity: RecentActivityResult[];
 120: };
 121: 
 122: export type ProjectSettingsInput = {
 123:   name: string;
 124:   summary: string;
 125:   status: ProjectStatus;
 126:   repoHealth: RepoHealth;
 127:   repoName: string;
 128:   repoPath?: string;
 129:   focus: string;
 130:   nextAction: string;
 131:   blockers: string[];
 132: };
 133: 
 134: export type TaskCardInput = {
 135:   title: string;
 136:   description: string;
 137:   priority: TaskPriority;
 138:   due: string;
 139:   urgent: boolean;
 140:   column: TaskColumnId;
 141: };
 142: 
 143: export type ProjectNoteInput = {
 144:   title: string;
 145:   content: string;
 146:   pinned: boolean;
 147: };
 148: 
 149: export type ProjectLinkInput = {
 150:   label: string;
 151:   url: string;
 152:   type: string;
 153: };
 154: 
 155: export type ProjectOperationsModuleCommand =
 156:   | { kind: "project_operations_status" }
 157:   | { kind: "project_list" }
 158:   | { kind: "project_urgent_list" }
 159:   | { kind: "project_show"; projectQuery: string }
 160:   | { kind: "project_create"; name: string }
 161:   | {
 162:       kind: "project_task_add";
 163:       projectQuery: string;
 164:       title: string;
 165:       urgent: boolean;
 166:     }
 167:   | {
 168:       kind: "project_task_move";
 169:       taskIdentifier: string;
 170:       column: TaskColumnId;
 171:     }
 172:   | { kind: "project_task_complete"; taskIdentifier: string }
 173:   | { kind: "project_focus_set"; projectQuery: string; focus: string }
 174:   | {
 175:       kind: "project_next_action_set";
 176:       projectQuery: string;
 177:       nextAction: string;
 178:     };
 179: 
 180: export type ProjectOperationsCommandResult = {
 181:   ok: boolean;
 182:   title: string;
 183:   message: string;
 184:   data?: Record<string, unknown>;
 185: };
```

### `lib\modules\project-operations\repository.ts`

```text
   1: import { db } from "@/lib/chernobog/db";
   2: 
   3: import { createInitialProjectSeed } from "./seed";
   4: import type { Project } from "./types";
   5: 
   6: type ProjectRow = {
   7:   id: string;
   8:   slug: string;
   9:   project_json: string;
  10:   archived: number;
  11:   created_at: string;
  12:   updated_at: string;
  13: };
  14: 
  15: db.pragma("foreign_keys = ON");
  16: 
  17: db.exec(`
  18:   CREATE TABLE IF NOT EXISTS project_operations_projects (
  19:     id TEXT PRIMARY KEY,
  20:     slug TEXT NOT NULL UNIQUE,
  21:     project_json TEXT NOT NULL,
  22:     archived INTEGER NOT NULL DEFAULT 0,
  23:     created_at TEXT NOT NULL,
  24:     updated_at TEXT NOT NULL
  25:   );
  26: 
  27:   CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
  28:   ON project_operations_projects (archived, updated_at DESC);
  29: `);
  30: 
  31: const listProjectsStatement = db.prepare(`
  32:   SELECT id, slug, project_json, archived, created_at, updated_at
  33:   FROM project_operations_projects
  34:   ORDER BY archived ASC, updated_at DESC, slug ASC
  35: `);
  36: 
  37: const getProjectBySlugStatement = db.prepare(`
  38:   SELECT id, slug, project_json, archived, created_at, updated_at
  39:   FROM project_operations_projects
  40:   WHERE slug = ?
  41:   LIMIT 1
  42: `);
  43: 
  44: const countProjectsStatement = db.prepare(`
  45:   SELECT COUNT(*) AS count
  46:   FROM project_operations_projects
  47: `);
  48: 
  49: const upsertProjectStatement = db.prepare(`
  50:   INSERT INTO project_operations_projects (
  51:     id,
  52:     slug,
  53:     project_json,
  54:     archived,
  55:     created_at,
  56:     updated_at
  57:   )
  58:   VALUES (?, ?, ?, ?, ?, ?)
  59:   ON CONFLICT(id) DO UPDATE SET
  60:     slug = excluded.slug,
  61:     project_json = excluded.project_json,
  62:     archived = excluded.archived,
  63:     updated_at = excluded.updated_at
  64: `);
  65: 
  66: function isProject(value: unknown): value is Project {
  67:   if (!value || typeof value !== "object") return false;
  68: 
  69:   const candidate = value as Partial<Project>;
  70:   return (
  71:     typeof candidate.id === "string" &&
  72:     typeof candidate.slug === "string" &&
  73:     typeof candidate.name === "string" &&
  74:     Array.isArray(candidate.boards) &&
  75:     Array.isArray(candidate.notes) &&
  76:     Array.isArray(candidate.links) &&
  77:     Array.isArray(candidate.activity)
  78:   );
  79: }
  80: 
  81: function parseProjectRow(row: ProjectRow): Project | undefined {
  82:   try {
  83:     const parsed = JSON.parse(row.project_json) as unknown;
  84:     if (!isProject(parsed)) return undefined;
  85: 
  86:     return {
  87:       ...parsed,
  88:       archived: Boolean(row.archived),
  89:       createdAt: parsed.createdAt || row.created_at,
  90:       updatedAt: parsed.updatedAt || row.updated_at,
  91:     };
  92:   } catch {
  93:     return undefined;
  94:   }
  95: }
  96: 
  97: function writeProjectUnsafe(project: Project): void {
  98:   upsertProjectStatement.run(
  99:     project.id,
 100:     project.slug,
 101:     JSON.stringify(project),
 102:     project.archived ? 1 : 0,
 103:     project.createdAt,
 104:     project.updatedAt,
 105:   );
 106: }
 107: 
 108: const seedProjectsTransaction = db.transaction((projects: Project[]) => {
 109:   for (const project of projects) {
 110:     writeProjectUnsafe(project);
 111:   }
 112: });
 113: 
 114: export function ensureProjectOperationsSeeded(): void {
 115:   const result = countProjectsStatement.get() as { count: number };
 116: 
 117:   if (result.count > 0) return;
 118:   seedProjectsTransaction(createInitialProjectSeed());
 119: }
 120: 
 121: export function readAllProjects(): Project[] {
 122:   ensureProjectOperationsSeeded();
 123: 
 124:   return (listProjectsStatement.all() as ProjectRow[])
 125:     .map(parseProjectRow)
 126:     .filter((project): project is Project => Boolean(project));
 127: }
 128: 
 129: export function readProjectBySlug(slug: string): Project | undefined {
 130:   ensureProjectOperationsSeeded();
 131:   const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
 132:   return row ? parseProjectRow(row) : undefined;
 133: }
 134: 
 135: export function writeProject(project: Project): void {
 136:   ensureProjectOperationsSeeded();
 137:   db.transaction(() => writeProjectUnsafe(project))();
 138: }
```


## Project Operations exports and lookup functions

Pattern: `export\s+(function|type|interface|const)|getProjectBySlug|listProjects|getProjects|slug|repoPath|summary|status`

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 7

```text
    4:   findProjectByQuery,
    5:   findTaskByIdentifier,
    6:   getDashboardSnapshot,
>   7:   getProjectStats,
    8:   moveTaskCard,
    9:   updateProjectFocus,
   10:   updateProjectNextAction,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 20

```text
   17: } from "../types";
   18: 
   19: function projectLine(project: Project, index?: number): string {
>  20:   const stats = getProjectStats(project);
   21:   const prefix = index === undefined ? "" : `${index}. `;
   22:   return `${prefix}${project.name} | ${project.status} | ${stats.doingCount} doing | ${stats.urgentCount} urgent | /projects/${project.slug}`;
   23: }
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 22

```text
   19: function projectLine(project: Project, index?: number): string {
   20:   const stats = getProjectStats(project);
   21:   const prefix = index === undefined ? "" : `${index}. `;
>  22:   return `${prefix}${project.name} | ${project.status} | ${stats.doingCount} doing | ${stats.urgentCount} urgent | /projects/${project.slug}`;
   23: }
   24: 
   25: function taskLine(result: ProjectTaskResult, index?: number): string {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 51

```text
   48: export async function executeProjectOperationsCommand(
   49:   command: ProjectOperationsModuleCommand,
   50: ): Promise<ProjectOperationsCommandResult> {
>  51:   if (command.kind === "project_operations_status") {
   52:     const snapshot = getDashboardSnapshot();
   53:     return {
   54:       ok: true,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 55

```text
   52:     const snapshot = getDashboardSnapshot();
   53:     return {
   54:       ok: true,
>  55:       title: "Project Operations Status",
   56:       message: [
   57:         `Active projects: ${snapshot.projects.length}`,
   58:         `Doing now: ${snapshot.doingTasks.length}`,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 98

```text
   95:   if (command.kind === "project_show") {
   96:     const project = findProjectByQuery(command.projectQuery);
   97:     if (!project) return projectNotFound(command.projectQuery);
>  98:     const stats = getProjectStats(project);
   99: 
  100:     return {
  101:       ok: true,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 104

```text
  101:       ok: true,
  102:       title: `Project: ${project.name}`,
  103:       message: [
> 104:         `Status: ${project.status}`,
  105:         `Repository: ${project.repoName} | ${project.repoHealth}`,
  106:         `Focus: ${project.focus}`,
  107:         `Next action: ${project.nextAction}`,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 110

```text
  107:         `Next action: ${project.nextAction}`,
  108:         `Progress: ${stats.progress}% | ${stats.doingCount} doing | ${stats.urgentCount} urgent`,
  109:         `Blockers: ${project.blockers.length === 0 ? "none" : project.blockers.join("; ")}`,
> 110:         `Workspace: /projects/${project.slug}`,
  111:       ].join("\n"),
  112:       data: { project, stats },
  113:     };
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 119

```text
  116:   if (command.kind === "project_create") {
  117:     const project = createProject({
  118:       name: command.name,
> 119:       summary: "Project tracked through Chernobog Project Operations.",
  120:       repoName: command.name.trim().replace(/\s+/g, "-"),
  121:     });
  122:     return {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 127

```text
  124:       title: "Project Workspace Created",
  125:       message: [
  126:         `Name: ${project.name}`,
> 127:         `Status: ${project.status}`,
  128:         `Workspace: /projects/${project.slug}`,
  129:         "Next: set the project focus and add its first concrete task.",
  130:       ].join("\n"),
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 128

```text
  125:       message: [
  126:         `Name: ${project.name}`,
  127:         `Status: ${project.status}`,
> 128:         `Workspace: /projects/${project.slug}`,
  129:         "Next: set the project focus and add its first concrete task.",
  130:       ].join("\n"),
  131:       data: { project },
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 147

```text
  144:       };
  145:     }
  146: 
> 147:     const card = createTaskCard(project.slug, board.id, {
  148:       title: command.title,
  149:       description: `Created from Chernobog directive: ${command.title}`,
  150:       priority: command.urgent ? "High" : "Medium",
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 164

```text
  161:         `Task: ${card.title}`,
  162:         `Task ID: ${card.id.slice(0, 8)}`,
  163:         `Column: ${card.column}`,
> 164:         `Workspace: /projects/${project.slug}`,
  165:       ].join("\n"),
  166:       data: { projectId: project.id, card },
  167:     };
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 178

```text
  175:     if (!target) return taskNotFound(command.taskIdentifier);
  176:     const column = command.kind === "project_task_complete" ? "done" : command.column;
  177:     const card = moveTaskCard(
> 178:       target.project.slug,
  179:       target.board.id,
  180:       target.card.id,
  181:       column,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 201

```text
  198:   if (!project) return projectNotFound(command.projectQuery);
  199: 
  200:   if (command.kind === "project_focus_set") {
> 201:     const updated = updateProjectFocus(project.slug, command.focus);
  202:     return {
  203:       ok: true,
  204:       title: "Project Focus Updated",
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 205

```text
  202:     return {
  203:       ok: true,
  204:       title: "Project Focus Updated",
> 205:       message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
  206:       data: { project: updated },
  207:     };
  208:   }
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 210

```text
  207:     };
  208:   }
  209: 
> 210:   const updated = updateProjectNextAction(project.slug, command.nextAction);
  211:   return {
  212:     ok: true,
  213:     title: "Project Next Action Updated",
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 214

```text
  211:   return {
  212:     ok: true,
  213:     title: "Project Next Action Updated",
> 214:     message: `${updated.name}\nNext action: ${updated.nextAction}\nWorkspace: /projects/${updated.slug}`,
  215:     data: { project: updated },
  216:   };
  217: }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 46

```text
   43:   };
   44: }
   45: 
>  46: export function parseProjectOperationsCommand(
   47:   message: string,
   48: ): UnifiedCommand | null {
   49:   const normalized = normalizeMessage(message);
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 52

```text
   49:   const normalized = normalizeMessage(message);
   50: 
   51:   if (
>  52:     /^(?:project operations|project command center|dev command center) status$/i.test(
   53:       normalized,
   54:     )
   55:   ) {
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 58

```text
   55:   ) {
   56:     return buildCommand({
   57:       raw: message,
>  58:       action: "status",
   59:       target: "project",
   60:       confidence: 0.99,
   61:       reason: "project operations parsed explicit status command",
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 61

```text
   58:       action: "status",
   59:       target: "project",
   60:       confidence: 0.99,
>  61:       reason: "project operations parsed explicit status command",
   62:       moduleCommand: { kind: "project_operations_status" },
   63:     });
   64:   }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 62

```text
   59:       target: "project",
   60:       confidence: 0.99,
   61:       reason: "project operations parsed explicit status command",
>  62:       moduleCommand: { kind: "project_operations_status" },
   63:     });
   64:   }
   65: 
```

### `lib\modules\project-operations\module.ts` line 14

```text
   11:   const command = value as { kind?: unknown };
   12: 
   13:   return (
>  14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
```

### `lib\modules\project-operations\module.ts` line 27

```text
   24:   );
   25: }
   26: 
>  27: export const projectOperationsModule: ChernobogModule = {
   28:   id: "project-operations",
   29:   displayName: "Project Operations",
   30:   domains: ["project"],
```

### `lib\modules\project-operations\repository.ts` line 8

```text
    5: 
    6: type ProjectRow = {
    7:   id: string;
>   8:   slug: string;
    9:   project_json: string;
   10:   archived: number;
   11:   created_at: string;
```

### `lib\modules\project-operations\repository.ts` line 20

```text
   17: db.exec(`
   18:   CREATE TABLE IF NOT EXISTS project_operations_projects (
   19:     id TEXT PRIMARY KEY,
>  20:     slug TEXT NOT NULL UNIQUE,
   21:     project_json TEXT NOT NULL,
   22:     archived INTEGER NOT NULL DEFAULT 0,
   23:     created_at TEXT NOT NULL,
```

### `lib\modules\project-operations\repository.ts` line 31

```text
   28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
>  31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
```

### `lib\modules\project-operations\repository.ts` line 32

```text
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
>  32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
```

### `lib\modules\project-operations\repository.ts` line 34

```text
   31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
>  34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
```

### `lib\modules\project-operations\repository.ts` line 37

```text
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
>  37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
   40:   WHERE slug = ?
```

### `lib\modules\project-operations\repository.ts` line 38

```text
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
>  38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
   40:   WHERE slug = ?
   41:   LIMIT 1
```

### `lib\modules\project-operations\repository.ts` line 40

```text
   37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
>  40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
   43: 
```

### `lib\modules\project-operations\repository.ts` line 52

```text
   49: const upsertProjectStatement = db.prepare(`
   50:   INSERT INTO project_operations_projects (
   51:     id,
>  52:     slug,
   53:     project_json,
   54:     archived,
   55:     created_at,
```

### `lib\modules\project-operations\repository.ts` line 60

```text
   57:   )
   58:   VALUES (?, ?, ?, ?, ?, ?)
   59:   ON CONFLICT(id) DO UPDATE SET
>  60:     slug = excluded.slug,
   61:     project_json = excluded.project_json,
   62:     archived = excluded.archived,
   63:     updated_at = excluded.updated_at
```

### `lib\modules\project-operations\repository.ts` line 72

```text
   69:   const candidate = value as Partial<Project>;
   70:   return (
   71:     typeof candidate.id === "string" &&
>  72:     typeof candidate.slug === "string" &&
   73:     typeof candidate.name === "string" &&
   74:     Array.isArray(candidate.boards) &&
   75:     Array.isArray(candidate.notes) &&
```

### `lib\modules\project-operations\repository.ts` line 100

```text
   97: function writeProjectUnsafe(project: Project): void {
   98:   upsertProjectStatement.run(
   99:     project.id,
> 100:     project.slug,
  101:     JSON.stringify(project),
  102:     project.archived ? 1 : 0,
  103:     project.createdAt,
```

### `lib\modules\project-operations\repository.ts` line 114

```text
  111:   }
  112: });
  113: 
> 114: export function ensureProjectOperationsSeeded(): void {
  115:   const result = countProjectsStatement.get() as { count: number };
  116: 
  117:   if (result.count > 0) return;
```

### `lib\modules\project-operations\repository.ts` line 121

```text
  118:   seedProjectsTransaction(createInitialProjectSeed());
  119: }
  120: 
> 121: export function readAllProjects(): Project[] {
  122:   ensureProjectOperationsSeeded();
  123: 
  124:   return (listProjectsStatement.all() as ProjectRow[])
```

### `lib\modules\project-operations\repository.ts` line 124

```text
  121: export function readAllProjects(): Project[] {
  122:   ensureProjectOperationsSeeded();
  123: 
> 124:   return (listProjectsStatement.all() as ProjectRow[])
  125:     .map(parseProjectRow)
  126:     .filter((project): project is Project => Boolean(project));
  127: }
```

### `lib\modules\project-operations\repository.ts` line 129

```text
  126:     .filter((project): project is Project => Boolean(project));
  127: }
  128: 
> 129: export function readProjectBySlug(slug: string): Project | undefined {
  130:   ensureProjectOperationsSeeded();
  131:   const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
  132:   return row ? parseProjectRow(row) : undefined;
```

### `lib\modules\project-operations\repository.ts` line 131

```text
  128: 
  129: export function readProjectBySlug(slug: string): Project | undefined {
  130:   ensureProjectOperationsSeeded();
> 131:   const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
  132:   return row ? parseProjectRow(row) : undefined;
  133: }
  134: 
```

### `lib\modules\project-operations\repository.ts` line 135

```text
  132:   return row ? parseProjectRow(row) : undefined;
  133: }
  134: 
> 135: export function writeProject(project: Project): void {
  136:   ensureProjectOperationsSeeded();
  137:   db.transaction(() => writeProjectUnsafe(project))();
  138: }
```

### `lib\modules\project-operations\seed.ts` line 7

```text
    4: 
    5: function createProjectSeed(args: {
    6:   name: string;
>   7:   slug: string;
    8:   summary: string;
    9:   repoName: string;
   10:   focus: string;
```

### `lib\modules\project-operations\seed.ts` line 8

```text
    5: function createProjectSeed(args: {
    6:   name: string;
    7:   slug: string;
>   8:   summary: string;
    9:   repoName: string;
   10:   focus: string;
   11:   nextAction: string;
```

### `lib\modules\project-operations\seed.ts` line 19

```text
   16:   return {
   17:     id: randomUUID(),
   18:     name: args.name,
>  19:     slug: args.slug,
   20:     summary: args.summary,
   21:     status: "Active",
   22:     repoHealth: "Watch",
```

### `lib\modules\project-operations\seed.ts` line 20

```text
   17:     id: randomUUID(),
   18:     name: args.name,
   19:     slug: args.slug,
>  20:     summary: args.summary,
   21:     status: "Active",
   22:     repoHealth: "Watch",
   23:     repoName: args.repoName,
```

### `lib\modules\project-operations\seed.ts` line 21

```text
   18:     name: args.name,
   19:     slug: args.slug,
   20:     summary: args.summary,
>  21:     status: "Active",
   22:     repoHealth: "Watch",
   23:     repoName: args.repoName,
   24:     focus: args.focus,
```

### `lib\modules\project-operations\seed.ts` line 54

```text
   51:       {
   52:         id: randomUUID(),
   53:         type: "system",
>  54:         summary: "Project added to Chernobog Project Operations",
   55:         detail: "Initial workspace created during first-run setup.",
   56:         createdAt: now,
   57:       },
```

### `lib\modules\project-operations\seed.ts` line 62

```text
   59:   };
   60: }
   61: 
>  62: export function createInitialProjectSeed(): Project[] {
   63:   return [
   64:     createProjectSeed({
   65:       name: "Chernobog",
```

### `lib\modules\project-operations\seed.ts` line 66

```text
   63:   return [
   64:     createProjectSeed({
   65:       name: "Chernobog",
>  66:       slug: "chernobog",
   67:       summary:
   68:         "Vault-grounded personal AI assistant with controlled tools, operational workflows, memory, and sensory systems.",
   69:       repoName: "chernobog-ai",
```

### `lib\modules\project-operations\seed.ts` line 67

```text
   64:     createProjectSeed({
   65:       name: "Chernobog",
   66:       slug: "chernobog",
>  67:       summary:
   68:         "Vault-grounded personal AI assistant with controlled tools, operational workflows, memory, and sensory systems.",
   69:       repoName: "chernobog-ai",
   70:       focus: "Operational command center and the locked V6.x sensory workflow arc.",
```

### `lib\modules\project-operations\seed.ts` line 77

```text
   74:     }),
   75:     createProjectSeed({
   76:       name: "QuestLedger",
>  77:       slug: "questledger",
   78:       summary:
   79:         "Customisable Kotlin Android TTRPG companion focused on character play, homebrew content, and DM support.",
   80:       repoName: "QuestLedger",
```

### `lib\modules\project-operations\seed.ts` line 78

```text
   75:     createProjectSeed({
   76:       name: "QuestLedger",
   77:       slug: "questledger",
>  78:       summary:
   79:         "Customisable Kotlin Android TTRPG companion focused on character play, homebrew content, and DM support.",
   80:       repoName: "QuestLedger",
   81:       focus: "Character customisation, equipment-driven stats, weapon rolls, and playable session workflows.",
```

### `lib\modules\project-operations\seed.ts` line 88

```text
   85:     }),
   86:     createProjectSeed({
   87:       name: "Homelab",
>  88:       slug: "homelab",
   89:       summary:
   90:         "Private self-hosted infrastructure for Chernobog, storage, monitoring, backups, and personal services.",
   91:       repoName: "homelab-operations",
```

### `lib\modules\project-operations\seed.ts` line 89

```text
   86:     createProjectSeed({
   87:       name: "Homelab",
   88:       slug: "homelab",
>  89:       summary:
   90:         "Private self-hosted infrastructure for Chernobog, storage, monitoring, backups, and personal services.",
   91:       repoName: "homelab-operations",
   92:       focus: "Phase 10 disaster recovery, rebuildability, and secure unattended recovery.",
```

### `lib\modules\project-operations\service.ts` line 3

```text
    1: import { randomUUID } from "node:crypto";
    2: 
>   3: import { readAllProjects, readProjectBySlug, writeProject } from "./repository";
    4: import type {
    5:   ActivityType,
    6:   Project,
```

### `lib\modules\project-operations\service.ts` line 14

```text
   11:   ProjectNoteResult,
   12:   ProjectSettingsInput,
   13:   ProjectStats,
>  14:   ProjectStatus,
   15:   ProjectTaskCard,
   16:   ProjectTaskResult,
   17:   RecentActivityResult,
```

### `lib\modules\project-operations\service.ts` line 26

```text
   23: 
   24: const VALID_COLUMNS: TaskColumnId[] = ["backlog", "next", "doing", "done"];
   25: const VALID_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
>  26: const VALID_STATUSES: ProjectStatus[] = [
   27:   "Active",
   28:   "Planning",
   29:   "Blocked",
```

### `lib\modules\project-operations\service.ts` line 43

```text
   40:   return new Date().toISOString();
   41: }
   42: 
>  43: function slugify(value: string): string {
   44:   return value
   45:     .trim()
   46:     .toLowerCase()
```

### `lib\modules\project-operations\service.ts` line 59

```text
   56: 
   57: function createActivity(
   58:   type: ActivityType,
>  59:   summary: string,
   60:   detail?: string,
   61: ): ProjectActivityEntry {
   62:   return {
```

### `lib\modules\project-operations\service.ts` line 65

```text
   62:   return {
   63:     id: randomUUID(),
   64:     type,
>  65:     summary,
   66:     detail,
   67:     createdAt: nowIso(),
   68:   };
```

### `lib\modules\project-operations\service.ts` line 75

```text
   72:   return project.boards.flatMap((board) => board.cards);
   73: }
   74: 
>  75: export function getAllProjects(options?: { includeArchived?: boolean }): Project[] {
   76:   const projects = readAllProjects();
   77:   return options?.includeArchived
   78:     ? projects
```

### `lib\modules\project-operations\service.ts` line 82

```text
   79:     : projects.filter((project) => !project.archived);
   80: }
   81: 
>  82: export function getProjectBySlug(slug: string): Project | undefined {
   83:   const project = readProjectBySlug(slug);
   84:   return project && !project.archived ? project : undefined;
   85: }
```

### `lib\modules\project-operations\service.ts` line 83

```text
   80: }
   81: 
   82: export function getProjectBySlug(slug: string): Project | undefined {
>  83:   const project = readProjectBySlug(slug);
   84:   return project && !project.archived ? project : undefined;
   85: }
   86: 
```

### `lib\modules\project-operations\service.ts` line 87

```text
   84:   return project && !project.archived ? project : undefined;
   85: }
   86: 
>  87: export function getProjectStats(project: Project): ProjectStats {
   88:   const activeCards = getProjectCards(project).filter((card) => !card.archived);
   89:   const urgentCount = activeCards.filter(
   90:     (card) => card.urgent && card.column !== "done",
```

### `lib\modules\project-operations\service.ts` line 107

```text
  104:     totalCards: activeCards.length,
  105:     doneCount,
  106:     progress,
> 107:     blocked: project.status === "Blocked" || project.blockers.length > 0,
  108:   };
  109: }
  110: 
```

### `lib\modules\project-operations\service.ts` line 111

```text
  108:   };
  109: }
  110: 
> 111: export function getAllProjectTasks(): ProjectTaskResult[] {
  112:   return getAllProjects().flatMap((project) =>
  113:     project.boards.flatMap((board) =>
  114:       board.cards
```

### `lib\modules\project-operations\service.ts` line 121

```text
  118:   );
  119: }
  120: 
> 121: export function getUrgentTasks(): ProjectTaskResult[] {
  122:   return getAllProjectTasks().filter(
  123:     ({ card }) => card.urgent && card.column !== "done",
  124:   );
```

### `lib\modules\project-operations\service.ts` line 127

```text
  124:   );
  125: }
  126: 
> 127: export function getNextTasks(): ProjectTaskResult[] {
  128:   return getAllProjectTasks().filter(({ card }) => card.column === "next");
  129: }
  130: 
```

### `lib\modules\project-operations\service.ts` line 131

```text
  128:   return getAllProjectTasks().filter(({ card }) => card.column === "next");
  129: }
  130: 
> 131: export function getDoingTasks(): ProjectTaskResult[] {
  132:   return getAllProjectTasks().filter(({ card }) => card.column === "doing");
  133: }
  134: 
```

### `lib\modules\project-operations\service.ts` line 135

```text
  132:   return getAllProjectTasks().filter(({ card }) => card.column === "doing");
  133: }
  134: 
> 135: export function getAllNotes(): ProjectNoteResult[] {
  136:   return getAllProjects().flatMap((project) =>
  137:     project.notes
  138:       .filter((note) => !note.archived)
```

### `lib\modules\project-operations\service.ts` line 143

```text
  140:   );
  141: }
  142: 
> 143: export function getPinnedNotes(): ProjectNoteResult[] {
  144:   return getAllNotes().filter(({ note }) => note.pinned);
  145: }
  146: 
```

### `lib\modules\project-operations\service.ts` line 147

```text
  144:   return getAllNotes().filter(({ note }) => note.pinned);
  145: }
  146: 
> 147: export function getRecentActivity(limit = 20): RecentActivityResult[] {
  148:   return getAllProjects()
  149:     .flatMap((project) =>
  150:       project.activity.map((entry) => ({ project, entry })),
```

### `lib\modules\project-operations\service.ts` line 161

```text
  158: }
  159: 
  160: function scoreProject(project: Project): number {
> 161:   const stats = getProjectStats(project);
  162:   let score = 0;
  163:   score += stats.urgentCount * 10;
  164:   score += stats.doingCount * 4;
```

### `lib\modules\project-operations\service.ts` line 167

```text
  164:   score += stats.doingCount * 4;
  165:   score += project.repoHealth === "Needs Attention" ? 6 : 0;
  166:   score += project.repoHealth === "Watch" ? 3 : 0;
> 167:   score += project.status === "Blocked" ? 7 : 0;
  168:   score += project.status === "Active" ? 4 : 0;
  169:   score += project.blockers.length * 2;
  170:   score += isOlderThanDays(project.updatedAt, 7) ? 3 : 0;
```

### `lib\modules\project-operations\service.ts` line 168

```text
  165:   score += project.repoHealth === "Needs Attention" ? 6 : 0;
  166:   score += project.repoHealth === "Watch" ? 3 : 0;
  167:   score += project.status === "Blocked" ? 7 : 0;
> 168:   score += project.status === "Active" ? 4 : 0;
  169:   score += project.blockers.length * 2;
  170:   score += isOlderThanDays(project.updatedAt, 7) ? 3 : 0;
  171:   return score;
```

### `lib\modules\project-operations\service.ts` line 174

```text
  171:   return score;
  172: }
  173: 
> 174: export function getDashboardSnapshot(): ProjectDashboardSnapshot {
  175:   const projects = getAllProjects();
  176: 
  177:   return {
```

### `lib\modules\project-operations\service.ts` line 185

```text
  182:     doingTasks: getDoingTasks(),
  183:     repoWatch: projects.filter((project) => project.repoHealth !== "Healthy"),
  184:     blockedProjects: projects.filter(
> 185:       (project) => project.status === "Blocked" || project.blockers.length > 0,
  186:     ),
  187:     staleProjects: projects.filter((project) => isOlderThanDays(project.updatedAt, 7)),
  188:     recentActivity: getRecentActivity(10),
```

### `lib\modules\project-operations\service.ts` line 192

```text
  189:   };
  190: }
  191: 
> 192: function uniqueSlug(baseSlug: string): string {
  193:   const existing = new Set(
  194:     getAllProjects({ includeArchived: true }).map((project) => project.slug),
  195:   );
```

### `lib\modules\project-operations\service.ts` line 194

```text
  191: 
  192: function uniqueSlug(baseSlug: string): string {
  193:   const existing = new Set(
> 194:     getAllProjects({ includeArchived: true }).map((project) => project.slug),
  195:   );
  196:   if (!existing.has(baseSlug)) return baseSlug;
  197: 
```

### `lib\modules\project-operations\service.ts` line 196

```text
  193:   const existing = new Set(
  194:     getAllProjects({ includeArchived: true }).map((project) => project.slug),
  195:   );
> 196:   if (!existing.has(baseSlug)) return baseSlug;
  197: 
  198:   let index = 2;
  199:   while (existing.has(`${baseSlug}-${index}`)) index += 1;
```

### `lib\modules\project-operations\service.ts` line 199

```text
  196:   if (!existing.has(baseSlug)) return baseSlug;
  197: 
  198:   let index = 2;
> 199:   while (existing.has(`${baseSlug}-${index}`)) index += 1;
  200:   return `${baseSlug}-${index}`;
  201: }
  202: 
```

### `lib\modules\project-operations\service.ts` line 200

```text
  197: 
  198:   let index = 2;
  199:   while (existing.has(`${baseSlug}-${index}`)) index += 1;
> 200:   return `${baseSlug}-${index}`;
  201: }
  202: 
  203: export function createProject(input: {
```

### `lib\modules\project-operations\service.ts` line 203

```text
  200:   return `${baseSlug}-${index}`;
  201: }
  202: 
> 203: export function createProject(input: {
  204:   name: string;
  205:   summary: string;
  206:   repoName: string;
```

### `lib\modules\project-operations\service.ts` line 205

```text
  202: 
  203: export function createProject(input: {
  204:   name: string;
> 205:   summary: string;
  206:   repoName: string;
  207:   repoPath?: string;
  208: }): Project {
```

### `lib\modules\project-operations\service.ts` line 207

```text
  204:   name: string;
  205:   summary: string;
  206:   repoName: string;
> 207:   repoPath?: string;
  208: }): Project {
  209:   const name = requireText(input.name, "Project name", 120);
  210:   const summary = requireText(input.summary, "Project summary", 1000);
```

### `lib\modules\project-operations\service.ts` line 210

```text
  207:   repoPath?: string;
  208: }): Project {
  209:   const name = requireText(input.name, "Project name", 120);
> 210:   const summary = requireText(input.summary, "Project summary", 1000);
  211:   const repoName = requireText(input.repoName, "Repository name", 200);
  212:   const now = nowIso();
  213: 
```

### `lib\modules\project-operations\service.ts` line 217

```text
  214:   const project: Project = {
  215:     id: randomUUID(),
  216:     name,
> 217:     slug: uniqueSlug(slugify(name)),
  218:     summary,
  219:     status: "Planning",
  220:     repoHealth: "Watch",
```

### `lib\modules\project-operations\service.ts` line 218

```text
  215:     id: randomUUID(),
  216:     name,
  217:     slug: uniqueSlug(slugify(name)),
> 218:     summary,
  219:     status: "Planning",
  220:     repoHealth: "Watch",
  221:     repoName,
```

### `lib\modules\project-operations\service.ts` line 219

```text
  216:     name,
  217:     slug: uniqueSlug(slugify(name)),
  218:     summary,
> 219:     status: "Planning",
  220:     repoHealth: "Watch",
  221:     repoName,
  222:     repoPath: cleanOptionalText(input.repoPath, 1000),
```

### `lib\modules\project-operations\service.ts` line 222

```text
  219:     status: "Planning",
  220:     repoHealth: "Watch",
  221:     repoName,
> 222:     repoPath: cleanOptionalText(input.repoPath, 1000),
  223:     focus: "Define the current project focus.",
  224:     nextAction: "Add the first concrete next action.",
  225:     blockers: [],
```

### `lib\modules\project-operations\service.ts` line 239

```text
  236:     ],
  237:     notes: [],
  238:     links: [],
> 239:     activity: [createActivity("project", "Created project workspace", summary)],
  240:   };
  241: 
  242:   writeProject(project);
```

### `lib\modules\project-operations\service.ts` line 247

```text
  244: }
  245: 
  246: function updateProject(
> 247:   slug: string,
  248:   updater: (project: Project) => Project,
  249:   activity: { type: ActivityType; summary: string; detail?: string },
  250:   options?: { includeArchived?: boolean },
```

### `lib\modules\project-operations\service.ts` line 249

```text
  246: function updateProject(
  247:   slug: string,
  248:   updater: (project: Project) => Project,
> 249:   activity: { type: ActivityType; summary: string; detail?: string },
  250:   options?: { includeArchived?: boolean },
  251: ): Project {
  252:   const project = readProjectBySlug(slug);
```

### `lib\modules\project-operations\service.ts` line 252

```text
  249:   activity: { type: ActivityType; summary: string; detail?: string },
  250:   options?: { includeArchived?: boolean },
  251: ): Project {
> 252:   const project = readProjectBySlug(slug);
  253: 
  254:   if (!project || (project.archived && !options?.includeArchived)) {
  255:     throw new Error(`Project not found: ${slug}`);
```

### `lib\modules\project-operations\service.ts` line 255

```text
  252:   const project = readProjectBySlug(slug);
  253: 
  254:   if (!project || (project.archived && !options?.includeArchived)) {
> 255:     throw new Error(`Project not found: ${slug}`);
  256:   }
  257: 
  258:   const updated = updater(project);
```

### `lib\modules\project-operations\service.ts` line 263

```text
  260:     ...updated,
  261:     updatedAt: nowIso(),
  262:     activity: [
> 263:       createActivity(activity.type, activity.summary, activity.detail),
  264:       ...updated.activity,
  265:     ].slice(0, 120),
  266:   };
```

### `lib\modules\project-operations\service.ts` line 272

```text
  269:   return result;
  270: }
  271: 
> 272: export function updateProjectSettings(
  273:   slug: string,
  274:   input: ProjectSettingsInput,
  275: ): Project {
```

### `lib\modules\project-operations\service.ts` line 273

```text
  270: }
  271: 
  272: export function updateProjectSettings(
> 273:   slug: string,
  274:   input: ProjectSettingsInput,
  275: ): Project {
  276:   const name = requireText(input.name, "Project name", 120);
```

### `lib\modules\project-operations\service.ts` line 277

```text
  274:   input: ProjectSettingsInput,
  275: ): Project {
  276:   const name = requireText(input.name, "Project name", 120);
> 277:   const summary = requireText(input.summary, "Project summary", 1000);
  278:   const repoName = requireText(input.repoName, "Repository name", 200);
  279:   const focus = requireText(input.focus, "Current focus", 1000);
  280:   const nextAction = requireText(input.nextAction, "Next action", 1000);
```

### `lib\modules\project-operations\service.ts` line 281

```text
  278:   const repoName = requireText(input.repoName, "Repository name", 200);
  279:   const focus = requireText(input.focus, "Current focus", 1000);
  280:   const nextAction = requireText(input.nextAction, "Next action", 1000);
> 281:   const status = requireStatus(input.status);
  282:   const repoHealth = requireRepoHealth(input.repoHealth);
  283: 
  284:   return updateProject(
```

### `lib\modules\project-operations\service.ts` line 285

```text
  282:   const repoHealth = requireRepoHealth(input.repoHealth);
  283: 
  284:   return updateProject(
> 285:     slug,
  286:     (project) => ({
  287:       ...project,
  288:       name,
```

### `lib\modules\project-operations\service.ts` line 289

```text
  286:     (project) => ({
  287:       ...project,
  288:       name,
> 289:       summary,
  290:       status,
  291:       repoHealth,
  292:       repoName,
```

### `lib\modules\project-operations\service.ts` line 290

```text
  287:       ...project,
  288:       name,
  289:       summary,
> 290:       status,
  291:       repoHealth,
  292:       repoName,
  293:       repoPath: cleanOptionalText(input.repoPath, 1000),
```

### `lib\modules\project-operations\service.ts` line 293

```text
  290:       status,
  291:       repoHealth,
  292:       repoName,
> 293:       repoPath: cleanOptionalText(input.repoPath, 1000),
  294:       focus,
  295:       nextAction,
  296:       blockers: input.blockers
```

### `lib\modules\project-operations\service.ts` line 301

```text
  298:         .filter(Boolean)
  299:         .slice(0, 30),
  300:     }),
> 301:     { type: "project", summary: "Updated project settings", detail: name },
  302:   );
  303: }
  304: 
```

### `lib\modules\project-operations\service.ts` line 305

```text
  302:   );
  303: }
  304: 
> 305: export function updateProjectFocus(slug: string, focus: string): Project {
  306:   const cleanFocus = requireText(focus, "Current focus", 1000);
  307:   return updateProject(
  308:     slug,
```

### `lib\modules\project-operations\service.ts` line 308

```text
  305: export function updateProjectFocus(slug: string, focus: string): Project {
  306:   const cleanFocus = requireText(focus, "Current focus", 1000);
  307:   return updateProject(
> 308:     slug,
  309:     (project) => ({ ...project, focus: cleanFocus }),
  310:     { type: "project", summary: "Updated current focus", detail: cleanFocus },
  311:   );
```

### `lib\modules\project-operations\service.ts` line 310

```text
  307:   return updateProject(
  308:     slug,
  309:     (project) => ({ ...project, focus: cleanFocus }),
> 310:     { type: "project", summary: "Updated current focus", detail: cleanFocus },
  311:   );
  312: }
  313: 
```

### `lib\modules\project-operations\service.ts` line 314

```text
  311:   );
  312: }
  313: 
> 314: export function updateProjectNextAction(slug: string, nextAction: string): Project {
  315:   const cleanNextAction = requireText(nextAction, "Next action", 1000);
  316:   return updateProject(
  317:     slug,
```

### `lib\modules\project-operations\service.ts` line 317

```text
  314: export function updateProjectNextAction(slug: string, nextAction: string): Project {
  315:   const cleanNextAction = requireText(nextAction, "Next action", 1000);
  316:   return updateProject(
> 317:     slug,
  318:     (project) => ({ ...project, nextAction: cleanNextAction }),
  319:     {
  320:       type: "project",
```

### `lib\modules\project-operations\service.ts` line 321

```text
  318:     (project) => ({ ...project, nextAction: cleanNextAction }),
  319:     {
  320:       type: "project",
> 321:       summary: "Updated next action",
  322:       detail: cleanNextAction,
  323:     },
  324:   );
```

### `lib\modules\project-operations\service.ts` line 327

```text
  324:   );
  325: }
  326: 
> 327: export function archiveProject(slug: string): Project {
  328:   return updateProject(
  329:     slug,
  330:     (project) => ({ ...project, archived: true, status: "Archived" }),
```

### `lib\modules\project-operations\service.ts` line 329

```text
  326: 
  327: export function archiveProject(slug: string): Project {
  328:   return updateProject(
> 329:     slug,
  330:     (project) => ({ ...project, archived: true, status: "Archived" }),
  331:     {
  332:       type: "project",
```

### `lib\modules\project-operations\service.ts` line 330

```text
  327: export function archiveProject(slug: string): Project {
  328:   return updateProject(
  329:     slug,
> 330:     (project) => ({ ...project, archived: true, status: "Archived" }),
  331:     {
  332:       type: "project",
  333:       summary: "Archived project",
```

### `lib\modules\project-operations\service.ts` line 333

```text
  330:     (project) => ({ ...project, archived: true, status: "Archived" }),
  331:     {
  332:       type: "project",
> 333:       summary: "Archived project",
  334:       detail: "The project remains stored but is hidden from active views.",
  335:     },
  336:     { includeArchived: true },
```

### `lib\modules\project-operations\service.ts` line 340

```text
  337:   );
  338: }
  339: 
> 340: export function createTaskCard(
  341:   slug: string,
  342:   boardId: string,
  343:   input: TaskCardInput,
```

### `lib\modules\project-operations\service.ts` line 341

```text
  338: }
  339: 
  340: export function createTaskCard(
> 341:   slug: string,
  342:   boardId: string,
  343:   input: TaskCardInput,
  344: ): ProjectTaskCard {
```

### `lib\modules\project-operations\service.ts` line 345

```text
  342:   boardId: string,
  343:   input: TaskCardInput,
  344: ): ProjectTaskCard {
> 345:   const project = getProjectBySlug(slug);
  346:   if (!project?.boards.some((board) => board.id === boardId)) {
  347:     throw new Error(`Project board not found: ${boardId}`);
  348:   }
```

### `lib\modules\project-operations\service.ts` line 361

```text
  358:   };
  359: 
  360:   updateProject(
> 361:     slug,
  362:     (project) => ({
  363:       ...project,
  364:       boards: project.boards.map((board) =>
```

### `lib\modules\project-operations\service.ts` line 372

```text
  369:     }),
  370:     {
  371:       type: "task",
> 372:       summary: `Created task: ${card.title}`,
  373:       detail: `${card.priority} priority in ${card.column}.`,
  374:     },
  375:   );
```

### `lib\modules\project-operations\service.ts` line 380

```text
  377:   return card;
  378: }
  379: 
> 380: export function updateTaskCard(
  381:   slug: string,
  382:   boardId: string,
  383:   cardId: string,
```

### `lib\modules\project-operations\service.ts` line 381

```text
  378: }
  379: 
  380: export function updateTaskCard(
> 381:   slug: string,
  382:   boardId: string,
  383:   cardId: string,
  384:   input: TaskCardInput,
```

### `lib\modules\project-operations\service.ts` line 387

```text
  384:   input: TaskCardInput,
  385: ): ProjectTaskCard {
  386:   const cleanInput = cleanTaskInput(input);
> 387:   const existing = findTaskInProject(slug, boardId, cardId);
  388:   if (!existing) throw new Error(`Task not found: ${cardId}`);
  389: 
  390:   const updatedCard: ProjectTaskCard = {
```

### `lib\modules\project-operations\service.ts` line 397

```text
  394:   };
  395: 
  396:   updateProject(
> 397:     slug,
  398:     (project) => ({
  399:       ...project,
  400:       boards: project.boards.map((board) =>
```

### `lib\modules\project-operations\service.ts` line 413

```text
  410:     }),
  411:     {
  412:       type: "task",
> 413:       summary: `Updated task: ${updatedCard.title}`,
  414:       detail: `Column: ${updatedCard.column}. Priority: ${updatedCard.priority}.`,
  415:     },
  416:   );
```

### `lib\modules\project-operations\service.ts` line 421

```text
  418:   return updatedCard;
  419: }
  420: 
> 421: export function moveTaskCard(
  422:   slug: string,
  423:   boardId: string,
  424:   cardId: string,
```

### `lib\modules\project-operations\service.ts` line 422

```text
  419: }
  420: 
  421: export function moveTaskCard(
> 422:   slug: string,
  423:   boardId: string,
  424:   cardId: string,
  425:   column: TaskColumnId,
```

### `lib\modules\project-operations\service.ts` line 427

```text
  424:   cardId: string,
  425:   column: TaskColumnId,
  426: ): ProjectTaskCard {
> 427:   const target = findTaskInProject(slug, boardId, cardId);
  428:   if (!target) throw new Error(`Task not found: ${cardId}`);
  429: 
  430:   return updateTaskCard(slug, boardId, cardId, {
```

### `lib\modules\project-operations\service.ts` line 430

```text
  427:   const target = findTaskInProject(slug, boardId, cardId);
  428:   if (!target) throw new Error(`Task not found: ${cardId}`);
  429: 
> 430:   return updateTaskCard(slug, boardId, cardId, {
  431:     title: target.title,
  432:     description: target.description,
  433:     priority: target.priority,
```

### `lib\modules\project-operations\service.ts` line 440

```text
  437:   });
  438: }
  439: 
> 440: export function archiveTaskCard(
  441:   slug: string,
  442:   boardId: string,
  443:   cardId: string,
```

### `lib\modules\project-operations\service.ts` line 441

```text
  438: }
  439: 
  440: export function archiveTaskCard(
> 441:   slug: string,
  442:   boardId: string,
  443:   cardId: string,
  444: ): Project {
```

### `lib\modules\project-operations\service.ts` line 445

```text
  442:   boardId: string,
  443:   cardId: string,
  444: ): Project {
> 445:   const target = findTaskInProject(slug, boardId, cardId);
  446:   if (!target) throw new Error(`Task not found: ${cardId}`);
  447: 
  448:   return updateProject(
```

### `lib\modules\project-operations\service.ts` line 449

```text
  446:   if (!target) throw new Error(`Task not found: ${cardId}`);
  447: 
  448:   return updateProject(
> 449:     slug,
  450:     (project) => ({
  451:       ...project,
  452:       boards: project.boards.map((board) =>
```

### `lib\modules\project-operations\service.ts` line 467

```text
  464:     }),
  465:     {
  466:       type: "task",
> 467:       summary: `Archived task: ${target.title}`,
  468:       detail: "The task remains stored outside active board views.",
  469:     },
  470:   );
```

### `lib\modules\project-operations\service.ts` line 473

```text
  470:   );
  471: }
  472: 
> 473: export function addProjectNote(slug: string, input: ProjectNoteInput): Project {
  474:   const cleanInput = cleanNoteInput(input);
  475:   const now = nowIso();
  476: 
```

### `lib\modules\project-operations\service.ts` line 478

```text
  475:   const now = nowIso();
  476: 
  477:   return updateProject(
> 478:     slug,
  479:     (project) => ({
  480:       ...project,
  481:       notes: [
```

### `lib\modules\project-operations\service.ts` line 494

```text
  491:     }),
  492:     {
  493:       type: "note",
> 494:       summary: `Added note: ${cleanInput.title}`,
  495:       detail: cleanInput.pinned ? "Pinned note." : undefined,
  496:     },
  497:   );
```

### `lib\modules\project-operations\service.ts` line 500

```text
  497:   );
  498: }
  499: 
> 500: export function updateProjectNote(
  501:   slug: string,
  502:   noteId: string,
  503:   input: ProjectNoteInput,
```

### `lib\modules\project-operations\service.ts` line 501

```text
  498: }
  499: 
  500: export function updateProjectNote(
> 501:   slug: string,
  502:   noteId: string,
  503:   input: ProjectNoteInput,
  504: ): Project {
```

### `lib\modules\project-operations\service.ts` line 507

```text
  504: ): Project {
  505:   const cleanInput = cleanNoteInput(input);
  506:   return updateProject(
> 507:     slug,
  508:     (project) => ({
  509:       ...project,
  510:       notes: project.notes.map((note) =>
```

### `lib\modules\project-operations\service.ts` line 518

```text
  515:     }),
  516:     {
  517:       type: "note",
> 518:       summary: `Updated note: ${cleanInput.title}`,
  519:       detail: cleanInput.pinned ? "Pinned note." : "Unpinned note.",
  520:     },
  521:   );
```

### `lib\modules\project-operations\service.ts` line 524

```text
  521:   );
  522: }
  523: 
> 524: export function toggleProjectNotePinned(slug: string, noteId: string): Project {
  525:   const project = getProjectBySlug(slug);
  526:   const note = project?.notes.find((candidate) => candidate.id === noteId);
  527:   if (!note) throw new Error(`Note not found: ${noteId}`);
```

### `lib\modules\project-operations\service.ts` line 525

```text
  522: }
  523: 
  524: export function toggleProjectNotePinned(slug: string, noteId: string): Project {
> 525:   const project = getProjectBySlug(slug);
  526:   const note = project?.notes.find((candidate) => candidate.id === noteId);
  527:   if (!note) throw new Error(`Note not found: ${noteId}`);
  528:   return updateProjectNote(slug, noteId, {
```

### `lib\modules\project-operations\service.ts` line 528

```text
  525:   const project = getProjectBySlug(slug);
  526:   const note = project?.notes.find((candidate) => candidate.id === noteId);
  527:   if (!note) throw new Error(`Note not found: ${noteId}`);
> 528:   return updateProjectNote(slug, noteId, {
  529:     title: note.title,
  530:     content: note.content,
  531:     pinned: !note.pinned,
```

### `lib\modules\project-operations\service.ts` line 535

```text
  532:   });
  533: }
  534: 
> 535: export function archiveProjectNote(slug: string, noteId: string): Project {
  536:   const project = getProjectBySlug(slug);
  537:   const note = project?.notes.find((candidate) => candidate.id === noteId);
  538:   if (!note) throw new Error(`Note not found: ${noteId}`);
```

### `lib\modules\project-operations\service.ts` line 536

```text
  533: }
  534: 
  535: export function archiveProjectNote(slug: string, noteId: string): Project {
> 536:   const project = getProjectBySlug(slug);
  537:   const note = project?.notes.find((candidate) => candidate.id === noteId);
  538:   if (!note) throw new Error(`Note not found: ${noteId}`);
  539: 
```

### `lib\modules\project-operations\service.ts` line 541

```text
  538:   if (!note) throw new Error(`Note not found: ${noteId}`);
  539: 
  540:   return updateProject(
> 541:     slug,
  542:     (current) => ({
  543:       ...current,
  544:       notes: current.notes.map((candidate) =>
```

### `lib\modules\project-operations\service.ts` line 552

```text
  549:     }),
  550:     {
  551:       type: "note",
> 552:       summary: `Archived note: ${note.title}`,
  553:       detail: "The note remains stored outside active note views.",
  554:     },
  555:   );
```


## Project workspace UI and command bridge

### `app\projects\[slug]\page.tsx`

```text
   1: import { notFound } from "next/navigation";
   2: 
   3: import { ProjectWorkspace } from "@/components/project-operations/ProjectWorkspace";
   4: import { getProjectBySlug } from "@/lib/modules/project-operations";
   5: 
   6: export const dynamic = "force-dynamic";
   7: 
   8: type ProjectPageProps = {
   9:   params: Promise<{ slug: string }>;
  10: };
  11: 
  12: export default async function ProjectPage({ params }: ProjectPageProps) {
  13:   const { slug } = await params;
  14:   const project = getProjectBySlug(slug);
  15:   if (!project) notFound();
  16:   return <ProjectWorkspace project={project} />;
  17: }
```

### `components\project-operations\ProjectWorkspace.tsx`

```text
   1: import type { ReactNode } from "react";
   2: 
   3: import {
   4:   addProjectLinkAction,
   5:   addProjectNoteAction,
   6:   archiveProjectAction,
   7:   archiveProjectNoteAction,
   8:   deleteProjectLinkAction,
   9:   toggleProjectNotePinnedAction,
  10:   updateProjectNoteAction,
  11:   updateProjectSettingsAction,
  12: } from "@/app/projects/actions";
  13: import type {
  14:   Project,
  15:   ProjectStatus,
  16:   RepoHealth,
  17: } from "@/lib/modules/project-operations";
  18: import { getProjectStats } from "@/lib/modules/project-operations";
  19: 
  20: import { ActivityList } from "./ActivityList";
  21: import { ProjectBoard } from "./ProjectBoard";
  22: import {
  23:   MachinePanel,
  24:   SectionLabel,
  25:   StatusPill,
  26:   buttonClass,
  27:   formatDateTime,
  28:   inputClass,
  29:   normalizeExternalUrl,
  30:   quietButtonClass,
  31: } from "./ui";
  32: 
  33: const statuses: ProjectStatus[] = ["Active", "Planning", "Blocked", "Polish"];
  34: const repoHealthOptions: RepoHealth[] = ["Healthy", "Watch", "Needs Attention"];
  35: 
  36: const drawerClass =
  37:   "group scroll-mt-4 border border-[#5d3214]/70 bg-[#080503]/92 shadow-[inset_0_0_0_1px_rgba(255,166,66,0.04)]";
  38: const summaryClass =
  39:   "flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a87340] transition hover:bg-[#120904]/70 hover:text-[#e0a764] [&::-webkit-details-marker]:hidden";
  40: 
  41: function Readout({
  42:   label,
  43:   value,
  44:   detail,
  45:   alert = false,
  46: }: {
  47:   label: string;
  48:   value: ReactNode;
  49:   detail: string;
  50:   alert?: boolean;
  51: }) {
  52:   return (
  53:     <div className="min-w-0 px-3 py-2.5">
  54:       <div className="text-[7px] uppercase tracking-[0.24em] text-[#765237]">
  55:         {label}
  56:       </div>
  57:       <div
  58:         className={`mt-1 font-mono text-sm font-semibold uppercase tracking-[0.1em] ${
  59:           alert ? "text-[#ff9a73]" : "text-[#e2ad70]"
  60:         }`}
  61:       >
  62:         {value}
  63:       </div>
  64:       <div className="mt-1 truncate text-[7px] uppercase tracking-[0.16em] text-[#5f412b]">
  65:         {detail}
  66:       </div>
  67:     </div>
  68:   );
  69: }
  70: 
  71: function IntelRow({ label, children }: { label: string; children: ReactNode }) {
  72:   return (
  73:     <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b border-[#4f2b14]/45 py-2 last:border-b-0">
  74:       <div className="text-[7px] uppercase tracking-[0.2em] text-[#765237]">
  75:         {label}
  76:       </div>
  77:       <div className="min-w-0 break-words text-right font-mono text-[9px] text-[#c18d5b]">
  78:         {children}
  79:       </div>
  80:     </div>
  81:   );
  82: }
  83: 
  84: function DrawerSummary({
  85:   label,
  86:   meta,
  87: }: {
  88:   label: string;
  89:   meta: string;
  90: }) {
  91:   return (
  92:     <summary className={summaryClass}>
  93:       <span className="flex items-center gap-3">
  94:         <span className="font-mono text-[#c9782f] group-open:rotate-90">â€º</span>
  95:         {label}
  96:       </span>
  97:       <span className="font-mono text-[8px] font-normal tracking-[0.16em] text-[#765237]">
  98:         {meta}
  99:       </span>
 100:     </summary>
 101:   );
 102: }
 103: 
 104: export function ProjectWorkspace({ project }: { project: Project }) {
 105:   const stats = getProjectStats(project);
 106:   const activity = project.activity.map((entry) => ({ project, entry })).slice(0, 16);
 107:   const activeNotes = project.notes.filter((note) => !note.archived);
 108: 
 109:   return (
 110:     <div className="space-y-3">
 111:       <header className="relative overflow-hidden border border-[#70401d]/80 bg-[radial-gradient(circle_at_75%_0%,rgba(255,140,45,0.08),transparent_36%),linear-gradient(135deg,#0b0704,#050403_70%)] shadow-[inset_0_0_0_1px_rgba(255,166,66,0.06),0_0_34px_rgba(0,0,0,0.35)]">
 112:         <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/65 to-transparent" />
 113:         <div className="pointer-events-none absolute right-8 top-0 h-16 w-16 rotate-45 border-b border-l border-[#7b451e]/30" />
 114: 
 115:         <div className="relative grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
 116:           <div className="min-w-0">
 117:             <div className="text-[8px] font-semibold uppercase tracking-[0.4em] text-[#9a5e2b]">
 118:               Project operations // active workspace
 119:             </div>
 120:             <div className="mt-3 flex flex-wrap items-center gap-3">
 121:               <h1 className="text-2xl font-semibold uppercase tracking-[0.24em] text-[#ffe0ac] md:text-3xl">
 122:                 {project.name}
 123:               </h1>
 124:               <div className="flex flex-wrap gap-1.5">
 125:                 <StatusPill value={project.status} />
 126:                 <StatusPill value={project.repoHealth} />
 127:               </div>
 128:             </div>
 129:             <p className="mt-3 max-w-3xl text-[11px] leading-5 text-[#a78360]">
 130:               {project.summary}
 131:             </p>
 132:           </div>
 133: 
 134:           <nav aria-label={`${project.name} workspace sections`} className="flex flex-wrap gap-1.5 lg:max-w-[270px] lg:justify-end">
 135:             {[
 136:               ["#execution", "Execution"],
 137:               ["#memory", "Memory"],
 138:               ["#history", "History"],
 139:               ["#settings", "Settings"],
 140:             ].map(([href, label]) => (
 141:               <a
 142:                 key={href}
 143:                 href={href}
 144:                 className="border border-[#5d3214]/70 bg-black/20 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#98704c] transition hover:border-[#c9782f] hover:text-[#f0b66f]"
 145:               >
 146:                 {label}
 147:               </a>
 148:             ))}
 149:           </nav>
 150:         </div>
 151: 
 152:         <div className="grid grid-cols-2 divide-x divide-y divide-[#4f2b14]/55 border-t border-[#5d3214]/65 bg-black/20 sm:grid-cols-5 sm:divide-y-0">
 153:           <Readout label="Doing" value={stats.doingCount} detail="Current execution" />
 154:           <Readout label="Urgent" value={stats.urgentCount} detail="Pressure signals" alert={stats.urgentCount > 0} />
 155:           <Readout label="Tasks" value={stats.totalCards} detail="Active cards" />
 156:           <Readout label="Notes" value={stats.noteCount} detail="Stored context" />
 157:           <Readout label="Progress" value={`${stats.progress}%`} detail="Cards completed" />
 158:         </div>
 159:       </header>
 160: 
 161:       <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
 162:         <MachinePanel label="Active directive" className="min-h-[250px]">
 163:           <div className="relative flex h-full min-h-[210px] flex-col justify-between overflow-hidden p-5">
 164:             <div className="pointer-events-none absolute inset-5 border border-[#5d3214]/20" />
 165:             <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#9b5927]/15 to-transparent" />
 166:             <div className="relative">
 167:               <div className="text-[8px] uppercase tracking-[0.34em] text-[#8f5b2a]">
 168:                 Current objective
 169:               </div>
 170:               <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#efc18c]">
 171:                 {project.focus}
 172:               </p>
 173:             </div>
 174: 
 175:             <div className="relative mt-8 border-l-2 border-[#d27b2b]/65 bg-[#160b05]/65 px-4 py-3">
 176:               <div className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#a76d36]">
 177:                 Recommended next move
 178:               </div>
 179:               <p className="mt-2 text-sm leading-6 text-[#ffd09a]">
 180:                 {project.nextAction}
 181:               </p>
 182:             </div>
 183: 
 184:             <div className="relative mt-5">
 185:               <div className="mb-1.5 flex items-center justify-between text-[7px] uppercase tracking-[0.2em] text-[#765237]">
 186:                 <span>Completion signal</span>
 187:                 <span className="font-mono text-[#bd8248]">{stats.progress}%</span>
 188:               </div>
 189:               <div className="h-1 overflow-hidden bg-[#1e120a]">
 190:                 <div
 191:                   className="h-full bg-gradient-to-r from-[#8b451b] via-[#d27b2b] to-[#ffd09a] shadow-[0_0_12px_rgba(255,157,46,0.35)]"
 192:                   style={{ width: `${stats.progress}%` }}
 193:                 />
 194:               </div>
 195:             </div>
 196:           </div>
 197:         </MachinePanel>
 198: 
 199:         <MachinePanel label="Mission intelligence" className="p-4">
 200:           <div className="space-y-0">
 201:             <IntelRow label="Repository">{project.repoName}</IntelRow>
 202:             <IntelRow label="Local path">{project.repoPath || "Not linked"}</IntelRow>
 203:             <IntelRow label="Boards">{project.boards.length} active</IntelRow>
 204:             <IntelRow label="Last signal">{formatDateTime(project.updatedAt)}</IntelRow>
 205:           </div>
 206: 
 207:           <div className="mt-4 border-t border-[#5d3214]/55 pt-3">
 208:             <div className="flex items-center justify-between">
 209:               <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#a76d36]">
 210:                 Blocker scan
 211:               </div>
 212:               <span className={`font-mono text-[9px] ${project.blockers.length > 0 ? "text-[#ff9a73]" : "text-[#79c996]"}`}>
 213:                 {project.blockers.length > 0 ? `${project.blockers.length} detected` : "clear"}
 214:               </span>
 215:             </div>
 216:             {project.blockers.length > 0 ? (
 217:               <ul className="mt-3 space-y-2">
 218:                 {project.blockers.map((blocker) => (
 219:                   <li key={blocker} className="border-l border-[#ff4a3d]/45 pl-3 text-[10px] leading-5 text-[#c18d7f]">
 220:                     {blocker}
 221:                   </li>
 222:                 ))}
 223:               </ul>
 224:             ) : (
 225:               <p className="mt-3 text-[10px] leading-5 text-[#765237]">
 226:                 No active blockers recorded for this workspace.
 227:               </p>
 228:             )}
 229:           </div>
 230:         </MachinePanel>
 231:       </section>
 232: 
 233:       <section id="execution" className="scroll-mt-4 space-y-3">
 234:         <SectionLabel
 235:           overline="Execution matrix"
 236:           title="Project boards"
 237:           right={
 238:             <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#765237]">
 239:               {stats.totalCards} cards // {project.boards.length} boards
 240:             </span>
 241:           }
 242:         />
 243:         {project.boards.map((board) => (
 244:           <ProjectBoard key={board.id} projectSlug={project.slug} board={board} />
 245:         ))}
 246:       </section>
 247: 
 248:       <details id="memory" className={drawerClass}>
 249:         <DrawerSummary
 250:           label="Project memory and references"
 251:           meta={`${activeNotes.length} notes // ${project.links.length} links`}
 252:         />
 253:         <div className="grid gap-3 border-t border-[#5d3214]/55 p-3 xl:grid-cols-[1.15fr_0.85fr]">
 254:           <MachinePanel label="Project notes" className="p-3">
 255:             <form action={addProjectNoteAction} className="grid gap-2 border border-[#5d3214]/50 bg-black/20 p-3">
 256:               <input type="hidden" name="slug" value={project.slug} />
 257:               <input className={inputClass} name="title" placeholder="Note title" required />
 258:               <textarea className={inputClass} name="content" placeholder="Decision, context, rule, or reminder" rows={3} required />
 259:               <div className="flex flex-wrap items-center justify-between gap-2">
 260:                 <label className="flex items-center gap-2 text-xs text-[#9f7955]"><input type="checkbox" name="pinned" /> Pin note</label>
 261:                 <button className={buttonClass} type="submit">Add note</button>
 262:               </div>
 263:             </form>
 264: 
 265:             <div className="mt-3 grid gap-3 lg:grid-cols-2">
 266:               {activeNotes.map((note) => (
 267:                 <article key={note.id} className="border border-[#5d3214]/55 bg-[#050302] p-3">
 268:                   <form action={updateProjectNoteAction} className="grid gap-2">
 269:                     <input type="hidden" name="slug" value={project.slug} />
 270:                     <input type="hidden" name="noteId" value={note.id} />
 271:                     <div className="flex items-center gap-2">
 272:                       <input className={inputClass} name="title" defaultValue={note.title} required />
 273:                       {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#e0c36f]">pinned</span> : null}
 274:                     </div>
 275:                     <textarea className={inputClass} name="content" defaultValue={note.content} rows={4} required />
 276:                     <div className="flex flex-wrap items-center justify-between gap-2">
 277:                       <label className="flex items-center gap-2 text-xs text-[#9f7955]"><input type="checkbox" name="pinned" defaultChecked={note.pinned} /> Pinned</label>
 278:                       <button className={buttonClass} type="submit">Save</button>
 279:                     </div>
 280:                   </form>
 281:                   <div className="mt-2 flex flex-wrap gap-2">
 282:                     <form action={toggleProjectNotePinnedAction}>
 283:                       <input type="hidden" name="slug" value={project.slug} />
 284:                       <input type="hidden" name="noteId" value={note.id} />
 285:                       <button className={quietButtonClass} type="submit">{note.pinned ? "Unpin" : "Pin"}</button>
 286:                     </form>
 287:                     <form action={archiveProjectNoteAction}>
 288:                       <input type="hidden" name="slug" value={project.slug} />
 289:                       <input type="hidden" name="noteId" value={note.id} />
 290:                       <button className={quietButtonClass} type="submit">Archive</button>
 291:                     </form>
 292:                   </div>
 293:                 </article>
 294:               ))}
 295:               {activeNotes.length === 0 ? (
 296:                 <div className="border border-dashed border-[#5d3214]/45 p-4 text-center text-[10px] text-[#765237] lg:col-span-2">
 297:                   No active notes. Add only context worth carrying forward.
 298:                 </div>
 299:               ) : null}
 300:             </div>
 301:           </MachinePanel>
 302: 
 303:           <MachinePanel label="Project links" className="p-3">
 304:             <form action={addProjectLinkAction} className="grid gap-2">
 305:               <input type="hidden" name="slug" value={project.slug} />
 306:               <input className={inputClass} name="label" placeholder="Link label" required />
 307:               <input className={inputClass} name="url" placeholder="URL" required />
 308:               <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
 309:                 <input className={inputClass} name="type" defaultValue="Reference" required />
 310:                 <button className={buttonClass} type="submit">Add link</button>
 311:               </div>
 312:             </form>
 313:             <div className="mt-4 space-y-2">
 314:               {project.links.map((link) => (
 315:                 <article key={link.id} className="border-l border-[#7c451e]/70 bg-black/20 px-3 py-2">
 316:                   <div className="flex items-start justify-between gap-3">
 317:                     <div className="min-w-0">
 318:                       <div className="text-xs font-semibold text-[#e4b77f]">{link.label}</div>
 319:                       <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#765237]">{link.type}</div>
 320:                     </div>
 321:                     <form action={deleteProjectLinkAction}>
 322:                       <input type="hidden" name="slug" value={project.slug} />
 323:                       <input type="hidden" name="linkId" value={link.id} />
 324:                       <button className={quietButtonClass} type="submit">Remove</button>
 325:                     </form>
 326:                   </div>
 327:                   <a href={normalizeExternalUrl(link.url)} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[10px] text-[#b5773e] hover:text-[#ffc27f]">{link.url}</a>
 328:                 </article>
 329:               ))}
 330:               {project.links.length === 0 ? <div className="border border-dashed border-[#5d3214]/45 p-4 text-center text-[10px] text-[#765237]">No links recorded.</div> : null}
 331:             </div>
 332:           </MachinePanel>
 333:         </div>
 334:       </details>
 335: 
 336:       <details className={drawerClass}>
 337:         <DrawerSummary label="Console command deck" meta="4 shortcuts" />
 338:         <div className="grid gap-2 border-t border-[#5d3214]/55 p-3 lg:grid-cols-2">
 339:           <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">show project {project.name}</code>
 340:           <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">add task to {project.name}: &lt;title&gt;</code>
 341:           <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">set project {project.name} focus: &lt;focus&gt;</code>
 342:           <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">set project {project.name} next action: &lt;action&gt;</code>
 343:         </div>
 344:       </details>
 345: 
 346:       <details id="history" className={drawerClass}>
 347:         <DrawerSummary label="Activity trace" meta={`${activity.length} recent signals`} />
 348:         <div className="border-t border-[#5d3214]/55 p-3">
 349:           <ActivityList activity={activity} showProject={false} />
 350:         </div>
 351:       </details>
 352: 
 353:       <details id="settings" className={drawerClass}>
 354:         <DrawerSummary label="Project configuration and archive" meta="restricted controls" />
 355:         <div className="border-t border-[#5d3214]/55 p-3">
 356:           <form action={updateProjectSettingsAction} className="grid gap-3">
 357:             <input type="hidden" name="slug" value={project.slug} />
 358:             <div className="grid gap-3 lg:grid-cols-2">
 359:               <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Name<input className={inputClass} name="name" defaultValue={project.name} required /></label>
 360:               <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Repository<input className={inputClass} name="repoName" defaultValue={project.repoName} required /></label>
 361:             </div>
 362:             <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Summary<textarea className={inputClass} name="summary" defaultValue={project.summary} rows={3} required /></label>
 363:             <div className="grid gap-3 lg:grid-cols-3">
 364:               <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Status<select className={inputClass} name="status" defaultValue={project.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
 365:               <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Repo health<select className={inputClass} name="repoHealth" defaultValue={project.repoHealth}>{repoHealthOptions.map((health) => <option key={health}>{health}</option>)}</select></label>
 366:               <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Local repo path<input className={inputClass} name="repoPath" defaultValue={project.repoPath ?? ""} placeholder="C:\\path\\to\\repo" /></label>
 367:             </div>
 368:             <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Current focus<input className={inputClass} name="focus" defaultValue={project.focus} required /></label>
 369:             <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Next action<input className={inputClass} name="nextAction" defaultValue={project.nextAction} required /></label>
 370:             <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Blockers, one per line<textarea className={inputClass} name="blockers" defaultValue={project.blockers.join("\n")} rows={4} /></label>
 371:             <button className={`${buttonClass} w-fit`} type="submit">Save configuration</button>
 372:           </form>
 373: 
 374:           <div className="mt-5 border-t border-[#ff4a3d]/25 pt-4">
 375:             <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#a65f49]">Archive control</div>
 376:             <p className="mt-2 text-[10px] leading-5 text-[#8d6851]">Archiving hides this workspace from active views. Its SQLite record remains recoverable.</p>
 377:             <form action={archiveProjectAction} className="mt-3">
 378:               <input type="hidden" name="slug" value={project.slug} />
 379:               <button className="border border-[#ff4a3d]/40 bg-[#ff4a3d]/5 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#ff9f96] transition hover:bg-[#ff4a3d]/10" type="submit">Archive project</button>
 380:             </form>
 381:           </div>
 382:         </div>
 383:       </details>
 384:     </div>
 385:   );
 386: }
```


## Command Center project propagation candidates

Pattern: `command-center|URLSearchParams|searchParams|useSearchParams|project|slug|sessionId|fetch\(|/api/`

### `app\command-center\page.pre-v6-2-blueprint-layout.tsx` line 201

```text
  196:             </ClassicRail>
  197: 
  198:             <ClassicMainStack>
  199:               <ClassicSignal
  200:                 title="Chernobog Signal State"
> 201:                 subtitle="/command-center :: dense command matrix"
  202:                 compact
  203:               />
  204: 
  205:               <ClassicPanel eyebrow="Center Grid" title="Primary Route Shortcuts">
  206:                 <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
```

### `app\command-center\page.pre-v6-2-blueprint-layout.tsx` line 217

```text
  212: 
  213:               <ClassicPanel eyebrow="Directive Feed" title="Open Work / Mission Feed">
  214:                 <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
  215:                   <ClassicStat label="Open Reviews" value="Placeholder" detail="review queue not wired" />
  216:                   <ClassicStat label="Memory Candidates" value="Placeholder" detail="memory model pending" />
> 217:                   <ClassicStat label="Active Project" value="Chernobog" detail="current context" />
  218:                   <ClassicStat label="Next Action" value="Density Pass" detail="align with classic UI" />
  219:                 </div>
  220:               </ClassicPanel>
  221: 
  222:               <ClassicPanel eyebrow="Chernobog Inc" title="Department Control Layer">
```

### `app\command-center\page.pre-v6-2-command-center-overhaul.tsx` line 17

```text
   12: ];
   13: 
   14: const openWork = [
   15:   ["Open Reviews", "Placeholder until wired to review APIs"],
   16:   ["Memory Candidates", "Placeholder until wired to vault APIs"],
>  17:   ["Active Project", "Chernobog"],
   18:   ["Recommended Next Action", "Run V6.1 verification and manual route checks"],
   19: ];
   20: 
   21: const departments = [
   22:   "Executive Office",
```

### `app\command-center\page.pre-v6-2-command-center-overhaul.tsx` line 40

```text
   35:   return (
   36:     <ChernobogShell currentArea="Command Center">
   37:       <section style={{ marginBottom: "26px" }}>
   38:         <h1 style={{ margin: "0 0 10px", fontSize: "2.2rem" }}>Chernobog Command Center</h1>
   39:         <p style={{ margin: 0, color: "#c9c9d2", lineHeight: 1.6 }}>
>  40:           Operational home screen for routing, modules, vault memory, reviews, and project control. This is a dashboard, not a replacement for the command console.
   41:         </p>
   42:       </section>
   43: 
   44:       <section style={{ marginBottom: "30px" }}>
   45:         <h2>System Status</h2>
```

### `app\command-center\page.pre-v6-2-density-pass.tsx` line 232

```text
  227:             </ClassicRail>
  228: 
  229:             <ClassicMainStack>
  230:               <ClassicSignal
  231:                 title="Chernobog Signal State"
> 232:                 subtitle="/command-center :: structured command matrix"
  233:               />
  234: 
  235:               <ClassicPanel eyebrow="Center Grid" title="Primary Route Shortcuts">
  236:                 <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
  237:                   {primaryRoutes.map((route, index) => (
```

### `app\command-center\page.pre-v6-2-density-pass.tsx` line 247

```text
  242: 
  243:               <ClassicPanel eyebrow="Lower Grid" title="Open Work">
  244:                 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
  245:                   <ClassicStat label="Open Reviews" value="Placeholder" detail="review queue not wired" />
  246:                   <ClassicStat label="Memory Candidates" value="Placeholder" detail="memory model pending" />
> 247:                   <ClassicStat label="Active Project" value="Chernobog" detail="current operating context" />
  248:                   <ClassicStat label="Recommended Next Action" value="Layout Cleanup" detail="structure before more data" />
  249:                 </div>
  250:               </ClassicPanel>
  251: 
  252:               <ClassicPanel eyebrow="Chernobog Inc" title="Department Control Layer">
```

### `app\command-center\page.pre-v6-2-layout-cleanup.tsx` line 56

```text
   51:     label: "Memory Candidates",
   52:     value: "Placeholder",
   53:     detail: "awaiting vault memory model",
   54:   },
   55:   {
>  56:     label: "Active Project",
   57:     value: "Chernobog",
   58:     detail: "current operating context",
   59:   },
   60:   {
   61:     label: "Recommended Next Action",
```

### `app\command-center\page.pre-v6-2-layout-cleanup.tsx` line 229

```text
  224:                   <ClassicStat label="APIs" value={apiRoutes.length} detail="sealed" />
  225:                 </div>
  226:               </div>
  227:             </header>
  228: 
> 229:             <ClassicSignal subtitle="/command-center :: /routes :: /modules :: /command" />
  230: 
  231:             <ClassicPanel eyebrow="System Status" title="Core Status Array">
  232:               <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
  233:                 <ClassicStat label="Chernobog Version" value="V6.2" detail="classic interface" />
  234:                 <ClassicStat label="Vault Memory" value="Available" detail="registry listed" />
```

### `app\command-center\page.pre-v6-2-proportion-pass.tsx.bak` line 267

```text
  262:             </ClassicRail>
  263: 
  264:             <ClassicMainStack>
  265:               <ClassicSignal
  266:                 title="Chernobog Signal State"
> 267:                 subtitle="/command-center :: original eye interface restored"
  268:               />
  269: 
  270:               <ClassicPanel eyebrow="Center Grid" title="All Modules Here" className="min-h-[360px]">
  271:                 <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
  272:                   {modules.map((module, index) => (
```

### `app\command-center\page.pre-v6-2-proportion-pass.tsx.bak` line 322

```text
  317:                   </div>
  318:                 </div>
  319: 
  320:                 <div className="mt-3 border-t border-[#5d3214]/45 pt-3">
  321:                   <ClassicMiniStat label="Trust Mode" value="Read-Only UI" />
> 322:                   <ClassicMiniStat label="Active Project" value="Chernobog" />
  323:                   <ClassicMiniStat label="Next Action" value="Module Layout" />
  324:                 </div>
  325:               </ClassicPanel>
  326:             </ClassicRail>
  327:           </ClassicLayout>
```

### `app\command-center\page.tsx` line 1

```text
>   1: import { CommandCenterView } from "@/components/chernobog-ui/command-center/CommandCenterView";
    2: import { buildCommandCenterModel } from "@/components/chernobog-ui/command-center/commandCenterModel";
    3: import { getAllChernobogModules } from "@/lib/chernobog-ui/moduleRegistry";
    4: import {
    5:   getAllChernobogRoutes,
    6:   getPrimaryNavigationRoutes,
```

### `app\command-center\page.tsx` line 2

```text
    1: import { CommandCenterView } from "@/components/chernobog-ui/command-center/CommandCenterView";
>   2: import { buildCommandCenterModel } from "@/components/chernobog-ui/command-center/commandCenterModel";
    3: import { getAllChernobogModules } from "@/lib/chernobog-ui/moduleRegistry";
    4: import {
    5:   getAllChernobogRoutes,
    6:   getPrimaryNavigationRoutes,
    7: } from "@/lib/chernobog-ui/routeRegistry";
```

### `app\command-center\page.tsx.pre-v6-2-real-routes.bak` line 140

```text
  135:         </div>
  136:         <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.55em] text-[#ffd28a]">
  137:           Chernobog Signal State
  138:         </div>
  139:         <div className="mt-2 font-mono text-[9px] text-[#8e785c]">
> 140:           /command-center :: original eye interface restored
  141:         </div>
  142:       </div>
  143:     </section>
  144:   );
  145: }
```

### `app\command-center\page.tsx.pre-v6-2-real-routes.bak` line 372

```text
  367:                   <DirectiveStack />
  368:                 </div>
  369: 
  370:                 <div className="mt-3 border-t border-[#5d3214]/45 pt-2.5">
  371:                   <ClassicMiniStat label="Trust Mode" value="Read-Only UI" />
> 372:                   <ClassicMiniStat label="Project" value="Chernobog" />
  373:                 </div>
  374:               </ClassicPanel>
  375:             </aside>
  376:           </div>
  377:         </div>
```

### `app\projects\[slug]\not-found.tsx` line 3

```text
    1: import Link from "next/link";
    2: 
>   3: import { MachinePanel } from "@/components/project-operations/ui";
    4: 
    5: export default function ProjectNotFound() {
    6:   return (
    7:     <MachinePanel label="Workspace unavailable" className="p-5">
    8:       <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
```

### `app\projects\[slug]\not-found.tsx` line 5

```text
    1: import Link from "next/link";
    2: 
    3: import { MachinePanel } from "@/components/project-operations/ui";
    4: 
>   5: export default function ProjectNotFound() {
    6:   return (
    7:     <MachinePanel label="Workspace unavailable" className="p-5">
    8:       <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
    9:       <p className="mt-3 text-xs leading-6 text-[#9f7955]">The project does not exist or has been archived.</p>
   10:       <Link href="/projects" className="mt-4 inline-block border border-[#9b5927]/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0b66f]">Return to Project Operations</Link>
```

### `app\projects\[slug]\not-found.tsx` line 8

```text
    3: import { MachinePanel } from "@/components/project-operations/ui";
    4: 
    5: export default function ProjectNotFound() {
    6:   return (
    7:     <MachinePanel label="Workspace unavailable" className="p-5">
>   8:       <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
    9:       <p className="mt-3 text-xs leading-6 text-[#9f7955]">The project does not exist or has been archived.</p>
   10:       <Link href="/projects" className="mt-4 inline-block border border-[#9b5927]/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0b66f]">Return to Project Operations</Link>
   11:     </MachinePanel>
   12:   );
   13: }
```

### `app\projects\[slug]\not-found.tsx` line 9

```text
    4: 
    5: export default function ProjectNotFound() {
    6:   return (
    7:     <MachinePanel label="Workspace unavailable" className="p-5">
    8:       <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
>   9:       <p className="mt-3 text-xs leading-6 text-[#9f7955]">The project does not exist or has been archived.</p>
   10:       <Link href="/projects" className="mt-4 inline-block border border-[#9b5927]/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0b66f]">Return to Project Operations</Link>
   11:     </MachinePanel>
   12:   );
   13: }
```

### `app\projects\[slug]\not-found.tsx` line 10

```text
    5: export default function ProjectNotFound() {
    6:   return (
    7:     <MachinePanel label="Workspace unavailable" className="p-5">
    8:       <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
    9:       <p className="mt-3 text-xs leading-6 text-[#9f7955]">The project does not exist or has been archived.</p>
>  10:       <Link href="/projects" className="mt-4 inline-block border border-[#9b5927]/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0b66f]">Return to Project Operations</Link>
   11:     </MachinePanel>
   12:   );
   13: }
```

### `app\projects\[slug]\page.tsx` line 3

```text
    1: import { notFound } from "next/navigation";
    2: 
>   3: import { ProjectWorkspace } from "@/components/project-operations/ProjectWorkspace";
    4: import { getProjectBySlug } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
    8: type ProjectPageProps = {
```

### `app\projects\[slug]\page.tsx` line 4

```text
    1: import { notFound } from "next/navigation";
    2: 
    3: import { ProjectWorkspace } from "@/components/project-operations/ProjectWorkspace";
>   4: import { getProjectBySlug } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
    8: type ProjectPageProps = {
    9:   params: Promise<{ slug: string }>;
```

### `app\projects\[slug]\page.tsx` line 8

```text
    3: import { ProjectWorkspace } from "@/components/project-operations/ProjectWorkspace";
    4: import { getProjectBySlug } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
>   8: type ProjectPageProps = {
    9:   params: Promise<{ slug: string }>;
   10: };
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
```

### `app\projects\[slug]\page.tsx` line 9

```text
    4: import { getProjectBySlug } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
    8: type ProjectPageProps = {
>   9:   params: Promise<{ slug: string }>;
   10: };
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
   14:   const project = getProjectBySlug(slug);
```

### `app\projects\[slug]\page.tsx` line 12

```text
    7: 
    8: type ProjectPageProps = {
    9:   params: Promise<{ slug: string }>;
   10: };
   11: 
>  12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
   14:   const project = getProjectBySlug(slug);
   15:   if (!project) notFound();
   16:   return <ProjectWorkspace project={project} />;
   17: }
```

### `app\projects\[slug]\page.tsx` line 13

```text
    8: type ProjectPageProps = {
    9:   params: Promise<{ slug: string }>;
   10: };
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
>  13:   const { slug } = await params;
   14:   const project = getProjectBySlug(slug);
   15:   if (!project) notFound();
   16:   return <ProjectWorkspace project={project} />;
   17: }
```

### `app\projects\[slug]\page.tsx` line 14

```text
    9:   params: Promise<{ slug: string }>;
   10: };
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
>  14:   const project = getProjectBySlug(slug);
   15:   if (!project) notFound();
   16:   return <ProjectWorkspace project={project} />;
   17: }
```

### `app\projects\[slug]\page.tsx` line 15

```text
   10: };
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
   14:   const project = getProjectBySlug(slug);
>  15:   if (!project) notFound();
   16:   return <ProjectWorkspace project={project} />;
   17: }
```

### `app\projects\[slug]\page.tsx` line 16

```text
   11: 
   12: export default async function ProjectPage({ params }: ProjectPageProps) {
   13:   const { slug } = await params;
   14:   const project = getProjectBySlug(slug);
   15:   if (!project) notFound();
>  16:   return <ProjectWorkspace project={project} />;
   17: }
```

### `app\projects\actions.ts` line 7

```text
    2: 
    3: import { revalidatePath } from "next/cache";
    4: import { redirect } from "next/navigation";
    5: 
    6: import {
>   7:   addProjectLink,
    8:   addProjectNote,
    9:   archiveProject,
   10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
```

### `app\projects\actions.ts` line 8

```text
    3: import { revalidatePath } from "next/cache";
    4: import { redirect } from "next/navigation";
    5: 
    6: import {
    7:   addProjectLink,
>   8:   addProjectNote,
    9:   archiveProject,
   10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
```

### `app\projects\actions.ts` line 9

```text
    4: import { redirect } from "next/navigation";
    5: 
    6: import {
    7:   addProjectLink,
    8:   addProjectNote,
>   9:   archiveProject,
   10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
```

### `app\projects\actions.ts` line 10

```text
    5: 
    6: import {
    7:   addProjectLink,
    8:   addProjectNote,
    9:   archiveProject,
>  10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
```

### `app\projects\actions.ts` line 12

```text
    7:   addProjectLink,
    8:   addProjectNote,
    9:   archiveProject,
   10:   archiveProjectNote,
   11:   archiveTaskCard,
>  12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
   16:   updateProjectNote,
   17:   updateProjectSettings,
```

### `app\projects\actions.ts` line 14

```text
    9:   archiveProject,
   10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
>  14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
   16:   updateProjectNote,
   17:   updateProjectSettings,
   18:   updateTaskCard,
   19: } from "@/lib/modules/project-operations";
```

### `app\projects\actions.ts` line 15

```text
   10:   archiveProjectNote,
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
>  15:   toggleProjectNotePinned,
   16:   updateProjectNote,
   17:   updateProjectSettings,
   18:   updateTaskCard,
   19: } from "@/lib/modules/project-operations";
   20: import type {
```

### `app\projects\actions.ts` line 16

```text
   11:   archiveTaskCard,
   12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
>  16:   updateProjectNote,
   17:   updateProjectSettings,
   18:   updateTaskCard,
   19: } from "@/lib/modules/project-operations";
   20: import type {
   21:   ProjectStatus,
```

### `app\projects\actions.ts` line 17

```text
   12:   createProject,
   13:   createTaskCard,
   14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
   16:   updateProjectNote,
>  17:   updateProjectSettings,
   18:   updateTaskCard,
   19: } from "@/lib/modules/project-operations";
   20: import type {
   21:   ProjectStatus,
   22:   RepoHealth,
```

### `app\projects\actions.ts` line 19

```text
   14:   deleteProjectLink,
   15:   toggleProjectNotePinned,
   16:   updateProjectNote,
   17:   updateProjectSettings,
   18:   updateTaskCard,
>  19: } from "@/lib/modules/project-operations";
   20: import type {
   21:   ProjectStatus,
   22:   RepoHealth,
   23:   TaskColumnId,
   24:   TaskPriority,
```

### `app\projects\actions.ts` line 21

```text
   16:   updateProjectNote,
   17:   updateProjectSettings,
   18:   updateTaskCard,
   19: } from "@/lib/modules/project-operations";
   20: import type {
>  21:   ProjectStatus,
   22:   RepoHealth,
   23:   TaskColumnId,
   24:   TaskPriority,
   25: } from "@/lib/modules/project-operations";
   26: 
```

### `app\projects\actions.ts` line 25

```text
   20: import type {
   21:   ProjectStatus,
   22:   RepoHealth,
   23:   TaskColumnId,
   24:   TaskPriority,
>  25: } from "@/lib/modules/project-operations";
   26: 
   27: const VALID_COLUMNS: TaskColumnId[] = ["backlog", "next", "doing", "done"];
   28: const VALID_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
   29: const VALID_STATUSES: ProjectStatus[] = [
   30:   "Active",
```

### `app\projects\actions.ts` line 29

```text
   24:   TaskPriority,
   25: } from "@/lib/modules/project-operations";
   26: 
   27: const VALID_COLUMNS: TaskColumnId[] = ["backlog", "next", "doing", "done"];
   28: const VALID_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
>  29: const VALID_STATUSES: ProjectStatus[] = [
   30:   "Active",
   31:   "Planning",
   32:   "Blocked",
   33:   "Polish",
   34:   "Archived",
```

### `app\projects\actions.ts` line 42

```text
   37:   "Healthy",
   38:   "Watch",
   39:   "Needs Attention",
   40: ];
   41: 
>  42: export async function createProjectAction(formData: FormData) {
   43:   const project = createProject({
   44:     name: requiredString(formData, "name"),
   45:     summary: requiredString(formData, "summary"),
   46:     repoName: requiredString(formData, "repoName"),
   47:     repoPath: optionalString(formData, "repoPath"),
```

### `app\projects\actions.ts` line 43

```text
   38:   "Watch",
   39:   "Needs Attention",
   40: ];
   41: 
   42: export async function createProjectAction(formData: FormData) {
>  43:   const project = createProject({
   44:     name: requiredString(formData, "name"),
   45:     summary: requiredString(formData, "summary"),
   46:     repoName: requiredString(formData, "repoName"),
   47:     repoPath: optionalString(formData, "repoPath"),
   48:   });
```

### `app\projects\actions.ts` line 50

```text
   45:     summary: requiredString(formData, "summary"),
   46:     repoName: requiredString(formData, "repoName"),
   47:     repoPath: optionalString(formData, "repoPath"),
   48:   });
   49: 
>  50:   revalidateProjectPaths(project.slug);
   51:   redirect(`/projects/${project.slug}`);
   52: }
   53: 
   54: export async function updateProjectSettingsAction(formData: FormData) {
   55:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 51

```text
   46:     repoName: requiredString(formData, "repoName"),
   47:     repoPath: optionalString(formData, "repoPath"),
   48:   });
   49: 
   50:   revalidateProjectPaths(project.slug);
>  51:   redirect(`/projects/${project.slug}`);
   52: }
   53: 
   54: export async function updateProjectSettingsAction(formData: FormData) {
   55:   const slug = requiredString(formData, "slug");
   56:   updateProjectSettings(slug, {
```

### `app\projects\actions.ts` line 54

```text
   49: 
   50:   revalidateProjectPaths(project.slug);
   51:   redirect(`/projects/${project.slug}`);
   52: }
   53: 
>  54: export async function updateProjectSettingsAction(formData: FormData) {
   55:   const slug = requiredString(formData, "slug");
   56:   updateProjectSettings(slug, {
   57:     name: requiredString(formData, "name"),
   58:     summary: requiredString(formData, "summary"),
   59:     status: requiredEnum(formData, "status", VALID_STATUSES),
```

### `app\projects\actions.ts` line 55

```text
   50:   revalidateProjectPaths(project.slug);
   51:   redirect(`/projects/${project.slug}`);
   52: }
   53: 
   54: export async function updateProjectSettingsAction(formData: FormData) {
>  55:   const slug = requiredString(formData, "slug");
   56:   updateProjectSettings(slug, {
   57:     name: requiredString(formData, "name"),
   58:     summary: requiredString(formData, "summary"),
   59:     status: requiredEnum(formData, "status", VALID_STATUSES),
   60:     repoHealth: requiredEnum(formData, "repoHealth", VALID_REPO_HEALTH),
```

### `app\projects\actions.ts` line 56

```text
   51:   redirect(`/projects/${project.slug}`);
   52: }
   53: 
   54: export async function updateProjectSettingsAction(formData: FormData) {
   55:   const slug = requiredString(formData, "slug");
>  56:   updateProjectSettings(slug, {
   57:     name: requiredString(formData, "name"),
   58:     summary: requiredString(formData, "summary"),
   59:     status: requiredEnum(formData, "status", VALID_STATUSES),
   60:     repoHealth: requiredEnum(formData, "repoHealth", VALID_REPO_HEALTH),
   61:     repoName: requiredString(formData, "repoName"),
```

### `app\projects\actions.ts` line 70

```text
   65:     blockers: optionalString(formData, "blockers")
   66:       .split(/\r?\n/)
   67:       .map((value) => value.trim())
   68:       .filter(Boolean),
   69:   });
>  70:   revalidateProjectPaths(slug);
   71: }
   72: 
   73: export async function archiveProjectAction(formData: FormData) {
   74:   const slug = requiredString(formData, "slug");
   75:   archiveProject(slug);
```

### `app\projects\actions.ts` line 73

```text
   68:       .filter(Boolean),
   69:   });
   70:   revalidateProjectPaths(slug);
   71: }
   72: 
>  73: export async function archiveProjectAction(formData: FormData) {
   74:   const slug = requiredString(formData, "slug");
   75:   archiveProject(slug);
   76:   revalidateProjectPaths(slug);
   77:   redirect("/projects");
   78: }
```

### `app\projects\actions.ts` line 74

```text
   69:   });
   70:   revalidateProjectPaths(slug);
   71: }
   72: 
   73: export async function archiveProjectAction(formData: FormData) {
>  74:   const slug = requiredString(formData, "slug");
   75:   archiveProject(slug);
   76:   revalidateProjectPaths(slug);
   77:   redirect("/projects");
   78: }
   79: 
```

### `app\projects\actions.ts` line 75

```text
   70:   revalidateProjectPaths(slug);
   71: }
   72: 
   73: export async function archiveProjectAction(formData: FormData) {
   74:   const slug = requiredString(formData, "slug");
>  75:   archiveProject(slug);
   76:   revalidateProjectPaths(slug);
   77:   redirect("/projects");
   78: }
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
```

### `app\projects\actions.ts` line 76

```text
   71: }
   72: 
   73: export async function archiveProjectAction(formData: FormData) {
   74:   const slug = requiredString(formData, "slug");
   75:   archiveProject(slug);
>  76:   revalidateProjectPaths(slug);
   77:   redirect("/projects");
   78: }
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
   81:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 77

```text
   72: 
   73: export async function archiveProjectAction(formData: FormData) {
   74:   const slug = requiredString(formData, "slug");
   75:   archiveProject(slug);
   76:   revalidateProjectPaths(slug);
>  77:   redirect("/projects");
   78: }
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
   81:   const slug = requiredString(formData, "slug");
   82:   const boardId = requiredString(formData, "boardId");
```

### `app\projects\actions.ts` line 81

```text
   76:   revalidateProjectPaths(slug);
   77:   redirect("/projects");
   78: }
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
>  81:   const slug = requiredString(formData, "slug");
   82:   const boardId = requiredString(formData, "boardId");
   83:   createTaskCard(slug, boardId, taskInput(formData));
   84:   revalidateProjectPaths(slug);
   85: }
   86: 
```

### `app\projects\actions.ts` line 83

```text
   78: }
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
   81:   const slug = requiredString(formData, "slug");
   82:   const boardId = requiredString(formData, "boardId");
>  83:   createTaskCard(slug, boardId, taskInput(formData));
   84:   revalidateProjectPaths(slug);
   85: }
   86: 
   87: export async function updateTaskCardAction(formData: FormData) {
   88:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 84

```text
   79: 
   80: export async function createTaskCardAction(formData: FormData) {
   81:   const slug = requiredString(formData, "slug");
   82:   const boardId = requiredString(formData, "boardId");
   83:   createTaskCard(slug, boardId, taskInput(formData));
>  84:   revalidateProjectPaths(slug);
   85: }
   86: 
   87: export async function updateTaskCardAction(formData: FormData) {
   88:   const slug = requiredString(formData, "slug");
   89:   const boardId = requiredString(formData, "boardId");
```

### `app\projects\actions.ts` line 88

```text
   83:   createTaskCard(slug, boardId, taskInput(formData));
   84:   revalidateProjectPaths(slug);
   85: }
   86: 
   87: export async function updateTaskCardAction(formData: FormData) {
>  88:   const slug = requiredString(formData, "slug");
   89:   const boardId = requiredString(formData, "boardId");
   90:   const cardId = requiredString(formData, "cardId");
   91:   updateTaskCard(slug, boardId, cardId, taskInput(formData));
   92:   revalidateProjectPaths(slug);
   93: }
```

### `app\projects\actions.ts` line 91

```text
   86: 
   87: export async function updateTaskCardAction(formData: FormData) {
   88:   const slug = requiredString(formData, "slug");
   89:   const boardId = requiredString(formData, "boardId");
   90:   const cardId = requiredString(formData, "cardId");
>  91:   updateTaskCard(slug, boardId, cardId, taskInput(formData));
   92:   revalidateProjectPaths(slug);
   93: }
   94: 
   95: export async function archiveTaskCardAction(formData: FormData) {
   96:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 92

```text
   87: export async function updateTaskCardAction(formData: FormData) {
   88:   const slug = requiredString(formData, "slug");
   89:   const boardId = requiredString(formData, "boardId");
   90:   const cardId = requiredString(formData, "cardId");
   91:   updateTaskCard(slug, boardId, cardId, taskInput(formData));
>  92:   revalidateProjectPaths(slug);
   93: }
   94: 
   95: export async function archiveTaskCardAction(formData: FormData) {
   96:   const slug = requiredString(formData, "slug");
   97:   archiveTaskCard(
```

### `app\projects\actions.ts` line 96

```text
   91:   updateTaskCard(slug, boardId, cardId, taskInput(formData));
   92:   revalidateProjectPaths(slug);
   93: }
   94: 
   95: export async function archiveTaskCardAction(formData: FormData) {
>  96:   const slug = requiredString(formData, "slug");
   97:   archiveTaskCard(
   98:     slug,
   99:     requiredString(formData, "boardId"),
  100:     requiredString(formData, "cardId"),
  101:   );
```

### `app\projects\actions.ts` line 98

```text
   93: }
   94: 
   95: export async function archiveTaskCardAction(formData: FormData) {
   96:   const slug = requiredString(formData, "slug");
   97:   archiveTaskCard(
>  98:     slug,
   99:     requiredString(formData, "boardId"),
  100:     requiredString(formData, "cardId"),
  101:   );
  102:   revalidateProjectPaths(slug);
  103: }
```

### `app\projects\actions.ts` line 102

```text
   97:   archiveTaskCard(
   98:     slug,
   99:     requiredString(formData, "boardId"),
  100:     requiredString(formData, "cardId"),
  101:   );
> 102:   revalidateProjectPaths(slug);
  103: }
  104: 
  105: export async function addProjectNoteAction(formData: FormData) {
  106:   const slug = requiredString(formData, "slug");
  107:   addProjectNote(slug, {
```

### `app\projects\actions.ts` line 105

```text
  100:     requiredString(formData, "cardId"),
  101:   );
  102:   revalidateProjectPaths(slug);
  103: }
  104: 
> 105: export async function addProjectNoteAction(formData: FormData) {
  106:   const slug = requiredString(formData, "slug");
  107:   addProjectNote(slug, {
  108:     title: requiredString(formData, "title"),
  109:     content: requiredString(formData, "content"),
  110:     pinned: formData.get("pinned") === "on",
```

### `app\projects\actions.ts` line 106

```text
  101:   );
  102:   revalidateProjectPaths(slug);
  103: }
  104: 
  105: export async function addProjectNoteAction(formData: FormData) {
> 106:   const slug = requiredString(formData, "slug");
  107:   addProjectNote(slug, {
  108:     title: requiredString(formData, "title"),
  109:     content: requiredString(formData, "content"),
  110:     pinned: formData.get("pinned") === "on",
  111:   });
```

### `app\projects\actions.ts` line 107

```text
  102:   revalidateProjectPaths(slug);
  103: }
  104: 
  105: export async function addProjectNoteAction(formData: FormData) {
  106:   const slug = requiredString(formData, "slug");
> 107:   addProjectNote(slug, {
  108:     title: requiredString(formData, "title"),
  109:     content: requiredString(formData, "content"),
  110:     pinned: formData.get("pinned") === "on",
  111:   });
  112:   revalidateProjectPaths(slug);
```

### `app\projects\actions.ts` line 112

```text
  107:   addProjectNote(slug, {
  108:     title: requiredString(formData, "title"),
  109:     content: requiredString(formData, "content"),
  110:     pinned: formData.get("pinned") === "on",
  111:   });
> 112:   revalidateProjectPaths(slug);
  113: }
  114: 
  115: export async function updateProjectNoteAction(formData: FormData) {
  116:   const slug = requiredString(formData, "slug");
  117:   updateProjectNote(slug, requiredString(formData, "noteId"), {
```

### `app\projects\actions.ts` line 115

```text
  110:     pinned: formData.get("pinned") === "on",
  111:   });
  112:   revalidateProjectPaths(slug);
  113: }
  114: 
> 115: export async function updateProjectNoteAction(formData: FormData) {
  116:   const slug = requiredString(formData, "slug");
  117:   updateProjectNote(slug, requiredString(formData, "noteId"), {
  118:     title: requiredString(formData, "title"),
  119:     content: requiredString(formData, "content"),
  120:     pinned: formData.get("pinned") === "on",
```

### `app\projects\actions.ts` line 116

```text
  111:   });
  112:   revalidateProjectPaths(slug);
  113: }
  114: 
  115: export async function updateProjectNoteAction(formData: FormData) {
> 116:   const slug = requiredString(formData, "slug");
  117:   updateProjectNote(slug, requiredString(formData, "noteId"), {
  118:     title: requiredString(formData, "title"),
  119:     content: requiredString(formData, "content"),
  120:     pinned: formData.get("pinned") === "on",
  121:   });
```

### `app\projects\actions.ts` line 117

```text
  112:   revalidateProjectPaths(slug);
  113: }
  114: 
  115: export async function updateProjectNoteAction(formData: FormData) {
  116:   const slug = requiredString(formData, "slug");
> 117:   updateProjectNote(slug, requiredString(formData, "noteId"), {
  118:     title: requiredString(formData, "title"),
  119:     content: requiredString(formData, "content"),
  120:     pinned: formData.get("pinned") === "on",
  121:   });
  122:   revalidateProjectPaths(slug);
```

### `app\projects\actions.ts` line 122

```text
  117:   updateProjectNote(slug, requiredString(formData, "noteId"), {
  118:     title: requiredString(formData, "title"),
  119:     content: requiredString(formData, "content"),
  120:     pinned: formData.get("pinned") === "on",
  121:   });
> 122:   revalidateProjectPaths(slug);
  123: }
  124: 
  125: export async function toggleProjectNotePinnedAction(formData: FormData) {
  126:   const slug = requiredString(formData, "slug");
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
```

### `app\projects\actions.ts` line 125

```text
  120:     pinned: formData.get("pinned") === "on",
  121:   });
  122:   revalidateProjectPaths(slug);
  123: }
  124: 
> 125: export async function toggleProjectNotePinnedAction(formData: FormData) {
  126:   const slug = requiredString(formData, "slug");
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
```

### `app\projects\actions.ts` line 126

```text
  121:   });
  122:   revalidateProjectPaths(slug);
  123: }
  124: 
  125: export async function toggleProjectNotePinnedAction(formData: FormData) {
> 126:   const slug = requiredString(formData, "slug");
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
```

### `app\projects\actions.ts` line 127

```text
  122:   revalidateProjectPaths(slug);
  123: }
  124: 
  125: export async function toggleProjectNotePinnedAction(formData: FormData) {
  126:   const slug = requiredString(formData, "slug");
> 127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
  132:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 128

```text
  123: }
  124: 
  125: export async function toggleProjectNotePinnedAction(formData: FormData) {
  126:   const slug = requiredString(formData, "slug");
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
> 128:   revalidateProjectPaths(slug);
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
  132:   const slug = requiredString(formData, "slug");
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
```

### `app\projects\actions.ts` line 131

```text
  126:   const slug = requiredString(formData, "slug");
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
> 131: export async function archiveProjectNoteAction(formData: FormData) {
  132:   const slug = requiredString(formData, "slug");
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
```

### `app\projects\actions.ts` line 132

```text
  127:   toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
> 132:   const slug = requiredString(formData, "slug");
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
  137: export async function addProjectLinkAction(formData: FormData) {
```

### `app\projects\actions.ts` line 133

```text
  128:   revalidateProjectPaths(slug);
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
  132:   const slug = requiredString(formData, "slug");
> 133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
  137: export async function addProjectLinkAction(formData: FormData) {
  138:   const slug = requiredString(formData, "slug");
```

### `app\projects\actions.ts` line 134

```text
  129: }
  130: 
  131: export async function archiveProjectNoteAction(formData: FormData) {
  132:   const slug = requiredString(formData, "slug");
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
> 134:   revalidateProjectPaths(slug);
  135: }
  136: 
  137: export async function addProjectLinkAction(formData: FormData) {
  138:   const slug = requiredString(formData, "slug");
  139:   addProjectLink(slug, {
```

### `app\projects\actions.ts` line 137

```text
  132:   const slug = requiredString(formData, "slug");
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
> 137: export async function addProjectLinkAction(formData: FormData) {
  138:   const slug = requiredString(formData, "slug");
  139:   addProjectLink(slug, {
  140:     label: requiredString(formData, "label"),
  141:     url: requiredString(formData, "url"),
  142:     type: requiredString(formData, "type"),
```

### `app\projects\actions.ts` line 138

```text
  133:   archiveProjectNote(slug, requiredString(formData, "noteId"));
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
  137: export async function addProjectLinkAction(formData: FormData) {
> 138:   const slug = requiredString(formData, "slug");
  139:   addProjectLink(slug, {
  140:     label: requiredString(formData, "label"),
  141:     url: requiredString(formData, "url"),
  142:     type: requiredString(formData, "type"),
  143:   });
```

### `app\projects\actions.ts` line 139

```text
  134:   revalidateProjectPaths(slug);
  135: }
  136: 
  137: export async function addProjectLinkAction(formData: FormData) {
  138:   const slug = requiredString(formData, "slug");
> 139:   addProjectLink(slug, {
  140:     label: requiredString(formData, "label"),
  141:     url: requiredString(formData, "url"),
  142:     type: requiredString(formData, "type"),
  143:   });
  144:   revalidateProjectPaths(slug);
```

### `app\projects\actions.ts` line 144

```text
  139:   addProjectLink(slug, {
  140:     label: requiredString(formData, "label"),
  141:     url: requiredString(formData, "url"),
  142:     type: requiredString(formData, "type"),
  143:   });
> 144:   revalidateProjectPaths(slug);
  145: }
  146: 
  147: export async function deleteProjectLinkAction(formData: FormData) {
  148:   const slug = requiredString(formData, "slug");
  149:   deleteProjectLink(slug, requiredString(formData, "linkId"));
```

### `app\projects\actions.ts` line 147

```text
  142:     type: requiredString(formData, "type"),
  143:   });
  144:   revalidateProjectPaths(slug);
  145: }
  146: 
> 147: export async function deleteProjectLinkAction(formData: FormData) {
  148:   const slug = requiredString(formData, "slug");
  149:   deleteProjectLink(slug, requiredString(formData, "linkId"));
  150:   revalidateProjectPaths(slug);
  151: }
  152: 
```

### `app\projects\actions.ts` line 148

```text
  143:   });
  144:   revalidateProjectPaths(slug);
  145: }
  146: 
  147: export async function deleteProjectLinkAction(formData: FormData) {
> 148:   const slug = requiredString(formData, "slug");
  149:   deleteProjectLink(slug, requiredString(formData, "linkId"));
  150:   revalidateProjectPaths(slug);
  151: }
  152: 
  153: function taskInput(formData: FormData) {
```

### `app\projects\actions.ts` line 149

```text
  144:   revalidateProjectPaths(slug);
  145: }
  146: 
  147: export async function deleteProjectLinkAction(formData: FormData) {
  148:   const slug = requiredString(formData, "slug");
> 149:   deleteProjectLink(slug, requiredString(formData, "linkId"));
  150:   revalidateProjectPaths(slug);
  151: }
  152: 
  153: function taskInput(formData: FormData) {
  154:   return {
```

### `app\projects\actions.ts` line 150

```text
  145: }
  146: 
  147: export async function deleteProjectLinkAction(formData: FormData) {
  148:   const slug = requiredString(formData, "slug");
  149:   deleteProjectLink(slug, requiredString(formData, "linkId"));
> 150:   revalidateProjectPaths(slug);
  151: }
  152: 
  153: function taskInput(formData: FormData) {
  154:   return {
  155:     title: requiredString(formData, "title"),
```

### `app\projects\actions.ts` line 187

```text
  182:   const value = requiredString(formData, key) as T;
  183:   if (!allowed.includes(value)) throw new Error(`Invalid ${key}: ${value}`);
  184:   return value;
  185: }
  186: 
> 187: function revalidateProjectPaths(slug: string) {
  188:   revalidatePath("/projects");
  189:   revalidatePath(`/projects/${slug}`);
  190:   revalidatePath("/projects/notes");
  191:   revalidatePath("/projects/activity");
  192:   revalidatePath("/command-center");
```

### `app\projects\actions.ts` line 188

```text
  183:   if (!allowed.includes(value)) throw new Error(`Invalid ${key}: ${value}`);
  184:   return value;
  185: }
  186: 
  187: function revalidateProjectPaths(slug: string) {
> 188:   revalidatePath("/projects");
  189:   revalidatePath(`/projects/${slug}`);
  190:   revalidatePath("/projects/notes");
  191:   revalidatePath("/projects/activity");
  192:   revalidatePath("/command-center");
  193: }
```

### `app\projects\actions.ts` line 189

```text
  184:   return value;
  185: }
  186: 
  187: function revalidateProjectPaths(slug: string) {
  188:   revalidatePath("/projects");
> 189:   revalidatePath(`/projects/${slug}`);
  190:   revalidatePath("/projects/notes");
  191:   revalidatePath("/projects/activity");
  192:   revalidatePath("/command-center");
  193: }
```

### `app\projects\actions.ts` line 190

```text
  185: }
  186: 
  187: function revalidateProjectPaths(slug: string) {
  188:   revalidatePath("/projects");
  189:   revalidatePath(`/projects/${slug}`);
> 190:   revalidatePath("/projects/notes");
  191:   revalidatePath("/projects/activity");
  192:   revalidatePath("/command-center");
  193: }
```

### `app\projects\actions.ts` line 191

```text
  186: 
  187: function revalidateProjectPaths(slug: string) {
  188:   revalidatePath("/projects");
  189:   revalidatePath(`/projects/${slug}`);
  190:   revalidatePath("/projects/notes");
> 191:   revalidatePath("/projects/activity");
  192:   revalidatePath("/command-center");
  193: }
```

### `app\projects\actions.ts` line 192

```text
  187: function revalidateProjectPaths(slug: string) {
  188:   revalidatePath("/projects");
  189:   revalidatePath(`/projects/${slug}`);
  190:   revalidatePath("/projects/notes");
  191:   revalidatePath("/projects/activity");
> 192:   revalidatePath("/command-center");
  193: }
```

### `app\projects\activity\page.tsx` line 1

```text
>   1: import { ActivityList } from "@/components/project-operations/ActivityList";
    2: import { MachinePanel } from "@/components/project-operations/ui";
    3: import { getRecentActivity } from "@/lib/modules/project-operations";
    4: 
    5: export const dynamic = "force-dynamic";
    6: 
```

### `app\projects\activity\page.tsx` line 2

```text
    1: import { ActivityList } from "@/components/project-operations/ActivityList";
>   2: import { MachinePanel } from "@/components/project-operations/ui";
    3: import { getRecentActivity } from "@/lib/modules/project-operations";
    4: 
    5: export const dynamic = "force-dynamic";
    6: 
    7: export default function ProjectActivityPage() {
```

### `app\projects\activity\page.tsx` line 3

```text
    1: import { ActivityList } from "@/components/project-operations/ActivityList";
    2: import { MachinePanel } from "@/components/project-operations/ui";
>   3: import { getRecentActivity } from "@/lib/modules/project-operations";
    4: 
    5: export const dynamic = "force-dynamic";
    6: 
    7: export default function ProjectActivityPage() {
    8:   const activity = getRecentActivity(100);
```

### `app\projects\activity\page.tsx` line 7

```text
    2: import { MachinePanel } from "@/components/project-operations/ui";
    3: import { getRecentActivity } from "@/lib/modules/project-operations";
    4: 
    5: export const dynamic = "force-dynamic";
    6: 
>   7: export default function ProjectActivityPage() {
    8:   const activity = getRecentActivity(100);
    9: 
   10:   return (
   11:     <div className="space-y-5">
   12:       <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
```

### `app\projects\activity\page.tsx` line 14

```text
    9: 
   10:   return (
   11:     <div className="space-y-5">
   12:       <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
   13:         <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Operational trace</div>
>  14:         <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Project Activity</h1>
   15:         <p className="mt-3 text-xs leading-6 text-[#a77f58]">Recent project, task, note, link, and system changes across active workspaces.</p>
   16:       </header>
   17: 
   18:       <MachinePanel label="Cross-project trace" className="p-4">
   19:         <ActivityList activity={activity} />
```

### `app\projects\activity\page.tsx` line 15

```text
   10:   return (
   11:     <div className="space-y-5">
   12:       <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
   13:         <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Operational trace</div>
   14:         <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Project Activity</h1>
>  15:         <p className="mt-3 text-xs leading-6 text-[#a77f58]">Recent project, task, note, link, and system changes across active workspaces.</p>
   16:       </header>
   17: 
   18:       <MachinePanel label="Cross-project trace" className="p-4">
   19:         <ActivityList activity={activity} />
   20:       </MachinePanel>
```

### `app\projects\activity\page.tsx` line 18

```text
   13:         <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Operational trace</div>
   14:         <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Project Activity</h1>
   15:         <p className="mt-3 text-xs leading-6 text-[#a77f58]">Recent project, task, note, link, and system changes across active workspaces.</p>
   16:       </header>
   17: 
>  18:       <MachinePanel label="Cross-project trace" className="p-4">
   19:         <ActivityList activity={activity} />
   20:       </MachinePanel>
   21:     </div>
   22:   );
   23: }
```

### `app\projects\layout.tsx` line 7

```text
    2: import type { ReactNode } from "react";
    3: 
    4: import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
    5: 
    6: const links = [
>   7:   { href: "/projects", label: "Overview" },
    8:   { href: "/projects/notes", label: "Notes" },
    9:   { href: "/projects/activity", label: "Activity" },
   10:   { href: "/command", label: "Console" },
   11: ];
   12: 
```

### `app\projects\layout.tsx` line 8

```text
    3: 
    4: import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
    5: 
    6: const links = [
    7:   { href: "/projects", label: "Overview" },
>   8:   { href: "/projects/notes", label: "Notes" },
    9:   { href: "/projects/activity", label: "Activity" },
   10:   { href: "/command", label: "Console" },
   11: ];
   12: 
   13: export default function ProjectsLayout({ children }: { children: ReactNode }) {
```

### `app\projects\layout.tsx` line 9

```text
    4: import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
    5: 
    6: const links = [
    7:   { href: "/projects", label: "Overview" },
    8:   { href: "/projects/notes", label: "Notes" },
>   9:   { href: "/projects/activity", label: "Activity" },
   10:   { href: "/command", label: "Console" },
   11: ];
   12: 
   13: export default function ProjectsLayout({ children }: { children: ReactNode }) {
   14:   return (
```

### `app\projects\layout.tsx` line 13

```text
    8:   { href: "/projects/notes", label: "Notes" },
    9:   { href: "/projects/activity", label: "Activity" },
   10:   { href: "/command", label: "Console" },
   11: ];
   12: 
>  13: export default function ProjectsLayout({ children }: { children: ReactNode }) {
   14:   return (
   15:     <ChernobogShell currentArea="Project Operations">
   16:       <nav
   17:         aria-label="Project Operations"
   18:         className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 border-b border-[#5d3214]/65 bg-[#050302]/60 px-1"
```

### `app\projects\layout.tsx` line 15

```text
   10:   { href: "/command", label: "Console" },
   11: ];
   12: 
   13: export default function ProjectsLayout({ children }: { children: ReactNode }) {
   14:   return (
>  15:     <ChernobogShell currentArea="Project Operations">
   16:       <nav
   17:         aria-label="Project Operations"
   18:         className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 border-b border-[#5d3214]/65 bg-[#050302]/60 px-1"
   19:       >
   20:         <span className="mr-2 hidden text-[8px] font-semibold uppercase tracking-[0.28em] text-[#765237] sm:inline">
```

### `app\projects\layout.tsx` line 17

```text
   12: 
   13: export default function ProjectsLayout({ children }: { children: ReactNode }) {
   14:   return (
   15:     <ChernobogShell currentArea="Project Operations">
   16:       <nav
>  17:         aria-label="Project Operations"
   18:         className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 border-b border-[#5d3214]/65 bg-[#050302]/60 px-1"
   19:       >
   20:         <span className="mr-2 hidden text-[8px] font-semibold uppercase tracking-[0.28em] text-[#765237] sm:inline">
   21:           Project Ops
   22:         </span>
```

### `app\projects\layout.tsx` line 21

```text
   16:       <nav
   17:         aria-label="Project Operations"
   18:         className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 border-b border-[#5d3214]/65 bg-[#050302]/60 px-1"
   19:       >
   20:         <span className="mr-2 hidden text-[8px] font-semibold uppercase tracking-[0.28em] text-[#765237] sm:inline">
>  21:           Project Ops
   22:         </span>
   23:         {links.map((link) => (
   24:           <Link
   25:             key={link.href}
   26:             href={link.href}
```

### `app\projects\notes\page.tsx` line 3

```text
    1: import Link from "next/link";
    2: 
>   3: import { MachinePanel, SectionLabel, formatDateTime } from "@/components/project-operations/ui";
    4: import { getAllNotes, getPinnedNotes } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
    8: export default function ProjectNotesPage() {
```

### `app\projects\notes\page.tsx` line 4

```text
    1: import Link from "next/link";
    2: 
    3: import { MachinePanel, SectionLabel, formatDateTime } from "@/components/project-operations/ui";
>   4: import { getAllNotes, getPinnedNotes } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
    8: export default function ProjectNotesPage() {
    9:   const pinnedNotes = getPinnedNotes();
```

### `app\projects\notes\page.tsx` line 8

```text
    3: import { MachinePanel, SectionLabel, formatDateTime } from "@/components/project-operations/ui";
    4: import { getAllNotes, getPinnedNotes } from "@/lib/modules/project-operations";
    5: 
    6: export const dynamic = "force-dynamic";
    7: 
>   8: export default function ProjectNotesPage() {
    9:   const pinnedNotes = getPinnedNotes();
   10:   const notes = getAllNotes();
   11: 
   12:   return (
   13:     <div className="space-y-5">
```

### `app\projects\notes\page.tsx` line 15

```text
   10:   const notes = getAllNotes();
   11: 
   12:   return (
   13:     <div className="space-y-5">
   14:       <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
>  15:         <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Project memory</div>
   16:         <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Notes</h1>
   17:         <p className="mt-3 text-xs leading-6 text-[#a77f58]">Pinned decisions and operating context across every active project.</p>
   18:       </header>
   19: 
   20:       <section className="space-y-3">
```

### `app\projects\notes\page.tsx` line 17

```text
   12:   return (
   13:     <div className="space-y-5">
   14:       <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
   15:         <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Project memory</div>
   16:         <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Notes</h1>
>  17:         <p className="mt-3 text-xs leading-6 text-[#a77f58]">Pinned decisions and operating context across every active project.</p>
   18:       </header>
   19: 
   20:       <section className="space-y-3">
   21:         <SectionLabel overline="priority context" title="Pinned notes" />
   22:         <div className="grid gap-3 xl:grid-cols-3">
```

### `app\projects\notes\page.tsx` line 23

```text
   18:       </header>
   19: 
   20:       <section className="space-y-3">
   21:         <SectionLabel overline="priority context" title="Pinned notes" />
   22:         <div className="grid gap-3 xl:grid-cols-3">
>  23:           {pinnedNotes.map(({ project, note }) => (
   24:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   25:               <MachinePanel className="h-full border-[#d1ad48]/30 p-4 transition hover:border-[#e0c36f]/55">
   26:                 <div className="text-[8px] uppercase tracking-[0.22em] text-[#b59644]">{project.name}</div>
   27:                 <h2 className="mt-2 text-sm font-semibold text-[#efcf83]">{note.title}</h2>
   28:                 <p className="mt-3 text-xs leading-6 text-[#aa8759]">{note.content}</p>
```

### `app\projects\notes\page.tsx` line 24

```text
   19: 
   20:       <section className="space-y-3">
   21:         <SectionLabel overline="priority context" title="Pinned notes" />
   22:         <div className="grid gap-3 xl:grid-cols-3">
   23:           {pinnedNotes.map(({ project, note }) => (
>  24:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   25:               <MachinePanel className="h-full border-[#d1ad48]/30 p-4 transition hover:border-[#e0c36f]/55">
   26:                 <div className="text-[8px] uppercase tracking-[0.22em] text-[#b59644]">{project.name}</div>
   27:                 <h2 className="mt-2 text-sm font-semibold text-[#efcf83]">{note.title}</h2>
   28:                 <p className="mt-3 text-xs leading-6 text-[#aa8759]">{note.content}</p>
   29:                 <div className="mt-3 text-[9px] text-[#765237]">Updated {formatDateTime(note.updatedAt)}</div>
```

### `app\projects\notes\page.tsx` line 26

```text
   21:         <SectionLabel overline="priority context" title="Pinned notes" />
   22:         <div className="grid gap-3 xl:grid-cols-3">
   23:           {pinnedNotes.map(({ project, note }) => (
   24:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   25:               <MachinePanel className="h-full border-[#d1ad48]/30 p-4 transition hover:border-[#e0c36f]/55">
>  26:                 <div className="text-[8px] uppercase tracking-[0.22em] text-[#b59644]">{project.name}</div>
   27:                 <h2 className="mt-2 text-sm font-semibold text-[#efcf83]">{note.title}</h2>
   28:                 <p className="mt-3 text-xs leading-6 text-[#aa8759]">{note.content}</p>
   29:                 <div className="mt-3 text-[9px] text-[#765237]">Updated {formatDateTime(note.updatedAt)}</div>
   30:               </MachinePanel>
   31:             </Link>
```

### `app\projects\notes\page.tsx` line 39

```text
   34:       </section>
   35: 
   36:       <section className="space-y-3">
   37:         <SectionLabel overline="all context" title="Active notes" right={<span className="text-[9px] text-[#765237]">{notes.length} recorded</span>} />
   38:         <div className="grid gap-3 xl:grid-cols-3">
>  39:           {notes.map(({ project, note }) => (
   40:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   41:               <MachinePanel className="h-full p-4 transition hover:border-[#ff9d2e]/50">
   42:                 <div className="flex items-start justify-between gap-3">
   43:                   <div className="text-[8px] uppercase tracking-[0.22em] text-[#8f5b2a]">{project.name}</div>
   44:                   {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#d1ad48]">pinned</span> : null}
```

### `app\projects\notes\page.tsx` line 40

```text
   35: 
   36:       <section className="space-y-3">
   37:         <SectionLabel overline="all context" title="Active notes" right={<span className="text-[9px] text-[#765237]">{notes.length} recorded</span>} />
   38:         <div className="grid gap-3 xl:grid-cols-3">
   39:           {notes.map(({ project, note }) => (
>  40:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   41:               <MachinePanel className="h-full p-4 transition hover:border-[#ff9d2e]/50">
   42:                 <div className="flex items-start justify-between gap-3">
   43:                   <div className="text-[8px] uppercase tracking-[0.22em] text-[#8f5b2a]">{project.name}</div>
   44:                   {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#d1ad48]">pinned</span> : null}
   45:                 </div>
```

### `app\projects\notes\page.tsx` line 43

```text
   38:         <div className="grid gap-3 xl:grid-cols-3">
   39:           {notes.map(({ project, note }) => (
   40:             <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
   41:               <MachinePanel className="h-full p-4 transition hover:border-[#ff9d2e]/50">
   42:                 <div className="flex items-start justify-between gap-3">
>  43:                   <div className="text-[8px] uppercase tracking-[0.22em] text-[#8f5b2a]">{project.name}</div>
   44:                   {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#d1ad48]">pinned</span> : null}
   45:                 </div>
   46:                 <h2 className="mt-2 text-sm font-semibold text-[#e4b77f]">{note.title}</h2>
   47:                 <p className="mt-3 text-xs leading-6 text-[#98704c]">{note.content}</p>
   48:               </MachinePanel>
```

### `app\projects\page.tsx` line 3

```text
    1: import Link from "next/link";
    2: 
>   3: import { createProjectAction } from "./actions";
    4: import { ProjectCard } from "@/components/project-operations/ProjectCard";
    5: import {
    6:   MachinePanel,
    7:   SectionLabel,
    8:   StatusPill,
```

### `app\projects\page.tsx` line 4

```text
    1: import Link from "next/link";
    2: 
    3: import { createProjectAction } from "./actions";
>   4: import { ProjectCard } from "@/components/project-operations/ProjectCard";
    5: import {
    6:   MachinePanel,
    7:   SectionLabel,
    8:   StatusPill,
    9:   buttonClass,
```

### `app\projects\page.tsx` line 11

```text
    6:   MachinePanel,
    7:   SectionLabel,
    8:   StatusPill,
    9:   buttonClass,
   10:   inputClass,
>  11: } from "@/components/project-operations/ui";
   12: import {
   13:   getDashboardSnapshot,
   14:   getProjectStats,
   15: } from "@/lib/modules/project-operations";
   16: 
```

### `app\projects\page.tsx` line 14

```text
    9:   buttonClass,
   10:   inputClass,
   11: } from "@/components/project-operations/ui";
   12: import {
   13:   getDashboardSnapshot,
>  14:   getProjectStats,
   15: } from "@/lib/modules/project-operations";
   16: 
   17: export const dynamic = "force-dynamic";
   18: 
   19: function OperationsStat({
```

### `app\projects\page.tsx` line 15

```text
   10:   inputClass,
   11: } from "@/components/project-operations/ui";
   12: import {
   13:   getDashboardSnapshot,
   14:   getProjectStats,
>  15: } from "@/lib/modules/project-operations";
   16: 
   17: export const dynamic = "force-dynamic";
   18: 
   19: function OperationsStat({
   20:   label,
```

### `app\projects\page.tsx` line 44

```text
   39:       </div>
   40:     </div>
   41:   );
   42: }
   43: 
>  44: export default function ProjectsPage() {
   45:   const snapshot = getDashboardSnapshot();
   46:   const focusStats = snapshot.commandFocus
   47:     ? getProjectStats(snapshot.commandFocus)
   48:     : undefined;
   49:   const hasQueuedWork =
```

### `app\projects\page.tsx` line 47

```text
   42: }
   43: 
   44: export default function ProjectsPage() {
   45:   const snapshot = getDashboardSnapshot();
   46:   const focusStats = snapshot.commandFocus
>  47:     ? getProjectStats(snapshot.commandFocus)
   48:     : undefined;
   49:   const hasQueuedWork =
   50:     snapshot.doingTasks.length > 0 || snapshot.urgentTasks.length > 0;
   51: 
   52:   return (
```

### `app\projects\page.tsx` line 71

```text
   66:                 <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#8f6a45]">
   67:                   {snapshot.commandFocus.summary}
   68:                 </p>
   69:               </div>
   70:               <Link
>  71:                 href={`/projects/${snapshot.commandFocus.slug}`}
   72:                 className={buttonClass}
   73:               >
   74:                 Open workspace
   75:               </Link>
   76:             </div>
```

### `app\projects\page.tsx` line 99

```text
   94:               </div>
   95:             </div>
   96:           </div>
   97: 
   98:           <div className="grid grid-cols-5 divide-x divide-[#4f2b14]/55 border-t border-[#5d3214]/55 bg-black/20">
>  99:             <OperationsStat label="Projects" value={snapshot.projects.length} />
  100:             <OperationsStat label="Doing" value={snapshot.doingTasks.length} />
  101:             <OperationsStat label="Urgent" value={snapshot.urgentTasks.length} alert />
  102:             <OperationsStat label="Blocked" value={snapshot.blockedProjects.length} alert />
  103:             <OperationsStat label="Stale" value={snapshot.staleProjects.length} alert />
  104:           </div>
```

### `app\projects\page.tsx` line 102

```text
   97: 
   98:           <div className="grid grid-cols-5 divide-x divide-[#4f2b14]/55 border-t border-[#5d3214]/55 bg-black/20">
   99:             <OperationsStat label="Projects" value={snapshot.projects.length} />
  100:             <OperationsStat label="Doing" value={snapshot.doingTasks.length} />
  101:             <OperationsStat label="Urgent" value={snapshot.urgentTasks.length} alert />
> 102:             <OperationsStat label="Blocked" value={snapshot.blockedProjects.length} alert />
  103:             <OperationsStat label="Stale" value={snapshot.staleProjects.length} alert />
  104:           </div>
  105:         </MachinePanel>
  106:       ) : (
  107:         <MachinePanel className="p-4">
```

### `app\projects\page.tsx` line 103

```text
   98:           <div className="grid grid-cols-5 divide-x divide-[#4f2b14]/55 border-t border-[#5d3214]/55 bg-black/20">
   99:             <OperationsStat label="Projects" value={snapshot.projects.length} />
  100:             <OperationsStat label="Doing" value={snapshot.doingTasks.length} />
  101:             <OperationsStat label="Urgent" value={snapshot.urgentTasks.length} alert />
  102:             <OperationsStat label="Blocked" value={snapshot.blockedProjects.length} alert />
> 103:             <OperationsStat label="Stale" value={snapshot.staleProjects.length} alert />
  104:           </div>
  105:         </MachinePanel>
  106:       ) : (
  107:         <MachinePanel className="p-4">
  108:           <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">
```

### `app\projects\page.tsx` line 121

```text
  116: 
  117:       <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
  118:         <section className="space-y-2.5">
  119:           <SectionLabel
  120:             overline="Portfolio"
> 121:             title="Active projects"
  122:             right={
  123:               <span className="font-mono text-[9px] text-[#765237]">
  124:                 {snapshot.projects.length} workspaces
  125:               </span>
  126:             }
```

### `app\projects\page.tsx` line 124

```text
  119:           <SectionLabel
  120:             overline="Portfolio"
  121:             title="Active projects"
  122:             right={
  123:               <span className="font-mono text-[9px] text-[#765237]">
> 124:                 {snapshot.projects.length} workspaces
  125:               </span>
  126:             }
  127:           />
  128:           <div className="space-y-2.5">
  129:             {snapshot.projects.map((project) => (
```

### `app\projects\page.tsx` line 129

```text
  124:                 {snapshot.projects.length} workspaces
  125:               </span>
  126:             }
  127:           />
  128:           <div className="space-y-2.5">
> 129:             {snapshot.projects.map((project) => (
  130:               <ProjectCard key={project.id} project={project} />
  131:             ))}
  132:           </div>
  133:         </section>
  134: 
```

### `app\projects\page.tsx` line 130

```text
  125:               </span>
  126:             }
  127:           />
  128:           <div className="space-y-2.5">
  129:             {snapshot.projects.map((project) => (
> 130:               <ProjectCard key={project.id} project={project} />
  131:             ))}
  132:           </div>
  133:         </section>
  134: 
  135:         <MachinePanel label="Work queue">
```

### `app\projects\page.tsx` line 155

```text
  150:                 <div className="mb-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#8f5b2a]">
  151:                   <span>Doing now</span>
  152:                   <span>{snapshot.doingTasks.length}</span>
  153:                 </div>
  154:                 <div className="space-y-2">
> 155:                   {snapshot.doingTasks.slice(0, 4).map(({ project, board, card }) => (
  156:                     <Link
  157:                       key={card.id}
  158:                       href={`/projects/${project.slug}`}
  159:                       className="block border-l-2 border-[#c9782f]/65 bg-black/20 px-3 py-2 transition hover:bg-[#120904]"
  160:                     >
```

### `app\projects\page.tsx` line 158

```text
  153:                 </div>
  154:                 <div className="space-y-2">
  155:                   {snapshot.doingTasks.slice(0, 4).map(({ project, board, card }) => (
  156:                     <Link
  157:                       key={card.id}
> 158:                       href={`/projects/${project.slug}`}
  159:                       className="block border-l-2 border-[#c9782f]/65 bg-black/20 px-3 py-2 transition hover:bg-[#120904]"
  160:                     >
  161:                       <div className="text-[11px] font-semibold text-[#e4b77f]">
  162:                         {card.title}
  163:                       </div>
```

### `app\projects\page.tsx` line 165

```text
  160:                     >
  161:                       <div className="text-[11px] font-semibold text-[#e4b77f]">
  162:                         {card.title}
  163:                       </div>
  164:                       <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#765237]">
> 165:                         {project.name} Â· {board.name}
  166:                       </div>
  167:                     </Link>
  168:                   ))}
  169:                 </div>
  170:               </div>
```

### `app\projects\page.tsx` line 180

```text
  175:                 <div className="mb-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#a65f49]">
  176:                   <span>Urgent</span>
  177:                   <span>{snapshot.urgentTasks.length}</span>
  178:                 </div>
  179:                 <div className="space-y-2">
> 180:                   {snapshot.urgentTasks.slice(0, 4).map(({ project, card }) => (
  181:                     <Link
  182:                       key={card.id}
  183:                       href={`/projects/${project.slug}`}
  184:                       className="block border-l-2 border-[#ff4a3d]/55 bg-[#ff4a3d]/5 px-3 py-2 transition hover:bg-[#ff4a3d]/10"
  185:                     >
```

### `app\projects\page.tsx` line 183

```text
  178:                 </div>
  179:                 <div className="space-y-2">
  180:                   {snapshot.urgentTasks.slice(0, 4).map(({ project, card }) => (
  181:                     <Link
  182:                       key={card.id}
> 183:                       href={`/projects/${project.slug}`}
  184:                       className="block border-l-2 border-[#ff4a3d]/55 bg-[#ff4a3d]/5 px-3 py-2 transition hover:bg-[#ff4a3d]/10"
  185:                     >
  186:                       <div className="text-[11px] font-semibold text-[#efb3a7]">
  187:                         {card.title}
  188:                       </div>
```

### `app\projects\page.tsx` line 190

```text
  185:                     >
  186:                       <div className="text-[11px] font-semibold text-[#efb3a7]">
  187:                         {card.title}
  188:                       </div>
  189:                       <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#8d584c]">
> 190:                         {project.name}
  191:                       </div>
  192:                     </Link>
  193:                   ))}
  194:                 </div>
  195:               </div>
```

### `app\projects\page.tsx` line 203

```text
  198:         </MachinePanel>
  199:       </div>
  200: 
  201:       <details className="group border border-[#4f2b14]/65 bg-[#050302]/75">
  202:         <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b6039] transition hover:text-[#d99a54] [&::-webkit-details-marker]:hidden">
> 203:           <span>New project workspace</span>
  204:           <span className="font-mono text-[#765237] group-open:hidden">+</span>
  205:           <span className="hidden font-mono text-[#765237] group-open:inline">âˆ’</span>
  206:         </summary>
  207:         <form
  208:           action={createProjectAction}
```

### `app\projects\page.tsx` line 208

```text
  203:           <span>New project workspace</span>
  204:           <span className="font-mono text-[#765237] group-open:hidden">+</span>
  205:           <span className="hidden font-mono text-[#765237] group-open:inline">âˆ’</span>
  206:         </summary>
  207:         <form
> 208:           action={createProjectAction}
  209:           className="grid gap-2 border-t border-[#4f2b14]/55 p-3 lg:grid-cols-2"
  210:         >
  211:           <input className={inputClass} name="name" placeholder="Project name" required />
  212:           <input className={inputClass} name="repoName" placeholder="Repository name" required />
  213:           <input className={inputClass} name="summary" placeholder="What is this project for?" required />
```

### `app\projects\page.tsx` line 211

```text
  206:         </summary>
  207:         <form
  208:           action={createProjectAction}
  209:           className="grid gap-2 border-t border-[#4f2b14]/55 p-3 lg:grid-cols-2"
  210:         >
> 211:           <input className={inputClass} name="name" placeholder="Project name" required />
  212:           <input className={inputClass} name="repoName" placeholder="Repository name" required />
  213:           <input className={inputClass} name="summary" placeholder="What is this project for?" required />
  214:           <input className={inputClass} name="repoPath" placeholder="Local repo path (optional)" />
  215:           <button className={`${buttonClass} lg:col-span-2 lg:justify-self-end`} type="submit">
  216:             Create workspace
```

### `app\projects\page.tsx` line 213

```text
  208:           action={createProjectAction}
  209:           className="grid gap-2 border-t border-[#4f2b14]/55 p-3 lg:grid-cols-2"
  210:         >
  211:           <input className={inputClass} name="name" placeholder="Project name" required />
  212:           <input className={inputClass} name="repoName" placeholder="Repository name" required />
> 213:           <input className={inputClass} name="summary" placeholder="What is this project for?" required />
  214:           <input className={inputClass} name="repoPath" placeholder="Local repo path (optional)" />
  215:           <button className={`${buttonClass} lg:col-span-2 lg:justify-self-end`} type="submit">
  216:             Create workspace
  217:           </button>
  218:         </form>
```

### `components\chernobog\ChernobogDebugStatePanel.tsx` line 53

```text
   48:   const loadDebugState = useCallback(async () => {
   49:     try {
   50:       setLoading(true);
   51:       setError("");
   52: 
>  53:       const res = await fetch("/api/debug/state", {
   54:         method: "GET",
   55:         cache: "no-store",
   56:       });
   57: 
   58:       const raw = await res.text();
```

### `components\chernobog\RightDashboardRail.tsx` line 14

```text
    9: import type { DebugTrace, SessionSnapshot } from "../UmbraAIConsole";
   10: 
   11: type DashboardTab = "operation" | "memory" | "tools" | "trust" | "debug";
   12: 
   13: type RightDashboardRailProps = {
>  14:   sessionId: string | null;
   15:   session: SessionSnapshot;
   16:   debugTrace: DebugTrace | null;
   17:   debugVisible: boolean;
   18:   onToggleDebugVisible: () => void;
   19:   onSelectTrace: (trace: DebugTrace | null) => void;
```

### `components\chernobog\RightDashboardRail.tsx` line 97

```text
   92: 
   93:   return (
   94:     <div className="space-y-3">
   95:       <SectionShell title="Active Operation" eyebrow="execution layer">
   96:         <div className="space-y-1">
>  97:           <DataRow label="Session" value={session.sessionId} />
   98:           <DataRow label="Route" value={session.activeRoute} />
   99:           <DataRow label="Last Tool" value={session.lastTool} />
  100:           <DataRow label="Workflow" value={session.workflowKind} />
  101:           <DataRow label="Step" value={workflowStatus} />
  102:           <DataRow label="Candidates" value={session.workflowCandidateCount} />
```

### `components\chernobog\RightDashboardRail.tsx` line 133

```text
  128:       </SectionShell>
  129:     </div>
  130:   );
  131: }
  132: 
> 133: function MemoryTab({ sessionId }: { sessionId: string | null }) {
  134:   return (
  135:     <div className="space-y-3">
  136:       {sessionId ? (
  137:         <MemoryArchitecturePanel sessionId={sessionId} />
  138:       ) : (
```

### `components\chernobog\RightDashboardRail.tsx` line 136

```text
  131: }
  132: 
  133: function MemoryTab({ sessionId }: { sessionId: string | null }) {
  134:   return (
  135:     <div className="space-y-3">
> 136:       {sessionId ? (
  137:         <MemoryArchitecturePanel sessionId={sessionId} />
  138:       ) : (
  139:         <SectionShell title="Memory Engine" eyebrow="offline">
  140:           <p className="text-[10px] uppercase tracking-[0.12em] text-amber-100/45">
  141:             Waiting for session initialization.
```

### `components\chernobog\RightDashboardRail.tsx` line 137

```text
  132: 
  133: function MemoryTab({ sessionId }: { sessionId: string | null }) {
  134:   return (
  135:     <div className="space-y-3">
  136:       {sessionId ? (
> 137:         <MemoryArchitecturePanel sessionId={sessionId} />
  138:       ) : (
  139:         <SectionShell title="Memory Engine" eyebrow="offline">
  140:           <p className="text-[10px] uppercase tracking-[0.12em] text-amber-100/45">
  141:             Waiting for session initialization.
  142:           </p>
```

### `components\chernobog\RightDashboardRail.tsx` line 190

```text
  185:     </div>
  186:   );
  187: }
  188: 
  189: export default function RightDashboardRail({
> 190:   sessionId,
  191:   session,
  192:   debugTrace,
  193:   debugVisible,
  194:   onToggleDebugVisible,
  195:   onSelectTrace,
```

### `components\chernobog\RightDashboardRail.tsx` line 229

```text
  224: 
  225:       <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
  226:         {activeTab === "operation" ? <OperationTab session={session} /> : null}
  227: 
  228:         {activeTab === "memory" ? (
> 229:           <MemoryTab sessionId={sessionId} />
  230:         ) : null}
  231: 
  232:         {activeTab === "tools" ? <ToolsTab /> : null}
  233: 
  234:         {activeTab === "trust" ? (
```

### `components\chernobog\TrustTraceHistory.tsx` line 61

```text
   56:   const loadTraces = useCallback(async () => {
   57:     try {
   58:       setLoading(true);
   59:       setError("");
   60: 
>  61:       const response = await fetch("/api/debug/traces", {
   62:         method: "GET",
   63:         cache: "no-store",
   64:       });
   65: 
   66:       const raw = await response.text();
```

### `components\chernobog\TrustTraceHistory.tsx` line 86

```text
   81:   async function clearTraces() {
   82:     try {
   83:       setLoading(true);
   84:       setError("");
   85: 
>  86:       const response = await fetch("/api/debug/traces", {
   87:         method: "DELETE",
   88:       });
   89: 
   90:       if (!response.ok) {
   91:         const raw = await response.text();
```

### `components\chernobog\TrustTraceHistory.tsx` line 107

```text
  102: 
  103:   async function selectTrace(id: string) {
  104:     try {
  105:       setError("");
  106: 
> 107:       const response = await fetch(`/api/debug/traces?id=${encodeURIComponent(id)}`, {
  108:         method: "GET",
  109:         cache: "no-store",
  110:       });
  111: 
  112:       const raw = await response.text();
```

### `components\chernobog-ui\ChernobogContextPanel.pre-v6-2-classic-theme.tsx` line 2

```text
    1: const contextItems = [
>   2:   ["Active Project", "Chernobog"],
    3:   ["Vault Memory", "Available"],
    4:   ["Chernobog Inc", "Online"],
    5:   ["Open Reviews", "Placeholder"],
    6:   ["Current Task", "Command Center UI"],
    7: ];
```

### `components\chernobog-ui\ChernobogContextPanel.pre-v6-2-density-pass.tsx` line 2

```text
    1: const contextItems = [
>   2:   ["Active Project", "Chernobog"],
    3:   ["Vault Memory", "Available"],
    4:   ["Chernobog Inc", "Online"],
    5:   ["Open Reviews", "Placeholder"],
    6:   ["Current Task", "Classic Theme Restore"],
    7:   ["Trust Mode", "Read-only UI"],
```

### `components\chernobog-ui\ChernobogContextPanel.tsx` line 2

```text
    1: const contextItems = [
>   2:   ["Active Project", "Chernobog"],
    3:   ["Vault Memory", "Available"],
    4:   ["Chernobog Inc", "Online"],
    5:   ["Open Reviews", "Placeholder"],
    6:   ["Current Task", "Density Pass / Classic Theme Restore"],
    7:   ["Trust Mode", "Read-only UI"],
```

### `components\chernobog-ui\routes\RouteMatrixView.tsx` line 132

```text
  127:             System Map
  128:           </h1>
  129:         </div>
  130: 
  131:         <div className="grid gap-2 sm:grid-cols-4 xl:w-[620px]">
> 132:           <HeaderLink href="/command-center" label="Command Center" signal="HOME" />
  133:           <HeaderLink href="/command" label="Command Console" signal="LIVE" />
  134:           <HeaderLink href="/modules" label="Subsystems" signal="MAP" />
  135:           <HeaderLink href="/vault" label="Vault" signal="MEM" />
  136:         </div>
  137:       </div>
```

### `components\command\CommandShell.tsx` line 152

```text
  147:       <div className={`relative z-10 ${className}`}>{children}</div>
  148:     </div>
  149:   );
  150: }
  151: 
> 152: function ProjectionLine({ className = "" }: { className?: string }) {
  153:   return (
  154:     <div
  155:       className={`
  156:         pointer-events-none absolute h-px
  157:         bg-[linear-gradient(90deg,transparent,rgba(255,163,72,0.18),rgba(255,163,72,0.48),rgba(255,163,72,0.18),transparent)]
```

### `components\command\CommandShell.tsx` line 1021

```text
 1016:         <div className="absolute left-1/2 top-[22%] h-[54rem] w-[54rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.055)]" />
 1017:         <div className="absolute left-1/2 top-[24%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.04)]" />
 1018:         <div className="absolute left-1/2 top-[28%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.03)]" />
 1019:         <div className="absolute left-1/2 top-[28%] h-[34rem] w-[70rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,145,55,0.05)_0%,rgba(255,145,55,0.018)_22%,transparent_65%)]" />
 1020: 
>1021:         <ProjectionLine className="left-[8%] right-[8%] top-[13.2%]" />
 1022:         <ProjectionLine className="left-[14%] right-[14%] top-[45.6%]" />
 1023:         <ProjectionLine className="left-[12%] right-[12%] bottom-[13.4%]" />
 1024: 
 1025:         <div className="absolute left-[5%] top-[9%] h-[82%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.08),transparent)]" />
 1026:         <div className="absolute right-[5%] top-[9%] h-[82%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.08),transparent)]" />
```


## Project identity already present elsewhere

Pattern: `\bprojectId\b|\bactiveProject\b|\bprojectSlug\b|\bworkspaceSlug\b|currentProject`

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 23

```text
   19: };
   20: 
   21: type CharacterBriefRouteContext = {
   22:   params: Promise<{
>  23:     projectId: string;
   24:   }>;
   25: };
   26: 
   27: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 30

```text
   26: 
   27: async function readProjectId(
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
>  30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
   32: }
   33: 
   34: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 31

```text
   27: async function readProjectId(
   28:   context: CharacterBriefRouteContext
   29: ): Promise<string> {
   30:   const { projectId } = await context.params;
>  31:   return decodeURIComponent(projectId);
   32: }
   33: 
   34: function notFound(projectId: string) {
   35:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 34

```text
   30:   const { projectId } = await context.params;
   31:   return decodeURIComponent(projectId);
   32: }
   33: 
>  34: function notFound(projectId: string) {
   35:   return NextResponse.json(
   36:     {
   37:       ok: false,
   38:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 38

```text
   34: function notFound(projectId: string) {
   35:   return NextResponse.json(
   36:     {
   37:       ok: false,
>  38:       error: `Character Forge project not found: ${projectId}.`,
   39:     },
   40:     { status: 404, headers: NO_STORE_HEADERS }
   41:   );
   42: }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 81

```text
   77:   _request: Request,
   78:   context: CharacterBriefRouteContext
   79: ) {
   80:   try {
>  81:     const projectId = await readProjectId(context);
   82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 82

```text
   78:   context: CharacterBriefRouteContext
   79: ) {
   80:   try {
   81:     const projectId = await readProjectId(context);
>  82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 85

```text
   81:     const projectId = await readProjectId(context);
   82:     const result = await generateCharacterProjectBrief(projectId);
   83: 
   84:     if (!result) {
>  85:       return notFound(projectId);
   86:     }
   87: 
   88:     return NextResponse.json(
   89:       {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 114

```text
  110:   request: Request,
  111:   context: CharacterBriefRouteContext
  112: ) {
  113:   try {
> 114:     const projectId = await readProjectId(context);
  115:     const body = (await request.json()) as unknown;
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 117

```text
  113:   try {
  114:     const projectId = await readProjectId(context);
  115:     const body = (await request.json()) as unknown;
  116:     const brief = parseCharacterBriefUpdateRequest(body);
> 117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
  120:       return notFound(projectId);
  121:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 120

```text
  116:     const brief = parseCharacterBriefUpdateRequest(body);
  117:     const project = await saveCharacterProjectBrief(projectId, brief);
  118: 
  119:     if (!project) {
> 120:       return notFound(projectId);
  121:     }
  122: 
  123:     return NextResponse.json(
  124:       {
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 156

```text
  152:   request: Request,
  153:   context: CharacterBriefRouteContext
  154: ) {
  155:   try {
> 156:     const projectId = await readProjectId(context);
  157:     const body = (await request.json()) as unknown;
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 161

```text
  157:     const body = (await request.json()) as unknown;
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
> 161:         ? await approveCharacterProjectBrief(projectId, input.brief)
  162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
  165:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 162

```text
  158:     const input = parseCharacterBriefActionRequest(body);
  159:     const project =
  160:       input.action === "approve" && input.brief
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
> 162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
  165:       return notFound(projectId);
  166:     }
```

### `app\api\character-generator\projects\[projectId]\brief\route.ts` line 165

```text
  161:         ? await approveCharacterProjectBrief(projectId, input.brief)
  162:         : await reopenCharacterProjectBrief(projectId);
  163: 
  164:     if (!project) {
> 165:       return notFound(projectId);
  166:     }
  167: 
  168:     return NextResponse.json(
  169:       {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 25

```text
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
>  25:     const projectId = decodeURIComponent((await context.params).projectId);
   26:     const project = await readCharacterProject(projectId);
   27:     const pose = project?.canonicalPose ?? null;
   28:     const visible = Boolean(
   29:       project &&
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const projectId = decodeURIComponent((await context.params).projectId);
>  26:     const project = await readCharacterProject(projectId);
   27:     const pose = project?.canonicalPose ?? null;
   28:     const visible = Boolean(
   29:       project &&
   30:         [
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\image\route.ts` line 46

```text
   42:       return notFound();
   43:     }
   44: 
   45:     const bytes = await readCharacterCanonicalPoseImage({
>  46:       projectId,
   47:       imagePath: pose.imagePath,
   48:     });
   49: 
   50:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 23

```text
   19: 
   20: const HEADERS = { "Cache-Control": "no-store" };
   21: 
   22: type RouteContext = {
>  23:   params: Promise<{ projectId: string }>;
   24: };
   25: 
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 27

```text
   23:   params: Promise<{ projectId: string }>;
   24: };
   25: 
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
>  27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
   30: function notFound(projectId: string) {
   31:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 30

```text
   26: async function projectIdFrom(context: RouteContext): Promise<string> {
   27:   return decodeURIComponent((await context.params).projectId);
   28: }
   29: 
>  30: function notFound(projectId: string) {
   31:   return NextResponse.json(
   32:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   33:     { status: 404, headers: HEADERS },
   34:   );
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 32

```text
   28: }
   29: 
   30: function notFound(projectId: string) {
   31:   return NextResponse.json(
>  32:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   33:     { status: 404, headers: HEADERS },
   34:   );
   35: }
   36: 
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 78

```text
   74: }
   75: 
   76: export async function GET(_request: Request, context: RouteContext) {
   77:   try {
>  78:     const projectId = await projectIdFrom(context);
   79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
   82:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 79

```text
   75: 
   76: export async function GET(_request: Request, context: RouteContext) {
   77:   try {
   78:     const projectId = await projectIdFrom(context);
>  79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
   82:       return notFound(projectId);
   83:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 82

```text
   78:     const projectId = await projectIdFrom(context);
   79:     const project = await readCharacterProject(projectId);
   80: 
   81:     if (!project) {
>  82:       return notFound(projectId);
   83:     }
   84: 
   85:     const provider = await getCharacterCanonicalPoseProviderStatus();
   86:     return NextResponse.json({ ok: true, provider }, { headers: HEADERS });
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 94

```text
   90: }
   91: 
   92: export async function POST(request: Request, context: RouteContext) {
   93:   try {
>  94:     const projectId = await projectIdFrom(context);
   95:     parseCharacterCanonicalPoseGenerateRequest(
   96:       (await request.json()) as unknown,
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 98

```text
   94:     const projectId = await projectIdFrom(context);
   95:     parseCharacterCanonicalPoseGenerateRequest(
   96:       (await request.json()) as unknown,
   97:     );
>  98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
  101:       return notFound(projectId);
  102:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 101

```text
   97:     );
   98:     const project = await generateCharacterCanonicalPose(projectId);
   99: 
  100:     if (!project) {
> 101:       return notFound(projectId);
  102:     }
  103: 
  104:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  105:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 112

```text
  108: }
  109: 
  110: export async function PATCH(request: Request, context: RouteContext) {
  111:   try {
> 112:     const projectId = await projectIdFrom(context);
  113:     const input = parseCharacterCanonicalPoseActionRequest(
  114:       (await request.json()) as unknown,
  115:     );
  116:     const project =
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 118

```text
  114:       (await request.json()) as unknown,
  115:     );
  116:     const project =
  117:       input.action === "approve"
> 118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
  120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 120

```text
  116:     const project =
  117:       input.action === "approve"
  118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
> 120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
  124:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 121

```text
  117:       input.action === "approve"
  118:         ? await approveCharacterCanonicalPose(projectId)
  119:         : input.action === "reject"
  120:           ? await rejectCharacterCanonicalPose(projectId)
> 121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
  124:       return notFound(projectId);
  125:     }
```

### `app\api\character-generator\projects\[projectId]\canonical-pose\route.ts` line 124

```text
  120:           ? await rejectCharacterCanonicalPose(projectId)
  121:           : await resetInterruptedCharacterCanonicalPoseGeneration(projectId);
  122: 
  123:     if (!project) {
> 124:       return notFound(projectId);
  125:     }
  126: 
  127:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  128:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 14

```text
   10: export const dynamic = "force-dynamic";
   11: 
   12: type CharacterConceptImageRouteContext = {
   13:   params: Promise<{
>  14:     projectId: string;
   15:     conceptId: string;
   16:   }>;
   17: };
   18: 
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 35

```text
   31:   context: CharacterConceptImageRouteContext
   32: ) {
   33:   try {
   34:     const params = await context.params;
>  35:     const projectId = decodeURIComponent(params.projectId);
   36:     const conceptId = decodeURIComponent(params.conceptId);
   37:     const project = await readCharacterProject(projectId);
   38: 
   39:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 37

```text
   33:   try {
   34:     const params = await context.params;
   35:     const projectId = decodeURIComponent(params.projectId);
   36:     const conceptId = decodeURIComponent(params.conceptId);
>  37:     const project = await readCharacterProject(projectId);
   38: 
   39:     if (!project) {
   40:       return imageNotFound();
   41:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\[conceptId]\image\route.ts` line 52

```text
   48:       return imageNotFound();
   49:     }
   50: 
   51:     const bytes = await readCharacterConceptImage({
>  52:       projectId,
   53:       conceptId,
   54:       imagePath: concept.imagePath,
   55:     });
   56: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 26

```text
   22: };
   23: 
   24: type CharacterConceptRouteContext = {
   25:   params: Promise<{
>  26:     projectId: string;
   27:   }>;
   28: };
   29: 
   30: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 33

```text
   29: 
   30: async function readProjectId(
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
>  33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
   35: }
   36: 
   37: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 34

```text
   30: async function readProjectId(
   31:   context: CharacterConceptRouteContext
   32: ): Promise<string> {
   33:   const { projectId } = await context.params;
>  34:   return decodeURIComponent(projectId);
   35: }
   36: 
   37: function notFound(projectId: string) {
   38:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 37

```text
   33:   const { projectId } = await context.params;
   34:   return decodeURIComponent(projectId);
   35: }
   36: 
>  37: function notFound(projectId: string) {
   38:   return NextResponse.json(
   39:     {
   40:       ok: false,
   41:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 41

```text
   37: function notFound(projectId: string) {
   38:   return NextResponse.json(
   39:     {
   40:       ok: false,
>  41:       error: `Character Forge project not found: ${projectId}.`,
   42:     },
   43:     { status: 404, headers: NO_STORE_HEADERS }
   44:   );
   45: }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 94

```text
   90:   _request: Request,
   91:   context: CharacterConceptRouteContext
   92: ) {
   93:   try {
>  94:     const projectId = await readProjectId(context);
   95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
   98:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 95

```text
   91:   context: CharacterConceptRouteContext
   92: ) {
   93:   try {
   94:     const projectId = await readProjectId(context);
>  95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
   98:       return notFound(projectId);
   99:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 98

```text
   94:     const projectId = await readProjectId(context);
   95:     const project = await readCharacterProject(projectId);
   96: 
   97:     if (!project) {
>  98:       return notFound(projectId);
   99:     }
  100: 
  101:     const provider = await getCharacterConceptProviderStatus();
  102: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 124

```text
  120:   _request: Request,
  121:   context: CharacterConceptRouteContext
  122: ) {
  123:   try {
> 124:     const projectId = await readProjectId(context);
  125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
  128:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 125

```text
  121:   context: CharacterConceptRouteContext
  122: ) {
  123:   try {
  124:     const projectId = await readProjectId(context);
> 125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
  128:       return notFound(projectId);
  129:     }
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 128

```text
  124:     const projectId = await readProjectId(context);
  125:     const result = await generateCharacterProjectConcepts(projectId);
  126: 
  127:     if (!result) {
> 128:       return notFound(projectId);
  129:     }
  130: 
  131:     return NextResponse.json(
  132:       {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 161

```text
  157:   request: Request,
  158:   context: CharacterConceptRouteContext
  159: ) {
  160:   try {
> 161:     const projectId = await readProjectId(context);
  162:     const body = (await request.json()) as unknown;
  163:     const input = parseCharacterConceptActionRequest(body);
  164:     let project;
  165: 
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 169

```text
  165: 
  166:     switch (input.action) {
  167:       case "select":
  168:         project = await selectCharacterProjectConcept(
> 169:           projectId,
  170:           input.conceptId
  171:         );
  172:         break;
  173:       case "clear-selection":
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 174

```text
  170:           input.conceptId
  171:         );
  172:         break;
  173:       case "clear-selection":
> 174:         project = await clearCharacterProjectConceptSelection(projectId);
  175:         break;
  176:       case "approve":
  177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 177

```text
  173:       case "clear-selection":
  174:         project = await clearCharacterProjectConceptSelection(projectId);
  175:         break;
  176:       case "approve":
> 177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
  179:       case "reset-generation":
  180:         project = await resetInterruptedCharacterConceptGeneration(projectId);
  181:         break;
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 180

```text
  176:       case "approve":
  177:         project = await approveCharacterProjectDesign(projectId);
  178:         break;
  179:       case "reset-generation":
> 180:         project = await resetInterruptedCharacterConceptGeneration(projectId);
  181:         break;
  182:     }
  183: 
  184:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\concepts\route.ts` line 185

```text
  181:         break;
  182:     }
  183: 
  184:     if (!project) {
> 185:       return notFound(projectId);
  186:     }
  187: 
  188:     return NextResponse.json(
  189:       {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 25

```text
   21: }
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
>  25:     const projectId = decodeURIComponent((await context.params).projectId);
   26:     const project = await readCharacterProject(projectId);
   27:     const anchor = project?.identityAnchor ?? null;
   28: 
   29:     if (!project || !anchor || !anchor.imagePath) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const projectId = decodeURIComponent((await context.params).projectId);
>  26:     const project = await readCharacterProject(projectId);
   27:     const anchor = project?.identityAnchor ?? null;
   28: 
   29:     if (!project || !anchor || !anchor.imagePath) {
   30:       return notFound();
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\image\route.ts` line 34

```text
   30:       return notFound();
   31:     }
   32: 
   33:     const bytes = await readCharacterIdentityAnchorImage({
>  34:       projectId,
   35:       imagePath: anchor.imagePath,
   36:     });
   37: 
   38:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 26

```text
   22:   "image/webp",
   23: ]);
   24: 
   25: type RouteContext = {
>  26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 30

```text
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
>  30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 33

```text
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
>  33: function notFound(projectId: string) {
   34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS }
   37:   );
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 35

```text
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
>  35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS }
   37:   );
   38: }
   39: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 74

```text
   70: }
   71: 
   72: export async function POST(request: Request, context: RouteContext) {
   73:   try {
>  74:     const projectId = await projectIdFrom(context);
   75:     const formData = await request.formData();
   76:     const image = formData.get("image");
   77:     const metadataValue = formData.get("metadata");
   78: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 104

```text
  100:       );
  101:     }
  102: 
  103:     const metadata = parseCharacterIdentityAnchorMetadata(metadataValue);
> 104:     const project = await saveCharacterIdentityAnchor(projectId, {
  105:       bytes: new Uint8Array(await image.arrayBuffer()),
  106:       mimeType: image.type as "image/png" | "image/jpeg" | "image/webp",
  107:       width: metadata.width,
  108:       height: metadata.height,
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 113

```text
  109:       crop: metadata.crop,
  110:     });
  111: 
  112:     if (!project) {
> 113:       return notFound(projectId);
  114:     }
  115: 
  116:     return NextResponse.json(
  117:       { ok: true, project },
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 127

```text
  123: }
  124: 
  125: export async function PATCH(request: Request, context: RouteContext) {
  126:   try {
> 127:     const projectId = await projectIdFrom(context);
  128:     const input = parseCharacterIdentityAnchorActionRequest(
  129:       (await request.json()) as unknown
  130:     );
  131:     const project =
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 133

```text
  129:       (await request.json()) as unknown
  130:     );
  131:     const project =
  132:       input.action === "approve"
> 133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
  135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 135

```text
  131:     const project =
  132:       input.action === "approve"
  133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
> 135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
  139:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 136

```text
  132:       input.action === "approve"
  133:         ? await approveCharacterIdentityAnchor(projectId)
  134:         : input.action === "clear"
  135:           ? await clearCharacterIdentityAnchor(projectId)
> 136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
  139:       return notFound(projectId);
  140:     }
```

### `app\api\character-generator\projects\[projectId]\identity-anchor\route.ts` line 139

```text
  135:           ? await clearCharacterIdentityAnchor(projectId)
  136:           : await retireLegacyCharacterReferenceSet(projectId);
  137: 
  138:     if (!project) {
> 139:       return notFound(projectId);
  140:     }
  141: 
  142:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  143:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 22

```text
   18:   "exported",
   19: ]);
   20: 
   21: type RouteContext = {
>  22:   params: Promise<{ projectId: string }>;
   23: };
   24: 
   25: function notFound() {
   26:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 34

```text
   30: }
   31: 
   32: export async function GET(_request: Request, context: RouteContext) {
   33:   try {
>  34:     const projectId = decodeURIComponent((await context.params).projectId);
   35:     const project = await readCharacterProject(projectId);
   36:     const asset = project?.modelAsset ?? null;
   37: 
   38:     if (!project || !asset || !MODEL_VISIBLE_STATUSES.has(project.status)) {
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 35

```text
   31: 
   32: export async function GET(_request: Request, context: RouteContext) {
   33:   try {
   34:     const projectId = decodeURIComponent((await context.params).projectId);
>  35:     const project = await readCharacterProject(projectId);
   36:     const asset = project?.modelAsset ?? null;
   37: 
   38:     if (!project || !asset || !MODEL_VISIBLE_STATUSES.has(project.status)) {
   39:       return notFound();
```

### `app\api\character-generator\projects\[projectId]\model\file\route.ts` line 43

```text
   39:       return notFound();
   40:     }
   41: 
   42:     const bytes = await readCharacterModelGlb({
>  43:       projectId,
   44:       filePath: asset.filePath,
   45:     });
   46: 
   47:     if (!bytes) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 26

```text
   22: 
   23: const HEADERS = { "Cache-Control": "no-store" };
   24: 
   25: type RouteContext = {
>  26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 30

```text
   26:   params: Promise<{ projectId: string }>;
   27: };
   28: 
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
>  30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 33

```text
   29: async function projectIdFrom(context: RouteContext): Promise<string> {
   30:   return decodeURIComponent((await context.params).projectId);
   31: }
   32: 
>  33: function notFound(projectId: string) {
   34:   return NextResponse.json(
   35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS },
   37:   );
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 35

```text
   31: }
   32: 
   33: function notFound(projectId: string) {
   34:   return NextResponse.json(
>  35:     { ok: false, error: `Character Forge project not found: ${projectId}.` },
   36:     { status: 404, headers: HEADERS },
   37:   );
   38: }
   39: 
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 81

```text
   77: }
   78: 
   79: export async function GET(_request: Request, context: RouteContext) {
   80:   try {
>  81:     const projectId = await projectIdFrom(context);
   82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 82

```text
   78: 
   79: export async function GET(_request: Request, context: RouteContext) {
   80:   try {
   81:     const projectId = await projectIdFrom(context);
>  82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
   85:       return notFound(projectId);
   86:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 85

```text
   81:     const projectId = await projectIdFrom(context);
   82:     const result = await getCharacterModelReadiness(projectId);
   83: 
   84:     if (!result) {
>  85:       return notFound(projectId);
   86:     }
   87: 
   88:     return NextResponse.json(
   89:       { ok: true, project: result.project, provider: result.provider },
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 99

```text
   95: }
   96: 
   97: export async function POST(request: Request, context: RouteContext) {
   98:   try {
>  99:     const projectId = await projectIdFrom(context);
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 101

```text
   97: export async function POST(request: Request, context: RouteContext) {
   98:   try {
   99:     const projectId = await projectIdFrom(context);
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
> 101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
  104:       return notFound(projectId);
  105:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 104

```text
  100:     parseCharacterModelGenerateRequest((await request.json()) as unknown);
  101:     const project = await generateCharacterModel(projectId);
  102: 
  103:     if (!project) {
> 104:       return notFound(projectId);
  105:     }
  106: 
  107:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  108:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 115

```text
  111: }
  112: 
  113: export async function PATCH(request: Request, context: RouteContext) {
  114:   try {
> 115:     const projectId = await projectIdFrom(context);
  116:     const input = parseCharacterModelActionRequest(
  117:       (await request.json()) as unknown,
  118:     );
  119:     const project =
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 121

```text
  117:       (await request.json()) as unknown,
  118:     );
  119:     const project =
  120:       input.action === "approve"
> 121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
  123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 123

```text
  119:     const project =
  120:       input.action === "approve"
  121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
> 123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
  127:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 124

```text
  120:       input.action === "approve"
  121:         ? await approveCharacterModel(projectId)
  122:         : input.action === "reject"
  123:           ? await rejectCharacterModel(projectId)
> 124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
  127:       return notFound(projectId);
  128:     }
```

### `app\api\character-generator\projects\[projectId]\model\route.ts` line 127

```text
  123:           ? await rejectCharacterModel(projectId)
  124:           : await resetInterruptedCharacterModelGeneration(projectId);
  125: 
  126:     if (!project) {
> 127:       return notFound(projectId);
  128:     }
  129: 
  130:     return NextResponse.json({ ok: true, project }, { headers: HEADERS });
  131:   } catch (error) {
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 13

```text
    9: export const runtime = "nodejs";
   10: export const dynamic = "force-dynamic";
   11: 
   12: type RouteContext = {
>  13:   params: Promise<{ projectId: string; viewId: string }>;
   14: };
   15: 
   16: function notFound() {
   17:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 26

```text
   22: 
   23: export async function GET(_request: Request, context: RouteContext) {
   24:   try {
   25:     const params = await context.params;
>  26:     const projectId = decodeURIComponent(params.projectId);
   27:     const viewId = decodeURIComponent(params.viewId);
   28:     const project = await readCharacterProject(projectId);
   29:     const view = project?.referenceSheet?.views.find(
   30:       (candidate) => candidate.id === viewId
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 28

```text
   24:   try {
   25:     const params = await context.params;
   26:     const projectId = decodeURIComponent(params.projectId);
   27:     const viewId = decodeURIComponent(params.viewId);
>  28:     const project = await readCharacterProject(projectId);
   29:     const view = project?.referenceSheet?.views.find(
   30:       (candidate) => candidate.id === viewId
   31:     );
   32: 
```

### `app\api\character-generator\projects\[projectId]\reference-sheet\[viewId]\image\route.ts` line 38

```text
   34:       return notFound();
   35:     }
   36: 
   37:     const bytes = await readCharacterReferenceImage({
>  38:       projectId,
   39:       viewId,
   40:       imagePath: view.imagePath,
   41:     });
   42: 
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 20

```text
   16: };
   17: 
   18: type CharacterProjectRouteContext = {
   19:   params: Promise<{
>  20:     projectId: string;
   21:   }>;
   22: };
   23: 
   24: async function readProjectId(
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 27

```text
   23: 
   24: async function readProjectId(
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
>  27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
   29: }
   30: 
   31: function notFound(projectId: string) {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 28

```text
   24: async function readProjectId(
   25:   context: CharacterProjectRouteContext
   26: ): Promise<string> {
   27:   const { projectId } = await context.params;
>  28:   return decodeURIComponent(projectId);
   29: }
   30: 
   31: function notFound(projectId: string) {
   32:   return NextResponse.json(
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 31

```text
   27:   const { projectId } = await context.params;
   28:   return decodeURIComponent(projectId);
   29: }
   30: 
>  31: function notFound(projectId: string) {
   32:   return NextResponse.json(
   33:     {
   34:       ok: false,
   35:       error: `Character Forge project not found: ${projectId}.`,
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 35

```text
   31: function notFound(projectId: string) {
   32:   return NextResponse.json(
   33:     {
   34:       ok: false,
>  35:       error: `Character Forge project not found: ${projectId}.`,
   36:     },
   37:     { status: 404, headers: NO_STORE_HEADERS }
   38:   );
   39: }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 46

```text
   42:   _request: Request,
   43:   context: CharacterProjectRouteContext
   44: ) {
   45:   try {
>  46:     const projectId = await readProjectId(context);
   47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
   50:       return notFound(projectId);
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 47

```text
   43:   context: CharacterProjectRouteContext
   44: ) {
   45:   try {
   46:     const projectId = await readProjectId(context);
>  47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
   50:       return notFound(projectId);
   51:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 50

```text
   46:     const projectId = await readProjectId(context);
   47:     const project = await readCharacterProject(projectId);
   48: 
   49:     if (!project) {
>  50:       return notFound(projectId);
   51:     }
   52: 
   53:     return NextResponse.json(
   54:       {
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 88

```text
   84:   request: Request,
   85:   context: CharacterProjectRouteContext
   86: ) {
   87:   try {
>  88:     const projectId = await readProjectId(context);
   89:     const body = (await request.json()) as unknown;
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 91

```text
   87:   try {
   88:     const projectId = await readProjectId(context);
   89:     const body = (await request.json()) as unknown;
   90:     const input = parseUpdateCharacterProjectRequest(body);
>  91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
   94:       return notFound(projectId);
   95:     }
```

### `app\api\character-generator\projects\[projectId]\route.ts` line 94

```text
   90:     const input = parseUpdateCharacterProjectRequest(body);
   91:     const project = await updateCharacterProject(projectId, input);
   92: 
   93:     if (!project) {
>  94:       return notFound(projectId);
   95:     }
   96: 
   97:     return NextResponse.json(
   98:       {
```

### `app\api\chernobog-inc\execution\plans\route.ts` line 52

```text
   48:   return {
   49:     missionId,
   50:     title: getOptionalString(body, "title"),
   51:     objective: getOptionalString(body, "objective"),
>  52:     projectId: getOptionalString(body, "projectId"),
   53:     version: getOptionalString(body, "version"),
   54:     departments: getStringArray(body, "departments"),
   55:     createdBy: "ceo",
   56:   };
```

### `app\api\chernobog-inc\missions\route.ts` line 20

```text
   16:     const body = (await request.json()) as Partial<CreateChernobogMissionInput>;
   17:     const mission = await createChernobogMission({
   18:       title: body.title ?? "",
   19:       objective: body.objective ?? "",
>  20:       projectId: body.projectId,
   21:       version: body.version,
   22:       departments: body.departments,
   23:       priority: body.priority,
   24:       tags: body.tags,
```

### `app\api\chernobog-inc\personal-intelligence\route.ts` line 44

```text
   40:     }
   41: 
   42:     const packet = createV6OperatingPacket({
   43:       request,
>  44:       projectId: getOptionalString(body, "projectId"),
   45:       version: getOptionalString(body, "version"),
   46:       createdBy: "ceo",
   47:     });
   48: 
```

### `app\api\chernobog-inc\proposals\route.ts` line 50

```text
   46:     title,
   47:     description,
   48:     requestedBy: readString(body.requestedBy),
   49:     departmentIds: readStringArray(body.departmentIds) as ChernobogIncDepartmentId[] | undefined,
>  50:     projectId: readString(body.projectId),
   51:     version: readString(body.version),
   52:     tags: readStringArray(body.tags),
   53:   });
   54: 
```

### `app\api\governance\trust\evaluate\route.ts` line 15

```text
   11:     title: body.title ?? body.description ?? "Untitled trust action",
   12:     description: body.description,
   13:     actionType: body.actionType ? normalizeTrustActionType(body.actionType) : "read",
   14:     requestedTool: body.requestedTool,
>  15:     projectId: body.projectId,
   16:     version: body.version,
   17:     target: body.target,
   18:     risk: body.risk,
   19:     actor: body.actor ?? "api",
```

### `app\api\vault\answer\route.ts` line 83

```text
   79:   }
   80: 
   81:   return {
   82:     query,
>  83:     projectId: getOptionalString(body, "projectId"),
   84:     version: getOptionalString(body, "version"),
   85:     tags: getStringArray(body, "tags"),
   86:     memoryTypes: filterMemoryTypes(getStringArray(body, "memoryTypes")),
   87:     limit: getOptionalNumber(body, "limit"),
```

### `app\api\vault\answer\route.ts` line 101

```text
   97:     purpose:
   98:       "Answer from approved structured vault memory only. Raw, candidate, rejected, stale, superseded, and outside model memory are not treated as truth.",
   99:     example: {
  100:       query: "What is next for V5.6?",
> 101:       projectId: "chernobog",
  102:       version: "v5.6.6",
  103:       memoryTypes: ["project-state", "roadmap", "decision"],
  104:       limit: 8,
  105:     },
```

### `app\api\vault\briefing\route.ts` line 18

```text
   14:   try {
   15:     const body = (await request.json()) as Partial<CurrentStateBriefingRequest>;
   16:     const briefing = await generateCurrentStateBriefing({
   17:       query: typeof body.query === "string" ? body.query : undefined,
>  18:       projectId: typeof body.projectId === "string" ? body.projectId : undefined,
   19:       version: typeof body.version === "string" ? body.version : undefined,
   20:       limitPerSection: parseLimit(body.limitPerSection),
   21:       includeCodeSummaries: typeof body.includeCodeSummaries === "boolean" ? body.includeCodeSummaries : undefined,
   22:     });
```

### `app\api\vault\recall\route.ts` line 55

```text
   51:       : undefined;
   52: 
   53:   return {
   54:     query,
>  55:     projectId: getOptionalString(body, "projectId"),
   56:     version: getOptionalString(body, "version"),
   57:     answerMode: allowedAnswerMode,
   58:     limit: getOptionalNumber(body, "limit"),
   59:   };
```

### `app\api\vault\recall\route.ts` line 71

```text
   67:     purpose:
   68:       "Build a structured vault memory recall packet from approved/reviewed memory without promoting raw memory.",
   69:     example: {
   70:       query: "What is next for V5.6?",
>  71:       projectId: "chernobog",
   72:       version: "v5.6",
   73:       answerMode: "vault-only",
   74:       limit: 8,
   75:     },
```

### `app\api\youtube\playlist-ingest\route.ts` line 24

```text
   20: export async function POST(request: NextRequest) {
   21:   try {
   22:     const body = (await request.json()) as {
   23:       playlist?: unknown;
>  24:       projectId?: unknown;
   25:       tags?: unknown;
   26:     };
   27: 
   28:     if (typeof body.playlist !== "string" || !body.playlist.trim()) {
```

### `app\api\youtube\playlist-ingest\route.ts` line 39

```text
   35:         { status: 400 }
   36:       );
   37:     }
   38: 
>  39:     if (body.projectId !== undefined && typeof body.projectId !== "string") {
   40:       return NextResponse.json(
   41:         {
   42:           ok: false,
   43:           error: "projectId must be a string when provided.",
```

### `app\api\youtube\playlist-ingest\route.ts` line 43

```text
   39:     if (body.projectId !== undefined && typeof body.projectId !== "string") {
   40:       return NextResponse.json(
   41:         {
   42:           ok: false,
>  43:           error: "projectId must be a string when provided.",
   44:         },
   45:         { status: 400 }
   46:       );
   47:     }
```

### `app\api\youtube\playlist-ingest\route.ts` line 61

```text
   57:     }
   58: 
   59:     const result = await ingestYouTubePlaylist({
   60:       playlist: body.playlist,
>  61:       projectId: body.projectId,
   62:       tags: body.tags,
   63:     });
   64: 
   65:     return NextResponse.json(result);
```

### `app\modules\character-forge\[projectId]\page.tsx` line 37

```text
   33: ]);
   34: 
   35: type CharacterProjectPageProps = {
   36:   params: Promise<{
>  37:     projectId: string;
   38:   }>;
   39: };
   40: 
   41: export default async function CharacterProjectPage({
```

### `app\modules\character-forge\[projectId]\page.tsx` line 44

```text
   40: 
   41: export default async function CharacterProjectPage({
   42:   params,
   43: }: CharacterProjectPageProps) {
>  44:   const { projectId: encodedProjectId } = await params;
   45:   let projectId: string;
   46: 
   47:   try {
   48:     projectId = decodeURIComponent(encodedProjectId);
```

### `app\modules\character-forge\[projectId]\page.tsx` line 45

```text
   41: export default async function CharacterProjectPage({
   42:   params,
   43: }: CharacterProjectPageProps) {
   44:   const { projectId: encodedProjectId } = await params;
>  45:   let projectId: string;
   46: 
   47:   try {
   48:     projectId = decodeURIComponent(encodedProjectId);
   49:   } catch (error) {
```

### `app\modules\character-forge\[projectId]\page.tsx` line 48

```text
   44:   const { projectId: encodedProjectId } = await params;
   45:   let projectId: string;
   46: 
   47:   try {
>  48:     projectId = decodeURIComponent(encodedProjectId);
   49:   } catch (error) {
   50:     if (error instanceof URIError) {
   51:       notFound();
   52:     }
```

### `app\modules\character-forge\[projectId]\page.tsx` line 60

```text
   56: 
   57:   let project;
   58: 
   59:   try {
>  60:     project = await readCharacterProject(projectId);
   61:   } catch (error) {
   62:     if (error instanceof CharacterProjectValidationError) {
   63:       notFound();
   64:     }
```

### `app\modules\character-forge\[projectId]\page.tsx` line 262

```text
  258: 
  259:         <section className={styles.workspaceGrid}>
  260:           <CharacterProjectEditor
  261:             key={project.updatedAt}
> 262:             projectId={project.id}
  263:             initialName={project.name}
  264:             initialPrompt={project.originalPrompt}
  265:             status={project.status}
  266:           />
```

### `app\modules\character-forge\[projectId]\page.tsx` line 336

```text
  332:           </aside>
  333:         </section>
  334: 
  335:         <CharacterBriefWorkspace
> 336:           projectId={project.id}
  337:           projectName={project.name}
  338:           sourcePrompt={project.originalPrompt}
  339:           initialBrief={project.brief}
  340:           initialStatus={project.status}
```

### `app\modules\character-forge\[projectId]\page.tsx` line 344

```text
  340:           initialStatus={project.status}
  341:         />
  342: 
  343:         <CharacterConceptWorkspace
> 344:           projectId={project.id}
  345:           initialConcepts={project.concepts}
  346:           initialSelectedConceptId={project.selectedConceptId}
  347:           initialStatus={project.status}
  348:         />
```

### `app\modules\character-forge\[projectId]\page.tsx` line 351

```text
  347:           initialStatus={project.status}
  348:         />
  349: 
  350:         <CharacterIdentityAnchorWorkspace
> 351:           projectId={project.id}
  352:           initialStatus={project.status}
  353:           selectedConcept={selectedConcept}
  354:           initialIdentityAnchor={project.identityAnchor ?? null}
  355:         />
```

### `app\modules\character-forge\[projectId]\page.tsx` line 358

```text
  354:           initialIdentityAnchor={project.identityAnchor ?? null}
  355:         />
  356: 
  357:         <CharacterCanonicalPoseWorkspace
> 358:           projectId={project.id}
  359:           initialStatus={project.status}
  360:           initialIdentityAnchor={project.identityAnchor ?? null}
  361:           initialCanonicalPose={project.canonicalPose ?? null}
  362:         />
```

### `app\modules\character-forge\[projectId]\page.tsx` line 365

```text
  361:           initialCanonicalPose={project.canonicalPose ?? null}
  362:         />
  363: 
  364:         <CharacterModelWorkspace
> 365:           projectId={project.id}
  366:           projectName={project.name}
  367:           initialStatus={project.status}
  368:           initialCanonicalPose={project.canonicalPose ?? null}
  369:           initialModelAsset={project.modelAsset ?? null}
```

### `lib\chernobog\desktop\desktopEvents.ts` line 74

```text
   70:   }
   71: 
   72:   return [
   73:     workspace.id ?? "",
>  74:     workspace.projectId ?? "",
   75:     workspace.kind ?? "",
   76:   ].join(":");
   77: }
   78: 
```

### `lib\chernobog\desktop\desktopObservation.ts` line 38

```text
   34:   
   35:   export interface ChernobogDesktopWorkspaceState {
   36:     id?: string;
   37:   
>  38:     projectId?: string;
   39:   
   40:     kind?:
   41:       | "project"
   42:       | "folder"
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 29

```text
   25:   ];
   26: 
   27: export interface BuildUnifiedMemoryContextInput
   28:   extends BuildMemoryContextInput {
>  29:   projectId?: string;
   30:   retrievalLimit?: number;
   31:   sources?: UnifiedMemorySourceId[];
   32: }
   33: 
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 98

```text
   94: function formatRetrievedRecord(
   95:   record: UnifiedMemoryRecord,
   96: ): string {
   97:   const project =
>  98:     record.projectId
   99:       ? ` project=${record.projectId}`
  100:       : "";
  101: 
  102:   const confidence =
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 99

```text
   95:   record: UnifiedMemoryRecord,
   96: ): string {
   97:   const project =
   98:     record.projectId
>  99:       ? ` project=${record.projectId}`
  100:       : "";
  101: 
  102:   const confidence =
  103:     typeof record.confidence ===
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 169

```text
  165:     text:
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
> 169:     projectId:
  170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 170

```text
  166:       input.userMessage,
  167:     sessionId:
  168:       input.session.sessionId,
  169:     projectId:
> 170:       input.projectId,
  171:     limit:
  172:       retrievalLimit,
  173:     sources:
  174:       contextualSources,
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 180

```text
  176: 
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
> 180:     projectId:
  181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 181

```text
  177:   const learnedQuery = {
  178:     sessionId:
  179:       input.session.sessionId,
  180:     projectId:
> 181:       input.projectId,
  182:     limit:
  183:       Math.min(
  184:         6,
  185:         retrievalLimit,
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 235

```text
  231:         text:
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
> 235:         projectId:
  236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
```

### `lib\chernobog\memory-architecture\contextIntegration.ts` line 236

```text
  232:           input.userMessage,
  233:         sessionId:
  234:           input.session.sessionId,
  235:         projectId:
> 236:           input.projectId,
  237:         limit:
  238:           retrievalLimit,
  239:         sources:
  240:           [...requestedSources],
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 221

```text
  217:               "approved",
  218:             ],
  219:             text:
  220:               query.text,
> 221:             projectId:
  222:               query.projectId,
  223:             limit:
  224:               query.limit,
  225:           });
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 222

```text
  218:             ],
  219:             text:
  220:               query.text,
  221:             projectId:
> 222:               query.projectId,
  223:             limit:
  224:               query.limit,
  225:           });
  226: 
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 236

```text
  232:               "vault-structured-memory",
  233:             layer:
  234:               "long_term",
  235:             scope:
> 236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
  239:             projectId:
  240:               entry.projectId,
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 239

```text
  235:             scope:
  236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
> 239:             projectId:
  240:               entry.projectId,
  241:             content:
  242:               [
  243:                 entry.title,
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 240

```text
  236:               entry.projectId
  237:                 ? "project"
  238:                 : "system",
  239:             projectId:
> 240:               entry.projectId,
  241:             content:
  242:               [
  243:                 entry.title,
  244:                 entry.body,
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 278

```text
  274:         const store =
  275:           createProjectMemoryProfileStore();
  276: 
  277:         const selectedProfile =
> 278:           query.projectId
  279:             ? await store.getProfile(
  280:                 query.projectId,
  281:               )
  282:             : undefined;
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 280

```text
  276: 
  277:         const selectedProfile =
  278:           query.projectId
  279:             ? await store.getProfile(
> 280:                 query.projectId,
  281:               )
  282:             : undefined;
  283: 
  284:         const profiles =
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 285

```text
  281:               )
  282:             : undefined;
  283: 
  284:         const profiles =
> 285:           query.projectId
  286:             ? selectedProfile
  287:               ? [selectedProfile]
  288:               : []
  289:             : await store.listProfiles();
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 293

```text
  289:             : await store.listProfiles();
  290: 
  291:         const versions =
  292:           await store.listVersions({
> 293:             projectId:
  294:               query.projectId,
  295:           });
  296: 
  297:         return [
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 294

```text
  290: 
  291:         const versions =
  292:           await store.listVersions({
  293:             projectId:
> 294:               query.projectId,
  295:           });
  296: 
  297:         return [
  298:           ...profiles.map((profile) =>
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 301

```text
  297:         return [
  298:           ...profiles.map((profile) =>
  299:             cloneRecord({
  300:               id:
> 301:                 `project:${profile.projectId}`,
  302:               source:
  303:                 "project-memory-profile",
  304:               layer:
  305:                 "long_term",
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 308

```text
  304:               layer:
  305:                 "long_term",
  306:               scope:
  307:                 "project",
> 308:               projectId:
  309:                 profile.projectId,
  310:               key:
  311:                 profile.projectId,
  312:               content:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 309

```text
  305:                 "long_term",
  306:               scope:
  307:                 "project",
  308:               projectId:
> 309:                 profile.projectId,
  310:               key:
  311:                 profile.projectId,
  312:               content:
  313:                 JSON.stringify(
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 311

```text
  307:                 "project",
  308:               projectId:
  309:                 profile.projectId,
  310:               key:
> 311:                 profile.projectId,
  312:               content:
  313:                 JSON.stringify(
  314:                   profile,
  315:                 ),
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 340

```text
  336:               layer:
  337:                 "long_term",
  338:               scope:
  339:                 "project",
> 340:               projectId:
  341:                 version.projectId,
  342:               key:
  343:                 version.version,
  344:               content:
```

### `lib\chernobog\memory-architecture\readAdapters.ts` line 341

```text
  337:                 "long_term",
  338:               scope:
  339:                 "project",
  340:               projectId:
> 341:                 version.projectId,
  342:               key:
  343:                 version.version,
  344:               content:
  345:                 JSON.stringify(
```

### `lib\chernobog\memory-architecture\readRelevance.ts` line 49

```text
   45: 
   46:   const haystack = [
   47:     record.content,
   48:     record.key ?? "",
>  49:     record.projectId ?? "",
   50:     record.source,
   51:     record.layer,
   52:     record.scope,
   53:     JSON.stringify(record.metadata ?? {}),
```

### `lib\chernobog\memory-architecture\readTypes.ts` line 10

```text
    6: export interface UnifiedMemoryReadQuery {
    7:   text?: string;
    8:   sources?: UnifiedMemorySourceId[];
    9:   sessionId?: string;
>  10:   projectId?: string;
   11:   limit?: number;
   12: }
   13: 
   14: export interface UnifiedMemorySourceReadResult {
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 68

```text
   64:     return false;
   65:   }
   66: 
   67:   if (
>  68:     query.projectId &&
   69:     record.scope === "project" &&
   70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 70

```text
   66: 
   67:   if (
   68:     query.projectId &&
   69:     record.scope === "project" &&
>  70:     (!record.projectId || record.projectId !== query.projectId)
   71:   ) {
   72:     return false;
   73:   }
   74: 
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 84

```text
   80:     return false;
   81:   }
   82: 
   83:   if (
>  84:     query.projectId &&
   85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 85

```text
   81:   }
   82: 
   83:   if (
   84:     query.projectId &&
>  85:     record.projectId &&
   86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
```

### `lib\chernobog\memory-architecture\unifiedReader.ts` line 86

```text
   82: 
   83:   if (
   84:     query.projectId &&
   85:     record.projectId &&
>  86:     record.projectId !== query.projectId
   87:   ) {
   88:     return false;
   89:   }
   90: 
```

### `lib\chernobog\memory-architecture\unifiedTypes.ts` line 36

```text
   32:   scope: UnifiedMemoryScope;
   33:   content: string;
   34:   key?: string;
   35:   sessionId?: string;
>  36:   projectId?: string;
   37:   createdAt?: string;
   38:   updatedAt?: string;
   39:   confidence?: number;
   40:   metadata?: Record<string, unknown>;
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 145

```text
  141:       content.slice(0, 96),
  142:     body: content,
  143:     source:
  144:       request.sourceKind ?? "manual",
> 145:     projectId:
  146:       request.projectId,
  147:     version:
  148:       request.version,
  149:     tags:
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 146

```text
  142:     body: content,
  143:     source:
  144:       request.sourceKind ?? "manual",
  145:     projectId:
> 146:       request.projectId,
  147:     version:
  148:       request.version,
  149:     tags:
  150:       request.tags,
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 164

```text
  160:     id: entry.id,
  161:     metadata: {
  162:       vaultStatus: entry.status,
  163:       memoryType: entry.memoryType,
> 164:       projectId: entry.projectId,
  165:       reviewRequired: true,
  166:     },
  167:   };
  168: }
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 187

```text
  183: 
  184:     return {
  185:       source: request.source,
  186:       status: "written",
> 187:       id: `project:${profile.projectId}`,
  188:       metadata: {
  189:         kind: "project",
  190:         projectId: profile.projectId,
  191:         status: profile.status,
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 190

```text
  186:       status: "written",
  187:       id: `project:${profile.projectId}`,
  188:       metadata: {
  189:         kind: "project",
> 190:         projectId: profile.projectId,
  191:         status: profile.status,
  192:       },
  193:     };
  194:   }
```

### `lib\chernobog\memory-architecture\writeAdapters.ts` line 206

```text
  202:     status: "written",
  203:     id: `project-version:${version.id}`,
  204:     metadata: {
  205:       kind: "version",
> 206:       projectId: version.projectId,
  207:       version: version.version,
  208:       status: version.status,
  209:     },
  210:   };
```

### `lib\chernobog\memory-architecture\writeTypes.ts` line 57

```text
   53:   | {
   54:       source: "vault-structured-memory";
   55:       title?: string;
   56:       content: string;
>  57:       projectId?: string;
   58:       version?: string;
   59:       sourceKind?: VaultMemorySource;
   60:       tags?: string[];
   61:       confidence?: number;
```

### `lib\chernobog\worldModel\relationshipGrounding.ts` line 150

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

### `lib\chernobog\worldModel\relationshipGrounding.ts` line 159

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

### `lib\chernobog\worldModel\relationshipGrounding.ts` line 173

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

### `lib\chernobog\worldModel\relationshipGrounding.ts` line 210

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

### `lib\chernobog-ui\routeRegistry.ts` line 377

```text
  373:   },
  374:   {
  375:     id: "api-character-forge-project",
  376:     label: "Character Forge Project API",
> 377:     path: "/api/character-generator/projects/[projectId]",
  378:     kind: "api",
  379:     status: "active",
  380:     description: "Reads and safely updates one Character Forge project.",
  381:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 413

```text
  409:   },
  410:   {
  411:     id: "character-forge-project",
  412:     label: "Character Project Workspace",
> 413:     path: "/modules/character-forge/[projectId]",
  414:     kind: "module",
  415:     status: "experimental",
  416:     description: "Persistent workspace and pipeline status for one character.",
  417:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 418

```text
  414:     kind: "module",
  415:     status: "experimental",
  416:     description: "Persistent workspace and pipeline status for one character.",
  417:     moduleId: "character-generator",
> 418:     commands: ["show character project <projectId>"],
  419:     isPrimaryNavigation: false,
  420:     isUserFacing: true,
  421:   },
  422:   {
```

### `lib\chernobog-ui\routeRegistry.ts` line 425

```text
  421:   },
  422:   {
  423:     id: "api-character-forge-brief",
  424:     label: "Character Forge Brief API",
> 425:     path: "/api/character-generator/projects/[projectId]/brief",
  426:     kind: "api",
  427:     status: "active",
  428:     description:
  429:       "Generates, edits, approves, and reopens structured character briefs.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 438

```text
  434: 
  435:   {
  436:     id: "api-character-forge-concepts",
  437:     label: "Character Forge Concepts API",
> 438:     path: "/api/character-generator/projects/[projectId]/concepts",
  439:     kind: "api",
  440:     status: "active",
  441:     description:
  442:       "Generates concept candidates and controls design selection and approval.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 451

```text
  447:   {
  448:     id: "api-character-forge-concept-image",
  449:     label: "Character Forge Concept Image API",
  450:     path:
> 451:       "/api/character-generator/projects/[projectId]/concepts/[conceptId]/image",
  452:     kind: "api",
  453:     status: "active",
  454:     description: "Serves a persisted Character Forge concept image.",
  455:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 462

```text
  458:   },
  459:   {
  460:     id: "api-character-forge-reference-sheet",
  461:     label: "Character Forge Reference Sheet API",
> 462:     path: "/api/character-generator/projects/[projectId]/reference-sheet",
  463:     kind: "api",
  464:     status: "active",
  465:     description:
  466:       "Generates and manages the model-ready Character Forge turnaround set.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 475

```text
  471:   {
  472:     id: "api-character-forge-reference-image",
  473:     label: "Character Forge Reference Image API",
  474:     path:
> 475:       "/api/character-generator/projects/[projectId]/reference-sheet/[viewId]/image",
  476:     kind: "api",
  477:     status: "active",
  478:     description: "Serves a persisted Character Forge reference view.",
  479:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 486

```text
  482:   },
  483:   {
  484:     id: "api-character-forge-identity-anchor",
  485:     label: "Character Forge Identity Anchor API",
> 486:     path: "/api/character-generator/projects/[projectId]/identity-anchor",
  487:     kind: "api",
  488:     status: "active",
  489:     description:
  490:       "Stores, approves, clears, and migrates the local Character Forge identity anchor.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 498

```text
  494:   },
  495:   {
  496:     id: "api-character-forge-identity-anchor-image",
  497:     label: "Character Forge Identity Anchor Image API",
> 498:     path: "/api/character-generator/projects/[projectId]/identity-anchor/image",
  499:     kind: "api",
  500:     status: "active",
  501:     description: "Serves the persisted local identity anchor image.",
  502:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 509

```text
  505:   },
  506:   {
  507:     id: "api-character-forge-canonical-pose",
  508:     label: "Character Forge Canonical Pose API",
> 509:     path: "/api/character-generator/projects/[projectId]/canonical-pose",
  510:     kind: "api",
  511:     status: "active",
  512:     description:
  513:       "Inspects the local canonical-pose provider and manages its approval gate.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 521

```text
  517:   },
  518:   {
  519:     id: "api-character-forge-canonical-pose-image",
  520:     label: "Character Forge Canonical Pose Image API",
> 521:     path: "/api/character-generator/projects/[projectId]/canonical-pose/image",
  522:     kind: "api",
  523:     status: "active",
  524:     description: "Serves the approved local canonical A-pose image.",
  525:     moduleId: "character-generator",
```

### `lib\chernobog-ui\routeRegistry.ts` line 532

```text
  528:   },
  529:   {
  530:     id: "api-character-forge-model",
  531:     label: "Character Forge Model API",
> 532:     path: "/api/character-generator/projects/[projectId]/model",
  533:     kind: "api",
  534:     status: "active",
  535:     description:
  536:       "Inspects the isolated local image-to-3D backend and manages the model gate.",
```

### `lib\chernobog-ui\routeRegistry.ts` line 544

```text
  540:   },
  541:   {
  542:     id: "api-character-forge-model-file",
  543:     label: "Character Forge Model Artifact",
> 544:     path: "/api/character-generator/projects/[projectId]/model/file",
  545:     kind: "api",
  546:     status: "active",
  547:     description:
  548:       "Streams the validated local GLB for interactive review and download.",
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 19

```text
   15:   generation: Omit<CharacterBriefGenerationResult, "brief">;
   16: };
   17: 
   18: export async function generateCharacterProjectBrief(
>  19:   projectId: string
   20: ): Promise<GeneratedCharacterProjectBrief | null> {
   21:   const project = await readCharacterProject(projectId);
   22: 
   23:   if (!project) {
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 21

```text
   17: 
   18: export async function generateCharacterProjectBrief(
   19:   projectId: string
   20: ): Promise<GeneratedCharacterProjectBrief | null> {
>  21:   const project = await readCharacterProject(projectId);
   22: 
   23:   if (!project) {
   24:     return null;
   25:   }
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 51

```text
   47:   };
   48: }
   49: 
   50: export async function saveCharacterProjectBrief(
>  51:   projectId: string,
   52:   brief: CharacterBrief
   53: ) {
   54:   const project = await readCharacterProject(projectId);
   55: 
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 54

```text
   50: export async function saveCharacterProjectBrief(
   51:   projectId: string,
   52:   brief: CharacterBrief
   53: ) {
>  54:   const project = await readCharacterProject(projectId);
   55: 
   56:   if (!project) {
   57:     return null;
   58:   }
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 73

```text
   69:   });
   70: }
   71: 
   72: export async function approveCharacterProjectBrief(
>  73:   projectId: string,
   74:   brief: CharacterBrief
   75: ) {
   76:   const project = await readCharacterProject(projectId);
   77: 
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 76

```text
   72: export async function approveCharacterProjectBrief(
   73:   projectId: string,
   74:   brief: CharacterBrief
   75: ) {
>  76:   const project = await readCharacterProject(projectId);
   77: 
   78:   if (!project) {
   79:     return null;
   80:   }
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 95

```text
   91:     status: "brief_ready",
   92:   });
   93: }
   94: 
>  95: export async function reopenCharacterProjectBrief(projectId: string) {
   96:   const project = await readCharacterProject(projectId);
   97: 
   98:   if (!project) {
   99:     return null;
```

### `lib\modules\character-generator\brief\characterBriefService.ts` line 96

```text
   92:   });
   93: }
   94: 
   95: export async function reopenCharacterProjectBrief(projectId: string) {
>  96:   const project = await readCharacterProject(projectId);
   97: 
   98:   if (!project) {
   99:     return null;
  100:   }
```

### `lib\modules\character-generator\commands\executeCharacterGeneratorCommand.ts` line 65

```text
   61:         `Workspace: /modules/character-forge/${project.id}`,
   62:         "Next stage: generate and approve an editable character brief.",
   63:       ].join("\n"),
   64:       data: {
>  65:         projectId: project.id,
   66:         projectStatus: project.status,
   67:         project,
   68:       },
   69:     };
```

### `lib\modules\character-generator\commands\executeCharacterGeneratorCommand.ts` line 93

```text
   89:       },
   90:     };
   91:   }
   92: 
>  93:   const project = await readCharacterProject(command.projectId);
   94: 
   95:   if (!project) {
   96:     return {
   97:       ok: false,
```


## World State and World Model project context


## 11G World State project fields

Pattern: `projectId|project|scope|entity|observation|source`

### `lib\chernobog\worldState\assessment.ts` line 44

```text
   40:       record.provenance,
   41:     ),
   42:     eventId: record.provenance?.eventId,
   43:     eventType: record.provenance?.eventType,
>  44:     projectorId: record.provenance?.projectorId,
   45:     sourceSubsystem: record.provenance?.source?.subsystem,
   46:   };
   47: }
```

### `lib\chernobog\worldState\assessment.ts` line 45

```text
   41:     ),
   42:     eventId: record.provenance?.eventId,
   43:     eventType: record.provenance?.eventType,
   44:     projectorId: record.provenance?.projectorId,
>  45:     sourceSubsystem: record.provenance?.source?.subsystem,
   46:   };
   47: }
```

### `lib\chernobog\worldState\domainProjectors.ts` line 6

```text
    2: import type {
    3:   WorldStateJsonValue,
    4: } from "./types";
    5: import type {
>   6:   WorldStateProjection,
    7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 7

```text
    3:   WorldStateJsonValue,
    4: } from "./types";
    5: import type {
    6:   WorldStateProjection,
>   7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
   11: } from "./projectionEngine";
```

### `lib\chernobog\worldState\domainProjectors.ts` line 8

```text
    4: } from "./types";
    5: import type {
    6:   WorldStateProjection,
    7:   WorldStateProjector,
>   8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
   11: } from "./projectionEngine";
   12: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 10

```text
    6:   WorldStateProjection,
    7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
>  10:   ChernobogWorldStateProjectionEngine,
   11: } from "./projectionEngine";
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 11

```text
    7:   WorldStateProjector,
    8: } from "./projectorTypes";
    9: import type {
   10:   ChernobogWorldStateProjectionEngine,
>  11: } from "./projectionEngine";
   12: 
   13: const GENERIC_FACT_DOMAINS = new Set([
   14:   "desktop",
   15:   "backup",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 144

```text
  140:     return typeDomain;
  141:   }
  142: 
  143:   const subsystem =
> 144:     event.source.subsystem.toLowerCase();
  145: 
  146:   for (
  147:     const domain
  148:     of GENERIC_FACT_DOMAINS
```

### `lib\chernobog\worldState\domainProjectors.ts` line 160

```text
  156: 
  157:   return undefined;
  158: }
  159: 
> 160: function commonObservation(
  161:   event: ChernobogEvent,
  162: ): WorldStateJsonValue {
  163:   return {
  164:     eventType:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 170

```text
  166:     severity:
  167:       event.severity,
  168:     subject:
  169:       event.subject ?? null,
> 170:     scope:
  171:       event.scope ?? null,
  172:     payload:
  173:       jsonSafe(event.payload),
  174:   };
```

### `lib\chernobog\worldState\domainProjectors.ts` line 171

```text
  167:       event.severity,
  168:     subject:
  169:       event.subject ?? null,
  170:     scope:
> 171:       event.scope ?? null,
  172:     payload:
  173:       jsonSafe(event.payload),
  174:   };
  175: }
```

### `lib\chernobog\worldState\domainProjectors.ts` line 193

```text
  189:       return undefined;
  190:   }
  191: }
  192: 
> 193: function runtimeObservationProjector():
  194:   WorldStateProjector {
  195:   return {
  196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 194

```text
  190:   }
  191: }
  192: 
  193: function runtimeObservationProjector():
> 194:   WorldStateProjector {
  195:   return {
  196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
  198:       "runtime.health_observed",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 196

```text
  192: 
  193: function runtimeObservationProjector():
  194:   WorldStateProjector {
  195:   return {
> 196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
  198:       "runtime.health_observed",
  199:     ],
  200:     project(event) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 200

```text
  196:     id: "domain-runtime-health-observation",
  197:     eventTypes: [
  198:       "runtime.health_observed",
  199:     ],
> 200:     project(event) {
  201:       const payload =
  202:         objectPayload(event);
  203: 
  204:       const kind =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 242

```text
  238:         base =
  239:           `model.${id}`;
  240:       }
  241: 
> 242:       const projections:
  243:         WorldStateProjection[] = [
  244:           {
  245:             key:
  246:               `${base}.observation`,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 243

```text
  239:           `model.${id}`;
  240:       }
  241: 
  242:       const projections:
> 243:         WorldStateProjection[] = [
  244:           {
  245:             key:
  246:               `${base}.observation`,
  247:             value:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 246

```text
  242:       const projections:
  243:         WorldStateProjection[] = [
  244:           {
  245:             key:
> 246:               `${base}.observation`,
  247:             value:
  248:               jsonSafe(event.payload),
  249:             observedAt,
  250:             ttlMs:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 256

```text
  252:           },
  253:         ];
  254: 
  255:       if (status) {
> 256:         projections.push({
  257:           key:
  258:             `${base}.health`,
  259:           value:
  260:             status,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 267

```text
  263:             300_000,
  264:         });
  265:       }
  266: 
> 267:       return projections;
  268:     },
  269:   };
  270: }
  271: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 272

```text
  268:     },
  269:   };
  270: }
  271: 
> 272: function serviceHealthProjector():
  273:   WorldStateProjector {
  274:   return {
  275:     id: "domain-service-health",
  276:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 273

```text
  269:   };
  270: }
  271: 
  272: function serviceHealthProjector():
> 273:   WorldStateProjector {
  274:   return {
  275:     id: "domain-service-health",
  276:     eventTypes: [
  277:       "service.healthy",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 282

```text
  278:       "service.degraded",
  279:       "service.failed",
  280:       "service.recovered",
  281:     ],
> 282:     project(event) {
  283:       const status =
  284:         statusFromServiceEvent(
  285:           event.type,
  286:         );
```

### `lib\chernobog\worldState\domainProjectors.ts` line 306

```text
  302:             300_000,
  303:         },
  304:         {
  305:           key:
> 306:             `service.${service}.observation`,
  307:           value:
  308:             jsonSafe(event.payload),
  309:           ttlMs:
  310:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 317

```text
  313:     },
  314:   };
  315: }
  316: 
> 317: function runtimeNodeProjector():
  318:   WorldStateProjector {
  319:   return {
  320:     id: "domain-runtime-node-availability",
  321:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 318

```text
  314:   };
  315: }
  316: 
  317: function runtimeNodeProjector():
> 318:   WorldStateProjector {
  319:   return {
  320:     id: "domain-runtime-node-availability",
  321:     eventTypes: [
  322:       "runtime.node_online",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 325

```text
  321:     eventTypes: [
  322:       "runtime.node_online",
  323:       "runtime.node_offline",
  324:     ],
> 325:     project(event) {
  326:       const node =
  327:         subjectSegment(event);
  328: 
  329:       return [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 341

```text
  337:             300_000,
  338:         },
  339:         {
  340:           key:
> 341:             `runtime.node.${node}.observation`,
  342:           value:
  343:             jsonSafe(event.payload),
  344:           ttlMs:
  345:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 352

```text
  348:     },
  349:   };
  350: }
  351: 
> 352: function modelProviderProjector():
  353:   WorldStateProjector {
  354:   return {
  355:     id: "domain-model-provider-availability",
  356:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 353

```text
  349:   };
  350: }
  351: 
  352: function modelProviderProjector():
> 353:   WorldStateProjector {
  354:   return {
  355:     id: "domain-model-provider-availability",
  356:     eventTypes: [
  357:       "runtime.model_available",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 360

```text
  356:     eventTypes: [
  357:       "runtime.model_available",
  358:       "runtime.model_unavailable",
  359:     ],
> 360:     project(event) {
  361:       const model =
  362:         subjectSegment(event);
  363: 
  364:       return [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 376

```text
  372:             300_000,
  373:         },
  374:         {
  375:           key:
> 376:             `model.${model}.observation`,
  377:           value:
  378:             jsonSafe(event.payload),
  379:           ttlMs:
  380:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 387

```text
  383:     },
  384:   };
  385: }
  386: 
> 387: function modelRoleProjector():
  388:   WorldStateProjector {
  389:   return {
  390:     id: "domain-model-role-assignment",
  391:     eventTypePrefixes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 388

```text
  384:   };
  385: }
  386: 
  387: function modelRoleProjector():
> 388:   WorldStateProjector {
  389:   return {
  390:     id: "domain-model-role-assignment",
  391:     eventTypePrefixes: [
  392:       "runtime.model",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 394

```text
  390:     id: "domain-model-role-assignment",
  391:     eventTypePrefixes: [
  392:       "runtime.model",
  393:     ],
> 394:     project(event) {
  395:       const payload =
  396:         objectPayload(event);
  397: 
  398:       if (
```

### `lib\chernobog\worldState\domainProjectors.ts` line 410

```text
  406:         canonicalSegment(
  407:           payload.role,
  408:         );
  409: 
> 410:       const projections:
  411:         WorldStateProjection[] = [
  412:           {
  413:             key:
  414:               `model.role.${role}.assignment`,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 411

```text
  407:           payload.role,
  408:         );
  409: 
  410:       const projections:
> 411:         WorldStateProjection[] = [
  412:           {
  413:             key:
  414:               `model.role.${role}.assignment`,
  415:             value:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 426

```text
  422:       if (
  423:         typeof payload.available ===
  424:         "boolean"
  425:       ) {
> 426:         projections.push({
  427:           key:
  428:             `model.role.${role}.available`,
  429:           value:
  430:             payload.available,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 436

```text
  432:             300_000,
  433:         });
  434:       }
  435: 
> 436:       return projections;
  437:     },
  438:   };
  439: }
  440: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 441

```text
  437:     },
  438:   };
  439: }
  440: 
> 441: function projectGitProjector():
  442:   WorldStateProjector {
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 442

```text
  438:   };
  439: }
  440: 
  441: function projectGitProjector():
> 442:   WorldStateProjector {
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 444

```text
  440: 
  441: function projectGitProjector():
  442:   WorldStateProjector {
  443:   return {
> 444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
  447:       "project.git_observed",
  448:       "project.git_dirty",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 446

```text
  442:   WorldStateProjector {
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
> 446:       "project.git_unavailable",
  447:       "project.git_observed",
  448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
```

### `lib\chernobog\worldState\domainProjectors.ts` line 447

```text
  443:   return {
  444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
> 447:       "project.git_observed",
  448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
  451:     project(event) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 448

```text
  444:     id: "domain-project-git",
  445:     eventTypes: [
  446:       "project.git_unavailable",
  447:       "project.git_observed",
> 448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
  451:     project(event) {
  452:       if (
```

### `lib\chernobog\worldState\domainProjectors.ts` line 449

```text
  445:     eventTypes: [
  446:       "project.git_unavailable",
  447:       "project.git_observed",
  448:       "project.git_dirty",
> 449:       "project.git_clean",
  450:     ],
  451:     project(event) {
  452:       if (
  453:         event.type ===
```

### `lib\chernobog\worldState\domainProjectors.ts` line 451

```text
  447:       "project.git_observed",
  448:       "project.git_dirty",
  449:       "project.git_clean",
  450:     ],
> 451:     project(event) {
  452:       if (
  453:         event.type ===
  454:         "project.git_unavailable"
  455:       ) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 454

```text
  450:     ],
  451:     project(event) {
  452:       if (
  453:         event.type ===
> 454:         "project.git_unavailable"
  455:       ) {
  456:         return {
  457:           key:
  458:             "project.git.available",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 458

```text
  454:         "project.git_unavailable"
  455:       ) {
  456:         return {
  457:           key:
> 458:             "project.git.available",
  459:           value:
  460:             false,
  461:           ttlMs:
  462:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 466

```text
  462:             300_000,
  463:         };
  464:       }
  465: 
> 466:       const project =
  467:         subjectSegment(event);
  468: 
  469:       const payload =
  470:         objectPayload(event);
```

### `lib\chernobog\worldState\domainProjectors.ts` line 472

```text
  468: 
  469:       const payload =
  470:         objectPayload(event);
  471: 
> 472:       const projections:
  473:         WorldStateProjection[] = [
  474:           {
  475:             key:
  476:               `project.${project}.git.snapshot`,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 473

```text
  469:       const payload =
  470:         objectPayload(event);
  471: 
  472:       const projections:
> 473:         WorldStateProjection[] = [
  474:           {
  475:             key:
  476:               `project.${project}.git.snapshot`,
  477:             value:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 476

```text
  472:       const projections:
  473:         WorldStateProjection[] = [
  474:           {
  475:             key:
> 476:               `project.${project}.git.snapshot`,
  477:             value:
  478:               jsonSafe(event.payload),
  479:             ttlMs:
  480:               300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 484

```text
  480:               300_000,
  481:           },
  482:           {
  483:             key:
> 484:               `project.${project}.git.available`,
  485:             value:
  486:               true,
  487:             ttlMs:
  488:               300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 503

```text
  499:         dirty =
  500:           payload.dirty;
  501:       } else if (
  502:         event.type ===
> 503:         "project.git_dirty"
  504:       ) {
  505:         dirty = true;
  506:       } else if (
  507:         event.type ===
```

### `lib\chernobog\worldState\domainProjectors.ts` line 508

```text
  504:       ) {
  505:         dirty = true;
  506:       } else if (
  507:         event.type ===
> 508:         "project.git_clean"
  509:       ) {
  510:         dirty = false;
  511:       }
  512: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 516

```text
  512: 
  513:       if (
  514:         dirty !== undefined
  515:       ) {
> 516:         projections.push({
  517:           key:
  518:             `project.${project}.git.dirty`,
  519:           value:
  520:             dirty,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 518

```text
  514:         dirty !== undefined
  515:       ) {
  516:         projections.push({
  517:           key:
> 518:             `project.${project}.git.dirty`,
  519:           value:
  520:             dirty,
  521:           ttlMs:
  522:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 531

```text
  527:         typeof payload.branch ===
  528:         "string" &&
  529:         payload.branch.trim()
  530:       ) {
> 531:         projections.push({
  532:           key:
  533:             `project.${project}.git.branch`,
  534:           value:
  535:             payload.branch,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 533

```text
  529:         payload.branch.trim()
  530:       ) {
  531:         projections.push({
  532:           key:
> 533:             `project.${project}.git.branch`,
  534:           value:
  535:             payload.branch,
  536:           ttlMs:
  537:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 546

```text
  542:         typeof payload.head ===
  543:         "string" &&
  544:         payload.head.trim()
  545:       ) {
> 546:         projections.push({
  547:           key:
  548:             `project.${project}.git.head`,
  549:           value:
  550:             payload.head,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 548

```text
  544:         payload.head.trim()
  545:       ) {
  546:         projections.push({
  547:           key:
> 548:             `project.${project}.git.head`,
  549:           value:
  550:             payload.head,
  551:           ttlMs:
  552:             300_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 556

```text
  552:             300_000,
  553:         });
  554:       }
  555: 
> 556:       return projections;
  557:     },
  558:   };
  559: }
  560: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 561

```text
  557:     },
  558:   };
  559: }
  560: 
> 561: function projectValidationProjector():
  562:   WorldStateProjector {
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 562

```text
  558:   };
  559: }
  560: 
  561: function projectValidationProjector():
> 562:   WorldStateProjector {
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 564

```text
  560: 
  561: function projectValidationProjector():
  562:   WorldStateProjector {
  563:   return {
> 564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
  567:       "project.validation_completed",
  568:       "project.validation_failed",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 566

```text
  562:   WorldStateProjector {
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
> 566:       "project.validation_started",
  567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
  570:     project(event) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 567

```text
  563:   return {
  564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
> 567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
  570:     project(event) {
  571:       const validation =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 568

```text
  564:     id: "domain-project-validation",
  565:     eventTypes: [
  566:       "project.validation_started",
  567:       "project.validation_completed",
> 568:       "project.validation_failed",
  569:     ],
  570:     project(event) {
  571:       const validation =
  572:         subjectSegment(event);
```

### `lib\chernobog\worldState\domainProjectors.ts` line 570

```text
  566:       "project.validation_started",
  567:       "project.validation_completed",
  568:       "project.validation_failed",
  569:     ],
> 570:     project(event) {
  571:       const validation =
  572:         subjectSegment(event);
  573: 
  574:       const status =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 576

```text
  572:         subjectSegment(event);
  573: 
  574:       const status =
  575:         event.type ===
> 576:         "project.validation_started"
  577:           ? "running"
  578:           : event.type ===
  579:             "project.validation_completed"
  580:             ? "passed"
```

### `lib\chernobog\worldState\domainProjectors.ts` line 579

```text
  575:         event.type ===
  576:         "project.validation_started"
  577:           ? "running"
  578:           : event.type ===
> 579:             "project.validation_completed"
  580:             ? "passed"
  581:             : "failed";
  582: 
  583:       return [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 586

```text
  582: 
  583:       return [
  584:         {
  585:           key:
> 586:             `project.validation.${validation}.status`,
  587:           value:
  588:             status,
  589:           ttlMs:
  590:             900_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 594

```text
  590:             900_000,
  591:         },
  592:         {
  593:           key:
> 594:             `project.validation.${validation}.result`,
  595:           value:
  596:             jsonSafe(event.payload),
  597:           ttlMs:
  598:             900_000,
```

### `lib\chernobog\worldState\domainProjectors.ts` line 605

```text
  601:     },
  602:   };
  603: }
  604: 
> 605: function toolLifecycleProjector():
  606:   WorldStateProjector {
  607:   return {
  608:     id: "domain-tool-lifecycle",
  609:     eventTypes: [
```

### `lib\chernobog\worldState\domainProjectors.ts` line 606

```text
  602:   };
  603: }
  604: 
  605: function toolLifecycleProjector():
> 606:   WorldStateProjector {
  607:   return {
  608:     id: "domain-tool-lifecycle",
  609:     eventTypes: [
  610:       "tool.started",
```

### `lib\chernobog\worldState\domainProjectors.ts` line 614

```text
  610:       "tool.started",
  611:       "tool.completed",
  612:       "tool.failed",
  613:     ],
> 614:     project(event) {
  615:       const tool =
  616:         subjectSegment(event);
  617: 
  618:       const status =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 649

```text
  645:     },
  646:   };
  647: }
  648: 
> 649: function genericFactDomainProjector():
  650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
  653:     project(event) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 650

```text
  646:   };
  647: }
  648: 
  649: function genericFactDomainProjector():
> 650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
  653:     project(event) {
  654:       const domain =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 653

```text
  649: function genericFactDomainProjector():
  650:   WorldStateProjector {
  651:   return {
  652:     id: "domain-generic-factual-mirror",
> 653:     project(event) {
  654:       const domain =
  655:         eventDomain(event);
  656: 
  657:       if (!domain) {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 670

```text
  666:           event.type
  667:             .split(".")
  668:             .slice(1)
  669:             .join("-"),
> 670:           "observation",
  671:         );
  672: 
  673:       return {
  674:         key:
```

### `lib\chernobog\worldState\domainProjectors.ts` line 677

```text
  673:       return {
  674:         key:
  675:           `${domain}.${subject}.${typeSuffix}`,
  676:         value:
> 677:           commonObservation(event),
  678:         ttlMs:
  679:           300_000,
  680:       };
  681:     },
```

### `lib\chernobog\worldState\domainProjectors.ts` line 685

```text
  681:     },
  682:   };
  683: }
  684: 
> 685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 686

```text
  682:   };
  683: }
  684: 
  685: export function createChernobogDomainProjectors():
> 686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 688

```text
  684: 
  685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
> 688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 689

```text
  685: export function createChernobogDomainProjectors():
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
> 689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 690

```text
  686:   WorldStateProjector[] {
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
> 690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 691

```text
  687:   return [
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
> 691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 692

```text
  688:     runtimeObservationProjector(),
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
> 692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
```

### `lib\chernobog\worldState\domainProjectors.ts` line 693

```text
  689:     serviceHealthProjector(),
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
> 693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
  697:   ];
```

### `lib\chernobog\worldState\domainProjectors.ts` line 694

```text
  690:     runtimeNodeProjector(),
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
> 694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
  697:   ];
  698: }
```

### `lib\chernobog\worldState\domainProjectors.ts` line 695

```text
  691:     modelProviderProjector(),
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
> 695:     toolLifecycleProjector(),
  696:     genericFactDomainProjector(),
  697:   ];
  698: }
  699: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 696

```text
  692:     modelRoleProjector(),
  693:     projectGitProjector(),
  694:     projectValidationProjector(),
  695:     toolLifecycleProjector(),
> 696:     genericFactDomainProjector(),
  697:   ];
  698: }
  699: 
  700: export function registerChernobogDomainProjectors(
```

### `lib\chernobog\worldState\domainProjectors.ts` line 700

```text
  696:     genericFactDomainProjector(),
  697:   ];
  698: }
  699: 
> 700: export function registerChernobogDomainProjectors(
  701:   engine:
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
```

### `lib\chernobog\worldState\domainProjectors.ts` line 702

```text
  698: }
  699: 
  700: export function registerChernobogDomainProjectors(
  701:   engine:
> 702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
  705:     createChernobogDomainProjectors()
  706:       .map((projector) =>
```

### `lib\chernobog\worldState\domainProjectors.ts` line 705

```text
  701:   engine:
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
> 705:     createChernobogDomainProjectors()
  706:       .map((projector) =>
  707:         engine.register(projector),
  708:       );
  709: 
```

### `lib\chernobog\worldState\domainProjectors.ts` line 706

```text
  702:     ChernobogWorldStateProjectionEngine,
  703: ): () => void {
  704:   const detach =
  705:     createChernobogDomainProjectors()
> 706:       .map((projector) =>
  707:         engine.register(projector),
  708:       );
  709: 
  710:   return () => {
```

### `lib\chernobog\worldState\domainProjectors.ts` line 707

```text
  703: ): () => void {
  704:   const detach =
  705:     createChernobogDomainProjectors()
  706:       .map((projector) =>
> 707:         engine.register(projector),
  708:       );
  709: 
  710:   return () => {
  711:     for (
```

### `lib\chernobog\worldState\eventProjection.ts` line 3

```text
    1: import type { ChernobogEvent } from "../events/types";
    2: import { resolveWorldStateExpiry } from "./freshness";
>   3: import type { WorldStateProjection } from "./projectorTypes";
    4: import type {
    5:   WorldStateConfidenceBasis,
    6:   WorldStateFreshnessBasis,
    7:   WorldStateRecordInput,
```

### `lib\chernobog\worldState\eventProjection.ts` line 12

```text
    8: } from "./types";
    9: 
   10: export function buildWorldStateInputFromEvent(
   11:   event: ChernobogEvent,
>  12:   projection: WorldStateProjection,
   13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
   16:     projection.observedAt ?? event.occurredAt;
```

### `lib\chernobog\worldState\eventProjection.ts` line 13

```text
    9: 
   10: export function buildWorldStateInputFromEvent(
   11:   event: ChernobogEvent,
   12:   projection: WorldStateProjection,
>  13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
   16:     projection.observedAt ?? event.occurredAt;
   17: 
```

### `lib\chernobog\worldState\eventProjection.ts` line 16

```text
   12:   projection: WorldStateProjection,
   13:   projectorId?: string,
   14: ): WorldStateRecordInput {
   15:   const observedAt =
>  16:     projection.observedAt ?? event.occurredAt;
   17: 
   18:   let confidence: number;
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
```

### `lib\chernobog\worldState\eventProjection.ts` line 21

```text
   17: 
   18:   let confidence: number;
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
>  21:   if (projection.confidence !== undefined) {
   22:     confidence = projection.confidence;
   23:     confidenceBasis = "projector";
   24:   } else if (
   25:     event.metadata.confidence !== undefined
```

### `lib\chernobog\worldState\eventProjection.ts` line 22

```text
   18:   let confidence: number;
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
   21:   if (projection.confidence !== undefined) {
>  22:     confidence = projection.confidence;
   23:     confidenceBasis = "projector";
   24:   } else if (
   25:     event.metadata.confidence !== undefined
   26:   ) {
```

### `lib\chernobog\worldState\eventProjection.ts` line 23

```text
   19:   let confidenceBasis: WorldStateConfidenceBasis;
   20: 
   21:   if (projection.confidence !== undefined) {
   22:     confidence = projection.confidence;
>  23:     confidenceBasis = "projector";
   24:   } else if (
   25:     event.metadata.confidence !== undefined
   26:   ) {
   27:     confidence = event.metadata.confidence;
```

### `lib\chernobog\worldState\eventProjection.ts` line 38

```text
   34:   let expiresAt: string | undefined;
   35:   let freshnessBasis: WorldStateFreshnessBasis;
   36:   let freshnessTtlMs: number | undefined;
   37: 
>  38:   if (projection.expiresAt) {
   39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
```

### `lib\chernobog\worldState\eventProjection.ts` line 39

```text
   35:   let freshnessBasis: WorldStateFreshnessBasis;
   36:   let freshnessTtlMs: number | undefined;
   37: 
   38:   if (projection.expiresAt) {
>  39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
   43:       observedAt,
```

### `lib\chernobog\worldState\eventProjection.ts` line 41

```text
   37: 
   38:   if (projection.expiresAt) {
   39:     expiresAt = projection.expiresAt;
   40:     freshnessBasis = "explicit-expiry";
>  41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
   43:       observedAt,
   44:       projection.ttlMs,
   45:     );
```

### `lib\chernobog\worldState\eventProjection.ts` line 44

```text
   40:     freshnessBasis = "explicit-expiry";
   41:   } else if (projection.ttlMs !== undefined) {
   42:     expiresAt = resolveWorldStateExpiry(
   43:       observedAt,
>  44:       projection.ttlMs,
   45:     );
   46:     freshnessBasis = "ttl";
   47:     freshnessTtlMs = projection.ttlMs;
   48:   } else if (event.metadata.expiresAt) {
```

### `lib\chernobog\worldState\eventProjection.ts` line 47

```text
   43:       observedAt,
   44:       projection.ttlMs,
   45:     );
   46:     freshnessBasis = "ttl";
>  47:     freshnessTtlMs = projection.ttlMs;
   48:   } else if (event.metadata.expiresAt) {
   49:     expiresAt = event.metadata.expiresAt;
   50:     freshnessBasis = "event-expiry";
   51:   } else {
```

### `lib\chernobog\worldState\eventProjection.ts` line 56

```text
   52:     freshnessBasis = "none";
   53:   }
   54: 
   55:   return {
>  56:     key: projection.key,
   57:     namespace: projection.namespace,
   58:     value: projection.value,
   59:     observedAt,
   60:     confidence,
```

### `lib\chernobog\worldState\eventProjection.ts` line 57

```text
   53:   }
   54: 
   55:   return {
   56:     key: projection.key,
>  57:     namespace: projection.namespace,
   58:     value: projection.value,
   59:     observedAt,
   60:     confidence,
   61:     confidenceBasis,
```

### `lib\chernobog\worldState\eventProjection.ts` line 58

```text
   54: 
   55:   return {
   56:     key: projection.key,
   57:     namespace: projection.namespace,
>  58:     value: projection.value,
   59:     observedAt,
   60:     confidence,
   61:     confidenceBasis,
   62:     expiresAt,
```

### `lib\chernobog\worldState\eventProjection.ts` line 70

```text
   66:       eventId: event.id,
   67:       eventType: event.type,
   68:       eventOccurredAt: event.occurredAt,
   69:       eventReceivedAt: event.receivedAt,
>  70:       projectorId,
   71:       correlationId: event.correlationId,
   72:       causationId: event.causationId,
   73:       subject: event.subject,
   74:       scope: event.scope,
```

### `lib\chernobog\worldState\eventProjection.ts` line 74

```text
   70:       projectorId,
   71:       correlationId: event.correlationId,
   72:       causationId: event.causationId,
   73:       subject: event.subject,
>  74:       scope: event.scope,
   75:       source: event.source,
   76:     },
   77:   };
   78: }
```

### `lib\chernobog\worldState\eventProjection.ts` line 75

```text
   71:       correlationId: event.correlationId,
   72:       causationId: event.causationId,
   73:       subject: event.subject,
   74:       scope: event.scope,
>  75:       source: event.source,
   76:     },
   77:   };
   78: }
```

### `lib\chernobog\worldState\index.ts` line 9

```text
    5: export * from "./provenance";
    6: export * from "./assessment";
    7: export * from "./validation";
    8: export * from "./registry";
>   9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
```

### `lib\chernobog\worldState\index.ts` line 10

```text
    6: export * from "./assessment";
    7: export * from "./validation";
    8: export * from "./registry";
    9: export * from "./projectorTypes";
>  10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
```

### `lib\chernobog\worldState\index.ts` line 11

```text
    7: export * from "./validation";
    8: export * from "./registry";
    9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
>  11: export * from "./eventProjection";
   12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
```

### `lib\chernobog\worldState\index.ts` line 12

```text
    8: export * from "./registry";
    9: export * from "./projectorTypes";
   10: export * from "./projectorRegistry";
   11: export * from "./eventProjection";
>  12: export * from "./projectionEngine";
   13: export * from "./snapshotTypes";
   14: export * from "./snapshotIntegrity";
   15: export * from "./snapshotStore";
   16: export * from "./recovery";
```


## 11J World Model project fields

Pattern: `projectId|project|scope|entity|relationship|worldState`

### `lib\chernobog\worldModel\causalHypothesis.ts` line 12

```text
    8: import {
    9:   findDependencyPaths,
   10: } from "./dependencyModel";
   11: import {
>  12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: function normalizeList(
   16:   values:
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 69

```text
   65: 
   66: export function createWorldModelCausalObservation(
   67:   input: {
   68:     id: string;
>  69:     causeEntityId: string;
   70:     effectEntityId: string;
   71:     causeObservedAt: string;
   72:     effectObservedAt: string;
   73:     confidence?: number;
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 70

```text
   66: export function createWorldModelCausalObservation(
   67:   input: {
   68:     id: string;
   69:     causeEntityId: string;
>  70:     effectEntityId: string;
   71:     causeObservedAt: string;
   72:     effectObservedAt: string;
   73:     confidence?: number;
   74:     supporting?: boolean;
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 76

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

### `lib\chernobog\worldModel\causalHypothesis.ts` line 88

```text
   84:       "world model causal observation id must not be empty.",
   85:     );
   86:   }
   87: 
>  88:   const causeEntityId =
   89:     normalizeWorldModelEntityId(
   90:       input.causeEntityId,
   91:     );
   92: 
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 89

```text
   85:     );
   86:   }
   87: 
   88:   const causeEntityId =
>  89:     normalizeWorldModelEntityId(
   90:       input.causeEntityId,
   91:     );
   92: 
   93:   const effectEntityId =
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 90

```text
   86:   }
   87: 
   88:   const causeEntityId =
   89:     normalizeWorldModelEntityId(
>  90:       input.causeEntityId,
   91:     );
   92: 
   93:   const effectEntityId =
   94:     normalizeWorldModelEntityId(
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 93

```text
   89:     normalizeWorldModelEntityId(
   90:       input.causeEntityId,
   91:     );
   92: 
>  93:   const effectEntityId =
   94:     normalizeWorldModelEntityId(
   95:       input.effectEntityId,
   96:     );
   97: 
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 94

```text
   90:       input.causeEntityId,
   91:     );
   92: 
   93:   const effectEntityId =
>  94:     normalizeWorldModelEntityId(
   95:       input.effectEntityId,
   96:     );
   97: 
   98:   if (
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 95

```text
   91:     );
   92: 
   93:   const effectEntityId =
   94:     normalizeWorldModelEntityId(
>  95:       input.effectEntityId,
   96:     );
   97: 
   98:   if (
   99:     causeEntityId === effectEntityId
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 99

```text
   95:       input.effectEntityId,
   96:     );
   97: 
   98:   if (
>  99:     causeEntityId === effectEntityId
  100:   ) {
  101:     throw new Error(
  102:       "world model causal observation endpoints must be distinct.",
  103:     );
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 120

```text
  116:     );
  117: 
  118:   return {
  119:     id,
> 120:     causeEntityId,
  121:     effectEntityId,
  122:     causeObservedAt,
  123:     effectObservedAt,
  124:     confidence:
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 121

```text
  117: 
  118:   return {
  119:     id,
  120:     causeEntityId,
> 121:     effectEntityId,
  122:     causeObservedAt,
  123:     effectObservedAt,
  124:     confidence:
  125:       requireConfidence(
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 134

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

### `lib\chernobog\worldModel\causalHypothesis.ts` line 136

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

### `lib\chernobog\worldModel\causalHypothesis.ts` line 144

```text
  140: 
  141: export function evaluateWorldModelCausalHypothesis(
  142:   graph:
  143:     ChernobogWorldModelGraph,
> 144:   causeEntityId: string,
  145:   effectEntityId: string,
  146:   observations:
  147:     readonly WorldModelCausalObservation[],
  148: ): WorldModelCausalHypothesis {
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 145

```text
  141: export function evaluateWorldModelCausalHypothesis(
  142:   graph:
  143:     ChernobogWorldModelGraph,
  144:   causeEntityId: string,
> 145:   effectEntityId: string,
  146:   observations:
  147:     readonly WorldModelCausalObservation[],
  148: ): WorldModelCausalHypothesis {
  149:   const cause =
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 150

```text
  146:   observations:
  147:     readonly WorldModelCausalObservation[],
  148: ): WorldModelCausalHypothesis {
  149:   const cause =
> 150:     normalizeWorldModelEntityId(
  151:       causeEntityId,
  152:     );
  153: 
  154:   const effect =
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 151

```text
  147:     readonly WorldModelCausalObservation[],
  148: ): WorldModelCausalHypothesis {
  149:   const cause =
  150:     normalizeWorldModelEntityId(
> 151:       causeEntityId,
  152:     );
  153: 
  154:   const effect =
  155:     normalizeWorldModelEntityId(
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 155

```text
  151:       causeEntityId,
  152:     );
  153: 
  154:   const effect =
> 155:     normalizeWorldModelEntityId(
  156:       effectEntityId,
  157:     );
  158: 
  159:   const relevant =
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 156

```text
  152:     );
  153: 
  154:   const effect =
  155:     normalizeWorldModelEntityId(
> 156:       effectEntityId,
  157:     );
  158: 
  159:   const relevant =
  160:     observations
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 163

```text
  159:   const relevant =
  160:     observations
  161:       .filter(
  162:         (observation) =>
> 163:           observation.causeEntityId ===
  164:             cause &&
  165:           observation.effectEntityId ===
  166:             effect,
  167:       )
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 165

```text
  161:       .filter(
  162:         (observation) =>
  163:           observation.causeEntityId ===
  164:             cause &&
> 165:           observation.effectEntityId ===
  166:             effect,
  167:       )
  168:       .map(
  169:         (observation) =>
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 303

```text
  299: 
  300:   return {
  301:     id:
  302:       `causal-hypothesis:${cause}->${effect}`,
> 303:     causeEntityId:
  304:       cause,
  305:     effectEntityId:
  306:       effect,
  307:     status,
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 305

```text
  301:     id:
  302:       `causal-hypothesis:${cause}->${effect}`,
  303:     causeEntityId:
  304:       cause,
> 305:     effectEntityId:
  306:       effect,
  307:     status,
  308:     confidence,
  309:     supportCount:
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 315

```text
  311:     contradictionCount:
  312:       contradictions.length,
  313:     observations:
  314:       relevant,
> 315:     structuralRelationships:
  316:       structuralPaths.length === 0
  317:         ? []
  318:         : structuralPaths[0]!
  319:             .relationshipIds
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 319

```text
  315:     structuralRelationships:
  316:       structuralPaths.length === 0
  317:         ? []
  318:         : structuralPaths[0]!
> 319:             .relationshipIds
  320:             .map(
  321:               (id) =>
  322:                 graph.getRelationship(
  323:                   id,
```

### `lib\chernobog\worldModel\causalHypothesis.ts` line 322

```text
  318:         : structuralPaths[0]!
  319:             .relationshipIds
  320:             .map(
  321:               (id) =>
> 322:                 graph.getRelationship(
  323:                   id,
  324:                 ),
  325:             )
  326:             .filter(
```

### `lib\chernobog\worldModel\causalTypes.ts` line 2

```text
    1: import type {
>   2:   WorldModelRelationship,
    3: } from "./types";
    4: 
    5: export type WorldModelCausalHypothesisStatus =
    6:   | "insufficient"
```

### `lib\chernobog\worldModel\causalTypes.ts` line 12

```text
    8:   | "supported"
    9:   | "contradicted";
   10: 
   11: export interface WorldModelDependencyPath {
>  12:   fromEntityId: string;
   13:   toEntityId: string;
   14:   relationshipIds: string[];
   15:   entityIds: string[];
   16:   depth: number;
```

### `lib\chernobog\worldModel\causalTypes.ts` line 13

```text
    9:   | "contradicted";
   10: 
   11: export interface WorldModelDependencyPath {
   12:   fromEntityId: string;
>  13:   toEntityId: string;
   14:   relationshipIds: string[];
   15:   entityIds: string[];
   16:   depth: number;
   17: }
```

### `lib\chernobog\worldModel\causalTypes.ts` line 14

```text
   10: 
   11: export interface WorldModelDependencyPath {
   12:   fromEntityId: string;
   13:   toEntityId: string;
>  14:   relationshipIds: string[];
   15:   entityIds: string[];
   16:   depth: number;
   17: }
   18: 
```

### `lib\chernobog\worldModel\causalTypes.ts` line 15

```text
   11: export interface WorldModelDependencyPath {
   12:   fromEntityId: string;
   13:   toEntityId: string;
   14:   relationshipIds: string[];
>  15:   entityIds: string[];
   16:   depth: number;
   17: }
   18: 
   19: export interface WorldModelImpactAssessment {
```

### `lib\chernobog\worldModel\causalTypes.ts` line 20

```text
   16:   depth: number;
   17: }
   18: 
   19: export interface WorldModelImpactAssessment {
>  20:   sourceEntityId: string;
   21:   directlyDependentEntityIds: string[];
   22:   transitivelyDependentEntityIds: string[];
   23:   dependencyPaths: WorldModelDependencyPath[];
   24: }
```

### `lib\chernobog\worldModel\causalTypes.ts` line 21

```text
   17: }
   18: 
   19: export interface WorldModelImpactAssessment {
   20:   sourceEntityId: string;
>  21:   directlyDependentEntityIds: string[];
   22:   transitivelyDependentEntityIds: string[];
   23:   dependencyPaths: WorldModelDependencyPath[];
   24: }
   25: 
```

### `lib\chernobog\worldModel\causalTypes.ts` line 22

```text
   18: 
   19: export interface WorldModelImpactAssessment {
   20:   sourceEntityId: string;
   21:   directlyDependentEntityIds: string[];
>  22:   transitivelyDependentEntityIds: string[];
   23:   dependencyPaths: WorldModelDependencyPath[];
   24: }
   25: 
   26: export interface WorldModelCausalObservation {
```

### `lib\chernobog\worldModel\causalTypes.ts` line 28

```text
   24: }
   25: 
   26: export interface WorldModelCausalObservation {
   27:   id: string;
>  28:   causeEntityId: string;
   29:   effectEntityId: string;
   30:   causeObservedAt: string;
   31:   effectObservedAt: string;
   32:   confidence: number;
```

### `lib\chernobog\worldModel\causalTypes.ts` line 29

```text
   25: 
   26: export interface WorldModelCausalObservation {
   27:   id: string;
   28:   causeEntityId: string;
>  29:   effectEntityId: string;
   30:   causeObservedAt: string;
   31:   effectObservedAt: string;
   32:   confidence: number;
   33:   supporting: boolean;
```

### `lib\chernobog\worldModel\causalTypes.ts` line 35

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

### `lib\chernobog\worldModel\causalTypes.ts` line 40

```text
   36: }
   37: 
   38: export interface WorldModelCausalHypothesis {
   39:   id: string;
>  40:   causeEntityId: string;
   41:   effectEntityId: string;
   42:   status: WorldModelCausalHypothesisStatus;
   43:   confidence: number;
   44:   supportCount: number;
```

### `lib\chernobog\worldModel\causalTypes.ts` line 41

```text
   37: 
   38: export interface WorldModelCausalHypothesis {
   39:   id: string;
   40:   causeEntityId: string;
>  41:   effectEntityId: string;
   42:   status: WorldModelCausalHypothesisStatus;
   43:   confidence: number;
   44:   supportCount: number;
   45:   contradictionCount: number;
```

### `lib\chernobog\worldModel\causalTypes.ts` line 47

```text
   43:   confidence: number;
   44:   supportCount: number;
   45:   contradictionCount: number;
   46:   observations: WorldModelCausalObservation[];
>  47:   structuralRelationships: WorldModelRelationship[];
   48:   firstObservedAt?: string;
   49:   lastObservedAt?: string;
   50: }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 9

```text
    5:   WorldModelDependencyPath,
    6:   WorldModelImpactAssessment,
    7: } from "./causalTypes";
    8: import type {
>   9:   WorldModelRelationship,
   10: } from "./types";
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 12

```text
    8: import type {
    9:   WorldModelRelationship,
   10: } from "./types";
   11: import {
>  12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 15

```text
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
>  15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
   19:     "requires-model",
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 25

```text
   21:     "served-by",
   22:     "backed-by",
   23:   ]);
   24: 
>  25: export function isDependencyRelationship(
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 26

```text
   22:     "backed-by",
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
>  26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 27

```text
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
   26:   relationship:
>  27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 30

```text
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
>  30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 31

```text
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
>  31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 32

```text
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
>  32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 37

```text
   33:     )
   34:   );
   35: }
   36: 
>  37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
   41: ): WorldModelRelationship[] {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 40

```text
   36: 
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
>  40:   entityId: string,
   41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 41

```text
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
>  41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 43

```text
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
   41: ): WorldModelRelationship[] {
   42:   return graph
>  43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
   46:         isDependencyRelationship(
   47:           relationship,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 45

```text
   41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
>  45:       (relationship) =>
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 46

```text
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
>  46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 47

```text
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
   46:         isDependencyRelationship(
>  47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 49

```text
   45:       (relationship) =>
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
>  49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
   52:     .sort(
   53:       (left, right) =>
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 50

```text
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
>  50:           entityId,
   51:     )
   52:     .sort(
   53:       (left, right) =>
   54:         left.id.localeCompare(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 60

```text
   56:         ),
   57:     );
   58: }
   59: 
>  60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
   64: ): WorldModelRelationship[] {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 63

```text
   59: 
   60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
>  63:   entityId: string,
   64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 64

```text
   60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
>  64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 66

```text
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
   64: ): WorldModelRelationship[] {
   65:   return graph
>  66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
   69:         isDependencyRelationship(
   70:           relationship,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 68

```text
   64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
>  68:       (relationship) =>
   69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 69

```text
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
>  69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
   73:           entityId,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 70

```text
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
   69:         isDependencyRelationship(
>  70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
   73:           entityId,
   74:     )
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 72

```text
   68:       (relationship) =>
   69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
>  72:         relationship.toEntityId ===
   73:           entityId,
   74:     )
   75:     .sort(
   76:       (left, right) =>
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 73

```text
   69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
>  73:           entityId,
   74:     )
   75:     .sort(
   76:       (left, right) =>
   77:         left.id.localeCompare(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 86

```text
   82: 
   83: export function findDependencyPaths(
   84:   graph:
   85:     ChernobogWorldModelGraph,
>  86:   fromEntityId: string,
   87:   toEntityId: string,
   88:   options: {
   89:     maxDepth?: number;
   90:   } = {},
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 87

```text
   83: export function findDependencyPaths(
   84:   graph:
   85:     ChernobogWorldModelGraph,
   86:   fromEntityId: string,
>  87:   toEntityId: string,
   88:   options: {
   89:     maxDepth?: number;
   90:   } = {},
   91: ): WorldModelDependencyPath[] {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 93

```text
   89:     maxDepth?: number;
   90:   } = {},
   91: ): WorldModelDependencyPath[] {
   92:   const from =
>  93:     normalizeWorldModelEntityId(
   94:       fromEntityId,
   95:     );
   96: 
   97:   const to =
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 94

```text
   90:   } = {},
   91: ): WorldModelDependencyPath[] {
   92:   const from =
   93:     normalizeWorldModelEntityId(
>  94:       fromEntityId,
   95:     );
   96: 
   97:   const to =
   98:     normalizeWorldModelEntityId(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 98

```text
   94:       fromEntityId,
   95:     );
   96: 
   97:   const to =
>  98:     normalizeWorldModelEntityId(
   99:       toEntityId,
  100:     );
  101: 
  102:   const maxDepth =
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 99

```text
   95:     );
   96: 
   97:   const to =
   98:     normalizeWorldModelEntityId(
>  99:       toEntityId,
  100:     );
  101: 
  102:   const maxDepth =
  103:     options.maxDepth ?? 8;
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 116

```text
  112:     );
  113:   }
  114: 
  115:   if (
> 116:     !graph.getEntity(from) ||
  117:     !graph.getEntity(to)
  118:   ) {
  119:     return [];
  120:   }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 117

```text
  113:   }
  114: 
  115:   if (
  116:     !graph.getEntity(from) ||
> 117:     !graph.getEntity(to)
  118:   ) {
  119:     return [];
  120:   }
  121: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 127

```text
  123:     WorldModelDependencyPath[] = [];
  124: 
  125:   const visit = (
  126:     current: string,
> 127:     entityIds: string[],
  128:     relationshipIds: string[],
  129:   ): void => {
  130:     if (
  131:       relationshipIds.length >=
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 128

```text
  124: 
  125:   const visit = (
  126:     current: string,
  127:     entityIds: string[],
> 128:     relationshipIds: string[],
  129:   ): void => {
  130:     if (
  131:       relationshipIds.length >=
  132:       maxDepth
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 131

```text
  127:     entityIds: string[],
  128:     relationshipIds: string[],
  129:   ): void => {
  130:     if (
> 131:       relationshipIds.length >=
  132:       maxDepth
  133:     ) {
  134:       return;
  135:     }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 138

```text
  134:       return;
  135:     }
  136: 
  137:     for (
> 138:       const relationship
  139:       of outgoingDependencyRelationships(
  140:         graph,
  141:         current,
  142:       )
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 139

```text
  135:     }
  136: 
  137:     for (
  138:       const relationship
> 139:       of outgoingDependencyRelationships(
  140:         graph,
  141:         current,
  142:       )
  143:     ) {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 145

```text
  141:         current,
  142:       )
  143:     ) {
  144:       const next =
> 145:         relationship.toEntityId;
  146: 
  147:       if (
  148:         entityIds.includes(next)
  149:       ) {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 148

```text
  144:       const next =
  145:         relationship.toEntityId;
  146: 
  147:       if (
> 148:         entityIds.includes(next)
  149:       ) {
  150:         continue;
  151:       }
  152: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 154

```text
  150:         continue;
  151:       }
  152: 
  153:       const nextEntities = [
> 154:         ...entityIds,
  155:         next,
  156:       ];
  157: 
  158:       const nextRelationships = [
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 158

```text
  154:         ...entityIds,
  155:         next,
  156:       ];
  157: 
> 158:       const nextRelationships = [
  159:         ...relationshipIds,
  160:         relationship.id,
  161:       ];
  162: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 159

```text
  155:         next,
  156:       ];
  157: 
  158:       const nextRelationships = [
> 159:         ...relationshipIds,
  160:         relationship.id,
  161:       ];
  162: 
  163:       if (next === to) {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 160

```text
  156:       ];
  157: 
  158:       const nextRelationships = [
  159:         ...relationshipIds,
> 160:         relationship.id,
  161:       ];
  162: 
  163:       if (next === to) {
  164:         paths.push({
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 165

```text
  161:       ];
  162: 
  163:       if (next === to) {
  164:         paths.push({
> 165:           fromEntityId: from,
  166:           toEntityId: to,
  167:           relationshipIds:
  168:             nextRelationships,
  169:           entityIds:
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 166

```text
  162: 
  163:       if (next === to) {
  164:         paths.push({
  165:           fromEntityId: from,
> 166:           toEntityId: to,
  167:           relationshipIds:
  168:             nextRelationships,
  169:           entityIds:
  170:             nextEntities,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 167

```text
  163:       if (next === to) {
  164:         paths.push({
  165:           fromEntityId: from,
  166:           toEntityId: to,
> 167:           relationshipIds:
  168:             nextRelationships,
  169:           entityIds:
  170:             nextEntities,
  171:           depth:
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 168

```text
  164:         paths.push({
  165:           fromEntityId: from,
  166:           toEntityId: to,
  167:           relationshipIds:
> 168:             nextRelationships,
  169:           entityIds:
  170:             nextEntities,
  171:           depth:
  172:             nextRelationships.length,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 169

```text
  165:           fromEntityId: from,
  166:           toEntityId: to,
  167:           relationshipIds:
  168:             nextRelationships,
> 169:           entityIds:
  170:             nextEntities,
  171:           depth:
  172:             nextRelationships.length,
  173:         });
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 172

```text
  168:             nextRelationships,
  169:           entityIds:
  170:             nextEntities,
  171:           depth:
> 172:             nextRelationships.length,
  173:         });
  174: 
  175:         continue;
  176:       }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 181

```text
  177: 
  178:       visit(
  179:         next,
  180:         nextEntities,
> 181:         nextRelationships,
  182:       );
  183:     }
  184:   };
  185: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 203

```text
  199:           right.depth
  200:         );
  201:       }
  202: 
> 203:       return left.relationshipIds
  204:         .join("|")
  205:         .localeCompare(
  206:           right.relationshipIds
  207:             .join("|"),
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 206

```text
  202: 
  203:       return left.relationshipIds
  204:         .join("|")
  205:         .localeCompare(
> 206:           right.relationshipIds
  207:             .join("|"),
  208:         );
  209:     },
  210:   );
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 216

```text
  212: 
  213: export function assessDownstreamImpact(
  214:   graph:
  215:     ChernobogWorldModelGraph,
> 216:   sourceEntityId: string,
  217:   options: {
  218:     maxDepth?: number;
  219:   } = {},
  220: ): WorldModelImpactAssessment {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 222

```text
  218:     maxDepth?: number;
  219:   } = {},
  220: ): WorldModelImpactAssessment {
  221:   const source =
> 222:     normalizeWorldModelEntityId(
  223:       sourceEntityId,
  224:     );
  225: 
  226:   const maxDepth =
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 223

```text
  219:   } = {},
  220: ): WorldModelImpactAssessment {
  221:   const source =
  222:     normalizeWorldModelEntityId(
> 223:       sourceEntityId,
  224:     );
  225: 
  226:   const maxDepth =
  227:     options.maxDepth ?? 8;
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 239

```text
  235:       "world model impact maxDepth must be an integer between 1 and 32.",
  236:     );
  237:   }
  238: 
> 239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
  242:       directlyDependentEntityIds: [],
  243:       transitivelyDependentEntityIds: [],
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 241

```text
  237:   }
  238: 
  239:   if (!graph.getEntity(source)) {
  240:     return {
> 241:       sourceEntityId: source,
  242:       directlyDependentEntityIds: [],
  243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 242

```text
  238: 
  239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
> 242:       directlyDependentEntityIds: [],
  243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
  246:   }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 243

```text
  239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
  242:       directlyDependentEntityIds: [],
> 243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
  246:   }
  247: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 249

```text
  245:     };
  246:   }
  247: 
  248:   const direct =
> 249:     incomingDependencyRelationships(
  250:       graph,
  251:       source,
  252:     )
  253:       .map(
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 254

```text
  250:       graph,
  251:       source,
  252:     )
  253:       .map(
> 254:         (relationship) =>
  255:           relationship.fromEntityId,
  256:       )
  257:       .sort();
  258: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 255

```text
  251:       source,
  252:     )
  253:       .map(
  254:         (relationship) =>
> 255:           relationship.fromEntityId,
  256:       )
  257:       .sort();
  258: 
  259:   const pathByKey =
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 267

```text
  263:     >();
  264: 
  265:   const visitDependents = (
  266:     currentDependency: string,
> 267:     entityIds: string[],
  268:     relationshipIds: string[],
  269:   ): void => {
  270:     if (
  271:       relationshipIds.length >=
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 268

```text
  264: 
  265:   const visitDependents = (
  266:     currentDependency: string,
  267:     entityIds: string[],
> 268:     relationshipIds: string[],
  269:   ): void => {
  270:     if (
  271:       relationshipIds.length >=
  272:       maxDepth
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 271

```text
  267:     entityIds: string[],
  268:     relationshipIds: string[],
  269:   ): void => {
  270:     if (
> 271:       relationshipIds.length >=
  272:       maxDepth
  273:     ) {
  274:       return;
  275:     }
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 278

```text
  274:       return;
  275:     }
  276: 
  277:     for (
> 278:       const relationship
  279:       of incomingDependencyRelationships(
  280:         graph,
  281:         currentDependency,
  282:       )
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 279

```text
  275:     }
  276: 
  277:     for (
  278:       const relationship
> 279:       of incomingDependencyRelationships(
  280:         graph,
  281:         currentDependency,
  282:       )
  283:     ) {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 285

```text
  281:         currentDependency,
  282:       )
  283:     ) {
  284:       const dependent =
> 285:         relationship.fromEntityId;
  286: 
  287:       if (
  288:         entityIds.includes(
  289:           dependent,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 288

```text
  284:       const dependent =
  285:         relationship.fromEntityId;
  286: 
  287:       if (
> 288:         entityIds.includes(
  289:           dependent,
  290:         )
  291:       ) {
  292:         continue;
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 295

```text
  291:       ) {
  292:         continue;
  293:       }
  294: 
> 295:       const nextEntityIds = [
  296:         dependent,
  297:         ...entityIds,
  298:       ];
  299: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 297

```text
  293:       }
  294: 
  295:       const nextEntityIds = [
  296:         dependent,
> 297:         ...entityIds,
  298:       ];
  299: 
  300:       const nextRelationshipIds = [
  301:         relationship.id,
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 300

```text
  296:         dependent,
  297:         ...entityIds,
  298:       ];
  299: 
> 300:       const nextRelationshipIds = [
  301:         relationship.id,
  302:         ...relationshipIds,
  303:       ];
  304: 
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 301

```text
  297:         ...entityIds,
  298:       ];
  299: 
  300:       const nextRelationshipIds = [
> 301:         relationship.id,
  302:         ...relationshipIds,
  303:       ];
  304: 
  305:       const path:
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 302

```text
  298:       ];
  299: 
  300:       const nextRelationshipIds = [
  301:         relationship.id,
> 302:         ...relationshipIds,
  303:       ];
  304: 
  305:       const path:
  306:         WorldModelDependencyPath = {
```

### `lib\chernobog\worldModel\dependencyModel.ts` line 307

```text
  303:       ];
  304: 
  305:       const path:
  306:         WorldModelDependencyPath = {
> 307:           fromEntityId:
  308:             dependent,
  309:           toEntityId:
  310:             source,
  311:           relationshipIds:
```


## Relevant database schemas


## Project/session/database table definitions

Pattern: `CREATE TABLE|session_state|projects|project_|workspace|slug`

### `lib\chernobog\db.ts` line 23

```text
   18: export const db = new Database(chernobogDatabasePath);
   19: 
   20: db.pragma("journal_mode = WAL");
   21: 
   22: db.exec(`
>  23:   CREATE TABLE IF NOT EXISTS messages (
   24:     id INTEGER PRIMARY KEY AUTOINCREMENT,
   25:     role TEXT NOT NULL,
   26:     content TEXT NOT NULL,
   27:     route TEXT,
   28: 
```

### `lib\chernobog\db.ts` line 33

```text
   28: 
   29:     session_id TEXT,
   30:     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   31:   );
   32: 
>  33:   CREATE TABLE IF NOT EXISTS memories (
   34:     id INTEGER PRIMARY KEY AUTOINCREMENT,
   35:     fact TEXT NOT NULL UNIQUE,
   36:     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   37:   );
   38: 
```

### `lib\chernobog\db.ts` line 39

```text
   34:     id INTEGER PRIMARY KEY AUTOINCREMENT,
   35:     fact TEXT NOT NULL UNIQUE,
   36:     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   37:   );
   38: 
>  39:   CREATE TABLE IF NOT EXISTS tool_calls (
   40:     id INTEGER PRIMARY KEY AUTOINCREMENT,
   41:     tool_name TEXT NOT NULL,
   42:     input_json TEXT NOT NULL,
   43:     output_json TEXT,
   44:     success INTEGER NOT NULL,
```

### `lib\chernobog\db.ts` line 48

```text
   43:     output_json TEXT,
   44:     success INTEGER NOT NULL,
   45:     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   46:   );
   47: 
>  48:   CREATE TABLE IF NOT EXISTS session_state (
   49:     session_id TEXT PRIMARY KEY,
   50:     state_json TEXT NOT NULL,
   51:     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   52:   );
   53: `);
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 7

```text
    2:   createProject,
    3:   createTaskCard,
    4:   findProjectByQuery,
    5:   findTaskByIdentifier,
    6:   getDashboardSnapshot,
>   7:   getProjectStats,
    8:   moveTaskCard,
    9:   updateProjectFocus,
   10:   updateProjectNextAction,
   11: } from "../service";
   12: import type {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 20

```text
   15:   ProjectOperationsModuleCommand,
   16:   ProjectTaskResult,
   17: } from "../types";
   18: 
   19: function projectLine(project: Project, index?: number): string {
>  20:   const stats = getProjectStats(project);
   21:   const prefix = index === undefined ? "" : `${index}. `;
   22:   return `${prefix}${project.name} | ${project.status} | ${stats.doingCount} doing | ${stats.urgentCount} urgent | /projects/${project.slug}`;
   23: }
   24: 
   25: function taskLine(result: ProjectTaskResult, index?: number): string {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 22

```text
   17: } from "../types";
   18: 
   19: function projectLine(project: Project, index?: number): string {
   20:   const stats = getProjectStats(project);
   21:   const prefix = index === undefined ? "" : `${index}. `;
>  22:   return `${prefix}${project.name} | ${project.status} | ${stats.doingCount} doing | ${stats.urgentCount} urgent | /projects/${project.slug}`;
   23: }
   24: 
   25: function taskLine(result: ProjectTaskResult, index?: number): string {
   26:   const prefix = index === undefined ? "" : `${index}. `;
   27:   return `${prefix}${result.card.title} | ${result.project.name} | ${result.card.priority} | ${result.card.column} | task ${result.card.id.slice(0, 8)}`;
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 34

```text
   29: 
   30: function projectNotFound(query: string): ProjectOperationsCommandResult {
   31:   return {
   32:     ok: false,
   33:     title: "Project Not Found",
>  34:     message: `No active Project Operations workspace matched: ${query}`,
   35:     data: { query },
   36:   };
   37: }
   38: 
   39: function taskNotFound(identifier: string): ProjectOperationsCommandResult {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 51

```text
   46: }
   47: 
   48: export async function executeProjectOperationsCommand(
   49:   command: ProjectOperationsModuleCommand,
   50: ): Promise<ProjectOperationsCommandResult> {
>  51:   if (command.kind === "project_operations_status") {
   52:     const snapshot = getDashboardSnapshot();
   53:     return {
   54:       ok: true,
   55:       title: "Project Operations Status",
   56:       message: [
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 57

```text
   52:     const snapshot = getDashboardSnapshot();
   53:     return {
   54:       ok: true,
   55:       title: "Project Operations Status",
   56:       message: [
>  57:         `Active projects: ${snapshot.projects.length}`,
   58:         `Doing now: ${snapshot.doingTasks.length}`,
   59:         `Urgent tasks: ${snapshot.urgentTasks.length}`,
   60:         `Blocked projects: ${snapshot.blockedProjects.length}`,
   61:         `Stale projects: ${snapshot.staleProjects.length}`,
   62:         `Command focus: ${snapshot.commandFocus?.name ?? "none"}`,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 60

```text
   55:       title: "Project Operations Status",
   56:       message: [
   57:         `Active projects: ${snapshot.projects.length}`,
   58:         `Doing now: ${snapshot.doingTasks.length}`,
   59:         `Urgent tasks: ${snapshot.urgentTasks.length}`,
>  60:         `Blocked projects: ${snapshot.blockedProjects.length}`,
   61:         `Stale projects: ${snapshot.staleProjects.length}`,
   62:         `Command focus: ${snapshot.commandFocus?.name ?? "none"}`,
   63:         "Workspace: /projects",
   64:       ].join("\n"),
   65:       data: { snapshot },
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 61

```text
   56:       message: [
   57:         `Active projects: ${snapshot.projects.length}`,
   58:         `Doing now: ${snapshot.doingTasks.length}`,
   59:         `Urgent tasks: ${snapshot.urgentTasks.length}`,
   60:         `Blocked projects: ${snapshot.blockedProjects.length}`,
>  61:         `Stale projects: ${snapshot.staleProjects.length}`,
   62:         `Command focus: ${snapshot.commandFocus?.name ?? "none"}`,
   63:         "Workspace: /projects",
   64:       ].join("\n"),
   65:       data: { snapshot },
   66:     };
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 63

```text
   58:         `Doing now: ${snapshot.doingTasks.length}`,
   59:         `Urgent tasks: ${snapshot.urgentTasks.length}`,
   60:         `Blocked projects: ${snapshot.blockedProjects.length}`,
   61:         `Stale projects: ${snapshot.staleProjects.length}`,
   62:         `Command focus: ${snapshot.commandFocus?.name ?? "none"}`,
>  63:         "Workspace: /projects",
   64:       ].join("\n"),
   65:       data: { snapshot },
   66:     };
   67:   }
   68: 
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 69

```text
   64:       ].join("\n"),
   65:       data: { snapshot },
   66:     };
   67:   }
   68: 
>  69:   if (command.kind === "project_list") {
   70:     const projects = getDashboardSnapshot().projects;
   71:     return {
   72:       ok: true,
   73:       title: "Active Projects",
   74:       message:
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 70

```text
   65:       data: { snapshot },
   66:     };
   67:   }
   68: 
   69:   if (command.kind === "project_list") {
>  70:     const projects = getDashboardSnapshot().projects;
   71:     return {
   72:       ok: true,
   73:       title: "Active Projects",
   74:       message:
   75:         projects.length === 0
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 73

```text
   68: 
   69:   if (command.kind === "project_list") {
   70:     const projects = getDashboardSnapshot().projects;
   71:     return {
   72:       ok: true,
>  73:       title: "Active Projects",
   74:       message:
   75:         projects.length === 0
   76:           ? "No active projects are recorded."
   77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
   78:       data: { projects },
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 75

```text
   70:     const projects = getDashboardSnapshot().projects;
   71:     return {
   72:       ok: true,
   73:       title: "Active Projects",
   74:       message:
>  75:         projects.length === 0
   76:           ? "No active projects are recorded."
   77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
   78:       data: { projects },
   79:     };
   80:   }
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 76

```text
   71:     return {
   72:       ok: true,
   73:       title: "Active Projects",
   74:       message:
   75:         projects.length === 0
>  76:           ? "No active projects are recorded."
   77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
   78:       data: { projects },
   79:     };
   80:   }
   81: 
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 77

```text
   72:       ok: true,
   73:       title: "Active Projects",
   74:       message:
   75:         projects.length === 0
   76:           ? "No active projects are recorded."
>  77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
   78:       data: { projects },
   79:     };
   80:   }
   81: 
   82:   if (command.kind === "project_urgent_list") {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 78

```text
   73:       title: "Active Projects",
   74:       message:
   75:         projects.length === 0
   76:           ? "No active projects are recorded."
   77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
>  78:       data: { projects },
   79:     };
   80:   }
   81: 
   82:   if (command.kind === "project_urgent_list") {
   83:     const tasks = getDashboardSnapshot().urgentTasks;
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 82

```text
   77:           : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
   78:       data: { projects },
   79:     };
   80:   }
   81: 
>  82:   if (command.kind === "project_urgent_list") {
   83:     const tasks = getDashboardSnapshot().urgentTasks;
   84:     return {
   85:       ok: true,
   86:       title: "Urgent Project Tasks",
   87:       message:
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 95

```text
   90:           : tasks.map((task, index) => taskLine(task, index + 1)).join("\n"),
   91:       data: { tasks },
   92:     };
   93:   }
   94: 
>  95:   if (command.kind === "project_show") {
   96:     const project = findProjectByQuery(command.projectQuery);
   97:     if (!project) return projectNotFound(command.projectQuery);
   98:     const stats = getProjectStats(project);
   99: 
  100:     return {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 98

```text
   93:   }
   94: 
   95:   if (command.kind === "project_show") {
   96:     const project = findProjectByQuery(command.projectQuery);
   97:     if (!project) return projectNotFound(command.projectQuery);
>  98:     const stats = getProjectStats(project);
   99: 
  100:     return {
  101:       ok: true,
  102:       title: `Project: ${project.name}`,
  103:       message: [
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 110

```text
  105:         `Repository: ${project.repoName} | ${project.repoHealth}`,
  106:         `Focus: ${project.focus}`,
  107:         `Next action: ${project.nextAction}`,
  108:         `Progress: ${stats.progress}% | ${stats.doingCount} doing | ${stats.urgentCount} urgent`,
  109:         `Blockers: ${project.blockers.length === 0 ? "none" : project.blockers.join("; ")}`,
> 110:         `Workspace: /projects/${project.slug}`,
  111:       ].join("\n"),
  112:       data: { project, stats },
  113:     };
  114:   }
  115: 
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 116

```text
  111:       ].join("\n"),
  112:       data: { project, stats },
  113:     };
  114:   }
  115: 
> 116:   if (command.kind === "project_create") {
  117:     const project = createProject({
  118:       name: command.name,
  119:       summary: "Project tracked through Chernobog Project Operations.",
  120:       repoName: command.name.trim().replace(/\s+/g, "-"),
  121:     });
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 124

```text
  119:       summary: "Project tracked through Chernobog Project Operations.",
  120:       repoName: command.name.trim().replace(/\s+/g, "-"),
  121:     });
  122:     return {
  123:       ok: true,
> 124:       title: "Project Workspace Created",
  125:       message: [
  126:         `Name: ${project.name}`,
  127:         `Status: ${project.status}`,
  128:         `Workspace: /projects/${project.slug}`,
  129:         "Next: set the project focus and add its first concrete task.",
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 128

```text
  123:       ok: true,
  124:       title: "Project Workspace Created",
  125:       message: [
  126:         `Name: ${project.name}`,
  127:         `Status: ${project.status}`,
> 128:         `Workspace: /projects/${project.slug}`,
  129:         "Next: set the project focus and add its first concrete task.",
  130:       ].join("\n"),
  131:       data: { project },
  132:     };
  133:   }
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 135

```text
  130:       ].join("\n"),
  131:       data: { project },
  132:     };
  133:   }
  134: 
> 135:   if (command.kind === "project_task_add") {
  136:     const project = findProjectByQuery(command.projectQuery);
  137:     if (!project) return projectNotFound(command.projectQuery);
  138:     const board = project.boards[0];
  139:     if (!board) {
  140:       return {
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 147

```text
  142:         title: "Project Board Missing",
  143:         message: `${project.name} has no task board available.`,
  144:       };
  145:     }
  146: 
> 147:     const card = createTaskCard(project.slug, board.id, {
  148:       title: command.title,
  149:       description: `Created from Chernobog directive: ${command.title}`,
  150:       priority: command.urgent ? "High" : "Medium",
  151:       due: command.urgent ? "Now" : "Later",
  152:       urgent: command.urgent,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 164

```text
  159:       message: [
  160:         `Project: ${project.name}`,
  161:         `Task: ${card.title}`,
  162:         `Task ID: ${card.id.slice(0, 8)}`,
  163:         `Column: ${card.column}`,
> 164:         `Workspace: /projects/${project.slug}`,
  165:       ].join("\n"),
  166:       data: { projectId: project.id, card },
  167:     };
  168:   }
  169: 
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 171

```text
  166:       data: { projectId: project.id, card },
  167:     };
  168:   }
  169: 
  170:   if (
> 171:     command.kind === "project_task_move" ||
  172:     command.kind === "project_task_complete"
  173:   ) {
  174:     const target = findTaskByIdentifier(command.taskIdentifier);
  175:     if (!target) return taskNotFound(command.taskIdentifier);
  176:     const column = command.kind === "project_task_complete" ? "done" : command.column;
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 172

```text
  167:     };
  168:   }
  169: 
  170:   if (
  171:     command.kind === "project_task_move" ||
> 172:     command.kind === "project_task_complete"
  173:   ) {
  174:     const target = findTaskByIdentifier(command.taskIdentifier);
  175:     if (!target) return taskNotFound(command.taskIdentifier);
  176:     const column = command.kind === "project_task_complete" ? "done" : command.column;
  177:     const card = moveTaskCard(
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 176

```text
  171:     command.kind === "project_task_move" ||
  172:     command.kind === "project_task_complete"
  173:   ) {
  174:     const target = findTaskByIdentifier(command.taskIdentifier);
  175:     if (!target) return taskNotFound(command.taskIdentifier);
> 176:     const column = command.kind === "project_task_complete" ? "done" : command.column;
  177:     const card = moveTaskCard(
  178:       target.project.slug,
  179:       target.board.id,
  180:       target.card.id,
  181:       column,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 178

```text
  173:   ) {
  174:     const target = findTaskByIdentifier(command.taskIdentifier);
  175:     if (!target) return taskNotFound(command.taskIdentifier);
  176:     const column = command.kind === "project_task_complete" ? "done" : command.column;
  177:     const card = moveTaskCard(
> 178:       target.project.slug,
  179:       target.board.id,
  180:       target.card.id,
  181:       column,
  182:     );
  183: 
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 200

```text
  195:   }
  196: 
  197:   const project = findProjectByQuery(command.projectQuery);
  198:   if (!project) return projectNotFound(command.projectQuery);
  199: 
> 200:   if (command.kind === "project_focus_set") {
  201:     const updated = updateProjectFocus(project.slug, command.focus);
  202:     return {
  203:       ok: true,
  204:       title: "Project Focus Updated",
  205:       message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 201

```text
  196: 
  197:   const project = findProjectByQuery(command.projectQuery);
  198:   if (!project) return projectNotFound(command.projectQuery);
  199: 
  200:   if (command.kind === "project_focus_set") {
> 201:     const updated = updateProjectFocus(project.slug, command.focus);
  202:     return {
  203:       ok: true,
  204:       title: "Project Focus Updated",
  205:       message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
  206:       data: { project: updated },
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 205

```text
  200:   if (command.kind === "project_focus_set") {
  201:     const updated = updateProjectFocus(project.slug, command.focus);
  202:     return {
  203:       ok: true,
  204:       title: "Project Focus Updated",
> 205:       message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
  206:       data: { project: updated },
  207:     };
  208:   }
  209: 
  210:   const updated = updateProjectNextAction(project.slug, command.nextAction);
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 210

```text
  205:       message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
  206:       data: { project: updated },
  207:     };
  208:   }
  209: 
> 210:   const updated = updateProjectNextAction(project.slug, command.nextAction);
  211:   return {
  212:     ok: true,
  213:     title: "Project Next Action Updated",
  214:     message: `${updated.name}\nNext action: ${updated.nextAction}\nWorkspace: /projects/${updated.slug}`,
  215:     data: { project: updated },
```

### `lib\modules\project-operations\commands\executeProjectOperationsCommand.ts` line 214

```text
  209: 
  210:   const updated = updateProjectNextAction(project.slug, command.nextAction);
  211:   return {
  212:     ok: true,
  213:     title: "Project Next Action Updated",
> 214:     message: `${updated.name}\nNext action: ${updated.nextAction}\nWorkspace: /projects/${updated.slug}`,
  215:     data: { project: updated },
  216:   };
  217: }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 62

```text
   57:       raw: message,
   58:       action: "status",
   59:       target: "project",
   60:       confidence: 0.99,
   61:       reason: "project operations parsed explicit status command",
>  62:       moduleCommand: { kind: "project_operations_status" },
   63:     });
   64:   }
   65: 
   66:   if (/^(?:list|show) projects$/i.test(normalized)) {
   67:     return buildCommand({
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 66

```text
   61:       reason: "project operations parsed explicit status command",
   62:       moduleCommand: { kind: "project_operations_status" },
   63:     });
   64:   }
   65: 
>  66:   if (/^(?:list|show) projects$/i.test(normalized)) {
   67:     return buildCommand({
   68:       raw: message,
   69:       action: "show",
   70:       target: "project",
   71:       confidence: 0.98,
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 73

```text
   68:       raw: message,
   69:       action: "show",
   70:       target: "project",
   71:       confidence: 0.98,
   72:       reason: "project operations parsed project list command",
>  73:       moduleCommand: { kind: "project_list" },
   74:     });
   75:   }
   76: 
   77:   if (/^(?:list|show) urgent (?:project )?tasks$/i.test(normalized)) {
   78:     return buildCommand({
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 81

```text
   76: 
   77:   if (/^(?:list|show) urgent (?:project )?tasks$/i.test(normalized)) {
   78:     return buildCommand({
   79:       raw: message,
   80:       action: "show",
>  81:       target: "project_task",
   82:       confidence: 0.99,
   83:       reason: "project operations parsed urgent task list command",
   84:       moduleCommand: { kind: "project_urgent_list" },
   85:     });
   86:   }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 84

```text
   79:       raw: message,
   80:       action: "show",
   81:       target: "project_task",
   82:       confidence: 0.99,
   83:       reason: "project operations parsed urgent task list command",
>  84:       moduleCommand: { kind: "project_urgent_list" },
   85:     });
   86:   }
   87: 
   88:   const showProjectMatch = normalized.match(/^show project\s+(.+)$/i);
   89:   if (showProjectMatch?.[1]) {
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 98

```text
   93:       action: "show",
   94:       target: "project",
   95:       query: projectQuery,
   96:       confidence: 0.97,
   97:       reason: "project operations parsed explicit project lookup",
>  98:       moduleCommand: { kind: "project_show", projectQuery },
   99:     });
  100:   }
  101: 
  102:   const createProjectMatch = normalized.match(
  103:     /^create project(?: named)?\s*:\s*(.+)$/i,
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 114

```text
  109:       action: "create",
  110:       target: "project",
  111:       query: name,
  112:       confidence: 0.99,
  113:       reason: "project operations parsed explicit project creation",
> 114:       moduleCommand: { kind: "project_create", name },
  115:     });
  116:   }
  117: 
  118:   const addTaskMatch = normalized.match(
  119:     /^(?:add|create) (urgent )?task to (.+?)\s*:\s*(.+)$/i,
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 127

```text
  122:     const projectQuery = addTaskMatch[2].trim();
  123:     const title = addTaskMatch[3].trim();
  124:     return buildCommand({
  125:       raw: message,
  126:       action: "create",
> 127:       target: "project_task",
  128:       query: title,
  129:       confidence: 0.99,
  130:       reason: "project operations parsed explicit task creation",
  131:       moduleCommand: {
  132:         kind: "project_task_add",
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 132

```text
  127:       target: "project_task",
  128:       query: title,
  129:       confidence: 0.99,
  130:       reason: "project operations parsed explicit task creation",
  131:       moduleCommand: {
> 132:         kind: "project_task_add",
  133:         projectQuery,
  134:         title,
  135:         urgent: Boolean(addTaskMatch[1]),
  136:       },
  137:     });
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 149

```text
  144:     const taskIdentifier = moveTaskMatch[1];
  145:     const column = moveTaskMatch[2].toLowerCase() as TaskColumnId;
  146:     return buildCommand({
  147:       raw: message,
  148:       action: "revise",
> 149:       target: "project_task",
  150:       query: taskIdentifier,
  151:       confidence: 0.99,
  152:       reason: "project operations parsed explicit task movement",
  153:       moduleCommand: {
  154:         kind: "project_task_move",
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 154

```text
  149:       target: "project_task",
  150:       query: taskIdentifier,
  151:       confidence: 0.99,
  152:       reason: "project operations parsed explicit task movement",
  153:       moduleCommand: {
> 154:         kind: "project_task_move",
  155:         taskIdentifier,
  156:         column,
  157:       },
  158:     });
  159:   }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 168

```text
  163:   );
  164:   if (completeTaskMatch?.[1]) {
  165:     return buildCommand({
  166:       raw: message,
  167:       action: "complete",
> 168:       target: "project_task",
  169:       query: completeTaskMatch[1],
  170:       confidence: 0.99,
  171:       reason: "project operations parsed explicit task completion",
  172:       moduleCommand: {
  173:         kind: "project_task_complete",
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 173

```text
  168:       target: "project_task",
  169:       query: completeTaskMatch[1],
  170:       confidence: 0.99,
  171:       reason: "project operations parsed explicit task completion",
  172:       moduleCommand: {
> 173:         kind: "project_task_complete",
  174:         taskIdentifier: completeTaskMatch[1],
  175:       },
  176:     });
  177:   }
  178: 
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 193

```text
  188:       target: "project",
  189:       query: projectQuery,
  190:       confidence: 0.99,
  191:       reason: "project operations parsed focus update",
  192:       moduleCommand: {
> 193:         kind: "project_focus_set",
  194:         projectQuery,
  195:         focus,
  196:       },
  197:     });
  198:   }
```

### `lib\modules\project-operations\commands\parseProjectOperationsCommand.ts` line 214

```text
  209:       target: "project",
  210:       query: projectQuery,
  211:       confidence: 0.99,
  212:       reason: "project operations parsed next-action update",
  213:       moduleCommand: {
> 214:         kind: "project_next_action_set",
  215:         projectQuery,
  216:         nextAction,
  217:       },
  218:     });
  219:   }
```

### `lib\modules\project-operations\module.ts` line 14

```text
    9: ): value is ProjectOperationsModuleCommand {
   10:   if (!value || typeof value !== "object") return false;
   11:   const command = value as { kind?: unknown };
   12: 
   13:   return (
>  14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
```

### `lib\modules\project-operations\module.ts` line 15

```text
   10:   if (!value || typeof value !== "object") return false;
   11:   const command = value as { kind?: unknown };
   12: 
   13:   return (
   14:     command.kind === "project_operations_status" ||
>  15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
```

### `lib\modules\project-operations\module.ts` line 16

```text
   11:   const command = value as { kind?: unknown };
   12: 
   13:   return (
   14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
>  16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
```

### `lib\modules\project-operations\module.ts` line 17

```text
   12: 
   13:   return (
   14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
>  17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
```

### `lib\modules\project-operations\module.ts` line 18

```text
   13:   return (
   14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
>  18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
   23:     command.kind === "project_next_action_set"
```

### `lib\modules\project-operations\module.ts` line 19

```text
   14:     command.kind === "project_operations_status" ||
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
>  19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
   23:     command.kind === "project_next_action_set"
   24:   );
```

### `lib\modules\project-operations\module.ts` line 20

```text
   15:     command.kind === "project_list" ||
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
>  20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
   23:     command.kind === "project_next_action_set"
   24:   );
   25: }
```

### `lib\modules\project-operations\module.ts` line 21

```text
   16:     command.kind === "project_urgent_list" ||
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
>  21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
   23:     command.kind === "project_next_action_set"
   24:   );
   25: }
   26: 
```

### `lib\modules\project-operations\module.ts` line 22

```text
   17:     command.kind === "project_show" ||
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
>  22:     command.kind === "project_focus_set" ||
   23:     command.kind === "project_next_action_set"
   24:   );
   25: }
   26: 
   27: export const projectOperationsModule: ChernobogModule = {
```

### `lib\modules\project-operations\module.ts` line 23

```text
   18:     command.kind === "project_create" ||
   19:     command.kind === "project_task_add" ||
   20:     command.kind === "project_task_move" ||
   21:     command.kind === "project_task_complete" ||
   22:     command.kind === "project_focus_set" ||
>  23:     command.kind === "project_next_action_set"
   24:   );
   25: }
   26: 
   27: export const projectOperationsModule: ChernobogModule = {
   28:   id: "project-operations",
```

### `lib\modules\project-operations\repository.ts` line 3

```text
    1: import { db } from "@/lib/chernobog/db";
    2: 
>   3: import { createInitialProjectSeed } from "./seed";
    4: import type { Project } from "./types";
    5: 
    6: type ProjectRow = {
    7:   id: string;
    8:   slug: string;
```

### `lib\modules\project-operations\repository.ts` line 8

```text
    3: import { createInitialProjectSeed } from "./seed";
    4: import type { Project } from "./types";
    5: 
    6: type ProjectRow = {
    7:   id: string;
>   8:   slug: string;
    9:   project_json: string;
   10:   archived: number;
   11:   created_at: string;
   12:   updated_at: string;
   13: };
```

### `lib\modules\project-operations\repository.ts` line 9

```text
    4: import type { Project } from "./types";
    5: 
    6: type ProjectRow = {
    7:   id: string;
    8:   slug: string;
>   9:   project_json: string;
   10:   archived: number;
   11:   created_at: string;
   12:   updated_at: string;
   13: };
   14: 
```

### `lib\modules\project-operations\repository.ts` line 18

```text
   13: };
   14: 
   15: db.pragma("foreign_keys = ON");
   16: 
   17: db.exec(`
>  18:   CREATE TABLE IF NOT EXISTS project_operations_projects (
   19:     id TEXT PRIMARY KEY,
   20:     slug TEXT NOT NULL UNIQUE,
   21:     project_json TEXT NOT NULL,
   22:     archived INTEGER NOT NULL DEFAULT 0,
   23:     created_at TEXT NOT NULL,
```

### `lib\modules\project-operations\repository.ts` line 20

```text
   15: db.pragma("foreign_keys = ON");
   16: 
   17: db.exec(`
   18:   CREATE TABLE IF NOT EXISTS project_operations_projects (
   19:     id TEXT PRIMARY KEY,
>  20:     slug TEXT NOT NULL UNIQUE,
   21:     project_json TEXT NOT NULL,
   22:     archived INTEGER NOT NULL DEFAULT 0,
   23:     created_at TEXT NOT NULL,
   24:     updated_at TEXT NOT NULL
   25:   );
```

### `lib\modules\project-operations\repository.ts` line 21

```text
   16: 
   17: db.exec(`
   18:   CREATE TABLE IF NOT EXISTS project_operations_projects (
   19:     id TEXT PRIMARY KEY,
   20:     slug TEXT NOT NULL UNIQUE,
>  21:     project_json TEXT NOT NULL,
   22:     archived INTEGER NOT NULL DEFAULT 0,
   23:     created_at TEXT NOT NULL,
   24:     updated_at TEXT NOT NULL
   25:   );
   26: 
```

### `lib\modules\project-operations\repository.ts` line 27

```text
   22:     archived INTEGER NOT NULL DEFAULT 0,
   23:     created_at TEXT NOT NULL,
   24:     updated_at TEXT NOT NULL
   25:   );
   26: 
>  27:   CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
   28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
```

### `lib\modules\project-operations\repository.ts` line 28

```text
   23:     created_at TEXT NOT NULL,
   24:     updated_at TEXT NOT NULL
   25:   );
   26: 
   27:   CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
>  28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
```

### `lib\modules\project-operations\repository.ts` line 31

```text
   26: 
   27:   CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
   28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
>  31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
```

### `lib\modules\project-operations\repository.ts` line 32

```text
   27:   CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
   28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
>  32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
```

### `lib\modules\project-operations\repository.ts` line 33

```text
   28:   ON project_operations_projects (archived, updated_at DESC);
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
>  33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
```

### `lib\modules\project-operations\repository.ts` line 34

```text
   29: `);
   30: 
   31: const listProjectsStatement = db.prepare(`
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
>  34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
```

### `lib\modules\project-operations\repository.ts` line 37

```text
   32:   SELECT id, slug, project_json, archived, created_at, updated_at
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
>  37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
   40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
```

### `lib\modules\project-operations\repository.ts` line 38

```text
   33:   FROM project_operations_projects
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
>  38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
   40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
   43: 
```

### `lib\modules\project-operations\repository.ts` line 39

```text
   34:   ORDER BY archived ASC, updated_at DESC, slug ASC
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
>  39:   FROM project_operations_projects
   40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
   43: 
   44: const countProjectsStatement = db.prepare(`
```

### `lib\modules\project-operations\repository.ts` line 40

```text
   35: `);
   36: 
   37: const getProjectBySlugStatement = db.prepare(`
   38:   SELECT id, slug, project_json, archived, created_at, updated_at
   39:   FROM project_operations_projects
>  40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
   43: 
   44: const countProjectsStatement = db.prepare(`
   45:   SELECT COUNT(*) AS count
```

### `lib\modules\project-operations\repository.ts` line 44

```text
   39:   FROM project_operations_projects
   40:   WHERE slug = ?
   41:   LIMIT 1
   42: `);
   43: 
>  44: const countProjectsStatement = db.prepare(`
   45:   SELECT COUNT(*) AS count
   46:   FROM project_operations_projects
   47: `);
   48: 
   49: const upsertProjectStatement = db.prepare(`
```

### `lib\modules\project-operations\repository.ts` line 46

```text
   41:   LIMIT 1
   42: `);
   43: 
   44: const countProjectsStatement = db.prepare(`
   45:   SELECT COUNT(*) AS count
>  46:   FROM project_operations_projects
   47: `);
   48: 
   49: const upsertProjectStatement = db.prepare(`
   50:   INSERT INTO project_operations_projects (
   51:     id,
```

### `lib\modules\project-operations\repository.ts` line 49

```text
   44: const countProjectsStatement = db.prepare(`
   45:   SELECT COUNT(*) AS count
   46:   FROM project_operations_projects
   47: `);
   48: 
>  49: const upsertProjectStatement = db.prepare(`
   50:   INSERT INTO project_operations_projects (
   51:     id,
   52:     slug,
   53:     project_json,
   54:     archived,
```

### `lib\modules\project-operations\repository.ts` line 50

```text
   45:   SELECT COUNT(*) AS count
   46:   FROM project_operations_projects
   47: `);
   48: 
   49: const upsertProjectStatement = db.prepare(`
>  50:   INSERT INTO project_operations_projects (
   51:     id,
   52:     slug,
   53:     project_json,
   54:     archived,
   55:     created_at,
```

### `lib\modules\project-operations\repository.ts` line 52

```text
   47: `);
   48: 
   49: const upsertProjectStatement = db.prepare(`
   50:   INSERT INTO project_operations_projects (
   51:     id,
>  52:     slug,
   53:     project_json,
   54:     archived,
   55:     created_at,
   56:     updated_at
   57:   )
```

### `lib\modules\project-operations\repository.ts` line 53

```text
   48: 
   49: const upsertProjectStatement = db.prepare(`
   50:   INSERT INTO project_operations_projects (
   51:     id,
   52:     slug,
>  53:     project_json,
   54:     archived,
   55:     created_at,
   56:     updated_at
   57:   )
   58:   VALUES (?, ?, ?, ?, ?, ?)
```

### `lib\modules\project-operations\repository.ts` line 60

```text
   55:     created_at,
   56:     updated_at
   57:   )
   58:   VALUES (?, ?, ?, ?, ?, ?)
   59:   ON CONFLICT(id) DO UPDATE SET
>  60:     slug = excluded.slug,
   61:     project_json = excluded.project_json,
   62:     archived = excluded.archived,
   63:     updated_at = excluded.updated_at
   64: `);
   65: 
```

### `lib\modules\project-operations\repository.ts` line 61

```text
   56:     updated_at
   57:   )
   58:   VALUES (?, ?, ?, ?, ?, ?)
   59:   ON CONFLICT(id) DO UPDATE SET
   60:     slug = excluded.slug,
>  61:     project_json = excluded.project_json,
   62:     archived = excluded.archived,
   63:     updated_at = excluded.updated_at
   64: `);
   65: 
   66: function isProject(value: unknown): value is Project {
```

### `lib\modules\project-operations\repository.ts` line 72

```text
   67:   if (!value || typeof value !== "object") return false;
   68: 
   69:   const candidate = value as Partial<Project>;
   70:   return (
   71:     typeof candidate.id === "string" &&
>  72:     typeof candidate.slug === "string" &&
   73:     typeof candidate.name === "string" &&
   74:     Array.isArray(candidate.boards) &&
   75:     Array.isArray(candidate.notes) &&
   76:     Array.isArray(candidate.links) &&
   77:     Array.isArray(candidate.activity)
```

### `lib\modules\project-operations\repository.ts` line 83

```text
   78:   );
   79: }
   80: 
   81: function parseProjectRow(row: ProjectRow): Project | undefined {
   82:   try {
>  83:     const parsed = JSON.parse(row.project_json) as unknown;
   84:     if (!isProject(parsed)) return undefined;
   85: 
   86:     return {
   87:       ...parsed,
   88:       archived: Boolean(row.archived),
```

### `lib\modules\project-operations\repository.ts` line 98

```text
   93:     return undefined;
   94:   }
   95: }
   96: 
   97: function writeProjectUnsafe(project: Project): void {
>  98:   upsertProjectStatement.run(
   99:     project.id,
  100:     project.slug,
  101:     JSON.stringify(project),
  102:     project.archived ? 1 : 0,
  103:     project.createdAt,
```

### `lib\modules\project-operations\repository.ts` line 100

```text
   95: }
   96: 
   97: function writeProjectUnsafe(project: Project): void {
   98:   upsertProjectStatement.run(
   99:     project.id,
> 100:     project.slug,
  101:     JSON.stringify(project),
  102:     project.archived ? 1 : 0,
  103:     project.createdAt,
  104:     project.updatedAt,
  105:   );
```

### `lib\modules\project-operations\repository.ts` line 108

```text
  103:     project.createdAt,
  104:     project.updatedAt,
  105:   );
  106: }
  107: 
> 108: const seedProjectsTransaction = db.transaction((projects: Project[]) => {
  109:   for (const project of projects) {
  110:     writeProjectUnsafe(project);
  111:   }
  112: });
  113: 
```

### `lib\modules\project-operations\repository.ts` line 109

```text
  104:     project.updatedAt,
  105:   );
  106: }
  107: 
  108: const seedProjectsTransaction = db.transaction((projects: Project[]) => {
> 109:   for (const project of projects) {
  110:     writeProjectUnsafe(project);
  111:   }
  112: });
  113: 
  114: export function ensureProjectOperationsSeeded(): void {
```

### `lib\modules\project-operations\repository.ts` line 115

```text
  110:     writeProjectUnsafe(project);
  111:   }
  112: });
  113: 
  114: export function ensureProjectOperationsSeeded(): void {
> 115:   const result = countProjectsStatement.get() as { count: number };
  116: 
  117:   if (result.count > 0) return;
  118:   seedProjectsTransaction(createInitialProjectSeed());
  119: }
  120: 
```

### `lib\modules\project-operations\repository.ts` line 118

```text
  113: 
  114: export function ensureProjectOperationsSeeded(): void {
  115:   const result = countProjectsStatement.get() as { count: number };
  116: 
  117:   if (result.count > 0) return;
> 118:   seedProjectsTransaction(createInitialProjectSeed());
  119: }
  120: 
  121: export function readAllProjects(): Project[] {
  122:   ensureProjectOperationsSeeded();
  123: 
```

### `lib\modules\project-operations\repository.ts` line 121

```text
  116: 
  117:   if (result.count > 0) return;
  118:   seedProjectsTransaction(createInitialProjectSeed());
  119: }
  120: 
> 121: export function readAllProjects(): Project[] {
  122:   ensureProjectOperationsSeeded();
  123: 
  124:   return (listProjectsStatement.all() as ProjectRow[])
  125:     .map(parseProjectRow)
  126:     .filter((project): project is Project => Boolean(project));
```

### `lib\modules\project-operations\repository.ts` line 124

```text
  119: }
  120: 
  121: export function readAllProjects(): Project[] {
  122:   ensureProjectOperationsSeeded();
  123: 
> 124:   return (listProjectsStatement.all() as ProjectRow[])
  125:     .map(parseProjectRow)
  126:     .filter((project): project is Project => Boolean(project));
  127: }
  128: 
  129: export function readProjectBySlug(slug: string): Project | undefined {
```

### `lib\modules\project-operations\repository.ts` line 129

```text
  124:   return (listProjectsStatement.all() as ProjectRow[])
  125:     .map(parseProjectRow)
  126:     .filter((project): project is Project => Boolean(project));
  127: }
  128: 
> 129: export function readProjectBySlug(slug: string): Project | undefined {
  130:   ensureProjectOperationsSeeded();
  131:   const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
  132:   return row ? parseProjectRow(row) : undefined;
  133: }
  134: 
```

### `lib\modules\project-operations\repository.ts` line 131

```text
  126:     .filter((project): project is Project => Boolean(project));
  127: }
  128: 
  129: export function readProjectBySlug(slug: string): Project | undefined {
  130:   ensureProjectOperationsSeeded();
> 131:   const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
  132:   return row ? parseProjectRow(row) : undefined;
  133: }
  134: 
  135: export function writeProject(project: Project): void {
  136:   ensureProjectOperationsSeeded();
```

### `lib\modules\project-operations\seed.ts` line 5

```text
    1: import { randomUUID } from "node:crypto";
    2: 
    3: import type { Project } from "./types";
    4: 
>   5: function createProjectSeed(args: {
    6:   name: string;
    7:   slug: string;
    8:   summary: string;
    9:   repoName: string;
   10:   focus: string;
```

### `lib\modules\project-operations\seed.ts` line 7

```text
    2: 
    3: import type { Project } from "./types";
    4: 
    5: function createProjectSeed(args: {
    6:   name: string;
>   7:   slug: string;
    8:   summary: string;
    9:   repoName: string;
   10:   focus: string;
   11:   nextAction: string;
   12:   note: string;
```

### `lib\modules\project-operations\seed.ts` line 19

```text
   14:   const now = new Date().toISOString();
   15: 
   16:   return {
   17:     id: randomUUID(),
   18:     name: args.name,
>  19:     slug: args.slug,
   20:     summary: args.summary,
   21:     status: "Active",
   22:     repoHealth: "Watch",
   23:     repoName: args.repoName,
   24:     focus: args.focus,
```

### `lib\modules\project-operations\seed.ts` line 55

```text
   50:     activity: [
   51:       {
   52:         id: randomUUID(),
   53:         type: "system",
   54:         summary: "Project added to Chernobog Project Operations",
>  55:         detail: "Initial workspace created during first-run setup.",
   56:         createdAt: now,
   57:       },
   58:     ],
   59:   };
   60: }
```

### `lib\modules\project-operations\seed.ts` line 62

```text
   57:       },
   58:     ],
   59:   };
   60: }
   61: 
>  62: export function createInitialProjectSeed(): Project[] {
   63:   return [
   64:     createProjectSeed({
   65:       name: "Chernobog",
   66:       slug: "chernobog",
   67:       summary:
```

### `lib\modules\project-operations\seed.ts` line 64

```text
   59:   };
   60: }
   61: 
   62: export function createInitialProjectSeed(): Project[] {
   63:   return [
>  64:     createProjectSeed({
   65:       name: "Chernobog",
   66:       slug: "chernobog",
   67:       summary:
   68:         "Vault-grounded personal AI assistant with controlled tools, operational workflows, memory, and sensory systems.",
   69:       repoName: "chernobog-ai",
```

### `lib\modules\project-operations\seed.ts` line 66

```text
   61: 
   62: export function createInitialProjectSeed(): Project[] {
   63:   return [
   64:     createProjectSeed({
   65:       name: "Chernobog",
>  66:       slug: "chernobog",
   67:       summary:
   68:         "Vault-grounded personal AI assistant with controlled tools, operational workflows, memory, and sensory systems.",
   69:       repoName: "chernobog-ai",
   70:       focus: "Operational command center and the locked V6.x sensory workflow arc.",
   71:       nextAction: "Use Project Operations as the source of truth for active Chernobog work.",
```

### `lib\modules\project-operations\seed.ts` line 75

```text
   70:       focus: "Operational command center and the locked V6.x sensory workflow arc.",
   71:       nextAction: "Use Project Operations as the source of truth for active Chernobog work.",
   72:       note:
   73:         "V6.x is the sensory workflow arc: command center, vision, hearing, observation packets, prompt chains, sensory control, proactive review, and trust controls.",
   74:     }),
>  75:     createProjectSeed({
   76:       name: "QuestLedger",
   77:       slug: "questledger",
   78:       summary:
   79:         "Customisable Kotlin Android TTRPG companion focused on character play, homebrew content, and DM support.",
   80:       repoName: "QuestLedger",
```

### `lib\modules\project-operations\seed.ts` line 77

```text
   72:       note:
   73:         "V6.x is the sensory workflow arc: command center, vision, hearing, observation packets, prompt chains, sensory control, proactive review, and trust controls.",
   74:     }),
   75:     createProjectSeed({
   76:       name: "QuestLedger",
>  77:       slug: "questledger",
   78:       summary:
   79:         "Customisable Kotlin Android TTRPG companion focused on character play, homebrew content, and DM support.",
   80:       repoName: "QuestLedger",
   81:       focus: "Character customisation, equipment-driven stats, weapon rolls, and playable session workflows.",
   82:       nextAction: "Record the next concrete QuestLedger implementation slice.",
```

### `lib\modules\project-operations\seed.ts` line 86

```text
   81:       focus: "Character customisation, equipment-driven stats, weapon rolls, and playable session workflows.",
   82:       nextAction: "Record the next concrete QuestLedger implementation slice.",
   83:       note:
   84:         "QuestLedger should stay free and customisable, with custom races, weapons, initiative, inventory, combat rolls, and campaign tools.",
   85:     }),
>  86:     createProjectSeed({
   87:       name: "Homelab",
   88:       slug: "homelab",
   89:       summary:
   90:         "Private self-hosted infrastructure for Chernobog, storage, monitoring, backups, and personal services.",
   91:       repoName: "homelab-operations",
```

### `lib\modules\project-operations\seed.ts` line 88

```text
   83:       note:
   84:         "QuestLedger should stay free and customisable, with custom races, weapons, initiative, inventory, combat rolls, and campaign tools.",
   85:     }),
   86:     createProjectSeed({
   87:       name: "Homelab",
>  88:       slug: "homelab",
   89:       summary:
   90:         "Private self-hosted infrastructure for Chernobog, storage, monitoring, backups, and personal services.",
   91:       repoName: "homelab-operations",
   92:       focus: "Phase 10 disaster recovery, rebuildability, and secure unattended recovery.",
   93:       nextAction: "Continue from the verified Phase 10A system inventory.",
```

### `lib\modules\project-operations\service.ts` line 3

```text
    1: import { randomUUID } from "node:crypto";
    2: 
>   3: import { readAllProjects, readProjectBySlug, writeProject } from "./repository";
    4: import type {
    5:   ActivityType,
    6:   Project,
    7:   ProjectActivityEntry,
    8:   ProjectDashboardSnapshot,
```

### `lib\modules\project-operations\service.ts` line 12

```text
    7:   ProjectActivityEntry,
    8:   ProjectDashboardSnapshot,
    9:   ProjectLinkInput,
   10:   ProjectNoteInput,
   11:   ProjectNoteResult,
>  12:   ProjectSettingsInput,
   13:   ProjectStats,
   14:   ProjectStatus,
   15:   ProjectTaskCard,
   16:   ProjectTaskResult,
   17:   RecentActivityResult,
```

### `lib\modules\project-operations\service.ts` line 13

```text
    8:   ProjectDashboardSnapshot,
    9:   ProjectLinkInput,
   10:   ProjectNoteInput,
   11:   ProjectNoteResult,
   12:   ProjectSettingsInput,
>  13:   ProjectStats,
   14:   ProjectStatus,
   15:   ProjectTaskCard,
   16:   ProjectTaskResult,
   17:   RecentActivityResult,
   18:   RepoHealth,
```

### `lib\modules\project-operations\service.ts` line 14

```text
    9:   ProjectLinkInput,
   10:   ProjectNoteInput,
   11:   ProjectNoteResult,
   12:   ProjectSettingsInput,
   13:   ProjectStats,
>  14:   ProjectStatus,
   15:   ProjectTaskCard,
   16:   ProjectTaskResult,
   17:   RecentActivityResult,
   18:   RepoHealth,
   19:   TaskCardInput,
```

### `lib\modules\project-operations\service.ts` line 26

```text
   21:   TaskPriority,
   22: } from "./types";
   23: 
   24: const VALID_COLUMNS: TaskColumnId[] = ["backlog", "next", "doing", "done"];
   25: const VALID_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
>  26: const VALID_STATUSES: ProjectStatus[] = [
   27:   "Active",
   28:   "Planning",
   29:   "Blocked",
   30:   "Polish",
   31:   "Archived",
```

### `lib\modules\project-operations\service.ts` line 43

```text
   38: 
   39: function nowIso(): string {
   40:   return new Date().toISOString();
   41: }
   42: 
>  43: function slugify(value: string): string {
   44:   return value
   45:     .trim()
   46:     .toLowerCase()
   47:     .replace(/[^a-z0-9]+/g, "-")
   48:     .replace(/^-+|-+$/g, "") || "project";
```

### `lib\modules\project-operations\service.ts` line 75

```text
   70: 
   71: function getProjectCards(project: Project): ProjectTaskCard[] {
   72:   return project.boards.flatMap((board) => board.cards);
   73: }
   74: 
>  75: export function getAllProjects(options?: { includeArchived?: boolean }): Project[] {
   76:   const projects = readAllProjects();
   77:   return options?.includeArchived
   78:     ? projects
   79:     : projects.filter((project) => !project.archived);
   80: }
```

### `lib\modules\project-operations\service.ts` line 76

```text
   71: function getProjectCards(project: Project): ProjectTaskCard[] {
   72:   return project.boards.flatMap((board) => board.cards);
   73: }
   74: 
   75: export function getAllProjects(options?: { includeArchived?: boolean }): Project[] {
>  76:   const projects = readAllProjects();
   77:   return options?.includeArchived
   78:     ? projects
   79:     : projects.filter((project) => !project.archived);
   80: }
   81: 
```

### `lib\modules\project-operations\service.ts` line 78

```text
   73: }
   74: 
   75: export function getAllProjects(options?: { includeArchived?: boolean }): Project[] {
   76:   const projects = readAllProjects();
   77:   return options?.includeArchived
>  78:     ? projects
   79:     : projects.filter((project) => !project.archived);
   80: }
   81: 
   82: export function getProjectBySlug(slug: string): Project | undefined {
   83:   const project = readProjectBySlug(slug);
```


## Suggested implementation target

```text
Project Operations project.slug
        -> command/workspace request
        -> SessionContext.activeProjectId (or existing equivalent)
        -> runCommand project context
        -> buildUnifiedMemoryContext({ projectId })
        -> project-scoped 11E retrieval
        -> 11G / 11J context when existing APIs support project identity
```

The mutation patch should use the exact local symbols found above.
