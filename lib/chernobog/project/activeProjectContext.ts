import {
  getAllProjects,
  getDashboardSnapshot,
  getProjectBySlug,
  type Project,
} from "@/lib/modules/project-operations";

export type ActiveProjectResolutionSource =
  | "explicit-message"
  | "session"
  | "command-focus"
  | "none";

export type ActiveProjectResolution = {
  project: Project | undefined;
  projectId: string | null;
  source: ActiveProjectResolutionSource;
};

function normalizeReference(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAlias(text: string, alias: string): boolean {
  const normalizedAlias = normalizeReference(alias);
  if (!normalizedAlias) return false;

  const pattern = normalizedAlias
    .split(" ")
    .map(escapeRegExp)
    .join("[\\s_-]+");

  return new RegExp(`(^|\\W)${pattern}(?=\\W|$)`, "i").test(text);
}

function findExplicitProject(
  userMessage: string,
  projects: Project[],
): Project | undefined {
  const normalizedMessage = normalizeReference(userMessage);
  if (!normalizedMessage) return undefined;

  const matches = projects.filter((project) => {
    const aliases = new Set([
      project.slug,
      project.name,
      project.repoName,
    ]);

    return [...aliases].some((alias) =>
      alias ? containsAlias(normalizedMessage, alias) : false,
    );
  });

  if (matches.length !== 1) {
    return undefined;
  }

  const matched = matches[0];
  const hasProjectLanguage =
    /\b(project|workspace|repo|repository|roadmap|implementation|phase|milestone)\b/i.test(
      userMessage,
    );
  const hasProjectAction =
    /\b(switch|focus|work|working|assess|evaluate|review|continue|resume|current|active)\b/i.test(
      userMessage,
    );

  if (hasProjectLanguage || hasProjectAction) {
    return matched;
  }

  return undefined;
}

function asksForCurrentProject(userMessage: string): boolean {
  return /\b(current|active|this)\s+(project|workspace)\b/i.test(userMessage);
}

export function resolveActiveProjectContext(input: {
  userMessage: string;
  sessionProjectId?: string | null;
}): ActiveProjectResolution {
  const projects = getAllProjects();

  const explicitProject = findExplicitProject(
    input.userMessage,
    projects,
  );

  if (explicitProject) {
    return {
      project: explicitProject,
      projectId: explicitProject.slug,
      source: "explicit-message",
    };
  }

  if (input.sessionProjectId) {
    const sessionProject =
      getProjectBySlug(input.sessionProjectId);

    if (sessionProject && !sessionProject.archived) {
      return {
        project: sessionProject,
        projectId: sessionProject.slug,
        source: "session",
      };
    }
  }

  if (asksForCurrentProject(input.userMessage)) {
    const commandFocus =
      getDashboardSnapshot().commandFocus;

    if (commandFocus && !commandFocus.archived) {
      return {
        project: commandFocus,
        projectId: commandFocus.slug,
        source: "command-focus",
      };
    }
  }

  return {
    project: undefined,
    projectId: null,
    source: "none",
  };
}

export function formatActiveProjectContext(
  project: Project,
): string {
  const blockers =
    project.blockers.length > 0
      ? project.blockers.join(" | ")
      : "none";

  return [
    "Current project context (canonical Project Operations state):",
    `- projectId: ${project.slug}`,
    `- name: ${project.name}`,
    `- summary: ${project.summary || "none"}`,
    `- status: ${project.status}`,
    `- repository: ${project.repoName || "none"}`,
    `- repository health: ${project.repoHealth}`,
    `- focus: ${project.focus || "none"}`,
    `- next action: ${project.nextAction || "none"}`,
    `- blockers: ${blockers}`,
    `- project state updated: ${project.updatedAt}`,
    "Treat this block as current project runtime state.",
    "Do not replace it with facts from another project.",
  ].join("\n");
}

export function buildProjectGroundedSystemText(
  memorySystemText: string,
  projectId?: string | null,
): string {
  if (!projectId) {
    return memorySystemText;
  }

  const project = getProjectBySlug(projectId);

  if (!project || project.archived) {
    return memorySystemText;
  }

  return [
    memorySystemText,
    "",
    formatActiveProjectContext(project),
  ].join("\n");
}
