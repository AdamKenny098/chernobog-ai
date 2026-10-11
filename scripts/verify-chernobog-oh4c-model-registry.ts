import assert from "node:assert/strict";
import {
  ModelRegistry,
  createConfiguredModelRegistry,
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
  "Chernobog OH-4C â€” Model Registry Verification",
);
console.log(
  "=============================================",
);

const registry =
  new ModelRegistry();

const registered =
  registry.register({
    id:
      createModelRegistryId(
        "fake",
        "alpha",
      ),
    provider:
      "FAKE",
    model:
      "alpha",
    displayName:
      "Alpha",
    roles: [
      "default",
      "planner",
    ],
    capabilities: [
      "chat",
      "planning",
    ],
    enabled:
      true,
    local:
      false,
    availability:
      "available",
    version:
      "1.0",
    contextLimits: {
      known:
        true,
      contextWindowTokens:
        32_000,
      maxOutputTokens:
        4_000,
    },
    cost: {
      known:
        true,
      mode:
        "metered",
      currency:
        "USD",
      inputPerMillionTokens:
        1,
      outputPerMillionTokens:
        2,
    },
    privacy: {
      execution:
        "remote",
      promptLeavesDevice:
        true,
      retention:
        "provider-policy",
    },
    strengths: [
      "planning",
      "structured output",
    ],
    weaknesses: [
      "high latency",
    ],
    source:
      "user",
    tags: [
      "test",
    ],
  });

assert.equal(
  registered.id,
  "fake:alpha",
);
assert.equal(
  registered.provider,
  "fake",
);
pass(
  "registry canonicalizes provider/model identity",
);

assert.equal(
  registered.contextLimits.contextWindowTokens,
  32_000,
);
assert.equal(
  registered.cost.mode,
  "metered",
);
assert.equal(
  registered.privacy.execution,
  "remote",
);
assert.equal(
  registered.availability,
  "available",
);
assert.equal(
  registered.version,
  "1.0",
);
assert.deepEqual(
  registered.strengths,
  [
    "planning",
    "structured output",
  ],
);
assert.deepEqual(
  registered.weaknesses,
  [
    "high latency",
  ],
);
pass(
  "context, cost, privacy, availability, version and strengths are first-class registry state",
);

assert.equal(
  registry.get(
    "fake:alpha",
  )?.displayName,
  "Alpha",
);
pass(
  "registry resolves canonical model identity",
);

assert.equal(
  registry.list({
    role:
      "planner",
  }).length,
  1,
);
assert.equal(
  registry.list({
    capability:
      "planning",
  }).length,
  1,
);
assert.equal(
  registry.list({
    enabled:
      false,
  }).length,
  0,
);
pass(
  "registry supports role, capability and enabled-state queries",
);

assert.throws(
  () =>
    registry.register({
      ...registered,
    }),
  /already registered/,
);
pass(
  "duplicate model identity is rejected deterministically",
);

registry.upsert({
  ...registered,
  enabled:
    false,
  availability:
    "unavailable",
  tags: [
    "test",
    "disabled",
  ],
});

assert.equal(
  registry.get(
    "fake:alpha",
  )?.enabled,
  false,
);
assert.equal(
  registry.get(
    "fake:alpha",
  )?.availability,
  "unavailable",
);
pass(
  "registry supports explicit authoritative upsert",
);

const configured =
  createConfiguredModelRegistry();

const configuredEntries =
  configured.list();

assert.ok(
  configuredEntries.length > 0,
);
assert.ok(
  configuredEntries.every(
    (entry) =>
      entry.provider ===
      "ollama",
  ),
);
pass(
  "current configured Ollama candidates seed the provider-neutral registry",
);

assert.ok(
  configuredEntries.every(
    (entry) =>
      entry.contextLimits.known ===
        false &&
      entry.cost.mode ===
        "local-compute" &&
      entry.privacy.execution ===
        "local" &&
      entry.privacy.promptLeavesDevice ===
        false &&
      entry.availability ===
        "unknown" &&
      entry.weaknesses.length > 0,
  ),
);
pass(
  "configured entries explicitly represent unknown limits, local cost/privacy and uncalibrated weaknesses",
);

assert.ok(
  configured.list({
    role:
      "default",
  }).length > 0,
);
assert.ok(
  configured.list({
    role:
      "planner",
  }).length > 0,
);
assert.ok(
  configured.list({
    role:
      "code",
  }).length > 0,
);
assert.ok(
  configured.list({
    role:
      "repair",
  }).length > 0,
);
pass(
  "configured model roles are preserved in registry metadata",
);

console.log("");
console.log(
  "OH-4C model registry verification complete.",
);