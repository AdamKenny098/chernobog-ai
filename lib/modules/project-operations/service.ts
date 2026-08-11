import { randomUUID } from "node:crypto";

import { readAllProjects, readProjectBySlug, writeProject } from "./repository";
import type {
  ActivityType,
  Project,
  ProjectActivityEntry,
  ProjectDashboardSnapshot,
  ProjectLinkInput,
  ProjectNoteInput,
  ProjectNoteResult,
  ProjectSettingsInput,
  ProjectStats,
  ProjectStatus,
  ProjectTaskCard,
  ProjectTaskResult,
  RecentActivityResult,
  RepoHealth,
  TaskCardInput,
  TaskColumnId,
  TaskPriority,
} from "./types";

const VALID_COLUMNS: TaskColumnId[] = ["backlog", "next", "doing", "done"];
const VALID_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const VALID_STATUSES: ProjectStatus[] = [
  "Active",
  "Planning",
  "Blocked",
  "Polish",
  "Archived",
];
const VALID_REPO_HEALTH: RepoHealth[] = [
  "Healthy",
  "Watch",
  "Needs Attention",
];

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function isOlderThanDays(value: string, days: number): boolean {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
}

function createActivity(
  type: ActivityType,
  summary: string,
  detail?: string,
): ProjectActivityEntry {
  return {
    id: randomUUID(),
    type,
    summary,
    detail,
    createdAt: nowIso(),
  };
}

function getProjectCards(project: Project): ProjectTaskCard[] {
  return project.boards.flatMap((board) => board.cards);
}

export function getAllProjects(options?: { includeArchived?: boolean }): Project[] {
  const projects = readAllProjects();
  return options?.includeArchived
    ? projects
    : projects.filter((project) => !project.archived);
}

export function getProjectBySlug(slug: string): Project | undefined {
  const project = readProjectBySlug(slug);
  return project && !project.archived ? project : undefined;
}

export function getProjectStats(project: Project): ProjectStats {
  const activeCards = getProjectCards(project).filter((card) => !card.archived);
  const urgentCount = activeCards.filter(
    (card) => card.urgent && card.column !== "done",
  ).length;
  const doingCount = activeCards.filter((card) => card.column === "doing").length;
  const doneCount = activeCards.filter((card) => card.column === "done").length;
  const progress =
    activeCards.length === 0
      ? 0
      : Math.round((doneCount / activeCards.length) * 100);

  return {
    boardCount: project.boards.length,
    noteCount: project.notes.filter((note) => !note.archived).length,
    urgentCount,
    doingCount,
    totalCards: activeCards.length,
    doneCount,
    progress,
    blocked: project.status === "Blocked" || project.blockers.length > 0,
  };
}

export function getAllProjectTasks(): ProjectTaskResult[] {
  return getAllProjects().flatMap((project) =>
    project.boards.flatMap((board) =>
      board.cards
        .filter((card) => !card.archived)
        .map((card) => ({ project, board, card })),
    ),
  );
}

export function getUrgentTasks(): ProjectTaskResult[] {
  return getAllProjectTasks().filter(
    ({ card }) => card.urgent && card.column !== "done",
  );
}

export function getNextTasks(): ProjectTaskResult[] {
  return getAllProjectTasks().filter(({ card }) => card.column === "next");
}

export function getDoingTasks(): ProjectTaskResult[] {
  return getAllProjectTasks().filter(({ card }) => card.column === "doing");
}

export function getAllNotes(): ProjectNoteResult[] {
  return getAllProjects().flatMap((project) =>
    project.notes
      .filter((note) => !note.archived)
      .map((note) => ({ project, note })),
  );
}

export function getPinnedNotes(): ProjectNoteResult[] {
  return getAllNotes().filter(({ note }) => note.pinned);
}

export function getRecentActivity(limit = 20): RecentActivityResult[] {
  return getAllProjects()
    .flatMap((project) =>
      project.activity.map((entry) => ({ project, entry })),
    )
    .sort(
      (a, b) =>
        new Date(b.entry.createdAt).getTime() -
        new Date(a.entry.createdAt).getTime(),
    )
    .slice(0, limit);
}

function scoreProject(project: Project): number {
  const stats = getProjectStats(project);
  let score = 0;
  score += stats.urgentCount * 10;
  score += stats.doingCount * 4;
  score += project.repoHealth === "Needs Attention" ? 6 : 0;
  score += project.repoHealth === "Watch" ? 3 : 0;
  score += project.status === "Blocked" ? 7 : 0;
  score += project.status === "Active" ? 4 : 0;
  score += project.blockers.length * 2;
  score += isOlderThanDays(project.updatedAt, 7) ? 3 : 0;
  return score;
}

