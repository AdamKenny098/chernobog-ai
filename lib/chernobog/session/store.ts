import db from "@/lib/chernobog/db";
import type { WorkflowState } from "@/lib/chernobog/pipeline/types";
import { createDefaultWorkflow, type SessionContext } from "./types";

const sessionCache = new Map<string, SessionContext>();

type SessionStateRow = {
  session_id: string;
  state_json: string;
  updated_at: string;
};

const DEFAULT_SESSION_ID = "local-default";
const PENDING_DISAMBIGUATION_TTL_MS = 30 * 60 * 1000;
const FILE_WORKFLOW_TTL_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function ageMs(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.now() - timestamp;
}

function cleanupStaleSessionState(session: SessionContext): SessionContext {
  const sessionAge = ageMs(session.lastUpdatedAt);

  if (
    session.pendingDisambiguation &&
    sessionAge > PENDING_DISAMBIGUATION_TTL_MS
  ) {
    session.pendingDisambiguation = null;
  }

  if (
    session.workflow?.kind === "file" &&
    sessionAge > FILE_WORKFLOW_TTL_MS
  ) {
    session.workflow = createDefaultWorkflow();
  }

  return session;
}

function createEmptySession(sessionId: string): SessionContext {
  return {
    sessionId,
    lastUpdatedAt: nowIso(),
    pendingDisambiguation: null,
    workflow: createDefaultWorkflow(),
  };
}

function sanitizeSessionId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function persistSessionState(session: SessionContext): void {
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

export function resolveSessionId(value?: string | null): string {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return DEFAULT_SESSION_ID;
  }

  const sanitized = sanitizeSessionId(trimmed);

  return sanitized || DEFAULT_SESSION_ID;
}

export function getSessionContext(sessionId: string): SessionContext {
  sessionId = resolveSessionId(sessionId);

  const cached = sessionCache.get(sessionId);

  if (cached) {
    if (!cached.workflow) {
      cached.workflow = createDefaultWorkflow();
    }
  
    if (!cached.lastUpdatedAt) {
      cached.lastUpdatedAt = nowIso();
    }
  
    cleanupStaleSessionState(cached);
    return cached;
  }

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
    const parsed = JSON.parse(row.state_json) as Partial<SessionContext>;

    const hydrated: SessionContext = {
      ...createEmptySession(sessionId),
      ...parsed,
      sessionId,
      lastUpdatedAt: parsed.lastUpdatedAt ?? row.updated_at ?? nowIso(),
      workflow: parsed.workflow ?? createDefaultWorkflow(),
    };

    cleanupStaleSessionState(hydrated);
    sessionCache.set(sessionId, hydrated);
    return hydrated;
  } catch {
    const fresh = createEmptySession(sessionId);
    sessionCache.set(sessionId, fresh);
    return fresh;
  }
}

export function saveSessionContext(session: SessionContext): void {
  session.sessionId = resolveSessionId(session.sessionId);
  session.lastUpdatedAt = nowIso();

  if (!session.workflow) {
    session.workflow = createDefaultWorkflow();
  }

  persistSessionState(session);
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
  const resolvedSessionId = resolveSessionId(sessionId);

  sessionCache.delete(resolvedSessionId);

  db.prepare(`DELETE FROM session_state WHERE session_id = ?`).run(
    resolvedSessionId
  );
}

export function clearWorkflow(session: SessionContext): void {
  session.workflow = { kind: "none" };
}

export function setWorkflow(
  session: SessionContext,
  workflow: WorkflowState
): void {
  session.workflow = workflow;
}