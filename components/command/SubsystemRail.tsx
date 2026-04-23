"use client";

import {
  Cpu,
  Eye,
  Lock,
  Radar,
  Shield,
  Swords,
  type LucideIcon,
} from "lucide-react";

export type RailSubsystemState =
  | "armed"
  | "tracking"
  | "ready"
  | "locked"
  | "online"
  | "standby";

export type RailSubsystemItem = {
  id: string;
  name: string;
  description: string;
  state: RailSubsystemState;
  icon: LucideIcon;
};

type SubsystemRailProps = {
  items?: RailSubsystemItem[];
  version?: string;
};

function stateStyles(state: RailSubsystemState) {
  switch (state) {
    case "armed":
      return {
        label: "ARMED",
        subLabel: "ENGAGED",
        valueClass: "text-[rgba(247,190,114,0.98)]",
        chipClass:
          "border-[rgba(255,170,90,0.3)] bg-[rgba(255,170,90,0.1)] text-[rgba(247,190,114,0.94)]",
        lineClass: "from-[rgba(255,170,90,0.58)] to-transparent",
        iconGlow: "shadow-[0_0_24px_rgba(255,150,70,0.18)]",
        cardAccent: "bg-[rgba(255,170,90,0.78)]",
        sideDot: "bg-[rgba(255,170,90,0.55)]",
      };
    case "tracking":
      return {
        label: "TRACKING",
        subLabel: "ACQUIRING",
        valueClass: "text-[rgba(241,184,110,0.95)]",
        chipClass:
          "border-[rgba(255,170,90,0.24)] bg-[rgba(255,170,90,0.07)] text-[rgba(241,184,110,0.88)]",
        lineClass: "from-[rgba(255,170,90,0.46)] to-transparent",
        iconGlow: "shadow-[0_0_20px_rgba(255,150,70,0.13)]",
        cardAccent: "bg-[rgba(255,170,90,0.56)]",
        sideDot: "bg-[rgba(255,170,90,0.42)]",
      };
    case "ready":
      return {
        label: "READY",
        subLabel: "SYNCED",
        valueClass: "text-[rgba(236,179,106,0.92)]",
        chipClass:
          "border-[rgba(255,170,90,0.22)] bg-[rgba(255,170,90,0.06)] text-[rgba(236,179,106,0.84)]",
        lineClass: "from-[rgba(255,170,90,0.38)] to-transparent",
        iconGlow: "shadow-[0_0_18px_rgba(255,150,70,0.1)]",
        cardAccent: "bg-[rgba(255,170,90,0.42)]",
        sideDot: "bg-[rgba(255,170,90,0.34)]",
      };
    case "locked":
      return {
        label: "LOCKED",
        subLabel: "SEALED",
        valueClass: "text-[rgba(228,172,102,0.88)]",
        chipClass:
          "border-[rgba(255,170,90,0.18)] bg-[rgba(255,170,90,0.045)] text-[rgba(228,172,102,0.8)]",
        lineClass: "from-[rgba(255,170,90,0.32)] to-transparent",
        iconGlow: "shadow-[0_0_16px_rgba(255,150,70,0.08)]",
        cardAccent: "bg-[rgba(255,170,90,0.32)]",
        sideDot: "bg-[rgba(255,170,90,0.26)]",
      };
    case "online":
      return {
        label: "ONLINE",
        subLabel: "ACTIVE",
        valueClass: "text-[rgba(244,184,110,0.96)]",
        chipClass:
          "border-[rgba(255,170,90,0.25)] bg-[rgba(255,170,90,0.07)] text-[rgba(244,184,110,0.9)]",
        lineClass: "from-[rgba(255,170,90,0.44)] to-transparent",
        iconGlow: "shadow-[0_0_22px_rgba(255,150,70,0.14)]",
        cardAccent: "bg-[rgba(255,170,90,0.5)]",
        sideDot: "bg-[rgba(255,170,90,0.38)]",
      };
    case "standby":
    default:
      return {
        label: "STANDBY",
        subLabel: "IDLE",
        valueClass: "text-[rgba(206,156,92,0.7)]",
        chipClass:
          "border-[rgba(255,170,90,0.12)] bg-[rgba(255,170,90,0.025)] text-[rgba(206,156,92,0.68)]",
        lineClass: "from-[rgba(255,170,90,0.22)] to-transparent",
        iconGlow: "shadow-[0_0_14px_rgba(255,150,70,0.05)]",
        cardAccent: "bg-[rgba(255,170,90,0.22)]",
        sideDot: "bg-[rgba(255,170,90,0.2)]",
      };
  }
}

