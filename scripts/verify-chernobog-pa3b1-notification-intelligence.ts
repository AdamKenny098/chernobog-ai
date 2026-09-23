import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  analyzeNotification,
} from "../lib/chernobog/personalAssistance/notificationIntelligence/analyzer";
import {
  NotificationIntelligenceJournal,
} from "../lib/chernobog/personalAssistance/notificationIntelligence/journal";
import {
  ResponsibilityLedger,
} from "../lib/chernobog/personalAssistance/responsibilities/store";

function pass(
  message: string,
): void {
  console.log(
    `PASS ${message}`,
  );
}

async function main():
  Promise<void> {
  console.log(
    "Chernobog PA-3B1 - Notification Intelligence Core",
  );
  console.log(
    "===================================================",
  );

  const metadataOnly =
    analyzeNotification({
      eventId:
        "meta-1",
      appPackage:
        "com.whatsapp",
      appLabel:
        "WhatsApp",
      category:
        "msg",
    });

  assert.equal(
    metadataOnly.classification.kind,
    "communication",
  );
  assert.equal(
    metadataOnly.contentAvailability,
    "metadata-only",
  );
  assert.equal(
    metadataOnly.responsibility.shouldCreate,
    false,
  );

  pass(
    "metadata-only notifications are classified without inventing a responsibility",
  );

  const actionable =
    analyzeNotification({
      eventId:
        "msg-1",
      appPackage:
        "com.whatsapp",
      appLabel:
        "WhatsApp",
      category:
        "msg",
      sender:
        "Sarah",
      redactedTitle:
        "Sarah",
      redactedBody:
        "Can you confirm Thursday? I need an answer tonight.",
    });

  assert.equal(
    actionable.classification.kind,
    "communication",
  );
  assert.equal(
    actionable.correspondence.likelyCorrespondence,
    true,
  );
  assert.equal(
    actionable.action.actionRequired,
    true,
  );
  assert.equal(
    actionable.action.kind,
    "reply",
  );
  assert.equal(
    actionable.importance.level,
    "important",
  );
  assert.equal(
    actionable.responsibility.shouldCreate,
    true,
  );
  assert.equal(
    actionable.responsibility.state,
    "waiting-user",
  );
  assert.match(
    actionable.responsibility.mergeKey ??
      "",
    /^notification-thread:/u,
  );

  pass(
    "sanitized direct request is classified as correspondence, action-required and important",
  );

  const security =
    analyzeNotification({
      eventId:
        "security-1",
      appPackage:
        "com.example.authenticator",
      redactedTitle:
        "Security alert",
      redactedBody:
        "Suspicious login detected. Immediate action required.",
    });

  assert.equal(
    security.classification.kind,
    "security",
  );
  assert.equal(
    security.importance.level,
    "critical",
  );
  assert.equal(
    security.responsibility.shouldCreate,
    true,
  );

  pass(
    "critical security/action language escalates importance deterministically",
  );

  const directory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa3b1-",
      ),
    );

  try {
    const ledger =
      new ResponsibilityLedger(
        directory,
      );

    const first =
      await ledger.create({
        title:
          actionable.responsibility.title ??
          "Reply to Sarah",
        summary:
          actionable.responsibility.summary ??
          "Sarah needs a response.",
        source: {
          type:
            "notification",
          sourceId:
            "msg-1",
          application:
            "WhatsApp",
        },
        state:
          actionable.responsibility.state,
        priority:
          actionable.responsibility.priority,
        requiresHuman:
          actionable.responsibility.requiresHuman,
        suggestedAction:
          actionable.responsibility.suggestedAction,
        confidence:
          actionable.responsibility.confidence,
        mergeKey:
          actionable.responsibility.mergeKey,
        actor:
          "steward.notification-intelligence",
        reason:
          actionable.responsibility.reasons.join(
            " ",
          ),
      });

    assert.equal(
      first.disposition,
      "created",
    );

    const replay =
      await ledger.create({
        title:
          "Replay",
        summary:
          "Replay",
        source: {
          type:
            "notification",
          sourceId:
            "msg-1",
          application:
            "WhatsApp",
        },
        mergeKey:
          actionable.responsibility.mergeKey,
      });

    assert.equal(
      replay.disposition,
      "source-replayed",
    );

    const followup =
      analyzeNotification({
        eventId:
          "msg-2",
        appPackage:
          "com.whatsapp",
        appLabel:
          "WhatsApp",
        category:
          "msg",
        sender:
          "Sarah",
        redactedBody:
          "Please reply when you can.",
      });

    const merged =
      await ledger.create({
        title:
          followup.responsibility.title ??
          "Reply to Sarah",
        summary:
          followup.responsibility.summary ??
          "Sarah followed up.",
        source: {
          type:
            "notification",
          sourceId:
            "msg-2",
          application:
            "WhatsApp",
        },
        state:
          followup.responsibility.state,
        priority:
          followup.responsibility.priority,
        requiresHuman:
          followup.responsibility.requiresHuman,
        confidence:
          followup.responsibility.confidence,
        mergeKey:
          followup.responsibility.mergeKey,
      });

    assert.equal(
      merged.disposition,
      "merged",
    );
    assert.equal(
      merged.responsibility.evidence.length,
      2,
    );

    pass(
      "stable event identity deduplicates replay while sender correlation merges follow-up evidence",
    );

    const journal =
      new NotificationIntelligenceJournal(
        directory,
      );

    await journal.append({
      intelligence:
        actionable,
      outcome:
        "created",
      responsibilityId:
        first.responsibility.id,
    });

    const journalText =
      await readFile(
        path.join(
          directory,
          "notification-intelligence.jsonl",
        ),
        "utf8",
      );

    assert.match(
      journalText,
      /"eventId":"msg-1"/u,
    );
    assert.doesNotMatch(
      journalText,
      /Can you confirm Thursday/u,
    );
    assert.doesNotMatch(
      journalText,
      /I need an answer tonight/u,
    );

    pass(
      "intelligence journal records decisions without persisting notification body content",
    );
  } finally {
    await rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    );
  }

  const route =
    await readFile(
      path.join(
        process.cwd(),
        "app",
        "api",
        "personal-assistance",
        "notification-intelligence",
        "analyze",
        "route.ts",
      ),
      "utf8",
    );

  assert.match(
    route,
    /executesTools:\s*false/u,
  );
  assert.match(
    route,
    /grantsPermissions:\s*false/u,
  );
  assert.match(
    route,
    /sendsMessages:\s*false/u,
  );
  assert.doesNotMatch(
    route,
    /UnifiedToolGateway|executeTool|sendMessage|grantPermission/u,
  );

  pass(
    "notification-intelligence API is explicitly non-executing, non-messaging and non-permission-granting",
  );

  console.log(
    "===================================================",
  );
  console.log(
    "PASS PA-3B1 Notification Intelligence Core acceptance",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