export function getDashboardSnapshot(): ProjectDashboardSnapshot {
  const projects = getAllProjects();

  return {
    projects,
    commandFocus: [...projects].sort((a, b) => scoreProject(b) - scoreProject(a))[0],
    urgentTasks: getUrgentTasks(),
    nextTasks: getNextTasks(),
    doingTasks: getDoingTasks(),
    repoWatch: projects.filter((project) => project.repoHealth !== "Healthy"),
    blockedProjects: projects.filter(
      (project) => project.status === "Blocked" || project.blockers.length > 0,
    ),
    staleProjects: projects.filter((project) => isOlderThanDays(project.updatedAt, 7)),
    recentActivity: getRecentActivity(10),
  };
}

function uniqueSlug(baseSlug: string): string {
  const existing = new Set(
    getAllProjects({ includeArchived: true }).map((project) => project.slug),
  );
  if (!existing.has(baseSlug)) return baseSlug;

  let index = 2;
  while (existing.has(`${baseSlug}-${index}`)) index += 1;
  return `${baseSlug}-${index}`;
}

export function createProject(input: {
  name: string;
  summary: string;
  repoName: string;
  repoPath?: string;
}): Project {
  const name = requireText(input.name, "Project name", 120);
  const summary = requireText(input.summary, "Project summary", 1000);
  const repoName = requireText(input.repoName, "Repository name", 200);
  const now = nowIso();

  const project: Project = {
    id: randomUUID(),
    name,
    slug: uniqueSlug(slugify(name)),
    summary,
    status: "Planning",
    repoHealth: "Watch",
    repoName,
    repoPath: cleanOptionalText(input.repoPath, 1000),
    focus: "Define the current project focus.",
    nextAction: "Add the first concrete next action.",
    blockers: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
    boards: [
      {
        id: randomUUID(),
        name: "Command Board",
        description: "Default execution board for this project.",
        cards: [],
      },
    ],
    notes: [],
    links: [],
    activity: [createActivity("project", "Created project workspace", summary)],
  };

  writeProject(project);
  return project;
}

function updateProject(
  slug: string,
  updater: (project: Project) => Project,
  activity: { type: ActivityType; summary: string; detail?: string },
  options?: { includeArchived?: boolean },
): Project {
  const project = readProjectBySlug(slug);

  if (!project || (project.archived && !options?.includeArchived)) {
    throw new Error(`Project not found: ${slug}`);
  }

  const updated = updater(project);
  const result: Project = {
    ...updated,
    updatedAt: nowIso(),
    activity: [
      createActivity(activity.type, activity.summary, activity.detail),
      ...updated.activity,
    ].slice(0, 120),
  };

  writeProject(result);
  return result;
}

export function updateProjectSettings(
  slug: string,
  input: ProjectSettingsInput,
): Project {
  const name = requireText(input.name, "Project name", 120);
  const summary = requireText(input.summary, "Project summary", 1000);
  const repoName = requireText(input.repoName, "Repository name", 200);
  const focus = requireText(input.focus, "Current focus", 1000);
  const nextAction = requireText(input.nextAction, "Next action", 1000);
  const status = requireStatus(input.status);
  const repoHealth = requireRepoHealth(input.repoHealth);

  return updateProject(
    slug,
    (project) => ({
      ...project,
      name,
      summary,
      status,
      repoHealth,
      repoName,
      repoPath: cleanOptionalText(input.repoPath, 1000),
      focus,
      nextAction,
      blockers: input.blockers
        .map((blocker) => blocker.trim())
        .filter(Boolean)
        .slice(0, 30),
    }),
    { type: "project", summary: "Updated project settings", detail: name },
  );
}

export function updateProjectFocus(slug: string, focus: string): Project {
  const cleanFocus = requireText(focus, "Current focus", 1000);
  return updateProject(
    slug,
    (project) => ({ ...project, focus: cleanFocus }),
    { type: "project", summary: "Updated current focus", detail: cleanFocus },
  );
}

export function updateProjectNextAction(slug: string, nextAction: string): Project {
  const cleanNextAction = requireText(nextAction, "Next action", 1000);
  return updateProject(
    slug,
    (project) => ({ ...project, nextAction: cleanNextAction }),
    {
      type: "project",
      summary: "Updated next action",
      detail: cleanNextAction,
    },
  );
}

export function archiveProject(slug: string): Project {
  return updateProject(
    slug,
    (project) => ({ ...project, archived: true, status: "Archived" }),
    {
      type: "project",
      summary: "Archived project",
      detail: "The project remains stored but is hidden from active views.",
    },
    { includeArchived: true },
  );
}

