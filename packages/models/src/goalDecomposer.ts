import type {
  InputInterpretation,
} from "./inputInterpreter";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const GOAL_DECOMPOSER_VERSION =
  "oh4p.v1";

export type GoalNodeKind =
  | "root"
  | "subgoal"
  | "verification"
  | "evidence"
  | "integration";

export type GoalNodeStatus =
  | "planned"
  | "blocked"
  | "ready";

export interface GoalAcceptanceCriterion {
  id: string;
  description: string;
  required: boolean;
}

export interface GoalEvidenceNeed {
  kind:
    | "context"
    | "file"
    | "tool"
    | "external"
    | "validation";

  description: string;
  required: boolean;
}

export interface GoalNode {
  id: string;

  parentId?: string;

  kind: GoalNodeKind;
  title: string;
  objective: string;

  status: GoalNodeStatus;

  depth: number;

  dependsOn: string[];

  acceptanceCriteria:
    GoalAcceptanceCriterion[];

  evidenceNeeds:
    GoalEvidenceNeed[];

  requiredTools: string[];

  assumptions: string[];
  blockers: string[];

  provenance: {
    source:
      | "interpreted-goal"
      | "reasoning-contract"
      | "decomposer";
    sourceRef: string;
  };
}

export interface GoalDependencyEdge {
  fromGoalId: string;
  toGoalId: string;

  kind:
    | "requires"
    | "verifies"
    | "integrates";

  reason: string;
}

export interface GoalDecompositionDraftNode {
  id?: string;

  parentId?: string;

  kind?: GoalNodeKind;

  title: string;
  objective: string;

  dependsOn?: string[];

  acceptanceCriteria?: Array<
    | string
    | {
        description: string;
        required?: boolean;
      }
  >;

  evidenceNeeds?: Array<
    | string
    | {
        kind?:
          GoalEvidenceNeed["kind"];
        description: string;
        required?: boolean;
      }
  >;

  requiredTools?: string[];

  assumptions?: string[];
  blockers?: string[];
}

export interface GoalDecompositionDraft {
  rootTitle?: string;
  rootObjective?: string;

  nodes:
    GoalDecompositionDraftNode[];

  notes?: string[];
}

export interface GoalDecomposition {
  version: string;
  generatedAt: string;

  rootGoalId: string;

  nodes: GoalNode[];
  edges: GoalDependencyEdge[];

  maxDepth: number;

  complete: boolean;
  planningReady: boolean;

  unresolvedQuestions: Array<{
    question: string;
    blocking: boolean;
    reason: string;
  }>;

  warnings: string[];
}

export type GoalDecompositionAnalyzer =
  (
    input: {
      interpretation:
        InputInterpretation;
      reasoningContract:
        ReasoningContract;
    },
  ) =>
    GoalDecompositionDraft
    | Promise<GoalDecompositionDraft>;

function normalizeText(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function requireText(
  value: string,
  field: string,
): string {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function uniqueText(
  values:
    readonly string[]
    | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map(
          normalizeText,
        )
        .filter(Boolean),
    ),
  ];
}

function slug(
  value: string,
): string {
  const normalized =
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .slice(
        0,
        48,
      );

  return normalized ||
    "goal";
}

