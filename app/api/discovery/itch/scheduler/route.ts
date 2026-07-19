import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  apiFailureResponseInit,
  optionalBoolean,
  optionalInteger,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchSchedulerRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import {
  getItchScheduleDecision,
  runItchScheduledRefresh,
} from "@/lib/modules/itch-discovery/services/runItchScheduledRefresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    return NextResponse.json({
      settings: new ItchSchedulerRepository(database).ensureDefault(),
      decision: getItchScheduleDecision({ mode: "schedule" }, database),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "scheduler:patch", { limit: 12, windowMs: 600000 });
    const body = await readJsonObject(request);
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const settings = new ItchSchedulerRepository(database).update({
      enabled: optionalBoolean(body.enabled, "enabled"),
      intervalHours: optionalInteger(body.intervalHours, "intervalHours", {
        minimum: 1,
        maximum: 720,
      }),
      staleAfterHours: optionalInteger(
        body.staleAfterHours,
        "staleAfterHours",
        { minimum: 1, maximum: 720 },
      ),
      preferredLocalHour: optionalInteger(
        body.preferredLocalHour,
        "preferredLocalHour",
        { minimum: 0, maximum: 23 },
      ),
      timezone: optionalString(body.timezone, "timezone", {
        maximumLength: 100,
      }),
      runOnStartup: optionalBoolean(body.runOnStartup, "runOnStartup"),
    });
    return NextResponse.json({
      settings,
      decision: getItchScheduleDecision({ mode: "schedule" }, database),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "scheduler:post", { limit: 12, windowMs: 600000 });
    const body = await readJsonObject(request);
    const mode = optionalString(body.mode, "mode") ?? "schedule";
    if (mode !== "schedule" && mode !== "startup-stale") {
      throw new TypeError(`Unsupported scheduler mode: ${mode}`);
    }
    const result = await runItchScheduledRefresh({
      mode,
      force: optionalBoolean(body.force, "force"),
    });
    return NextResponse.json(result, {
      status: result.pipeline?.run.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
