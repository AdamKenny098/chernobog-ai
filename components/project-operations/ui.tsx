import type { ReactNode } from "react";

import type {
  ProjectStatus,
  RepoHealth,
  TaskPriority,
} from "@/lib/modules/project-operations";

const machineClip = {
  clipPath:
    "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
};

export const inputClass =
  "w-full border border-[#5d3214]/70 bg-[#030201] px-3 py-2 text-sm text-[#f3d2a0] outline-none transition placeholder:text-[#68472d] focus:border-[#ff9d2e]/75";

export const buttonClass =
  "border border-[#9b5927]/75 bg-[#120904] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b66f] transition hover:border-[#ff9d2e] hover:bg-[#1d0d05] hover:text-[#ffe1b7]";

export const quietButtonClass =
  "border border-[#5d3214]/65 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#98704c] transition hover:border-[#c9782f] hover:text-[#e7ad69]";

export function MachinePanel({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      style={machineClip}
      className={`relative border border-[#6a3918]/75 bg-[#080503]/92 shadow-[inset_0_0_0_1px_rgba(255,166,66,0.05),0_0_28px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/45 to-transparent" />
      {label ? (
        <div className="border-b border-[#6a3918]/55 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#a76d36]">
          {label}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionLabel({
  overline,
  title,
  right,
}: {
  overline: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#8f5b2a]">
          {overline}
        </div>
        <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#f2c27d]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function pillClasses(value: ProjectStatus | RepoHealth | TaskPriority): string {
  if (value === "Active" || value === "Healthy" || value === "Low") {
    return "border-[#6df2a1]/35 bg-[#6df2a1]/8 text-[#bfffd4]";
  }
  if (
    value === "Blocked" ||
    value === "Needs Attention" ||
    value === "Critical"
  ) {
    return "border-[#ff4a3d]/40 bg-[#ff4a3d]/10 text-[#ffb1aa]";
  }
  if (value === "High") {
    return "border-[#ff9d2e]/45 bg-[#ff9d2e]/10 text-[#ffd09a]";
  }
  return "border-[#9b6a3d]/40 bg-[#9b6a3d]/10 text-[#cda77f]";
}

export function StatusPill({
  children,
  value,
}: {
  children?: ReactNode;
  value: ProjectStatus | RepoHealth | TaskPriority;
}) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${pillClasses(value)}`}
    >
      {children ?? value}
    </span>
  );
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeExternalUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}
