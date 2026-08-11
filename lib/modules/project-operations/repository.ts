import { db } from "@/lib/chernobog/db";

import { createInitialProjectSeed } from "./seed";
import type { Project } from "./types";

type ProjectRow = {
  id: string;
  slug: string;
  project_json: string;
  archived: number;
  created_at: string;
  updated_at: string;
};

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS project_operations_projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    project_json TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_project_operations_active_updated
  ON project_operations_projects (archived, updated_at DESC);
`);

const listProjectsStatement = db.prepare(`
  SELECT id, slug, project_json, archived, created_at, updated_at
  FROM project_operations_projects
  ORDER BY archived ASC, updated_at DESC, slug ASC
`);

const getProjectBySlugStatement = db.prepare(`
  SELECT id, slug, project_json, archived, created_at, updated_at
  FROM project_operations_projects
  WHERE slug = ?
  LIMIT 1
`);

const countProjectsStatement = db.prepare(`
  SELECT COUNT(*) AS count
  FROM project_operations_projects
`);

const upsertProjectStatement = db.prepare(`
  INSERT INTO project_operations_projects (
    id,
    slug,
    project_json,
    archived,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    project_json = excluded.project_json,
    archived = excluded.archived,
    updated_at = excluded.updated_at
`);

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Project>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.boards) &&
    Array.isArray(candidate.notes) &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.activity)
  );
}

function parseProjectRow(row: ProjectRow): Project | undefined {
  try {
    const parsed = JSON.parse(row.project_json) as unknown;
    if (!isProject(parsed)) return undefined;

    return {
      ...parsed,
      archived: Boolean(row.archived),
      createdAt: parsed.createdAt || row.created_at,
      updatedAt: parsed.updatedAt || row.updated_at,
    };
  } catch {
    return undefined;
  }
}

function writeProjectUnsafe(project: Project): void {
  upsertProjectStatement.run(
    project.id,
    project.slug,
    JSON.stringify(project),
    project.archived ? 1 : 0,
    project.createdAt,
    project.updatedAt,
  );
}

const seedProjectsTransaction = db.transaction((projects: Project[]) => {
  for (const project of projects) {
    writeProjectUnsafe(project);
  }
});

export function ensureProjectOperationsSeeded(): void {
  const result = countProjectsStatement.get() as { count: number };

  if (result.count > 0) return;
  seedProjectsTransaction(createInitialProjectSeed());
}

export function readAllProjects(): Project[] {
  ensureProjectOperationsSeeded();

  return (listProjectsStatement.all() as ProjectRow[])
    .map(parseProjectRow)
    .filter((project): project is Project => Boolean(project));
}

export function readProjectBySlug(slug: string): Project | undefined {
  ensureProjectOperationsSeeded();
  const row = getProjectBySlugStatement.get(slug) as ProjectRow | undefined;
  return row ? parseProjectRow(row) : undefined;
}

export function writeProject(project: Project): void {
  ensureProjectOperationsSeeded();
  db.transaction(() => writeProjectUnsafe(project))();
}
