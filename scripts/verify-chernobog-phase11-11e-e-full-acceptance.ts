import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  getUnifiedMemoryArchitectureStatus,
} from "../lib/chernobog/memory-architecture/status";
import {
  listUnifiedMemorySources,
} from "../lib/chernobog/memory-architecture/sourceRegistry";
import {
  listUnifiedMemoryWritePolicies,
} from "../lib/chernobog/memory-architecture/writePolicy";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11E-E - Unified Memory Diagnostics & Full Acceptance",
  );
  console.log(
    "===================================================================",
  );

  const status =
    getUnifiedMemoryArchitectureStatus({
      clock:
        () =>
          new Date(
            "2026-08-28T18:00:00.000Z",
          ),
    });

  assert.equal(
    status.status,
    "ready",
  );
  assert.equal(
    status.sourceCount,
    7,
  );
  assert.deepEqual(
    status.policyCounts,
    {
      direct: 4,
      "staged-raw": 1,
      "governed-only": 1,
      "domain-owned": 1,
    },
  );

  pass(
    "unified memory reports ready only when all seven source authorities and their canonical write policies are present",
  );

  const sourceIds =
    listUnifiedMemorySources()
      .map(
        (source) =>
          source.id,
      )
      .sort();

  const policyIds =
    listUnifiedMemoryWritePolicies()
      .map(
        (policy) =>
          policy.source,
      )
      .sort();

  assert.deepEqual(
    sourceIds,
    policyIds,
  );

  pass(
    "every registered memory source has exactly one unified write-policy classification",
  );

  assert.equal(
    status.retrieval
      .vaultApprovedOnly,
    true,
  );
  assert.equal(
    status.persistence
      .vaultWritesStageAsRaw,
    true,
  );
  assert.equal(
    status.persistence
      .learnedLessonsGenericWriteAllowed,
    false,
  );
  assert.equal(
    status.persistence
      .personalIntelligenceGenericWriteAllowed,
    false,
  );

  pass(
    "final memory status preserves approved-only Vault reads, raw-only Vault writes, governed lessons, and domain-owned personal intelligence",
  );

  assert.equal(
    status.context
      .legacyBuilderPreserved,
    true,
  );
  assert.equal(
    status.context
      .factualAndLearnedRetrievalSeparated,
    true,
  );
  assert.equal(
    status.context
      .learnedGuidanceAdvisory,
    true,
  );
  assert.equal(
    status.context
      .learnedGuidanceMaxItems,
    6,
  );

  pass(
    "final context contract preserves legacy context while keeping factual retrieval and bounded learned guidance semantically separate",
  );

  const readAdapters =
    await readFile(
      "lib/chernobog/memory-architecture/readAdapters.ts",
      "utf8",
    );

  assert.equal(
    /statuses:\s*\[\s*"approved"\s*,?\s*\]/m.test(
      readAdapters,
    ),
    true,
  );

  assert.equal(
    readAdapters.includes(
      "activeOnly: true",
    ),
    true,
  );

  pass(
    "real read adapters enforce approved Vault memory and active learned lessons",
  );

  const writeAdapters =
    await readFile(
      "lib/chernobog/memory-architecture/writeAdapters.ts",
      "utf8",
    );

  assert.equal(
    writeAdapters.includes(
      "createRawEntry",
    ),
    true,
  );

  assert.equal(
    writeAdapters.includes(
      "status: \"approved\"",
    ),
    false,
  );

  assert.equal(
    writeAdapters.includes(
      "ChernobogLearnedLessonStore",
    ),
    false,
  );

  pass(
    "real write adapters stage Vault memory as raw and contain no generic learned-lesson persistence path",
  );

  const writer =
    await readFile(
      "lib/chernobog/memory-architecture/unifiedWriter.ts",
      "utf8",
    );

  assert.equal(
    writer.includes(
      'policy.policy === "governed-only"',
    ),
    true,
  );
  assert.equal(
    writer.includes(
      'policy.policy === "domain-owned"',
    ),
    true,
  );

  pass(
    "unified writer rejects source classes whose existing domain governance must remain authoritative",
  );

  const context =
    await readFile(
      "lib/chernobog/memory-architecture/contextIntegration.ts",
      "utf8",
    );

  for (
    const required
    of [
      "buildMemoryContext",
      "readUnifiedMemory",
      "contextualRetrieval",
      "learnedRetrieval",
      "Math.min(",
      "Learned guidance",
      "not as a factual claim, permission, or execution authority",
      "input.session.sessionId",
    ]
  ) {
    assert.equal(
      context.includes(
        required,
      ),
      true,
      `Missing context integration invariant ${required}`,
    );
  }

  pass(
    "real context integration uses the canonical session identity, split retrieval paths, bounded lessons, and explicit advisory guidance",
  );

  for (
    const forbidden
    of [
      "executeTool(",
      "runExecutionTask(",
      "evaluateUnifiedGovernance(",
      "grantPermission(",
      "promoteLearningPattern(",
    ]
  ) {
    assert.equal(
      context.includes(
        forbidden,
      ),
      false,
    );
    assert.equal(
      writer.includes(
        forbidden,
      ),
      false,
    );
  }

  pass(
    "memory retrieval, context composition, and generic writes contain no tool, execution, governance-bypass, permission-grant, or lesson-promotion authority",
  );

  const sourceRegistry =
    await readFile(
      "lib/chernobog/memory-architecture/sourceRegistry.ts",
      "utf8",
    );

  for (
    const forbidden
    of [
      "saveMemory(",
      "saveMessage(",
      "saveSessionContext(",
      "createRawEntry(",
      "runExecutionTask(",
      "executeTool(",
    ]
  ) {
    assert.equal(
      sourceRegistry.includes(
        forbidden,
      ),
      false,
    );
  }

  pass(
    "source registry remains descriptive metadata rather than becoming a hidden persistence or execution layer",
  );

  const api =
    await readFile(
      "app/api/unified-memory/route.ts",
      "utf8",
    );

  assert.equal(
    api.includes(
      "export async function GET",
    ),
    true,
  );
  assert.equal(
    /\bPOST\b/.test(api),
    false,
  );
  assert.equal(
    /\bPUT\b/.test(api),
    false,
  );
  assert.equal(
    /\bDELETE\b/.test(api),
    false,
  );

  for (
    const boundary
    of [
      "exposesMemoryContents",
      "writesMemory",
      "deletesMemory",
      "promotesLessons",
      "approvesVaultMemory",
      "executesTasks",
      "executesTools",
      "changesPermissions",
    ]
  ) {
    assert.equal(
      api.includes(
        boundary,
      ),
      true,
    );
  }

  pass(
    "unified-memory diagnostics are read-only architecture metadata with no memory-content or mutation surface",
  );

  assert.equal(
    status.invariants.includes(
      "memory-cannot-bypass-governance-or-tool-execution",
    ),
    true,
  );

  pass(
    "final Unified Memory contract explicitly keeps memory below governance and tool execution authority",
  );

  console.log(
    "===================================================================",
  );
  console.log(
    "PASS Phase 11E-E Unified Memory Diagnostics & Full Acceptance",
  );
  console.log(
    "PASS Phase 11E Unified Memory COMPLETE",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
