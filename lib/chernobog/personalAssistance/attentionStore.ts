import db from "../db";
import type {
  PersonalAttentionAuditAction,
  PersonalAttentionAuditEntry,
  PersonalAttentionSnapshot,
  PersonalAttentionState,
  SetPersonalAttentionInput,
} from "./types";
import {
  isPersonalAttentionState,
} from "./types";

const ATTENTION_KEY = "primary";
const DEFAULT_ATTENTION_STATE:
  PersonalAttentionState = "available";

type AttentionRow = {
  state: string;
  source: string;
  confidence: number;
  explicit: number;
  set_at: string | null;
  expires_at: string | null;
  reason: string | null;
  revision: number;
};

type AttentionAuditRow = {
  id: number;
  action: string;
  state: string;
  source: string;
  explicit: number;
  set_at: string;
  expires_at: string | null;
  reason: string | null;
  revision: number;
};

db.exec(`
CREATE TABLE IF NOT EXISTS personal_assistance_attention (
  attention_key TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL,
  explicit INTEGER NOT NULL,
  set_at TEXT,
  expires_at TEXT,
  reason TEXT,
  revision INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_assistance_attention_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  state TEXT NOT NULL,
  source TEXT NOT NULL,
  explicit INTEGER NOT NULL,
  set_at TEXT NOT NULL,
  expires_at TEXT,
  reason TEXT,
  revision INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_assistance_attention_audit_id
ON personal_assistance_attention_audit(id DESC);
`);

const readAttentionStatement = db.prepare(`
SELECT
  state,
  source,
  confidence,
  explicit,
  set_at,
  expires_at,
  reason,
  revision
FROM personal_assistance_attention
WHERE attention_key = ?
LIMIT 1
`);

const writeAttentionStatement = db.prepare(`
INSERT INTO personal_assistance_attention (
  attention_key,
  state,
  source,
  confidence,
  explicit,
  set_at,
  expires_at,
  reason,
  revision
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(attention_key)
DO UPDATE SET
  state = excluded.state,
  source = excluded.source,
  confidence = excluded.confidence,
  explicit = excluded.explicit,
  set_at = excluded.set_at,
  expires_at = excluded.expires_at,
  reason = excluded.reason,
  revision = excluded.revision
`);

