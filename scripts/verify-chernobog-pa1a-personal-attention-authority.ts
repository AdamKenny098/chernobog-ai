import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
    "Chernobog PA-1A - Personal Attention Authority",
  );
  console.log(
    "===============================================",
  );

  const tempRoot =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-pa1a-",
      ),
    );

  const previousDataDirectory =
    process.env
      .CHERNOBOG_DATA_DIR;

  let primaryDatabase:
    | {
        close: () => void;
      }
    | null = null;

  process.env
    .CHERNOBOG_DATA_DIR =
    tempRoot;

  try {
    const personalAssistance =
      await import(
        "../lib/chernobog/personalAssistance"
      );
    const database =
      await import(
        "../lib/chernobog/db"
      );

    primaryDatabase =
      database.default;

    const initial =
      personalAssistance
        .getPersonalAttentionSnapshot(
          new Date(
            "2026-09-06T20:00:00.000Z",
          ),
        );

    assert.equal(
      initial.state,
      "available",
    );
    assert.equal(
      initial.source,
      "system-default",
    );
    assert.equal(
      initial.explicit,
      false,
    );
    assert.equal(
      initial.revision,
      0,
    );
    pass(
      "fresh installations default truthfully to available without inventing an explicit user setting",
    );

    const busy =
      personalAssistance
        .setPersonalAttention(
          {
            state:
              "busy",
            reason:
              "PA-1A acceptance",
          },
          new Date(
            "2026-09-06T20:01:00.000Z",
          ),
        );

    assert.equal(
      busy.state,
      "busy",
    );
    assert.equal(
      busy.source,
      "explicit-user",
    );
    assert.equal(
      busy.explicit,
      true,
    );
    assert.equal(
      busy.revision,
      1,
    );
    pass(
      "explicit busy state is stored with source, reason, and revision metadata",
    );

    assert.equal(
      personalAssistance
        .resolvePersonalAttentionForCognition(),
      "busy",
    );
    pass(
      "personal attention authority resolves directly into the existing cognition attention contract",
    );

    const dnd =
      personalAssistance
        .setPersonalAttention(
          {
            state:
              "do-not-disturb",
          },
          new Date(
            "2026-09-06T20:02:00.000Z",
          ),
        );

    assert.equal(
      dnd.state,
      "do-not-disturb",
    );
    assert.equal(
      dnd.revision,
      2,
    );
    pass(
      "do-not-disturb is a first-class explicit attention state",
    );

    const temporary =
      personalAssistance
        .setPersonalAttention(
          {
            state:
              "away",
            expiresAt:
              "2026-09-06T20:05:00.000Z",
            reason:
              "temporary acceptance override",
          },
          new Date(
            "2026-09-06T20:03:00.000Z",
          ),
        );

    assert.equal(
      temporary.state,
      "away",
    );
    assert.equal(
      temporary.expiresAt,
      "2026-09-06T20:05:00.000Z",
    );

    const beforeExpiry =
      personalAssistance
        .getPersonalAttentionSnapshot(
          new Date(
            "2026-09-06T20:04:59.000Z",
          ),
        );

    assert.equal(
      beforeExpiry.state,
      "away",
    );

    const afterExpiry =
      personalAssistance
        .getPersonalAttentionSnapshot(
          new Date(
            "2026-09-06T20:05:00.000Z",
          ),
        );

    assert.equal(
      afterExpiry.state,
      "available",
    );
    assert.equal(
      afterExpiry.explicit,
      false,
    );
    assert.equal(
      afterExpiry.source,
      "system-default",
    );
    assert.equal(
      afterExpiry.revision,
      4,
    );
    pass(
      "temporary overrides expire deterministically back to the safe system default",
    );

    const audit =
      personalAssistance
        .listPersonalAttentionAudit(
          10,
        );

    assert.deepEqual(
      audit
        .slice(
          0,
          4,
        )
        .map(
          (entry) =>
            entry.action,
        ),
      [
        "expired",
        "set",
        "set",
        "set",
      ],
    );
    pass(
      "attention changes and automatic expiry produce an inspectable audit trail",
    );

    const reset =
      personalAssistance
        .resetPersonalAttention(
          "acceptance reset",
          new Date(
            "2026-09-06T20:06:00.000Z",
          ),
        );

    assert.equal(
      reset.state,
      "available",
    );
    assert.equal(
      reset.explicit,
      false,
    );
    assert.equal(
      reset.revision,
      5,
    );
    pass(
      "explicit attention can be cleared without deleting the authority history",
    );

    const DatabaseModule =
      await import(
        "better-sqlite3"
      );
    const ReadonlyDatabase =
      DatabaseModule.default;
    const disk =
      new ReadonlyDatabase(
        database
          .chernobogDatabasePath,
        {
          readonly: true,
        },
      );

    try {
      const persisted =
        disk
          .prepare(
            `
            SELECT
              state,
              source,
              explicit,
              revision
            FROM personal_assistance_attention
            WHERE attention_key = ?
            LIMIT 1
            `,
          )
          .get(
            "primary",
          ) as
          | {
              state: string;
              source: string;
              explicit: number;
              revision: number;
            }
          | undefined;

      assert.ok(
        persisted,
      );
      assert.equal(
        persisted.state,
        "available",
      );
      assert.equal(
        persisted.source,
        "system-default",
      );
      assert.equal(
        persisted.explicit,
        0,
      );
      assert.equal(
        persisted.revision,
        5,
      );
    } finally {
      disk.close();
    }
    pass(
      "effective attention authority is durably persisted in the existing Chernobog SQLite database",
    );

    const runtimeSingletonPath =
      path.join(
        process.cwd(),
        "lib",
        "chernobog",
        "cognition",
        "runtimeSingleton.ts",
      );
    const runtimeSingleton =
      await readFile(
        runtimeSingletonPath,
        "utf8",
      );

    assert.match(
      runtimeSingleton,
      /resolveUserAttention\s*:\s*resolvePersonalAttentionForCognition/,
    );
    pass(
      "production cognition singleton is wired to the personal attention authority instead of its available fallback",
    );

    const routePath =
      path.join(
        process.cwd(),
        "app",
        "api",
        "personal-assistance",
        "attention",
        "route.ts",
      );
    const route =
      await readFile(
        routePath,
        "utf8",
      );

    assert.match(
      route,
      /export async function GET/,
    );
    assert.match(
      route,
      /export async function PATCH/,
    );
    assert.match(
      route,
      /export async function DELETE/,
    );
    assert.doesNotMatch(
      route,
      /\.executeTool|toolGateway|runTool/,
    );
    pass(
      "attention API provides read, explicit update, and reset surfaces without a tool-execution path",
    );

    const snapshotCopy =
      personalAssistance
        .getPersonalAttentionSnapshot();

    snapshotCopy.state =
      "away";

    assert.equal(
      personalAssistance
        .getPersonalAttentionSnapshot()
        .state,
      "available",
    );
    pass(
      "attention snapshots are defensive values rather than mutable shared authority state",
    );

    console.log(
      "===============================================",
    );
    console.log(
      "PASS PA-1A Personal Attention Authority acceptance",
    );
  } finally {
    if (primaryDatabase) {
      try {
        primaryDatabase.close();
      } catch {
        // Best-effort verifier cleanup only.
      }
    }

    if (
      previousDataDirectory ===
      undefined
    ) {
      delete process.env
        .CHERNOBOG_DATA_DIR;
    } else {
      process.env
        .CHERNOBOG_DATA_DIR =
        previousDataDirectory;
    }

    await rm(
      tempRoot,
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