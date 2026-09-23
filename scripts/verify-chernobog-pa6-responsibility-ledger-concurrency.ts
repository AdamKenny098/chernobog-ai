import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

function assert(
  condition: boolean,
  message: string,
): void {
  if (
    !condition
  ) {
    throw new Error(
      `FAIL ${message}`,
    );
  }

  pass(
    message,
  );
}

async function main():
  Promise<void> {
  const directory =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "chernobog-responsibility-concurrency-",
      ),
    );

  try {
    const ledgers =
      Array.from(
        {
          length: 8,
        },
        () =>
          new ResponsibilityLedger(
            directory,
          ),
      );

    const count =
      64;

    await Promise.all(
      Array.from(
        {
          length:
            count,
        },
        async (
          _,
          index,
        ) => {
          const ledger =
            ledgers[
              index %
                ledgers.length
            ];

          const result =
            await ledger.create({
              title:
                `Concurrency test ${index}`,
              summary:
                `Concurrent responsibility ${index}`,
              source: {
                type:
                  "manual",
                sourceId:
                  `concurrency-${index}`,
              },
              state:
                "waiting-user",
              priority:
                "normal",
              requiresHuman:
                true,
              confidence:
                1,
              actor:
                "verification",
              reason:
                "Concurrent ledger mutation verification.",
            });

          assert(
            result.disposition ===
              "created",
            `concurrent create ${index} completed`,
          );
        },
      ),
    );

    const reader =
      new ResponsibilityLedger(
        directory,
      );

    const responsibilities =
      await reader.list({
        includeClosed: true,
      });

    assert(
      responsibilities.length ===
        count,
      "all concurrent mutations survive without lost updates",
    );

    const uniqueSourceIds =
      new Set(
        responsibilities.map(
          (
            responsibility,
          ) =>
            responsibility
              .source
              .sourceId,
        ),
      );

    assert(
      uniqueSourceIds.size ===
        count,
      "all concurrent source identities remain unique and durable",
    );

    const persisted =
      JSON.parse(
        await readFile(
          path.join(
            directory,
            "responsibilities.json",
          ),
          "utf8",
        ),
      ) as {
        schemaVersion:
          number;
        responsibilities:
          unknown[];
      };

    assert(
      persisted.schemaVersion ===
        1,
      "responsibility ledger JSON remains valid schema version 1",
    );

    assert(
      persisted
        .responsibilities
        .length ===
        count,
      "responsibility ledger JSON contains every concurrent write",
    );

    const auditText =
      await readFile(
        path.join(
          directory,
          "responsibility-events.jsonl",
        ),
        "utf8",
      );

    const auditLines =
      auditText
        .split(
          /\r?\n/u,
        )
        .filter(
          Boolean,
        );

    assert(
      auditLines.length ===
        count,
      "audit log records every concurrent mutation",
    );

    const entries =
      await readdir(
        directory,
      );

    assert(
      !entries.some(
        (
          entry,
        ) =>
          entry.endsWith(
            ".tmp",
          ) ||
          entry ===
            "responsibilities.lock",
      ),
      "temporary files and write lock are cleaned after concurrency test",
    );

    console.log(
      "",
    );
    console.log(
      "Chernobog PA-6 responsibility ledger concurrency verifier PASS",
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

main().catch(
  (
    error,
  ) => {
    console.error(
      error,
    );
    process.exitCode =
      1;
  },
);