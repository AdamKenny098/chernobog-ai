import path from "node:path";
import { promises as fs } from "node:fs";
import { normalizeProjectId, normalizeVersion } from "./projectScope";

export const PROJECT_MEMORY_PROFILE_STATUSES = [
  "active",
  "paused",
  "archived",
] as const;

export type ProjectMemoryProfileStatus = (typeof PROJECT_MEMORY_PROFILE_STATUSES)[number];

export const VERSION_MEMORY_PROFILE_STATUSES = [
  "planned",
  "active",
  "completed",
  "paused",
  "superseded",
] as const;

export type VersionMemoryProfileStatus = (typeof VERSION_MEMORY_PROFILE_STATUSES)[number];

export type ProjectMemoryProfile = {
  projectId: string;
  displayName: string;
  description?: string;
  aliases: string[];
  status: ProjectMemoryProfileStatus;
  currentVersion?: string;
  latestCompletedVersion?: string;
  nextRecommendedVersion?: string;
  activeFocus?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectMemoryProfileInput = {
  projectId: string;
  displayName?: string;
  description?: string;
  aliases?: string[];
  status?: ProjectMemoryProfileStatus;
  currentVersion?: string;
  latestCompletedVersion?: string;
  nextRecommendedVersion?: string;
  activeFocus?: string;
  tags?: string[];
};

export type VersionMemoryProfile = {
  id: string;
  projectId: string;
  version: string;
  title: string;
  status: VersionMemoryProfileStatus;
  summary?: string;
  previousVersion?: string;
  nextVersion?: string;
  tags: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VersionMemoryProfileInput = {
  projectId: string;
  version: string;
  title?: string;
  status?: VersionMemoryProfileStatus;
  summary?: string;
  previousVersion?: string;
  nextVersion?: string;
  tags?: string[];
  startedAt?: string;
  completedAt?: string;
};

export type CurrentProjectMemoryState = {
  activeProjectId?: string;
  activeVersion?: string;
  latestCompletedVersion?: string;
  nextRecommendedVersion?: string;
  note?: string;
  updatedAt: string;
};

export type ProjectMemoryProfileAuditEvent = {
  id: string;
  action:
    | "project-upserted"
    | "version-upserted"
    | "active-project-set"
    | "active-version-set"
    | "latest-completed-set"
    | "next-recommended-set";
  projectId?: string;
  version?: string;
  note?: string;
  createdAt: string;
};

export type ProjectMemoryProfileStorePaths = {
  rootDir: string;
  profilesPath: string;
  versionsPath: string;
  currentStatePath: string;
  auditLogPath: string;
};

export type ProjectMemoryProfileStoreOptions = {
  rootDir?: string;
};

const DEFAULT_PROJECT_PROFILE_ROOT = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "vault-brain",
  "project-profiles"
);

const DEFAULT_PROJECT_NAMES: Record<string, string> = {
  chernobog: "Chernobog",
  "polar-night": "Polar Night",
  "sirio-craft": "SirioCraft",
  questledger: "QuestLedger",
  "098-forge": "098 Forge",
};

const DEFAULT_PROJECT_ALIASES: Record<string, string[]> = {
  chernobog: ["chernobog", "chernobog-ai", "chernobog ai", "vault brain"],
  "polar-night": ["polar night", "polarnight"],
  "sirio-craft": ["sirio", "siriocraft", "sirio craft"],
  questledger: ["questledger", "quest ledger"],
  "098-forge": ["098 forge", "098forge"],
};

function stableId(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${stamp}-${random}`;
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function titleCaseProject(projectId: string): string {
  return DEFAULT_PROJECT_NAMES[projectId] ?? projectId
    .split("-")
    .map((part) => part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : part)
    .join(" ");
}

function versionProfileId(projectId: string, version: string): string {
  return `${projectId}:${version}`;
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sortProfiles(profiles: ProjectMemoryProfile[]): ProjectMemoryProfile[] {
  return [...profiles].sort((a, b) => a.projectId.localeCompare(b.projectId));
}

function sortVersions(versions: VersionMemoryProfile[]): VersionMemoryProfile[] {
  return [...versions].sort(
    (a, b) => a.projectId.localeCompare(b.projectId) || a.version.localeCompare(b.version)
  );
}

export class ProjectMemoryProfileStore {
  readonly paths: ProjectMemoryProfileStorePaths;

  constructor(options: ProjectMemoryProfileStoreOptions = {}) {
    const rootDir = options.rootDir ?? process.env.CHERNOBOG_PROJECT_PROFILE_ROOT ?? DEFAULT_PROJECT_PROFILE_ROOT;
    this.paths = {
      rootDir,
      profilesPath: path.join(rootDir, "profiles.json"),
      versionsPath: path.join(rootDir, "versions.json"),
      currentStatePath: path.join(rootDir, "current-state.json"),
      auditLogPath: path.join(rootDir, "audit-log.json"),
    };
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.paths.rootDir, { recursive: true });
    await this.saveProfiles(await this.loadProfiles());
    await this.saveVersions(await this.loadVersions());
    await this.saveCurrentState(await this.loadCurrentState());
  }

  async loadProfiles(): Promise<ProjectMemoryProfile[]> {
    return readJsonFile<ProjectMemoryProfile[]>(this.paths.profilesPath, []);
  }

  async saveProfiles(profiles: ProjectMemoryProfile[]): Promise<ProjectMemoryProfile[]> {
    const sorted = sortProfiles(profiles);
    await writeJsonFile(this.paths.profilesPath, sorted);
    return sorted;
  }

  async loadVersions(): Promise<VersionMemoryProfile[]> {
    return readJsonFile<VersionMemoryProfile[]>(this.paths.versionsPath, []);
  }

  async saveVersions(versions: VersionMemoryProfile[]): Promise<VersionMemoryProfile[]> {
    const sorted = sortVersions(versions);
    await writeJsonFile(this.paths.versionsPath, sorted);
    return sorted;
  }

  async loadCurrentState(): Promise<CurrentProjectMemoryState> {
    return readJsonFile<CurrentProjectMemoryState>(this.paths.currentStatePath, {
      activeProjectId: undefined,
      activeVersion: undefined,
      latestCompletedVersion: undefined,
      nextRecommendedVersion: undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  async saveCurrentState(state: CurrentProjectMemoryState): Promise<CurrentProjectMemoryState> {
    const next = {
      ...state,
      activeProjectId: state.activeProjectId ? normalizeProjectId(state.activeProjectId) : undefined,
      activeVersion: normalizeVersion(state.activeVersion),
      latestCompletedVersion: normalizeVersion(state.latestCompletedVersion),
      nextRecommendedVersion: normalizeVersion(state.nextRecommendedVersion),
      updatedAt: state.updatedAt || new Date().toISOString(),
    } satisfies CurrentProjectMemoryState;

    await writeJsonFile(this.paths.currentStatePath, next);
    return next;
  }

  async loadAuditLog(): Promise<ProjectMemoryProfileAuditEvent[]> {
    return readJsonFile<ProjectMemoryProfileAuditEvent[]>(this.paths.auditLogPath, []);
  }

  async appendAuditEvent(
    event: Omit<ProjectMemoryProfileAuditEvent, "id" | "createdAt">
  ): Promise<ProjectMemoryProfileAuditEvent> {
    const audit = await this.loadAuditLog();
    const next: ProjectMemoryProfileAuditEvent = {
      id: stableId("project-audit"),
      createdAt: new Date().toISOString(),
      ...event,
    };

    audit.push(next);
    await writeJsonFile(this.paths.auditLogPath, audit);
    return next;
  }

  async resolveProjectId(input?: string): Promise<string | undefined> {
    const normalized = normalizeProjectId(input);
    if (!normalized) {
      return undefined;
    }

    const profiles = await this.loadProfiles();
    const matched = profiles.find(
      (profile) =>
        profile.projectId === normalized ||
        profile.aliases.some((alias) => normalizeProjectId(alias) === normalized || alias === input?.trim().toLowerCase())
    );

    return matched?.projectId ?? normalized;
  }

  async listProfiles(): Promise<ProjectMemoryProfile[]> {
    return this.loadProfiles();
  }

  async getProfile(projectIdOrAlias: string): Promise<ProjectMemoryProfile | undefined> {
    const projectId = await this.resolveProjectId(projectIdOrAlias);
    if (!projectId) {
      return undefined;
    }

    const profiles = await this.loadProfiles();
    return profiles.find((profile) => profile.projectId === projectId);
  }

  async upsertProfile(input: ProjectMemoryProfileInput): Promise<ProjectMemoryProfile> {
    const now = new Date().toISOString();
    const projectId = normalizeProjectId(input.projectId);
    if (!projectId) {
      throw new Error("Project profile requires a projectId.");
    }

    const profiles = await this.loadProfiles();
    const index = profiles.findIndex((profile) => profile.projectId === projectId);
    const existing = index >= 0 ? profiles[index] : undefined;
    const aliases = unique([
      projectId,
      ...(DEFAULT_PROJECT_ALIASES[projectId] ?? []),
      ...(existing?.aliases ?? []),
      ...(input.aliases ?? []),
    ]);

    const next: ProjectMemoryProfile = {
      projectId,
      displayName: input.displayName?.trim() || existing?.displayName || titleCaseProject(projectId),
      description: input.description ?? existing?.description,
      aliases,
      status: input.status ?? existing?.status ?? "active",
      currentVersion: normalizeVersion(input.currentVersion) ?? existing?.currentVersion,
      latestCompletedVersion: normalizeVersion(input.latestCompletedVersion) ?? existing?.latestCompletedVersion,
      nextRecommendedVersion: normalizeVersion(input.nextRecommendedVersion) ?? existing?.nextRecommendedVersion,
      activeFocus: input.activeFocus ?? existing?.activeFocus,
      tags: unique([...(existing?.tags ?? []), ...(input.tags ?? [])]),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (index >= 0) {
      profiles[index] = next;
    } else {
      profiles.push(next);
    }

    await this.saveProfiles(profiles);
    await this.appendAuditEvent({
      action: "project-upserted",
      projectId,
      note: `Project memory profile upserted for ${projectId}.`,
    });

    return next;
  }

  async listVersions(filter: { projectId?: string } = {}): Promise<VersionMemoryProfile[]> {
    const projectId = await this.resolveProjectId(filter.projectId);
    const versions = await this.loadVersions();
    return projectId ? versions.filter((version) => version.projectId === projectId) : versions;
  }

  async getVersion(
    projectIdOrAlias: string,
    versionInput: string
  ): Promise<VersionMemoryProfile | undefined> {
    const projectId = await this.resolveProjectId(projectIdOrAlias);
    const version = normalizeVersion(versionInput);
    if (!projectId || !version) {
      return undefined;
    }

    const versions = await this.loadVersions();
    return versions.find((item) => item.projectId === projectId && item.version === version);
  }

  async upsertVersion(input: VersionMemoryProfileInput): Promise<VersionMemoryProfile> {
    const now = new Date().toISOString();
    const projectId = await this.resolveProjectId(input.projectId);
    const version = normalizeVersion(input.version);

    if (!projectId || !version) {
      throw new Error("Version memory profile requires a projectId and version.");
    }

    await this.upsertProfile({ projectId });

    const versions = await this.loadVersions();
    const id = versionProfileId(projectId, version);
    const index = versions.findIndex((item) => item.id === id);
    const existing = index >= 0 ? versions[index] : undefined;

    const next: VersionMemoryProfile = {
      id,
      projectId,
      version,
      title: input.title?.trim() || existing?.title || `${titleCaseProject(projectId)} ${version}`,
      status: input.status ?? existing?.status ?? "planned",
      summary: input.summary ?? existing?.summary,
      previousVersion: normalizeVersion(input.previousVersion) ?? existing?.previousVersion,
      nextVersion: normalizeVersion(input.nextVersion) ?? existing?.nextVersion,
      tags: unique([...(existing?.tags ?? []), ...(input.tags ?? [])]),
      startedAt: input.startedAt ?? existing?.startedAt,
      completedAt: input.completedAt ?? existing?.completedAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (index >= 0) {
      versions[index] = next;
    } else {
      versions.push(next);
    }

    await this.saveVersions(versions);
    await this.appendAuditEvent({
      action: "version-upserted",
      projectId,
      version,
      note: `Version memory profile upserted for ${projectId} ${version}.`,
    });

    return next;
  }

  async setActiveProject(projectIdOrAlias: string, note?: string): Promise<CurrentProjectMemoryState> {
    const projectId = await this.resolveProjectId(projectIdOrAlias);
    if (!projectId) {
      throw new Error("Cannot set active project without a project id.");
    }

    const profile = await this.upsertProfile({ projectId, status: "active" });
    const current = await this.loadCurrentState();
    const state = await this.saveCurrentState({
      ...current,
      activeProjectId: profile.projectId,
      activeVersion: profile.currentVersion ?? current.activeVersion,
      latestCompletedVersion: profile.latestCompletedVersion ?? current.latestCompletedVersion,
      nextRecommendedVersion: profile.nextRecommendedVersion ?? current.nextRecommendedVersion,
      note: note ?? current.note,
      updatedAt: new Date().toISOString(),
    });

    await this.appendAuditEvent({
      action: "active-project-set",
      projectId: profile.projectId,
      note: note ?? `Active project set to ${profile.projectId}.`,
    });

    return state;
  }

  async setActiveVersion(versionInput: string, projectIdOrAlias?: string): Promise<CurrentProjectMemoryState> {
    const current = await this.loadCurrentState();
    const projectId = await this.resolveProjectId(projectIdOrAlias ?? current.activeProjectId ?? "chernobog");
    const version = normalizeVersion(versionInput);

    if (!projectId || !version) {
      throw new Error("Cannot set active version without a project id and version.");
    }

    await this.upsertVersion({ projectId, version, status: "active" });
    await this.upsertProfile({ projectId, currentVersion: version });

    const state = await this.saveCurrentState({
      ...current,
      activeProjectId: projectId,
      activeVersion: version,
      updatedAt: new Date().toISOString(),
    });

    await this.appendAuditEvent({
      action: "active-version-set",
      projectId,
      version,
      note: `Active version set to ${projectId} ${version}.`,
    });

    return state;
  }

  async markLatestCompleted(versionInput: string, projectIdOrAlias?: string): Promise<CurrentProjectMemoryState> {
    const current = await this.loadCurrentState();
    const projectId = await this.resolveProjectId(projectIdOrAlias ?? current.activeProjectId ?? "chernobog");
    const version = normalizeVersion(versionInput);

    if (!projectId || !version) {
      throw new Error("Cannot mark latest completed version without a project id and version.");
    }

    await this.upsertVersion({
      projectId,
      version,
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    await this.upsertProfile({ projectId, latestCompletedVersion: version });

    const state = await this.saveCurrentState({
      ...current,
      activeProjectId: projectId,
      latestCompletedVersion: version,
      updatedAt: new Date().toISOString(),
    });

    await this.appendAuditEvent({
      action: "latest-completed-set",
      projectId,
      version,
      note: `Latest completed version set to ${projectId} ${version}.`,
    });

    return state;
  }

  async setNextRecommended(versionInput: string, projectIdOrAlias?: string): Promise<CurrentProjectMemoryState> {
    const current = await this.loadCurrentState();
    const projectId = await this.resolveProjectId(projectIdOrAlias ?? current.activeProjectId ?? "chernobog");
    const version = normalizeVersion(versionInput);

    if (!projectId || !version) {
      throw new Error("Cannot set next recommended version without a project id and version.");
    }

    await this.upsertVersion({ projectId, version, status: "planned" });
    await this.upsertProfile({ projectId, nextRecommendedVersion: version });

    const state = await this.saveCurrentState({
      ...current,
      activeProjectId: projectId,
      nextRecommendedVersion: version,
      updatedAt: new Date().toISOString(),
    });

    await this.appendAuditEvent({
      action: "next-recommended-set",
      projectId,
      version,
      note: `Next recommended version set to ${projectId} ${version}.`,
    });

    return state;
  }
}

export function createProjectMemoryProfileStore(
  options: ProjectMemoryProfileStoreOptions = {}
): ProjectMemoryProfileStore {
  return new ProjectMemoryProfileStore(options);
}
