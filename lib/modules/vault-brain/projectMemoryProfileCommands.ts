import type { VaultBrainCommandResult } from "./types";
import {
  createProjectMemoryProfileStore,
  type CurrentProjectMemoryState,
  type ProjectMemoryProfile,
  type VersionMemoryProfile,
} from "./projectProfileStore";
import { resolveProjectMemoryScope } from "./projectMemoryScope";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function getCommandValue(command: string, pattern: RegExp): string | undefined {
  const match = command.match(pattern);
  return match?.[1]?.trim();
}

function formatState(state: CurrentProjectMemoryState): string {
  return [
    "Current Project Memory State",
    `Active project: ${state.activeProjectId ?? "none"}`,
    `Active version: ${state.activeVersion ?? "none"}`,
    `Latest completed: ${state.latestCompletedVersion ?? "none"}`,
    `Next recommended: ${state.nextRecommendedVersion ?? "none"}`,
    state.note ? `Note: ${state.note}` : undefined,
    `Updated: ${state.updatedAt}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatProfileLine(profile: ProjectMemoryProfile): string {
  return [
    `${profile.displayName} (${profile.projectId})`,
    `Status: ${profile.status}`,
    profile.currentVersion ? `Current: ${profile.currentVersion}` : undefined,
    profile.latestCompletedVersion ? `Latest completed: ${profile.latestCompletedVersion}` : undefined,
    profile.nextRecommendedVersion ? `Next: ${profile.nextRecommendedVersion}` : undefined,
    profile.activeFocus ? `Focus: ${profile.activeFocus}` : undefined,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatProfileDetail(profile: ProjectMemoryProfile): string {
  return [
    `${profile.displayName} (${profile.projectId})`,
    `Status: ${profile.status}`,
    profile.description ? `Description: ${profile.description}` : undefined,
    `Aliases: ${profile.aliases.length > 0 ? profile.aliases.join(", ") : "none"}`,
    `Current version: ${profile.currentVersion ?? "none"}`,
    `Latest completed: ${profile.latestCompletedVersion ?? "none"}`,
    `Next recommended: ${profile.nextRecommendedVersion ?? "none"}`,
    profile.activeFocus ? `Active focus: ${profile.activeFocus}` : undefined,
    `Tags: ${profile.tags.length > 0 ? profile.tags.join(", ") : "none"}`,
    `Created: ${profile.createdAt}`,
    `Updated: ${profile.updatedAt}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatVersionLine(version: VersionMemoryProfile): string {
  return [
    `${version.projectId} ${version.version} — ${version.title}`,
    `Status: ${version.status}`,
    version.summary ? `Summary: ${version.summary}` : undefined,
    version.previousVersion ? `Previous: ${version.previousVersion}` : undefined,
    version.nextVersion ? `Next: ${version.nextVersion}` : undefined,
    version.completedAt ? `Completed: ${version.completedAt}` : undefined,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatAliasList(profiles: ProjectMemoryProfile[]): string {
  if (profiles.length === 0) {
    return "No project profiles exist yet.";
  }

  return profiles
    .map((profile) => `${profile.projectId}: ${profile.aliases.join(", ") || "none"}`)
    .join("\n");
}

export function isProjectMemoryProfileCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show project memory profiles$/i.test(normalized) ||
    /^show project aliases$/i.test(normalized) ||
    /^show project profile\s+.+$/i.test(normalized) ||
    /^show version profile\s+\S+\s+\S+$/i.test(normalized) ||
    /^show current project state$/i.test(normalized) ||
    /^show memory scope(?:\s+.+)?$/i.test(normalized) ||
    /^set active project\s+.+$/i.test(normalized) ||
    /^set current project\s+.+$/i.test(normalized) ||
    /^set active version\s+\S+$/i.test(normalized) ||
    /^set current version\s+\S+$/i.test(normalized) ||
    /^mark latest completed\s+\S+$/i.test(normalized) ||
    /^set next milestone\s+\S+$/i.test(normalized)
  );
}

export async function executeProjectMemoryProfileCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);
  const store = createProjectMemoryProfileStore();

  if (/^show project memory profiles$/i.test(normalized)) {
    const profiles = await store.listProfiles();
    return {
      ok: true,
      title: "Project Memory Profiles",
      message: profiles.length > 0
        ? profiles.map(formatProfileLine).join("\n\n")
        : "No project memory profiles exist yet.",
      data: profiles,
    };
  }

  if (/^show project aliases$/i.test(normalized)) {
    const profiles = await store.listProfiles();
    return {
      ok: true,
      title: "Project Memory Aliases",
      message: formatAliasList(profiles),
      data: profiles,
    };
  }

  const profileQuery = getCommandValue(normalized, /^show project profile\s+(.+)$/i);
  if (profileQuery) {
    const profile = await store.getProfile(profileQuery);
    return profile
      ? {
          ok: true,
          title: "Project Memory Profile",
          message: formatProfileDetail(profile),
          data: profile,
        }
      : {
          ok: false,
          title: "Project profile not found",
          message: `No project memory profile exists for: ${profileQuery}`,
        };
  }

  const versionMatch = normalized.match(/^show version profile\s+(\S+)\s+(\S+)$/i);
  if (versionMatch) {
    const version = await store.getVersion(versionMatch[1], versionMatch[2]);
    return version
      ? {
          ok: true,
          title: "Version Memory Profile",
          message: formatVersionLine(version),
          data: version,
        }
      : {
          ok: false,
          title: "Version profile not found",
          message: `No version memory profile exists for ${versionMatch[1]} ${versionMatch[2]}.`,
        };
  }

  if (/^show current project state$/i.test(normalized)) {
    const state = await store.loadCurrentState();
    return {
      ok: true,
      title: "Current Project Memory State",
      message: formatState(state),
      data: state,
    };
  }

  if (/^show memory scope(?:\s+.+)?$/i.test(normalized)) {
    const query = normalized.replace(/^show memory scope\s*/i, "").trim();
    const scope = await resolveProjectMemoryScope({ query });
    return {
      ok: true,
      title: "Resolved Project Memory Scope",
      message: [
        `Project: ${scope.projectId ?? "none"}`,
        `Version: ${scope.version ?? "none"}`,
        `Source: ${scope.source}`,
        scope.warnings.length > 0 ? `Warnings: ${scope.warnings.join("; ")}` : undefined,
      ]
        .filter((line): line is string => typeof line === "string")
        .join("\n"),
      data: scope,
    };
  }

  const activeProject = getCommandValue(normalized, /^set (?:active|current) project\s+(.+)$/i);
  if (activeProject) {
    try {
      const state = await store.setActiveProject(activeProject);
      return {
        ok: true,
        title: "Active Project Set",
        message: formatState(state),
        data: state,
      };
    } catch (error) {
      return {
        ok: false,
        title: "Active project update failed",
        message: error instanceof Error ? error.message : "Unknown active project update error.",
      };
    }
  }

  const activeVersion = getCommandValue(normalized, /^set (?:active|current) version\s+(\S+)$/i);
  if (activeVersion) {
    try {
      const state = await store.setActiveVersion(activeVersion);
      return {
        ok: true,
        title: "Active Version Set",
        message: formatState(state),
        data: state,
      };
    } catch (error) {
      return {
        ok: false,
        title: "Active version update failed",
        message: error instanceof Error ? error.message : "Unknown active version update error.",
      };
    }
  }

  const completedVersion = getCommandValue(normalized, /^mark latest completed\s+(\S+)$/i);
  if (completedVersion) {
    try {
      const state = await store.markLatestCompleted(completedVersion);
      return {
        ok: true,
        title: "Latest Completed Version Set",
        message: formatState(state),
        data: state,
      };
    } catch (error) {
      return {
        ok: false,
        title: "Latest completed update failed",
        message: error instanceof Error ? error.message : "Unknown latest completed update error.",
      };
    }
  }

  const nextVersion = getCommandValue(normalized, /^set next milestone\s+(\S+)$/i);
  if (nextVersion) {
    try {
      const state = await store.setNextRecommended(nextVersion);
      return {
        ok: true,
        title: "Next Recommended Version Set",
        message: formatState(state),
        data: state,
      };
    } catch (error) {
      return {
        ok: false,
        title: "Next milestone update failed",
        message: error instanceof Error ? error.message : "Unknown next milestone update error.",
      };
    }
  }

  return {
    ok: false,
    title: "Project memory profile command not recognized",
    message: [
      "Try one of these:",
      "- show project memory profiles",
      "- show project aliases",
      "- show project profile <project>",
      "- show version profile <project> <version>",
      "- show current project state",
      "- show memory scope <query>",
      "- set active project <project>",
      "- set active version <version>",
      "- mark latest completed <version>",
      "- set next milestone <version>",
    ].join("\n"),
  };
}
