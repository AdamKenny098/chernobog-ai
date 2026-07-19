import type Database from "better-sqlite3";

import type { ItchSignalType } from "../contract";
import type { ItchUserSignal } from "../types";
import {
  createItchId,
  nowIso,
  parseJson,
  stringifyJson,
} from "../database/helpers";

type SignalRow = {
  id: string;
  game_id: string;
  signal_type: ItchSignalType;
  signal_value: number | null;
  created_at: string;
  metadata_json: string | null;
};

export class ItchSignalRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    gameId: string;
    signalType: ItchSignalType;
    signalValue?: number;
    metadata?: Record<string, unknown>;
  }): ItchUserSignal {
    const signal: ItchUserSignal = {
      id: createItchId("itch_signal"),
      gameId: input.gameId,
      signalType: input.signalType,
      signalValue: input.signalValue,
      createdAt: nowIso(),
      metadata: input.metadata,
    };

    this.db
      .prepare(
        `INSERT INTO itch_user_signals (
          id, game_id, signal_type, signal_value, created_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        signal.id,
        signal.gameId,
        signal.signalType,
        signal.signalValue ?? null,
        signal.createdAt,
        signal.metadata ? stringifyJson(signal.metadata) : null,
      );

    return signal;
  }

  createDeduplicated(input: {
    gameId: string;
    signalType: ItchSignalType;
    signalValue?: number;
    metadata?: Record<string, unknown>;
    dedupeWindowMinutes?: number;
  }): { signal: ItchUserSignal; created: boolean } {
    const windowMinutes = Math.max(0, input.dedupeWindowMinutes ?? 10);
    if (windowMinutes > 0) {
      const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
      const row = this.db
        .prepare(
          `SELECT * FROM itch_user_signals
           WHERE game_id = ? AND signal_type = ? AND created_at >= ?
           ORDER BY created_at DESC, id DESC
           LIMIT 1`,
        )
        .get(input.gameId, input.signalType, since) as SignalRow | undefined;
      if (row) {
        return { signal: this.mapRow(row), created: false };
      }
    }

    return { signal: this.create(input), created: true };
  }

  listUnappliedForFeedback(limit = 10_000): ItchUserSignal[] {
    const rows = this.db
      .prepare(
        `SELECT s.* FROM itch_user_signals s
         LEFT JOIN itch_feedback_signal_applications a ON a.signal_id = s.id
         WHERE a.signal_id IS NULL
         ORDER BY s.created_at DESC, s.id ASC
         LIMIT ?`,
      )
      .all(Math.max(1, Math.min(100_000, Math.floor(limit)))) as SignalRow[];
    return rows.map((row) => this.mapRow(row));
  }

  listForGame(gameId: string): ItchUserSignal[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_user_signals
         WHERE game_id = ?
         ORDER BY created_at DESC`,
      )
      .all(gameId) as SignalRow[];

    return rows.map((row) => this.mapRow(row));
  }

  listAll(): ItchUserSignal[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM itch_user_signals
         ORDER BY created_at DESC, id ASC`,
      )
      .all() as SignalRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: SignalRow): ItchUserSignal {
    return {
      id: row.id,
      gameId: row.game_id,
      signalType: row.signal_type,
      signalValue: row.signal_value ?? undefined,
      createdAt: row.created_at,
      metadata: parseJson<Record<string, unknown> | undefined>(
        row.metadata_json,
        undefined,
      ),
    };
  }
}
