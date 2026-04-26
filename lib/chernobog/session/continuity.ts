import type { SessionContext } from "./types";
import {
    buildWorkingMemorySnapshot,
    formatWorkingMemory,
  } from "@/lib/chernobog/memory-architecture";


export type ContinuityQueryKind =
  | "none"
  | "last_read_file"
  | "last_selected_file"
  | "current_workflow"
  | "current_file_context"
  | "working_memory";

export function detectContinuityQuery(message: string): ContinuityQueryKind {
  const lower = message.trim().toLowerCase();

  if (
    /\bwhat file did you just read\b/.test(lower) ||
    /\bwhat did you just read\b/.test(lower) ||
    /\blast read file\b/.test(lower)
  ) {
    return "last_read_file";
  }

  if (
    /\bwhat file did you just open\b/.test(lower) ||
    /\bwhat did you just open\b/.test(lower) ||
    /\blast opened file\b/.test(lower) ||
    /\blast selected file\b/.test(lower)
  ) {
    return "last_selected_file";
  }

  if (
    /\bwhat are we currently working with\b/.test(lower) ||
    /\bwhat file are we working with\b/.test(lower) ||
    /\bcurrent file\b/.test(lower) ||
    /\bactive file\b/.test(lower)
  ) {
    return "current_file_context";
  }

  if (
    /\bwhat is the current workflow\b/.test(lower) ||
    /\bcurrent workflow\b/.test(lower) ||
    /\bwhat workflow is active\b/.test(lower)
  ) {
    return "current_workflow";
  }

  if (
    /\bwhat are we working on\b/.test(lower) ||
    /\bwhat am i working on\b/.test(lower) ||
    /\bcurrent working memory\b/.test(lower) ||
    /\bworking memory\b/.test(lower)
  ) {
    return "working_memory";
  }

  return "none";
}

export function buildContinuityReply(
  kind: ContinuityQueryKind,
  session: SessionContext
): string {
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

  const lastRead =
    readCandidate?.path ?? session.fileContext?.lastRead?.path ?? null;

  const lastSelected =
    selectedCandidate?.path ?? session.fileContext?.lastSelected?.path ?? null;

  const lastSearch =
    workflow.kind === "file"
      ? workflow.query ?? session.fileContext?.lastSearch?.query ?? null
      : session.fileContext?.lastSearch?.query ?? null;

  if (kind === "last_read_file") {
    return lastRead
      ? `The last file I read was:\n\n${lastRead}`
      : "I do not have a last-read file in the current session.";
  }

  if (kind === "last_selected_file") {
    return lastSelected
      ? `The last selected/opened file was:\n\n${lastSelected}`
      : "I do not have a selected or opened file in the current session.";
  }

  if (kind === "current_file_context") {
    const lines: string[] = [];

    if (lastSelected) {
      lines.push(`- Active/selected file: ${lastSelected}`);
    }

    if (lastRead) {
      lines.push(`- Last read file: ${lastRead}`);
    }

    if (lastSearch) {
      lines.push(`- Last file search: ${lastSearch}`);
    }

    if (workflow.kind === "file") {
      lines.push(`- Workflow step: ${workflow.step}`);
      lines.push(`- Candidate count: ${workflow.candidates.length}`);
    }

    return lines.length > 0
      ? ["Current file context:", ...lines].join("\n")
      : "There is no active file context in the current session.";
  }

  if (kind === "current_workflow") {
    if (workflow.kind !== "file") {
      return "There is no active workflow right now.";
    }

    return [
      "Current workflow:",
      `- Kind: ${workflow.kind}`,
      `- Step: ${workflow.step}`,
      `- Query: ${workflow.query ?? "none"}`,
      `- Root: ${workflow.root ?? "none"}`,
      `- Candidates: ${workflow.candidates.length}`,
      `- Awaiting disambiguation: ${workflow.awaitingDisambiguation ? "yes" : "no"}`,
      lastSelected ? `- Selected file: ${lastSelected}` : "- Selected file: none",
      lastRead ? `- Read file: ${lastRead}` : "- Read file: none",
    ].join("\n");
  }

  if (kind === "working_memory") {
    const snapshot = buildWorkingMemorySnapshot(session);
    const lines = formatWorkingMemory(snapshot);
  
    return lines.length > 0
      ? ["Current working memory:", ...lines.map((line) => `- ${line}`)].join("\n")
      : "There is no active working memory in the current session.";
  }

  return "";
}