import type {
  JobDefinition,
  JobRun,
  ScheduleDefinition,
  ScheduleMissedRunPolicy,
  ScheduleStatus,
  ScheduleTrigger,
} from "@chernobog/contracts";
import type { FileJobStore } from "@chernobog/core";

const MINUTE_MS = 60_000;
const MAX_CRON_SEARCH_MINUTES = 366 * 24 * 60;
const MAX_CRON_RECONCILIATION_OCCURRENCES = 600_000;

type CronField = {
  any: boolean;
  values: Set<number>;
};

type CronParts = {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
};

type ZonedMinute = {
  minute: number;
  hour: number;
  dayOfMonth: number;
  month: number;
  dayOfWeek: number;
};

export type SchedulerTickResult = {
  evaluatedSchedules: number;
  materializedRuns: JobRun[];
  skippedPaused: number;
  skippedDisabledJobs: number;
};

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number`);
  }
}

function parseCronAtom(
  atom: string,
  min: number,
  max: number,
  label: string,
): number[] {
  const trimmed = atom.trim();
  if (!trimmed) throw new Error(`Empty ${label} cron atom`);

  const stepParts = trimmed.split("/");
  if (stepParts.length > 2) {
    throw new Error(`Invalid ${label} cron step: ${atom}`);
  }

  const base = stepParts[0];
  const step =
    stepParts.length === 2 ? Number.parseInt(stepParts[1], 10) : 1;

  if (!Number.isInteger(step) || step <= 0) {
    throw new Error(`Invalid ${label} cron step: ${atom}`);
  }

  let start: number;
  let end: number;

  if (base === "*") {
    start = min;
    end = max;
  } else if (base.includes("-")) {
    const range = base.split("-");
    if (range.length !== 2) {
      throw new Error(`Invalid ${label} cron range: ${atom}`);
    }
    start = Number.parseInt(range[0], 10);
    end = Number.parseInt(range[1], 10);
  } else {
    const value = Number.parseInt(base, 10);
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid ${label} cron value: ${atom}`);
    }
    start = value;
    end = value;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < min ||
    end > max ||
    start > end
  ) {
    throw new Error(
      `${label} cron value outside ${min}-${max}: ${atom}`,
    );
  }

  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

function parseCronField(
  field: string,
  min: number,
  max: number,
  label: string,
): CronField {
  const trimmed = field.trim();
  const any = trimmed === "*";
  const values = new Set<number>();

  for (const atom of trimmed.split(",")) {
    for (const value of parseCronAtom(atom, min, max, label)) {
      values.add(value);
    }
  }

  return { any, values };
}

function parseCron(expression: string): CronParts {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(
      `Cron expression must contain exactly 5 fields: ${expression}`,
    );
  }

  return {
    minute: parseCronField(fields[0], 0, 59, "minute"),
    hour: parseCronField(fields[1], 0, 23, "hour"),
    dayOfMonth: parseCronField(fields[2], 1, 31, "day-of-month"),
    month: parseCronField(fields[3], 1, 12, "month"),
    dayOfWeek: parseCronField(fields[4], 0, 6, "day-of-week"),
  };
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = formatterCache.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  formatter.format(new Date(0));
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function zonedMinute(date: Date, timeZone: string): ZonedMinute {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const weekday = values.get("weekday");

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  if (!weekday || weekdayMap[weekday] === undefined) {
    throw new Error(`Unable to resolve weekday for timezone ${timeZone}`);
  }

  return {
    minute: Number(values.get("minute")),
    hour: Number(values.get("hour")),
    dayOfMonth: Number(values.get("day")),
    month: Number(values.get("month")),
    dayOfWeek: weekdayMap[weekday],
  };
}

function cronMatches(parts: CronParts, local: ZonedMinute): boolean {
  if (!parts.minute.values.has(local.minute)) return false;
  if (!parts.hour.values.has(local.hour)) return false;
  if (!parts.month.values.has(local.month)) return false;

  const domMatch = parts.dayOfMonth.values.has(local.dayOfMonth);
  const dowMatch = parts.dayOfWeek.values.has(local.dayOfWeek);

  if (!parts.dayOfMonth.any && !parts.dayOfWeek.any) {
    return domMatch || dowMatch;
  }

  if (!parts.dayOfMonth.any && !domMatch) return false;
  if (!parts.dayOfWeek.any && !dowMatch) return false;
  return true;
}

