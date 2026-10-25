"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommandShell from "./command/CommandShell";
import type { PendingState } from "@/lib/chernobog/session/pending";
import type {
  WorkflowKind,
  FileWorkflowStep,
} from "@/lib/chernobog/pipeline/types";

import RightDashboardRail from "./chernobog/RightDashboardRail";
import { publishChernobogCoreState } from "@/lib/chernobog/ui/coreStateBridge";
import { clearChernobogRoutingSignal } from "@/lib/chernobog/ui/coreRoutingBridge";

export type LogSource = "USER" | "SYSTEM" | "ROUTER" | "CHERNOBOG";

export type LogEntry = {
  id: string;
  source: LogSource;
  text: string;
  timestamp: string;
};

export type CommandStatus =
  | "ONLINE"
  | "ACTIVE"
  | "IDLE"
  | "LOCKED"
  | "ALERT"
  | "STANDBY";

export type SubsystemItem = {
  key: string;
  label: string;
  status: CommandStatus;
  detail: string;
};

export type SessionSnapshot = {
  sessionId: string;
  activeRoute: string;
  lastTool: string;
  lastToolSummary: string;
  currentSearchQuery: string;
  currentSearchRoot: string;
  lastSelectedFile: string;
  lastReadFile: string;
  pendingState: PendingState;
  workflowKind: WorkflowKind;
  workflowStep: FileWorkflowStep | "none";
  workflowCandidateCount: number;
  activePlan: ActivePlanSnapshot | null;
  executionState: ExecutionStateSnapshot | null;
};

export type DebugTraceStep = {
  type: string;
  label: string;
  detail?: string;
  timestamp: string;
};

export type DebugTrace = {
  id: string;
  route: string;
  tool: string;
  success: boolean;
  failureCategory?: string;
  summary: string;
  steps: DebugTraceStep[];
};

type ChatApiResponse = {
  route?: string;
  reply?: string;
  sessionId?: string;
  tool?: string;
  toolSummary?: string;
  searchQuery?: string;
  searchRoot?: string;
  selectedFile?: string;
  readFile?: string;
  pendingState?: PendingState;
  workflowKind?: WorkflowKind;
  workflowStep?: FileWorkflowStep | "none";
  workflowCandidateCount?: number;
  activePlan?: ActivePlanSnapshot | null;
  executionState?: ExecutionStateSnapshot | null;
  debugTrace?: DebugTrace;
  details?: string;
  memoryCitations?: unknown[];
  error?: string;
};

type SessionHistoryApiResponse = {
  sessionId?: string;
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
  error?: string;
};

type ActivePlanSnapshot = {
  id: string;
  title: string;
  status: string;
  stepCount: number;
  activeStep: string | null;
};

type ExecutionStateSnapshot = {
  selectedFilePath?: string;
  selectedFolderPath?: string;

  lastReadFilePath?: string;
  hasLastReadText?: boolean;

  lastCreatedFilePath?: string;
  lastCreatedFolderPath?: string;

  lastAppendedFilePath?: string;

  lastRenamedFilePath?: string;
  lastRenamedFolderPath?: string;

  lastCopiedFilePath?: string;
  lastCopiedFolderPath?: string;

  lastMovedFilePath?: string;
  lastMovedFolderPath?: string;

  lastOpenedApp?: unknown;
  lastOpenedUrl?: unknown;

  hasSystemStatus?: boolean;
  hasPathInfo?: boolean;
  hasListedDirectory?: boolean;

  activeTaskGoal?: string;
  activeTaskStatus?: string;
  lastTaskGoal?: string;
  lastTaskStatus?: string;
};

const SESSION_STORAGE_KEY = "chernobog.sessionId";
const REQUEST_TIMEOUT_MS = 360_000;

function nowTime() {
  return new Date().toLocaleTimeString();
}

function makeLog(source: LogSource, text: string): LogEntry {
  return {
    id: crypto.randomUUID(),
    source,
    text,
    timestamp: nowTime(),
  };
}

function normalizeText(value: unknown, fallback = "none") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isWorkflowActive(step: SessionSnapshot["workflowStep"]) {
  return step === "searching" || step === "reading";
}

