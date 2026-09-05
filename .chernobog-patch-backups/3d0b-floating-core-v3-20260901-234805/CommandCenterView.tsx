import { RecursiveCommandHierarchy } from "./RecursiveCommandHierarchy";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  CommandCenterLink,
  CommandCenterModel,
  CommandCenterModuleCard,
  CommandCenterTelemetrySignal,
  CommandCenterTone,
} from "./commandCenterModel";

const machineClip = {
  clipPath:
    "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
};

const smallClip = {
  clipPath:
    "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
};

function toneClasses(tone: CommandCenterTone) {
  switch (tone) {
    case "green":
      return {
        dot: "bg-[#6df2a1] shadow-[0_0_14px_rgba(109,242,161,0.45)]",
        text: "text-[#bfffd4]",
        border: "border-[#6df2a1]/35",
        bg: "bg-[#6df2a1]/8",
      };
    case "red":
      return {
        dot: "bg-[#ff4a3d] shadow-[0_0_14px_rgba(255,74,61,0.45)]",
        text: "text-[#ffb1aa]",
        border: "border-[#ff4a3d]/35",
        bg: "bg-[#ff4a3d]/8",
      };
    case "muted":
      return {
        dot: "bg-[#8f775b]",
        text: "text-[#a99172]",
        border: "border-[#8f775b]/25",
        bg: "bg-[#8f775b]/8",
      };
    case "amber":
    default:
      return {
        dot: "bg-[#ff9d2e] shadow-[0_0_14px_rgba(255,157,46,0.45)]",
        text: "text-[#ffd7a1]",
        border: "border-[#ff9d2e]/35",
        bg: "bg-[#ff9d2e]/8",
      };
  }
}

