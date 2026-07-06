import Link from "next/link";
import type { ReactNode } from "react";
import type {
  RouteMatrixGroup,
  RouteMatrixModel,
  RouteMatrixRoute,
  RouteMatrixSignal,
  RouteMatrixTone,
  RouteMatrixVisibility,
} from "./routeMatrixModel";

const machineClip = {
  clipPath:
    "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
};

const smallClip = {
  clipPath:
    "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
};

function toneClasses(tone: RouteMatrixTone) {
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

function SignalDot({ tone }: { tone: RouteMatrixTone }) {
  const toneClass = toneClasses(tone);

  return <span className={`h-2 w-2 shrink-0 rounded-full ${toneClass.dot}`} />;
}

function MatrixHeader({ model }: { model: RouteMatrixModel }) {
  return (
    <header className="relative border-b border-[#7b431c]/70 bg-[#050302]/95 px-4 py-3">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/50 to-transparent" />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#9a5e2b]">
            Chernobog // Route Matrix
          </div>
          <h1 className="mt-1 text-xl font-semibold uppercase tracking-[0.24em] text-[#ffd09a]">
            System Map
          </h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 xl:w-[620px]">
          <HeaderLink href="/command-center" label="Command Center" signal="HOME" />
          <HeaderLink href="/command" label="Command Console" signal="LIVE" />
          <HeaderLink href="/modules" label="Subsystems" signal="MAP" />
          <HeaderLink href="/vault" label="Vault" signal="MEM" />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <StatCell label="Routes" value={model.counts.total} />
        <StatCell label="Visible" value={model.counts.filtered} />
        <StatCell label="Open" value={model.counts.openable} />
        <StatCell label="Sealed" value={model.counts.sealed} />
        <StatCell label="Primary" value={model.counts.primary} />
        <StatCell label="API" value={model.counts.api} />
        <StatCell label="Active" value={model.counts.active} />
        <StatCell label="Experimental" value={model.counts.experimental} />
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  label,
  signal,
}: {
  href: string;
  label: string;
  signal: string;
}) {
  return (
    <Link
      href={href}
      style={smallClip}
      className="border border-[#7b431c]/65 bg-[#0b0502] px-3 py-2 transition hover:border-[#ffb45a]/80 hover:bg-[#120803]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f3d2a0]">
          {label}
        </span>
        <span className="text-[9px] uppercase tracking-[0.22em] text-[#bfffd4]">
          {signal}
        </span>
      </div>
    </Link>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#7b431c]/45 bg-black/25 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.24em] text-[#8f5b2a]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[#ffd09a]">{value}</div>
    </div>
  );
}

function RouteFilterForm({ model }: { model: RouteMatrixModel }) {
  return (
    <MachinePanel label="Filter Console" className="p-3">
      <form className="space-y-3">
        <div>
          <label
            htmlFor="route-search"
            className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8f5b2a]"
          >
            Search Signal
          </label>
          <input
            id="route-search"
            name="q"
            defaultValue={model.query.q}
            placeholder="route, module, command, path..."
            className="mt-2 w-full border border-[#7b431c]/65 bg-[#050302] px-3 py-2 text-xs text-[#ffd09a] outline-none placeholder:text-[#6f5235] focus:border-[#ffb45a]/80"
          />
        </div>

        <SelectField
          label="Kind"
          name="kind"
          value={model.query.kind}
          options={["all", ...model.kinds]}
        />

        <SelectField
          label="Status"
          name="status"
          value={model.query.status}
          options={["all", ...model.statuses]}
        />

        <SelectField
          label="Visibility"
          name="visibility"
          value={model.query.visibility}
          options={model.visibilityOptions}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="border border-[#ff9d2e]/50 bg-[#ff9d2e]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffd09a] transition hover:border-[#ffb45a]/80 hover:bg-[#ff9d2e]/18"
          >
            Scan
          </button>
          <Link
            href="/routes"
            className="border border-[#7b431c]/65 bg-[#0b0502] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7a66c] transition hover:border-[#ffb45a]/80"
          >
            Reset
          </Link>
        </div>
      </form>
    </MachinePanel>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <div>
      <label
        htmlFor={`route-${name}`}
        className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8f5b2a]"
      >
        {label}
      </label>
      <select
        id={`route-${name}`}
        name={name}
        defaultValue={value}
        className="mt-2 w-full border border-[#7b431c]/65 bg-[#050302] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ffd09a] outline-none focus:border-[#ffb45a]/80"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SignalRail({ signals }: { signals: RouteMatrixSignal[] }) {
  return (
    <MachinePanel label="Matrix Telemetry" className="p-3">
      <SectionLabel overline="state" title="route signals" />

      <div className="space-y-2">
        {signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>
    </MachinePanel>
  );
}

function SignalRow({ signal }: { signal: RouteMatrixSignal }) {
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

function RouteMatrixGroups({ groups }: { groups: RouteMatrixGroup[] }) {
  if (groups.length === 0) {
    return (
      <MachinePanel label="Route Matrix" className="p-4">
        <div className="border border-[#7b431c]/55 bg-black/25 p-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.32em] text-[#8f5b2a]">
            No Signal
          </div>
          <div className="mt-2 text-sm uppercase tracking-[0.2em] text-[#ffd09a]">
            No routes match the active filter.
          </div>
        </div>
      </MachinePanel>
    );
  }

  return (
    <MachinePanel label="Route Matrix" className="p-4">
      <SectionLabel
        overline="registry"
        title="grouped system map"
        right={
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8f5b2a]">
            {groups.length} groups
          </span>
        }
      />

      <div className="space-y-4">
        {groups.map((group) => (
          <RouteGroup key={group.kind} group={group} />
        ))}
      </div>
    </MachinePanel>
  );
}

function RouteGroup({ group }: { group: RouteMatrixGroup }) {
  const toneClass = toneClasses(group.tone);

  return (
    <section className="border border-[#7b431c]/55 bg-black/20">
      <div className="flex flex-col gap-2 border-b border-[#7b431c]/45 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SignalDot tone={group.tone} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">
              {group.label}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[#8f5b2a]">
              {group.kind}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GroupChip label="Total" value={group.total} toneClass={toneClass.text} />
          <GroupChip label="Open" value={group.openable} toneClass="text-[#bfffd4]" />
          <GroupChip label="Sealed" value={group.sealed} toneClass="text-[#ffd7a1]" />
          <GroupChip label="Active" value={group.active} toneClass="text-[#bfffd4]" />
        </div>
      </div>

      <div className="divide-y divide-[#7b431c]/35">
        {group.routes.map((route) => (
          <RouteRow key={route.id} route={route} />
        ))}
      </div>
    </section>
  );
}

function GroupChip({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: number;
  toneClass: string;
}) {
  return (
    <div className="border border-[#7b431c]/45 bg-black/25 px-2 py-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f5b2a]">
        {label}
      </span>
      <span className={`ml-2 text-[10px] font-semibold ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function RouteRow({ route }: { route: RouteMatrixRoute }) {
  const toneClass = toneClasses(route.tone);

  const content = (
    <div className="grid gap-3 px-3 py-3 transition hover:bg-[#160903]/60 xl:grid-cols-[minmax(0,1fr)_150px_135px_115px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <SignalDot tone={route.tone} />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">
            {route.label}
          </span>
          {route.isPrimaryNavigation ? (
            <span className="border border-[#ff9d2e]/35 bg-[#ff9d2e]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#ffd7a1]">
              primary
            </span>
          ) : null}
        </div>

        <div className="mt-1 truncate text-[11px] text-[#b58b61]">
          {route.description}
        </div>

        <div className="mt-1 truncate font-mono text-[10px] text-[#765437]">
          {route.path}
        </div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#8f5b2a]">
          Module
        </div>
        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-[#d7a66c]">
          {route.moduleId}
        </div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#8f5b2a]">
          Status
        </div>
        <div
          className={`mt-1 inline-flex border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${toneClass.border} ${toneClass.bg} ${toneClass.text}`}
        >
          {route.status}
        </div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#8f5b2a]">
          Access
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd7a1]">
          {route.sealReason}
        </div>
      </div>
    </div>
  );

  if (!route.isOpenable) return content;

  return (
    <Link href={route.path} className="block">
      {content}
    </Link>
  );
}

function MatrixNotes() {
  return (
    <MachinePanel label="Matrix Rules" className="p-3">
      <div className="space-y-3 text-[11px] leading-relaxed text-[#b58b61]">
        <p>
          Route Matrix is a read-only system map. It exposes navigation state,
          openable surfaces, sealed dynamic routes, and internal APIs without
          mutating registry data.
        </p>

        <div className="border-t border-[#7b431c]/40 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f5b2a]">
            Seal Rules
          </div>
          <div className="mt-2 space-y-1 text-[10px] uppercase tracking-[0.16em] text-[#d7a66c]">
            <div>API routes are internal.</div>
            <div>Dynamic routes are sealed.</div>
            <div>Non-user-facing routes are hidden from launch.</div>
          </div>
        </div>
      </div>
    </MachinePanel>
  );
}

export function RouteMatrixView({ model }: { model: RouteMatrixModel }) {
  return (
    <main className="min-h-screen overflow-x-auto bg-[#020201] p-3 text-[#f3d2a0]">
      <div
        style={machineClip}
        className="relative mx-auto max-w-[1420px] overflow-hidden border border-[#7b431c]/80 bg-[#030201] shadow-[0_0_90px_rgba(0,0,0,0.72),inset_0_0_0_1px_rgba(255,157,46,0.08)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(255,116,22,0.11),transparent_42%),linear-gradient(rgba(255,157,46,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,157,46,0.025)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
        <div className="pointer-events-none absolute left-[24%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#ff9d2e]/22 to-transparent" />
        <div className="pointer-events-none absolute right-[22%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#ff9d2e]/16 to-transparent" />

        <div className="relative">
          <MatrixHeader model={model} />

          <div className="grid gap-4 p-4 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <RouteFilterForm model={model} />
              <SignalRail signals={model.signals} />
            </div>

            <RouteMatrixGroups groups={model.groups} />

            <MatrixNotes />
          </div>
        </div>
      </div>
    </main>
  );
}
