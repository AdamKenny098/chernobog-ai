import {
  isDependencyRelationship,
} from "./dependencyModel";
import {
  getChernobogWorldModelRuntime,
} from "./runtimeSingleton";
import type {
  WorldModelImpactAssessment,
} from "./causalTypes";
import type {
  WorldModelStatePrediction,
} from "./predictionTypes";
import type {
  WorldModelRelationship,
} from "./types";

const NO_RELATIONAL_EVIDENCE =
  "World Model is not currently providing substantive Chernobog relational evidence.";

const NO_SUPPORTED_PREDICTIONS =
  "No supported predictions.";

const DEPENDENCY_TYPES =
  new Set([
    "depends-on",
    "uses-repository",
    "requires-model",
    "hosted-on",
    "served-by",
    "backed-by",
  ]);

const ENTITY_PATTERN =
  /(?:model-role|model):[A-Za-z0-9_.:-]+/g;

export type WorldModelResponseValidationIssueCode =
  | "reversed-dependency"
  | "invented-dependency"
  | "dependency-section-nondependency"
  | "missing-canonical-dependency"
  | "invalid-consequence"
  | "missing-impact-path"
  | "unsupported-prediction"
  | "relational-fallback-contradiction"
  | "missing-model-contradiction";

export interface WorldModelResponseValidationIssue {
  code:
    WorldModelResponseValidationIssueCode;
  message: string;
}

export interface GroundedWorldModelResponseEvidence {
  dependencyRelationships:
    WorldModelRelationship[];
  supportedPredictions:
    WorldModelStatePrediction[];
  impacts:
    WorldModelImpactAssessment[];
}

export interface WorldModelResponseValidationResult {
  applies: boolean;
  valid: boolean;
  issues:
    WorldModelResponseValidationIssue[];
  canonicalEvidenceText: string;
  fallbackText: string;
}

interface ParsedRelationshipClaim {
  fromEntityId: string;
  type: string;
  toEntityId: string;
}

function normalizeEntityId(
  value: string,
): string {
  return value
    .replace(/\\:/g, ":")
    .replace(/[`*_]/g, "")
    .replace(/[),.;]+$/g, "")
    .trim()
    .toLowerCase();
}

function cleanLine(
  line: string,
): string {
  return line
    .replace(/\\:/g, ":")
    .replace(/[`*_]/g, "")
    .replace(/^\s*[-*]\s*/, "")
    .trim();
}

function sectionText(
  response: string,
  heading: string,
  nextHeadings: string[],
): string {
  const normalized =
    response.replace(/\r\n/g, "\n");

  const startPattern =
    new RegExp(
      `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${heading}(?:\\*\\*)?\\s*(?:\\n|$)`,
      "i",
    );

  const start =
    startPattern.exec(normalized);

  if (!start) {
    return "";
  }

  const contentStart =
    start.index + start[0].length;

  let contentEnd =
    normalized.length;

  for (const next of nextHeadings) {
    const pattern =
      new RegExp(
        `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${next}(?:\\*\\*)?\\s*(?:\\n|$)`,
        "i",
      );

    pattern.lastIndex =
      contentStart;

    const tail =
      normalized.slice(contentStart);

    const match =
      pattern.exec(tail);

    if (match) {
      contentEnd =
        Math.min(
          contentEnd,
          contentStart + match.index,
        );
    }
  }

  return normalized
    .slice(
      contentStart,
      contentEnd,
    )
    .trim();
}

function parseStructuredRelationships(
  response: string,
): ParsedRelationshipClaim[] {
  const claims:
    ParsedRelationshipClaim[] = [];

  let fromEntityId: string | null =
    null;
  let type: string | null =
    null;

  for (
    const rawLine
    of response.split(/\r?\n/)
  ) {
    const line =
      cleanLine(rawLine);

    const source =
      line.match(
        /^source(?:\s+entity)?\s*:\s*((?:model-role|model):[A-Za-z0-9_.:-]+)/i,
      );

    if (source) {
      fromEntityId =
        normalizeEntityId(source[1]);
      continue;
    }

    const relationship =
      line.match(
        /^relationship(?:\s+type)?\s*:\s*([a-z][a-z0-9-]+)/i,
      );

    if (relationship) {
      type =
        relationship[1]
          .toLowerCase();
      continue;
    }

    const target =
      line.match(
        /^target(?:\s+entity)?\s*:\s*((?:model-role|model):[A-Za-z0-9_.:-]+)/i,
      );

    if (
      target &&
      fromEntityId &&
      type
    ) {
      claims.push({
        fromEntityId,
        type,
        toEntityId:
          normalizeEntityId(
            target[1],
          ),
      });

      fromEntityId = null;
      type = null;
    }
  }

  return claims;
}

