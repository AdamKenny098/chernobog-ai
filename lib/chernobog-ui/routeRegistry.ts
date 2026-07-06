export type ChernobogRouteKind =
  | "core"
  | "vault"
  | "inc"
  | "review"
  | "module"
  | "api"
  | "debug"
  | "settings"
  | "legacy";

export type ChernobogRouteStatus =
  | "active"
  | "experimental"
  | "hidden"
  | "deprecated"
  | "unknown";

export type ChernobogRoute = {
  id: string;
  label: string;
  path: string;
  kind: ChernobogRouteKind;
  status: ChernobogRouteStatus;
  description: string;
  moduleId?: string;
  commands?: string[];
  isPrimaryNavigation?: boolean;
  isUserFacing?: boolean;
};

export const CHERNOBOG_ROUTE_KINDS: ChernobogRouteKind[] = [
  "core",
  "vault",
  "inc",
  "review",
  "module",
  "api",
  "debug",
  "settings",
  "legacy",
];

export const CHERNOBOG_ROUTE_STATUSES: ChernobogRouteStatus[] = [
  "active",
  "experimental",
  "hidden",
  "deprecated",
  "unknown",
];

export const CHERNOBOG_ROUTES: ChernobogRoute[] = [
  {
    id: "home",
    label: "Home Redirect",
    path: "/",
    kind: "core",
    status: "active",
    description: "Default entry point that redirects to /command-center.",
    moduleId: "command-core",
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "command",
    label: "Command Console",
    path: "/command",
    kind: "core",
    status: "active",
    description: "Preserved Chernobog command console and command execution surface.",
    moduleId: "command-core",
    commands: ["run command", "continue workflow"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "command-center",
    label: "Command Center",
    path: "/command-center",
    kind: "core",
    status: "active",
    description: "Primary Chernobog operational home screen.",
    moduleId: "command-core",
    commands: ["open command center", "show command center"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "routes",
    label: "Route Matrix",
    path: "/routes",
    kind: "core",
    status: "active",
    description: "Registry-backed route directory and route health surface.",
    moduleId: "command-core",
    commands: ["show routes", "open route matrix"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "modules",
    label: "Modules",
    path: "/modules",
    kind: "module",
    status: "active",
    description: "Central directory of Chernobog capability modules.",
    moduleId: "command-core",
    commands: ["show modules", "open modules"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "vault",
    label: "Vault",
    path: "/vault",
    kind: "vault",
    status: "active",
    description: "Vault memory and project knowledge surface.",
    moduleId: "vault-brain",
    commands: ["open vault", "show vault"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "vault-inbox",
    label: "Vault Inbox",
    path: "/vault/inbox",
    kind: "vault",
    status: "experimental",
    description: "Inbox surface for raw and candidate vault memory.",
    moduleId: "vault-brain",
    commands: ["show vault inbox", "review latest vault entries"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "vault-memory",
    label: "Vault Memory",
    path: "/vault/memory",
    kind: "vault",
    status: "experimental",
    description: "Approved and searchable vault memory surface.",
    moduleId: "vault-brain",
    commands: ["show vault memory", "search approved memory"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "chernobog-inc",
    label: "Chernobog Inc",
    path: "/chernobog-inc",
    kind: "inc",
    status: "active",
    description: "Company-mode structure for Chernobog departments and leadership.",
    moduleId: "chernobog-inc",
    commands: ["show departments", "show company structure"],
    isPrimaryNavigation: true,
    isUserFacing: true,
  },
  {
    id: "review",
    label: "Review",
    path: "/review",
    kind: "review",
    status: "active",
    description: "General review workspace entry point.",
    moduleId: "vault-pr-review",
    commands: ["open review", "show reviews"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "review-vault-pr",
    label: "Vault PR Review Route",
    path: "/review/vault-pr/[id]",
    kind: "review",
    status: "active",
    description: "Dynamic review workspace for proposed vault changes.",
    moduleId: "vault-pr-review",
    commands: ["show vault pr", "review vault pr"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "vault-pr-live-discord-1780354391354",
    label: "Discord Vault PR Review",
    path: "/review/vault-pr/discord-vault-pr-1780354391354",
    kind: "review",
    status: "active",
    description: "Known real vault PR review instance for Discord ingest review.",
    moduleId: "live-vault-pr-review-module",
    commands: ["open discord vault pr", "review vault pr"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "saved-content-watch",
    label: "Saved Content Watch",
    path: "/review/saved-content/watch",
    kind: "review",
    status: "active",
    description: "Mass watch and review surface for saved content intake.",
    moduleId: "saved-content-review-module",
    commands: ["open saved content watch", "review saved content"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "review-schematic",
    label: "Schematic Review Route",
    path: "/review/schematic/[id]",
    kind: "review",
    status: "active",
    description: "Dynamic schematic review workspace for generated Minecraft schematics.",
    moduleId: "live-schematic-review-module",
    commands: ["review schematic", "open schematic review"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "schematic-review-ruined-outpost-2026-06-27",
    label: "Ruined Outpost Schematic Review",
    path: "/review/schematic/ruined_outpost-2026-06-27T20-00-29-855Z",
    kind: "review",
    status: "active",
    description: "Known real schematic review instance for the ruined outpost generation.",
    moduleId: "live-schematic-review-module",
    commands: ["open ruined outpost review", "review schematic"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "game-discovery",
    label: "Game Discovery",
    path: "/discover/games",
    kind: "module",
    status: "active",
    description: "Game discovery surface for browsing candidate games and acquisition leads.",
    moduleId: "game-discovery-module",
    commands: ["discover games", "open game discovery"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "presence",
    label: "Presence Display",
    path: "/presence",
    kind: "core",
    status: "active",
    description: "Classic Chernobog presence and identity display.",
    moduleId: "presence-display-module",
    commands: ["open presence", "show presence"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "debug",
    label: "Debug",
    path: "/debug",
    kind: "debug",
    status: "experimental",
    description: "Developer diagnostics and internal inspection surface.",
    moduleId: "debug-dev-tools",
    commands: ["show debug", "verify system"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    kind: "settings",
    status: "experimental",
    description: "Chernobog configuration and user-facing settings surface.",
    moduleId: "command-core",
    commands: ["open settings", "show settings"],
    isPrimaryNavigation: false,
    isUserFacing: true,
  },
  {
    id: "api-session",
    label: "Session API",
    path: "/api/session",
    kind: "api",
    status: "active",
    description: "Internal session and command state API.",
    moduleId: "command-core",
    isPrimaryNavigation: false,
    isUserFacing: false,
  },
  {
    id: "api-discord-vault-pr",
    label: "Discord Vault PR API",
    path: "/api/discord/vault-pr/[id]",
    kind: "api",
    status: "active",
    description: "Internal API for Discord vault pull request review data.",
    moduleId: "vault-pr-review",
    isPrimaryNavigation: false,
    isUserFacing: false,
  },
  {
    id: "api-chernobog-status",
    label: "Chernobog Status API",
    path: "/api/chernobog/status",
    kind: "api",
    status: "experimental",
    description: "Read-only operational status snapshot for the Command Center.",
    moduleId: "command-core",
    isPrimaryNavigation: false,
    isUserFacing: false,
  },
];

export function getAllChernobogRoutes(): ChernobogRoute[] {
  return [...CHERNOBOG_ROUTES];
}

export function getUserFacingRoutes(): ChernobogRoute[] {
  return CHERNOBOG_ROUTES.filter((route) => route.isUserFacing !== false);
}

export function getPrimaryNavigationRoutes(): ChernobogRoute[] {
  return CHERNOBOG_ROUTES.filter((route) => route.isPrimaryNavigation === true);
}

export function getRoutesByKind(kind: ChernobogRouteKind): ChernobogRoute[] {
  return CHERNOBOG_ROUTES.filter((route) => route.kind === kind);
}

export function getRoutesByStatus(
  status: ChernobogRouteStatus,
): ChernobogRoute[] {
  return CHERNOBOG_ROUTES.filter((route) => route.status === status);
}

export function findChernobogRouteById(
  id: string,
): ChernobogRoute | undefined {
  return CHERNOBOG_ROUTES.find((route) => route.id === id);
}

export function getRoutesForModule(moduleId: string): ChernobogRoute[] {
  return CHERNOBOG_ROUTES.filter((route) => route.moduleId === moduleId);
}