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
  ["Operation", "Selected", "Primary command surface and route control."],
  ["Route Registry", "Online", "Navigation source of truth active."],
  ["Vault Memory", "Available", "Vault lanes registered; deeper memory wiring pending."],
  ["Review Layer", "Protected", "Vault PR review routes preserved."],
  ["Command Console", "Preserved", "Legacy console isolated under /command."],
];

const directives = [
  ["Preserve Console", "Do not rewrite command execution or session handling from the dashboard layer."],
  ["Route Through Registry", "All operator navigation should come from typed route metadata."],
  ["Keep Reviews Sealed", "Dynamic review routes are tracked but require a concrete id before opening."],
  ["No Fake Live Data", "Unwired systems stay placeholder, unknown, or pending."],
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
    <article className="relative grid min-h-[118px] grid-rows-[auto_1fr_auto] overflow-hidden border border-[#5d3214]/75 bg-[#080604]/95 p-2.5 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b86d2a]/45 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[7px] uppercase tracking-[0.26em] text-[#c9782f]/55">
            Nav {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
            {route.label}
          </h3>
          <div className="mt-1 font-mono text-[9px] text-[#c9782f]/78">{route.path}</div>
        </div>
        <ClassicBadge tone={routeTone(route)}>{route.status}</ClassicBadge>
      </div>

      <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#b7a386]">{route.description}</p>

      <div className="mt-2 flex items-end justify-between gap-2 border-t border-[#5d3214]/45 pt-2">
        <div className="truncate text-[8px] uppercase tracking-[0.22em] text-[#8e785c]">
          {route.kind}{route.moduleId ? ` / ${route.moduleId}` : ""}
        </div>
        {openable ? (
          <Link
            href={route.path}
            className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffd28a] underline decoration-[#c9782f]/50 underline-offset-4 hover:text-white"
          >
            Open
          </Link>
        ) : (
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8e785c]">Sealed</span>
        )}
      </div>
    </article>
  );
}

function DepartmentGrid() {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {departments.map((department, index) => (
        <div key={department} className="border border-[#5d3214]/60 bg-[#090604] p-2.5">
          <div className="text-[7px] uppercase tracking-[0.24em] text-[#8e785c]">
            Dept {String(index + 1).padStart(2, "0")}
          </div>
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">
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
        <div className="grid gap-3">
          <ClassicHeader
            eyebrow="God Program Interface / Structured Override"
            title="Chernobog // Override"
            description="Command Center density pass: compact rails, central signal state, predictable telemetry, and no random floating dashboard blocks. Subroutine Stack / Subsystem Stack restored into a tighter machine-frame layout."
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
              <ClassicPanel eyebrow="Left Rail" title="Subsystem Stack" className="2xl:min-h-[500px]">
                <div className="mb-2 text-[8px] uppercase tracking-[0.26em] text-[#8e785c]">Subroutine Stack</div>
                <div className="grid gap-2">
                  {subsystemStack.map(([label, status, detail], index) => (
                    <div key={label} className="border border-[#5d3214]/55 bg-[#090604] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[7px] uppercase tracking-[0.24em] text-[#c9782f]/55">
                            Subsystem {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">
                            {label}
                          </div>
                        </div>
                        <ClassicBadge tone="amber">{status}</ClassicBadge>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-4 text-[#8e785c]">{detail}</p>
                    </div>
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Status" title="Core Array" compact>
                <div className="grid gap-1.5">
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
                subtitle="/command-center :: dense command matrix"
                compact
              />

              <ClassicPanel eyebrow="Center Grid" title="Primary Route Shortcuts">
                <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                  {primaryRoutes.map((route, index) => (
                    <PrimaryRouteCard key={route.id} route={route} index={index} />
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Directive Feed" title="Open Work / Mission Feed">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <ClassicStat label="Open Reviews" value="Placeholder" detail="review queue not wired" />
                  <ClassicStat label="Memory Candidates" value="Placeholder" detail="memory model pending" />
                  <ClassicStat label="Active Project" value="Chernobog" detail="current context" />
                  <ClassicStat label="Next Action" value="Density Pass" detail="align with classic UI" />
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Chernobog Inc" title="Department Control Layer">
                <DepartmentGrid />
              </ClassicPanel>
            </ClassicMainStack>

            <ClassicRail>
              <ClassicPanel eyebrow="Right Rail" title="Telemetry Stack" className="2xl:min-h-[220px]">
                <div className="grid gap-2">
                  <ClassicMiniStat label="Active Routes" value={activeRoutes.length} />
                  <ClassicMiniStat label="Experimental" value={experimentalRoutes.length} />
                  <ClassicMiniStat label="Review Routes" value={reviewRoutes.length} />
                  <ClassicMiniStat label="API Routes" value={apiRoutes.length} />
                  <ClassicMiniStat label="Command Router" value="Preserved" />
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Mission" title="Directive Stack">
                <div className="grid gap-2">
                  {directives.map(([title, detail], index) => (
                    <ClassicDirective
                      key={title}
                      index={index + 1}
                      title={title}
                      detail={detail}
                    />
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Direct Access" title="Control Links" compact>
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