function parseArrowRelationships(
  response: string,
): ParsedRelationshipClaim[] {
  const normalized =
    response.replace(/\\:/g, ":");

  const claims:
    ParsedRelationshipClaim[] = [];

  const pattern =
    /((?:model-role|model):[A-Za-z0-9_.:-]+)\s*(?:--|→|-)?\s*(depends-on|uses-repository|requires-model|hosted-on|served-by|backed-by)\s*(?:--?>|→|-)?\s*((?:model-role|model):[A-Za-z0-9_.:-]+)/gi;

  for (
    const match
    of normalized.matchAll(pattern)
  ) {
    claims.push({
      fromEntityId:
        normalizeEntityId(match[1]),
      type:
        match[2].toLowerCase(),
      toEntityId:
        normalizeEntityId(match[3]),
    });
  }

  return claims;
}

function relationshipKey(
  relationship: {
    fromEntityId: string;
    type: string;
    toEntityId: string;
  },
): string {
  return [
    normalizeEntityId(
      relationship.fromEntityId,
    ),
    relationship.type
      .trim()
      .toLowerCase(),
    normalizeEntityId(
      relationship.toEntityId,
    ),
  ].join("|");
}

function canonicalRelationshipSets(
  relationships:
    WorldModelRelationship[],
): {
  exact: Set<string>;
  reverse: Set<string>;
} {
  const exact =
    new Set<string>();

  const reverse =
    new Set<string>();

  for (
    const relationship
    of relationships
  ) {
    exact.add(
      relationshipKey(
        relationship,
      ),
    );

    reverse.add(
      relationshipKey({
        fromEntityId:
          relationship.toEntityId,
        type:
          relationship.type,
        toEntityId:
          relationship.fromEntityId,
      }),
    );
  }

  return {
    exact,
    reverse,
  };
}

function userRequestsCompleteDependencyAudit(
  userMessage: string,
): boolean {
  return (
    /list\s+all\s+explicit\s+dependency/i.test(
      userMessage,
    ) ||
    /all\s+explicit\s+dependency\s+paths/i.test(
      userMessage,
    ) ||
    /model-role\s*(?:→|->).*(?:model|provider)/i.test(
      userMessage,
    )
  );
}

function parsedDependencyClaimKeys(
  response: string,
): Set<string> {
  return new Set(
    [
      ...parseStructuredRelationships(
        response,
      ),
      ...parseArrowRelationships(
        response,
      ),
    ]
      .filter(
        (claim) =>
          DEPENDENCY_TYPES.has(
            claim.type,
          ),
      )
      .map(
        relationshipKey,
      ),
  );
}

function extractConsequenceBlocks(
  response: string,
): Array<{
  sourceEntityId: string;
  text: string;
}> {
  const consequences =
    sectionText(
      response,
      "CONSEQUENCES",
      [
        "PREDICTIONS",
        "MISSING MODEL",
        "CONCLUSION",
      ],
    );

  if (!consequences) {
    return [];
  }

  const lines =
    consequences.split(/\r?\n/);

  const blocks:
    Array<{
      sourceEntityId: string;
      text: string;
    }> = [];

  let current:
    {
      sourceEntityId: string;
      lines: string[];
    }
    | null = null;

  const flush = (): void => {
    if (!current) {
      return;
    }

    blocks.push({
      sourceEntityId:
        current.sourceEntityId,
      text:
        current.lines.join("\n"),
    });

    current = null;
  };

  for (const rawLine of lines) {
    const line =
      cleanLine(rawLine);

    const source =
      line.match(
        /(?:if\s+)?((?:model-role|model):[A-Za-z0-9_.:-]+)\s+(?:becomes|is|were to become)\s+unavailable\s*:/i,
      );

    if (source) {
      flush();

      current = {
        sourceEntityId:
          normalizeEntityId(
            source[1],
          ),
        lines: [line],
      };

      continue;
    }

    if (current && line) {
      current.lines.push(line);
    }
  }

  flush();

  return blocks;
}

