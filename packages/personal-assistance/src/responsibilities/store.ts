import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
  appendFile,
} from "node:fs/promises";
import path from "node:path";
import {
  randomUUID,
} from "node:crypto";
import {
  assertResponsibilityTransition,
  isClosedResponsibilityState,
} from "./stateMachine";
import type {
  CreateResponsibilityInput,
  Responsibility,
  ResponsibilityAuditEntry,
  ResponsibilityCreateResult,
  ResponsibilityEvidence,
  ResponsibilityListFilter,
  TransitionResponsibilityInput,
  UpdateResponsibilityInput,
} from "./types";

type ResponsibilityFile = {
  schemaVersion: 1;
  responsibilities: Responsibility[];
};

const EMPTY_FILE:
  ResponsibilityFile = {
    schemaVersion: 1,
    responsibilities: [],
  };

const LOCK_DIRECTORY_NAME =
  "responsibilities.lock";

const LOCK_RETRY_MS =
  25;

const LOCK_TIMEOUT_MS =
  15_000;

const LOCK_STALE_MS =
  60_000;

const RENAME_RETRY_DELAYS_MS =
  [
    10,
    25,
    50,
    100,
    200,
  ] as const;

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function now():
  string {
  return new Date().toISOString();
}

function sourceIdentity(
  responsibility:
    Pick<
      Responsibility,
      "source"
    >,
): string | null {
  if (
    !responsibility.source.sourceId
  ) {
    return null;
  }

  return [
    responsibility.source.type,
    responsibility.source.sourceId,
  ].join(":");
}

function evidenceFromInput(
  input: CreateResponsibilityInput,
  observedAt: string,
): ResponsibilityEvidence {
  return {
    id:
      `evidence_${randomUUID()}`,
    source:
      clone(
        input.source,
      ),
    observedAt,
  };
}

function mergedRelatedIds(
  current: string[],
  incoming: string[],
): string[] {
  return Array.from(
    new Set([
      ...current,
      ...incoming,
    ]),
  ).slice(
    0,
    100,
  );
}

export class ResponsibilityLedger {
  private readonly directory:
    string;

  private readonly responsibilitiesPath:
    string;

  private readonly eventsPath:
    string;

  private readonly lockPath:
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

    this.responsibilitiesPath =
      path.join(
        directory,
        "responsibilities.json",
      );

    this.eventsPath =
      path.join(
        directory,
        "responsibility-events.jsonl",
      );

