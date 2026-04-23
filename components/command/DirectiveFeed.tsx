"use client";

import { Bot, Command, CornerDownRight, ShieldAlert, User } from "lucide-react";
import type { ReactNode } from "react";

type DirectiveRole = "user" | "assistant" | "system";

type DirectiveItem = {
  id: string;
  role: DirectiveRole;
  title?: string;
  content: string;
  state?: string;
  timestamp?: string;
};

type DirectiveFeedProps = {
  title?: string;
  items?: DirectiveItem[];
};

function roleStyles(role: DirectiveRole) {
  switch (role) {
    case "user":
      return {
        label: "ISSUED DIRECTIVE",
        icon: <User className="h-4 w-4" strokeWidth={1.8} />,
        iconClass:
          "text-[rgba(241,185,111,0.9)] border-[rgba(255,176,104,0.16)] bg-[linear-gradient(180deg,rgba(255,170,90,0.05),rgba(255,170,90,0.014))]",
        borderClass: "border-[rgba(255,170,90,0.13)]",
        bgClass:
          "bg-[linear-gradient(180deg,rgba(255,170,90,0.032),rgba(255,170,90,0.008))]",
        lineClass: "bg-[linear-gradient(90deg,rgba(255,166,82,0.34),transparent)]",
        stateClass: "text-[rgba(238,182,108,0.84)]",
        accentClass: "bg-[rgba(255,170,90,0.46)]",
      };

    case "system":
      return {
        label: "SYSTEM NOTICE",
        icon: <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />,
        iconClass:
          "text-[rgba(205,122,122,0.92)] border-[rgba(132,28,28,0.22)] bg-[linear-gradient(180deg,rgba(132,28,28,0.1),rgba(132,28,28,0.024))]",
        borderClass: "border-[rgba(132,28,28,0.22)]",
        bgClass:
          "bg-[linear-gradient(180deg,rgba(132,28,28,0.085),rgba(255,170,90,0.01))]",
        lineClass: "bg-[linear-gradient(90deg,rgba(132,28,28,0.48),transparent)]",
        stateClass: "text-[rgba(205,122,122,0.86)]",
        accentClass: "bg-[rgba(132,28,28,0.62)]",
      };

    case "assistant":
    default:
      return {
        label: "CHERNOBOG RESPONSE",
        icon: <Bot className="h-4 w-4" strokeWidth={1.8} />,
        iconClass:
          "text-[rgba(224,173,113,0.86)] border-[rgba(255,176,104,0.13)] bg-[linear-gradient(180deg,rgba(255,170,90,0.04),rgba(255,170,90,0.012))]",
        borderClass: "border-[rgba(255,170,90,0.11)]",
        bgClass:
          "bg-[linear-gradient(180deg,rgba(255,170,90,0.024),rgba(255,170,90,0.006))]",
        lineClass: "bg-[linear-gradient(90deg,rgba(255,166,82,0.26),transparent)]",
        stateClass: "text-[rgba(230,176,104,0.8)]",
        accentClass: "bg-[rgba(255,170,90,0.34)]",
      };
  }
}

