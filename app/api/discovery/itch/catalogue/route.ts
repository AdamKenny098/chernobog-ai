import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  apiFailureResponseInit,
  isRecord,
  optionalInteger,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import type { ItchFilterRule, ItchFilterSort } from "@/lib/modules/itch-discovery/contract";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import {
  executeItchFilter,
  executeItchFilterPreset,
} from "@/lib/modules/itch-discovery/services/executeItchFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);

    return NextResponse.json(
      executeItchFilterPreset(database, {
        presetId: url.searchParams.get("presetId") ?? undefined,
        presetName: url.searchParams.get("presetName") ?? undefined,
        profileId: url.searchParams.get("profileId") ?? undefined,
        limit: parseQueryInteger(url.searchParams.get("limit"), "limit", 1, 200),
        offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100_000),
      }),
    );
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "catalogue:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);

    return NextResponse.json(
      executeItchFilter(database, {
        rules: requireObjectArray(body.rules, "rules") as unknown as ItchFilterRule[],
        sort: requireObjectArray(body.sort ?? [], "sort") as unknown as ItchFilterSort[],
        profileId: optionalString(body.profileId, "profileId", { maximumLength: 200 }),
        limit: optionalInteger(body.limit, "limit", { minimum: 1, maximum: 200 }),
        offset: optionalInteger(body.offset, "offset", { minimum: 0, maximum: 100_000 }),
        now: optionalString(body.now, "now", { maximumLength: 40 }),
      }),
    );
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

function parseQueryInteger(
  value: string | null,
  field: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new TypeError(`${field} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function requireObjectArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new TypeError(`${field} must be an array of objects.`);
  }
  return value;
}
