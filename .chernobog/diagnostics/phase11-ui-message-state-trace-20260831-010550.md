# Chernobog Phase 11 - UI Message / Session State Trace

Generated: 2026-08-31T01:05:50.9512907+01:00

File: `components\UmbraAIConsole.tsx`

Purpose: trace browser-side state after the backend /api/chat path was proven correct.

## Component types, constants, and initial state

```text
   1: "use client";
   2: 
   3: import { useEffect, useMemo, useRef, useState } from "react";
   4: import CommandShell from "./command/CommandShell";
   5: import type { PendingState } from "@/lib/chernobog/session/pending";
   6: import type {
   7:   WorkflowKind,
   8:   FileWorkflowStep,
   9: } from "@/lib/chernobog/pipeline/types";
  10: 
  11: import RightDashboardRail from "./chernobog/RightDashboardRail";
  12: 
  13: export type LogSource = "USER" | "SYSTEM" | "ROUTER" | "CHERNOBOG";
  14: 
  15: export type LogEntry = {
  16:   id: string;
  17:   source: LogSource;
  18:   text: string;
  19:   timestamp: string;
  20: };
  21: 
  22: export type CommandStatus =
  23:   | "ONLINE"
  24:   | "ACTIVE"
  25:   | "IDLE"
  26:   | "LOCKED"
  27:   | "ALERT"
  28:   | "STANDBY";
  29: 
  30: export type SubsystemItem = {
  31:   key: string;
  32:   label: string;
  33:   status: CommandStatus;
  34:   detail: string;
  35: };
  36: 
  37: export type SessionSnapshot = {
  38:   sessionId: string;
  39:   activeRoute: string;
  40:   lastTool: string;
  41:   lastToolSummary: string;
  42:   currentSearchQuery: string;
  43:   currentSearchRoot: string;
  44:   lastSelectedFile: string;
  45:   lastReadFile: string;
  46:   pendingState: PendingState;
  47:   workflowKind: WorkflowKind;
  48:   workflowStep: FileWorkflowStep | "none";
  49:   workflowCandidateCount: number;
  50:   activePlan: ActivePlanSnapshot | null;
  51:   executionState: ExecutionStateSnapshot | null;
  52: };
  53: 
  54: export type DebugTraceStep = {
  55:   type: string;
  56:   label: string;
  57:   detail?: string;
  58:   timestamp: string;
  59: };
  60: 
  61: export type DebugTrace = {
  62:   id: string;
  63:   route: string;
  64:   tool: string;
  65:   success: boolean;
  66:   failureCategory?: string;
  67:   summary: string;
  68:   steps: DebugTraceStep[];
  69: };
  70: 
  71: type ChatApiResponse = {
  72:   route?: string;
  73:   reply?: string;
  74:   sessionId?: string;
  75:   tool?: string;
  76:   toolSummary?: string;
  77:   searchQuery?: string;
  78:   searchRoot?: string;
  79:   selectedFile?: string;
  80:   readFile?: string;
  81:   pendingState?: PendingState;
  82:   workflowKind?: WorkflowKind;
  83:   workflowStep?: FileWorkflowStep | "none";
  84:   workflowCandidateCount?: number;
  85:   activePlan?: ActivePlanSnapshot | null;
  86:   executionState?: ExecutionStateSnapshot | null;
  87:   debugTrace?: DebugTrace;
  88:   details?: string;
  89:   error?: string;
  90: };
  91: 
  92: type ActivePlanSnapshot = {
  93:   id: string;
  94:   title: string;
  95:   status: string;
  96:   stepCount: number;
  97:   activeStep: string | null;
  98: };
  99: 
 100: type ExecutionStateSnapshot = {
 101:   selectedFilePath?: string;
 102:   selectedFolderPath?: string;
 103: 
 104:   lastReadFilePath?: string;
 105:   hasLastReadText?: boolean;
 106: 
 107:   lastCreatedFilePath?: string;
 108:   lastCreatedFolderPath?: string;
 109: 
 110:   lastAppendedFilePath?: string;
 111: 
 112:   lastRenamedFilePath?: string;
 113:   lastRenamedFolderPath?: string;
 114: 
 115:   lastCopiedFilePath?: string;
 116:   lastCopiedFolderPath?: string;
 117: 
 118:   lastMovedFilePath?: string;
 119:   lastMovedFolderPath?: string;
 120: 
 121:   lastOpenedApp?: unknown;
 122:   lastOpenedUrl?: unknown;
 123: 
 124:   hasSystemStatus?: boolean;
 125:   hasPathInfo?: boolean;
 126:   hasListedDirectory?: boolean;
 127: 
 128:   activeTaskGoal?: string;
 129:   activeTaskStatus?: string;
 130:   lastTaskGoal?: string;
 131:   lastTaskStatus?: string;
 132: };
 133: 
 134: const SESSION_STORAGE_KEY = "chernobog.sessionId";
 135: const REQUEST_TIMEOUT_MS = 120_000;
 136: 
 137: function nowTime() {
 138:   return new Date().toLocaleTimeString();
 139: }
 140: 
 141: function makeLog(source: LogSource, text: string): LogEntry {
 142:   return {
 143:     id: crypto.randomUUID(),
 144:     source,
 145:     text,
 146:     timestamp: nowTime(),
 147:   };
 148: }
 149: 
 150: function normalizeText(value: unknown, fallback = "none") {
 151:   if (typeof value !== "string") return fallback;
 152: 
 153:   const trimmed = value.trim();
 154:   return trimmed.length > 0 ? trimmed : fallback;
 155: }
 156: 
 157: function isWorkflowActive(step: SessionSnapshot["workflowStep"]) {
 158:   return step === "searching" || step === "reading";
 159: }
 160: 
 161: function isWorkflowBlocked(step: SessionSnapshot["workflowStep"]) {
 162:   return step === "failed";
 163: }
 164: 
 165: function isWorkflowSelectionRequired(
 166:   step: SessionSnapshot["workflowStep"],
 167:   pending: PendingState
 168: ) {
 169:   return (
 170:     step === "awaiting_selection" ||
 171:     pending === "awaiting_file_selection" ||
 172:     pending === "awaiting_confirmation" ||
 173:     pending === "awaiting_clarification"
 174:   );
 175: }
 176: 
 177: function getOrCreateBrowserSessionId() {
 178:   const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
 179: 
 180:   if (existing && existing.trim().length > 0) {
```