function RailCard({
  item,
  index,
}: {
  item: RailSubsystemItem;
  index: number;
}) {
  const Icon = item.icon;
  const state = stateStyles(item.state);

  return (
    <article className="group relative">
      <div
        className="
          absolute inset-0
          [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]
          border border-[rgba(255,170,90,0.15)]
          bg-[linear-gradient(180deg,rgba(255,170,90,0.04),rgba(255,170,90,0.01))]
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.025),inset_0_-18px_40px_rgba(0,0,0,0.22)]
          transition duration-300
          group-hover:border-[rgba(255,186,112,0.28)]
        "
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.02),transparent_28%,transparent_82%,rgba(120,16,16,0.05))]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,180,100,0.16),transparent)]" />
        <div className="absolute left-0 top-0 h-full w-px bg-[linear-gradient(180deg,transparent,rgba(255,180,100,0.08),transparent)]" />
        <div className={`absolute bottom-0 left-0 h-px w-[48%] bg-gradient-to-r ${state.lineClass}`} />

        <div className="absolute left-[7px] top-[7px] h-[14px] w-[14px] border-l border-t border-[rgba(255,176,104,0.08)]" />
        <div className="absolute right-[7px] top-[7px] h-[14px] w-[14px] border-r border-t border-[rgba(255,176,104,0.08)]" />
        <div className="absolute bottom-[7px] left-[7px] h-[14px] w-[14px] border-b border-l border-[rgba(255,176,104,0.08)]" />

        <div className="absolute bottom-[8px] right-[8px] h-[18px] w-px bg-[linear-gradient(180deg,transparent,rgba(130,18,18,0.76))]" />
        <div className="absolute bottom-[8px] right-[11px] h-[7px] w-[1px] bg-[rgba(130,18,18,0.62)]" />

        <div className="absolute left-[-10px] top-1/2 h-px w-[14px] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(255,176,104,0.2),transparent)]" />
        <div className={`absolute left-[-4px] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full ${state.sideDot} shadow-[0_0_8px_rgba(255,170,90,0.18)]`} />

        <div className={`absolute right-0 top-0 h-full w-[2px] ${state.cardAccent} opacity-60`} />
      </div>

      <div className="relative z-10 grid grid-cols-[1fr_auto] gap-3 px-4 py-[11px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,170,90,0.2),transparent)]" />
          </div>

          <h3 className="text-[14px] font-medium uppercase tracking-[0.2em] text-[rgba(238,232,223,0.94)]">
            {item.name}
          </h3>

          <p className="mt-1.5 max-w-[18rem] text-[10px] uppercase tracking-[0.09em] leading-[1.45] text-[rgba(192,183,168,0.5)]">
            {item.description}
          </p>

          <div className="mt-2.5 flex items-center gap-3">
            <span
              className={`inline-flex min-h-[24px] items-center border px-2.5 text-[9px] font-medium uppercase tracking-[0.28em] ${state.chipClass}`}
            >
              {state.label}
            </span>

            <span
              className={`text-[9px] uppercase tracking-[0.26em] ${state.valueClass}`}
            >
              {state.subLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between">
          <div
            className={`
              relative flex h-[50px] w-[50px] items-center justify-center
              [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]
              border border-[rgba(255,170,90,0.2)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.065),rgba(255,170,90,0.014))]
              text-[rgba(228,176,116,0.94)]
              shadow-[inset_0_0_0_1px_rgba(255,190,120,0.025),0_0_22px_rgba(255,150,70,0.06)]
              ${state.iconGlow}
            `}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,156,70,0.12)_0%,transparent_72%)]" />
            <div className="absolute right-[5px] top-[5px] h-[9px] w-[9px] border-r border-t border-[rgba(255,176,104,0.14)]" />
            <div className="absolute bottom-[5px] left-[5px] h-[9px] w-[9px] border-b border-l border-[rgba(255,176,104,0.14)]" />
            <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,170,90,0.74)] shadow-[0_0_8px_rgba(255,170,90,0.28)]" />
            <span className="h-px w-7 bg-[linear-gradient(90deg,rgba(255,170,90,0.28),transparent)]" />
          </div>
        </div>
      </div>
    </article>
  );
}

