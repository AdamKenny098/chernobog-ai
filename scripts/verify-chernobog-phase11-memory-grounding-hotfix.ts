import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildUnifiedMemoryContext,
  readUnifiedMemory,
} from "../lib/chernobog/memory-architecture";

async function main(): Promise<void> {
  console.log("Chernobog Phase 11 - Memory Grounding Hotfix Acceptance");
  console.log("=======================================================");

  const runCommand = await readFile("lib/chernobog/pipeline/runCommand.ts", "utf8");
  assert.equal(runCommand.includes("buildUnifiedMemoryContext"), true);
  assert.equal(/const\s+memoryContext\s*=\s*buildMemoryContext\s*\(/.test(runCommand), false);
  assert.equal(/const\s+memoryContext\s*=\s*await\s+buildUnifiedMemoryContext\s*\(/.test(runCommand), true);
  console.log("PASS live routed-response path uses unified 11E memory context");

  const contextSource = await readFile("lib/chernobog/memory-architecture/contextIntegration.ts", "utf8");
  assert.equal(contextSource.includes("legacyCoreSystemText"), true);
  assert.equal(/^\s*legacy\.systemText,\s*$/m.test(contextSource), false);
  console.log("PASS unified model context no longer injects legacy persisted-memory systemText");

  const context = await buildUnifiedMemoryContext(
    {
      session: {
        sessionId: "memory-grounding-test",
        lastUpdatedAt: new Date(0).toISOString(),
        workflow: { kind: "none" },
      } as never,
      persistedMemories: [
        "Polar Night is my survival game project",
        "my website is 098Forge.com",
        "I prefer compact technical answers",
      ],
      recentMessages: [],
      userMessage: "Assess the current Chernobog project only",
      retrievalLimit: 8,
      sources: ["durable-facts"],
    },
    {
      "durable-facts": async () => [
        {
          id: "chernobog-global",
          source: "durable-facts",
          layer: "long_term",
          scope: "user",
          content: "Chernobog is my personal AI assistant project",
        },
      ],
    } as never,
  );

  assert.equal(context.systemText.includes("Polar Night"), false);
  assert.equal(context.systemText.includes("098Forge.com"), false);
  assert.equal(context.systemText.includes("Chernobog is my personal AI assistant project"), true);
  console.log("PASS unrelated legacy project facts cannot contaminate unified model-facing context");

  const scoped = await readUnifiedMemory(
    {
      text: "Chernobog project",
      projectId: "chernobog",
      sessionId: "session-a",
      sources: ["durable-facts"],
      limit: 20,
    },
    {
      "durable-facts": async () => [
        {
          id: "global-preference",
          source: "durable-facts",
          layer: "long_term",
          scope: "user",
          content: "Chernobog responses should be compact and technical",
        },
        {
          id: "matching-project",
          source: "durable-facts",
          layer: "long_term",
          scope: "project",
          projectId: "chernobog",
          content: "Chernobog project architecture fact",
        },
        {
          id: "other-project",
          source: "durable-facts",
          layer: "long_term",
          scope: "project",
          projectId: "polar-night",
          content: "Chernobog project phrase inside another project record",
        },
        {
          id: "untagged-project",
          source: "durable-facts",
          layer: "long_term",
          scope: "project",
          content: "Chernobog project phrase but missing project identity",
        },
        {
          id: "other-session",
          source: "durable-facts",
          layer: "working",
          scope: "session",
          sessionId: "session-b",
          content: "Chernobog project temporary state",
        },
      ],
    } as never,
  );

  const ids = new Set(scoped.records.map((record) => record.id));
  assert.equal(ids.has("global-preference"), true);
  assert.equal(ids.has("matching-project"), true);
  assert.equal(ids.has("other-project"), false);
  assert.equal(ids.has("untagged-project"), false);
  assert.equal(ids.has("other-session"), false);
  console.log("PASS scope enforcement excludes foreign/unidentified scoped memories while retaining global user memory");

  console.log("=======================================================");
  console.log("PASS Phase 11 Memory Grounding Hotfix Acceptance");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});