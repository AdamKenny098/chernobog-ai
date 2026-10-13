import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  generateWithModel,
  modelGateway,
} from "@chernobog/models/gateway";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

console.log(
  "Chernobog OH-4B â€” Unified LLM Gateway Acceptance",
);
console.log(
  "================================================",
);

assert.equal(
  typeof generateWithModel,
  "function",
);
pass(
  "@chernobog/models exposes provider-neutral generateWithModel",
);

assert.equal(
  typeof modelGateway,
  "object",
);
assert.equal(
  typeof modelGateway.execute,
  "function",
);
pass(
  "@chernobog/models exposes the shared ModelGateway contract",
);

const gatewaySource =
  readFileSync(
    resolve(
      process.cwd(),
      "packages/models/src/gateway.ts",
    ),
    "utf8",
  );

assert.match(
  gatewaySource,
  /Provider-neutral public generation entry point/,
);
assert.match(
  gatewaySource,
  /return generateWithReliableOllama\(options\)/,
);
assert.match(
  gatewaySource,
  /typeof generateWithReliableOllama/,
);
pass(
  "reliable Ollama execution is hidden behind the provider-neutral gateway",
);

const routerSource =
  readFileSync(
    resolve(
      process.cwd(),
      "lib/chernobog/router.ts",
    ),
    "utf8",
  );

assert.match(
  routerSource,
  /generateWithModel as generateWithOllama/,
);

assert.match(
  routerSource,
  /from "@chernobog\/models\/gateway"/,
);

assert.doesNotMatch(
  routerSource,
  /from "@chernobog\/models\/reliableOllama"/,
);

pass(
  "central Chernobog router now crosses the unified model gateway boundary",
);

assert.match(
  routerSource,
  /OllamaChatMessage/,
);
assert.match(
  routerSource,
  /ModelRole/,
);
pass(
  "existing router call-site and shared model types remain intact",
);

console.log("");
console.log(
  "OH-4B unified LLM gateway acceptance complete.",
);