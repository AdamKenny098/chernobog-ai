import { createVaultMemoryStore } from "./memoryStore";
import type { VaultMemoryEntry, VaultMemoryType } from "./memoryTypes";
import { normalizeProjectId, normalizeVersion } from "./projectScope";
import { resolveProjectMemoryScope } from "./projectMemoryScope";
import {
  createProjectMemoryProfileStore,
  type ProjectMemoryProfile,
  type VersionMemoryProfile,
} from "./projectProfileStore";
import type {
  CurrentStateBriefingPolicy,
  CurrentStateBriefingRequest,
  CurrentStateBriefingResult,
  CurrentStateBriefingSection,
  CurrentStateBriefingSectionKey,
  CurrentStateBriefingSource,
} from "./currentStateBriefingTypes";

const BRIEFING_MEMORY_TYPES: VaultMemoryType[] = [
  "project-state",
  "roadmap",
  "decision",
  "task",
  "bug",
  "summary",
  "code-summary",
];

const SECTION_CONFIG: Array<{
  key: CurrentStateBriefingSectionKey;
  title: string;
  memoryTypes: VaultMemoryType[];
}> = [
  {
    key: "project-state",
    title: "Project State",
    memoryTypes: ["project-state"],
  },
  {
    key: "roadmap",
    title: "Roadmap",
    memoryTypes: ["roadmap"],
  },
  {
    key: "decisions",
    title: "Decisions",
    memoryTypes: ["decision"],
  },
  {
    key: "tasks",
    title: "Tasks",
    memoryTypes: ["task"],
  },
  {
    key: "bugs",
    title: "Bugs / Fixes",
    memoryTypes: ["bug"],
  },
  {
    key: "summaries",
    title: "Summaries",
    memoryTypes: ["summary"],
  },
  {
    key: "code-summaries",
    title: "Code Summaries",
    memoryTypes: ["code-summary"],
  },
];

