import type { StoredDiscordTriagePlan } from "../types";

const triagePlansBySession = new Map<string, StoredDiscordTriagePlan>();

export function setLatestDiscordTriagePlan(
  sessionId: string,
  plan: StoredDiscordTriagePlan
): void {
  triagePlansBySession.set(sessionId, plan);
}

export function getLatestDiscordTriagePlan(
  sessionId: string
): StoredDiscordTriagePlan | null {
  return triagePlansBySession.get(sessionId) ?? null;
}

export function clearLatestDiscordTriagePlan(sessionId: string): boolean {
  return triagePlansBySession.delete(sessionId);
}