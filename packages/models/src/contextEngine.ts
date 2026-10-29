import path from "node:path";
import { defaultOH5BDatabasePath } from "../../vault/src/oh5/store";
import { retrieveOH5Hybrid } from "../../vault/src/oh5/hybridRetrieval";
import {
  buildChernobogWorldModelContext,
} from "../../../lib/chernobog/pipeline/worldModelContext";
import {
  buildChernobogWorldStateContext,
} from "../../../lib/chernobog/pipeline/worldStateContext";
import type {
  InputInterpretation,
} from "./inputInterpreter";

export type ContextCategory =
  | "project-state"
  | "memory"
  | "file"
  | "recent-decision"
  | "tool-state"
  | "policy"
  | "world-state"
  | "world-model"
  | "other";

export type ContextFreshness =
  | "live"
  | "fresh"
  | "aging"
  | "stale"
  | "historical"
  | "unknown";

export interface ContextProvenance {
  sourceId: string;
  sourceType: string;

  reference?: string;
  eventId?: string;
  filePath?: string;
  recordKey?: string;

  retrievedAt: string;
}

export interface ContextItem {
  id: string;
  category: ContextCategory;

  title: string;
  content: string;

  provenance: ContextProvenance;

  observedAt?: string;
  freshness: ContextFreshness;
  confidence: number;

  sensitive: boolean;

  relevanceTags: string[];
  metadata?: Record<
    string,
    unknown
  >;
}

export interface ContextSourceRequest {
  interpretation: InputInterpretation;

  projectId?: string;
  /** PSI 1D: enforce source and item project boundaries (opt-in for existing callers). */
  strictProjectIsolation?: boolean;
  requestedCategories?: ContextCategory[];
  requestedSourceIds?: string[];

  maxItems?: number;
  maxChars?: number;
}

export interface ContextSource {
  id: string;
  /** Only audited sources may declare project-scoped or globally safe retrieval. */
  isolationScope?: "project" | "global";
  categories: ContextCategory[];

  retrieve(
    request: ContextSourceRequest,
  ):
    Promise<ContextItem[]>
    | ContextItem[];
}

export interface ContextSourceDiagnostic {
  sourceId: string;

  status:
    | "queried"
    | "skipped"
    | "failed";

  itemCount: number;
  reason: string;
}

export interface SelectedContextItem
  extends ContextItem {
  relevance: number;
  relevanceReasons: string[];

  originalChars: number;
  includedChars: number;
  truncated: boolean;
}

export interface ContextPacket {
  generatedAt: string;

  items: SelectedContextItem[];

  systemText: string;

  diagnostics:
    ContextSourceDiagnostic[];

  metrics: {
    retrievedItems: number;
    selectedItems: number;
    excludedItems: number;

    originalChars: number;
    includedChars: number;

    truncatedItems: number;
    totalSources: number;
    queriedSources: number;
    failedSources: number;
  };
}

export interface ContextEngineOptions {
  defaultMaxItems?: number;
  defaultMaxChars?: number;
  maxItemChars?: number;
  minimumRelevance?: number;
}