function defaultDraft(
  input: {
    interpretation:
      InputInterpretation;
    reasoningContract:
      ReasoningContract;
  },
): GoalDecompositionDraft {
  const interpretation =
    input.interpretation;

  const contract =
    input.reasoningContract;

  const tools =
    interpretation
      .taskSignals
      .requiredTools ??
    [];

  const nodes:
    GoalDecompositionDraftNode[] =
      [];

  nodes.push({
    id:
      "understand-requirements",
    title:
      "Establish requirements",
    objective:
      "Convert the interpreted goal, desired outcome, and explicit constraints into concrete success requirements.",
    acceptanceCriteria: [
      "Goal and desired outcome are represented.",
      "Explicit constraints are preserved.",
      "Blocking ambiguity is not silently resolved.",
    ],
    evidenceNeeds: [
      {
        kind:
          "context",
        description:
          "Use the interpreted task contract as the source of requirements.",
        required:
          true,
      },
    ],
  });

  if (
    contract.evidence
      .requirement !==
    "none"
  ) {
    nodes.push({
      id:
        "secure-evidence",
      title:
        "Secure required evidence",
      objective:
        "Identify and obtain the evidence required by the active reasoning contract before relying on material factual conclusions.",
      dependsOn: [
        "understand-requirements",
      ],
      acceptanceCriteria: [
        `Evidence requirement ${contract.evidence.requirement} is satisfied or explicitly reported missing.`,
      ],
      evidenceNeeds: [
        {
          kind:
            contract.execution
              .allowTools
              ? "tool"
              : "context",
          description:
            "Evidence must preserve provenance, freshness, and confidence where available.",
          required:
            true,
        },
      ],
      requiredTools:
        tools,
    });
  }

  nodes.push({
    id:
      "produce-result",
    title:
      "Produce candidate result",
    objective:
      "Create a complete candidate that satisfies the interpreted goal under the active reasoning contract.",
    dependsOn: [
      contract.evidence
        .requirement !==
        "none"
        ? "secure-evidence"
        : "understand-requirements",
    ],
    acceptanceCriteria: [
      interpretation
        .desiredOutcome
        .summary,
      "Explicit constraints are satisfied.",
      "Assumptions and uncertainties remain visible.",
    ],
    requiredTools:
      contract.execution
        .allowTools
        ? tools
        : [],
  });

  if (
    contract.validation
      .required
  ) {
    nodes.push({
      id:
        "validate-result",
      kind:
        "verification",
      title:
        "Validate candidate result",
      objective:
        "Validate the candidate against constraints, evidence requirements, factuality requirements, and the expected output contract.",
      dependsOn: [
        "produce-result",
      ],
      acceptanceCriteria: [
        `Validation mode ${contract.validation.mode} completes.`,
        "Validation failures remain visible.",
      ],
      evidenceNeeds: [
        {
          kind:
            "validation",
          description:
            "Validation result must be retained as an auditable artifact.",
          required:
            true,
        },
      ],
    });
  }

  nodes.push({
    id:
      "finalize-outcome",
    kind:
      "integration",
    title:
      "Finalize outcome",
    objective:
      "Assemble the accepted result, evidence references, confidence, assumptions, uncertainties, validation results, and any non-executable proposed actions.",
    dependsOn: [
      contract.validation
        .required
        ? "validate-result"
        : "produce-result",
    ],
    acceptanceCriteria: [
      "Result satisfies the desired outcome.",
      "Confidence is recorded.",
      "Proposed actions remain non-executable.",
    ],
  });

  return {
    rootTitle:
      interpretation
        .goal.summary,
    rootObjective:
      interpretation
        .desiredOutcome
        .summary,
    nodes,
    notes: [
      "Default decomposition is deterministic and contract-derived.",
    ],
  };
}

function normalizedAcceptanceCriteria(
  nodeId: string,
  values:
    GoalDecompositionDraftNode[
      "acceptanceCriteria"
    ],
): GoalAcceptanceCriterion[] {
  return (
    values ??
    []
  )
    .map(
      (
        value,
        index,
      ) => {
        if (
          typeof value ===
          "string"
        ) {
          return {
            id:
              `${nodeId}:criterion:${index + 1}`,
            description:
              requireText(
                value,
                "acceptance criterion",
              ),
            required:
              true,
          };
        }

        return {
          id:
            `${nodeId}:criterion:${index + 1}`,
          description:
            requireText(
              value.description,
              "acceptance criterion",
            ),
          required:
            value.required ??
            true,
        };
      },
    );
}

function normalizedEvidenceNeeds(
  values:
    GoalDecompositionDraftNode[
      "evidenceNeeds"
    ],
): GoalEvidenceNeed[] {
  return (
    values ??
    []
  )
    .map(
      (value) => {
        if (
          typeof value ===
          "string"
        ) {
          return {
            kind:
              "context" as const,
            description:
              requireText(
                value,
                "evidence need",
              ),
            required:
              true,
          };
        }

        return {
          kind:
            value.kind ??
            "context",
          description:
            requireText(
              value.description,
              "evidence need",
            ),
          required:
            value.required ??
            true,
        };
      },
    );
}

function validateAcyclic(
  nodes:
    readonly GoalNode[],
): void {
  const dependencies =
    new Map<
      string,
      string[]
    >(
      nodes.map(
        (node) => [
          node.id,
          node.dependsOn,
        ],
      ),
    );

  const visiting =
    new Set<string>();

  const visited =
    new Set<string>();

  const visit =
    (
      id: string,
    ): void => {
      if (
        visited.has(
          id,
        )
      ) {
        return;
      }

      if (
        visiting.has(
          id,
        )
      ) {
        throw new Error(
          `Goal decomposition contains a dependency cycle involving ${id}.`,
        );
      }

      visiting.add(
        id,
      );

      for (
        const dependency
        of dependencies.get(
          id,
        ) ??
        []
      ) {
        visit(
          dependency,
        );
      }

      visiting.delete(
        id,
      );

      visited.add(
        id,
      );
    };

  for (
    const node
    of nodes
  ) {
    visit(
      node.id,
    );
  }
}

