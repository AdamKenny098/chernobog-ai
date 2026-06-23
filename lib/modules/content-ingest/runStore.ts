import fs from "node:fs/promises";
import path from "node:path";

import {
  ContentIngestRun,
  ContentIngestRunIndex,
  ContentIngestRunIndexEntry,
} from "./types";

function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getContentIngestRoot() {
  return path.join(getVaultRoot(), "content-ingest", "runs");
}

export function getContentIngestIndexPath() {
  return path.join(getContentIngestRoot(), "_index.json");
}

export function getContentIngestRunDir(runId: string) {
  return path.join(getContentIngestRoot(), runId);
}

export function getContentIngestRunJsonPath(runId: string) {
  return path.join(getContentIngestRunDir(runId), "run.json");
}

export function getContentIngestRunSummaryPath(runId: string) {
  return path.join(getContentIngestRunDir(runId), "summary.md");
}

export function relativeToVault(absolutePath: string) {
  return path.relative(getVaultRoot(), absolutePath).replace(/\\/g, "/");
}

async function readJsonIfExists<T>(absolutePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toIndexEntry(run: ContentIngestRun): ContentIngestRunIndexEntry {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    platform: run.platform,
    archivePath: run.archivePath,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    candidatesFound: run.stats.candidatesFound,
    queueItems: run.queueItemIds.length,
  };
}

export async function readContentIngestRunIndex(): Promise<ContentIngestRunIndex> {
  return readJsonIfExists<ContentIngestRunIndex>(getContentIngestIndexPath(), {
    version: 1,
    updatedAt: new Date().toISOString(),
    runs: [],
  });
}

async function writeContentIngestRunIndex(index: ContentIngestRunIndex) {
  await fs.mkdir(path.dirname(getContentIngestIndexPath()), { recursive: true });
  await fs.writeFile(
    getContentIngestIndexPath(),
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        runs: index.runs,
      },
      null,
      2
    ),
    "utf8"
  );
}

function formatRunSummary(run: ContentIngestRun) {
  return [
    "---",
    `run_id: ${run.id}`,
    `kind: ${run.kind}`,
    `status: ${run.status}`,
    run.platform ? `platform: ${run.platform}` : "",
    `created_at: ${run.createdAt}`,
    run.completedAt ? `completed_at: ${run.completedAt}` : "",
    "---",
    "",
    `# Content Ingest Run — ${run.id}`,
    "",
    "## Summary",
    "",
    `- Kind: ${run.kind}`,
    `- Status: ${run.status}`,
    `- Platform: ${run.platform ?? "mixed"}`,
    `- Archive path: ${run.archivePath ?? "none"}`,
    "",
    "## Stats",
    "",
    `- Files scanned: ${run.stats.filesScanned}`,
    `- URLs found: ${run.stats.urlsFound}`,
    `- Candidates found: ${run.stats.candidatesFound}`,
    `- Queue added: ${run.stats.added}`,
    `- Queue updated: ${run.stats.updated}`,
    `- Queue unchanged: ${run.stats.unchanged}`,
    `- Duplicates skipped: ${run.stats.duplicatesSkipped}`,
    `- Warnings: ${run.stats.warnings}`,
    `- Errors: ${run.stats.errors}`,
    "",
    "## Candidates",
    "",
    run.candidates.length
      ? run.candidates
          .slice(0, 100)
          .map((candidate) => `- ${candidate.platform}:${candidate.externalId} — ${candidate.title ?? candidate.url}`)
          .join("\n")
      : "_None_",
    "",
    "## Warnings",
    "",
    run.warnings.length ? run.warnings.map((warning) => `- ${warning}`).join("\n") : "_None_",
    "",
    "## Errors",
    "",
    run.errors.length ? run.errors.map((error) => `- ${error}`).join("\n") : "_None_",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function writeContentIngestRun(run: ContentIngestRun) {
  const runDir = getContentIngestRunDir(run.id);
  const jsonPath = getContentIngestRunJsonPath(run.id);
  const summaryPath = getContentIngestRunSummaryPath(run.id);

  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(run, null, 2), "utf8");
  await fs.writeFile(summaryPath, formatRunSummary(run), "utf8");

  const index = await readContentIngestRunIndex();
  const entry = toIndexEntry(run);
  const existingIndex = index.runs.findIndex((existing) => existing.id === run.id);

  if (existingIndex >= 0) {
    index.runs[existingIndex] = entry;
  } else {
    index.runs.unshift(entry);
  }

  await writeContentIngestRunIndex(index);

  return {
    jsonPath: relativeToVault(jsonPath),
    summaryPath: relativeToVault(summaryPath),
  };
}

export async function readContentIngestRun(runId: string) {
  return readJsonIfExists<ContentIngestRun | null>(getContentIngestRunJsonPath(runId), null);
}

export async function listContentIngestRuns(limit = 20) {
  const index = await readContentIngestRunIndex();
  return index.runs.slice(0, limit);
}

export async function readLatestContentIngestRun() {
  const index = await readContentIngestRunIndex();
  const latest = index.runs[0];

  if (!latest) {
    return null;
  }

  return readContentIngestRun(latest.id);
}
