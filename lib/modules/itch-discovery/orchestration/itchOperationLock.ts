import type Database from "better-sqlite3";

import { createItchId } from "../database/helpers";

export type ItchOperationLock = {
  lockName: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
};

export type AcquireItchOperationLockOptions = {
  ownerId?: string;
  ttlMs?: number;
  now?: Date;
};

export class ItchOperationLockManager {
  constructor(private readonly db: Database.Database) {}

  acquire(
    lockName: string,
    options: AcquireItchOperationLockOptions = {},
  ): ItchOperationLock | null {
    const now = options.now ?? new Date();
    const ttlMs = clampInteger(options.ttlMs ?? 30 * 60_000, 5_000, 24 * 60 * 60_000);
    const ownerId = options.ownerId ?? createItchId("itch_lock_owner");
    const acquiredAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

    const transaction = this.db.transaction(() => {
      this.db
        .prepare("DELETE FROM itch_operation_locks WHERE expires_at <= ?")
        .run(acquiredAt);

      const existing = this.find(lockName);
      if (existing) {
        return null;
      }

      this.db
        .prepare(
          `INSERT INTO itch_operation_locks (
            lock_name, owner_id, acquired_at, expires_at
          ) VALUES (?, ?, ?, ?)`,
        )
        .run(lockName, ownerId, acquiredAt, expiresAt);

      return { lockName, ownerId, acquiredAt, expiresAt };
    });

    return transaction();
  }

  refresh(
    lockName: string,
    ownerId: string,
    ttlMs = 30 * 60_000,
    now = new Date(),
  ): ItchOperationLock | null {
    const expiresAt = new Date(
      now.getTime() + clampInteger(ttlMs, 5_000, 24 * 60 * 60_000),
    ).toISOString();

    const result = this.db
      .prepare(
        `UPDATE itch_operation_locks
         SET expires_at = ?
         WHERE lock_name = ? AND owner_id = ?`,
      )
      .run(expiresAt, lockName, ownerId);

    return result.changes > 0 ? this.find(lockName) : null;
  }

  release(lockName: string, ownerId: string): boolean {
    return (
      this.db
        .prepare(
          `DELETE FROM itch_operation_locks
           WHERE lock_name = ? AND owner_id = ?`,
        )
        .run(lockName, ownerId).changes > 0
    );
  }

  find(lockName: string): ItchOperationLock | null {
    const row = this.db
      .prepare(
        `SELECT lock_name, owner_id, acquired_at, expires_at
         FROM itch_operation_locks
         WHERE lock_name = ?`,
      )
      .get(lockName) as
      | {
          lock_name: string;
          owner_id: string;
          acquired_at: string;
          expires_at: string;
        }
      | undefined;

    return row
      ? {
          lockName: row.lock_name,
          ownerId: row.owner_id,
          acquiredAt: row.acquired_at,
          expiresAt: row.expires_at,
        }
      : null;
  }
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