function MachinePanel({
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
      className={[
        "relative border border-[#7b431c]/75 bg-[#080503]/92",
        "shadow-[inset_0_0_0_1px_rgba(255,166,66,0.06),0_0_34px_rgba(0,0,0,0.45)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/55 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#ff9d2e]/35 to-transparent" />
      {label ? (
        <div className="border-b border-[#7b431c]/55 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a76d36]">
          {label}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SectionLabel({
  overline,
  title,
  right,
}: {
  overline: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#8f5b2a]">
          {overline}
        </div>
        <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#f2c27d]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function SignalDot({ tone }: { tone: CommandCenterTone }) {
  const toneClass = toneClasses(tone);

  return <span className={`h-2 w-2 shrink-0 rounded-full ${toneClass.dot}`} />;
}

function MachineLink({
  link,
  compact = false,
}: {
  link: CommandCenterLink;
  compact?: boolean;
}) {
  const toneClass = toneClasses(link.tone);

  const content = (
    <div
      style={smallClip}
      className={[
        "group relative border px-3 py-2 transition",
        toneClass.border,
        toneClass.bg,
        link.isOpenable
          ? "hover:border-[#ffb45a]/80 hover:bg-[#ff9d2e]/12"
          : "opacity-55",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <SignalDot tone={link.tone} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3d2a0]">
            {link.label}
          </span>
        </span>
        <span
          className={`text-[9px] uppercase tracking-[0.22em] ${toneClass.text}`}
        >
          {link.signal}
        </span>
      </div>

      {!compact ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="truncate text-[10px] uppercase tracking-[0.2em] text-[#8f6a45]">
            {link.meta}
          </span>
          <span className="truncate text-[10px] text-[#6f5235]">
            {link.path}
          </span>
        </div>
      ) : null}
    </div>
  );

  if (!link.isOpenable) return content;

  return (
    <Link href={link.path} className="block">
      {content}
    </Link>
  );
}

function CommandHeader({ model }: { model: CommandCenterModel }) {
  return (
    <header className="relative border-b border-[#7b431c]/70 bg-[#050302]/95 px-4 py-3">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/50 to-transparent" />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#9a5e2b]">
            Chernobog // Override
          </div>
          <h1 className="mt-1 text-xl font-semibold uppercase tracking-[0.24em] text-[#ffd09a]">
            Command Center
          </h1>
        </div>

        <nav className="grid gap-2 sm:grid-cols-4 xl:w-[560px]">
          {model.headerLinks.map((link) => (
            <MachineLink key={link.id} link={link} compact />
          ))}
        </nav>
      </div>
    </header>
  );
}

function SubsystemRail({ links }: { links: CommandCenterLink[] }) {
  return (
    <MachinePanel label="Subsystem Rail" className="p-3">
      <SectionLabel overline="launch" title="primary surfaces" />
      <div className="space-y-2">
        {links.map((link) => (
          <MachineLink key={link.id} link={link} />
        ))}
      </div>
    </MachinePanel>
  );
}

function ModuleCard({ module }: { module: CommandCenterModuleCard }) {
  const toneClass = toneClasses(module.tone);

  const content = (
    <article
      style={smallClip}
      className={[
        "group relative min-h-[138px] border bg-[#070402]/90 p-3 transition",
        toneClass.border,
        module.isOpenable
          ? "hover:border-[#ffb45a]/80 hover:bg-[#120803]"
          : "opacity-60",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SignalDot tone={module.tone} />
            <h3 className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">
              {module.label}
            </h3>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#8f6a45]">
            {module.category}
          </div>
        </div>

        <span
          className={`text-[9px] uppercase tracking-[0.22em] ${toneClass.text}`}
        >
          {module.status}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#b58b61]">
        {module.description}
      </p>

      <div className="mt-3 border-t border-[#7b431c]/40 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[10px] uppercase tracking-[0.2em] text-[#8f5b2a]">
            {module.ownerDepartment}
          </span>
          <span className="truncate text-[10px] text-[#6f5235]">
            {module.routeLabel}
          </span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#d29a5b]">
          {module.command}
        </div>
      </div>
    </article>
  );

  if (!module.isOpenable) return content;

  return (
    <Link href={module.path} className="block">
      {content}
    </Link>
  );
}

function ModuleMatrix({ modules }: { modules: CommandCenterModuleCard[] }) {
  return (
    <MachinePanel label="Subsystem Matrix" className="p-4">
      <SectionLabel
        overline="operational"
        title="subsystem launch"
        right={
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            {modules.length} linked
          </span>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </MachinePanel>
  );
}

function TelemetryRow({ signal }: { signal: CommandCenterTelemetrySignal }) {
  const toneClass = toneClasses(signal.tone);

  return (
    <div
      className={[
        "border bg-black/25 px-3 py-2",
        toneClass.border,
        toneClass.bg,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <SignalDot tone={signal.tone} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d7a66c]">
            {signal.label}
          </span>
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${toneClass.text}`}
        >
          {signal.value}
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#745338]">
        {signal.meta}
      </div>
    </div>
  );
}

function TelemetryRail({
  signals,
  counts,
}: {
  signals: CommandCenterTelemetrySignal[];
  counts: CommandCenterModel["counts"];
}) {
  return (
    <MachinePanel label="Telemetry Rail" className="p-3">
      <SectionLabel overline="state" title="control signals" />

      <div className="space-y-2">
        {signals.map((signal) => (
          <TelemetryRow key={signal.id} signal={signal} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="border border-[#7b431c]/45 bg-black/25 p-3">
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            Routes
          </div>
          <div className="mt-1 text-lg font-semibold text-[#ffd09a]">
            {counts.routes}
          </div>
        </div>

        <div className="border border-[#7b431c]/45 bg-black/25 p-3">
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            Modules
          </div>
          <div className="mt-1 text-lg font-semibold text-[#ffd09a]">
            {counts.modules}
          </div>
        </div>

        <div className="border border-[#7b431c]/45 bg-black/25 p-3">
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            Review
          </div>
          <div className="mt-1 text-lg font-semibold text-[#ffd09a]">
            {counts.reviewRoutes}
          </div>
        </div>

        <div className="border border-[#7b431c]/45 bg-black/25 p-3">
          <div className="text-[9px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            Vault
          </div>
          <div className="mt-1 text-lg font-semibold text-[#ffd09a]">
            {counts.vaultRoutes}
          </div>
        </div>
      </div>
    </MachinePanel>
  );
}

export function CommandCenterView({ model }: { model: CommandCenterModel }) {
  return (
    <main className="min-h-screen overflow-x-auto bg-[#020201] p-3 text-[#f3d2a0]">
      <div
        style={machineClip}
        className="relative mx-auto max-w-[1420px] overflow-hidden border border-[#7b431c]/80 bg-[#030201] shadow-[0_0_90px_rgba(0,0,0,0.72),inset_0_0_0_1px_rgba(255,157,46,0.08)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,116,22,0.13),transparent_42%),linear-gradient(rgba(255,157,46,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,157,46,0.025)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
        <div className="pointer-events-none absolute left-[22%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#ff9d2e]/25 to-transparent" />
        <div className="pointer-events-none absolute right-[26%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#ff9d2e]/18 to-transparent" />

        <div className="relative">
          <CommandHeader model={model} />

          <div className="grid gap-4 p-4 xl:grid-cols-[295px_minmax(0,1fr)_365px]">
            <SubsystemRail links={model.subsystemLinks} />

            <div className="space-y-4">
              <RecursiveCommandHierarchy />

              <ModuleMatrix modules={model.moduleCards} />
            </div>

            <TelemetryRail
              signals={model.telemetrySignals}
              counts={model.counts}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

