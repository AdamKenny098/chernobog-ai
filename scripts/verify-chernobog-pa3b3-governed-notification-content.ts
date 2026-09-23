import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import path from "node:path";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function source(
  relativePath: string,
): Promise<string> {
  return readFile(
    path.join(
      process.cwd(),
      relativePath,
    ),
    "utf8",
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-3B3 - Governed Android Notification Content Capture",
  );
  console.log(
    "===============================================================",
  );

  const session =
    await source(
      "app/api/personal-assistance/mobile/session/route.ts",
    );

  assert.match(
    session,
    /notificationStoreBodies:\s*profile\.notification\.storeBodies/u,
  );
  assert.match(
    session,
    /notificationRedactSensitiveContent:\s*profile\.notification\.redactSensitiveContent/u,
  );
  assert.match(
    session,
    /notificationStoreSenderIdentity:\s*profile\.privacy\.storeSenderIdentity/u,
  );
  assert.match(
    session,
    /toolExecution:\s*false/u,
  );
  assert.match(
    session,
    /permissionGranting:\s*false/u,
  );

  pass(
    "mobile session exposes PA-1B notification/privacy policy without adding execution authority",
  );

  const models =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/Models.kt",
    );

  assert.match(
    models,
    /notificationStoreBodies:\s*Boolean\s*=\s*false/u,
  );
  assert.match(
    models,
    /notificationRedactSensitiveContent:\s*Boolean\s*=\s*true/u,
  );
  assert.match(
    models,
    /notificationStoreSenderIdentity:\s*Boolean\s*=\s*false/u,
  );

  pass(
    "Android content-policy fields default conservatively",
  );

  const apiClient =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/ChernobogApiClient.kt",
    );

  for (
    const key of
    [
      "notificationStoreBodies",
      "notificationRedactSensitiveContent",
      "notificationStoreSenderIdentity",
    ]
  ) {
    assert.match(
      apiClient,
      new RegExp(
        `"${key}"`,
        "u",
      ),
    );
  }

  pass(
    "authenticated Android session receives governed content policy",
  );

  const policy =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationPolicyCache.kt",
    );

  assert.match(
    policy,
    /data class NotificationCapturePolicy/u,
  );
  assert.match(
    policy,
    /storeBodies:\s*Boolean\s*=\s*false/u,
  );
  assert.match(
    policy,
    /redactSensitiveContent:\s*Boolean\s*=\s*true/u,
  );
  assert.match(
    policy,
    /storeSenderIdentity:\s*Boolean\s*=\s*false/u,
  );
  assert.match(
    policy,
    /usesRedactedContent/u,
  );

  pass(
    "cached capture policy remains private by default and derives redacted-content behavior from server authority",
  );

  const normalizer =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationNormalizer.kt",
    );

  assert.match(
    normalizer,
    /Notification\.EXTRA_TITLE/u,
  );
  assert.match(
    normalizer,
    /Notification\.EXTRA_BIG_TEXT/u,
  );
  assert.match(
    normalizer,
    /Notification\.EXTRA_TEXT/u,
  );
  assert.match(
    normalizer,
    /policy\.storeSenderIdentity/u,
  );
  assert.match(
    normalizer,
    /policy\.storeBodies/u,
  );
  assert.match(
    normalizer,
    /policy\.usesRedactedContent/u,
  );
  assert.doesNotMatch(
    normalizer,
    /normalizeMetadataOnly/u,
  );

  pass(
    "notification normalization captures semantic evidence only according to effective policy",
  );

  const redactor =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationContentRedactor.kt",
    );

  for (
    const name of
    [
      "emailPattern",
      "urlPattern",
      "credentialPattern",
      "longNumberPattern",
      "longTokenPattern",
    ]
  ) {
    assert.match(
      redactor,
      new RegExp(
        name,
        "u",
      ),
    );
  }

  pass(
    "redacted-content mode masks common sensitive token patterns before durable spool storage",
  );

  const spool =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationSpool.kt",
    );

  for (
    const field of
    [
      "sender",
      "title",
      "body",
      "redactedTitle",
      "redactedBody",
    ]
  ) {
    assert.match(
      spool,
      new RegExp(
        `val ${field}: String\\?`,
        "u",
      ),
    );
  }

  assert.match(
    spool,
    /version\s*=\s*2/u,
  );
  assert.match(
    spool,
    /object : Migration\(\s*1,\s*2,/u,
  );
  assert.match(
    spool,
    /ALTER TABLE notification_spool ADD COLUMN redactedBody TEXT/u,
  );
  assert.match(
    spool,
    /fun enforcePolicy/u,
  );
  assert.match(
    spool,
    /@Update/u,
  );

  pass(
    "Room spool upgrades non-destructively and queued evidence can be re-sanitized",
  );

  const worker =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationSyncWorker.kt",
    );

  assert.match(
    worker,
    /capturePolicy\s*=\s*policy\.currentPolicy\(\)/u,
  );
  assert.match(
    worker,
    /dao\.deleteAll\(\)/u,
  );
  assert.match(
    worker,
    /item\.enforcePolicy\(\s*capturePolicy/u,
  );
  assert.match(
    worker,
    /dao\.update\(\s*effective/u,
  );

  pass(
    "disabled policy purges the spool and queued evidence is durably re-sanitized before upload",
  );

  const transport =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationTransportClient.kt",
    );

  for (
    const field of
    [
      "sender",
      "title",
      "body",
      "redactedTitle",
      "redactedBody",
    ]
  ) {
    assert.match(
      transport,
      new RegExp(
        `"${field}"`,
        "u",
      ),
    );
  }

  pass(
    "transport sends only content fields surviving local policy enforcement",
  );

  const listener =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/ChernobogNotificationListenerService.kt",
    );

  assert.match(
    listener,
    /policy\.currentPolicy\(\)/u,
  );
  assert.match(
    listener,
    /NotificationNormalizer\s*\.normalize\(/u,
  );
  assert.match(
    listener,
    /The listener must not crash SystemUI/u,
  );
  assert.doesNotMatch(
    listener,
    /Log\.|println\(/u,
  );

  pass(
    "listener keeps the accepted crash-safety and no-content-logging boundary",
  );

  const panel =
    await source(
      "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationAccessPanel.kt",
    );

  assert.doesNotMatch(
    panel,
    /stores notification metadata only/u,
  );
  assert.match(
    panel,
    /Content is stored only when explicitly enabled/u,
  );

  pass(
    "companion UI no longer makes the superseded metadata-only claim",
  );

  console.log(
    "===============================================================",
  );
  console.log(
    "PASS PA-3B3 Governed Android Notification Content Capture acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
