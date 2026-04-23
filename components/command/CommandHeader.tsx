"use client";

import { Activity, Cpu, Database, Shield, Thermometer } from "lucide-react";

export type HeaderStat = {
  label: string;
  value: string;
  tone?: "nominal" | "ready" | "stable" | "warning";
  icon: React.ReactNode;
};

type CommandHeaderProps = {
  title?: string;
  subtitle?: string;
  description?: string;
  stats?: HeaderStat[];
};

function toneClasses(tone: HeaderStat["tone"] = "nominal") {
  switch (tone) {
    case "ready":
      return {
        dot: "bg-[rgba(88,214,164,0.94)] shadow-[0_0_14px_rgba(88,214,164,0.34)]",
        value: "text-[rgba(239,234,225,0.96)]",
        meta: "text-[rgba(241,184,110,0.86)]",
        metaLabel: "SYNCED",
        accent: "bg-[rgba(88,214,164,0.7)]",
      };
    case "stable":
      return {
        dot: "bg-[rgba(100,212,172,0.94)] shadow-[0_0_14px_rgba(100,212,172,0.32)]",
        value: "text-[rgba(239,234,225,0.96)]",
        meta: "text-[rgba(241,184,110,0.84)]",
        metaLabel: "LINKED",
        accent: "bg-[rgba(100,212,172,0.64)]",
      };
    case "warning":
      return {
        dot: "bg-[rgba(155,36,36,0.9)] shadow-[0_0_14px_rgba(155,36,36,0.3)]",
        value: "text-[rgba(239,224,224,0.95)]",
        meta: "text-[rgba(196,118,118,0.84)]",
        metaLabel: "WATCH",
        accent: "bg-[rgba(155,36,36,0.72)]",
      };
    case "nominal":
    default:
      return {
        dot: "bg-[rgba(86,208,154,0.94)] shadow-[0_0_14px_rgba(86,208,154,0.34)]",
        value: "text-[rgba(239,234,225,0.96)]",
        meta: "text-[rgba(241,184,110,0.84)]",
        metaLabel: "LINKED",
        accent: "bg-[rgba(86,208,154,0.68)]",
      };
  }
}

function StatusCell({ stat, index }: { stat: HeaderStat; index: number }) {
  const tone = toneClasses(stat.tone);

  return (
    <div className="group relative min-h-[94px] overflow-hidden">
      <div className="absolute inset-0 [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] border border-[rgba(255,168,88,0.13)] bg-[linear-gradient(180deg,rgba(255,170,90,0.038),rgba(255,170,90,0.008))] shadow-[inset_0_0_0_1px_rgba(255,190,120,0.022),inset_0_-14px_26px_rgba(0,0,0,0.18)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.018),transparent_24%,transparent_78%,rgba(120,16,16,0.04))]" />
        <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,174,96,0.18),transparent)]" />
        <div className="absolute bottom-0 left-0 h-px w-[46%] bg-[linear-gradient(90deg,rgba(255,168,82,0.22),transparent)]" />
        <div className="absolute right-[7px] top-[7px] h-[12px] w-[12px] border-r border-t border-[rgba(255,174,96,0.08)]" />
        <div className="absolute bottom-[7px] left-[7px] h-[12px] w-[12px] border-b border-l border-[rgba(255,174,96,0.08)]" />
        <div className={`absolute right-0 top-0 h-full w-[2px] ${tone.accent} opacity-55`} />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[rgba(181,129,83,0.72)]">{stat.icon}</span>
            <div className="min-w-0">
              <div className="text-[8px] uppercase tracking-[0.24em] text-[rgba(181,129,83,0.7)]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="mt-0.5 truncate text-[8px] uppercase tracking-[0.22em] text-[rgba(181,129,83,0.76)]">
                {stat.label}
              </div>
            </div>
          </div>

          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        </div>

        <div className={`mt-3 text-[17px] font-medium uppercase tracking-[0.12em] ${tone.value}`}>
          {stat.value}
        </div>

        <div className={`mt-1.5 text-[8px] uppercase tracking-[0.24em] ${tone.meta}`}>
          {tone.metaLabel}
        </div>
      </div>
    </div>
  );
}

export default function CommandHeader({
  title = "CHERNOBOG // OVERRIDE",
  subtitle = "GOD PROGRAM INTERFACE",
  description = "SESSION 293208 // ROUTE IDLE // TOOL NONE",
  stats = [
    {
      label: "System Status",
      value: "NOMINAL",
      tone: "nominal",
      icon: <Activity className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Memory Core",
      value: "ONLINE",
      tone: "stable",
      icon: <Database className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Toolchain",
      value: "READY",
      tone: "ready",
      icon: <Shield className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Session",
      value: "STABLE",
      tone: "stable",
      icon: <Cpu className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
    {
      label: "Core Temp",
      value: "31.2°C",
      tone: "nominal",
      icon: <Thermometer className="h-3.5 w-3.5" strokeWidth={1.6} />,
    },
  ],
}: CommandHeaderProps) {
  return (
    <header className="relative overflow-hidden px-4 py-4 md:px-5 md:py-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,170,90,0.018),rgba(255,170,90,0.004))]" />
        <div className="absolute left-[14%] right-[14%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,175,95,0.2),transparent)]" />
        <div className="absolute left-[7%] top-[18px] h-px w-[160px] bg-[linear-gradient(90deg,rgba(255,175,95,0.16),transparent)]" />
        <div className="absolute right-[7%] top-[18px] h-px w-[160px] bg-[linear-gradient(90deg,transparent,rgba(255,175,95,0.16))]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(690px,1fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-4 md:gap-4">
            <div className="hidden shrink-0 md:block">
              <div className="relative flex h-[94px] w-[94px] items-center justify-center overflow-hidden [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)] border border-[rgba(255,170,90,0.14)] bg-[linear-gradient(180deg,rgba(255,170,90,0.035),rgba(255,170,90,0.008))] shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,150,65,0.08)_0%,transparent_68%)]" />
                <div className="absolute h-[70px] w-[70px] rounded-full border border-[rgba(255,170,90,0.12)]" />
                <div className="absolute h-[48px] w-[48px] rounded-full border border-[rgba(255,170,90,0.16)]" />
                <div className="absolute h-[30px] w-[8px] rounded-full bg-[linear-gradient(180deg,rgba(255,155,72,0),rgba(255,188,122,1),rgba(255,155,72,0))] shadow-[0_0_18px_rgba(255,150,65,0.38)]" />
                <div className="absolute h-[72px] w-[72px] border border-[rgba(255,170,90,0.08)] [clip-path:polygon(0_50%,18%_18%,50%_0,82%_18%,100%_50%,82%_82%,50%_100%,18%_82%)]" />
                <div className="absolute right-[8px] top-[8px] h-[12px] w-[12px] border-r border-t border-[rgba(255,176,104,0.08)]" />
                <div className="absolute bottom-[8px] left-[8px] h-[12px] w-[12px] border-b border-l border-[rgba(255,176,104,0.08)]" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[8px] font-medium uppercase tracking-[0.34em] text-[rgba(194,149,107,0.72)] md:text-[9px]">
                {subtitle}
              </div>

              <h1 className="mt-2 text-[28px] font-semibold uppercase leading-none tracking-[0.18em] text-[rgba(245,239,230,0.97)] md:text-[38px]">
                {title}
              </h1>

              <p className="mt-3 max-w-[780px] text-[10px] uppercase leading-6 tracking-[0.12em] text-[rgba(199,190,175,0.66)] md:text-[11px]">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat, index) => (
            <StatusCell key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </header>
  );
}