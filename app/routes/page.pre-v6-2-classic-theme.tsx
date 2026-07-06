import Link from "next/link";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import {
  CHERNOBOG_ROUTE_KINDS,
  CHERNOBOG_ROUTE_STATUSES,
  getAllChernobogRoutes,
  getPrimaryNavigationRoutes,
} from "@/lib/chernobog-ui/routeRegistry";

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

function statusClass(status: string): string {
  switch (status) {
    case "active":
      return "border-emerald-400/30 bg-emerald-950/20 text-emerald-200";
    case "experimental":
      return "border-orange-300/30 bg-orange-950/20 text-orange-100";
    case "deprecated":
      return "border-red-400/30 bg-red-950/20 text-red-100";
    case "hidden":
      return "border-zinc-500/30 bg-zinc-950/40 text-zinc-300";
    default:
      return "border-zinc-600/30 bg-black/40 text-zinc-400";
  }
}

function kindClass(kind: string): string {
  switch (kind) {
    case "core":
      return "border-orange-300/30 bg-orange-950/20 text-orange-100";
    case "vault":
      return "border-cyan-300/30 bg-cyan-950/20 text-cyan-100";
    case "inc":
      return "border-purple-300/30 bg-purple-950/20 text-purple-100";
    case "review":
      return "border-blue-300/30 bg-blue-950/20 text-blue-100";
    case "api":
      return "border-zinc-400/30 bg-zinc-950/50 text-zinc-200";
    case "debug":
      return "border-yellow-300/30 bg-yellow-950/20 text-yellow-100";
    case "legacy":
      return "border-red-400/30 bg-red-950/20 text-red-100";
    default:
      return "border-orange-300/20 bg-black/30 text-zinc-300";
  }
}

