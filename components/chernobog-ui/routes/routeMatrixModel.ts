import type {
  ChernobogRoute,
  ChernobogRouteKind,
  ChernobogRouteStatus,
} from "@/lib/chernobog-ui/routeRegistry";
import {
  CHERNOBOG_ROUTE_KINDS,
  CHERNOBOG_ROUTE_STATUSES,
} from "@/lib/chernobog-ui/routeRegistry";

export type RouteMatrixTone = "amber" | "green" | "red" | "muted";

export type RouteMatrixVisibility = "all" | "openable" | "sealed" | "user-facing";

export type RouteMatrixQuery = {
  q: string;
  kind: string;
  status: string;
  visibility: RouteMatrixVisibility;
};

export type RouteMatrixRoute = {
  id: string;
  label: string;
  path: string;
  kind: ChernobogRouteKind;
  status: ChernobogRouteStatus;
  description: string;
  moduleId: string;
  commands: string[];
  tone: RouteMatrixTone;
  isOpenable: boolean;
  isUserFacing: boolean;
  isPrimaryNavigation: boolean;
  sealReason: string;
};

export type RouteMatrixGroup = {
  kind: ChernobogRouteKind;
  label: string;
  tone: RouteMatrixTone;
  routes: RouteMatrixRoute[];
  total: number;
  openable: number;
  sealed: number;
  active: number;
};

export type RouteMatrixSignal = {
  id: string;
  label: string;
  value: string;
  meta: string;
  tone: RouteMatrixTone;
};

export type RouteMatrixModel = {
  query: RouteMatrixQuery;
  kinds: ChernobogRouteKind[];
  statuses: ChernobogRouteStatus[];
  visibilityOptions: RouteMatrixVisibility[];
  groups: RouteMatrixGroup[];
  signals: RouteMatrixSignal[];
  counts: {
    total: number;
    filtered: number;
    openable: number;
    sealed: number;
    userFacing: number;
    primary: number;
    api: number;
    active: number;
    experimental: number;
    hidden: number;
    deprecated: number;
    unknown: number;
  };
};

type BuildRouteMatrixModelInput = {
  routes: ChernobogRoute[];
  query?: string;
  kind?: string;
  status?: string;
  visibility?: string;
};

const KIND_LABELS: Record<ChernobogRouteKind, string> = {
  core: "Core Routes",
  vault: "Vault Routes",
  inc: "Chernobog Inc",
  review: "Review Surfaces",
  module: "Module Routes",
  api: "Internal APIs",
  debug: "Debug / Dev",
  settings: "Settings",
  legacy: "Legacy / Unknown",
};

