export type PersonalAttentionState =
  | "available"
  | "busy"
  | "away"
  | "dnd"
  | (string & Record<never, never>);

export interface PersonalAttentionSnapshot {
  state: PersonalAttentionState;
  effectiveUntil?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}

/** Contract Core may consume without importing the PA implementation. */
export interface PersonalAttentionProvider {
  getAttention(): Promise<PersonalAttentionSnapshot> | PersonalAttentionSnapshot;
}
