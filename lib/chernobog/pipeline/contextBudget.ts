export type ResponseContextBudgetInput = {
  memorySystemText: string;
  worldStateSystemText: string;
  worldModelSystemText: string;
};

export type ResponseContextBudgetMetrics = {
  memoryOriginalChars: number;
  memoryIncludedChars: number;
  worldStateOriginalChars: number;
  worldStateIncludedChars: number;
  worldModelOriginalChars: number;
  worldModelIncludedChars: number;
  combinedChars: number;
  truncated: boolean;
};

export type BudgetedResponseContext = {
  systemText: string;
  metrics: ResponseContextBudgetMetrics;
};

const MEMORY_ONLY_BUDGET = 16_000;

const STATE_MEMORY_BUDGET = 12_000;
const STATE_WORLD_STATE_BUDGET = 10_000;

const MODEL_MEMORY_BUDGET = 8_000;
const MODEL_WORLD_STATE_BUDGET = 5_000;
const MODEL_WORLD_MODEL_BUDGET = 15_000;

function clipContextText(
  text: string,
  maxChars: number,
  label: string,
): string {
  const normalized = text.trim();

  if (
    normalized.length === 0 ||
    normalized.length <= maxChars
  ) {
    return normalized;
  }

  const marker =
    `\n\n[${label} context truncated to Phase 11 response budget]\n\n`;

  const available =
    Math.max(
      0,
      maxChars - marker.length,
    );

  if (available === 0) {
    return marker
      .slice(0, maxChars);
  }

  // Keep both ends:
  // - the head contains contracts / short-term / working context;
  // - the tail often contains retrieved/scoped evidence.
  const headChars =
    Math.ceil(available * 0.7);

  const tailChars =
    Math.max(
      0,
      available - headChars,
    );

  const head =
    normalized.slice(0, headChars);

  const tail =
    tailChars > 0
      ? normalized.slice(-tailChars)
      : "";

  return [
    head,
    marker,
    tail,
  ].join("");
}

export function buildBudgetedResponseContext(
  input: ResponseContextBudgetInput,
): BudgetedResponseContext {
  const hasWorldModel =
    input.worldModelSystemText.trim().length > 0;

  const hasWorldState =
    input.worldStateSystemText.trim().length > 0;

  const memoryBudget =
    hasWorldModel
      ? MODEL_MEMORY_BUDGET
      : hasWorldState
        ? STATE_MEMORY_BUDGET
        : MEMORY_ONLY_BUDGET;

  const worldStateBudget =
    hasWorldModel
      ? MODEL_WORLD_STATE_BUDGET
      : STATE_WORLD_STATE_BUDGET;

  const worldModelBudget =
    MODEL_WORLD_MODEL_BUDGET;

  const memorySystemText =
    clipContextText(
      input.memorySystemText,
      memoryBudget,
      "memory",
    );

  const worldStateSystemText =
    hasWorldState
      ? clipContextText(
          input.worldStateSystemText,
          worldStateBudget,
          "world-state",
        )
      : "";

  const worldModelSystemText =
    hasWorldModel
      ? clipContextText(
          input.worldModelSystemText,
          worldModelBudget,
          "world-model",
        )
      : "";

  const systemText = [
    memorySystemText,
    worldStateSystemText,
    worldModelSystemText,
  ]
    .filter(Boolean)
    .join("\n\n");

  const metrics: ResponseContextBudgetMetrics = {
    memoryOriginalChars:
      input.memorySystemText.length,
    memoryIncludedChars:
      memorySystemText.length,

    worldStateOriginalChars:
      input.worldStateSystemText.length,
    worldStateIncludedChars:
      worldStateSystemText.length,

    worldModelOriginalChars:
      input.worldModelSystemText.length,
    worldModelIncludedChars:
      worldModelSystemText.length,

    combinedChars:
      systemText.length,

    truncated:
      memorySystemText.length <
        input.memorySystemText.trim().length ||
      worldStateSystemText.length <
        input.worldStateSystemText.trim().length ||
      worldModelSystemText.length <
        input.worldModelSystemText.trim().length,
  };

  return {
    systemText,
    metrics,
  };
}