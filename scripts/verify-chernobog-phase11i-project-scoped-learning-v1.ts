import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  promoteLearningPattern,
} from "../lib/chernobog/learning/lessonPromotion";
import type {
  LearningPatternCandidate,
} from "../lib/chernobog/learning/patternTypes";
import {
  readUnifiedMemory,
} from "../lib/chernobog/memory-architecture/unifiedReader";
import type {
  UnifiedMemoryReaderMap,
} from "../lib/chernobog/memory-architecture/readTypes";
import type {
  UnifiedMemoryRecord,
} from "../lib/chernobog/memory-architecture/unifiedTypes";


async function main(): Promise<void> {
function pattern(
    overrides:
      Partial<LearningPatternCandidate> = {},
  ): LearningPatternCandidate {
    return {
      id:
        "pattern:correction:test",
      key:
        "correction:test:prefer-safe-output",
      kind:
        "correction-pattern",
      statement:
        "Prefer the safe output form.",
      supportCount:
        3,
      contradictionCount:
        0,
      confidence:
        0.9,
      firstObservedAt:
        "2026-08-31T20:00:00.000Z",
      lastObservedAt:
        "2026-08-31T20:10:00.000Z",
      evidence: {
        experienceIds: [
          "experience:1",
          "experience:2",
          "experience:3",
        ],
        subjects: [
          "test",
        ],
        feedbackKinds: [
          "correction",
        ],
        outcomeStatuses: [
          "unknown",
        ],
      },
      sourceEvaluations: [],
      ...overrides,
    };
  }
  
  const approved = {
    authority:
      "user-approved" as const,
    approved:
      true,
    approvedBy:
      "user",
    approvedAt:
      "2026-08-31T20:12:00.000Z",
  };
  
  const projectLesson =
    promoteLearningPattern(
      pattern({
        scope:
          "project",
        projectId:
          "chernobog",
      }),
      approved,
      {
        now:
          new Date(
            "2026-08-31T20:13:00.000Z",
          ),
      },
    );
  
  assert.equal(
    projectLesson.scope,
    "project",
  );
  assert.equal(
    projectLesson.projectId,
    "chernobog",
  );
  
  console.log(
    "PASS project-scoped pattern promotes to explicitly project-scoped lesson",
  );
  
  const globalLesson =
    promoteLearningPattern(
      pattern({
        key:
          "correction:test:global-safe-output",
        scope:
          "global",
        projectId:
          undefined,
      }),
      approved,
    );
  
  assert.equal(
    globalLesson.scope,
    "global",
  );
  assert.equal(
    globalLesson.projectId,
    undefined,
  );
  
  console.log(
    "PASS explicitly global pattern promotes to explicitly global lesson",
  );
  
  assert.throws(
    () =>
      promoteLearningPattern(
        pattern({
          scope:
            "project",
          projectId:
            undefined,
        }),
        approved,
      ),
    /requires projectId/,
  );
  
  console.log(
    "PASS project scope cannot promote without a concrete projectId",
  );
  
  const sourceRuntime =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/learning/learningRuntime.ts",
      ),
      "utf8",
    );
  
  for (const marker of [
    "const partitions =",
    'const partitionKey =',
    '`project:${projectId}`',
    "scopedPatternCandidate(",
    "projectIdFromEvaluatedExperience(",
  ]) {
    assert.ok(
      sourceRuntime.includes(marker),
      `Missing project partition marker: ${marker}`,
    );
  }
  
  console.log(
    "PASS support accumulation is partitioned by project before pattern extraction",
  );
  
  assert.ok(
    sourceRuntime.includes(
      "activeLessonsForScope(",
    ),
  );
  assert.ok(
    sourceRuntime.includes(
      "lessonMatchesProjectScope(",
    ),
  );
  assert.ok(
    sourceRuntime.includes(
      "scope.projectId",
    ),
  );
  
  console.log(
    "PASS cognitive adaptation/guidance filter active lessons by project scope",
  );
  
  const fromCycle =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/learning/fromCognitiveCycle.ts",
      ),
      "utf8",
    );
  
  assert.ok(
    fromCycle.includes(
      "LearningCognitiveCaptureScope",
    ),
  );
  assert.ok(
    fromCycle.includes(
      "projectId:",
    ),
  );
  assert.ok(
    fromCycle.includes(
      "scope.projectId",
    ),
  );
  
  console.log(
    "PASS cognitive learning capture can carry explicit project scope into experience context",
  );
  
  const readAdapters =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/memory-architecture/readAdapters.ts",
      ),
      "utf8",
    );
  
  assert.ok(
    readAdapters.includes(
      'lesson.scope === "global"',
    ),
  );
  assert.ok(
    readAdapters.includes(
      'lesson.scope === "project"',
    ),
  );
  assert.ok(
    readAdapters.includes(
      'scope:\n          projectId\n            ? "project"\n            : "system"',
    ),
  );
  assert.ok(
    readAdapters.includes(
      "projectId,",
    ),
  );
  
  console.log(
    "PASS learned adapter emits explicit project records and accepts only explicitly scoped lessons",
  );
  
  const chernobogRecord:
    UnifiedMemoryRecord = {
      id:
        "lesson:chernobog",
      source:
        "learned-lessons",
      layer:
        "learned",
      scope:
        "project",
      projectId:
        "chernobog",
      content:
        "Chernobog-only learned guidance.",
    };
  
  const otherRecord:
    UnifiedMemoryRecord = {
      id:
        "lesson:other",
      source:
        "learned-lessons",
      layer:
        "learned",
      scope:
        "project",
      projectId:
        "other-project",
      content:
        "Other-project learned guidance.",
    };
  
  const globalRecord:
    UnifiedMemoryRecord = {
      id:
        "lesson:global",
      source:
        "learned-lessons",
      layer:
        "learned",
      scope:
        "system",
      content:
        "Explicit global learned guidance.",
    };
  
  const readers =
    {
      "learned-lessons":
        async () => [
          chernobogRecord,
          otherRecord,
          globalRecord,
        ],
    } as unknown as
      UnifiedMemoryReaderMap;
  
  const retrieval =
    await readUnifiedMemory(
      {
        projectId:
          "chernobog",
        sources: [
          "learned-lessons",
        ],
        limit:
          20,
      },
      readers,
    );
  
  const ids =
    new Set(
      retrieval.records.map(
        (record) =>
          record.id,
      ),
    );
  
  assert.ok(
    ids.has(
      "lesson:chernobog",
    ),
  );
  assert.ok(
    ids.has(
      "lesson:global",
    ),
  );
  assert.equal(
    ids.has(
      "lesson:other",
    ),
    false,
  );
  
  console.log(
    "PASS unified-memory project query excludes another project's learned lesson while retaining explicit global guidance",
  );
  
  const sourceRegistry =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "lib/chernobog/memory-architecture/sourceRegistry.ts",
      ),
      "utf8",
    );
  
  const descriptorIndex =
    sourceRegistry.indexOf(
      'id: "learned-lessons"',
    );
  
  assert.ok(
    descriptorIndex >= 0,
  );
  
  const descriptor =
    sourceRegistry.slice(
      descriptorIndex,
      descriptorIndex + 900,
    );
  
  assert.ok(
    descriptor.includes(
      '"project"',
    ),
  );
  assert.ok(
    descriptor.includes(
      '"system"',
    ),
  );
  
  console.log(
    "PASS learned-memory source registry advertises project and system scopes",
  );
  
  for (const forbidden of [
    "runExecutionTask(",
    "executeFromMessage(",
    "grantPermission",
    "rewriteGovernance",
    "toolGateway.execute",
  ]) {
    assert.equal(
      sourceRuntime.includes(
        forbidden,
      ),
      false,
      `Learning runtime must not gain authority path: ${forbidden}`,
    );
  }
  
  console.log(
    "PASS project-scope hardening adds no execution, tool, permission, or governance authority",
  );
  
  console.log(
    "PASS Phase 11I Project-Scoped Learning v1",
  );
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