export function getCurrentStateBriefingPolicy(): CurrentStateBriefingPolicy {
  return {
    approvedOnly: true,
    allowRawMemory: false,
    allowCandidateMemory: false,
    allowReviewedMemory: false,
    allowOutsideModelMemory: false,
  };
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 5;
  }

  return Math.max(1, Math.min(12, Math.floor(value)));
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(body: string, maxLength = 420): string {
  const clean = compact(body);
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function hasUsefulVersion(entry: VaultMemoryEntry, version: string | undefined): boolean {
  if (!version) {
    return true;
  }

  return !entry.version || normalizeVersion(entry.version) === version;
}

function toSource(entry: VaultMemoryEntry): CurrentStateBriefingSource {
  return {
    id: entry.id,
    title: entry.title,
    memoryType: entry.memoryType,
    projectId: entry.projectId,
    version: entry.version,
    confidence: entry.confidence,
    updatedAt: entry.updatedAt,
    excerpt: excerpt(entry.body),
  };
}

function sortEntries(entries: VaultMemoryEntry[]): VaultMemoryEntry[] {
  return [...entries].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function buildSections(args: {
  entries: VaultMemoryEntry[];
  limitPerSection: number;
  includeCodeSummaries: boolean;
}): CurrentStateBriefingSection[] {
  return SECTION_CONFIG
    .filter((section) => args.includeCodeSummaries || section.key !== "code-summaries")
    .map((section) => {
      const sources = sortEntries(
        args.entries.filter((entry) => section.memoryTypes.includes(entry.memoryType))
      )
        .slice(0, args.limitPerSection)
        .map(toSource);

      return {
        key: section.key,
        title: section.title,
        sources,
      };
    });
}

function formatProfileLine(profile: ProjectMemoryProfile | undefined): string {
  if (!profile) {
    return "Project profile: missing";
  }

  return `Project profile: ${profile.displayName} (${profile.projectId})`;
}

function formatVersionLine(label: string, profile: VersionMemoryProfile | undefined, fallback: string | undefined): string {
  const version = profile?.version ?? fallback;
  if (!version) {
    return `${label}: not set`;
  }

  const status = profile?.status ? ` (${profile.status})` : "";
  return `${label}: ${version}${status}`;
}

function formatSectionForSummary(section: CurrentStateBriefingSection): string[] {
  if (section.sources.length === 0) {
    return [`${section.title}: no approved memory found.`];
  }

  return [
    `${section.title}:`,
    ...section.sources.map((source) => {
      const scope = [source.version, source.memoryType].filter(Boolean).join(" / ");
      return `- ${source.title}${scope ? ` (${scope})` : ""}`;
    }),
  ];
}

function buildSummary(args: {
  query: string;
  projectId?: string;
  version?: string;
  projectProfile?: ProjectMemoryProfile;
  activeVersionProfile?: VersionMemoryProfile;
  latestCompletedVersionProfile?: VersionMemoryProfile;
  nextRecommendedVersionProfile?: VersionMemoryProfile;
  currentActiveVersion?: string;
  currentLatestCompletedVersion?: string;
  currentNextRecommendedVersion?: string;
  sections: CurrentStateBriefingSection[];
  warnings: string[];
}): string {
  const populatedSections = args.sections.filter((section) => section.sources.length > 0);
  const sectionLines = populatedSections.length > 0
    ? populatedSections.flatMap(formatSectionForSummary)
    : ["No approved structured memory was found for the selected project/version scope."];

  const warningLines = args.warnings.length > 0
    ? ["", "Warnings:", ...args.warnings.map((warning) => `- ${warning}`)]
    : [];

  return [
    "Current State Briefing",
    "",
    `Query: ${args.query}`,
    args.projectId ? `Project: ${args.projectId}` : "Project: unresolved",
    args.version ? `Version scope: ${args.version}` : "Version scope: project-level / current",
    formatProfileLine(args.projectProfile),
    formatVersionLine("Active version", args.activeVersionProfile, args.currentActiveVersion),
    formatVersionLine("Latest completed", args.latestCompletedVersionProfile, args.currentLatestCompletedVersion),
    formatVersionLine("Next recommended", args.nextRecommendedVersionProfile, args.currentNextRecommendedVersion),
    "",
    "This briefing uses approved structured vault memory only.",
    "",
    ...sectionLines,
    ...warningLines,
  ].join("\n");
}

async function getVersionProfile(
  projectId: string | undefined,
  version: string | undefined
): Promise<VersionMemoryProfile | undefined> {
  if (!projectId || !version) {
    return undefined;
  }

  const store = createProjectMemoryProfileStore();
  return store.getVersion(projectId, version);
}

export async function generateCurrentStateBriefing(
  request: CurrentStateBriefingRequest = {}
): Promise<CurrentStateBriefingResult> {
  const query = request.query?.trim() || "current state briefing";
  const projectStore = createProjectMemoryProfileStore();
  const memoryStore = createVaultMemoryStore();
  const currentState = await projectStore.loadCurrentState();
  const scope = await resolveProjectMemoryScope({
    query,
    projectId: request.projectId,
    version: request.version,
  });

  const projectId = normalizeProjectId(scope.projectId ?? currentState.activeProjectId);
  const version = normalizeVersion(scope.version ?? currentState.activeVersion);
  const limitPerSection = normalizeLimit(request.limitPerSection);
  const includeCodeSummaries = request.includeCodeSummaries ?? true;
  const warnings = [...scope.warnings];

  const projectProfile = projectId ? await projectStore.getProfile(projectId) : undefined;
  const activeVersion = normalizeVersion(currentState.activeVersion ?? projectProfile?.currentVersion ?? version);
  const latestCompletedVersion = normalizeVersion(
    currentState.latestCompletedVersion ?? projectProfile?.latestCompletedVersion
  );
  const nextRecommendedVersion = normalizeVersion(
    currentState.nextRecommendedVersion ?? projectProfile?.nextRecommendedVersion
  );

  const allApproved = await memoryStore.listEntries({
    statuses: ["approved"],
    projectId,
    memoryTypes: BRIEFING_MEMORY_TYPES,
    limit: 10000,
  });

  const scopedEntries = allApproved.filter((entry) => hasUsefulVersion(entry, version));
  const sections = buildSections({
    entries: scopedEntries,
    limitPerSection,
    includeCodeSummaries,
  });
  const sourceEntryIds = Array.from(
    new Set(sections.flatMap((section) => section.sources.map((source) => source.id)))
  );

  if (!projectId) {
    warnings.push("No project scope could be resolved for the current state briefing.");
  }

  if (!projectProfile && projectId) {
    warnings.push(`No project profile exists for ${projectId}.`);
  }

  if (allApproved.length === 0) {
    warnings.push("No approved structured memory exists for the selected project scope.");
  } else if (scopedEntries.length === 0 && version) {
    warnings.push(`Approved project memory exists, but none matched version ${version} or project-level scope.`);
  }

  const activeVersionProfile = await getVersionProfile(projectId, activeVersion);
  const latestCompletedVersionProfile = await getVersionProfile(projectId, latestCompletedVersion);
  const nextRecommendedVersionProfile = await getVersionProfile(projectId, nextRecommendedVersion);

  const summary = buildSummary({
    query,
    projectId,
    version,
    projectProfile,
    activeVersionProfile,
    latestCompletedVersionProfile,
    nextRecommendedVersionProfile,
    currentActiveVersion: activeVersion,
    currentLatestCompletedVersion: latestCompletedVersion,
    currentNextRecommendedVersion: nextRecommendedVersion,
    sections,
    warnings,
  });

  return {
    ok: sourceEntryIds.length > 0 || Boolean(projectProfile) || Boolean(currentState.activeProjectId),
    generatedAt: new Date().toISOString(),
    query,
    projectId,
    version,
    currentState,
    projectProfile,
    activeVersionProfile,
    latestCompletedVersionProfile,
    nextRecommendedVersionProfile,
    summary,
    sections,
    sourceEntryIds,
    warnings,
    policy: getCurrentStateBriefingPolicy(),
  };
}

export function formatCurrentStateBriefing(result: CurrentStateBriefingResult): string {
  const sourceBlock = result.sourceEntryIds.length > 0
    ? ["", "Source entry IDs:", ...result.sourceEntryIds.map((id) => `- ${id}`)].join("\n")
    : "";

  return `${result.summary}${sourceBlock}`;
}
