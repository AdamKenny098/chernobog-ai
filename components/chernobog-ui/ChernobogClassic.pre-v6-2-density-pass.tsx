import Link from "next/link";
import type { ReactNode } from "react";

export type ClassicTone = "amber" | "green" | "red" | "blue" | "dim";

export function ClassicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-[#030303] text-[#f3d9ae]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(255,113,31,0.1),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(255,154,58,0.08),transparent_28%),linear-gradient(180deg,#050403,#020202_78%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,154,58,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,154,58,0.45)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function ClassicLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 2xl:grid-cols-[250px_minmax(0,1fr)_300px]">{children}</div>;
}

export function ClassicMainStack({ children }: { children: ReactNode }) {
  return <main className="grid min-w-0 content-start gap-4">{children}</main>;
}

export function ClassicRail({ children }: { children: ReactNode }) {
  return <aside className="grid min-w-0 content-start gap-4">{children}</aside>;
}

export function ClassicPanel({
  eyebrow,
  title,
  children,
  className = "",
  compact = false,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden border border-[#6f3d18]/70 bg-[#080604]/95 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08),0_0_45px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9782f]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#c9782f]/40 to-transparent" />
      <div className={compact ? "relative p-3" : "relative p-4"}>
        {eyebrow ? (
          <div className="text-[8px] uppercase tracking-[0.36em] text-[#c9782f]/65">
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

export function ClassicHeader({
  eyebrow,
  title,
  description,
  actions,
  metrics,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: ReactNode;
}) {
  return (
    <header className="border border-[#6f3d18]/70 bg-[#080604]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08)]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div>
          <div className="text-[9px] uppercase tracking-[0.42em] text-[#c9782f]/70">{eyebrow}</div>
          <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.24em] text-[#ffe0ac] md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[#b7a386]">{description}</p>
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {metrics ? <div className="grid min-w-[260px] grid-cols-2 gap-2 xl:min-w-[320px]">{metrics}</div> : null}
      </div>
    </header>
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
      <div className="text-[8px] uppercase tracking-[0.34em] text-[#c9782f]/65">{label}</div>
      <div className="mt-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-[#ffe0ac]">{value}</div>
      {detail ? <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-[#8e785c]">{detail}</div> : null}
    </div>
  );
}

export function ClassicMiniStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#6f3d18]/45 pb-2 text-xs">
      <span className="uppercase tracking-[0.22em] text-[#8e785c]">{label}</span>
      <span className="font-mono uppercase text-[#ffd28a]">{value}</span>
    </div>
  );
}

export function ClassicBadge({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: ClassicTone;
}) {
  const toneClass = {
    amber: "border-[#c9782f]/70 bg-[#2a1609]/90 text-[#ffd28a]",
    green: "border-emerald-400/50 bg-emerald-950/30 text-emerald-200",
    red: "border-red-400/50 bg-red-950/30 text-red-200",
    blue: "border-cyan-300/50 bg-cyan-950/25 text-cyan-100",
    dim: "border-[#5a4a38]/70 bg-black/35 text-[#8e785c]",
  }[tone];

  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function ClassicButtonLink({
  href,
  children,
  tone = "amber",
}: {
  href: string;
  children: ReactNode;
  tone?: ClassicTone;
}) {
  const toneClass =
    tone === "amber"
      ? "border-[#c9782f]/70 bg-[#2a1609]/70 text-[#ffd28a] hover:bg-[#3a1e0c]"
      : "border-[#6f3d18]/70 bg-black/30 text-[#b7a386] hover:text-[#ffe0ac]";

  return (
    <Link
      href={href}
      className={`border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${toneClass}`}
    >
      {children}
    </Link>
  );
}

export function ClassicSignal({
  title = "Chernobog Signal State",
  subtitle,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border border-[#6f3d18]/70 bg-[radial-gradient(circle_at_center,rgba(255,147,48,0.08),transparent_34%),linear-gradient(180deg,#070605,#030303)] shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08)] ${
        compact ? "min-h-[250px]" : "min-h-[340px]"
      }`}
    >
      <div className="pointer-events-none absolute inset-8 border border-[#6f3d18]/35" />
      <div className="pointer-events-none absolute inset-x-12 top-1/2 h-px bg-gradient-to-r from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute h-28 w-[70%] rounded-[100%] border border-[#b86d2a]/35" />
      <div className="pointer-events-none absolute h-16 w-[48%] rounded-[100%] border border-[#b86d2a]/25" />
      <div className="pointer-events-none absolute h-7 w-7 rounded-full bg-[#ffd79a] blur-sm" />
      <div className="pointer-events-none absolute h-16 w-6 rounded-full bg-[#ff9b3a]/45 blur-xl" />
      <div className={`relative z-10 text-center ${compact ? "mt-32" : "mt-44"}`}>
        <div className="text-[9px] uppercase tracking-[0.5em] text-[#c9782f]/55">Persistent Interface Field</div>
        <div className="mt-3 text-sm font-semibold uppercase tracking-[0.55em] text-[#ffd28a]">{title}</div>
        {subtitle ? <div className="mt-3 font-mono text-[10px] text-[#8e785c]">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function ClassicDirective({
  index,
  title,
  detail,
}: {
  index: number;
  title: string;
  detail: string;
}) {
  return (
    <div className="border border-[#6f3d18]/45 bg-[#090604] p-3">
      <div className="text-[8px] uppercase tracking-[0.28em] text-[#c9782f]/60">Directive {String(index).padStart(2, "0")}</div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">{title}</div>
      <p className="mt-2 text-[11px] leading-5 text-[#b7a386]">{detail}</p>
    </div>
  );
}
