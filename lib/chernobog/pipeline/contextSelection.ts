import type { OllamaMessage } from "@/lib/chernobog/router";

function normalizeComparableMessageText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function excludeCurrentUserMessageFromHistory(
  recentMessages: OllamaMessage[],
  userMessage: string,
): OllamaMessage[] {
  if (recentMessages.length === 0) {
    return recentMessages;
  }

  const lastMessage =
    recentMessages[recentMessages.length - 1];

  if (
    lastMessage.role !== "user" ||
    normalizeComparableMessageText(
      lastMessage.content,
    ) !==
      normalizeComparableMessageText(
        userMessage,
      )
  ) {
    return recentMessages;
  }

  return recentMessages.slice(0, -1);
}

export type ResponseContextSelection = {
  includeWorldState: boolean;
  includeWorldModel: boolean;
  reasons: string[];
};

const EXPLICIT_WORLD_STATE_PATTERN =
  /\b(world state|11g|event spine|runtime state|runtime status|system state|system status|system health|service health|service status|observed state|observation packet|model assignment|model assignments)\b/i;

const EXPLICIT_WORLD_MODEL_PATTERN =
  /\b(world model|11j|dependency|dependencies|dependency chain|depends on|dependent on|dependents|served[- ]by|provider edge|impact source|impact assessment|causal hypothesis|causal hypotheses|supported prediction|supported predictions|downstream dependent|downstream dependents|model-role|model role)\b/i;

const OLLAMA_RELATIONAL_PATTERN =
  /\b(depend|dependency|dependencies|relationship|relationships|provider|served|impact|consequence|consequences|prediction|predictions|model|role|roles)\b/i;

export function selectResponseContext(
  userMessage: string,
): ResponseContextSelection {
  const normalized =
    normalizeComparableMessageText(
      userMessage,
    );

  const reasons: string[] = [];

  const explicitWorldModel =
    EXPLICIT_WORLD_MODEL_PATTERN.test(
      normalized,
    );

  const ollamaRelational =
    /\bollama\b/i.test(normalized) &&
    OLLAMA_RELATIONAL_PATTERN.test(
      normalized,
    );

  const includeWorldModel =
    explicitWorldModel ||
    ollamaRelational;

  const explicitWorldState =
    EXPLICIT_WORLD_STATE_PATTERN.test(
      normalized,
    );

  const includeWorldState =
    explicitWorldState ||
    includeWorldModel;

  if (explicitWorldState) {
    reasons.push(
      "explicit-world-state-request",
    );
  }

  if (explicitWorldModel) {
    reasons.push(
      "explicit-world-model-request",
    );
  }

  if (ollamaRelational) {
    reasons.push(
      "ollama-relational-request",
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "memory-project-conversation-only",
    );
  }

  return {
    includeWorldState,
    includeWorldModel,
    reasons,
  };
}