function entityIdsInText(
  text: string,
): string[] {
  return [
    ...new Set(
      (
        text
          .replace(/\\:/g, ":")
          .match(ENTITY_PATTERN) ??
        []
      ).map(normalizeEntityId),
    ),
  ];
}

function impactBySource(
  impacts:
    WorldModelImpactAssessment[],
): Map<
  string,
  WorldModelImpactAssessment
> {
  return new Map(
    impacts.map((impact) => [
      normalizeEntityId(
        impact.sourceEntityId,
      ),
      impact,
    ]),
  );
}

function formatRelationshipEvidence(
  relationship:
    WorldModelRelationship,
): string {
  const worldStateKeys =
    relationship.evidence
      .worldStateKeys
      .join(",");

  const eventIds =
    relationship.evidence
      .eventIds
      .join(",");

  return [
    `- ${relationship.fromEntityId}`,
    `  --${relationship.type}-->`,
    `  ${relationship.toEntityId}`,
    `  confidence=${relationship.confidence.toFixed(2)}`,
    `  worldStateKeys=${worldStateKeys || "none"}`,
    `  eventIds=${eventIds || "none"}`,
  ].join("\n");
}

function formatImpact(
  impact:
    WorldModelImpactAssessment,
): string {
  return [
    `- impactSource: ${impact.sourceEntityId}`,
    `  directlyDependentEntities: ${impact.directlyDependentEntityIds.join(",") || "none"}`,
    `  transitivelyDependentEntities: ${impact.transitivelyDependentEntityIds.join(",") || "none"}`,
  ].join("\n");
}

export function buildCanonicalWorldModelEvidenceText(
  evidence:
    GroundedWorldModelResponseEvidence,
): string {
  return [
    "CANONICAL 11J RESPONSE VALIDATION EVIDENCE",
    "",
    "EXPLICIT DEPENDENCY RELATIONSHIPS:",
    ...evidence
      .dependencyRelationships
      .map(
        formatRelationshipEvidence,
      ),
    "",
    "PRECOMPUTED DOWNSTREAM IMPACT:",
    ...evidence.impacts.map(
      formatImpact,
    ),
    "",
    "SUPPORTED PREDICTIONS:",
    evidence.supportedPredictions.length ===
    0
      ? `- ${NO_SUPPORTED_PREDICTIONS}`
      : evidence.supportedPredictions.map(
          (prediction) =>
            [
              `- entityId=${prediction.entityId}`,
              `stateKey=${prediction.stateKey}`,
              `status=${prediction.status}`,
              `confidence=${prediction.confidence}`,
              `sampleCount=${prediction.sampleCount}`,
            ].join(" "),
        ).join("\n"),
  ].join("\n");
}

function dependencyChains(
  relationships:
    WorldModelRelationship[],
): string[] {
  const requiresModel =
    relationships.filter(
      (relationship) =>
        relationship.type ===
        "requires-model",
    );

  const servedBy =
    new Map(
      relationships
        .filter(
          (relationship) =>
            relationship.type ===
            "served-by",
        )
        .map((relationship) => [
          normalizeEntityId(
            relationship.fromEntityId,
          ),
          relationship,
        ]),
    );

  return requiresModel.map(
    (relationship) => {
      const provider =
        servedBy.get(
          normalizeEntityId(
            relationship.toEntityId,
          ),
        );

      return provider
        ? `${relationship.fromEntityId} -> requires-model -> ${relationship.toEntityId} -> served-by -> ${provider.toEntityId}`
        : `${relationship.fromEntityId} -> requires-model -> ${relationship.toEntityId}`;
    },
  );
}

