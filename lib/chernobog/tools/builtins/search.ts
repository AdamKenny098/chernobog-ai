import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_CAP = 50;
const MAX_DEPTH = 10;

const PREFERRED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".cs",
  ".py",
  ".html",
  ".css",
  ".xml",
  ".yml",
  ".yaml",
  ".csv",
  ".log",
  ".docx",
  ".pdf",
]);

function getAllowedRoots(): string[] {
  const home = os.homedir();

  return [
    home,
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Downloads"),
    process.cwd(),
  ];
}

function isPathWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function ensureAllowedPath(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const allowedRoots = getAllowedRoots().map((root) => path.resolve(root));

  const allowed = allowedRoots.some((root) => isPathWithin(root, resolved));

  if (!allowed) {
    throw new Error("Path is outside allowed roots");
  }

  return resolved;
}

function resolveSearchRoot(rawRoot?: string): string {
  if (!rawRoot || !rawRoot.trim()) {
    return path.resolve(os.homedir());
  }

  return ensureAllowedPath(rawRoot);
}

const findFilesInputSchema = z.object({
  query: z.string().min(1),
  root: z.string().min(1).optional(),
  maxResults: z.number().int().positive().max(MAX_RESULTS_CAP).optional(),
});

type FindFilesInput = z.infer<typeof findFilesInputSchema>;

type FindFilesOutput = {
  root: string;
  query: string;
  matches: {
    path: string;
    name: string;
    extension: string;
  }[];
};

type SearchMatch = {
  path: string;
  name: string;
  extension: string;
};

async function walkForMatches(
  currentDir: string,
  queryLower: string,
  matches: SearchMatch[],
  maxResults: number,
  depth: number
): Promise<void> {
  if (matches.length >= maxResults || depth > MAX_DEPTH) {
    return;
  }

  let dirents: Dirent[];

  try {
    dirents = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const dirent of dirents) {
    if (matches.length >= maxResults) {
      return;
    }

    if (dirent.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(currentDir, dirent.name);

    if (dirent.isDirectory()) {
      await walkForMatches(fullPath, queryLower, matches, maxResults, depth + 1);
      continue;
    }

    if (!dirent.isFile()) {
      continue;
    }

    const lowerName = dirent.name.toLowerCase();
    if (!lowerName.includes(queryLower)) {
      continue;
    }

    matches.push({
      path: fullPath,
      name: dirent.name,
      extension: path.extname(dirent.name).toLowerCase(),
    });
  }
}

function scoreMatch(match: SearchMatch, queryLower: string): number {
  let score = 0;
  const nameLower = match.name.toLowerCase();

  if (nameLower === queryLower) score += 100;
  if (nameLower.startsWith(queryLower)) score += 40;
  if (nameLower.includes(queryLower)) score += 20;
  if (PREFERRED_EXTENSIONS.has(match.extension)) score += 10;

  return score;
}

export const findFilesTool: ToolDefinition<FindFilesInput, FindFilesOutput> = {
  name: "find_files",
  description: "Find files by name within an allowed root",
  inputSchema: findFilesInputSchema,
  execute: async (input) => {
    const root = resolveSearchRoot(input.root);
    const query = input.query.trim();
    const queryLower = query.toLowerCase();
    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

    const matches: SearchMatch[] = [];
    await walkForMatches(root, queryLower, matches, maxResults, 0);

    matches.sort((a, b) => {
      const scoreDiff = scoreMatch(b, queryLower) - scoreMatch(a, queryLower);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });

    return {
      root,
      query,
      matches: matches.slice(0, maxResults),
    };
  },
};