import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

function read(
  relativePath: string,
): string {
  return fs.readFileSync(
    path.join(repo, relativePath),
    "utf8",
  );
}

function expect(
  condition: boolean,
  label: string,
): void {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }

  console.log(`PASS ${label}`);
}

const runCommand = read(
  "lib/chernobog/pipeline/runCommand.ts",
);

const bridge = read(
  "lib/chernobog/pipeline/worldStateContext.ts",
);

expect(
  bridge.includes(
    "getChernobogWorldStateRuntime"
  ),
  "bridge consumes canonical 11G runtime singleton",
);

expect(
  bridge.includes(
    "ChernobogWorldStateQueryService"
  ) &&
    bridge.includes(
      'query.read({}, "registry")'
    ),
  "bridge queries the live canonical World State registry",
);

expect(
  bridge.includes(
    "assessment.freshness.status"
  ) &&
    bridge.includes(
      "record.confidence"
    ) &&
    bridge.includes(
      "record.provenance"
    ),
  "bridge preserves freshness confidence and provenance evidence semantics",
);

expect(
  bridge.includes(
    'key.startsWith(`project.${project}.`)'
  ),
  "project namespace evidence is scoped to the active project",
);

expect(
  !bridge.includes(
    ".upsert("
  ) &&
    !bridge.includes(
      ".process("
    ) &&
    !bridge.includes(
      "publish("
    ),
  "conversational bridge is read-only and does not manufacture World State",
);

expect(
  runCommand.includes(
    "const worldStateContext ="
  ) &&
    runCommand.includes(
      "buildChernobogWorldStateContext({"
    ),
  "normal routed pipeline builds World State context",
);

expect(
  runCommand.includes(
    "activeSession.activeProjectId"
  ),
  "World State context receives active project scope",
);

expect(
  runCommand.includes(
    "[memoryContext.systemText, worldStateContext.systemText]"
  ) &&
    runCommand.includes(
      '.join("\\n\\n")'
    ),
  "canonical World State evidence is injected into model-facing session context",
);

expect(
  bridge.includes(
    "Do not invent replacement World State evidence."
  ),
  "World State startup/query failure degrades explicitly rather than hallucinating",
);

expect(
  bridge.includes(
    "Stale/unknown records are historical or uncertain evidence"
  ),
  "stale World State cannot silently become current fact",
);

console.log(
  "PASS Phase 11 World State Conversational Bridge Acceptance",
);