## Session ID lifecycle and hydration

```text
 180:   if (existing && existing.trim().length > 0) {
 181:     return existing;
 182:   }
 183: 
 184:   const created = crypto.randomUUID();
 185:   window.localStorage.setItem(SESSION_STORAGE_KEY, created);
 186: 
 187:   return created;
 188: }
 189: 
 190: function getReviewUrlFromResponse(responseBody: unknown): string | null {
 191:   if (!responseBody || typeof responseBody !== "object") {
 192:     return null;
 193:   }
 194: 
 195:   const body = responseBody as {
 196:     payload?: {
 197:       reply?: unknown;
 198:       modulePayload?: {
 199:         reviewUrl?: unknown;
 200:       };
 201:     };
 202:     modulePayload?: {
 203:       reviewUrl?: unknown;
 204:     };
 205:     reviewUrl?: unknown;
 206:     reply?: unknown;
 207:   };
 208: 
 209:   const structuredReviewUrl =
 210:     body.payload?.modulePayload?.reviewUrl ??
 211:     body.modulePayload?.reviewUrl ??
 212:     body.reviewUrl;
 213: 
 214:   if (
 215:     typeof structuredReviewUrl === "string" &&
 216:     structuredReviewUrl.trim().length > 0
 217:   ) {
 218:     return structuredReviewUrl;
 219:   }
 220: 
 221:   const replyText =
 222:     typeof body.payload?.reply === "string"
 223:       ? body.payload.reply
 224:       : typeof body.reply === "string"
 225:         ? body.reply
 226:         : "";
 227: 
 228:   const match = replyText.match(/\/review\/vault-pr\/[a-zA-Z0-9._-]+/);
 229: 
 230:   return match?.[0] ?? null;
 231: }
 232: 
 233: function openReviewWorkspace(reviewUrl: string): void {
 234:   const absoluteUrl = new URL(reviewUrl, window.location.origin).toString();
 235: 
 236:   console.log("[Vault PR] Opening review workspace:", absoluteUrl);
 237: 
 238:   const openedWindow = window.open(
 239:     absoluteUrl,
 240:     "chernobog-vault-pr-review",
 241:     "width=1500,height=950"
 242:   );
 243: 
 244:   if (!openedWindow) {
 245:     console.warn("[Vault PR] Popup blocked. Opening in current tab.");
 246:     window.location.href = absoluteUrl;
 247:   }
 248: }
 249: 
 250: export default function UmbraAIConsole() {
 251:   const [sessionId, setSessionId] = useState<string | null>(null);
 252:   const [input, setInput] = useState("");
 253:   const [isBusy, setIsBusy] = useState(false);
 254: 
 255:   const [debugTrace, setDebugTrace] = useState<DebugTrace | null>(null);
 256:   const [debugVisible, setDebugVisible] = useState(true);
 257:   const [developerMode, setDeveloperMode] = useState(true);
 258: 
 259:   const [logs, setLogs] = useState<LogEntry[]>(() => [
 260:     makeLog("SYSTEM", "God Program interface initialized."),
 261:     makeLog("SYSTEM", "Core intelligence online. Session orchestration stable."),
 262:   ]);
 263: 
 264:   const [session, setSession] = useState<SessionSnapshot>({
 265:     sessionId: "pending",
 266:     activeRoute: "idle",
 267:     lastTool: "none",
 268:     lastToolSummary: "No tool activity yet.",
 269:     currentSearchQuery: "none",
 270:     currentSearchRoot: "none",
 271:     lastSelectedFile: "none",
 272:     lastReadFile: "none",
 273:     pendingState: "none",
 274:     workflowKind: "none",
 275:     workflowStep: "none",
 276:     workflowCandidateCount: 0,
 277:     activePlan: null,
 278:     executionState: null,
 279:   });
 280: 
 281:   const scrollRef = useRef<HTMLDivElement | null>(null);
 282: 
 283:   useEffect(() => {
 284:     const browserSessionId = getOrCreateBrowserSessionId();
 285: 
 286:     queueMicrotask(() => {
 287:       setSessionId(browserSessionId);
 288: 
 289:       setSession((prev) => ({
 290:       ...prev,
 291:       sessionId: browserSessionId,
 292:     }));
 293:     });
 294: 
 295:   }, []);
 296: 
 297:   useEffect(() => {
 298:     if (!sessionId) return;
 299:   
 300:     const activeSessionId = sessionId;
 301:     let cancelled = false;
 302:   
 303:     async function hydrateSession() {
 304:       try {
 305:         const response = await fetch(
 306:           `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
 307:           {
 308:             method: "GET",
 309:             cache: "no-store",
 310:           }
 311:         );
 312: 
 313:         if (!response.ok) {
 314:           return;
 315:         }
 316: 
 317:         const data: ChatApiResponse = await response.json();
 318: 
 319:         if (cancelled) {
 320:           return;
 321:         }
 322: 
 323:         setSession((prev) => ({
 324:           ...prev,
 325:           sessionId: activeSessionId,
 326:           activeRoute: normalizeText(data.route, prev.activeRoute),
 327:           lastTool: normalizeText(data.tool, prev.lastTool),
 328:           lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
 329:           currentSearchQuery: normalizeText(
 330:             data.searchQuery,
 331:             prev.currentSearchQuery
 332:           ),
 333:           currentSearchRoot: normalizeText(
 334:             data.searchRoot,
 335:             prev.currentSearchRoot
 336:           ),
 337:           lastSelectedFile: normalizeText(
 338:             data.selectedFile,
 339:             prev.lastSelectedFile
 340:           ),
 341:           lastReadFile: normalizeText(data.readFile, prev.lastReadFile),
 342:           pendingState: data.pendingState ?? "none",
 343:           workflowKind: data.workflowKind ?? prev.workflowKind,
 344:           workflowStep: data.workflowStep ?? prev.workflowStep,
 345:           workflowCandidateCount:
 346:             data.workflowCandidateCount ?? prev.workflowCandidateCount,
 347:           activePlan:
 348:             "activePlan" in data ? data.activePlan ?? null : prev.activePlan,
 349:             executionState:
 350:             "executionState" in data ? data.executionState ?? null : prev.executionState,
 351:         }));
 352: 
 353:         setLogs((prev) => [
 354:           ...prev,
 355:           makeLog("SYSTEM", "Previous session context restored."),
 356:         ]);
 357:       } catch {
 358:         if (!cancelled) {
 359:           setLogs((prev) => [
 360:             ...prev,
 361:             makeLog("SYSTEM", "No previous session context restored."),
 362:           ]);
 363:         }
 364:       }
 365:     }
 366: 
 367:     void hydrateSession();
 368: 
 369:     return () => {
 370:       cancelled = true;
 371:     };
 372:   }, [sessionId]);
 373: 
 374:   useEffect(() => {
 375:     scrollRef.current?.scrollTo({
 376:       top: scrollRef.current.scrollHeight,
 377:       behavior: "smooth",
 378:     });
 379:   }, [logs]);
 380: 
