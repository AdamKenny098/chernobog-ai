import { randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  join,
} from "node:path";

import {
  scanChernobogEventLog,
  summarizeChernobogEventLogCorruption,
  type ChernobogEventLogCorruptionSummary,
} from "./corruption";

import {
  applyChernobogEventRetention,
  type ChernobogEventRetentionPolicy,
  type ChernobogEventRetentionResult,
} from "./retention";

import type {
  ChernobogEvent,
  ChernobogEventQuery,
} from "./types";

export interface ChernobogEventCorruptionRecoveryResult {
  recovered: boolean;

  quarantinePath?: string;

  summary:
    ChernobogEventLogCorruptionSummary;
}

export interface ChernobogEventStore {
  append(
    event: ChernobogEvent
  ): Promise<void>;

  query(
    query?: ChernobogEventQuery
  ): Promise<ChernobogEvent[]>;

  readAll(
    query?: Omit<
      ChernobogEventQuery,
      "newestFirst" | "limit"
    >
  ): Promise<ChernobogEvent[]>;

  compact(
    policy?: ChernobogEventRetentionPolicy,
    now?: Date
  ): Promise<ChernobogEventRetentionResult>;

  recoverCorruption():
    Promise<ChernobogEventCorruptionRecoveryResult>;
}

export function resolveChernobogEventLogPath(): string {
  const configured =
    process.env
      .CHERNOBOG_EVENT_LOG_PATH
      ?.trim();

  if (configured) {
    return isAbsolute(
      configured
    )
      ? configured
      : join(
          process.cwd(),
          configured
        );
  }

  return join(
    process.cwd(),
    ".chernobog",
    "runtime",
    "events",
    "events.jsonl"
  );
}

function parseTimestamp(
  value: string | undefined
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    new Date(
      value
    ).getTime();

  if (
    Number.isNaN(
      parsed
    )
  ) {
    throw new Error(
      `Invalid event query timestamp: ${value}`
    );
  }

  return parsed;
}

function matchesQuery(
  event: ChernobogEvent,
  query: ChernobogEventQuery
): boolean {
  if (
    query.types?.length &&
    !query.types.includes(
      event.type
    )
  ) {
    return false;
  }

  if (
    query.typePrefixes?.length &&
    !query.typePrefixes.some(
      (prefix) =>
        event.type.startsWith(
          prefix
        )
    )
  ) {
    return false;
  }

  if (
    query.sources?.length &&
    !query.sources.includes(
      event.source.subsystem
    )
  ) {
    return false;
  }

  if (
    query.severities?.length &&
    !query.severities.includes(
      event.severity
    )
  ) {
    return false;
  }

  if (
    query.correlationId &&
    event.correlationId !==
      query.correlationId
  ) {
    return false;
  }

  const occurredAt =
    new Date(
      event.occurredAt
    ).getTime();

  const after =
    parseTimestamp(
      query.after
    );

  const before =
    parseTimestamp(
      query.before
    );

  if (
    after !== undefined &&
    occurredAt <= after
  ) {
    return false;
  }

  if (
    before !== undefined &&
    occurredAt >= before
  ) {
    return false;
  }

  return true;
}

/*
 * Normal reads are intentionally tolerant.
 *
 * Valid events surrounding malformed JSONL
 * records remain available to:
 *
 * - query()
 * - replay()
 * - diagnostics
 * - retention
 *
 * The exact corrupt lines remain available
 * to recoverCorruption() for quarantine.
 */
function parseEventLog(
  raw: string
): ChernobogEvent[] {
  return scanChernobogEventLog(
    raw
  ).events;
}

function serializeEvents(
  events: ChernobogEvent[]
): string {
  if (
    events.length === 0
  ) {
    return "";
  }

  return `${events
    .map(
      (event) =>
        JSON.stringify(
          event
        )
    )
    .join("\n")}\n`;
}

