import type { SessionContext } from "@/lib/chernobog/session/types";

export function buildWorkflowSnapshot(session: SessionContext) {
  const workflow = session.workflow;

  if (workflow.kind !== "file") {
    return {
      workflowKind: workflow.kind,
      workflowStep: "none",
      candidateCount: 0,
      selectedFile: session.fileContext?.lastSelected?.path ?? null,
      readFile: session.fileContext?.lastRead?.path ?? null,
      pendingDisambiguation: Boolean(session.pendingDisambiguation),
    };
  }

  const selectedCandidate = workflow.candidates.find(
    (candidate) => candidate.id === workflow.selectedCandidateId
  );

  const readCandidate = workflow.candidates.find(
    (candidate) => candidate.id === workflow.readCandidateId
  );

  return {
    workflowKind: workflow.kind,
    workflowStep: workflow.step,
    query: workflow.query ?? null,
    root: workflow.root ?? null,
    candidateCount: workflow.candidates.length,
    awaitingDisambiguation: workflow.awaitingDisambiguation,
    selectedFile:
      selectedCandidate?.path ??
      session.fileContext?.lastSelected?.path ??
      null,
    readFile:
      readCandidate?.path ??
      session.fileContext?.lastRead?.path ??
      null,
    pendingDisambiguation: Boolean(session.pendingDisambiguation),
  };
}