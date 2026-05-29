import { saveMessage } from "@/lib/chernobog/memory";
import { getSessionContext } from "@/lib/chernobog/session/store";
import type { RouteName } from "@/lib/chernobog/session/types";
import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
import { saveTrustTrace } from "@/lib/chernobog/trust/store";
import {
  addTraceStep,
  finishTrace,
  printTraceInDev,
  summarizeTrace,
} from "@/lib/chernobog/trust/trace";
import type { TrustTrace } from "@/lib/chernobog/trust/types";
import type { ChatUiPayload, CommandPipelineResult } from "./types";

export function buildUiPayload(
  sessionId: string,
  route: RouteName,
  reply: string,
  trace?: TrustTrace
): ChatUiPayload {
  const session = getSessionContext(sessionId);
  const workflow = session.workflow;

  const activePlan = session.activePlan
    ? {
        id: session.activePlan.id,
        title: session.activePlan.title,
        status: session.activePlan.status,
        stepCount: session.activePlan.steps.length,
        activeStep:
          session.activePlan.steps.find((step) => step.status === "active")
            ?.title ?? null,
      }
    : null;

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

  const debugTrace = trace
    ? {
        id: trace.id,
        route: trace.route,
        tool: trace.tool,
        success: trace.success,
        failureCategory: trace.failureCategory,
        summary: summarizeTrace(trace),
        steps: trace.steps.map((step) => ({
          type: step.type,
          label: step.label,
          detail: step.detail,
          timestamp: step.timestamp,
        })),
      }
    : undefined;

  return {
    route,
    reply: reply || "No response returned.",
    sessionId,
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
    activePlan,
    debugTrace,
  };
}

export function finalizePipelinePayload(
  sessionId: string,
  route: RouteName,
  reply: string,
  trace: TrustTrace
): CommandPipelineResult {
  const endingSession = getSessionContext(sessionId);

  addTraceStep(
    trace,
    "workflow_update",
    "Workflow snapshot after command",
    undefined,
    buildWorkflowSnapshot(endingSession)
  );

  finishTrace(trace, route, endingSession.lastTool?.name ?? "none");
  saveTrustTrace(trace);
  printTraceInDev(trace);

  saveMessage("assistant", reply, route);

  return {
    payload: buildUiPayload(sessionId, route, reply, trace),
  };
}
