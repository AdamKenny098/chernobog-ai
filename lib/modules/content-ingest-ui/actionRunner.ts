import {
  executeContentIngestCommand,
  isContentIngestCommand,
} from "@/lib/modules/content-ingest";
import {
  executeContentReviewCommand,
  isContentReviewCommand,
} from "@/lib/modules/content-review";
import {
  executeSavedContentReliabilityCommand,
  isSavedContentReliabilityCommand,
} from "@/lib/modules/saved-content-reliability";
import {
  executeSavedContentCommand,
  isSavedContentCommand,
} from "@/lib/modules/saved-content";

import {
  ContentIngestUiActionResult,
} from "./types";

export async function runContentIngestUiAction(
  command: string
): Promise<ContentIngestUiActionResult> {
  const normalized = command.trim();

  if (!normalized) {
    return {
      ok: false,
      title: "No command provided",
      message: "The dashboard action did not include a command.",
    };
  }

  if (isContentIngestCommand(normalized)) {
    return executeContentIngestCommand(normalized);
  }

  if (isContentReviewCommand(normalized)) {
    return executeContentReviewCommand(normalized);
  }

  if (isSavedContentReliabilityCommand(normalized)) {
    return executeSavedContentReliabilityCommand(normalized);
  }

  if (isSavedContentCommand(normalized)) {
    return executeSavedContentCommand(normalized);
  }

  return {
    ok: false,
    title: "Unsupported dashboard command",
    message: [
      `Command: ${normalized}`,
      "",
      "Use /api/content-ingest/dashboard-action for structured UI actions.",
    ].join("\n"),
  };
}
