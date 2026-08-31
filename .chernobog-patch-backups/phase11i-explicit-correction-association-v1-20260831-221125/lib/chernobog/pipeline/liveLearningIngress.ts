import {
  getChernobogCognitiveRuntime,
} from "../cognition";
import {
  getChernobogLearningRuntime,
} from "../learning";

export interface LiveLearningIngressInput {
  projectId?: string;
}

export type LiveLearningIngressResult =
  | {
      status: "captured";
      cycle: number;
      experienceId: string;
      projectId?: string;
    }
  | {
      status: "unavailable";
      reason: string;
      projectId?: string;
    };

interface LiveLearningIngressDependencies {
  getCognitiveRuntime?:
    typeof getChernobogCognitiveRuntime;
  getLearningRuntime?:
    typeof getChernobogLearningRuntime;
}

function normalizeProjectId(
  value?: string,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized || undefined;
}

function failureReason(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export async function captureLiveLearningIngress(
  input: LiveLearningIngressInput = {},
  dependencies:
    LiveLearningIngressDependencies = {},
): Promise<LiveLearningIngressResult> {
  const projectId =
    normalizeProjectId(
      input.projectId,
    );

  try {
    const getCognitiveRuntime =
      dependencies.getCognitiveRuntime ??
      getChernobogCognitiveRuntime;

    const getLearningRuntime =
      dependencies.getLearningRuntime ??
      getChernobogLearningRuntime;

    const cognition =
      await getCognitiveRuntime();

    const learning =
      await getLearningRuntime();

    const cycle =
      await cognition.evaluate();

    const experience =
      learning.captureCognitiveCycle(
        cycle,
        {
          projectId,
        },
      );

    return {
      status:
        "captured",
      cycle:
        cycle.cycle,
      experienceId:
        experience.id,
      projectId,
    };
  } catch (error) {
    /*
     * Cognition/learning ingress is advisory telemetry.
     * A failure here must never block or replace the
     * already-generated user-facing response.
     */
    return {
      status:
        "unavailable",
      reason:
        failureReason(error),
      projectId,
    };
  }
}