const insertAuditStatement = db.prepare(`
INSERT INTO personal_assistance_attention_audit (
  action,
  state,
  source,
  explicit,
  set_at,
  expires_at,
  reason,
  revision
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const listAuditStatement = db.prepare(`
SELECT
  id,
  action,
  state,
  source,
  explicit,
  set_at,
  expires_at,
  reason,
  revision
FROM personal_assistance_attention_audit
ORDER BY id DESC
LIMIT ?
`);

function nowIso(now: Date): string {
  return now.toISOString();
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

function parseExpiry(
  value: string | null | undefined,
): string | null {
  const normalized =
    normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const timestamp =
    new Date(normalized).getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(
      "Personal attention expiresAt must be a valid ISO-compatible date.",
    );
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function currentRow():
  AttentionRow | undefined {
  return readAttentionStatement.get(
    ATTENTION_KEY,
  ) as AttentionRow | undefined;
}

function currentRevision(): number {
  return currentRow()?.revision ?? 0;
}

function assertStoredState(
  value: string,
): PersonalAttentionState {
  if (!isPersonalAttentionState(value)) {
    throw new Error(
      `Stored personal attention state is invalid: ${value}`,
    );
  }

  return value;
}

function toSnapshot(
  row: AttentionRow | undefined,
): PersonalAttentionSnapshot {
  if (!row) {
    return {
      state:
        DEFAULT_ATTENTION_STATE,
      source:
        "system-default",
      confidence: 1,
      explicit: false,
      setAt: null,
      expiresAt: null,
      reason: null,
      revision: 0,
    };
  }

  return {
    state:
      assertStoredState(row.state),
    source:
      row.source ===
      "explicit-user"
        ? "explicit-user"
        : "system-default",
    confidence:
      Number.isFinite(
        row.confidence,
      )
        ? Math.min(
            1,
            Math.max(
              0,
              row.confidence,
            ),
          )
        : 1,
    explicit:
      row.explicit === 1,
    setAt:
      row.set_at,
    expiresAt:
      row.expires_at,
    reason:
      row.reason,
    revision:
      Math.max(
        0,
        Math.trunc(
          row.revision,
        ),
      ),
  };
}

function writeAudit(
  action:
    PersonalAttentionAuditAction,
  snapshot:
    PersonalAttentionSnapshot,
  eventAt: string,
): void {
  insertAuditStatement.run(
    action,
    snapshot.state,
    snapshot.source,
    snapshot.explicit
      ? 1
      : 0,
    eventAt,
    snapshot.expiresAt,
    snapshot.reason,
    snapshot.revision,
  );
}

function writeSnapshot(
  snapshot:
    PersonalAttentionSnapshot,
): void {
  writeAttentionStatement.run(
    ATTENTION_KEY,
    snapshot.state,
    snapshot.source,
    snapshot.confidence,
    snapshot.explicit
      ? 1
      : 0,
    snapshot.setAt,
    snapshot.expiresAt,
    snapshot.reason,
    snapshot.revision,
  );
}

const expireTransaction =
  db.transaction(
    (
      row: AttentionRow,
      eventAt: string,
    ) => {
      const next:
        PersonalAttentionSnapshot = {
          state:
            DEFAULT_ATTENTION_STATE,
          source:
            "system-default",
          confidence: 1,
          explicit: false,
          setAt:
            eventAt,
          expiresAt: null,
          reason:
            "Temporary personal attention override expired.",
          revision:
            row.revision + 1,
        };

      writeSnapshot(next);
      writeAudit(
        "expired",
        next,
        eventAt,
      );

      return next;
    },
  );

function expireIfNeeded(
  now: Date,
):
  PersonalAttentionSnapshot | undefined {
  const row =
    currentRow();

  if (
    !row ||
    !row.expires_at ||
    row.explicit !== 1
  ) {
    return undefined;
  }

  const expiresAt =
    new Date(
      row.expires_at,
    ).getTime();

  if (
    Number.isNaN(
      expiresAt,
    ) ||
    expiresAt >
      now.getTime()
  ) {
    return undefined;
  }

  return expireTransaction(
    row,
    nowIso(now),
  );
}

export function getPersonalAttentionSnapshot(
  now = new Date(),
): PersonalAttentionSnapshot {
  const expired =
    expireIfNeeded(now);

  if (expired) {
    return structuredClone(
      expired,
    );
  }

  return structuredClone(
    toSnapshot(
      currentRow(),
    ),
  );
}

const setTransaction =
  db.transaction(
    (
      input:
        SetPersonalAttentionInput,
      eventAt: string,
      expiresAt:
        string | null,
      reason:
        string | null,
    ) => {
      const next:
        PersonalAttentionSnapshot = {
          state:
            input.state,
          source:
            "explicit-user",
          confidence: 1,
          explicit: true,
          setAt:
            eventAt,
          expiresAt,
          reason,
          revision:
            currentRevision() + 1,
        };

      writeSnapshot(next);
      writeAudit(
        "set",
        next,
        eventAt,
      );

      return next;
    },
  );

export function setPersonalAttention(
  input:
    SetPersonalAttentionInput,
  now = new Date(),
): PersonalAttentionSnapshot {
  if (
    !isPersonalAttentionState(
      input.state,
    )
  ) {
    throw new Error(
      "Personal attention state must be available, busy, away, or do-not-disturb.",
    );
  }

  const expiresAt =
    parseExpiry(
      input.expiresAt,
    );

  if (
    expiresAt &&
    new Date(
      expiresAt,
    ).getTime() <=
      now.getTime()
  ) {
    throw new Error(
      "Personal attention expiresAt must be in the future.",
    );
  }

  const reason =
    normalizeOptionalText(
      input.reason,
    );

  return structuredClone(
    setTransaction(
      input,
      nowIso(now),
      expiresAt,
      reason,
    ),
  );
}

const resetTransaction =
  db.transaction(
    (
      eventAt: string,
      reason:
        string | null,
    ) => {
      const next:
        PersonalAttentionSnapshot = {
          state:
            DEFAULT_ATTENTION_STATE,
          source:
            "system-default",
          confidence: 1,
          explicit: false,
          setAt:
            eventAt,
          expiresAt: null,
          reason,
          revision:
            currentRevision() + 1,
        };

      writeSnapshot(next);
      writeAudit(
        "reset",
        next,
        eventAt,
      );

      return next;
    },
  );

export function resetPersonalAttention(
  reason?: string | null,
  now = new Date(),
): PersonalAttentionSnapshot {
  return structuredClone(
    resetTransaction(
      nowIso(now),
      normalizeOptionalText(
        reason,
      ),
    ),
  );
}

export function listPersonalAttentionAudit(
  limit = 20,
): PersonalAttentionAuditEntry[] {
  const safeLimit =
    Number.isInteger(limit)
      ? Math.min(
          100,
          Math.max(
            1,
            limit,
          ),
        )
      : 20;

  const rows =
    listAuditStatement.all(
      safeLimit,
    ) as AttentionAuditRow[];

  return rows.map(
    (row) => {
      const action =
        row.action ===
        "set" ||
        row.action ===
        "reset" ||
        row.action ===
        "expired"
          ? row.action
          : "reset";

      return {
        id:
          row.id,
        action,
        state:
          assertStoredState(
            row.state,
          ),
        source:
          row.source ===
          "explicit-user"
            ? "explicit-user"
            : "system-default",
        explicit:
          row.explicit === 1,
        setAt:
          row.set_at,
        expiresAt:
          row.expires_at,
        reason:
          row.reason,
        revision:
          Math.max(
            0,
            Math.trunc(
              row.revision,
            ),
          ),
      };
    },
  );
}