function requireText(
  value: string,
  field: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function clamp01(
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function normalizeStringList(
  values:
    readonly string[]
    | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map(
          (value) =>
            value
              .trim()
              .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizedItem(
  source:
    ContextSource,
  item:
    ContextItem,
): ContextItem {
  const category =
    item.category;

  if (
    !source.categories.includes(
      category,
    )
  ) {
    throw new Error(
      `Context source ${source.id} returned unsupported category ${category}.`,
    );
  }

  return {
    ...structuredClone(
      item,
    ),
    id:
      requireText(
        item.id,
        "context item id",
      ),
    category,
    title:
      requireText(
        item.title,
        "context item title",
      ),
    content:
      requireText(
        item.content,
        "context item content",
      ),
    provenance: {
      ...structuredClone(
        item.provenance,
      ),
      sourceId:
        requireText(
          item.provenance
            .sourceId,
          "context provenance sourceId",
        ),
      sourceType:
        requireText(
          item.provenance
            .sourceType,
          "context provenance sourceType",
        ),
      retrievedAt:
        new Date(
          item.provenance
            .retrievedAt,
        ).toISOString(),
    },
    confidence:
      clamp01(
        item.confidence,
      ),
    sensitive:
      item.sensitive ===
      true,
    relevanceTags:
      normalizeStringList(
        item.relevanceTags,
      ),
  };
}

const CONTEXT_RELEVANCE_STOP_WORDS =
  new Set([
    // OH4K_RELEVANCE_STOP_WORDS_V1
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "here",
    "him",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "she",
    "should",
    "so",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "to",
    "too",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
  ]);

function tokenize(
  value: string,
): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9_.-]+/g,
        " ",
      )
      .split(
        /\s+/,
      )
      .map(
        (token) =>
          token.trim(),
      )
      .filter(
        (token) =>
          token.length >=
            3 &&
          !CONTEXT_RELEVANCE_STOP_WORDS.has(
            token,
          ),
      ),
  );
}

function lexicalOverlap(
  item:
    ContextItem,
  interpretation:
    InputInterpretation,
): number {
  const taskTokens =
    tokenize(
      [
        interpretation
          .normalizedText,
        interpretation
          .goal.summary,
        interpretation
          .desiredOutcome.summary,
        interpretation
          .constraints
          .map(
            (constraint) =>
              constraint.text,
          )
          .join(" "),
        interpretation
          .taskIntelligence
          .primaryDomain
          .value,
        ...interpretation
          .taskIntelligence
          .secondaryDomains,
        ...(
          interpretation
            .taskSignals
            .requiredTools ??
          []
        ),
      ].join(" "),
    );

  const itemTokens =
    tokenize(
      [
        item.title,
        item.content.slice(
          0,
          2_000,
        ),
        ...item
          .relevanceTags,
      ].join(" "),
    );

  if (
    taskTokens.size ===
      0 ||
    itemTokens.size ===
      0
  ) {
    return 0;
  }

  let overlap =
    0;

  for (
    const token
    of taskTokens
  ) {
    if (
      itemTokens.has(
        token,
      )
    ) {
      overlap += 1;
    }
  }

  return Math.min(
    1,
    overlap /
      Math.max(
        3,
        Math.min(
          taskTokens.size,
          12,
        ),
      ),
  );
}

function freshnessScore(
  freshness:
    ContextFreshness,
): number {
  switch (
    freshness
  ) {
    case "live":
      return 1;
    case "fresh":
      return 0.9;
    case "aging":
      return 0.65;
    case "historical":
      return 0.45;
    case "stale":
      return 0.25;
    case "unknown":
    default:
      return 0.4;
  }
}

