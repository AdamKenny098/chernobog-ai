import { getActionRuntime } from "./actionRuntime";
/**
 * OH-2B — Authoritative Dialogue Runtime.
 *
 * Owns core conversational turn lifecycle and state projection.
 * It deliberately does not own model providers, tools, trust, UI state,
 * Personal Assistance, or sensory/microphone lease implementation.
 */

export type DialogueTurnStatus =
  | "active"
  | "interrupted"
  | "resumed"
  | "completed"
  | "failed";

export type DialogueTurnMetadata = {
  source: "command-pipeline" | string;
  conversationKey?: string | null;
  parentTurnId?: string | null;
};

export type DialogueTurnSnapshot = {
  id: string;
  revision: number;
  status: DialogueTurnStatus;
  source: string;
  conversationKey: string | null;
  parentTurnId: string | null;
  startedAt: string;
  updatedAt: string;
  interruptionReason: string | null;
};

type MutableDialogueTurn = DialogueTurnSnapshot;

export class DialogueRuntime {
  private sequence = 0;
  private revision = 0;
  private readonly activeTurns = new Map<string, MutableDialogueTurn>();
  private lastSettledTurn: DialogueTurnSnapshot | null = null;

  private now(): string {
    return new Date().toISOString();
  }

  private nextTurnId(): string {
    this.sequence += 1;
    return `dialogue-turn-${Date.now()}-${this.sequence}`;
  }

  private clone(turn: MutableDialogueTurn): DialogueTurnSnapshot {
    return { ...turn };
  }

  private touch(turn: MutableDialogueTurn): void {
    this.revision += 1;
    turn.revision = this.revision;
    turn.updatedAt = this.now();
  }

  public snapshot(): {
    revision: number;
    activeTurns: DialogueTurnSnapshot[];
    lastSettledTurn: DialogueTurnSnapshot | null;
  } {
    return {
      revision: this.revision,
      activeTurns: [...this.activeTurns.values()].map((turn) => this.clone(turn)),
      lastSettledTurn: this.lastSettledTurn ? { ...this.lastSettledTurn } : null,
    };
  }

  public markInterrupted(turnId: string, reason?: string): DialogueTurnSnapshot | null {
    getActionRuntime().interrupt(turnId, reason, "dialogue-runtime");
    const turn = this.activeTurns.get(turnId);
    if (!turn) return null;

    turn.status = "interrupted";
    turn.interruptionReason = reason?.trim() || "interrupted";
    this.touch(turn);
    return this.clone(turn);
  }

  public markResumed(turnId: string): DialogueTurnSnapshot | null {
    getActionRuntime().resume(turnId, "dialogue-runtime");
    const turn = this.activeTurns.get(turnId);
    if (!turn) return null;

    turn.status = "resumed";
    turn.interruptionReason = null;
    this.touch(turn);
    return this.clone(turn);
  }

  public async runTurn<T>(
    metadata: DialogueTurnMetadata,
    execute: (turn: DialogueTurnSnapshot) => Promise<T>,
  ): Promise<T> {
    const timestamp = this.now();
    this.revision += 1;

    const turn: MutableDialogueTurn = {
      id: this.nextTurnId(),
      revision: this.revision,
      status: "active",
      source: metadata.source,
      conversationKey: metadata.conversationKey ?? null,
      parentTurnId: metadata.parentTurnId ?? null,
      startedAt: timestamp,
      updatedAt: timestamp,
      interruptionReason: null,
    };

    this.activeTurns.set(turn.id, turn);

    try {
      const result = await execute(this.clone(turn));
      turn.status = "completed";
      this.touch(turn);
      this.lastSettledTurn = this.clone(turn);
      return result;
    } catch (error) {
      turn.status = "failed";
      this.touch(turn);
      this.lastSettledTurn = this.clone(turn);
      throw error;
    } finally {
      this.activeTurns.delete(turn.id);
    }
  }
}

const dialogueRuntime = new DialogueRuntime();

export function getDialogueRuntime(): DialogueRuntime {
  return dialogueRuntime;
}
