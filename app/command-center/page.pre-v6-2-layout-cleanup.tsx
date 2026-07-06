import Link from "next/link";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import {
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@/lib/chernobog-ui/routeRegistry";
import {
  ClassicBadge,
  ClassicFrame,
  ClassicPanel,
  ClassicSignal,
  ClassicStat,
} from "@/components/chernobog-ui/ChernobogClassic";

type RegistryRoute = ReturnType<typeof getAllChernobogRoutes>[number];

const departments = [
  "Executive Office",
  "Coding Department",
  "Design Department",
  "Vault / Archivist Department",
  "QA Department",
  "Security Department",
  "Operations Department",
  "Narrative Department",
];

const subsystemStack = [
  { label: "Override Protocol", status: "Active", detail: "Command center interface restored" },
  { label: "Optic Core", status: "Online", detail: "Route registry visual lock" },
  { label: "Combat Frame", status: "Standby", detail: "Command router preserved" },
  { label: "Signal Relay", status: "Stable", detail: "Dashboard links available" },
  { label: "Memory Engine", status: "Available", detail: "Vault route registered" },
  { label: "Guardian Node", status: "Passive", detail: "Review routes untouched" },
];

const directiveFeed = [
  "Preserve old command console under /command.",
  "Route all operator navigation through registry-backed surfaces.",
  "Keep review routes sealed unless a concrete review id exists.",
  "Do not invent live data. Mark unwired systems as placeholder.",
];

const openWork = [
  {
    label: "Open Reviews",
    value: "Placeholder",
    detail: "awaiting review queue wiring",
  },
  {
    label: "Memory Candidates",
    value: "Placeholder",
    detail: "awaiting vault memory model",
  },
  {
    label: "Active Project",
    value: "Chernobog",
    detail: "current operating context",
  },
  {
    label: "Recommended Next Action",
    value: "Theme restoration",
    detail: "restore classic command interface language",
  },
];

function routeIsOpenable(route: RegistryRoute): boolean {
  return (
    route.path.startsWith("/") &&
    !route.path.startsWith("/api") &&
    !route.path.includes("[") &&
    route.status !== "hidden"
  );
}

function routeTone(route: RegistryRoute): "amber" | "green" | "red" | "blue" | "dim" {
  if (route.status === "active") return "green";
  if (route.status === "experimental") return "amber";
  if (route.status === "deprecated") return "red";
  if (route.kind === "review") return "blue";
  return "dim";
}

function PrimaryRouteCard({ route }: { route: RegistryRoute }) {
  const openable = routeIsOpenable(route);

  return (
    <article className="relative overflow-hidden border border-[#6f3d18]/70 bg-[#090705]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.07)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9782f]/45 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">
            {route.label}
          </h3>
          <div className="mt-1 font-mono text-[11px] text-[#c9782f]/80">
            {route.path}
          </div>
        </div>
        <ClassicBadge tone={routeTone(route)}>{route.status}</ClassicBadge>
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 text-[#b7a386]">
        {route.description}
      </p>

      <div className="mt-4 border-t border-[#6f3d18]/45 pt-3">
        <div className="text-[9px] uppercase tracking-[0.28em] text-[#8e785c]">
          Kind: {route.kind} {route.moduleId ? `Module: ${route.moduleId}` : ""}
        </div>
        {route.commands && route.commands.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {route.commands.map((command) => (
              <code
                key={command}
                className="border border-[#6f3d18]/60 bg-[#120b06] px-2 py-1 font-mono text-[11px] text-[#ffd28a]"
              >
                {command}
              </code>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {openable ? (
          <Link
            href={route.path}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffd28a] underline decoration-[#c9782f]/50 underline-offset-4 hover:text-white"
          >
            Open
          </Link>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8e785c]">
            Sealed
          </span>
        )}
      </div>
    </article>
  );
}

function DepartmentGrid() {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {departments.map((department) => (
        <div
          key={department}
          className="border border-[#6f3d18]/55 bg-[#0a0705]/90 p-3"
        >
          <div className="text-[9px] uppercase tracking-[0.28em] text-[#8e785c]">
            Department Node
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
            {department}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommandCenterPage() {
  const allRoutes = getAllChernobogRoutes();
  const primaryRoutes = getPrimaryNavigationRoutes();
  const activeRoutes = allRoutes.filter((route) => route.status === "active");
  const experimentalRoutes = allRoutes.filter(
    (route) => route.status === "experimental",
  );
  const reviewRoutes = allRoutes.filter(
    (route) => route.kind === "review" || route.path.startsWith("/review"),
  );
  const apiRoutes = allRoutes.filter(
    (route) => route.kind === "api" || route.path.startsWith("/api"),
  );

  return (
    <ChernobogShell currentArea="Command Center">
      <ClassicFrame>
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <aside className="hidden xl:block">
            <ClassicPanel eyebrow="Subsystems" title="Subroutine Stack" className="min-h-full">
              <div className="grid gap-3">
                {subsystemStack.map((subsystem) => (
                  <div
                    key={subsystem.label}
                    className="border border-[#6f3d18]/55 bg-[#090604] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
                        {subsystem.label}
                      </div>
                      <ClassicBadge tone="amber">{subsystem.status}</ClassicBadge>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#8e785c]">
                      {subsystem.detail}
                    </p>
                  </div>
                ))}
              </div>
            </ClassicPanel>
          </aside>

          <main className="grid gap-4">
            <header className="border border-[#6f3d18]/70 bg-[#080604]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] uppercase tracking-[0.42em] text-[#c9782f]/70">
                      God Program Interface
                    </span>
                    <ClassicBadge tone="green">V6.2 Theme Restore</ClassicBadge>
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.26em] text-[#ffe0ac] md:text-4xl">
                    Chernobog // Override
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b7a386]">
                    Command Center restored to the classic Chernobog operational surface: amber telemetry, sealed panels, route control, vault memory, review visibility, and subsystem state.
                  </p>
                </div>
                <div className="grid min-w-[260px] grid-cols-2 gap-2">
                  <ClassicStat label="Routes" value={allRoutes.length} detail="registered" />
                  <ClassicStat label="Primary" value={primaryRoutes.length} detail="operator nav" />
                  <ClassicStat label="Reviews" value={reviewRoutes.length} detail="tracked" />
                  <ClassicStat label="APIs" value={apiRoutes.length} detail="sealed" />
                </div>
              </div>
            </header>

            <ClassicSignal subtitle="/command-center :: /routes :: /modules :: /command" />

            <ClassicPanel eyebrow="System Status" title="Core Status Array">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ClassicStat label="Chernobog Version" value="V6.2" detail="classic interface" />
                <ClassicStat label="Vault Memory" value="Available" detail="registry listed" />
                <ClassicStat label="Chernobog Inc" value="Online" detail="department layer" />
                <ClassicStat label="Command Router" value="Preserved" detail="console untouched" />
                <ClassicStat label="Route Registry" value="Online" detail={`${activeRoutes.length} active`} />
                <ClassicStat label="Experimental" value={experimentalRoutes.length} detail="visible lanes" />
                <ClassicStat label="Review Routes" value={reviewRoutes.length} detail="protected" />
                <ClassicStat label="API Routes" value={apiRoutes.length} detail="not navigation" />
              </div>
            </ClassicPanel>

            <ClassicPanel eyebrow="Primary Route Shortcuts" title="Operator Navigation Bus">
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {primaryRoutes.map((route) => (
                  <PrimaryRouteCard key={route.id} route={route} />
                ))}
              </div>
            </ClassicPanel>

            <ClassicPanel eyebrow="Open Work" title="Directive Feed">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {openWork.map((item) => (
                  <ClassicStat
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                  />
                ))}
              </div>
            </ClassicPanel>

            <ClassicPanel eyebrow="Chernobog Inc" title="Department Control Layer">
              <DepartmentGrid />
            </ClassicPanel>
          </main>

          <aside className="grid gap-4">
            <ClassicPanel eyebrow="Status" title="Telemetry">
              <div className="grid gap-3">
                {[
                  { label: "Route Registry", value: "Online" },
                  { label: "Command Center", value: "Selected" },
                  { label: "Command Console", value: "Preserved" },
                  { label: "Vault PR Review", value: "Protected" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-[#6f3d18]/45 pb-2 text-xs"
                  >
                    <span className="uppercase tracking-[0.22em] text-[#8e785c]">
                      {item.label}
                    </span>
                    <span className="font-mono uppercase text-[#ffd28a]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </ClassicPanel>

            <ClassicPanel eyebrow="Active Directives" title="Mission Stack">
              <div className="grid gap-2">
                {directiveFeed.map((directive, index) => (
                  <div
                    key={directive}
                    className="border border-[#6f3d18]/45 bg-[#090604] p-3"
                  >
                    <div className="text-[9px] uppercase tracking-[0.28em] text-[#c9782f]/60">
                      Directive {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#b7a386]">
                      {directive}
                    </p>
                  </div>
                ))}
              </div>
            </ClassicPanel>

            <ClassicPanel eyebrow="Direct Access" title="Control Links">
              <div className="grid gap-2">
                {[
                  { href: "/command", label: "Command Console" },
                  { href: "/routes", label: "Route Directory" },
                  { href: "/modules", label: "Module Directory" },
                  { href: "/vault", label: "Vault" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="border border-[#6f3d18]/55 bg-[#090604] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd28a] transition hover:border-[#c9782f] hover:bg-[#160d07]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </ClassicPanel>
          </aside>
        </div>
      </ClassicFrame>
    </ChernobogShell>
  );
}
