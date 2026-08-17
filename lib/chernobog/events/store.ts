import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

import { ChernobogEvent, ChernobogEventQuery } from "./types";

export interface ChernobogEventStore {
  append(event: ChernobogEvent): Promise<void>;
  query(query?: ChernobogEventQuery): Promise<ChernobogEvent[]>;
}

export function resolveChernobogEventLogPath(): string {
  const configured = process.env.CHERNOBOG_EVENT_LOG_PATH?.trim();
  if (configured) {
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  return join(process.cwd(), ".chernobog", "runtime", "events", "events.jsonl");
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid event query timestamp: ${value}`);
  }
  return parsed;
}

function matchesQuery(event: ChernobogEvent, query: ChernobogEventQuery): boolean {
  if (query.types?.length && !query.types.includes(event.type)) {
    return false;
  }
  if (
    query.typePrefixes?.length &&
    !query.typePrefixes.some((prefix) => event.type.startsWith(prefix))
  ) {
    return false;
  }
  if (query.sources?.length && !query.sources.includes(event.source.subsystem)) {
    return false;
  }
  if (query.severities?.length && !query.severities.includes(event.severity)) {
    return false;
  }
  if (query.correlationId && event.correlationId !== query.correlationId) {
    return false;
  }

  const occurredAt = new Date(event.occurredAt).getTime();
  const after = parseTimestamp(query.after);
  const before = parseTimestamp(query.before);
  if (after !== undefined && occurredAt <= after) {
    return false;
  }
  if (before !== undefined && occurredAt >= before) {
    return false;
  }

  return true;
}

export class JsonlChernobogEventStore implements ChernobogEventStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(public readonly filePath = resolveChernobogEventLogPath()) {}

  append(event: ChernobogEvent): Promise<void> {
    const write = async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
    };

    this.writeChain = this.writeChain.then(write, write);
    return this.writeChain;
  }

  async query(query: ChernobogEventQuery = {}): Promise<ChernobogEvent[]> {
    await this.writeChain;

    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const events = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as ChernobogEvent;
        } catch (error) {
          throw new Error(`Invalid event log JSON on line ${index + 1}.`, {
            cause: error,
          });
        }
      })
      .filter((event) => matchesQuery(event, query));

    if (query.newestFirst) {
      events.reverse();
    }

    const requestedLimit = query.limit ?? 100;
    const limit = Math.max(1, Math.min(requestedLimit, 1000));
    return events.slice(0, limit);
  }
}
