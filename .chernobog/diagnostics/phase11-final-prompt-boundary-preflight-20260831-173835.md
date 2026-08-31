# Chernobog Phase 11 - Final Prompt Boundary Preflight

Generated: 2026-08-31T17:38:35.1206781+01:00

Purpose: trace the already-correct 11J model-facing context from runCommand composition to the final Ollama transport boundary.

Known-good runtime context before this diagnostic:
- canonical 11J dependency graph exists
- model-facing builder contains requires-model and served-by
- complete role -> model -> Ollama chains exist
- model:ollama impact assessment is non-empty
- supported prediction count is zero

## World Model builder and composition in normal command path

Pattern: `worldModelContext|buildChernobogWorldModelContext|systemText`

### lib\chernobog\pipeline\runCommand.ts line 52

```text
   40:   looksLikeVagueFileRequest,
   41:   tryFileSearchFallback,
   42: } from "./toolExecution";
   43: import { orchestrateMessage } from "@/lib/chernobog/orchestration/orchestrator";
   44: import {
   45:   addTraceStep,
   46:   createTrustTrace,
   47:   setTraceRoute,
   48:   setTraceTool,
   49: } from "@/lib/chernobog/trust/trace";
   50: 
   51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
>  52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
   63:   buildProjectGroundedSystemText,
   64:   resolveActiveProjectContext,
```

### lib\chernobog\pipeline\runCommand.ts line 63

```text
   51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
   52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
>  63:   buildProjectGroundedSystemText,
   64:   resolveActiveProjectContext,
   65: } from "@/lib/chernobog/project/activeProjectContext";
   66: import {
   67:   buildExecutionDiagnostics,
   68:   executeFromMessage,
   69:   type ExecutionState,
   70: } from "@/lib/chernobog/execution";
   71: 
   72: import {
   73:   detectMemoryArchitectureCommand,
   74:   runMemoryArchitectureCommand,
   75: } from "@/lib/chernobog/memory-architecture/commands";
```

### lib\chernobog\pipeline\runCommand.ts line 1076

```text
 1064: 
 1065:             const activeSession = getSessionContext(sessionId);
 1066:             const storedMemories = getMemories(12);
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
>1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
```

### lib\chernobog\pipeline\runCommand.ts line 1077

```text
 1065:             const activeSession = getSessionContext(sessionId);
 1066:             const storedMemories = getMemories(12);
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
 1076:             const worldModelContext =
>1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
```

### lib\chernobog\pipeline\runCommand.ts line 1116

```text
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
>1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
```

### lib\chernobog\pipeline\runCommand.ts line 1118

```text
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
>1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
```

### lib\chernobog\pipeline\runCommand.ts line 1121

```text
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
>1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
 1131:           }
 1132:         }
 1133:       }
```


## Final model invocation boundary

Pattern: `callOllama|generateOllama|chatOllama|ollamaClient|messages\s*:|system\s*:|prompt\s*:`

### lib\chernobog\pipeline\runCommand.ts line 1096

```text
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
 1091:                 : recentMessages;
 1092: 
 1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
>1096:               recentMessages: modelRecentMessages,
 1097:               userMessage,
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
```

### lib\chernobog\pipeline\runCommand.ts line 1115

```text
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
>1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
```

### lib\chernobog\router.ts line 6

```text
    1: import {
    2:   generateWithReliableOllama as generateWithOllama,
    3: } from "./llm/reliableOllama";
    4: import type {
    5:   OllamaChatMessage,
>   6: } from "./llm/ollamaClient";
    7: import type {
    8:   ModelRole,
    9: } from "./llm/modelRouter";
   10: 
   11: const ROUTED_RESPONSE_NUM_PREDICT = 2048;
   12: 
   13: export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";
   14: 
   15: export type OllamaMessage = OllamaChatMessage;
   16: 
   17: type ResponseContext = {
   18:   memories?: string[];
   19:   recentMessages?: OllamaMessage[];
   20:   sessionSummary?: string;
```

### lib\chernobog\router.ts line 116

```text
  102:   guardian: `
  103: ${BASE_IDENTITY}
  104: You are the guardian fragment.
  105: Handle unsafe or clearly harmful requests with a brief refusal and safer redirection where possible.
  106: Do not over-refuse harmless software questions.
  107: `.trim(),
  108: };
  109: 
  110: function roleForRoute(route: RouteName): ModelRole {
  111:   return route === "planner"
  112:     ? "planner"
  113:     : "default";
  114: }
  115: 
> 116: async function callOllama(
  117:   messages: OllamaMessage[],
  118:   options: {
  119:     role?: ModelRole;
  120:     temperature?: number;
  121:     numPredict?: number;
  122:   } = {},
  123: ): Promise<string> {
  124:   const result = await generateWithOllama({
  125:     role: options.role ?? "default",
  126:     messages,
  127:     temperature: options.temperature ?? 0.4,
  128:     numPredict: options.numPredict ?? 500,
  129:   });
  130: 
```

### lib\chernobog\router.ts line 117

