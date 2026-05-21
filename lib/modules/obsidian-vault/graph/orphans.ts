import { normalizeNoteTitle } from "../paths";
import { scanVaultNotes } from "./scanVault";
import type { VaultNoteSummary } from "../types";

function isIgnoredOrphanCandidate(note: VaultNoteSummary): boolean {
  const path = note.relativePath.toLowerCase();
  return (
    path.startsWith("08_templates/") ||
    path.startsWith("templates/") ||
    path.includes("/templates/") ||
    note.frontmatter.type === "template"
  );
}

export async function findOrphanNotes(): Promise<VaultNoteSummary[]> {
  const notes = await scanVaultNotes();
  const inboundCounts = new Map<string, number>();

  for (const note of notes) {
    inboundCounts.set(normalizeNoteTitle(note.title).toLowerCase(), 0);
  }

  for (const note of notes) {
    for (const link of note.links) {
      const key = normalizeNoteTitle(link).toLowerCase();
      inboundCounts.set(key, (inboundCounts.get(key) ?? 0) + 1);
    }
  }

  return notes
    .filter((note) => !isIgnoredOrphanCandidate(note))
    .filter((note) => {
      const key = normalizeNoteTitle(note.title).toLowerCase();
      const inboundCount = inboundCounts.get(key) ?? 0;
      return inboundCount === 0 && note.links.length === 0;
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