function calculateDepths(
  rootId: string,
  nodes:
    GoalNode[],
): void {
  const byId =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const depthOf =
    (
      node:
        GoalNode,
      stack =
        new Set<string>(),
    ): number => {
      if (
        node.id ===
        rootId
      ) {
        return 0;
      }

      if (
        stack.has(
          node.id,
        )
      ) {
        return node.depth;
      }

      stack.add(
        node.id,
      );

      const parent =
        node.parentId
          ? byId.get(
              node.parentId,
            )
          : undefined;

      const depth =
        parent
          ? depthOf(
              parent,
              stack,
            ) +
            1
          : 1;

      stack.delete(
        node.id,
      );

      return depth;
    };

  for (
    const node
    of nodes
  ) {
    node.depth =
      depthOf(
        node,
      );
  }
}

function buildEdges(
  nodes:
    readonly GoalNode[],
): GoalDependencyEdge[] {
  const edges:
    GoalDependencyEdge[] =
      [];

  for (
    const node
    of nodes
  ) {
    for (
      const dependency
      of node.dependsOn
    ) {
      edges.push({
        fromGoalId:
          dependency,
        toGoalId:
          node.id,
        kind:
          node.kind ===
            "verification"
            ? "verifies"
            : node.kind ===
                "integration"
              ? "integrates"
              : "requires",
        reason:
          `${node.title} depends on ${dependency}.`,
      });
    }
  }

  return edges;
}

function normalizeDraft(
  input: {
    interpretation:
      InputInterpretation;
    reasoningContract:
      ReasoningContract;
    draft:
      GoalDecompositionDraft;
  },
): GoalDecomposition {
  const rootGoalId =
    `root:${slug(
      input.interpretation
        .goal.summary,
    )}`;

  const rootTitle =
    requireText(
      input.draft
        .rootTitle ??
      input.interpretation
        .goal.summary,
      "root goal title",
    );

  const rootObjective =
    requireText(
      input.draft
        .rootObjective ??
      input.interpretation
        .desiredOutcome
        .summary,
      "root goal objective",
    );

  const nodes:
    GoalNode[] =
      [
        {
          id:
            rootGoalId,
          kind:
            "root",
          title:
            rootTitle,
          objective:
            rootObjective,
          status:
            input.interpretation
              .clarificationRequired
              ? "blocked"
              : "ready",
          depth:
            0,
          dependsOn:
            [],
          acceptanceCriteria: [
            {
              id:
                `${rootGoalId}:criterion:1`,
              description:
                input.interpretation
                  .desiredOutcome
                  .summary,
              required:
                true,
            },
          ],
          evidenceNeeds:
            [],
          requiredTools:
            [],
          assumptions:
            [],
          blockers:
            input.interpretation
              .unresolvedQuestions
              .filter(
                (question) =>
                  question.blocking,
              )
              .map(
                (question) =>
                  question.question,
              ),
          provenance: {
            source:
              "interpreted-goal",
            sourceRef:
              "oh4j.goal",
          },
        },
      ];

  const assignedIds =
    new Set<string>([
      rootGoalId,
    ]);

  const idByDraftId =
    new Map<
      string,
      string
    >();

  input.draft.nodes.forEach(
    (
      draftNode,
      index,
    ) => {
      const requested =
        normalizeText(
          draftNode.id ??
          "",
        );

      let id =
        requested ||
        `goal:${index + 1}:${slug(
          draftNode.title,
        )}`;

      if (
        assignedIds.has(
          id,
        )
      ) {
        let suffix =
          2;

        while (
          assignedIds.has(
            `${id}:${suffix}`,
          )
        ) {
          suffix +=
            1;
        }

        id =
          `${id}:${suffix}`;
      }

      assignedIds.add(
        id,
      );

      if (
        requested
      ) {
        idByDraftId.set(
          requested,
          id,
        );
      }

      idByDraftId.set(
        `#${index}`,
        id,
      );
    },
  );

  const resolveRef =
    (
      value:
        string
        | undefined,
    ): string | undefined => {
      if (!value) {
        return undefined;
      }

      if (
        value ===
        "root"
      ) {
        return rootGoalId;
      }

      return idByDraftId.get(
        value,
      ) ??
      value;
    };

  input.draft.nodes.forEach(
    (
      draftNode,
      index,
    ) => {
      const id =
        idByDraftId.get(
          `#${index}`,
        );

      if (!id) {
        throw new Error(
          "Internal goal-id assignment failed.",
        );
      }

      const parentId =
        resolveRef(
          draftNode.parentId,
        ) ??
        rootGoalId;

      const dependsOn =
        uniqueText(
          (
            draftNode.dependsOn ??
            []
          )
            .map(
              (dependency) =>
                resolveRef(
                  dependency,
                ) ??
                dependency,
            ),
        );

      const blockers =
        uniqueText(
          draftNode.blockers,
        );

      nodes.push({
        id,
        parentId,
        kind:
          draftNode.kind ??
          "subgoal",
        title:
          requireText(
            draftNode.title,
            "goal title",
          ),
        objective:
          requireText(
            draftNode.objective,
            "goal objective",
          ),
        status:
          blockers.length >
          0
            ? "blocked"
            : dependsOn.length >
                0
              ? "planned"
              : "ready",
        depth:
          1,
        dependsOn,
        acceptanceCriteria:
          normalizedAcceptanceCriteria(
            id,
            draftNode
              .acceptanceCriteria,
          ),
        evidenceNeeds:
          normalizedEvidenceNeeds(
            draftNode
              .evidenceNeeds,
          ),
        requiredTools:
          uniqueText(
            draftNode
              .requiredTools,
          ),
        assumptions:
          uniqueText(
            draftNode
              .assumptions,
          ),
        blockers,
        provenance: {
          source:
            "decomposer",
          sourceRef:
            `oh4p.node.${index + 1}`,
        },
      });
    },
  );

  const nodeIds =
    new Set(
      nodes.map(
        (node) =>
          node.id,
      ),
    );

  for (
    const node
    of nodes
  ) {
    if (
      node.parentId &&
      !nodeIds.has(
        node.parentId,
      )
    ) {
      throw new Error(
        `Goal ${node.id} references unknown parent ${node.parentId}.`,
      );
    }

    for (
      const dependency
      of node.dependsOn
    ) {
      if (
        !nodeIds.has(
          dependency,
        )
      ) {
        throw new Error(
          `Goal ${node.id} depends on unknown goal ${dependency}.`,
        );
      }

      if (
        dependency ===
        node.id
      ) {
        throw new Error(
          `Goal ${node.id} cannot depend on itself.`,
        );
      }
    }
  }

  validateAcyclic(
    nodes,
  );

  calculateDepths(
    rootGoalId,
    nodes,
  );

  const maxDepth =
    nodes.reduce(
      (
        maximum,
        node,
      ) =>
        Math.max(
          maximum,
          node.depth,
        ),
      0,
    );

  const warnings =
    uniqueText([
      ...(input.draft
        .notes ??
        []),
      ...(
        input.interpretation
          .clarificationRequired
          ? [
              "Blocking unresolved questions prevent planning-ready decomposition.",
            ]
          : []
      ),
      ...(
        nodes.some(
          (node) =>
            node.acceptanceCriteria
              .length ===
            0,
        )
          ? [
              "One or more subgoals lack explicit acceptance criteria.",
            ]
          : []
      ),
    ]);

  const blockersPresent =
    nodes.some(
      (node) =>
        node.blockers
          .length >
        0,
    );

  const missingAcceptance =
    nodes
      .filter(
        (node) =>
          node.kind !==
          "root",
      )
      .some(
        (node) =>
          node.acceptanceCriteria
            .length ===
          0,
      );

  const complete =
    !input.interpretation
      .clarificationRequired &&
    !blockersPresent;

  return {
    version:
      GOAL_DECOMPOSER_VERSION,
    generatedAt:
      new Date()
        .toISOString(),
    rootGoalId,
    nodes,
    edges:
      buildEdges(
        nodes,
      ),
    maxDepth,
    complete,
    planningReady:
      complete &&
      !missingAcceptance,
    unresolvedQuestions:
      input.interpretation
        .unresolvedQuestions
        .map(
          (question) => ({
            question:
              question.question,
            blocking:
              question.blocking,
            reason:
              question.reason,
          }),
        ),
    warnings,
  };
}

