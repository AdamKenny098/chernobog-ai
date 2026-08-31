# Chernobog Phase 11J - Grounded Response Validator / Repair Guard Preflight

Generated: 2026-08-31T20:40:55.5054839+01:00

Goal: identify the safest post-generation insertion point for a structured 11J response validator.

Known state entering this preflight:
- canonical 11J graph has substantive requires-model and served-by edges
- model-facing 11J context contains complete dependency chains
- final router reinforcement is installed and passes regressions
- remaining defects are generated-answer semantic errors such as reversed edges, invalid consequence propagation, and contradictory fallback conclusions

## Current routed response generation boundary

Pattern: `export async function respondForRoute|return callOllama|callOllama\(|worldModelReinforcement|roleForRoute`

### lib\chernobog\router.ts line 30

```text
   12: 
   13: export type RouteName = "chat" | "planner" | "memory" | "tools" | "guardian";
   14: 
   15: export type OllamaMessage = OllamaChatMessage;
   16: 
   17: type ResponseContext = {
   18:   memories?: string[];
   19:   recentMessages?: OllamaMessage[];
   20:   sessionSummary?: string;
   21: };
   22: 
   23: 
   24: const WORLD_MODEL_CRITICAL_START =
   25:   "WORLD MODEL CRITICAL DEPENDENCY BACKBONE";
   26: 
   27: const WORLD_MODEL_VERBOSE_START =
   28:   "World Model entities (current evidence first; historical tail explicitly labelled):";
   29: 
>  30: function extractCriticalWorldModelReinforcement(
   31:   sessionSummary?: string,
   32: ): string | null {
   33:   if (!sessionSummary) {
   34:     return null;
   35:   }
   36: 
   37:   const start =
   38:     sessionSummary.indexOf(
   39:       WORLD_MODEL_CRITICAL_START,
   40:     );
   41: 
   42:   if (start < 0) {
   43:     return null;
   44:   }
   45: 
   46:   const verboseStart =
   47:     sessionSummary.indexOf(
   48:       WORLD_MODEL_VERBOSE_START,
```

### lib\chernobog\router.ts line 170

```text
  152: `.trim(),
  153: 
  154:   tools: `
  155: ${BASE_IDENTITY}
  156: You are the tools fragment.
  157: The system may have already executed deterministic tool actions.
  158: Never claim a tool was executed unless the provided context says so.
  159: If discussing tool capability, stay concrete.
  160: `.trim(),
  161: 
  162:   guardian: `
  163: ${BASE_IDENTITY}
  164: You are the guardian fragment.
  165: Handle unsafe or clearly harmful requests with a brief refusal and safer redirection where possible.
  166: Do not over-refuse harmless software questions.
  167: `.trim(),
  168: };
  169: 