export function createTaskCard(
  slug: string,
  boardId: string,
  input: TaskCardInput,
): ProjectTaskCard {
  const project = getProjectBySlug(slug);
  if (!project?.boards.some((board) => board.id === boardId)) {
    throw new Error(`Project board not found: ${boardId}`);
  }

  const cleanInput = cleanTaskInput(input);
  const now = nowIso();
  const card: ProjectTaskCard = {
    id: randomUUID(),
    ...cleanInput,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  updateProject(
    slug,
    (project) => ({
      ...project,
      boards: project.boards.map((board) =>
        board.id === boardId
          ? { ...board, cards: [card, ...board.cards] }
          : board,
      ),
    }),
    {
      type: "task",
      summary: `Created task: ${card.title}`,
      detail: `${card.priority} priority in ${card.column}.`,
    },
  );

  return card;
}

export function updateTaskCard(
  slug: string,
  boardId: string,
  cardId: string,
  input: TaskCardInput,
): ProjectTaskCard {
  const cleanInput = cleanTaskInput(input);
  const existing = findTaskInProject(slug, boardId, cardId);
  if (!existing) throw new Error(`Task not found: ${cardId}`);

  const updatedCard: ProjectTaskCard = {
    ...existing,
    ...cleanInput,
    updatedAt: nowIso(),
  };

  updateProject(
    slug,
    (project) => ({
      ...project,
      boards: project.boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              cards: board.cards.map((card) =>
                card.id === cardId ? updatedCard : card,
              ),
            }
          : board,
      ),
    }),
    {
      type: "task",
      summary: `Updated task: ${updatedCard.title}`,
      detail: `Column: ${updatedCard.column}. Priority: ${updatedCard.priority}.`,
    },
  );

  return updatedCard;
}

export function moveTaskCard(
  slug: string,
  boardId: string,
  cardId: string,
  column: TaskColumnId,
): ProjectTaskCard {
  const target = findTaskInProject(slug, boardId, cardId);
  if (!target) throw new Error(`Task not found: ${cardId}`);

  return updateTaskCard(slug, boardId, cardId, {
    title: target.title,
    description: target.description,
    priority: target.priority,
    due: target.due,
    urgent: target.urgent,
    column: requireColumn(column),
  });
}

export function archiveTaskCard(
  slug: string,
  boardId: string,
  cardId: string,
): Project {
  const target = findTaskInProject(slug, boardId, cardId);
  if (!target) throw new Error(`Task not found: ${cardId}`);

  return updateProject(
    slug,
    (project) => ({
      ...project,
      boards: project.boards.map((board) =>
        board.id === boardId
          ? {
              ...board,
              cards: board.cards.map((card) =>
                card.id === cardId
                  ? { ...card, archived: true, updatedAt: nowIso() }
                  : card,
              ),
            }
          : board,
      ),
    }),
    {
      type: "task",
      summary: `Archived task: ${target.title}`,
      detail: "The task remains stored outside active board views.",
    },
  );
}

