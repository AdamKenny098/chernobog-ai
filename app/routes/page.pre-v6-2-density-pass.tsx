import Link from "next/link";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import {
  CHERNOBOG_ROUTE_KINDS,
  CHERNOBOG_ROUTE_STATUSES,
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@/lib/chernobog-ui/routeRegistry";
import {
  ClassicBadge,
  ClassicButtonLink,
  ClassicFrame,
  ClassicHeader,
  ClassicLayout,
  ClassicMainStack,
  ClassicMiniStat,
  ClassicPanel,
  ClassicRail,
  ClassicStat,
} from "@/components/chernobog-ui/ChernobogClassic";

type SearchParamsValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamsValue>;
type SearchParamsInput = SearchParams | Promise<SearchParams> | undefined;
type RegistryRoute = ReturnType<typeof getAllChernobogRoutes>[number];

function isPromiseLike(value: SearchParamsInput): value is Promise<SearchParams> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "then" in value &&
      typeof value.then === "function",
  );
}

async function resolveSearchParams(value: SearchParamsInput): Promise<SearchParams> {
  if (!value) return {};
  if (isPromiseLike(value)) return value;
  return value;
}

function normalizeParam(value: SearchParamsValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function routeSearchText(route: RegistryRoute): string {
  return [
    route.id,
    route.label,
    route.path,
    route.kind,
    route.status,
    route.description,
    route.moduleId,
    ...(route.commands ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

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

function commandBinding(route: RegistryRoute): string {
  if (!route.commands || route.commands.length === 0) return "NO COMMAND BINDINGS";
  return route.commands.join(" / ").toUpperCase();
}

function buildFilterHref(params: {
  q?: string;
  kind?: string;
  status?: string;
  view?: string;
}): string {
  const next = new URLSearchParams();

  if (params.q) next.set("q", params.q);
  if (params.kind && params.kind !== "all") next.set("kind", params.kind);
  if (params.status && params.status !== "all") next.set("status", params.status);
  if (params.view && params.view !== "all") next.set("view", params.view);

  const query = next.toString();
  return query ? `/routes?${query}` : "/routes";
}

function RouteCard({ route, index }: { route: RegistryRoute; index: number }) {
  const openable = routeIsOpenable(route);

  return (
    <article className="relative grid min-h-[205px] grid-rows-[auto_1fr_auto] overflow-hidden border border-[#6f3d18]/70 bg-[#090705]/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,154,58,0.07)] transition hover:border-[#c9782f]/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9782f]/45 to-transparent" />
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[8px] uppercase tracking-[0.3em] text-[#c9782f]/55">
            Route Signature {String(index + 1).padStart(2, "0")}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <ClassicBadge tone={routeTone(route)}>{route.status}</ClassicBadge>
            <ClassicBadge tone="dim">{route.kind}</ClassicBadge>
            {route.moduleId ? <ClassicBadge tone="amber">{route.moduleId}</ClassicBadge> : null}
          </div>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
            {route.label}
          </h3>
          <div className="mt-2 font-mono text-xs text-[#c9782f]/80">{route.path}</div>
        </div>

        {openable ? (
          <Link
            href={route.path}
            className="border border-[#c9782f]/70 bg-[#2a1609]/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffd28a] transition hover:bg-[#3a1e0c]"
          >
            Open
          </Link>
        ) : (
          <span className="border border-[#5a4a38]/70 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8e785c]">
            Sealed
          </span>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-[#b7a386]">{route.description}</p>

      <div className="mt-4 border-t border-[#6f3d18]/45 pt-3">
        <div className="text-[9px] uppercase tracking-[0.28em] text-[#8e785c]">Command Binding</div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#ffd28a]/80">
          {commandBinding(route)}
        </div>
        <div className="mt-3 text-[9px] uppercase tracking-[0.24em] text-[#6f5a42]">
          Route ID: {route.id}
        </div>
      </div>
    </article>
  );
}

function RouteSection({
  eyebrow,
  title,
  detail,
  routes,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  routes: RegistryRoute[];
}) {
  return (
    <ClassicPanel eyebrow={eyebrow} title={title}>
      <div className="mb-4 flex flex-col gap-3 border-b border-[#6f3d18]/45 pb-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-3xl text-sm leading-6 text-[#b7a386]">{detail}</p>
        <ClassicBadge tone="amber">
          {routes.length} route{routes.length === 1 ? "" : "s"}
        </ClassicBadge>
      </div>

      {routes.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {routes.map((route, index) => (
            <RouteCard key={route.id} route={route} index={index} />
          ))}
        </div>
      ) : (
        <div className="border border-[#6f3d18]/45 bg-black/25 p-5 text-xs uppercase tracking-[0.22em] text-[#8e785c]">
          No matching route signatures in this channel.
        </div>
      )}
    </ClassicPanel>
  );
}

export default async function RoutesPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const params = await resolveSearchParams(searchParams);

  const query = normalizeParam(params.q).trim().toLowerCase();
  const selectedKind = normalizeParam(params.kind) || "all";
  const selectedStatus = normalizeParam(params.status) || "all";
  const selectedView = normalizeParam(params.view) || "all";

  const allRoutes = getAllChernobogRoutes();
  const primaryRoutes = getPrimaryNavigationRoutes();
  const primaryRouteIds = new Set(primaryRoutes.map((route) => route.id));

  const filteredRoutes = allRoutes.filter((route) => {
    const matchesQuery = query.length === 0 || routeSearchText(route).includes(query);
    const matchesKind = selectedKind === "all" || route.kind === selectedKind;
    const matchesStatus = selectedStatus === "all" || route.status === selectedStatus;

    const matchesView =
      selectedView === "all" ||
      (selectedView === "primary" && primaryRouteIds.has(route.id)) ||
      (selectedView === "user-facing" && route.isUserFacing !== false) ||
      (selectedView === "review" &&
        (route.kind === "review" || route.path.startsWith("/review"))) ||
      (selectedView === "api" &&
        (route.kind === "api" || route.path.startsWith("/api"))) ||
      (selectedView === "legacy" &&
        (route.kind === "legacy" ||
          route.status === "deprecated" ||
          route.status === "hidden" ||
          route.status === "unknown"));

    return matchesQuery && matchesKind && matchesStatus && matchesView;
  });

  const primaryFiltered = filteredRoutes.filter((route) => primaryRouteIds.has(route.id));
  const userFacingFiltered = filteredRoutes.filter(
    (route) =>
      route.isUserFacing !== false &&
      !primaryRouteIds.has(route.id) &&
      route.kind !== "review" &&
      route.kind !== "api" &&
      route.status !== "hidden" &&
      route.status !== "deprecated" &&
      route.status !== "unknown",
  );
  const reviewFiltered = filteredRoutes.filter(
    (route) => route.kind === "review" || route.path.startsWith("/review"),
  );
  const apiFiltered = filteredRoutes.filter(
    (route) => route.kind === "api" || route.path.startsWith("/api"),
  );
  const legacyFiltered = filteredRoutes.filter(
    (route) =>
      route.kind === "legacy" ||
      route.status === "deprecated" ||
      route.status === "hidden" ||
      route.status === "unknown",
  );

  const activeCount = allRoutes.filter((route) => route.status === "active").length;
  const experimentalCount = allRoutes.filter((route) => route.status === "experimental").length;
  const internalCount = allRoutes.filter(
    (route) => route.kind === "api" || route.isUserFacing === false,
  ).length;

  const statusCounts = CHERNOBOG_ROUTE_STATUSES.map((status) => ({
    status,
    count: allRoutes.filter((route) => route.status === status).length,
  }));
  const kindCounts = CHERNOBOG_ROUTE_KINDS.map((kind) => ({
    kind,
    count: allRoutes.filter((route) => route.kind === kind).length,
  }));

  return (
    <ChernobogShell currentArea="Route Registry">
      <ClassicFrame>
        <div className="grid gap-4">
          <ClassicHeader
            eyebrow="Route Registry Interface / Structured Matrix"
            title="Route Command Matrix"
            description="A structured registry-backed directory for command pages, vault lanes, review workspaces, module surfaces, Internal APIs, debug channels, and sealed legacy paths."
            actions={
              <>
                <ClassicButtonLink href="/command-center" tone="amber">Back to Command Center</ClassicButtonLink>
                <ClassicButtonLink href="/command" tone="dim">Console</ClassicButtonLink>
                <ClassicButtonLink href="/modules" tone="dim">Modules</ClassicButtonLink>
              </>
            }
            metrics={
              <>
                <ClassicStat label="Registry Entries" value={allRoutes.length} detail="known signatures" />
                <ClassicStat label="Primary" value={primaryRoutes.length} detail="operator nav" />
                <ClassicStat label="Active" value={activeCount} detail="live lanes" />
                <ClassicStat label="Internal" value={internalCount} detail="sealed/api" />
              </>
            }
          />

          <ClassicLayout>
            <ClassicRail>
              <ClassicPanel eyebrow="Left Rail" title="Filter Matrix" className="2xl:min-h-[520px]">
                <form action="/routes" className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-[#8e785c]">
                      Search Matrix
                    </span>
                    <input
                      name="q"
                      defaultValue={query}
                      placeholder="Search route, module, command, status..."
                      className="h-11 w-full border border-[#6f3d18]/70 bg-black/45 px-3 font-mono text-sm text-[#ffe0ac] outline-none placeholder:text-[#6f5a42] focus:border-[#c9782f]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-[#8e785c]">Kind</span>
                    <select
                      name="kind"
                      defaultValue={selectedKind}
                      className="h-11 w-full border border-[#6f3d18]/70 bg-black px-3 text-sm text-[#ffe0ac] outline-none focus:border-[#c9782f]"
                    >
                      <option value="all">All kinds</option>
                      {CHERNOBOG_ROUTE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>{kind}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-[#8e785c]">Status</span>
                    <select
                      name="status"
                      defaultValue={selectedStatus}
                      className="h-11 w-full border border-[#6f3d18]/70 bg-black px-3 text-sm text-[#ffe0ac] outline-none focus:border-[#c9782f]"
                    >
                      <option value="all">All statuses</option>
                      {CHERNOBOG_ROUTE_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[9px] uppercase tracking-[0.3em] text-[#8e785c]">View</span>
                    <select
                      name="view"
                      defaultValue={selectedView}
                      className="h-11 w-full border border-[#6f3d18]/70 bg-black px-3 text-sm text-[#ffe0ac] outline-none focus:border-[#c9782f]"
                    >
                      <option value="all">All channels</option>
                      <option value="primary">Primary nav</option>
                      <option value="user-facing">User-facing</option>
                      <option value="review">Reviews</option>
                      <option value="api">Internal APIs</option>
                      <option value="legacy">Legacy / sealed</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="submit"
                      className="h-11 border border-[#c9782f]/70 bg-[#2a1609]/70 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffd28a] hover:bg-[#3a1e0c]"
                    >
                      Filter
                    </button>
                    <Link
                      href="/routes"
                      className="flex h-11 items-center justify-center border border-[#6f3d18]/70 bg-black/35 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8e785c] hover:text-[#ffe0ac]"
                    >
                      Reset
                    </Link>
                  </div>
                </form>
              </ClassicPanel>

              <ClassicPanel eyebrow="Seal Logic" title="Open Link Protection" compact>
                <p className="text-xs leading-6 text-[#b7a386]">
                  Dynamic, API, hidden, deprecated, and unknown routes are tracked as route signatures but sealed from direct opening.
                </p>
              </ClassicPanel>
            </ClassicRail>

            <ClassicMainStack>
              <ClassicPanel eyebrow="Center Grid" title="Kind Distribution">
                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
                  {kindCounts.map((item) => (
                    <Link
                      key={item.kind}
                      href={buildFilterHref({
                        q: query,
                        kind: item.kind,
                        status: selectedStatus,
                        view: selectedView,
                      })}
                      className="border border-[#6f3d18]/55 bg-[#090604] p-3 transition hover:border-[#c9782f]"
                    >
                      <div className="text-[9px] uppercase tracking-[0.24em] text-[#8e785c]">{item.kind}</div>
                      <div className="mt-2 font-mono text-lg text-[#ffd28a]">{item.count}</div>
                    </Link>
                  ))}
                </div>
              </ClassicPanel>

              <RouteSection
                eyebrow="01 / Navigation Bus"
                title="Primary Navigation"
                detail="Routes promoted into the main operating surface. These should stay stable, obvious, and clean."
                routes={primaryFiltered}
              />
              <RouteSection
                eyebrow="02 / Operator Surface"
                title="User-Facing Routes"
                detail="Visible pages that are not primary navigation but still belong to the normal Chernobog UI."
                routes={userFacingFiltered}
              />
              <RouteSection
                eyebrow="03 / Review Workspace"
                title="Review / Workflow Routes"
                detail="Approval, review, and workflow-specific pages. Dynamic routes are tracked but sealed from direct opening."
                routes={reviewFiltered}
              />
              <RouteSection
                eyebrow="04 / Internal Channel"
                title="Internal APIs"
                detail="Machine-facing routes. These are tracked for visibility but are not treated as normal UI pages."
                routes={apiFiltered}
              />
              <RouteSection
                eyebrow="05 / Sealed Archive"
                title="Legacy / Hidden / Unknown"
                detail="Old, hidden, deprecated, or uncertain routes. Do not delete them blindly; classify first, remove later only when safe."
                routes={legacyFiltered}
              />
            </ClassicMainStack>

            <ClassicRail>
              <ClassicPanel eyebrow="Right Rail" title="Route Registry Health" className="2xl:min-h-[260px]">
                <div className="grid gap-2">
                  {statusCounts.map((item) => (
                    <Link
                      key={item.status}
                      href={buildFilterHref({
                        q: query,
                        kind: selectedKind,
                        status: item.status,
                        view: selectedView,
                      })}
                      className="flex items-center justify-between border-b border-[#6f3d18]/45 pb-2 text-xs hover:text-[#ffe0ac]"
                    >
                      <span className="uppercase tracking-[0.22em] text-[#8e785c]">{item.status}</span>
                      <span className="font-mono text-[#ffd28a]">{item.count}</span>
                    </Link>
                  ))}
                </div>
              </ClassicPanel>

              <ClassicPanel eyebrow="Route Totals" title="Matrix Summary">
                <div className="grid gap-2">
                  <ClassicMiniStat label="Filtered" value={filteredRoutes.length} />
                  <ClassicMiniStat label="Primary" value={primaryFiltered.length} />
                  <ClassicMiniStat label="User-Facing" value={userFacingFiltered.length} />
                  <ClassicMiniStat label="Reviews" value={reviewFiltered.length} />
                  <ClassicMiniStat label="Internal APIs" value={apiFiltered.length} />
                  <ClassicMiniStat label="Legacy/Sealed" value={legacyFiltered.length} />
                  <ClassicMiniStat label="Experimental" value={experimentalCount} />
                </div>
              </ClassicPanel>
            </ClassicRail>
          </ClassicLayout>
        </div>
      </ClassicFrame>
    </ChernobogShell>
  );
}
