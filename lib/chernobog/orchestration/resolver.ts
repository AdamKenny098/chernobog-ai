import type { SessionContext } from "@/lib/chernobog/session/types";

export function getFirstSearchResultPath(session: SessionContext): string | null {
  const fromFileContext = session.fileContext?.lastSearch?.results?.[0]?.path;

  if (fromFileContext) {
    return fromFileContext;
  }

  if (session.workflow.kind === "file") {
    return session.workflow.candidates[0]?.path ?? null;
  }

  return null;
}

export function getSelectedFilePath(session: SessionContext): string | null {
  const selectedPath = session.fileContext?.lastSelected?.path;

  if (selectedPath) {
    return selectedPath;
  }

  if (session.workflow.kind !== "file") {
    return null;
  }

  const selectedId = session.workflow.selectedCandidateId;

  if (!selectedId) {
    return session.workflow.candidates[0]?.path ?? null;
  }

  const selected = session.workflow.candidates.find(
    (candidate) => candidate.id === selectedId || candidate.path === selectedId
  );

  return selected?.path ?? selectedId;
}

export function getLastReadFilePath(session: SessionContext): string | null {
  return session.fileContext?.lastRead?.path ?? null;
}