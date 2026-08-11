"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addProjectLink,
  addProjectNote,
  archiveProject,
  archiveProjectNote,
  archiveTaskCard,
  createProject,
  createTaskCard,
  deleteProjectLink,
  toggleProjectNotePinned,
  updateProjectNote,
  updateProjectSettings,
  updateTaskCard,
} from "@/lib/modules/project-operations";
import type {
  ProjectStatus,
  RepoHealth,
  TaskColumnId,
  TaskPriority,
} from "@/lib/modules/project-operations";

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

export async function createProjectAction(formData: FormData) {
  const project = createProject({
    name: requiredString(formData, "name"),
    summary: requiredString(formData, "summary"),
    repoName: requiredString(formData, "repoName"),
    repoPath: optionalString(formData, "repoPath"),
  });

  revalidateProjectPaths(project.slug);
  redirect(`/projects/${project.slug}`);
}

export async function updateProjectSettingsAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  updateProjectSettings(slug, {
    name: requiredString(formData, "name"),
    summary: requiredString(formData, "summary"),
    status: requiredEnum(formData, "status", VALID_STATUSES),
    repoHealth: requiredEnum(formData, "repoHealth", VALID_REPO_HEALTH),
    repoName: requiredString(formData, "repoName"),
    repoPath: optionalString(formData, "repoPath"),
    focus: requiredString(formData, "focus"),
    nextAction: requiredString(formData, "nextAction"),
    blockers: optionalString(formData, "blockers")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  });
  revalidateProjectPaths(slug);
}

export async function archiveProjectAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  archiveProject(slug);
  revalidateProjectPaths(slug);
  redirect("/projects");
}

export async function createTaskCardAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  const boardId = requiredString(formData, "boardId");
  createTaskCard(slug, boardId, taskInput(formData));
  revalidateProjectPaths(slug);
}

export async function updateTaskCardAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  const boardId = requiredString(formData, "boardId");
  const cardId = requiredString(formData, "cardId");
  updateTaskCard(slug, boardId, cardId, taskInput(formData));
  revalidateProjectPaths(slug);
}

export async function archiveTaskCardAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  archiveTaskCard(
    slug,
    requiredString(formData, "boardId"),
    requiredString(formData, "cardId"),
  );
  revalidateProjectPaths(slug);
}

export async function addProjectNoteAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  addProjectNote(slug, {
    title: requiredString(formData, "title"),
    content: requiredString(formData, "content"),
    pinned: formData.get("pinned") === "on",
  });
  revalidateProjectPaths(slug);
}

export async function updateProjectNoteAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  updateProjectNote(slug, requiredString(formData, "noteId"), {
    title: requiredString(formData, "title"),
    content: requiredString(formData, "content"),
    pinned: formData.get("pinned") === "on",
  });
  revalidateProjectPaths(slug);
}

export async function toggleProjectNotePinnedAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  toggleProjectNotePinned(slug, requiredString(formData, "noteId"));
  revalidateProjectPaths(slug);
}

export async function archiveProjectNoteAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  archiveProjectNote(slug, requiredString(formData, "noteId"));
  revalidateProjectPaths(slug);
}

export async function addProjectLinkAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  addProjectLink(slug, {
    label: requiredString(formData, "label"),
    url: requiredString(formData, "url"),
    type: requiredString(formData, "type"),
  });
  revalidateProjectPaths(slug);
}

export async function deleteProjectLinkAction(formData: FormData) {
  const slug = requiredString(formData, "slug");
  deleteProjectLink(slug, requiredString(formData, "linkId"));
  revalidateProjectPaths(slug);
}

function taskInput(formData: FormData) {
  return {
    title: requiredString(formData, "title"),
    description: requiredString(formData, "description"),
    priority: requiredEnum(formData, "priority", VALID_PRIORITIES),
    due: requiredString(formData, "due"),
    urgent: formData.get("urgent") === "on",
    column: requiredEnum(formData, "column", VALID_COLUMNS),
  };
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing form value: ${key}`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requiredEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
): T {
  const value = requiredString(formData, key) as T;
  if (!allowed.includes(value)) throw new Error(`Invalid ${key}: ${value}`);
  return value;
}

function revalidateProjectPaths(slug: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects/notes");
  revalidatePath("/projects/activity");
  revalidatePath("/command-center");
}
