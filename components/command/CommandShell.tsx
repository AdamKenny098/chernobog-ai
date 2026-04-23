"use client";

import type { RefObject, FormEventHandler } from "react";
import CommandHeader from "./CommandHeader";
import SubsystemRail, { type RailSubsystemItem } from "./SubsystemRail";
import CoreEye from "./CoreEye";
import TelemetryPanel from "./TelemetryPanel";
import ContextPanel from "./ContextPanel";
import CommandComposer from "./CommandComposer";
import DirectiveFeed from "./DirectiveFeed";
import type {
  LogEntry,
  SessionSnapshot,
  SubsystemItem,
} from "../UmbraAIConsole";

import {
  Cpu,
  Eye,
  Lock,
  Radar,
  Shield,
  Swords,
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
    <div className={`pointer-events-none absolute w-px bg-[linear-gradient(180deg,transparent,rgba(255,155,70,0.12),transparent)] ${className}`} />
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
  if (session.pendingState !== "none") return "sealed";
  if (session.activeRoute === "tools" || session.activeRoute === "guardian") {
    return "analysis";
  }
  return "directive";
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
}: CommandShellProps) {
  const feedItems = mapLogsToFeed(logs);
  const railItems = mapSubsystems(subsystems);
  const composerMode = deriveComposerMode(session);

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
                    />
                  </ShellFrame>
                </div>

                <div className="xl:col-span-3">
                  <ShellFrame variant="standard" className="h-full p-3 md:p-4">
                    <SubsystemRail items={railItems} />
                  </ShellFrame>
                </div>

                <div className="xl:col-span-6">
                  <div className="flex h-full flex-col gap-4 xl:gap-5">
                    <ShellFrame variant="heavy" className="relative p-3 md:p-4 lg:p-5">
                      <div className="relative">
                        <CoreEye
                          title="CHERNOBOG SIGIL STATE"
                          subtitle="CORE EMBLEM"
                          statusLabel={`ACTIVE ROUTE: ${session.activeRoute.toUpperCase()}`}
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
                        metrics={[
                          {
                            label: "Directive Throughput",
                            value: isBusy ? "92.0%" : "84.2%",
                            detail: isBusy ? "elevated" : "nominal",
                            level: isBusy ? 92 : 84,
                          },
                          {
                            label: "Optic Convergence",
                            value:
                              session.activeRoute === "tools" ? "96.4%" : "88.1%",
                            detail: "stable",
                            level: session.activeRoute === "tools" ? 96 : 88,
                          },
                          {
                            label: "Cognitive Load",
                            value:
                              session.pendingState !== "none" ? "61.3%" : "34.8%",
                            detail:
                              session.pendingState !== "none"
                                ? "elevated"
                                : "within band",
                            level: session.pendingState !== "none" ? 61 : 35,
                          },
                        ]}
                        streams={[
                          {
                            label: "Signal Relay",
                            value: session.currentSearchRoot || "NONE",
                          },
                          {
                            label: "Memory State",
                            value: session.lastToolSummary.toUpperCase(),
                          },
                          {
                            label: "Toolchain",
                            value: session.lastTool.toUpperCase(),
                          },
                          {
                            label: "Session Layer",
                            value: session.pendingState.toUpperCase(),
                          },
                        ]}
                      />
                    </ShellFrame>

                    <ShellFrame variant="standard" className="p-3 md:p-4">
                      <ContextPanel
                        blocks={[
                          {
                            label: "Conversation Layer",
                            value: session.activeRoute.toUpperCase(),
                            detail: "active session route",
                          },
                          {
                            label: "Memory Authority",
                            value: session.lastTool.toUpperCase(),
                            detail: "most recent tool path",
                          },
                          {
                            label: "Directive State",
                            value: session.pendingState.toUpperCase(),
                            detail: "current pending state",
                          },
                        ]}
                        routes={[
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
                        ]}
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

                <div className="hidden xl:col-span-3 xl:block">
                  <ShellFrame variant="soft" className="h-full min-h-[160px] p-3 md:p-4">
                    <div className="pointer-events-none relative h-full overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.03)_0%,transparent_68%)]" />
                      <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.12),transparent)]" />
                      <div className="absolute bottom-0 left-0 h-px w-[32%] bg-[linear-gradient(90deg,rgba(255,166,82,0.2),transparent)]" />
                      <div className="absolute left-[10px] top-[10px] h-[14px] w-[14px] border-l border-t border-[rgba(255,176,104,0.06)]" />
                      <div className="absolute right-[10px] bottom-[10px] h-[14px] w-[14px] border-b border-r border-[rgba(255,176,104,0.06)]" />

                      <div className="absolute left-4 top-4 text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.68)]">
                        AUXILIARY RESERVE
                      </div>

                      <div className="absolute left-4 top-12 flex flex-col gap-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="h-[2px] w-[2px] rounded-full bg-[rgba(255,170,90,0.28)]" />
                            <span className="h-px w-8 bg-[linear-gradient(90deg,rgba(255,170,90,0.12),transparent)]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </ShellFrame>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}