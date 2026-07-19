import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CharacterProject,
  CharacterProjectManifest,
  CharacterProjectStatus,
  CharacterProjectSummary,
  CreateCharacterProjectInput,
  UpdateCharacterProjectInput,
} from "../types";
import {
  CharacterProjectStateError,
  CharacterProjectValidationError,
} from "../errors";
import { assertCharacterProjectStatusTransition } from "../projectStatus";

const CHARACTER_PROJECT_ID_PATTERN = /^character-[a-zA-Z0-9._-]+$/;

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyManifest(): CharacterProjectManifest {
  return {
    version: 1,
    updatedAt: nowIso(),
    projects: [],
  };
}

function toProjectSummary(project: CharacterProject): CharacterProjectSummary {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    selectedConceptId: project.selectedConceptId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function inferProjectName(prompt: string): string {
  const firstSentence = prompt.split(/[.!?\n]/, 1)[0]?.trim() ?? "";
  const source = firstSentence || prompt.trim();

  if (source.length <= 56) {
    return source;
  }

  return `${source.slice(0, 53).trimEnd()}...`;
}

function normalizeCreateInput(input: CreateCharacterProjectInput): {
  name: string;
  prompt: string;
} {
  const prompt = input.prompt.trim();
  const name = input.name?.trim() || inferProjectName(prompt);

  if (!prompt) {
    throw new CharacterProjectValidationError(
      "A character prompt is required.",
    );
  }

  if (!name) {
    throw new CharacterProjectValidationError(
      "A character project name is required.",
    );
  }

  return { name, prompt };
}

function assertProjectId(projectId: string): void {
  if (!CHARACTER_PROJECT_ID_PATTERN.test(projectId)) {
    throw new CharacterProjectValidationError(
      `Invalid Character Forge project id: ${projectId}`,
    );
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonFileAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporaryPath, filePath);
}

export function getCharacterForgeRoot(): string {
  const configuredPath = process.env.CHERNOBOG_CHARACTER_FORGE_PATH?.trim();

  if (!configuredPath) {
    return path.join(process.cwd(), "data", "character-forge");
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

export function getCharacterProjectManifestPath(): string {
  return path.join(getCharacterForgeRoot(), "projects.json");
}

export function getCharacterProjectDirectory(projectId: string): string {
  assertProjectId(projectId);
  return path.join(getCharacterForgeRoot(), "projects", projectId);
}

export function getCharacterProjectPath(projectId: string): string {
  return path.join(getCharacterProjectDirectory(projectId), "project.json");
}

export async function readCharacterProjectManifest(): Promise<CharacterProjectManifest> {
  return (
    (await readJsonFile<CharacterProjectManifest>(
      getCharacterProjectManifestPath(),
    )) ?? createEmptyManifest()
  );
}

export async function listCharacterProjects(): Promise<
  CharacterProjectSummary[]
> {
  const manifest = await readCharacterProjectManifest();

  return [...manifest.projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function readCharacterProject(
  projectId: string,
): Promise<CharacterProject | null> {
  return readJsonFile<CharacterProject>(getCharacterProjectPath(projectId));
}

export async function writeCharacterProject(
  project: CharacterProject,
): Promise<CharacterProject> {
  assertProjectId(project.id);

  const updatedProject: CharacterProject = {
    ...project,
    schemaVersion: 1,
    identityAnchor: project.identityAnchor ?? null,
    canonicalPose: project.canonicalPose ?? null,
    modelAsset: project.modelAsset ?? null,
    referenceSheet: project.referenceSheet ?? null,
    updatedAt: nowIso(),
  };

  await writeJsonFileAtomic(
    getCharacterProjectPath(project.id),
    updatedProject,
  );

  const manifest = await readCharacterProjectManifest();
  const nextSummary = toProjectSummary(updatedProject);
  const existingIndex = manifest.projects.findIndex(
    (entry) => entry.id === project.id,
  );

  if (existingIndex >= 0) {
    manifest.projects[existingIndex] = nextSummary;
  } else {
    manifest.projects.push(nextSummary);
  }

  await writeJsonFileAtomic(getCharacterProjectManifestPath(), {
    version: 1,
    updatedAt: nowIso(),
    projects: manifest.projects,
  } satisfies CharacterProjectManifest);

  return updatedProject;
}

export async function createCharacterProject(
  input: CreateCharacterProjectInput,
): Promise<CharacterProject> {
  const normalized = normalizeCreateInput(input);
  const createdAt = nowIso();
  const compactTimestamp = createdAt.replace(/[-:.TZ]/g, "");
  const projectId = `character-${compactTimestamp}-${randomUUID().slice(0, 8)}`;

  const project: CharacterProject = {
    schemaVersion: 1,
    id: projectId,
    name: normalized.name,
    originalPrompt: normalized.prompt,
    status: "draft",
    brief: null,
    concepts: [],
    selectedConceptId: null,
    identityAnchor: null,
    canonicalPose: null,
    modelAsset: null,
    referenceSheet: null,
    createdAt,
    updatedAt: createdAt,
  };

  return writeCharacterProject(project);
}

export async function updateCharacterProject(
  projectId: string,
  input: UpdateCharacterProjectInput,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  const name = input.name?.trim();
  const originalPrompt = input.originalPrompt?.trim();

  if (input.name !== undefined && !name) {
    throw new CharacterProjectValidationError(
      "A character project name cannot be empty.",
    );
  }

  if (input.originalPrompt !== undefined && !originalPrompt) {
    throw new CharacterProjectValidationError(
      "A character prompt cannot be empty.",
    );
  }

  if (
    originalPrompt !== undefined &&
    originalPrompt !== project.originalPrompt &&
    project.status !== "draft"
  ) {
    throw new CharacterProjectStateError(
      "The original prompt can only be changed while the project is in draft status.",
    );
  }

  return writeCharacterProject({
    ...project,
    name: name ?? project.name,
    originalPrompt: originalPrompt ?? project.originalPrompt,
  });
}

export async function transitionCharacterProjectStatus(
  projectId: string,
  nextStatus: CharacterProjectStatus,
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  try {
    assertCharacterProjectStatusTransition(project.status, nextStatus);
  } catch (error) {
    throw new CharacterProjectStateError(
      error instanceof Error
        ? error.message
        : "Invalid Character Forge status transition.",
    );
  }

  return writeCharacterProject({
    ...project,
    status: nextStatus,
  });
}
