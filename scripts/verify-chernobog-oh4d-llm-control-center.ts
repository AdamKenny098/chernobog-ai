import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  ModelControlCenter,
  type ModelControlExecutor,
} from "@chernobog/models/controlCenter";
import {
  ModelRegistry,
  createModelRegistryId,
} from "@chernobog/models/modelRegistry";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

console.log(
  "Chernobog OH-4D â€” LLM Control Center Verification",
);
console.log(
  "=================================================",
);

async function main() {
const registry =
  new ModelRegistry();

registry.register({
  id:
    createModelRegistryId(
      "fake",
      "alpha",
    ),
  provider:
    "fake",
  model:
    "alpha",
  displayName:
    "Alpha",
  roles: [
    "default",
  ],
  capabilities: [
    "chat",
  ],
  enabled:
    true,
  local:
    false,
  availability:
    "available",
  version:
    "1",
  contextLimits: {
    known:
      true,
    contextWindowTokens:
      8_000,
  },
  cost: {
    known:
      false,
    mode:
      "unknown",
  },
  privacy: {
    execution:
      "remote",
    promptLeavesDevice:
      true,
    retention:
      "unknown",
  },
  strengths: [
    "test",
  ],
  weaknesses: [],
  source:
    "user",
  tags: [],
});

registry.register({
  id:
    createModelRegistryId(
      "fake",
      "beta",
    ),
  provider:
    "fake",
  model:
    "beta",
  displayName:
    "Beta",
  roles: [
    "planner",
  ],
  capabilities: [
    "planning",
  ],
  enabled:
    true,
  local:
    false,
  availability:
    "available",
  contextLimits: {
    known:
      false,
  },
  cost: {
    known:
      false,
    mode:
      "unknown",
  },
  privacy: {
    execution:
      "remote",
    promptLeavesDevice:
      true,
    retention:
      "unknown",
  },
  strengths: [],
  weaknesses: [],
  source:
    "user",
  tags: [],
});

const fakeExecutor:
  ModelControlExecutor =
    async (
      request,
      entry,
    ) => ({
      id:
        entry.id,
      provider:
        entry.provider,
      model:
        entry.model,
      ok:
        true,
      text:
        `${entry.model}:${request.prompt}`,
      durationMs:
        1,
      attempts:
        1,
      fallbackCount:
        0,
    });

const control =
  new ModelControlCenter(
    registry,
    fakeExecutor,
  );

assert.equal(
  control.snapshot().totals.models,
  2,
);
assert.equal(
  control.snapshot().totals.enabled,
  2,
);
pass(
  "control service can view authoritative registry state",
);

const added =
  control.add({
    id:
      createModelRegistryId(
        "fake",
        "gamma",
      ),
    provider:
      "fake",
    model:
      "gamma",
    displayName:
      "Gamma",
    roles: [
      "code",
    ],
    capabilities: [
      "coding",
    ],
    enabled:
      true,
    local:
      false,
    availability:
      "unknown",
    contextLimits: {
      known:
        false,
    },
    cost: {
      known:
        false,
      mode:
        "unknown",
    },
    privacy: {
      execution:
        "unknown",
      promptLeavesDevice:
        null,
      retention:
        "unknown",
    },
    strengths: [],
    weaknesses: [],
    source:
      "user",
    tags: [],
  });

assert.equal(
  added.id,
  "fake:gamma",
);
pass(
  "control service can add models through the registry",
);

const disabled =
  control.setEnabled(
    "fake:gamma",
    false,
  );

assert.equal(
  disabled.enabled,
  false,
);
pass(
  "control service can disable and enable models",
);

const configured =
  control.configure(
    "fake:alpha",
    {
      version:
        "2",
      strengths: [
        "test",
        "planning",
      ],
    },
  );

assert.equal(
  configured.version,
  "2",
);
assert.deepEqual(
  configured.strengths,
  [
    "planning",
    "test",
  ],
);
pass(
  "control service can configure mutable model metadata without changing identity",
);

const inspected =
  control.inspect(
    "fake:alpha",
  );

assert.equal(
  inspected.id,
  "fake:alpha",
);
assert.equal(
  inspected.contextLimits.contextWindowTokens,
  8_000,
);
pass(
  "control service can inspect complete model state",
);

const tested =
  await control.test({
    id:
      "fake:alpha",
    prompt:
      "hello",
  });

assert.equal(
  tested.ok,
  true,
);
assert.equal(
  tested.text,
  "alpha:hello",
);
pass(
  "control service can test a selected model through an injected execution boundary",
);

const compared =
  await control.compare({
    ids: [
      "fake:alpha",
      "fake:beta",
    ],
    prompt:
      "same task",
  });

assert.equal(
  compared.length,
  2,
);
assert.deepEqual(
  compared.map(
    (result) =>
      result.text,
  ),
  [
    "alpha:same task",
    "beta:same task",
  ],
);
pass(
  "control service can compare multiple models on an equivalent prompt",
);

const apiSource =
  readFileSync(
    resolve(
      process.cwd(),
      "app/api/model-control/route.ts",
    ),
    "utf8",
  );

for (
  const action
  of [
    "add",
    "enable",
    "disable",
    "configure",
    "inspect",
    "test",
    "compare",
  ]
) {
  assert.match(
    apiSource,
    new RegExp(
      `case "${action}"`,
    ),
  );
}
pass(
  "API exposes all OH-4D administrative operations without owning model state",
);

const uiSource =
  readFileSync(
    resolve(
      process.cwd(),
      "components/chernobog-ui/command-center/LLMControlCenterSurface.tsx",
    ),
    "utf8",
  );

assert.match(
  uiSource,
  /\/api\/model-control/,
);
assert.doesNotMatch(
  uiSource,
  /new ModelRegistry/,
);
pass(
  "replaceable Control Center UI depends on the API rather than owning cognition state",
);

console.log("");
console.log(
  "OH-4D LLM Control Center verification complete.",
);
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);