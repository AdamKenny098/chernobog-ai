"use client";

import {
  Brain,
  FileText,
  GitBranch,
  Layers3,
  LockKeyhole,
  ScrollText,
} from "lucide-react";

type ContextBlock = {
  label: string;
  value: string;
  detail: string;
};

type ContextRoute = {
  title: string;
  state: string;
};

type ContextPanelProps = {
  title?: string;
  blocks?: ContextBlock[];
  routes?: ContextRoute[];
  summary?: string;
};

function detailTone(detail: string) {
  const key = detail.toLowerCase();

  if (key.includes("active") || key.includes("available")) {
    return {
      stateClass: "text-[rgba(238,182,108,0.84)]",
      lineClass: "from-[rgba(255,166,82,0.34)] to-transparent",
      accentClass: "bg-[rgba(255,170,90,0.48)]",
    };
  }

  if (key.includes("focused") || key.includes("lock")) {
    return {
      stateClass: "text-[rgba(232,176,104,0.8)]",
      lineClass: "from-[rgba(255,166,82,0.28)] to-transparent",
      accentClass: "bg-[rgba(255,170,90,0.4)]",
    };
  }

  return {
    stateClass: "text-[rgba(222,168,100,0.74)]",
    lineClass: "from-[rgba(255,166,82,0.22)] to-transparent",
    accentClass: "bg-[rgba(255,170,90,0.3)]",
  };
}

function routeTone(state: string) {
  const key = state.toLowerCase();

  if (key.includes("active")) {
    return {
      textClass: "text-[rgba(242,184,110,0.9)]",
      dotClass: "bg-[rgba(255,170,90,0.72)]",
      lineClass: "from-[rgba(255,170,90,0.34)] to-transparent",
    };
  }

  if (key.includes("sealed") || key.includes("indexed") || key.includes("primed")) {
    return {
      textClass: "text-[rgba(232,176,104,0.8)]",
      dotClass: "bg-[rgba(255,170,90,0.56)]",
      lineClass: "from-[rgba(255,170,90,0.26)] to-transparent",
    };
  }

  return {
    textClass: "text-[rgba(214,162,96,0.72)]",
    dotClass: "bg-[rgba(255,170,90,0.4)]",
    lineClass: "from-[rgba(255,170,90,0.18)] to-transparent",
  };
}

function ContextBlockCard({
  block,
  index,
}: {
  block: ContextBlock;
  index: number;
}) {
  const tone = detailTone(block.detail);

  return (
    <div className="group relative overflow-hidden">
      <div
        className="
          absolute inset-0
          [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]
          border border-[rgba(255,170,90,0.11)]
          bg-[linear-gradient(180deg,rgba(255,170,90,0.024),rgba(255,170,90,0.006))]
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.018),inset_0_-14px_28px_rgba(0,0,0,0.16)]
        "
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_72%,rgba(120,16,16,0.035))]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14),transparent)]" />
        <div className={`absolute bottom-0 left-0 h-px w-[42%] bg-gradient-to-r ${tone.lineClass}`} />
        <div className="absolute right-[8px] top-[8px] h-[12px] w-[12px] border-r border-t border-[rgba(255,176,104,0.06)]" />
        <div className={`absolute right-0 top-0 h-full w-[2px] ${tone.accentClass} opacity-55`} />
      </div>

      <div className="relative z-10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px w-6 bg-[linear-gradient(90deg,rgba(255,170,90,0.18),transparent)]" />
          <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.74)]">
            {block.label}
          </span>
        </div>

        <div className="mt-2 text-[15px] font-medium uppercase tracking-[0.16em] text-[rgba(238,232,223,0.94)]">
          {block.value}
        </div>

        <div className={`mt-2 text-[9px] uppercase tracking-[0.24em] ${tone.stateClass}`}>
          {block.detail}
        </div>
      </div>
    </div>
  );
}

