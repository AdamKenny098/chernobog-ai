import type {
  LearningExperience,
} from "./types";

function cloneExperience(
  experience: LearningExperience,
): LearningExperience {
  return structuredClone(experience);
}

export class ChernobogLearningExperienceStore {
  private readonly experiences =
    new Map<string, LearningExperience>();

  private readonly maxEntries: number;

  constructor(maxEntries = 512) {
    if (
      !Number.isInteger(maxEntries) ||
      maxEntries < 1
    ) {
      throw new Error(
        "learning experience store maxEntries must be a positive integer.",
      );
    }

    this.maxEntries = maxEntries;
  }

  get size(): number {
    return this.experiences.size;
  }

  upsert(
    experience: LearningExperience,
  ): LearningExperience {
    this.experiences.set(
      experience.id,
      cloneExperience(experience),
    );

    this.trim();

    return cloneExperience(experience);
  }

  get(
    id: string,
  ): LearningExperience | undefined {
    const experience = this.experiences.get(id);

    return experience
      ? cloneExperience(experience)
      : undefined;
  }

  list(): LearningExperience[] {
    return [...this.experiences.values()]
      .sort((left, right) => {
        const timeOrder =
          right.occurredAt.localeCompare(
            left.occurredAt,
          );

        if (timeOrder !== 0) {
          return timeOrder;
        }

        return left.id.localeCompare(right.id);
      })
      .map(cloneExperience);
  }

  remove(id: string): boolean {
    return this.experiences.delete(id);
  }

  clear(): void {
    this.experiences.clear();
  }

  private trim(): void {
    const ordered = this.list();

    for (
      const experience
      of ordered.slice(this.maxEntries)
    ) {
      this.experiences.delete(experience.id);
    }
  }
}
