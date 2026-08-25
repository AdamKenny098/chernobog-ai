import type {
  WorldModelEntity,
  WorldModelEntityInput,
  WorldModelNeighbor,
  WorldModelRelationship,
  WorldModelRelationshipInput,
  WorldModelSnapshot,
} from "./types";
import {
  buildWorldModelEntity,
  buildWorldModelRelationship,
  normalizeWorldModelEntityId,
} from "./validation";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class ChernobogWorldModelGraph {
  private readonly entities =
    new Map<
      string,
      WorldModelEntity
    >();

  private readonly relationships =
    new Map<
      string,
      WorldModelRelationship
    >();

  get entityCount(): number {
    return this.entities.size;
  }

  get relationshipCount(): number {
    return this.relationships.size;
  }

  upsertEntity(
    input:
      WorldModelEntityInput |
      WorldModelEntity,
  ): WorldModelEntity {
    const entity =
      buildWorldModelEntity(
        input,
      );

    const existing =
      this.entities.get(
        entity.id,
      );

    if (
      existing &&
      existing.observedAt >
        entity.observedAt
    ) {
      return clone(existing);
    }

    this.entities.set(
      entity.id,
      clone(entity),
    );

    return clone(entity);
  }

  getEntity(
    id: string,
  ):
    | WorldModelEntity
    | undefined {
    const entity =
      this.entities.get(
        normalizeWorldModelEntityId(
          id,
        ),
      );

    return entity
      ? clone(entity)
      : undefined;
  }

  listEntities():
    WorldModelEntity[] {
    return [
      ...this.entities.values(),
    ]
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(clone);
  }

  upsertRelationship(
    input:
      WorldModelRelationshipInput |
      WorldModelRelationship,
  ): WorldModelRelationship {
    const relationship =
      buildWorldModelRelationship(
        input,
      );

    if (
      !this.entities.has(
        relationship.fromEntityId,
      ) ||
      !this.entities.has(
        relationship.toEntityId,
      )
    ) {
      throw new Error(
        "world model relationship endpoints must exist before the relationship is added.",
      );
    }

    const existing =
      this.relationships.get(
        relationship.id,
      );

    if (
      existing &&
      existing.observedAt >
        relationship.observedAt
    ) {
      return clone(existing);
    }

    this.relationships.set(
      relationship.id,
      clone(relationship),
    );

    return clone(
      relationship,
    );
  }

  getRelationship(
    id: string,
  ):
    | WorldModelRelationship
    | undefined {
    const relationship =
      this.relationships.get(id);

    return relationship
      ? clone(relationship)
      : undefined;
  }

  listRelationships():
    WorldModelRelationship[] {
    return [
      ...this.relationships.values(),
    ]
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(clone);
  }

  neighbors(
    entityId: string,
  ): WorldModelNeighbor[] {
    const id =
      normalizeWorldModelEntityId(
        entityId,
      );

    if (!this.entities.has(id)) {
      return [];
    }

    const neighbors:
      WorldModelNeighbor[] = [];

    for (
      const relationship
      of this.relationships.values()
    ) {
      if (
        relationship.directed
      ) {
        if (
          relationship.fromEntityId ===
          id
        ) {
          const entity =
            this.entities.get(
              relationship.toEntityId,
            );

          if (entity) {
            neighbors.push({
              entity:
                clone(entity),
              relationship:
                clone(
                  relationship,
                ),
              direction:
                "outgoing",
            });
          }
        }

        if (
          relationship.toEntityId ===
          id
        ) {
          const entity =
            this.entities.get(
              relationship.fromEntityId,
            );

          if (entity) {
            neighbors.push({
              entity:
                clone(entity),
              relationship:
                clone(
                  relationship,
                ),
              direction:
                "incoming",
            });
          }
        }
      } else if (
        relationship.fromEntityId ===
          id ||
        relationship.toEntityId ===
          id
      ) {
        const otherId =
          relationship.fromEntityId ===
          id
            ? relationship
                .toEntityId
            : relationship
                .fromEntityId;

        const entity =
          this.entities.get(
            otherId,
          );

        if (entity) {
          neighbors.push({
            entity:
              clone(entity),
            relationship:
              clone(
                relationship,
              ),
            direction:
              "undirected",
          });
        }
      }
    }

    return neighbors.sort(
      (left, right) => {
        const relationshipOrder =
          left.relationship.id
            .localeCompare(
              right.relationship.id,
            );

        if (
          relationshipOrder !== 0
        ) {
          return relationshipOrder;
        }

        return left.entity.id.localeCompare(
          right.entity.id,
        );
      },
    );
  }

  snapshot():
    WorldModelSnapshot {
    return {
      entities:
        this.listEntities(),
      relationships:
        this.listRelationships(),
    };
  }

  clear(): void {
    this.entities.clear();
    this.relationships.clear();
  }
}
