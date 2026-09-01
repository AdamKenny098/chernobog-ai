import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

const runCommandPath = path.join(
  process.cwd(),
  "lib",
  "chernobog",
  "pipeline",
  "runCommand.ts",
);

const source =
  fs.readFileSync(
    runCommandPath,
    "utf8",
  );

assert.match(
  source,
  /const historyRecentMessages\s*=\s*excludeCurrentUserMessageFromHistory\(\s*recentMessages,\s*userMessage,\s*\);/,
);
pass("current user directive is removed from prior conversation history");

assert.match(
  source,
  /const modelRecentMessages\s*=[\s\S]*?historyRecentMessages/,
);
pass("clean prior conversation remains available as structured model history");

assert.match(
  source,
  /buildUnifiedMemoryContext\(\{[\s\S]*?recentMessages:\s*\[\]/,
);
pass("unified memory packet no longer copies the raw conversation transcript");

assert.match(
  source,
  /respondForRoute\(route,\s*userMessage,\s*\{[\s\S]*?recentMessages:\s*modelRecentMessages/,
);
pass("raw cleaned history remains the single conversation-continuity source");

assert.match(
  source,
  /persistedMemories:\s*storedMemories,[\s\S]*?recentMessages:\s*\[\],[\s\S]*?userMessage,[\s\S]*?projectId:/,
);
pass("memory retrieval still receives persisted memory, current query and project scope");

assert.match(
  source,
  /memorySystemText:\s*memoryContext\.systemText/,
);
pass("working and retrieved memory still flow into the context budget");

assert.match(
  source,
  /"Working\/retrieved memory context built for routed response"/,
);
pass("trust trace describes the new memory role truthfully");

const contextBuilderPath = path.join(
  process.cwd(),
  "lib",
  "chernobog",
  "memory-architecture",
  "contextBuilder.ts",
);

const contextBuilder =
  fs.readFileSync(
    contextBuilderPath,
    "utf8",
  );

assert.match(
  contextBuilder,
  /formatRecentMessages\(input\.recentMessages\)/,
);
pass("general memory architecture still supports short-term history outside this routed-response path");

console.log("");
console.log(
  "PASS Phase 11 Integration D - Conversation Continuity",
);