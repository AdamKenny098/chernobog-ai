"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommandShell from "./command/CommandShell";
import { TrustDebugPanel } from "./chernobog/TrustDebugPanel";
import { TrustTraceHistory } from "./chernobog/TrustTraceHistory";
import type { PendingState } from "@/lib/chernobog/session/pending";
import type {
  WorkflowKind,
  FileWorkflowStep,
} from "@/lib/chernobog/pipeline/types";
import ChernobogDebugStatePanel from "./chernobog/ChernobogDebugStatePanel";
import MemoryArchitecturePanel from "./MemoryArchitecturePanel";
import CommandLanguagePanel from "./CommandLanguagePanel";

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
  debugTrace?: DebugTrace;
  details?: string;
  error?: string;
};

type ActivePlanSnapshot = {
  id: string;
  title: string;
  status: string;
  stepCount: number;
  activeStep: string | null;
};



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

const SESSION_STORAGE_KEY = "chernobog.sessionId";

function getOrCreateBrowserSessionId() {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);

  return created;
}

function resetBrowserSession() {
  const nextSessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  window.location.reload();
}

export default function UmbraAIConsole() {
  const [sessionId] = useState(getOrCreateBrowserSessionId);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [debugTrace, setDebugTrace] = useState<DebugTrace | null>(null);
  const [debugVisible, setDebugVisible] = useState(true);
  const [developerMode, setDeveloperMode] = useState(true);

  const [logs, setLogs] = useState<LogEntry[]>(() => [
    makeLog("SYSTEM", "God Program interface initialized."),
    makeLog("SYSTEM", "Core intelligence online. Session orchestration stable."),
  ]);

  const [session, setSession] = useState<SessionSnapshot>({
    sessionId,
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
  });
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    let cancelled = false;
  
    async function hydrateSession() {
      try {
        const response = await fetch(
          `/api/session?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
  
        if (!response.ok) {
          return;
        }
  
        const data: ChatApiResponse = await response.json();
  
        if (cancelled) {
          return;
        }
  
        setSession((prev) => ({
          ...prev,
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
        }));
  
        setLogs((prev) => [
          ...prev,
          makeLog("SYSTEM", "Previous session context restored."),
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
    if (!value || isBusy) return;

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
      const timeout = setTimeout(() => controller.abort(), 35_000);

      let response: Response;

      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: value,
            sessionId,
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

      const data: ChatApiResponse = await response.json();

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

  const developerPanel = developerMode ? (
    <div className="space-y-4">
      <TrustDebugPanel
        trace={debugTrace}
        visible={debugVisible}
        onToggleVisible={() => setDebugVisible((value) => !value)}
      />
  
      <TrustTraceHistory onSelectTrace={setDebugTrace} />
  
      <MemoryArchitecturePanel sessionId={sessionId} />

      <CommandLanguagePanel />
  
      <ChernobogDebugStatePanel />
    </div>
  ) : null;

  async function resetCurrentSession() {
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