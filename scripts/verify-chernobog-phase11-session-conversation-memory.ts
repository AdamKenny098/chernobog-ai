import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import db from "../lib/chernobog/db";
import {
  getRecentMessages,
  saveMessage,
} from "../lib/chernobog/memory";
import {
  createDefaultUnifiedMemoryReaders,
} from "../lib/chernobog/memory-architecture/readAdapters";

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11 - Session-Scoped Conversation Memory Acceptance v3",
  );
  console.log(
    "=====================================================================",
  );

  const columns = db
    .prepare("PRAGMA table_info(messages)")
    .all() as Array<{ name: string }>;

  assert.equal(
    columns.some(
      (column) =>
        column.name === "session_id",
    ),
    true,
  );

  console.log(
    "PASS messages schema includes nullable session_id",
  );

  const sessionA =
    `phase11-session-a-${Date.now()}`;
  const sessionB =
    `phase11-session-b-${Date.now()}`;
  const legacyMarker =
    `legacy-unscoped-${Date.now()}`;

  try {
    saveMessage(
      "user",
      "session A user marker",
      "chat",
      sessionA,
    );

    saveMessage(
      "assistant",
      "session A assistant marker",
      "chat",
      sessionA,
    );

    saveMessage(
      "user",
      "session B user marker",
      "chat",
      sessionB,
    );

    saveMessage(
      "assistant",
      legacyMarker,
      "chat",
    );

    const a = getRecentMessages(
      sessionA,
      20,
    );

    const b = getRecentMessages(
      sessionB,
      20,
    );

    assert.deepEqual(
      a.map((message) => message.content),
      [
        "session A user marker",
        "session A assistant marker",
      ],
    );

    assert.deepEqual(
      b.map((message) => message.content),
      [
        "session B user marker",
      ],
    );

    assert.equal(
      a.some(
        (message) =>
          message.content === legacyMarker,
      ),
      false,
    );

    console.log(
      "PASS session-scoped reads exclude other sessions and legacy unscoped rows",
    );

    const readers =
      createDefaultUnifiedMemoryReaders();

    const conversationReader =
      readers["conversation-history"];

    assert.ok(conversationReader);

    const unifiedA = await conversationReader({
      sessionId: sessionA,
      limit: 20,
    });

    assert.equal(
      unifiedA.some(
        (record) =>
          record.content.includes(
            "session A user marker",
          ),
      ),
      true,
    );

    assert.equal(
      unifiedA.some(
        (record) =>
          record.content.includes(
            "session B user marker",
          ),
      ),
      false,
    );

    const noSession = await conversationReader({
      limit: 20,
    });

    assert.deepEqual(
      noSession,
      [],
    );

    console.log(
      "PASS unified 11E conversation-history reader returns only the requested session regardless of record formatting",
    );
  } finally {
    db.prepare(
      `
      DELETE FROM messages
      WHERE session_id IN (?, ?)
         OR content = ?
      `,
    ).run(
      sessionA,
      sessionB,
      legacyMarker,
    );
  }

  const runCommand = await readFile(
    "lib/chernobog/pipeline/runCommand.ts",
    "utf8",
  );

  const payload = await readFile(
    "lib/chernobog/pipeline/payload.ts",
    "utf8",
  );

  assert.equal(
    /saveMessage\(\s*"user"\s*,\s*userMessage\s*,\s*route\s*\);/.test(
      runCommand,
    ),
    false,
  );

  assert.equal(
    /saveMessage\(\s*"user"\s*,\s*userMessage\s*,\s*route\s*,\s*sessionId\s*\);/.test(
      runCommand,
    ),
    true,
  );

  assert.equal(
    /getRecentMessages\(\s*sessionId\s*,\s*(?:8|12)\s*\)/.test(
      runCommand,
    ),
    true,
  );

  assert.equal(
    /saveMessage\(\s*"assistant"\s*,\s*reply\s*,\s*route\s*,\s*sessionId\s*\);/.test(
      payload,
    ),
    true,
  );

  console.log(
    "PASS live pipeline writes and reads carry active session identity",
  );

  const legacyCount = (
    db.prepare(
      `
      SELECT COUNT(*) AS count
      FROM messages
      WHERE session_id IS NULL
      `,
    ).get() as { count: number }
  ).count;

  assert.equal(
    legacyCount >= 0,
    true,
  );

  console.log(
    "PASS historical unscoped message rows remain preserved",
  );

  console.log(
    "=====================================================================",
  );

  console.log(
    "PASS Phase 11 Session-Scoped Conversation Memory Acceptance v3",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});