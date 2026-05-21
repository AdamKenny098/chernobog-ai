import fs from "node:fs/promises";
import { assertVaultMarkdownPath } from "../policy";
import { relativeToVault, resolveNotePath, titleFromPath } from "../paths";
import { addWikiLinkToLinksSection } from "../markdown/wikilinks";

export type LinkVaultNotesResult = {
  fromTitle: string;
  fromPath: string;
  fromRelativePath: string;
  toTitle: string;
  changed: boolean;
};

export async function linkVaultNotes(
  fromNote: string,
  toNote: string,
  relationship = "Related"
): Promise<LinkVaultNotesResult> {
  const fromPath = resolveNotePath(fromNote);
  assertVaultMarkdownPath(fromPath);

  const markdown = await fs.readFile(fromPath, "utf8");
  const nextMarkdown = addWikiLinkToLinksSection(markdown, toNote, relationship);
  const changed = nextMarkdown !== markdown;

  if (changed) {
    await fs.writeFile(fromPath, nextMarkdown, "utf8");
  }

  return {
    fromTitle: titleFromPath(fromPath),
    fromPath,
    fromRelativePath: relativeToVault(fromPath),
    toTitle: toNote,
    changed,
  };
}