function queriedConsequenceSources(
  userMessage: string,
  evidence:
    GroundedWorldModelResponseEvidence,
): string[] {
  const requested =
    entityIdsInText(
      sectionText(
        userMessage,
        "CONSEQUENCES",
        [
          "PREDICTIONS",
          "MISSING MODEL",
        ],
      ) || userMessage,
    );

  const known =
    new Set(
      evidence.impacts.map(
        (impact) =>
          normalizeEntityId(
            impact.sourceEntityId,
          ),
      ),
    );

  return requested.filter(
    (entityId) =>
      known.has(entityId),
  );
}

export function buildDeterministicWorldModelFallback(
  userMessage: string,
  evidence:
    GroundedWorldModelResponseEvidence,
): string {
  const entities =
    [
      ...new Set(
        evidence
          .dependencyRelationships
          .flatMap(
            (relationship) => [
              relationship.fromEntityId,
              relationship.toEntityId,
            ],
          ),
      ),
    ].sort();

  const impacts =
    impactBySource(
      evidence.impacts,
    );

  const requestedSources =
    queriedConsequenceSources(
      userMessage,
      evidence,
    );

  const consequenceSources =
    requestedSources.length > 0
      ? requestedSources
      : [...impacts.keys()].sort();

  const consequenceLines =
    consequenceSources.map(
      (source) => {
        const impact =
          impacts.get(source);

        if (!impact) {
          return `- ${source}: No canonical impact assessment is available.`;
        }

        const dependents =
          [
            ...impact.directlyDependentEntityIds,
            ...impact.transitivelyDependentEntityIds,
          ];

        return dependents.length > 0
          ? `- ${impact.sourceEntityId}: downstream dependents = ${dependents.join(", ")}.`
          : `- ${impact.sourceEntityId}: no downstream dependency path is represented.`;
      },
    );

  const predictionLines =
    evidence.supportedPredictions.length ===
    0
      ? [NO_SUPPORTED_PREDICTIONS]
      : evidence.supportedPredictions.map(
          (prediction) =>
            `- ${prediction.entityId} ${prediction.stateKey}: status=${prediction.status}; confidence=${prediction.confidence}; sampleCount=${prediction.sampleCount}.`,
        );

  return [
    "WORLD MODEL ENTITIES",
    ...entities.map(
      (entity) =>
        `- ${entity}`,
    ),
    "",
    "RELATIONSHIPS",
    ...evidence
      .dependencyRelationships
      .map(
        (relationship) =>
          `- ${relationship.fromEntityId} --${relationship.type}--> ${relationship.toEntityId}`,
      ),
    "",
    "CURRENT GROUNDED BELIEFS",
    `- Canonical 11J currently contains ${evidence.dependencyRelationships.length} explicit dependency relationships relevant to this audit.`,
    "",
    "DEPENDENCIES",
    ...dependencyChains(
      evidence.dependencyRelationships,
    ).map(
      (chain) =>
        `- ${chain}`,
    ),
    "",
    "CONSEQUENCES",
    ...consequenceLines,
    "",
    "PREDICTIONS",
    ...predictionLines,
    "",
    "MISSING MODEL",
    "- No additional missing dependency is inferred by this deterministic fallback beyond the canonical graph supplied above.",
  ].join("\n");
}

export function shouldValidateWorldModelResponse(
  userMessage: string,
  sessionSummary?: string,
): boolean {
  if (
    !sessionSummary?.includes(
      "WORLD MODEL CRITICAL DEPENDENCY BACKBONE",
    )
  ) {
    return false;
  }

  return (
    /\bworld\s+model\b/i.test(
      userMessage,
    ) &&
    /\b(?:relationship|dependencies|dependency|consequence|impact|prediction|relational|entities|entity)\b/i.test(
      userMessage,
    )
  );
}

