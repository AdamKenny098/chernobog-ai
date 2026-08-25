import type {
  ChernobogWorldModelGraph,
} from "./graph";
import type {
  WorldModelDependencyPath,
  WorldModelImpactAssessment,
} from "./causalTypes";
import type {
  WorldModelRelationship,
} from "./types";
import {
  normalizeWorldModelEntityId,
} from "./validation";

const DEPENDENCY_RELATIONSHIP_TYPES =
  new Set([
    "depends-on",
    "uses-repository",
    "requires-model",
    "hosted-on",
    "served-by",
    "backed-by",
  ]);

export function isDependencyRelationship(
  relationship:
    WorldModelRelationship,
): boolean {
  return (
    relationship.directed &&
    DEPENDENCY_RELATIONSHIP_TYPES.has(
      relationship.type,
    )
  );
}

function outgoingDependencyRelationships(
  graph:
    ChernobogWorldModelGraph,
  entityId: string,
): WorldModelRelationship[] {
  return graph
    .listRelationships()
    .filter(
      (relationship) =>
        isDependencyRelationship(
          relationship,
        ) &&
        relationship.fromEntityId ===
          entityId,
    )
    .sort(
      (left, right) =>
        left.id.localeCompare(
          right.id,
        ),
    );
}

function incomingDependencyRelationships(
  graph:
    ChernobogWorldModelGraph,
  entityId: string,
): WorldModelRelationship[] {
  return graph
    .listRelationships()
    .filter(
      (relationship) =>
        isDependencyRelationship(
          relationship,
        ) &&
        relationship.toEntityId ===
          entityId,
    )
    .sort(
      (left, right) =>
        left.id.localeCompare(
          right.id,
        ),
    );
}

export function findDependencyPaths(
  graph:
    ChernobogWorldModelGraph,
  fromEntityId: string,
  toEntityId: string,
  options: {
    maxDepth?: number;
  } = {},
): WorldModelDependencyPath[] {
  const from =
    normalizeWorldModelEntityId(
      fromEntityId,
    );

  const to =
    normalizeWorldModelEntityId(
      toEntityId,
    );

  const maxDepth =
    options.maxDepth ?? 8;

  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 1 ||
    maxDepth > 32
  ) {
    throw new Error(
      "world model dependency maxDepth must be an integer between 1 and 32.",
    );
  }

  if (
    !graph.getEntity(from) ||
    !graph.getEntity(to)
  ) {
    return [];
  }

  const paths:
    WorldModelDependencyPath[] = [];

  const visit = (
    current: string,
    entityIds: string[],
    relationshipIds: string[],
  ): void => {
    if (
      relationshipIds.length >=
      maxDepth
    ) {
      return;
    }

    for (
      const relationship
      of outgoingDependencyRelationships(
        graph,
        current,
      )
    ) {
      const next =
        relationship.toEntityId;

      if (
        entityIds.includes(next)
      ) {
        continue;
      }

      const nextEntities = [
        ...entityIds,
        next,
      ];

      const nextRelationships = [
        ...relationshipIds,
        relationship.id,
      ];

      if (next === to) {
        paths.push({
          fromEntityId: from,
          toEntityId: to,
          relationshipIds:
            nextRelationships,
          entityIds:
            nextEntities,
          depth:
            nextRelationships.length,
        });

        continue;
      }

      visit(
        next,
        nextEntities,
        nextRelationships,
      );
    }
  };

  visit(
    from,
    [from],
    [],
  );

  return paths.sort(
    (left, right) => {
      if (
        left.depth !== right.depth
      ) {
        return (
          left.depth -
          right.depth
        );
      }

      return left.relationshipIds
        .join("|")
        .localeCompare(
          right.relationshipIds
            .join("|"),
        );
    },
  );
}

export function assessDownstreamImpact(
  graph:
    ChernobogWorldModelGraph,
  sourceEntityId: string,
  options: {
    maxDepth?: number;
  } = {},
): WorldModelImpactAssessment {
  const source =
    normalizeWorldModelEntityId(
      sourceEntityId,
    );

  const maxDepth =
    options.maxDepth ?? 8;

  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 1 ||
    maxDepth > 32
  ) {
    throw new Error(
      "world model impact maxDepth must be an integer between 1 and 32.",
    );
  }

  if (!graph.getEntity(source)) {
    return {
      sourceEntityId: source,
      directlyDependentEntityIds: [],
      transitivelyDependentEntityIds: [],
      dependencyPaths: [],
    };
  }

  const direct =
    incomingDependencyRelationships(
      graph,
      source,
    )
      .map(
        (relationship) =>
          relationship.fromEntityId,
      )
      .sort();

  const pathByKey =
    new Map<
      string,
      WorldModelDependencyPath
    >();

  const visitDependents = (
    currentDependency: string,
    entityIds: string[],
    relationshipIds: string[],
  ): void => {
    if (
      relationshipIds.length >=
      maxDepth
    ) {
      return;
    }

    for (
      const relationship
      of incomingDependencyRelationships(
        graph,
        currentDependency,
      )
    ) {
      const dependent =
        relationship.fromEntityId;

      if (
        entityIds.includes(
          dependent,
        )
      ) {
        continue;
      }

      const nextEntityIds = [
        dependent,
        ...entityIds,
      ];

      const nextRelationshipIds = [
        relationship.id,
        ...relationshipIds,
      ];

      const path:
        WorldModelDependencyPath = {
          fromEntityId:
            dependent,
          toEntityId:
            source,
          relationshipIds:
            nextRelationshipIds,
          entityIds:
            nextEntityIds,
          depth:
            nextRelationshipIds.length,
        };

      pathByKey.set(
        `${dependent}->${source}:${nextRelationshipIds.join("|")}`,
        path,
      );

      visitDependents(
        dependent,
        nextEntityIds,
        nextRelationshipIds,
      );
    }
  };

  for (
    const relationship
    of incomingDependencyRelationships(
      graph,
      source,
    )
  ) {
    const dependent =
      relationship.fromEntityId;

    const path:
      WorldModelDependencyPath = {
        fromEntityId:
          dependent,
        toEntityId:
          source,
        relationshipIds: [
          relationship.id,
        ],
        entityIds: [
          dependent,
          source,
        ],
        depth: 1,
      };

    pathByKey.set(
      `${dependent}->${source}:${relationship.id}`,
      path,
    );

    visitDependents(
      dependent,
      [
        dependent,
        source,
      ],
      [
        relationship.id,
      ],
    );
  }

  const paths = [
    ...pathByKey.values(),
  ].sort(
    (left, right) => {
      if (
        left.depth !== right.depth
      ) {
        return (
          left.depth -
          right.depth
        );
      }

      return left.fromEntityId
        .localeCompare(
          right.fromEntityId,
        );
    },
  );

  const allDependents = [
    ...new Set(
      paths.map(
        (path) =>
          path.fromEntityId,
      ),
    ),
  ].sort();

  const transitive =
    allDependents.filter(
      (id) =>
        !direct.includes(id),
    );

  return {
    sourceEntityId: source,
    directlyDependentEntityIds:
      direct,
    transitivelyDependentEntityIds:
      transitive,
    dependencyPaths:
      paths,
  };
}
