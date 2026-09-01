import db from "@/lib/chernobog/db";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function saveMessage(
  role: string,
  content: string,
  route?: string,
  sessionId?: string,
) {
  const clean = normalizeText(content);
  if (!clean) return;

  const cleanSessionId =
    sessionId?.trim() || null;

  db.prepare(
    `
    INSERT INTO messages (
      role,
      content,
      route,
      session_id
    )
    VALUES (?, ?, ?, ?)
    `,
  ).run(
    role,
    clean,
    route ?? null,
    cleanSessionId,
  );
}

export function getRecentMessages(
  sessionId: string,
  limit?: number,
): ChatHistoryMessage[];
export function getRecentMessages(
  limit?: number,
): ChatHistoryMessage[];
export function getRecentMessages(
  sessionIdOrLimit: string | number = 8,
  maybeLimit = 8,
): ChatHistoryMessage[] {
  if (typeof sessionIdOrLimit === "string") {
    const sessionId = sessionIdOrLimit.trim();
    if (!sessionId) {
      return [];
    }

    const limit = Math.max(
      1,
      Math.min(100, Math.trunc(maybeLimit)),
    );

    const rows = db
      .prepare(
        `
        SELECT role, content
        FROM messages
        WHERE role IN ('user', 'assistant')
          AND session_id = ?
        ORDER BY id DESC
        LIMIT ?
        `,
      )
      .all(
        sessionId,
        limit,
      ) as ChatHistoryMessage[];

    return rows.reverse();
  }

  const limit = Math.max(
    1,
    Math.min(
      100,
      Math.trunc(sessionIdOrLimit),
    ),
  );

  const rows = db
    .prepare(
      `
      SELECT role, content
      FROM messages
      WHERE role IN ('user', 'assistant')
      ORDER BY id DESC
      LIMIT ?
      `,
    )
    .all(limit) as ChatHistoryMessage[];

  return rows.reverse();
}

export function getLastUserRoute(
  sessionId: string,
): string | null {
  const cleanSessionId =
    sessionId.trim();

  if (!cleanSessionId) {
    return null;
  }

  const row = db
    .prepare(
      `
        SELECT route
        FROM messages
        WHERE role = 'user'
          AND session_id = ?
          AND route IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      `,
    )
    .get(cleanSessionId) as
      | { route: string | null }
      | undefined;

  const route =
    row?.route?.trim();

  return route || null;
}

export function saveMemory(fact: string): { saved: boolean; fact: string } {
  const clean = normalizeText(fact);
  if (!clean) {
    return { saved: false, fact: "" };
  }

  const existing = db
    .prepare(
      `
      SELECT id
      FROM memories
      WHERE lower(fact) = lower(?)
      LIMIT 1
      `
    )
    .get(clean) as { id: number } | undefined;

  if (existing) {
    return { saved: false, fact: clean };
  }

  db.prepare(
    `
    INSERT INTO memories (fact)
    VALUES (?)
    `
  ).run(clean);

  return { saved: true, fact: clean };
}

export function getMemories(limit = 20): string[] {
  const rows = db
    .prepare(
      `
      SELECT fact
      FROM memories
      ORDER BY id DESC
      LIMIT ?
      `
    )
    .all(limit) as Array<{ fact: string }>;

  return rows.map((row) => row.fact).reverse();
}

export function deleteMemory(fact: string): { deleted: boolean; fact: string } {
  const clean = normalizeText(fact);
  if (!clean) {
    return { deleted: false, fact: "" };
  }

  const result = db.prepare(
    `
    DELETE FROM memories
    WHERE lower(fact) = lower(?)
    `
  ).run(clean);

  return {
    deleted: result.changes > 0,
    fact: clean,
  };
}

export function clearAllMemories(): number {
  const result = db.prepare(`DELETE FROM memories`).run();
  return result.changes;
}

export function isRememberRequest(input: string): boolean {
  const text = input.trim().toLowerCase();

  return (
    text.startsWith("remember ") ||
    text.startsWith("remember that ") ||
    text.startsWith("please remember ")
  );
}

export function isRecallRequest(input: string): boolean {
  const text = input.trim().toLowerCase();

  return (
    text.includes("what do you remember") ||
    text.includes("what do you know about me") ||
    text.includes("what have you stored about me") ||
    text.includes("list memories") ||
    text.includes("show memories") ||
    text.includes("show me my memories") ||
    text.includes("do you remember anything about me")
  );
}

export function isForgetRequest(input: string): boolean {
  const text = input.trim().toLowerCase();

  return (
    text.startsWith("forget ") ||
    text.startsWith("forget that ") ||
    text.startsWith("please forget ") ||
    text.startsWith("delete memory ") ||
    text.startsWith("remove memory ")
  );
}

export function isWipeMemoriesRequest(input: string): boolean {
  const text = input.trim().toLowerCase();

  return (
    text === "wipe memories" ||
    text === "wipe all memories" ||
    text === "clear memories" ||
    text === "clear all memories" ||
    text === "delete all memories" ||
    text === "remove all memories"
  );
}

export function extractMemoryFact(input: string): string {
  let fact = input.trim();

  fact = fact.replace(/^(please\s+)?remember\s+that\s+/i, "");
  fact = fact.replace(/^(please\s+)?remember\s+/i, "");
  fact = fact.replace(/[.]+$/, "");

  return normalizeText(fact);
}

export function extractForgetFact(input: string): string {
  let fact = input.trim();

  fact = fact.replace(/^(please\s+)?forget\s+that\s+/i, "");
  fact = fact.replace(/^(please\s+)?forget\s+/i, "");
  fact = fact.replace(/^delete\s+memory\s+/i, "");
  fact = fact.replace(/^remove\s+memory\s+/i, "");
  fact = fact.replace(/[.]+$/, "");

  return normalizeText(fact);
}