import type { VaultSessionState } from "./vaultSession";

export function summarizeVaultState(state: VaultSessionState): string {
  const lines: string[] = [];

  if (state.activeNote) {
    lines.push(
      `Active vault note: ${state.activeNote.title} (${state.activeNote.lastAction})`
    );
  }

  if (state.lastSearch) {
    lines.push(
      `Last vault search: "${state.lastSearch.query}" returned ${state.lastSearch.resultCount} result(s)`
    );
  }

  if (state.lastBacklinks) {
    lines.push(
      `Last backlink check: ${state.lastBacklinks.note} has ${state.lastBacklinks.count} backlink(s)`
    );
  }

  if (typeof state.lastOrphanCount === "number") {
    lines.push(`Last orphan scan: ${state.lastOrphanCount} orphan note(s)`);
  }

  return lines.length > 0 ? lines.join("\n") : "No vault session state yet.";
}
