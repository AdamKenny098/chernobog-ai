// lib/chernobog/execution/internalExecutionHandlers.ts

import { ExecutionState, getExecutionStateSummary } from "./executionState";
import { ExecutionActionHandler } from "./runExecutionTask";

export interface InternalExecutionHandlerOptions {
  previousState: ExecutionState;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const possibleKeys = ["text", "content", "contents", "body", "data"];

  for (const key of possibleKeys) {
    if (
      key in value &&
      typeof value[key as keyof typeof value] === "string" &&
      (value[key as keyof typeof value] as string).trim().length > 0
    ) {
      return value[key as keyof typeof value] as string;
    }
  }

  return null;
}

function createSimpleSummary(text: string) {
  const cleaned = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (cleaned.length <= 700) {
    return cleaned;
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return `${cleaned.slice(0, 700)}...`;
  }

  const selected = sentences.slice(0, 5).join(" ");

  if (selected.length > 900) {
    return `${selected.slice(0, 900)}...`;
  }

  return selected;
}

export function createInternalExecutionHandlers(
  options: InternalExecutionHandlerOptions
): Record<string, ExecutionActionHandler> {
  const { previousState } = options;

  return {
    async "execution.summary"() {
      const summary = getExecutionStateSummary(previousState);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.summarizeLastRead"() {
      const text = extractText(previousState.lastReadText);

      if (!text) {
        return {
          success: false,
          error: "There is no previously read text available to summarize.",
        };
      }

      const summary = createSimpleSummary(text);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.approvalTest"() {
      return {
        success: true,
        output: "Approval flow completed successfully.",
        context: {
          summary: "Approval flow completed successfully.",
        },
      };
    },
  };
}