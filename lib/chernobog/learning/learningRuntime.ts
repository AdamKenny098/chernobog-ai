import {
  join,
} from "node:path";

import type {
  CognitiveAttentionSignal,
  CognitiveRuntimeCycle,
} from "../cognition";
import {
  adaptAttentionWithLessons,
} from "./adaptationEngine";
import {
  activeLessonGuidance,
} from "./lessonGuidance";
import {
  ChernobogLearningEvaluationStore,
} from "./evaluationStore";
import {
  evaluateLearningExperience,
} from "./evaluator";
import {
  ChernobogLearningExperienceStore,
} from "./experienceStore";
import {
  learningExperienceFromCognitiveCycle,
} from "./fromCognitiveCycle";
import {
  ChernobogLearnedLessonStore,
} from "./lessonStore";
import {
  promoteLearningPattern,
  revokeLearnedLesson,
} from "./lessonPromotion";
import {
  extractLearningPatterns,
} from "./patternExtractor";
import {
  ChernobogLearningPatternStore,
} from "./patternStore";
import type {
  LearningFeedbackObservation,
  LearningOutcomeObservation,
  EvaluatedLearningExperience,
} from "./evaluationTypes";
import type {
  LearningPromotionContext,
} from "./promotionTypes";
import type {
  ChernobogLearningRuntimeOptions,
  LearningRuntimeSnapshot,
} from "./runtimeTypes";

export class ChernobogLearningRuntime {
  readonly experiences =
    new ChernobogLearningExperienceStore();

  readonly evaluations =
    new ChernobogLearningEvaluationStore();

  readonly patterns =
    new ChernobogLearningPatternStore();

  readonly lessons =
    new ChernobogLearnedLessonStore();

  private readonly lessonPath: string;

  private readonly clock:
    () => Date;

  constructor(
    options:
      ChernobogLearningRuntimeOptions = {},
  ) {
    this.lessonPath =
      options.lessonPath ??
      join(
        process.cwd(),
        ".chernobog",
        "learning",
        "lessons.json",
      );

    this.clock =
      options.clock ??
      (() => new Date());
  }

  async initialize(): Promise<void> {
    try {
      await this.lessons.load(
        this.lessonPath,
      );
    } catch (error) {
      const code =
        (
          error as NodeJS.ErrnoException
        ).code;

      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  captureCognitiveCycle(
    cycle: CognitiveRuntimeCycle,
  ) {
    const experience =
      learningExperienceFromCognitiveCycle(
        cycle,
        this.clock(),
      );

    this.experiences.upsert(
      experience,
    );

    return structuredClone(
      experience,
    );
  }

  addOutcome(
    observation:
      LearningOutcomeObservation,
  ): void {
    this.evaluations.addOutcome(
      observation,
    );
  }

  addFeedback(
    observation:
      LearningFeedbackObservation,
  ): void {
    this.evaluations.addFeedback(
      observation,
    );
  }

  evaluateExperience(
    experienceId: string,
  ):
    | EvaluatedLearningExperience
    | undefined {
    const experience =
      this.experiences.get(
        experienceId,
      );

    if (!experience) {
      return undefined;
    }

    return evaluateLearningExperience(
      experience,
      this.evaluations.outcomesFor(
        experienceId,
      ),
      this.evaluations.feedbackFor(
        experienceId,
      ),
      this.clock(),
    );
  }

  refreshPatterns(): void {
    const evaluated =
      this.experiences
        .list()
        .map((experience) =>
          this.evaluateExperience(
            experience.id,
          ),
        )
        .filter(
          (
            value,
          ): value is EvaluatedLearningExperience =>
            Boolean(value),
        );

    const result =
      extractLearningPatterns(
        evaluated,
      );

    this.patterns.clear();

    for (
      const candidate
      of result.candidates
    ) {
      this.patterns.upsert(
        candidate,
      );
    }
  }

  async promote(
    patternKey: string,
    context:
      LearningPromotionContext,
  ) {
    const pattern =
      this.patterns.get(
        patternKey,
      );

    if (!pattern) {
      throw new Error(
        `learning pattern not found: ${patternKey}`,
      );
    }

    const lesson =
      promoteLearningPattern(
        pattern,
        context,
        {
          now:
            this.clock(),
        },
      );

    this.lessons.upsert(
      lesson,
    );

    await this.persistLessons();

    return structuredClone(
      lesson,
    );
  }

  async revoke(
    lessonKey: string,
    reason: string,
  ) {
    const lesson =
      this.lessons.get(
        lessonKey,
      );

    if (!lesson) {
      throw new Error(
        `learned lesson not found: ${lessonKey}`,
      );
    }

    const revoked =
      revokeLearnedLesson(
        lesson,
        reason,
        this.clock(),
      );

    this.lessons.upsert(
      revoked,
    );

    await this.persistLessons();

    return structuredClone(
      revoked,
    );
  }

  adaptSignal(
    signal:
      CognitiveAttentionSignal,
  ) {
    return adaptAttentionWithLessons(
      signal,
      this.lessons.list({
        activeOnly: true,
      }),
    );
  }

  guidance(): string[] {
    return activeLessonGuidance(
      this.lessons.list({
        activeOnly: true,
      }),
    );
  }

  async persistLessons():
    Promise<void> {
    await this.lessons.save(
      this.lessonPath,
      this.clock(),
    );
  }

  snapshot():
    LearningRuntimeSnapshot {
    const evaluations =
      this.experiences
        .list()
        .map((experience) =>
          this.evaluateExperience(
            experience.id,
          ),
        )
        .filter(
          (
            value,
          ): value is EvaluatedLearningExperience =>
            Boolean(value),
        );

    return {
      generatedAt:
        this.clock().toISOString(),
      experiences:
        this.experiences.list(),
      evaluations,
      patterns:
        this.patterns.list(),
      lessons:
        this.lessons.list(),
      activeLessons:
        this.lessons.list({
          activeOnly: true,
        }),
    };
  }
}
