"use client";

import type { RefObject, FormEventHandler } from "react";
import CommandHeader, { type HeaderStat } from "./CommandHeader";
import SubsystemRail, { type RailSubsystemItem } from "./SubsystemRail";
import CoreEye from "./CoreEye";
import TelemetryPanel from "./TelemetryPanel";
import ContextPanel from "./ContextPanel";
import CommandComposer from "./CommandComposer";
import DirectiveFeed from "./DirectiveFeed";
import WorkflowInspector from "./WorkflowInspector";
import PlannerInspector from "./PlannerInspector";
import type {
  LogEntry,
  SessionSnapshot,
  SubsystemItem,
} from "../UmbraAIConsole";

import {
  Activity,
  Cpu,
  Database,
  Eye,
  Lock,
  Radar,
  Shield,
  Swords,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

type CommandShellProps = {
  logs: LogEntry[];
  subsystems: SubsystemItem[];
  session: SessionSnapshot;
  input: string;
  setInput: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isBusy: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  developerMode: boolean;
  setDeveloperMode: React.Dispatch<React.SetStateAction<boolean>>;
  developerPanel?: React.ReactNode;
  resetCurrentSession: () => void;
};

function ShellFrame({
  children,
  className = "",
  variant = "standard",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "standard" | "heavy" | "soft";
}) {
  const variantClasses =
    variant === "heavy"
      ? {
          border: "border-[rgba(255,160,70,0.14)]",
          bg: "bg-[linear-gradient(180deg,rgba(255,170,80,0.04),rgba(255,170,80,0.012))]",
          shadow:
            "shadow-[inset_0_0_0_1px_rgba(255,180,90,0.04),0_0_50px_rgba(0,0,0,0.5)]",
        }
      : variant === "soft"
        ? {
            border: "border-[rgba(255,160,70,0.09)]",
            bg: "bg-[linear-gradient(180deg,rgba(255,170,80,0.024),rgba(255,170,80,0.006))]",
            shadow:
              "shadow-[inset_0_0_0_1px_rgba(255,180,90,0.025),0_0_28px_rgba(0,0,0,0.36)]",
          }
        : {
            border: "border-[rgba(255,160,70,0.12)]",
            bg: "bg-[linear-gradient(180deg,rgba(255,170,80,0.032),rgba(255,170,80,0.01))]",
            shadow:
              "shadow-[inset_0_0_0_1px_rgba(255,180,90,0.03),0_0_40px_rgba(0,0,0,0.45)]",
          };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          absolute inset-0
          [clip-path:polygon(18px_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%,0_18px)]
          border ${variantClasses.border}
          ${variantClasses.bg}
          ${variantClasses.shadow}
        `}
      />
      <div
        className="
          pointer-events-none absolute inset-[1px]
          [clip-path:polygon(18px_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%,0_18px)]
          bg-[linear-gradient(135deg,rgba(255,170,90,0.022)_0%,transparent_18%,transparent_82%,rgba(140,20,20,0.055)_100%)]
        "
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14),transparent)]" />
        <div className="absolute right-[10px] top-[10px] h-[14px] w-[14px] border-r border-t border-[rgba(255,176,104,0.08)]" />
        <div className="absolute bottom-[10px] left-[10px] h-[14px] w-[14px] border-b border-l border-[rgba(255,176,104,0.08)]" />
      </div>
      <div className={`relative z-10 ${className}`}>{children}</div>
    </div>
  );
}

function ProjectionLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`
        pointer-events-none absolute h-px
        bg-[linear-gradient(90deg,transparent,rgba(255,163,72,0.18),rgba(255,163,72,0.48),rgba(255,163,72,0.18),transparent)]
        ${className}
      `}
    />
  );
}

function VerticalBus({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.12),transparent)] ${className}`}
    />
  );
}

function mapLogsToFeed(logs: LogEntry[]) {
  return logs.map((log) => {
    const role =
      log.source === "USER"
        ? "user"
        : log.source === "CHERNOBOG"
          ? "assistant"
          : "system";

    return {
      id: log.id,
      role,
      title:
        log.source === "SYSTEM" || log.source === "ROUTER"
          ? "SYSTEM"
          : log.source,
      state:
        log.source === "ROUTER"
          ? "route"
          : log.source === "SYSTEM"
            ? "system"
            : log.source === "CHERNOBOG"
              ? "response"
              : "issued",
      timestamp: log.timestamp,
      content: log.text,
    } as const;
  });
}

