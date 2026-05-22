import type { ToolResult } from "@/lib/chernobog/tools/types";
import type {
  VaultActiveNote,
  VaultBacklink,
  VaultCommandAction,
  VaultModulePayload,
  VaultNoteSummary,
  VaultSearchResult,
  VaultSessionState,
} from "../types";

const sessionStore = new Map<string, VaultSessionState>();

function now(): string {
  return new Date().toISOString();
}

function getResultData<T>(result: ToolResult<unknown>): T | null {
  if (!result.ok) {
    return null;
  }

  return result.data as T;
}

function createEmptyState(sessionId: string): VaultSessionState {
  return {
    sessionId,
  };
}

function noteLikeToActiveNote(
  value: {
    title?: string;
    path?: string;
    relativePath?: string;
    fromTitle?: string;
    fromPath?: string;
    fromRelativePath?: string;
  },
  lastAction: VaultActiveNote["lastAction"]
): VaultActiveNote | null {
  const title = value.title ?? value.fromTitle;
  const path = value.path ?? value.fromPath;
  const relativePath = value.relativePath ?? value.fromRelativePath;

  if (!title || !path || !relativePath) {
    return null;
  }

  return {
    title,
    path,
    relativePath,
    lastAction,
  };
}

export function emptyVaultSessionState(sessionId = "default"): VaultSessionState {
  return createEmptyState(sessionId);
}

export function getVaultSessionState(sessionId: string): VaultSessionState {
  const existing = sessionStore.get(sessionId);

  if (existing) {
    return existing;
  }

  const created = createEmptyState(sessionId);
  sessionStore.set(sessionId, created);
  return created;
}

export function replaceVaultSessionState(
  sessionId: string,
  state: VaultSessionState
): VaultSessionState {
  sessionStore.set(sessionId, state);
  return state;
}

export function clearVaultSessionState(sessionId: string): VaultSessionState {
  const state = createEmptyState(sessionId);
  sessionStore.set(sessionId, state);
  return state;
}

export function resolveVaultOrdinalReference(
  sessionId: string,
  ordinalText: string
): VaultSearchResult | null {
  const state = getVaultSessionState(sessionId);

  if (!state.lastSearch?.results.length) {
    return null;
  }

  const key = ordinalText.trim().toLowerCase();
  const ordinalMap: Record<string, number> = {
    first: 0,
    "1": 0,
    "1st": 0,
    second: 1,
    "2": 1,
    "2nd": 1,
    third: 2,
    "3": 2,
    "3rd": 2,
    fourth: 3,
    "4": 3,
    "4th": 3,
    fifth: 4,
    "5": 4,
    "5th": 4,
    sixth: 5,
    "6": 5,
    "6th": 5,
    seventh: 6,
    "7": 6,
    "7th": 6,
    eighth: 7,
    "8": 7,
    "8th": 7,
    ninth: 8,
    "9": 8,
    "9th": 8,
    tenth: 9,
    "10": 9,
    "10th": 9,
  };

  const index = ordinalMap[key];

  if (typeof index !== "number") {
    return null;
  }

  const note = state.lastSearch.results[index];

  if (!note) {
    return null;
  }

  state.lastSearch.selectedIndex = index;
  replaceVaultSessionState(sessionId, state);
  return note;
}

export function resolveActiveVaultNote(sessionId: string): VaultActiveNote | null {
  return getVaultSessionState(sessionId).activeNote ?? null;
}

export function setActiveVaultNote(
  sessionId: string,
  activeNote: VaultActiveNote
): VaultSessionState {
  const state = getVaultSessionState(sessionId);
  state.activeNote = activeNote;
  return replaceVaultSessionState(sessionId, state);
}

export function rememberVaultAction(
  sessionId: string,
  action: VaultCommandAction,
  summary: string
): VaultSessionState {
  const state = getVaultSessionState(sessionId);
  state.lastAction = {
    action,
    summary,
    updatedAt: now(),
  };
  return replaceVaultSessionState(sessionId, state);
}