> 170: function roleForRoute(route: RouteName): ModelRole {
  171:   return route === "planner"
  172:     ? "planner"
  173:     : "default";
  174: }
  175: 
  176: async function callOllama(
  177:   messages: OllamaMessage[],
  178:   options: {
  179:     role?: ModelRole;
  180:     temperature?: number;
  181:     numPredict?: number;
  182:   } = {},
  183: ): Promise<string> {
  184:   const result = await generateWithOllama({
  185:     role: options.role ?? "default",
  186:     messages,
  187:     temperature: options.temperature ?? 0.4,
  188:     numPredict: options.numPredict ?? 500,
```

### lib\chernobog\router.ts line 176

```text
  158: Never claim a tool was executed unless the provided context says so.
  159: If discussing tool capability, stay concrete.
  160: `.trim(),
  161: 
  162:   guardian: `
  163: ${BASE_IDENTITY}
  164: You are the guardian fragment.
  165: Handle unsafe or clearly harmful requests with a brief refusal and safer redirection where possible.
  166: Do not over-refuse harmless software questions.
  167: `.trim(),
  168: };
  169: 
  170: function roleForRoute(route: RouteName): ModelRole {
  171:   return route === "planner"
  172:     ? "planner"
  173:     : "default";
  174: }
  175: 
> 176: async function callOllama(
  177:   messages: OllamaMessage[],
  178:   options: {
  179:     role?: ModelRole;
  180:     temperature?: number;
  181:     numPredict?: number;
  182:   } = {},
  183: ): Promise<string> {
  184:   const result = await generateWithOllama({
  185:     role: options.role ?? "default",
  186:     messages,
  187:     temperature: options.temperature ?? 0.4,
  188:     numPredict: options.numPredict ?? 500,
  189:   });
  190: 
  191:   if (!result.ok || !result.text) {
  192:     throw new Error(
  193:       result.error ??
  194:         "No response returned from the local model.",
```

### lib\chernobog\router.ts line 207

```text
  189:   });
  190: 
  191:   if (!result.ok || !result.text) {
  192:     throw new Error(
  193:       result.error ??
  194:         "No response returned from the local model.",
  195:     );
  196:   }
  197: 
  198:   return result.text;
  199: }
  200: 
  201: function normalizeRoute(raw: string): RouteName {
  202:   const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  203:   return (match?.[1] as RouteName) ?? "chat";
  204: }
  205: 
  206: export async function routeMessage(userMessage: string): Promise<RouteName> {
> 207:   const rawRoute = await callOllama(
  208:     [
  209:       { role: "system", content: ROUTER_PROMPT },
  210:       { role: "user", content: userMessage },
  211:     ],
  212:     {
  213:       role: "default",
  214:     },
  215:   );
  216: 
  217:   return normalizeRoute(rawRoute);
  218: }
  219: 
  220: export async function respondForRoute(
  221:   route: RouteName,
  222:   userMessage: string,
  223:   context: ResponseContext = {}
  224: ): Promise<string> {
  225:   const messages: OllamaMessage[] = [
```

### lib\chernobog\router.ts line 220

```text
  202:   const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  203:   return (match?.[1] as RouteName) ?? "chat";
  204: }
  205: 
  206: export async function routeMessage(userMessage: string): Promise<RouteName> {
  207:   const rawRoute = await callOllama(
  208:     [
  209:       { role: "system", content: ROUTER_PROMPT },
  210:       { role: "user", content: userMessage },
  211:     ],
  212:     {
  213:       role: "default",
  214:     },
  215:   );
  216: 
  217:   return normalizeRoute(rawRoute);
  218: }
  219: 
> 220: export async function respondForRoute(
  221:   route: RouteName,
  222:   userMessage: string,
  223:   context: ResponseContext = {}
  224: ): Promise<string> {
  225:   const messages: OllamaMessage[] = [
  226:     {
  227:       role: "system",
  228:       content: ROUTE_PROMPTS[route],
  229:     },
  230:   ];
  231: 
  232:   if (context.memories && context.memories.length > 0) {
  233:     messages.push({
  234:       role: "system",
  235:       content: [
  236:         "Persisted user memories:",
  237:         ...context.memories.map((memory) => `- ${memory}`),
  238:         "Use these only when relevant.",
```

### lib\chernobog\router.ts line 273

```text
  255:   if (
  256:     context.sessionSummary &&
  257:     context.recentMessages &&
  258:     context.recentMessages.length > 0
  259:   ) {
  260:     messages.push({
  261:       role: "system",
  262:       content: [
  263:         "Authoritative context precedence:",
  264:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  265:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  266:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  267:       ].join("\n"),
  268:     });
  269:   }
  270: 
  271: 
  272: 
> 273:   const worldModelReinforcement =
  274:     extractCriticalWorldModelReinforcement(
  275:       context.sessionSummary,
  276:     );
  277: 
  278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
  281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
  291:   return callOllama(
```

### lib\chernobog\router.ts line 274

```text
  256:     context.sessionSummary &&
  257:     context.recentMessages &&
  258:     context.recentMessages.length > 0
  259:   ) {
  260:     messages.push({
  261:       role: "system",
  262:       content: [
  263:         "Authoritative context precedence:",
  264:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  265:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  266:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  267:       ].join("\n"),
  268:     });
  269:   }
  270: 
  271: 
  272: 
  273:   const worldModelReinforcement =
> 274:     extractCriticalWorldModelReinforcement(
  275:       context.sessionSummary,
  276:     );
  277: 
  278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
  281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
  291:   return callOllama(
  292:     messages,
```

### lib\chernobog\router.ts line 278

```text
  260:     messages.push({
  261:       role: "system",
  262:       content: [
  263:         "Authoritative context precedence:",
  264:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  265:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  266:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  267:       ].join("\n"),
  268:     });
  269:   }
  270: 
  271: 
  272: 
  273:   const worldModelReinforcement =
  274:     extractCriticalWorldModelReinforcement(
  275:       context.sessionSummary,
  276:     );
  277: 
> 278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
  281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
  291:   return callOllama(
  292:     messages,
  293:     {
  294:       role: roleForRoute(route),
  295:     numPredict: ROUTED_RESPONSE_NUM_PREDICT,
  296:     },
```

### lib\chernobog\router.ts line 281

```text
  263:         "Authoritative context precedence:",
  264:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  265:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  266:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  267:       ].join("\n"),
  268:     });
  269:   }
  270: 
  271: 
  272: 
  273:   const worldModelReinforcement =
  274:     extractCriticalWorldModelReinforcement(
  275:       context.sessionSummary,
  276:     );
  277: 
  278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
> 281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
  291:   return callOllama(
  292:     messages,
  293:     {
  294:       role: roleForRoute(route),
  295:     numPredict: ROUTED_RESPONSE_NUM_PREDICT,
  296:     },
  297:   );
  298: }
  299: 
```

### lib\chernobog\router.ts line 291

```text
  273:   const worldModelReinforcement =
  274:     extractCriticalWorldModelReinforcement(
  275:       context.sessionSummary,
  276:     );
  277: 
  278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
  281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
> 291:   return callOllama(
  292:     messages,
  293:     {
  294:       role: roleForRoute(route),
  295:     numPredict: ROUTED_RESPONSE_NUM_PREDICT,
  296:     },
  297:   );
  298: }
  299: 
```

### lib\chernobog\router.ts line 294

```text
  276:     );
  277: 
  278:   if (worldModelReinforcement) {
  279:     messages.push({
  280:       role: "system",
  281:       content: worldModelReinforcement,
  282:     });
  283:   }
  284: 
  285: 
  286:   messages.push({
  287:     role: "user",
  288:     content: userMessage,
  289:   });
  290: 
  291:   return callOllama(
  292:     messages,
  293:     {
> 294:       role: roleForRoute(route),
  295:     numPredict: ROUTED_RESPONSE_NUM_PREDICT,
  296:     },
  297:   );
  298: }
  299: 
```


## Current final payload / persistence boundary

Pattern: `finalizePipelinePayload|saveMessage\("assistant"|Assistant response created|reply = await respondForRoute`

### lib\chernobog\pipeline\runCommand.ts line 35

```text
   19: import {
   20:   normalizeToolCall,
   21:   openAppCallLooksLikeFileRequest,
   22: } from "@/lib/chernobog/tools/normalize";
   23: 
   24: import {
   25:   getSessionContext,
   26:   saveSessionContext,
   27: } from "@/lib/chernobog/session/store";
   28: 
   29: import {
   30:   updateSessionAfterRoute,
   31: } from "@/lib/chernobog/session/update";
   32: 
   33: import type { RouteName } from "@/lib/chernobog/session/types";
   34: import type { CommandPipelineResult } from "./types";
>  35: import { finalizePipelinePayload } from "./payload";
   36: import {
   37:   executeAndTrackTool,
   38:   formatToolReply,
   39:   looksLikeExplicitFilePath,
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
```

### lib\chernobog\pipeline\runCommand.ts line 234

```text
  218:       "parsed_tool",
  219:       "Vault brain command detected",
  220:       "vault-brain",
  221:       { userMessage }
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
  232:     ].join("\n");
  233: 
> 234:     return finalizePipelinePayload(sessionId, route, reply, trace);
  235:   }
  236: 
  237:   if (isContentReviewCommand(userMessage)) {
  238:     route = "tools";
  239:     setTraceRoute(trace, route);
  240: 
  241:     addTraceStep(
  242:       trace,
  243:       "parsed_tool",
  244:       "Content review command detected",
  245:       "content-review",
  246:       { userMessage }
  247:     );
  248: 
  249:     saveMessage("user", userMessage, route, sessionId);
  250: 
```

### lib\chernobog\pipeline\runCommand.ts line 259

```text
  243:       "parsed_tool",
  244:       "Content review command detected",
  245:       "content-review",
  246:       { userMessage }
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
  257:     ].join("\n");
  258: 
> 259:     return finalizePipelinePayload(sessionId, route, reply, trace);
  260:   }
  261: 
  262:   if (isContentIngestCommand(userMessage)) {
  263:     route = "tools";
  264:     setTraceRoute(trace, route);
  265: 
  266:     addTraceStep(
  267:       trace,
  268:       "parsed_tool",
  269:       "Content ingest command detected",
  270:       "content-ingest",
  271:       { userMessage }
  272:     );
  273: 
  274:     saveMessage("user", userMessage, route, sessionId);
  275: 
```

### lib\chernobog\pipeline\runCommand.ts line 284

```text
  268:       "parsed_tool",
  269:       "Content ingest command detected",
  270:       "content-ingest",
  271:       { userMessage }
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
  282:     ].join("\n");
  283: 
> 284:     return finalizePipelinePayload(sessionId, route, reply, trace);
  285:   }
  286: 
  287:   if (isYouTubeIngestCommand(userMessage)) {
  288:     route = "tools";
  289:     setTraceRoute(trace, route);
  290: 
  291:     addTraceStep(
  292:       trace,
  293:       "parsed_tool",
  294:       "YouTube playlist ingest command detected",
  295:       "youtube-playlist-ingest",
  296:       { userMessage }
  297:     );
  298: 
  299:     saveMessage("user", userMessage, route, sessionId);
  300: 
```

### lib\chernobog\pipeline\runCommand.ts line 309

```text
  293:       "parsed_tool",
  294:       "YouTube playlist ingest command detected",
  295:       "youtube-playlist-ingest",
  296:       { userMessage }
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
  307:     ].join("\n");
  308: 
> 309:     return finalizePipelinePayload(sessionId, route, reply, trace);
  310:   }
  311: 
  312:   if (isSavedContentReliabilityCommand(userMessage)) {
  313:     route = "tools";
  314:     setTraceRoute(trace, route);
  315: 
  316:     addTraceStep(
  317:       trace,
  318:       "parsed_tool",
  319:       "Saved content reliability command detected",
  320:       "saved-content-reliability",
  321:       { userMessage }
  322:     );
  323: 
  324:     saveMessage("user", userMessage, route, sessionId);
  325: 
```

### lib\chernobog\pipeline\runCommand.ts line 335

```text
  319:       "Saved content reliability command detected",
  320:       "saved-content-reliability",
  321:       { userMessage }
  322:     );
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
  333:     ].join("\n");
  334: 
> 335:     return finalizePipelinePayload(sessionId, route, reply, trace);
  336:   }
  337: 
  338:   if (isYouTubeOAuthCommand(userMessage)) {
  339:     route = "tools";
  340:     setTraceRoute(trace, route);
  341: 
  342:     addTraceStep(
  343:       trace,
  344:       "parsed_tool",
  345:       "YouTube OAuth command detected",
  346:       "youtube-oauth",
  347:       {
  348:         userMessage,
  349:       }
  350:     );
  351: 
```

### lib\chernobog\pipeline\runCommand.ts line 362

```text
  346:       "youtube-oauth",
  347:       {
  348:         userMessage,
  349:       }
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
  360:     ].join("\n");
  361: 
> 362:     return finalizePipelinePayload(sessionId, route, reply, trace);
  363:   }
  364: 
  365:   if (isSavedContentCommand(userMessage)) {
  366:     route = "tools";
  367:     setTraceRoute(trace, route);
  368: 
  369:     addTraceStep(
  370:       trace,
  371:       "parsed_tool",
  372:       "Saved content command detected",
  373:       "saved-content",
  374:       {
  375:         userMessage,
  376:       }
  377:     );
  378: 
```

### lib\chernobog\pipeline\runCommand.ts line 389

```text
  373:       "saved-content",
  374:       {
  375:         userMessage,
  376:       }
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
  387:     ].join("\n");
  388: 
> 389:     return finalizePipelinePayload(sessionId, route, reply, trace);
  390:   }
  391: 
  392:   
  393: 
  394:   if (isWipeMemoriesRequest(userMessage)) {
  395:     route = "memory";
  396:     setTraceRoute(trace, route);
  397: 
  398:     addTraceStep(trace, "memory_route", "Memory wipe request detected");
  399: 
  400:     saveMessage("user", userMessage, route, sessionId);
  401: 
  402:     const deletedCount = clearAllMemories();
  403: 
  404:     reply =
  405:       deletedCount > 0
```

### lib\chernobog\pipeline\runCommand.ts line 478

```text
  462: 
  463:     if (continuityQuery !== "none") {
  464:       route = "tools";
  465:       setTraceRoute(trace, route);
  466: 
  467:       addTraceStep(
  468:         trace,
  469:         "workflow_update",
  470:         "Continuity query resolved from persisted session state",
  471:         continuityQuery
  472:       );
  473: 
  474:       saveMessage("user", userMessage, route, sessionId);
  475: 
  476:       reply = buildContinuityReply(continuityQuery, session);
  477: 
> 478:       return finalizePipelinePayload(sessionId, route, reply, trace);
  479:     }
  480: 
  481:     if (
  482:       unifiedCommand.domain === "context" &&
  483:       unifiedCommand.action === "show" &&
  484:       unifiedCommand.query === "command_help"
  485:     ) {
  486:       route = "chat";
  487:       setTraceRoute(trace, route);
  488:     
  489:       addTraceStep(
  490:         trace,
  491:         "router",
  492:         "Unified command language help handled",
  493:         "command_help",
  494:         unifiedCommand
```

### lib\chernobog\pipeline\runCommand.ts line 501

```text
  485:     ) {
  486:       route = "chat";
  487:       setTraceRoute(trace, route);
  488:     
  489:       addTraceStep(
  490:         trace,
  491:         "router",
  492:         "Unified command language help handled",
  493:         "command_help",
  494:         unifiedCommand
  495:       );
  496:     
  497:       saveMessage("user", userMessage, route, sessionId);
  498:     
  499:       reply = formatCommandLanguageHelp();
  500:     
> 501:       return finalizePipelinePayload(sessionId, route, reply, trace);
  502:     }
  503: 
  504:     const moduleFollowUp = await tryHandleModuleFollowUp({
  505:       userMessage,
  506:       sessionId,
  507:     });
  508:     
  509:     if (moduleFollowUp) {
  510:       addTraceStep(
  511:         trace,
  512:         "router",
  513:         "Module follow-up handler detected",
  514:         moduleFollowUp.moduleId ?? "module",
  515:         {
  516:           route: moduleFollowUp.route,
  517:           moduleId: moduleFollowUp.moduleId,
```

### lib\chernobog\pipeline\runCommand.ts line 526

```text
  510:       addTraceStep(
  511:         trace,
  512:         "router",
  513:         "Module follow-up handler detected",
  514:         moduleFollowUp.moduleId ?? "module",
  515:         {
  516:           route: moduleFollowUp.route,
  517:           moduleId: moduleFollowUp.moduleId,
  518:         }
  519:       );
  520:     
  521:       route = moduleFollowUp.route;
  522:       setTraceRoute(trace, route);
  523:       saveMessage("user", userMessage, route, sessionId);
  524:       reply = moduleFollowUp.reply;
  525:     
> 526:       return finalizePipelinePayload(sessionId, route, reply, trace);
  527:     }
  528: 
  529:     const domainHandler = getDomainHandler(unifiedCommand.domain);
  530: 
  531:     if (domainHandler) {
  532:       addTraceStep(
  533:         trace,
  534:         "router",
  535:         "Module domain handler detected",
  536:         unifiedCommand.moduleId ?? unifiedCommand.domain,
  537:         {
  538:           domain: unifiedCommand.domain,
  539:           action: unifiedCommand.action,
  540:           target: unifiedCommand.target,
  541:           moduleId: unifiedCommand.moduleId,
  542:           query: unifiedCommand.query,
```

### lib\chernobog\pipeline\runCommand.ts line 568

```text
  552:       route = moduleResult.route;
  553:       setTraceRoute(trace, route);
  554:       saveMessage("user", userMessage, route, sessionId);
  555:       reply = moduleResult.reply;
  556:     
  557:       addTraceStep(
  558:         trace,
  559:         "router",
  560:         "Module domain handler completed",
  561:         moduleResult.moduleId ?? unifiedCommand.moduleId ?? unifiedCommand.domain,
  562:         {
  563:           route: moduleResult.route,
  564:           moduleId: moduleResult.moduleId,
  565:         }
  566:       );
  567:     
> 568:       return finalizePipelinePayload(sessionId, route, reply, trace);
  569:     }
  570: 
  571:     const unifiedMemoryAction = unifiedToMemoryAction(unifiedCommand);
  572: 
  573: if (unifiedMemoryAction) {
  574:   route = "memory";
  575:   setTraceRoute(trace, route);
  576: 
  577:   addTraceStep(
  578:     trace,
  579:     "memory_route",
  580:     "Unified memory action handled",
  581:     unifiedMemoryAction.kind,
  582:     unifiedMemoryAction
  583:   );
  584: 
```

### lib\chernobog\pipeline\runCommand.ts line 628

```text
  612:       ? "State the memory you want removed."
  613:       : deleteMemory(fact).deleted
  614:         ? `Memory removed: ${fact}.`
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
  625:           ].join("\n");
  626:   }
  627: 
> 628:   return finalizePipelinePayload(sessionId, route, reply, trace);
  629: }
  630: 
  631:     const memoryArchitectureCommand =
  632:   unifiedToMemoryArchitectureCommand(unifiedCommand) ??
  633:   detectMemoryArchitectureCommand(userMessage);
  634: 
  635:     if (memoryArchitectureCommand !== "none") {
  636:       route = "memory";
  637:       setTraceRoute(trace, route);
  638: 
  639:       addTraceStep(
  640:         trace,
  641:         "memory_route",
  642:         "Layered memory command handled",
  643:         memoryArchitectureCommand
  644:       );
```

### lib\chernobog\pipeline\runCommand.ts line 660

```text
  644:       );
  645: 
  646:       const storedMemories = getMemories(50);
  647:       const recentMessages = getRecentMessages(sessionId, 12);
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
  658:       reply = memoryReply ?? "No memory architecture response was produced.";
  659: 
> 660:       return finalizePipelinePayload(sessionId, route, reply, trace);
  661:     }
  662: 
  663:     const plannerCommand =
  664:   unifiedToPlannerCommand(unifiedCommand) ?? parsePlannerCommand(userMessage);
  665:     const plannerReply = runPlannerCommand(plannerCommand, session);
  666: 
  667:     if (plannerReply) {
  668:       route = "planner";
  669:       setTraceRoute(trace, route);
  670: 
  671:       addTraceStep(
  672:         trace,
  673:         "router",
  674:         "Persistent planner command handled",
  675:         plannerCommand.kind,
  676:         plannerCommand
```

### lib\chernobog\pipeline\runCommand.ts line 684

```text
  668:       route = "planner";
  669:       setTraceRoute(trace, route);
  670: 
  671:       addTraceStep(
  672:         trace,
  673:         "router",
  674:         "Persistent planner command handled",
  675:         plannerCommand.kind,
  676:         plannerCommand
  677:       );
  678: 
  679:       saveMessage("user", userMessage, route, sessionId);
  680:       saveSessionContext(session);
  681: 
  682:       reply = plannerReply;
  683: 
> 684:       return finalizePipelinePayload(sessionId, route, reply, trace);
  685:     }
  686: 
  687:     addTraceStep(
  688:       trace,
  689:       "orchestration",
  690:       "Checking V5.0 autonomous execution layer"
  691:     );
  692: 
  693:     const sessionWithExecution = session as SessionWithExecutionState;
  694: 
  695:     const execution = await executeFromMessage(userMessage, {
  696:       previousState: sessionWithExecution.executionState,
  697:     });
  698: 
  699:     if (execution.handled) {
  700:       route = "tools";
```

### lib\chernobog\pipeline\runCommand.ts line 738

```text
  722:           },
  723:           steps: execution.task?.steps.map((step) => ({
  724:             id: step.id,
  725:             label: step.label,
  726:             action: step.action,
  727:             status: step.status,
  728:             risk: step.risk,
  729:             error: step.error,
  730:           })),
  731:         }
  732:       );
  733: 
  734:       saveMessage("user", userMessage, route, sessionId);
  735: 
  736:       reply = execution.response;
  737: 
> 738:       return finalizePipelinePayload(sessionId, route, reply, trace);
  739:     }
  740: 
  741:     addTraceStep(
  742:       trace,
  743:       "orchestration",
  744:       "V5.0 execution layer did not handle the message"
  745:     );
  746: 
  747:     const unifiedToolCall = unifiedToToolCall(unifiedCommand);
  748: 
  749:     if (unifiedToolCall && unifiedCommand.confidenceLevel === "high") {
  750:       route = "tools";
  751:       setTraceRoute(trace, route);
  752:       setTraceTool(trace, unifiedToolCall.tool);
  753: 
  754:       addTraceStep(
```

### lib\chernobog\pipeline\runCommand.ts line 788

```text
  772:           "vague_file_fallback",
  773:           "Blocked unified open_app because request looked like a file workflow",
  774:           userMessage,
  775:           normalizedToolCall
  776:         );
  777: 
  778:         const fallbackReply = await tryFileSearchFallback(
  779:           userMessage,
  780:           sessionId,
  781:           "open_file"
  782:         );
  783: 
  784:         reply =
  785:           fallbackReply ??
  786:           "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  787: 
> 788:         return finalizePipelinePayload(sessionId, route, reply, trace);
  789:       }
  790: 
  791:       if (
  792:         normalizedToolCall.tool === "read_text_file" ||
  793:         normalizedToolCall.tool === "open_file"
  794:       ) {
  795:         const fileInput = normalizedToolCall.input as { path: string };
  796: 
  797:         if (!looksLikeExplicitFilePath(fileInput.path)) {
  798:           const fallbackReply = await tryFileSearchFallback(
  799:             fileInput.path,
  800:             sessionId,
  801:             normalizedToolCall.tool
  802:           );
  803: 
  804:           if (fallbackReply) {
```

### lib\chernobog\pipeline\runCommand.ts line 834

```text
  818:             normalizedToolCall.input,
  819:             sessionId
  820:           );
  821: 
  822:           reply = formatToolReply(toolResult, sessionId);
  823:         }
  824:       } else {
  825:         const toolResult = await executeAndTrackTool(
  826:           normalizedToolCall.tool,
  827:           normalizedToolCall.input,
  828:           sessionId
  829:         );
  830: 
  831:         reply = formatToolReply(toolResult, sessionId);
  832:       }
  833: 
> 834:       return finalizePipelinePayload(sessionId, route, reply, trace);
  835:     }
  836: 
  837:       addTraceStep(trace, "orchestration", "Checking V4.4 orchestration layer");
  838: 
  839:       const orchestration = await orchestrateMessage(userMessage, session);
  840: 
  841:       if (orchestration.handled) {
  842:         route = orchestration.route;
  843:         setTraceRoute(trace, route);
  844: 
  845:         addTraceStep(
  846:           trace,
  847:           "orchestration",
  848:           "V4.4 orchestration handled the message",
  849:           orchestration.reply
  850:         );
```

### lib\chernobog\pipeline\runCommand.ts line 901

```text
  885:               "vague_file_fallback",
  886:               "Blocked open_app because request looked like a file-open workflow",
  887:               userMessage,
  888:               normalizedToolCall
  889:             );
  890: 
  891:             const fallbackReply = await tryFileSearchFallback(
  892:               userMessage,
  893:               sessionId,
  894:               "open_file"
  895:             );
  896: 
  897:             reply =
  898:               fallbackReply ??
  899:               "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  900: 
> 901:             return finalizePipelinePayload(sessionId, route, reply, trace);
  902:           }
  903: 
  904:           if (
  905:             normalizedToolCall.tool === "read_text_file" ||
  906:             normalizedToolCall.tool === "open_file"
  907:           ) {
  908:             const fileInput = normalizedToolCall.input as { path: string };
  909: 
  910:             if (!looksLikeExplicitFilePath(fileInput.path)) {
  911:               const fallbackReply = await tryFileSearchFallback(
  912:                 fileInput.path,
  913:                 sessionId,
  914:                 normalizedToolCall.tool
  915:               );
  916: 
  917:               if (fallbackReply) {
```

### lib\chernobog\pipeline\runCommand.ts line 985

```text
  969:                 "vague_file_fallback",
  970:                 "Blocked open_app because request looked like a file-open workflow",
  971:                 userMessage,
  972:                 normalizedToolCall
  973:               );
  974: 
  975:               const fallbackReply = await tryFileSearchFallback(
  976:                 userMessage,
  977:                 sessionId,
  978:                 "open_file"
  979:               );
  980: 
  981:               reply =
  982:                 fallbackReply ??
  983:                 "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";
  984: 
> 985:               return finalizePipelinePayload(sessionId, route, reply, trace);
  986:             }
  987: 
  988:             if (
  989:               normalizedToolCall.tool === "read_text_file" ||
  990:               normalizedToolCall.tool === "open_file"
  991:             ) {
  992:               const fileInput = normalizedToolCall.input as { path: string };
  993: 
  994:               if (!looksLikeExplicitFilePath(fileInput.path)) {
  995:                 const fallbackReply = await tryFileSearchFallback(
  996:                   fileInput.path,
  997:                   sessionId,
  998:                   normalizedToolCall.tool
  999:                 );
 1000: 
 1001:                 if (fallbackReply) {
```

### lib\chernobog\pipeline\runCommand.ts line 1113

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
 1107:                 shortTermEntries: memoryContext.shortTerm.lines.length,
 1108:                 workingEntries: memoryContext.working.lines.length,
 1109:                 longTermEntries: memoryContext.longTerm.lines.length,
 1110:               }
 1111:             );
 1112: 
>1113:             reply = await respondForRoute(route, userMessage, {
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
 1124:                   .join("\n\n"),
 1125:       activeSession.activeProjectId,
 1126:     ),
 1127:             });
 1128: 
 1129:             updateSessionAfterRoute(activeSession, route);
