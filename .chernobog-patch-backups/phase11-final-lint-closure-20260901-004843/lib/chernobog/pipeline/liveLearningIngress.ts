import {
  getChernobogCognitiveRuntime,
} from "../cognition";
import {
  createLearningFeedbackObservation,
  getChernobogLearningRuntime,
} from "../learning";

export interface LiveLearningIngressInput {
  projectId?: string;
  sessionId?: string;
}

export interface ExplicitLearningCorrectionInput {
  userMessage: string;
  sessionId: string;
  projectId?: string;
}

export type ExplicitLearningCorrectionResult =
  | {
      status: "ignored";
      reason:
        | "not-explicit-correction"
        | "no-linked-experience"
        | "project-scope-mismatch"
        | "experience-unavailable";
    }
  | {
      status: "associated";
      experienceId: string;
      correction: string;
      projectId?: string;
    }
  | {
      status: "unavailable";
      reason: string;
    };

interface LiveLearningExperienceLink {
  experienceId: string;
  projectId?: string;
}

type LiveLearningGlobals =
  typeof globalThis & {
    __chernobogLiveLearningExperienceBySession?:
      Map<
        string,
        LiveLearningExperienceLink
      >;
  };

const liveLearningGlobals =
  globalThis as LiveLearningGlobals;

function liveLearningExperienceRegistry():
  Map<
    string,
    LiveLearningExperienceLink
  > {
  if (
    !liveLearningGlobals
      .__chernobogLiveLearningExperienceBySession
  ) {
    liveLearningGlobals
      .__chernobogLiveLearningExperienceBySession =
        new Map();
  }

  return liveLearningGlobals
    .__chernobogLiveLearningExperienceBySession;
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

function normalizeSessionId(
  value?: string,
): string | undefined {
  const normalized =
    value?.trim();

  return normalized || undefined;
}

export function extractExplicitLearningCorrection(
  userMessage: string,
): string | undefined {
  const normalized =
    userMessage.trim();

  const patterns = [
    /^correction\s*:\s*([\s\S]+)$/i,
    /^(?:no,\s*)?(?:that's|that is)\s+wrong(?:\s*[:,.\-]\s*|\s+)([\s\S]+)$/i,
    /^you\s+(?:got|have)\s+that\s+wrong(?:\s*[:,.\-]\s*|\s+)([\s\S]+)$/i,
    /^you(?:'re|\s+are)\s+wrong(?:\s*[:,.\-]\s*|\s+)([\s\S]+)$/i,
  ];

  for (const pattern of patterns) {
    const match =
      normalized.match(pattern);

    const detail =
      match?.[1]?.trim();

    if (detail) {
      return detail;
    }
  }

  return undefined;
}

function failureReason(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export async function associateExplicitLearningCorrection(
  input: ExplicitLearningCorrectionInput,
  dependencies:
    Pick<
      LiveLearningIngressDependencies,
      "getLearningRuntime"
    > = {},
): Promise<ExplicitLearningCorrectionResult> {
  const correction =
    extractExplicitLearningCorrection(
      input.userMessage,
    );

  if (!correction) {
    return {
      status:
        "ignored",
      reason:
        "not-explicit-correction",
    };
  }

  const sessionId =
    normalizeSessionId(
      input.sessionId,
    );

  if (!sessionId) {
    return {
      status:
        "ignored",
      reason:
        "no-linked-experience",
    };
  }

  const registry =
    liveLearningExperienceRegistry();

  const link =
    registry.get(
      sessionId,
    );

  if (!link) {
    return {
      status:
        "ignored",
      reason:
        "no-linked-experience",
    };
  }

  const projectId =
    normalizeProjectId(
      input.projectId,
    );

  if (
    link.projectId !== projectId
  ) {
    registry.delete(
      sessionId,
    );

    return {
      status:
        "ignored",
      reason:
        "project-scope-mismatch",
    };
  }

  try {
    const getLearningRuntime =
      dependencies.getLearningRuntime ??
      getChernobogLearningRuntime;

    const learning =
      await getLearningRuntime();

    const experience =
      learning.experiences.get(
        link.experienceId,
      );

    if (!experience) {
      registry.delete(
        sessionId,
      );

      return {
        status:
          "ignored",
        reason:
          "experience-unavailable",
      };
    }

    const experienceProjectId =
      typeof experience.context.projectId ===
        "string"
        ? normalizeProjectId(
            experience.context.projectId,
          )
        : undefined;

    if (
      experienceProjectId !==
      projectId
    ) {
      registry.delete(
        sessionId,
      );

      return {
        status:
          "ignored",
        reason:
          "project-scope-mismatch",
      };
    }

    const observedAt =
      new Date().toISOString();

    const observation =
      createLearningFeedbackObservation(
        {
          id:
            `feedback:${link.experienceId}:${observedAt}`,
          experienceId:
            link.experienceId,
          observedAt,
          kind:
            "correction",
          confidence:
            1,
          detail:
            correction,
        } as any,
      );

    learning.addFeedback(
      observation,
    );

    learning.refreshPatterns();

    /*
     * Consume the association once so repeated later
     * messages cannot inflate evidence for one prior
     * experience.
     */
    registry.delete(
      sessionId,
    );

    return {
      status:
        "associated",
      experienceId:
        link.experienceId,
      correction,
      projectId,
    };
  } catch (error) {
    return {
      status:
        "unavailable",
      reason:
        failureReason(error),
    };
  }
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

  const sessionId =
    normalizeSessionId(
      input.sessionId,
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

    if (sessionId) {
      liveLearningExperienceRegistry().set(
        sessionId,
        {
          experienceId:
            experience.id,
          projectId,
        },
      );
    }

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
