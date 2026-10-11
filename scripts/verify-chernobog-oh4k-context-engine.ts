import assert from "node:assert/strict";
import {
  ContextEngine,
  type ContextCategory,
  type ContextItem,
  type ContextSource,
} from "@chernobog/models/contextEngine";
import {
  InputInterpreter,
} from "@chernobog/models/inputInterpreter";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function item(
  input: {
    id: string;
    category: ContextCategory;
    sourceId: string;
    title: string;
    content: string;
    freshness?: ContextItem["freshness"];
    confidence?: number;
    tags?: string[];
    sensitive?: boolean;
  },
): ContextItem {
  return {
    id:
      input.id,
    category:
      input.category,
    title:
      input.title,
    content:
      input.content,
    provenance: {
      sourceId:
        input.sourceId,
      sourceType:
        "verifier",
      reference:
        `ref:${input.id}`,
      retrievedAt:
        new Date()
          .toISOString(),
    },
    freshness:
      input.freshness ??
      "fresh",
    confidence:
      input.confidence ??
      0.9,
    sensitive:
      input.sensitive ??
      false,
    relevanceTags:
      input.tags ??
      [],
  };
}

async function main() {
  console.log(
    "Chernobog OH-4K â€” Context Engine Verification",
  );
  console.log(
    "============================================",
  );

  const interpreter =
    new InputInterpreter(
      async () => ({
        intentKind:
          "continue",
        goal:
          "Continue the TypeScript repository migration using the current project decisions and files",
        desiredOutcome:
          "A safe repository migration patch",
        explicitConstraints: [
          "Preserve retry semantics",
        ],
        unresolvedQuestions:
          [],
        domains: [
          "coding",
          "planning",
        ],
        requiredTools: [
          "files",
          "runtime",
        ],
        estimatedSteps:
          6,
        dependencyCount:
          3,
        ambiguityLevel:
          0.1,
        noveltyLevel:
          0.4,
        factualVerification:
          0.8,
        evidenceDependency:
          0.8,
        consequenceSeverity:
          0.7,
        reasoningSteps:
          6,
        crossDomainReasoning:
          true,
        confidence:
          0.95,
      }),
    );

  const interpretation =
    await interpreter.interpret({
      modality:
        "typed",
      text:
        "Continue the repository migration.",
    });

  const engine =
    new ContextEngine({
      defaultMaxItems:
        6,
      defaultMaxChars:
        3_000,
      maxItemChars:
        800,
      minimumRelevance:
        0.35,
    });

  const source = (
    id:
      string,
    categories:
      ContextCategory[],
    items:
      ContextItem[],
  ): ContextSource => ({
    id,
    categories,
    retrieve:
      async () =>
        structuredClone(
          items,
        ),
  });

  engine.registerSource(
    source(
      "project",
      [
        "project-state",
      ],
      [
        item({
          id:
            "project-current",
          category:
            "project-state",
          sourceId:
            "project",
          title:
            "Repository migration status",
          content:
            "Current migration is on gateway convergence. Preserve retry semantics.",
          tags: [
            "repository",
            "migration",
            "retry",
          ],
        }),
      ],
    ),
  );

  engine.registerSource(
    source(
      "memory",
      [
        "memory",
      ],
      [
        item({
          id:
            "memory-current",
          category:
            "memory",
          sourceId:
            "memory",
          title:
            "Recent working memory",
          content:
            "User previously chose to continue the TypeScript repository migration.",
          tags: [
            "continue",
            "repository",
            "migration",
          ],
        }),
      ],
    ),
  );

  engine.registerSource(
    source(
      "files",
      [
        "file",
      ],
      [
        item({
          id:
            "file-router",
          category:
            "file",
          sourceId:
            "files",
          title:
            "router.ts",
          content:
            "TypeScript gateway call site with retry semantics.",
          tags: [
            "typescript",
            "gateway",
            "retry",
          ],
        }),
        item({
          id:
            "file-unrelated",
          category:
            "file",
          sourceId:
            "files",
          title:
            "recipe.txt",
          content:
            "Chocolate cake ingredients and baking instructions.",
          tags: [
            "food",
            "recipe",
          ],
          confidence:
            0.8,
        }),
      ],
    ),
  );

  engine.registerSource(
    source(
      "decisions",
      [
        "recent-decision",
      ],
      [
        item({
          id:
            "decision-1",
          category:
            "recent-decision",
          sourceId:
            "decisions",
          title:
            "Gateway decision",
          content:
            "Use the provider-neutral gateway and keep reliable retry metadata intact.",
          tags: [
            "gateway",
            "retry",
            "migration",
          ],
        }),
      ],
    ),
  );

  engine.registerSource(
    source(
      "tools",
      [
        "tool-state",
      ],
      [
        item({
          id:
            "tool-state",
          category:
            "tool-state",
          sourceId:
            "tools",
          title:
            "Repository runtime",
          content:
            "TypeScript compiler and test runner are available.",
          tags: [
            "runtime",
            "typescript",
            "test",
          ],
          freshness:
            "live",
        }),
      ],
    ),
  );

  engine.registerSource(
    source(
      "policy",
      [
        "policy",
      ],
      [
        item({
          id:
            "policy-1",
          category:
            "policy",
          sourceId:
            "policy",
          title:
            "Execution governance",
          content:
            "Do not execute destructive changes without authority.",
          tags: [
            "execution",
            "governance",
          ],
        }),
      ],
    ),
  );

  engine.registerSource({
    id:
      "broken",
    categories: [
      "other",
    ],
    async retrieve() {
      throw new Error(
        "simulated source failure",
      );
    },
  });

  const packet =
    await engine.assemble({
      interpretation,
    });

  assert.ok(
    packet.items.some(
      (entry) =>
        entry.category ===
        "project-state",
    ),
  );

  assert.ok(
    packet.items.some(
      (entry) =>
        entry.category ===
        "memory",
    ),
  );

  assert.ok(
    packet.items.some(
      (entry) =>
        entry.category ===
        "file" &&
        entry.id ===
        "file-router",
    ),
  );

  assert.ok(
    packet.items.some(
      (entry) =>
        entry.category ===
        "recent-decision",
    ),
  );

  assert.ok(
    packet.items.some(
      (entry) =>
        entry.category ===
        "tool-state",
    ),
  );

  pass(
    "engine retrieves project state, memory, files, recent decisions and tool state through one source contract",
  );

  assert.equal(
    packet.items.some(
      (entry) =>
        entry.id ===
        "file-unrelated",
    ),
    false,
  );

  pass(
    "irrelevant context is excluded instead of indiscriminately dumped into the packet",
  );

  assert.ok(
    packet.items.every(
      (entry) =>
        entry.provenance.sourceId
          .length >
          0 &&
        entry.provenance.retrievedAt
          .length >
          0 &&
        entry.relevanceReasons
          .length >
          0,
    ),
  );

  pass(
    "every selected item preserves provenance and inspectable relevance reasons",
  );

  assert.equal(
    packet.metrics.failedSources,
    1,
  );

  assert.ok(
    packet.diagnostics.some(
      (diagnostic) =>
        diagnostic.sourceId ===
          "broken" &&
        diagnostic.status ===
          "failed",
    ),
  );

  pass(
    "source failure degrades gracefully without collapsing context assembly",
  );

  const largeEngine =
    new ContextEngine({
      defaultMaxItems:
        2,
      defaultMaxChars:
        500,
      maxItemChars:
        250,
      minimumRelevance:
        0,
    });

  largeEngine.registerSource(
    source(
      "large",
      [
        "file",
      ],
      [
        item({
          id:
            "large-1",
          category:
            "file",
          sourceId:
            "large",
          title:
            "Migration file",
          content:
            "repository migration retry ".repeat(
              100,
            ),
          tags: [
            "repository",
            "migration",
            "retry",
          ],
        }),
        item({
          id:
            "large-2",
          category:
            "file",
          sourceId:
            "large",
          title:
            "Second migration file",
          content:
            "typescript gateway migration ".repeat(
              100,
            ),
          tags: [
            "typescript",
            "gateway",
            "migration",
          ],
        }),
        item({
          id:
            "large-3",
          category:
            "file",
          sourceId:
            "large",
          title:
            "Third migration file",
          content:
            "migration project ".repeat(
              100,
            ),
          tags: [
            "migration",
            "project",
          ],
        }),
      ],
    ),
  );

  const bounded =
    await largeEngine.assemble({
      interpretation,
    });

  assert.ok(
    bounded.items.length <=
    2,
  );

  assert.ok(
    bounded.metrics.includedChars <=
    500,
  );

  assert.ok(
    bounded.metrics.truncatedItems >
    0,
  );

  pass(
    "global item/character budgets bound context size and mark truncation",
  );

  const requested =
    await engine.assemble({
      interpretation,
      requestedCategories: [
        "policy",
      ],
    });

  assert.ok(
    requested.items.every(
      (entry) =>
        entry.category ===
        "policy",
    ),
  );

  assert.ok(
    requested.diagnostics.some(
      (diagnostic) =>
        diagnostic.status ===
        "skipped",
    ),
  );

  pass(
    "explicit category requests restrict retrieval at the source boundary",
  );

  assert.match(
    packet.systemText,
    /Missing context must not be invented/,
  );

  pass(
    "assembled context packet explicitly forbids inventing missing context",
  );

  console.log("");
  console.log(
    "OH-4K context engine verification complete.",
  );
}

void main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);