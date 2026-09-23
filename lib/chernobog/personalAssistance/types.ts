import type {
  CognitiveUserAttentionState,
} from "../cognition/initiativeTypes";

export type PersonalAttentionState =
  CognitiveUserAttentionState;

export type PersonalAttentionSource =
  | "system-default"
  | "explicit-user";

export type PersonalAttentionAuditAction =
  | "set"
  | "reset"
  | "expired";

export interface PersonalAttentionSnapshot {
  state: PersonalAttentionState;
  source: PersonalAttentionSource;
  confidence: number;
  explicit: boolean;
  setAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  revision: number;
}

export interface SetPersonalAttentionInput {
  state: PersonalAttentionState;
  expiresAt?: string | null;
  reason?: string | null;
}

export interface PersonalAttentionAuditEntry {
  id: number;
  action: PersonalAttentionAuditAction;
  state: PersonalAttentionState;
  source: PersonalAttentionSource;
  explicit: boolean;
  setAt: string;
  expiresAt: string | null;
  reason: string | null;
  revision: number;
}

export const PERSONAL_ATTENTION_STATES:
  readonly PersonalAttentionState[] = [
    "available",
    "busy",
    "away",
    "do-not-disturb",
  ] as const;

export function isPersonalAttentionState(
  value: unknown,
): value is PersonalAttentionState {
  return (
    typeof value === "string" &&
    PERSONAL_ATTENTION_STATES.includes(
      value as PersonalAttentionState,
    )
  );
}