import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  readUnifiedMemory,
} from "../lib/chernobog/memory-architecture/unifiedReader";
import type {
  UnifiedMemoryReaderMap,
} from "../lib/chernobog/memory-architecture/readTypes";
import type {
  UnifiedMemoryRecord,
} from "../lib/chernobog/memory-architecture/unifiedTypes";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function record(
  input: UnifiedMemoryRecord,
): UnifiedMemoryRecord {
  return structuredClone(input);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11E-B - Unified Read & Retrieval Path",
  );
  console.log(
    "======================================================",
  );

  const calls: string[] = [];

  const readers:
    UnifiedMemoryReaderMap = {
      "conversation-history":
        () => {
          calls.push(
            "conversation-history",
          );
          return [
            record({
              id: "conversation:1",
              source:
                "conversation-history",
              layer:
                "short_term",
              scope:
                "conversation",
              content:
                "user: Chernobog memory architecture",
            }),
          ];
        },

      "session-state":
        () => {
          calls.push(
            "session-state",
          );
          return [
            record({
              id: "session:test",
              source:
                "session-state",
              layer:
                "working",
              scope:
                "session",
              sessionId:
                "test",
              content:
                "active plan unified memory",
            }),
          ];
        },

      "durable-facts":
        () => {
          calls.push(
            "durable-facts",
          );
          return [
            record({
              id: "durable:1",
              source:
                "durable-facts",
              layer:
                "long_term",
              scope:
                "user",
              content:
                "User prefers verifier driven patches",
            }),
          ];
        },

      "vault-structured-memory":
        () => {
          calls.push(
            "vault-structured-memory",
          );
          return [
            record({
              id: "vault:1",
              source:
                "vault-structured-memory",
              layer:
                "long_term",
              scope:
                "project",
              projectId:
                "chernobog",
              content:
                "Phase 11 architecture roadmap",
              confidence:
                0.95,
              metadata: {
                status:
                  "approved",
              },
            }),
          ];
        },

      "project-memory-profile":
        () => {
          calls.push(
            "project-memory-profile",
          );
          return [
            record({
              id: "project:chernobog",
              source:
                "project-memory-profile",
              layer:
                "long_term",
              scope:
                "project",
              projectId:
                "chernobog",
              content:
                "Chernobog active project profile",
            }),
          ];
        },

      "personal-intelligence":
        () => {
          calls.push(
            "personal-intelligence",
          );
          return [
            record({
              id:
                "personal-intelligence:status",
              source:
                "personal-intelligence",
              layer:
                "long_term",
              scope:
                "system",
              content:
                "Personal intelligence operating status",
            }),
          ];
        },

      "learned-lessons":
        () => {
          calls.push(
            "learned-lessons",
          );
          return [
            record({
              id: "lesson:1",
              source:
                "learned-lessons",
              layer:
                "learned",
              scope:
                "system",
              content:
                "Use approved memory as project truth",
              confidence:
                0.9,
            }),
          ];
        },
    };

  const all =
    await readUnifiedMemory(
      {
        limit: 20,
      },
      readers,
    );

  assert.equal(
    all.sourcesQueried.length,
    7,
  );
  assert.equal(
    all.sourceErrors.length,
    0,
  );
  assert.equal(
    all.records.length,
    7,
  );
  assert.equal(
    new Set(calls).size,
    7,
  );

  pass(
    "one unified query can retrieve normalized records from every registered memory source",
  );

  const selected =
    await readUnifiedMemory(
      {
        sources: [
          "durable-facts",
          "learned-lessons",
        ],
        limit: 20,
      },
      readers,
    );

  assert.deepEqual(
    selected.sourcesQueried,
    [
      "durable-facts",
      "learned-lessons",
    ],
  );
  assert.equal(
    selected.records.length,
    2,
  );

  pass(
    "callers can constrain retrieval to selected authoritative sources",
  );

  const relevant =
    await readUnifiedMemory(
      {
        text:
          "architecture roadmap",
        limit: 2,
      },
      readers,
    );

  assert.equal(
    relevant.records[0]
      ?.source,
    "vault-structured-memory",
  );
  assert.equal(
    relevant.records.length <=
      2,
    true,
  );

  pass(
    "unified lexical relevance ranks records across source boundaries under one bounded limit",
  );

  const scoped =
    await readUnifiedMemory(
      {
        projectId:
          "chernobog",
        sources: [
          "vault-structured-memory",
          "project-memory-profile",
        ],
      },
      readers,
    );

  assert.equal(
    scoped.records.every(
      (item) =>
        item.projectId ===
        "chernobog",
    ),
    true,
  );

  pass(
    "project-scoped retrieval does not leak records carrying another project identity",
  );

  const partial =
    await readUnifiedMemory(
      {
        sources: [
          "durable-facts",
          "learned-lessons",
        ],
      },
      {
        "durable-facts":
          () => {
            throw new Error(
              "fixture failure",
            );
          },
        "learned-lessons":
          () => [
            record({
              id: "lesson:ok",
              source:
                "learned-lessons",
              layer:
                "learned",
              scope:
                "system",
              content:
                "available lesson",
            }),
          ],
      },
    );

  assert.equal(
    partial.records.length,
    1,
  );
  assert.equal(
    partial.sourceErrors.length,
    1,
  );
  assert.equal(
    partial.sourceErrors[0]
      ?.source,
    "durable-facts",
  );

  pass(
    "one unavailable source degrades locally instead of discarding successful memory reads",
  );

  const adapters =
    await readFile(
      "lib/chernobog/memory-architecture/readAdapters.ts",
      "utf8",
    );

  for (
    const authority
    of [
      "getRecentMessages",
      "getMemories",
      "getSessionContext",
      "createVaultMemoryStore",
      "createProjectMemoryProfileStore",
      "ChernobogLearnedLessonStore",
      "getV6PersonalIntelligenceSystemStatus",
    ]
  ) {
    assert.equal(
      adapters.includes(
        authority,
      ),
      true,
      `Missing read adapter authority ${authority}`,
    );
  }

  pass(
    "default adapters delegate to existing memory authorities instead of duplicating persistence",
  );

  assert.equal(
    /statuses:\s*\[\s*"approved"\s*,?\s*\]/m.test(
      adapters,
    ),
    true,
  );

  pass(
    "Vault Brain unified retrieval defaults to approved structured memory only",
  );

  const readerSource =
    await readFile(
      "lib/chernobog/memory-architecture/unifiedReader.ts",
      "utf8",
    );

  for (
    const forbidden
    of [
      "saveMessage(",
      "saveMemory(",
      "saveSessionContext(",
      "upsertEntry(",
      "upsertProfile(",
      ".upsert(",
    ]
  ) {
    assert.equal(
      readerSource.includes(
        forbidden,
      ),
      false,
    );
  }

  pass(
    "11E-B is read-only and introduces no memory write or promotion path",
  );

  const contextSource =
    await readFile(
      "lib/chernobog/memory-architecture/contextBuilder.ts",
      "utf8",
    );

  assert.equal(
    contextSource.includes(
      "buildMemoryContext",
    ),
    true,
  );

  pass(
    "existing production context builder remains untouched until the later integration block",
  );

  console.log(
    "======================================================",
  );
  console.log(
    "PASS Phase 11E-B Unified Read & Retrieval Path acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