function FeedCard({ item, index }: { item: DirectiveItem; index: number }) {
  const style = roleStyles(item.role);

  return (
    <article className="group relative overflow-hidden">
      <div
        className={`
          absolute inset-0
          [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]
          border ${style.borderClass}
          ${style.bgClass}
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.018),inset_0_-18px_36px_rgba(0,0,0,0.18)]
        `}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_30%,transparent_82%,rgba(120,16,16,0.038))]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14),transparent)]" />
        <div className={`absolute bottom-0 left-0 h-px w-[40%] ${style.lineClass}`} />
        <div className="absolute right-[8px] top-[8px] h-[14px] w-[14px] border-r border-t border-[rgba(255,176,104,0.07)]" />
        <div className="absolute bottom-[8px] left-[8px] h-[14px] w-[14px] border-b border-l border-[rgba(255,176,104,0.07)]" />
        <div className={`absolute right-0 top-0 h-full w-[2px] ${style.accentClass} opacity-55`} />
      </div>

      <div className="relative z-10 grid grid-cols-[auto_1fr] gap-3 px-3 py-3 md:px-4 md:py-3">
        <div
          className={`
            relative flex h-[38px] w-[38px] shrink-0 items-center justify-center
            [clip-path:polygon(9px_0,100%_0,100%_calc(100%-9px),calc(100%-9px)_100%,0_100%,0_9px)]
            border ${style.iconClass}
            shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]
          `}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,156,70,0.08)_0%,transparent_72%)]" />
          <div className="absolute right-[5px] top-[5px] h-[8px] w-[8px] border-r border-t border-[rgba(255,176,104,0.12)]" />
          {style.icon}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.74)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-7 bg-[linear-gradient(90deg,rgba(255,170,90,0.18),transparent)]" />
                <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.74)]">
                  {style.label}
                </span>
              </div>

              {item.title ? (
                <h3 className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.18em] text-[rgba(236,231,223,0.94)]">
                  {item.title}
                </h3>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {item.state ? (
                <span className={`text-[9px] uppercase tracking-[0.24em] ${style.stateClass}`}>
                  {item.state}
                </span>
              ) : null}

              {item.timestamp ? (
                <span className="text-[9px] uppercase tracking-[0.22em] text-[rgba(163,141,115,0.64)]">
                  {item.timestamp}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 whitespace-pre-wrap text-[11px] uppercase tracking-[0.06em] leading-[1.55] text-[rgba(203,194,180,0.68)]">
            {item.content}
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedSectionTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className="
            relative flex h-[34px] w-[34px] items-center justify-center
            [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]
            border border-[rgba(255,170,90,0.14)]
            bg-[linear-gradient(180deg,rgba(255,170,90,0.04),rgba(255,170,90,0.012))]
            text-[rgba(221,170,112,0.84)]
            shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]
          "
        >
          {icon}
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[rgba(219,210,197,0.84)]">
            {children}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
            DIRECTIVE RECORD
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-2 text-[rgba(233,178,104,0.78)] md:flex">
        <CornerDownRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        <Command className="h-3.5 w-3.5" strokeWidth={1.8} />
      </div>
    </div>
  );
}

export default function DirectiveFeed({
  title = "DIRECTIVE FEED",
  items = [
    {
      id: "d1",
      role: "system",
      title: "SYSTEM",
      state: "ACTIVE",
      timestamp: "SYS // 19:42",
      content: "GOD PROGRAM INTERFACE INITIALIZED.",
    },
    {
      id: "d2",
      role: "system",
      title: "SYSTEM",
      state: "ACTIVE",
      timestamp: "SYS // 19:43",
      content: "CORE INTELLIGENCE ONLINE. SESSION ORCHESTRATION STABLE.",
    },
  ],
}: DirectiveFeedProps) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-[56px] bottom-[34px] w-px bg-[linear-gradient(180deg,rgba(255,170,90,0.08),transparent,rgba(255,170,90,0.08))]" />
        <div className="absolute right-[5%] top-[24px] h-px w-[96px] bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14))]" />
        <div className="absolute left-[4%] top-[70px] flex h-[calc(100%-112px)] flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-[2px] w-[2px] rounded-full bg-[rgba(255,170,90,0.26)]" />
              <span className="h-px w-2 bg-[rgba(255,170,90,0.08)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <FeedSectionTitle icon={<Command className="h-4 w-4" strokeWidth={1.8} />}>
          {title}
        </FeedSectionTitle>

        <div className="relative overflow-hidden px-4 py-3.5">
          <div
            className="
              absolute inset-0
              [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)]
              border border-[rgba(255,170,90,0.1)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.022),rgba(255,170,90,0.006))]
            "
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.016),transparent_30%,transparent_80%,rgba(120,16,16,0.04))]" />
            <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
            <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute right-[10px] top-[10px] h-[16px] w-[16px] border-r border-t border-[rgba(255,176,104,0.08)]" />
            <div className="absolute bottom-[10px] left-[10px] h-[16px] w-[16px] border-b border-l border-[rgba(255,176,104,0.08)]" />
          </div>

          <div className="relative z-10 space-y-3">
            {items.map((item, index) => (
              <FeedCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}