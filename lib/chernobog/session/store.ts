import db from "@/lib/chernobog/db";
import { SessionContext } from "./types";

const sessionCache = new Map<string, SessionContext>();

type SessionStateRow = {
  session_id: string;
  state_json: string;
  updated_at: string;
};

const DEFAULT_SESSION_ID = "local-default";

function nowIso() {
  return new Date().toISOString();
}

function createEmptySession(sessionId: string): SessionContext {
  return {
    sessionId,
    lastUpdatedAt: nowIso(),
    pendingDisambiguation: null,
  };
}

export function resolveSessionId(value?: string | null): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || DEFAULT_SESSION_ID;
}

export function getSessionContext(sessionId: string): SessionContext {
  const cached = sessionCache.get(sessionId);
  if (cached) return cached;

  const row = db
    .prepare(
      `
      SELECT session_id, state_json, updated_at
      FROM session_state
      WHERE session_id = ?
      LIMIT 1
      `
    )
    .get(sessionId) as SessionStateRow | undefined;

  if (!row) {
    const fresh = createEmptySession(sessionId);
    sessionCache.set(sessionId, fresh);
    return fresh;
  }

  try {
    const parsed = JSON.parse(row.state_json) as SessionContext;
    const hydrated: SessionContext = {
      ...createEmptySession(sessionId),
      ...parsed,
      sessionId,
    };
    sessionCache.set(sessionId, hydrated);
    return hydrated;
  } catch {
    const fresh = createEmptySession(sessionId);
    sessionCache.set(sessionId, fresh);
    return fresh;
  }
}

export function saveSessionContext(session: SessionContext): void {
  session.lastUpdatedAt = nowIso();

  const payload = JSON.stringify(session);

  db.prepare(
    `
    INSERT INTO session_state (session_id, state_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_id)
    DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = CURRENT_TIMESTAMP
    `
  ).run(session.sessionId, payload);

  sessionCache.set(session.sessionId, session);
}

export function clearPendingDisambiguation(session: SessionContext): void {
  session.pendingDisambiguation = null;
}

export function setPendingDisambiguation(
  session: SessionContext,
  pending: SessionContext["pendingDisambiguation"]
): void {
  session.pendingDisambiguation = pending ?? null;
}

export function clearSessionContext(sessionId: string): void {
  sessionCache.delete(sessionId);
  db.prepare(`DELETE FROM session_state WHERE session_id = ?`).run(sessionId);
}