import fs from "node:fs/promises";
import path from "node:path";
import { assertInsideVault, assertMarkdownPath } from "../policy";
import { relativeToVault, resolveNotePath, titleFromPath } from "../paths";
import { buildFrontmatter } from "./frontmatter";
import type { VaultNoteFrontmatter } from "../types";

export type WriteVaultNoteOptions = {
  folder?: string;
  overwrite?: boolean;
  frontmatter?: VaultNoteFrontmatter;
};

export type WriteVaultNoteResult = {
  title: string;
  path: string;
  relativePath: string;
  created: boolean;
  overwritten: boolean;
};

export async function writeVaultNote(
  titleOrPath: string,
  body: string,
  options: WriteVaultNoteOptions = {}
): Promise<WriteVaultNoteResult> {
  const notePath = resolveNotePath(titleOrPath, { folder: options.folder });
  assertInsideVault(notePath);
  assertMarkdownPath(notePath);

  const exists = await fs
    .access(notePath)
    .then(() => true)
    .catch(() => false);

  if (exists && !options.overwrite) {
    throw new Error(`Vault note already exists: ${relativeToVault(notePath)}`);
  }

  await fs.mkdir(path.dirname(notePath), { recursive: true });

  const frontmatter = buildFrontmatter(options.frontmatter ?? {});
  const content = `${frontmatter}${body.trim()}\n`;
  await fs.writeFile(notePath, content, "utf8");

  return {
    title: titleFromPath(notePath),
    path: notePath,
    relativePath: relativeToVault(notePath),
    created: !exists,
    overwritten: exists,
  };
}