```

## Submit flow and response parsing

```text
 430:             : "LOCKED",
 431:         detail: selectionRequired
 432:           ? "Workflow awaiting operator resolution"
 433:           : workflowActive
 434:             ? "Signal bus carrying active workflow traffic"
 435:             : "Remote directive channel stable",
 436:       },
 437:       {
 438:         key: "memory",
 439:         label: "Memory Engine",
 440:         status: route === "memory" || lastTool !== "none" ? "ACTIVE" : "ONLINE",
 441:         detail:
 442:           route === "memory"
 443:             ? "Recall and persistence path engaged"
 444:             : lastTool !== "none"
 445:               ? `Most recent tool path: ${session.lastTool}`
 446:               : "Long-term recall operational",
 447:       },
 448:       {
 449:         key: "guardian",
 450:         label: "Guardian Node",
 451:         status: route === "guardian" || workflowBlocked ? "ALERT" : "STANDBY",
 452:         detail:
 453:           route === "guardian"
 454:             ? "Constraint review layer engaged"
 455:             : workflowBlocked
 456:               ? "Constraint-aware recovery posture active"
 457:               : "Ethical & directive constraints active",
 458:       },
 459:     ];
 460:   }, [isBusy, session]);
 461: 
 462:   async function handleSubmit(e: React.FormEvent) {
 463:     e.preventDefault();
 464: 
 465:     const value = input.trim();
 466:     if (!value || isBusy || !sessionId) return;
 467:     const activeSessionId = sessionId;
 468: 
 469:     setInput("");
 470:     setIsBusy(true);
 471: 
 472:     setLogs((prev) => [
 473:       ...prev,
 474:       makeLog("USER", value),
 475:       makeLog("SYSTEM", "Routing directive to core..."),
 476:     ]);
 477: 
 478:     setSession((prev) => ({
 479:       ...prev,
 480:       pendingState: "processing",
 481:     }));
 482: 
 483:     try {
 484:       const controller = new AbortController();
 485:       const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 486: 
 487:       let response: Response;
 488: 
 489:       try {
 490:         response = await fetch("/api/chat", {
 491:           method: "POST",
 492:           headers: {
 493:             "Content-Type": "application/json",
 494:           },
 495:           signal: controller.signal,
 496:           body: JSON.stringify({
 497:             message: value,
 498:             sessionId: activeSessionId,
 499:           }),
 500:         });
 501:       } finally {
 502:         clearTimeout(timeout);
 503:       }
 504: 
 505:       const data: ChatApiResponse = await response.json();
 506: 
 507:       const reviewUrl = getReviewUrlFromResponse(data);
 508: 
 509:       console.log("[Vault PR reviewUrl]", reviewUrl);
 510: 
 511:       if (reviewUrl) {
 512:         openReviewWorkspace(reviewUrl);
 513:       }
 514: 
 515:       if (!response.ok) {
 516:         throw new Error(data?.details || data?.error || "Request failed.");
 517:       }
 518: 
 519:       if (data.debugTrace) {
 520:         setDebugTrace(data.debugTrace);
 521:       }
 522: 
 523:       const route = normalizeText(data.route, "unknown").toUpperCase();
 524:       const reply = normalizeText(data.reply, "No response returned.");
 525: 
 526:       setLogs((prev) => [
 527:         ...prev,
 528:         makeLog("ROUTER", route),
 529:         makeLog("CHERNOBOG", reply),
 530:       ]);
 531: 
 532:       setSession((prev) => ({
 533:         ...prev,
 534:         sessionId: activeSessionId,
 535:         activeRoute: normalizeText(data.route, prev.activeRoute),
 536:         lastTool: normalizeText(data.tool, prev.lastTool),
 537:         lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
 538:         currentSearchQuery: normalizeText(
 539:           data.searchQuery,
 540:           prev.currentSearchQuery
 541:         ),
 542:         currentSearchRoot: normalizeText(data.searchRoot, prev.currentSearchRoot),
 543:         lastSelectedFile: normalizeText(data.selectedFile, prev.lastSelectedFile),
 544:         lastReadFile: normalizeText(data.readFile, prev.lastReadFile),
 545:         pendingState: data.pendingState ?? "none",
 546:         workflowKind: data.workflowKind ?? prev.workflowKind,
 547:         workflowStep: data.workflowStep ?? prev.workflowStep,
 548:         workflowCandidateCount:
 549:           data.workflowCandidateCount ?? prev.workflowCandidateCount,
 550:         activePlan:
 551:           "activePlan" in data ? data.activePlan ?? null : prev.activePlan,
 552:           executionState:
 553:           "executionState" in data ? data.executionState ?? null : prev.executionState,
 554:       }));
 555:     } catch (error) {
 556:       const message = error instanceof Error ? error.message : "Request failed.";
 557: 
 558:       setLogs((prev) => [...prev, makeLog("SYSTEM", message)]);
 559: 
 560:       setSession((prev) => ({
 561:         ...prev,
 562:         pendingState: "none",
 563:         lastToolSummary: message,
 564:       }));
 565:     } finally {
 566:       setIsBusy(false);
 567:     }
 568:   }
 569: 
 570:   async function resetCurrentSession() {
 571:     if (!sessionId) return;
 572: 
 573:     try {
 574:       await fetch("/api/session/reset", {
 575:         method: "POST",
```

## Session reset flow

```text
 568:   }
 569: 
 570:   async function resetCurrentSession() {
 571:     if (!sessionId) return;
 572: 
 573:     try {
 574:       await fetch("/api/session/reset", {
 575:         method: "POST",
 576:         headers: {
 577:           "Content-Type": "application/json",
 578:         },
 579:         body: JSON.stringify({
 580:           sessionId,
 581:         }),
 582:       });
 583:     } finally {
 584:       const nextSessionId = crypto.randomUUID();
 585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
 586:       window.location.reload();
 587:     }
 588:   }
 589: 
 590:   const developerPanel = developerMode ? (
 591:     <RightDashboardRail
 592:       sessionId={sessionId}
 593:       session={session}
 594:       debugTrace={debugTrace}
 595:       debugVisible={debugVisible}
 596:       onToggleDebugVisible={() => setDebugVisible((value) => !value)}
 597:       onSelectTrace={setDebugTrace}
 598:     />
 599:   ) : null;
 600: 
 601:   return (
 602:     <CommandShell
 603:       logs={logs}
 604:       subsystems={subsystems}
 605:       session={session}
 606:       input={input}
 607:       setInput={setInput}
 608:       onSubmit={handleSubmit}
 609:       isBusy={isBusy}
 610:       scrollRef={scrollRef}
 611:       developerMode={developerMode}
 612:       setDeveloperMode={setDeveloperMode}
 613:       developerPanel={developerPanel}
 614:       resetCurrentSession={resetCurrentSession}
 615:     />
 616:   );
 617: }
```

## Message rendering region

```text
```

## Message state mutations

Pattern: `setMessages|messages\b|messageHistory|history`

_No matches._

## Session state mutations

Pattern: `setSessionId|setSession|sessionId|activeSessionId`

### line 38

```text
   32:   label: string;
   33:   status: CommandStatus;
   34:   detail: string;
   35: };
   36: 
   37: export type SessionSnapshot = {
>  38:   sessionId: string;
   39:   activeRoute: string;
   40:   lastTool: string;
   41:   lastToolSummary: string;
   42:   currentSearchQuery: string;
   43:   currentSearchRoot: string;
   44:   lastSelectedFile: string;
```

### line 74

```text
   68:   steps: DebugTraceStep[];
   69: };
   70: 
   71: type ChatApiResponse = {
   72:   route?: string;
   73:   reply?: string;
>  74:   sessionId?: string;
   75:   tool?: string;
   76:   toolSummary?: string;
   77:   searchQuery?: string;
   78:   searchRoot?: string;
   79:   selectedFile?: string;
   80:   readFile?: string;
```

### line 134

```text
  128:   activeTaskGoal?: string;
  129:   activeTaskStatus?: string;
  130:   lastTaskGoal?: string;
  131:   lastTaskStatus?: string;
  132: };
  133: 
> 134: const SESSION_STORAGE_KEY = "chernobog.sessionId";
  135: const REQUEST_TIMEOUT_MS = 120_000;
  136: 
  137: function nowTime() {
  138:   return new Date().toLocaleTimeString();
  139: }
  140: 
```

### line 177

```text
  171:     pending === "awaiting_file_selection" ||
  172:     pending === "awaiting_confirmation" ||
  173:     pending === "awaiting_clarification"
  174:   );
  175: }
  176: 
