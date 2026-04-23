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

export type CommandStatus = "ONLINE" | "ACTIVE" | "IDLE" | "LOCKED" | "ALERT" | "STANDBY";

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

    return [
      {
        key: "override",
        label: "Override Protocol",
        status: "ACTIVE",
        detail: "Transformation logic staged",
      },
      {
        key: "optic",
        label: "Optic Core",
        status: route === "tools" ? "ACTIVE" : "ONLINE",
        detail: "Chest-eye lens aligned",
      },
      {
        key: "combat",
        label: "Combat Frame",
        status: "ONLINE",
        detail: "Synthetic body telemetry nominal",
      },
      {
        key: "relay",
        label: "Signal Relay",
        status: "LOCKED",
        detail: "Remote directive channel stable",
      },
      {
        key: "memory",
        label: "Memory Engine",
        status: "ONLINE",
        detail: "Long-term recall operational",
      },
      {
        key: "guardian",
        label: "Guardian Node",
        status: route === "guardian" ? "ALERT" : "STANDBY",
        detail: "Ethical & directive constraints active",
      },
    ];
  }, [session]);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Request failed.");
      }

      const route = String(data?.route ?? "unknown").toUpperCase();
      const reply = String(data?.reply ?? "No response returned.");

      setLogs((prev) => [
        ...prev,
        makeLog("ROUTER", route),
        makeLog("CHERNOBOG", reply),
      ]);

      setSession((prev) => {
        const next = {
          ...prev,
          activeRoute: String(data?.route ?? prev.activeRoute),
        };

        const lowerMessage = value.toLowerCase();

        if (next.activeRoute === "tools") {
          if (lowerMessage.includes("find file") || lowerMessage.includes("search files")) {
            next.lastTool = "find_files";
            next.lastToolSummary = "File discovery completed.";
            next.currentSearchQuery = value;
          } else if (lowerMessage.includes("read")) {
            next.lastTool = "read_text_file";
            next.lastToolSummary = "File read completed.";
          }
        }

        const lines = reply.split("\n");
        const firstLine = lines[0] ?? "";

        if (firstLine.includes("matching")) {
          next.currentSearchRoot = firstLine;
        }

        if (reply.startsWith("Here is ")) {
          const pathLine = reply.split(":")[0].replace("Here is ", "").trim();
          next.lastReadFile = pathLine;
          next.lastSelectedFile = pathLine;
          next.pendingState = "none";
        }

        if (reply.toLowerCase().includes("which file do you want")) {
          next.pendingState = "file selection required";
        }

        return next;
      });
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        makeLog(
          "SYSTEM",
          error instanceof Error ? error.message : "Request failed."
        ),
      ]);
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