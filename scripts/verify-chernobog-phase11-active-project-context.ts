import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildProjectGroundedSystemText,
  formatActiveProjectContext,
  resolveActiveProjectContext,
} from "../lib/chernobog/project/activeProjectContext";
import {
  clearSessionContext,
  getSessionContext,
  saveSessionContext,
} from "../lib/chernobog/session/store";
import {
  getProjectBySlug,
} from "../lib/modules/project-operations";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11 - Active Project Context Propagation Acceptance",
  );
  console.log(
    "==================================================================",
  );

  const sessionTypes = read(
    "lib/chernobog/session/types.ts",
  );
  const sessionStore = read(
    "lib/chernobog/session/store.ts",
  );
  const runCommand = read(
    "lib/chernobog/pipeline/runCommand.ts",
  );
  const helper = read(
    "lib/chernobog/project/activeProjectContext.ts",
  );

  assert.match(
    sessionTypes,
    /activeProjectId\?:\s*string\s*\|\s*null/,
  );
  assert.match(
    sessionStore,
    /activeProjectId:\s*null/,
  );
  pass(
    "SessionContext owns a persisted optional active project identity",
  );

  assert.match(
    runCommand,
    /resolveActiveProjectContext\(\{[\s\S]*?userMessage,[\s\S]*?sessionProjectId:\s*startingSession\.activeProjectId/,
  );
  assert.match(
    runCommand,
    /startingSession\.activeProjectId\s*=\s*activeProjectResolution\.projectId/,
  );
  pass(
    "pipeline resolves project identity before route-specific early returns",
  );

  assert.match(
    runCommand,
    /projectId:\s*activeSession\.activeProjectId\s*\?\?\s*undefined/,
  );
  pass(
    "live 11E unified memory retrieval receives the active project identity",
  );

  assert.match(
    runCommand,
    /sessionSummary:\s*buildProjectGroundedSystemText\([\s\S]*?budgetedResponseContext\.systemText,[\s\S]*?activeSession\.activeProjectId/,
  );
  pass(
    "model-facing session summary includes canonical active project runtime state",
  );

  assert.match(
    helper,
    /getProjectBySlug/,
  );
  assert.match(
    helper,
    /getAllProjects/,
  );
  assert.doesNotMatch(
    helper,
    /CREATE\s+TABLE|INSERT\s+INTO|UPDATE\s+project_operations_projects/i,
  );
  pass(
    "Project Operations remains the canonical project source with no parallel project store",
  );

  const chernobog = getProjectBySlug("chernobog");
  assert.ok(
    chernobog,
    "Canonical Chernobog Project Operations workspace is required",
  );

  const explicit = resolveActiveProjectContext({
    userMessage:
      "Assess only the current Chernobog project.",
    sessionProjectId: null,
  });

  assert.equal(
    explicit.projectId,
    "chernobog",
  );
  assert.equal(
    explicit.source,
    "explicit-message",
  );
  pass(
    "explicit Chernobog project language resolves to canonical slug chernobog",
  );

  const retained = resolveActiveProjectContext({
    userMessage:
      "What should we investigate next?",
    sessionProjectId: "chernobog",
  });

  assert.equal(
    retained.projectId,
    "chernobog",
  );
  assert.equal(
    retained.source,
    "session",
  );
  pass(
    "active project identity persists across ordinary follow-up turns",
  );

  const questLedger = getProjectBySlug("questledger");

  if (questLedger) {
    const switched = resolveActiveProjectContext({
      userMessage:
        "Switch to the QuestLedger project.",
      sessionProjectId: "chernobog",
    });

    assert.equal(
      switched.projectId,
      "questledger",
    );
    assert.equal(
      switched.source,
      "explicit-message",
    );
    pass(
      "an explicit project switch overrides stale session project context",
    );
  } else {
    console.log(
      "SKIP QuestLedger explicit switch check - workspace is not present",
    );
  }

  const unscoped = resolveActiveProjectContext({
    userMessage:
      "Explain dependency injection in TypeScript.",
    sessionProjectId: null,
  });

  assert.equal(
    unscoped.projectId,
    null,
  );
  pass(
    "unrelated generic requests do not acquire an arbitrary project scope",
  );

  const projectText =
    formatActiveProjectContext(chernobog);

  assert.match(
    projectText,
    /projectId:\s*chernobog/i,
  );
  assert.match(
    projectText,
    new RegExp(
      chernobog.repoName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ),
      "i",
    ),
  );

  if (questLedger) {
    assert.doesNotMatch(
      projectText,
      /QuestLedger/i,
    );
  }

  const combined =
    buildProjectGroundedSystemText(
      "MEMORY-CONTEXT",
      "chernobog",
    );

  assert.match(combined, /MEMORY-CONTEXT/);
  assert.match(combined, /projectId:\s*chernobog/i);
  pass(
    "canonical project state is appended without importing other project state",
  );

  const testSessionId =
    `phase11-project-context-${Date.now()}`;

  try {
    const fresh = getSessionContext(testSessionId);
    assert.equal(
      fresh.activeProjectId,
      null,
    );

    fresh.activeProjectId = "chernobog";
    saveSessionContext(fresh);

    const reloaded =
      getSessionContext(testSessionId);

    assert.equal(
      reloaded.activeProjectId,
      "chernobog",
    );
    pass(
      "active project identity persists through the existing session-state store",
    );
  } finally {
    clearSessionContext(testSessionId);
  }

  console.log(
    "==================================================================",
  );
  console.log(
    "PASS Phase 11 Active Project Context Propagation Acceptance",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