```text
  103: ${BASE_IDENTITY}
  104: You are the guardian fragment.
  105: Handle unsafe or clearly harmful requests with a brief refusal and safer redirection where possible.
  106: Do not over-refuse harmless software questions.
  107: `.trim(),
  108: };
  109: 
  110: function roleForRoute(route: RouteName): ModelRole {
  111:   return route === "planner"
  112:     ? "planner"
  113:     : "default";
  114: }
  115: 
  116: async function callOllama(
> 117:   messages: OllamaMessage[],
  118:   options: {
  119:     role?: ModelRole;
  120:     temperature?: number;
  121:     numPredict?: number;
  122:   } = {},
  123: ): Promise<string> {
  124:   const result = await generateWithOllama({
  125:     role: options.role ?? "default",
  126:     messages,
  127:     temperature: options.temperature ?? 0.4,
  128:     numPredict: options.numPredict ?? 500,
  129:   });
  130: 
  131:   if (!result.ok || !result.text) {
```

### lib\chernobog\router.ts line 147

```text
  133:       result.error ??
  134:         "No response returned from the local model.",
  135:     );
  136:   }
  137: 
  138:   return result.text;
  139: }
  140: 
  141: function normalizeRoute(raw: string): RouteName {
  142:   const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  143:   return (match?.[1] as RouteName) ?? "chat";
  144: }
  145: 
  146: export async function routeMessage(userMessage: string): Promise<RouteName> {
> 147:   const rawRoute = await callOllama(
  148:     [
  149:       { role: "system", content: ROUTER_PROMPT },
  150:       { role: "user", content: userMessage },
  151:     ],
  152:     {
  153:       role: "default",
  154:     },
  155:   );
  156: 
  157:   return normalizeRoute(rawRoute);
  158: }
  159: 
  160: export async function respondForRoute(
  161:   route: RouteName,
```

### lib\chernobog\router.ts line 165

```text
  151:     ],
  152:     {
  153:       role: "default",
  154:     },
  155:   );
  156: 
  157:   return normalizeRoute(rawRoute);
  158: }
  159: 
  160: export async function respondForRoute(
  161:   route: RouteName,
  162:   userMessage: string,
  163:   context: ResponseContext = {}
  164: ): Promise<string> {
> 165:   const messages: OllamaMessage[] = [
  166:     {
  167:       role: "system",
  168:       content: ROUTE_PROMPTS[route],
  169:     },
  170:   ];
  171: 
  172:   if (context.memories && context.memories.length > 0) {
  173:     messages.push({
  174:       role: "system",
  175:       content: [
  176:         "Persisted user memories:",
  177:         ...context.memories.map((memory) => `- ${memory}`),
  178:         "Use these only when relevant.",
  179:         "Never invent additional memories.",
```

### lib\chernobog\router.ts line 218

```text
  204:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  205:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  206:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  207:       ].join("\n"),
  208:     });
  209:   }
  210: 
  211: 
  212: 
  213:   messages.push({
  214:     role: "user",
  215:     content: userMessage,
  216:   });
  217: 
> 218:   return callOllama(
  219:     messages,
  220:     {
  221:       role: roleForRoute(route),
  222:     numPredict: ROUTED_RESPONSE_NUM_PREDICT,
  223:     },
  224:   );
  225: }
  226: 
```


## System/context concatenation and ordering

Pattern: `grounded|systemContext|systemPrompt|systemText|join\(|concat|memoryContext|worldStateContext|worldModelContext|recentMessages`

### lib\chernobog\pipeline\runCommand.ts line 8

```text
    1: import { respondForRoute, routeMessage } from "@/lib/chernobog/router";
    2: import {
    3:   clearAllMemories,
    4:   deleteMemory,
    5:   extractForgetFact,
    6:   extractMemoryFact,
    7:   getMemories,
>   8:   getRecentMessages,
    9:   isForgetRequest,
   10:   isRecallRequest,
   11:   isRememberRequest,
   12:   isWipeMemoriesRequest,
   13:   saveMemory,
   14:   saveMessage,
   15: } from "@/lib/chernobog/memory";
   16: 
   17: import { parseToolCommand } from "@/lib/chernobog/tools/parser";
   18: import { classifyToolIntent } from "@/lib/chernobog/tools/intent";
```

### lib\chernobog\pipeline\runCommand.ts line 51

```text
   41:   tryFileSearchFallback,
   42: } from "./toolExecution";
   43: import { orchestrateMessage } from "@/lib/chernobog/orchestration/orchestrator";
   44: import {
   45:   addTraceStep,
   46:   createTrustTrace,
   47:   setTraceRoute,
   48:   setTraceTool,
   49: } from "@/lib/chernobog/trust/trace";
   50: 
>  51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
   52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
```

### lib\chernobog\pipeline\runCommand.ts line 52

```text
   42: } from "./toolExecution";
   43: import { orchestrateMessage } from "@/lib/chernobog/orchestration/orchestrator";
   44: import {
   45:   addTraceStep,
   46:   createTrustTrace,
   47:   setTraceRoute,
   48:   setTraceTool,
   49: } from "@/lib/chernobog/trust/trace";
   50: 
   51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
>  52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
```

### lib\chernobog\pipeline\runCommand.ts line 61

```text
   51: import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
   52: import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
>  61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
   63:   buildProjectGroundedSystemText,
   64:   resolveActiveProjectContext,
   65: } from "@/lib/chernobog/project/activeProjectContext";
   66: import {
   67:   buildExecutionDiagnostics,
   68:   executeFromMessage,
   69:   type ExecutionState,
   70: } from "@/lib/chernobog/execution";
   71: 
