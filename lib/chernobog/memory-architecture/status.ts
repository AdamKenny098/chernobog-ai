import {
  getUnifiedMemorySourceSnapshot,
} from "./sourceRegistry";
import {
  listUnifiedMemoryWritePolicies,
} from "./writePolicy";
import type {
  UnifiedMemorySourceId,
} from "./unifiedTypes";
import type {
  UnifiedMemoryWritePolicy,
} from "./writeTypes";

export type UnifiedMemoryStatusState =
  | "ready"
  | "degraded";

export interface UnifiedMemoryArchitectureStatus {
  status: UnifiedMemoryStatusState;
  checkedAt: string;
  sourceCount: number;
  sources: UnifiedMemorySourceId[];
  layers: string[];
  writePolicies: Array<{
    source: UnifiedMemorySourceId;
    policy: UnifiedMemoryWritePolicy;
  }>;
  policyCounts: Record<
    UnifiedMemoryWritePolicy,
    number
  >;
  retrieval: {
    unifiedReader: true;
    sourceFailureIsolation: true;
    vaultApprovedOnly: true;
  };
  persistence: {
    existingAuthoritiesRetained: true;
    parallelStoreCreated: false;
    vaultWritesStageAsRaw: true;
    learnedLessonsGenericWriteAllowed: false;
    personalIntelligenceGenericWriteAllowed: false;
  };
  context: {
    legacyBuilderPreserved: true;
    unifiedContextBuilder: true;
    factualAndLearnedRetrievalSeparated: true;
    learnedGuidanceAdvisory: true;
    learnedGuidanceMaxItems: 6;
  };
  invariants: [
    "existing-authorities-remain-authoritative",
    "vault-read-approved-only",
    "vault-write-raw-only",
    "learned-lessons-governed-only",
    "personal-intelligence-domain-owned",
    "learned-guidance-not-fact-or-authority",
    "memory-cannot-bypass-governance-or-tool-execution",
  ];
}

const EXPECTED_POLICIES:
  Record<
    UnifiedMemorySourceId,
    UnifiedMemoryWritePolicy
  > = {
  "conversation-history":
    "direct",
  "session-state":
    "direct",
  "durable-facts":
    "direct",
  "vault-structured-memory":
    "staged-raw",
  "project-memory-profile":
    "direct",
  "personal-intelligence":
    "domain-owned",
  "learned-lessons":
    "governed-only",
};

export function getUnifiedMemoryArchitectureStatus(
  options: {
    clock?: () => Date;
  } = {},
): UnifiedMemoryArchitectureStatus {
  const sourceSnapshot =
    getUnifiedMemorySourceSnapshot();

  const writePolicies =
    listUnifiedMemoryWritePolicies();

  const sourceIds =
    sourceSnapshot.sources
      .map(
        (source) =>
          source.id,
      )
      .sort();

  const policyIds =
    writePolicies
      .map(
        (policy) =>
          policy.source,
      )
      .sort();

  const policyCoverageOk =
    sourceIds.length ===
      policyIds.length &&
    sourceIds.every(
      (source, index) =>
        source ===
        policyIds[index],
    );

  const policySemanticsOk =
    writePolicies.every(
      (policy) =>
        EXPECTED_POLICIES[
          policy.source
        ] ===
        policy.policy,
    );

  const layersOk =
    [
      "short_term",
      "working",
      "long_term",
      "learned",
    ].every(
      (layer) =>
        sourceSnapshot.layers.includes(
          layer as never,
        ),
    );

  const ready =
    sourceSnapshot.sourceCount ===
      7 &&
    policyCoverageOk &&
    policySemanticsOk &&
    layersOk;

  const policyCounts:
    Record<
      UnifiedMemoryWritePolicy,
      number
    > = {
    direct: 0,
    "staged-raw": 0,
    "governed-only": 0,
    "domain-owned": 0,
  };

  for (
    const policy
    of writePolicies
  ) {
    policyCounts[
      policy.policy
    ] += 1;
  }

  return {
    status:
      ready
        ? "ready"
        : "degraded",
    checkedAt:
      (
        options.clock ??
        (() => new Date())
      )().toISOString(),
    sourceCount:
      sourceSnapshot.sourceCount,
    sources:
      sourceIds,
    layers:
      [...sourceSnapshot.layers],
    writePolicies:
      writePolicies.map(
        (policy) => ({
          source:
            policy.source,
          policy:
            policy.policy,
        }),
      ),
    policyCounts,
    retrieval: {
      unifiedReader: true,
      sourceFailureIsolation:
        true,
      vaultApprovedOnly:
        true,
    },
    persistence: {
      existingAuthoritiesRetained:
        true,
      parallelStoreCreated:
        false,
      vaultWritesStageAsRaw:
        true,
      learnedLessonsGenericWriteAllowed:
        false,
      personalIntelligenceGenericWriteAllowed:
        false,
    },
    context: {
      legacyBuilderPreserved:
        true,
      unifiedContextBuilder:
        true,
      factualAndLearnedRetrievalSeparated:
        true,
      learnedGuidanceAdvisory:
        true,
      learnedGuidanceMaxItems:
        6,
    },
    invariants: [
      "existing-authorities-remain-authoritative",
      "vault-read-approved-only",
      "vault-write-raw-only",
      "learned-lessons-governed-only",
      "personal-intelligence-domain-owned",
      "learned-guidance-not-fact-or-authority",
      "memory-cannot-bypass-governance-or-tool-execution",
    ],
  };
}