function nextCronOccurrence(
  expression: string,
  timeZone: string,
  after: Date,
): Date {
  const cron = parseCron(expression);

  let cursor = new Date(
    Math.floor(after.getTime() / MINUTE_MS) * MINUTE_MS + MINUTE_MS,
  );

  for (let i = 0; i < MAX_CRON_SEARCH_MINUTES; i += 1) {
    if (cronMatches(cron, zonedMinute(cursor, timeZone))) {
      return cursor;
    }
    cursor = new Date(cursor.getTime() + MINUTE_MS);
  }

  throw new Error(
    `Unable to resolve next cron occurrence within 366 days: ${expression}`,
  );
}

export function nextOccurrenceAfter(
  trigger: ScheduleTrigger,
  after: Date,
): Date | undefined {
  if (!Number.isFinite(after.getTime())) {
    throw new Error("after must be a valid Date");
  }

  switch (trigger.kind) {
    case "once": {
      const runAt = new Date(trigger.runAt);
      if (!Number.isFinite(runAt.getTime())) {
        throw new Error(`Invalid one-shot runAt: ${trigger.runAt}`);
      }
      return runAt.getTime() > after.getTime() ? runAt : undefined;
    }

    case "interval": {
      assertFinitePositive(trigger.everyMs, "interval everyMs");

      const anchor = trigger.anchorAt
        ? new Date(trigger.anchorAt)
        : new Date(0);

      if (!Number.isFinite(anchor.getTime())) {
        throw new Error(`Invalid interval anchorAt: ${trigger.anchorAt}`);
      }

      if (anchor.getTime() > after.getTime()) {
        return anchor;
      }

      const elapsed = after.getTime() - anchor.getTime();
      const periods = Math.floor(elapsed / trigger.everyMs) + 1;
      return new Date(anchor.getTime() + periods * trigger.everyMs);
    }

    case "cron":
      return nextCronOccurrence(
        trigger.expression,
        trigger.timezone,
        after,
      );
  }
}

function deterministicRunId(
  scheduleId: string,
  scheduledFor: string,
): string {
  return `schedule:${scheduleId}:${Date.parse(scheduledFor)}`;
}

function parseOptionalDate(
  value: string | undefined,
  label: string,
): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function initialScheduleBase(schedule: ScheduleDefinition): Date {
  const createdAt = new Date(schedule.createdAt);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error(`Invalid schedule createdAt: ${schedule.createdAt}`);
  }

  if (schedule.trigger.kind === "interval" && schedule.trigger.anchorAt) {
    const anchor = new Date(schedule.trigger.anchorAt);
    if (!Number.isFinite(anchor.getTime())) {
      throw new Error(
        `Invalid interval anchorAt: ${schedule.trigger.anchorAt}`,
      );
    }

    if (anchor.getTime() >= createdAt.getTime()) {
      return new Date(anchor.getTime() - 1);
    }
  }

  if (schedule.trigger.kind === "once") {
    const onceAt = new Date(schedule.trigger.runAt);
    if (
      Number.isFinite(onceAt.getTime()) &&
      onceAt.getTime() >= createdAt.getTime()
    ) {
      return new Date(onceAt.getTime() - 1);
    }
  }

  return new Date(createdAt.getTime() - 1);
}

function reconciliationBase(
  schedule: ScheduleDefinition,
): Date {
  const baseCandidates = [
    initialScheduleBase(schedule),
    parseOptionalDate(
      schedule.lastReconciledAt,
      "schedule lastReconciledAt",
    ),
  ].filter((value): value is Date => Boolean(value));

  return baseCandidates.reduce((latest, candidate) =>
    candidate.getTime() > latest.getTime() ? candidate : latest,
  );
}

function normalizeMissedRunPolicy(
  policy: ScheduleMissedRunPolicy | undefined,
): ScheduleMissedRunPolicy {
  if (!policy) return { mode: "run-once" };

  if (policy.mode === "catch-up") {
    if (!Number.isInteger(policy.maxRuns) || policy.maxRuns < 1) {
      throw new Error("catch-up maxRuns must be an integer >= 1");
    }
  }

  return policy;
}