export class GoalDecomposer {
  constructor(
    private readonly analyzer:
      GoalDecompositionAnalyzer =
        defaultDraft,
  ) {}

  async decompose(
    input: {
      interpretation:
        InputInterpretation;
      reasoningContract:
        ReasoningContract;
    },
  ): Promise<GoalDecomposition> {
    if (
      input.reasoningContract
        .inputs
        .blockingQuestionsMustStop &&
      input.interpretation
        .clarificationRequired
    ) {
      const blockedDraft:
        GoalDecompositionDraft = {
          rootTitle:
            input.interpretation
              .goal.summary,
          rootObjective:
            input.interpretation
              .desiredOutcome
              .summary,
          nodes:
            [],
          notes: [
            "Decomposition stopped because the reasoning contract forbids guessing through blocking ambiguity.",
          ],
        };

      return normalizeDraft({
        ...input,
        draft:
          blockedDraft,
      });
    }

    const draft =
      await this.analyzer(
        input,
      );

    if (
      !draft ||
      !Array.isArray(
        draft.nodes,
      )
    ) {
      throw new Error(
        "Goal decomposition analyzer must return a nodes array.",
      );
    }

    return normalizeDraft({
      ...input,
      draft,
    });
  }
}

const defaultGoalDecomposer =
  new GoalDecomposer();

export function getGoalDecomposer():
  GoalDecomposer {
  return defaultGoalDecomposer;
}