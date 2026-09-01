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