const defaultItems: RailSubsystemItem[] = [
  {
    id: "override-protocol",
    name: "OVERRIDE PROTOCOL",
    description: "TRANSFORMATION LOGIC STAGED. HIGHER DIRECTIVE CONFIRMATION REQUIRED.",
    state: "armed",
    icon: Shield,
  },
  {
    id: "optic-core",
    name: "OPTIC CORE",
    description: "CHEST-EYE LENS ALIGNED. FORWARD SIGNAL FIXATION MAINTAINED.",
    state: "tracking",
    icon: Eye,
  },
  {
    id: "combat-frame",
    name: "COMBAT FRAME",
    description: "SYNTHETIC BODY TELEMETRY NOMINAL. ROUTED ACTION READY.",
    state: "ready",
    icon: Swords,
  },
  {
    id: "signal-relay",
    name: "SIGNAL RELAY",
    description: "REMOTE DIRECTIVE CHANNEL STABLE. EXTERNAL UPLINK REMAINS SEALED.",
    state: "locked",
    icon: Radar,
  },
  {
    id: "memory-engine",
    name: "MEMORY ENGINE",
    description: "LONG-TERM RECALL MATRICES OPERATIONAL. INDEX READY FOR RETRIEVAL.",
    state: "online",
    icon: Cpu,
  },
  {
    id: "guardian-node",
    name: "GUARDIAN NODE",
    description: "ETHICAL AND DIRECTIVE CONSTRAINTS ACTIVE AT OUTER DECISION LAYER.",
    state: "standby",
    icon: Lock,
  },
];

export default function SubsystemRail({
  version = "INTERFACE VER. 2.4.1",
  items = defaultItems,
}: SubsystemRailProps) {
  return (
    <aside className="relative h-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-[68px] left-[18px] top-[72px] w-px bg-[linear-gradient(180deg,rgba(255,170,90,0.18),rgba(255,170,90,0.04),rgba(255,170,90,0.18))]" />
        <div className="absolute bottom-[68px] left-[23px] top-[72px] w-px bg-[linear-gradient(180deg,transparent,rgba(120,16,16,0.36),transparent)]" />
        <div className="absolute left-[12px] top-[88px] h-[calc(100%-176px)] w-[20px] border-l border-[rgba(255,170,90,0.045)]" />

        <div className="absolute left-[18px] top-[96px] flex h-[calc(100%-192px)] flex-col justify-between">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-[2px] w-[2px] rounded-full bg-[rgba(255,170,90,0.34)]" />
              <span className="h-px w-2 bg-[rgba(255,170,90,0.09)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div
            className="
              relative flex h-[32px] w-[32px] items-center justify-center
              [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]
              border border-[rgba(255,170,90,0.16)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.045),rgba(255,170,90,0.014))]
              text-[rgba(221,170,112,0.84)]
              shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]
            "
          >
            <Cpu className="h-4 w-4" strokeWidth={1.7} />
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[rgba(217,208,195,0.82)]">
              SUBSYSTEMS
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          {items.map((item, index) => (
            <RailCard key={item.id} item={item} index={index} />
          ))}
        </div>

        <div className="mt-4 pt-1">
          <div
            className="
              relative overflow-hidden px-4 py-2.5
              [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]
              border border-[rgba(255,170,90,0.11)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.022),rgba(255,170,90,0.006))]
            "
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.015),transparent_72%,rgba(120,16,16,0.04))]" />
              <div className="absolute right-[8px] top-[8px] h-[10px] w-[10px] border-r border-t border-[rgba(255,176,104,0.08)]" />
              <div className="absolute bottom-[8px] left-[8px] h-[10px] w-[10px] border-b border-l border-[rgba(255,176,104,0.08)]" />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-[0.26em] text-[rgba(183,133,86,0.78)]">
                  {version}
                </span>
                <span className="text-[8px] uppercase tracking-[0.22em] text-[rgba(160,136,109,0.48)]">
                  RAIL BUS SYNCHRONIZED
                </span>
              </div>

              <div className="flex min-w-[88px] items-center gap-2">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,170,90,0.38),rgba(255,170,90,0.08))]" />
                <span className="h-[3px] w-[16px] bg-[rgba(255,170,90,0.8)] shadow-[0_0_10px_rgba(255,170,90,0.24)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}