function categoryNeedScore(
  category:
    ContextCategory,
  interpretation:
    InputInterpretation,
): {
  score: number;
  reasons: string[];
} {
  const reasons:
    string[] =
      [];

  const intent =
    interpretation
      .intent.kind;

  const domain =
    interpretation
      .taskIntelligence
      .primaryDomain
      .value;

  const secondary =
    new Set(
      interpretation
        .taskIntelligence
        .secondaryDomains,
    );

  const tools =
    new Set(
      interpretation
        .taskSignals
        .requiredTools ??
        [],
    );

  let score =
    0.2;

  switch (
    category
  ) {
    case "memory":
      if (
        intent ===
          "recall" ||
        intent ===
          "continue" ||
        intent ===
          "remember"
      ) {
        score =
          1;
        reasons.push(
          "intent requires continuity or memory",
        );
      } else if (
        domain ===
          "personal-assistance"
      ) {
        score =
          0.75;
        reasons.push(
          "personal-assistance commonly needs user context",
        );
      }
      break;

    case "project-state":
      if (
        [
          "planning",
          "coding",
          "system-operations",
          "creative",
        ].includes(
          domain,
        )
      ) {
        score =
          0.85;
        reasons.push(
          "primary domain depends on active project state",
        );
      }
      break;

    case "file":
      if (
        tools.has(
          "files",
        ) ||
        domain ===
          "coding" ||
        domain ===
          "research"
      ) {
        score =
          0.95;
        reasons.push(
          "task signals require file-backed evidence",
        );
      }
      break;

    case "recent-decision":
      if (
        intent ===
          "continue" ||
        domain ===
          "planning" ||
        domain ===
          "coding"
      ) {
        score =
          0.8;
        reasons.push(
          "task may depend on recent decisions or continuation state",
        );
      }
      break;

    case "tool-state":
      if (
        interpretation
          .taskIntelligence
          .derived
          .toolUseRequired ||
        domain ===
          "system-operations"
      ) {
        score =
          0.95;
        reasons.push(
          "task requires tools or operational state",
        );
      }
      break;

    case "policy":
      if (
        intent ===
          "execute" ||
        interpretation
          .taskIntelligence
          .derived
          .highRiskIncorrectness ||
        interpretation
          .taskIntelligence
          .privacySensitivity
          .value ===
          "sensitive" ||
        interpretation
          .taskIntelligence
          .privacySensitivity
          .value ===
          "highly-sensitive"
      ) {
        score =
          0.95;
        reasons.push(
          "execution/risk/privacy requires applicable policy context",
        );
      } else {
        score =
          0.55;
        reasons.push(
          "policy context may constrain cognitive work",
        );
      }
      break;

    case "world-state":
      if (
        domain ===
          "system-operations" ||
        tools.has(
          "runtime",
        )
      ) {
        score =
          0.9;
        reasons.push(
          "task requires current runtime/system state",
        );
      }
      break;

    case "world-model":
      if (
        domain ===
          "planning" ||
        domain ===
          "system-operations" ||
        secondary.has(
          "planning",
        )
      ) {
        score =
          0.7;
        reasons.push(
          "dependency/impact context may improve reasoning",
        );
      }
      break;

    case "other":
    default:
      score =
        0.25;
      break;
  }

  return {
    score,
    reasons,
  };
}

function scoreItem(
  item:
    ContextItem,
  interpretation:
    InputInterpretation,
  explicitlyRequested:
    boolean,
): {
  score: number;
  reasons: string[];
} {
  const category =
    categoryNeedScore(
      item.category,
      interpretation,
    );

  const lexical =
    lexicalOverlap(
      item,
      interpretation,
    );

  const freshness =
    freshnessScore(
      item.freshness,
    );

  const explicitBoost =
    explicitlyRequested
      ? 0.2
      : 0;

  let score =
    clamp01(
      category.score *
        0.45 +
      lexical *
        0.25 +
      freshness *
        0.15 +
      item.confidence *
        0.15 +
      explicitBoost,
    );

  const contentBoundCategories =
    new Set<ContextCategory>([
      "project-state",
      "memory",
      "file",
      "recent-decision",
      "other",
    ]);

  /*
   * Category relevance alone is not enough for content-heavy sources.
   *
   * Example:
   * a coding task may need files, but that must not make every available
   * file relevant. Without topical overlap, a file/memory/project item is
   * capped below the default selection threshold unless the caller
   * explicitly requested that source/category.
   */
  if (
    !explicitlyRequested &&
    lexical === 0 &&
    contentBoundCategories.has(
      item.category,
    )
  ) {
    score =
      Math.min(
        score,
        0.3,
      );
  }

  const reasons = [
    ...category.reasons,
    `categoryNeed=${category.score.toFixed(
      2,
    )}`,
    `lexicalOverlap=${lexical.toFixed(
      2,
    )}`,
    `freshness=${item.freshness}`,
    `confidence=${item.confidence.toFixed(
      2,
    )}`,
  ];

  if (
    explicitlyRequested
  ) {
    reasons.push(
      "source/category explicitly requested",
    );
  }

  if (
    !explicitlyRequested &&
    lexical === 0 &&
    contentBoundCategories.has(
      item.category,
    )
  ) {
    reasons.push(
      "content-heavy context had zero topical overlap and was capped below automatic selection threshold",
    );
  }

  return {
    score,
    reasons,
  };
}