function mapSubsystems(subsystems: SubsystemItem[]): RailSubsystemItem[] {
  function getIcon(key: string): LucideIcon {
    switch (key) {
      case "override":
        return Shield;
      case "optic":
        return Eye;
      case "combat":
        return Swords;
      case "relay":
        return Radar;
      case "memory":
        return Cpu;
      case "guardian":
        return Lock;
      default:
        return Cpu;
    }
  }

  return subsystems.map((item) => ({
    id: item.key,
    name: item.label.toUpperCase(),
    description: item.detail.toUpperCase(),
    state:
      item.status === "ACTIVE"
        ? "armed"
        : item.status === "ONLINE"
          ? "online"
          : item.status === "LOCKED"
            ? "locked"
            : item.status === "ALERT"
              ? "tracking"
              : item.status === "IDLE"
                ? "standby"
                : item.status === "STANDBY"
                  ? "standby"
                  : "ready",
    icon: getIcon(item.key),
  }));
}

function deriveComposerMode(
  session: SessionSnapshot
): "directive" | "analysis" | "sealed" {
  if (
    session.pendingState === "processing" ||
    session.pendingState === "awaiting_file_selection" ||
    session.pendingState === "awaiting_confirmation" ||
    session.pendingState === "awaiting_clarification"
  ) {
    return "sealed";
  }

  if (session.activeRoute === "tools" || session.activeRoute === "guardian") {
    return "analysis";
  }

  return "directive";
}

function deriveTelemetryMetrics(session: SessionSnapshot, isBusy: boolean) {
  const workflowStep = session.workflowStep.toLowerCase();
  const pending = session.pendingState.toLowerCase();

  const throughputLevel =
    isBusy || workflowStep === "searching" || workflowStep === "reading"
      ? 94
      : workflowStep === "awaiting_selection"
        ? 78
        : workflowStep === "failed"
          ? 46
          : 84;

  const convergenceLevel =
    session.activeRoute === "tools"
      ? 96
      : session.activeRoute === "guardian"
        ? 90
        : session.workflowKind === "file"
          ? 91
          : 86;

  const loadLevel =
    pending !== "none" || workflowStep === "awaiting_selection"
      ? 64
      : isBusy
        ? 58
        : workflowStep === "failed"
          ? 67
          : 34;

  return [
    {
      label: "Directive Throughput",
      value: `${throughputLevel.toFixed(1)}%`,
      detail:
        throughputLevel >= 90
          ? "elevated"
          : throughputLevel >= 75
            ? "stable"
            : "degraded",
      level: throughputLevel,
    },
    {
      label: "Optic Convergence",
      value: `${convergenceLevel.toFixed(1)}%`,
      detail: session.activeRoute === "tools" ? "focused" : "stable",
      level: convergenceLevel,
    },
    {
      label: "Cognitive Load",
      value: `${loadLevel.toFixed(1)}%`,
      detail:
        loadLevel >= 60 ? "elevated" : loadLevel <= 40 ? "within band" : "stable",
      level: loadLevel,
    },
  ];
}

function deriveTelemetryStreams(session: SessionSnapshot) {
  return [
    {
      label: "Active Route",
      value: session.activeRoute.toUpperCase(),
    },
    {
      label: "Workflow Step",
      value: session.workflowStep.toUpperCase(),
    },
    {
      label: "Search Root",
      value: session.currentSearchRoot.toUpperCase(),
    },
    {
      label: "Search Query",
      value: session.currentSearchQuery.toUpperCase(),
    },
    {
      label: "Toolchain",
      value: session.lastTool.toUpperCase(),
    },
    {
      label: "Pending State",
      value: session.pendingState.toUpperCase(),
    },
  ];
}

function deriveContextBlocks(session: SessionSnapshot) {
  return [
    {
      label: "Active Route",
      value: session.activeRoute.toUpperCase(),
      detail: "live session route",
    },
    {
      label: "Workflow Step",
      value: session.workflowStep.toUpperCase(),
      detail:
        session.workflowKind === "file"
          ? "workflow execution state"
          : "no active workflow",
    },
    {
      label: "Last Tool",
      value: session.lastTool.toUpperCase(),
      detail:
        session.lastTool !== "none"
          ? "most recent executed tool"
          : "no recent tool path",
    },
    {
      label: "Active Plan",
      value: session.activePlan ? session.activePlan.title.toUpperCase() : "NONE",
      detail: session.activePlan
        ? `${session.activePlan.stepCount} steps tracked`
        : "no persistent plan active",
    },
  ];
}

function deriveContextRoutes(session: SessionSnapshot) {
  return [
    {
      title: "CURRENT SEARCH QUERY",
      state: session.currentSearchQuery.toUpperCase(),
    },
    {
      title: "SEARCH ROOT",
      state: session.currentSearchRoot.toUpperCase(),
    },
    {
      title: "LAST SELECTED FILE",
      state: session.lastSelectedFile.toUpperCase(),
    },
    {
      title: "LAST READ FILE",
      state: session.lastReadFile.toUpperCase(),
    },
  ];
}