```

### lib\chernobog\pipeline\runCommand.ts line 1137

```text
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
 1131:           }
 1132:         }
 1133:       }
 1134:     
 1135:   }
 1136: 
>1137:   return finalizePipelinePayload(sessionId, route, reply, trace);
 1138: }
```

### lib\chernobog\pipeline\payload.ts line 106

```text
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
> 106: export function finalizePipelinePayload(
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
```

### lib\chernobog\pipeline\payload.ts line 126

```text
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
> 126:   saveMessage("assistant", reply, route, sessionId);
  127: 
  128:   return {
  129:     payload: buildUiPayload(sessionId, route, reply, trace),
  130:   };
  131: }
```


## Canonical 11J runtime / snapshot API

Pattern: `getChernobogWorldModelRuntime|ingestCurrentWorldState|snapshot\(\)|impact\(|WorldModelRuntimeSnapshot|WorldModelRelationship|WorldModelStatePrediction`

### lib\chernobog\worldModel\runtimeSingleton.ts line 23

```text
   11:   ChernobogWorldModelProductionRuntime,
   12: } from "./runtimeTypes";
   13: 
   14: type WorldModelRuntimeGlobals =
   15:   typeof globalThis & {
   16:     __chernobogWorldModelRuntimePromise?:
   17:       Promise<ChernobogWorldModelProductionRuntime>;
   18:   };
   19: 
   20: const worldModelGlobals =
   21:   globalThis as WorldModelRuntimeGlobals;
   22: 
