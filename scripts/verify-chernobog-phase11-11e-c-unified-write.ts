import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getUnifiedMemoryWritePolicy,
  listUnifiedMemoryWritePolicies,
} from "../lib/chernobog/memory-architecture/writePolicy";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11E-C - Unified Write & Persistence Path",
  );
  console.log(
    "========================================================",
  );

  const policies =
    listUnifiedMemoryWritePolicies();

  assert.equal(policies.length, 7);
  assert.equal(
    new Set(
      policies.map((policy) => policy.source),
    ).size,
    7,
  );

  pass(
    "every registered memory source has one explicit unified write policy",
  );

  assert.equal(
    getUnifiedMemoryWritePolicy(
      "conversation-history",
    ).policy,
    "direct",
  );
  assert.equal(
    getUnifiedMemoryWritePolicy(
      "session-state",
    ).policy,
    "direct",
  );
  assert.equal(
    getUnifiedMemoryWritePolicy(
      "durable-facts",
    ).policy,
    "direct",
  );
  assert.equal(
    getUnifiedMemoryWritePolicy(
      "project-memory-profile",
    ).policy,
    "direct",
  );

  pass(
    "ordinary routed writes retain the existing conversation, session, durable-fact, and project authorities",
  );

  assert.equal(
    getUnifiedMemoryWritePolicy(
      "vault-structured-memory",
    ).policy,
    "staged-raw",
  );

  pass(
    "Vault structured memory uses staged raw writes rather than direct approved-memory insertion",
  );

  assert.equal(
    getUnifiedMemoryWritePolicy(
      "learned-lessons",
    ).policy,
    "governed-only",
  );
  assert.equal(
    getUnifiedMemoryWritePolicy(
      "personal-intelligence",
    ).policy,
    "domain-owned",
  );

  pass(
    "learned lessons and personal-intelligence state reject generic unified writes",
  );

  const adapters = await readFile(
    "lib/chernobog/memory-architecture/writeAdapters.ts",
    "utf8",
  );

  for (const authority of [
    "saveMessage",
    "saveMemory",
    "getSessionContext",
    "saveSessionContext",
    "createVaultMemoryStore",
    "createProjectMemoryProfileStore",
    "upsertProfile",
    "upsertVersion",
  ]) {
    assert.equal(
      adapters.includes(authority),
      true,
      `Missing write adapter authority ${authority}`,
    );
  }

  pass(
    "default writers delegate to existing persistence authorities rather than creating a new store",
  );

  assert.equal(
    adapters.includes("createRawEntry"),
    true,
  );
  assert.equal(
    adapters.includes("upsertEntry("),
    false,
  );
  assert.equal(
    adapters.includes('status: "approved"'),
    false,
  );

  pass(
    "unified Vault writes cannot bypass raw-memory staging or assign approved status",
  );

  const writer = await readFile(
    "lib/chernobog/memory-architecture/unifiedWriter.ts",
    "utf8",
  );

  assert.equal(
    writer.includes("lessonPromotion"),
    false,
  );
  assert.equal(
    writer.includes("ChernobogLearnedLessonStore"),
    false,
  );
  assert.equal(
    writer.includes("getUnifiedMemoryWritePolicy"),
    true,
  );

  pass(
    "generic unified writing cannot manufacture or persist 11I learned lessons",
  );

  const personal = await readFile(
    "lib/modules/vault-brain/personalIntelligenceOperatingLoop.ts",
    "utf8",
  );

  assert.equal(
    personal.includes(
      "automaticWriteAllowed: false",
    ),
    true,
  );
  assert.equal(
    personal.includes(
      'status: "candidate"',
    ),
    true,
  );

  pass(
    "personal-intelligence memory-update proposals retain candidate/review boundaries",
  );

  const sessionAdapterMatch =
    adapters.includes(
      "...structuredClone(request.patch)",
    ) &&
    adapters.includes(
      "sessionId,",
    );

  assert.equal(
    sessionAdapterMatch,
    true,
  );

  pass(
    "session writes preserve canonical session identity while patching working state through saveSessionContext",
  );

  const memorySource = await readFile(
    "lib/chernobog/memory.ts",
    "utf8",
  );

  assert.equal(
    /SELECT\s+id\s+FROM\s+memories\s+WHERE\s+lower\(fact\)\s*=\s*lower\(\?\)\s+LIMIT\s+1/i.test(
      memorySource,
    ),
    true,
  );

  pass(
    "durable-fact writes retain the existing store's duplicate suppression",
  );

  const reader = await readFile(
    "lib/chernobog/memory-architecture/unifiedReader.ts",
    "utf8",
  );

  assert.equal(
    reader.includes("writeUnifiedMemory"),
    false,
  );

  pass(
    "unified reads and writes remain separate operations over the same registered authorities",
  );

  console.log(
    "========================================================",
  );
  console.log(
    "PASS Phase 11E-C Unified Write & Persistence Path acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
