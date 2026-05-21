import { normalizeNoteTitle } from "../paths";
import { scanVaultNotes } from "./scanVault";
import type { VaultBacklink } from "../types";

export async function findBacklinks(noteTitle: string): Promise<VaultBacklink[]> {
  const target = normalizeNoteTitle(noteTitle).toLowerCase();
  const notes = await scanVaultNotes();

  return notes
    .map((note) => {
      const matchingLinks = note.links.filter(
        (link) => normalizeNoteTitle(link).toLowerCase() === target
      );

      if (matchingLinks.length === 0) return null;

      return {
        sourceTitle: note.title,
        sourcePath: note.path,
        sourceRelativePath: note.relativePath,
        matchingLinks,
      } satisfies VaultBacklink;
    })
    .filter((backlink): backlink is VaultBacklink => backlink !== null)
    .sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle));
}