function clippedContent(
  content: string,
  limit: number,
): {
  content: string;
  truncated: boolean;
} {
  if (
    content.length <=
    limit
  ) {
    return {
      content,
      truncated:
        false,
    };
  }

  const marker =
    "\n\n[context item truncated]\n\n";

  const available =
    Math.max(
      0,
      limit -
        marker.length,
    );

  const head =
    Math.ceil(
      available *
      0.75,
    );

  const tail =
    Math.max(
      0,
      available -
        head,
    );

  return {
    content: [
      content.slice(
        0,
        head,
      ),
      marker,
      tail > 0
        ? content.slice(
            -tail,
          )
        : "",
    ].join(""),
    truncated:
      true,
  };
}

function formatSelectedItem(
  item:
    SelectedContextItem,
): string {
  return [
    `## CONTEXT ITEM: ${item.title}`,
    `id=${item.id}`,
    `category=${item.category}`,
    `source=${item.provenance.sourceId}`,
    `freshness=${item.freshness}`,
    `confidence=${item.confidence.toFixed(
      2,
    )}`,
    `relevance=${item.relevance.toFixed(
      2,
    )}`,
    `sensitive=${String(
      item.sensitive,
    )}`,
    `reference=${item.provenance.reference ?? "none"}`,
    "",
    item.content,
  ].join("\n");
}

/*
 * OH4K_EXPLICIT_BUDGET_AUTHORITY_V1
 *
 * Caller-supplied context budgets are authoritative.
 * The engine may enforce a positive integer floor, but it must not
 * silently increase an explicit maxChars or maxItemChars value.
 */
export class ContextEngine {
  private readonly sources =
    new Map<
      string,
      ContextSource
    >();

  private readonly defaultMaxItems:
    number;

  private readonly defaultMaxChars:
    number;

  private readonly maxItemChars:
    number;

  private readonly minimumRelevance:
    number;

  constructor(
    options:
      ContextEngineOptions = {},
  ) {
    this.defaultMaxItems =
      Math.max(
        1,
        Math.trunc(
          options
            .defaultMaxItems ??
          24,
        ),
      );

    this.defaultMaxChars =
      Math.max(
        1,
        Math.trunc(
          options
            .defaultMaxChars ??
          24_000,
        ),
      );

    this.maxItemChars =
      Math.max(
        1,
        Math.trunc(
          options
            .maxItemChars ??
          8_000,
        ),
      );

    this.minimumRelevance =
      clamp01(
        options
          .minimumRelevance ??
        0.35,
      );
  }

  registerSource(
    source:
      ContextSource,
  ): void {
    const id =
      requireText(
        source.id,
        "context source id",
      );

    if (
      source.categories
        .length ===
      0
    ) {
      throw new Error(
        `Context source ${id} must declare at least one category.`,
      );
    }

    if (
      this.sources.has(
        id,
      )
    ) {
      throw new Error(
        `Context source is already registered: ${id}`,
      );
    }

    this.sources.set(
      id,
      source,
    );
  }

  upsertSource(
    source:
      ContextSource,
  ): void {
    const id =
      requireText(
        source.id,
        "context source id",
      );

    if (
      source.categories
        .length ===
      0
    ) {
      throw new Error(
        `Context source ${id} must declare at least one category.`,
      );
    }

    this.sources.set(
      id,
      source,
    );
  }

  removeSource(
    id: string,
  ): boolean {
    return this.sources.delete(
      id.trim(),
    );
  }

