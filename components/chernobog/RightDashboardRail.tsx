"use client";

import { useMemo, useState } from "react";
import { TrustDebugPanel } from "./TrustDebugPanel";
import { TrustTraceHistory } from "./TrustTraceHistory";
import ChernobogDebugStatePanel from "./ChernobogDebugStatePanel";
import MemoryArchitecturePanel from "../MemoryArchitecturePanel";
import CommandLanguagePanel from "../CommandLanguagePanel";
import type { DebugTrace, SessionSnapshot } from "../UmbraAIConsole";

type DashboardTab = "operation" | "memory" | "tools" | "trust" | "debug";

type RightDashboardRailProps = {
  sessionId: string | null;
  session: SessionSnapshot;
  debugTrace: DebugTrace | null;
  debugVisible: boolean;
  onToggleDebugVisible: () => void;
  onSelectTrace: (trace: DebugTrace | null) => void;
};

const TABS: { key: DashboardTab; label: string }[] = [
  { key: "operation", label: "Operation" },
  { key: "memory", label: "Memory" },
  { key: "tools", label: "Tools" },
  { key: "trust", label: "Trust" },
  { key: "debug", label: "Debug" },
];

function SectionShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border border-amber-500/20 bg-black/30 p-3 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-amber-500/10 pb-2">
        <div>
          {eyebrow ? (
            <p className="text-[9px] uppercase tracking-[0.22em] text-amber-500/60">
              {eyebrow}
            </p>
          ) : null}

          <h3 className="text-[11px] uppercase tracking-[0.18em] text-amber-100">
            {title}
          </h3>
        </div>

        <div className="h-1.5 w-1.5 rounded-full bg-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
      </div>

      {children}
    </section>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const safeValue =
    value === null || value === undefined || `${value}`.trim().length === 0
      ? "none"
      : `${value}`;

  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border-b border-amber-500/10 py-1.5 last:border-b-0">
      <span className="text-[9px] uppercase tracking-[0.16em] text-amber-500/50">
        {label}
      </span>
      <span className="break-all text-[10px] leading-5 text-amber-100/75">
        {safeValue}
      </span>
    </div>
  );
}

function OperationTab({ session }: { session: SessionSnapshot }) {
  const workflowStatus = useMemo(() => {
    if (session.pendingState !== "none") return session.pendingState;
    if (session.workflowStep !== "none") return session.workflowStep;
    return "idle";
  }, [session.pendingState, session.workflowStep]);

  return (
    <div className="space-y-3">
      <SectionShell title="Active Operation" eyebrow="execution layer">
        <div className="space-y-1">
          <DataRow label="Session" value={session.sessionId} />
          <DataRow label="Route" value={session.activeRoute} />
          <DataRow label="Last Tool" value={session.lastTool} />
          <DataRow label="Workflow" value={session.workflowKind} />
          <DataRow label="Step" value={workflowStatus} />
          <DataRow label="Candidates" value={session.workflowCandidateCount} />
        </div>
      </SectionShell>

      <SectionShell title="Active Object" eyebrow="continuity">
        <div className="space-y-1">
          <DataRow label="Selected" value={session.lastSelectedFile} />
          <DataRow label="Last Read" value={session.lastReadFile} />
          <DataRow label="Search" value={session.currentSearchQuery} />
          <DataRow label="Root" value={session.currentSearchRoot} />
        </div>
      </SectionShell>

      <SectionShell title="Planner Snapshot" eyebrow="task state">
        {session.activePlan ? (
          <div className="space-y-1">
            <DataRow label="Title" value={session.activePlan.title} />
            <DataRow label="Status" value={session.activePlan.status} />
            <DataRow label="Steps" value={session.activePlan.stepCount} />
            <DataRow label="Active" value={session.activePlan.activeStep} />
          </div>
        ) : (
          <p className="text-[10px] uppercase tracking-[0.12em] text-amber-100/45">
            No active plan.
          </p>
        )}
      </SectionShell>
    </div>
  );
}

function MemoryTab({ sessionId }: { sessionId: string | null }) {
  return (
    <div className="space-y-3">
      {sessionId ? (
        <MemoryArchitecturePanel sessionId={sessionId} />
      ) : (
        <SectionShell title="Memory Engine" eyebrow="offline">
          <p className="text-[10px] uppercase tracking-[0.12em] text-amber-100/45">
            Waiting for session initialization.
          </p>
        </SectionShell>
      )}
    </div>
  );
}

function ToolsTab() {
  return (
    <div className="space-y-3">
      <CommandLanguagePanel />
    </div>
  );
}

function TrustTab({
  debugTrace,
  debugVisible,
  onToggleDebugVisible,
  onSelectTrace,
}: {
  debugTrace: DebugTrace | null;
  debugVisible: boolean;
  onToggleDebugVisible: () => void;
  onSelectTrace: (trace: DebugTrace | null) => void;
}) {
  return (
    <div className="space-y-3">
      <TrustDebugPanel
        trace={debugTrace}
        visible={debugVisible}
        onToggleVisible={onToggleDebugVisible}
      />

      <TrustTraceHistory onSelectTrace={onSelectTrace} />
    </div>
  );
}

function DebugTab() {
  return (
    <div className="space-y-3">
      <ChernobogDebugStatePanel />
    </div>
  );
}

export default function RightDashboardRail({
  sessionId,
  session,
  debugTrace,
  debugVisible,
  onToggleDebugVisible,
  onSelectTrace,
}: RightDashboardRailProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("operation");

  return (
    <aside className="space-y-3">
      <div className="border border-amber-500/20 bg-black/40 p-2">
        <div className="grid grid-cols-5 gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "border px-2 py-2 text-[8px] uppercase tracking-[0.12em] transition",
                  active
                    ? "border-amber-400/60 bg-amber-500/10 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.12)]"
                    : "border-amber-500/15 bg-black/20 text-amber-100/45 hover:border-amber-400/40 hover:text-amber-100/75",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
        {activeTab === "operation" ? <OperationTab session={session} /> : null}

        {activeTab === "memory" ? (
          <MemoryTab sessionId={sessionId} />
        ) : null}

        {activeTab === "tools" ? <ToolsTab /> : null}

        {activeTab === "trust" ? (
          <TrustTab
            debugTrace={debugTrace}
            debugVisible={debugVisible}
            onToggleDebugVisible={onToggleDebugVisible}
            onSelectTrace={onSelectTrace}
          />
        ) : null}

        {activeTab === "debug" ? <DebugTab /> : null}
      </div>
    </aside>
  );
}