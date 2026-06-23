import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  WatchSession,
  WatchSessionIndex,
  WatchSessionIndexEntry,
} from "./types";

function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getWatchSessionsDir() {
  return path.join(getVaultRoot(), "content-watch", "sessions");
}

export function getWatchSessionPath(sessionId: string) {
  return path.join(getWatchSessionsDir(), `${sessionId}.json`);
}

export function getWatchSessionIndexPath() {
  return path.join(getWatchSessionsDir(), "_index.json");
}

async function readJsonIfExists<T>(absolutePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readWatchSessionIndex(): Promise<WatchSessionIndex> {
  return readJsonIfExists<WatchSessionIndex>(getWatchSessionIndexPath(), {
    version: 1,
    updatedAt: new Date().toISOString(),
    sessions: [],
  });
}

function countByDecision(session: WatchSession) {
  return {
    pendingCount: session.itemStates.filter((item) => item.decision === "pending").length,
    watchedCount: session.itemStates.filter((item) => item.decision === "watched").length,
    analyzeLaterCount: session.itemStates.filter((item) => item.decision === "analyze-later").length,
    skippedCount: session.itemStates.filter((item) => item.decision === "skipped").length,
    dismissedCount: session.itemStates.filter((item) => item.decision === "dismissed").length,
  };
}

export function sessionToIndexEntry(session: WatchSession): WatchSessionIndexEntry {
  const counts = countByDecision(session);

  return {
    id: session.id,
    title: session.title,
    status: session.status,
    platform: session.platform,
    filter: session.filter,
    order: session.order,
    batchSize: session.batchSize,
    sourceLabel: session.sourceLabel,
    itemCount: session.itemIds.length,
    currentIndex: session.currentIndex,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt,
    ...counts,
  };
}

export async function writeWatchSessionIndex(index: WatchSessionIndex) {
  const sessionsDir = getWatchSessionsDir();

  await fs.mkdir(sessionsDir, {
    recursive: true,
  });

  await fs.writeFile(
    getWatchSessionIndexPath(),
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        sessions: index.sessions,
      },
      null,
      2
    ),
    "utf8"
  );
}

export async function readWatchSession(sessionId: string): Promise<WatchSession | null> {
  try {
    const raw = await fs.readFile(getWatchSessionPath(sessionId), "utf8");
    return JSON.parse(raw) as WatchSession;
  } catch {
    return null;
  }
}

export async function writeWatchSession(session: WatchSession) {
  const sessionsDir = getWatchSessionsDir();

  await fs.mkdir(sessionsDir, {
    recursive: true,
  });

  const nextSession: WatchSession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    getWatchSessionPath(nextSession.id),
    JSON.stringify(nextSession, null, 2),
    "utf8"
  );

  const index = await readWatchSessionIndex();
  const entry = sessionToIndexEntry(nextSession);
  const existingIndex = index.sessions.findIndex((item) => item.id === nextSession.id);

  if (existingIndex >= 0) {
    index.sessions[existingIndex] = entry;
  } else {
    index.sessions.unshift(entry);
  }

  index.sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await writeWatchSessionIndex(index);

  return nextSession;
}

export async function getLatestActiveWatchSession() {
  const index = await readWatchSessionIndex();
  const latest = index.sessions.find((session) => session.status === "active");

  if (!latest) {
    return null;
  }

  return readWatchSession(latest.id);
}

export function createWatchSessionId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "");
  const suffix = crypto.randomBytes(4).toString("hex");

  return `watch-session-${stamp}-${suffix}`;
}
