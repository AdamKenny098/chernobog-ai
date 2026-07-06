import type { ReactNode } from "react";

export function ClassicPanel({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden border border-[#6f3d18]/70 bg-[#080604]/95 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08),0_0_45px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9782f]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#c9782f]/40 to-transparent" />
      <div className="relative p-4">
        {eyebrow ? (
          <div className="text-[9px] uppercase tracking-[0.36em] text-[#c9782f]/65">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <h2 className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#f3d9ae]">
            {title}
          </h2>
        ) : null}
        <div className={title || eyebrow ? "mt-4" : ""}>{children}</div>
      </div>
    </section>
  );
}

export function ClassicStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="border border-[#6f3d18]/70 bg-[#0b0806]/90 p-3 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.06)]">
      <div className="text-[8px] uppercase tracking-[0.34em] text-[#c9782f]/65">
        {label}
      </div>
      <div className="mt-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[#ffe0ac]">
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-[#8e785c]">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function ClassicBadge({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "green" | "red" | "blue" | "dim";
}) {
  const toneClass = {
    amber: "border-[#c9782f]/70 bg-[#2a1609]/90 text-[#ffd28a]",
    green: "border-emerald-400/50 bg-emerald-950/30 text-emerald-200",
    red: "border-red-400/50 bg-red-950/30 text-red-200",
    blue: "border-cyan-300/50 bg-cyan-950/25 text-cyan-100",
    dim: "border-[#5a4a38]/70 bg-black/35 text-[#8e785c]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function ClassicSignal({
  title = "Chernobog Signal State",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden border border-[#6f3d18]/70 bg-[radial-gradient(circle_at_center,rgba(255,147,48,0.08),transparent_34%),linear-gradient(180deg,#070605,#030303)] shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08)]">
      <div className="pointer-events-none absolute inset-8 border border-[#6f3d18]/35" />
      <div className="pointer-events-none absolute inset-x-12 top-1/2 h-px bg-gradient-to-r from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute h-28 w-[520px] rounded-[100%] border border-[#b86d2a]/35" />
      <div className="pointer-events-none absolute h-16 w-[360px] rounded-[100%] border border-[#b86d2a]/25" />
      <div className="pointer-events-none absolute h-7 w-7 rounded-full bg-[#ffd79a] blur-sm" />
      <div className="pointer-events-none absolute h-16 w-6 rounded-full bg-[#ff9b3a]/45 blur-xl" />
      <div className="relative z-10 mt-44 text-center">
        <div className="text-[9px] uppercase tracking-[0.5em] text-[#c9782f]/55">
          Persistent Interface Field
        </div>
        <div className="mt-3 text-sm font-semibold uppercase tracking-[0.55em] text-[#ffd28a]">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-3 font-mono text-[10px] text-[#8e785c]">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClassicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-[#030303] text-[#f3d9ae]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,113,31,0.1),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(255,154,58,0.08),transparent_26%),linear-gradient(180deg,#050403,#020202)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,154,58,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,154,58,0.45)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative">{children}</div>
    </div>
  );
}
