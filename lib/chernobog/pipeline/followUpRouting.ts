import type { RouteName } from "@/lib/chernobog/router";

const CONVERSATIONAL_FOLLOW_UP =
  /^(?:please\s+)?(?:expand(?:\s+on\s+(?:that|this|it|your\s+(?:previous\s+)?answer|the\s+(?:previous\s+)?answer))?|elaborate(?:\s+on\s+(?:that|this|it))?|tell\s+me\s+more(?:\s+about\s+(?:that|this|it))?|go\s+into\s+more\s+detail(?:\s+on\s+(?:that|this|it))?|explain\s+(?:that|this|it)\s+(?:further|more)|explain\s+further|continue\s+(?:that|this|your\s+(?:previous\s+)?answer))[\s.!?]*$/i;

const INHERITABLE_ROUTES =
  new Set<RouteName>([
    "chat",
    "planner",
    "memory",
    "guardian",
  ]);

export function isConversationalFollowUp(
  userMessage: string,
): boolean {
  return CONVERSATIONAL_FOLLOW_UP.test(
    userMessage.trim(),
  );
}

export function resolveConversationalFollowUpRoute(
  userMessage: string,
  previousRoute?: string | null,
): RouteName | null {
  if (!isConversationalFollowUp(userMessage)) {
    return null;
  }

  if (
    previousRoute &&
    INHERITABLE_ROUTES.has(
      previousRoute as RouteName,
    )
  ) {
    return previousRoute as RouteName;
  }

  // Never repeat a tool action just because the user asks for more detail
  // about the result. Discuss it instead.
  if (previousRoute === "tools") {
    return "chat";
  }

  // If route history is unavailable, a conversational follow-up is still
  // normal conversation, never a reason to guess guardian/tools.
  return "chat";
}