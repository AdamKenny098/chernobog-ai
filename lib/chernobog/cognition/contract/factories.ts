import {
  COGNITIVE_CONTRACT_VERSION,
  type CognitiveResult,
  type CognitiveResultStatus,
  type CognitiveTask,
  type CognitiveTaskSource,
} from "./types";

export function createCognitiveTask(input: {
  id: string;
  source: CognitiveTaskSource;
  rawInput: string;
  createdAt?: string;
}): CognitiveTask {
  return {
    contractVersion:
      COGNITIVE_CONTRACT_VERSION,
    id: input.id,
    createdAt:
      input.createdAt ??
      new Date().toISOString(),
    source: input.source,
    rawInput: input.rawInput,
    constraints: [],
  };
}

export function createEmptyCognitiveResult(
  task: CognitiveTask,
  status: CognitiveResultStatus,
  generatedAt = new Date().toISOString(),
): CognitiveResult {
  return {
    contractVersion:
      COGNITIVE_CONTRACT_VERSION,
    taskId: task.id,
    status,
    conclusions: [],
    assumptions: [],
    uncertainties: [],
    proposedActions: [],
    evidence: [],
    confidence: {},
    provenance: {
      taskId: task.id,
      generatedAt,
      contextReferenceIds: [],
      validationIds: [],
    },
  };
}