function RouteRow({ route, index }: { route: ContextRoute; index: number }) {
  const tone = routeTone(route.state);

  return (
    <div className="group relative overflow-hidden px-3 py-2.5">
      <div
        className="
          absolute inset-0
          [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]
          border border-[rgba(255,170,90,0.085)]
          bg-[linear-gradient(180deg,rgba(255,170,90,0.018),rgba(255,170,90,0.004))]
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.016)]
        "
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.12),transparent)]" />
        <div className={`absolute bottom-0 left-0 h-px w-[36%] bg-gradient-to-r ${tone.lineClass}`} />
        <div className="absolute right-[8px] top-[8px] h-[10px] w-[10px] border-r border-t border-[rgba(255,176,104,0.06)]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-5 bg-[linear-gradient(90deg,rgba(255,170,90,0.16),transparent)]" />
          </div>

          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[rgba(223,214,201,0.9)]">
            {route.title}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dotClass} shadow-[0_0_8px_rgba(255,170,90,0.22)]`} />
          <span className={`text-[9px] uppercase tracking-[0.24em] ${tone.textClass}`}>
            {route.state}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ContextPanel({
  title = "CONTEXT",
  blocks = [
    {
      label: "Conversation Layer",
      value: "IDLE",
      detail: "active session route",
    },
    {
      label: "Memory Authority",
      value: "NONE",
      detail: "no recent tool path",
    },
    {
      label: "Directive State",
      value: "NONE",
      detail: "pending current state",
    },
  ],
  routes = [
    { title: "CURRENT SEARCH QUERY", state: "NONE" },
    { title: "SEARCH ROOT", state: "NONE" },
    { title: "LAST BLUSTER FILE", state: "NONE" },
    { title: "LAST READ FILE", state: "NONE" },
  ],
  summary = "No tool activity yet.",
}: ContextPanelProps) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[5%] top-[64px] bottom-[34px] w-px bg-[linear-gradient(180deg,rgba(255,170,90,0.08),transparent,rgba(255,170,90,0.08))]" />
        <div className="absolute right-[6%] top-[24px] h-px w-[96px] bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14))]" />
        <div className="absolute left-[5%] top-[78px] flex h-[calc(100%-120px)] flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-[2px] w-[2px] rounded-full bg-[rgba(255,170,90,0.26)]" />
              <span className="h-px w-2 bg-[rgba(255,170,90,0.08)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
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
              <Brain className="h-4 w-4" strokeWidth={1.75} />
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[rgba(219,210,197,0.84)]">
                {title}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                STATE MANIFOLD
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[rgba(233,178,104,0.76)]">
            <Layers3 className="h-3.5 w-3.5" strokeWidth={1.7} />
            <GitBranch className="h-3.5 w-3.5" strokeWidth={1.7} />
            <LockKeyhole className="h-3.5 w-3.5" strokeWidth={1.7} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {blocks.map((block, index) => (
            <ContextBlockCard key={block.label} block={block} index={index} />
          ))}
        </div>

        <div className="relative mt-3 overflow-hidden px-4 py-3.5">
          <div
            className="
              absolute inset-0
              [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)]
              border border-[rgba(255,170,90,0.1)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.024),rgba(255,170,90,0.006))]
            "
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.018),transparent_30%,transparent_78%,rgba(120,16,16,0.04))]" />
            <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
            <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute right-[10px] top-[10px] h-[16px] w-[16px] border-r border-t border-[rgba(255,176,104,0.08)]" />
            <div className="absolute bottom-[10px] left-[10px] h-[16px] w-[16px] border-b border-l border-[rgba(255,176,104,0.08)]" />
          </div>

          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.74)]">
                ROUTED CONTEXT PATHS
              </div>

              <div className="flex items-center gap-2 text-[rgba(233,178,104,0.75)]">
                <ScrollText className="h-3.5 w-3.5" strokeWidth={1.8} />
                <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
              </div>
            </div>

            <div className="space-y-2">
              {routes.map((route, index) => (
                <RouteRow key={route.title} route={route} index={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden px-4 py-3">
          <div
            className="
              absolute inset-0
              [clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]
              border border-[rgba(255,170,90,0.09)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.018),rgba(255,170,90,0.004))]
            "
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_70%,rgba(120,16,16,0.03))]" />
            <div className="absolute bottom-0 left-0 h-px w-[32%] bg-[linear-gradient(90deg,rgba(255,166,82,0.22),transparent)]" />
          </div>

          <div className="relative z-10">
            <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
              INTERNAL SUMMARY
            </div>

            <p className="mt-2 text-[11px] uppercase tracking-[0.06em] leading-[1.55] text-[rgba(193,184,169,0.62)]">
              {summary}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}