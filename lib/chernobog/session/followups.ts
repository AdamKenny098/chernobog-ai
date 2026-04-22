import os from "node:os";
import path from "node:path";
import { FollowUpResolution, PendingDisambiguation, SessionContext } from "./types";

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function normalizeFolderAlias(raw: string): string | null {
  const value = stripQuotes(raw).toLowerCase();
  const home = os.homedir();

  if (value === "documents" || value === "document" || value === "my documents") {
    return path.join(home, "Documents");
  }

  if (value === "desktop" || value === "my desktop") {
    return path.join(home, "Desktop");
  }

  if (value === "downloads" || value === "download" || value === "my downloads") {
    return path.join(home, "Downloads");
  }

  return null;
}

function ordinalToIndex(input: string): number | null {
  const lower = input.toLowerCase().trim();

  if (/\bfirst\b|\b1st\b/.test(lower)) return 1;
  if (/\bsecond\b|\b2nd\b/.test(lower)) return 2;
  if (/\bthird\b|\b3rd\b/.test(lower)) return 3;
  if (/\bfourth\b|\b4th\b/.test(lower)) return 4;
  if (/\bfifth\b|\b5th\b/.test(lower)) return 5;
  if (/\blast\b/.test(lower)) return -1;

  const indexedMatch = lower.match(/\b(?:result|item)\s*(\d{1,2})\b/);
  if (indexedMatch) {
    const parsed = Number(indexedMatch[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const plainNumberMatch = lower.match(/\b(\d{1,2})\b/);
  if (plainNumberMatch) {
    const parsed = Number(plainNumberMatch[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function buildFileSelectionPending(session: SessionContext): PendingDisambiguation | null {
  const results = session.fileContext?.lastSearch?.results ?? [];
  if (results.length === 0) return null;

  return {
    kind: "file_selection",
    prompt: "Which file result do you want me to use?",
    createdAt: new Date().toISOString(),
    options: results.slice(0, 8).map((result) => ({
      id: String(result.index),
      label: `${result.index}. ${result.name} — ${result.path}`,
      value: result.path,
      meta: { index: result.index },
    })),
  };
}

function resolveFromPendingSelection(input: string, session: SessionContext): string | null {
  const pending = session.pendingDisambiguation;
  if (!pending || pending.kind !== "file_selection") return null;

  const lower = input.trim().toLowerCase();
  const index = ordinalToIndex(lower);

  if (index !== null) {
    if (index === -1) {
      return pending.options[pending.options.length - 1]?.value ?? null;
    }

    const matched = pending.options.find((option) => Number(option.id) === index);
    return matched?.value ?? null;
  }

  if (/^\d+$/.test(lower)) {
    const matched = pending.options.find((option) => option.id === lower);
    return matched?.value ?? null;
  }

  const matchedByName = pending.options.find((option) =>
    option.label.toLowerCase().includes(lower)
  );

  return matchedByName?.value ?? null;
}

function resolveCurrentFile(session: SessionContext): string | null {
  const lastSelected = session.fileContext?.lastSelected?.path;
  if (lastSelected) return lastSelected;

  const lastRead = session.fileContext?.lastRead?.path;
  if (lastRead) return lastRead;

  const results = session.fileContext?.lastSearch?.results ?? [];
  if (results.length === 1) return results[0].path;

  return null;
}

function selectSearchResultByIndex(session: SessionContext, index: number): string | null {
  const results = session.fileContext?.lastSearch?.results ?? [];
  if (results.length === 0) return null;

  if (index === -1) {
    return results[results.length - 1]?.path ?? null;
  }

  const matched = results.find((item) => item.index === index);
  return matched?.path ?? null;
}

function isReadFollowUp(input: string): boolean {
  const lower = input.toLowerCase();
  return (
    /\bread\b/.test(lower) ||
    /\bshow\b/.test(lower) ||
    /\bopen\b/.test(lower) ||
    /\buse that\b/.test(lower) ||
    /\bthat file\b/.test(lower) ||
    /\bit again\b/.test(lower)
  );
}

function isNextPageFollowUp(input: string): boolean {
  return /\b(show|give me|display)\s+(the\s+)?next(\s+few|\s+\d+)?\b/i.test(input);
}

function extractNextCount(input: string, fallback: number): number {
  const match = input.match(/\bnext\s+(\d+)\b/i);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 20);
}

function isScopeShiftFollowUp(input: string): string | null {
  const match = input.match(
    /\b(?:search|look in|search in|check)\s+(documents|document|desktop|downloads|download)(?:\s+instead|\s+only)?\b/i
  );
  return match?.[1] ?? null;
}

export function looksLikeOrdinalFileFollowUp(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return isReadFollowUp(lower) && ordinalToIndex(lower) !== null;
}

export function tryResolveFollowUp(
  rawInput: string,
  session: SessionContext
): FollowUpResolution {
  const input = rawInput.trim();
  if (!input) return { kind: "none" };

  const scopeAlias = isScopeShiftFollowUp(input);
  if (scopeAlias) {
    const previousQuery = session.fileContext?.lastSearch?.query;
    if (!previousQuery) return { kind: "none" };

    const root = normalizeFolderAlias(scopeAlias);
    if (!root) return { kind: "none" };

    return {
      kind: "resolved_tool_action",
      tool: "find_files",
      input: {
        query: previousQuery,
        root,
        maxResults: 20,
      },
    };
  }

  if (isNextPageFollowUp(input)) {
    const lastSearch = session.fileContext?.lastSearch;
    if (!lastSearch || lastSearch.results.length === 0) {
      return { kind: "none" };
    }

    const count = extractNextCount(input, lastSearch.pageSize || 5);
    const nextOffset = lastSearch.offset + (lastSearch.pageSize || 5);
    const nextSlice = lastSearch.results.slice(nextOffset, nextOffset + count);

    if (nextSlice.length === 0) {
      return {
        kind: "needs_disambiguation",
        message: "There are no more file results after the last batch I showed you.",
        pending: {
          kind: "generic_selection",
          prompt: "No more results remain.",
          options: [],
          createdAt: new Date().toISOString(),
        },
      };
    }

    return {
      kind: "resolved_tool_action",
      tool: "find_files",
      input: {
        query: lastSearch.query,
        root: lastSearch.normalizedRoot ?? lastSearch.root,
        maxResults: lastSearch.results.length,
      },
    };
  }

  const index = ordinalToIndex(input);
  if (index !== null && isReadFollowUp(input)) {
    const selectedPath = selectSearchResultByIndex(session, index);
    if (selectedPath) {
      return {
        kind: "resolved_tool_action",
        tool: "read_text_file",
        input: { path: selectedPath },
      };
    }

    const pendingResolvedPath = resolveFromPendingSelection(input, session);
    if (pendingResolvedPath) {
      return {
        kind: "resolved_tool_action",
        tool: "read_text_file",
        input: { path: pendingResolvedPath },
      };
    }

    const pending = buildFileSelectionPending(session);
    if (pending) {
      return {
        kind: "needs_disambiguation",
        message: "I could not map that result number to the current file search.",
        pending,
      };
    }

    return {
      kind: "needs_disambiguation",
      message: "I do not have an active file result set to resolve that against.",
      pending: {
        kind: "generic_selection",
        prompt: "No active file search is available.",
        options: [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const pendingResolvedPath = resolveFromPendingSelection(input, session);
  if (pendingResolvedPath) {
    return {
      kind: "resolved_tool_action",
      tool: "read_text_file",
      input: { path: pendingResolvedPath },
    };
  }

  if (
    /\b(read that|read it again|use that file|use that one|that file again|read that file)\b/i.test(input)
  ) {
    const currentPath = resolveCurrentFile(session);
    if (currentPath) {
      return {
        kind: "resolved_tool_action",
        tool: "read_text_file",
        input: { path: currentPath },
      };
    }

    const pending = buildFileSelectionPending(session);
    if (pending) {
      return {
        kind: "needs_disambiguation",
        message: "Which file do you want me to use?",
        pending,
      };
    }
  }

  return { kind: "none" };
}