```

### lib\chernobog\pipeline\runCommand.ts line 63

```text
   53: import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
   54: import {
   55:   buildContinuityReply,
   56:   detectContinuityQuery,
   57: } from "@/lib/chernobog/session/continuity";
   58: 
   59: import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
   60: import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
   61: import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
   62: import {
>  63:   buildProjectGroundedSystemText,
   64:   resolveActiveProjectContext,
   65: } from "@/lib/chernobog/project/activeProjectContext";
   66: import {
   67:   buildExecutionDiagnostics,
   68:   executeFromMessage,
   69:   type ExecutionState,
   70: } from "@/lib/chernobog/execution";
   71: 
   72: import {
   73:   detectMemoryArchitectureCommand,
```

### lib\chernobog\pipeline\runCommand.ts line 232

```text
  222:     );
  223: 
  224:     saveMessage("user", userMessage, route, sessionId);
  225: 
  226:     const vaultBrainResult = await executeVaultBrainCommand(userMessage);
  227: 
  228:     reply = [
  229:       vaultBrainResult.title,
  230:       "",
  231:       vaultBrainResult.message,
> 232:     ].join("\n");
  233: 
  234:     return finalizePipelinePayload(sessionId, route, reply, trace);
  235:   }
  236: 
  237:   if (isContentReviewCommand(userMessage)) {
  238:     route = "tools";
  239:     setTraceRoute(trace, route);
  240: 
  241:     addTraceStep(
  242:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 257

```text
  247:     );
  248: 
  249:     saveMessage("user", userMessage, route, sessionId);
  250: 
  251:     const contentReviewResult = await executeContentReviewCommand(userMessage);
  252: 
  253:     reply = [
  254:       contentReviewResult.title,
  255:       "",
  256:       contentReviewResult.message,
> 257:     ].join("\n");
  258: 
  259:     return finalizePipelinePayload(sessionId, route, reply, trace);
  260:   }
  261: 
  262:   if (isContentIngestCommand(userMessage)) {
  263:     route = "tools";
  264:     setTraceRoute(trace, route);
  265: 
  266:     addTraceStep(
  267:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 282

```text
  272:     );
  273: 
  274:     saveMessage("user", userMessage, route, sessionId);
  275: 
  276:     const contentIngestResult = await executeContentIngestCommand(userMessage);
  277: 
  278:     reply = [
  279:       contentIngestResult.title,
  280:       "",
  281:       contentIngestResult.message,
> 282:     ].join("\n");
  283: 
  284:     return finalizePipelinePayload(sessionId, route, reply, trace);
  285:   }
  286: 
  287:   if (isYouTubeIngestCommand(userMessage)) {
  288:     route = "tools";
  289:     setTraceRoute(trace, route);
  290: 
  291:     addTraceStep(
  292:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 307

```text
  297:     );
  298: 
  299:     saveMessage("user", userMessage, route, sessionId);
  300: 
  301:     const youtubeIngestResult = await executeYouTubeIngestCommand(userMessage);
  302: 
  303:     reply = [
  304:       youtubeIngestResult.title,
  305:       "",
  306:       youtubeIngestResult.message,
> 307:     ].join("\n");
  308: 
  309:     return finalizePipelinePayload(sessionId, route, reply, trace);
  310:   }
  311: 
  312:   if (isSavedContentReliabilityCommand(userMessage)) {
  313:     route = "tools";
  314:     setTraceRoute(trace, route);
  315: 
  316:     addTraceStep(
  317:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 333

```text
  323: 
  324:     saveMessage("user", userMessage, route, sessionId);
  325: 
  326:     const reliabilityResult =
  327:       await executeSavedContentReliabilityCommand(userMessage);
  328: 
  329:     reply = [
  330:       reliabilityResult.title,
  331:       "",
  332:       reliabilityResult.message,
> 333:     ].join("\n");
  334: 
  335:     return finalizePipelinePayload(sessionId, route, reply, trace);
  336:   }
  337: 
  338:   if (isYouTubeOAuthCommand(userMessage)) {
  339:     route = "tools";
  340:     setTraceRoute(trace, route);
  341: 
  342:     addTraceStep(
  343:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 360

```text
  350:     );
  351: 
  352:     saveMessage("user", userMessage, route, sessionId);
  353: 
  354:     const youtubeOAuthResult = await executeYouTubeOAuthCommand(userMessage);
  355: 
  356:     reply = [
  357:       youtubeOAuthResult.title,
  358:       "",
  359:       youtubeOAuthResult.message,
> 360:     ].join("\n");
  361: 
  362:     return finalizePipelinePayload(sessionId, route, reply, trace);
  363:   }
  364: 
  365:   if (isSavedContentCommand(userMessage)) {
  366:     route = "tools";
  367:     setTraceRoute(trace, route);
  368: 
  369:     addTraceStep(
  370:       trace,
```

### lib\chernobog\pipeline\runCommand.ts line 387

```text
  377:     );
  378: 
  379:     saveMessage("user", userMessage, route, sessionId);
  380: 
  381:     const savedContentResult = await executeSavedContentCommand(userMessage);
  382: 
  383:     reply = [
  384:       savedContentResult.title,
  385:       "",
  386:       savedContentResult.message,
> 387:     ].join("\n");
  388: 
  389:     return finalizePipelinePayload(sessionId, route, reply, trace);
  390:   }
  391: 
  392:   
  393: 
  394:   if (isWipeMemoriesRequest(userMessage)) {
  395:     route = "memory";
  396:     setTraceRoute(trace, route);
  397: 
```

### lib\chernobog\pipeline\runCommand.ts line 458

```text
  448:     saveMessage("user", userMessage, route, sessionId);
  449: 
  450:     const memories = getMemories(50);
  451: 
  452:     reply =
  453:       memories.length === 0
  454:         ? "I do not have any persisted memories yet."
  455:         : [
  456:             "Persisted memories:",
  457:             ...memories.map((memory, index) => `${index + 1}. ${memory}`),
> 458:           ].join("\n");
  459:   } else {
  460:     const session = getSessionContext(sessionId);
  461:     const continuityQuery = detectContinuityQuery(userMessage);
  462: 
  463:     if (continuityQuery !== "none") {
  464:       route = "tools";
  465:       setTraceRoute(trace, route);
  466: 
  467:       addTraceStep(
  468:         trace,
```

### lib\chernobog\pipeline\runCommand.ts line 625

```text
  615:         : `No matching memory found for: ${fact}.`;
  616:   } else {
  617:     const memories = getMemories(50);
  618: 
  619:     reply =
  620:       memories.length === 0
  621:         ? "I do not have any persisted memories yet."
  622:         : [
  623:             "Persisted memories:",
  624:             ...memories.map((memory, index) => `${index + 1}. ${memory}`),
> 625:           ].join("\n");
  626:   }
  627: 
  628:   return finalizePipelinePayload(sessionId, route, reply, trace);
  629: }
  630: 
  631:     const memoryArchitectureCommand =
  632:   unifiedToMemoryArchitectureCommand(unifiedCommand) ??
  633:   detectMemoryArchitectureCommand(userMessage);
  634: 
  635:     if (memoryArchitectureCommand !== "none") {
```

### lib\chernobog\pipeline\runCommand.ts line 647

```text
  637:       setTraceRoute(trace, route);
  638: 
  639:       addTraceStep(
  640:         trace,
  641:         "memory_route",
  642:         "Layered memory command handled",
  643:         memoryArchitectureCommand
  644:       );
  645: 
  646:       const storedMemories = getMemories(50);
> 647:       const recentMessages = getRecentMessages(sessionId, 12);
  648: 
  649:       const memoryReply = runMemoryArchitectureCommand(memoryArchitectureCommand, {
  650:         session,
  651:         persistedMemories: storedMemories,
  652:         recentMessages,
  653:         userMessage,
  654:       });
  655: 
  656:       saveMessage("user", userMessage, route, sessionId);
  657: 
```

### lib\chernobog\pipeline\runCommand.ts line 652

```text
  642:         "Layered memory command handled",
  643:         memoryArchitectureCommand
  644:       );
  645: 
  646:       const storedMemories = getMemories(50);
  647:       const recentMessages = getRecentMessages(sessionId, 12);
  648: 
  649:       const memoryReply = runMemoryArchitectureCommand(memoryArchitectureCommand, {
  650:         session,
  651:         persistedMemories: storedMemories,
> 652:         recentMessages,
  653:         userMessage,
  654:       });
  655: 
  656:       saveMessage("user", userMessage, route, sessionId);
  657: 
  658:       reply = memoryReply ?? "No memory architecture response was produced.";
  659: 
  660:       return finalizePipelinePayload(sessionId, route, reply, trace);
  661:     }
  662: 
```

### lib\chernobog\pipeline\runCommand.ts line 1067

```text
 1057:               trace,
 1058:               "router",
 1059:               "Falling back to normal message router",
 1060:               route
 1061:             );
 1062: 
 1063:             saveMessage("user", userMessage, route, sessionId);
 1064: 
 1065:             const activeSession = getSessionContext(sessionId);
 1066:             const storedMemories = getMemories(12);
>1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
 1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
```

### lib\chernobog\pipeline\runCommand.ts line 1069

```text
 1059:               "Falling back to normal message router",
 1060:               route
 1061:             );
 1062: 
 1063:             saveMessage("user", userMessage, route, sessionId);
 1064: 
 1065:             const activeSession = getSessionContext(sessionId);
 1066:             const storedMemories = getMemories(12);
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
>1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
 1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
```

### lib\chernobog\pipeline\runCommand.ts line 1070

```text
 1060:               route
 1061:             );
 1062: 
 1063:             saveMessage("user", userMessage, route, sessionId);
 1064: 
 1065:             const activeSession = getSessionContext(sessionId);
 1066:             const storedMemories = getMemories(12);
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
>1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
 1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
```

### lib\chernobog\pipeline\runCommand.ts line 1076

```text
 1066:             const storedMemories = getMemories(12);
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
>1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
```

### lib\chernobog\pipeline\runCommand.ts line 1077

```text
 1067:             const recentMessages = getRecentMessages(sessionId, 8);
 1068: 
 1069:             const worldStateContext =
 1070:               await buildChernobogWorldStateContext({
 1071:                 projectId:
 1072:                   activeSession.activeProjectId ??
 1073:                   undefined,
 1074:               });
 1075: 
 1076:             const worldModelContext =
>1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
```

### lib\chernobog\pipeline\runCommand.ts line 1085

```text
 1075: 
 1076:             const worldModelContext =
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
>1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
 1091:                 : recentMessages;
 1092: 
 1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
```

### lib\chernobog\pipeline\runCommand.ts line 1087

```text
 1077:               await buildChernobogWorldModelContext();
 1078: 
 1079:             const authoritativeAssessment =
 1080:               shouldUseAuthoritativeAssessmentContext(
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
>1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
 1091:                 : recentMessages;
 1092: 
 1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
 1096:               recentMessages: modelRecentMessages,
 1097:               userMessage,
```

### lib\chernobog\pipeline\runCommand.ts line 1091

```text
 1081:                 userMessage,
 1082:                 activeSession.activeProjectId
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
>1091:                 : recentMessages;
 1092: 
 1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
 1096:               recentMessages: modelRecentMessages,
 1097:               userMessage,
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
```

### lib\chernobog\pipeline\runCommand.ts line 1093

```text
 1083:               );
 1084: 
 1085:             const modelRecentMessages =
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
 1091:                 : recentMessages;
 1092: 
>1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
 1096:               recentMessages: modelRecentMessages,
 1097:               userMessage,
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
```

### lib\chernobog\pipeline\runCommand.ts line 1096

```text
 1086:               authoritativeAssessment
 1087:                 ? recentMessages.filter(
 1088:                     (message) =>
 1089:                       message.role !== "assistant"
 1090:                   )
 1091:                 : recentMessages;
 1092: 
 1093:             const memoryContext = await buildUnifiedMemoryContext({
 1094:               session: activeSession,
 1095:               persistedMemories: storedMemories,
>1096:               recentMessages: modelRecentMessages,
 1097:               userMessage,
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
```

### lib\chernobog\pipeline\runCommand.ts line 1107

```text
 1097:               userMessage,
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
>1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
```

### lib\chernobog\pipeline\runCommand.ts line 1108

```text
 1098:             projectId: activeSession.activeProjectId ?? undefined,
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
>1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
```

### lib\chernobog\pipeline\runCommand.ts line 1109

```text
 1099:   });
 1100: 
 1101:             addTraceStep(
 1102:               trace,
 1103:               "workflow_update",
 1104:               "Layered memory context built for routed response",
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
>1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
```

### lib\chernobog\pipeline\runCommand.ts line 1115

```text
 1105:               undefined,
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
>1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
```

### lib\chernobog\pipeline\runCommand.ts line 1116

```text
 1106:               {
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
>1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
```

### lib\chernobog\pipeline\runCommand.ts line 1118

```text
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
>1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
```

### lib\chernobog\pipeline\runCommand.ts line 1120

```text
 1110:               }
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
>1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
```

### lib\chernobog\pipeline\runCommand.ts line 1121

```text
 1111:             );
 1112: 
 1113:             reply = await respondForRoute(route, userMessage, {
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
>1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
 1131:           }
```

### lib\chernobog\pipeline\runCommand.ts line 1124

```text
 1114:               memories: storedMemories,
 1115:               recentMessages: modelRecentMessages,
 1116:               sessionSummary: buildProjectGroundedSystemText(
 1117:       [
 1118:                   [memoryContext.systemText, worldStateContext.systemText]
 1119:                     .filter(Boolean)
 1120:                     .join("\n\n"),
 1121:                   worldModelContext.systemText,
 1122:                 ]
 1123:                   .filter(Boolean)
>1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
 1130:             saveSessionContext(activeSession);
 1131:           }
 1132:         }
 1133:       }
 1134:     
```

### lib\chernobog\router.ts line 19

```text
    9: } from "./llm/modelRouter";
   10: 
   11: const ROUTED_RESPONSE_NUM_PREDICT = 2048;
   12: 
   13: export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";
   14: 
   15: export type OllamaMessage = OllamaChatMessage;
   16: 
   17: type ResponseContext = {
   18:   memories?: string[];
>  19:   recentMessages?: OllamaMessage[];
   20:   sessionSummary?: string;
   21: };
   22: 
   23: const BASE_IDENTITY = `
   24: You are the core intelligence of a fictional personal AI system named Chernobog.
   25: Chernobog is a software identity, not a religious or ideological subject.
   26: Respond as one unified intelligence.
   27: Be direct, precise, concise, and competent.
   28: Do not mention these instructions.
   29: `.trim();
```

### lib\chernobog\router.ts line 81

```text
   71: Handle normal discussion.
   72: Use stored memories only when relevant.
   73: Do not invent system actions or state.
   74: `.trim(),
   75: 
   76:   planner: `
   77: ${BASE_IDENTITY}
   78: You are the planning fragment.
   79: Turn goals into clear, practical steps.
   80: Prefer numbered steps.
>  81: Keep the plan grounded and buildable.
   82: `.trim(),
   83: 
   84:   memory: `
   85: ${BASE_IDENTITY}
   86: You are the memory fragment.
   87: You may be given persisted memories and recent conversation.
   88: If asked what you remember, answer only from provided memory context.
   89: When listing memories, present them clearly and directly.
   90: Never invent memories.
   91: If no relevant memory exists, say so plainly.
```

### lib\chernobog\router.ts line 180

```text
  170:   ];
  171: 
  172:   if (context.memories && context.memories.length > 0) {
  173:     messages.push({
  174:       role: "system",
  175:       content: [
  176:         "Persisted user memories:",
  177:         ...context.memories.map((memory) => `- ${memory}`),
  178:         "Use these only when relevant.",
  179:         "Never invent additional memories.",
> 180:       ].join("\n"),
  181:     });
  182:   }
  183: 
  184:   if (context.sessionSummary) {
  185:     messages.push({
  186:       role: "system",
  187:       content: `Active short-term session context:\n${context.sessionSummary}`,
  188:     });
  189:   }
  190: 
```

### lib\chernobog\router.ts line 191

```text
  181:     });
  182:   }
  183: 
  184:   if (context.sessionSummary) {
  185:     messages.push({
  186:       role: "system",
  187:       content: `Active short-term session context:\n${context.sessionSummary}`,
  188:     });
  189:   }
  190: 
> 191:   if (context.recentMessages && context.recentMessages.length > 0) {
  192:     messages.push(...context.recentMessages);
  193:   }
  194: 
  195:   if (
  196:     context.sessionSummary &&
  197:     context.recentMessages &&
  198:     context.recentMessages.length > 0
  199:   ) {
  200:     messages.push({
  201:       role: "system",
```

### lib\chernobog\router.ts line 192

```text
  182:   }
  183: 
  184:   if (context.sessionSummary) {
  185:     messages.push({
  186:       role: "system",
  187:       content: `Active short-term session context:\n${context.sessionSummary}`,
  188:     });
  189:   }
  190: 
  191:   if (context.recentMessages && context.recentMessages.length > 0) {
> 192:     messages.push(...context.recentMessages);
  193:   }
  194: 
  195:   if (
  196:     context.sessionSummary &&
  197:     context.recentMessages &&
  198:     context.recentMessages.length > 0
  199:   ) {
  200:     messages.push({
  201:       role: "system",
  202:       content: [
```

### lib\chernobog\router.ts line 197

```text
  187:       content: `Active short-term session context:\n${context.sessionSummary}`,
  188:     });
  189:   }
  190: 
  191:   if (context.recentMessages && context.recentMessages.length > 0) {
  192:     messages.push(...context.recentMessages);
  193:   }
  194: 
  195:   if (
  196:     context.sessionSummary &&
> 197:     context.recentMessages &&
  198:     context.recentMessages.length > 0
  199:   ) {
  200:     messages.push({
  201:       role: "system",
  202:       content: [
  203:         "Authoritative context precedence:",
  204:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  205:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  206:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  207:       ].join("\n"),
```

### lib\chernobog\router.ts line 198

```text
  188:     });
  189:   }
  190: 
  191:   if (context.recentMessages && context.recentMessages.length > 0) {
  192:     messages.push(...context.recentMessages);
  193:   }
  194: 
  195:   if (
  196:     context.sessionSummary &&
  197:     context.recentMessages &&
> 198:     context.recentMessages.length > 0
  199:   ) {
  200:     messages.push({
  201:       role: "system",
  202:       content: [
  203:         "Authoritative context precedence:",
  204:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  205:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  206:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  207:       ].join("\n"),
  208:     });
```

### lib\chernobog\router.ts line 207

```text
  197:     context.recentMessages &&
  198:     context.recentMessages.length > 0
  199:   ) {
  200:     messages.push({
  201:       role: "system",
  202:       content: [
  203:         "Authoritative context precedence:",
  204:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  205:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  206:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
> 207:       ].join("\n"),
  208:     });
  209:   }
  210: 
  211: 
  212: 
  213:   messages.push({
  214:     role: "user",
  215:     content: userMessage,
  216:   });
  217: 
```


## Potential truncation / clipping / budgeting after World Model construction

Pattern: `\.slice\(|\.substring\(|\.substr\(|max(Char|Token|Context|Prompt)|truncate|truncation|clip|budget|num_predict|numPredict|contextWindow|MAX_.*(CHAR|TOKEN|CONTEXT|PROMPT)`

- `lib\chernobog\pipeline\toolExecution.ts:23` - truncated: boolean;
- `lib\chernobog\pipeline\toolExecution.ts:54` - .slice(0, 12)
- `lib\chernobog\pipeline\toolExecution.ts:68` - return data.truncated
- `lib\chernobog\pipeline\toolExecution.ts:69` - ? `Here is the start of ${data.path}:\n\n${data.content}\n\n[truncated]`
- `lib\chernobog\pipeline\toolExecution.ts:89` - .slice(0, 5)
- `lib\chernobog\pipeline\toolExecution.ts:227` - return readData.truncated
- `lib\chernobog\pipeline\toolExecution.ts:228` - ? `I found ${chosen.name} and read the start of it:\n\n${readData.content}\n\n[truncated]`
- `lib\chernobog\pipeline\toolExecution.ts:237` - .slice(0, 5)
- `lib\chernobog\pipeline\worldModelContext.ts:24` - const MAX_ATTRIBUTES_CHARS = 500;
- `lib\chernobog\pipeline\worldModelContext.ts:65` - if (rendered.length <= MAX_ATTRIBUTES_CHARS) {
- `lib\chernobog\pipeline\worldModelContext.ts:69` - return `${rendered.slice(0, MAX_ATTRIBUTES_CHARS)}...[value truncated]`;
- `lib\chernobog\pipeline\worldModelContext.ts:192` - const sorted = items.slice().sort(compareScored);
- `lib\chernobog\pipeline\worldModelContext.ts:200` - .slice(0, maximum);
- `lib\chernobog\pipeline\worldModelContext.ts:212` - .slice(
- `lib\chernobog\pipeline\worldModelContext.ts:288` - .slice(0, MAX_DEPENDENCY_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:296` - .slice(0, MAX_STRUCTURAL_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:310` - .slice(
- `lib\chernobog\pipeline\worldModelContext.ts:324` - ].slice(0, MAX_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:344` - .slice(
- `lib\chernobog\pipeline\worldModelContext.ts:402` - .slice()
- `lib\chernobog\pipeline\worldModelContext.ts:679` - .slice(0, MAX_DEPENDENCY_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:693` - .slice(0, MAX_STRUCTURAL_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:702` - .slice(0, MAX_STATE_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:722` - .slice(
- `lib\chernobog\pipeline\worldModelContext.ts:736` - ].slice(0, MAX_RELATIONSHIPS);
- `lib\chernobog\pipeline\worldModelContext.ts:769` - .slice(0, MAX_PREDICTIONS);
- `lib\chernobog\pipeline\worldModelContext.ts:790` - .slice(0, MAX_IMPACT_ASSESSMENTS);
- `lib\chernobog\pipeline\worldModelContext.ts:829` - .slice(0, MAX_CAUSAL_HYPOTHESES);
- `lib\chernobog\pipeline\worldStateContext.ts:40` - const MAX_VALUE_CHARS = 600;
- `lib\chernobog\pipeline\worldStateContext.ts:158` - if (rendered.length <= MAX_VALUE_CHARS) {
- `lib\chernobog\pipeline\worldStateContext.ts:162` - return `${rendered.slice(0, MAX_VALUE_CHARS)}...[value truncated]`;
- `lib\chernobog\pipeline\worldStateContext.ts:214` - .slice(0, MAX_WORLD_STATE_RECORDS);
- `lib\chernobog\router.ts:11` - const ROUTED_RESPONSE_NUM_PREDICT = 2048;
- `lib\chernobog\router.ts:121` - numPredict?: number;
- `lib\chernobog\router.ts:128` - numPredict: options.numPredict ?? 500,
- `lib\chernobog\router.ts:222` - numPredict: ROUTED_RESPONSE_NUM_PREDICT,

## All World Model conversational builder references

Pattern: `buildChernobogWorldModelContext|worldModelContext\.systemText|WORLD MODEL CRITICAL DEPENDENCY BACKBONE`

- `lib\chernobog\pipeline\runCommand.ts:52` - import { buildChernobogWorldModelContext } from "@/lib/chernobog/pipeline/worldModelContext";
- `lib\chernobog\pipeline\runCommand.ts:1077` - await buildChernobogWorldModelContext();
- `lib\chernobog\pipeline\runCommand.ts:1121` - worldModelContext.systemText,
- `lib\chernobog\pipeline\worldModelContext.ts:613` - export async function buildChernobogWorldModelContext():
- `lib\chernobog\pipeline\worldModelContext.ts:892` - "WORLD MODEL CRITICAL DEPENDENCY BACKBONE (highest-priority canonical 11J evidence):",

## Event/model request logging that may expose final prompt metadata

Pattern: `model\.requested|model.requested|model_completed|model\.completed|promptLength|messageCount|systemLength|requestBody|options`

- `lib\chernobog\router.ts:118` - options: {
- `lib\chernobog\router.ts:125` - role: options.role ?? "default",
- `lib\chernobog\router.ts:127` - temperature: options.temperature ?? 0.4,
- `lib\chernobog\router.ts:128` - numPredict: options.numPredict ?? 500,
- `lib\chernobog\cognition\cognitiveControlLoop.ts:19` - export interface ChernobogCognitiveControlLoopOptions {
- `lib\chernobog\cognition\cognitiveControlLoop.ts:51` - options:
- `lib\chernobog\cognition\cognitiveControlLoop.ts:52` - ChernobogCognitiveControlLoopOptions = {},
- `lib\chernobog\cognition\cognitiveControlLoop.ts:55` - options.attention ??
- `lib\chernobog\cognition\cognitiveControlLoop.ts:59` - options.goals ??
- `lib\chernobog\cognition\cognitiveControlLoop.ts:64` - options.policy ??
- `lib\chernobog\cognition\cognitiveControlLoop.ts:69` - options.clock ??
- `lib\chernobog\cognition\cognitiveRuntime.ts:32` - ChernobogCognitiveRuntimeOptions,
- `lib\chernobog\cognition\cognitiveRuntime.ts:69` - private readonly options:
- `lib\chernobog\cognition\cognitiveRuntime.ts:70` - ChernobogCognitiveRuntimeOptions;
- `lib\chernobog\cognition\cognitiveRuntime.ts:82` - options:
- `lib\chernobog\cognition\cognitiveRuntime.ts:83` - ChernobogCognitiveRuntimeOptions,
- `lib\chernobog\cognition\cognitiveRuntime.ts:85` - this.options = options;
- `lib\chernobog\cognition\cognitiveRuntime.ts:92` - options.clock,
- `lib\chernobog\cognition\cognitiveRuntime.ts:102` - options.clock,
- `lib\chernobog\cognition\cognitiveRuntime.ts:109` - this.options.clock?.() ??
- `lib\chernobog\cognition\cognitiveRuntime.ts:113` - await this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:148` - await this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:154` - this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:156` - ? await this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:176` - this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:178` - ? await this.options
- `lib\chernobog\cognition\cognitiveRuntime.ts:224` - this.options.clock?.() ??
- `lib\chernobog\cognition\goalRegistry.ts:98` - options: {
- `lib\chernobog\cognition\goalRegistry.ts:105` - options.activeOnly
- `lib\chernobog\cognition\goalRegistry.ts:108` - : options.statuses;
- `lib\chernobog\cognition\initiativeDecision.ts:193` - options: {
- `lib\chernobog\cognition\initiativeDecision.ts:202` - options.now ??
- `lib\chernobog\cognition\initiativeDecision.ts:206` - options.policy ??
- `lib\chernobog\cognition\initiativeDecision.ts:236` - options.memory?.get(
- `lib\chernobog\cognition\initiativeDecision.ts:300` - options.memory &&
- `lib\chernobog\cognition\initiativeDecision.ts:308` - options.memory.record({
- `lib\chernobog\cognition\runtimeTypes.ts:46` - export interface ChernobogCognitiveRuntimeOptions {
- `lib\chernobog\cognition\salience.ts:183` - options: { now?: Date; policy?: CognitiveSaliencePolicy } = {},
- `lib\chernobog\cognition\salience.ts:185` - const now = options.now ?? new Date();
- `lib\chernobog\cognition\salience.ts:186` - const policy = options.policy ?? DEFAULT_COGNITIVE_SALIENCE_POLICY;
- `lib\chernobog\cognition\worldStateAttention.ts:9` - export interface ChernobogWorldStateAttentionOptions {
- `lib\chernobog\cognition\worldStateAttention.ts:20` - constructor(options: ChernobogWorldStateAttentionOptions = {}) {
- `lib\chernobog\cognition\worldStateAttention.ts:21` - this.queue = options.queue ?? new ChernobogAttentionQueue();
- `lib\chernobog\cognition\worldStateAttention.ts:22` - this.policy = options.policy;
- `lib\chernobog\cognition\worldStateAttention.ts:23` - this.clock = options.clock ?? (() => new Date());
- `lib\chernobog\desktop\desktopEvents.ts:7` - export interface PublishDesktopObservationOptions {
- `lib\chernobog\desktop\desktopEvents.ts:82` - options:
- `lib\chernobog\desktop\desktopEvents.ts:83` - PublishDesktopObservationOptions = {}
- `lib\chernobog\desktop\desktopEvents.ts:91` - options.previousObservation;
- `lib\chernobog\desktop\desktopReporter.ts:50` - export interface ReportDesktopStateOptions {
- `lib\chernobog\desktop\desktopReporter.ts:135` - options:
- `lib\chernobog\desktop\desktopReporter.ts:136` - ReportDesktopStateOptions = {}
- `lib\chernobog\desktop\desktopReporter.ts:175` - options.previousObservation ??
- `lib\chernobog\desktop\desktopReporter.ts:188` - options.rememberObservation !==
- `lib\chernobog\events\eventBus.ts:20` - type ChernobogEventReplayOptions,
- `lib\chernobog\events\eventBus.ts:39` - export interface ChernobogEventBusOptions {
- `lib\chernobog\events\eventBus.ts:82` - constructor(options: ChernobogEventBusOptions) {
- `lib\chernobog\events\eventBus.ts:83` - this.store = options.store;
- `lib\chernobog\events\eventBus.ts:84` - this.dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 30_000);
- `lib\chernobog\events\eventBus.ts:85` - this.clock = options.clock ?? (() => new Date());
- `lib\chernobog\events\eventBus.ts:184` - options:
- `lib\chernobog\events\eventBus.ts:185` - ChernobogEventReplayOptions = {}
- `lib\chernobog\events\eventBus.ts:200` - options.query
- `lib\chernobog\events\eventBus.ts:258` - options.continueOnError !==
- `lib\chernobog\events\replay.ts:22` - export interface ChernobogEventReplayOptions {
- `lib\chernobog\execution\buildExecutionTask.ts:7` - export interface BuildExecutionTaskOptions {
- `lib\chernobog\execution\buildExecutionTask.ts:1309` - options: BuildExecutionTaskOptions = {}
- `lib\chernobog\execution\buildExecutionTask.ts:1311` - const previousState = options.previousState;
- `lib\chernobog\execution\executeFromMessage.ts:16` - export interface ExecuteFromMessageOptions {
- `lib\chernobog\execution\executeFromMessage.ts:29` - options: ExecuteFromMessageOptions = {}
- `lib\chernobog\execution\executeFromMessage.ts:31` - const previousState = options.previousState ?? createEmptyExecutionState();
- `lib\chernobog\execution\internalExecutionHandlers.ts:11` - export interface InternalExecutionHandlerOptions {
- `lib\chernobog\execution\internalExecutionHandlers.ts:1434` - options: InternalExecutionHandlerOptions
- `lib\chernobog\execution\internalExecutionHandlers.ts:1436` - const { previousState } = options;
- `lib\chernobog\execution\runExecutionTask.ts:50` - export interface RunExecutionTaskOptions {
- `lib\chernobog\execution\runExecutionTask.ts:160` - options: RunExecutionTaskOptions
- `lib\chernobog\execution\runExecutionTask.ts:163` - options.maxSteps ?? 10;
- `lib\chernobog\execution\runExecutionTask.ts:187` - options.governance,
- `lib\chernobog\execution\runExecutionTask.ts:207` - options.governance &&
- `lib\chernobog\execution\runExecutionTask.ts:276` - options.resolveStepGovernance?.(
- `lib\chernobog\execution\runExecutionTask.ts:280` - options.governance;
- `lib\chernobog\execution\runExecutionTask.ts:371` - options.handlers[handlerKey];
- `lib\chernobog\execution\toolExecutionHandlers.ts:6` - type ToolHandlerMapOptions = {
- `lib\chernobog\execution\toolExecutionHandlers.ts:91` - options: ToolHandlerMapOptions = {}
- `lib\chernobog\execution\toolExecutionHandlers.ts:93` - const inputMappers = options.inputMappers ?? {};
- `lib\chernobog\execution\toolExecutionStatus.ts:31` - options: { clock?: () => Date } = {},
- `lib\chernobog\execution\toolExecutionStatus.ts:44` - checkedAt: (options.clock ?? (() => new Date()))().toISOString(),
- `lib\chernobog\governance\cognitiveExecution.ts:9` - RunExecutionTaskOptions,
- `lib\chernobog\governance\cognitiveExecution.ts:31` - export interface GovernedCognitiveExecutionOptions {
- `lib\chernobog\governance\cognitiveExecution.ts:69` - export function buildExecutionOptionsFromCognitiveDecision(
- `lib\chernobog\governance\cognitiveExecution.ts:71` - options: GovernedCognitiveExecutionOptions,
- `lib\chernobog\governance\cognitiveExecution.ts:72` - ): RunExecutionTaskOptions {
- `lib\chernobog\governance\cognitiveExecution.ts:85` - handlers: options.handlers,
- `lib\chernobog\governance\cognitiveExecution.ts:86` - maxSteps: options.maxSteps,
- `lib\chernobog\governance\cognitiveExecution.ts:103` - options: GovernedCognitiveExecutionOptions,
- `lib\chernobog\governance\cognitiveExecution.ts:121` - buildExecutionOptionsFromCognitiveDecision(
- `lib\chernobog\governance\cognitiveExecution.ts:123` - options,
- `lib\chernobog\governance\status.ts:30` - options: { clock?: () => Date } = {},
- `lib\chernobog\governance\status.ts:51` - checkedAt: (options.clock ?? (() => new Date()))().toISOString(),
- `lib\chernobog\learning\learningRuntime.ts:49` - ChernobogLearningRuntimeOptions,
- `lib\chernobog\learning\learningRuntime.ts:72` - options:
- `lib\chernobog\learning\learningRuntime.ts:73` - ChernobogLearningRuntimeOptions = {},
- `lib\chernobog\learning\learningRuntime.ts:76` - options.lessonPath ??
- `lib\chernobog\learning\learningRuntime.ts:85` - options.clock ??
- `lib\chernobog\learning\lessonPromotion.ts:5` - export function promoteLearningPattern(pattern:LearningPatternCandidate,context:LearningPromotionContext,options:{policy?:LearningPromotionPolicy;now?:Date}={}):LearnedLesson{const a=assessLearningPromotion(pattern,context,options.policy);if(a.decision!=="promote")throw new Error(`learning pattern ${pattern.key} is not approved for promotion: ${a.decision}`);const now=options.now??new Date();return{id:`lesson:${pattern.key}`,key:pattern.key,kind:pattern.kind,statement:pattern.statement,status:"active",confidence:pattern.confidence,supportCount:pattern.supportCount,contradictionCount:pattern.contradictionCount,promotedAt:now.toISOString(),governance:{authority:context.authority,approved:context.approved,approvedBy:context.approvedBy?.trim()||undefined,approvedAt:approvedAt(context)},evidence:structuredClone(pattern.evidence),sourcePattern:structuredClone(pattern)};}
- `lib\chernobog\learning\runtimeTypes.ts:24` - export interface ChernobogLearningRuntimeOptions {
- `lib\chernobog\llm\modelRouterStatus.ts:66` - options: {
- `lib\chernobog\llm\modelRouterStatus.ts:73` - options.checkReadiness ??
- `lib\chernobog\llm\modelRouterStatus.ts:227` - options.clock ??
- `lib\chernobog\llm\ollamaClient.ts:21` - export type GenerateWithOllamaOptions = {
- `lib\chernobog\llm\ollamaClient.ts:114` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:117` - const prompt = options.prompt?.trim();
- `lib\chernobog\llm\ollamaClient.ts:118` - const messages = normalizeMessages(options.messages);
- `lib\chernobog\llm\ollamaClient.ts:132` - const requestOptions: Record<string, unknown> = {
- `lib\chernobog\llm\ollamaClient.ts:133` - temperature: options.temperature ?? 0.35,
- `lib\chernobog\llm\ollamaClient.ts:136` - if (options.numPredict !== undefined) {
- `lib\chernobog\llm\ollamaClient.ts:138` - !Number.isInteger(options.numPredict) ||
- `lib\chernobog\llm\ollamaClient.ts:139` - options.numPredict < 1
- `lib\chernobog\llm\ollamaClient.ts:146` - requestOptions.num_predict = options.numPredict;
- `lib\chernobog\llm\ollamaClient.ts:161` - keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
- `lib\chernobog\llm\ollamaClient.ts:162` - ...(options.format ? { format: options.format } : {}),
- `lib\chernobog\llm\ollamaClient.ts:163` - options: requestOptions,
- `lib\chernobog\llm\ollamaClient.ts:176` - keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
- `lib\chernobog\llm\ollamaClient.ts:177` - ...(options.format ? { format: options.format } : {}),
- `lib\chernobog\llm\ollamaClient.ts:178` - options: requestOptions,
- `lib\chernobog\llm\ollamaClient.ts:201` - ? "model.completed"
- `lib\chernobog\llm\ollamaClient.ts:260` - options: {
- `lib\chernobog\llm\ollamaClient.ts:273` - model: options.model,
- `lib\chernobog\llm\ollamaClient.ts:274` - role: options.role,
- `lib\chernobog\llm\ollamaClient.ts:275` - error: options.error,
- `lib\chernobog\llm\ollamaClient.ts:276` - failureKind: options.kind,
- `lib\chernobog\llm\ollamaClient.ts:277` - httpStatus: options.httpStatus,
- `lib\chernobog\llm\ollamaClient.ts:279` - options.plan,
- `lib\chernobog\llm\ollamaClient.ts:280` - options.startedAt,
- `lib\chernobog\llm\ollamaClient.ts:313` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:319` - } = options;
- `lib\chernobog\llm\ollamaClient.ts:325` - options.modelOverride?.trim();
- `lib\chernobog\llm\ollamaClient.ts:328` - options.modelOverride !== undefined &&
- `lib\chernobog\llm\ollamaClient.ts:367` - options,
- `lib\chernobog\llm\ollamaClient.ts:387` - type: "model.requested",
- `lib\chernobog\llm\ollamaClient.ts:404` - temperature: options.temperature ?? 0.35,
- `lib\chernobog\llm\ollamaClient.ts:406` - ...(options.numPredict !== undefined
- `lib\chernobog\llm\ollamaClient.ts:408` - numPredict: options.numPredict,
- `lib\chernobog\llm\ollamaClient.ts:411` - ...(options.format
- `lib\chernobog\llm\ollamaClient.ts:413` - format: options.format,
- `lib\chernobog\llm\reliableOllama.ts:5` - GenerateWithOllamaOptions,
- `lib\chernobog\llm\reliableOllama.ts:29` - OllamaRuntimeReadinessOptions,
- `lib\chernobog\llm\reliableOllama.ts:46` - export interface GenerateWithReliableOllamaOptions
- `lib\chernobog\llm\reliableOllama.ts:47` - extends GenerateWithOllamaOptions {
- `lib\chernobog\llm\reliableOllama.ts:49` - readinessOptions?:
- `lib\chernobog\llm\reliableOllama.ts:50` - OllamaRuntimeReadinessOptions;
- `lib\chernobog\llm\reliableOllama.ts:74` - export interface ReliableOllamaAttemptLoopOptions {
- `lib\chernobog\llm\reliableOllama.ts:164` - options:
- `lib\chernobog\llm\reliableOllama.ts:165` - ReliableOllamaAttemptLoopOptions,
- `lib\chernobog\llm\reliableOllama.ts:173` - options.maxAttempts,
- `lib\chernobog\llm\reliableOllama.ts:179` - options.baseDelayMs,
- `lib\chernobog\llm\reliableOllama.ts:185` - options.maxDelayMs,
- `lib\chernobog\llm\reliableOllama.ts:190` - options.sleep ??
- `lib\chernobog\llm\reliableOllama.ts:203` - await options.execute();
- `lib\chernobog\llm\reliableOllama.ts:353` - options: {

## Interpretation

- If World Model text is composed before a later slice/truncation, inspect whether the dependency backbone is inside the retained region.
- If multiple World Model blocks are injected, remove the stale/secondary source and keep one canonical builder output.
- If the exact full system text flows into the final Ollama request with no clipping, the remaining failure is model instruction adherence rather than 11J data flow.
- Do not modify canonical 11J grounding based on this diagnostic.