  listSources(): Array<{
    id: string;
    categories: ContextCategory[];
  }> {
    return [
      ...this.sources.values(),
    ]
      .map(
        (source) => ({
          id:
            source.id,
          categories: [
            ...source
              .categories,
          ],
        }),
      )
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      );
  }

  async assemble(
    request:
      ContextSourceRequest,
  ): Promise<ContextPacket> {
    const diagnostics:
      ContextSourceDiagnostic[] =
        [];

    const retrieved:
      ContextItem[] =
        [];

    const requestedCategories =
      new Set(
        request.requestedCategories ??
        [],
      );

    const requestedSourceIds =
      new Set(
        request.requestedSourceIds ??
        [],
      );

    const candidateSources =
      [
        ...this.sources.values(),
      ];

    for (
      const source
      of candidateSources
    ) {
      if (
        requestedSourceIds.size >
          0 &&
        !requestedSourceIds.has(
          source.id,
        )
      ) {
        diagnostics.push({
          sourceId:
            source.id,
          status:
            "skipped",
          itemCount:
            0,
          reason:
            "not explicitly requested",
        });
        continue;
      }

      if (
        requestedCategories.size >
          0 &&
        !source.categories.some(
          (category) =>
            requestedCategories.has(
              category,
            ),
        )
      ) {
        diagnostics.push({
          sourceId:
            source.id,
          status:
            "skipped",
          itemCount:
            0,
          reason:
            "source categories not requested",
        });
        continue;
      }

      // PSI 1D: unknown sources are not trusted for strict retrieval.
      if (request.strictProjectIsolation && (
        !source.isolationScope ||
        (source.isolationScope === "project" && !request.projectId?.trim())
      )) {
        diagnostics.push({ sourceId: source.id, status: "skipped", itemCount: 0, reason: "PSI 1D: source has no authorised scope or project is unresolved" });
        continue;
      }

      try {
        const items =
          await source.retrieve(
            request,
          );

        const normalized =
          items.map(
            (item) =>
              normalizedItem(
                source,
                item,
              ),
          );

        // Fail closed: project sources must label every returned item.
        // Global sources must not return sensitive or project-tagged items.
        const authorised = request.strictProjectIsolation
          ? normalized.filter((item) => {
              const scope = item.metadata?.projectId;
              if (source.isolationScope === "global") return item.sensitive === false && scope === undefined;
              return typeof scope === "string" && scope === request.projectId;
            })
          : normalized;
        retrieved.push(
          ...authorised,
        );

        diagnostics.push({
          sourceId:
            source.id,
          status:
            "queried",
          itemCount:
            authorised.length,
          reason:
            request.strictProjectIsolation && authorised.length !== normalized.length
              ? "PSI 1D: retrieval completed; unscoped or foreign items excluded"
              : "retrieval completed",
        });
      } catch (error) {
        diagnostics.push({
          sourceId:
            source.id,
          status:
            "failed",
          itemCount:
            0,
          reason:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    const deduplicated =
      new Map<
        string,
        ContextItem
      >();

    for (
      const item
      of retrieved
    ) {
      const key =
        [
          item.category,
          item.provenance
            .sourceId,
          item.provenance
            .reference ??
            "",
          item.id,
        ].join("|");

      const existing =
        deduplicated.get(
          key,
        );

      if (
        !existing ||
        item.confidence >
          existing.confidence
      ) {
        deduplicated.set(
          key,
          item,
        );
      }
    }

    const contentBoundCategories =
      new Set<ContextCategory>([
        "project-state",
        "memory",
        "file",
        "recent-decision",
        "other",
      ]);

    const scored =
      [
        ...deduplicated.values(),
      ]
        .map(
          (item) => {
            const explicit =
              requestedCategories.has(
                item.category,
              ) ||
              requestedSourceIds.has(
                item.provenance
                  .sourceId,
              );

            const hybridRelevance = item.provenance.sourceId === "oh5-governed-memory" &&
              item.metadata?.projectId === request.projectId &&
              typeof item.metadata?.oh5HybridScore === "number" &&
              Number.isFinite(item.metadata.oh5HybridScore) &&
              item.metadata.oh5HybridScore >= 0.42;
            const topicalOverlap = hybridRelevance ? 1 :
              lexicalOverlap(
                item,
                request
                  .interpretation,
              );

            const baseScore =
              scoreItem(
                item,
                request
                  .interpretation,
                explicit,
              );

            const score = hybridRelevance ?
              {score:Math.max(baseScore.score,Math.min(0.95,item.metadata!.oh5HybridScore as number)),
               reasons:[...baseScore.reasons,"PSI 2C: scoped hybrid memory relevance"]} : baseScore;
            return {
              item,
              explicit,
              topicalOverlap,
              ...score,
            };
          },
        )
        .filter(
          (entry) => {
            if (
              !entry.explicit &&
              contentBoundCategories.has(
                entry.item.category,
              ) &&
              entry.topicalOverlap === 0
            ) {
              return false;
            }

            return (
              entry.score >=
              this.minimumRelevance
            );
          },
        )
        .sort(
          (left, right) => {
            if (
              left.score !==
              right.score
            ) {
              return (
                right.score -
                left.score
              );
            }

            if (
              left.item
                .confidence !==
              right.item
                .confidence
            ) {
              return (
                right.item
                  .confidence -
                left.item
                  .confidence
              );
            }

            return left.item.id
              .localeCompare(
                right.item.id,
              );
          },
        );

    const maxItems =
      Math.max(
        1,
        Math.trunc(
          request.maxItems ??
          this.defaultMaxItems,
        ),
      );

    const maxChars =
      Math.max(
        1,
        Math.trunc(
          request.maxChars ??
          this.defaultMaxChars,
        ),
      );

    const selected:
      SelectedContextItem[] =
        [];

    let remainingChars =
      maxChars;

    for (
      const entry
      of scored
    ) {
      if (
        selected.length >=
          maxItems ||
        remainingChars <=
          0
      ) {
        break;
      }

      const itemLimit =
        Math.min(
          this.maxItemChars,
          remainingChars,
        );

      const clipped =
        clippedContent(
          entry.item.content,
          itemLimit,
        );

      selected.push({
        ...structuredClone(
          entry.item,
        ),
        content:
          clipped.content,
        relevance:
          entry.score,
        relevanceReasons:
          entry.reasons,
        originalChars:
          entry.item
            .content.length,
        includedChars:
          clipped.content
            .length,
        truncated:
          clipped.truncated,
      });

      remainingChars -=
        clipped.content
          .length;
    }

    const systemText =
      [
        "CHERNOBOG TASK CONTEXT PACKET",
        "Only the selected context below should be treated as retrieved task context.",
        "Preserve provenance, freshness, confidence, and sensitivity distinctions.",
        "Missing context must not be invented.",
        "",
        ...selected.map(
          formatSelectedItem,
        ),
      ].join("\n\n");

    const originalChars =
      retrieved.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.content.length,
        0,
      );

    const includedChars =
      selected.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.includedChars,
        0,
      );

    return {
      generatedAt:
        new Date()
          .toISOString(),
      items:
        selected,
      systemText,
      diagnostics,
      metrics: {
        retrievedItems:
          retrieved.length,
        selectedItems:
          selected.length,
        excludedItems:
          Math.max(
            0,
            deduplicated
              .size -
            selected.length,
          ),
        originalChars,
        includedChars,
        truncatedItems:
          selected.filter(
            (item) =>
              item.truncated,
          ).length,
        totalSources:
          candidateSources
            .length,
        queriedSources:
          diagnostics.filter(
            (diagnostic) =>
              diagnostic.status ===
              "queried",
          ).length,
        failedSources:
          diagnostics.filter(
            (diagnostic) =>
              diagnostic.status ===
              "failed",
          ).length,
      },
    };
  }
}

function runtimeWorldStateSource():
  ContextSource {
  return {
    id:
      "runtime-world-state",
    categories: [
      "world-state",
      "tool-state",
      "project-state",
    ],
    async retrieve(
      request,
    ) {
      const context =
        await buildChernobogWorldStateContext({
          projectId:
            request.projectId,
        });

      if (
        context.status ===
          "empty"
      ) {
        return [];
      }

      return [
        {
          id:
            "runtime-world-state",
          category:
            "world-state",
          title:
            "Canonical Runtime World State",
          content:
            context.systemText,
          provenance: {
            sourceId:
              "runtime-world-state",
            sourceType:
              "chernobog-world-state",
            reference:
              "11G",
            retrievedAt:
              new Date()
                .toISOString(),
          },
          freshness:
            context.status ===
            "available"
              ? "live"
              : "unknown",
          confidence:
            context.status ===
            "available"
              ? 0.95
              : 0.2,
          sensitive:
            true,
          relevanceTags: [
            "runtime",
            "system",
            "project",
            "state",
          ],
          metadata: {
            status:
              context.status,
            count:
              context.count,
            keys:
              context.keys,
          },
        },
      ];
    },
  };
}

function runtimeWorldModelSource():
  ContextSource {
  return {
    id:
      "runtime-world-model",
    categories: [
      "world-model",
    ],
    async retrieve() {
      const context =
        await buildChernobogWorldModelContext();

      if (
        context.status ===
          "empty"
      ) {
        return [];
      }

      return [
        {
          id:
            "runtime-world-model",
          category:
            "world-model",
          title:
            "Canonical World Model",
          content:
            context.systemText,
          provenance: {
            sourceId:
              "runtime-world-model",
            sourceType:
              "chernobog-world-model",
            reference:
              "11J",
            retrievedAt:
              new Date()
                .toISOString(),
          },
          freshness:
            context.status ===
            "available"
              ? "fresh"
              : "unknown",
          confidence:
            context.status ===
            "available"
              ? 0.9
              : 0.2,
          sensitive:
            true,
          relevanceTags: [
            "dependencies",
            "relationships",
            "impact",
            "predictions",
            "planning",
          ],
          metadata: {
            status:
              context.status,
            entityCount:
              context.entityCount,
            relationshipCount:
              context.relationshipCount,
            predictionCount:
              context.predictionCount,
            causalHypothesisCount:
              context
                .causalHypothesisCount,
          },
        },
      ];
    },
  };
}

/**
 * OH-5 PSI 1E: governed confirmed memory is available as read-only context.
 * Retrieval fails closed without a project ID; the store is opened and closed
 * for each retrieval, following the existing OH-5 API lifecycle.
 */
/** PSI 2C: one source for lexical and semantic confirmed-memory evidence.
 * A memory item is never trusted unless its project ID matches request.projectId.
 */
function governedOH5MemorySource(): ContextSource {
  return {
    id: "oh5-governed-memory",
    isolationScope: "project",
    categories: ["memory"],
    async retrieve(request) {
      const projectId=request.projectId?.trim();
      if(!projectId) return [];
      const query=request.interpretation.normalizedText?.trim();
      if(!query || query.length<2) return [];
      const records=await retrieveOH5Hybrid(defaultOH5BDatabasePath(),
        path.join(process.cwd(),".chernobog","runtime","oh5","psi2b-vectors.sqlite"),
        {projectId,query:query.slice(0,300),limit:20});
      const retrievedAt=new Date().toISOString();
      return records.map((record):ContextItem=>{
        if(record.projectId!==projectId) throw new Error("OH5 project isolation violation");
        return {
          id:`oh5-memory:${record.id}`,category:"memory",
          title:`Confirmed project memory: ${record.id}`,
          content:record.body,
          provenance:{sourceId:"oh5-governed-memory",sourceType:"oh5-confirmed-memory",
            reference:record.sourceRef,recordKey:record.id,retrievedAt},
          observedAt:record.updatedAt,freshness:"historical",confidence:0.95,
          sensitive:true,relevanceTags:["memory","confirmed"],
          metadata:{projectId:record.projectId,memoryId:record.id,revision:record.revision,
            tier:"confirmed",channel:record.channel,oh5HybridScore:record.score,
            retrievalMode:record.retrievalMode},
        };
      });
    },
  };
}
const defaultContextEngine =
  new ContextEngine();

defaultContextEngine.registerSource(
  runtimeWorldStateSource(),
);

defaultContextEngine.registerSource(
  runtimeWorldModelSource(),
);

defaultContextEngine.registerSource(
  governedOH5MemorySource(),
);
export function getContextEngine():
  ContextEngine {
  return defaultContextEngine;
}