    this.lockPath =
      path.join(
        directory,
        LOCK_DIRECTORY_NAME,
      );
  }

  async list(
    filter:
      ResponsibilityListFilter = {},
  ): Promise<Responsibility[]> {
    const file =
      await this.readFile();

    return file.responsibilities
      .filter(
        (responsibility) => {
          if (
            filter.states &&
            !filter.states.includes(
              responsibility.state,
            )
          ) {
            return false;
          }

          if (
            filter.priorities &&
            !filter.priorities.includes(
              responsibility.priority,
            )
          ) {
            return false;
          }

          if (
            filter.requiresHuman !== undefined &&
            responsibility.requiresHuman !==
              filter.requiresHuman
          ) {
            return false;
          }

          if (
            filter.sourceType &&
            responsibility.source.type !==
              filter.sourceType
          ) {
            return false;
          }

          if (
            !filter.includeClosed &&
            isClosedResponsibilityState(
              responsibility.state,
            )
          ) {
            return false;
          }

          return true;
        },
      )
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(
            a.updatedAt,
          ),
      )
      .map(clone);
  }

  async get(
    id: string,
  ): Promise<Responsibility | null> {
    const file =
      await this.readFile();

    const found =
      file.responsibilities.find(
        (responsibility) =>
          responsibility.id === id,
      );

    return found
      ? clone(found)
      : null;
  }

  async create(
    input:
      CreateResponsibilityInput,
  ): Promise<ResponsibilityCreateResult> {
    return this.mutate(
      async (
        file,
        writeEvent,
      ) => {
        const observedAt =
          now();

        const incomingIdentity =
          input.source.sourceId
            ? [
                input.source.type,
                input.source.sourceId,
              ].join(":")
            : null;

        if (
          incomingIdentity
        ) {
          const replay =
            file.responsibilities.find(
              (candidate) =>
                sourceIdentity(candidate) ===
                incomingIdentity,
            );

          if (
            replay
          ) {
            replay.updatedAt =
              observedAt;
            replay.revision +=
              1;

            await writeEvent({
              id:
                `resp_event_${randomUUID()}`,
              responsibilityId:
                replay.id,
              event:
                "source-replayed",
              actor:
                input.actor ??
                "system",
              reason:
                input.reason ??
                "The same source event was observed again.",
              timestamp:
                observedAt,
              details: {
                sourceIdentity:
                  incomingIdentity,
              },
            });

            return {
              responsibility:
                clone(replay),
              disposition:
                "source-replayed",
            };
          }
        }

        if (
          input.mergeKey
        ) {
          const mergeTarget =
            file.responsibilities.find(
              (candidate) =>
                candidate.mergeKey ===
                  input.mergeKey &&
                !isClosedResponsibilityState(
                  candidate.state,
                ),
            );

          if (
            mergeTarget
          ) {
            mergeTarget.evidence.push(
              evidenceFromInput(
                input,
                observedAt,
              ),
            );

            mergeTarget.relatedResponsibilityIds =
              mergedRelatedIds(
                mergeTarget.relatedResponsibilityIds,
                input.relatedResponsibilityIds ??
                  [],
              );

            mergeTarget.confidence =
              Math.max(
                mergeTarget.confidence,
                input.confidence ??
                  mergeTarget.confidence,
              );

            if (
              input.priority ===
                "critical" ||
              (
                input.priority ===
                  "important" &&
                (
                  mergeTarget.priority ===
                    "normal" ||
                  mergeTarget.priority ===
                    "low"
                )
              ) ||
              (
                input.priority ===
                  "normal" &&
                mergeTarget.priority ===
                  "low"
              )
            ) {
              mergeTarget.priority =
                input.priority;
            }

            mergeTarget.updatedAt =
              observedAt;
            mergeTarget.revision +=
              1;

            await writeEvent({
              id:
                `resp_event_${randomUUID()}`,
              responsibilityId:
                mergeTarget.id,
              event:
                "evidence-merged",
              actor:
                input.actor ??
                "steward",
              reason:
                input.reason ??
                "New evidence matched an existing active responsibility.",
              timestamp:
                observedAt,
              details: {
                mergeKey:
                  input.mergeKey,
                evidenceCount:
                  mergeTarget.evidence.length,
              },
            });

            return {
              responsibility:
                clone(
                  mergeTarget,
                ),
              disposition:
                "merged",
            };
          }
        }

        const createdAt =
          observedAt;

        const responsibility:
          Responsibility = {
          id:
            `resp_${randomUUID()}`,
          title:
            input.title,
          summary:
            input.summary,
          source:
            clone(
              input.source,
            ),
          state:
            input.state ??
            "detected",
          priority:
            input.priority ??
            "normal",
          requiresHuman:
            input.requiresHuman ??
            false,
          suggestedAction:
            input.suggestedAction,
          createdAt,
          updatedAt:
            createdAt,
          dueAt:
            input.dueAt,
          confidence:
            input.confidence ??
            1,
          relatedResponsibilityIds:
            input.relatedResponsibilityIds ??
            [],
          evidence: [
            evidenceFromInput(
              input,
              observedAt,
            ),
          ],
          mergeKey:
            input.mergeKey,
          revision:
            1,
        };

        file.responsibilities.push(
          responsibility,
        );

        await writeEvent({
          id:
            `resp_event_${randomUUID()}`,
          responsibilityId:
            responsibility.id,
          event:
            "created",
          actor:
            input.actor ??
            "system",
          reason:
            input.reason ??
            "Responsibility created.",
          timestamp:
            createdAt,
          toState:
            responsibility.state,
          details: {
            priority:
              responsibility.priority,
            requiresHuman:
              responsibility.requiresHuman,
            sourceType:
              responsibility.source.type,
          },
        });

        return {
          responsibility:
            clone(
              responsibility,
            ),
          disposition:
            "created",
        };
      },
    );
  }

  async update(
    id: string,
    input:
      UpdateResponsibilityInput,
  ): Promise<Responsibility> {
    return this.mutate(
      async (
        file,
        writeEvent,
      ) => {
        const responsibility =
          this.requireById(
            file,
            id,
          );

        if (
          input.title !== undefined
        ) {
          responsibility.title =
            input.title;
        }

        if (
          input.summary !== undefined
        ) {
          responsibility.summary =
            input.summary;
        }

        if (
          input.priority !== undefined
        ) {
          responsibility.priority =
            input.priority;
        }

        if (
          input.requiresHuman !==
            undefined
        ) {
          responsibility.requiresHuman =
            input.requiresHuman;
        }

        if (
          input.suggestedAction !==
            undefined
        ) {
          if (
            input.suggestedAction ===
            null
          ) {
            delete responsibility.suggestedAction;
          } else {
            responsibility.suggestedAction =
              input.suggestedAction;
          }
        }

        if (
          input.dueAt !== undefined
        ) {
          if (
            input.dueAt === null
          ) {
            delete responsibility.dueAt;
          } else {
            responsibility.dueAt =
              input.dueAt;
          }
        }

        if (
          input.confidence !==
            undefined
        ) {
          responsibility.confidence =
            input.confidence;
        }

        if (
          input.relatedResponsibilityIds !==
            undefined
        ) {
          responsibility.relatedResponsibilityIds =
            mergedRelatedIds(
              [],
              input.relatedResponsibilityIds,
            );
        }

        responsibility.updatedAt =
          now();
        responsibility.revision +=
          1;

        await writeEvent({
          id:
            `resp_event_${randomUUID()}`,
          responsibilityId:
            responsibility.id,
          event:
            "updated",
          actor:
            input.actor ??
            "steward",
          reason:
            input.reason ??
            "Responsibility metadata updated.",
          timestamp:
            responsibility.updatedAt,
        });

        return clone(
          responsibility,
        );
      },
    );
  }

  async transition(
    id: string,
    input:
      TransitionResponsibilityInput,
  ): Promise<Responsibility> {
    return this.mutate(
      async (
        file,
        writeEvent,
      ) => {
        const responsibility =
          this.requireById(
            file,
            id,
          );

        const fromState =
          responsibility.state;

        assertResponsibilityTransition(
          fromState,
          input.state,
        );

        if (
          fromState ===
          input.state
        ) {
          return clone(
            responsibility,
          );
        }

        responsibility.state =
          input.state;

        if (
          input.state ===
          "waiting-user"
        ) {
          responsibility.requiresHuman =
            true;
        }

        if (
          input.state ===
            "resolved" ||
          input.state ===
            "dismissed"
        ) {
          responsibility.requiresHuman =
            false;
        }

        responsibility.updatedAt =
          now();
        responsibility.revision +=
          1;

        await writeEvent({
          id:
            `resp_event_${randomUUID()}`,
          responsibilityId:
            responsibility.id,
          event:
            (
              fromState ===
                "resolved" ||
              fromState ===
                "dismissed"
            )
              ? "reopened"
              : "state-changed",
          actor:
            input.actor ??
            "steward",
          reason:
            input.reason,
          timestamp:
            responsibility.updatedAt,
          fromState,
          toState:
            input.state,
        });

        return clone(
          responsibility,
        );
      },
    );
  }

  async history(
    responsibilityId: string,
  ): Promise<ResponsibilityAuditEntry[]> {
    await this.ensureDirectory();

    let text =
      "";

    try {
      text =
        await readFile(
          this.eventsPath,
          "utf8",
        );
    } catch (
      error
    ) {
      if (
        (
          error as
            NodeJS.ErrnoException
        ).code ===
        "ENOENT"
      ) {
        return [];
      }

      throw error;
    }

    return text
      .split(/\r?\n/u)
      .filter(Boolean)
      .map(
        (line) =>
          JSON.parse(
            line,
          ) as ResponsibilityAuditEntry,
      )
      .filter(
        (event) =>
          event.responsibilityId ===
          responsibilityId,
      )
      .map(clone);
  }

  private async mutate<T>(
    operation: (
      file: ResponsibilityFile,
      writeEvent: (
        event: ResponsibilityAuditEntry,
      ) => Promise<void>,
    ) => Promise<T>,
  ): Promise<T> {
    let result:
      T | undefined;

    let failure:
      unknown;

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

    let releaseFileLock:
      (() => Promise<void>) | undefined;

    try {
      releaseFileLock =
        await this.acquireFileLock();

      const file =
        await this.readFile();

      const pendingEvents:
        ResponsibilityAuditEntry[] =
        [];

      result =
        await operation(
          file,
          async (
            event,
          ) => {
            pendingEvents.push(
              clone(event),
            );
          },
        );

      await this.writeFile(
        file,
      );

      for (
        const event of
        pendingEvents
      ) {
        await appendFile(
          this.eventsPath,
          `${JSON.stringify(event)}\n`,
          "utf8",
        );
      }
    } catch (
      error
    ) {
      failure =
        error;
    } finally {
      if (
        releaseFileLock
      ) {
        await releaseFileLock();
      }

      release?.();
    }

    if (
      failure
    ) {
      throw failure;
    }

    return result as T;
  }

  private requireById(
    file: ResponsibilityFile,
    id: string,
  ): Responsibility {
    const responsibility =
      file.responsibilities.find(
        (candidate) =>
          candidate.id === id,
      );

    if (
      !responsibility
    ) {
      throw new Error(
        `Responsibility not found: ${id}`,
      );
    }

    return responsibility;
  }

  private async ensureDirectory():
    Promise<void> {
    await mkdir(
      this.directory,
      {
        recursive: true,
      },
    );
  }

  private async readFile():
    Promise<ResponsibilityFile> {
    await this.ensureDirectory();

    try {
      const text =
        await readFile(
          this.responsibilitiesPath,
          "utf8",
        );

      const parsed =
        JSON.parse(
          text,
        ) as ResponsibilityFile;

      if (
        parsed.schemaVersion !== 1 ||
        !Array.isArray(
          parsed.responsibilities,
        )
      ) {
        throw new Error(
          "Unsupported responsibility ledger format.",
        );
      }

      return parsed;
    } catch (
      error
    ) {
      if (
        (
          error as
            NodeJS.ErrnoException
        ).code ===
        "ENOENT"
      ) {
        return clone(
          EMPTY_FILE,
        );
      }

      throw error;
    }
  }

  private async acquireFileLock():
    Promise<() => Promise<void>> {
    await this.ensureDirectory();

    const startedAt =
      Date.now();

    while (
      true
    ) {
      try {
        await mkdir(
          this.lockPath,
        );

        return async () => {
          await rm(
            this.lockPath,
            {
              recursive: true,
              force: true,
            },
          );
        };
      } catch (
        error
      ) {
        const code =
          (
            error as
              NodeJS.ErrnoException
          ).code;

        if (
          code !==
          "EEXIST"
        ) {
          throw error;
        }
      }

      try {
        const lockStat =
          await stat(
            this.lockPath,
          );

        if (
          Date.now() -
            lockStat.mtimeMs >
          LOCK_STALE_MS
        ) {
          await rm(
            this.lockPath,
            {
              recursive: true,
              force: true,
            },
          );

          continue;
        }
      } catch (
        error
      ) {
        const code =
          (
            error as
              NodeJS.ErrnoException
          ).code;

        if (
          code !==
          "ENOENT"
        ) {
          throw error;
        }

        continue;
      }

      if (
        Date.now() -
          startedAt >=
        LOCK_TIMEOUT_MS
      ) {
        throw new Error(
          "Timed out waiting for the responsibility ledger write lock.",
        );
      }

      await new Promise<void>(
        (resolve) => {
          setTimeout(
            resolve,
            LOCK_RETRY_MS,
          );
        },
      );
    }
  }

  private async renameWithRetry(
    temporaryPath: string,
  ): Promise<void> {
    for (
      let attempt = 0;
      ;
      attempt += 1
    ) {
      try {
        await rename(
          temporaryPath,
          this.responsibilitiesPath,
        );

        return;
      } catch (
        error
      ) {
        const code =
          (
            error as
              NodeJS.ErrnoException
          ).code;

        const retryable =
          code ===
            "EPERM" ||
          code ===
            "EACCES" ||
          code ===
            "EBUSY";

        if (
          !retryable ||
          attempt >=
            RENAME_RETRY_DELAYS_MS.length
        ) {
          throw error;
        }

        await new Promise<void>(
          (resolve) => {
            setTimeout(
              resolve,
              RENAME_RETRY_DELAYS_MS[
                attempt
              ],
            );
          },
        );
      }
    }
  }

  private async writeFile(
    file: ResponsibilityFile,
  ): Promise<void> {
    await this.ensureDirectory();

    const temporaryPath =
      `${this.responsibilitiesPath}.${process.pid}.${randomUUID()}.tmp`;

    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(
          file,
          null,
          2,
        )}\n`,
        "utf8",
      );

      await this.renameWithRetry(
        temporaryPath,
      );
    } finally {
      await rm(
        temporaryPath,
        {
          force: true,
        },
      );
    }
  }
}

let singleton:
  ResponsibilityLedger | null =
  null;

export function getResponsibilityLedger():
  ResponsibilityLedger {
  singleton ??=
    new ResponsibilityLedger();

  return singleton;
}