>  23: export function getChernobogWorldModelRuntime():
   24:   Promise<ChernobogWorldModelProductionRuntime> {
   25:   if (
   26:     !worldModelGlobals
   27:       .__chernobogWorldModelRuntimePromise
   28:   ) {
   29:     const startup =
   30:       getChernobogWorldStateRuntime()
   31:         .then(
   32:           (worldStateRuntime) =>
   33:             startChernobogWorldModelRuntime({
   34:               worldStateRuntime,
   35:               eventBus:
```

### lib\chernobog\worldModel\runtimeTypes.ts line 14

```text
    2:   ChernobogEventBus,
    3: } from "../events/eventBus";
    4: import type {
    5:   ChernobogWorldStateRuntime,
    6:   WorldStateRecord,
    7: } from "../worldState";
    8: import type {
    9:   WorldModelCausalHypothesis,
   10:   WorldModelCausalObservation,
   11:   WorldModelImpactAssessment,
   12: } from "./causalTypes";
   13: import type {
>  14:   WorldModelStatePrediction,
   15: } from "./predictionTypes";
   16: import type {
   17:   WorldModelTemporalSnapshot,
   18: } from "./temporalTypes";
   19: import type {
   20:   WorldModelSnapshot,
   21: } from "./types";
   22: 
   23: export interface WorldModelRuntimeIngestResult {
   24:   records: number;
   25:   entityWrites: number;
   26:   relationshipWrites: number;
```

### lib\chernobog\worldModel\runtimeTypes.ts line 32

```text
   20:   WorldModelSnapshot,
   21: } from "./types";
   22: 
   23: export interface WorldModelRuntimeIngestResult {
   24:   records: number;
   25:   entityWrites: number;
   26:   relationshipWrites: number;
   27:   skippedRelationships: number;
   28:   temporalWrites: number;
   29:   predictionWrites: number;
   30: }
   31: 
>  32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
   34:   graph: WorldModelSnapshot;
   35:   temporal: WorldModelTemporalSnapshot;
   36:   predictions: WorldModelStatePrediction[];
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
   39: }
   40: 
   41: export interface ChernobogWorldModelRuntimeOptions {
   42:   clock?: () => Date;
   43: }
   44: 
```

### lib\chernobog\worldModel\runtimeTypes.ts line 36

```text
   24:   records: number;
   25:   entityWrites: number;
   26:   relationshipWrites: number;
   27:   skippedRelationships: number;
   28:   temporalWrites: number;
   29:   predictionWrites: number;
   30: }
   31: 
   32: export interface WorldModelRuntimeSnapshot {
   33:   generatedAt: string;
   34:   graph: WorldModelSnapshot;
   35:   temporal: WorldModelTemporalSnapshot;
>  36:   predictions: WorldModelStatePrediction[];
   37:   causalObservations: WorldModelCausalObservation[];
   38:   causalHypotheses: WorldModelCausalHypothesis[];
   39: }
   40: 
   41: export interface ChernobogWorldModelRuntimeOptions {
   42:   clock?: () => Date;
   43: }
   44: 
   45: export interface StartChernobogWorldModelRuntimeOptions {
   46:   worldStateRuntime: Pick<
   47:     ChernobogWorldStateRuntime,
   48:     "engine"
```

### lib\chernobog\worldModel\runtimeTypes.ts line 59

```text
   47:     ChernobogWorldStateRuntime,
   48:     "engine"
   49:   >;
   50:   eventBus: Pick<
   51:     ChernobogEventBus,
   52:     "subscribe"
   53:   >;
   54:   model?: import("./worldModelRuntime").ChernobogWorldModelRuntime;
   55: }
   56: 
   57: export interface ChernobogWorldModelProductionRuntime {
   58:   model: import("./worldModelRuntime").ChernobogWorldModelRuntime;
>  59:   ingestCurrentWorldState(): WorldModelRuntimeIngestResult;
   60:   stop(): void;
   61: }
   62: 
   63: export type WorldModelWorldStateReader =
   64:   () => WorldStateRecord[];
   65: 
   66: export interface WorldModelRuntimeImpactResult {
   67:   assessment: WorldModelImpactAssessment;
   68: }
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 30

```text
   18: import {
   19:   ChernobogWorldModelPredictionStore,
   20: } from "./predictionStore";
   21: import {
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
>  30:   WorldModelRuntimeSnapshot,
   31: } from "./runtimeTypes";
   32: import {
   33:   ChernobogWorldModelTemporalModel,
   34: } from "./temporalModel";
   35: import {
   36:   temporalObservationFromWorldState,
   37: } from "./temporalObservation";
   38: import type {
   39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
   41: 
   42: function canonicalEntityIdForWorldState(
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 39

```text
   27: import type {
   28:   ChernobogWorldModelRuntimeOptions,
   29:   WorldModelRuntimeIngestResult,
   30:   WorldModelRuntimeSnapshot,
   31: } from "./runtimeTypes";
   32: import {
   33:   ChernobogWorldModelTemporalModel,
   34: } from "./temporalModel";
   35: import {
   36:   temporalObservationFromWorldState,
   37: } from "./temporalObservation";
   38: import type {
>  39:   WorldModelStatePrediction,
   40: } from "./predictionTypes";
   41: 
   42: function canonicalEntityIdForWorldState(
   43:   record: WorldStateRecord,
   44: ): string {
   45:   const parts =
   46:     record.key
   47:       .split(".")
   48:       .map((part) =>
   49:         part.trim().toLowerCase(),
   50:       )
   51:       .filter(Boolean);
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 288

```text
  276:     this.causalHypotheses.set(
  277:       hypothesis.id,
  278:       structuredClone(
  279:         hypothesis,
  280:       ),
  281:     );
  282: 
  283:     return structuredClone(
  284:       hypothesis,
  285:     );
  286:   }
  287: 
> 288:   impact(
  289:     sourceEntityId: string,
  290:   ): WorldModelImpactAssessment {
  291:     return assessDownstreamImpact(
  292:       this.graph,
  293:       sourceEntityId,
  294:     );
  295:   }
  296: 
  297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
  300:   ): WorldModelStatePrediction | undefined {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 291

```text
  279:         hypothesis,
  280:       ),
  281:     );
  282: 
  283:     return structuredClone(
  284:       hypothesis,
  285:     );
  286:   }
  287: 
  288:   impact(
  289:     sourceEntityId: string,
  290:   ): WorldModelImpactAssessment {
> 291:     return assessDownstreamImpact(
  292:       this.graph,
  293:       sourceEntityId,
  294:     );
  295:   }
  296: 
  297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
  300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
  302:       predictNextWorldModelState(
  303:         this.temporal,
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 300

```text
  288:   impact(
  289:     sourceEntityId: string,
  290:   ): WorldModelImpactAssessment {
  291:     return assessDownstreamImpact(
  292:       this.graph,
  293:       sourceEntityId,
  294:     );
  295:   }
  296: 
  297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
> 300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
  302:       predictNextWorldModelState(
  303:         this.temporal,
  304:         entityId,
  305:         stateKey,
  306:         {
  307:           now:
  308:             this.clock(),
  309:         },
  310:       );
  311: 
  312:     if (!latest) {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 325

```text
  313:       return undefined;
  314:     }
  315: 
  316:     this.predictions.upsert(
  317:       latest,
  318:     );
  319: 
  320:     return structuredClone(
  321:       latest,
  322:     );
  323:   }
  324: 
> 325:   snapshot():
  326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
  331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 326

```text
  314:     }
  315: 
  316:     this.predictions.upsert(
  317:       latest,
  318:     );
  319: 
  320:     return structuredClone(
  321:       latest,
  322:     );
  323:   }
  324: 
  325:   snapshot():
> 326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
  331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
  338:       causalHypotheses: [
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 331

```text
  319: 
  320:     return structuredClone(
  321:       latest,
  322:     );
  323:   }
  324: 
  325:   snapshot():
  326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
