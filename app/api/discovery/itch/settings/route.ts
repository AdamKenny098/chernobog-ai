import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import type { ItchPlatform } from "@/lib/modules/itch-discovery/contract";
import {
  apiFailureResponseInit,
  optionalBoolean,
  optionalFiniteNumber,
  optionalInteger,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import {
  ItchFilterPresetRepository,
  ItchPreferenceRepository,
} from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORMS = new Set<ItchPlatform>(["windows", "linux", "macos", "browser"]);

export async function GET(request: Request) {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const preferences = new ItchPreferenceRepository(database);
    const url = new URL(request.url);
    const profile = url.searchParams.get("profileId")
      ? preferences.findProfileById(url.searchParams.get("profileId")!)
      : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
    if (!profile) {
      return NextResponse.json({ error: "Preference profile not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      profile,
      weights: preferences.listWeights(profile.id),
      presets: new ItchFilterPresetRepository(database).listAll(),
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "settings:patch", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const preferences = new ItchPreferenceRepository(database);
    const current = optionalString(body.id, "id")
      ? preferences.findProfileById(optionalString(body.id, "id")!)
      : preferences.findProfileByName(optionalString(body.profileName, "profileName") ?? "Default") ?? preferences.ensureDefaultProfile();
    if (!current) {
      return NextResponse.json({ error: "Preference profile not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
    }

    const preferredPlatforms = body.preferredPlatforms === undefined
      ? current.preferredPlatforms
      : parsePlatforms(body.preferredPlatforms);
    const maximumPriceMinor = body.maximumPriceMinor === null
      ? undefined
      : optionalInteger(body.maximumPriceMinor, "maximumPriceMinor", { minimum: 0, maximum: 10000000 }) ?? current.maximumPriceMinor;

    const profile = preferences.upsertProfile({
      id: current.id,
      profileName: optionalString(body.profileName, "profileName", { maximumLength: 100 }) ?? current.profileName,
      enabled: optionalBoolean(body.enabled, "enabled") ?? current.enabled,
      preferredPlatforms,
      maximumPriceMinor,
      allowFree: optionalBoolean(body.allowFree, "allowFree") ?? current.allowFree,
      allowPaid: optionalBoolean(body.allowPaid, "allowPaid") ?? current.allowPaid,
      allowBrowserGames: optionalBoolean(body.allowBrowserGames, "allowBrowserGames") ?? current.allowBrowserGames,
      excludeNsfw: optionalBoolean(body.excludeNsfw, "excludeNsfw") ?? current.excludeNsfw,
      minimumScore: optionalFiniteNumber(body.minimumScore, "minimumScore") ?? current.minimumScore,
    });
    return NextResponse.json({ profile, weights: preferences.listWeights(profile.id) });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

function parsePlatforms(value: unknown): ItchPlatform[] {
  if (!Array.isArray(value)) throw new TypeError("preferredPlatforms must be an array.");
  const result = [...new Set(value.map((item) => {
    if (typeof item !== "string" || !PLATFORMS.has(item as ItchPlatform)) {
      throw new TypeError(`Unsupported platform: ${String(item)}`);
    }
    return item as ItchPlatform;
  }))];
  return result;
}