function commandBinding(route: RegistryRoute): string {
  if (!route.commands || route.commands.length === 0) {
    return "NO COMMAND BINDINGS";
  }

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

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-300/15 bg-black/35 p-4 shadow-[inset_0_0_0_1px_rgba(255,180,80,0.04),0_0_35px_rgba(0,0,0,0.35)]">
      <div className="text-[10px] uppercase tracking-[0.34em] text-orange-200/45">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-100">
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
        {detail}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${kindClass(
        kind,
      )}`}
    >
      {kind}
    </span>
  );
}

function RouteCard({ route }: { route: RegistryRoute }) {
  const openable = routeIsOpenable(route);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-orange-300/12 bg-[linear-gradient(180deg,rgba(18,14,11,0.95),rgba(5,5,5,0.95))] p-4 shadow-[inset_0_0_0_1px_rgba(255,180,80,0.035)] transition hover:border-orange-300/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/40 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition group-hover:bg-orange-400/15" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={route.kind} />
              <StatusBadge status={route.status} />
              {route.moduleId ? (
                <span className="rounded-full border border-orange-300/12 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  {route.moduleId}
                </span>
              ) : null}
            </div>

            <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-zinc-100">
              {route.label}
            </h3>

            <div className="mt-2 font-mono text-sm text-orange-200/75">
              {route.path}
            </div>
          </div>

          {openable ? (
            <Link
              href={route.path}
              className="rounded-lg border border-orange-300/25 bg-orange-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-100 transition hover:bg-orange-500/20"
            >
              Open
            </Link>
          ) : (
            <span className="rounded-lg border border-zinc-600/30 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sealed
            </span>
          )}
        </div>

        <p className="text-sm leading-6 text-zinc-400">{route.description}</p>

        <div className="grid gap-3 border-t border-orange-300/10 pt-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.26em] text-orange-200/35">
              Command Binding
            </div>
            <div className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-zinc-500">
              {commandBinding(route)}
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            ID: {route.id}
          </div>
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
    <section className="rounded-2xl border border-orange-300/12 bg-black/25 p-5 shadow-[0_0_45px_rgba(0,0,0,0.3)]">
      <div className="mb-4 flex flex-col gap-3 border-b border-orange-300/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.42em] text-orange-200/45">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em] text-zinc-100">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {detail}
          </p>
        </div>

        <div className="rounded-full border border-orange-300/15 bg-black/30 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-orange-200/65">
          {routes.length} route{routes.length === 1 ? "" : "s"}
        </div>
      </div>

      {routes.length > 0 ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-orange-300/10 bg-black/25 p-6 text-sm uppercase tracking-[0.2em] text-zinc-600">
          No matching route signatures in this channel.
        </div>
      )}
    </section>
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
    const matchesQuery =
      query.length === 0 || routeSearchText(route).includes(query);
    const matchesKind = selectedKind === "all" || route.kind === selectedKind;
    const matchesStatus =
      selectedStatus === "all" || route.status === selectedStatus;

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

  const primaryFiltered = filteredRoutes.filter((route) =>
    primaryRouteIds.has(route.id),
  );

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
  const experimentalCount = allRoutes.filter(
    (route) => route.status === "experimental",
  ).length;
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
      <div className="relative overflow-hidden rounded-3xl border border-orange-300/15 bg-[#050403] p-5 text-zinc-100 shadow-[0_0_70px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,104,28,0.13),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(255,176,102,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,176,102,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,176,102,0.55)_1px,transparent_1px)] [background-size:38px_38px]" />

        <div className="relative flex flex-col gap-6">
          <header className="rounded-2xl border border-orange-300/15 bg-black/35 p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.46em] text-orange-200/50">
                  Chernobog Route Registry
                </div>
                <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[-0.05em] text-zinc-100 md:text-5xl">
                  Route Command Matrix
                </h1>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
                  A registry-backed map of the Chernobog interface surface:
                  command routes, vault routes, review workspaces, module pages,
                  internal APIs, debug lanes, and sealed legacy paths.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/command-center"
                  className="rounded-lg border border-orange-300/25 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-100 transition hover:bg-orange-500/20"
                >
                  Back to Command Center
                </Link>
                <Link
                  href="/command"
                  className="rounded-lg border border-orange-300/15 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400 transition hover:text-zinc-100"
                >
                  Console
                </Link>
                <Link
                  href="/modules"
                  className="rounded-lg border border-orange-300/15 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400 transition hover:text-zinc-100"
                >
                  Modules
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Registry Entries"
              value={allRoutes.length}
              detail="known route signatures"
            />
            <StatCard
              label="Primary Navigation"
              value={primaryRoutes.length}
              detail="sidebar-grade routes"
            />
            <StatCard
              label="Active Routes"
              value={activeCount}
              detail="currently live"
            />
            <StatCard
              label="Experimental"
              value={experimentalCount}
              detail="visible but unstable"
            />
            <StatCard
              label="Internal / Sealed"
              value={internalCount}
              detail="api or non-user-facing"
            />
          </section>

          <section className="grid gap-4 2xl:grid-cols-[1.35fr_0.85fr]">
            <form
              action="/routes"
              className="rounded-2xl border border-orange-300/15 bg-black/30 p-4"
            >
              <div className="grid gap-3 xl:grid-cols-[1fr_150px_150px_170px_auto]">
                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-orange-200/45">
                    Search Matrix
                  </span>
                  <input
                    name="q"
                    defaultValue={query}
                    placeholder="Search route, module, command, status..."
                    className="h-11 w-full rounded-lg border border-orange-300/15 bg-black/45 px-3 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-300/45"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-orange-200/45">
                    Kind
                  </span>
                  <select
                    name="kind"
                    defaultValue={selectedKind}
                    className="h-11 w-full rounded-lg border border-orange-300/15 bg-black px-3 text-sm text-zinc-100 outline-none focus:border-orange-300/45"
                  >
                    <option value="all">All kinds</option>
                    {CHERNOBOG_ROUTE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-orange-200/45">
                    Status
                  </span>
                  <select
                    name="status"
                    defaultValue={selectedStatus}
                    className="h-11 w-full rounded-lg border border-orange-300/15 bg-black px-3 text-sm text-zinc-100 outline-none focus:border-orange-300/45"
                  >
                    <option value="all">All statuses</option>
                    {CHERNOBOG_ROUTE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-orange-200/45">
                    View
                  </span>
                  <select
                    name="view"
                    defaultValue={selectedView}
                    className="h-11 w-full rounded-lg border border-orange-300/15 bg-black px-3 text-sm text-zinc-100 outline-none focus:border-orange-300/45"
                  >
                    <option value="all">All channels</option>
                    <option value="primary">Primary nav</option>
                    <option value="user-facing">User-facing</option>
                    <option value="review">Reviews</option>
                    <option value="api">Internal APIs</option>
                    <option value="legacy">Legacy / sealed</option>
                  </select>
                </label>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="h-11 rounded-lg border border-orange-300/25 bg-orange-500/10 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-orange-100 transition hover:bg-orange-500/20"
                  >
                    Filter
                  </button>
                  <Link
                    href="/routes"
                    className="flex h-11 items-center rounded-lg border border-orange-300/15 bg-black/30 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition hover:text-zinc-100"
                  >
                    Reset
                  </Link>
                </div>
              </div>
            </form>

            <aside className="rounded-2xl border border-orange-300/15 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.34em] text-orange-200/45">
                Route Registry Health
              </div>

              <div className="mt-3 grid gap-2">
                {statusCounts.map((item) => (
                  <Link
                    key={item.status}
                    href={buildFilterHref({
                      q: query,
                      kind: selectedKind,
                      status: item.status,
                      view: selectedView,
                    })}
                    className="flex items-center justify-between border-b border-orange-300/10 py-1.5 text-xs transition hover:text-orange-100"
                  >
                    <span className="uppercase tracking-[0.22em] text-zinc-500">
                      {item.status}
                    </span>
                    <span className="font-mono text-orange-200/80">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          </section>

          <section className="rounded-2xl border border-orange-300/12 bg-black/25 p-4">
            <div className="mb-3 text-[10px] uppercase tracking-[0.34em] text-orange-200/45">
              Kind Distribution
            </div>
            <div className="grid gap-2 md:grid-cols-3 2xl:grid-cols-9">
              {kindCounts.map((item) => (
                <Link
                  key={item.kind}
                  href={buildFilterHref({
                    q: query,
                    kind: item.kind,
                    status: selectedStatus,
                    view: selectedView,
                  })}
                  className="rounded-lg border border-orange-300/10 bg-black/25 p-3 transition hover:border-orange-300/25"
                >
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    {item.kind}
                  </div>
                  <div className="mt-2 font-mono text-lg text-orange-200/80">
                    {item.count}
                  </div>
                </Link>
              ))}
            </div>
          </section>

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

          {filteredRoutes.length === 0 ? (
            <section className="rounded-2xl border border-red-400/20 bg-red-950/10 p-6">
              <div className="text-sm uppercase tracking-[0.22em] text-red-200">
                No route signatures matched the current filter package.
              </div>
            </section>
          ) : null}

          <footer className="border-t border-orange-300/12 py-5 text-xs uppercase tracking-[0.22em] text-zinc-600">
            Chernobog V6.2 / Route Registry Overhaul / Command Matrix Interface
          </footer>
        </div>
      </div>
    </ChernobogShell>
  );
}