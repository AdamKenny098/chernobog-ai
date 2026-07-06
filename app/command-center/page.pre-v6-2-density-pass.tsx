import Link from "next/link";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import {
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@/lib/chernobog-ui/routeRegistry";
import {
  ClassicBadge,
  ClassicButtonLink,
  ClassicDirective,
  ClassicFrame,
  ClassicHeader,
  ClassicLayout,
  ClassicMainStack,
  ClassicMiniStat,
  ClassicPanel,
  ClassicRail,
  ClassicSignal,
  ClassicStat,
} from "@/components/chernobog-ui/ChernobogClassic";

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
  {
    label: "Command Core",
    status: "Selected",
    detail: "Primary operating surface and route control.",
  },
  {
    label: "Route Registry",
    status: "Online",
    detail: "Navigation source of truth active.",
  },
  {
    label: "Vault Memory",
    status: "Available",
    detail: "Vault lanes registered, deeper memory wiring pending.",
  },
  {
    label: "Review Layer",
    status: "Protected",
    detail: "Vault PR review routes preserved.",
  },
  {
    label: "Command Console",
    status: "Preserved",
    detail: "Legacy console remains isolated under /command.",
  },
];

const directives = [
  {
    title: "Preserve Console",
    detail: "Do not rewrite command execution or session handling from the dashboard layer.",
  },
  {
    title: "Route Through Registry",
    detail: "All operator navigation should be surfaced from typed route metadata.",
  },
  {
    title: "Keep Reviews Sealed",
    detail: "Dynamic review routes are tracked but not opened without a concrete id.",
  },
  {
    title: "No Fake Live Data",
    detail: "Unwired systems stay marked as placeholder, unknown, or pending.",
  },
];

type RegistryRoute = ReturnType<typeof getAllChernobogRoutes>[number];

function routeIsOpenable(route: RegistryRoute): boolean {
  return (
    route.path.startsWith("/") &&
    !route.path.startsWith("/api") &&
    !route.path.includes("[") &&
    route.status !== "hidden" &&
    route.status !== "deprecated" &&
    route.status !== "unknown"
  );
}

function routeTone(route: RegistryRoute): "amber" | "green" | "red" | "blue" | "dim" {
  if (route.status === "active") return "green";
  if (route.status === "experimental") return "amber";
  if (route.status === "deprecated") return "red";
  if (route.kind === "review") return "blue";
  return "dim";
}

function PrimaryRouteCard({ route, index }: { route: RegistryRoute; index: number }) {
  const openable = routeIsOpenable(route);

  return (
    <article className="relative grid min-h-[190px] grid-rows-[auto_1fr_auto] overflow-hidden border border-[#6f3d18]/70 bg-[#090705]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.07)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9782f]/45 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] uppercase tracking-[0.3em] text-[#c9782f]/55">
            Nav Node {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
            {route.label}
          </h3>
          <div className="mt-1 font-mono text-[11px] text-[#c9782f]/80">{route.path}</div>
        </div>
        <ClassicBadge tone={routeTone(route)}>{route.status}</ClassicBadge>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#b7a386]">{route.description}</p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#6f3d18]/45 pt-3">
        <div className="text-[9px] uppercase tracking-[0.24em] text-[#8e785c]">
          {route.kind}{route.moduleId ? ` / ${route.moduleId}` : ""}
        </div>
        {openable ? (
          <Link
            href={route.path}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffd28a] underline decoration-[#c9782f]/50 underline-offset-4 hover:text-white"
          >
            Open
          </Link>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8e785c]">Sealed</span>
        )}
      </div>
    </article>
  );
}

