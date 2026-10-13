// lib/chernobog/tools/builtins/search-project-notes.ts

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../types";

const searchProjectNotesInputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(20).optional(),
});

type SearchProjectNotesInput = z.infer<typeof searchProjectNotesInputSchema>;

type SearchProjectNotesMatch = {
  noteName: string;
  relativePath: string;
  lineNumber: number;
  line: string;
  score: number;
};

type SearchProjectNotesOutput = {
  query: string;
  matches: SearchProjectNotesMatch[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9_.-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function getVaultRoot() {
  return path.resolve(process.cwd(), "vault", "chernobog");
}

async function listMarkdownFiles(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => path.join(root, entry.name));
}

function scoreLine(line: string, query: string) {
  const normalizedLine = normalize(line);
  const normalizedQuery = normalize(query);
  const queryTokens = tokenize(query);

  if (normalizedLine.includes(normalizedQuery)) {
    return 100 + queryTokens.length;
  }

  let score = 0;

  for (const token of queryTokens) {
    if (normalizedLine.includes(token)) {
      score += 10;
    }
  }

  return score;
}

export const searchProjectNotesTool: ToolDefinition<
  SearchProjectNotesInput,
  SearchProjectNotesOutput
> = {
  name: "search_project_notes",
  description: "Search markdown notes in the local Chernobog project knowledge vault",
  inputSchema: searchProjectNotesInputSchema,
  execute: async (input) => {
    const vaultRoot = getVaultRoot();
    const files = await listMarkdownFiles(vaultRoot);
    const maxResults = input.maxResults ?? 10;

    const matches: SearchProjectNotesMatch[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, "utf8");
      const lines = content.split(/\r?\n/);
      const noteName = path.basename(file, ".md");

      lines.forEach((line, index) => {
        const score = scoreLine(line, input.query);

        if (score > 0) {
          matches.push({
            noteName,
            relativePath: path.relative(process.cwd(), file),
            lineNumber: index + 1,
            line: line.trim(),
            score,
          });
        }
      });
    }

    matches.sort((a, b) => b.score - a.score);

    return {
      query: input.query,
      matches: matches.slice(0, maxResults),
    };
  },
};