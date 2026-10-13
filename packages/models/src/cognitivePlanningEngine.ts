import type {
  GoalDecomposition,
  GoalEvidenceNeed,
  GoalNode,
} from "./goalDecomposer";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const COGNITIVE_PLANNING_ENGINE_VERSION =
  "oh4q.v1";

export type CognitivePlanStatus =
  | "ready"
  | "blocked";

export type CognitivePlanStepReadiness =
  | "ready"
  | "waiting"
  | "blocked";

export type CognitivePlanStepKind =
  | "prepare"
  | "work"
  | "evidence"
  | "verification"
  | "integration";

export interface CognitivePlanVerificationCheckpoint {
  required: boolean;

  mode:
    ReasoningContract[
      "validation"
    ]["mode"];

  checks: string[];

  failureBehavior:
    ReasoningContract[
      "validation"
    ]["failureBehavior"];
}

export interface CognitivePlanStep {
  id: string;

  sequence: number;
  stage: number;

  goalId: string;

  kind:
    CognitivePlanStepKind;

  title: string;
  objective: string;

  readiness:
    CognitivePlanStepReadiness;

  dependsOnStepIds:
    string[];

  acceptanceCriteria:
    string[];

  evidenceNeeds:
    GoalEvidenceNeed[];

  requiredTools:
    string[];

  assumptions:
    string[];

  blockers:
    string[];

  verification:
    CognitivePlanVerificationCheckpoint;

  mayExecute: false;
  requiresAuthorityBeforeExecution: true;

  provenance: {
    goalNodeId: string;
    goalSourceRef: string;
    planningEngineVersion: string;
  };
}

export interface CognitivePlanStage {
  stage: number;
  stepIds: string[];
  parallelizable: boolean;
}

export interface CognitivePlan {
  version: string;
  generatedAt: string;

  status:
    CognitivePlanStatus;

  rootGoalId: string;
  goal: string;
  desiredOutcome: string;

  strategy:
    ReasoningContract[
      "strategy"
    ];

  steps:
    CognitivePlanStep[];

  stages:
    CognitivePlanStage[];

  planningReady: boolean;

  unresolvedQuestions:
    GoalDecomposition[
      "unresolvedQuestions"
    ];

  warnings: string[];

  invariants: {
    dependencyOrderValidated: true;
    schedulingPerformed: false;
    priorityAssigned: false;
    actionsExecutable: false;
    authorityBypassed: false;
  };
}

