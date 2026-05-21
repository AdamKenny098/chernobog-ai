import fs from "node:fs/promises";
import { assertVaultMarkdownPath } from "../policy";
import { relativeToVault, resolveNotePath, titleFromPath } from "../paths";
import { extractWikiLinks } from "./wikilinks";
import { parseFrontmatter } from "./frontmatter";
import type { VaultNoteSummary } from "../types";

export type ReadVaultNoteResult = {
  title: string;
  path: string;
  relativePath: string;
  content: string;
  truncated: boolean;
  frontmatter: VaultNoteSummary["frontmatter"];
  links: string[];
};

export async function readVaultNote(
  titleOrPath: string,
  options: { folder?: string; maxChars?: number } = {}
): Promise<ReadVaultNoteResult> {
  const notePath = resolveNotePath(titleOrPath, { folder: options.folder });
  assertVaultMarkdownPath(notePath);

  const raw = await fs.readFile(notePath, "utf8");
  const maxChars = options.maxChars ?? 12000;
  const truncated = raw.length > maxChars;
  const content = truncated ? raw.slice(0, maxChars) : raw;
  const parsed = parseFrontmatter(raw);

  return {
    title: titleFromPath(notePath),
    path: notePath,
    relativePath: relativeToVault(notePath),
    content,
    truncated,
    frontmatter: parsed.frontmatter,
    links: extractWikiLinks(raw),
  };
}