function normalizeFilter(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isRouteKind(value: string): value is ChernobogRouteKind {
  return CHERNOBOG_ROUTE_KINDS.includes(value as ChernobogRouteKind);
}

function isRouteStatus(value: string): value is ChernobogRouteStatus {
  return CHERNOBOG_ROUTE_STATUSES.includes(value as ChernobogRouteStatus);
}

function isRouteMatrixVisibility(value: string): value is RouteMatrixVisibility {
  return ["all", "openable", "sealed", "user-facing"].includes(value);
}

function routeIsOpenable(route: ChernobogRoute): boolean {
  if (route.kind === "api") return false;
  if (route.isUserFacing === false) return false;
  if (route.path.includes("[")) return false;
  return true;
}

function sealReasonForRoute(route: ChernobogRoute): string {
  if (route.kind === "api") return "INTERNAL API";
  if (route.isUserFacing === false) return "NOT USER-FACING";
  if (route.path.includes("[")) return "DYNAMIC ROUTE";
  return "OPEN";
}

function toneForStatus(status: ChernobogRouteStatus): RouteMatrixTone {
  if (status === "active") return "green";
  if (status === "experimental") return "amber";
  if (status === "deprecated") return "red";
  return "muted";
}

function toneForKind(kind: ChernobogRouteKind): RouteMatrixTone {
  if (kind === "api") return "red";
  if (kind === "debug" || kind === "settings") return "amber";
  if (kind === "legacy") return "muted";
  return "green";
}

function toRouteMatrixRoute(route: ChernobogRoute): RouteMatrixRoute {
  return {
    id: route.id,
    label: route.label,
    path: route.path,
    kind: route.kind,
    status: route.status,
    description: route.description,
    moduleId: route.moduleId ?? "unbound",
    commands: route.commands ?? [],
    tone: toneForStatus(route.status),
    isOpenable: routeIsOpenable(route),
    isUserFacing: route.isUserFacing !== false,
    isPrimaryNavigation: route.isPrimaryNavigation === true,
    sealReason: sealReasonForRoute(route),
  };
}

function routeMatchesQuery(route: RouteMatrixRoute, query: string): boolean {
  if (!query) return true;

  const haystack = [
    route.id,
    route.label,
    route.path,
    route.kind,
    route.status,
    route.description,
    route.moduleId,
    route.commands.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function routeMatchesVisibility(
  route: RouteMatrixRoute,
  visibility: RouteMatrixVisibility,
): boolean {
  if (visibility === "all") return true;
  if (visibility === "openable") return route.isOpenable;
  if (visibility === "sealed") return !route.isOpenable;
  if (visibility === "user-facing") return route.isUserFacing;
  return true;
}

function sortRoutes(a: RouteMatrixRoute, b: RouteMatrixRoute): number {
  if (a.isPrimaryNavigation !== b.isPrimaryNavigation) {
    return a.isPrimaryNavigation ? -1 : 1;
  }

  if (a.isOpenable !== b.isOpenable) return a.isOpenable ? -1 : 1;

  return a.label.localeCompare(b.label);
}

export function buildRouteMatrixModel({
  routes,
  query,
  kind,
  status,
  visibility,
}: BuildRouteMatrixModelInput): RouteMatrixModel {
  const normalizedQuery = normalizeFilter(query);
  const normalizedKind = normalizeFilter(kind);
  const normalizedStatus = normalizeFilter(status);
  const normalizedVisibility = normalizeFilter(visibility);

  const selectedKind = isRouteKind(normalizedKind) ? normalizedKind : "all";
  const selectedStatus = isRouteStatus(normalizedStatus)
    ? normalizedStatus
    : "all";
  const selectedVisibility = isRouteMatrixVisibility(normalizedVisibility)
    ? normalizedVisibility
    : "all";

  const routeRows = routes.map(toRouteMatrixRoute);

  const filteredRoutes = routeRows
    .filter((route) => routeMatchesQuery(route, normalizedQuery))
    .filter((route) => selectedKind === "all" || route.kind === selectedKind)
    .filter(
      (route) => selectedStatus === "all" || route.status === selectedStatus,
    )
    .filter((route) => routeMatchesVisibility(route, selectedVisibility))
    .sort(sortRoutes);

  const groups = CHERNOBOG_ROUTE_KINDS.map((routeKind) => {
    const groupRoutes = filteredRoutes.filter((route) => route.kind === routeKind);
    const openable = groupRoutes.filter((route) => route.isOpenable).length;
    const active = groupRoutes.filter((route) => route.status === "active").length;

    return {
      kind: routeKind,
      label: KIND_LABELS[routeKind],
      tone: toneForKind(routeKind),
      routes: groupRoutes,
      total: groupRoutes.length,
      openable,
      sealed: groupRoutes.length - openable,
      active,
    };
  }).filter((group) => group.routes.length > 0);

  const openable = routeRows.filter((route) => route.isOpenable).length;
  const userFacing = routeRows.filter((route) => route.isUserFacing).length;
  const primary = routeRows.filter((route) => route.isPrimaryNavigation).length;
  const api = routeRows.filter((route) => route.kind === "api").length;
  const active = routeRows.filter((route) => route.status === "active").length;
  const experimental = routeRows.filter(
    (route) => route.status === "experimental",
  ).length;
  const hidden = routeRows.filter((route) => route.status === "hidden").length;
  const deprecated = routeRows.filter(
    (route) => route.status === "deprecated",
  ).length;
  const unknown = routeRows.filter((route) => route.status === "unknown").length;

  const signals: RouteMatrixSignal[] = [
    {
      id: "matrix-health",
      label: "MATRIX HEALTH",
      value: `${active}/${routeRows.length}`,
      meta: "active routes",
      tone: "green",
    },
    {
      id: "openable",
      label: "OPENABLE",
      value: `${openable}`,
      meta: "direct links",
      tone: "green",
    },
    {
      id: "sealed",
      label: "SEALED",
      value: `${routeRows.length - openable}`,
      meta: "api or dynamic",
      tone: routeRows.length - openable > 0 ? "amber" : "muted",
    },
    {
      id: "api",
      label: "INTERNAL API",
      value: `${api}`,
      meta: "not surfaced as links",
      tone: api > 0 ? "red" : "muted",
    },
    {
      id: "filter",
      label: "FILTER STATE",
      value: `${filteredRoutes.length}`,
      meta: "visible rows",
      tone: filteredRoutes.length === routeRows.length ? "muted" : "amber",
    },
  ];

  return {
    query: {
      q: normalizedQuery,
      kind: selectedKind,
      status: selectedStatus,
      visibility: selectedVisibility,
    },
    kinds: CHERNOBOG_ROUTE_KINDS,
    statuses: CHERNOBOG_ROUTE_STATUSES,
    visibilityOptions: ["all", "openable", "sealed", "user-facing"],
    groups,
    signals,
    counts: {
      total: routeRows.length,
      filtered: filteredRoutes.length,
      openable,
      sealed: routeRows.length - openable,
      userFacing,
      primary,
      api,
      active,
      experimental,
      hidden,
      deprecated,
      unknown,
    },
  };
}
