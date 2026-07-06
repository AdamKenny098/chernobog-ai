import type { ChernobogModule } from "@/lib/chernobog-ui/moduleRegistry";
import type { ChernobogRoute } from "@/lib/chernobog-ui/routeRegistry";

export type CommandCenterTone = "amber" | "green" | "red" | "muted";

export type CommandCenterLink = {
  id: string;
  label: string;
  path: string;
  meta: string;
  signal: string;
  tone: CommandCenterTone;
  isOpenable: boolean;
};

export type CommandCenterModuleCard = {
  id: string;
  label: string;
  category: string;
  ownerDepartment: string;
  status: string;
  description: string;
  path: string;
  routeLabel: string;
  command: string;
  tone: CommandCenterTone;
  isOpenable: boolean;
};

export type CommandCenterTelemetrySignal = {
  id: string;
  label: string;
  value: string;
  meta: string;
  tone: CommandCenterTone;
};

export type CommandCenterModel = {
  headerLinks: CommandCenterLink[];
  subsystemLinks: CommandCenterLink[];
  moduleCards: CommandCenterModuleCard[];
  telemetrySignals: CommandCenterTelemetrySignal[];
  directiveLinks: CommandCenterLink[];
  counts: {
    routes: number;
    modules: number;
    activeRoutes: number;
    activeModules: number;
    reviewRoutes: number;
    vaultRoutes: number;
  };
};

type BuildCommandCenterModelInput = {
  routes: ChernobogRoute[];
  primaryRoutes: ChernobogRoute[];
  modules: ChernobogModule[];
};

function routeIsOpenable(route: ChernobogRoute): boolean {
  if (route.kind === "api") return false;
  if (route.isUserFacing === false) return false;
  if (route.path.includes("[")) return false;
  return true;
}

function toneForStatus(status: string): CommandCenterTone {
  if (status === "active") return "green";
  if (status === "experimental") return "amber";
  if (status === "deprecated") return "red";
  return "muted";
}

function toneForRoute(route: ChernobogRoute): CommandCenterTone {
  if (route.status === "active") return "green";
  if (route.status === "experimental") return "amber";
  if (route.status === "deprecated") return "red";
  return "muted";
}

function toCommandCenterLink(
  route: ChernobogRoute,
  metaOverride?: string,
): CommandCenterLink {
  return {
    id: route.id,
    label: route.label,
    path: route.path,
    meta: metaOverride ?? route.kind.toUpperCase(),
    signal: route.status.toUpperCase(),
    tone: toneForRoute(route),
    isOpenable: routeIsOpenable(route),
  };
}

function findRouteById(
  routes: ChernobogRoute[],
  id: string,
): ChernobogRoute | undefined {
  return routes.find((route) => route.id === id);
}

function findFirstRouteForModule(
  routes: ChernobogRoute[],
  module: ChernobogModule,
): ChernobogRoute | undefined {
  for (const routeId of module.relatedRouteIds) {
    const route = findRouteById(routes, routeId);
    if (route && routeIsOpenable(route)) return route;
  }

  for (const routeId of module.relatedRouteIds) {
    const route = findRouteById(routes, routeId);
    if (route) return route;
  }

  return undefined;
}

function byPreferredIds<T extends { id: string }>(
  items: T[],
  preferredIds: string[],
): T[] {
  const rank = new Map(preferredIds.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const aRank = rank.get(a.id) ?? 999;
    const bRank = rank.get(b.id) ?? 999;

    if (aRank !== bRank) return aRank - bRank;
    return a.id.localeCompare(b.id);
  });
}

export function buildCommandCenterModel({
  routes,
  primaryRoutes,
  modules,
}: BuildCommandCenterModelInput): CommandCenterModel {
  const headerRouteIds = ["command", "routes", "modules", "vault"];
  const subsystemRouteIds = [
    "command",
    "vault",
    "saved-content-watch",
    "game-discovery",
    "presence",
    "vault-pr-live-discord-1780354391354",
    "schematic-review-ruined-outpost-2026-06-27",
    "routes",
  ];
  const moduleIds = [
    "command-core",
    "vault-brain",
    "saved-content-review-module",
    "game-discovery-module",
    "presence-display-module",
    "discord-ingest",
    "vault-pr-review",
    "schematic-generator",
    "chernobog-inc",
    "debug-dev-tools",
  ];

  const headerLinks = headerRouteIds
    .map((id) => findRouteById(routes, id))
    .filter((route): route is ChernobogRoute => Boolean(route))
    .map((route) => toCommandCenterLink(route, "PRIMARY"));

  const subsystemLinks = subsystemRouteIds
    .map((id) => findRouteById(routes, id))
    .filter((route): route is ChernobogRoute => Boolean(route))
    .map((route) => toCommandCenterLink(route, route.kind.toUpperCase()));

  const moduleCards = byPreferredIds(modules, moduleIds)
    .slice(0, 9)
    .map((module) => {
      const route = findFirstRouteForModule(routes, module);

      return {
        id: module.id,
        label: module.label,
        category: module.category,
        ownerDepartment: module.ownerDepartment,
        status: module.status,
        description: module.description,
        path: route?.path ?? "/modules",
        routeLabel: route?.label ?? "Modules",
        command: module.relatedCommands[0] ?? "open module",
        tone: toneForStatus(module.status),
        isOpenable: route ? routeIsOpenable(route) : true,
      };
    });

  const activeRoutes = routes.filter((route) => route.status === "active");
  const activeModules = modules.filter((module) => module.status === "active");
  const reviewRoutes = routes.filter((route) => route.kind === "review");
  const vaultRoutes = routes.filter((route) => route.kind === "vault");

  const telemetrySignals: CommandCenterTelemetrySignal[] = [
    {
      id: "trust-layer",
      label: "TRUST LAYER",
      value: "CONTROLLED",
      meta: "no autonomous writes",
      tone: "green",
    },
    {
      id: "route-matrix",
      label: "ROUTE MATRIX",
      value: `${activeRoutes.length}/${routes.length}`,
      meta: "active routes",
      tone: "amber",
    },
    {
      id: "vault-memory",
      label: "VAULT MEMORY",
      value: `${vaultRoutes.length}`,
      meta: "vault surfaces",
      tone: vaultRoutes.length > 0 ? "green" : "muted",
    },
    {
      id: "review-queue",
      label: "REVIEW QUEUE",
      value: `${reviewRoutes.length}`,
      meta: "review surfaces",
      tone: reviewRoutes.length > 0 ? "amber" : "muted",
    },
    {
      id: "subsystems",
      label: "SUBSYSTEMS",
      value: `${activeModules.length}/${modules.length}`,
      meta: "active modules",
      tone: "green",
    },
  ];

  const directiveLinks = [
    ...primaryRoutes,
    ...routes.filter((route) =>
      [
        "saved-content-watch",
        "game-discovery",
        "presence",
        "vault-pr-live-discord-1780354391354",
      ].includes(route.id),
    ),
  ]
    .filter((route, index, list) => {
      return list.findIndex((candidate) => candidate.id === route.id) === index;
    })
    .filter(routeIsOpenable)
    .slice(0, 7)
    .map((route) => toCommandCenterLink(route, "LINK"));

  return {
    headerLinks,
    subsystemLinks,
    moduleCards,
    telemetrySignals,
    directiveLinks,
    counts: {
      routes: routes.length,
      modules: modules.length,
      activeRoutes: activeRoutes.length,
      activeModules: activeModules.length,
      reviewRoutes: reviewRoutes.length,
      vaultRoutes: vaultRoutes.length,
    },
  };
}