function DepartmentGrid() {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {departments.map((department, index) => (
        <div key={department} className="border border-[#6f3d18]/55 bg-[#0a0705]/90 p-3">
          <div className="text-[8px] uppercase tracking-[0.28em] text-[#8e785c]">
            Dept {String(index + 1).padStart(2, "0")}
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
  const experimentalRoutes = allRoutes.filter((route) => route.status === "experimental");
  const reviewRoutes = allRoutes.filter(
    (route) => route.kind === "review" || route.path.startsWith("/review"),
  );
  const apiRoutes = allRoutes.filter(
    (route) => route.kind === "api" || route.path.startsWith("/api"),
  );

  return (
    <ChernobogShell currentArea="Command Center">
      <ClassicFrame>
        <div className="grid gap-4">
          <ClassicHeader
            eyebrow="God Program Interface / Structured Override"
            title="Chernobog // Command Center"
            description="A structured operational home screen: left subsystem rail, central signal and navigation bus, right telemetry rail, and lower work/departments grid. The theme stays classic Chernobog, but the layout is now predictable."
            actions={
              <>
                <ClassicButtonLink href="/command" tone="amber">Command Console</ClassicButtonLink>
                <ClassicButtonLink href="/routes" tone="amber">Route Matrix</ClassicButtonLink>
                <ClassicButtonLink href="/modules" tone="dim">Modules</ClassicButtonLink>
                <ClassicButtonLink href="/vault" tone="dim">Vault</ClassicButtonLink>
              </>
            }
            metrics={
              <>
                <ClassicStat label="Routes" value={allRoutes.length} detail="registered" />
                <ClassicStat label="Primary" value={primaryRoutes.length} detail="operator nav" />
                <ClassicStat label="Reviews" value={reviewRoutes.length} detail="tracked" />
                <ClassicStat label="APIs" value={apiRoutes.length} detail="sealed" />
              </>
            }
          />

          <ClassicLayout>
            <ClassicRail>
              <ClassicPanel eyebrow="Left Rail" title="Subsystem Stack" className="2xl:min-h-[620px]">
                <div className="grid gap-3">
                  {subsystemStack.map((subsystem, index) => (
                    <div key={subsystem.label} className="border border-[#6f3d18]/55 bg-[#090604] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] text-[#c9782f]/55">
                            Subsystem {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
                            {subsystem.label}
                          </div>
                        </div>
                        <ClassicBadge tone="amber">{subsystem.status}</ClassicBadge>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-[#8e785c]">{subsystem.detail}</p>
                    </div>
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Status" title="Core Array" compact>
                <div className="grid gap-2">
                  <ClassicMiniStat label="Version" value="V6.2" />
                  <ClassicMiniStat label="Console" value="Preserved" />
                  <ClassicMiniStat label="Registry" value="Online" />
                  <ClassicMiniStat label="Reviews" value="Protected" />
                </div>
              </ClassicPanel>
            </ClassicRail>

            <ClassicMainStack>
              <ClassicSignal
                title="Chernobog Signal State"
                subtitle="/command-center :: structured command matrix"
              />

              <ClassicPanel eyebrow="Center Grid" title="Primary Route Shortcuts">
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {primaryRoutes.map((route, index) => (
                    <PrimaryRouteCard key={route.id} route={route} index={index} />
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Lower Grid" title="Open Work">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <ClassicStat label="Open Reviews" value="Placeholder" detail="review queue not wired" />
                  <ClassicStat label="Memory Candidates" value="Placeholder" detail="memory model pending" />
                  <ClassicStat label="Active Project" value="Chernobog" detail="current operating context" />
                  <ClassicStat label="Recommended Next Action" value="Layout Cleanup" detail="structure before more data" />
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Chernobog Inc" title="Department Control Layer">
                <DepartmentGrid />
              </ClassicPanel>
            </ClassicMainStack>

            <ClassicRail>
              <ClassicPanel eyebrow="Right Rail" title="Telemetry Stack" className="2xl:min-h-[260px]">
                <div className="grid gap-3">
                  <ClassicMiniStat label="Active Routes" value={activeRoutes.length} />
                  <ClassicMiniStat label="Experimental" value={experimentalRoutes.length} />
                  <ClassicMiniStat label="Review Routes" value={reviewRoutes.length} />
                  <ClassicMiniStat label="API Routes" value={apiRoutes.length} />
                  <ClassicMiniStat label="Command Router" value="Preserved" />
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Mission" title="Directive Stack">
                <div className="grid gap-2">
                  {directives.map((directive, index) => (
                    <ClassicDirective
                      key={directive.title}
                      index={index + 1}
                      title={directive.title}
                      detail={directive.detail}
                    />
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Direct Access" title="Control Links">
                <div className="grid gap-2">
                  <ClassicButtonLink href="/command" tone="amber">Command Console</ClassicButtonLink>
                  <ClassicButtonLink href="/routes" tone="amber">Route Directory</ClassicButtonLink>
                  <ClassicButtonLink href="/modules" tone="dim">Module Directory</ClassicButtonLink>
                  <ClassicButtonLink href="/vault" tone="dim">Vault</ClassicButtonLink>
                </div>
              </ClassicPanel>
            </ClassicRail>
          </ClassicLayout>
        </div>
      </ClassicFrame>
    </ChernobogShell>
  );
}
