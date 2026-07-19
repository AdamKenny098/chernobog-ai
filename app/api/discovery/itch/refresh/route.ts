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
import type { ItchRefreshTrigger } from "@/lib/modules/itch-discovery/contract";
import { runItchDiscoveryPipeline } from "@/lib/modules/itch-discovery/services/runItchDiscoveryPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIGGERS = new Set<ItchRefreshTrigger>(["manual", "schedule", "startup-stale"]);

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "refresh:post", { limit: 4, windowMs: 600000 });
    const body = await readJsonObject(request);
    const rawTrigger = optionalString(body.trigger, "trigger");
    if (rawTrigger && !TRIGGERS.has(rawTrigger as ItchRefreshTrigger)) {
      throw new TypeError(`Unsupported refresh trigger: ${rawTrigger}`);
    }

    const result = await runItchDiscoveryPipeline({
      trigger: (rawTrigger as ItchRefreshTrigger | undefined) ?? "manual",
      forceDiscovery: optionalBoolean(body.forceDiscovery, "forceDiscovery"),
      enrichLimit: optionalInteger(body.enrichLimit, "enrichLimit", { minimum: 1, maximum: 100 }),
      enrichStaleAfterHours: optionalInteger(body.enrichStaleAfterHours, "enrichStaleAfterHours", { minimum: 1, maximum: 8760 }),
      enrichRequestDelayMs: optionalInteger(body.enrichRequestDelayMs, "enrichRequestDelayMs", { minimum: 0, maximum: 10000 }),
      updateLimit: optionalInteger(body.updateLimit, "updateLimit", { minimum: 1, maximum: 500 }),
      updateRequestDelayMs: optionalInteger(body.updateRequestDelayMs, "updateRequestDelayMs", { minimum: 0, maximum: 10000 }),
      batchSize: optionalInteger(body.batchSize, "batchSize", { minimum: 1, maximum: 100 }),
      profileId: optionalString(body.profileId, "profileId", { maximumLength: 200 }),
      profileName: optionalString(body.profileName, "profileName", { maximumLength: 100 }),
      presetId: optionalString(body.presetId, "presetId", { maximumLength: 200 }),
      presetName: optionalString(body.presetName, "presetName", { maximumLength: 100 }),
      batchDate: optionalString(body.batchDate, "batchDate", { maximumLength: 10 }),
      digestDate: optionalString(body.digestDate, "digestDate", { maximumLength: 10 }),
      timezone: optionalString(body.timezone, "timezone", { maximumLength: 100 }),
      skipDiscovery: optionalBoolean(body.skipDiscovery, "skipDiscovery"),
      skipEnrichment: optionalBoolean(body.skipEnrichment, "skipEnrichment"),
      skipNormalization: optionalBoolean(body.skipNormalization, "skipNormalization"),
      skipRanking: optionalBoolean(body.skipRanking, "skipRanking"),
      skipUpdates: optionalBoolean(body.skipUpdates, "skipUpdates"),
      skipDigest: optionalBoolean(body.skipDigest, "skipDigest"),
    });

    return NextResponse.json(result, { status: result.run.status === "failed" ? 500 : 200 });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
