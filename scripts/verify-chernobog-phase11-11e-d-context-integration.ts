import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  buildUnifiedMemoryContext,
} from "../lib/chernobog/memory-architecture/contextIntegration";
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
  value: UnifiedMemoryRecord,
): UnifiedMemoryRecord {
  return structuredClone(value);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11E-D - Memory + Learning Context Integration",
  );
  console.log(
    "=============================================================",
  );

  const readers:
    UnifiedMemoryReaderMap = {
      "vault-structured-memory":
        () => [
          record({
            id:
              "vault:approved-1",
            source:
              "vault-structured-memory",
            layer:
              "long_term",
            scope:
              "project",
            projectId:
              "chernobog",
            content:
              "Phase 11 uses a verifier-driven architecture.",
            confidence:
              0.95,
            metadata: {
              status:
                "approved",
            },
          }),
        ],

      "project-memory-profile":
        () => [
          record({
            id:
              "project:chernobog",
            source:
              "project-memory-profile",
            layer:
              "long_term",
            scope:
              "project",
            projectId:
              "chernobog",
            content:
              "Chernobog is the active development project.",
          }),
        ],

      "learned-lessons":
        () => [
          record({
            id:
              "lesson:patch-style",
            source:
              "learned-lessons",
            layer:
              "learned",
            scope:
              "system",
            content:
              "Prefer verifier-backed patch delivery.",
            confidence:
              0.9,
          }),
        ],
    };

  const context =
    await buildUnifiedMemoryContext(
      {
        session: {
          sessionId:
            "test-session",
          lastUpdatedAt:
            "2026-08-28T16:00:00.000Z",
          lastRoute:
            "planner",
          lastTool:
            null,
          activePlan:
            null,
          pendingDisambiguation:
            null,
          fileContext:
            null,
          workflow: {
            kind: "none",
          },
        },
        recentMessages: [
          {
            role: "user",
            content:
              "Continue Phase 11 memory integration.",
          },
        ],
        persistedMemories: [
          "The user prefers direct downloadable patches.",
        ],
        userMessage:
          "Continue Phase 11 memory integration.",
        projectId:
          "chernobog",
        retrievalLimit:
          8,
      },
      readers,
    );

  assert.equal(
    context.shortTerm.lines.some(
      (line) =>
        line.includes(
          "Continue Phase 11 memory integration.",
        ),
    ),
    true,
  );

  assert.equal(
    context.working.layer,
    "working",
  );

  assert.equal(
    context.longTerm.lines.includes(
      "The user prefers direct downloadable patches.",
    ),
    true,
  );

  pass(
    "existing short-term, working, and persisted long-term context remain intact",
  );

  assert.equal(
    context.longTerm.lines.some(
      (line) =>
        line.includes(
          "Phase 11 uses a verifier-driven architecture.",
        ),
    ),
    true,
  );

  assert.equal(
    context.longTerm.lines.some(
      (line) =>
        line.includes(
          "Chernobog is the active development project.",
        ),
    ),
    true,
  );

  pass(
    "approved Vault and project memory supplement the existing long-term context block",
  );

  assert.equal(
    context.learned.layer,
    "learned",
  );

  assert.equal(
    context.learned.lines.some(
      (line) =>
        line.includes(
          "Prefer verifier-backed patch delivery.",
        ),
    ),
    true,
  );

  assert.equal(
    context.longTerm.lines.some(
      (line) =>
        line.includes(
          "Prefer verifier-backed patch delivery.",
        ),
    ),
    false,
  );

  pass(
    "active learned lessons enter a separate advisory guidance block rather than being promoted into factual long-term memory",
  );

  assert.equal(
    context.retrieval.records.some(
      (item) =>
        item.source ===
          "learned-lessons" &&
        item.content.includes(
          "Prefer verifier-backed patch delivery.",
        ),
    ),
    true,
  );

  pass(
    "active learned guidance is retrieved independently of lexical competition with factual memory",
  );

  assert.equal(
    context.systemText.includes(
      "Treat learned guidance as advisory behavior guidance, not as a factual claim, permission, or execution authority.",
    ),
    true,
  );

  assert.equal(
    context.systemText.includes(
      "Current user instructions, current observations, governance, and explicit runtime state override learned guidance.",
    ),
    true,
  );

  pass(
    "context instructions explicitly subordinate learned guidance to current user direction, observation, and governance",
  );

  assert.deepEqual(
    context.retrieval.sourcesQueried,
    [
      "learned-lessons",
      "project-memory-profile",
      "vault-structured-memory",
    ],
  );

  pass(
    "default context retrieval avoids duplicating conversation, session, and durable-fact sources already supplied to the legacy builder",
  );

  const degraded =
    await buildUnifiedMemoryContext(
      {
        session: {
          sessionId:
            "degraded-session",
          lastUpdatedAt:
            "2026-08-28T16:00:00.000Z",
          lastTool:
            null,
          activePlan:
            null,
          pendingDisambiguation:
            null,
          fileContext:
            null,
          workflow: {
            kind: "none",
          },
        },
        recentMessages: [],
        persistedMemories: [
          "Legacy durable memory remains available.",
        ],
        userMessage:
          "test",
      },
      {
        "vault-structured-memory":
          () => {
            throw new Error(
              "vault unavailable",
            );
          },
        "project-memory-profile":
          () => [],
        "learned-lessons":
          () => [],
      },
    );

  assert.equal(
    degraded.longTerm.lines.includes(
      "Legacy durable memory remains available.",
    ),
    true,
  );

  assert.equal(
    degraded.retrieval.sourceErrors.length,
    1,
  );

  assert.equal(
    degraded.systemText.includes(
      "Memory retrieval warnings",
    ),
    true,
  );

  pass(
    "supplemental retrieval failure degrades locally and never destroys legacy memory context",
  );

  const source =
    await readFile(
      "lib/chernobog/memory-architecture/contextIntegration.ts",
      "utf8",
    );

  assert.equal(
    source.includes(
      "input.session.sessionId",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "contextualRetrieval",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "learnedRetrieval",
    ),
    true,
  );

  assert.equal(
    source.includes(
      'source !==\n        "learned-lessons"',
    ),
    true,
  );

  assert.equal(
    source.includes(
      "input.session.id",
    ),
    false,
  );

  pass(
    "unified retrieval uses the canonical SessionContext sessionId field",
  );

  assert.equal(
    source.includes(
      "buildMemoryContext",
    ),
    true,
  );

  assert.equal(
    source.includes(
      "readUnifiedMemory",
    ),
    true,
  );

  for (
    const forbidden
    of [
      "writeUnifiedMemory(",
      "saveMemory(",
      "saveMessage(",
      "runExecutionTask(",
      "executeTool(",
      "promoteLearningPattern(",
    ]
  ) {
    assert.equal(
      source.includes(
        forbidden,
      ),
      false,
    );
  }

  pass(
    "context integration composes existing builders and unified reads without adding write, promotion, governance, or execution authority",
  );

  const legacyBuilder =
    await readFile(
      "lib/chernobog/memory-architecture/contextBuilder.ts",
      "utf8",
    );

  assert.equal(
    legacyBuilder.includes(
      "export function buildMemoryContext",
    ),
    true,
  );

  pass(
    "legacy synchronous context builder remains available for existing callers during convergence",
  );

  const learningRuntime =
    await readFile(
      "lib/chernobog/learning/learningRuntime.ts",
      "utf8",
    );

  assert.equal(
    learningRuntime.includes(
      "activeLessonGuidance",
    ),
    true,
  );

  assert.equal(
    learningRuntime.includes(
      "activeOnly: true",
    ),
    true,
  );

  pass(
    "11I continues to own lesson activation and bounded cognitive guidance while unified memory only consumes active lessons",
  );

  console.log(
    "=============================================================",
  );
  console.log(
    "PASS Phase 11E-D Memory + Learning Context Integration acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
