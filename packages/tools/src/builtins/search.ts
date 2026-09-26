import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";
import {
  ensureAllowedPath,
  getNormalizedExtension,
  isReadableTextFileName,
  resolveSearchRoot,
  shouldSkipDirectory,
} from "../fs-policy";

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_CAP = 50;
const MAX_DEPTH = 6;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

    const fullPath = path.join(currentDir, dirent.name);

    if (dirent.isDirectory()) {
      if (shouldSkipDirectory(dirent.name)) {
        continue;
      }

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

    if (!isReadableTextFileName(dirent.name)) {
      continue;
    }

    matches.push({
      path: fullPath,
      name: dirent.name,
      extension: getNormalizedExtension(dirent.name),
    });
  }
}

function scoreMatch(match: SearchMatch, queryLower: string): number {
  let score = 0;

  const fullPathLower = match.path.toLowerCase();
  const nameLower = match.name.toLowerCase();
  const ext = match.extension;
  const stem = nameLower.endsWith(ext) ? nameLower.slice(0, -ext.length) : nameLower;
  const wordRegex = new RegExp(`\\b${escapeRegExp(queryLower)}\\b`, "i");

  if (stem === queryLower) score += 200;
  if (nameLower === queryLower) score += 180;
  if (stem.startsWith(queryLower)) score += 100;
  if (nameLower.startsWith(queryLower)) score += 70;
  if (wordRegex.test(stem)) score += 50;
  if (wordRegex.test(nameLower)) score += 30;
  if (nameLower.includes(queryLower)) score += 15;

  if (fullPathLower.includes(`${path.sep}documents${path.sep}`)) score += 20;
  if (fullPathLower.includes(`${path.sep}desktop${path.sep}`)) score += 10;
  if (fullPathLower.includes(`${path.sep}downloads${path.sep}`)) score += 5;

  score -= Math.min(stem.length, 80) * 0.35;

  return score;
}

export const findFilesTool: ToolDefinition<FindFilesInput, FindFilesOutput> = {
  name: "find_files",
  description: "Find readable text files by name within an allowed root",
  inputSchema: findFilesInputSchema,
  execute: async (input) => {
    const root = resolveSearchRoot(input.root);
    const query = input.query.trim();
    const queryLower = query.toLowerCase();
    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

    const matches: SearchMatch[] = [];
    await walkForMatches(root, queryLower, matches, maxResults * 2, 0);

    matches.sort((a, b) => {
      const scoreDiff = scoreMatch(b, queryLower) - scoreMatch(a, queryLower);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });

    return {
      root: ensureAllowedPath(root),
      query,
      matches: matches.slice(0, maxResults),
    };
  },
};