import {
  assessWorldStateEvidence,
} from "./assessment";
import {
  ChernobogWorldStateRegistry,
} from "./registry";
import type {
  WorldStateDiagnostics,
  WorldStateExplanation,
  WorldStateReadItem,
  WorldStateReadQuery,
  WorldStateReadResult,
} from "./queryTypes";
import type {
  WorldStateFreshnessStatus,
} from "./types";

function sortCountMap(
  values: Map<string, number>,
): Array<{
  key: string;
  count: number;
}> {
  return [...values.entries()]
    .sort(([left], [right]) =>
      left.localeCompare(right),
    )
    .map(([key, count]) => ({
      key,
      count,
    }));
}

function validateKeyQuery(
  query: WorldStateReadQuery,
): void {
  if (
    query.key &&
    (
      query.namespace ||
      query.keyPrefix ||
      query.freshness?.length ||
      query.minConfidence !== undefined
    )
  ) {
    throw new Error(
      "worldState read query key cannot be combined with filters.",
    );
  }
}

export class ChernobogWorldStateQueryService {
  private readonly registry:
    ChernobogWorldStateRegistry;

  private readonly clock: () => Date;

  constructor(
    registry: ChernobogWorldStateRegistry,
    clock: () => Date = () => new Date(),
  ) {
    this.registry = registry;
    this.clock = clock;
  }

  read(
    query: WorldStateReadQuery = {},
    source: WorldStateReadResult["source"] = "registry",
  ): WorldStateReadResult {
    validateKeyQuery(query);

    const now = this.clock();

    if (query.key) {
      const record =
        this.registry.get(query.key);

      const items: WorldStateReadItem[] =
        record
          ? [
              {
                record,
                assessment:
                  assessWorldStateEvidence(
                    record,
                    now,
                  ),
              },
            ]
          : [];

      return {
        generatedAt:
          now.toISOString(),
        source,
        count: items.length,
        items,
      };
    }

    const records =
      this.registry.list({
        namespace:
          query.namespace,
        keyPrefix:
          query.keyPrefix,
        freshness:
          query.freshness,
        minConfidence:
          query.minConfidence,
      });

    const items =
      records.map((record) => ({
        record,
        assessment:
          assessWorldStateEvidence(
            record,
            now,
          ),
      }));

    return {
      generatedAt:
        now.toISOString(),
      source,
      count: items.length,
      items,
    };
  }

  explain(
    key: string,
  ): WorldStateExplanation {
    const now = this.clock();
    const record =
      this.registry.get(key);

    if (!record) {
      return {
        generatedAt:
          now.toISOString(),
        key,
        found: false,
        evidence: [
          "No current World State record exists for this key.",
        ],
      };
    }

    const assessment =
      assessWorldStateEvidence(
        record,
        now,
      );

    const evidence = [
      `Observed at ${record.observedAt}.`,
      `Confidence ${record.confidence.toFixed(2)} (${assessment.confidenceBand}, basis: ${record.confidenceBasis}).`,
      `Freshness ${assessment.freshness.status} (basis: ${assessment.freshness.basis}).`,
      `Provenance ${assessment.provenanceStatus}.`,
    ];

    if (assessment.sourceSubsystem) {
      evidence.push(
        `Source subsystem: ${assessment.sourceSubsystem}.`,
      );
    }

    if (assessment.projectorId) {
      evidence.push(
        `Projector: ${assessment.projectorId}.`,
      );
    }

    if (assessment.eventId) {
      evidence.push(
        `Source event: ${assessment.eventId}.`,
      );
    }

    return {
      generatedAt:
        now.toISOString(),
      key,
      found: true,
      record,
      assessment,
      evidence,
    };
  }

  diagnostics(): WorldStateDiagnostics {
    const now = this.clock();
    const records =
      this.registry.list();

    const namespaces =
      new Map<string, number>();

    const freshness =
      new Map<
        WorldStateFreshnessStatus,
        number
      >();

    const confidence =
      new Map<
        "high" | "medium" | "low",
        number
      >();

    const provenance =
      new Map<
        "complete" | "partial" | "absent",
        number
      >();

    for (const record of records) {
      const assessment =
        assessWorldStateEvidence(
          record,
          now,
        );

      namespaces.set(
        record.namespace,
        (namespaces.get(
          record.namespace,
        ) ?? 0) + 1,
      );

      freshness.set(
        assessment.freshness.status,
        (freshness.get(
          assessment.freshness.status,
        ) ?? 0) + 1,
      );

      confidence.set(
        assessment.confidenceBand,
        (confidence.get(
          assessment.confidenceBand,
        ) ?? 0) + 1,
      );

      provenance.set(
        assessment.provenanceStatus,
        (provenance.get(
          assessment.provenanceStatus,
        ) ?? 0) + 1,
      );
    }

    return {
      generatedAt:
        now.toISOString(),
      totalRecords:
        records.length,
      namespaces:
        sortCountMap(
          namespaces,
        ).map((entry) => ({
          namespace:
            entry.key,
          records:
            entry.count,
        })),
      freshness:
        sortCountMap(
          freshness,
        ).map((entry) => ({
          status:
            entry.key as WorldStateFreshnessStatus,
          records:
            entry.count,
        })),
      confidence:
        sortCountMap(
          confidence,
        ).map((entry) => ({
          band:
            entry.key as
              | "high"
              | "medium"
              | "low",
          records:
            entry.count,
        })),
      provenance:
        sortCountMap(
          provenance,
        ).map((entry) => ({
          status:
            entry.key as
              | "complete"
              | "partial"
              | "absent",
          records:
            entry.count,
        })),
    };
  }
}
