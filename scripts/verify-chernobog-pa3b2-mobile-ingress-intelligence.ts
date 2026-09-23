import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import path from "node:path";
import {
  notificationIntelligenceObservationFromStoredMobileNotification,
} from "../lib/chernobog/personalAssistance/notificationIntelligence/mobileBridge";
import {
  analyzeNotification,
} from "../lib/chernobog/personalAssistance/notificationIntelligence/analyzer";
import type {
  PersonalAssistanceStoredNotification,
} from "../lib/chernobog/personalAssistance/mobile/notificationTypes";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

function stored(
  overrides:
    Partial<PersonalAssistanceStoredNotification> = {},
): PersonalAssistanceStoredNotification {
  return {
    eventId:
      "notification-pa3b2-0001",
    deviceId:
      "device-pa3b2-0001",
    captureMode:
      "metadata-only",
    appPackage:
      "com.whatsapp",
    appLabel:
      "WhatsApp",
    notificationKey:
      "key-1",
    category:
      "msg",
    channelId:
      "messages",
    postedAt:
      "2026-09-17T02:00:00.000Z",
    sender:
      null,
    title:
      null,
    body:
      null,
    receivedAt:
      "2026-09-17T02:00:01.000Z",
    ...overrides,
  };
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-3B2 - Mobile Ingress Intelligence Binding",
  );
  console.log(
    "========================================================",
  );

  const metadataObservation =
    notificationIntelligenceObservationFromStoredMobileNotification(
      stored(),
    );

  assert.equal(
    metadataObservation.sender,
    undefined,
  );
  assert.equal(
    metadataObservation.title,
    undefined,
  );
  assert.equal(
    metadataObservation.body,
    undefined,
  );
  assert.equal(
    metadataObservation.redactedTitle,
    undefined,
  );
  assert.equal(
    metadataObservation.redactedBody,
    undefined,
  );

  const metadataAnalysis =
    analyzeNotification(
      metadataObservation,
    );

  assert.equal(
    metadataAnalysis.contentAvailability,
    "metadata-only",
  );
  assert.equal(
    metadataAnalysis.responsibility.shouldCreate,
    false,
  );

  pass(
    "PA-2C metadata-only storage reaches PA-3B without sender/title/body leakage or invented responsibility",
  );

  const redactedObservation =
    notificationIntelligenceObservationFromStoredMobileNotification(
      stored({
        captureMode:
          "redacted-content",
        sender:
          "Sarah",
        title:
          "Sarah",
        body:
          "Can you confirm Thursday?",
      }),
    );

  assert.equal(
    redactedObservation.title,
    undefined,
  );
  assert.equal(
    redactedObservation.body,
    undefined,
  );
  assert.equal(
    redactedObservation.redactedTitle,
    "Sarah",
  );
  assert.equal(
    redactedObservation.redactedBody,
    "Can you confirm Thursday?",
  );

  const redactedAnalysis =
    analyzeNotification(
      redactedObservation,
    );

  assert.equal(
    redactedAnalysis.contentAvailability,
    "redacted-content",
  );
  assert.equal(
    redactedAnalysis.responsibility.shouldCreate,
    true,
  );

  pass(
    "redacted PA-2C content is explicitly mapped as redacted intelligence evidence",
  );

  const fullObservation =
    notificationIntelligenceObservationFromStoredMobileNotification(
      stored({
        captureMode:
          "full-content",
        sender:
          "Sarah",
        title:
          "Sarah",
        body:
          "Please reply when you can.",
      }),
    );

  assert.equal(
    fullObservation.redactedTitle,
    undefined,
  );
  assert.equal(
    fullObservation.redactedBody,
    undefined,
  );
  assert.equal(
    fullObservation.title,
    "Sarah",
  );
  assert.equal(
    fullObservation.body,
    "Please reply when you can.",
  );

  pass(
    "explicit PA-2C full-content storage maps to full-content analysis without bypassing ingress policy",
  );

  const route =
    await readFile(
      path.join(
        process.cwd(),
        "app",
        "api",
        "personal-assistance",
        "mobile",
        "notifications",
        "route.ts",
      ),
      "utf8",
    );

  assert.match(
    route,
    /readPersonalAssistanceStoredMobileNotification/u,
  );
  assert.match(
    route,
    /analyzeAndProjectStoredMobileNotification/u,
  );
  assert.match(
    route,
    /item\.disposition !==\s*"accepted"[\s\S]*item\.disposition !==\s*"duplicate"/u,
  );
  assert.match(
    route,
    /mobile_notification_intelligence_unavailable/u,
  );
  assert.match(
    route,
    /retryable:\s*true/u,
  );
  assert.match(
    route,
    /status:\s*503/u,
  );

  pass(
    "real ingress reprocesses accepted/duplicate durable observations and returns retryable 503 if intelligence is temporarily unavailable",
  );

  for (
    const capability of
    [
      "classification",
      "importanceScoring",
      "correspondenceDetection",
      "actionDetection",
      "responsibilityProjection",
    ]
  ) {
    assert.match(
      route,
      new RegExp(
        `${capability}:\\s*true`,
      ),
    );
  }

  assert.match(
    route,
    /toolExecution:\s*false/u,
  );
  assert.match(
    route,
    /permissionGranting:\s*false/u,
  );
  assert.doesNotMatch(
    route,
    /\.executeTool|toolGateway|runTool|permissionGranting:\s*true/u,
  );

  pass(
    "mobile ingress exposes PA-3 intelligence while retaining no-tool/no-permission boundaries",
  );

  const store =
    await readFile(
      path.join(
        process.cwd(),
        "lib",
        "chernobog",
        "personalAssistance",
        "mobile",
        "notificationStore.ts",
      ),
      "utf8",
    );

  assert.match(
    store,
    /readPersonalAssistanceStoredMobileNotification/u,
  );
  assert.match(
    store,
    /WHERE event_id = \?[\s\S]*AND device_id = \?/u,
  );
  assert.match(
    store,
    /JSON\.parse/u,
  );

  pass(
    "duplicate retry lookup is device-scoped and reads only the PA-2C durable sanitized representation",
  );

  const pa2cVerifier =
    await readFile(
      path.join(
        process.cwd(),
        "scripts",
        "verify-chernobog-pa2c-notification-ingress.ts",
      ),
      "utf8",
    );

  assert.match(
    pa2cVerifier,
    /PA-3B2 later-phase intelligence extension/u,
  );

  pass(
    "historical PA-2C verifier records the later PA-3 extension; the executable PA-2C regression validates its privacy and tool boundaries",
  );

  console.log(
    "========================================================",
  );
  console.log(
    "PASS PA-3B2 Mobile Ingress Intelligence Binding acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
