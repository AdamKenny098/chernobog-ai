import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "lib/chernobog/router.ts",
  ),
  "utf8",
);

function expect(
  condition: unknown,
  label: string,
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

expect(
  source.includes(
    "function extractCriticalWorldModelReinforcement(",
  ),
  "router has critical World Model reinforcement extractor",
);

expect(
  source.includes(
    "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
  ) &&
    source.includes(
      "World Model entities (current evidence first; historical tail explicitly labelled):",
    ),
  "reinforcement extracts critical backbone without duplicating verbose entity evidence",
);

expect(
  source.includes(
    "FINAL AUTHORITATIVE WORLD MODEL EVIDENCE:",
  ) &&
    source.includes(
      "FINAL WORLD MODEL ANSWER CONTRACT:",
    ),
  "reinforcement carries an explicit final authority contract",
);

expect(
  source.includes(
    "has-state and has-role are not dependency edges.",
  ),
  "answer contract prevents state/role relationships from masquerading as dependencies",
);

expect(
  source.includes(
    "If model:ollama has listed direct or transitive dependents, do not say that no Ollama dependency path exists.",
  ),
  "answer contract binds Ollama consequence claims to canonical impact evidence",
);

expect(
  source.includes(
    "if SUPPORTED_PREDICTION_STATUS=none, answer exactly: No supported predictions.",
  ),
  "answer contract makes zero-supported-prediction response deterministic",
);

expect(
  source.includes(
    "if RELATIONAL_STATUS=substantive, do not emit any conclusion that the World Model lacks substantive relational evidence.",
  ),
  "answer contract forbids contradictory no-relational-evidence conclusion",
);

const recentMessagesIndex =
  source.indexOf(
    "messages.push(...context.recentMessages);",
  );

const reinforcementIndex =
  source.indexOf(
    "const worldModelReinforcement =",
  );

const finalUserIndex =
  source.indexOf(
    'role: "user",\n    content: userMessage,',
    reinforcementIndex,
  );

expect(
  recentMessagesIndex >= 0 &&
    reinforcementIndex > recentMessagesIndex,
  "World Model reinforcement is placed after recent conversation history",
);

expect(
  finalUserIndex > reinforcementIndex,
  "World Model reinforcement is placed before the current user message",
);

expect(
  source.includes(
    "content: `Active short-term session context:\\n${context.sessionSummary}`",
  ),
  "existing full sessionSummary injection remains intact",
);

console.log(
  "PASS Phase 11 World Model Final Authority Reinforcement v1",
);