function uniqueText(
  values:
    readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function stepIdForGoal(
  goalId: string,
): string {
  return `plan:${goalId}`;
}

function kindForNode(
  node: GoalNode,
): CognitivePlanStepKind {
  if (
    node.kind ===
      "verification"
  ) {
    return "verification";
  }

  if (
    node.kind ===
      "integration"
  ) {
    return "integration";
  }

  if (
    node.evidenceNeeds
      .some(
        (need) =>
          need.required,
      )
  ) {
    return "evidence";
  }

  if (
    node.title
      .toLowerCase()
      .includes(
        "requirement",
      )
  ) {
    return "prepare";
  }

  return "work";
}

function validateDependencyGraph(
  decomposition:
    GoalDecomposition,
): void {
  const nodes =
    decomposition.nodes
      .filter(
        (node) =>
          node.kind !==
          "root",
      );

  const ids =
    new Set(
      nodes.map(
        (node) =>
          node.id,
      ),
    );

  const rootId =
    decomposition.rootGoalId;

  for (
    const node
    of nodes
  ) {
    for (
      const dependency
      of node.dependsOn
    ) {
      if (
        dependency ===
        rootId
      ) {
        continue;
      }

      if (
        !ids.has(
          dependency,
        )
      ) {
        throw new Error(
          `Planning graph references unknown dependency ${dependency} from ${node.id}.`,
        );
      }
    }
  }

  const visiting =
    new Set<string>();

  const visited =
    new Set<string>();

  const byId =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

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
          `Planning graph contains a dependency cycle involving ${id}.`,
        );
      }

      visiting.add(
        id,
      );

      const node =
        byId.get(
          id,
        );

      for (
        const dependency
        of node?.dependsOn ??
        []
      ) {
        if (
          dependency !==
          rootId
        ) {
          visit(
            dependency,
          );
        }
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

function topologicalOrder(
  decomposition:
    GoalDecomposition,
): GoalNode[] {
  validateDependencyGraph(
    decomposition,
  );

  const nodes =
    decomposition.nodes
      .filter(
        (node) =>
          node.kind !==
          "root",
      );

  const rootId =
    decomposition.rootGoalId;

  const byId =
    new Map(
      nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const indegree =
    new Map<
      string,
      number
    >();

  const outgoing =
    new Map<
      string,
      string[]
    >();

  for (
    const node
    of nodes
  ) {
    const dependencies =
      node.dependsOn
        .filter(
          (dependency) =>
            dependency !==
            rootId,
        );

    indegree.set(
      node.id,
      dependencies.length,
    );

    for (
      const dependency
      of dependencies
    ) {
      const list =
        outgoing.get(
          dependency,
        ) ??
        [];

      list.push(
        node.id,
      );

      outgoing.set(
        dependency,
        list,
      );
    }
  }

  const ready =
    nodes
      .filter(
        (node) =>
          (
            indegree.get(
              node.id,
            ) ??
            0
          ) ===
          0,
      )
      .sort(
        (
          left,
          right,
        ) => {
          if (
            left.depth !==
            right.depth
          ) {
            return (
              left.depth -
              right.depth
            );
          }

          return left.id
            .localeCompare(
              right.id,
            );
        },
      );

  const ordered:
    GoalNode[] =
      [];

  while (
    ready.length >
    0
  ) {
    const current =
      ready.shift();

    if (!current) {
      break;
    }

    ordered.push(
      current,
    );

    for (
      const childId
      of (
        outgoing.get(
          current.id,
        ) ??
        []
      ).sort()
    ) {
      const next =
        (
          indegree.get(
            childId,
          ) ??
          0
        ) -
        1;

      indegree.set(
        childId,
        next,
      );

      if (
        next ===
        0
      ) {
        const child =
          byId.get(
            childId,
          );

        if (child) {
          ready.push(
            child,
          );

          ready.sort(
            (
              left,
              right,
            ) => {
              if (
                left.depth !==
                right.depth
              ) {
                return (
                  left.depth -
                  right.depth
                );
              }

              return left.id
                .localeCompare(
                  right.id,
                );
            },
          );
        }
      }
    }
  }

  if (
    ordered.length !==
    nodes.length
  ) {
    throw new Error(
      "Planning graph could not be topologically ordered.",
    );
  }

  return ordered;
}

function stageMap(
  ordered:
    readonly GoalNode[],
  rootGoalId:
    string,
): Map<string, number> {
  const stages =
    new Map<
      string,
      number
    >();

  for (
    const node
    of ordered
  ) {
    const dependencyStages =
      node.dependsOn
        .filter(
          (dependency) =>
            dependency !==
            rootGoalId,
        )
        .map(
          (dependency) =>
            stages.get(
              dependency,
            ) ??
            0,
        );

    stages.set(
      node.id,
      dependencyStages.length >
        0
        ? Math.max(
            ...dependencyStages,
          ) +
          1
        : 1,
    );
  }

  return stages;
}

function verificationFor(
  node:
    GoalNode,
  contract:
    ReasoningContract,
): CognitivePlanVerificationCheckpoint {
  const nodeIsVerification =
    node.kind ===
    "verification";

  const required =
    nodeIsVerification ||
    contract.validation
      .required;

  const checks =
    uniqueText([
      ...node
        .acceptanceCriteria
        .filter(
          (criterion) =>
            criterion.required,
        )
        .map(
          (criterion) =>
            criterion.description,
        ),
      ...(
        contract.validation
          .validateConstraints
          ? [
              "Verify explicit constraints remain satisfied.",
            ]
          : []
      ),
      ...(
        contract.validation
          .validateEvidence
          ? [
              "Verify required evidence is present and provenance-bearing.",
            ]
          : []
      ),
      ...(
        contract.validation
          .validateFactuality
          ? [
              "Verify material factual claims meet the active factuality contract.",
            ]
          : []
      ),
    ]);

  return {
    required,
    mode:
      contract.validation
        .mode,
    checks,
    failureBehavior:
      contract.validation
        .failureBehavior,
  };
}

function readinessFor(
  node:
    GoalNode,
  dependencyStepIds:
    readonly string[],
  planBlocked:
    boolean,
): CognitivePlanStepReadiness {
  if (
    planBlocked ||
    node.status ===
      "blocked" ||
    node.blockers.length >
      0
  ) {
    return "blocked";
  }

  if (
    dependencyStepIds.length >
    0
  ) {
    return "waiting";
  }

  return "ready";
}

function buildStages(
  steps:
    readonly CognitivePlanStep[],
): CognitivePlanStage[] {
  const stageNumbers =
    [
      ...new Set(
        steps.map(
          (step) =>
            step.stage,
        ),
      ),
    ].sort(
      (
        left,
        right,
      ) =>
        left -
        right,
    );

  return stageNumbers.map(
    (stage) => {
      const stepIds =
        steps
          .filter(
            (step) =>
              step.stage ===
              stage,
          )
          .map(
            (step) =>
              step.id,
          );

      return {
        stage,
        stepIds,
        parallelizable:
          stepIds.length >
          1,
      };
    },
  );
}

export class CognitivePlanningEngine {
  plan(
    input: {
      decomposition:
        GoalDecomposition;
      reasoningContract:
        ReasoningContract;
    },
  ): CognitivePlan {
    const decomposition =
      input.decomposition;

    const contract =
      input.reasoningContract;

    if (
      decomposition.version
        .trim()
        .length ===
      0
    ) {
      throw new Error(
        "OH-4Q requires a versioned OH-4P decomposition.",
      );
    }

    if (
      contract.version
        .trim()
        .length ===
      0
    ) {
      throw new Error(
        "OH-4Q requires a versioned OH-4O reasoning contract.",
      );
    }

    const root =
      decomposition.nodes
        .find(
          (node) =>
            node.id ===
            decomposition
              .rootGoalId,
        );

    if (
      !root ||
      root.kind !==
        "root"
    ) {
      throw new Error(
        "OH-4Q requires a valid OH-4P root goal.",
      );
    }

    const ordered =
      topologicalOrder(
        decomposition,
      );

    const stages =
      stageMap(
        ordered,
        decomposition
          .rootGoalId,
      );

    const planBlocked =
      !decomposition
        .planningReady ||
      decomposition
        .unresolvedQuestions
        .some(
          (question) =>
            question.blocking,
        );

    const steps =
      ordered.map(
        (
          node,
          index,
        ): CognitivePlanStep => {
          const dependsOnStepIds =
            node.dependsOn
              .filter(
                (dependency) =>
                  dependency !==
                  decomposition
                    .rootGoalId,
              )
              .map(
                stepIdForGoal,
              );

          return {
            id:
              stepIdForGoal(
                node.id,
              ),
            sequence:
              index +
              1,
            stage:
              stages.get(
                node.id,
              ) ??
              1,
            goalId:
              node.id,
            kind:
              kindForNode(
                node,
              ),
            title:
              node.title,
            objective:
              node.objective,
            readiness:
              readinessFor(
                node,
                dependsOnStepIds,
                planBlocked,
              ),
            dependsOnStepIds,
            acceptanceCriteria:
              node
                .acceptanceCriteria
                .map(
                  (criterion) =>
                    criterion.description,
                ),
            evidenceNeeds:
              structuredClone(
                node.evidenceNeeds,
              ),
            requiredTools: [
              ...node
                .requiredTools,
            ],
            assumptions: [
              ...node
                .assumptions,
            ],
            blockers: [
              ...node
                .blockers,
            ],
            verification:
              verificationFor(
                node,
                contract,
              ),
            mayExecute:
              false,
            requiresAuthorityBeforeExecution:
              true,
            provenance: {
              goalNodeId:
                node.id,
              goalSourceRef:
                node.provenance
                  .sourceRef,
              planningEngineVersion:
                COGNITIVE_PLANNING_ENGINE_VERSION,
            },
          };
        },
      );

    const warnings =
      uniqueText([
        ...decomposition
          .warnings,
        ...contract
          .warnings,
        ...(
          planBlocked
            ? [
                "Plan is blocked because the goal decomposition is not planning-ready or contains blocking unresolved questions.",
              ]
            : []
        ),
        ...(
          contract.execution
            .allowTools
            ? [
                "Plan may reference tools, but OH-4Q does not execute tools.",
              ]
            : []
        ),
        "Plan order is dependency-derived only; OH-4Q does not assign runtime priority or schedule time.",
      ]);

    return {
      version:
        COGNITIVE_PLANNING_ENGINE_VERSION,
      generatedAt:
        new Date()
          .toISOString(),
      status:
        planBlocked
          ? "blocked"
          : "ready",
      rootGoalId:
        decomposition
          .rootGoalId,
      goal:
        root.title,
      desiredOutcome:
        root.objective,
      strategy:
        contract.strategy,
      steps,
      stages:
        buildStages(
          steps,
        ),
      planningReady:
        !planBlocked,
      unresolvedQuestions:
        structuredClone(
          decomposition
            .unresolvedQuestions,
        ),
      warnings,
      invariants: {
        dependencyOrderValidated:
          true,
        schedulingPerformed:
          false,
        priorityAssigned:
          false,
        actionsExecutable:
          false,
        authorityBypassed:
          false,
      },
    };
  }
}

const defaultCognitivePlanningEngine =
  new CognitivePlanningEngine();

export function getCognitivePlanningEngine():
  CognitivePlanningEngine {
  return defaultCognitivePlanningEngine;
}