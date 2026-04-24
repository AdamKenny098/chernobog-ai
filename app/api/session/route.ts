import { NextResponse } from "next/server";
import {
  getSessionContext,
  resolveSessionId,
} from "@/lib/chernobog/session/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = resolveSessionId(url.searchParams.get("sessionId"));

  const session = getSessionContext(sessionId);
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

  return NextResponse.json({
    sessionId,
    route: session.lastRoute ?? "idle",
    tool: session.lastTool?.name ?? "none",
    toolSummary: session.lastToolResult?.summary ?? "No tool activity yet",
    searchQuery:
      workflow.kind === "file"
        ? workflow.query ?? "none"
        : session.fileContext?.lastSearch?.query ?? "none",
    searchRoot:
      workflow.kind === "file"
        ? workflow.root ?? "none"
        : session.fileContext?.lastSearch?.normalizedRoot ??
          session.fileContext?.lastSearch?.root ??
          "none",
    selectedFile:
      selectedCandidate?.path ??
      session.fileContext?.lastSelected?.path ??
      "none",
    readFile:
      readCandidate?.path ??
      session.fileContext?.lastRead?.path ??
      "none",
    pendingState:
      workflow.kind === "file" && workflow.awaitingDisambiguation
        ? "awaiting_file_selection"
        : session.pendingDisambiguation
          ? "awaiting_file_selection"
          : "none",
    workflowKind: workflow.kind,
    workflowStep: workflow.kind === "file" ? workflow.step : "none",
    workflowCandidateCount:
      workflow.kind === "file" ? workflow.candidates.length : 0,
    lastUpdatedAt: session.lastUpdatedAt,

    activePlan: session.activePlan
    ? {
        id: session.activePlan.id,
        title: session.activePlan.title,
        status: session.activePlan.status,
        stepCount: session.activePlan.steps.length,
        activeStep:
            session.activePlan.steps.find((step) => step.status === "active")
            ?.title ?? null,
        }
    : null,
  });
}