import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "lib",
    "chernobog",
    "pipeline",
    "runCommand.ts"
  ),
  "utf8"
);

function expect(
  condition: boolean,
  label: string
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

expect(
  source.includes(
    "function shouldUseAuthoritativeAssessmentContext("
  ),
  "authoritative assessment classifier exists"
);

expect(
  source.includes(
    "asksForAssessment"
  ) &&
    source.includes(
      "asksForCurrentAuthority"
    ),
  "assessment classifier requires current-authority intent"
);

expect(
  source.includes(
    "const modelRecentMessages ="
  ) &&
    source.includes(
      'message.role !== "assistant"'
    ),
  "authoritative assessment projection removes prior assistant replies"
);

expect(
  /buildUnifiedMemoryContext\(\{[\s\S]*?recentMessages:\s*modelRecentMessages/.test(
    source
  ),
  "unified short-term memory uses filtered assessment history"
);

expect(
  /respondForRoute\(route,\s*userMessage,\s*\{[\s\S]*?recentMessages:\s*modelRecentMessages/.test(
    source
  ),
  "response router uses filtered assessment history"
);

expect(
  source.includes(
    "const recentMessages = getRecentMessages(sessionId, 8);"
  ),
  "complete session history is still read"
);

expect(
  !source.includes(
    "deleteMessage"
  ),
  "conversation history is not deleted"
);

console.log(
  "PASS Phase 11 Authoritative Assessment Context v3.1 Acceptance"
);
