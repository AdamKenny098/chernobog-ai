import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  excludeCurrentUserMessageFromHistory,
} from "../lib/chernobog/pipeline/contextSelection";

const repo = process.cwd();

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

const currentMessage = "What are we currently working on in Chernobog?";

const history = [
  {
    role: "user" as const,
    content: "Earlier question",
  },
  {
    role: "assistant" as const,
    content: "Earlier answer",
  },
  {
    role: "user" as const,
    content: currentMessage,
  },
];

const stripped =
  excludeCurrentUserMessageFromHistory(
    history,
    currentMessage,
  );

assert.equal(stripped.length, 2);
assert.equal(
  stripped.some(
    (message) =>
      message.role === "user" &&
      message.content === currentMessage,
  ),
  false,
);
pass("matching trailing current user directive is removed from history");

const repeatedEarlier = [
  {
    role: "user" as const,
    content: currentMessage,
  },
  {
    role: "assistant" as const,
    content: "Previous answer",
  },
  {
    role: "user" as const,
    content: currentMessage,
  },
];

const repeatedResult =
  excludeCurrentUserMessageFromHistory(
    repeatedEarlier,
    currentMessage,
  );

assert.deepEqual(
  repeatedResult,
  repeatedEarlier.slice(0, -1),
);
assert.equal(
  repeatedResult[0]?.content,
  currentMessage,
);
pass("an older intentionally repeated user message remains in history");

const assistantTail = [
  {
    role: "user" as const,
    content: currentMessage,
  },
  {
    role: "assistant" as const,
    content: "Already answered",
  },
];

assert.deepEqual(
  excludeCurrentUserMessageFromHistory(
    assistantTail,
    currentMessage,
  ),
  assistantTail,
);
pass("assistant-tailed history is not altered");

const differentTail = [
  {
    role: "user" as const,
    content: "Different question",
  },
];

assert.deepEqual(
  excludeCurrentUserMessageFromHistory(
    differentTail,
    currentMessage,
  ),
  differentTail,
);
pass("different trailing user message is not altered");

const runCommandPath = path.join(
  repo,
  "lib",
  "chernobog",
  "pipeline",
  "runCommand.ts",
);

const runCommand = fs.readFileSync(
  runCommandPath,
  "utf8",
);

assert.match(
  runCommand,
  /const historyRecentMessages\s*=\s*excludeCurrentUserMessageFromHistory\(\s*recentMessages,\s*userMessage,\s*\);/,
);
pass("runCommand removes current directive before model history is built");

assert.match(
  runCommand,
  /authoritativeAssessment\s*\?\s*historyRecentMessages\.filter/,
);
assert.match(
  runCommand,
  /:\s*historyRecentMessages;/,
);
pass("authoritative-assessment filtering operates on cleaned history");

assert.match(
  runCommand,
  /buildUnifiedMemoryContext\(\{[\s\S]*?recentMessages:\s*modelRecentMessages/,
);
pass("unified memory receives cleaned model history");

assert.match(
  runCommand,
  /respondForRoute\(route,\s*userMessage,\s*\{[\s\S]*?recentMessages:\s*modelRecentMessages/,
);
pass("routed response receives cleaned model history");

console.log("");
console.log(
  "PASS Phase 11 Integration A â€” current-message deduplication",
);