function deriveHeaderStats(
  session: SessionSnapshot,
  isBusy: boolean
): HeaderStat[] {
  const workflowStep = session.workflowStep.toLowerCase();

  return [
    {
      label: "System Status",
      value:
        workflowStep === "failed"
          ? "BLOCKED"
          : isBusy
            ? "ACTIVE"
            : "NOMINAL",
      tone:
        workflowStep === "failed"
          ? "warning"
          : isBusy
            ? "ready"
            : "nominal",
      icon: <Activity className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Workflow",
      value: session.workflowStep.toUpperCase(),
      tone:
        workflowStep === "awaiting_selection"
          ? "warning"
          : session.workflowKind === "file"
            ? "stable"
            : "nominal",
      icon: <Database className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Toolchain",
      value: session.lastTool.toUpperCase(),
      tone: session.lastTool !== "none" ? "ready" : "nominal",
      icon: <Shield className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Session",
      value: session.activeRoute.toUpperCase(),
      tone: session.activeRoute === "tools" ? "stable" : "nominal",
      icon: <Cpu className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Selection Set",
      value: String(session.workflowCandidateCount),
      tone: session.workflowCandidateCount > 0 ? "stable" : "nominal",
      icon: <Thermometer className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
  ];
}

export default function CommandShell({
  logs,
  subsystems,
  session,
  input,
  setInput,
  onSubmit,
  isBusy,
  scrollRef,
  developerMode,
  setDeveloperMode,
  developerPanel,
  resetCurrentSession,
}: CommandShellProps) {
  const feedItems = mapLogsToFeed(logs);
  const railItems = mapSubsystems(subsystems);
  const composerMode = deriveComposerMode(session);
  const telemetryMetrics = deriveTelemetryMetrics(session, isBusy);
  const telemetryStreams = deriveTelemetryStreams(session);
  const contextBlocks = deriveContextBlocks(session);
  const contextRoutes = deriveContextRoutes(session);
  const headerStats = deriveHeaderStats(session, isBusy);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] text-[#d6d1c7]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.05)_0%,rgba(255,145,55,0.018)_18%,rgba(0,0,0,0)_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,120,40,0.028)_0%,transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040507_0%,#07080b_35%,#050608_100%)]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,170,90,0.36)_0.55px,transparent_0.55px)] [background-size:28px_28px]" />

        <VerticalBus className="left-1/2 top-0 h-full -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,155,70,0.05),transparent)]" />

        <div className="absolute left-1/2 top-[22%] h-[54rem] w-[54rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.055)]" />
        <div className="absolute left-1/2 top-[24%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.04)]" />
        <div className="absolute left-1/2 top-[28%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full border border-[rgba(255,155,70,0.03)]" />
        <div className="absolute left-1/2 top-[28%] h-[34rem] w-[70rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,145,55,0.05)_0%,rgba(255,145,55,0.018)_22%,transparent_65%)]" />

        <ProjectionLine className="left-[8%] right-[8%] top-[13.2%]" />
        <ProjectionLine className="left-[14%] right-[14%] top-[45.6%]" />
        <ProjectionLine className="left-[12%] right-[12%] bottom-[13.4%]" />

        <div className="absolute left-[5%] top-[9%] h-[82%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.08),transparent)]" />
        <div className="absolute right-[5%] top-[9%] h-[82%] w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.08),transparent)]" />
      </div>

      <div className="relative z-10 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1820px]">
          <div
            className="
              relative
              [clip-path:polygon(20px_0,99.2%_0,100%_1.6%,100%_98.4%,99.2%_100%,0.8%_100%,0_98.4%,0_1.6%)]
              border border-[rgba(255,170,90,0.12)]
              bg-[linear-gradient(180deg,rgba(7,9,12,0.92),rgba(6,7,10,0.97))]
              shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,185,110,0.03)]
              backdrop-blur-sm
            "
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_18%,transparent_82%,rgba(140,20,20,0.04))]" />
              <div className="absolute left-[14px] top-[14px] h-[18px] w-[18px] border-l border-t border-[rgba(255,176,104,0.08)]" />
              <div className="absolute right-[14px] top-[14px] h-[18px] w-[18px] border-r border-t border-[rgba(255,176,104,0.08)]" />
              <div className="absolute bottom-[14px] left-[14px] h-[18px] w-[18px] border-b border-l border-[rgba(255,176,104,0.08)]" />
              <div className="absolute bottom-[14px] right-[14px] h-[18px] w-[18px] border-b border-r border-[rgba(255,176,104,0.08)]" />
            </div>

            <div className="p-3 md:p-4 lg:p-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
                <div className="xl:col-span-12">
                  <ShellFrame variant="heavy" className="p-0">
                    <CommandHeader
                      title="CHERNOBOG // OVERRIDE"
                      subtitle="GOD PROGRAM INTERFACE"
                      description={`SESSION ${session.sessionId
                        .slice(0, 8)
                        .toUpperCase()} // ROUTE ${session.activeRoute.toUpperCase()} // TOOL ${session.lastTool.toUpperCase()}`}
                      stats={headerStats}
                    />
                  </ShellFrame>
                </div>

                <div className="xl:col-span-3">
                  <ShellFrame variant="standard" className="h-full p-3 md:p-4">
                    <SubsystemRail items={railItems} version="INTERFACE VER. 4.5.0" />
                  </ShellFrame>
                </div>

                <div className="xl:col-span-6">
                  <div className="flex h-full flex-col gap-4 xl:gap-5">
                    <ShellFrame variant="heavy" className="relative p-3 md:p-4 lg:p-5">
                      <div className="relative">
                        <CoreEye
                          title="CHERNOBOG SIGIL STATE"
                          subtitle="CORE EMBLEM"
                          statusLabel={`WORKFLOW ${session.workflowStep.toUpperCase()} // ROUTE ${session.activeRoute.toUpperCase()}`}
                          body={session.lastToolSummary}
                        />
                      </div>
                    </ShellFrame>

                    <ShellFrame variant="standard" className="p-3 md:p-4">
                      <div
                        ref={scrollRef}
                        className="max-h-[520px] overflow-y-auto pr-1 [scrollbar-width:thin]"
                      >
                        <DirectiveFeed items={feedItems} />
                      </div>
                    </ShellFrame>
                  </div>
                </div>

                <div className="xl:col-span-3">
                  <div className="flex h-full flex-col gap-4 xl:gap-5">
                    <ShellFrame variant="standard" className="p-3 md:p-4">
                      <TelemetryPanel
                        metrics={telemetryMetrics}
                        streams={telemetryStreams}
                      />
                    </ShellFrame>

                    <ShellFrame variant="standard" className="p-3 md:p-4">
                      <ContextPanel
                        blocks={contextBlocks}
                        routes={contextRoutes}
                        summary={session.lastToolSummary}
                      />
                    </ShellFrame>
                  </div>
                </div>

                <div className="xl:col-span-9">
                  <ShellFrame variant="heavy" className="p-3 md:p-4">
                    <form onSubmit={onSubmit}>
                      <CommandComposer
                        value={input}
                        onChange={setInput}
                        onSubmit={() => {
                          const fakeEvent = {
                            preventDefault() {},
                          } as React.FormEvent<HTMLFormElement>;
                          onSubmit(fakeEvent);
                        }}
                        disabled={isBusy}
                        mode={composerMode}
                        placeholder={
                          isBusy
                            ? "CHERNOBOG IS PROCESSING DIRECTIVE..."
                            : "ISSUE DIRECTIVE TO CHERNOBOG..."
                        }
                      />
                    </form>
                  </ShellFrame>
                </div>

                <div className="xl:col-span-3">
                  <div className="flex h-full flex-col gap-4 xl:gap-5">
                    <ShellFrame variant="soft" className="min-h-[220px] p-3 md:p-4">
                      <WorkflowInspector
                        route={session.activeRoute}
                        workflowKind={session.workflowKind}
                        workflowStep={session.workflowStep}
                        workflowCandidateCount={session.workflowCandidateCount}
                        searchQuery={session.currentSearchQuery}
                        searchRoot={session.currentSearchRoot}
                        selectedFile={session.lastSelectedFile}
                        readFile={session.lastReadFile}
                        lastTool={session.lastTool}
                        toolSummary={session.lastToolSummary}
                        pendingState={session.pendingState}
                        isBusy={isBusy}
                      />
                    </ShellFrame>

                    <ShellFrame variant="soft" className="p-3 md:p-4">
                      <PlannerInspector activePlan={session.activePlan} />
                    </ShellFrame>

                    <ShellFrame variant="soft" className="p-3 md:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffb066]/70">
                            Developer Trust
                          </div>
                          <div className="mt-1 text-xs text-[#d6d1c7]/50">
                            Trust traces, tool logs, memories, and message state
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDeveloperMode((value) => !value)}
                            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#ffb066] transition hover:bg-[rgba(255,120,40,0.08)]"
                          >
                            {developerMode ? "On" : "Off"}
                          </button>

                          <button
                            type="button"
                            onClick={resetCurrentSession}
                            className="rounded-lg border border-[rgba(255,80,80,0.24)] px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/30"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </ShellFrame>

                    {developerPanel ? (
                      <ShellFrame variant="soft" className="p-3 md:p-4">
                        {developerPanel}
                      </ShellFrame>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}