export function validateWorldModelResponseAgainstEvidence(
  userMessage: string,
  response: string,
  evidence:
    GroundedWorldModelResponseEvidence,
): WorldModelResponseValidationResult {
  const issues:
    WorldModelResponseValidationIssue[] = [];

  const canonical =
    canonicalRelationshipSets(
      evidence.dependencyRelationships,
    );

  const claims =
    [
      ...parseStructuredRelationships(
        response,
      ),
      ...parseArrowRelationships(
        response,
      ),
    ];

  const seenClaimKeys =
    new Set<string>();

  for (const claim of claims) {
    if (
      !DEPENDENCY_TYPES.has(
        claim.type,
      )
    ) {
      continue;
    }

    const key =
      relationshipKey(claim);

    if (seenClaimKeys.has(key)) {
      continue;
    }

    seenClaimKeys.add(key);

    if (canonical.exact.has(key)) {
      continue;
    }

    if (canonical.reverse.has(key)) {
      issues.push({
        code:
          "reversed-dependency",
        message:
          `Dependency direction is reversed: ${claim.fromEntityId} --${claim.type}--> ${claim.toEntityId}.`,
      });
    } else {
      issues.push({
        code:
          "invented-dependency",
        message:
          `Dependency is not present in canonical 11J: ${claim.fromEntityId} --${claim.type}--> ${claim.toEntityId}.`,
      });
    }
  }

  const dependencySection =
    sectionText(
      response,
      "DEPENDENCIES",
      [
        "CONSEQUENCES",
        "PREDICTIONS",
        "MISSING MODEL",
        "CONCLUSION",
      ],
    );

  if (
    /\bhas-(?:state|role)\b/i.test(
      dependencySection,
    )
  ) {
    issues.push({
      code:
        "dependency-section-nondependency",
      message:
        "DEPENDENCIES contains has-state or has-role, which are not dependency relationship types.",
    });
  }

  if (
    userRequestsCompleteDependencyAudit(
      userMessage,
    )
  ) {
    const parsedDependencyKeys =
      parsedDependencyClaimKeys(
        response,
      );

    for (
      const relationship
      of evidence.dependencyRelationships
    ) {
      const key =
        relationshipKey(
          relationship,
        );

      if (
        !parsedDependencyKeys.has(
          key,
        )
      ) {
        issues.push({
          code:
            "missing-canonical-dependency",
          message:
            `Required canonical dependency was omitted: ${relationship.fromEntityId} --${relationship.type}--> ${relationship.toEntityId}.`,
        });
      }
    }
  }

  const impacts =
    impactBySource(
      evidence.impacts,
    );

  for (
    const block
    of extractConsequenceBlocks(
      response,
    )
  ) {
    const impact =
      impacts.get(
        block.sourceEntityId,
      );

    if (!impact) {
      continue;
    }

    const allowed =
      new Set(
        [
          ...impact
            .directlyDependentEntityIds,
          ...impact
            .transitivelyDependentEntityIds,
        ].map(normalizeEntityId),
      );

    if (
      /no\s+(?:direct\s+)?dependency\s+path\s+exists/i.test(
        block.text,
      ) &&
      allowed.size > 0
    ) {
      issues.push({
        code:
          "missing-impact-path",
        message:
          `Response says no dependency path exists for ${impact.sourceEntityId}, but canonical 11J lists downstream dependents.`,
      });
    }

    const mentioned =
      entityIdsInText(
        block.text,
      ).filter(
        (entityId) =>
          entityId !==
          block.sourceEntityId,
      );

    for (
      const entityId
      of mentioned
    ) {
      if (!allowed.has(entityId)) {
        issues.push({
          code:
            "invalid-consequence",
          message:
            `Invalid downstream consequence for ${impact.sourceEntityId}: ${entityId} is not a canonical dependent.`,
        });
      }
    }
  }

  if (
    evidence.supportedPredictions.length ===
      0 &&
    (
      /\bPREDICTIONS\b/i.test(
        userMessage,
      ) ||
      /\bPREDICTIONS\b/i.test(
        response,
      )
    ) &&
    !response.includes(
      NO_SUPPORTED_PREDICTIONS,
    )
  ) {
    issues.push({
      code:
        "unsupported-prediction",
      message:
        `Canonical 11J has zero supported predictions; response must state "${NO_SUPPORTED_PREDICTIONS}".`,
    });
  }

  if (
    evidence.dependencyRelationships.length >
      0 &&
    response
      .toLowerCase()
      .includes(
        NO_RELATIONAL_EVIDENCE.toLowerCase(),
      )
  ) {
    issues.push({
      code:
        "relational-fallback-contradiction",
      message:
        "Response claims there is no substantive relational evidence even though canonical dependency relationships are present.",
    });
  }

  const missingSection =
    sectionText(
      response,
      "MISSING MODEL",
      [
        "CONCLUSION",
      ],
    );

  if (missingSection) {
    for (
      const relationship
      of evidence.dependencyRelationships
    ) {
      const from =
        normalizeEntityId(
          relationship.fromEntityId,
        );

      const to =
        normalizeEntityId(
          relationship.toEntityId,
        );

      const lower =
        missingSection
          .replace(/\\:/g, ":")
          .toLowerCase();

      if (
        lower.includes(from) &&
        lower.includes(to) &&
        /\b(?:missing|lacks?|no\s+explicit|not\s+represented)\b/i.test(
          missingSection,
        )
      ) {
        issues.push({
          code:
            "missing-model-contradiction",
          message:
            `MISSING MODEL contradicts canonical edge ${relationship.fromEntityId} --${relationship.type}--> ${relationship.toEntityId}.`,
        });

        break;
      }
    }
  }

  const canonicalEvidenceText =
    buildCanonicalWorldModelEvidenceText(
      evidence,
    );

  const fallbackText =
    buildDeterministicWorldModelFallback(
      userMessage,
      evidence,
    );

  return {
    applies: true,
    valid:
      issues.length === 0,
    issues,
    canonicalEvidenceText,
    fallbackText,
  };
}

