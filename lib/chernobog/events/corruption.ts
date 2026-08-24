import { createHash } from "node:crypto";

import type {
  ChernobogEvent,
} from "./types";

export interface ChernobogEventLogCorruption {
  lineNumber: number;

  lineHash: string;

  reason: string;

  /*
   * Kept internally so D5.2 can quarantine
   * the exact damaged record rather than
   * silently throwing it away.
   *
   * This should not be exposed through the
   * normal diagnostics/API surface.
   */
  rawLine: string;
}

export interface ChernobogEventLogScanResult {
  events: ChernobogEvent[];

  corruptions:
    ChernobogEventLogCorruption[];

  totalLines: number;

  validLines: number;

  corruptLines: number;
}

export interface ChernobogEventLogCorruptionSummary {
  totalLines: number;

  validLines: number;

  corruptLines: number;

  corruptions: Array<{
    lineNumber: number;

    lineHash: string;

    reason: string;
  }>;
}

function hashLine(
  value: string
): string {
  return createHash(
    "sha256"
  )
    .update(
      value,
      "utf8"
    )
    .digest(
      "hex"
    );
}

function describeParseError(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(
    error
  );
}

export function scanChernobogEventLog(
  raw: string
): ChernobogEventLogScanResult {
  const events:
    ChernobogEvent[] = [];

  const corruptions:
    ChernobogEventLogCorruption[] = [];

  const lines =
    raw.split(
      /\r?\n/
    );

  let totalLines =
    0;

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    /*
     * Ignore normal trailing/newline-only
     * JSONL whitespace.
     */
    if (
      !line.trim()
    ) {
      continue;
    }

    totalLines += 1;

    try {
      const parsed =
        JSON.parse(
          line
        ) as unknown;

      /*
       * D5.1 only establishes JSON-level
       * corruption handling.
       *
       * Event schema validation remains the
       * responsibility of the Event Spine's
       * canonical event schema.
       */
      events.push(
        parsed as ChernobogEvent
      );
    } catch (error) {
      corruptions.push({
        lineNumber:
          index + 1,

        lineHash:
          hashLine(
            line
          ),

        reason:
          describeParseError(
            error
          ),

        rawLine:
          line,
      });
    }
  }

  return {
    events,

    corruptions,

    totalLines,

    validLines:
      events.length,

    corruptLines:
      corruptions.length,
  };
}

export function summarizeChernobogEventLogCorruption(
  scan:
    ChernobogEventLogScanResult
): ChernobogEventLogCorruptionSummary {
  return {
    totalLines:
      scan.totalLines,

    validLines:
      scan.validLines,

    corruptLines:
      scan.corruptLines,

    corruptions:
      scan.corruptions.map(
        (corruption) => ({
          lineNumber:
            corruption.lineNumber,

          lineHash:
            corruption.lineHash,

          reason:
            corruption.reason,
        })
      ),
  };
}