export function addProjectNote(slug: string, input: ProjectNoteInput): Project {
  const cleanInput = cleanNoteInput(input);
  const now = nowIso();

  return updateProject(
    slug,
    (project) => ({
      ...project,
      notes: [
        {
          id: randomUUID(),
          ...cleanInput,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
        ...project.notes,
      ],
    }),
    {
      type: "note",
      summary: `Added note: ${cleanInput.title}`,
      detail: cleanInput.pinned ? "Pinned note." : undefined,
    },
  );
}

export function updateProjectNote(
  slug: string,
  noteId: string,
  input: ProjectNoteInput,
): Project {
  const cleanInput = cleanNoteInput(input);
  return updateProject(
    slug,
    (project) => ({
      ...project,
      notes: project.notes.map((note) =>
        note.id === noteId
          ? { ...note, ...cleanInput, updatedAt: nowIso() }
          : note,
      ),
    }),
    {
      type: "note",
      summary: `Updated note: ${cleanInput.title}`,
      detail: cleanInput.pinned ? "Pinned note." : "Unpinned note.",
    },
  );
}

export function toggleProjectNotePinned(slug: string, noteId: string): Project {
  const project = getProjectBySlug(slug);
  const note = project?.notes.find((candidate) => candidate.id === noteId);
  if (!note) throw new Error(`Note not found: ${noteId}`);
  return updateProjectNote(slug, noteId, {
    title: note.title,
    content: note.content,
    pinned: !note.pinned,
  });
}

export function archiveProjectNote(slug: string, noteId: string): Project {
  const project = getProjectBySlug(slug);
  const note = project?.notes.find((candidate) => candidate.id === noteId);
  if (!note) throw new Error(`Note not found: ${noteId}`);

  return updateProject(
    slug,
    (current) => ({
      ...current,
      notes: current.notes.map((candidate) =>
        candidate.id === noteId
          ? { ...candidate, archived: true, updatedAt: nowIso() }
          : candidate,
      ),
    }),
    {
      type: "note",
      summary: `Archived note: ${note.title}`,
      detail: "The note remains stored outside active note views.",
    },
  );
}

export function addProjectLink(slug: string, input: ProjectLinkInput): Project {
  const cleanInput = cleanLinkInput(input);
  return updateProject(
    slug,
    (project) => ({
      ...project,
      links: [
        {
          id: randomUUID(),
          ...cleanInput,
          createdAt: nowIso(),
        },
        ...project.links,
      ],
    }),
    {
      type: "link",
      summary: `Added project link: ${cleanInput.label}`,
      detail: cleanInput.url,
    },
  );
}

export function deleteProjectLink(slug: string, linkId: string): Project {
  const project = getProjectBySlug(slug);
  const link = project?.links.find((candidate) => candidate.id === linkId);
  if (!link) throw new Error(`Project link not found: ${linkId}`);

  return updateProject(
    slug,
    (current) => ({
      ...current,
      links: current.links.filter((candidate) => candidate.id !== linkId),
    }),
    { type: "link", summary: `Removed project link: ${link.label}` },
  );
}

export function findProjectByQuery(query: string): Project | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  const projects = getAllProjects();
  const exact = projects.find(
    (project) =>
      project.slug.toLowerCase() === normalized ||
      project.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const partial = projects.filter(
    (project) =>
      project.slug.toLowerCase().includes(normalized) ||
      project.name.toLowerCase().includes(normalized),
  );
  return partial.length === 1 ? partial[0] : undefined;
}

export function findTaskByIdentifier(identifier: string): ProjectTaskResult | undefined {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return undefined;
  const tasks = getAllProjectTasks();

  const exact = tasks.find(({ card }) => card.id.toLowerCase() === normalized);
  if (exact) return exact;
  const prefixMatches = tasks.filter(({ card }) =>
    card.id.toLowerCase().startsWith(normalized),
  );
  return prefixMatches.length === 1 ? prefixMatches[0] : undefined;
}

function findTaskInProject(
  slug: string,
  boardId: string,
  cardId: string,
): ProjectTaskCard | undefined {
  return getProjectBySlug(slug)
    ?.boards.find((board) => board.id === boardId)
    ?.cards.find((card) => card.id === cardId && !card.archived);
}

function cleanTaskInput(input: TaskCardInput): TaskCardInput {
  return {
    title: requireText(input.title, "Task title", 240),
    description: requireText(input.description, "Task description", 2000),
    priority: requirePriority(input.priority),
    due: requireText(input.due, "Task due field", 120),
    urgent: Boolean(input.urgent),
    column: requireColumn(input.column),
  };
}

function cleanNoteInput(input: ProjectNoteInput): ProjectNoteInput {
  return {
    title: requireText(input.title, "Note title", 240),
    content: requireText(input.content, "Note content", 5000),
    pinned: Boolean(input.pinned),
  };
}

function cleanLinkInput(input: ProjectLinkInput): ProjectLinkInput {
  return {
    label: requireText(input.label, "Link label", 240),
    url: requireText(input.url, "Link URL", 2000),
    type: requireText(input.type, "Link type", 120),
  };
}

function requireText(value: string, label: string, maxLength: number): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} cannot be empty.`);
  if (clean.length > maxLength) {
    throw new Error(`${label} cannot exceed ${maxLength} characters.`);
  }
  return clean;
}

function cleanOptionalText(value: string | undefined, maxLength: number): string | undefined {
  const clean = value?.trim();
  if (!clean) return undefined;
  if (clean.length > maxLength) {
    throw new Error(`Optional text cannot exceed ${maxLength} characters.`);
  }
  return clean;
}

function requireColumn(value: TaskColumnId): TaskColumnId {
  if (!VALID_COLUMNS.includes(value)) throw new Error(`Invalid column: ${value}`);
  return value;
}

function requirePriority(value: TaskPriority): TaskPriority {
  if (!VALID_PRIORITIES.includes(value)) throw new Error(`Invalid priority: ${value}`);
  return value;
}

function requireStatus(value: ProjectStatus): ProjectStatus {
  if (!VALID_STATUSES.includes(value)) throw new Error(`Invalid status: ${value}`);
  return value;
}

function requireRepoHealth(value: RepoHealth): RepoHealth {
  if (!VALID_REPO_HEALTH.includes(value)) {
    throw new Error(`Invalid repository health: ${value}`);
  }
  return value;
}