async function collectCanonicalEvidence():
  Promise<GroundedWorldModelResponseEvidence> {
  const runtime =
    await getChernobogWorldModelRuntime();

  const snapshot =
    runtime.model.snapshot();

  const dependencyRelationships =
    snapshot.graph.relationships
      .filter(
        isDependencyRelationship,
      )
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      );

  const supportedPredictions =
    snapshot.predictions
      .filter(
        (prediction) =>
          prediction.status !==
            "insufficient" &&
          prediction.confidence > 0,
      )
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      );

  const impactSourceIds =
    [
      ...new Set(
        dependencyRelationships.map(
          (relationship) =>
            relationship.toEntityId,
        ),
      ),
    ].sort();

  const impacts =
    impactSourceIds.map(
      (sourceEntityId) =>
        runtime.model.impact(
          sourceEntityId,
        ),
    );

  return {
    dependencyRelationships,
    supportedPredictions,
    impacts,
  };
}

export async function validateWorldModelResponse(
  userMessage: string,
  response: string,
): Promise<WorldModelResponseValidationResult> {
  const evidence =
    await collectCanonicalEvidence();

  return validateWorldModelResponseAgainstEvidence(
    userMessage,
    response,
    evidence,
  );
}

export function buildWorldModelRepairPrompt(
  userMessage: string,
  invalidResponse: string,
  validation:
    WorldModelResponseValidationResult,
): string {
  return [
    "Repair the answer using only the canonical 11J evidence supplied in the system message.",
    "",
    "Do not execute tools.",
    "Do not mutate memory, World State, World Model, governance, or learning.",
    "Do not add relationships that are not present in canonical evidence.",
    "Preserve relationship direction exactly.",
    "For consequences, mention only canonical direct or transitive dependents of the requested source.",
    `If there are zero supported predictions, state exactly: "${NO_SUPPORTED_PREDICTIONS}"`,
    `Never emit: "${NO_RELATIONAL_EVIDENCE}" when canonical dependency relationships exist.`,
    "",
    "VALIDATION ISSUES:",
    ...validation.issues.map(
      (issue, index) =>
        `${index + 1}. [${issue.code}] ${issue.message}`,
    ),
    "",
    "ORIGINAL USER REQUEST:",
    userMessage,
    "",
    "INVALID ANSWER TO REPAIR:",
    invalidResponse.slice(
      0,
      16_000,
    ),
    "",
    "Return only the repaired answer.",
  ].join("\n");
}