> 331:         this.graph.snapshot(),
  332:       temporal:
  333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
  338:       causalHypotheses: [
  339:         ...this.causalHypotheses.values(),
  340:       ]
  341:         .sort(
  342:           (left, right) =>
  343:             left.id.localeCompare(
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 333

```text
  321:       latest,
  322:     );
  323:   }
  324: 
  325:   snapshot():
  326:     WorldModelRuntimeSnapshot {
  327:     return {
  328:       generatedAt:
  329:         this.clock().toISOString(),
  330:       graph:
  331:         this.graph.snapshot(),
  332:       temporal:
> 333:         this.temporal.snapshot(),
  334:       predictions:
  335:         this.predictions.list(),
  336:       causalObservations:
  337:         this.listCausalObservations(),
  338:       causalHypotheses: [
  339:         ...this.causalHypotheses.values(),
  340:       ]
  341:         .sort(
  342:           (left, right) =>
  343:             left.id.localeCompare(
  344:               right.id,
  345:             ),
```

### lib\chernobog\worldModel\dependencyModel.ts line 9

```text
    1: import type {
    2:   ChernobogWorldModelGraph,
    3: } from "./graph";
    4: import type {
    5:   WorldModelDependencyPath,
    6:   WorldModelImpactAssessment,
    7: } from "./causalTypes";
    8: import type {
>   9:   WorldModelRelationship,
   10: } from "./types";
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
   19:     "requires-model",
   20:     "hosted-on",
   21:     "served-by",
```

### lib\chernobog\worldModel\dependencyModel.ts line 27

```text
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
   19:     "requires-model",
   20:     "hosted-on",
   21:     "served-by",
   22:     "backed-by",
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
   26:   relationship:
>  27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
```

### lib\chernobog\worldModel\dependencyModel.ts line 41

```text
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
>  41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
   52:     .sort(
   53:       (left, right) =>
```

### lib\chernobog\worldModel\dependencyModel.ts line 64

```text
   52:     .sort(
   53:       (left, right) =>
   54:         left.id.localeCompare(
   55:           right.id,
   56:         ),
   57:     );
   58: }
   59: 
   60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
>  64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
   69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
   73:           entityId,
   74:     )
   75:     .sort(
   76:       (left, right) =>
```

### lib\chernobog\worldModel\dependencyModel.ts line 213

```text
  201:       }
  202: 
  203:       return left.relationshipIds
  204:         .join("|")
  205:         .localeCompare(
  206:           right.relationshipIds
  207:             .join("|"),
  208:         );
  209:     },
  210:   );
  211: }
  212: 
> 213: export function assessDownstreamImpact(
  214:   graph:
  215:     ChernobogWorldModelGraph,
  216:   sourceEntityId: string,
  217:   options: {
  218:     maxDepth?: number;
  219:   } = {},
  220: ): WorldModelImpactAssessment {
  221:   const source =
  222:     normalizeWorldModelEntityId(
  223:       sourceEntityId,
  224:     );
  225: 
```

### lib\chernobog\worldModel\types.ts line 42

```text
   30: 
   31: export interface WorldModelEntityInput {
   32:   id: string;
   33:   kind: WorldModelEntityKind;
   34:   label: string;
   35:   aliases?: string[];
   36:   attributes?: Record<string, unknown>;
   37:   confidence?: number;
   38:   observedAt: string;
   39:   evidence?: Partial<WorldModelEvidence>;
   40: }
   41: 
>  42: export interface WorldModelRelationship {
   43:   id: string;
   44:   type: string;
   45:   fromEntityId: string;
   46:   toEntityId: string;
   47:   directed: boolean;
   48:   confidence: number;
   49:   observedAt: string;
   50:   attributes: Record<string, unknown>;
   51:   evidence: WorldModelEvidence;
   52: }
   53: 
   54: export interface WorldModelRelationshipInput {
```

### lib\chernobog\worldModel\types.ts line 54

```text
   42: export interface WorldModelRelationship {
   43:   id: string;
   44:   type: string;
   45:   fromEntityId: string;
   46:   toEntityId: string;
   47:   directed: boolean;
   48:   confidence: number;
   49:   observedAt: string;
   50:   attributes: Record<string, unknown>;
   51:   evidence: WorldModelEvidence;
   52: }
   53: 
>  54: export interface WorldModelRelationshipInput {
   55:   type: string;
   56:   fromEntityId: string;
   57:   toEntityId: string;
   58:   directed?: boolean;
   59:   confidence?: number;
   60:   observedAt: string;
   61:   attributes?: Record<string, unknown>;
   62:   evidence?: Partial<WorldModelEvidence>;
   63: }
   64: 
   65: export interface WorldModelNeighbor {
   66:   entity: WorldModelEntity;
```

### lib\chernobog\worldModel\types.ts line 67

```text
   55:   type: string;
   56:   fromEntityId: string;
   57:   toEntityId: string;
   58:   directed?: boolean;
   59:   confidence?: number;
   60:   observedAt: string;
   61:   attributes?: Record<string, unknown>;
   62:   evidence?: Partial<WorldModelEvidence>;
   63: }
   64: 
   65: export interface WorldModelNeighbor {
   66:   entity: WorldModelEntity;
>  67:   relationship: WorldModelRelationship;
   68:   direction: "outgoing" | "incoming" | "undirected";
   69: }
   70: 
   71: export interface WorldModelSnapshot {
   72:   entities: WorldModelEntity[];
   73:   relationships: WorldModelRelationship[];
   74: }
```

### lib\chernobog\worldModel\types.ts line 73

```text
   61:   attributes?: Record<string, unknown>;
   62:   evidence?: Partial<WorldModelEvidence>;
   63: }
   64: 
   65: export interface WorldModelNeighbor {
   66:   entity: WorldModelEntity;
   67:   relationship: WorldModelRelationship;
   68:   direction: "outgoing" | "incoming" | "undirected";
   69: }
   70: 
   71: export interface WorldModelSnapshot {
   72:   entities: WorldModelEntity[];
>  73:   relationships: WorldModelRelationship[];
   74: }
```

### lib\chernobog\worldModel\predictionTypes.ts line 18

```text
    6:   | "insufficient"
    7:   | "weak"
    8:   | "moderate"
    9:   | "strong";
   10: 
   11: export interface WorldModelNextStateCandidate {
   12:   value: WorldStateJsonValue;
   13:   transitionCount: number;
   14:   probability: number;
   15:   averageDwellMs?: number;
   16: }
   17: 
>  18: export interface WorldModelStatePrediction {
   19:   id: string;
   20:   entityId: string;
   21:   stateKey: string;
   22:   currentValue: WorldStateJsonValue;
   23:   status: WorldModelPredictionStatus;
   24:   confidence: number;
   25:   sampleCount: number;
   26:   generatedAt: string;
   27:   candidates: WorldModelNextStateCandidate[];
   28:   predictedNextValue?: WorldStateJsonValue;
   29:   predictedProbability?: number;
   30:   expectedTransitionAfterMs?: number;
```


## Canonical dependency direction and impact semantics

Pattern: `isDependencyRelationship|requires-model|served-by|incomingDependencyRelationships|outgoingDependencyRelationships|assessDownstreamImpact|directlyDependentEntityIds|transitivelyDependentEntityIds`

### lib\chernobog\worldModel\worldModelRuntime.ts line 13

```text
    1: import type {
    2:   WorldStateRecord,
    3: } from "../worldState";
    4: import type {
    5:   WorldModelCausalHypothesis,
    6:   WorldModelCausalObservation,
    7:   WorldModelImpactAssessment,
    8: } from "./causalTypes";
    9: import {
   10:   evaluateWorldModelCausalHypothesis,
   11: } from "./causalHypothesis";
   12: import {
>  13:   assessDownstreamImpact,
   14: } from "./dependencyModel";
   15: import {
   16:   ChernobogWorldModelGraph,
   17: } from "./graph";
   18: import {
   19:   ChernobogWorldModelPredictionStore,
   20: } from "./predictionStore";
   21: import {
   22:   predictNextWorldModelState,
   23: } from "./predictiveModel";
   24: import {
   25:   ChernobogWorldModelProjector,
   26: } from "./projector";
   27: import type {
```

### lib\chernobog\worldModel\worldModelRuntime.ts line 291

```text
  277:       hypothesis.id,
  278:       structuredClone(
  279:         hypothesis,
  280:       ),
  281:     );
  282: 
  283:     return structuredClone(
  284:       hypothesis,
  285:     );
  286:   }
  287: 
  288:   impact(
  289:     sourceEntityId: string,
  290:   ): WorldModelImpactAssessment {
> 291:     return assessDownstreamImpact(
  292:       this.graph,
  293:       sourceEntityId,
  294:     );
  295:   }
  296: 
  297:   prediction(
  298:     entityId: string,
  299:     stateKey: string,
  300:   ): WorldModelStatePrediction | undefined {
  301:     const latest =
  302:       predictNextWorldModelState(
  303:         this.temporal,
  304:         entityId,
  305:         stateKey,
```

### lib\chernobog\worldModel\dependencyModel.ts line 19

```text
    5:   WorldModelDependencyPath,
    6:   WorldModelImpactAssessment,
    7: } from "./causalTypes";
    8: import type {
    9:   WorldModelRelationship,
   10: } from "./types";
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
>  19:     "requires-model",
   20:     "hosted-on",
   21:     "served-by",
   22:     "backed-by",
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
```

### lib\chernobog\worldModel\dependencyModel.ts line 21

```text
    7: } from "./causalTypes";
    8: import type {
    9:   WorldModelRelationship,
   10: } from "./types";
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
   19:     "requires-model",
   20:     "hosted-on",
>  21:     "served-by",
   22:     "backed-by",
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
```

### lib\chernobog\worldModel\dependencyModel.ts line 25

```text
   11: import {
   12:   normalizeWorldModelEntityId,
   13: } from "./validation";
   14: 
   15: const DEPENDENCY_RELATIONSHIP_TYPES =
   16:   new Set([
   17:     "depends-on",
   18:     "uses-repository",
   19:     "requires-model",
   20:     "hosted-on",
   21:     "served-by",
   22:     "backed-by",
   23:   ]);
   24: 
>  25: export function isDependencyRelationship(
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
```

### lib\chernobog\worldModel\dependencyModel.ts line 37

```text
   23:   ]);
   24: 
   25: export function isDependencyRelationship(
   26:   relationship:
   27:     WorldModelRelationship,
   28: ): boolean {
   29:   return (
   30:     relationship.directed &&
   31:     DEPENDENCY_RELATIONSHIP_TYPES.has(
   32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
>  37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
   41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
```

### lib\chernobog\worldModel\dependencyModel.ts line 46

```text
   32:       relationship.type,
   33:     )
   34:   );
   35: }
   36: 
   37: function outgoingDependencyRelationships(
   38:   graph:
   39:     ChernobogWorldModelGraph,
   40:   entityId: string,
   41: ): WorldModelRelationship[] {
   42:   return graph
   43:     .listRelationships()
   44:     .filter(
   45:       (relationship) =>
>  46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
   52:     .sort(
   53:       (left, right) =>
   54:         left.id.localeCompare(
   55:           right.id,
   56:         ),
   57:     );
   58: }
   59: 
   60: function incomingDependencyRelationships(
```

### lib\chernobog\worldModel\dependencyModel.ts line 60

```text
   46:         isDependencyRelationship(
   47:           relationship,
   48:         ) &&
   49:         relationship.fromEntityId ===
   50:           entityId,
   51:     )
   52:     .sort(
   53:       (left, right) =>
   54:         left.id.localeCompare(
   55:           right.id,
   56:         ),
   57:     );
   58: }
   59: 
>  60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
   64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
   69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
   73:           entityId,
   74:     )
```

### lib\chernobog\worldModel\dependencyModel.ts line 69

```text
   55:           right.id,
   56:         ),
   57:     );
   58: }
   59: 
   60: function incomingDependencyRelationships(
   61:   graph:
   62:     ChernobogWorldModelGraph,
   63:   entityId: string,
   64: ): WorldModelRelationship[] {
   65:   return graph
   66:     .listRelationships()
   67:     .filter(
   68:       (relationship) =>
>  69:         isDependencyRelationship(
   70:           relationship,
   71:         ) &&
   72:         relationship.toEntityId ===
   73:           entityId,
   74:     )
   75:     .sort(
   76:       (left, right) =>
   77:         left.id.localeCompare(
   78:           right.id,
   79:         ),
   80:     );
   81: }
   82: 
   83: export function findDependencyPaths(
```

### lib\chernobog\worldModel\dependencyModel.ts line 139

```text
  125:   const visit = (
  126:     current: string,
  127:     entityIds: string[],
  128:     relationshipIds: string[],
  129:   ): void => {
  130:     if (
  131:       relationshipIds.length >=
  132:       maxDepth
  133:     ) {
  134:       return;
  135:     }
  136: 
  137:     for (
  138:       const relationship
> 139:       of outgoingDependencyRelationships(
  140:         graph,
  141:         current,
  142:       )
  143:     ) {
  144:       const next =
  145:         relationship.toEntityId;
  146: 
  147:       if (
  148:         entityIds.includes(next)
  149:       ) {
  150:         continue;
  151:       }
  152: 
  153:       const nextEntities = [
```

### lib\chernobog\worldModel\dependencyModel.ts line 213

```text
  199:           right.depth
  200:         );
  201:       }
  202: 
  203:       return left.relationshipIds
  204:         .join("|")
  205:         .localeCompare(
  206:           right.relationshipIds
  207:             .join("|"),
  208:         );
  209:     },
  210:   );
  211: }
  212: 
> 213: export function assessDownstreamImpact(
  214:   graph:
  215:     ChernobogWorldModelGraph,
  216:   sourceEntityId: string,
  217:   options: {
  218:     maxDepth?: number;
  219:   } = {},
  220: ): WorldModelImpactAssessment {
  221:   const source =
  222:     normalizeWorldModelEntityId(
  223:       sourceEntityId,
  224:     );
  225: 
  226:   const maxDepth =
  227:     options.maxDepth ?? 8;
```

### lib\chernobog\worldModel\dependencyModel.ts line 242

```text
  228: 
  229:   if (
  230:     !Number.isInteger(maxDepth) ||
  231:     maxDepth < 1 ||
  232:     maxDepth > 32
  233:   ) {
  234:     throw new Error(
  235:       "world model impact maxDepth must be an integer between 1 and 32.",
  236:     );
  237:   }
  238: 
  239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
> 242:       directlyDependentEntityIds: [],
  243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
  246:   }
  247: 
  248:   const direct =
  249:     incomingDependencyRelationships(
  250:       graph,
  251:       source,
  252:     )
  253:       .map(
  254:         (relationship) =>
  255:           relationship.fromEntityId,
  256:       )
```

### lib\chernobog\worldModel\dependencyModel.ts line 243

```text
  229:   if (
  230:     !Number.isInteger(maxDepth) ||
  231:     maxDepth < 1 ||
  232:     maxDepth > 32
  233:   ) {
  234:     throw new Error(
  235:       "world model impact maxDepth must be an integer between 1 and 32.",
  236:     );
  237:   }
  238: 
  239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
  242:       directlyDependentEntityIds: [],
> 243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
  246:   }
  247: 
  248:   const direct =
  249:     incomingDependencyRelationships(
  250:       graph,
  251:       source,
  252:     )
  253:       .map(
  254:         (relationship) =>
  255:           relationship.fromEntityId,
  256:       )
  257:       .sort();
```

### lib\chernobog\worldModel\dependencyModel.ts line 249

```text
  235:       "world model impact maxDepth must be an integer between 1 and 32.",
  236:     );
  237:   }
  238: 
  239:   if (!graph.getEntity(source)) {
  240:     return {
  241:       sourceEntityId: source,
  242:       directlyDependentEntityIds: [],
  243:       transitivelyDependentEntityIds: [],
  244:       dependencyPaths: [],
  245:     };
  246:   }
  247: 
  248:   const direct =
> 249:     incomingDependencyRelationships(
  250:       graph,
  251:       source,
  252:     )
  253:       .map(
  254:         (relationship) =>
  255:           relationship.fromEntityId,
  256:       )
  257:       .sort();
  258: 
  259:   const pathByKey =
  260:     new Map<
  261:       string,
  262:       WorldModelDependencyPath
  263:     >();
```

### lib\chernobog\worldModel\dependencyModel.ts line 279

```text
  265:   const visitDependents = (
  266:     currentDependency: string,
  267:     entityIds: string[],
  268:     relationshipIds: string[],
  269:   ): void => {
  270:     if (
  271:       relationshipIds.length >=
  272:       maxDepth
  273:     ) {
  274:       return;
  275:     }
  276: 
  277:     for (
  278:       const relationship
> 279:       of incomingDependencyRelationships(
  280:         graph,
  281:         currentDependency,
  282:       )
  283:     ) {
  284:       const dependent =
  285:         relationship.fromEntityId;
  286: 
  287:       if (
  288:         entityIds.includes(
  289:           dependent,
  290:         )
  291:       ) {
  292:         continue;
  293:       }
```

### lib\chernobog\worldModel\dependencyModel.ts line 334

```text
  320:         `${dependent}->${source}:${nextRelationshipIds.join("|")}`,
  321:         path,
  322:       );
  323: 
  324:       visitDependents(
  325:         dependent,
  326:         nextEntityIds,
  327:         nextRelationshipIds,
  328:       );
  329:     }
  330:   };
  331: 
  332:   for (
  333:     const relationship
> 334:     of incomingDependencyRelationships(
  335:       graph,
  336:       source,
  337:     )
  338:   ) {
  339:     const dependent =
  340:       relationship.fromEntityId;
  341: 
  342:     const path:
  343:       WorldModelDependencyPath = {
  344:         fromEntityId:
  345:           dependent,
  346:         toEntityId:
  347:           source,
  348:         relationshipIds: [
```

### lib\chernobog\worldModel\dependencyModel.ts line 412

```text
  398:         (path) =>
  399:           path.fromEntityId,
  400:       ),
  401:     ),
  402:   ].sort();
  403: 
  404:   const transitive =
  405:     allDependents.filter(
  406:       (id) =>
  407:         !direct.includes(id),
  408:     );
  409: 
  410:   return {
  411:     sourceEntityId: source,
> 412:     directlyDependentEntityIds:
  413:       direct,
  414:     transitivelyDependentEntityIds:
  415:       transitive,
  416:     dependencyPaths:
  417:       paths,
  418:   };
  419: }
```

### lib\chernobog\worldModel\dependencyModel.ts line 414

```text
  400:       ),
  401:     ),
  402:   ].sort();
  403: 
  404:   const transitive =
  405:     allDependents.filter(
  406:       (id) =>
  407:         !direct.includes(id),
  408:     );
  409: 
  410:   return {
  411:     sourceEntityId: source,
  412:     directlyDependentEntityIds:
  413:       direct,
> 414:     transitivelyDependentEntityIds:
  415:       transitive,
  416:     dependencyPaths:
  417:       paths,
  418:   };
  419: }
```


## Existing response validation / repair / retry patterns

Pattern: `validate.*response|response.*valid|repair.*response|retry.*response|rewrite|revision|repairPrompt|validationIssue|structured.*output|format:\s*"json"|JSON\.parse`

- `lib\chernobog\runtimeConfig.ts:28` - function rewriteKnownOllamaEndpoint(
- `lib\chernobog\runtimeConfig.ts:101` - rewriteKnownOllamaEndpoint(explicitUrl, "generate") ??
- `lib\chernobog\runtimeConfig.ts:119` - const rewritten = rewriteKnownOllamaEndpoint(explicitUrl, "chat");
- `lib\chernobog\runtimeConfig.ts:166` - rewriteKnownOllamaEndpoint(
- `lib\chernobog\command-language\adapters.ts:152` - revision: command.query ?? command.raw,
- `lib\chernobog\events\corruption.ts:122` - JSON.parse(
- `lib\chernobog\events\store.ts:598` - * the repair rewrite.
- `lib\chernobog\execution\internalExecutionHandlers.ts:506` - "- Do not propose broad vague rewrites.",
- `lib\chernobog\execution\internalExecutionHandlers.ts:1017` - "Rewrite exactly one existing project file.",
- `lib\chernobog\execution\internalExecutionHandlers.ts:1187` - "rewrite",
- `lib\chernobog\learning\experience.ts:112` - return JSON.parse(json) as Record<
- `lib\chernobog\learning\lessonStore.ts:7` - export class ChernobogLearnedLessonStore{private readonly lessons=new Map<string,LearnedLesson>();get size(){return this.lessons.size;}upsert(l:LearnedLesson){this.lessons.set(l.key,clone(l));return clone(l);}get(k:string){const l=this.lessons.get(k);return l?clone(l):undefined;}list(o:{activeOnly?:boolean}={}):LearnedLesson[]{return[...this.lessons.values()].filter(l=>!o.activeOnly||l.status==="active").sort((a,b)=>a.key.localeCompare(b.key)).map(clone);}remove(k:string){return this.lessons.delete(k);}clear(){this.lessons.clear();}async save(filePath:string,now=new Date()){const s:Snapshot={schemaVersion:1,savedAt:now.toISOString(),lessons:this.list()};await mkdir(dirname(filePath),{recursive:true});const temp=`${filePath}.tmp`;await writeFile(temp,`${JSON.stringify(s,null,2)}\n`,"utf8");await rename(temp,filePath);}async load(filePath:string){const raw=await readFile(filePath,"utf8");const parsed=JSON.parse(raw) as Partial<Snapshot>;if(parsed.schemaVersion!==1||!Array.isArray(parsed.lessons))throw new Error("invalid learned lesson snapshot.");const next=new Map<string,LearnedLesson>();for(const rawLesson of parsed.lessons){const l=validate(rawLesson);next.set(l.key,l);}this.lessons.clear();for(const [k,l] of next)this.lessons.set(k,l);}}
- `lib\chernobog\planner\coordinator.ts:31` - function extractRevisionSteps(revision: string): string[] {
- `lib\chernobog\planner\coordinator.ts:32` - const cleaned = revision.trim();
- `lib\chernobog\planner\coordinator.ts:39` - `Apply revision: ${cleaned}`,
- `lib\chernobog\planner\coordinator.ts:145` - const revision = command.revision ?? "";
- `lib\chernobog\planner\coordinator.ts:146` - const newSteps = extractRevisionSteps(revision);
- `lib\chernobog\planner\parser.ts:69` - revision: message,
- `lib\chernobog\planner\types.ts:38` - revision?: string;
- `lib\chernobog\session\store.ts:133` - const parsed = JSON.parse(row.state_json) as Partial<SessionContext>;
- `lib\chernobog\tools\intent.ts:105` - format: "json",
- `lib\chernobog\tools\intent.ts:119` - const parsed = JSON.parse(extracted);
- `lib\chernobog\worldModel\validation.ts:81` - return JSON.parse(encoded) as Record<
- `lib\chernobog\worldState\snapshotStore.ts:98` - parsed = JSON.parse(raw);
- `scripts\run-chernobog-phase11-full-acceptance.mjs:295` - JSON.parse(
- `scripts\verify-chernobog-phase11-11a-a-ollama-runtime-consolidation.ts:81` - format: "json",
- `scripts\verify-chernobog-phase11-11a-a-ollama-runtime-consolidation.ts:256` - 'format: "json"',
- `scripts\verify-chernobog-phase11-11a-a-ollama-runtime-consolidation.ts:262` - "tool-intent classification now uses the shared runtime and common structured-output transport",
- `scripts\verify-chernobog-phase11-11a-a-ollama-runtime-consolidation.ts:323` - "rewriteKnownOllamaEndpoint",
- `scripts\verify-chernobog-phase11-11i-d-learning-promotion-governance.ts:9` - async function main(){console.log("Chernobog Phase 11I-D - Learning Promotion & Governance");console.log("=======================================================");const c=pattern();const held=assessLearningPromotion(c,{authority:"system-policy",approved:false});assert.equal(held.decision,"hold");assert.ok(held.reasons.some(r=>r.code==="approval-required"));pass("correction patterns cannot promote without explicit governance approval");const ctx={authority:"user-approved" as const,approved:true,approvedBy:"user",approvedAt:"2026-08-25T20:31:00.000Z"};assert.equal(assessLearningPromotion(c,ctx).decision,"promote");pass("strong supported correction pattern becomes promotable after explicit approval");assert.equal(assessLearningPromotion(pattern({supportCount:2}),ctx).decision,"hold");pass("insufficient support remains on hold even when manually approved");assert.equal(assessLearningPromotion(pattern({confidence:0.6}),ctx).decision,"hold");pass("approval cannot override the minimum confidence floor");assert.equal(assessLearningPromotion(pattern({supportCount:4,contradictionCount:2}),ctx).decision,"reject");pass("excessive contradictory evidence causes hard rejection rather than promotion");const lesson=promoteLearningPattern(c,ctx,{now:new Date("2026-08-25T20:32:00.000Z")});assert.equal(lesson.status,"active");assert.equal(lesson.governance.authority,"user-approved");assert.equal(lesson.statement,c.statement);pass("promotion produces an auditable learned lesson with governance and source evidence");assert.throws(()=>promoteLearningPattern(pattern({confidence:0.4}),ctx));pass("lesson construction cannot bypass the promotion gate");const revoked=revokeLearnedLesson(lesson,"User preference changed.",new Date("2026-08-25T20:40:00.000Z"));assert.equal(revoked.status,"revoked");assert.equal(revoked.revocationReason,"User preference changed.");pass("learned lessons can be explicitly revoked with audit reason and timestamp");const store=new ChernobogLearnedLessonStore();store.upsert(lesson);store.upsert(revoked);assert.equal(store.size,1);assert.equal(store.list({activeOnly:true}).length,0);pass("lesson store deduplicates by stable lesson key and respects revocation state");store.upsert(lesson);const returned=store.get(lesson.key);assert.ok(returned);if(!returned)throw new Error("Expected stored lesson.");returned.statement="mutated";assert.notEqual(store.get(lesson.key)?.statement,"mutated");pass("lesson store returns defensive clones");const dir=await mkdtemp(join(tmpdir(),"chernobog-11i-d-"));const path=join(dir,"lessons.json");await store.save(path,new Date("2026-08-25T20:45:00.000Z"));assert.ok((await readFile(path,"utf8")).includes('"schemaVersion": 1'));const restored=new ChernobogLearnedLessonStore();await restored.load(path);assert.equal(restored.get(lesson.key)?.statement,lesson.statement);pass("approved lessons persist atomically and restore from versioned durable storage");const keys=Object.keys(lesson);assert.equal(keys.includes("behaviorOverride"),false);assert.equal(keys.includes("promptRewrite"),false);assert.equal(keys.includes("execute"),false);pass("11I-D can persist governed lessons without directly modifying behavior, prompts, or execution");console.log("=======================================================");console.log("PASS Phase 11I-D Learning Promotion & Governance acceptance");}
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:437` - "rewritePrompt",
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:443` - "rewriteCode",
- `scripts\verify-chernobog-phase11-11i-f-full-integration.ts:454` - "11I integration contains no direct code rewrite, prompt rewrite, permission grant, or execution path",

## Existing reliable Ollama generation interfaces

Pattern: `generateWithReliableOllama|generateWithOllama|GenerateWithReliableOllamaOptions|numPredict|temperature|messages`

- `lib\chernobog\llm\modelFailureFallback.ts:2` - GenerateWithOllamaResult,
- `lib\chernobog\llm\modelFailureFallback.ts:24` - GenerateWithOllamaResult["failureKind"];
- `lib\chernobog\llm\modelFailureFallback.ts:71` - GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:21` - export type GenerateWithOllamaOptions = {
- `lib\chernobog\llm\ollamaClient.ts:24` - messages?: OllamaChatMessage[];
- `lib\chernobog\llm\ollamaClient.ts:26` - temperature?: number;
- `lib\chernobog\llm\ollamaClient.ts:29` - numPredict?: number;
- `lib\chernobog\llm\ollamaClient.ts:41` - export type GenerateWithOllamaResult = {
- `lib\chernobog\llm\ollamaClient.ts:88` - function normalizeMessages(
- `lib\chernobog\llm\ollamaClient.ts:89` - messages: OllamaChatMessage[] | undefined,
- `lib\chernobog\llm\ollamaClient.ts:91` - if (!messages) {
- `lib\chernobog\llm\ollamaClient.ts:95` - if (messages.length === 0) {
- `lib\chernobog\llm\ollamaClient.ts:96` - throw new Error("Ollama chat messages must not be empty.");
- `lib\chernobog\llm\ollamaClient.ts:99` - return messages.map((message) => {
- `lib\chernobog\llm\ollamaClient.ts:114` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:118` - const messages = normalizeMessages(options.messages);
- `lib\chernobog\llm\ollamaClient.ts:120` - if (prompt && messages) {
- `lib\chernobog\llm\ollamaClient.ts:122` - "Ollama request must use either prompt or messages, not both.",
- `lib\chernobog\llm\ollamaClient.ts:126` - if (!prompt && !messages) {
- `lib\chernobog\llm\ollamaClient.ts:128` - "Ollama request requires a prompt or chat messages.",
- `lib\chernobog\llm\ollamaClient.ts:133` - temperature: options.temperature ?? 0.35,
- `lib\chernobog\llm\ollamaClient.ts:136` - if (options.numPredict !== undefined) {
- `lib\chernobog\llm\ollamaClient.ts:138` - !Number.isInteger(options.numPredict) ||
- `lib\chernobog\llm\ollamaClient.ts:139` - options.numPredict < 1
- `lib\chernobog\llm\ollamaClient.ts:142` - "Ollama numPredict must be a positive integer.",
- `lib\chernobog\llm\ollamaClient.ts:146` - requestOptions.num_predict = options.numPredict;
- `lib\chernobog\llm\ollamaClient.ts:149` - if (messages) {
- `lib\chernobog\llm\ollamaClient.ts:153` - inputChars: messages.reduce(
- `lib\chernobog\llm\ollamaClient.ts:159` - messages,
- `lib\chernobog\llm\ollamaClient.ts:184` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:187` - ): GenerateWithOllamaResult {
- `lib\chernobog\llm\ollamaClient.ts:197` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:269` - ): GenerateWithOllamaResult {
- `lib\chernobog\llm\ollamaClient.ts:285` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:312` - export async function generateWithOllama(
- `lib\chernobog\llm\ollamaClient.ts:313` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:314` - ): Promise<GenerateWithOllamaResult> {
- `lib\chernobog\llm\ollamaClient.ts:404` - temperature: options.temperature ?? 0.35,
- `lib\chernobog\llm\ollamaClient.ts:406` - ...(options.numPredict !== undefined
- `lib\chernobog\llm\ollamaClient.ts:408` - numPredict: options.numPredict,
- `lib\chernobog\llm\reliableOllama.ts:5` - GenerateWithOllamaOptions,
- `lib\chernobog\llm\reliableOllama.ts:6` - GenerateWithOllamaResult,
- `lib\chernobog\llm\reliableOllama.ts:10` - generateWithOllama,
- `lib\chernobog\llm\reliableOllama.ts:46` - export interface GenerateWithReliableOllamaOptions
- `lib\chernobog\llm\reliableOllama.ts:47` - extends GenerateWithOllamaOptions {
- `lib\chernobog\llm\reliableOllama.ts:57` - export type GenerateWithReliableOllamaResult =
- `lib\chernobog\llm\reliableOllama.ts:59` - GenerateWithOllamaResult,
- `lib\chernobog\llm\reliableOllama.ts:79` - () => Promise<GenerateWithOllamaResult>;
- `lib\chernobog\llm\reliableOllama.ts:167` - GenerateWithOllamaResult & {
- `lib\chernobog\llm\reliableOllama.ts:194` - GenerateWithOllamaResult
- `lib\chernobog\llm\reliableOllama.ts:265` - ): GenerateWithReliableOllamaResult {
- `lib\chernobog\llm\reliableOllama.ts:358` - GenerateWithOllamaResult;
- `lib\chernobog\llm\reliableOllama.ts:406` - GenerateWithOllamaResult & {
- `lib\chernobog\llm\reliableOllama.ts:424` - export async function generateWithReliableOllama(
- `lib\chernobog\llm\reliableOllama.ts:426` - GenerateWithReliableOllamaOptions,
- `lib\chernobog\llm\reliableOllama.ts:427` - ): Promise<GenerateWithReliableOllamaResult> {
- `lib\chernobog\llm\reliableOllama.ts:500` - generateWithOllama(
- `lib\chernobog\llm\reliableOllama.ts:555` - GenerateWithOllamaResult & {
- `lib\chernobog\llm\reliableOllama.ts:570` - GenerateWithOllamaOptions = {
- `lib\chernobog\llm\reliableOllama.ts:582` - generateWithOllama(
- `lib\chernobog\llm\runtimeDiagnostics.ts:2` - GenerateWithOllamaResult,
- `lib\chernobog\llm\runtimeDiagnostics.ts:10` - role: GenerateWithOllamaResult["role"];
- `lib\chernobog\llm\runtimeDiagnostics.ts:14` - transport?: GenerateWithOllamaResult["transport"];
- `lib\chernobog\llm\runtimeDiagnostics.ts:19` - result: GenerateWithOllamaResult,
- `lib\chernobog\router.ts:2` - generateWithReliableOllama as generateWithOllama,
- `lib\chernobog\router.ts:19` - recentMessages?: OllamaMessage[];
- `lib\chernobog\router.ts:177` - messages: OllamaMessage[],
- `lib\chernobog\router.ts:180` - temperature?: number;
- `lib\chernobog\router.ts:181` - numPredict?: number;
- `lib\chernobog\router.ts:184` - const result = await generateWithOllama({
- `lib\chernobog\router.ts:186` - messages,
- `lib\chernobog\router.ts:187` - temperature: options.temperature ?? 0.4,
- `lib\chernobog\router.ts:188` - numPredict: options.numPredict ?? 500,
- `lib\chernobog\router.ts:225` - const messages: OllamaMessage[] = [
- `lib\chernobog\router.ts:233` - messages.push({
- `lib\chernobog\router.ts:245` - messages.push({
- `lib\chernobog\router.ts:251` - if (context.recentMessages && context.recentMessages.length > 0) {
- `lib\chernobog\router.ts:252` - messages.push(...context.recentMessages);
- `lib\chernobog\router.ts:257` - context.recentMessages &&
- `lib\chernobog\router.ts:258` - context.recentMessages.length > 0
- `lib\chernobog\router.ts:260` - messages.push({
- `lib\chernobog\router.ts:279` - messages.push({
- `lib\chernobog\router.ts:286` - messages.push({
- `lib\chernobog\router.ts:292` - messages,
- `lib\chernobog\router.ts:295` - numPredict: ROUTED_RESPONSE_NUM_PREDICT,

## Existing World Model verifier names for regression chaining

Pattern: `world-model|11j|dependency|currentness|evidence-contract|final-authority`

- `scripts\run-chernobog-phase11-full-acceptance.mjs:29` - "11j",
- `scripts\run-chernobog-phase11-full-acceptance.mjs:229` - `No verifier found for ${phase.toUpperCase()}. Full Phase 11 acceptance requires 11A through 11J coverage.`,
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:18` - "Chernobog Phase 11J-A - Entity & Relationship Model",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:62` - "world-model entities normalize identifiers, evidence, aliases, confidence, and attributes",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:173` - "world-model graph stores grounded entities and relationships",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:350` - "11G World State records can be grounded into world-model entities with provenance intact",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:365` - "world-model snapshots and query results are defensively cloned",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:390` - "11J-A represents structure without inventing causal inference or prediction",
- `scripts\verify-chernobog-phase11-11j-a-entity-relationship-model.ts:397` - "PASS Phase 11J-A Entity & Relationship Model acceptance",
- `scripts\verify-chernobog-phase11-11j-b-relationship-grounding-graph-projection.ts:50` - "Chernobog Phase 11J-B - Relationship Grounding & Graph Projection",
- `scripts\verify-chernobog-phase11-11j-b-relationship-grounding-graph-projection.ts:360` - "11J-B grounds observed structure without inventing causal or predictive semantics",
- `scripts\verify-chernobog-phase11-11j-b-relationship-grounding-graph-projection.ts:367` - "PASS Phase 11J-B Relationship Grounding & Graph Projection acceptance",
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:8` - findDependencyPaths,
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:16` - "Chernobog Phase 11J-C - Causal & Dependency Model",
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:104` - findDependencyPaths(
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:127` - "dependency traversal finds deterministic multi-hop structural paths",
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:169` - findDependencyPaths(
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:302` - "three strong repeated incidents plus structural dependency can support a causal hypothesis",
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:432` - "11J-C keeps causality explicitly hypothetical and does not create an execution path",
- `scripts\verify-chernobog-phase11-11j-c-causal-dependency-model.ts:439` - "PASS Phase 11J-C Causal & Dependency Model acceptance",
- `scripts\verify-chernobog-phase11-11j-d-temporal-model-state-transitions.ts:50` - "Chernobog Phase 11J-D - Temporal Model & State Transitions",
- `scripts\verify-chernobog-phase11-11j-d-temporal-model-state-transitions.ts:149` - "11G World State observations become temporal world-model observations with provenance",
- `scripts\verify-chernobog-phase11-11j-d-temporal-model-state-transitions.ts:358` - "11J-D models observed history and transitions without predicting the future",
- `scripts\verify-chernobog-phase11-11j-d-temporal-model-state-transitions.ts:365` - "PASS Phase 11J-D Temporal Model & State Transitions acceptance",
- `scripts\verify-chernobog-phase11-11j-e-predictive-state-model.ts:35` - "Chernobog Phase 11J-E - Predictive State Model",
- `scripts\verify-chernobog-phase11-11j-e-predictive-state-model.ts:434` - "11J-E forecasts remain probabilistic evidence and cannot execute or masquerade as fact",
- `scripts\verify-chernobog-phase11-11j-e-predictive-state-model.ts:441` - "PASS Phase 11J-E Predictive State Model acceptance",
- `scripts\verify-chernobog-phase11-11j-f-full-integration.ts:23` - "Chernobog Phase 11J-F - World Model Integration & Full Acceptance",
- `scripts\verify-chernobog-phase11-11j-f-full-integration.ts:358` - "repeated temporal evidence plus structural dependency can support an explicitly hypothetical causal model",
- `scripts\verify-chernobog-phase11-11j-f-full-integration.ts:384` - "world-model snapshot unifies graph, temporal, predictive, and causal state",
- `scripts\verify-chernobog-phase11-11j-f-full-integration.ts:450` - "PASS Phase 11J-F World Model Integration & Full Acceptance",
- `scripts\verify-chernobog-phase11-11j-f-full-integration.ts:453` - "PASS Phase 11J World Model COMPLETE",
- `scripts\verify-chernobog-phase11-active-project-context.ts:177` - "Explain dependency injection in TypeScript.",
- `scripts\verify-chernobog-phase11-full-system-acceptance.ts:399` - "lib/chernobog/world-model",
- `scripts\verify-chernobog-phase11-full-system-acceptance.ts:408` - "Cognition/learning/world-model/memory",
- `scripts\verify-chernobog-phase11-full-system-acceptance.ts:412` - "cognition, learning, world-model, and memory layers contain no direct task or tool execution calls",
- `scripts\verify-chernobog-phase11-full-system-acceptance.ts:636` - "app/api/world-model/route.ts",
- `scripts\verify-chernobog-phase11-full-system-acceptance.ts:727` - "11J World Model",
- `scripts\verify-chernobog-phase11-model-dependency-grounding-v1.ts:39` - projectorId: "phase11-model-dependency-test",
- `scripts\verify-chernobog-phase11-model-dependency-grounding-v1.ts:96` - pass("role assignment grounds a requires-model dependency");
- `scripts\verify-chernobog-phase11-model-dependency-grounding-v1.ts:106` - pass("assignment grounds concrete model served-by provider dependency");
- `scripts\verify-chernobog-phase11-model-dependency-grounding-v1.ts:115` - pass("dependency preserves World State key and event provenance");
- `scripts\verify-chernobog-phase11-model-dependency-grounding-v1.ts:155` - console.log("PASS Phase 11 Model Dependency Grounding v1 Acceptance");
- `scripts\verify-chernobog-phase11-world-model-conversational-bridge.ts:34` - "bridge consumes canonical 11J runtime singleton",
- `scripts\verify-chernobog-phase11-world-model-conversational-bridge.ts:39` - "bridge synchronizes 11J from canonical current 11G state before snapshotting",
- `scripts\verify-chernobog-phase11-world-model-currentness-relevance.ts:25` - "currentness layer preserves canonical 11J runtime and snapshot",
- `scripts\verify-chernobog-phase11-world-model-currentness-relevance.ts:32` - "currentness is derived from canonical 11G evidence rather than wall-clock guesses",
- `scripts\verify-chernobog-phase11-world-model-currentness-relevance.ts:68` - "explicit 11J relationship boundary remains intact",
- `scripts\verify-chernobog-phase11-world-model-currentness-relevance.ts:78` - "PASS Phase 11 World Model Currentness and Relevance Acceptance",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:23` - source.includes("isDependencyRelationship"),
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:24` - "packet uses canonical 11J dependency classifier",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:29` - source.includes("MAX_DEPENDENCY_RELATIONSHIPS"),
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:30` - "dependency-aware bounded relationship selection exists",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:48` - "World Model explicit dependency relationships:",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:50` - "dependency relationships receive a dedicated model-facing section",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:55` - "World Model explicit dependency relationships:",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:60` - "dependency section precedes generic relationship evidence",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:65` - "Use explicit dependency relationships for consequence reasoning.",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:67` - "model-facing instructions bind consequence reasoning to explicit dependency evidence",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:72` - "If at least one explicit dependency relationship is listed, substantive relational evidence is present.",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:84` - "prediction discipline from currentness patch remains intact",
- `scripts\verify-chernobog-phase11-world-model-dependency-aware-packet-v1.ts:95` - "PASS Phase 11 World Model Dependency-Aware Conversational Packet v1",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:25` - "function buildDependencyChains(",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:33` - "complete role-to-model-to-provider chains are built from canonical dependency edges",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:38` - "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:41` - "highest-priority canonical 11J evidence",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:43` - "dependency backbone is explicitly highest-priority evidence",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:51` - 'explicitDependencyRelationships.length > 0 ? "substantive" : "none"',
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:53` - "relational status is deterministic from canonical dependency presence",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:78` - "WORLD MODEL CRITICAL DEPENDENCY BACKBONE (highest-priority canonical 11J evidence):",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:83` - "dependency backbone precedes verbose entity evidence",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:88` - "when a DEPENDENCY_CHAIN includes --served-by--> model:ollama, do not claim that the Ollama relationship is missing.",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:102` - "do not list an explicit edge, entity, provider relationship, or dependency chain as missing",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:109` - "World Model explicit dependency relationships:",
- `scripts\verify-chernobog-phase11-world-model-dependency-backbone-v3.ts:128` - "PASS Phase 11 World Model Dependency Backbone v3",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:23` - "const explicitDependencyRelationships",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:26` - "isDependencyRelationship(entry.item)",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:28` - "explicit canonical dependency edges are extracted independently of generic packet selection",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:46` - "NOT dependency edges",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:48` - "has-state attachments are explicitly prohibited from dependency classification",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:58` - "canonical 11J impact engine is exposed to conversation",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:80` - "when explicit dependency relationships exposed>0, do not output the no-substantive-relational-evidence sentinel.",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:82` - "relational-evidence sentinel is forbidden when canonical dependency edges exist",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:87` - "World Model explicit dependency relationships:",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:93` - "World Model explicit dependency relationships:",
- `scripts\verify-chernobog-phase11-world-model-evidence-contract-v2.ts:98` - "legacy dependency-packet section contract remains compatible",
- `scripts\verify-chernobog-phase11-world-model-final-authority-reinforcement-v1.ts:32` - "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
- `scripts\verify-chernobog-phase11-world-model-final-authority-reinforcement-v1.ts:52` - "has-state and has-role are not dependency edges.",
- `scripts\verify-chernobog-phase11-world-model-final-authority-reinforcement-v1.ts:59` - "If model:ollama has listed direct or transitive dependents, do not say that no Ollama dependency path exists.",

## Required validator behavior

The implementation built from this preflight should validate generated World Model answers against structured canonical 11J data, not against prior assistant prose.

Minimum checks:
- directed dependency edge direction must match fromEntityId -> toEntityId
- dependency claims must exist in canonical dependency relationships
- consequence claims must be a subset of canonical impact(sourceEntityId) dependents
- unsupported predictions must not be presented as supported
- RELATIONAL_STATUS/substantive graph evidence must block the no-substantive-relational-evidence fallback
- has-state / has-role must not be treated as dependency relationships

Repair policy:
- validate once after normal response generation
- if valid, return response unchanged
- if invalid, perform at most one bounded repair pass using canonical validation issues + canonical evidence
- validate repaired response again
- if repair remains invalid, return a deterministic safe grounded fallback rather than knowingly returning contradictory graph claims
- repair must not execute tools, mutate World State, mutate World Model, alter governance, or learn from the invalid response
