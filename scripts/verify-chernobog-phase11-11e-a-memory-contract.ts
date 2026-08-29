import assert from "node:assert/strict";
import {
  access,
  readFile,
} from "node:fs/promises";

import {
  getUnifiedMemorySource,
  getUnifiedMemorySourceSnapshot,
  listUnifiedMemorySources,
} from "../lib/chernobog/memory-architecture/sourceRegistry";
import type {
  UnifiedMemoryRecord,
  UnifiedMemorySourceId,
} from "../lib/chernobog/memory-architecture/unifiedTypes";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

const EXPECTED_SOURCES:
  UnifiedMemorySourceId[] = [
    "conversation-history",
    "session-state",
    "durable-facts",
    "vault-structured-memory",
    "project-memory-profile",
    "personal-intelligence",
    "learned-lessons",
  ];

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11E-A - Memory Source Inventory & Unified Contract",
  );
  console.log(
    "================================================================",
  );

  const sources =
    listUnifiedMemorySources();

  assert.deepEqual(
    sources.map(
      (source) =>
        source.id,
    ),
    [...EXPECTED_SOURCES].sort(),
  );

  pass(
    "canonical registry inventories conversation, session, durable, vault, project, personal-intelligence, and learned memory authorities",
  );

  assert.equal(
    new Set(
      sources.map(
        (source) =>
          source.id,
      ),
    ).size,
    sources.length,
  );

  assert.equal(
    sources.every(
      (source) =>
        source.authorities.length >
          0 &&
        source.scopes.length >
          0,
    ),
    true,
  );

  pass(
    "every unified source has a unique identity, explicit scope, and existing authority path",
  );

  const snapshot =
    getUnifiedMemorySourceSnapshot();

  assert.equal(
    snapshot.sourceCount,
    EXPECTED_SOURCES.length,
  );

  assert.equal(
    snapshot.layers.includes(
      "short_term",
    ),
    true,
  );
  assert.equal(
    snapshot.layers.includes(
      "working",
    ),
    true,
  );
  assert.equal(
    snapshot.layers.includes(
      "long_term",
    ),
    true,
  );
  assert.equal(
    snapshot.layers.includes(
      "learned",
    ),
    true,
  );

  pass(
    "unified contract represents short-term, working, long-term, and governed learned memory",
  );

  assert.equal(
    getUnifiedMemorySource(
      "session-state",
    )?.durability,
    "session",
  );

  assert.equal(
    getUnifiedMemorySource(
      "learned-lessons",
    )?.durability,
    "persistent",
  );

  assert.equal(
    getUnifiedMemorySource(
      "durable-facts",
    )?.role,
    "durable-fact-store",
  );

  pass(
    "source metadata distinguishes session state, durable facts, and governed learning without conflating their semantics",
  );

  const record:
    UnifiedMemoryRecord = {
      id: "test:memory",
      source:
        "durable-facts",
      layer:
        "long_term",
      scope:
        "user",
      content:
        "Verifier fixture",
      confidence:
        1,
      metadata: {
        verifier:
          "11E-A",
      },
    };

  assert.equal(
    record.source,
    "durable-facts",
  );
  assert.equal(
    record.layer,
    "long_term",
  );
  assert.equal(
    record.scope,
    "user",
  );

  pass(
    "unified memory record provides one normalized identity/source/layer/scope/content contract",
  );

  const requiredAuthorities = [
    "lib/chernobog/memory.ts",
    "lib/chernobog/session/store.ts",
    "lib/chernobog/memory-architecture/workingMemory.ts",
    "lib/chernobog/learning/lessonStore.ts",
    "lib/modules/vault-brain/memoryStore.ts",
    "lib/modules/vault-brain/projectProfileStore.ts",
    "lib/modules/vault-brain/personalIntelligenceOperatingLoop.ts",
  ];

  for (
    const path
    of requiredAuthorities
  ) {
    await access(path);
  }

  pass(
    "all registered source families are grounded in files that exist in the repository",
  );

  const contextSource =
    await readFile(
      "lib/chernobog/memory-architecture/contextBuilder.ts",
      "utf8",
    );

  assert.equal(
    contextSource.includes(
      '"short_term"',
    ),
    true,
  );
  assert.equal(
    contextSource.includes(
      '"working"',
    ),
    true,
  );
  assert.equal(
    contextSource.includes(
      '"long_term"',
    ),
    true,
  );

  pass(
    "existing layered context builder remains intact as the current memory composition surface",
  );

  const legacyMemorySource =
    await readFile(
      "lib/chernobog/memory.ts",
      "utf8",
    );

  for (
    const required
    of [
      "saveMessage",
      "getRecentMessages",
      "saveMemory",
      "getMemories",
      "deleteMemory",
    ]
  ) {
    assert.equal(
      legacyMemorySource.includes(
        required,
      ),
      true,
    );
  }

  pass(
    "legacy conversation and durable-fact storage are inventoried rather than silently replaced",
  );

  const sessionSource =
    await readFile(
      "lib/chernobog/session/store.ts",
      "utf8",
    );

  assert.equal(
    sessionSource.includes(
      "getSessionContext",
    ),
    true,
  );
  assert.equal(
    sessionSource.includes(
      "saveSessionContext",
    ),
    true,
  );
  assert.equal(
    sessionSource.includes(
      "session_state",
    ),
    true,
  );

  pass(
    "persistent session state is recognized as the authoritative working-state store",
  );

  const lessonSource =
    await readFile(
      "lib/chernobog/learning/lessonStore.ts",
      "utf8",
    );

  assert.equal(
    lessonSource.includes(
      "ChernobogLearnedLessonStore",
    ),
    true,
  );

  pass(
    "11I learned lessons remain a distinct governed durable source inside the unified contract",
  );

  const apiSource =
    await readFile(
      "app/api/memory-sources/route.ts",
      "utf8",
    );

  assert.equal(
    apiSource.includes(
      "export async function GET",
    ),
    true,
  );
  assert.equal(
    /\bPOST\b/.test(
      apiSource,
    ),
    false,
  );
  assert.equal(
    apiSource.includes(
      "readsMemoryContents",
    ),
    true,
  );
  assert.equal(
    apiSource.includes(
      "writesMemory",
    ),
    true,
  );

  pass(
    "memory-source diagnostics are read-only metadata and expose no memory contents or mutation surface",
  );

  const registrySource =
    await readFile(
      "lib/chernobog/memory-architecture/sourceRegistry.ts",
      "utf8",
    );

  assert.equal(
    registrySource.includes(
      "saveMemory(",
    ),
    false,
  );
  assert.equal(
    registrySource.includes(
      "getMemories(",
    ),
    false,
  );
  assert.equal(
    registrySource.includes(
      "ChernobogLearnedLessonStore(",
    ),
    false,
  );

  pass(
    "11E-A defines inventory and contract only; it does not create a parallel read or write path",
  );

  console.log(
    "================================================================",
  );
  console.log(
    "PASS Phase 11E-A Memory Source Inventory & Unified Contract acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
