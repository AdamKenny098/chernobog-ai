import Link from "next/link";
import type { ReactNode } from "react";

export type ClassicTone = "amber" | "green" | "red" | "blue" | "dim";

export function ClassicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-[#030303] text-[#f3d9ae]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,113,31,0.08),transparent_28%),radial-gradient(circle_at_80%_8%,rgba(255,154,58,0.06),transparent_25%),linear-gradient(180deg,#050403,#020202_78%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,154,58,0.42)_1px,transparent_1px),linear-gradient(90deg,rgba(255,154,58,0.42)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function ClassicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 2xl:grid-cols-[190px_minmax(0,1fr)_230px]">
      {children}
    </div>
  );
}

export function ClassicMainStack({ children }: { children: ReactNode }) {
  return <main className="grid min-w-0 content-start gap-3">{children}</main>;
}

export function ClassicRail({ children }: { children: ReactNode }) {
  return <aside className="grid min-w-0 content-start gap-3">{children}</aside>;
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
      className={`relative overflow-hidden border border-[#5d3214]/80 bg-[#070503]/95 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.07),0_0_28px_rgba(0,0,0,0.4)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#b86d2a]/35 to-transparent" />
      <div className={compact ? "relative p-2.5" : "relative p-3"}>
        {eyebrow ? (
          <div className="text-[7px] uppercase tracking-[0.34em] text-[#c9782f]/62">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <h2 className="mt-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#ffe0ac]">
            {title}
          </h2>
        ) : null}
        <div className={title || eyebrow ? "mt-3" : ""}>{children}</div>
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
    <header className="border border-[#5d3214]/80 bg-[#070503]/95 p-3 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div>
          <div className="text-[8px] uppercase tracking-[0.42em] text-[#c9782f]/68">{eyebrow}</div>
          <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.28em] text-[#ffe0ac] md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-[#b7a386]">{description}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {metrics ? <div className="grid min-w-[230px] grid-cols-2 gap-2 xl:min-w-[300px]">{metrics}</div> : null}
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
    <div className="border border-[#5d3214]/80 bg-[#0a0705]/90 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.055)]">
      <div className="text-[7px] uppercase tracking-[0.32em] text-[#c9782f]/62">{label}</div>
      <div className="mt-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#ffe0ac]">{value}</div>
      {detail ? <div className="mt-1 text-[8px] uppercase tracking-[0.2em] text-[#8e785c]">{detail}</div> : null}
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
    <div className="flex items-center justify-between border-b border-[#5d3214]/55 pb-1.5 text-[10px]">
      <span className="uppercase tracking-[0.2em] text-[#8e785c]">{label}</span>
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
    amber: "border-[#c9782f]/70 bg-[#281508]/90 text-[#ffd28a]",
    green: "border-emerald-400/45 bg-emerald-950/28 text-emerald-200",
    red: "border-red-400/45 bg-red-950/28 text-red-200",
    blue: "border-cyan-300/45 bg-cyan-950/22 text-cyan-100",
    dim: "border-[#564633]/80 bg-black/35 text-[#8e785c]",
  }[tone];

  return (
    <span className={`inline-flex items-center border px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.2em] ${toneClass}`}>
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
      ? "border-[#c9782f]/70 bg-[#281508]/70 text-[#ffd28a] hover:bg-[#3a1e0c]"
      : "border-[#5d3214]/80 bg-black/30 text-[#b7a386] hover:text-[#ffe0ac]";

  return (
    <Link
      href={href}
      className={`border px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] transition ${toneClass}`}
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
      className={`relative flex items-center justify-center overflow-hidden border border-[#5d3214]/80 bg-[radial-gradient(circle_at_center,rgba(255,147,48,0.07),transparent_34%),linear-gradient(180deg,#060504,#020202)] shadow-[inset_0_0_0_1px_rgba(255,154,58,0.07)] ${
        compact ? "min-h-[190px]" : "min-h-[255px]"
      }`}
    >
      <div className="pointer-events-none absolute inset-6 border border-[#5d3214]/35" />
      <div className="pointer-events-none absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-[#b86d2a]/55 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-7 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-transparent via-[#b86d2a]/45 to-transparent" />
      <div className="pointer-events-none absolute h-24 w-[68%] rounded-[100%] border border-[#b86d2a]/35" />
      <div className="pointer-events-none absolute h-14 w-[48%] rounded-[100%] border border-[#b86d2a]/25" />
      <div className="pointer-events-none absolute h-5 w-5 rounded-full bg-[#ffd79a] blur-sm" />
      <div className="pointer-events-none absolute h-12 w-5 rounded-full bg-[#ff9b3a]/40 blur-xl" />
      <div className={`relative z-10 text-center ${compact ? "mt-24" : "mt-32"}`}>
        <div className="text-[7px] uppercase tracking-[0.5em] text-[#c9782f]/55">Persistent Interface Field</div>
        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.48em] text-[#ffd28a]">{title}</div>
        {subtitle ? <div className="mt-2 font-mono text-[8px] text-[#8e785c]">{subtitle}</div> : null}
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
    <div className="border border-[#5d3214]/55 bg-[#090604] p-2.5">
      <div className="text-[7px] uppercase tracking-[0.26em] text-[#c9782f]/58">Directive {String(index).padStart(2, "0")}</div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">{title}</div>
      <p className="mt-1.5 text-[10px] leading-4 text-[#b7a386]">{detail}</p>
    </div>
  );
}