export function updateVaultSessionFromToolResult(
  sessionId: string,
  action: VaultCommandAction,
  result: ToolResult<unknown>
): VaultSessionState {
  const state = getVaultSessionState(sessionId);

  if (!result.ok) {
    state.lastAction = {
      action,
      summary: `Vault action failed: ${result.error}`,
      updatedAt: now(),
    };
    return replaceVaultSessionState(sessionId, state);
  }

  switch (result.tool) {
    case "vault_search": {
      const data = getResultData<{
        query: string;
        resultCount: number;
        results: VaultSearchResult[];
      }>(result);

      if (data) {
        state.lastSearch = {
          query: data.query,
          resultCount: data.resultCount,
          results: data.results,
          updatedAt: now(),
        };
        state.lastAction = {
          action,
          summary: `Searched vault for "${data.query}" and found ${data.resultCount} note(s).`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_read_note": {
      const data = getResultData<{
        title: string;
        path: string;
        relativePath: string;
      }>(result);
      const active = data ? noteLikeToActiveNote(data, "read") : null;

      if (active) {
        state.activeNote = active;
        state.lastAction = {
          action,
          summary: `Read vault note [[${active.title}]].`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_create_note": {
      const data = getResultData<{
        title: string;
        path: string;
        relativePath: string;
      }>(result);
      const active = data ? noteLikeToActiveNote(data, "created") : null;

      if (active) {
        state.activeNote = active;
        state.lastAction = {
          action,
          summary: `Created vault note [[${active.title}]].`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_append_note": {
      const data = getResultData<{
        title: string;
        path: string;
        relativePath: string;
        appendedChars: number;
      }>(result);
      const active = data ? noteLikeToActiveNote(data, "appended") : null;

      if (active) {
        state.activeNote = active;
        state.lastAction = {
          action,
          summary: `Appended ${data?.appendedChars ?? 0} character(s) to [[${active.title}]].`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_link_notes": {
      const data = getResultData<{
        fromTitle: string;
        fromPath?: string;
        fromRelativePath: string;
        toTitle: string;
      }>(result);
      const active = data ? noteLikeToActiveNote(data, "linked") : null;

      if (active) {
        state.activeNote = active;
        state.lastAction = {
          action,
          summary: `Linked [[${active.title}]] to [[${data?.toTitle ?? "unknown"}]].`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_backlinks": {
      const data = getResultData<{
        note: string;
        count: number;
        results: VaultBacklink[];
      }>(result);

      if (data) {
        state.lastBacklinks = {
          note: data.note,
          count: data.count,
          results: data.results,
          updatedAt: now(),
        };
        state.lastGraphAction = {
          type: "backlinks",
          target: data.note,
          resultCount: data.count,
          updatedAt: now(),
        };
        state.lastAction = {
          action,
          summary: `Checked backlinks for [[${data.note}]].`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_find_orphans": {
      const data = getResultData<{
        count: number;
        returnedCount: number;
        results: VaultNoteSummary[];
      }>(result);

      if (data) {
        state.lastOrphans = {
          count: data.count,
          returnedCount: data.returnedCount,
          results: data.results,
          updatedAt: now(),
        };
        state.lastGraphAction = {
          type: "orphans",
          resultCount: data.count,
          updatedAt: now(),
        };
        state.lastAction = {
          action,
          summary: `Scanned vault and found ${data.count} orphan note(s).`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_generate_index": {
      const data = getResultData<{
        project: string;
        path?: string;
        relativePath: string;
        noteCount: number;
      }>(result);

      if (data) {
        state.lastGraphAction = {
          type: "index",
          target: data.project,
          resultCount: data.noteCount,
          updatedAt: now(),
        };
        state.lastAction = {
          action,
          summary: `Generated index for ${data.project}.`,
          updatedAt: now(),
        };
      }
      break;
    }

    case "vault_daily_log": {
      const data = getResultData<{
        title: string;
        path: string;
        relativePath: string;
        date: string;
      }>(result);
      const active = data ? noteLikeToActiveNote(data, "logged") : null;

      if (active) {
        state.activeNote = active;
        state.lastAction = {
          action,
          summary: `Updated daily vault log for ${data?.date ?? "today"}.`,
          updatedAt: now(),
        };
      }
      break;
    }
  }

  return replaceVaultSessionState(sessionId, state);
}

export function buildVaultModulePayload(sessionId: string): VaultModulePayload {
  const state = getVaultSessionState(sessionId);

  return {
    activeVaultNote: state.activeNote,
    vaultSearch: state.lastSearch
      ? {
          query: state.lastSearch.query,
          resultCount: state.lastSearch.resultCount,
          results: state.lastSearch.results,
          selectedIndex: state.lastSearch.selectedIndex,
        }
      : undefined,
    backlinks: state.lastBacklinks
      ? {
          note: state.lastBacklinks.note,
          count: state.lastBacklinks.count,
          results: state.lastBacklinks.results,
        }
      : undefined,
    orphans: state.lastOrphans
      ? {
          count: state.lastOrphans.count,
          returnedCount: state.lastOrphans.returnedCount,
          results: state.lastOrphans.results,
        }
      : undefined,
    graphAction: state.lastGraphAction,
    stateSummary: summarizeVaultState(state),
  };
}

export function summarizeVaultState(state: VaultSessionState): string {
  const lines: string[] = [];

  if (state.activeNote) {
    lines.push(
      `Active vault note: [[${state.activeNote.title}]] (${state.activeNote.lastAction})`
    );
  }

  if (state.lastSearch) {
    lines.push(
      `Last vault search: "${state.lastSearch.query}" returned ${state.lastSearch.resultCount} note(s)`
    );
  }

  if (state.lastBacklinks) {
    lines.push(
      `Last backlink check: [[${state.lastBacklinks.note}]] has ${state.lastBacklinks.count} backlink(s)`
    );
  }

  if (state.lastOrphans) {
    lines.push(
      `Last orphan scan: ${state.lastOrphans.count} orphan note(s), ${state.lastOrphans.returnedCount} shown`
    );
  }

  if (state.lastAction) {
    lines.push(`Last vault action: ${state.lastAction.summary}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No vault session state yet.";
}
