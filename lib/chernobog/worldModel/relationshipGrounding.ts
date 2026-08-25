import type {
  WorldStateRecord,
} from "../worldState";
import type {
  WorldModelProjection,
} from "./projectionTypes";
import type {
  WorldModelEntityInput,
  WorldModelEntityKind,
  WorldModelRelationshipInput,
} from "./types";
import {
  worldModelEntityFromWorldState,
} from "./worldStateGrounding";

function evidenceFor(
  record: WorldStateRecord,
) {
  return {
    worldStateKeys: [
      record.key,
    ],
    eventIds:
      record.provenance?.eventId
        ? [
            record.provenance.eventId,
          ]
        : [],
  };
}

function canonicalEntity(
  id: string,
  kind: WorldModelEntityKind,
  label: string,
  record: WorldStateRecord,
): WorldModelEntityInput {
  return {
    id,
    kind,
    label,
    confidence:
      record.confidence,
    observedAt:
      record.observedAt,
    evidence:
      evidenceFor(record),
  };
}

function relationship(
  type: string,
  fromEntityId: string,
  toEntityId: string,
  record: WorldStateRecord,
): WorldModelRelationshipInput {
  return {
    type,
    fromEntityId,
    toEntityId,
    directed: true,
    confidence:
      record.confidence,
    observedAt:
      record.observedAt,
    evidence:
      evidenceFor(record),
  };
}

function tokenize(
  key: string,
): string[] {
  return key
    .split(".")
    .map((part) =>
      part.trim().toLowerCase(),
    )
    .filter(Boolean);
}

function serviceProjection(
  record: WorldStateRecord,
  parts: string[],
): WorldModelProjection {
  const serviceName =
    parts[1];

  if (!serviceName) {
    return {
      sourceKey: record.key,
      entities: [
        worldModelEntityFromWorldState(
          record,
        ),
      ],
      relationships: [],
    };
  }

  const serviceId =
    `service:${serviceName}`;

  const factId =
    `world-state:${record.key}`;

  return {
    sourceKey: record.key,
    entities: [
      canonicalEntity(
        serviceId,
        "service",
        serviceName,
        record,
      ),
      worldModelEntityFromWorldState(
        record,
      ),
    ],
    relationships: [
      relationship(
        "has-state",
        serviceId,
        factId,
        record,
      ),
    ],
  };
}

function projectProjection(
  record: WorldStateRecord,
  parts: string[],
): WorldModelProjection {
  const projectName =
    parts[1];

  if (!projectName) {
    return {
      sourceKey: record.key,
      entities: [
        worldModelEntityFromWorldState(
          record,
        ),
      ],
      relationships: [],
    };
  }

  const projectId =
    `project:${projectName}`;

  const factId =
    `world-state:${record.key}`;

  const entities:
    WorldModelEntityInput[] = [
      canonicalEntity(
        projectId,
        "project",
        projectName,
        record,
      ),
      worldModelEntityFromWorldState(
        record,
      ),
    ];

  const relationships:
    WorldModelRelationshipInput[] = [
      relationship(
        "has-state",
        projectId,
        factId,
        record,
      ),
    ];

  const repositoryIndex =
    parts.indexOf(
      "repository",
    );

  if (
    repositoryIndex >= 0 &&
    parts[
      repositoryIndex + 1
    ]
  ) {
    const repositoryName =
      parts[
        repositoryIndex + 1
      ]!;

    const repositoryId =
      `repository:${repositoryName}`;

    entities.push(
      canonicalEntity(
        repositoryId,
        "repository",
        repositoryName,
        record,
      ),
    );

    relationships.push(
      relationship(
        "uses-repository",
        projectId,
        repositoryId,
        record,
      ),
    );
  }

  return {
    sourceKey: record.key,
    entities,
    relationships,
  };
}

function repositoryProjection(
  record: WorldStateRecord,
  parts: string[],
): WorldModelProjection {
  const repositoryName =
    parts[1];

  if (!repositoryName) {
    return {
      sourceKey: record.key,
      entities: [
        worldModelEntityFromWorldState(
          record,
        ),
      ],
      relationships: [],
    };
  }

  const repositoryId =
    `repository:${repositoryName}`;

  const factId =
    `world-state:${record.key}`;

  return {
    sourceKey: record.key,
    entities: [
      canonicalEntity(
        repositoryId,
        "repository",
        repositoryName,
        record,
      ),
      worldModelEntityFromWorldState(
        record,
      ),
    ],
    relationships: [
      relationship(
        "has-state",
        repositoryId,
        factId,
        record,
      ),
    ],
  };
}

function modelProjection(
  record: WorldStateRecord,
  parts: string[],
): WorldModelProjection {
  const modelName =
    parts[1];

  if (!modelName) {
    return {
      sourceKey: record.key,
      entities: [
        worldModelEntityFromWorldState(
          record,
        ),
      ],
      relationships: [],
    };
  }

  const modelId =
    `model:${modelName}`;

  const factId =
    `world-state:${record.key}`;

  return {
    sourceKey: record.key,
    entities: [
      canonicalEntity(
        modelId,
        "model",
        modelName,
        record,
      ),
      worldModelEntityFromWorldState(
        record,
      ),
    ],
    relationships: [
      relationship(
        "has-state",
        modelId,
        factId,
        record,
      ),
    ],
  };
}

function infrastructureProjection(
  record: WorldStateRecord,
  parts: string[],
  kind:
    "storage" |
    "backup",
): WorldModelProjection {
  const name =
    parts[1];

  if (!name) {
    return {
      sourceKey: record.key,
      entities: [
        worldModelEntityFromWorldState(
          record,
        ),
      ],
      relationships: [],
    };
  }

  const entityId =
    `${kind}:${name}`;

  const factId =
    `world-state:${record.key}`;

  return {
    sourceKey: record.key,
    entities: [
      canonicalEntity(
        entityId,
        kind,
        name,
        record,
      ),
      worldModelEntityFromWorldState(
        record,
      ),
    ],
    relationships: [
      relationship(
        "has-state",
        entityId,
        factId,
        record,
      ),
    ],
  };
}

export function groundWorldStateRelationship(
  record: WorldStateRecord,
): WorldModelProjection {
  const parts =
    tokenize(record.key);

  switch (record.namespace) {
    case "service":
      return serviceProjection(
        record,
        parts,
      );

    case "project":
      return projectProjection(
        record,
        parts,
      );

    case "repository":
      return repositoryProjection(
        record,
        parts,
      );

    case "model":
      return modelProjection(
        record,
        parts,
      );

    case "storage":
      return infrastructureProjection(
        record,
        parts,
        "storage",
      );

    case "backup":
      return infrastructureProjection(
        record,
        parts,
        "backup",
      );

    default:
      return {
        sourceKey:
          record.key,
        entities: [
          worldModelEntityFromWorldState(
            record,
          ),
        ],
        relationships: [],
      };
  }
}
