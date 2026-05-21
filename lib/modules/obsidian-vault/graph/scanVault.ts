import fs from "node:fs/promises";
import path from "node:path";
import { getVaultConfig } from "../config";
import { relativeToVault, titleFromPath } from "../paths";
import { parseFrontmatter } from "../markdown/frontmatter";
import { extractWikiLinks } from "../markdown/wikilinks";
import type { VaultNoteSummary, VaultSearchResult } from "../types";

const IGNORED_DIRS = new Set([".obsidian", ".trash", "node_modules", ".git"]);

function extractTags(markdown: string, frontmatter: VaultNoteSummary["frontmatter"]): string[] {
  const tags = new Set<string>();
  const fmTags = frontmatter.tags;

  if (Array.isArray(fmTags)) {
    for (const tag of fmTags) tags.add(tag.replace(/^#/, ""));
  } else if (typeof fmTags === "string") {
    for (const tag of fmTags.split(/[ ,]+/)) {
      if (tag.trim()) tags.add(tag.trim().replace(/^#/, ""));
    }
  }

  for (const match of markdown.matchAll(/(^|\s)#([a-zA-Z0-9_/-]+)/g)) {
    tags.add(match[2]);
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}

function excerptFromMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`\[\]]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);
}

async function walkMarkdownFiles(
  directory: string,
  limit: number,
  results: string[] = []
): Promise<string[]> {
  if (results.length >= limit) return results;

  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= limit) break;
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walkMarkdownFiles(fullPath, limit, results);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

export async function scanVaultNotes(options: { folder?: string } = {}): Promise<VaultNoteSummary[]> {
  const config = getVaultConfig();
  const scanRoot = options.folder ? path.join(config.root, options.folder) : config.root;
  const files = await walkMarkdownFiles(scanRoot, config.scanLimit);
  const summaries: VaultNoteSummary[] = [];

  for (const file of files) {
    const stat = await fs.stat(file);
    const markdown = await fs.readFile(file, "utf8");
    const parsed = parseFrontmatter(markdown);

    summaries.push({
      title: titleFromPath(file),
      path: file,
      relativePath: relativeToVault(file, config.root),
      extension: ".md",
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString(),
      frontmatter: parsed.frontmatter,
      tags: extractTags(markdown, parsed.frontmatter),
      links: extractWikiLinks(markdown),
      excerpt: excerptFromMarkdown(parsed.body),
    });
  }

  return summaries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function scoreNote(note: VaultNoteSummary, queryParts: string[]): VaultSearchResult | null {
  let score = 0;
  const matchedFields = new Set<string>();
  const title = note.title.toLowerCase();
  const relativePath = note.relativePath.toLowerCase();
  const excerpt = note.excerpt.toLowerCase();
  const tags = note.tags.join(" ").toLowerCase();
  const links = note.links.join(" ").toLowerCase();

  for (const part of queryParts) {
    if (title.includes(part)) {
      score += 10;
      matchedFields.add("title");
    }
    if (relativePath.includes(part)) {
      score += 6;
      matchedFields.add("path");
    }
    if (tags.includes(part)) {
      score += 5;
      matchedFields.add("tags");
    }
    if (links.includes(part)) {
      score += 4;
      matchedFields.add("links");
    }
    if (excerpt.includes(part)) {
      score += 2;
      matchedFields.add("body");
    }
  }

  if (score === 0) return null;

  return {
    ...note,
    score,
    matchedFields: [...matchedFields],
  };
}

export async function searchVaultNotes(
  query: string,
  options: { folder?: string; maxResults?: number } = {}
): Promise<VaultSearchResult[]> {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return [];

  const queryParts = cleaned.split(/\s+/).filter(Boolean);
  const notes = await scanVaultNotes({ folder: options.folder });
  const results = notes
    .map((note) => scoreNote(note, queryParts))
    .filter((note): note is VaultSearchResult => note !== null)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return results.slice(0, options.maxResults ?? 20);
}
