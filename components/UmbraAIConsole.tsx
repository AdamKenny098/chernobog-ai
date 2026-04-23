"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommandShell from "./command/CommandShell";
import type { PendingState } from "@/lib/chernobog/session/pending";
import type { WorkflowKind, FileWorkflowStep } from "@/lib/chernobog/pipeline/types";

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
  details?: string;
  error?: string;
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

export default function UmbraAIConsole() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);

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
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    const workflowKind = session.workflowKind;

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
        detail:
          workflowActive
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          sessionId,
        }),
      });

      const data: ChatApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Request failed.");
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
        currentSearchQuery: normalizeText(data.searchQuery, prev.currentSearchQuery),
        currentSearchRoot: normalizeText(data.searchRoot, prev.currentSearchRoot),
        lastSelectedFile: normalizeText(data.selectedFile, prev.lastSelectedFile),
        lastReadFile: normalizeText(data.readFile, prev.lastReadFile),
        pendingState: data.pendingState ?? "none",
        workflowKind: data.workflowKind ?? prev.workflowKind,
        workflowStep: data.workflowStep ?? prev.workflowStep,
        workflowCandidateCount:
          data.workflowCandidateCount ?? prev.workflowCandidateCount,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request failed.";

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
    />
  );
}