> 177: function getOrCreateBrowserSessionId() {
  178:   const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  179: 
  180:   if (existing && existing.trim().length > 0) {
  181:     return existing;
  182:   }
  183: 
```

### line 251

```text
  245:     console.warn("[Vault PR] Popup blocked. Opening in current tab.");
  246:     window.location.href = absoluteUrl;
  247:   }
  248: }
  249: 
  250: export default function UmbraAIConsole() {
> 251:   const [sessionId, setSessionId] = useState<string | null>(null);
  252:   const [input, setInput] = useState("");
  253:   const [isBusy, setIsBusy] = useState(false);
  254: 
  255:   const [debugTrace, setDebugTrace] = useState<DebugTrace | null>(null);
  256:   const [debugVisible, setDebugVisible] = useState(true);
  257:   const [developerMode, setDeveloperMode] = useState(true);
```

### line 264

```text
  258: 
  259:   const [logs, setLogs] = useState<LogEntry[]>(() => [
  260:     makeLog("SYSTEM", "God Program interface initialized."),
  261:     makeLog("SYSTEM", "Core intelligence online. Session orchestration stable."),
  262:   ]);
  263: 
> 264:   const [session, setSession] = useState<SessionSnapshot>({
  265:     sessionId: "pending",
  266:     activeRoute: "idle",
  267:     lastTool: "none",
  268:     lastToolSummary: "No tool activity yet.",
  269:     currentSearchQuery: "none",
  270:     currentSearchRoot: "none",
```

### line 265

```text
  259:   const [logs, setLogs] = useState<LogEntry[]>(() => [
  260:     makeLog("SYSTEM", "God Program interface initialized."),
  261:     makeLog("SYSTEM", "Core intelligence online. Session orchestration stable."),
  262:   ]);
  263: 
  264:   const [session, setSession] = useState<SessionSnapshot>({
> 265:     sessionId: "pending",
  266:     activeRoute: "idle",
  267:     lastTool: "none",
  268:     lastToolSummary: "No tool activity yet.",
  269:     currentSearchQuery: "none",
  270:     currentSearchRoot: "none",
  271:     lastSelectedFile: "none",
```

### line 284

```text
  278:     executionState: null,
  279:   });
  280: 
  281:   const scrollRef = useRef<HTMLDivElement | null>(null);
  282: 
  283:   useEffect(() => {
> 284:     const browserSessionId = getOrCreateBrowserSessionId();
  285: 
  286:     queueMicrotask(() => {
  287:       setSessionId(browserSessionId);
  288: 
  289:       setSession((prev) => ({
  290:       ...prev,
```

### line 287

```text
  281:   const scrollRef = useRef<HTMLDivElement | null>(null);
  282: 
  283:   useEffect(() => {
  284:     const browserSessionId = getOrCreateBrowserSessionId();
  285: 
  286:     queueMicrotask(() => {
> 287:       setSessionId(browserSessionId);
  288: 
  289:       setSession((prev) => ({
  290:       ...prev,
  291:       sessionId: browserSessionId,
  292:     }));
  293:     });
```

### line 289

```text
  283:   useEffect(() => {
  284:     const browserSessionId = getOrCreateBrowserSessionId();
  285: 
  286:     queueMicrotask(() => {
  287:       setSessionId(browserSessionId);
  288: 
> 289:       setSession((prev) => ({
  290:       ...prev,
  291:       sessionId: browserSessionId,
  292:     }));
  293:     });
  294: 
  295:   }, []);
```

### line 291

```text
  285: 
  286:     queueMicrotask(() => {
  287:       setSessionId(browserSessionId);
  288: 
  289:       setSession((prev) => ({
  290:       ...prev,
> 291:       sessionId: browserSessionId,
  292:     }));
  293:     });
  294: 
  295:   }, []);
  296: 
  297:   useEffect(() => {
```

### line 298

```text
  292:     }));
  293:     });
  294: 
  295:   }, []);
  296: 
  297:   useEffect(() => {
> 298:     if (!sessionId) return;
  299:   
  300:     const activeSessionId = sessionId;
  301:     let cancelled = false;
  302:   
  303:     async function hydrateSession() {
  304:       try {
```

### line 300

```text
  294: 
  295:   }, []);
  296: 
  297:   useEffect(() => {
  298:     if (!sessionId) return;
  299:   
> 300:     const activeSessionId = sessionId;
  301:     let cancelled = false;
  302:   
  303:     async function hydrateSession() {
  304:       try {
  305:         const response = await fetch(
  306:           `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
```

### line 306

```text
  300:     const activeSessionId = sessionId;
  301:     let cancelled = false;
  302:   
  303:     async function hydrateSession() {
  304:       try {
  305:         const response = await fetch(
> 306:           `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
  307:           {
  308:             method: "GET",
  309:             cache: "no-store",
  310:           }
  311:         );
  312: 
```

### line 323

```text
  317:         const data: ChatApiResponse = await response.json();
  318: 
  319:         if (cancelled) {
  320:           return;
  321:         }
  322: 
> 323:         setSession((prev) => ({
  324:           ...prev,
  325:           sessionId: activeSessionId,
  326:           activeRoute: normalizeText(data.route, prev.activeRoute),
  327:           lastTool: normalizeText(data.tool, prev.lastTool),
  328:           lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
  329:           currentSearchQuery: normalizeText(
```

### line 325

```text
  319:         if (cancelled) {
  320:           return;
  321:         }
  322: 
  323:         setSession((prev) => ({
  324:           ...prev,
> 325:           sessionId: activeSessionId,
  326:           activeRoute: normalizeText(data.route, prev.activeRoute),
  327:           lastTool: normalizeText(data.tool, prev.lastTool),
  328:           lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
  329:           currentSearchQuery: normalizeText(
  330:             data.searchQuery,
  331:             prev.currentSearchQuery
```

### line 372

```text
  366: 
  367:     void hydrateSession();
  368: 
  369:     return () => {
  370:       cancelled = true;
  371:     };
> 372:   }, [sessionId]);
  373: 
  374:   useEffect(() => {
  375:     scrollRef.current?.scrollTo({
  376:       top: scrollRef.current.scrollHeight,
  377:       behavior: "smooth",
  378:     });
```

### line 466

```text
  460:   }, [isBusy, session]);
  461: 
  462:   async function handleSubmit(e: React.FormEvent) {
  463:     e.preventDefault();
  464: 
  465:     const value = input.trim();
> 466:     if (!value || isBusy || !sessionId) return;
  467:     const activeSessionId = sessionId;
  468: 
  469:     setInput("");
  470:     setIsBusy(true);
  471: 
  472:     setLogs((prev) => [
```

### line 467

```text
  461: 
  462:   async function handleSubmit(e: React.FormEvent) {
  463:     e.preventDefault();
  464: 
  465:     const value = input.trim();
  466:     if (!value || isBusy || !sessionId) return;
> 467:     const activeSessionId = sessionId;
  468: 
  469:     setInput("");
  470:     setIsBusy(true);
  471: 
  472:     setLogs((prev) => [
  473:       ...prev,
```

### line 478

```text
  472:     setLogs((prev) => [
  473:       ...prev,
  474:       makeLog("USER", value),
  475:       makeLog("SYSTEM", "Routing directive to core..."),
  476:     ]);
  477: 
> 478:     setSession((prev) => ({
  479:       ...prev,
  480:       pendingState: "processing",
  481:     }));
  482: 
  483:     try {
  484:       const controller = new AbortController();
```

### line 498

```text
  492:           headers: {
  493:             "Content-Type": "application/json",
  494:           },
  495:           signal: controller.signal,
  496:           body: JSON.stringify({
  497:             message: value,
> 498:             sessionId: activeSessionId,
  499:           }),
  500:         });
  501:       } finally {
  502:         clearTimeout(timeout);
  503:       }
  504: 
```

### line 532

```text
  526:       setLogs((prev) => [
  527:         ...prev,
  528:         makeLog("ROUTER", route),
  529:         makeLog("CHERNOBOG", reply),
  530:       ]);
  531: 
> 532:       setSession((prev) => ({
  533:         ...prev,
  534:         sessionId: activeSessionId,
  535:         activeRoute: normalizeText(data.route, prev.activeRoute),
  536:         lastTool: normalizeText(data.tool, prev.lastTool),
  537:         lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
  538:         currentSearchQuery: normalizeText(
```

### line 534

```text
  528:         makeLog("ROUTER", route),
  529:         makeLog("CHERNOBOG", reply),
  530:       ]);
  531: 
  532:       setSession((prev) => ({
  533:         ...prev,
> 534:         sessionId: activeSessionId,
  535:         activeRoute: normalizeText(data.route, prev.activeRoute),
  536:         lastTool: normalizeText(data.tool, prev.lastTool),
  537:         lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
  538:         currentSearchQuery: normalizeText(
  539:           data.searchQuery,
  540:           prev.currentSearchQuery
```

### line 560

```text
  554:       }));
  555:     } catch (error) {
  556:       const message = error instanceof Error ? error.message : "Request failed.";
  557: 
  558:       setLogs((prev) => [...prev, makeLog("SYSTEM", message)]);
  559: 
> 560:       setSession((prev) => ({
  561:         ...prev,
  562:         pendingState: "none",
  563:         lastToolSummary: message,
  564:       }));
  565:     } finally {
  566:       setIsBusy(false);
```

### line 571

```text
  565:     } finally {
  566:       setIsBusy(false);
  567:     }
  568:   }
  569: 
  570:   async function resetCurrentSession() {
> 571:     if (!sessionId) return;
  572: 
  573:     try {
  574:       await fetch("/api/session/reset", {
  575:         method: "POST",
  576:         headers: {
  577:           "Content-Type": "application/json",
```

### line 580

```text
  574:       await fetch("/api/session/reset", {
  575:         method: "POST",
  576:         headers: {
  577:           "Content-Type": "application/json",
  578:         },
  579:         body: JSON.stringify({
> 580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
  584:       const nextSessionId = crypto.randomUUID();
  585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  586:       window.location.reload();
```

### line 584

```text
  578:         },
  579:         body: JSON.stringify({
  580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
> 584:       const nextSessionId = crypto.randomUUID();
  585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  586:       window.location.reload();
  587:     }
  588:   }
  589: 
  590:   const developerPanel = developerMode ? (
```

### line 585

```text
  579:         body: JSON.stringify({
  580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
  584:       const nextSessionId = crypto.randomUUID();
> 585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  586:       window.location.reload();
  587:     }
  588:   }
  589: 
  590:   const developerPanel = developerMode ? (
  591:     <RightDashboardRail
```

### line 592

```text
  586:       window.location.reload();
  587:     }
  588:   }
  589: 
  590:   const developerPanel = developerMode ? (
  591:     <RightDashboardRail
> 592:       sessionId={sessionId}
  593:       session={session}
  594:       debugTrace={debugTrace}
  595:       debugVisible={debugVisible}
  596:       onToggleDebugVisible={() => setDebugVisible((value) => !value)}
  597:       onSelectTrace={setDebugTrace}
  598:     />
```


## Browser persistence

Pattern: `localStorage|sessionStorage|indexedDB|Storage`

### line 134

```text
  126:   hasListedDirectory?: boolean;
  127: 
  128:   activeTaskGoal?: string;
  129:   activeTaskStatus?: string;
  130:   lastTaskGoal?: string;
  131:   lastTaskStatus?: string;
  132: };
  133: 
> 134: const SESSION_STORAGE_KEY = "chernobog.sessionId";
  135: const REQUEST_TIMEOUT_MS = 120_000;
  136: 
  137: function nowTime() {
  138:   return new Date().toLocaleTimeString();
  139: }
  140: 
  141: function makeLog(source: LogSource, text: string): LogEntry {
  142:   return {
```

### line 178

```text
  170:     step === "awaiting_selection" ||
  171:     pending === "awaiting_file_selection" ||
  172:     pending === "awaiting_confirmation" ||
  173:     pending === "awaiting_clarification"
  174:   );
  175: }
  176: 
  177: function getOrCreateBrowserSessionId() {
> 178:   const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  179: 
  180:   if (existing && existing.trim().length > 0) {
  181:     return existing;
  182:   }
  183: 
  184:   const created = crypto.randomUUID();
  185:   window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  186: 
```

### line 185

```text
  177: function getOrCreateBrowserSessionId() {
  178:   const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  179: 
  180:   if (existing && existing.trim().length > 0) {
  181:     return existing;
  182:   }
  183: 
  184:   const created = crypto.randomUUID();
> 185:   window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  186: 
  187:   return created;
  188: }
  189: 
  190: function getReviewUrlFromResponse(responseBody: unknown): string | null {
  191:   if (!responseBody || typeof responseBody !== "object") {
  192:     return null;
  193:   }
```

### line 585

```text
  577:           "Content-Type": "application/json",
  578:         },
  579:         body: JSON.stringify({
  580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
  584:       const nextSessionId = crypto.randomUUID();
> 585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  586:       window.location.reload();
  587:     }
  588:   }
  589: 
  590:   const developerPanel = developerMode ? (
  591:     <RightDashboardRail
  592:       sessionId={sessionId}
  593:       session={session}
```


## Response payload handling

Pattern: `response\.json|result\.reply|data\.reply|payload\.reply|reply:`

### line 223

```text
  215:     typeof structuredReviewUrl === "string" &&
  216:     structuredReviewUrl.trim().length > 0
  217:   ) {
  218:     return structuredReviewUrl;
  219:   }
  220: 
  221:   const replyText =
  222:     typeof body.payload?.reply === "string"
> 223:       ? body.payload.reply
  224:       : typeof body.reply === "string"
  225:         ? body.reply
  226:         : "";
  227: 
  228:   const match = replyText.match(/\/review\/vault-pr\/[a-zA-Z0-9._-]+/);
  229: 
  230:   return match?.[0] ?? null;
  231: }
```

### line 317

```text
  309:             cache: "no-store",
  310:           }
  311:         );
  312: 
  313:         if (!response.ok) {
  314:           return;
  315:         }
  316: 
> 317:         const data: ChatApiResponse = await response.json();
  318: 
  319:         if (cancelled) {
  320:           return;
  321:         }
  322: 
  323:         setSession((prev) => ({
  324:           ...prev,
  325:           sessionId: activeSessionId,
```

### line 505

```text
  497:             message: value,
  498:             sessionId: activeSessionId,
  499:           }),
  500:         });
  501:       } finally {
  502:         clearTimeout(timeout);
  503:       }
  504: 
> 505:       const data: ChatApiResponse = await response.json();
  506: 
  507:       const reviewUrl = getReviewUrlFromResponse(data);
  508: 
  509:       console.log("[Vault PR reviewUrl]", reviewUrl);
  510: 
  511:       if (reviewUrl) {
  512:         openReviewWorkspace(reviewUrl);
  513:       }
```

### line 524

```text
  516:         throw new Error(data?.details || data?.error || "Request failed.");
  517:       }
  518: 
  519:       if (data.debugTrace) {
  520:         setDebugTrace(data.debugTrace);
  521:       }
  522: 
  523:       const route = normalizeText(data.route, "unknown").toUpperCase();
> 524:       const reply = normalizeText(data.reply, "No response returned.");
  525: 
  526:       setLogs((prev) => [
  527:         ...prev,
  528:         makeLog("ROUTER", route),
  529:         makeLog("CHERNOBOG", reply),
  530:       ]);
  531: 
  532:       setSession((prev) => ({
```


## Reset and clear behavior

Pattern: `resetCurrentSession|setMessages\(\[\]|clear|crypto\.randomUUID`

### line 143

```text
  135: const REQUEST_TIMEOUT_MS = 120_000;
  136: 
  137: function nowTime() {
  138:   return new Date().toLocaleTimeString();
  139: }
  140: 
  141: function makeLog(source: LogSource, text: string): LogEntry {
  142:   return {
> 143:     id: crypto.randomUUID(),
  144:     source,
  145:     text,
  146:     timestamp: nowTime(),
  147:   };
  148: }
  149: 
  150: function normalizeText(value: unknown, fallback = "none") {
  151:   if (typeof value !== "string") return fallback;
```

### line 184

```text
  176: 
  177: function getOrCreateBrowserSessionId() {
  178:   const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  179: 
  180:   if (existing && existing.trim().length > 0) {
  181:     return existing;
  182:   }
  183: 
> 184:   const created = crypto.randomUUID();
  185:   window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  186: 
  187:   return created;
  188: }
  189: 
  190: function getReviewUrlFromResponse(responseBody: unknown): string | null {
  191:   if (!responseBody || typeof responseBody !== "object") {
  192:     return null;
```

### line 502

```text
  494:           },
  495:           signal: controller.signal,
  496:           body: JSON.stringify({
  497:             message: value,
  498:             sessionId: activeSessionId,
  499:           }),
  500:         });
  501:       } finally {
> 502:         clearTimeout(timeout);
  503:       }
  504: 
  505:       const data: ChatApiResponse = await response.json();
  506: 
  507:       const reviewUrl = getReviewUrlFromResponse(data);
  508: 
  509:       console.log("[Vault PR reviewUrl]", reviewUrl);
  510: 
```

### line 570

```text
  562:         pendingState: "none",
  563:         lastToolSummary: message,
  564:       }));
  565:     } finally {
  566:       setIsBusy(false);
  567:     }
  568:   }
  569: 
> 570:   async function resetCurrentSession() {
  571:     if (!sessionId) return;
  572: 
  573:     try {
  574:       await fetch("/api/session/reset", {
  575:         method: "POST",
  576:         headers: {
  577:           "Content-Type": "application/json",
  578:         },
```

### line 584

```text
  576:         headers: {
  577:           "Content-Type": "application/json",
  578:         },
  579:         body: JSON.stringify({
  580:           sessionId,
  581:         }),
  582:       });
  583:     } finally {
> 584:       const nextSessionId = crypto.randomUUID();
  585:       window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  586:       window.location.reload();
  587:     }
  588:   }
  589: 
  590:   const developerPanel = developerMode ? (
  591:     <RightDashboardRail
  592:       sessionId={sessionId}
```

### line 614

```text
  606:       input={input}
  607:       setInput={setInput}
  608:       onSubmit={handleSubmit}
  609:       isBusy={isBusy}
  610:       scrollRef={scrollRef}
  611:       developerMode={developerMode}
  612:       setDeveloperMode={setDeveloperMode}
  613:       developerPanel={developerPanel}
> 614:       resetCurrentSession={resetCurrentSession}
  615:     />
  616:   );
  617: }
```

