import type Database from "better-sqlite3";

import { getItchDiscoveryDatabase } from "../database/client";
import { ItchPipelineLockedError } from "../errors";
import {
  ItchPipelineRunRepository,
  ItchSchedulerRepository,
} from "../repositories";
import type {
  ItchScheduleDecision,
  RunItchScheduledRefreshInput,
  RunItchScheduledRefreshResult,
} from "../types";
import { bootstrapItchDiscovery } from "./bootstrapItchDiscovery";
import { recoverItchRuntimeState } from "../maintenance/recovery";
import { runItchDiscoveryPipeline } from "./runItchDiscoveryPipeline";

export function getItchScheduleDecision(
  input: RunItchScheduledRefreshInput = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): ItchScheduleDecision {
  bootstrapItchDiscovery(database);
  const now = input.now ?? new Date();
  const checkedAt = now.toISOString();
  const settings = new ItchSchedulerRepository(database).ensureDefault();
  const latest = new ItchPipelineRunRepository(database)
    .list(100)
    .find(
      (run) =>
        run.finishedAt &&
        (run.status === "completed" || run.status === "partial"),
    );
  const latestCompletedAt = latest?.finishedAt;
  const baseHours = input.mode === "startup-stale"
    ? settings.staleAfterHours
    : settings.intervalHours;
  const nextEligibleAt = latestCompletedAt
    ? new Date(Date.parse(latestCompletedAt) + baseHours * 3_600_000).toISOString()
    : undefined;

  if (!settings.enabled && !input.force) {
    return {
      due: false,
      reason: "Game Radar scheduling is disabled.",
      settings,
      latestCompletedAt,
      nextEligibleAt,
      checkedAt,
    };
  }

  if (input.mode === "startup-stale" && !settings.runOnStartup && !input.force) {
    return {
      due: false,
      reason: "Startup stale checks are disabled.",
      settings,
      latestCompletedAt,
      nextEligibleAt,
      checkedAt,
    };
  }

  if (input.force) {
    return {
      due: true,
      reason: "The scheduled refresh was forced.",
      settings,
      latestCompletedAt,
      nextEligibleAt,
      checkedAt,
    };
  }

  if (nextEligibleAt && now.getTime() < Date.parse(nextEligibleAt)) {
    return {
      due: false,
      reason: `The catalogue is not due until ${nextEligibleAt}.`,
      settings,
      latestCompletedAt,
      nextEligibleAt,
      checkedAt,
    };
  }

  if (input.mode !== "startup-stale") {
    const localHour = getLocalHour(now, settings.timezone);
    if (localHour < settings.preferredLocalHour) {
      return {
        due: false,
        reason: `The preferred local refresh hour is ${settings.preferredLocalHour}:00 ${settings.timezone}.`,
        settings,
        latestCompletedAt,
        nextEligibleAt,
        checkedAt,
      };
    }
  }

  return {
    due: true,
    reason: latestCompletedAt
      ? "The previous successful pipeline is older than the configured interval."
      : "No successful Game Radar pipeline has been recorded.",
    settings,
    latestCompletedAt,
    nextEligibleAt,
    checkedAt,
  };
}

export async function runItchScheduledRefresh(
  input: RunItchScheduledRefreshInput = {},
  database: Database.Database = getItchDiscoveryDatabase(),
): Promise<RunItchScheduledRefreshResult> {
  bootstrapItchDiscovery(database);
  recoverItchRuntimeState({ now: input.now }, database);
  const mode = input.mode ?? "schedule";
  const decision = getItchScheduleDecision({ ...input, mode }, database);
  const scheduler = new ItchSchedulerRepository(database);

  if (!decision.due) {
    scheduler.recordCheck({
      checkedAt: decision.checkedAt,
      result: decision.settings.enabled ? "not-due" : "disabled",
    });
    return { decision, executed: false };
  }

  try {
    const pipeline = await runItchDiscoveryPipeline(
      {
        trigger: mode,
        timezone: decision.settings.timezone,
      },
      { database },
    );
    const result = !pipeline.lockAcquired
      ? "locked"
      : pipeline.run.status === "running"
        ? "failed"
        : pipeline.run.status;
    scheduler.recordCheck({
      checkedAt: decision.checkedAt,
      ranAt: pipeline.run.finishedAt ?? decision.checkedAt,
      result,
    });
    return { decision, executed: true, pipeline };
  } catch (error) {
    scheduler.recordCheck({
      checkedAt: decision.checkedAt,
      ranAt: decision.checkedAt,
      result: error instanceof ItchPipelineLockedError ? "locked" : "failed",
    });
    if (error instanceof ItchPipelineLockedError) {
      return { decision, executed: false };
    }
    throw error;
  }
}

function getLocalHour(date: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}
