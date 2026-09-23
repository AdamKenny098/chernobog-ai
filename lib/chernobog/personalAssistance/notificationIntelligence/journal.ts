import {
  appendFile,
  mkdir,
} from "node:fs/promises";
import path from "node:path";
import type {
  NotificationProjectionResult,
} from "./types";

type JournalEntry = {
  eventId: string;
  analyzedAt: string;
  classification: string;
  classificationConfidence: number;
  correspondence: boolean;
  correspondenceConfidence: number;
  actionRequired: boolean;
  actionKind: string;
  actionConfidence: number;
  importance: string;
  contentAvailability: string;
  outcome: string;
  responsibilityId?: string;
};

export class NotificationIntelligenceJournal {
  private readonly directory:
    string;

  private readonly filePath:
    string;

  private serial:
    Promise<void> =
    Promise.resolve();

  constructor(
    directory =
      path.join(
        process.cwd(),
        "data",
        "personal-assistance",
      ),
  ) {
    this.directory =
      directory;

    this.filePath =
      path.join(
        directory,
        "notification-intelligence.jsonl",
      );
  }

  async append(
    result:
      NotificationProjectionResult,
  ): Promise<void> {
    const entry:
      JournalEntry = {
      eventId:
        result.intelligence.eventId,
      analyzedAt:
        result.intelligence.analyzedAt,
      classification:
        result.intelligence.classification.kind,
      classificationConfidence:
        result.intelligence.classification.confidence,
      correspondence:
        result.intelligence.correspondence.likelyCorrespondence,
      correspondenceConfidence:
        result.intelligence.correspondence.confidence,
      actionRequired:
        result.intelligence.action.actionRequired,
      actionKind:
        result.intelligence.action.kind,
      actionConfidence:
        result.intelligence.action.confidence,
      importance:
        result.intelligence.importance.level,
      contentAvailability:
        result.intelligence.contentAvailability,
      outcome:
        result.outcome,
      responsibilityId:
        result.responsibilityId,
    };

    const previous =
      this.serial;

    let release:
      (() => void) | undefined;

    this.serial =
      new Promise<void>(
        (resolve) => {
          release =
            resolve;
        },
      );

    await previous;

    try {
      await mkdir(
        this.directory,
        {
          recursive: true,
        },
      );

      await appendFile(
        this.filePath,
        `${JSON.stringify(entry)}\n`,
        "utf8",
      );
    } finally {
      release?.();
    }
  }
}

let singleton:
  NotificationIntelligenceJournal | null =
  null;

export function getNotificationIntelligenceJournal():
  NotificationIntelligenceJournal {
  singleton ??=
    new NotificationIntelligenceJournal();

  return singleton;
}