function selectIntervalOccurrences(
  trigger: Extract<ScheduleTrigger, { kind: "interval" }>,
  after: Date,
  through: Date,
  policy: ScheduleMissedRunPolicy,
): Date[] {
  const first = nextOccurrenceAfter(trigger, after);
  if (!first || first.getTime() > through.getTime()) return [];

  if (policy.mode === "skip") return [];

  const count =
    Math.floor(
      (through.getTime() - first.getTime()) / trigger.everyMs,
    ) + 1;

  if (policy.mode === "run-once") {
    return [
      new Date(
        first.getTime() + (count - 1) * trigger.everyMs,
      ),
    ];
  }

  const selected = Math.min(policy.maxRuns, count);
  const firstSelectedIndex = count - selected;

  return Array.from({ length: selected }, (_, index) =>
    new Date(
      first.getTime() +
        (firstSelectedIndex + index) * trigger.everyMs,
    ),
  );
}

function selectDueOccurrences(
  schedule: ScheduleDefinition,
  after: Date,
  through: Date,
): Date[] {
  const policy = normalizeMissedRunPolicy(
    schedule.missedRunPolicy,
  );

  if (policy.mode === "skip") return [];

  if (schedule.trigger.kind === "interval") {
    return selectIntervalOccurrences(
      schedule.trigger,
      after,
      through,
      policy,
    );
  }

  const selected: Date[] = [];
  let cursor = after;

  for (
    let count = 0;
    count < MAX_CRON_RECONCILIATION_OCCURRENCES;
    count += 1
  ) {
    const next = nextOccurrenceAfter(schedule.trigger, cursor);
    if (!next || next.getTime() > through.getTime()) {
      return selected;
    }

    if (policy.mode === "run-once") {
      selected.splice(0, selected.length, next);
    } else {
      selected.push(next);
      if (selected.length > policy.maxRuns) {
        selected.shift();
      }
    }

    cursor = next;
  }

  throw new Error(
    `Schedule reconciliation exceeded safety bound: ${schedule.id}`,
  );
}

export class SchedulerRuntime {
  constructor(private readonly store: FileJobStore) {}

  getNextRunAt(
    schedule: ScheduleDefinition,
  ): Date | undefined {
    if (schedule.status !== "active") return undefined;

    return nextOccurrenceAfter(
      schedule.trigger,
      reconciliationBase(schedule),
    );
  }

  setScheduleStatus(
    scheduleId: string,
    status: ScheduleStatus,
    now: Date = new Date(),
  ): ScheduleDefinition {
    const existing = this.store.getSchedule(scheduleId);
    if (!existing) {
      throw new Error(`Unknown schedule: ${scheduleId}`);
    }

    const updated: ScheduleDefinition = {
      ...existing,
      status,
      updatedAt: now.toISOString(),
    };

    this.store.upsertSchedule(updated);
    return updated;
  }

  replaceSchedule(
    schedule: ScheduleDefinition,
  ): ScheduleDefinition {
    if (!this.store.getJob(schedule.jobId)) {
      throw new Error(
        `Schedule ${schedule.id} references unknown job: ${schedule.jobId}`,
      );
    }

    this.store.upsertSchedule(schedule);
    return schedule;
  }

  tick(now: Date = new Date()): SchedulerTickResult {
    if (!Number.isFinite(now.getTime())) {
      throw new Error("Scheduler tick requires a valid Date");
    }

    const result: SchedulerTickResult = {
      evaluatedSchedules: 0,
      materializedRuns: [],
      skippedPaused: 0,
      skippedDisabledJobs: 0,
    };

    for (const schedule of this.store.listSchedules()) {
      result.evaluatedSchedules += 1;

      if (schedule.status !== "active") {
        result.skippedPaused += 1;
        continue;
      }

      const job = this.store.getJob(schedule.jobId) as
        | JobDefinition
        | undefined;

      if (!job || !job.enabled) {
        result.skippedDisabledJobs += 1;
        continue;
      }

      const base = reconciliationBase(schedule);
      const due = selectDueOccurrences(schedule, base, now);

      for (const occurrence of due) {
        const scheduledFor = occurrence.toISOString();
        const runId = deterministicRunId(schedule.id, scheduledFor);

        if (this.store.getRun(runId)) continue;

        const run: JobRun = {
          id: runId,
          jobId: job.id,
          scheduleId: schedule.id,
          owner: job.owner,
          source: {
            kind: "subsystem",
            subsystemId: schedule.owner.ownerId,
          },
          status: "queued",
          payload: job.payload,
          attempt: 1,
          idempotencyKey: runId,
          scheduledFor,
          queuedAt: now.toISOString(),
        };

        this.store.enqueueRun(run);
        result.materializedRuns.push(run);
      }

      this.store.upsertSchedule({
        ...schedule,
        lastReconciledAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    return result;
  }
}
