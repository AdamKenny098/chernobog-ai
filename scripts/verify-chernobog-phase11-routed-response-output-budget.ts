import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "lib",
    "chernobog",
    "router.ts"
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
    "const ROUTED_RESPONSE_NUM_PREDICT = 2048;"
  ),
  "routed response budget is explicitly 2048 predicted tokens"
);

expect(
  /options:\s*\{[\s\S]*?numPredict\?:\s*number;/.test(
    source
  ),
  "router callOllama options accept numPredict"
);

expect(
  /numPredict:\s*options\.numPredict/.test(
    source
  ),
  "router forwards numPredict to shared Ollama client"
);

expect(
  /role:\s*roleForRoute\(route\),\s*numPredict:\s*ROUTED_RESPONSE_NUM_PREDICT/.test(
    source
  ),
  "normal routed user response requests the larger output budget"
);

expect(
  !source.includes(
    "numPredict: ROUTED_RESPONSE_NUM_PREDICT,\n    temperature: 0"
  ),
  "larger output budget is not mechanically attached to compact temperature-zero classifiers"
);

console.log(
  "PASS Phase 11 Routed Response Output Budget Acceptance"
);
