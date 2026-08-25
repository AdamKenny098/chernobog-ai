import type {
  WorldStateRecord,
} from "../worldState";
import type {
  WorldModelEntityInput,
} from "./types";

function kindFromNamespace(
  namespace: string,
): WorldModelEntityInput["kind"] {
  switch (namespace) {
    case "service":
      return "service";
    case "project":
      return "project";
    case "model":
      return "model";
    case "storage":
      return "storage";
    case "backup":
      return "backup";
    case "repository":
      return "repository";
    case "desktop":
      return "application";
    case "runtime":
    case "system":
      return "system";
    default:
      return "fact";
  }
}

export function worldModelEntityFromWorldState(
  record: WorldStateRecord,
): WorldModelEntityInput {
  return {
    id:
      `world-state:${record.key}`,
    kind:
      kindFromNamespace(
        record.namespace,
      ),
    label:
      record.key,
    confidence:
      record.confidence,
    observedAt:
      record.observedAt,
    attributes: {
      value:
        structuredClone(
          record.value,
        ),
      freshness:
        structuredClone(
          record.freshness,
        ),
    },
    evidence: {
      worldStateKeys: [
        record.key,
      ],
      eventIds:
        record.provenance?.eventId
          ? [
              record.provenance.eventId,
            ]
          : [],
    },
  };
}