export class JsonlChernobogEventStore
  implements ChernobogEventStore
{
  private writeChain:
    Promise<void> =
      Promise.resolve();

  constructor(
    public readonly filePath =
      resolveChernobogEventLogPath()
  ) {}

  append(
    event: ChernobogEvent
  ): Promise<void> {
    const write =
      async (): Promise<void> => {
        await mkdir(
          dirname(
            this.filePath
          ),
          {
            recursive: true,
          }
        );

        await appendFile(
          this.filePath,
          `${JSON.stringify(event)}\n`,
          "utf8"
        );
      };

    this.writeChain =
      this.writeChain.then(
        write,
        write
      );

    return this.writeChain;
  }

  compact(
    policy?:
      ChernobogEventRetentionPolicy,
    now:
      Date = new Date()
  ): Promise<ChernobogEventRetentionResult> {
    let result:
      | ChernobogEventRetentionResult
      | undefined;

    const compactWrite =
      async (): Promise<void> => {
        let raw: string;

        try {
          raw =
            await readFile(
              this.filePath,
              "utf8"
            );
        } catch (error) {
          if (
            (
              error as
                NodeJS.ErrnoException
            ).code ===
            "ENOENT"
          ) {
            result =
              applyChernobogEventRetention(
                [],
                policy,
                now
              );

            return;
          }

          throw error;
        }

        const events =
          parseEventLog(
            raw
          );

        result =
          applyChernobogEventRetention(
            events,
            policy,
            now
          );

        if (
          result.removedCount ===
          0
        ) {
          return;
        }

        await mkdir(
          dirname(
            this.filePath
          ),
          {
            recursive: true,
          }
        );

        const temporaryPath =
          `${this.filePath}.compact-${process.pid}-${randomUUID()}.tmp`;

        const retainedJsonl =
          serializeEvents(
            result.retained
          );

        try {
          await writeFile(
            temporaryPath,
            retainedJsonl,
            "utf8"
          );

          await rename(
            temporaryPath,
            this.filePath
          );
        } finally {
          await rm(
            temporaryPath,
            {
              force: true,
            }
          );
        }
      };

    this.writeChain =
      this.writeChain.then(
        compactWrite,
        compactWrite
      );

    return this.writeChain.then(
      () => {
        if (!result) {
          throw new Error(
            "Event retention compaction completed without a result."
          );
        }

        return result;
      }
    );
  }

  recoverCorruption():
    Promise<ChernobogEventCorruptionRecoveryResult> {
    let result:
      | ChernobogEventCorruptionRecoveryResult
      | undefined;

    const recoverWrite =
      async (): Promise<void> => {
        let raw: string;

        try {
          raw =
            await readFile(
              this.filePath,
              "utf8"
            );
        } catch (error) {
          if (
            (
              error as
                NodeJS.ErrnoException
            ).code ===
            "ENOENT"
          ) {
            const scan =
              scanChernobogEventLog(
                ""
              );

            result = {
              recovered:
                false,

              summary:
                summarizeChernobogEventLogCorruption(
                  scan
                ),
            };

            return;
          }

          throw error;
        }

        const scan =
          scanChernobogEventLog(
            raw
          );

        const summary =
          summarizeChernobogEventLogCorruption(
            scan
          );

        /*
         * Healthy log: nothing to repair.
         */
        if (
          scan.corruptLines ===
          0
        ) {
          result = {
            recovered:
              false,

            summary,
          };

          return;
        }

        await mkdir(
          dirname(
            this.filePath
          ),
          {
            recursive: true,
          }
        );

        const identifier =
          `${Date.now()}-${randomUUID()}`;

        const quarantinePath =
          `${this.filePath}.corrupt-${identifier}.jsonl`;

        const quarantineTemporaryPath =
          `${quarantinePath}.tmp`;

        const replacementTemporaryPath =
          `${this.filePath}.recover-${identifier}.tmp`;

        /*
         * The quarantine file is deliberately
         * valid JSONL even though the damaged
         * source lines may not be.
         *
         * Raw lines remain local to the
         * quarantine artifact and are never
         * included in the public corruption
         * summary.
         */
        const quarantineJsonl =
          `${scan.corruptions
            .map(
              (corruption) =>
                JSON.stringify({
                  lineNumber:
                    corruption.lineNumber,

                  lineHash:
                    corruption.lineHash,

                  reason:
                    corruption.reason,

                  rawLine:
                    corruption.rawLine,
                })
            )
            .join("\n")}\n`;

        const recoveredJsonl =
          serializeEvents(
            scan.events
          );

        try {
          /*
           * Quarantine must be safely written
           * before the primary history is
           * repaired.
           */
          await writeFile(
            quarantineTemporaryPath,
            quarantineJsonl,
            "utf8"
          );

          await rename(
            quarantineTemporaryPath,
            quarantinePath
          );

          /*
           * Build a complete valid replacement
           * history independently of the live
           * event file.
           */
          await writeFile(
            replacementTemporaryPath,
            recoveredJsonl,
            "utf8"
          );

          /*
           * Only after the replacement has
           * been completely written do we swap
           * it into the primary log.
           */
          await rename(
            replacementTemporaryPath,
            this.filePath
          );

          result = {
            recovered:
              true,

            quarantinePath,

            summary,
          };
        } finally {
          await rm(
            quarantineTemporaryPath,
            {
              force: true,
            }
          );

          await rm(
            replacementTemporaryPath,
            {
              force: true,
            }
          );
        }
      };

    /*
     * Recovery participates in the exact
     * same serialization chain as append()
     * and compact().
     *
     * A live append can therefore never race
     * the repair rewrite.
     */
    this.writeChain =
      this.writeChain.then(
        recoverWrite,
        recoverWrite
      );

    return this.writeChain.then(
      () => {
        if (!result) {
          throw new Error(
            "Event corruption recovery completed without a result."
          );
        }

        return result;
      }
    );
  }

  async readAll(
    query: Omit<
      ChernobogEventQuery,
      "newestFirst" | "limit"
    > = {}
  ): Promise<ChernobogEvent[]> {
    await this.writeChain;

    let raw: string;

    try {
      raw =
        await readFile(
          this.filePath,
          "utf8"
        );
    } catch (error) {
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

    return parseEventLog(
      raw
    ).filter(
      (event) =>
        matchesQuery(
          event,
          query
        )
    );
  }

  async query(
    query:
      ChernobogEventQuery = {}
  ): Promise<ChernobogEvent[]> {
    await this.writeChain;

    let raw: string;

    try {
      raw =
        await readFile(
          this.filePath,
          "utf8"
        );
    } catch (error) {
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

    const events =
      parseEventLog(
        raw
      ).filter(
        (event) =>
          matchesQuery(
            event,
            query
          )
      );

    if (
      query.newestFirst
    ) {
      events.reverse();
    }

    const requestedLimit =
      query.limit ??
      100;

    const limit =
      Math.max(
        1,
        Math.min(
          requestedLimit,
          1000
        )
      );

    return events.slice(
      0,
      limit
    );
  }
}