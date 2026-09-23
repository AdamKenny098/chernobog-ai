import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ResponsibilityLedger,
} from "../lib/chernobog/personalAssistance/responsibilities/store";
import {
  canTransitionResponsibility,
} from "../lib/chernobog/personalAssistance/responsibilities/stateMachine";

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
    "Chernobog PA-3A1 - Responsibility Authority & Durable Ledger",
  );
  console.log(
    "==============================================================",
  );

  const directory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa3a1-",
      ),
    );

  try {
    const ledger =
      new ResponsibilityLedger(
        directory,
      );

    const created =
      await ledger.create({
        title:
          "Reply to Sarah about Thursday",
        summary:
          "Sarah is waiting for confirmation about Thursday.",
        source: {
          type:
            "notification",
          sourceId:
            "notif-sarah-1",
          application:
            "WhatsApp",
        },
        priority:
          "normal",
        requiresHuman:
          true,
        suggestedAction:
          "Confirm or decline Thursday.",
        confidence:
          0.92,
        mergeKey:
          "whatsapp:sarah:thursday",
        actor:
          "steward",
        reason:
          "Test responsibility detected.",
      });

    assert.equal(
      created.disposition,
      "created",
    );
    assert.match(
      created.responsibility.id,
      /^resp_/u,
    );
    assert.equal(
      created.responsibility.state,
      "detected",
    );
    assert.equal(
      created.responsibility.evidence.length,
      1,
    );

    pass(
      "responsibility creation produces canonical durable object",
    );

    const restarted =
      new ResponsibilityLedger(
        directory,
      );

    const recovered =
      await restarted.get(
        created.responsibility.id,
      );

    assert.ok(
      recovered,
    );
    assert.equal(
      recovered.title,
      "Reply to Sarah about Thursday",
    );

    pass(
      "responsibility survives store restart/reconstruction",
    );

    const replay =
      await restarted.create({
        title:
          "Duplicate source",
        summary:
          "The same source event was replayed.",
        source: {
          type:
            "notification",
          sourceId:
            "notif-sarah-1",
          application:
            "WhatsApp",
        },
        confidence:
          0.95,
        mergeKey:
          "whatsapp:sarah:thursday",
        actor:
          "steward",
        reason:
          "Replay acceptance test.",
      });

    assert.equal(
      replay.disposition,
      "source-replayed",
    );
    assert.equal(
      replay.responsibility.id,
      created.responsibility.id,
    );
    assert.equal(
      replay.responsibility.evidence.length,
      1,
    );

    pass(
      "stable source replay is idempotent and does not duplicate evidence",
    );

    const merged =
      await restarted.create({
        title:
          "Sarah follow-up",
        summary:
          "Sarah says she needs an answer tonight.",
        source: {
          type:
            "notification",
          sourceId:
            "notif-sarah-2",
          application:
            "WhatsApp",
        },
        priority:
          "important",
        confidence:
          0.97,
        mergeKey:
          "whatsapp:sarah:thursday",
        actor:
          "steward",
        reason:
          "Follow-up belongs to the same responsibility.",
      });

    assert.equal(
      merged.disposition,
      "merged",
    );
    assert.equal(
      merged.responsibility.id,
      created.responsibility.id,
    );
    assert.equal(
      merged.responsibility.evidence.length,
      2,
    );
    assert.equal(
      merged.responsibility.priority,
      "important",
    );

    pass(
      "explicit high-confidence merge key correlates repeated evidence into one responsibility",
    );

    const waiting =
      await restarted.transition(
        created.responsibility.id,
        {
          state:
            "waiting-user",
          actor:
            "steward",
          reason:
            "The user must choose whether Thursday works.",
        },
      );

    assert.equal(
      waiting.state,
      "waiting-user",
    );
    assert.equal(
      waiting.requiresHuman,
      true,
    );

    pass(
      "state machine projects explicit waiting-user human gate",
    );

    assert.equal(
      canTransitionResponsibility(
        "resolved",
        "waiting-user",
      ),
      false,
    );

    await assert.rejects(
      () =>
        restarted.transition(
          created.responsibility.id,
          {
            state:
              "detected",
            actor:
              "test",
            reason:
              "Invalid backwards transition test.",
          },
        ),
      /Invalid responsibility transition/u,
    );

    pass(
      "invalid lifecycle transitions are rejected",
    );

    const resolved =
      await restarted.transition(
        created.responsibility.id,
        {
          state:
            "resolved",
          actor:
            "steward",
          reason:
            "User handled the Thursday decision.",
        },
      );

    assert.equal(
      resolved.state,
      "resolved",
    );
    assert.equal(
      resolved.requiresHuman,
      false,
    );

    const active =
      await restarted.list();

    assert.equal(
      active.length,
      0,
    );

    const all =
      await restarted.list({
        includeClosed:
          true,
      });

    assert.equal(
      all.length,
      1,
    );

    pass(
      "resolved lifecycle closes active responsibility while retaining durable history",
    );

    const history =
      await restarted.history(
        created.responsibility.id,
      );

    assert.ok(
      history.length >= 5,
    );

    assert.ok(
      history.some(
        (event) =>
          event.event ===
          "evidence-merged",
      ),
    );

    assert.ok(
      history.some(
        (event) =>
          event.event ===
          "state-changed" &&
          event.toState ===
          "waiting-user",
      ),
    );

    pass(
      "mutation history is append-only, attributable and explainable",
    );

    const eventsText =
      await readFile(
        path.join(
          directory,
          "responsibility-events.jsonl",
        ),
        "utf8",
      );

    assert.match(
      eventsText,
      /"actor":"steward"/u,
    );
    assert.match(
      eventsText,
      /"reason":/u,
    );

    pass(
      "durable JSONL audit ledger contains actor and reason",
    );

    const collectionRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "responsibilities",
          "route.ts",
        ),
        "utf8",
      );

    const itemRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "responsibilities",
          "[id]",
          "route.ts",
        ),
        "utf8",
      );

    const transitionRoute =
      await readFile(
        path.join(
          process.cwd(),
          "app",
          "api",
          "personal-assistance",
          "responsibilities",
          "[id]",
          "transition",
          "route.ts",
        ),
        "utf8",
      );

    for (
      const route of
      [
        collectionRoute,
        itemRoute,
        transitionRoute,
      ]
    ) {
      assert.match(
        route,
        /executesTools:\s*false/u,
      );
      assert.match(
        route,
        /grantsPermissions:\s*false/u,
      );
      assert.doesNotMatch(
        route,
        /UnifiedToolGateway|executeTool|grantPermission/u,
      );
    }

    pass(
      "responsibility API is explicitly non-executing and non-permission-granting",
    );

    console.log(
      "==============================================================",
    );
    console.log(
      "PASS PA-3A1 Responsibility Authority & Durable Ledger acceptance",
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
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
