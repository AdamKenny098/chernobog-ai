import type { JobHandler } from "@chernobog/runtime";
import { runCommandPipeline } from "@chernobog/core/pipeline/runCommand";

export const CHERNOBOG_COMMAND_JOB_KIND = "chernobog.command";

export type ChernobogCommandJobPayload = {
  message: string;
  sessionId?: string;
  responseMode?: "text" | "voice";
};

function parsePayload(value: unknown): ChernobogCommandJobPayload {
  if (!value || typeof value !== "object") {
    throw new Error("chernobog.command payload must be an object");
  }

  const payload = value as Record<string, unknown>;
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!message) {
    throw new Error("chernobog.command payload.message is required");
  }

  const sessionId =
    typeof payload.sessionId === "string" && payload.sessionId.trim()
      ? payload.sessionId.trim()
      : undefined;

  const responseMode =
    payload.responseMode === "voice" ? "voice" : "text";

  return {
    message,
    ...(sessionId ? { sessionId } : {}),
    responseMode,
  };
}

/**
 * Canonical OH-3D command-job bridge.
 *
 * Scheduled work re-enters the exact OH-2 command pipeline. It does not call
 * Tool Gateway, governance, model, or state implementations directly.
 */
export const executeChernobogCommandJob: JobHandler = async ({ job, run }) => {
  const payload = parsePayload(job.payload);
  const sessionId =
    payload.sessionId ?? `scheduled-job:${run.id}`;

  const result = await runCommandPipeline(
    payload.message,
    sessionId,
    { responseMode: payload.responseMode ?? "text" },
  );

  return {
    summary: "Chernobog command pipeline completed",
    metadata: {
      sessionId,
      runId: run.id,
      hasPayload: Boolean(result?.payload),
    },
  };
};

export function createBuiltInJobHandlers(): Record<string, JobHandler> {
  return {
    [CHERNOBOG_COMMAND_JOB_KIND]: executeChernobogCommandJob,
  };
}
