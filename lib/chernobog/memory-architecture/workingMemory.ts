import type { SessionContext } from "@/lib/chernobog/session/types";
import type { WorkingMemorySnapshot } from "./types";

function getActivePlanSnapshot(session: SessionContext): WorkingMemorySnapshot["activePlan"] {
  if (!session.activePlan) {
    return null;
  }

  return {
    id: session.activePlan.id,
    title: session.activePlan.title,
    status: session.activePlan.status,
    stepCount: session.activePlan.steps.length,
    activeStep:
      session.activePlan.steps.find((step) => step.status === "active")?.title ??
      null,
  };
}

export function buildWorkingMemorySnapshot(
  session: SessionContext
): WorkingMemorySnapshot {
  const workflow = session.workflow;

  const selectedCandidate =
    workflow.kind === "file"
      ? workflow.candidates.find(
          (candidate) => candidate.id === workflow.selectedCandidateId
        )
      : null;

  const readCandidate =
    workflow.kind === "file"
      ? workflow.candidates.find(
          (candidate) => candidate.id === workflow.readCandidateId
        )
      : null;

  return {
    sessionId: session.sessionId,
    lastRoute: session.lastRoute ?? null,
    lastTool: session.lastTool?.name ?? null,
    activePlan: getActivePlanSnapshot(session),
    fileContext: {
      lastSearchQuery:
        workflow.kind === "file"
          ? workflow.query ?? session.fileContext?.lastSearch?.query ?? null
          : session.fileContext?.lastSearch?.query ?? null,
      lastSearchRoot:
        workflow.kind === "file"
          ? workflow.root ??
            session.fileContext?.lastSearch?.normalizedRoot ??
            session.fileContext?.lastSearch?.root ??
            null
          : session.fileContext?.lastSearch?.normalizedRoot ??
            session.fileContext?.lastSearch?.root ??
            null,
      lastSelectedFile:
        selectedCandidate?.path ?? session.fileContext?.lastSelected?.path ?? null,
      lastReadFile:
        readCandidate?.path ?? session.fileContext?.lastRead?.path ?? null,
      workflowKind: workflow.kind,
      workflowStep: workflow.kind === "file" ? workflow.step : "none",
      workflowCandidateCount:
        workflow.kind === "file" ? workflow.candidates.length : 0,
    },
  };
}

export function formatWorkingMemory(snapshot: WorkingMemorySnapshot): string[] {
  const lines: string[] = [];

  lines.push(`Session: ${snapshot.sessionId}`);

  if (snapshot.lastRoute) {
    lines.push(`Last route: ${snapshot.lastRoute}`);
  }

  if (snapshot.lastTool) {
    lines.push(`Last tool: ${snapshot.lastTool}`);
  }

  if (snapshot.activePlan) {
    lines.push(`Active plan: ${snapshot.activePlan.title}`);
    lines.push(`Plan status: ${snapshot.activePlan.status}`);
    lines.push(`Plan steps: ${snapshot.activePlan.stepCount}`);
    lines.push(
      `Current plan step: ${snapshot.activePlan.activeStep ?? "none"}`
    );
  }

  if (snapshot.fileContext.lastSearchQuery) {
    lines.push(`Last file search: ${snapshot.fileContext.lastSearchQuery}`);
  }

  if (snapshot.fileContext.lastSearchRoot) {
    lines.push(`Last search root: ${snapshot.fileContext.lastSearchRoot}`);
  }

  if (snapshot.fileContext.lastSelectedFile) {
    lines.push(`Selected file: ${snapshot.fileContext.lastSelectedFile}`);
  }

  if (snapshot.fileContext.lastReadFile) {
    lines.push(`Last read file: ${snapshot.fileContext.lastReadFile}`);
  }

  lines.push(`Workflow: ${snapshot.fileContext.workflowKind}/${snapshot.fileContext.workflowStep}`);
  lines.push(`Workflow candidates: ${snapshot.fileContext.workflowCandidateCount}`);

  return lines;
}