import type { ParsedPlannerCommand } from "./types";

function normalize(message: string) {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripPlanVerb(message: string) {
  return message
    .trim()
    .replace(/^(can you|could you|please)\s+/i, "")
    .replace(/^(make|create|build|give me|write)\s+(a\s+)?plan\s+(for|to|about)?\s*/i, "")
    .replace(/^(plan)\s+(for|to|about)?\s*/i, "")
    .trim();
}

function extractRequestedStepCount(
  message: string,
): number | undefined {
  const normalized = message
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const numeric =
    normalized.match(
      /\b(\d{1,2})(?:\s*-\s*|\s+)steps?\b/i,
    );

  if (numeric) {
    const count = Number.parseInt(
      numeric[1],
      10,
    );

    if (
      Number.isFinite(count) &&
      count >= 1 &&
      count <= 12
    ) {
      return count;
    }
  }

  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  };

  const wordMatch =
    normalized.match(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*-\s*|\s+)steps?\b/i,
    );

  return wordMatch
    ? words[wordMatch[1]]
    : undefined;
}
function extractStepIndex(message: string): number | undefined {
  const direct = message.match(/\b(?:step\s*)?(\d{1,2})\b/);
  if (!direct) return undefined;

  const parsed = Number.parseInt(direct[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePlannerCommand(message: string): ParsedPlannerCommand {
  const lower = normalize(message);

  if (
    /\b(clear|delete|discard|reset)\b.*\b(plan)\b/.test(lower) ||
    /\bclear current plan\b/.test(lower)
  ) {
    return { kind: "clear_plan" };
  }

  if (
    /\b(show|display|view|what is)\b.*\b(plan)\b/.test(lower) ||
    /\bcurrent plan\b/.test(lower) ||
    /\bactive plan\b/.test(lower)
  ) {
    return { kind: "show_plan" };
  }

  if (
    /\b(next step|what next|continue plan|continue the plan|carry on)\b/.test(
      lower
    )
  ) {
    return { kind: "next_step" };
  }

  if (
    /\b(mark|complete|finish|done)\b.*\b(step)?\s*\d{1,2}\b/.test(lower)
  ) {
    return {
      kind: "complete_step",
      stepIndex: extractStepIndex(lower),
    };
  }

  if (/\b(block|blocked|stuck)\b.*\b(step)?\s*\d{1,2}\b/.test(lower)) {
    return {
      kind: "block_step",
      stepIndex: extractStepIndex(lower),
    };
  }

  if (/\b(revise|change|update|modify)\b.*\b(plan)\b/.test(lower)) {
    return {
      kind: "revise_plan",
      revision: message,
    };
  }

  if (
    /\b(make|create|build|give me|write|draft)\b.*\bplan\b/.test(lower) ||
    /^plan\b/.test(lower)
  ) {
    return {
      kind: "create_plan",
      goal: stripPlanVerb(message),
      requestedStepCount:
        extractRequestedStepCount(
          message,
        ),
    };
  }

  return { kind: "none" };
}