function isWorkflowBlocked(step: SessionSnapshot["workflowStep"]) {
  return step === "failed";
}

function isWorkflowSelectionRequired(
  step: SessionSnapshot["workflowStep"],
  pending: PendingState
) {
  return (
    step === "awaiting_selection" ||
    pending === "awaiting_file_selection" ||
    pending === "awaiting_confirmation" ||
    pending === "awaiting_clarification"
  );
}

function getOrCreateBrowserSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);

  return created;
}

function getReviewUrlFromResponse(responseBody: unknown): string | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const body = responseBody as {
    payload?: {
      reply?: unknown;
      modulePayload?: {
        reviewUrl?: unknown;
      };
    };
    modulePayload?: {
      reviewUrl?: unknown;
    };
    reviewUrl?: unknown;
    reply?: unknown;
  };

  const structuredReviewUrl =
    body.payload?.modulePayload?.reviewUrl ??
    body.modulePayload?.reviewUrl ??
    body.reviewUrl;

  if (
    typeof structuredReviewUrl === "string" &&
    structuredReviewUrl.trim().length > 0
  ) {
    return structuredReviewUrl;
  }

  const replyText =
    typeof body.payload?.reply === "string"
      ? body.payload.reply
      : typeof body.reply === "string"
        ? body.reply
        : "";

  const match = replyText.match(/\/review\/vault-pr\/[a-zA-Z0-9._-]+/);

  return match?.[0] ?? null;
}

function openReviewWorkspace(reviewUrl: string): void {
  const absoluteUrl = new URL(reviewUrl, window.location.origin).toString();

  console.log("[Vault PR] Opening review workspace:", absoluteUrl);

  const openedWindow = window.open(
    absoluteUrl,
    "chernobog-vault-pr-review",
    "width=1500,height=950"
  );

  if (!openedWindow) {
    console.warn("[Vault PR] Popup blocked. Opening in current tab.");
    window.location.href = absoluteUrl;
  }
}

