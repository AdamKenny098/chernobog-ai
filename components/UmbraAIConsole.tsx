"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommandShell from "./command/CommandShell";

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
  pendingState: string;
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
  pendingState?: string;
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
    const pending = session.pendingState.toLowerCase();
    const lastTool = session.lastTool.toLowerCase();

    return [
      {
        key: "override",
        label: "Override Protocol",
        status: isBusy ? "ACTIVE" : "ONLINE",
        detail: isBusy
          ? "Transformation logic executing"
          : "Transformation logic staged",
      },
      {
        key: "optic",
        label: "Optic Core",
        status: route === "tools" || isBusy ? "ACTIVE" : "ONLINE",
        detail:
          route === "tools"
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
        status: pending !== "none" ? "ALERT" : "LOCKED",
        detail:
          pending !== "none"
            ? `Awaiting ${session.pendingState}`
            : "Remote directive channel stable",
      },
      {
        key: "memory",
        label: "Memory Engine",
        status: lastTool !== "none" ? "ACTIVE" : "ONLINE",
        detail:
          lastTool !== "none"
            ? `Most recent tool path: ${session.lastTool}`
            : "Long-term recall operational",
      },
      {
        key: "guardian",
        label: "Guardian Node",
        status: route === "guardian" ? "ALERT" : "STANDBY",
        detail:
          route === "guardian"
            ? "Constraint review layer engaged"
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
        pendingState: normalizeText(data.pendingState, "none"),
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