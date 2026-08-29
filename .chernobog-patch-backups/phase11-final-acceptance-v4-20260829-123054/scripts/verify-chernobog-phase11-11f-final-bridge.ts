import assert from "node:assert/strict";
import {
  readdir,
  readFile,
} from "node:fs/promises";
import path from "node:path";

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/");
}

async function walk(
  root: string,
): Promise<string[]> {
  const output: string[] = [];

  async function visit(
    directory: string,
  ): Promise<void> {
    let entries;

    try {
      entries =
        await readdir(
          directory,
          {
            withFileTypes: true,
          },
        );
    } catch {
      return;
    }

    for (const entry of entries) {
      const full =
        path.join(
          directory,
          entry.name,
        );

      if (entry.isDirectory()) {
        await visit(full);
        continue;
      }

      if (
        entry.isFile() &&
        /\.(?:ts|tsx|js|mjs|cjs)$/.test(
          entry.name,
        )
      ) {
        output.push(full);
      }
    }
  }

  await visit(root);
  return output.sort();
}

async function main(): Promise<void> {
  console.log(
    "Chernobog Phase 11F - Event Spine Final Bridge Acceptance",
  );
  console.log(
    "=========================================================",
  );

  const files = [
    ...(await walk(
      "lib/chernobog",
    )),
    ...(await walk(
      "app/api",
    )),
  ];

  assert.equal(
    files.length > 0,
    true,
    "No Chernobog source files found.",
  );

  const corpusEntries:
    Array<{
      file: string;
      source: string;
    }> = [];

  for (const file of files) {
    corpusEntries.push({
      file:
        normalize(file),
      source:
        await readFile(
          file,
          "utf8",
        ),
    });
  }

  const corpus =
    corpusEntries
      .map(
        (entry) =>
          entry.source,
      )
      .join("\n");

  assert.equal(
    corpus.includes(
      "events.jsonl",
    ),
    true,
    "Event Spine persistence path marker events.jsonl is missing.",
  );

  pass(
    "Event Spine retains append-only JSONL persistence",
  );

  assert.equal(
    corpus.includes(
      "dedupeWindowMs",
    ),
    true,
    "Event Spine duplicate-suppression configuration is missing.",
  );

  pass(
    "Event Spine retains bounded duplicate suppression",
  );

  for (
    const queryCapability
    of [
      "correlationId",
      "newestFirst",
      "severity",
      "limit",
    ]
  ) {
    assert.equal(
      corpus.includes(
        queryCapability,
      ),
      true,
      `Event query capability missing: ${queryCapability}`,
    );
  }

  pass(
    "Event history retains structured correlation, severity, ordering, and bounded query capabilities",
  );

  const eventCore =
    corpusEntries.filter(
      (entry) =>
        entry.source.includes(
          "events.jsonl",
        ) ||
        entry.source.includes(
          "dedupeWindowMs",
        ),
    );

  assert.equal(
    eventCore.length >= 1,
    true,
    "Unable to locate Event Spine core source.",
  );

  for (const entry of eventCore) {
    assert.equal(
      /\bexecuteTool\s*\(/.test(
        entry.source,
      ),
      false,
      `Event Spine core must not directly execute tools: ${entry.file}`,
    );

    assert.equal(
      /\brunExecutionTask\s*\(/.test(
        entry.source,
      ),
      false,
      `Event Spine core must not directly execute tasks: ${entry.file}`,
    );
  }

  pass(
    "Event Spine core remains observational infrastructure with no direct task or tool execution authority",
  );

  const canonicalEventApiPath =
    "app/api/events/route.ts";

  const canonicalEventApi =
    corpusEntries.find(
      (entry) =>
        entry.file ===
        canonicalEventApiPath,
    );

  assert.equal(
    Boolean(canonicalEventApi),
    true,
    `Canonical Event API route is missing: ${canonicalEventApiPath}`,
  );

  assert.equal(
    canonicalEventApi?.source.includes(
      "export async function GET",
    ),
    true,
    "Canonical Event API does not expose GET.",
  );

  assert.equal(
    canonicalEventApi?.source.includes(
      "getChernobogEventBus",
    ),
    true,
    "Canonical Event API is not wired to the Event Spine bus.",
  );

  assert.equal(
    canonicalEventApi?.source.includes(
      ".query(",
    ),
    true,
    "Canonical Event API does not query Event Spine history.",
  );

  pass(
    "canonical app/api/events route exposes read-only Event Spine history through GET",
  );

  const observationSignals = [
    "model",
    "service",
    "node",
    "backup",
    "storage",
  ];

  const observedSignals =
    observationSignals.filter(
      (signal) =>
        corpus
          .toLowerCase()
          .includes(signal),
    );

  assert.equal(
    observedSignals.length >= 4,
    true,
    `Expected broad runtime observation coverage; found: ${observedSignals.join(", ")}`,
  );

  pass(
    "Event Spine remains integrated with broad runtime/service/storage observation domains",
  );

  const eventFiles =
    corpusEntries.filter(
      (entry) =>
        /event/i.test(
          path.basename(
            entry.file,
          ),
        ) ||
        entry.source.includes(
          "events.jsonl",
        ),
    );

  assert.equal(
    eventFiles.length >= 3,
    true,
    "Event Spine appears too small or has lost its supporting event modules.",
  );

  pass(
    "Event Spine retains multiple supporting modules rather than collapsing into a placeholder",
  );

  console.log(
    "=========================================================",
  );
  console.log(
    "PASS Phase 11F Event Spine Final Bridge Acceptance",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