export default function UmbraAIConsole() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [oh5Enabled, setOh5Enabled] = useState(false);
  const [oh5ProjectId, setOh5ProjectId] = useState("chernobog");
  const [oh5OwnerToken, setOh5OwnerToken] = useState("");
  const [oh5CitationCount, setOh5CitationCount] = useState<number | null>(null);

  const [debugTrace, setDebugTrace] = useState<DebugTrace | null>(null);
  const [debugVisible, setDebugVisible] = useState(true);
  const [developerMode, setDeveloperMode] = useState(true);

  const [logs, setLogs] = useState<LogEntry[]>(() => [
    makeLog("SYSTEM", "God Program interface initialized."),
    makeLog("SYSTEM", "Core intelligence online. Session orchestration stable."),
  ]);

  const [session, setSession] = useState<SessionSnapshot>({
    sessionId: "pending",
    activeRoute: "idle",
    lastTool: "none",
    lastToolSummary: "No tool activity yet.",
    currentSearchQuery: "none",
    currentSearchRoot: "none",
    lastSelectedFile: "none",
    lastReadFile: "none",
    pendingState: "none",
    workflowKind: "none",
    workflowStep: "none",
    workflowCandidateCount: 0,
    activePlan: null,
    executionState: null,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const coreWasBusyRef = useRef(false);
  const coreStateTimersRef = useRef<number[]>([]);

  useEffect(() => {
    for (const timer of coreStateTimersRef.current) {
      window.clearTimeout(timer);
    }
    coreStateTimersRef.current = [];

    const waitingForUser =
      session.pendingState === "awaiting_file_selection" ||
      session.pendingState === "awaiting_confirmation" ||
      session.pendingState === "awaiting_clarification" ||
      session.workflowStep === "awaiting_selection";

    if (session.workflowStep === "failed") {
      coreWasBusyRef.current = false;
      publishChernobogCoreState("failure");
      return;
    }

    if (waitingForUser) {
      coreWasBusyRef.current = isBusy;
      publishChernobogCoreState("waiting");
      return;
    }

    if (isBusy) {
      coreWasBusyRef.current = true;

      const hasResolvedRoute =
        session.activeRoute !== "idle" &&
        session.activeRoute !== "none" &&
        session.activeRoute.trim().length > 0;

      publishChernobogCoreState(
        hasResolvedRoute ? "routing" : "thinking",
      );
      return;
    }

    if (coreWasBusyRef.current) {
      coreWasBusyRef.current = false;
      publishChernobogCoreState("speaking");

      const successTimer = window.setTimeout(() => {
        publishChernobogCoreState("success");
      }, 550);

      const idleTimer = window.setTimeout(() => {
        publishChernobogCoreState("idle");
      }, 1250);

      coreStateTimersRef.current = [successTimer, idleTimer];
      return;
    }

    publishChernobogCoreState("idle");

    return () => {
      for (const timer of coreStateTimersRef.current) {
        window.clearTimeout(timer);
      }
      coreStateTimersRef.current = [];
    };
  }, [
    isBusy,
    session.activeRoute,
    session.pendingState,
    session.workflowStep,
  ]);

  useEffect(() => {
    const browserSessionId = getOrCreateBrowserSessionId();

    queueMicrotask(() => {
      setSessionId(browserSessionId);

      setSession((prev) => ({
      ...prev,
      sessionId: browserSessionId,
    }));
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
  
    const activeSessionId = sessionId;
    let cancelled = false;
  
    async function hydrateSession() {
      try {
        const response = await fetch(
          `/api/session?sessionId=${encodeURIComponent(activeSessionId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data: ChatApiResponse = await response.json();

        
        let historyData: SessionHistoryApiResponse = {
          messages: [],
        };

        try {
          const historyResponse = await fetch(
            `/api/session/history?sessionId=${encodeURIComponent(activeSessionId)}&limit=50`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          if (historyResponse.ok) {
            historyData =
              (await historyResponse.json()) as SessionHistoryApiResponse;
          }
        } catch {
          historyData = {
            messages: [],
          };
        }

if (cancelled) {
          return;
        }

        setSession((prev) => ({
          ...prev,
          sessionId: activeSessionId,
          activeRoute: normalizeText(data.route, prev.activeRoute),
          lastTool: normalizeText(data.tool, prev.lastTool),
          lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
          currentSearchQuery: normalizeText(
            data.searchQuery,
            prev.currentSearchQuery
          ),
          currentSearchRoot: normalizeText(
            data.searchRoot,
            prev.currentSearchRoot
          ),
          lastSelectedFile: normalizeText(
            data.selectedFile,
            prev.lastSelectedFile
          ),
          lastReadFile: normalizeText(data.readFile, prev.lastReadFile),
          pendingState: data.pendingState ?? "none",
          workflowKind: data.workflowKind ?? prev.workflowKind,
          workflowStep: data.workflowStep ?? prev.workflowStep,
          workflowCandidateCount:
            data.workflowCandidateCount ?? prev.workflowCandidateCount,
          activePlan:
            "activePlan" in data ? data.activePlan ?? null : prev.activePlan,
            executionState:
            "executionState" in data ? data.executionState ?? null : prev.executionState,
        }));
        const restoredConversationLogs: LogEntry[] = [];

        for (const message of historyData.messages ?? []) {
          const content = normalizeText(
            message.content,
            ""
          );

          if (!content) {
            continue;
          }

          if (message.role === "user") {
            restoredConversationLogs.push(
              makeLog("USER", content)
            );
          } else if (message.role === "assistant") {
            restoredConversationLogs.push(
              makeLog("CHERNOBOG", content)
            );
          }
        }

        setLogs((prev) => [
          ...prev,
          makeLog(
            "SYSTEM",
            restoredConversationLogs.length > 0
              ? `Previous session conversation restored (${restoredConversationLogs.length} messages).`
              : "Previous session context restored."
          ),
          ...restoredConversationLogs,
        ]);
      } catch {
        if (!cancelled) {
          setLogs((prev) => [
            ...prev,
            makeLog("SYSTEM", "No previous session context restored."),
          ]);
        }
      }
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [logs]);

  const subsystems = useMemo<SubsystemItem[]>(() => {
    const route = session.activeRoute.toLowerCase();
    const lastTool = session.lastTool.toLowerCase();
    const workflowStep = session.workflowStep;

    const selectionRequired = isWorkflowSelectionRequired(
      workflowStep,
      session.pendingState
    );
    const workflowActive = isWorkflowActive(workflowStep);
    const workflowBlocked = isWorkflowBlocked(workflowStep);

    return [
      {
        key: "override",
        label: "Override Protocol",
        status: isBusy ? "ACTIVE" : workflowBlocked ? "ALERT" : "ONLINE",
        detail: isBusy
          ? "Transformation logic executing"
          : workflowBlocked
            ? "Directive chain encountered a blocked state"
            : "Transformation logic staged",
      },
      {
        key: "optic",
        label: "Optic Core",
        status:
          route === "tools" || isBusy || workflowActive ? "ACTIVE" : "ONLINE",
        detail: workflowActive
          ? "Chest-eye lens focused on workflow execution"
          : route === "tools"
            ? "Chest-eye lens routed to toolspace"
            : "Chest-eye lens aligned",
      },
      {
        key: "combat",
        label: "Combat Frame",
        status: isBusy ? "ACTIVE" : "ONLINE",
        detail: isBusy
          ? "Synthetic body telemetry elevated"
          : "Synthetic body telemetry nominal",
      },
      {
        key: "relay",
        label: "Signal Relay",
        status: selectionRequired
          ? "ALERT"
          : workflowActive
            ? "ACTIVE"
            : "LOCKED",
        detail: selectionRequired
          ? "Workflow awaiting operator resolution"
          : workflowActive
            ? "Signal bus carrying active workflow traffic"
            : "Remote directive channel stable",
      },
      {
        key: "memory",
        label: "Memory Engine",
        status: route === "memory" || lastTool !== "none" ? "ACTIVE" : "ONLINE",
        detail:
          route === "memory"
            ? "Recall and persistence path engaged"
            : lastTool !== "none"
              ? `Most recent tool path: ${session.lastTool}`
              : "Long-term recall operational",
      },
      {
        key: "guardian",
        label: "Guardian Node",
        status: route === "guardian" || workflowBlocked ? "ALERT" : "STANDBY",
        detail:
          route === "guardian"
            ? "Constraint review layer engaged"
            : workflowBlocked
              ? "Constraint-aware recovery posture active"
              : "Ethical & directive constraints active",
      },
    ];
  }, [isBusy, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = input.trim();
    if (!value || isBusy || !sessionId) return;
    const activeSessionId = sessionId;
    clearChernobogRoutingSignal();
    setSession((prev) => ({
      ...prev,
      activeRoute: "none",
    }));

    setInput("");
    setIsBusy(true);

    setLogs((prev) => [
      ...prev,
      makeLog("USER", value),
      makeLog("SYSTEM", "Routing directive to core..."),
    ]);

    setSession((prev) => ({
      ...prev,
      pendingState: "processing",
    }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;

      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(oh5Enabled ? { Authorization: `Bearer ${oh5OwnerToken}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: value,
            sessionId: activeSessionId,
            ...(oh5Enabled ? { oh5Memory: { mode: "vault-first", projectId: oh5ProjectId.trim() } } : {}),
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

      const data: ChatApiResponse = await response.json();
      setOh5CitationCount(oh5Enabled ? (Array.isArray(data.memoryCitations) ? data.memoryCitations.length : 0) : null);

      const reviewUrl = getReviewUrlFromResponse(data);

      console.log("[Vault PR reviewUrl]", reviewUrl);

      if (reviewUrl) {
        openReviewWorkspace(reviewUrl);
      }

      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Request failed.");
      }

      if (data.debugTrace) {
        setDebugTrace(data.debugTrace);
      }
      const route = normalizeText(data.route, "unknown").toUpperCase();
      const reply = normalizeText(data.reply, "No response returned.");

      setLogs((prev) => [
        ...prev,
        makeLog("ROUTER", route),
        makeLog("CHERNOBOG", reply),
      ]);

      setSession((prev) => ({
        ...prev,
        sessionId: activeSessionId,
        activeRoute: normalizeText(data.route, prev.activeRoute),
        lastTool: normalizeText(data.tool, prev.lastTool),
        lastToolSummary: normalizeText(data.toolSummary, prev.lastToolSummary),
        currentSearchQuery: normalizeText(
          data.searchQuery,
          prev.currentSearchQuery
        ),
        currentSearchRoot: normalizeText(data.searchRoot, prev.currentSearchRoot),
        lastSelectedFile: normalizeText(data.selectedFile, prev.lastSelectedFile),
        lastReadFile: normalizeText(data.readFile, prev.lastReadFile),
        pendingState: data.pendingState ?? "none",
        workflowKind: data.workflowKind ?? prev.workflowKind,
        workflowStep: data.workflowStep ?? prev.workflowStep,
        workflowCandidateCount:
          data.workflowCandidateCount ?? prev.workflowCandidateCount,
        activePlan:
          "activePlan" in data ? data.activePlan ?? null : prev.activePlan,
          executionState:
          "executionState" in data ? data.executionState ?? null : prev.executionState,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";

      setLogs((prev) => [...prev, makeLog("SYSTEM", message)]);

      setSession((prev) => ({
        ...prev,
        pendingState: "none",
        lastToolSummary: message,
      }));
    } finally {
      setIsBusy(false);
    }
  }

  async function resetCurrentSession() {
    if (!sessionId) return;

    try {
      await fetch("/api/session/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });
    } finally {
      const nextSessionId = crypto.randomUUID();
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
      window.location.reload();
    }
  }

  // OH5N_CONSOLE_MEMORY_OPT_IN: explicit project + ephemeral owner token, never persisted.
  const oh5Panel = (
    <section className="mb-3 rounded border border-emerald-400/40 bg-slate-950 p-3 text-sm text-slate-100">
      <div className="mb-2 font-semibold">OH-5 Second Brain (local opt-in)</div>
      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={oh5Enabled} onChange={(event) => setOh5Enabled(event.target.checked)} />
        Include confirmed memory in typed chat
      </label>
      <label className="mb-1 block" htmlFor="oh5-project">Registered project ID</label>
      <input id="oh5-project" className="mb-2 w-full rounded border border-slate-500 bg-slate-900 p-2 text-white"
        placeholder="chernobog" value={oh5ProjectId} autoComplete="off"
        onChange={(event) => setOh5ProjectId(event.target.value)} />
      <label className="mb-1 block" htmlFor="oh5-token">Owner API token (memory only; never saved)</label>
      <input id="oh5-token" type="password" className="w-full rounded border border-slate-500 bg-slate-900 p-2 text-white"
        autoComplete="off" value={oh5OwnerToken}
        onChange={(event) => setOh5OwnerToken(event.target.value)} />
      <p className="mt-2 text-xs text-slate-300">Only for local trusted use. The token is held in this browser tab only. It is not saved to browser storage.</p>
      <p className="mt-1 text-xs text-slate-300">Last OH-5 references: {oh5CitationCount === null ? "not requested" : oh5CitationCount}</p>
    </section>
  );

  const developerPanel = developerMode ? (
    <div>{oh5Panel}<RightDashboardRail
      sessionId={sessionId}
      session={session}
      debugTrace={debugTrace}
      debugVisible={debugVisible}
      onToggleDebugVisible={() => setDebugVisible((value) => !value)}
      onSelectTrace={setDebugTrace}
    /></div>
  ) : oh5Panel;

  return (
    <CommandShell
      logs={logs}
      subsystems={subsystems}
      session={session}
      input={input}
      setInput={setInput}
      onSubmit={handleSubmit}
      isBusy={isBusy}
      scrollRef={scrollRef}
      developerMode={developerMode}
      setDeveloperMode={setDeveloperMode}
      developerPanel={developerPanel}
      resetCurrentSession={resetCurrentSession}
    />
  );
}