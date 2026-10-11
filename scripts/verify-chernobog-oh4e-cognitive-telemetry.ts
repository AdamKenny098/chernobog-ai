import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  createChernobogEvent,
  type ChernobogEvent,
  type ChernobogEventInput,
  type ChernobogEventPublishResult,
} from "../lib/chernobog/events";
import {
  COGNITIVE_MODEL_COMPLETED_EVENT,
  COGNITIVE_MODEL_FAILED_EVENT,
  COGNITIVE_USER_CORRECTION_EVENT,
  COGNITIVE_VALIDATION_EVENT,
  recordCognitiveUserCorrectionTelemetry,
  recordCognitiveValidationTelemetry,
  recordModelInvocationTelemetry,
  summarizeCognitiveTelemetryEvents,
  unavailableCostUsage,
  unavailableTokenUsage,
} from "@chernobog/models/telemetry";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  console.log(
    "Chernobog OH-4E â€” Cognitive Telemetry Verification",
  );
  console.log(
    "================================================",
  );

  const captured:
    ChernobogEvent[] =
      [];

  const publisher = {
    async publish(
      input:
        ChernobogEventInput<unknown>,
    ): Promise<
      ChernobogEventPublishResult
    > {
      const event =
        createChernobogEvent(
          input,
        );

      captured.push(event);

      return {
        event,
        deduplicated:
          false,
        delivered:
          0,
        handlerErrors:
          [],
      };
    },
  };

  await recordModelInvocationTelemetry(
    {
      taskType:
        "planning",
      provider:
        "ollama",
      model:
        "alpha",
      requestedRole:
        "planner",
      selectedModel:
        "alpha",
      selectionReason:
        "primary-available",
      outcome:
        "success",
      latencyMs:
        120,
      attempts:
        2,
      retries:
        1,
      fallbackCount:
        0,
      tokenUsage:
        unavailableTokenUsage(),
      cost:
        unavailableCostUsage(),
      validationExpected:
        true,
    },
    {
      taskType:
        "planning",
      correlationId:
        "task-1",
    },
    publisher,
  );

  assert.equal(
    captured[0]?.type,
    COGNITIVE_MODEL_COMPLETED_EVENT,
  );

  const modelPayload =
    captured[0]
      ?.payload as
      Record<string, unknown>;

  assert.equal(
    modelPayload.latencyMs,
    120,
  );
  assert.equal(
    modelPayload.retries,
    1,
  );
  assert.equal(
    modelPayload.fallbackCount,
    0,
  );
  assert.equal(
    (
      modelPayload.tokenUsage as
        Record<string, unknown>
    ).source,
    "unavailable",
  );
  assert.equal(
    (
      modelPayload.cost as
        Record<string, unknown>
    ).source,
    "unavailable",
  );

  pass(
    "model telemetry records task type, selection, latency, retries, fallback, usage and cost availability",
  );

  await recordModelInvocationTelemetry(
    {
      taskType:
        "code",
      provider:
        "ollama",
      model:
        "beta",
      requestedRole:
        "code",
      outcome:
        "failure",
      latencyMs:
        30,
      attempts:
        1,
      retries:
        0,
      fallbackCount:
        1,
      tokenUsage: {
        inputTokens:
          50,
        outputTokens:
          10,
        totalTokens:
          60,
        source:
          "provider",
      },
      cost: {
        amount:
          0,
        currency:
          "EUR",
        source:
          "registry",
      },
      validationExpected:
        false,
      error:
        "simulated",
      failureKind:
        "provider-error",
    },
    {},
    publisher,
  );

  assert.equal(
    captured[1]?.type,
    COGNITIVE_MODEL_FAILED_EVENT,
  );

  pass(
    "model failures preserve performance and failure signals",
  );

  await recordCognitiveValidationTelemetry(
    {
      taskType:
        "planning",
      provider:
        "ollama",
      model:
        "alpha",
      validator:
        "schema",
      valid:
        true,
      score:
        1,
    },
    "task-1",
    publisher,
  );

  assert.equal(
    captured[2]?.type,
    COGNITIVE_VALIDATION_EVENT,
  );

  await recordCognitiveUserCorrectionTelemetry(
    {
      taskType:
        "planning",
      provider:
        "ollama",
      model:
        "alpha",
      correctionKind:
        "preference",
      accepted:
        true,
      detail:
        "shorter answer",
    },
    "task-1",
    publisher,
  );

  assert.equal(
    captured[3]?.type,
    COGNITIVE_USER_CORRECTION_EVENT,
  );

  pass(
    "validation results and user corrections are first-class telemetry events",
  );

  const summary =
    summarizeCognitiveTelemetryEvents(
      captured,
    );

  assert.equal(
    summary.modelInvocations,
    2,
  );
  assert.equal(
    summary.successes,
    1,
  );
  assert.equal(
    summary.failures,
    1,
  );
  assert.equal(
    summary.totalRetries,
    1,
  );
  assert.equal(
    summary.totalFallbacks,
    1,
  );
  assert.equal(
    summary.averageLatencyMs,
    75,
  );
  assert.equal(
    summary.tokenUsageKnown,
    1,
  );
  assert.equal(
    summary.costKnown,
    1,
  );
  assert.equal(
    summary.validations,
    1,
  );
  assert.equal(
    summary.validationPasses,
    1,
  );
  assert.equal(
    summary.userCorrections,
    1,
  );

  pass(
    "telemetry history reduces into performance summaries for later evaluation and calibration",
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
    /recordModelInvocationTelemetry/,
  );
  assert.match(
    gatewaySource,
    /telemetry\?\.taskType/,
  );
  assert.match(
    gatewaySource,
    /result\.attempts/,
  );
  assert.match(
    gatewaySource,
    /result\.fallbackCount/,
  );

  pass(
    "provider-neutral gateway automatically emits cognitive model telemetry",
  );

  const apiSource =
    readFileSync(
      resolve(
        process.cwd(),
        "app/api/cognition/telemetry/route.ts",
      ),
      "utf8",
    );

  assert.match(
    apiSource,
    /signal ===\s*"validation"/,
  );
  assert.match(
    apiSource,
    /signal ===\s*"user-correction"/,
  );
  assert.match(
    apiSource,
    /getCognitiveTelemetrySummary/,
  );

  pass(
    "telemetry API exposes summary reads plus validation and correction signal ingress",
  );

  console.log("");
  console.log(
    "OH-4E cognitive telemetry verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);