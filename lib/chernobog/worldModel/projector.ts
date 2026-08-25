import type {
  WorldStateRecord,
} from "../worldState";
import {
  ChernobogWorldModelGraph,
} from "./graph";
import {
  groundWorldStateRelationship,
} from "./relationshipGrounding";
import type {
  WorldModelProjectionResult,
  WorldModelRelationshipGrounder,
} from "./projectionTypes";

export class ChernobogWorldModelProjector {
  readonly graph:
    ChernobogWorldModelGraph;

  private readonly ground:
    WorldModelRelationshipGrounder;

  constructor(
    options: {
      graph?:
        ChernobogWorldModelGraph;
      ground?:
        WorldModelRelationshipGrounder;
    } = {},
  ) {
    this.graph =
      options.graph ??
      new ChernobogWorldModelGraph();

    this.ground =
      options.ground ??
      groundWorldStateRelationship;
  }

  project(
    records:
      readonly WorldStateRecord[],
  ): WorldModelProjectionResult {
    let entityWrites = 0;
    let relationshipWrites = 0;
    let skippedRelationships = 0;

    const projections =
      [...records]
        .sort(
          (left, right) =>
            left.key.localeCompare(
              right.key,
            ),
        )
        .map((record) =>
          this.ground(record),
        );

    for (
      const projection
      of projections
    ) {
      const entities =
        projection.entities
          .slice()
          .sort(
            (left, right) =>
              left.id.localeCompare(
                right.id,
              ),
          );

      for (
        const entity
        of entities
      ) {
        this.graph.upsertEntity(
          entity,
        );

        entityWrites += 1;
      }
    }

    for (
      const projection
      of projections
    ) {
      const relationships =
        projection.relationships
          .slice()
          .sort(
            (left, right) => {
              const leftKey =
                `${left.type}:${left.fromEntityId}:${left.toEntityId}`;

              const rightKey =
                `${right.type}:${right.fromEntityId}:${right.toEntityId}`;

              return leftKey.localeCompare(
                rightKey,
              );
            },
          );

      for (
        const relation
        of relationships
      ) {
        if (
          !this.graph.getEntity(
            relation.fromEntityId,
          ) ||
          !this.graph.getEntity(
            relation.toEntityId,
          )
        ) {
          skippedRelationships += 1;
          continue;
        }

        this.graph.upsertRelationship(
          relation,
        );

        relationshipWrites += 1;
      }
    }

    return {
      projectedRecords:
        projections.length,
      entityWrites,
      relationshipWrites,
      skippedRelationships,
    };
  }
}
