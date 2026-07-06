export type ChernobogModuleStatus =
  | "active"
  | "experimental"
  | "planned"
  | "deprecated"
  | "unknown";

export type ChernobogModule = {
  id: string;
  label: string;
  status: ChernobogModuleStatus;
  description: string;
  relatedRouteIds: string[];
  relatedCommands: string[];
  ownerDepartment: string;
  category: string;
};

export const CHERNOBOG_MODULES: ChernobogModule[] = [
  {
    id: "command-core",
    label: "Command Core",
    status: "active",
    description:
      "Command console, command center, route registry, and operational navigation.",
    relatedRouteIds: ["command", "command-center", "routes"],
    relatedCommands: ["run command", "continue workflow", "show routes"],
    ownerDepartment: "Operations Department",
    category: "Core",
  },
  {
    id: "vault-brain",
    label: "Vault Brain",
    status: "active",
    description:
      "Vault-grounded memory, recall, inbox review, and project knowledge foundation.",
    relatedRouteIds: ["vault", "vault-inbox", "vault-memory"],
    relatedCommands: [
      "show vault inbox",
      "search approved memory",
      "answer from vault only",
    ],
    ownerDepartment: "Vault / Archivist Department",
    category: "Memory",
  },
  {
    id: "chernobog-inc",
    label: "Chernobog Inc",
    status: "active",
    description:
      "Company-mode operating structure with departments, roles, and project leadership.",
    relatedRouteIds: ["chernobog-inc", "command-center"],
    relatedCommands: ["show departments", "show company structure"],
    ownerDepartment: "Executive Office",
    category: "Organization",
  },
  {
    id: "discord-ingest",
    label: "Discord Ingest",
    status: "active",
    description:
      "Discord intake, triage, idea extraction, and vault proposal workflow.",
    relatedRouteIds: ["review", "review-vault-pr"],
    relatedCommands: [
      "discord triage ideas",
      "create vault pr from triage plan",
    ],
    ownerDepartment: "Vault / Archivist Department",
    category: "Ingest",
  },
  {
    id: "vault-pr-review",
    label: "Vault PR Review",
    status: "active",
    description:
      "Approval UI for proposed vault changes before they are applied to memory.",
    relatedRouteIds: ["review", "review-vault-pr"],
    relatedCommands: ["show vault pr", "approve change", "apply vault pr"],
    ownerDepartment: "QA Department",
    category: "Review",
  },
  {
    id: "saved-content-review-module",
    label: "Saved Content Watch",
    status: "active",
    description: "Mass watch/review surface for saved content intake.",
    relatedRouteIds: ["saved-content-watch"],
    relatedCommands: ["open saved content watch", "review saved content"],
    ownerDepartment: "Vault / Archivist Department",
    category: "Review",
  },
  {
    id: "game-discovery-module",
    label: "Game Discovery",
    status: "active",
    description:
      "Game discovery module for candidate browsing and acquisition review.",
    relatedRouteIds: ["game-discovery"],
    relatedCommands: ["discover games", "open game discovery"],
    ownerDepartment: "Operations Department",
    category: "Discovery",
  },
  {
    id: "presence-display-module",
    label: "Presence Display",
    status: "active",
    description: "Classic Chernobog presence and identity display.",
    relatedRouteIds: ["presence"],
    relatedCommands: ["open presence", "show presence"],
    ownerDepartment: "Operations Department",
    category: "Core",
  },
  {
    id: "live-vault-pr-review-module",
    label: "Live Vault PR Review",
    status: "active",
    description:
      "Direct known vault PR review instance for active Discord ingest review.",
    relatedRouteIds: [
      "vault-pr-live-discord-1780354391354",
      "review-vault-pr",
    ],
    relatedCommands: ["open discord vault pr", "review vault pr"],
    ownerDepartment: "Vault / Archivist Department",
    category: "Review",
  },
  {
    id: "live-schematic-review-module",
    label: "Live Schematic Review",
    status: "active",
    description:
      "Direct known schematic review instance plus dynamic schematic review route.",
    relatedRouteIds: [
      "schematic-review-ruined-outpost-2026-06-27",
      "review-schematic",
    ],
    relatedCommands: ["open ruined outpost review", "review schematic"],
    ownerDepartment: "Design Department",
    category: "Minecraft Schematic",
  },
  {
    id: "schematic-generator",
    label: "Schematic Generator",
    status: "experimental",
    description:
      "Minecraft schematic generation, palette planning, and build tooling surface.",
    relatedRouteIds: ["modules", "review-schematic"],
    relatedCommands: ["generate schematic", "show schematic library"],
    ownerDepartment: "Design Department",
    category: "Creative Tools",
  },
  {
    id: "content-ingest",
    label: "Content Ingest",
    status: "experimental",
    description:
      "YouTube, TikTok, and external content intake workflows for later review and vault use.",
    relatedRouteIds: ["modules", "saved-content-watch"],
    relatedCommands: ["scan tiktok archive", "ingest youtube playlist"],
    ownerDepartment: "Vault / Archivist Department",
    category: "Ingest",
  },
  {
    id: "debug-dev-tools",
    label: "Debug / Dev Tools",
    status: "experimental",
    description:
      "Developer diagnostics, verification helpers, and internal inspection surfaces.",
    relatedRouteIds: ["debug", "routes"],
    relatedCommands: ["show debug", "verify system"],
    ownerDepartment: "Security Department",
    category: "Development",
  },
];

export function getAllChernobogModules(): ChernobogModule[] {
  return [...CHERNOBOG_MODULES];
}

export function findChernobogModuleById(
  id: string,
): ChernobogModule | undefined {
  return CHERNOBOG_MODULES.find((module) => module.id === id);
}

export function getModulesByStatus(
  status: ChernobogModuleStatus,
): ChernobogModule[] {
  return CHERNOBOG_MODULES.filter((module) => module.status === status);
}

export function getModulesByDepartment(
  ownerDepartment: string,
): ChernobogModule[] {
  return CHERNOBOG_MODULES.filter(
    (module) => module.ownerDepartment === ownerDepartment,
  );
}