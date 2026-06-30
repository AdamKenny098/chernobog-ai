import { createVaultMemoryStore, type VaultMemoryAuditEvent } from "./memoryStore";
import type { VaultMemoryEntry } from "./memoryTypes";
import type { VaultMemoryStatus } from "./memoryStatus";
import type { VaultBrainCommandResult } from "./types";

const REVIEW_QUEUE_STATUSES: VaultMemoryStatus[] = ["raw", "candidate", "reviewed"];

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function getCommandId(command: string, pattern: RegExp): string | undefined {
  const match = command.match(pattern);
  return match?.[1]?.trim();
}

function formatEntryLine(entry: VaultMemoryEntry, index: number): string {
  const scope = [entry.projectId, entry.version].filter(Boolean).join(" / ");
  return [
    `${index + 1}. ${entry.title}`,
    `   ID: ${entry.id}`,
    `   Status: ${entry.status}`,
    `   Type: ${entry.memoryType}`,
    scope ? `   Scope: ${scope}` : undefined,
    entry.tags.length > 0 ? `   Tags: ${entry.tags.join(", ")}` : undefined,
    `   Updated: ${entry.updatedAt}`,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatEntryDetail(entry: VaultMemoryEntry): string {
  return [
    `ID: ${entry.id}`,
    `Title: ${entry.title}`,
    `Status: ${entry.status}`,
    `Type: ${entry.memoryType}`,
    `Source: ${entry.source}`,
    entry.projectId ? `Project: ${entry.projectId}` : undefined,
    entry.version ? `Version: ${entry.version}` : undefined,
    `Confidence: ${entry.confidence}`,
    entry.tags.length > 0 ? `Tags: ${entry.tags.join(", ")}` : "Tags: none",
    `Created: ${entry.createdAt}`,
    `Updated: ${entry.updatedAt}`,
    entry.reviewedAt ? `Reviewed: ${entry.reviewedAt}` : undefined,
    entry.approvedAt ? `Approved: ${entry.approvedAt}` : undefined,
    entry.rejectedAt ? `Rejected: ${entry.rejectedAt}` : undefined,
    entry.staleAt ? `Stale: ${entry.staleAt}` : undefined,
    entry.supersededAt ? `Superseded: ${entry.supersededAt}` : undefined,
    entry.supersededBy ? `Superseded by: ${entry.supersededBy}` : undefined,
    entry.reviewNotes ? `Review notes: ${entry.reviewNotes}` : undefined,
    "",
    "Body:",
    entry.body,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function formatAuditEvent(event: VaultMemoryAuditEvent): string {
  const transition = event.previousStatus && event.nextStatus
    ? ` (${event.previousStatus} -> ${event.nextStatus})`
    : event.nextStatus
      ? ` (${event.nextStatus})`
      : "";

  return [
    `- ${event.createdAt}: ${event.action}${transition}`,
    `  Entry: ${event.memoryEntryId}`,
    event.actor ? `  Actor: ${event.actor}` : undefined,
    event.note ? `  Note: ${event.note}` : undefined,
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

async function listMemory(statuses: VaultMemoryStatus[], title: string): Promise<VaultBrainCommandResult> {
  const store = createVaultMemoryStore();
  const entries = await store.listEntries({ statuses, limit: 25 });

  return {
    ok: true,
    title,
    message: entries.length > 0
      ? entries.map(formatEntryLine).join("\n\n")
      : "No structured memory entries matched this review queue.",
    data: { statuses, entries },
  };
}

async function showEntry(id: string): Promise<VaultBrainCommandResult> {
  const store = createVaultMemoryStore();
  const entry = await store.getEntry(id);

  if (!entry) {
    return {
      ok: false,
      title: "Structured memory entry not found",
      message: `No structured memory entry exists with ID: ${id}`,
    };
  }

  return {
    ok: true,
    title: "Structured Memory Entry",
    message: formatEntryDetail(entry),
    data: entry,
  };
}

async function updateStatus(args: {
  id: string;
  status: VaultMemoryStatus;
  title: string;
  note?: string;
  supersededBy?: string;
}): Promise<VaultBrainCommandResult> {
  const store = createVaultMemoryStore();

  try {
    const entry = await store.updateStatus(args.id, {
      status: args.status,
      note: args.note,
      actor: "chernobog-command",
      supersededBy: args.supersededBy,
    });

    return {
      ok: true,
      title: args.title,
      message: formatEntryDetail(entry),
      data: entry,
    };
  } catch (error) {
    return {
      ok: false,
      title: "Memory status update blocked",
      message: error instanceof Error ? error.message : "Unknown memory status update error.",
    };
  }
}

export function isStructuredMemoryReviewCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show memory inbox$/i.test(normalized) ||
    /^show candidate memory$/i.test(normalized) ||
    /^show reviewed memory$/i.test(normalized) ||
    /^show memory review queue$/i.test(normalized) ||
    /^show memory entry\s+\S+$/i.test(normalized) ||
    /^review memory entry\s+\S+$/i.test(normalized) ||
    /^approve memory entry\s+\S+$/i.test(normalized) ||
    /^reject memory entry\s+\S+$/i.test(normalized) ||
    /^mark memory stale\s+\S+$/i.test(normalized) ||
    /^supersede memory entry\s+\S+\s+with\s+\S+$/i.test(normalized) ||
    /^show memory audit log$/i.test(normalized)
  );
}

export async function executeStructuredMemoryReviewCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show memory inbox$/i.test(normalized) || /^show memory review queue$/i.test(normalized)) {
    return listMemory(REVIEW_QUEUE_STATUSES, "Structured Memory Review Queue");
  }

  if (/^show candidate memory$/i.test(normalized)) {
    return listMemory(["candidate"], "Candidate Structured Memory");
  }

  if (/^show reviewed memory$/i.test(normalized)) {
    return listMemory(["reviewed"], "Reviewed Structured Memory");
  }

  const showId = getCommandId(normalized, /^show memory entry\s+(\S+)$/i);
  if (showId) {
    return showEntry(showId);
  }

  const reviewId = getCommandId(normalized, /^review memory entry\s+(\S+)$/i);
  if (reviewId) {
    return updateStatus({
      id: reviewId,
      status: "reviewed",
      title: "Memory Entry Reviewed",
      note: "Entry was marked reviewed through the V5.6.4 review command.",
    });
  }

  const approveId = getCommandId(normalized, /^approve memory entry\s+(\S+)$/i);
  if (approveId) {
    return updateStatus({
      id: approveId,
      status: "approved",
      title: "Memory Entry Approved",
      note: "Entry was approved through the V5.6.4 approval command.",
    });
  }

  const rejectId = getCommandId(normalized, /^reject memory entry\s+(\S+)$/i);
  if (rejectId) {
    return updateStatus({
      id: rejectId,
      status: "rejected",
      title: "Memory Entry Rejected",
      note: "Entry was rejected through the V5.6.4 review command.",
    });
  }

  const staleId = getCommandId(normalized, /^mark memory stale\s+(\S+)$/i);
  if (staleId) {
    return updateStatus({
      id: staleId,
      status: "stale",
      title: "Memory Entry Marked Stale",
      note: "Entry was marked stale through the V5.6.4 review command.",
    });
  }

  const supersedeMatch = normalized.match(/^supersede memory entry\s+(\S+)\s+with\s+(\S+)$/i);
  if (supersedeMatch) {
    return updateStatus({
      id: supersedeMatch[1],
      status: "superseded",
      title: "Memory Entry Superseded",
      note: `Entry was superseded by ${supersedeMatch[2]} through the V5.6.4 review command.`,
      supersededBy: supersedeMatch[2],
    });
  }

  if (/^show memory audit log$/i.test(normalized)) {
    const store = createVaultMemoryStore();
    const events = (await store.loadAuditLog()).slice(-25).reverse();

    return {
      ok: true,
      title: "Structured Memory Audit Log",
      message: events.length > 0
        ? events.map(formatAuditEvent).join("\n\n")
        : "No structured memory audit events have been recorded yet.",
      data: events,
    };
  }

  return {
    ok: false,
    title: "Memory review command not recognized",
    message: [
      "Try one of these:",
      "- show memory inbox",
      "- show candidate memory",
      "- show reviewed memory",
      "- show memory entry <id>",
      "- review memory entry <id>",
      "- approve memory entry <id>",
      "- reject memory entry <id>",
      "- mark memory stale <id>",
      "- supersede memory entry <oldId> with <newId>",
      "- show memory audit log",
    ].join("\n"),
  };
}
